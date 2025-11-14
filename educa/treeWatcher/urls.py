from . import views
from django.urls import path
urlpatterns = [
    path('getTree', views.getNode),
    path('setTree', views.saveNodes),
    path('createNode', views.createNode),
    path('getDictionaries', views.getDictionaries),

    path('item-groups/', views.item_groups_view, name='item-groups'),
    path('item-units/', views.item_units_view, name='item-units'),
    path('measure-units/', views.measure_units_view, name='measure-units'),

]