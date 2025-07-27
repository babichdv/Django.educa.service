import React, { useState, useEffect, act } from 'react';
import { store, mainUpdate } from '../index.jsx';
import PopupTableSelect from './PopupTableSelect.jsx';
import { Icons } from '../images/imageImports.jsx'

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
      // 'name',
      'description',
      'amount',
    ]
    this.nodeAttributionsToSave = [
      'name',
      'description',
      'amount',
      'price',
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

let handlesBlockedForAddNode = false;

function checkHandleBlocked(functionName) {
  let block = handlesBlockedForAddNode || 0;

  if(block){
    switch (functionName) {
      case 'HandleAddChildNodeSave':
        if(handlesBlockedForAddNode) return true;
      break;
      case 'HandleAddChildNodeCancel':
        if(handlesBlockedForAddNode) return true;
      break;
    
      default:
        return false;
      break;
    }
  }else{
    return true;
  }
}

const actionsHistory = [];//for undo
const undoHistory = []; //for redo

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
let Dictionaries = {}

async function loadDictionaries() {
  const response = await fetch("treeWatcher/getDictionaries", {
    // method: "POST",
    // body: formData
  });
  Dictionaries = await response.json();
  console.log(Dictionaries);
  
}


/**
 * @param {*} parent - object or id
 * @param {*} childId
 * @returns {[]} parentChildrensMassive
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
  return parChi;
}
function clearRedoHistory() {
  undoHistory.length = 0;
}

function handletoggleExpandNode(node){
  if(!checkHandleBlocked('handletoggleExpandNode')) return;

  node.isExpanded = !node.isExpanded;
  NodeLoadChildrens(node, node.isExpanded);
}
function NodeLoadChildrens(node, isActivateChildrens) {
    node.childrens.forEach(childId=>{
      if( !ROOT.nodes[childId] ) { return }

      ROOT.nodes[childId].active = isActivateChildrens; //!ROOT.nodes[childId].active

      
      if (!node.isChildLoaded)
        loadNodes(node.id,3)
      .then(node.isChildLoaded = true)
    })
    store.dispatch(mainUpdate());
  }

function handleEditNode(nodeId) {
  if(!checkHandleBlocked('handleEditNode')) return;

  let node = ROOT.nodes[nodeId];
  Dict.nodeAttributionsToSave.map(atr=>{
    node['editing'+atr] = node[atr];

  })
  node.isEditing = true;
  node.isExpanded = true;
  NodeLoadChildrens(node, true);

  store.dispatch(mainUpdate());
}
function handleEditNodeCancel(nodeId) {
  if(!checkHandleBlocked('handleEditNodeCancel')) return;
  
  ROOT.nodes[nodeId].isEditing = false;
  store.dispatch(mainUpdate());
}
function handleEditNodeSave(nodeId) {
  if(!checkHandleBlocked('handleEditNodeSave')) return;
  
  let [oldNodeToSave, node] = EditNodeSave(nodeId);
  store.dispatch(mainUpdate());
  clearRedoHistory();
  actionsHistory.push({Edit: {from: oldNodeToSave, to: node/*newNodeToSave*/}})
  AutosaveNodes();
} // V V V V V
function EditNodeSave(nodeId, extraNode){
  let oldNodeToSave = {}
  let node = ROOT.nodes[nodeId];
  Object.assign(oldNodeToSave, node); //копирование детей и тд, для того, что не входит в Dict

  Dict.nodeAttributionsToSave.map(atr=>{
    if(extraNode){
      // newNodeToSave[atr] = extraNode[atr];
      node[atr] = extraNode[atr];
    }else{ // Если нет ноды, то берёт из инпутов
      let input = document.getElementById('node'+node.id+''+atr);
      // newNodeToSave[atr] = input.value;
      if(!input) return;
      node[atr] = input.value;
    }
  })

  node.isEditing  = false;
  node.isCreating = false;

  EditedNodes[node.id] = node;
  return [ oldNodeToSave, node ];
}


function handleDeleteNode(nodeId) {
  if(!checkHandleBlocked('handleDeleteNode')) return;
  if(nodeId == 0) {alert("Вы не можете удалить корневой узел"); return};

  if (window.confirm('Вы уверены, что хотите удалить этот узел?')) {
    let node = ROOT.nodes[nodeId];

    actionsHistory.push( {Del: {nodeId: nodeId, parentId: ROOT.nodes[nodeId].parentId}} );
    clearRedoHistory();
    deleteChild(node.parentId, node.id);
    node.isDeleted = true;
    EditedNodes[nodeId] = node;
    EditedNodes[node.parentId] = ROOT.nodes[node.parentId];
    AutosaveNodes();
    store.dispatch(mainUpdate());
  }
};


let isRelocation = false;
let RelocationNodeId = null;
function handleRelocateNode(nodeId) {
  if(!checkHandleBlocked('handleRelocateNode')) return;
  
  isRelocation = true;
  RelocationNodeId = nodeId;
  store.dispatch(mainUpdate());
};

function handleCancelRelocate(){
  if(!checkHandleBlocked('handleCancelRelocate')) return;
  
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
  AutosaveNodes();
  clearRedoHistory();
  node.parentId = endParentNode.id;
  deleteChild(parentNode, node.id);
  endParentNode.childrens.push(node.id);
  
  isRelocation = false;
  RelocationNodeId = null;
  store.dispatch(mainUpdate());
}


let newNodeIdCounter = 1;
async function handleAddChildNode(nodeId) {
  if(!checkHandleBlocked('handleAddChildNode')) return;
  handlesBlockedForAddNode = true;


  AddChildNode(nodeId);
  // clearRedoHistory();
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
    isExpanded: true,
    isEditing: false,
    isCreating: true,

    isDeleted: false,

    itemGroupId: 0,
    ItemUnitId: 0,
  }
  ROOT.nodes[newNodeId] = newNode;
  node.childrens.push(newNodeId);

  newNodeIdCounter += 1;
  store.dispatch(mainUpdate());
}
async function HandleAddChildNodeSave(nodeId) {
  if(!checkHandleBlocked('HandleAddChildNodeSave')) return;
  
  let [oldNodeToSave, node] = EditNodeSave(nodeId);

  const formData = new FormData();
  formData.append("newNode", JSON.stringify(node));

  const response = await fetch("treeWatcher/createNode", {
    method: "POST",
    body: formData,
  });
  const newNodeId = await response.json();

  AddChildNodeSave(nodeId, newNodeId);
  handlesBlockedForAddNode = false;
}
function AddChildNodeSave(nodeId, newNodeId) {
  let node = ROOT.nodes[nodeId];
  // Смена id во всём
  node.id = newNodeId;
  ROOT.nodes[newNodeId] = node;
  delete ROOT.nodes[nodeId];
  let parentNode = ROOT.nodes[node.parentId];
  deleteChild( parentNode, nodeId );
  parentNode.childrens.push(newNodeId);
  node.isCreating = false;
  
  actionsHistory.push( {AddChild: {node: node, parentId: node.parentId}} ); //  <===
  store.dispatch(mainUpdate());
  
  EditedNodes[node.parentId] = parentNode;
  EditedNodes[newNodeId] = node;
  AutosaveNodes();
}

async function HandleAddChildNodeCancel(nodeId) {
  if(!checkHandleBlocked('HandleAddChildNodeCancel')) return;
  
  let node = ROOT.nodes[nodeId];
  // удаление id во всём
  deleteChild( node.parentId, nodeId );
  delete ROOT.nodes[nodeId];
  node.isCreating = false;
  handlesBlockedForAddNode = false;

  store.dispatch(mainUpdate());
}


function handleUndo() {
  if(!checkHandleBlocked('handleUndo')) return;
  
  let lastAction = actionsHistory.pop();
  
  const [key, action] = Object.entries(lastAction)[0];
  switch (key) {
    case 'Edit':{
      let node = action.to;
      let futureNode = {}
      Object.assign(futureNode, node);

      Dict.nodeAttributionsToShow.map(atr=>{
        node[atr] = action.from[atr]
      })
      undoHistory.push({Edit:{node: node, futureNode: futureNode}});
      EditedNodes[node.id] = node;
    }break;
    case 'Del':{
      let parentNode = ROOT.nodes[action.parentId];
      parentNode.childrens.push(action.nodeId);
      
      let node = ROOT.nodes[action.nodeId];
      node.isDeleted = false;

      undoHistory.push({Del:{nodeId: action.nodeId, parentId: action.parentId}})

      EditedNodes[action.parentId] = parentNode;
      EditedNodes[action.nodeId] = node;
      
    }break;
    case 'Relocate':{
      let newParent = ROOT.nodes[action.to];
      deleteChild(newParent, action.nodeId);                    // Удаляет из нового родителя

      let oldParent = ROOT.nodes[action.from];
      oldParent.childrens.push(action.nodeId);                  // Добавляет в старого родителя

      let node = ROOT.nodes[action.nodeId]
      node.parentId = action.from;                              // Изменяет родителя у самого узла

      undoHistory.push({Relocate:{oldParentId: action.from, futureParentId: action.to, nodeId: action.nodeId}})
      EditedNodes[action.to] = newParent;
      EditedNodes[action.from] = oldParent;
      EditedNodes[action.nodeId] = node;
    }break;
    case 'AddChild':{
      let parentNode = ROOT.nodes[action.parentId]
      deleteChild(parentNode, action.node.id);

      action.node.isDeleted = true;
      
      undoHistory.push({AddChild:{node: action.node, parentId: action.parentId}});
      EditedNodes[action.parentId] = parentNode;
      EditedNodes[action.node.id] = action.node;
    }break;
    case 'EditInput':{
      let futureValues = {}
      for (let atr in action.oldValues){
        futureValues[atr] = action.node[atr];
        action.node[atr] = action.oldValues[atr];
      }
      undoHistory.push({EditInput: {node: action.node, futureValues: futureValues }})
      EditedNodes[action.node.id] = action.node;
    }break;
  }
  AutosaveNodes();
  store.dispatch(mainUpdate());
}
/*
[// KEY:         ACTION           for undo
  {Edit: {from:'oldNode', to:'newNode'}},
  {Del: {nodeId:'nodeId', parentId:'nodeId'}}, // Удаление - открепление узла, а потом его потеря при сохранении на сервере
  {Relocate: {from: 'parentId', to: 'endParentId', nodeId:'nodeId'}},
  {AddChild: {node: 'node', parentId: 'nodeId'}},
  {EditInput: {node: 'node', oldValues: {atr:value} }}
]
/// undoHistory for redo
[
  {Edit:{node: 'node', futureNode: 'futureNode'}},
  {Del:{nodeId: 'nodeId', parentId:'parentId'}},
  {Relocate:{oldParentId: action.from, futureParentId: action.to}},
  {AddChild:{node: 'node', parentId: 'nodeId'}}
]*/
function handleRedo() {
  if(!checkHandleBlocked('handleRedo')) return;
  
  let lastAction = undoHistory.pop();

  const [key, action] = Object.entries(lastAction)[0];
  switch (key) {
    case 'Edit':
      EditNodeSave(action.node.id, action.futureNode);
    break;
    case 'Del':{
      actionsHistory.push( {Del: {nodeId: action.nodeId, parentId: action.parentId}} );
      let node = ROOT.nodes[action.nodeId]
      let parentNode = ROOT.nodes[action.parentId];
      node.isDeleted = true;
      deleteChild(parentNode, action.nodeId);

      EditedNodes[action.parentId] = parentNode;
      EditedNodes[action.nodeId] = node;

    }break;
    case 'Relocate':{
      actionsHistory.push( {Relocate: {from: action.oldParentId, to: action.futureParentId, nodeId: action.nodeId}} )

      let node = ROOT.nodes[action.nodeId]
      node.parentId = action.futureParentId;

      let oldParentNode = ROOT.nodes[action.oldParentId]
      deleteChild(oldParentNode, action.nodeId);

      let futureParentNode = ROOT.nodes[action.futureParentId]
      futureParentNode.childrens.push(action.nodeId);

      EditedNodes[action.nodeId] = node;
      EditedNodes[action.oldParentId] = oldParentNode;
      EditedNodes[action.futureParentId] = futureParentNode;
    }break;
    case 'AddChild':{
      let parentNode = ROOT.nodes[action.parentId]
      parentNode.childrens.push(action.node.id);

      action.node.isDeleted = false;

      EditedNodes[action.parentId] = parentNode;
      EditedNodes[action.node.id] = action.node;
    }break;
    case 'EditInput':{
      let oldValues = {}
      for (let atr in action.futureValues){
        oldValues[atr] = action.node[atr];
        action.node[atr] = action.futureValues[atr];
      }
      actionsHistory.push({EditInput: {node: action.node, oldValues: oldValues }})
      EditedNodes[action.node.id] = action.node;
    }
  }
  AutosaveNodes();
  store.dispatch(mainUpdate());
}

let autosave = true;
function AutosaveNodes(){
  if( !autosave ) return;
  if(Object.keys(EditedNodes).length == 0) return;
  
  if(SaveAll().ok){
    EditedNodes = {} // delete all
  }
}
function handleSaveAll(){
  if(!checkHandleBlocked('handleSaveAll')) return;
  SaveAll()
}
async function SaveAll() {
  const formData = new FormData();
  formData.append("EditedNodes", JSON.stringify(EditedNodes));
  try {

    let response = await fetch('treeWatcher/setTree',{
      method: "POST",
      body: formData
    })
    let newIdsDict = await response.json();
    return {ok:true};
  }
  catch (error) {
    alert(error)
    alert("Ошибка сохранения! Сохраните код ваших узлов!!!")
    alert(JSON.stringify(EditedNodes))
    return {error:"Server isnt good."}
  }
}
function UIWindow({ children }) {

  return(
  <div className='UIWindow'>
    {isRelocation? <style>{'.tree-node > .nodeInfo:hover { background:rgba(255, 255, 255, 0.5); }'}</style> :''/*Стиль для выбираемых для relocate узлов*/}
    
    {isRelocation?
      <div className='interface'>
        <button className={`interfaceBtn ${isRelocation?'':'disabled'}`} onClick={()=>handleCancelRelocate()} > <img src={ Icons.getLink('Del') } alt="Cancel relocation" /> </button>
      </div>
      :
      <div className='interface'>
        <button className={`interfaceBtn ${isRelocation?'disabled':''}`} onClick={()=>handleUndo()} disabled={!(actionsHistory?.length>0) }> <img src={ Icons.getLink('Undo') } alt="Undo" />  </button>
        <button className={`interfaceBtn ${isRelocation?'disabled':''}`} onClick={()=>handleRedo()} disabled={!(undoHistory?.length>0) }> <img src={ Icons.getLink('Redo') } alt="Redo" /> </button>
        { autosave?'':
          <button className='interfaceBtn' onClick={()=>handleSaveAll()} disabled={isRelocation}> <img src={ Icons.getLink('Save') } alt="Save" />  </button>
        }
      </div>
    }
    <div className='UIWindowBody'>
      { children }
    </div>
  </div>)
}

function handlerNodeInfo(node) {
  if(!checkHandleBlocked('handlerNodeInfo')) return;
  
  if(isRelocation){ NodeRelocate(node) }
}
function handlerChoseItemUnit(el, node, ItemName) {
  let oldValuesObj = {}

  for (let atr in oldValuesObj){
  }

  switch (ItemName) {
    case 'itemGroupId':
      oldValuesObj['itemGroupId'] = node['itemGroupId']
      node['itemGroupId'] = el.id;
    break;
    case 'ItemUnitId':
      ['ItemUnitId', 'name', 'price'].forEach(
        atr=> oldValuesObj[atr] = node[atr] 
      )
      node['ItemUnitId'] = el.id;
      node['name'] = el.name;
      node['price'] = el.price;
    break;
  }


  actionsHistory.push( {EditInput: {node: node, oldValues: oldValuesObj}});
  
  EditedNodes[node.id] = node;
  AutosaveNodes();
  
  store.dispatch(mainUpdate());
}
function handlerCleanItemUnit(node, ItemName) {
  actionsHistory.push( {EditInput: {node: node, oldValues: {ItemName: node[ItemName]} }} ); //  <===

  node[ItemName] = null;
  
  EditedNodes[node.id] = node;
  AutosaveNodes();

  store.dispatch(mainUpdate());
}
function Buttons(nodeObj){
  let node = nodeObj.node; 
  if(node.isCreating) return(
    <div className="SaveButtons">
      <div onClick={(event)=>{event.stopPropagation(); HandleAddChildNodeSave  (node.id)}}>Save </div>
      <div onClick={(event)=>{event.stopPropagation(); HandleAddChildNodeCancel(node.id)}}>Cancel </div>
    </div>
  )
  if(node.isEditing) return(
    <div className="SaveButtons">
      <div onClick={(event)=>{event.stopPropagation(); handleEditNodeSave  (node.id)}}>Save </div>
      <div onClick={(event)=>{event.stopPropagation(); handleEditNodeCancel(node.id)}}>Cancel </div>
    </div>
  )
  return(
    isRelocation?'':
    <div className="buttons">
      <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleEditNode    (node.id)}}><img src={ Icons.getLink('Edit') } alt="Edit" /> </button>
      <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleDeleteNode  (node.id)}}><img src={ Icons.getLink('Del') } alt="Delete" /> </button>
      <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleRelocateNode(node.id)}}><img src={ Icons.getLink('Relocate') } alt="Relocate" /> </button>
      <button disabled={isRelocation} onClick={(event)=>{event.stopPropagation(); handleAddChildNode(node.id)}}><img src={ Icons.getLink('AddChild') } alt="Add_child" /> </button>
    </div>)
}

function NodeInfo(nodeObj){
  let node = nodeObj.node;
  if(!node.isExpanded) return '';

  return( 
  <div className="nodeInfo" onClick={()=>{handlerNodeInfo(node)}}>
    <table className="nodeInfoAttrs"><tbody>
      {Dict.nodeAttributionsToShow.map((atr, key)=>
        <tr key={key}>
          <td>{ Dict.upFirstLet(Dict.rus(atr)) +': ' }</td>
          <td>{ node.isEditing || node.isCreating?         
            <input type='text' id={'node'+node.id+atr} defaultValue={node['editing'+atr]} onChange={e => node['editing'+atr] = e.target.value} />  :  node[atr] 
          }</td> 
        </tr>
      )}
      <tr>
        <td>Цена:</td>
        <td>{ node.ItemUnitId?
            <div> {Dictionaries.ItemUnit[node.ItemUnitId]?.price} </div>
            :
            node.isEditing || node.isCreating?
              <input type='number' id={'node'+node.id+'price'} defaultValue={node['editing'+'price']} onChange={e => node['editing'+'price'] = e.target.value} />
              :
              node['price'] 
        }</td>
      </tr>
      <tr>
        <td>Фиксировать цену:</td>
        <td><input type='checkbox' /></td>
      </tr>
      <tr>
        <td>Категория:</td>
        <td>
          <PopupTableSelect 
            data={Dictionaries.ItemGroups}
            value={node.itemGroupId}
            onChange={ (el)=>{
                handlerChoseItemUnit(el, node, 'itemGroupId');
              }}
            placeholder={ Dictionaries.ItemGroups[node.itemGroupId]?.name || " - " }>
          </PopupTableSelect>
          <div><button onClick={()=>handlerCleanItemUnit(node,'itemGroupId')}> [X] </button> </div>
        </td>
      </tr>
      <tr>
        <td>Продукт:</td>
        <td>
          <PopupTableSelect 
            data={Dictionaries.ItemUnit}
            value={node.ItemUnitId}
            onChange={ (el)=>{
              handlerChoseItemUnit(el, node, 'ItemUnitId');
            }}
            placeholder={ Dictionaries.ItemUnit[node.ItemUnitId]?.name || " - " }>
          </PopupTableSelect>
          {node.ItemUnitId?
            <div><button onClick={()=>handlerCleanItemUnit(node,'ItemUnitId')}> [X] </button> {node['name']} </div>
            :
            node.isEditing || node.isCreating?
              <input type='text' id={'node'+node.id+'name'} defaultValue={node['editing'+'name']} onChange={e => node['editing'+'name'] = e.target.value} />
              :
              node['name'] 
          }
        </td>
      </tr>
    </tbody></table>
  </div>)
} 



function CreateBranch (nodeId){
  const node = ROOT.nodes[nodeId.nodeId];
  if(!node) return '';              // На конечные ветки
  
  if(nodeId.nodeId == '-1') return (// Первая ветка
    <div className=''>
      {node.childrens.map((childId, key) =>
        <CreateBranch nodeId={childId} key={key}/>
      )}
    </div>
  )

  return(
  <div className={`tree-node ${node.active || node.isCreating ? '' : 'disabled'}`}>
    <div className="nodeMain" onClick={()=>handletoggleExpandNode(node)}>
      <div className="nodeText"> 
        <div>
          {node.isExpanded? "−" : "+"}
        </div>
        <div>{node.name}</div>
        <Buttons node={node}/>
      </div>
      <div className="nodePrice">
        {node.price}
      </div>
    </div>

    <div>
      <NodeInfo node={node}/>
    </div>

    <div className="nodeChilds">
      {node.childrens.map((childId, key) =>
        <CreateBranch nodeId={childId} key={key}/>
      )}
    </div>
  

  </div>)
}
export default function TreeWatcher() {

  useEffect(() => {
    require('./TreeWatcher.css');
    require('./PopupTableSelect.css');
    
    const initialize = async () => {
      await loadDictionaries();
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
