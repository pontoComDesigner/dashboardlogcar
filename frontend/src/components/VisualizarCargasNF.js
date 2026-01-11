import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './VisualizarCargasNF.css';

const VisualizarCargasNF = ({ notaFiscalId, onClose }) => {
  const [cargas, setCargas] = useState([]);
  const [notaFiscal, setNotaFiscal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [notaFiscalId]);

  const loadData = async () => {
    try {
      // Buscar nota fiscal
      const notaResponse = await api.get(`/desmembramento/nota/${notaFiscalId}`);
      setNotaFiscal(notaResponse.data.notaFiscal);

      // Buscar cargas
      const cargasResponse = await api.get(`/desmembramento/cargas/${notaFiscalId}`);
      setCargas(cargasResponse.data.cargas || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>
              Cargas da Nota Fiscal {notaFiscal?.numeroNota}
            </h3>
            <p className="modal-subtitle">{notaFiscal?.clienteNome}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {cargas.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma carga encontrada</p>
            </div>
          ) : (
            <div className="cargas-grid">
              {cargas.map((carga) => (
                <div key={carga.id} className="carga-detalhe-box">
                  <div className="carga-detalhe-header">
                    <h4>{carga.numeroCarga}</h4>
                    <span className={`badge badge-${carga.status === 'CRIADA' ? 'info' : 'success'}`}>
                      {carga.status}
                    </span>
                  </div>

                  <div className="carga-detalhe-totais">
                    <div>
                      <strong>Valor:</strong> R$ {Number(carga.valorTotal).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                    {carga.pesoTotal > 0 && (
                      <div>
                        <strong>Peso:</strong> {Number(carga.pesoTotal).toLocaleString('pt-BR', {
                          maximumFractionDigits: 2
                        })} kg
                      </div>
                    )}
                    {carga.volumeTotal > 0 && (
                      <div>
                        <strong>Volume:</strong> {Number(carga.volumeTotal).toFixed(3)} m³
                      </div>
                    )}
                    <div>
                      <strong>Itens:</strong> {carga.itens?.length || 0}
                    </div>
                  </div>

                  {carga.itens && carga.itens.length > 0 && (
                    <div className="carga-detalhe-itens">
                      <h5>Itens da Carga</h5>
                      <table className="table-detalhe">
                        <thead>
                          <tr>
                            <th>Descrição</th>
                            <th>Quantidade</th>
                            <th>Unidade</th>
                            <th>Valor Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carga.itens.map((item, index) => (
                            <tr key={index}>
                              <td>{item.descricao}</td>
                              <td>{Number(item.quantidade).toLocaleString('pt-BR')}</td>
                              <td>{item.unidade}</td>
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
                </div>
              ))}
            </div>
          )}

          {notaFiscal && (
            <div className="nota-fiscal-resumo">
              <h4>Resumo da Nota Fiscal</h4>
              <div className="resumo-grid">
                <div>
                  <strong>Valor Total NF:</strong> R$ {Number(notaFiscal.valorTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div>
                  <strong>Total Cargas:</strong> R$ {Number(cargas.reduce((sum, c) => sum + c.valorTotal, 0)).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div>
                  <strong>Quantidade de Cargas:</strong> {cargas.length}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualizarCargasNF;
