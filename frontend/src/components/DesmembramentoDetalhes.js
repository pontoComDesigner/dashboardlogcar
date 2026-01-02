import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './DesmembramentoDetalhes.css';

const DesmembramentoDetalhes = ({ notaFiscal, onDesmembrar, onCancel, onAlert }) => {
  const [numeroCargas, setNumeroCargas] = useState(1);
  const [sugestao, setSugestao] = useState(null);
  const [loadingSugestao, setLoadingSugestao] = useState(false);
  const [desmembrando, setDesmembrando] = useState(false);
  const [validacao, setValidacao] = useState(null);

  useEffect(() => {
    carregarSugestao();
    if (notaFiscal.cargas && notaFiscal.cargas.length > 0) {
      validarDesmembramento();
    }
  }, [notaFiscal.id]);

  const carregarSugestao = async () => {
    setLoadingSugestao(true);
    try {
      const response = await api.get(`/desmembramento/sugerir/${notaFiscal.id}`);
      setSugestao(response.data);
      setNumeroCargas(response.data.numeroCargasSugerido);
    } catch (error) {
      console.error('Erro ao carregar sugestão:', error);
    } finally {
      setLoadingSugestao(false);
    }
  };

  const validarDesmembramento = async () => {
    try {
      const response = await api.get(`/desmembramento/validar/${notaFiscal.id}`);
      setValidacao(response.data.validacao);
    } catch (error) {
      console.error('Erro ao validar:', error);
    }
  };

  const handleDesmembrar = async () => {
    if (numeroCargas < 1) {
      onAlert('Número de cargas deve ser pelo menos 1', 'error');
      return;
    }

    setDesmembrando(true);
    try {
      const response = await api.post('/desmembramento/desmembrar', {
        notaFiscalId: notaFiscal.id,
        numeroCargas: parseInt(numeroCargas),
        metodo: 'AUTOMATICO'
      });

      if (response.data.validacao && !response.data.validacao.valido) {
        onAlert(
          `Atenção: Divergência de ${response.data.validacao.porcentagemDivergencia.toFixed(2)}% nos valores`,
          'error'
        );
        return;
      }

      onAlert('Nota fiscal desmembrada com sucesso!', 'success');
      onDesmembrar();
    } catch (error) {
      onAlert(
        error.response?.data?.message || 'Erro ao desmembrar nota fiscal',
        'error'
      );
    } finally {
      setDesmembrando(false);
    }
  };

  const calcularTotais = () => {
    const totalPeso = notaFiscal.itens.reduce((sum, item) => sum + (item.peso || 0), 0);
    const totalVolume = notaFiscal.itens.reduce((sum, item) => sum + (item.volume || 0), 0);
    const totalValor = notaFiscal.itens.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
    return { totalPeso, totalVolume, totalValor };
  };

  const totais = calcularTotais();

  // Se já foi desmembrada, mostrar cargas
  if (notaFiscal.cargas && notaFiscal.cargas.length > 0) {
    return (
      <div className="desmembramento-detalhes">
        <div className="alert alert-info">
          ✅ Esta nota fiscal já foi desmembrada em {notaFiscal.cargas.length} carga(s)
        </div>

        {validacao && (
          <div className={`validacao-box ${validacao.valido ? 'valido' : 'invalido'}`}>
            <h4>Validação do Desmembramento</h4>
            <p>
              {validacao.valido ? '✅' : '⚠️'} 
              Status: {validacao.valido ? 'Válido' : 'Divergência detectada'}
            </p>
            {!validacao.valido && (
              <p>
                Divergência: {validacao.porcentagemDivergencia.toFixed(4)}% 
                (R$ {validacao.valorDivergencia.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })})
              </p>
            )}
          </div>
        )}

        <div className="cargas-list">
          <h4>Cargas Criadas</h4>
          {notaFiscal.cargas.map((carga, index) => (
            <div key={carga.id} className="carga-box">
              <div className="carga-header">
                <h5>{carga.numeroCarga}</h5>
                <span className={`badge badge-${carga.status === 'CRIADA' ? 'info' : 'success'}`}>
                  {carga.status}
                </span>
              </div>
              <div className="carga-info">
                <p><strong>Valor:</strong> R$ {Number(carga.valorTotal || 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</p>
                {carga.pesoTotal && (
                  <p><strong>Peso:</strong> {Number(carga.pesoTotal).toLocaleString('pt-BR', {
                    maximumFractionDigits: 2
                  })} kg</p>
                )}
                {carga.volumeTotal && (
                  <p><strong>Volume:</strong> {Number(carga.volumeTotal).toLocaleString('pt-BR', {
                    maximumFractionDigits: 2
                  })} m³</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="desmembramento-detalhes">
      <div className="nota-info">
        <h4>Informações da Nota Fiscal</h4>
        <div className="info-grid">
          <div>
            <p><strong>Número:</strong> {notaFiscal.numeroNota}</p>
            <p><strong>Cliente:</strong> {notaFiscal.clienteNome}</p>
            <p><strong>CNPJ/CPF:</strong> {notaFiscal.clienteCnpjCpf}</p>
          </div>
          <div>
            <p><strong>Endereço:</strong> {notaFiscal.clienteEndereco}</p>
            <p><strong>Cidade/UF:</strong> {notaFiscal.clienteCidade} / {notaFiscal.clienteEstado}</p>
            <p><strong>CEP:</strong> {notaFiscal.clienteCep}</p>
          </div>
          <div>
            <p><strong>Valor Total:</strong> R$ {Number(notaFiscal.valorTotal).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
            {totais.totalPeso > 0 && (
              <p><strong>Peso Total:</strong> {totais.totalPeso.toLocaleString('pt-BR', {
                maximumFractionDigits: 2
              })} kg</p>
            )}
            {totais.totalVolume > 0 && (
              <p><strong>Volume Total:</strong> {totais.totalVolume.toLocaleString('pt-BR', {
                maximumFractionDigits: 2
              })} m³</p>
            )}
          </div>
        </div>
      </div>

      <div className="itens-section">
        <h4>Itens da Nota Fiscal ({notaFiscal.itens.length})</h4>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Unidade</th>
                <th>Valor Unit.</th>
                <th>Valor Total</th>
                {totais.totalPeso > 0 && <th>Peso</th>}
                {totais.totalVolume > 0 && <th>Volume</th>}
              </tr>
            </thead>
            <tbody>
              {notaFiscal.itens.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.descricao}</td>
                  <td>{Number(item.quantidade).toLocaleString('pt-BR')}</td>
                  <td>{item.unidade}</td>
                  <td>R$ {Number(item.valorUnitario).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</td>
                  <td>R$ {Number(item.valorTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</td>
                  {totais.totalPeso > 0 && (
                    <td>{item.peso ? Number(item.peso).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    }) : '-'} kg</td>
                  )}
                  {totais.totalVolume > 0 && (
                    <td>{item.volume ? Number(item.volume).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    }) : '-'} m³</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="desmembramento-config">
        <h4>Configuração do Desmembramento</h4>
        
        {loadingSugestao ? (
          <p>Calculando sugestão...</p>
        ) : sugestao && (
          <div className="sugestao-box">
            <p>
              💡 <strong>Sugestão automática:</strong> {sugestao.numeroCargasSugerido} carga(s)
            </p>
            <p className="sugestao-detail">
              Baseado em histórico de desmembramentos similares
            </p>
          </div>
        )}

        <div className="form-group">
          <label>Número de Cargas *</label>
          <input
            type="number"
            min="1"
            max="20"
            value={numeroCargas}
            onChange={(e) => setNumeroCargas(e.target.value)}
            className="input-cargas"
          />
          <small>O sistema distribuirá os itens automaticamente entre as cargas</small>
        </div>

        <div className="alerta-box">
          <p>⚠️ <strong>Importante:</strong></p>
          <ul>
            <li>O desmembramento não altera valores fiscais</li>
            <li>A soma das cargas será igual à nota fiscal original</li>
            <li>Cada item será distribuído de forma equilibrada</li>
          </ul>
        </div>
      </div>

      <div className="modal-footer">
        <button onClick={onCancel} className="btn btn-secondary" disabled={desmembrando}>
          Cancelar
        </button>
        <button 
          onClick={handleDesmembrar} 
          className="btn btn-primary"
          disabled={desmembrando || numeroCargas < 1}
        >
          {desmembrando ? 'Desmembrando...' : 'Desmembrar Automaticamente'}
        </button>
      </div>
    </div>
  );
};

export default DesmembramentoDetalhes;





