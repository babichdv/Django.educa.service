from django.contrib import admin

from .models import Message


@admin.register(Message)
class MesageAdmin(admin.ModelAdmin):
    list_display = ['id', 'time', 'msg_text']
    # prepopulated_fields = {'slug': ('title',)}

