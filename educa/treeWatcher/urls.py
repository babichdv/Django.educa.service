from . import views
from django.urls import path
urlpatterns = [
    path('getTree', views.getNode),
    path('setTree', views.saveNodes),
    path('createNode', views.createNode),
    path('getDictionaries', views.getDictionaries),

]
