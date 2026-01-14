// TreeWatcher/TreeWatcher.jsx
import React, { useState, useEffect } from 'react';
import PopupTableSelect from './PopupTableSelect.jsx';
import { Icons } from '../images/imageImports.jsx';

// Глобальное дерево (остаётся глобальным, но управляем перерисовкой через React)
const ROOT = {
  nodes: {
    '-1': {
      name: 'root',
      description: '',
      amount: null,
      id: '-1',
      parentId: null,
      childrens: [],
      isDeleted: false,
      active: true,
      isExpanded: true,
      isEditing: false,
      isChildLoaded: true,
    },
  },
  endBranches: [],
};

const Dict = new class {
  constructor() {
    this.translations = {
      name: 'имя',
      description: 'описание',
      amount: 'количество',
    };
    this.nodeAttributionsToShow = ['description', 'amount'];
    this.nodeAttributionsToSave = ['name', 'description', 'amount', 'price'];
  }
  upFirstLet(word) {
    return String(word[0]).toUpperCase() + String(word).slice(1);
  }
  rus(word) {
    return this.translations[word];
  }
}();

let EditedNodes = {};
let handlesBlockedForAddNode = false;
let newNodeIdCounter = 1;
let isRelocation = false;
let RelocationNodeId = null;
let autosave = true;
let Dictionaries = {};

const actionsHistory = [];
const undoHistory = [];

// === Вспомогательные функции (без побочных эффектов на UI) ===

async function fetchNodes(nodeId, depth = 1) {
  if (String(nodeId).slice(0, 3) == 'new') return;
  const formData = new FormData();
  formData.append('nodeId', nodeId);
  formData.append('depth', depth);
  const response = await fetch('treeWatcher/getTree', { method: 'POST', body: formData });
  return await response.json();
}

async function loadNodes(nodeId, depth) {
  try {
    let newNodes = await fetchNodes(nodeId, depth);
    for (let newNode in newNodes.nodes) {
      if (!ROOT.nodes[newNode]) ROOT.nodes[newNode] = newNodes.nodes[newNode];
    }
  } catch (error) {
    console.error('Error loading nodes:', error);
  }
}

async function loadDictionaries() {
  try {
    const response = await fetch('treeWatcher/getDictionaries');
    Dictionaries = await response.json();
  } catch (error) {
    console.error('Error loading dictionaries:', error);
  }
}

function deleteChild(parent, childId) {
  let parChi = typeof parent === 'object' ? parent.childrens : ROOT.nodes[parent].childrens;
  const index = parChi.indexOf(childId);
  if (index !== -1) parChi.splice(index, 1);
  return parChi;
}

function clearRedoHistory() {
  undoHistory.length = 0;
}

// === Компонент CreateTable с полным контролем над UI ===

function CreateTable({ triggerUpdate }) {
  // Локальные обработчики — все вызывают triggerUpdate()

  const handletoggleExpandNode = (node) => {
    if (node.childrens.length < 1) return;
    node.isExpanded = !node.isExpanded;

    // Активируем/деактивируем детей
    node.childrens.forEach((childId) => {
      if (ROOT.nodes[childId]) {
        ROOT.nodes[childId].active = node.isExpanded;
      }
    });

    // Загружаем детей, если ещё не загружены
    if (!node.isChildLoaded && node.isExpanded) {
      loadNodes(node.id, 3).then(() => {
        node.isChildLoaded = true;
        triggerUpdate();
      });
    }

    triggerUpdate();
  };

  const handleEditNode = (nodeId) => {
    let node = ROOT.nodes[nodeId];
    Dict.nodeAttributionsToSave.forEach((atr) => {
      node['editing' + atr] = node[atr];
    });
    node.isEditing = true;
    node.isExpanded = true;
    triggerUpdate();
  };

  const handleEditNodeCancel = (nodeId) => {
    ROOT.nodes[nodeId].isEditing = false;
    triggerUpdate();
  };

  const EditNodeSave = (nodeId, extraNode) => {
    let oldNodeToSave = {};
    let node = ROOT.nodes[nodeId];
    Object.assign(oldNodeToSave, node);

    Dict.nodeAttributionsToSave.forEach((atr) => {
      if (extraNode) {
        node[atr] = extraNode[atr];
      } else {
        let input = document.getElementById('node' + node.id + '' + atr);
        if (input) node[atr] = input.value;
      }
    });

    node.isEditing = false;
    node.isCreating = false;
    EditedNodes[node.id] = node;
    return [oldNodeToSave, node];
  };

  const handleEditNodeSave = (nodeId) => {
    let [oldNodeToSave, node] = EditNodeSave(nodeId);
    clearRedoHistory();
    actionsHistory.push({ Edit: { from: oldNodeToSave, to: node } });
    AutosaveNodes();
    triggerUpdate();
  };

  const handleDeleteNode = (nodeId) => {
    if (nodeId == 0) {
      alert('Вы не можете удалить корневой узел');
      return;
    }

    if (window.confirm('Вы уверены, что хотите удалить этот узел?')) {
      let node = ROOT.nodes[nodeId];
      actionsHistory.push({ Del: { nodeId: nodeId, parentId: node.parentId } });
      clearRedoHistory();
      deleteChild(node.parentId, node.id);
      node.isDeleted = true;
      EditedNodes[nodeId] = node;
      EditedNodes[node.parentId] = ROOT.nodes[node.parentId];
      AutosaveNodes();
      triggerUpdate();
    }
  };

  const handleRelocateNode = (nodeId) => {
    isRelocation = true;
    RelocationNodeId = nodeId;
    triggerUpdate();
  };

  const handleCancelRelocate = () => {
    isRelocation = false;
    RelocationNodeId = null;
    triggerUpdate();
  };

  const NodeRelocate = (endParentNode) => {
    let node = ROOT.nodes[RelocationNodeId];
    const parentNode = ROOT.nodes[node.parentId];

    let defError = false;
    function check(node, targetId) {
      if (!node) return false;
      if (node.id === targetId) return true;
      for (let childId of node.childrens) {
        if (check(ROOT.nodes[childId], targetId)) {
          defError = true;
          return true;
        }
      }
      return false;
    }

    if (check(node, endParentNode.id) || defError) return;

    actionsHistory.push({
      Relocate: { from: node.parentId, to: endParentNode.id, nodeId: RelocationNodeId },
    });
    EditedNodes[node.id] = node;
    EditedNodes[parentNode.id] = parentNode;
    EditedNodes[endParentNode.id] = endParentNode;
    AutosaveNodes();

    node.parentId = endParentNode.id;
    deleteChild(parentNode, node.id);
    endParentNode.childrens.push(node.id);

    isRelocation = false;
    RelocationNodeId = null;
    triggerUpdate();
  };

  const AddChildNode = (nodeId) => {
    let node = ROOT.nodes[nodeId];
    let newNodeId = 'new' + newNodeIdCounter++;

    let newNode = {
      name: 'Новый узел',
      description: '',
      amount: null,
      id: newNodeId,
      parentId: node.id,
      childrens: [],
      active: true,
      isExpanded: true,
      isEditing: false,
      isCreating: true,
      isDeleted: false,
      price: 0,
      isPriceFixed: false,
      itemGroupId: null,
      ItemUnitId: null,
    };

    ROOT.nodes[newNodeId] = newNode;
    node.childrens.push(newNodeId);
    triggerUpdate();
  };

  const handleAddChildNode = (nodeId) => {
    if (handlesBlockedForAddNode) return;
    handlesBlockedForAddNode = true;
    AddChildNode(nodeId);
  };

  const HandleAddChildNodeSave = async (nodeId) => {
    if (!handlesBlockedForAddNode) return;

    let [oldNodeToSave, node] = EditNodeSave(nodeId);
    const formData = new FormData();
    formData.append('newNode', JSON.stringify(node));

    try {
      const response = await fetch('treeWatcher/createNode', { method: 'POST', body: formData });
      const realNodeId = await response.json();

      // Обновляем ID
      let parentNode = ROOT.nodes[node.parentId];
      deleteChild(parentNode, nodeId);
      delete ROOT.nodes[nodeId];

      node.id = realNodeId;
      ROOT.nodes[realNodeId] = node;
      parentNode.childrens.push(realNodeId);
      node.isCreating = false;

      actionsHistory.push({ AddChild: { node: { ...node }, parentId: node.parentId } });
      EditedNodes[node.parentId] = parentNode;
      EditedNodes[realNodeId] = node;
      AutosaveNodes();

      handlesBlockedForAddNode = false;
      triggerUpdate();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      handlesBlockedForAddNode = false;
      triggerUpdate();
    }
  };

  const HandleAddChildNodeCancel = (nodeId) => {
    if (!handlesBlockedForAddNode) return;
    let node = ROOT.nodes[nodeId];
    deleteChild(node.parentId, nodeId);
    delete ROOT.nodes[nodeId];
    handlesBlockedForAddNode = false;
    triggerUpdate();
  };

  const handleUndo = () => {
    if (actionsHistory.length === 0) return;

    const lastAction = actionsHistory.pop();
    const [key, action] = Object.entries(lastAction)[0];

    switch (key) {
      case 'Edit': {
        const node = ROOT.nodes[action.to.id];
        Dict.nodeAttributionsToSave.forEach(atr => {
          node[atr] = action.from[atr];
        });
        undoHistory.push({ Edit: { from: action.from, to: { ...node } } });
        EditedNodes[node.id] = node;
        break;
      }
      case 'Del': {
        const parentNode = ROOT.nodes[action.parentId];
        parentNode.childrens.push(action.nodeId);
        const node = ROOT.nodes[action.nodeId];
        node.isDeleted = false;
        undoHistory.push({ Del: { nodeId: action.nodeId, parentId: action.parentId } });
        EditedNodes[action.parentId] = parentNode;
        EditedNodes[action.nodeId] = node;
        break;
      }
      case 'Relocate': {
        const newParent = ROOT.nodes[action.to];
        deleteChild(newParent, action.nodeId);
        const oldParent = ROOT.nodes[action.from];
        oldParent.childrens.push(action.nodeId);
        const node = ROOT.nodes[action.nodeId];
        node.parentId = action.from;
        undoHistory.push({
          Relocate: { from: action.from, to: action.to, nodeId: action.nodeId }
        });
        EditedNodes[action.to] = newParent;
        EditedNodes[action.from] = oldParent;
        EditedNodes[action.nodeId] = node;
        break;
      }
      case 'AddChild': {
        const parentNode = ROOT.nodes[action.parentId];
        deleteChild(parentNode, action.node.id);
        action.node.isDeleted = true;
        undoHistory.push({ AddChild: { node: { ...action.node }, parentId: action.parentId } });
        EditedNodes[action.parentId] = parentNode;
        EditedNodes[action.node.id] = action.node;
        break;
      }
    }

    AutosaveNodes();
    triggerUpdate(); // ← КЛЮЧЕВОЙ ВЫЗОВ!
  };

  const handleRedo = () => {
    if (undoHistory.length === 0) return;

    const lastAction = undoHistory.pop();
    const [key, action] = Object.entries(lastAction)[0];

    switch (key) {
      case 'Edit': {
        const node = ROOT.nodes[action.from.id];
        Dict.nodeAttributionsToSave.forEach(atr => {
          node[atr] = action.to[atr];
        });
        actionsHistory.push({ Edit: { from: { ...node }, to: action.to } });
        EditedNodes[node.id] = node;
        break;
      }
      case 'Del': {
        const node = ROOT.nodes[action.nodeId];
        const parentNode = ROOT.nodes[action.parentId];
        node.isDeleted = true;
        deleteChild(parentNode, action.nodeId);
        actionsHistory.push({ Del: { nodeId: action.nodeId, parentId: action.parentId } });
        EditedNodes[action.parentId] = parentNode;
        EditedNodes[action.nodeId] = node;
        break;
      }
      case 'Relocate': {
        const oldParent = ROOT.nodes[action.from];
        deleteChild(oldParent, action.nodeId);
        const newParent = ROOT.nodes[action.to];
        newParent.childrens.push(action.nodeId);
        const node = ROOT.nodes[action.nodeId];
        node.parentId = action.to;
        actionsHistory.push({
          Relocate: { from: action.from, to: action.to, nodeId: action.nodeId }
        });
        EditedNodes[action.from] = oldParent;
        EditedNodes[action.to] = newParent;
        EditedNodes[action.nodeId] = node;
        break;
      }
      case 'AddChild': {
        const parentNode = ROOT.nodes[action.parentId];
        parentNode.childrens.push(action.node.id);
        action.node.isDeleted = false;
        actionsHistory.push({ AddChild: { node: { ...action.node }, parentId: action.parentId } });
        EditedNodes[action.parentId] = parentNode;
        EditedNodes[action.node.id] = action.node;
        break;
      }
    }

    AutosaveNodes();
    triggerUpdate(); // ← КЛЮЧЕВОЙ ВЫЗОВ!
  };

  const handlerChoseItemUnit = (el, node, ItemName) => {
    let oldValuesObj = {};
    switch (ItemName) {
      case 'itemGroupId':
        oldValuesObj.itemGroupId = node.itemGroupId;
        node.itemGroupId = el.id;
        break;
      case 'ItemUnitId':
        oldValuesObj.ItemUnitId = node.ItemUnitId;
        oldValuesObj.name = node.name;
        oldValuesObj.price = node.price;
        node.ItemUnitId = el.id;
        node.name = el.name;
        node.price = el.price;
        break;
    }
    PriceUpdate(node, node.price);
    actionsHistory.push({ EditInputs: { oldValues: { [node.id]: oldValuesObj } } });
    AutosaveNodes();
    triggerUpdate();
  };

  const handlerCleanItemUnit = (node, ItemName) => {
    actionsHistory.push({ EditInputs: { oldValues: { [node.id]: { [ItemName]: node[ItemName] } } } });
    node[ItemName] = null;
    EditedNodes[node.id] = node;
    AutosaveNodes();
    triggerUpdate();
  };

  const handlerPriceEdit = (e, node) => {
    PriceUpdate(node, e.target.value);
    actionsHistory.push({ EditInputs: { oldValues: { [node.id]: { price: node.price } } } });
    AutosaveNodes();
    triggerUpdate();
  };

  const handlerPriceFixToggle = (e, node) => {
    node.isPriceFixed = e.target.checked;
    PriceUpdate(node, node.isPriceFixed ? e.target.value : null);
    actionsHistory.push({ EditInputs: { oldValues: { [node.id]: { isPriceFixed: !node.isPriceFixed } } } });
    AutosaveNodes();
    triggerUpdate();
  };

  const PriceUpdate = (node, newPrice) => {
    if (!node.ItemUnitId && !node.isPriceFixed) {
      node.price = 0;
      node.childrens.forEach((childId) => {
        let child = ROOT.nodes[childId];
        if (child && child.price != null && child.amount != null) {
          node.price += Number(child.price) * Number(child.amount);
        }
      });
    }
    if (newPrice != null) node.price = newPrice;

    let priceInput = document.getElementById('node' + node.id + 'price');
    if (priceInput) priceInput.value = node.price;

    EditedNodes[node.id] = node;

    // Обновляем родителя
    if (node.id !== 0 && ROOT.nodes[node.parentId]) {
      PriceUpdate(ROOT.nodes[node.parentId], null);
    }
  };

  const AutosaveNodes = () => {
    if (!autosave || Object.keys(EditedNodes).length === 0) return;
    SaveAll().then((result) => {
      if (result.ok) EditedNodes = {};
    });
  };

  const SaveAll = async () => {
    const formData = new FormData();
    formData.append('EditedNodes', JSON.stringify(EditedNodes));
    try {
      await fetch('treeWatcher/setTree', { method: 'POST', body: formData });
      return { ok: true };
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения!');
      return { ok: false };
    }
  };

  // === Кнопки ===
  const Buttons = ({ node }) => {
    if (node.isCreating)
      return (
        <div className="SaveButtons">
          <div onClick={(e) => { e.stopPropagation(); HandleAddChildNodeCancel(node.id); }}>
            <img src={Icons.getLink('Del')} alt="Отмена" />
          </div>
          <div onClick={(e) => { e.stopPropagation(); HandleAddChildNodeSave(node.id); }}>
            <img src={Icons.getLink('ok')} alt="Сохранить" />
          </div>
        </div>
      );

    if (node.isEditing)
      return (
        <div className="SaveButtons">
          <div onClick={(e) => { e.stopPropagation(); handleEditNodeCancel(node.id); }}>
            <img src={Icons.getLink('Del')} alt="Отмена" />
          </div>
          <div onClick={(e) => { e.stopPropagation(); handleEditNodeSave(node.id); }}>
            <img src={Icons.getLink('ok')} alt="Сохранить" />
          </div>
        </div>
      );

    return isRelocation ? null : (
      <div className="buttons">
        <button onClick={(e) => { e.stopPropagation(); handleEditNode(node.id); }}>
          <img src={Icons.getLink('Edit')} alt="Редактировать" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}>
          <img src={Icons.getLink('Del')} alt="Удалить" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleRelocateNode(node.id); }}>
          <img src={Icons.getLink('Relocate')} alt="Переместить" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleAddChildNode(node.id); }}>
          <img src={Icons.getLink('AddChild')} alt="Добавить дочерний" />
        </button>
      </div>
    );
  };

  // === Рендер таблицы ===
  const createNodesOrderToShow = (nodeId) => {
    const node = ROOT.nodes[nodeId];
    if (!node) return [];
    let order = [nodeId];
    if (node.isExpanded) {
      node.childrens.forEach((id) => {
        order.push(...createNodesOrderToShow(id));
      });
    }
    return order;
  };

  const EditingElement = ({ node, atr }) => {
    return node.isEditing || node.isCreating ? (
      <input
        type="text"
        id={'node' + node.id + atr}
        defaultValue={node['editing' + atr] || node[atr] || ''}
        onChange={(e) => (node['editing' + atr] = e.target.value)}
      />
    ) : (
      node[atr]
    );
  };

  let nodeIds = createNodesOrderToShow('-1');
  nodeIds.shift(); // убираем '-1'

  return (
    <div>
      {isRelocation ? (
        <div className="interface">
          <style>{'.tree-node > .nodeInfo:hover { background: #21c7c7; }'}</style>
          <button onClick={handleCancelRelocate}>
            <img src={Icons.getLink('Del')} alt="Отменить перемещение" />
          </button>
        </div>
      ) : (
        <div className="interface">
          <button onClick={handleUndo} disabled={actionsHistory.length === 0}>
            <img src={Icons.getLink('Undo')} alt="Отменить" />
          </button>
          <button onClick={handleRedo} disabled={undoHistory.length === 0}>
            <img src={Icons.getLink('Redo')} alt="Повторить" />
          </button>
        </div>
      )}

      <table className="tree-table">
        <thead>
          <tr className="tableCaptions">
            <th></th>
            <th>Наименование</th>
            <th>Кол-во</th>
            <th>Цена</th>
            <th>(Фикс)</th>
            <th>Сумма</th>
            <th>Ед.Изм.</th>
            <th>Примечание</th>
            <th>Категория</th>
            <th>Деталь</th>
          </tr>
        </thead>
        <tbody>
          {nodeIds.map((nodeId) => {
            const node = ROOT.nodes[nodeId];
            if (!node || !node.active) return null;

            return (
              <tr key={nodeId} className={`tree-row ${node.isCreating ? '' : ''}`}>
                <td onClick={() => handletoggleExpandNode(node)}>
                  {node.childrens?.length > 0 ? (node.isExpanded ? '−' : '+') : ''}
                </td>
                <td>
                  <div className="node-name">
                    {node.ItemUnitId ? node.name : <EditingElement node={node} atr="name" />}
                    <Buttons node={node} />
                  </div>
                </td>
                <td>
                  <EditingElement node={node} atr="amount" />
                </td>
                <td>
                  {node.isCreating ? null : (
                    <input
                      type="number"
                      id={'node' + node.id + 'price'}
                      defaultValue={node.price || 0}
                      onChange={(e) => handlerPriceEdit(e, node)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!!node.ItemUnitId}
                    />
                  )}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!node.isPriceFixed}
                    onChange={(e) => handlerPriceFixToggle(e, node)}
                    disabled={!!node.ItemUnitId}
                  />
                </td>
                <td>{((node.price || 0) * (node.amount || 0)).toFixed(2)}</td>
                <td>{node.unit || 'Ед.Изм.'}</td>
                <td>
                  <EditingElement node={node} atr="description" />
                </td>
                <td>
                  <div className="select-list">
                    <PopupTableSelect
                      data={Dictionaries.ItemGroup || {}}
                      value={node.itemGroupId}
                      onChange={(el) => handlerChoseItemUnit(el, node, 'itemGroupId')}
                      placeholder={Dictionaries.ItemGroup?.[node.itemGroupId]?.name || ' - '}
                    />
                    {node.itemGroupId != null && (
                      <div className="select-cross" onClick={() => handlerCleanItemUnit(node, 'itemGroupId')}>
                        <img src={Icons.getLink('Del')} alt="X" />
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="select-list">
                    <PopupTableSelect
                      data={Dictionaries.filterUnit?.(node.itemGroupId) || {}}
                      value={node.ItemUnitId}
                      onChange={(el) => handlerChoseItemUnit(el, node, 'ItemUnitId')}
                      placeholder={Dictionaries.ItemUnit?.[node.ItemUnitId]?.name || ' - '}
                    />
                    {node.ItemUnitId != null && (
                      <div className="select-cross" onClick={() => handlerCleanItemUnit(node, 'ItemUnitId')}>
                        <img src={Icons.getLink('Del')} alt="X" />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// === Основной компонент ===

function UIWindow({ children, setCurrentState }) {
  return (
    <div className="UIWindow">
      <div className="UIWindowHeader">
        <div className="interfacePages">
          <div onClick={() => setCurrentState('TreeWatcher')}>Главная</div>
          <div onClick={() => setCurrentState('ItemGroup')}>Группы товаров</div>
          <div onClick={() => setCurrentState('ItemUnit')}>Детали</div>
          <div onClick={() => setCurrentState('MeasureUnit')}>Единицы измерения</div>
        </div>
      </div>
      <div className="UIWindowBody">{children}</div>
    </div>
  );
}

export default function TreeWatcher({ body, setCurrentState }) {
  const [, setTick] = useState(0);
  const triggerUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    require('./TreeWatcher.css');
    require('./PopupTableSelect.css');

    const init = async () => {
      await loadDictionaries();
      await loadNodes(0, 2);
      triggerUpdate();
      
      ROOT.nodes['-1'].childrens = [0];
      ROOT.nodes[0].active = true;
    };

    init();
  }, []);

  return (
    <UIWindow setCurrentState={setCurrentState}>
      {body || <CreateTable triggerUpdate={triggerUpdate} />}
    </UIWindow>
  );
}
