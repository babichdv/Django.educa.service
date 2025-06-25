import React, { useState, useEffect, act } from 'react';
import { store, mainUpdate } from '../index.jsx';

const ROOT = {
  nodes:{'-1':{
    name: "root",
    description: "",
    amount: null,
    
    id: '-1',
    parentId: null,
    childrens: [],
    isDeleted: false,

    active: true,
    isExpanded: true,
    isEditing: false,
    isChildLoaded: true,
  }},
  endBranches:[]
};
const Dict = new class{
  constructor(){
    this.translations = 
    {
      'name':'имя',
      'description':"описание",
      'amount':"количество",
    }
    this.nodeAttributionsToShow = [
      'name',
      'description',
      'amount',
    ]
  }
  upFirstLet(word){
      return String(word[0]).toUpperCase() + String(word).slice(1);
  }
  rus(word){
      return this.translations[word]
  }
}()
const EditedNodes = {}

const actionsHistory = [];//for undo
/*[ 
  {Edit: {from:'oldNode', to:'newNode'}},
  {Del: {nodeId:'nodeId', parentId:'nodeId'}}, // Удаление - открепление узла, а потом его потеря при сохранении на сервере
  {Relocate: {from: 'parentId', to: 'endParentId', nodeId:'nodeId'}},
  {AddChild: {nodeId: 'newNodeId', parentId: 'nodeId'}}
]*/
const undoHistory = []; //for redo
/*[
  {Edit:{node: 'node', futureNode: 'futureNode'}},
  {Del:{nodeId: 'nodeId', parentId:'parentId'}},
  {Relocate:{oldParentId: action.from, futureParentId: action.to}},
  {AddChild:{nodeId: 'newNodeId', parentId: 'nodeId'}}
]*/
async function fetchNodes(nodeId, depth = 1) {
  if(String(nodeId).slice(0,3)=='new') return;

  const formData = new FormData();
  formData.append("nodeId", nodeId);
  formData.append("depth", depth);
  
  const response = await fetch("treeWatcher/getTree", {
    method: "POST",
    body: formData
  });
  return await response.json();
}
async function loadNodes(nodeId, depth) {
  try {
    let newNodes = await fetchNodes(nodeId, depth)
    for (let newNode in newNodes.nodes){
      if(!ROOT.nodes[newNode])
        ROOT.nodes[newNode] = newNodes.nodes[newNode]
    }
    
  } catch (error) {
    
  }
}
/**
 * @param {*} parent - object or id
 * @param {*} childId 
 */
function deleteChild(parent, childId) {
  let parChi;
  if(typeof parent === 'object'){
    parChi = parent.childrens
  }else{
    parChi = ROOT.nodes[parent].childrens
  }
  const index = parChi.indexOf(childId);
  if (index !== -1) {
    parChi.splice(index, 1);
  }
}
function clearRedoHistory() {
  undoHistory.length = 0;
}

function handletoggleExpandNode(node){
  node.isExpanded = !node.isExpanded;
  node.childrens.forEach(childId=>{
    if( !ROOT.nodes[childId] ) { return }
    ROOT.nodes[childId].active = !ROOT.nodes[childId].active
  })
  store.dispatch(mainUpdate());
  if (!node.isChildLoaded)
    loadNodes(node.id,3)
    .then(node.isChildLoaded = true)
}


function handleEditNode(nodeId) {
  let node = ROOT.nodes[nodeId];
  Dict.nodeAttributionsToShow.map(atr=>{
    node['editing'+atr] = node[atr];

  })
  node.isEditing = true;
  store.dispatch(mainUpdate());
}
function handleEditNodeCancel(nodeId) {
  ROOT.nodes[nodeId].isEditing = false;
  store.dispatch(mainUpdate());
}
function handleEditNodeSave(nodeId) {
  EditNodeSave(nodeId);
  clearRedoHistory();
} // V V V V V
function EditNodeSave(nodeId, extraNode){
  // let newNodeToSave = {}
  let oldNodeToSave = {}
  let node = ROOT.nodes[nodeId];
  Object.assign(oldNodeToSave, node); //копирование детей и тд, для того, что не входит в Dict

  Dict.nodeAttributionsToShow.map(atr=>{
    if(extraNode){
      // newNodeToSave[atr] = extraNode[atr];
      node[atr] = extraNode[atr];
    }else{ // Если нет ноды, то берёт из инпутов
      let input = document.getElementById('node'+node.id+''+atr);
      // newNodeToSave[atr] = input.value;
      node[atr] = input.value;
    }
  })
  actionsHistory.push({Edit: {from: oldNodeToSave, to: node/*newNodeToSave*/}})
  EditedNodes[node.id] = node;
  node.isEditing = false;
  store.dispatch(mainUpdate());
}


function handleDeleteNode(nodeId) {
  if (window.confirm('Вы уверены, что хотите удалить этот узел?')) {
    let node = ROOT.nodes[nodeId];

    actionsHistory.push( {Del: {nodeId: nodeId, parentId: ROOT.nodes[nodeId].parentId}} );
    clearRedoHistory();
    EditedNodes[nodeId] = node;
    EditedNodes[node.parentId] = ROOT.nodes[node.parentId];

    deleteChild(node.parentId, node.id);
    node.isDeleted = true;
    store.dispatch(mainUpdate());
  }
};


let isRelocation = false;
let RelocationNodeId = null;
function handleRelocateNode(nodeId) {
  isRelocation = true;
  RelocationNodeId = nodeId;
  store.dispatch(mainUpdate());
};
function handleCancelRelocate(){
  isRelocation = false;
  RelocationNodeId = null;
  store.dispatch(mainUpdate());
}

function NodeRelocate(endParentNode) {
  let node = ROOT.nodes[RelocationNodeId];
  const parentNode = ROOT.nodes[node.parentId];

  // Защита  -  проверка
  let defError = false;
  function NodeRelocateCheck(node, endParentNodeId) {
    if (!node) return false;
    if(node.id != endParentNodeId){
      node.childrens.forEach(childId=> {
        if(NodeRelocateCheck(ROOT.nodes[childId], endParentNodeId))
          {defError=true}
      })
    }else{
      return true;
    }
    return false;
  }
  if(NodeRelocateCheck(node, endParentNode.id) || defError) return;

  actionsHistory.push( {Relocate: {from: node.parentId, to: endParentNode.id, nodeId: RelocationNodeId}} );
  EditedNodes[node.id] = node;
  EditedNodes[parentNode.id] = parentNode;
  EditedNodes[endParentNode.id] = endParentNode;
  clearRedoHistory();
  node.parentId = endParentNode.id;
  deleteChild(parentNode, node.id);
  endParentNode.childrens.push(node.id);
  
  isRelocation = false;
  RelocationNodeId = null;
  store.dispatch(mainUpdate());
}


let newNodeIdCounter = 1;
function handleAddChildNode(nodeId) {
  AddChildNode(nodeId);
  clearRedoHistory();
}
function AddChildNode(nodeId) {
  let node = ROOT.nodes[nodeId];
  let newNodeId = 'new'+newNodeIdCounter;

  let newNode = 
  {
    name: newNodeId,
    description: "",
    amount: null,
    
    id: newNodeId,
    parentId: node.id,
    childrens: [],

    active: true,
    isExpanded: false,
    isEditing: false,

    isDeleted: false,
  }
  ROOT.nodes[newNodeId] = newNode;
  node.childrens.push(newNodeId);

  actionsHistory.push( {AddChild: {nodeId: newNodeId, parentId: node.id}} );
  EditedNodes[node.id] = node;
  EditedNodes[newNodeId] = newNode;
  newNodeIdCounter += 1;
  store.dispatch(mainUpdate());
}


function handleUndo() {
  let lastAction = actionsHistory.pop();
  
  const [key, action] = Object.entries(lastAction)[0];
  switch (key) {
    case 'Edit':
      let node = action.to;
      let futureNode = {}
      Object.assign(futureNode, node);

      Dict.nodeAttributionsToShow.map(atr=>{
        node[atr] = action.from[atr]
      })
      undoHistory.push({Edit:{node: node, futureNode: futureNode}});
    break;
    case 'Del':
      ROOT.nodes[action.parentId].childrens.push(action.nodeId);
      ROOT.nodes[action.nodeId].isDeleted = false;
      undoHistory.push({Del:{nodeId: action.nodeId, parentId:action.parentId}})
    break;
    case 'Relocate':
      deleteChild(action.to, action.nodeId);                    // Удаляет из нового родителя
      ROOT.nodes[action.from].childrens.push(action.nodeId);    // Добавляет в старого родителя
      ROOT.nodes[action.nodeId].parentId = action.from;         // Изменяет родителя у узла
      undoHistory.push({Relocate:{oldParentId: action.from, futureParentId: action.to, nodeId: action.nodeId}})
    break;
    case 'AddChild':
      // newNodeIdCounter -= 1;
      // delete ROOT.nodes[action.nodeId];
      deleteChild(action.parentId, action.nodeId);
      ROOT.nodes[action.nodeId].isDeleted = true;
      undoHistory.push({AddChild:{nodeId: action.nodeId, parentId: action.parentId}});

    break;
  }
  store.dispatch(mainUpdate());

}
/*
[// KEY:         ACTION           for undo
  {Edit: {from:'oldNode', to:'newNode'}},
  {Del: {nodeId:'nodeId', parentId:'nodeId'}}, // Удаление - открепление узла, а потом его потеря при сохранении на сервере
  {Relocate: {from: 'parentId', to: 'endParentId', nodeId:'nodeId'}},
  {AddChild: {nodeId: 'newNodeId', parentId: 'nodeId'}}
]
/// undoHistory for redo
[
  {Edit:{node: 'node', futureNode: 'futureNode'}},
  {Del:{nodeId: 'nodeId', parentId:'parentId'}},
  {Relocate:{oldParentId: action.from, futureParentId: action.to}},
  {AddChild:{nodeId: 'newNodeId', parentId: 'nodeId'}}
]*/
function handleRedo() {
  let lastAction = undoHistory.pop();

  const [key, action] = Object.entries(lastAction)[0];
  switch (key) {
    case 'Edit':
      EditNodeSave(action.node.id, action.futureNode);
    break;
    case 'Del':
      actionsHistory.push( {Del: {nodeId: action.nodeId, parentId: action.parentId}} );
      ROOT.nodes[action.nodeId].isDeleted = true;
      deleteChild(ROOT.nodes[action.nodeId].parentId, action.nodeId);
    break;
    case 'Relocate':
      actionsHistory.push( {Relocate: {from: action.oldParentId, to: action.futureParentId, nodeId: action.nodeId}} );
      ROOT.nodes[action.nodeId].parentId = action.futureParentId;
      deleteChild(action.oldParentId, action.nodeId);
      ROOT.nodes[action.futureParentId].childrens.push(action.nodeId);
    break;
    case 'AddChild':
      ROOT.nodes[action.parentId].childrens.push(action.nodeId);
      ROOT.nodes[action.nodeId].isDeleted = false;
    break;
  }
  store.dispatch(mainUpdate());
}

async function handleSaveAll() {
  const formData = new FormData();
  formData.append("EditedNodes", JSON.stringify(EditedNodes));
  try {

    let response = await fetch('treeWatcher/setTree',{
      method: "POST",
      body: formData
    })
    let newIdsDict = await response.json();
    

    // изменяет свой Id у actions Undo/redo
    actionsHistory.forEach( action=> {
      let [actionName, actionValues] = Object.entries(action)[0];

      Object.entries(actionValues).forEach( 
        ([actionValueName, actionValue]) => {
          if( typeof actionValue !== "object" && newIdsDict[actionValue] ){
            action[actionName][actionValueName] = newIdsDict[actionValue]
          }
        })
    })
    undoHistory.forEach( action=> {
      let [actionName, actionValues] = Object.entries(action)[0];

      Object.entries(actionValues).forEach( 
        ([actionValueName, actionValue]) => {
          if( typeof actionValue !== "object" && newIdsDict[actionValue] ){
            action[actionName][actionValueName] = newIdsDict[actionValue]
          }
        })
    })

    // изменяет свой Id у родителя
    for (let id of Object.keys(newIdsDict)) {
      let parent = ROOT.nodes[ROOT.nodes[id].parentId]
      deleteChild(parent, id);
      parent.childrens.push(newIdsDict[id]);
    }
    // изменяет Id у себя
    for (let id of Object.keys(newIdsDict)) {
      ROOT.nodes[id].id = newIdsDict[id];
      ROOT.nodes[newIdsDict[id]] = ROOT.nodes[id];
      delete ROOT.nodes[id];
    }
    // изменяет EditedNodes
    for (let id of Object.keys(newIdsDict)) {
      EditedNodes[newIdsDict[id]] = EditedNodes[id];   
      delete EditedNodes[id];
    }
  } catch (error) {
    alert("Ошибка сохранения!")
  }
}
function UIWindow({ children }) {
  return(
  <div className='UIWindow'>
    {isRelocation? <style>{'.tree-node > .nodeInfo:hover { background:rgb(185, 141, 141); }'}</style> :''/*Стиль для выбираемых для relocate узлов*/} 
    <div className='interface'>
      <button className='interfaceBtn' onClick={()=>handleCancelRelocate()} disabled={!isRelocation} > Cancel Relocation </button>
      <button className='interfaceBtn' onClick={()=>handleUndo()} disabled={isRelocation || !(actionsHistory?.length>0) }> Undo </button>
      <button className='interfaceBtn' onClick={()=>handleRedo()} disabled={isRelocation || !(undoHistory?.length>0) }> Redo </button>
      <button className='interfaceBtn' onClick={()=>handleSaveAll()} disabled={isRelocation}> Save </button>
    </div>
    <div className='UIWindowBody'>
      { children }
    </div>
  </div>)
}

function handlerNodeInfo(node) {
  if(isRelocation){ NodeRelocate(node) }
}
function NodeInfo(nodeObj){
  let node = nodeObj.node;
  if(!node.isExpanded) return '';

  return <div className="nodeInfo" onClick={()=>{handlerNodeInfo(node)}}>

    <table className="nodeInfoAttrs"><tbody>
      {Dict.nodeAttributionsToShow.map((atr, key)=>
        <tr key={key}>
          <td>{ Dict.upFirstLet(Dict.rus(atr)) +': ' }</td>
          <td>{ node.isEditing?  
            <input type='text' id={'node'+node.id+atr} defaultValue={node['editing'+atr]} onChange={e => node['editing'+atr] = e.target.value} />  :  node[atr] 
          }</td> 
        </tr>
      )}
    </tbody></table>

    {node.isEditing?
      <div className="buttons">
        <div onClick={()=>{handleEditNodeSave  (node.id, this)}}>Save </div>
        <div onClick={()=>{handleEditNodeCancel(node.id)}}>Cancel </div>
      </div>
      :
      <div className="buttons">
        <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleEditNode    (node.id)}}>Edit </button>
        <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleDeleteNode  (node.id)}}>Delete </button>
        <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleRelocateNode(node.id)}}>Relocate </button>
        <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleAddChildNode(node.id)}}>Add_child </button>
      </div>
    }
  </div>
} 

function CreateBranch (nodeId){
  const node = ROOT.nodes[nodeId.nodeId];
  if(!node) return ''; //На конечные ветки
  if(nodeId.nodeId == '-1') return (
    <div className='tree-node active'>
      <div className="nodeChilds">
        {node.childrens.map((childId, key) =>
          <CreateBranch nodeId={childId} key={key}/>
        )}
      </div>
    </div>
  )

  return <div className={`tree-node ${node.active ? 'active' : ''}`}>
    
    <div className="nodeText" onClick={()=>handletoggleExpandNode(node)}> 
      <div>
        {node.isExpanded ? "−" : "+"}
      </div>
      <div>{node.name}</div>
    </div>

    <NodeInfo node={node}/>

    <div className="nodeChilds">
      {node.childrens.map((childId, key) =>
        <CreateBranch nodeId={childId} key={key}/>
      )}
    </div>

  </div>
}
export default function TreeWatcher() {

  useEffect(() => {
    require('./TreeWatcher.css');
    
    const initialize = async () => {
      await loadNodes(0, 2);
      ROOT.nodes['-1'].childrens = [0];
      ROOT.nodes[0].active = true;
      store.dispatch(mainUpdate());
    };
    initialize();
  }, []);

  return (
    <UIWindow>
      <CreateBranch nodeId={'-1'}/>
    </UIWindow>
  );
}
