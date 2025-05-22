# from django.shortcuts import render
from django.http import JsonResponse
import paho.mqtt.client as mqtt
import json


messageObj = [{ 'data': 'Hello!'}]

def on_connect(mqtt_client, userdata, flags, rc):
    if rc == 0:
        print('MQTT Connected successfully')
        mqtt_client.subscribe('django/mqtt')
    else:
        print('Bad connection. Code:', rc)
def on_message(mqtt_client, userdata, msg):
    # from .models import Message
    # import datetime

    try:
        global messageObj 
        messageObj.append(json.loads( msg.payload.decode('utf-8').replace("'", '"')))
        print('До записи - ' + msg.payload.decode('utf-8'))
        # msg_record = Message(
        #     time     =  datetime.datetime.now(),
        #     msg_text =  msg.payload.decode('utf-8'),
        # )
        # msg_record.save()
        # print('После записи - ' +msg_record)
    except:
        print('Не записалось '+msg.payload.decode('utf-8'))


mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.username_pw_set('MQTT_USER', 'MQTT_PASSWORD')
mqtt_client.connect(
    host='broker.emqx.io',
    port=1883,
    keepalive=60
)
mqtt_client.loop_start()



# Create your views here.
def get_test_data(request):
    return JsonResponse(messageObj, safe=False)