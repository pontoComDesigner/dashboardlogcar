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
            placeholder="Opcional"
          />
        </div>

        <div className="pedidos-selecao">
          <h4>Selecione os Pedidos para Mover:</h4>
          <div className="pedidos-list">
            {romaneio.pedidos.map(pedido => (
              <div key={pedido.id} className="pedido-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.pedidos.includes(pedido.id)}
                    onChange={() => handlePedidoToggle(pedido.id)}
                  />
                  <span>{pedido.numeroPedido} - {pedido.clienteNome}</span>
                </label>
              </div>
            ))}
          </div>
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
