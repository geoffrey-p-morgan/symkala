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

from django.conf import settings

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
from clarifai.client import ClarifaiApi

consumer_key = 	"J9PJwNdonRO6WJ7s1hzjq8i4D"
consumer_secret = "4JCEJnzCihfCUOQCL3vKJaNjl9srH4dndPl3mFC608JIIPjNtJ"

auth = tweepy.OAuthHandler(consumer_key,consumer_secret)

access_token = "704381276719951872-l4L21g6tYpS28l0o2sZpxq6hIqvfW7j"
access_token_secret = "wlcQlWWsQZ6JykRKyPPBE9cUCZHaT7WYnqlSZrhw1omeL"

auth.set_access_token(access_token,access_token_secret)

api = tweepy.API(auth)


clarifai_ap_id = "EPj6S60qK-3UvlAed1zoXzkSRz5n4PlRyKnR7Wxs"
clarifai_ap_secret = "075324r6N9SINSlyh3oQ-fiQ3YcExwm3AEVb37jC"
clarifai_api = ClarifaiApi(clarifai_ap_id,clarifai_ap_secret) 

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

def loadKeywords(request,dataId):
	data = Data.objects.get(id=dataId,owners = request.user.id);
	context = {}
	context["keywords"] = data.keywords.all()
	context["dataId"] = dataId
	return render(request,"clarifai.html",context)

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
	shapeCsvFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	shapeCsv = default_storage.open(shapeCsvFileName,'w+')
	shapeWriter = csv.DictWriter(shapeCsv,fieldnames=["fileName"])
	shapeWriter.writeheader()
	typeOfAnalysis = request.POST["analysis"]
	if typeOfAnalysis == "text" or typeOfAnalysis == "pdf" or typeOfAnalysis == "shape":
		fieldnames = ['fileName']
	elif typeOfAnalysis == "scatter":
		fieldnames = ['x','y']
	else:
		fieldnames = ['fulcrum_id','FacilityType','latitude','longitude','preview']
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
			#if shape file write to shapefile csv and continue, not used in rest of analysis
			if str(data.file.file).endswith("zip"):
				shapeFileName = 'data/' + str(uuid.uuid1()) + '.zip'
				tmpFile = default_storage.open(shapeFileName,'w')
				tmpFile.write(data.file.file.read())
				tmpFile.close()
				shapeWriter.writerow({'fileName' : "https://s3.amazonaws.com/symkaladev6/" + shapeFileName})
				continue
			if typeOfAnalysis == "scatter":
				x = request.POST["x"]
				y = request.POST["y"]
				db = data.name
				
				
				c = boto.connect_s3(settings.AWS_ACCESS_KEY_ID,settings.AWS_SECRET_ACCESS_KEY)
				b = c.lookup("symkaladev6")
				k = b.new_key(db)
				tmpDb = "tmp.db"
				k.get_contents_to_filename(tmpDb)
				
				conn = sqlite3.connect(tmpDb)
				conn.row_factory = sqlite3.Row
				c = conn.cursor()
				queryString = "SELECT %s, %s FROM datavalues" % (x,y)
				c.execute(queryString)
				values = c.fetchall()
				for row in values:
					rowX = row[str(x)]
					rowY = row[str(y)]
					writer.writerow({"x":rowX,"y":rowY})
			
			elif typeOfAnalysis == "csvHeat" or typeOfAnalysis == "csvCluster" or typeOfAnalysis == "csvTin" or typeOfAnalysis == "csvPoI":
				lat = request.POST["lat"]
				lon = request.POST["lon"]
				tag = request.POST["tag"]
				if str(data.file.file).endswith("csv"):
					db = data.name
					
					c = boto.connect_s3(settings.AWS_ACCESS_KEY_ID,settings.AWS_SECRET_ACCESS_KEY)
					b = c.lookup("symkaladev6")
					k = b.new_key(db)
					tmpDb = "tmp.db"
					k.get_contents_to_filename(tmpDb)
					
					conn = sqlite3.connect(tmpDb)
					conn.row_factory = sqlite3.Row
					conn.text_factory = str
					c = conn.cursor()
					if tag:
						string = "SELECT rowid, %s, %s, %s FROM datavalues" % (lat,lon,tag)
					else:
						string = "SELECT rowid, %s, %s FROM datavalues" % (lat,lon)
					c.execute(string)
					values = c.fetchall()
					for row in values:
						id = row[0]
						latitude = row[str(lat)]
						longitude = row[str(lon)]
						if tag:
							tags = row[str(tag)]
						else:
							tags = tagList
						writer.writerow({'fulcrum_id': id,'FacilityType': tags,'latitude':latitude,'longitude':longitude,'preview': ""})
			elif typeOfAnalysis == "text":
				if data.file.type.startswith("text"):
					try:
						textFileName = 'data/' + str(uuid.uuid1()) + '.txt'
						textFile = default_storage.open(textFileName,'w')
						textFile.write(data.file.file.read())
						textFile.close()
						writer.writerow({'fileName' : "https://s3.amazonaws.com/symkaladev6/" + textFileName})
					except:
						print "problem with text file"
			elif typeOfAnalysis == "pdf":
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
					previewImg = "<img src='/api/%s' class='basic_img'>" % (data.file.id)
					writer.writerow({'fulcrum_id': data.name,'FacilityType': tagList,'latitude':data.lat,'longitude':data.lon,'preview': previewImg})
	csvFile.close()
	shapeCsv.close()
	
	request.session['fileName'] = csvFileName
	request.session['shapeFileName'] = shapeCsvFileName
	request.session['csvFileName'] = csvFileName
	if typeOfAnalysis == "Cluster" or typeOfAnalysis == "csvCluster":
		return redirect("proximity")
	if typeOfAnalysis == "Heat" or typeOfAnalysis == "csvHeat":
		return redirect("heat")
	if typeOfAnalysis == "Points of Interest" or typeOfAnalysis == "csvPoI":
		return redirect("poi")
	if typeOfAnalysis == "Triangulated Irregular Network" or typeOfAnalysis == "csvTin":
		return redirect("tin")
	if typeOfAnalysis == "text":
		return redirect("text")
	if typeOfAnalysis == "pdf":
		return redirect("text")
	if typeOfAnalysis == "scatter":
		return redirect("scatter")
	else:
		print "analyis not supported... yet"
		return HttpResponse("Analysis not supported... yet")
	return render(request,"visualize.html")

	
def scatter(request):
	fileName = request.sessino.get('csvFileName')
	return render(request,"scatter.html",{"fileName" : fileName})
		
##
# Creates proximity map analysis
# fileName is the name of csv file hosted on S3
##
def proximity(request):
	fileName = request.session.get('fileName')
	shapeFile = request.session.get('shapeFileName')
	proximityFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	print fileName
	p = Popen(['java','-jar','calculateDistances.jar','https://s3.amazonaws.com/symkaladev6/' + fileName,",","0.005","True",'symkaladev6',proximityFileName],stdout=PIPE,stderr=STDOUT)
	for line in p.stdout:
		print line
	return render(request,"proximity.html",{'shapeFile' : shapeFile, 'forceFileName' : proximityFileName})
	
def text(request):
	fileName = request.sessino.get('csvFileName')
	textFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	p = Popen(['java','-jar','calculateTFIDF.jar','https://s3.amazonaws.com/symkaladev6/' + fileName,',','50','symkaladev6',textFileName],stdout=PIPE,stderr=STDOUT)
	for line in p.stdout:
		print line
	return render(request,"text.html",{'fileName': textFileName})
		
##
# Creates heat map analysis
# fileName is the name of csv file hosted on S3
# shapeFile (is it exists) is a csv file on s3
##
def heat(request):
	fileName = request.session.get('fileName')
	shapeFile = request.session.get('shapeFileName')
	return render(request,"heat.html",{'fileName' : fileName,'shapeFile' : shapeFile})
	
def poi(request):
	fileName = request.session.get('fileName')
	shapeFile = request.session.get('shapeFileName')
	return render(request,"poi.html",{'fileName' : fileName,'shapeFile' : shapeFile})

##
# create tin analysis
# fileName is the name of csv file hosted on S3
# shapeFile (is it exists) is a csv file on s3
##	
def tin(request):
	fileName = request.session.get('fileName')
	shapeFile = request.session.get('shapeFileName')
	return render(request,"tin.html",{'fileName' : fileName,'shapeFile' : shapeFile})

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
				
				c = boto.connect_s3(settings.AWS_ACCESS_KEY_ID,settings.AWS_SECRET_ACCESS_KEY)
				b = c.lookup("symkaladev6")
				k = b.new_key(db)
				tmpDb = "tmp.db"
				k.get_contents_to_filename(tmpDb)
				
				conn = sqlite3.connect(tmpDb)
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
	geoDataFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	geoDataFile = default_storage.open(geoDataFileName,'w+')
	geoDataFieldnames = ['fulcrum_id','FacilityType','latitude','longitude','preview']
	geoDataWriter = csv.DictWriter(geoDataFile,fieldnames=geoDataFieldnames)
	geoDataWriter.writeheader()
	
	csvFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	csvFile = default_storage.open(csvFileName,'w+')
	csvFieldNames = ['fileName']
	csvWriter = csv.DictWriter(csvFile,fieldnames=csvFieldNames)
	csvWriter.writeheader()
	
	shapeCsvFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	shapeCsv = default_storage.open(shapeCsvFileName,'w+')
	shapeWriter = csv.DictWriter(shapeCsv,fieldnames=["fileName"])
	shapeWriter.writeheader()
		
	cardIds = json.loads(request.POST["cards"])
	dataElements = [];
	context = {}
	chart2d = set() #set of analysis options
	map = set()
	types = set() #set of viz type
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			tagList = ""
			tags = data.tag_set.all()
			for tag in tags:
				tagList += tag.name + " "
			#if shape file write to shapefile csv and continue, not used in rest of analysis
			if str(data.file.file).endswith("zip"):
				shapeFileName = 'data/' + str(uuid.uuid1()) + '.zip'
				tmpFile = default_storage.open(shapeFileName,'w')
				tmpFile.write(data.file.file.read())
				tmpFile.close()
				shapeWriter.writerow({'fileName' : "https://s3.amazonaws.com/symkaladev6/" + shapeFileName})
				continue
			if data.file.type.startswith("text"):
				chart2d.add("text")
				types.add("2D Chart")
			elif data.file.type.endswith("pdf"):
				chard2d.add("pdf")
				types.add("2D Chart")
			# Need at least 1 data point with lat and lon coords
			if data.lat != None and data.lon != None:
				map.add("heat")
				map.add("Triangulated Irregular Network")
				map.add("Cluster")
				map.add("Points of Interest")
				types.add("Map")
				
				previewImg = "<img src='/api/%s' class='basic_img'>" % (data.file.id)
				geoDataWriter.writerow({'fulcrum_id': data.name,'FacilityType': tagList,'latitude':data.lat,'longitude':data.lon,'preview': previewImg})
			if str(data.file.file).endswith(".csv"):
				chart2d.add('scatter')
				types.add("2D Chart")
				
				db = data.name
					
				c = boto.connect_s3(settings.AWS_ACCESS_KEY_ID,settings.AWS_SECRET_ACCESS_KEY)
				b = c.lookup("symkaladev6")
				k = b.new_key(db)
				tmpDb = "tmp.db"
				k.get_contents_to_filename(tmpDb)
				
				conn = sqlite3.connect(tmpDb)
				conn.text_factory = str
				c = conn.cursor()
				c.execute("SELECT * FROM metadata")
				
				metaData = c.fetchall()
				csvDataFieldNames = [''.join(x) for x in metaData]
				csvDataFieldNames = [x.lower() for x in csvDataFieldNames]
				
				csvDataName = 'data/' + str(uuid.uuid1()) + '.csv'
				csvData = default_storage.open(csvDataName,'w+')
				csvDataWriter = csv.writer(csvData)
				csvDataWriter.writerow(csvDataFieldNames)
				
				c.execute("SELECT * FROM datavalues")
				
				values = c.fetchall()
				for row in values:
					csvDataWriter.writerow(row)
					
				csvWriter.writerow({"fileName" : csvDataName})
				csvData.close()
			dataElements.append(data)
	context["2D"] = json.dumps(list(chart2d))
	context["map"] = json.dumps(list(map))
	context["types"] = json.dumps(list(types))
	context["geoData"] = geoDataFileName
	context["csvData"] = csvFileName
	context["shapeFile"] = shapeCsvFileName
	
	geoDataFile.close()
	csvFile.close()
	shapeCsv.close()
	
	return render(request,"visualize.html",context)
	
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
		
		c = boto.connect_s3(settings.AWS_ACCESS_KEY_ID,settings.AWS_SECRET_ACCESS_KEY)
		b = c.lookup("symkaladev6")
		k = b.new_key(db)
		tmpDb = "tmp.db"
		k.get_contents_to_filename(tmpDb)
		
		conn = sqlite3.connect(tmpDb)
		conn.text_factory = str
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
		tagNames = request.POST.getlist("tag")
		print "here are tags"
		print tagNames
		existingTag = request.POST.get("existingTags")
		tag = 0
		if existingTag:
			tag = Tag.objects.get(id=existingTag,owners=request.user)
		dataElements = request.POST.get("data")
		data = request.POST.get("dataId") #dataId from keyword tagging
		if dataElements:
			dataElements = json.loads(dataElements)
		if dataElements:
			for dataElement in dataElements:
				data = Data.objects.get(id=dataElement,owners = request.user.id)
				if tag:
					data.tag_set.add(tag)
					tags.append({'name': tag.name,'count':getTagCount(request.user,tag),'value':tag.id})
				else:
					for tagName in tagNames:
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
		
		elif data:
			data = Data.objects.get(id=data,owners = request.user.id)
			if tag:
				data.tag_set.add(tag)
				tags.append({'name': tag.name,'count':getTagCount(request.user,tag),'value':tag.id})
			else:
				for tagName in tagNames:
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
			for tagName in tagNames:
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
			org = form.cleaned_data['organization']
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
