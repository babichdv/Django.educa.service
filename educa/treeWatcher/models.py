from django.db import models


class ItemGroups(models.Model):
    id            = models.AutoField(primary_key=True)
    name          = models.TextField(max_length=300, null=True)
    orderValue    = models.IntegerField(max_length=10, null=True)

class NodesEl(models.Model):
    id            = models.AutoField(primary_key=True)
    name          = models.TextField(max_length=300, null=True)
    amount        = models.TextField(max_length=100, null=True)
    chosenItem    = models.IntegerField(max_length=10, null=True)
    #time         = models.DateTimeField(auto_now=True, null=True)
    #description  = models.TextField(max_length=1400, null=True)

    itemGroup     = models.ForeignKey(ItemGroups,
                                      verbose_name='ItemGroup',
                                      related_name='items', 
                                      null=True, blank=True,
                                      on_delete=models.CASCADE)


    isDeleted     = models.BooleanField(null=True)

    parentId      = models.ForeignKey('self',
                                      verbose_name='parentId',
                                      related_name='childrens', 
                                      null=True, blank=True,
                                      on_delete=models.CASCADE
    )
    def __str__(self):
        return self.name

