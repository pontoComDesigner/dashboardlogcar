import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import PedidoForm from '../components/PedidoForm';
import VisualizarCargasNF from '../components/VisualizarCargasNF';

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [notaFiscalSelecionada, setNotaFiscalSelecionada] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadPedidos();
  }, []);

  useEffect(() => {
    if (pedidos.length > 0) {
      aplicarFiltros(pedidos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

  const loadPedidos = async () => {
    try {
      const response = await api.get('/pedidos?incluirNotasFiscais=true');
      setPedidos(response.data.pedidos || []);
      aplicarFiltros(response.data.pedidos || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      showAlert('Erro ao carregar pedidos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (lista) => {
    let filtrados = [...lista];

    // Filtro por data
    if (filtroData) {
      filtrados = filtrados.filter(pedido => {
        const dataPedido = new Date(pedido.createdAt).toISOString().split('T')[0];
        return dataPedido === filtroData;
      });
    }

    // Filtro por busca (número)
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      filtrados = filtrados.filter(pedido => {
        const numeroPedido = (pedido.numeroPedido || '').toLowerCase();
        const numeroNF = (pedido.numeroNota || '').toLowerCase();
        return numeroPedido.includes(busca) || numeroNF.includes(busca);
      });
    }

    setPedidosFiltrados(filtrados);
  };

  useEffect(() => {
    aplicarFiltros(pedidos);
  }, [filtroData, filtroBusca]);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setEditingPedido(null);
    setShowModal(true);
  };

  const handleEdit = async (id, tipo) => {
    if (tipo === 'NOTA_FISCAL') {
      // Se for nota fiscal, mostrar cargas
      setNotaFiscalSelecionada(id);
    } else {
      // Se for pedido normal, editar
      try {
        const response = await api.get(`/pedidos/${id}`);
        setEditingPedido(response.data.pedido);
        setShowModal(true);
      } catch (error) {
        showAlert('Erro ao carregar pedido', 'error');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) {
      return;
    }

    try {
      await api.delete(`/pedidos/${id}`);
      showAlert('Pedido excluído com sucesso');
      loadPedidos();
    } catch (error) {
      showAlert('Erro ao excluir pedido', 'error');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingPedido) {
        await api.put(`/pedidos/${editingPedido.id}`, formData);
        showAlert('Pedido atualizado com sucesso');
      } else {
        await api.post('/pedidos', formData);
        showAlert('Pedido criado com sucesso');
      }
      setShowModal(false);
      loadPedidos();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Erro ao salvar pedido', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDENTE: 'badge-warning',
      FATURADO: 'badge-success',
      CANCELADO: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return <div className="loading">Carregando pedidos...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Pedidos</h2>
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
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Buscar por Número (NF/Pedido):</label>
              <input
                type="text"
                placeholder="Digite o número da NF ou Pedido..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            {(filtroData || filtroBusca) && (
              <button
                onClick={() => {
                  setFiltroData('');
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

        {pedidosFiltrados.length === 0 ? (
          <div className="empty-state">
            <p>{pedidos.length === 0 ? 'Nenhum pedido encontrado' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nº Pedido/NF</th>
                <th>Cliente</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((pedido) => (
                <tr key={pedido.id}>
                  <td>
                    <span className={`badge ${pedido.tipo === 'NOTA_FISCAL' ? 'badge-info' : 'badge-secondary'}`}>
                      {pedido.tipo === 'NOTA_FISCAL' ? '📄 NF' : '📦 Pedido'}
                    </span>
                  </td>
                  <td>{pedido.numeroPedido || `NF ${pedido.numeroNota}`}</td>
                  <td>{pedido.clienteNome}</td>
                  <td>
                    R$ {Number(pedido.valorTotal || pedido.valorTotalCalculado || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(pedido.status)}`}>
                      {pedido.status}
                    </span>
                    {pedido.tipo === 'NOTA_FISCAL' && pedido.quantidadeCargas > 0 && (
                      <div style={{ marginTop: '5px', fontSize: '11px', color: '#666' }}>
                        {pedido.quantidadeCargas} carga(s)
                      </div>
                    )}
                  </td>
                  <td>
                    {pedido.tipo === 'NOTA_FISCAL' ? (
                      <button
                        onClick={() => handleEdit(pedido.id, 'NOTA_FISCAL')}
                        className="btn btn-primary btn-sm"
                      >
                        Ver Cargas
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(pedido.id, 'PEDIDO')}
                        className="btn btn-secondary btn-sm"
                      >
                        Editar
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
          title={editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
          onClose={() => setShowModal(false)}
        >
          <PedidoForm
            pedido={editingPedido}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}

      {notaFiscalSelecionada && (
        <VisualizarCargasNF
          notaFiscalId={notaFiscalSelecionada}
          onClose={() => setNotaFiscalSelecionada(null)}
        />
      )}
    </div>
  );
};

export default Pedidos;

