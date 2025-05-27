from . import views
# from django.conf.urls import url
from django.urls import path
urlpatterns = [
    path('getTestData', views.getTestData),
    path('getUsers', views.getUsers),
    path('getUsersMassages', views.getUsersMessages),
]