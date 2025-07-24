import React, { useState, useRef, useEffect } from 'react';

const PopupTableSelect = ({ data, value, onChange, placeholder = "Выберите значение" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popupRef = useRef(null);

  // Преобразуем объект объектов в массив объектов
  const dataArray = Object.values(data || {});

  // Сортируем данные сначала по orderValue, затем по названию
  const sortedData = [...dataArray].sort((a, b) => {
    if (a.orderValue !== b.orderValue) return a.orderValue - b.orderValue;
    return a.name.localeCompare(b.name);
  });

  // Фильтруем данные по поисковому запросу
  const filteredData = sortedData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Находим выбранный элемент в объекте данных
  const selectedItem = value?.id ? data?.[value.id] : null;

  return (
    <div className="popup-table-select" ref={popupRef}>
      <div 
        className="select-input" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedItem ? selectedItem.name : placeholder}
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
                  <th>name</th>
                  {/* <th>orderValue</th> */}
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
                      <td>{item.name}</td>
                      {/* <td>{item.orderValue}</td> */}
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