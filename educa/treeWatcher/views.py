from django.http import JsonResponse
from treeWatcher.models import NodesEl, ItemGroup, ItemUnit, MeasureUnit
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

import json
from django.db.models import Q

@csrf_exempt
def getNode(request):
    nodeId = int(request.POST.dict().get("nodeId", None))
    depth  = int(request.POST.dict().get("depth", None))

    nodeMassive = {"nodes":{}, "endBranches":[]}
    
    # Получаем начальный узел
    try:
        node = NodesEl.objects.get(pk=nodeId)
        nodeMassive["endBranches"].append({ node.id : node.parentId })
    except:
        return JsonResponse({'error': 'Root node not found'}, status=404)
    for i in range(depth):
        endBranchesGrow(nodeMassive)
        
    return JsonResponse(nodeMassive, safe=False, json_dumps_params={'ensure_ascii': False})

NodeAttributes = [ 'id', 'name', 'amount', 'isDeleted', 'itemGroupId', 'parentId', 'ItemUnitId', 'price', 'isPriceFixed' ]

def endBranchesGrow(nodeMassive):
    newEndBranches=[]
    for branch in nodeMassive["endBranches"]:

        node = NodesEl.objects.get(pk=list(branch.keys())[0])
        node_data = {
            'active': False,
            'isExpanded': False,
            'isEditing': False,
            'isDeleted': False,
            'childrens': []
        }
        for atr in NodeAttributes:
            node_data[atr] = getattr(node, atr)


        if(node.parentId):
            node_data['parentId'] = node.parentId.id
        else:
            node_data['parentId'] = -1
            
        if(node.itemGroupId):
            node_data['itemGroupId'] = node.itemGroupId.id
        else:
            node_data['itemGroupId'] = 0

        if(node.ItemUnitId):
            node_data['ItemUnitId'] = node.ItemUnitId.id
        else:
            node_data['ItemUnitId'] = 0

        childrens = node.childrens.filter(Q(isDeleted=False) | Q(isDeleted__isnull=True)).all()
        if(childrens):
            for child in childrens:
                node_data['childrens'].append(child.id)
                newEndBranches.append({child.id : node.id})
        else: node_data['isLast'] = True
            

        # перегоняем их в nodeMassive-nodes из nodeMassive-endBranches
        nodeMassive["nodes"][node.id] = node_data
    nodeMassive["endBranches"] = newEndBranches
    
    # return node_data

@csrf_exempt
def saveNodes(request):
    EditedNodes = json.loads(request.POST.dict().get("EditedNodes", None))
    newIdDictionary = {}
    loadedNodesId = []
    newParentsDictionary = []  # [x][0]-nodeId, [x][1]-'new'parentId

    # Для новых узлов c newId - для нового ID из бд, вместо newID
    for nodeId in EditedNodes:
        if str(EditedNodes[nodeId]['id'])[:3] == 'new':
            newNodeParams = {}
            for atr in NodeAttributes:
                match atr:
                    case 'id': continue
                    case 'parentId':
                        if str(EditedNodes[nodeId]['parentId'])[:3] == 'new':
                            newNodeParams[atr] = None
                            newParentsDictionary.append([ EditedNodes[nodeId]['id'], EditedNodes[nodeId]['parentId'] ]) # [x][0]-nodeId, [x][1]-'new'parentId
                        else:
                            newNodeParams[atr] = NodesEl.objects.get(pk=EditedNodes[nodeId]['parentId'])
                    case 'itemGroupId':
                        newNodeParams[atr] = ItemGroup.objects.get(pk=EditedNodes[nodeId]['itemGroupId']) if EditedNodes[nodeId]['itemGroupId'] else None
                    case 'ItemUnitId':
                        newNodeParams[atr] = ItemUnit.objects.get(pk=EditedNodes[nodeId]['ItemUnitId']) if EditedNodes[nodeId]['ItemUnitId'] else None
                    case _:
                        newNodeParams[atr] = EditedNodes[nodeId][atr]
            newNode = NodesEl(**newNodeParams)
            newNode.save()
            
            newIdDictionary[EditedNodes[nodeId]['id']] = newNode.id

            EditedNodes[nodeId]['id'] = newNode.id
            if(newNode.parentId):
                EditedNodes[nodeId]['parentId'] = newNode.parentId.id

            loadedNodesId.append(newNode.id)
    
    # Заменяем newId у newParentsDictionary
    for change in newParentsDictionary:
        change[0] = newIdDictionary[change[0]]

    # Для остальных узлов - уже существующих
    for nodeId in EditedNodes:
        if nodeId in loadedNodesId: continue
        try:
            nodeInDB = NodesEl.objects.get(pk=nodeId)
        except:
            print('Нет такого node в бд')
            continue
        for atr in NodeAttributes:
            if atr=='parentId':
                if EditedNodes[nodeId]['parentId'] == -1: continue
                if str(EditedNodes[nodeId]['parentId'])[:3] == 'new':
                    EditedNodes[nodeId]['parentId'] = None
                    newParentsDictionary.append([ nodeId, EditedNodes[nodeId]['parentId'] ]) # [x][0]-nodeId, [x][1]-'new'parentId
                else:
                    EditedNodes[nodeId][atr] = NodesEl.objects.get(pk=nodeId).parentId
            if atr=='itemGroupId':
                EditedNodes[nodeId]['itemGroupId'] = ItemGroup.objects.get(pk=EditedNodes[nodeId]['itemGroupId']) if EditedNodes[nodeId]['itemGroupId'] else None
            if atr=='ItemUnitId':
                EditedNodes[nodeId]['ItemUnitId'] = ItemUnit.objects.get(pk=EditedNodes[nodeId]['ItemUnitId']) if EditedNodes[nodeId]['ItemUnitId'] else None
                
            setattr(nodeInDB, atr, EditedNodes[nodeId][atr])
        nodeInDB.save()

    # В конце добавляет родителей
    for change in newParentsDictionary:
        try:
            node = NodesEl.objects.get(pk=change[0])
            node.parentId = NodesEl.objects.get(pk=newIdDictionary[change[1]])
            node.save()
            EditedNodes[nodeId]['parentId'] = newIdDictionary[change[1]]
        except: None

    return JsonResponse(newIdDictionary, safe=False, json_dumps_params={'ensure_ascii': False})

@csrf_exempt
def createNode(request):
    requestedNode = json.loads(request.POST.dict().get("newNode", None))
    # print(requestedNode)
    newNodeParams = {}
    for atr in NodeAttributes:
        match atr:
            case 'id': continue
            case 'parentId':
                newNodeParams[atr] = NodesEl.objects.get(pk= requestedNode[atr])
            case 'itemGroupId' | 'ItemUnitId':
                if atr in requestedNode:
                    newNodeParams[atr] = requestedNode[atr].id if requestedNode[atr] else None
            case _:
                newNodeParams[atr] = requestedNode[atr]
    newNode = NodesEl(**newNodeParams)
    newNode.save()
    
    return JsonResponse(newNode.id, safe=False, json_dumps_params={'ensure_ascii': False})

@csrf_exempt
def getDictionaries(request):
    item_units = ItemUnit.objects.values(
        'id', 'name', 'price', 'orderValue', 'ItemGroup', 'measureUnit'
    )
    item_groups = ItemGroup.objects.values('id', 'name', 'orderValue')

    Dictionaries = {
        "ItemUnit": {str(item['id']): item for item in item_units},
        "ItemGroup": {str(item['id']): item for item in item_groups},
    }
    return JsonResponse(Dictionaries, safe=False, json_dumps_params={'ensure_ascii': False})

@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def item_groups_view(request):
    try:
        if request.method == 'GET':
            # Получение списка всех групп
            groups = list(ItemGroup.objects.values())
            return JsonResponse(groups, safe=False)
            
        data = json.loads(request.body)
        
        if request.method == 'POST':
            # Создание новой группы
            group = ItemGroup.objects.create(
                name=data.get('name', ''),
                orderValue=data.get('orderValue', 0)
            )
            return JsonResponse({'status': 'created', 'id': group.id})
            
        elif request.method == 'PUT':
            # Обновление существующей группы
            group = ItemGroup.objects.get(id=data['id'])
            group.name = data.get('name', group.name)
            group.orderValue = data.get('orderValue', group.orderValue)
            group.save()
            return JsonResponse({'status': 'updated', 'id': group.id})
            
        elif request.method == 'DELETE':
            # Удаление группы
            ItemGroup.objects.get(id=data['id']).delete()
            return JsonResponse({'status': 'deleted'})
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def item_units_view(request):
    try:
        if request.method == 'GET':
            # Получение списка всех единиц товаров
            units = list(ItemUnit.objects.select_related('measureUnit', 'ItemGroup').values(
                'id', 'name', 'price', 'orderValue',
                'measureUnit', 'ItemGroup'
            ))
            return JsonResponse(units, safe=False)

        data = json.loads(request.body)

        if request.method == 'POST':
            unit = ItemUnit.objects.create(
                name=data.get('name', '')
            )
            return JsonResponse({'status': 'created', 'id': unit.id})
            
        elif request.method == 'PUT':
            # Обновление существующей единицы товара
            unit = ItemUnit.objects.get(id=data['id'])
            unit.name = data.get('name', unit.name)
            unit.price = data.get('price', unit.price)
            unit.orderValue = data.get('orderValue', unit.orderValue)
            unit.measureUnit = data.get('measureUnit', unit.measureUnit)
            unit.ItemGroup = data.get('ItemGroup', unit.ItemGroup)
            unit.save()
            return JsonResponse({'status': 'updated', 'id': unit.id})
            
        elif request.method == 'DELETE':
            ItemUnit.objects.get(id=data['id']).delete()
            return JsonResponse({'status': 'deleted'})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    
    
@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def measure_units_view(request):
    try:
        if request.method == 'GET':
            # Получение списка всех единиц измерения
            units = list(MeasureUnit.objects.values('id', 'name'))
            return JsonResponse(units, safe=False)
            
        data = json.loads(request.body)
        
        if request.method == 'POST':
            # Создание новой единицы измерения
            unit = MeasureUnit.objects.create(
                name=data.get('name', '')
            )
            return JsonResponse({'status': 'created', 'id': unit.id})
            
        elif request.method == 'PUT':
            # Обновление существующей единицы измерения
            unit = MeasureUnit.objects.get(id=data['id'])
            unit.name = data.get('name', unit.name)
            unit.save()
            return JsonResponse({'status': 'updated', 'id': unit.id})
            
        elif request.method == 'DELETE':
            # Удаление единицы измерения
            MeasureUnit.objects.get(id=data['id']).delete()
            return JsonResponse({'status': 'deleted'})
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

# Дополнительные views для связанных данных (select-полей)
@csrf_exempt
def measureunits_list(request):
    units = list(MeasureUnit.objects.values('id', 'name'))
    return JsonResponse(units, safe=False)

@csrf_exempt
def itemgroups_list(request):
    groups = list(ItemGroup.objects.values('id', 'name'))
    return JsonResponse(groups, safe=False)