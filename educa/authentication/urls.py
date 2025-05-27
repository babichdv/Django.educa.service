from django.urls import path
from .views import (
    LoginAPIView, RegistrationAPIView, UserRetrieveUpdateAPIView, GetUsersAPIView, GetMessagesAPIView
)

app_name = 'authentication'
urlpatterns = [
    path('userlist', GetUsersAPIView.as_view()),
    path('messages', GetMessagesAPIView.as_view()),
    path('user', UserRetrieveUpdateAPIView.as_view()),
    path('users/', RegistrationAPIView.as_view()),
    path('users/login/', LoginAPIView.as_view()),
]