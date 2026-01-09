import React, { useEffect, useState } from 'react';
import api from '../services/api';
import DesmembramentoNovo from './DesmembramentoNovo';
import './Desmembramento.css';

const Desmembramento = () => {
  const [notasPendentes, setNotasPendentes] = useState([]);
  const [notasFiltradas, setNotasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadNotasPendentes();
  }, []);

  useEffect(() => {
    if (notasPendentes.length > 0) {
      aplicarFiltros(notasPendentes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

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

  const loadNotasPendentes = async () => {
    try {
      const response = await api.get('/desmembramento/pendentes');
      setNotasPendentes(response.data.notasFiscais || []);
      aplicarFiltros(response.data.notasFiscais || []);
    } catch (error) {
      console.error('Erro ao carregar notas pendentes:', error);
      showAlert('Erro ao carregar notas fiscais pendentes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSelecionarNota = (notaId) => {
    setNotaSelecionada(notaId);
  };

  const handleDesmembrarCompleto = async () => {
    await loadNotasPendentes();
    setNotaSelecionada(null);
  };

  const handleClose = () => {
    setNotaSelecionada(null);
  };

  if (loading) {
    return <div className="loading">Carregando notas fiscais pendentes...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Desmembramento de Notas Fiscais</h2>
          <button onClick={loadNotasPendentes} className="btn btn-secondary">
            Atualizar
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

        <div className="info-box">
          <p>
            <strong>Notas Fiscais Pendentes de Desmembramento:</strong> {notasFiltradas.length}
          </p>
          <p className="info-text">
            Selecione uma nota fiscal para visualizar detalhes e realizar o desmembramento em múltiplas cargas.
          </p>
        </div>

        {notasFiltradas.length === 0 ? (
          <div className="empty-state">
            <p>{notasPendentes.length === 0 ? '✅ Nenhuma nota fiscal pendente de desmembramento' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <div className="notas-grid">
            {notasFiltradas.map((nota) => (
              <div key={nota.id} className="nota-card" onClick={() => handleSelecionarNota(nota.id)}>
                <div className="nota-card-header">
                  <h3>NF {nota.numeroNota}</h3>
                  {nota.serie && <span className="serie">Série {nota.serie}</span>}
                </div>
                <div className="nota-card-body">
                  <p><strong>Cliente:</strong> {nota.clienteNome}</p>
                  {nota.numeroPedido && (
                    <p><strong>Pedido:</strong> {nota.numeroPedido}</p>
                  )}
                  <p><strong>Valor Total:</strong> R$ {Number(nota.valorTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</p>
                  {nota.pesoTotal && (
                    <p><strong>Peso:</strong> {Number(nota.pesoTotal).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    })} kg</p>
                  )}
                  {nota.volumeTotal && (
                    <p><strong>Volume:</strong> {Number(nota.volumeTotal).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    })} m³</p>
                  )}
                  <p><strong>Itens:</strong> {nota.totalItens}</p>
                  <p className="data-emissao">
                    <strong>Emissão:</strong> {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="nota-card-footer">
                  <button className="btn btn-primary btn-block">
                    Desmembrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notaSelecionada && (
        <DesmembramentoNovo
          notaFiscalId={notaSelecionada}
          onClose={handleClose}
          onComplete={handleDesmembrarCompleto}
        />
      )}
    </div>
  );
};

export default Desmembramento;

import DesmembramentoNovo from './DesmembramentoNovo';
import './Desmembramento.css';

const Desmembramento = () => {
  const [notasPendentes, setNotasPendentes] = useState([]);
  const [notasFiltradas, setNotasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadNotasPendentes();
  }, []);

  useEffect(() => {
    if (notasPendentes.length > 0) {
      aplicarFiltros(notasPendentes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

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

  const loadNotasPendentes = async () => {
    try {
      const response = await api.get('/desmembramento/pendentes');
      setNotasPendentes(response.data.notasFiscais || []);
      aplicarFiltros(response.data.notasFiscais || []);
    } catch (error) {
      console.error('Erro ao carregar notas pendentes:', error);
      showAlert('Erro ao carregar notas fiscais pendentes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSelecionarNota = (notaId) => {
    setNotaSelecionada(notaId);
  };

  const handleDesmembrarCompleto = async () => {
    await loadNotasPendentes();
    setNotaSelecionada(null);
  };

  const handleClose = () => {
    setNotaSelecionada(null);
  };

  if (loading) {
    return <div className="loading">Carregando notas fiscais pendentes...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Desmembramento de Notas Fiscais</h2>
          <button onClick={loadNotasPendentes} className="btn btn-secondary">
            Atualizar
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

        <div className="info-box">
          <p>
            <strong>Notas Fiscais Pendentes de Desmembramento:</strong> {notasFiltradas.length}
          </p>
          <p className="info-text">
            Selecione uma nota fiscal para visualizar detalhes e realizar o desmembramento em múltiplas cargas.
          </p>
        </div>

        {notasFiltradas.length === 0 ? (
          <div className="empty-state">
            <p>{notasPendentes.length === 0 ? '✅ Nenhuma nota fiscal pendente de desmembramento' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <div className="notas-grid">
            {notasFiltradas.map((nota) => (
              <div key={nota.id} className="nota-card" onClick={() => handleSelecionarNota(nota.id)}>
                <div className="nota-card-header">
                  <h3>NF {nota.numeroNota}</h3>
                  {nota.serie && <span className="serie">Série {nota.serie}</span>}
                </div>
                <div className="nota-card-body">
                  <p><strong>Cliente:</strong> {nota.clienteNome}</p>
                  {nota.numeroPedido && (
                    <p><strong>Pedido:</strong> {nota.numeroPedido}</p>
                  )}
                  <p><strong>Valor Total:</strong> R$ {Number(nota.valorTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</p>
                  {nota.pesoTotal && (
                    <p><strong>Peso:</strong> {Number(nota.pesoTotal).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    })} kg</p>
                  )}
                  {nota.volumeTotal && (
                    <p><strong>Volume:</strong> {Number(nota.volumeTotal).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    })} m³</p>
                  )}
                  <p><strong>Itens:</strong> {nota.totalItens}</p>
                  <p className="data-emissao">
                    <strong>Emissão:</strong> {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="nota-card-footer">
                  <button className="btn btn-primary btn-block">
                    Desmembrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notaSelecionada && (
        <DesmembramentoNovo
          notaFiscalId={notaSelecionada}
          onClose={handleClose}
          onComplete={handleDesmembrarCompleto}
        />
      )}
    </div>
  );
};

export default Desmembramento;

import DesmembramentoNovo from './DesmembramentoNovo';
import './Desmembramento.css';

const Desmembramento = () => {
  const [notasPendentes, setNotasPendentes] = useState([]);
  const [notasFiltradas, setNotasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filtroData, setFiltroData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [filtroBusca, setFiltroBusca] = useState('');

  useEffect(() => {
    loadNotasPendentes();
  }, []);

  useEffect(() => {
    if (notasPendentes.length > 0) {
      aplicarFiltros(notasPendentes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroData, filtroBusca]);

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

  const loadNotasPendentes = async () => {
    try {
      const response = await api.get('/desmembramento/pendentes');
      setNotasPendentes(response.data.notasFiscais || []);
      aplicarFiltros(response.data.notasFiscais || []);
    } catch (error) {
      console.error('Erro ao carregar notas pendentes:', error);
      showAlert('Erro ao carregar notas fiscais pendentes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSelecionarNota = (notaId) => {
    setNotaSelecionada(notaId);
  };

  const handleDesmembrarCompleto = async () => {
    await loadNotasPendentes();
    setNotaSelecionada(null);
  };

  const handleClose = () => {
    setNotaSelecionada(null);
  };

  if (loading) {
    return <div className="loading">Carregando notas fiscais pendentes...</div>;
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h2>Desmembramento de Notas Fiscais</h2>
          <button onClick={loadNotasPendentes} className="btn btn-secondary">
            Atualizar
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

        <div className="info-box">
          <p>
            <strong>Notas Fiscais Pendentes de Desmembramento:</strong> {notasFiltradas.length}
          </p>
          <p className="info-text">
            Selecione uma nota fiscal para visualizar detalhes e realizar o desmembramento em múltiplas cargas.
          </p>
        </div>

        {notasFiltradas.length === 0 ? (
          <div className="empty-state">
            <p>{notasPendentes.length === 0 ? '✅ Nenhuma nota fiscal pendente de desmembramento' : 'Nenhum resultado encontrado com os filtros aplicados'}</p>
          </div>
        ) : (
          <div className="notas-grid">
            {notasFiltradas.map((nota) => (
              <div key={nota.id} className="nota-card" onClick={() => handleSelecionarNota(nota.id)}>
                <div className="nota-card-header">
                  <h3>NF {nota.numeroNota}</h3>
                  {nota.serie && <span className="serie">Série {nota.serie}</span>}
                </div>
                <div className="nota-card-body">
                  <p><strong>Cliente:</strong> {nota.clienteNome}</p>
                  {nota.numeroPedido && (
                    <p><strong>Pedido:</strong> {nota.numeroPedido}</p>
                  )}
                  <p><strong>Valor Total:</strong> R$ {Number(nota.valorTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</p>
                  {nota.pesoTotal && (
                    <p><strong>Peso:</strong> {Number(nota.pesoTotal).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    })} kg</p>
                  )}
                  {nota.volumeTotal && (
                    <p><strong>Volume:</strong> {Number(nota.volumeTotal).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    })} m³</p>
                  )}
                  <p><strong>Itens:</strong> {nota.totalItens}</p>
                  <p className="data-emissao">
                    <strong>Emissão:</strong> {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="nota-card-footer">
                  <button className="btn btn-primary btn-block">
                    Desmembrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notaSelecionada && (
        <DesmembramentoNovo
          notaFiscalId={notaSelecionada}
          onClose={handleClose}
          onComplete={handleDesmembrarCompleto}
        />
      )}
    </div>
  );
};

export default Desmembramento;
