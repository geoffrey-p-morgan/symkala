from django.shortcuts import render,render_to_response,get_object_or_404,redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.template import RequestContext

from django.core.context_processors import csrf

from django.core.mail import send_mail

from django.utils import timezone

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import login, authenticate

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.cache import cache
from django.core.files import File

from django.db.models import Min,Max

from django.contrib.staticfiles.templatetags.staticfiles import static

import hashlib,random
import uuid

from datetime import datetime,timedelta

from forms import *
from models import *

from PIL import Image

import os, time
import filereader
import csv

from subprocess import Popen, PIPE, STDOUT
from sets import Set

import json 

import boto

import tweepy
import sqlite3

from mediameter.cliff import Cliff

consumer_key = 	"J9PJwNdonRO6WJ7s1hzjq8i4D"
consumer_secret = "4JCEJnzCihfCUOQCL3vKJaNjl9srH4dndPl3mFC608JIIPjNtJ"

auth = tweepy.OAuthHandler(consumer_key,consumer_secret)

access_token = "704381276719951872-l4L21g6tYpS28l0o2sZpxq6hIqvfW7j"
access_token_secret = "wlcQlWWsQZ6JykRKyPPBE9cUCZHaT7WYnqlSZrhw1omeL"

auth.set_access_token(access_token,access_token_secret)

api = tweepy.API(auth)

##
# Simple landing page for symkala. 
# No product functionality contained here
##
def splash(request):
	if request.method == "POST":
		name = request.POST["name"]
		email = request.POST["email"]
		message = request.POST["message"]
		
		email_subject = '[symkala] %s just contacted you' % (name)
		email_body = "%s contacted you from %s.  They say %s" % (name,email,message)
		
		try:
			send_mail(email_subject,email_body,email,["will@symkala.com","davey@symkala.com"],fail_silently=False)
		except: 
			print "problem with email"
	return render(request,"splash.html")


def account(request):
	context = {}
	context['user'] = request.user
	return render(request,"account.html",context)
	
def share(request):
	return render(request,"share.html")
	
##
# Page users are navigated to after login.
# This is where data import, tagging, and card creation is done
##
@login_required
def archive(request):
	context = {}
	#data belonging to user
	data = Data.objects.filter(owners=request.user.id)
	print len(data)
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
	if request.method != 'POST':
		return render(request,"archive.html",context)
	else:
		files = request.FILES.getlist('data')
		dataSetName = request.POST["name"].replace(" ","_")
		newDataSet = DataSet(name=dataSetName)
		newDataSet.save()
		newDataSet.owners.add(request.user)
		newDataSet.save()
		for file in files:
			fileType = file.content_type
			newFile = File(file=file,type=fileType)
			newFile.save()
			
			if fileType.startswith('image'):
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
					newDataSet.data.add(new_data)
					newDataSet.save()
					
				except:
					print "problem with data upload"
					return render(request,"archive.html",context)
			elif fileType.startswith("text") and file.name.endswith(".txt"):
				new_data = Data(name=file.name,file=newFile)
				new_data.save()
				new_data.owners.add(request.user)
				new_data.save()
				newDataSet.data.add(new_data)
				newDataSet.save()
			elif fileType.endswith("pdf"):
				new_data = Data(name=file.name,file=newFile)
				new_data.save()
				new_data.owners.add(request.user)
				new_data.save()
				newDataSet.data.add(new_data)
				newDataSet.save()
			elif file.name.endswith("csv"):
				dataBaseName = file.name[:-4] + ".db"
				conn = sqlite3.connect(dataBaseName)
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
				newDataSet.data.add(new_data)
				newDataSet.save()
	data = Data.objects.filter(owners=request.user.id)
	context['data'] = data
	return render(request,"archive.html",context)
	
def twitter(request):
	if request.method == "POST":
		query = request.POST["query"]
		statuses = []
		tweets = tweepy.Cursor(api.search).items(10)
		for status in tweets:
			statuses.append(status.text)
		return JsonResponse({"status": statuses})
	else:
		return redirect("archive")

##
# Card manipulation happens here.
# users can drag and drop cards to preform different analysis on stacks.html
# or look at all cards in manage.html (change what to render in else clause)
##	
@login_required
def manage(request):
	context = {}
	if request.method == "POST":
		selectedCards = request.POST.get("cards")
		if selectedCards:
			selectedCards = json.loads(selectedCards)
		print selectedCards
		cards = Card.objects.filter(id__in=selectedCards)
		context['cards'] = cards
		return render(request,"stacks.html",context)
	else:
		mostRecentCards = Card.objects.order_by('-id').filter(owners=request.user)[:9]
		allCards = Card.objects.filter(owners=request.user)
		context['recentCards'] = mostRecentCards
		context['allCards'] = allCards
		context['cards'] = mostRecentCards
		#return render(request,"manage.html",context)
		return render(request,"stacks.html",context)

##
# Takes data from post request and writes to AWS via csv file
# based on the type of analysis selected, sends that csv file for further processing 
# to determine what data visualization to render
##		
@login_required
def visualize(request):
	if request.method != "POST":
		print "select data first!"
		return redirect("manage")
	csvFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	csvFile = default_storage.open(csvFileName,'w+')
	typeOfAnalysis = request.POST["analysis"]
	if typeOfAnalysis == "text" or typeOfAnalysis == "pdf":
		fieldnames = ['fileName']
	elif typeOfAnalysis == "scatter":
		fieldnames = ['x','y']
	else:
		fieldnames = ['fulcrum_id','FacilityType','latitude','longitude']
	writer = csv.DictWriter(csvFile,fieldnames=fieldnames)
	writer.writeheader()
	cardIds = json.loads(request.POST["data"])
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			tagList = ""
			tags = data.tag_set.all()
			for tag in tags:
				tagList += tag.name + " "
			if typeOfAnalysis == "scatter":
				x = request.POST["x"]
				y = request.POST["y"]
				db = data.name
				conn = sqlite3.connect(db)
				conn.row_factory = sqlite3.Row
				c = conn.cursor()
				queryString = "SELECT %s, %s FROM datavalues" % (x,y)
				c.execute(queryString)
				values = c.fetchall()
				for row in values:
					rowX = row[str(x)]
					rowY = row[str(y)]
					writer.writerow({"x":rowX,"y":rowY})
			if typeOfAnalysis == "csvHeat" or typeOfAnalysis == "csvProx" or typeOfAnalysis == "csvTin":
				lat = request.POST["lat"]
				lon = request.POST["lon"]
				if str(data.file.file).endswith("csv"):
					db = data.name
					conn = sqlite3.connect(db)
					conn.row_factory = sqlite3.Row
					c = conn.cursor()
					c.execute("SELECT rowid, * FROM datavalues")
					values = c.fetchall()
					for row in values:
						id = row[0]
						latitude = row[str(lat)]
						longitude = row[str(lon)]
						if "tags" in row.keys():
							tags = row["tags"]
						else:
							tags = tagList
						writer.writerow({'fulcrum_id': id,'FacilityType': tags,'latitude':latitude,'longitude':longitude})
			if typeOfAnalysis == "text":
				if data.file.type.startswith("text"):
					try:
						textFileName = 'data/' + str(uuid.uuid1()) + '.txt'
						textFile = default_storage.open(textFileName,'w')
						textFile.write(data.file.file.read())
						textFile.close()
						writer.writerow({'fileName' : "https://s3.amazonaws.com/symkaladev6/" + textFileName})
					except:
						print "problem with text file"
			if typeOfAnalysis == "pdf":
				if data.file.type.endswith("pdf"):
					try:
						textFileName = 'data/' + str(uuid.uuid1()) + '.pdf'
						pdfFile = default_storage.open(textFileName,'w')
						pdfFile.write(data.file.file.read())
						pdfFile.close()
						writer.writerow({'fileName' : "https://s3.amazonaws.com/symkaladev6/" + textFileName})
					except:
						print "problem with pdf file"
			else:
				if(data.lat != None and data.lon != None):
					writer.writerow({'fulcrum_id': data.name,'FacilityType': tagList,'latitude':data.lat,'longitude':data.lon})
	csvFile.close()
			
	if typeOfAnalysis == "proximity network" or typeOfAnalysis == "csvProx":
		return redirect("proximity",csvFileName)
	elif typeOfAnalysis == "heat" or typeOfAnalysis == "csvHeat":
		return redirect("heat",csvFileName)
	elif typeOfAnalysis == "Triangulated Irregular Network" or typeOfAnalysis == "csvTin":
		return redirect("tin",csvFileName)
	elif typeOfAnalysis == "text":
		return redirect("text",csvFileName)
	elif typeOfAnalysis == "pdf":
		return redirect("text",csvFileName)
	elif typeOfAnalysis == "scatter":
		return redirect("scatter",csvFileName)
	else:
		print "analyis not supported... yet"
		return HttpResponse("Analysis not supported... yet")
	return render(request,"visualize.html")

	
def scatter(request,fileName):
	return render(request,"scatter.html",{"fileName" : fileName})
	
##
# Creates proximity map analysis
# fileName is the name of csv file hosted on S3
##
def proximity(request,fileName):
	proximityFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	p = Popen(['java','-jar','calculateDistances.jar','https://s3.amazonaws.com/symkaladev6/' + fileName,",","0.005","True",'symkaladev6',proximityFileName],stdout=PIPE,stderr=STDOUT)
	for line in p.stdout:
		print line
	return render(request,"proximity.html",{'fileName' : fileName,'forceFileName' : proximityFileName})
	
def text(request,fileName):
	textFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	p = Popen(['java','-jar','calculateTFIDF.jar','https://s3.amazonaws.com/symkaladev6/' + fileName,',','50','symkaladev6',textFileName],stdout=PIPE,stderr=STDOUT)
	for line in p.stdout:
		print line
	return render(request,"text.html",{'fileName': textFileName})
		
##
# Creates heat map analysis
# fileName is the name of csv file hosted on S3
##
def heat(request,fileName):
	return render(request,"heat.html",{'fileName' : fileName})


##
# create tin analysis
# fileName is the name of csv file hosted on S3
##	
def tin(request,fileName):
	return render(request,"tin.html",{'fileName' : fileName})

def getColumnOptions(request):
	cardIds = json.loads(request.POST["cards"])
	dataElements = [];
	analysis = {}
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			if str(data.file.file).endswith(".csv"):
				db = data.name
				conn = sqlite3.connect(db)
				c = conn.cursor()
				c.execute("SELECT * FROM metadata")
				metaData = c.fetchall()
				metaData = [''.join(x) for x in metaData]
				metaData = [x.lower() for x in metaData]
				return JsonResponse(metaData,safe=False)
		return HttpResponse("No metadata found")

def analysis(request):
	if request.method != "POST":
		return redirect("manage")
	cardIds = json.loads(request.POST["cards"])
	dataElements = [];
	analysis = {}
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			print data.file.type
			if data.file.type.startswith("text"):
				analysis["text"] = True
			elif data.file.type.endswith("pdf"):
				analysis["pdf"] = True
			# Need at least 1 data point with lat and lon coords
			if data.lat != None and data.lon != None:
				analysis["heat"] = True
				analysis["Triangulated Irregular Network"] = True
				analysis["proximity network"] = True
			if str(data.file.file).endswith(".csv"):
				db = data.name
				print db
				conn = sqlite3.connect(db)
				c = conn.cursor()
				c.execute("SELECT * FROM metadata")
				metaData = c.fetchall()
				metaData = [''.join(x) for x in metaData]
				metaData = [x.lower() for x in metaData]
				if "latitude" in metaData and "longitude" in metaData:
					analysis["csvProx"] = True
					analysis["csvHeat"] = True
					analysis["csvTin"] = True
				analysis["scatter"] = True
			dataElements.append(data)
	return JsonResponse(analysis.keys(),safe=False)

def getData(request,dataSetId):
	dataSet = DataSet.objects.get(id=dataSetId)
	dataEl = dataSet.data.all()
	response = []
	for data in dataEl:
		dataInfo = {'fileId' : data.file.id, 'id' : data.id , 'type' : data.file.type, 'name' : data.name}
		response.append(dataInfo)
	return JsonResponse(response,safe=False)
	
def deleteBatchData(request):
	dataIds = request.POST.get("dataToDelete")
	if(dataIds):
		dataIds = json.loads(request.POST.get("dataToDelete"))
	for dataId in dataIds:
		data = Data.objects.get(id=dataId,owners=request.user)
		data.delete()
	#return JsonResponse(dataIds,safe=False)
	return redirect("archive")
	
def cardData(request):
	cardIds = json.loads(request.GET["cards"])
	dataElements = [];
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			tags = ""
			for tag in data.tag_set.all():
				tags += tag.name + " "
			dataInfo = {'name' : data.name, 'lat' : data.lat, 'lon' : data.lon, 'tags' : tags}
			dataElements.append(dataInfo)
	return JsonResponse(dataElements,safe=False)

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
		print db
		conn = sqlite3.connect(db)
		c = conn.cursor()
		c.execute("SELECT * FROM datavalues")
		tableData = c.fetchall()
		c.execute("SELECT * FROM metadata")
		metaData = c.fetchall()
		return JsonResponse({"meta":metaData,"values":tableData})
	else:
		return HttpResponse("file type preview not supported yet")
	
def dataTools(request,dataId):
	context = {}
	data = Data.objects.get(id=dataId,owners = request.user.id);
	if data.file.type.startswith("text"):
		context["text"] = data.file.file.read()
	elif data.file.type.endswith("pdf"):
		print data.file.file.read()
	context["data"] = data
	context["tags"] = data.tag_set.all()
	return render(request,"dataTool.html",context)

def cliff(request,text):
	server = "http://localhost"
	port = 8999
	myCliff = Cliff(server,port)
	entities = myCliff.parseText(text)
	return JsonResponse(entities)
	
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
	
def getDataSetNames(request,dataSetId):
	dataSet = DataSet.objects.get(id=dataSetId,owners = request.user.id);
	tagNames = "";
	for data in dataSet.data.all():
		tags = data.tag_set.all()
		for tag in tags:
			tagNames += " " + tag.name
	return HttpResponse(tagNames)
		
def removeTag(request):
	print "removing tag!";
	dataElements = request.POST.get("dataToRemoveTagFrom")
	if dataElements:
		dataElements = json.loads(dataElements)
	print dataElements
	existingTag = request.POST.get("existingTags")
	if existingTag:
		tag = Tag.objects.get(id=existingTag,owners=request.user)
	for dataElement in dataElements:
		data = Data.objects.get(id=dataElement,owners = request.user.id)
		data.tag_set.remove(tag);
	return JsonResponse({'name':tag.name,'count':getTagCount(request.user,tag),'value':tag.id});

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
	try:
		img = File.objects.get(id=img_id)
		if img.type.startswith("image"):
			return HttpResponse(img.file.read())
		elif img.type.startswith("text") and str(img.file).endswith(".txt"):
			return HttpResponse(default_storage.open("images/txt.png"))
		elif img.type.endswith("pdf"):
			return HttpResponse(default_storage.open("images/pdf.png"))
		elif str(img.file).endswith(".csv"):
			return HttpResponse(default_storage.open("images/csv.png"))
	except:
		return
		
def dataset_api(request,dataset_id):
	dataset = DataSet.objects.get(id=dataset_id)
	data = dataset.data.order_by('?').first()
	print data
	img = File.objects.get(id=data.file.id)
	if img.type.startswith("image"):
		return HttpResponse(img.file.read())
	elif img.type.startswith("text"):
		return HttpResponse(default_storage.open("images/txt.png"))
	
##
# View for registering.  Users are asked to confirm account upon registering.
# Confirmation link is sent to the email users signed up with and must click
# link within 2 days.  Users must sign up with a .symkala email
##
def register(request):
	args = {}
	args.update(csrf(request))
	if request.method == 'POST':
		form = RegistrationForm(request.POST)
		args['form'] = form
		if form.is_valid():
			form.save()
			
			username = form.cleaned_data['username']
			user = User.objects.get(username=username)
			email = form.cleaned_data['email']
			salt = hashlib.sha1(str(random.random())).hexdigest()[:5]
			activation_key = hashlib.sha1(salt+email).hexdigest()
			key_expires = datetime.now() + timedelta(2)
			
			new_profile = UserProfile(user=user,activation_key=activation_key,
							key_expires=key_expires).save()
							
			email_subject = 'Confirm Symkala Account'
			email_body = "Hello %s.  Welcome to Symkala!  Click this link within 48 hours to confirm your account : http://symkala-dev5.elasticbeanstalk.com/confirm/%s" % (username,activation_key)
			try:
				send_mail(email_subject,email_body,"do_not_reply@symkala.com",[email],fail_silently=False)
			except:
				user.delete()
			
			return HttpResponseRedirect('/register_success')
	else:
		args['form'] = RegistrationForm()
			
	return render_to_response('register.html',args,context_instance=RequestContext(request))
		
def register_success(request):
	return render(request,'success.html')
	
def register_confirm(request,activation_key):
	if request.user.is_authenticated():
		HttpResponseRedirect('/home')
	user_profile = get_object_or_404(UserProfile,activation_key=activation_key)
	
	#if key is expired, delete user and have them register again
	#@TODO: just update key and resend link
	if user_profile.key_expires < datetime.now(timezone.utc):
		user_profile = get_object_or_404(UserProfile,activation_key)
		user_profile.delete()
		return render_to_response('confirm_expired.html')
	user = user_profile.user
	user.is_active = True
	user.save()
	user.backend = 'django.contrib.auth.backends.ModelBackend'
	login(request,user)
	return render_to_response('confirm.html')
