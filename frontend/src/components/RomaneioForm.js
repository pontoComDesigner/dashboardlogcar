import React, { useState, useEffect } from 'react';
import api from '../services/api';

const RomaneioForm = ({ romaneio, onSave, onCancel }) => {
  const [pedidos, setPedidos] = useState([]);
  const [formData, setFormData] = useState({
    numeroRomaneio: '',
    transportadora: '',
    veiculo: '',
    motorista: '',
    dataSaida: '',
    dataPrevisaoEntrega: '',
    observacoes: '',
    pedidos: []
  });

  useEffect(() => {
    loadPedidos();
    if (romaneio) {
      setFormData({
        numeroRomaneio: romaneio.numeroRomaneio || '',
        transportadora: romaneio.transportadora || '',
        veiculo: romaneio.veiculo || '',
        motorista: romaneio.motorista || '',
        dataSaida: romaneio.dataSaida ? romaneio.dataSaida.split('T')[0] : '',
        dataPrevisaoEntrega: romaneio.dataPrevisaoEntrega ? romaneio.dataPrevisaoEntrega.split('T')[0] : '',
        observacoes: romaneio.observacoes || '',
        pedidos: romaneio.pedidos ? romaneio.pedidos.map(p => p.pedidoId) : []
      });
    }
  }, [romaneio]);

  const loadPedidos = async () => {
    try {
      const response = await api.get('/pedidos?status=PENDENTE');
      setPedidos(response.data.pedidos);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePedidoToggle = (pedidoId) => {
    setFormData(prev => ({
      ...prev,
      pedidos: prev.pedidos.includes(pedidoId)
        ? prev.pedidos.filter(id => id !== pedidoId)
        : [...prev.pedidos, pedidoId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      pedidos: formData.pedidos
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Número do Romaneio *</label>
        <input
          type="text"
          name="numeroRomaneio"
          value={formData.numeroRomaneio}
          onChange={handleChange}
          required
          disabled={!!romaneio}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Transportadora</label>
          <input
            type="text"
            name="transportadora"
            value={formData.transportadora}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Veículo</label>
          <input
            type="text"
            name="veiculo"
            value={formData.veiculo}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Motorista</label>
          <input
            type="text"
            name="motorista"
            value={formData.motorista}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Data de Saída</label>
          <input
            type="date"
            name="dataSaida"
            value={formData.dataSaida}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Previsão de Entrega</label>
          <input
            type="date"
            name="dataPrevisaoEntrega"
            value={formData.dataPrevisaoEntrega}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Observações</label>
        <textarea
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Pedidos</label>
        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
          {pedidos.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Nenhum pedido disponível</p>
          ) : (
            pedidos.map(pedido => (
              <label
                key={pedido.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.pedidos.includes(pedido.id)}
                  onChange={() => handlePedidoToggle(pedido.id)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <strong>{pedido.numeroPedido}</strong> - {pedido.clienteNome}
                  <br />
                  <small style={{ color: '#666' }}>
                    R$ {Number(pedido.valorTotal || pedido.valorTotalCalculado || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </small>
                </div>
              </label>
            ))
          )}
        </div>
        <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
          {formData.pedidos.length} pedido(s) selecionado(s)
        </small>
      </div>

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

export default RomaneioForm;

