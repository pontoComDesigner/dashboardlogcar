import React, { useState, useEffect } from 'react';

const UsuarioForm = ({ usuario, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'LOGISTICA',
    isActive: true
  });

  useEffect(() => {
    if (usuario) {
      setFormData({
        username: usuario.username || '',
        password: '',
        name: usuario.name || '',
        email: usuario.email || '',
        role: usuario.role || 'LOGISTICA',
        isActive: usuario.isActive !== undefined ? usuario.isActive : true
      });
    }
  }, [usuario]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (usuario && !submitData.password) {
      delete submitData.password;
    }
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Usuário *</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={!!usuario}
          />
        </div>
        <div className="form-group">
          <label>Senha {usuario ? '(deixe em branco para não alterar)' : '*'}</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!usuario}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Nome *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Role *</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
            <option value="LOGISTICA">LOGISTICA</option>
          </select>
        </div>
      </div>

      {usuario && (
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
            />
            {' '}Usuário Ativo
          </label>
        </div>
      )}

      <div className="modal-footer">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Salvar
        </button>
      </div>
    </form>
  );
};

export default UsuarioForm;


