from django.db import models
from authentication.models import User
# Модель для получения сообщений из mqtt и отправки их по api для react

class MqttMessages(models.Model):
    user1 = models.ForeignKey(User,    # отправитель
                              related_name='messages_sender',
                              on_delete=models.CASCADE)
    user2 = models.ForeignKey(User,    # получатель
                              related_name='messages_getter',
                              on_delete=models.CASCADE)
    date = models.DateTimeField(auto_now_add=True)
    text = models.TextField(max_length=1024)

    class Meta:
        ordering = ['date']
