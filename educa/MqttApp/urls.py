from django.urls import path
from MqttApp import views

urlpatterns = [
    path('', views.show_messages, name='MqttApp'),
]
