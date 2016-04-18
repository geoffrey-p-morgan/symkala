from __future__ import unicode_literals

from django.db import models

from django.contrib.auth.models import User

from django.utils import timezone

from datetime import datetime

# Create your models here.

class File(models.Model):
	file = models.FileField(upload_to="static/files")
	type = models.CharField(max_length=30,default=None)

class Keyword(models.Model):
	name = models.CharField(max_length=50)
	
class Data(models.Model):
	name = models.CharField(max_length=150)
	lat = models.FloatField(null=True)
	lon = models.FloatField(null=True)
	owners = models.ManyToManyField(User)
	keywords = models.ManyToManyField(Keyword)
	file = models.OneToOneField(File,default=None)
	date = models.DateTimeField(default=datetime.now,blank=True)
	
	def __str__(self):
		return self.name

class DataSet(models.Model):
	owners = models.ManyToManyField(User)
	data = models.ManyToManyField(Data)
	name = models.CharField(max_length=30)
		
class Tag(models.Model):
	name = models.CharField(max_length=30)
	data = models.ManyToManyField(Data)
	dataSet = models.ManyToManyField(DataSet)
	owners = models.ManyToManyField(User)
	
	def __str__(self):
		return self.name
		
class Card(models.Model):
	name = models.CharField(max_length=30)
	data = models.ManyToManyField(Data)
	owners = models.ManyToManyField(User)
	
	def __str__(self):
		return self.name

class UserProfile(models.Model):
	user = models.OneToOneField(User)
	activation_key = models.CharField(max_length=40, blank=True)
	key_expires = models.DateTimeField(default=timezone.now())
	
	def __str__(self):
		return self.user.username
	
