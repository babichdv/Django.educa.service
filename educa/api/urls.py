from . import views
# from django.conf.urls import url
from django.urls import path
urlpatterns = [
    path('getTestData', views.get_test_data),
]