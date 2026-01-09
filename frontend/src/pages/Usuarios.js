import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import UsuarioForm from '../components/UsuarioForm';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      const response = await api.get('/users');
      setUsuarios(response.data.users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showAlert('Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setEditingUsuario(null);
    setShowModal(true);
  };

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      showAlert('Usuário excluído com sucesso');
      loadUsuarios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao excluir usuário', 'error');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingUsuario) {
        await api.put(`/users/${editingUsuario.id}`, formData);
        showAlert('Usuário atualizado com sucesso');
      } else {
        await api.post('/users', formData);
        showAlert('Usuário criado com sucesso');
      }
      setShowModal(false);
      loadUsuarios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao salvar usuário', 'error');
    }
  };

  if (loading) {
    return <div className="loading">Carregando usuários...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Usuários</h2>
          <button onClick={handleCreate} className="btn btn-primary">
            Novo Usuário
          </button>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
            {alert.message}
          </div>
        )}

        {usuarios.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.name}</td>
                  <td>{usuario.username}</td>
                  <td>{usuario.email || '-'}</td>
                  <td>{usuario.role}</td>
                  <td>
                    <span className={`badge ${usuario.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {usuario.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEdit(usuario)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
          onClose={() => setShowModal(false)}
        >
          <UsuarioForm
            usuario={editingUsuario}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Usuarios;











import api from '../services/api';
import Modal from '../components/Modal';
import UsuarioForm from '../components/UsuarioForm';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      const response = await api.get('/users');
      setUsuarios(response.data.users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showAlert('Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setEditingUsuario(null);
    setShowModal(true);
  };

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      showAlert('Usuário excluído com sucesso');
      loadUsuarios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao excluir usuário', 'error');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingUsuario) {
        await api.put(`/users/${editingUsuario.id}`, formData);
        showAlert('Usuário atualizado com sucesso');
      } else {
        await api.post('/users', formData);
        showAlert('Usuário criado com sucesso');
      }
      setShowModal(false);
      loadUsuarios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao salvar usuário', 'error');
    }
  };

  if (loading) {
    return <div className="loading">Carregando usuários...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Usuários</h2>
          <button onClick={handleCreate} className="btn btn-primary">
            Novo Usuário
          </button>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
            {alert.message}
          </div>
        )}

        {usuarios.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.name}</td>
                  <td>{usuario.username}</td>
                  <td>{usuario.email || '-'}</td>
                  <td>{usuario.role}</td>
                  <td>
                    <span className={`badge ${usuario.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {usuario.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEdit(usuario)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
          onClose={() => setShowModal(false)}
        >
          <UsuarioForm
            usuario={editingUsuario}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Usuarios;











import api from '../services/api';
import Modal from '../components/Modal';
import UsuarioForm from '../components/UsuarioForm';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      const response = await api.get('/users');
      setUsuarios(response.data.users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showAlert('Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setEditingUsuario(null);
    setShowModal(true);
  };

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      showAlert('Usuário excluído com sucesso');
      loadUsuarios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao excluir usuário', 'error');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingUsuario) {
        await api.put(`/users/${editingUsuario.id}`, formData);
        showAlert('Usuário atualizado com sucesso');
      } else {
        await api.post('/users', formData);
        showAlert('Usuário criado com sucesso');
      }
      setShowModal(false);
      loadUsuarios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao salvar usuário', 'error');
    }
  };

  if (loading) {
    return <div className="loading">Carregando usuários...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Usuários</h2>
          <button onClick={handleCreate} className="btn btn-primary">
            Novo Usuário
          </button>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
            {alert.message}
          </div>
        )}

        {usuarios.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.name}</td>
                  <td>{usuario.username}</td>
                  <td>{usuario.email || '-'}</td>
                  <td>{usuario.role}</td>
                  <td>
                    <span className={`badge ${usuario.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {usuario.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEdit(usuario)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
          onClose={() => setShowModal(false)}
        >
          <UsuarioForm
            usuario={editingUsuario}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Usuarios;












