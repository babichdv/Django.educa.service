import json
from django.http import JsonResponse
from paho.mqtt import client as mqtt_client
from .models import Message

class show_messages():
    model = Message
    template_name = '/base.html'
    paginate_by = 10

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context
    
class publish_message():
    def publish_message(request):
        request_data = json.loads(request.body)
        rc, mid = mqtt_client.publish(request_data['topic'], request_data['msg'])
        return JsonResponse({'code': rc})