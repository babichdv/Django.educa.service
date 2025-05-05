from django.db import models

class Message(models.Model):
    id =        models.AutoField(primary_key=True)
    time =      models.DateTimeField(auto_now=True, null=True)
    msg_text =  models.TextField(max_length=300, null=True)

    def __str__(self):
        return self.id
    