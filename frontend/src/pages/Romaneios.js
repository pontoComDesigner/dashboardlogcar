import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import RomaneioForm from '../components/RomaneioForm';
import DesmembramentoModal from '../components/DesmembramentoModal';

const Romaneios = () => {
  const [romaneios, setRomaneios] = useState([]);
  const [romaneiosFiltrados, setRomaneiosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDesmembramento, setShowDesmembramento] = useState(false);
  const [editingRomaneio, setEditingRomaneio] = useState(null);
  const [selectedRomaneio, setSelectedRomaneio] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadRomaneios();
  }, []);

  useEffect(() => {
    if (romaneios.length > 0) {
      aplicarFiltros(romaneios);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

  const aplicarFiltros = (lista) => {
    let filtrados = [...lista];

    // Filtro por data
    if (filtroData) {
      filtrados = filtrados.filter(romaneio => {
        const dataRomaneio = new Date(romaneio.createdAt).toISOString().split('T')[0];
        return dataRomaneio === filtroData;
      });
    }

    // Filtro por busca (número)
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      filtrados = filtrados.filter(romaneio => {
        const numeroRomaneio = (romaneio.numeroRomaneio || '').toLowerCase();
        return numeroRomaneio.includes(busca);
      });
    }

    setRomaneiosFiltrados(filtrados);
  };

  const loadRomaneios = async () => {
    try {
      const response = await api.get('/romaneios');
      setRomaneios(response.data.romaneios || []);
      aplicarFiltros(response.data.romaneios || []);
    } catch (error) {
      console.error('Erro ao carregar romaneios:', error);
      showAlert('Erro ao carregar romaneios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setEditingRomaneio(null);
    setShowModal(true);
  };

  const handleEdit = async (id) => {
    try {
      const response = await api.get(`/romaneios/${id}`);
      setEditingRomaneio(response.data.romaneio);
      setShowModal(true);
    } catch (error) {
      showAlert('Erro ao carregar romaneio', 'error');
    }
  };

  const handleDesmembrar = async (id) => {
    try {
      const response = await api.get(`/romaneios/${id}`);
      setSelectedRomaneio(response.data.romaneio);
      setShowDesmembramento(true);
    } catch (error) {
      showAlert('Erro ao carregar romaneio', 'error');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingRomaneio) {
        await api.put(`/romaneios/${editingRomaneio.id}`, formData);
        showAlert('Romaneio atualizado com sucesso');
      } else {
        await api.post('/romaneios', formData);
        showAlert('Romaneio criado com sucesso');
      }
      setShowModal(false);
      loadRomaneios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao salvar romaneio', 'error');
    }
  };

  const handleDesmembramento = async (formData) => {
    try {
      await api.post(`/romaneios/${selectedRomaneio.id}/desmembrar`, formData);
      showAlert('Romaneio desmembrado com sucesso');
      setShowDesmembramento(false);
      loadRomaneios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao desmembrar romaneio', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ABERTO: 'badge-info',
      DESPACHADO: 'badge-warning',
      BAIXADO: 'badge-success'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return <div className="loading">Carregando romaneios...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Romaneios</h2>
          <button onClick={handleCreate} className="btn btn-primary">
            Novo Romaneio
          </button>
        </div>

        <div className="filtros-container" style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Filtrar por Data:</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Buscar por Número:</label>
              <input
                type="text"
                placeholder="Digite o número do romaneio..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            {(filtroData || filtroBusca) && (
              <button
                onClick={() => {
                  const hoje = new Date();
                  setFiltroData(hoje.toISOString().split('T')[0]);
                  setFiltroBusca('');
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '20px' }}
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
            {alert.message}
          </div>
        )}

        {romaneiosFiltrados.length === 0 ? (
          <div className="empty-state">
            <p>{romaneios.length === 0 ? 'Nenhum romaneio encontrado' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº Romaneio</th>
                <th>Transportadora</th>
                <th>Veículo</th>
                <th>Motorista</th>
                <th>Total Pedidos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {romaneiosFiltrados.map((romaneio) => (
                <tr key={romaneio.id}>
                  <td>{romaneio.numeroRomaneio}</td>
                  <td>{romaneio.transportadora || '-'}</td>
                  <td>{romaneio.veiculo || '-'}</td>
                  <td>{romaneio.motorista || '-'}</td>
                  <td>{romaneio.totalPedidos || 0}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(romaneio.status)}`}>
                      {romaneio.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEdit(romaneio.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    {romaneio.status === 'ABERTO' && (
                      <button
                        onClick={() => handleDesmembrar(romaneio.id)}
                        className="btn btn-success btn-sm"
                      >
                        Desmembrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingRomaneio ? 'Editar Romaneio' : 'Novo Romaneio'}
          onClose={() => setShowModal(false)}
        >
          <RomaneioForm
            romaneio={editingRomaneio}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}

      {showDesmembramento && selectedRomaneio && (
        <DesmembramentoModal
          romaneio={selectedRomaneio}
          onSave={handleDesmembramento}
          onCancel={() => setShowDesmembramento(false)}
        />
      )}
    </div>
  );
};

export default Romaneios;

import Modal from '../components/Modal';
import RomaneioForm from '../components/RomaneioForm';
import DesmembramentoModal from '../components/DesmembramentoModal';

const Romaneios = () => {
  const [romaneios, setRomaneios] = useState([]);
  const [romaneiosFiltrados, setRomaneiosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDesmembramento, setShowDesmembramento] = useState(false);
  const [editingRomaneio, setEditingRomaneio] = useState(null);
  const [selectedRomaneio, setSelectedRomaneio] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadRomaneios();
  }, []);

  useEffect(() => {
    if (romaneios.length > 0) {
      aplicarFiltros(romaneios);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

  const aplicarFiltros = (lista) => {
    let filtrados = [...lista];

    // Filtro por data
    if (filtroData) {
      filtrados = filtrados.filter(romaneio => {
        const dataRomaneio = new Date(romaneio.createdAt).toISOString().split('T')[0];
        return dataRomaneio === filtroData;
      });
    }

    // Filtro por busca (número)
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      filtrados = filtrados.filter(romaneio => {
        const numeroRomaneio = (romaneio.numeroRomaneio || '').toLowerCase();
        return numeroRomaneio.includes(busca);
      });
    }

    setRomaneiosFiltrados(filtrados);
  };

  const loadRomaneios = async () => {
    try {
      const response = await api.get('/romaneios');
      setRomaneios(response.data.romaneios || []);
      aplicarFiltros(response.data.romaneios || []);
    } catch (error) {
      console.error('Erro ao carregar romaneios:', error);
      showAlert('Erro ao carregar romaneios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setEditingRomaneio(null);
    setShowModal(true);
  };

  const handleEdit = async (id) => {
    try {
      const response = await api.get(`/romaneios/${id}`);
      setEditingRomaneio(response.data.romaneio);
      setShowModal(true);
    } catch (error) {
      showAlert('Erro ao carregar romaneio', 'error');
    }
  };

  const handleDesmembrar = async (id) => {
    try {
      const response = await api.get(`/romaneios/${id}`);
      setSelectedRomaneio(response.data.romaneio);
      setShowDesmembramento(true);
    } catch (error) {
      showAlert('Erro ao carregar romaneio', 'error');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingRomaneio) {
        await api.put(`/romaneios/${editingRomaneio.id}`, formData);
        showAlert('Romaneio atualizado com sucesso');
      } else {
        await api.post('/romaneios', formData);
        showAlert('Romaneio criado com sucesso');
      }
      setShowModal(false);
      loadRomaneios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao salvar romaneio', 'error');
    }
  };

  const handleDesmembramento = async (formData) => {
    try {
      await api.post(`/romaneios/${selectedRomaneio.id}/desmembrar`, formData);
      showAlert('Romaneio desmembrado com sucesso');
      setShowDesmembramento(false);
      loadRomaneios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao desmembrar romaneio', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ABERTO: 'badge-info',
      DESPACHADO: 'badge-warning',
      BAIXADO: 'badge-success'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return <div className="loading">Carregando romaneios...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Romaneios</h2>
          <button onClick={handleCreate} className="btn btn-primary">
            Novo Romaneio
          </button>
        </div>

        <div className="filtros-container" style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Filtrar por Data:</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Buscar por Número:</label>
              <input
                type="text"
                placeholder="Digite o número do romaneio..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            {(filtroData || filtroBusca) && (
              <button
                onClick={() => {
                  const hoje = new Date();
                  setFiltroData(hoje.toISOString().split('T')[0]);
                  setFiltroBusca('');
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '20px' }}
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
            {alert.message}
          </div>
        )}

        {romaneiosFiltrados.length === 0 ? (
          <div className="empty-state">
            <p>{romaneios.length === 0 ? 'Nenhum romaneio encontrado' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº Romaneio</th>
                <th>Transportadora</th>
                <th>Veículo</th>
                <th>Motorista</th>
                <th>Total Pedidos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {romaneiosFiltrados.map((romaneio) => (
                <tr key={romaneio.id}>
                  <td>{romaneio.numeroRomaneio}</td>
                  <td>{romaneio.transportadora || '-'}</td>
                  <td>{romaneio.veiculo || '-'}</td>
                  <td>{romaneio.motorista || '-'}</td>
                  <td>{romaneio.totalPedidos || 0}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(romaneio.status)}`}>
                      {romaneio.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEdit(romaneio.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    {romaneio.status === 'ABERTO' && (
                      <button
                        onClick={() => handleDesmembrar(romaneio.id)}
                        className="btn btn-success btn-sm"
                      >
                        Desmembrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingRomaneio ? 'Editar Romaneio' : 'Novo Romaneio'}
          onClose={() => setShowModal(false)}
        >
          <RomaneioForm
            romaneio={editingRomaneio}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}

      {showDesmembramento && selectedRomaneio && (
        <DesmembramentoModal
          romaneio={selectedRomaneio}
          onSave={handleDesmembramento}
          onCancel={() => setShowDesmembramento(false)}
        />
      )}
    </div>
  );
};

export default Romaneios;

import Modal from '../components/Modal';
import RomaneioForm from '../components/RomaneioForm';
import DesmembramentoModal from '../components/DesmembramentoModal';

const Romaneios = () => {
  const [romaneios, setRomaneios] = useState([]);
  const [romaneiosFiltrados, setRomaneiosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDesmembramento, setShowDesmembramento] = useState(false);
  const [editingRomaneio, setEditingRomaneio] = useState(null);
  const [selectedRomaneio, setSelectedRomaneio] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadRomaneios();
  }, []);

  useEffect(() => {
    if (romaneios.length > 0) {
      aplicarFiltros(romaneios);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

  const aplicarFiltros = (lista) => {
    let filtrados = [...lista];

    // Filtro por data
    if (filtroData) {
      filtrados = filtrados.filter(romaneio => {
        const dataRomaneio = new Date(romaneio.createdAt).toISOString().split('T')[0];
        return dataRomaneio === filtroData;
      });
    }

    // Filtro por busca (número)
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      filtrados = filtrados.filter(romaneio => {
        const numeroRomaneio = (romaneio.numeroRomaneio || '').toLowerCase();
        return numeroRomaneio.includes(busca);
      });
    }

    setRomaneiosFiltrados(filtrados);
  };

  const loadRomaneios = async () => {
    try {
      const response = await api.get('/romaneios');
      setRomaneios(response.data.romaneios || []);
      aplicarFiltros(response.data.romaneios || []);
    } catch (error) {
      console.error('Erro ao carregar romaneios:', error);
      showAlert('Erro ao carregar romaneios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setEditingRomaneio(null);
    setShowModal(true);
  };

  const handleEdit = async (id) => {
    try {
      const response = await api.get(`/romaneios/${id}`);
      setEditingRomaneio(response.data.romaneio);
      setShowModal(true);
    } catch (error) {
      showAlert('Erro ao carregar romaneio', 'error');
    }
  };

  const handleDesmembrar = async (id) => {
    try {
      const response = await api.get(`/romaneios/${id}`);
      setSelectedRomaneio(response.data.romaneio);
      setShowDesmembramento(true);
    } catch (error) {
      showAlert('Erro ao carregar romaneio', 'error');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingRomaneio) {
        await api.put(`/romaneios/${editingRomaneio.id}`, formData);
        showAlert('Romaneio atualizado com sucesso');
      } else {
        await api.post('/romaneios', formData);
        showAlert('Romaneio criado com sucesso');
      }
      setShowModal(false);
      loadRomaneios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao salvar romaneio', 'error');
    }
  };

  const handleDesmembramento = async (formData) => {
    try {
      await api.post(`/romaneios/${selectedRomaneio.id}/desmembrar`, formData);
      showAlert('Romaneio desmembrado com sucesso');
      setShowDesmembramento(false);
      loadRomaneios();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao desmembrar romaneio', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ABERTO: 'badge-info',
      DESPACHADO: 'badge-warning',
      BAIXADO: 'badge-success'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return <div className="loading">Carregando romaneios...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Romaneios</h2>
          <button onClick={handleCreate} className="btn btn-primary">
            Novo Romaneio
          </button>
        </div>

        <div className="filtros-container" style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Filtrar por Data:</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Buscar por Número:</label>
              <input
                type="text"
                placeholder="Digite o número do romaneio..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            {(filtroData || filtroBusca) && (
              <button
                onClick={() => {
                  const hoje = new Date();
                  setFiltroData(hoje.toISOString().split('T')[0]);
                  setFiltroBusca('');
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '20px' }}
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
            {alert.message}
          </div>
        )}

        {romaneiosFiltrados.length === 0 ? (
          <div className="empty-state">
            <p>{romaneios.length === 0 ? 'Nenhum romaneio encontrado' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº Romaneio</th>
                <th>Transportadora</th>
                <th>Veículo</th>
                <th>Motorista</th>
                <th>Total Pedidos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {romaneiosFiltrados.map((romaneio) => (
                <tr key={romaneio.id}>
                  <td>{romaneio.numeroRomaneio}</td>
                  <td>{romaneio.transportadora || '-'}</td>
                  <td>{romaneio.veiculo || '-'}</td>
                  <td>{romaneio.motorista || '-'}</td>
                  <td>{romaneio.totalPedidos || 0}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(romaneio.status)}`}>
                      {romaneio.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEdit(romaneio.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    {romaneio.status === 'ABERTO' && (
                      <button
                        onClick={() => handleDesmembrar(romaneio.id)}
                        className="btn btn-success btn-sm"
                      >
                        Desmembrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingRomaneio ? 'Editar Romaneio' : 'Novo Romaneio'}
          onClose={() => setShowModal(false)}
        >
          <RomaneioForm
            romaneio={editingRomaneio}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}

      {showDesmembramento && selectedRomaneio && (
        <DesmembramentoModal
          romaneio={selectedRomaneio}
          onSave={handleDesmembramento}
          onCancel={() => setShowDesmembramento(false)}
        />
      )}
    </div>
  );
};

export default Romaneios;
