from django import forms

from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm

from models import *

class uploadForm(forms.Form):
	class Meta:
		model = File
		exclude = (
			'type'
		)
		
	def clean_file(self):
		file = self.cleaned_data['file']
		if not file:
			return None
		if not file.content_type:
			raise forms.ValidationError('File type is not supported')
		return file
		

class TagSelectForm(forms.Form):
	existingTags = forms.ModelChoiceField(queryset=Tag.objects.all())

class CardSelectForm(forms.Form):
	existingCards = forms.ModelChoiceField(queryset=Card.objects.all())

## 
# User registration form for symkala web release. 
# Users must have symkala email and the username they choose must be unique
# Email must have not been used previously as well. 
class RegistrationForm(UserCreationForm):
	first_name = forms.CharField(required=True,max_length=20)
	last_name = forms.CharField(required=True,max_length=20)
	email = forms.EmailField(required=True,max_length=40)
	organization = forms.CharField(max_length=40)
	
	class Meta:
		model = User
		fields = ('first_name','last_name','email','username','password1','password2')
		
	def clean(self):
		cleaned_data = super(RegistrationForm,self).clean()
		password1 = cleaned_data.get('password1')
		password2 = cleaned_data.get('password2')
		if password1 and password2 and password1 != password2:
			raise forms.ValidationError("passwords did not match")
		return cleaned_data
	
	def clean_email(self):
		email = self.cleaned_data["email"]
		if not email.endswith("symkala.com"):
			raise forms.ValidationError("Only symkala emails allowed!")
		try:
			User._default_manager.get(email=email)
		except User.DoesNotExist:
			return email
		raise forms.ValidationError("Email already in use!")
		
	def save(self,commit=True):
		user = super(RegistrationForm,self).save(commit=False)
		user.email = self.cleaned_data['email']
		if commit:
			user.is_active = False
			user.save()
			
		return user
		
	def clean_username(self):
		user_name = self.cleaned_data.get('username')
		if User.objects.filter(username__exact=user_name):
			raise forms.ValidationError("username is already taken.")
		
		return user_name
		