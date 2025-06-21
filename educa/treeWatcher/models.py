from django.db import models


class NodesEl(models.Model):
    id =            models.AutoField(primary_key=True)
    #time =          models.DateTimeField(auto_now=True, null=True)
    name =          models.TextField(max_length=300, null=True)
    description =   models.TextField(max_length=1400, null=True)
    amount =        models.TextField(max_length=100, null=True)

    parentId =      models.ForeignKey('self',
                                      verbose_name='parentId',
                                      related_name='childrens', 
                                      null=True, blank=True,
                                      on_delete=models.CASCADE
    )
    def __str__(self):
        return self.name
    