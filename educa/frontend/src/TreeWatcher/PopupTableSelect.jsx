import React, { useState, useRef, useEffect } from 'react';
import './PopupTableSelect.css'; // Стили для компонента

const PopupTableSelect = ({ data, value, onChange, placeholder = "Выберите значение" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popupRef = useRef(null);

  // Сортируем данные сначала по order, затем по названию
  const sortedData = [...data].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.название.localeCompare(b.название);
  });

  // Фильтруем данные по поисковому запросу
  const filteredData = sortedData.filter(item =>
    item.название.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toString().includes(searchTerm)
  );

  // Обработчик клика вне попапа
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (item) => {
    onChange(item);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedItem = data.find(item => item.id === value?.id);

  return (
    <div className="popup-table-select" ref={popupRef}>
      <div 
        className="select-input" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedItem ? selectedItem.название : placeholder}
        <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>
      </div>

      {isOpen && (
        <div className="popup-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => handleSelect(item)}
                      className={value?.id === item.id ? 'selected' : ''}
                    >
                      <td>{item.id}</td>
                      <td>{item.название}</td>
                      <td>{item.order}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-results">Нет результатов</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopupTableSelect;