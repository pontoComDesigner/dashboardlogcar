import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatarStatus, getStatusBadge } from '../utils/statusFormatter';
import './NotasFiscais.css';

const NotasFiscais = () => {
  const [notas, setNotas] = useState([]);
  const [notasFiltradas, setNotasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notaVisualizando, setNotaVisualizando] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadNotas();
  }, []);

  useEffect(() => {
    if (notas.length > 0) {
      aplicarFiltros(notas);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

  const loadNotas = async () => {
    try {
      const response = await api.get('/notas-fiscais');
      setNotas(response.data.notasFiscais);
      aplicarFiltros(response.data.notasFiscais);
    } catch (error) {
      console.error('Erro ao carregar notas fiscais:', error);
      showAlert('Erro ao carregar notas fiscais', 'error');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (lista) => {
    let filtrados = [...lista];

    // Filtro por data
    if (filtroData) {
      filtrados = filtrados.filter(nota => {
        const dataNota = new Date(nota.dataEmissao).toISOString().split('T')[0];
        return dataNota === filtroData;
      });
    }

    // Filtro por busca (número)
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      filtrados = filtrados.filter(nota => {
        const numeroNota = (nota.numeroNota || '').toLowerCase();
        const serie = (nota.serie || '').toLowerCase();
        return numeroNota.includes(busca) || serie.includes(busca);
      });
    }

    setNotasFiltradas(filtrados);
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleVisualizar = async (id) => {
    try {
      const response = await api.get(`/notas-fiscais/${id}`);
      setNotaVisualizando(response.data.notaFiscal);
      setShowModal(true);
    } catch (error) {
      showAlert('Erro ao carregar nota fiscal', 'error');
    }
  };


  if (loading) {
    return <div className="loading">Carregando notas fiscais...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Notas Fiscais</h2>
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
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Buscar por Número/Série:</label>
              <input
                type="text"
                placeholder="Digite o número ou série da NF..."
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

        {notasFiltradas.length === 0 ? (
          <div className="empty-state">
            <p>{notas.length === 0 ? 'Nenhuma nota fiscal encontrada' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº Nota</th>
                <th>Série</th>
                <th>Cliente</th>
                <th>Data Emissão</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {notasFiltradas.map((nota) => (
                <tr 
                  key={nota.id}
                  onClick={() => handleVisualizar(nota.id)}
                  style={{ cursor: 'pointer' }}
                  className="table-row-clickable"
                >
                  <td>{nota.numeroNota}</td>
                  <td>{nota.serie}</td>
                  <td>{nota.clienteNome}</td>
                  <td>{new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}</td>
                  <td>
                    R$ {Number(nota.valorTotal).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(nota.status)}`}>
                      {formatarStatus(nota.status)}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#666', fontSize: '12px' }}>Clique para visualizar</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && notaVisualizando && (
        <Modal
          title={`Nota Fiscal ${notaVisualizando.numeroNota} - Visualização`}
          onClose={() => {
            setShowModal(false);
            setNotaVisualizando(null);
          }}
          large
        >
          <div className="nota-visualizacao">
            <div className="nota-info-section">
              <h3>Informações da Nota Fiscal</h3>
              <div className="info-grid">
                <div>
                  <strong>Número:</strong> {notaVisualizando.numeroNota}
                </div>
                <div>
                  <strong>Série:</strong> {notaVisualizando.serie || '-'}
                </div>
                <div>
                  <strong>Cliente:</strong> {notaVisualizando.clienteNome}
                </div>
                <div>
                  <strong>CNPJ/CPF:</strong> {notaVisualizando.clienteCnpjCpf}
                </div>
                <div>
                  <strong>Data de Emissão:</strong> {new Date(notaVisualizando.dataEmissao).toLocaleDateString('pt-BR')}
                </div>
                {notaVisualizando.dataVencimento && (
                  <div>
                    <strong>Data de Vencimento:</strong> {new Date(notaVisualizando.dataVencimento).toLocaleDateString('pt-BR')}
                  </div>
                )}
                <div>
                  <strong>Valor Total:</strong> R$ {Number(notaVisualizando.valorTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div>
                  <strong>Status:</strong> <span className={`badge ${getStatusBadge(notaVisualizando.status)}`}>
                    {formatarStatus(notaVisualizando.status)}
                  </span>
                </div>
              </div>
            </div>

            {notaVisualizando.clienteEndereco && (
              <div className="nota-info-section">
                <h3>Endereço de Entrega</h3>
                <div className="endereco-info">
                  <p>{notaVisualizando.clienteEndereco}</p>
                  {notaVisualizando.clienteCidade && (
                    <p>{notaVisualizando.clienteCidade}, {notaVisualizando.clienteEstado}</p>
                  )}
                  {notaVisualizando.clienteCep && (
                    <p>CEP: {notaVisualizando.clienteCep}</p>
                  )}
                </div>
              </div>
            )}

            {notaVisualizando.itens && notaVisualizando.itens.length > 0 && (
              <div className="nota-info-section">
                <h3>Itens da Nota Fiscal</h3>
                <table className="table" style={{ marginTop: '10px' }}>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Quantidade</th>
                      <th>Unidade</th>
                      <th>Valor Unitário</th>
                      <th>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notaVisualizando.itens.map((item, index) => (
                      <tr key={index}>
                        <td>{item.descricao}</td>
                        <td>{Number(item.quantidade).toLocaleString('pt-BR')}</td>
                        <td>{item.unidade}</td>
                        <td>
                          R$ {Number(item.valorUnitario).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td>
                          R$ {Number(item.valorTotal).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {notaVisualizando.observacoes && (
              <div className="nota-info-section">
                <h3>Observações</h3>
                <p>{notaVisualizando.observacoes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NotasFiscais;
