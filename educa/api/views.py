# from django.shortcuts import render
from django.http import JsonResponse
import paho.mqtt.client as mqtt
import json
from api.models import MqttMessages
from authentication.models import User
from django.views.decorators.csrf import csrf_exempt

# def on_connect(mqtt_client, userdata, flags, rc):
#     if rc == 0:
#         print('MQTT Connected successfully')
#         mqtt_client.subscribe('django/mqtt')
#     else:
#         print('Bad connection. Code:', rc)
# def on_message(mqtt_client, userdata, msg):
#     try:
#         messageObj= json.loads( msg.payload.decode('utf-8').replace("'", '"'))
#         print('Начало записи - ')
#         # print(messageObj)
#         user1 = messageObj.get('user1')
#         user2 = messageObj.get('user2')
#         text  = messageObj.get('text')
#         token = messageObj.get('token')

#         if (not (user1 and user2 and text and token)): 
#             raise ValueError('Не все данные введены')
        
#         sender = User.objects.filter(username= user1)
#         if (not sender): 
#             raise ValueError('Не найдены пользователи username')
        
#         sender = sender.filter(token= token)
#         if (not sender): 
#             raise ValueError('Токен не найден в бд')
        
#         msg_record = MqttMessages(
#             user1 = sender,
#             user2 = user2,
#             text =  text ,
#         )
#         msg_record.save()
#         # print('После записи - ' +msg_record)
#     except ValueError as err:
#         print(err)
#         print('- Не записалось')
#         # print('Не записалось '+msg.payload.decode('utf-8'))


# mqtt_client = mqtt.Client()
# mqtt_client.on_connect = on_connect
# mqtt_client.on_message = on_message
# mqtt_client.username_pw_set('MQTT_USER', 'MQTT_PASSWORD')
# mqtt_client.connect(
#     host='broker.emqx.io',
#     port=1883,
#     keepalive=60
# )
# mqtt_client.loop_start()


@csrf_exempt
def getTestData(request):
    return JsonResponse([], safe=False)


@csrf_exempt
def getUsers(request):
    try:
        username = request.POST.dict().get("username", None)
        token    = request.POST.dict().get("token", None)
        if (not (username and token)): 
            raise ValueError('Не все данные введены')
        usersQueryset = User.objects.exclude(username=username).values('username')

        usersMassive = []
        for i in usersQueryset:  # Только здесь выполнится SQL-запрос
            print(i)
            usersMassive.append(i)
        sender = {'usernames':usersMassive}
    except ValueError as err: 
        print("Данные о пользователях не отправлены")
        print(err)
        sender = {'error':'Данные о пользователях не отправлены'}

    return JsonResponse(sender, safe=False)


@csrf_exempt
def getUsersMessages(request):
    try:
        username = request.POST.get("username", None)
        token    = request.POST.get("token", None)
        user2    = request.POST.get("user2", None)

        if (not (username and token and user2)): 
            raise ValueError('Не все данные введены')
        sender = User.objects.filter(username= user2).messages_sender()
        print("Данные о сообщениях отправлены")
    except:
        print("Данные о сообщениях не отправлены")
        sender = {'error':'Данные о сообщениях не отправлены'}

    return JsonResponse(sender, safe=False)