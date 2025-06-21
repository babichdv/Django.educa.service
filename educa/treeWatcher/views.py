from django.http import JsonResponse
from treeWatcher.models import NodesEl
from django.views.decorators.csrf import csrf_exempt
import json

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

NodeAttributes = ['parentId', 'id', 'name', 'description', 'amount',]
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

        childrens = node.childrens.all()
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

    for nodeId in EditedNodes:
        if str(EditedNodes[nodeId]['id'])[:3] == 'new':
            if(not EditedNodes[nodeId]['isDeleted']):
                newNodeParams = {}
                for atr in NodeAttributes:
                    if atr=='id': continue
                    if atr=='parentId':
                        if str(EditedNodes[nodeId][atr])[:3] == 'new':
                            newNodeParams[atr] = NodesEl.objects.get(pk=newIdDictionary[EditedNodes[nodeId][atr]])
                        else:
                            newNodeParams[atr] = NodesEl.objects.get(pk=EditedNodes[nodeId][atr])
                        continue
                    newNodeParams[atr] = EditedNodes[nodeId][atr]
                newNode = NodesEl(**newNodeParams)
                newNode.save()
                
                newIdDictionary[EditedNodes[nodeId]['id']] = newNode.id

                EditedNodes[nodeId]['id'] = newNode.id
                EditedNodes[nodeId]['parentId'] = newNode.parentId.id
                loadedNodesId.append(newNode.id)
            else:
                loadedNodesId.append(EditedNodes[nodeId]['id'])

    for nodeId in EditedNodes:
        if nodeId in loadedNodesId: continue
        try:
            nodeInDB = NodesEl.objects.get(pk=nodeId)
        except:
            print('Нет такого node в бд')
            continue

        if(EditedNodes[nodeId]['isDeleted']):
            nodeInDB.delete()
        else:
            for atr in NodeAttributes:
                if atr=='parentId':
                    if EditedNodes[nodeId][atr] == -1: continue
                    if str(EditedNodes[nodeId][atr])[:3] == 'new':
                        EditedNodes[nodeId][atr] = NodesEl.objects.get(pk=newIdDictionary[nodeId])
                    else:
                        EditedNodes[nodeId][atr] = NodesEl.objects.get(pk=nodeId)

                setattr(nodeInDB, atr, EditedNodes[nodeId][atr])
            nodeInDB.save()
            # for child in EditedNodes[nodeId].childrens:
            #     childNode = NodesEl.objects.get(pk=child)
            #     childNode.parent = nodeInDB.id
        
            
    return JsonResponse({}, safe=False, json_dumps_params={'ensure_ascii': False})
