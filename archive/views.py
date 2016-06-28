from django.shortcuts import render,render_to_response,get_object_or_404,redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.template import RequestContext

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import login, authenticate

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.cache import cache
from django.core.files import File

from django.conf import settings

from django.db.models import Min,Max

from django.contrib.staticfiles.templatetags.staticfiles import static

import uuid

from forms import *
from models import *

from PIL import Image

##
# Page users are navigated to after login.
# This is where data import, tagging, and card creation is done
##
@login_required
def archive(request):
	context = {}
	#data belonging to user
	data = Data.objects.filter(owners=request.user.id)
	context['data'] = data
	
	#dictionary holding all data tags
	allTags = {}
	#loop through data getting all tags and count
	tags = Tag.objects.filter(owners=request.user.id)
	for tag in tags:
		allTags[tag.name] = getTagCount(request.user,tag)
	context['tags'] = allTags
	tagForm = TagSelectForm()
	tagForm.fields['existingTags'].queryset = Tag.objects.filter(owners=request.user.id)
	tagForm.fields['existingTags'].label = "Select Existing Tags"
	context['tagForm'] = tagForm
	cardForm = CardSelectForm()
	cardForm.fields['existingCards'].queryset = Card.objects.filter(owners=request.user.id)
	cardForm.fields['existingCards'].label = "Select Existing Cards"
	context['form'] = cardForm
	if len(data) > 0:
		minDate = Data.objects.filter(owners=request.user.id).aggregate(min_date = Min('date'))
		maxDate = Data.objects.filter(owners=request.user.id).aggregate(max_date = Max('date'))
		context['hasData'] = True
		context['minDateYear'] = minDate['min_date'].year
		context['minDateMonth'] = minDate['min_date'].month
		context['minDateDay'] = minDate['min_date'].day
		context['maxDateYear'] = maxDate['max_date'].year
		context['maxDateMonth'] = maxDate['max_date'].month
		context['maxDateDay'] = maxDate['max_date'].day
	else:
		context['hasData'] = False
	if request.method != 'POST':
		return render(request,"archive.html",context)
	else:
		files = request.FILES.getlist('data')
		for file in files:
			fileType = file.content_type
			print fileType
			newFile = File(file=file,type=fileType)
			newFile.save()
			
			if fileType.startswith('image'):
				newFile.image = file
				newFile.save()
				exif_data = False 
				lat = None
				lon = None
				try:
					im = Image.open(file)
					try:
						exif_data = filereader.get_exif_data(im)
						print exif_data
					except:
						print "could not get exif"
					if exif_data:
						lat,lon = filereader.get_lat_lon(exif_data)
						print lat
						print lon
					
					new_data = Data(name=file.name,lat=lat,lon=lon,file=newFile)
					new_data.save()
					new_data.owners.add(request.user)
					new_data.save()
					
				except:
					print "problem with data upload"
					return render(request,"archive.html",context)
			elif fileType.startswith("text") and file.name.endswith(".txt"):
				new_data = Data(name=file.name,file=newFile)
				new_data.save()
				new_data.owners.add(request.user)
				new_data.save()
			elif fileType.endswith("pdf"):
				new_data = Data(name=file.name,file=newFile)
				new_data.save()
				new_data.owners.add(request.user)
				new_data.save()
			elif file.name.endswith("zip"):
				new_data = Data(name=file.name,file=newFile)
				new_data.save()
				new_data.owners.add(request.user)
				new_data.save()
			elif file.name.endswith("csv"):
				dataBaseName = "db/" + file.name[:-4] + ".db"
				tmpDb = file.name[:-4] + ".db"
				c = boto.connect_s3(settings.AWS_ACCESS_KEY_ID,settings.AWS_SECRET_ACCESS_KEY)
				b = c.lookup("symkaladev6")
				k = b.new_key(dataBaseName)
				k.set_contents_from_string("")
				conn = sqlite3.connect(tmpDb)
				conn.text_factory = str
				reader = csv.reader(file)
				tableFields = "("
				header = reader.next()
				headerList = [field.replace(" ","") for field in header] #remove whitespace
				headerList = [field.lower() for field in headerList] #convert to lowercase
				headerTuple = tuple(headerList)
				c = conn.cursor()
				c.executescript("DROP TABLE IF EXISTS datavalues")
				conn.commit()
				tableCreateString = "CREATE TABLE IF NOT EXISTS datavalues %s" % (str(headerTuple))
				c.execute(tableCreateString) 
				valueString = ""
				for row in reader: #already read the header
					values = tuple(row) 
					numOfParams = "?," * len(values)
					queryString = "INSERT INTO datavalues VALUES (" + numOfParams[0:-1] + ")"
					c.execute(queryString,values)
				c.executescript("DROP TABLE IF EXISTS metadata")
				conn.commit()
				tableString = "CREATE TABLE IF NOT EXISTS metadata (fieldname TEXT)"
				c.execute(tableString)
				header = [field.replace(" ","") for field in header]
				for field in header:
					c.execute("INSERT INTO metadata VALUES (?)",(field.lower(),))
				conn.commit()
				conn.close()
				new_data = Data(name=dataBaseName,file=newFile)
				new_data.save()
				new_data.owners.add(request.user)
				new_data.save()
				k.set_contents_from_filename(tmpDb)
	data = Data.objects.filter(owners=request.user.id)
	if len(data) > 0:
		minDate = Data.objects.filter(owners=request.user.id).aggregate(min_date = Min('date'))
		maxDate = Data.objects.filter(owners=request.user.id).aggregate(max_date = Max('date'))
		context['hasData'] = True
		context['minDateYear'] = minDate['min_date'].year
		context['minDateMonth'] = minDate['min_date'].month
		context['minDateDay'] = minDate['min_date'].day
		context['maxDateYear'] = maxDate['max_date'].year
		context['maxDateMonth'] = maxDate['max_date'].month
		context['maxDateDay'] = maxDate['max_date'].day
	else:
		context['hasData'] = False
	context['data'] = data
	return render(request,"archive.html",context)
	
def clarifaiTag(request,dataId):
	if request.is_ajax():
		data = Data.objects.get(id=dataId,owners = request.user.id);
		image = data.file
		if not image.type.startswith("image"):
			return HttpResponse("data not an image")
		else:
			result = clarifai_api.tag_images(default_storage.open(str(image.file)))
			writeResultsToCsv(result)
			keywords = result["results"][0]["result"]["tag"]["classes"]
			for word in keywords:
				if not Keyword.objects.filter(name=word).exists():
					new_keyword = Keyword(name=word)
					new_keyword.save()
					data.keywords.add(new_keyword)
				else:
					keyword = Keyword.objects.get(name=word)
					data.keywords.add(keyword)
				data.save()
			return redirect("loadKeywords",dataId)
			
def writeResultsToCsv(clarifaiResponse):
	try:
		fileName = "keywords/" + str(uuid.uuid1()) + '.csv'
		keywordCsv = default_storage.open(fileName,"w+")
		keywordCsvWriter = csv.DictWriter(keywordCsv,fieldnames=["keywords"])
		keywordCsvWriter.writeHeader()
		
		results = clarifaiResponse.result.tag
		for result in results.classes:
			keywordCsvWriter.writerow({"keywords":result})
		return True
	except:
		return False
		
def twitter(request):
	if request.method == "POST":
		query = request.POST["query"]
		statuses = []
		tweets = tweepy.Cursor(api.search,q=query,count=10).items(10)
		for status in tweets:
			statuses.append(status.text)
			tweet = Twitter(tweet=status.text,author=status.author.screen_name,type="twitter")
			tweet.save()
			new_data = Data(name="twitter" + str(status.id),file=tweet)
			new_data.save()
			new_data.owners.add(request.user)
			new_data.save()
		return JsonResponse({"status": statuses})
	else:
		return redirect("archive")
		
def deleteBatchData(request):
	dataIds = request.POST.get("dataToDelete")
	if(dataIds):
		dataIds = json.loads(request.POST.get("dataToDelete"))
	for dataId in dataIds:
		data = Data.objects.get(id=dataId,owners=request.user)
		data.delete()
	#return JsonResponse(dataIds,safe=False)
	return redirect("archive")
	
def textPreview(request,dataId):
	data = Data.objects.get(id=dataId,owners = request.user.id);
	if data.file.type.startswith("text") and str(data.file.file).endswith(".txt"):
		return HttpResponse(data.file.file.read())
	elif data.file.type.endswith("pdf"):
		response = HttpResponse(data.file.file.read(),content_type="application/pdf")
		response['Content-Disposition'] = 'inline;filename=' + str(data.file.id) + "pdfPreview.pdf"
		return response
	elif str(data.file.file).endswith(".csv"):
		db = data.name
		
		c = boto.connect_s3(settings.AWS_ACCESS_KEY_ID,settings.AWS_SECRET_ACCESS_KEY)
		b = c.lookup("symkaladev6")
		k = b.new_key(db)
		tmpDb = "tmp.db"
		k.get_contents_to_filename(tmpDb)
		
		conn = sqlite3.connect(tmpDb)
		c = conn.cursor()
		c.execute("SELECT * FROM datavalues")
		tableData = c.fetchall()
		c.execute("SELECT * FROM metadata")
		metaData = c.fetchall()
		return JsonResponse({"meta":metaData,"values":tableData})
	elif data.file.type == "twitter":
		response = {"status": data.file.twitter.tweet,"author":data.file.twitter.author}
		return JsonResponse(response)
	else:
		return HttpResponse("file type preview not supported yet")
		
def createCard(request):
	if request.method == "POST":
		cardName = request.POST["cardName"]
		print cardName
		if cardName:
			card = Card(name=cardName)
		existingCard = request.POST.get("existingCards")
		print existingCard
		if existingCard:
			card = Card.objects.get(id=existingCard,owners=request.user)
		card.save()
		card.owners.add(request.user)
		dataElements = request.POST.get("cardData")
		if dataElements:
			dataElements = json.loads(dataElements)
		for dataElement in dataElements:
			data = Data.objects.get(id=dataElement)
			card.data.add(data)
		card.save()
	return redirect("archive")
	
def deleteCard(request):
	if request.method != "POST":
		return redirect("archive")
	else:
		existingCard = request.POST.get("existingCards")
		card = Card.objects.get(id=existingCard,owners=request.user)
		card.delete()
		return redirect("archive")
	
#view used to generate new tags, can also add tags to data	
def tag(request):
	tags = [] #array to return ne tag names with count
	if request.method == "POST":
		tagNames = request.POST["tag"]
		if tagNames:
			tagNames.replace(',','')
		existingTag = request.POST.get("existingTags")
		tag = 0
		if existingTag:
			tag = Tag.objects.get(id=existingTag,owners=request.user)
		dataElements = request.POST.get("data")
		if dataElements:
			dataElements = json.loads(dataElements)
		if dataElements:
			for dataElement in dataElements:
				data = Data.objects.get(id=dataElement,owners = request.user.id)
				if tag:
					data.tag_set.add(tag)
					tags.append({'name': tag.name,'count':getTagCount(request.user,tag),'value':tag.id})
				else:
					for tagName in tagNames.split():
						try:
							existingTag = Tag.objects.get(name=tagName,owners = request.user)
						except:
							print "oh no"
							existingTag = 0
						if existingTag:
							print "tag %s already exists!" % (tagName)
							data.tag_set.add(Tag.objects.get(name=tagName,owners = request.user))
							tags.append({'name': tagName,'count':getTagCount(request.user,existingTag),'value':existingTag.id})
							continue
						new_tag = Tag(name=tagName)
						new_tag.save()
						new_tag.owners.add(request.user)
						new_tag.save()
						data.tag_set.add(new_tag)
						data.save()
						tags.append({'name': tagName,'count':getTagCount(request.user,new_tag),'value':new_tag.id})
						
		else:
			for tagName in tagNames.split():
				if Tag.objects.filter(name=tagName,owners = request.user).exists():
					continue
				new_tag = Tag(name=tagName)
				new_tag.save()
				new_tag.owners.add(request.user)
				new_tag.save()
				tags.append({'name': tagName,'count':getTagCount(request.user,new_tag),'value':new_tag.id})
	##return JsonResponse(tags,safe=False)
	return redirect("archive")

##
# function that gets called via ajax
# finds all the tags of a piece of data
# and adds them to that data's class for isotope filtering
##
def getTagNames(request,dataId):
	data = Data.objects.get(id=dataId,owners = request.user.id)
	tags = data.tag_set.all()
	tagNames = ""
	for tag in tags:	
		tagNames += " " + tag.name
	return HttpResponse(tagNames)
	
#deletes a tag entirely	
def deleteTag(request):
	try:
		existingTag = request.POST.get("existingTags")
		if existingTag:
			tag = Tag.objects.get(id=existingTag,owners=request.user)
			tag.delete()
	except:
		print "Tag with name %s does not exist!" % (tagName)
	return redirect("archive")
	
def deleteData(request,dataId):
	try:
		data = Data.objects.get(id=dataId,owners = request.user.id);
		data.delete()
	except:
		print "unauthorized or invalid ID!"
	return redirect("archive")
	
def getTagCount(user,tag):
	tags = Data.objects.filter(owners=user.id,tag=tag.id)
	return tags.count()
	
def img_api(request,img_id):
	img = File.objects.get(id=img_id)
	print str(img.file).endswith(".zip")
	if img.type.startswith("image"):
		return HttpResponse(img.file.read())
	elif img.type.startswith("text") and str(img.file).endswith(".txt"):
		return HttpResponse(default_storage.open("images/txt.png"))
	elif img.type.endswith("pdf"):
		return HttpResponse(default_storage.open("images/pdf.png"))
	elif str(img.file).endswith(".csv"):
		return HttpResponse(default_storage.open("images/csv.png"))
	elif str(img.file).endswith(".zip"):
		return HttpResponse(default_storage.open("images/zip.png"))
	elif img.type == "twitter":
		return HttpResponse(default_storage.open("images/twitter.png"))
