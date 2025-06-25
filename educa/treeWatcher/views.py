from django.http import JsonResponse
from treeWatcher.models import NodesEl
from django.views.decorators.csrf import csrf_exempt
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

NodeAttributes = ['parentId', 'id', 'name', 'description', 'amount', 'isDeleted']
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
    # Для новых узлов для нового ID из бд, вместо newID
    for nodeId in EditedNodes:
        if str(EditedNodes[nodeId]['id'])[:3] == 'new':
            # if(not EditedNodes[nodeId]['isDeleted']):
            # else:
            #     loadedNodesId.append(EditedNodes[nodeId]['id'])
            newNodeParams = {}
            for atr in NodeAttributes:
                if atr=='id': continue
                if atr=='parentId':
                    if str(EditedNodes[nodeId]['parentId'])[:3] == 'new':
                        newNodeParams[atr] = None # NodesEl.objects.get(pk=newIdDictionary[EditedNodes[nodeId]['parentId']])
                        newParentsDictionary.append([ EditedNodes[nodeId]['id'], EditedNodes[nodeId]['parentId'] ]) # [x][0]-nodeId, [x][1]-'new'parentId
                    else:
                        newNodeParams[atr] = NodesEl.objects.get(pk=EditedNodes[nodeId][atr])
                    continue
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
    # Для остальных узлов 
    for nodeId in EditedNodes:
        if nodeId in loadedNodesId: continue
        try:
            nodeInDB = NodesEl.objects.get(pk=nodeId)
        except:
            print('Нет такого node в бд')
            continue

        # if(EditedNodes[nodeId]['isDeleted']):
        #     nodeInDB.delete()
        # else:
        for atr in NodeAttributes:
            if atr=='parentId':
                if EditedNodes[nodeId]['parentId'] == -1: continue
                if str(EditedNodes[nodeId]['parentId'])[:3] == 'new':
                    EditedNodes[nodeId]['parentId'] = None #NodesEl.objects.get(pk=newIdDictionary[nodeId])
                    newParentsDictionary.append([ nodeId, EditedNodes[nodeId]['parentId'] ]) # [x][0]-nodeId, [x][1]-'new'parentId
                else:
                    EditedNodes[nodeId][atr] = NodesEl.objects.get(pk=nodeId).parentId

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
