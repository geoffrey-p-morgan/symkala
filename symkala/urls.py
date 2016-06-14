"""symkala URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Import the include() function: from django.conf.urls import url, include
    3. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""
from django.conf.urls import url
from django.contrib import admin

from django.conf import settings
from django.conf.urls.static import static

from symkalaweb import views

urlpatterns = [
    url(r'^admin/', admin.site.urls),
	url(r'^login$','django.contrib.auth.views.login',{'template_name':'login.html'},name='login'),
	url(r'^logout/$','django.contrib.auth.views.logout',{'template_name':'login.html'},name='logout'),
	url(r'password_change/$','django.contrib.auth.views.password_change',name='passwordchange'),
	url(r'password_change_done','django.contrib.auth.views.password_change_done',name="password_change_done"),
	url(r'^reset/$','django.contrib.auth.views.password_reset',name='reset'),
	url(r'^resetDone/$','django.contrib.auth.views.password_reset_done',name='password_reset_done'),
	url(r'^password_reset_complete','django.contrib.auth.views.password_reset_complete',name='password_reset_complete'),
	url(r'^reset/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$','django.contrib.auth.views.password_reset_confirm',name='password_reset_confirm' ),
	url(r'account/$',views.account,name="account"),
	
	#core workflow urls
	url(r'^archive/$',views.archive,name='archive'),
	url(r'^twitter/$',views.twitter,name='twitter'),
	url(r'^manage/$',views.manage,name='manage'),
	url(r'^visualize/$',views.visualize,name='visualize'),
	url(r'^share/$',views.share,name='share'),

	#registration urls
	url(r'^register/$',views.register,name='register'),
	url(r'^register_success/$',views.register_success),
	url(r'^confirm/(?P<activation_key>\w+)/',views.register_confirm),
	
	#analysis urls
	url(r'scatter/(?P<fileName>([\w./\-]+))/$',views.scatter,name="scatter"),
	url(r'^proximity/$',views.proximity,name='proximity'),
	url(r'^heat/$',views.heat,name='heat'),
	url(r'^poi/$',views.poi,name="poi"),
	url(r'^tin/$',views.tin,name='tin'),
	url(r'^text/(?P<fileName>([\w./\-]+))/$',views.text,name='text'),
	
	#helper urls
	url(r'^tag/$',views.tag,name='tag'),
	url(r'^api/(?P<img_id>\w+)/$',views.img_api,name= 'img_api'),
	url(r'^analysis/$',views.analysis,name ='analysis'),
	url(r'^getColumnOptions/$',views.getColumnOptions,name="getColumnOptions"),
	url(r'^deleteBatchData/$',views.deleteBatchData,name='deleteBatchData'),
	url(r'^removeTag/$',views.removeTag,name='removeTag'),
	url(r'^deleteTag/$',views.deleteTag,name='deleteTag'),
	url(r'^deleteData/(?P<dataId>(\d+))/$',views.deleteData,name='deleteData'),
	url(r'^getTagNames/(?P<dataId>(\d+))/$',views.getTagNames,name='getTagNames'),
	url(r'^createCard/$',views.createCard,name='createCard'),
	url(r'^deleteCard/$',views.deleteCard,name='deleteCard'),
	url(r'^cardData/$',views.cardData,name='cardData'),
	url(r'^textPreview/(?P<dataId>(\d+))/$',views.textPreview,name='textPreview'),
	url(r'clarifaiApi/(?P<dataId>(\d+))/$',views.clarifaiTag,name="clarifaiApi"),
	url(r'loadKeywords/(?P<dataId>(\d+))/$',views.loadKeywords,name="loadKeywords"),
	url(r'^cliff/(?P<text>[\w\ ]+)',views.cliff,name='cliff'),
	
	url(r'^$','django.contrib.auth.views.login',{'template_name':'login.html'},name='splash'),
] + static(settings.STATIC_URL,document_root = settings.STATIC_ROOT)
