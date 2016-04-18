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

from django.contrib.staticfiles.templatetags.staticfiles import static

import hashlib,random
import uuid

import datetime
from datetime import timedelta

from forms import *
from models import *

from PIL import Image

import os
import filereader
import csv

from subprocess import Popen, PIPE, STDOUT

import json 

import boto

def splash(request):
	context = {}
	if request.method == 'POST':
		name = request.POST.get("name")
		email = request.POST.get("email")
		message = request.POST.get("message")
		
		toEmail = 'davey@symkala.com'
		
		email_subject = "%s just went a message!" % (name)
		email_body = "%s says : %s . Reach them at %s" % (name,message,email)
		
		try:
			send_mail(email_subect,email_body,email,[toEmail],fail_silently=False)
		except:
			print "Did not send email!"
		return render(request,"splash.html",context)
	else:
		return render(request,"splash.html",context)

@login_required
def archive(request):
	context = {}
	#data belonging to user
	data = Data.objects.filter(owners=request.user.id)
	print data
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
	tagForm.fields['existingTags'].label = "Existing Tags"
	context['tagForm'] = tagForm
	cardForm = CardSelectForm()
	cardForm.fields['existingCards'].queryset = Card.objects.filter(owners=request.user.id)
	cardForm.fields['existingCards'].label = "Existing Cards"
	context['form'] = cardForm
	if request.method != 'POST':
		return render(request,"archive.html",context)
	else:
		print request.FILES
		files = request.FILES.getlist('data')
		for file in files:
			newFile = File(file=file)
			newFile.save()
			
			try:
				im = Image.open(file)
				exif_data = filereader.get_exif_data(im)
				print exif_data
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
	data = Data.objects.filter(owners=request.user.id)
	print data
	context['data'] = data
	return render(request,"archive.html",context)
	
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
		mostRecentCards = Card.objects.order_by('-id').filter(owners=request.user)[:5]
		allCards = Card.objects.filter(owners=request.user)
		context['recentCards'] = mostRecentCards
		context['allCards'] = allCards
		context['cards'] = mostRecentCards
		#return render(request,"manage.html",context)
		return render(request,"stacks.html",context)
		
@login_required
def visualize(request):
	if request.method != "POST":
		print "select data first!"
		return redirect("manage")
	csvFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	csvFile = default_storage.open(csvFileName,'w+')
	fieldnames = ['fulcrum_id','FacilityType','latitude','longitude']
	writer = csv.DictWriter(csvFile,fieldnames=fieldnames)
	writer.writeheader()
	cardIds = json.loads(request.POST["data"])
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			writer.writerow({'fulcrum_id': data.name,'FacilityType': 'None','latitude':data.lat,'longitude':data.lon})
	csvFile.close()
				
	typeOfAnalysis = request.POST["analysis"]
	if typeOfAnalysis == "proximity network":
		return redirect("proximity",csvFileName)
	elif typeOfAnalysis == "heat":
		return redirect("heat",csvFileName)
	elif typeOfAnalysis == "Triangulated Irregular Network":
		return redirect("tin",csvFileName)
	else:
		print "analyis not supported... yet"
		return HttpResponse("Analysis not supported... yet")
	return render(request,"visualize.html")

def proximity(request,fileName):
	proximityFileName = 'data/' + str(uuid.uuid1()) + '.csv'
	p = Popen(['java','-jar','distanceCalculator.jar','https://s3.amazonaws.com/symkala5/' + fileName,",","0.005","True",proximityFileName],stdout=PIPE,stderr=STDOUT)
	for line in p.stdout:
		print line
	return render(request,"proximity.html",{'fileName' : fileName,'forceFileName' : proximityFileName})
	
def heat(request,fileName):
	return render(request,"heat.html",{'fileName' : fileName})
	
def tin(request,fileName):
	return render(request,"tin.html",{'fileName' : fileName})

def analysis(request):
	cardIds = json.loads(request.POST["cards"])
	dataElements = [];
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			print data
			dataElements.append(data)
	#this will get generated by the logic tree later
	if not cardIds:
		analysis = []
	elif len(cardIds) == 2:
		analysis = ["heat","Triangulated Irregular Network","proximity network"]
	elif len(cardIds) > 2:
		analysis = ["heat","Triangulated Irregular Network","proximity network","location based proximity analysis","Event analysis","Rhetorical Analysis","Managerial Fit","Hamming"]
	else:
		analysis = ["heat","Triangulated Irregular Network"]
	return JsonResponse(analysis,safe=False)

def deleteBatchData(request):
	dataIds = json.loads(request.POST.get("dataToDelete"))
	for dataId in dataIds:
		data = Data.objects.get(id=dataId,owners=request.user)
		data.delete()
	return redirect("archive")
	
def cardData(request):
	cardIds = json.loads(request.GET["cards"])
	dataElements = [];
	for cardId in cardIds:
		card = Card.objects.get(id=cardId)
		cardData = card.data.all()
		for data in cardData:
			dataInfo = {'name' : data.name, 'lat' : data.lat, 'lon' : data.lon}
			dataElements.append(dataInfo)
	return JsonResponse(dataElements,safe=False)
	
def dataTools(request,dataId):
	context = {}
	data = Data.objects.get(id=dataId,owners = request.user.id);
	context["data"] = data
	return render(request,"dataTool.html",context)
		
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
		print dataElements
		if dataElements:
			for dataElement in dataElements:
				data = Data.objects.get(id=dataElement,owners = request.user.id)
				if tag:
					data.tag_set.add(tag)
				else:
					for tagName in tagNames.split():
						if Tag.objects.filter(name=tagName,owners = request.user).exists():
							print "tag %s already exists!" % (tagName)
							data.tag_set.add(Tag.objects.get(name=tagName,owners = request.user))
							continue
						new_tag = Tag(name=tagName)
						new_tag.save()
						new_tag.owners.add(request.user)
						new_tag.save()
						
						data.tag_set.add(new_tag)
						print new_tag
		else:
			for tagName in tagNames.split():
				if Tag.objects.filter(name=tagName,owners = request.user).exists():
					continue
				new_tag = Tag(name=tagName)
				new_tag.save()
				new_tag.owners.add(request.user)
				new_tag.save()
				print new_tag
	return redirect("archive")

def getTagNames(request,dataId):
	data = Data.objects.get(id=dataId,owners = request.user.id);
	tags = data.tag_set.all();
	tagNames = "";
	for tag in tags:	
		tagNames += " " + tag.name;
		print tag.name
	print tagNames;
	return HttpResponse(tagNames)
	
#helper function to add tags via AJAX call	
def addTag(request,dataId,tagName):
	print "adding tag!";
	data = Data.objects.get(id=dataId,owners = request.user.id);
	tag = Tag.objects.get(name=tagName,owners = request.user.id);
	data.tag_set.add(tag);
	return HttpResponse(getTagCount(request.user,tag));
	
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
	return redirect("archive");

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
		return HttpResponse(img.file.read())
	except:
		return
	
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
			email = form.cleaned_data['email']
			salt = hashlib.sha1(str(random.random())).hexdigest()[:5]
			activation_key = hashlib.sha1(salt+email).hexdigest()
			key_expires = datetime.datetime.now() + datetime.timedelta(2)
			
			user = User.objects.get(username=username)
			
			new_profile = UserProfile(user=user,activation_key=activation_key,
							key_expires=key_expires).save()
							
			email_subject = 'Confirm Symkala Account'
			email_body = "Hello %s.  Welcome to Symkala!  Click this link within 48 hours to confirm your account : http://symkala-dev2.elasticbeanstalk.com/confirm/%s" % (username,activation_key)
			
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
	if user_profile.key_expires < datetime.datetime.now(timezone.utc):
		user_profile = get_object_or_404(UserProfile,activation_key)
		user_profile.delete()
		return render_to_response('confirm_expired.html')
	user = user_profile.user
	user.is_active = True
	user.save()
	user.backend = 'django.contrib.auth.backends.ModelBackend'
	login(request,user)
	return render_to_response('confirm.html')
