import React, { useState, useEffect } from 'react';

const PedidoForm = ({ pedido, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    numeroPedido: '',
    clienteNome: '',
    clienteCnpjCpf: '',
    clienteEndereco: '',
    clienteCidade: '',
    clienteEstado: '',
    clienteCep: '',
    valorTotal: '',
    observacoes: '',
    itens: [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
  });

  useEffect(() => {
    if (pedido) {
      setFormData({
        numeroPedido: pedido.numeroPedido || '',
        clienteNome: pedido.clienteNome || '',
        clienteCnpjCpf: pedido.clienteCnpjCpf || '',
        clienteEndereco: pedido.clienteEndereco || '',
        clienteCidade: pedido.clienteCidade || '',
        clienteEstado: pedido.clienteEstado || '',
        clienteCep: pedido.clienteCep || '',
        valorTotal: pedido.valorTotal || '',
        observacoes: pedido.observacoes || '',
        itens: pedido.itens && pedido.itens.length > 0 
          ? pedido.itens.map(item => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              unidade: item.unidade || 'UN',
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal
            }))
          : [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
      });
    }
  }, [pedido]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItens = [...formData.itens];
    newItens[index][field] = value;
    
    if (field === 'quantidade' || field === 'valorUnitario') {
      const qtd = parseFloat(newItens[index].quantidade) || 0;
      const valor = parseFloat(newItens[index].valorUnitario) || 0;
      newItens[index].valorTotal = (qtd * valor).toFixed(2);
    }
    
    setFormData(prev => ({ ...prev, itens: newItens }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.itens.length > 1) {
      setFormData(prev => ({
        ...prev,
        itens: prev.itens.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      valorTotal: parseFloat(formData.valorTotal) || formData.itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0),
      itens: formData.itens.map(item => ({
        descricao: item.descricao,
        quantidade: parseFloat(item.quantidade),
        unidade: item.unidade,
        valorUnitario: parseFloat(item.valorUnitario),
        valorTotal: parseFloat(item.valorTotal)
      }))
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Número do Pedido *</label>
          <input
            type="text"
            name="numeroPedido"
            value={formData.numeroPedido}
            onChange={handleChange}
            required
            disabled={!!pedido}
          />
        </div>
        <div className="form-group">
          <label>Valor Total</label>
          <input
            type="number"
            step="0.01"
            name="valorTotal"
            value={formData.valorTotal}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Nome do Cliente *</label>
        <input
          type="text"
          name="clienteNome"
          value={formData.clienteNome}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>CNPJ/CPF</label>
          <input
            type="text"
            name="clienteCnpjCpf"
            value={formData.clienteCnpjCpf}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>CEP</label>
          <input
            type="text"
            name="clienteCep"
            value={formData.clienteCep}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Endereço</label>
        <input
          type="text"
          name="clienteEndereco"
          value={formData.clienteEndereco}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Cidade</label>
          <input
            type="text"
            name="clienteCidade"
            value={formData.clienteCidade}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Estado</label>
          <input
            type="text"
            name="clienteEstado"
            value={formData.clienteEstado}
            onChange={handleChange}
            maxLength={2}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label>Itens *</label>
          <button type="button" onClick={addItem} className="btn btn-success btn-sm">
            Adicionar Item
          </button>
        </div>
        {formData.itens.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
            <input
              type="text"
              placeholder="Descrição"
              value={item.descricao}
              onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Quantidade"
              value={item.quantidade}
              onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
              required
            />
            <select
              value={item.unidade}
              onChange={(e) => handleItemChange(index, 'unidade', e.target.value)}
            >
              <option value="UN">UN</option>
              <option value="KG">KG</option>
              <option value="LT">LT</option>
              <option value="CX">CX</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Valor Unit."
              value={item.valorUnitario}
              onChange={(e) => handleItemChange(index, 'valorUnitario', e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Total"
              value={item.valorTotal}
              readOnly
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="btn btn-danger btn-sm"
              disabled={formData.itens.length === 1}
            >
              ×
            </button>
          </div>
        ))}
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

export default PedidoForm;












const PedidoForm = ({ pedido, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    numeroPedido: '',
    clienteNome: '',
    clienteCnpjCpf: '',
    clienteEndereco: '',
    clienteCidade: '',
    clienteEstado: '',
    clienteCep: '',
    valorTotal: '',
    observacoes: '',
    itens: [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
  });

  useEffect(() => {
    if (pedido) {
      setFormData({
        numeroPedido: pedido.numeroPedido || '',
        clienteNome: pedido.clienteNome || '',
        clienteCnpjCpf: pedido.clienteCnpjCpf || '',
        clienteEndereco: pedido.clienteEndereco || '',
        clienteCidade: pedido.clienteCidade || '',
        clienteEstado: pedido.clienteEstado || '',
        clienteCep: pedido.clienteCep || '',
        valorTotal: pedido.valorTotal || '',
        observacoes: pedido.observacoes || '',
        itens: pedido.itens && pedido.itens.length > 0 
          ? pedido.itens.map(item => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              unidade: item.unidade || 'UN',
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal
            }))
          : [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
      });
    }
  }, [pedido]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItens = [...formData.itens];
    newItens[index][field] = value;
    
    if (field === 'quantidade' || field === 'valorUnitario') {
      const qtd = parseFloat(newItens[index].quantidade) || 0;
      const valor = parseFloat(newItens[index].valorUnitario) || 0;
      newItens[index].valorTotal = (qtd * valor).toFixed(2);
    }
    
    setFormData(prev => ({ ...prev, itens: newItens }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.itens.length > 1) {
      setFormData(prev => ({
        ...prev,
        itens: prev.itens.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      valorTotal: parseFloat(formData.valorTotal) || formData.itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0),
      itens: formData.itens.map(item => ({
        descricao: item.descricao,
        quantidade: parseFloat(item.quantidade),
        unidade: item.unidade,
        valorUnitario: parseFloat(item.valorUnitario),
        valorTotal: parseFloat(item.valorTotal)
      }))
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Número do Pedido *</label>
          <input
            type="text"
            name="numeroPedido"
            value={formData.numeroPedido}
            onChange={handleChange}
            required
            disabled={!!pedido}
          />
        </div>
        <div className="form-group">
          <label>Valor Total</label>
          <input
            type="number"
            step="0.01"
            name="valorTotal"
            value={formData.valorTotal}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Nome do Cliente *</label>
        <input
          type="text"
          name="clienteNome"
          value={formData.clienteNome}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>CNPJ/CPF</label>
          <input
            type="text"
            name="clienteCnpjCpf"
            value={formData.clienteCnpjCpf}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>CEP</label>
          <input
            type="text"
            name="clienteCep"
            value={formData.clienteCep}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Endereço</label>
        <input
          type="text"
          name="clienteEndereco"
          value={formData.clienteEndereco}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Cidade</label>
          <input
            type="text"
            name="clienteCidade"
            value={formData.clienteCidade}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Estado</label>
          <input
            type="text"
            name="clienteEstado"
            value={formData.clienteEstado}
            onChange={handleChange}
            maxLength={2}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label>Itens *</label>
          <button type="button" onClick={addItem} className="btn btn-success btn-sm">
            Adicionar Item
          </button>
        </div>
        {formData.itens.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
            <input
              type="text"
              placeholder="Descrição"
              value={item.descricao}
              onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Quantidade"
              value={item.quantidade}
              onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
              required
            />
            <select
              value={item.unidade}
              onChange={(e) => handleItemChange(index, 'unidade', e.target.value)}
            >
              <option value="UN">UN</option>
              <option value="KG">KG</option>
              <option value="LT">LT</option>
              <option value="CX">CX</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Valor Unit."
              value={item.valorUnitario}
              onChange={(e) => handleItemChange(index, 'valorUnitario', e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Total"
              value={item.valorTotal}
              readOnly
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="btn btn-danger btn-sm"
              disabled={formData.itens.length === 1}
            >
              ×
            </button>
          </div>
        ))}
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

export default PedidoForm;












const PedidoForm = ({ pedido, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    numeroPedido: '',
    clienteNome: '',
    clienteCnpjCpf: '',
    clienteEndereco: '',
    clienteCidade: '',
    clienteEstado: '',
    clienteCep: '',
    valorTotal: '',
    observacoes: '',
    itens: [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
  });

  useEffect(() => {
    if (pedido) {
      setFormData({
        numeroPedido: pedido.numeroPedido || '',
        clienteNome: pedido.clienteNome || '',
        clienteCnpjCpf: pedido.clienteCnpjCpf || '',
        clienteEndereco: pedido.clienteEndereco || '',
        clienteCidade: pedido.clienteCidade || '',
        clienteEstado: pedido.clienteEstado || '',
        clienteCep: pedido.clienteCep || '',
        valorTotal: pedido.valorTotal || '',
        observacoes: pedido.observacoes || '',
        itens: pedido.itens && pedido.itens.length > 0 
          ? pedido.itens.map(item => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              unidade: item.unidade || 'UN',
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal
            }))
          : [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
      });
    }
  }, [pedido]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItens = [...formData.itens];
    newItens[index][field] = value;
    
    if (field === 'quantidade' || field === 'valorUnitario') {
      const qtd = parseFloat(newItens[index].quantidade) || 0;
      const valor = parseFloat(newItens[index].valorUnitario) || 0;
      newItens[index].valorTotal = (qtd * valor).toFixed(2);
    }
    
    setFormData(prev => ({ ...prev, itens: newItens }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.itens.length > 1) {
      setFormData(prev => ({
        ...prev,
        itens: prev.itens.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      valorTotal: parseFloat(formData.valorTotal) || formData.itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0),
      itens: formData.itens.map(item => ({
        descricao: item.descricao,
        quantidade: parseFloat(item.quantidade),
        unidade: item.unidade,
        valorUnitario: parseFloat(item.valorUnitario),
        valorTotal: parseFloat(item.valorTotal)
      }))
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Número do Pedido *</label>
          <input
            type="text"
            name="numeroPedido"
            value={formData.numeroPedido}
            onChange={handleChange}
            required
            disabled={!!pedido}
          />
        </div>
        <div className="form-group">
          <label>Valor Total</label>
          <input
            type="number"
            step="0.01"
            name="valorTotal"
            value={formData.valorTotal}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Nome do Cliente *</label>
        <input
          type="text"
          name="clienteNome"
          value={formData.clienteNome}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>CNPJ/CPF</label>
          <input
            type="text"
            name="clienteCnpjCpf"
            value={formData.clienteCnpjCpf}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>CEP</label>
          <input
            type="text"
            name="clienteCep"
            value={formData.clienteCep}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Endereço</label>
        <input
          type="text"
          name="clienteEndereco"
          value={formData.clienteEndereco}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Cidade</label>
          <input
            type="text"
            name="clienteCidade"
            value={formData.clienteCidade}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Estado</label>
          <input
            type="text"
            name="clienteEstado"
            value={formData.clienteEstado}
            onChange={handleChange}
            maxLength={2}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label>Itens *</label>
          <button type="button" onClick={addItem} className="btn btn-success btn-sm">
            Adicionar Item
          </button>
        </div>
        {formData.itens.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
            <input
              type="text"
              placeholder="Descrição"
              value={item.descricao}
              onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Quantidade"
              value={item.quantidade}
              onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
              required
            />
            <select
              value={item.unidade}
              onChange={(e) => handleItemChange(index, 'unidade', e.target.value)}
            >
              <option value="UN">UN</option>
              <option value="KG">KG</option>
              <option value="LT">LT</option>
              <option value="CX">CX</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Valor Unit."
              value={item.valorUnitario}
              onChange={(e) => handleItemChange(index, 'valorUnitario', e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Total"
              value={item.valorTotal}
              readOnly
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="btn btn-danger btn-sm"
              disabled={formData.itens.length === 1}
            >
              ×
            </button>
          </div>
        ))}
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

export default PedidoForm;












