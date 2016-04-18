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
	url(r'^logout/$','django.contrib.auth.views.logout_then_login',name='logout'),
	
	#core workflow urls
	url(r'^archive/$',views.archive,name='archive'),
	url(r'^manage/$',views.manage,name='manage'),
	url(r'^visualize/$',views.visualize,name='visualize'),
	url(r'^proximity/(?P<fileName>([\w./\-]+))/$',views.proximity,name='proximity'),
	url(r'^heat/(?P<fileName>([\w./\-]+))/$',views.heat,name='heat'),
	url(r'^tin/(?P<fileName>([\w./\-]+))/$',views.tin,name='tin'),
	url(r'^view/(?P<dataId>(\d+))/$',views.dataTools,name='viewData'),

	#registration urls
	url(r'^register/$',views.register,name='register'),
	url(r'^register_success/$',views.register_success),
	url(r'^confirm/(?P<activation_key>\w+)/',views.register_confirm),
	
	#helper urls
	url(r'^tag/$',views.tag,name='tag'),
	url(r'^api/(?P<img_id>\w+)/$',views.img_api,name= 'img_api'),
	url(r'^analysis/$',views.analysis,name ='analysis'),
	url(r'^deleteBatchData/$',views.deleteBatchData,name='deleteBatchData'),
	url(r'^addTag/(?P<dataId>(\d+))/(?P<tagName>([\w\ ]+))/$',views.addTag,name='addTag'),
	url(r'^removeTag/$',views.removeTag,name='removeTag'),
	url(r'^deleteTag/$',views.deleteTag,name='deleteTag'),
	url(r'^deleteData/(?P<dataId>(\d+))/$',views.deleteData,name='deleteData'),
	url(r'^getTagNames/(?P<dataId>(\d+))/$',views.getTagNames,name='getTagNames'),
	url(r'^getData/(?P<dataSetId>(\d+))/$',views.getData,name='getData'),
	url(r'^createCard/$',views.createCard,name='createCard'),
	url(r'^deleteCard/$',views.deleteCard,name='deleteCard'),
	url(r'^cardData/$',views.cardData,name='cardData'),
	
	url(r'^$',views.splash,name='splash'),
] + static(settings.STATIC_URL,document_root = settings.STATIC_ROOT)
