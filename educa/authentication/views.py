from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from .renderers import UserJSONRenderer
from .serializers import (
    LoginSerializer, RegistrationSerializer, UserSerializer,
)

import json

class RegistrationAPIView(APIView):
    """
    Разрешить всем пользователям (аутентифицированным и нет) доступ к данному эндпоинту.
    """
    permission_classes = (AllowAny,)
    serializer_class = RegistrationSerializer
    renderer_classes = (UserJSONRenderer,)

    def post(self, request):
        user = request.data.get('user', {})
        
        serializer = self.serializer_class(data=user)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class LoginAPIView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer
    renderer_classes = (UserJSONRenderer,)

    def post(self, request):
        user = request.data.get('user', {})

        # Обратите внимание, что мы не вызываем метод save() сериализатора, как
        # делали это для регистрации. Дело в том, что в данном случае нам
        # нечего сохранять. Вместо этого, метод validate() делает все нужное.
        serializer = self.serializer_class(data=user)
        serializer.is_valid(raise_exception=True)

        return Response(serializer.data, status=status.HTTP_200_OK)
    
class UserRetrieveUpdateAPIView(RetrieveUpdateAPIView): # По токену дать (+обновить?) логин и токен юзера 
    permission_classes = (IsAuthenticated,)
    renderer_classes = (UserJSONRenderer,)
    serializer_class = UserSerializer
    def retrieve(self, request, *args, **kwargs):
        serializer = self.serializer_class(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        print('update In')
        serializer_data = request.data.get('user', {})

        # Паттерн сериализации, валидирования и сохранения
        serializer = self.serializer_class(
            request.user, data=serializer_data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)
    
from .models import User, Message
class GetUsersAPIView(RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    # renderer_classes = (UserJSONRenderer,)
    serializer_class = UserSerializer
    
    def get(self, request, *args, **kwargs):
        # serializer = self.serializer_class(request.user)
        response = []
        users = User.objects.exclude(username= request.user)
        for user in users:
            response.append({
                "username": user.username,
                }
            )
        
        print(response)
        return Response(response, status=status.HTTP_200_OK)
    
class GetMessagesAPIView(RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    # renderer_classes = (UserJSONRenderer,)
    serializer_class = UserSerializer
    
    def get(self, request, *args, **kwargs):


        u = User.objects.get(username=request.user)
        messages = Message.objects.filter(Q(user_from=u)| Q(user_to=u)).order_by('time')

        response = []
        for message in messages:
            response.append({
                "id": message.id,
                "time": message.time,
                "msg_text": message.msg_text,
                "user_from": message.user_from.username,
                "user_to": message.user_to.username,
            })
        
        return Response({"messages":response}, status=status.HTTP_200_OK)
    
    def post(self, request, *args, **kwargs):
        
        # print(request.user) # Активный пользователь
        user = request.data.get('user', {}) # Пользователь из параметра
        print(user)
        messages = Message.objects.create(msg_text= user['message'], 
                                          user_from= User.objects.get(username=request.user),
                                          user_to= User.objects.get(username=user['username']))


        return Response({}, status=status.HTTP_200_OK)