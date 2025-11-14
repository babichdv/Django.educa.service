import React, { useEffect } from 'react';

const EditModal = ({ isOpen, onClose, onSave, fieldsConfig, relations, initialData }) => {
  const [formData, setFormData] = React.useState(initialData || {});

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  const renderField = ([fieldName, fieldConfig]) => {
    switch (fieldConfig.type) {
      case 'text':
      case 'number':
        return (
          <div className="form-group" key={fieldName}>
            <label>{fieldConfig.label}</label>
            <input
              type={fieldConfig.type}
              name={fieldName}
              value={formData[fieldName] || ''}
              onChange={handleChange}
              required={fieldConfig.required}
            />
          </div>
        );
      case 'select':
        return (
          <div className="form-group" key={fieldName}>
            <label>{fieldConfig.label}</label>
            <select
              name={fieldName}
              value={formData[fieldName] || ''}
              onChange={handleChange}
              required={fieldConfig.required}
            >
              <option value="">Выберите...</option>
              {relations[fieldConfig.relation]?.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          {Object.entries(fieldsConfig).map(renderField)}
          
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Отмена
            </button>
            <button type="submit">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;