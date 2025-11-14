import React, { useState, useEffect } from 'react';
import { TABLES_CONFIG } from './tableConfigs.jsx';
import EditModal from './EditModal.jsx';

const TableEditor = ({ tableType }) => {
  const config = TABLES_CONFIG[tableType];
  const [data, setData] = useState([]);
  const [relations, setRelations] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Базовый URL для API
  const apiBaseUrl = `/treeWatcher/${config.apiEndpoint}/`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загрузка основных данных
        const res = await fetch(apiBaseUrl);
        if (!res.ok) throw new Error('Network response was not ok');
        const mainData = await res.json();
        setData(mainData);

        // Загрузка связанных данных для select-полей
        const relationFields = Object.entries(config.fields)
          .filter(([_, field]) => field.type === 'select')
          .map(([_, field]) => field.relation);

        const relationsData = {};
        for (const relation of [...new Set(relationFields)]) {
          const res = await fetch(`/treeWatcher/${relation}/`);
          relationsData[relation] = await res.json();
        }

        setRelations(relationsData);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tableType]);

  const handleEdit = (item) => {
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setFormData({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(apiBaseUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) throw new Error('Delete failed');
      setData(data.filter(item => item.id !== id));
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const handleSave = async (formData) => {
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const response = await fetch(apiBaseUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Save failed');

      // Обновляем данные после сохранения
      const updatedData = await fetch(apiBaseUrl).then(r => r.json());
      setData(updatedData);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  };

  if (isLoading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="table-container">
      <h2>{config.title}</h2>
      <button className="add-btn" onClick={handleAdd}>
        Добавить
      </button>

      <table className="data-table">
        <thead>
          <tr>
            {config.columns.map(column => (
              <th key={column}>{config.fields[column].label}</th>
            ))}
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              {config.columns.map(column => (
                <td key={`${item.id}-${column}`}>
                  {config.fields[column].type === 'select'
                    ? relations[config.fields[column].relation]?.find(
                        r => r.id === item[column]
                      )?.name || '-'
                    : item[column]}
                </td>
              ))}
              <td>
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(item)}
                >
                  ✏️
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(item.id)}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        fieldsConfig={config.fields}
        relations={relations}
        initialData={formData}
      />
    </div>
  );
};

export default TableEditor;