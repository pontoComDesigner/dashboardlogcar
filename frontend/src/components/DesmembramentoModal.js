import React, { useState } from 'react';
import Modal from './Modal';

const DesmembramentoModal = ({ romaneio, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    novoNumeroRomaneio: '',
    motivo: '',
    pedidos: []
  });

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
    if (formData.pedidos.length === 0) {
      alert('Selecione pelo menos um pedido para desmembrar');
      return;
    }
    onSave(formData);
  };

  return (
    <Modal title={`Desmembrar Romaneio ${romaneio.numeroRomaneio}`} onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Número do Novo Romaneio *</label>
          <input
            type="text"
            name="novoNumeroRomaneio"
            value={formData.novoNumeroRomaneio}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Motivo do Desmembramento</label>
          <textarea
            name="motivo"
            value={formData.motivo}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Pedidos para Desmembrar *</label>
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
            {romaneio.pedidos && romaneio.pedidos.length > 0 ? (
              romaneio.pedidos.map(pedido => (
                <label
                  key={pedido.pedidoId}
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
                    checked={formData.pedidos.includes(pedido.pedidoId)}
                    onChange={() => handlePedidoToggle(pedido.pedidoId)}
                    style={{ marginRight: '10px' }}
                  />
                  <div>
                    <strong>{pedido.numeroPedido}</strong> - {pedido.clienteNome}
                    <br />
                    <small style={{ color: '#666' }}>
                      R$ {Number(pedido.valorTotal || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </small>
                  </div>
                </label>
              ))
            ) : (
              <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Nenhum pedido no romaneio</p>
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
          <button type="submit" className="btn btn-success">
            Desmembrar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DesmembramentoModal;










