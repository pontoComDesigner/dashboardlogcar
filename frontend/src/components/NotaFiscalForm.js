import React, { useState, useEffect } from 'react';
import api from '../services/api';

const NotaFiscalForm = ({ notaFiscal, onSave, onCancel }) => {
  const [pedidos, setPedidos] = useState([]);
  const [formData, setFormData] = useState({
    numeroNota: '',
    serie: '1',
    pedidoId: '',
    clienteNome: '',
    clienteCnpjCpf: '',
    clienteEndereco: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: '',
    valorTotal: '',
    chaveAcesso: '',
    observacoes: '',
    itens: [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
  });

  useEffect(() => {
    loadPedidos();
    if (notaFiscal) {
      setFormData({
        numeroNota: notaFiscal.numeroNota || '',
        serie: notaFiscal.serie || '1',
        pedidoId: notaFiscal.pedidoId || '',
        clienteNome: notaFiscal.clienteNome || '',
        clienteCnpjCpf: notaFiscal.clienteCnpjCpf || '',
        clienteEndereco: notaFiscal.clienteEndereco || '',
        dataEmissao: notaFiscal.dataEmissao ? notaFiscal.dataEmissao.split('T')[0] : new Date().toISOString().split('T')[0],
        dataVencimento: notaFiscal.dataVencimento ? notaFiscal.dataVencimento.split('T')[0] : '',
        valorTotal: notaFiscal.valorTotal || '',
        chaveAcesso: notaFiscal.chaveAcesso || '',
        observacoes: notaFiscal.observacoes || '',
        itens: notaFiscal.itens && notaFiscal.itens.length > 0
          ? notaFiscal.itens.map(item => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              unidade: item.unidade || 'UN',
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal,
              ncm: item.ncm || '',
              cfop: item.cfop || ''
            }))
          : [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
      });
    }
  }, [notaFiscal]);

  const loadPedidos = async () => {
    try {
      const response = await api.get('/pedidos');
      setPedidos(response.data.pedidos);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePedidoChange = async (e) => {
    const pedidoId = e.target.value;
    setFormData(prev => ({ ...prev, pedidoId }));
    
    if (pedidoId) {
      try {
        const response = await api.get(`/pedidos/${pedidoId}`);
        const pedido = response.data.pedido;
        setFormData(prev => ({
          ...prev,
          clienteNome: pedido.clienteNome,
          clienteCnpjCpf: pedido.clienteCnpjCpf || '',
          clienteEndereco: pedido.clienteEndereco || '',
          itens: pedido.itens.map(item => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal,
            ncm: '',
            cfop: ''
          }))
        }));
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
      }
    }
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
      itens: [...prev.itens, { descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
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
      pedidoId: formData.pedidoId || null,
      valorTotal: parseFloat(formData.valorTotal) || formData.itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0),
      itens: formData.itens.map(item => ({
        descricao: item.descricao,
        quantidade: parseFloat(item.quantidade),
        unidade: item.unidade,
        valorUnitario: parseFloat(item.valorUnitario),
        valorTotal: parseFloat(item.valorTotal),
        ncm: item.ncm || null,
        cfop: item.cfop || null
      }))
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Número da Nota *</label>
          <input
            type="text"
            name="numeroNota"
            value={formData.numeroNota}
            onChange={handleChange}
            required
            disabled={!!notaFiscal}
          />
        </div>
        <div className="form-group">
          <label>Série</label>
          <input
            type="text"
            name="serie"
            value={formData.serie}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Pedido (Opcional)</label>
        <select
          name="pedidoId"
          value={formData.pedidoId}
          onChange={handlePedidoChange}
        >
          <option value="">Selecione um pedido</option>
          {pedidos.map(pedido => (
            <option key={pedido.id} value={pedido.id}>
              {pedido.numeroPedido} - {pedido.clienteNome}
            </option>
          ))}
        </select>
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
          <label>CNPJ/CPF *</label>
          <input
            type="text"
            name="clienteCnpjCpf"
            value={formData.clienteCnpjCpf}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Data de Emissão *</label>
          <input
            type="date"
            name="dataEmissao"
            value={formData.dataEmissao}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Data de Vencimento</label>
          <input
            type="date"
            name="dataVencimento"
            value={formData.dataVencimento}
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
          <label>Chave de Acesso</label>
          <input
            type="text"
            name="chaveAcesso"
            value={formData.chaveAcesso}
            onChange={handleChange}
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
          <div key={index} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
              <input
                type="text"
                placeholder="NCM"
                value={item.ncm}
                onChange={(e) => handleItemChange(index, 'ncm', e.target.value)}
              />
              <input
                type="text"
                placeholder="CFOP"
                value={item.cfop}
                onChange={(e) => handleItemChange(index, 'cfop', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="btn btn-danger btn-sm"
                disabled={formData.itens.length === 1}
              >
                Remover
              </button>
            </div>
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

export default NotaFiscalForm;











import api from '../services/api';

const NotaFiscalForm = ({ notaFiscal, onSave, onCancel }) => {
  const [pedidos, setPedidos] = useState([]);
  const [formData, setFormData] = useState({
    numeroNota: '',
    serie: '1',
    pedidoId: '',
    clienteNome: '',
    clienteCnpjCpf: '',
    clienteEndereco: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: '',
    valorTotal: '',
    chaveAcesso: '',
    observacoes: '',
    itens: [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
  });

  useEffect(() => {
    loadPedidos();
    if (notaFiscal) {
      setFormData({
        numeroNota: notaFiscal.numeroNota || '',
        serie: notaFiscal.serie || '1',
        pedidoId: notaFiscal.pedidoId || '',
        clienteNome: notaFiscal.clienteNome || '',
        clienteCnpjCpf: notaFiscal.clienteCnpjCpf || '',
        clienteEndereco: notaFiscal.clienteEndereco || '',
        dataEmissao: notaFiscal.dataEmissao ? notaFiscal.dataEmissao.split('T')[0] : new Date().toISOString().split('T')[0],
        dataVencimento: notaFiscal.dataVencimento ? notaFiscal.dataVencimento.split('T')[0] : '',
        valorTotal: notaFiscal.valorTotal || '',
        chaveAcesso: notaFiscal.chaveAcesso || '',
        observacoes: notaFiscal.observacoes || '',
        itens: notaFiscal.itens && notaFiscal.itens.length > 0
          ? notaFiscal.itens.map(item => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              unidade: item.unidade || 'UN',
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal,
              ncm: item.ncm || '',
              cfop: item.cfop || ''
            }))
          : [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
      });
    }
  }, [notaFiscal]);

  const loadPedidos = async () => {
    try {
      const response = await api.get('/pedidos');
      setPedidos(response.data.pedidos);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePedidoChange = async (e) => {
    const pedidoId = e.target.value;
    setFormData(prev => ({ ...prev, pedidoId }));
    
    if (pedidoId) {
      try {
        const response = await api.get(`/pedidos/${pedidoId}`);
        const pedido = response.data.pedido;
        setFormData(prev => ({
          ...prev,
          clienteNome: pedido.clienteNome,
          clienteCnpjCpf: pedido.clienteCnpjCpf || '',
          clienteEndereco: pedido.clienteEndereco || '',
          itens: pedido.itens.map(item => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal,
            ncm: '',
            cfop: ''
          }))
        }));
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
      }
    }
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
      itens: [...prev.itens, { descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
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
      pedidoId: formData.pedidoId || null,
      valorTotal: parseFloat(formData.valorTotal) || formData.itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0),
      itens: formData.itens.map(item => ({
        descricao: item.descricao,
        quantidade: parseFloat(item.quantidade),
        unidade: item.unidade,
        valorUnitario: parseFloat(item.valorUnitario),
        valorTotal: parseFloat(item.valorTotal),
        ncm: item.ncm || null,
        cfop: item.cfop || null
      }))
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Número da Nota *</label>
          <input
            type="text"
            name="numeroNota"
            value={formData.numeroNota}
            onChange={handleChange}
            required
            disabled={!!notaFiscal}
          />
        </div>
        <div className="form-group">
          <label>Série</label>
          <input
            type="text"
            name="serie"
            value={formData.serie}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Pedido (Opcional)</label>
        <select
          name="pedidoId"
          value={formData.pedidoId}
          onChange={handlePedidoChange}
        >
          <option value="">Selecione um pedido</option>
          {pedidos.map(pedido => (
            <option key={pedido.id} value={pedido.id}>
              {pedido.numeroPedido} - {pedido.clienteNome}
            </option>
          ))}
        </select>
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
          <label>CNPJ/CPF *</label>
          <input
            type="text"
            name="clienteCnpjCpf"
            value={formData.clienteCnpjCpf}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Data de Emissão *</label>
          <input
            type="date"
            name="dataEmissao"
            value={formData.dataEmissao}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Data de Vencimento</label>
          <input
            type="date"
            name="dataVencimento"
            value={formData.dataVencimento}
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
          <label>Chave de Acesso</label>
          <input
            type="text"
            name="chaveAcesso"
            value={formData.chaveAcesso}
            onChange={handleChange}
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
          <div key={index} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
              <input
                type="text"
                placeholder="NCM"
                value={item.ncm}
                onChange={(e) => handleItemChange(index, 'ncm', e.target.value)}
              />
              <input
                type="text"
                placeholder="CFOP"
                value={item.cfop}
                onChange={(e) => handleItemChange(index, 'cfop', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="btn btn-danger btn-sm"
                disabled={formData.itens.length === 1}
              >
                Remover
              </button>
            </div>
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

export default NotaFiscalForm;











import api from '../services/api';

const NotaFiscalForm = ({ notaFiscal, onSave, onCancel }) => {
  const [pedidos, setPedidos] = useState([]);
  const [formData, setFormData] = useState({
    numeroNota: '',
    serie: '1',
    pedidoId: '',
    clienteNome: '',
    clienteCnpjCpf: '',
    clienteEndereco: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: '',
    valorTotal: '',
    chaveAcesso: '',
    observacoes: '',
    itens: [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
  });

  useEffect(() => {
    loadPedidos();
    if (notaFiscal) {
      setFormData({
        numeroNota: notaFiscal.numeroNota || '',
        serie: notaFiscal.serie || '1',
        pedidoId: notaFiscal.pedidoId || '',
        clienteNome: notaFiscal.clienteNome || '',
        clienteCnpjCpf: notaFiscal.clienteCnpjCpf || '',
        clienteEndereco: notaFiscal.clienteEndereco || '',
        dataEmissao: notaFiscal.dataEmissao ? notaFiscal.dataEmissao.split('T')[0] : new Date().toISOString().split('T')[0],
        dataVencimento: notaFiscal.dataVencimento ? notaFiscal.dataVencimento.split('T')[0] : '',
        valorTotal: notaFiscal.valorTotal || '',
        chaveAcesso: notaFiscal.chaveAcesso || '',
        observacoes: notaFiscal.observacoes || '',
        itens: notaFiscal.itens && notaFiscal.itens.length > 0
          ? notaFiscal.itens.map(item => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              unidade: item.unidade || 'UN',
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal,
              ncm: item.ncm || '',
              cfop: item.cfop || ''
            }))
          : [{ descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
      });
    }
  }, [notaFiscal]);

  const loadPedidos = async () => {
    try {
      const response = await api.get('/pedidos');
      setPedidos(response.data.pedidos);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePedidoChange = async (e) => {
    const pedidoId = e.target.value;
    setFormData(prev => ({ ...prev, pedidoId }));
    
    if (pedidoId) {
      try {
        const response = await api.get(`/pedidos/${pedidoId}`);
        const pedido = response.data.pedido;
        setFormData(prev => ({
          ...prev,
          clienteNome: pedido.clienteNome,
          clienteCnpjCpf: pedido.clienteCnpjCpf || '',
          clienteEndereco: pedido.clienteEndereco || '',
          itens: pedido.itens.map(item => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal,
            ncm: '',
            cfop: ''
          }))
        }));
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
      }
    }
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
      itens: [...prev.itens, { descricao: '', quantidade: '', unidade: 'UN', valorUnitario: '', valorTotal: '', ncm: '', cfop: '' }]
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
      pedidoId: formData.pedidoId || null,
      valorTotal: parseFloat(formData.valorTotal) || formData.itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0),
      itens: formData.itens.map(item => ({
        descricao: item.descricao,
        quantidade: parseFloat(item.quantidade),
        unidade: item.unidade,
        valorUnitario: parseFloat(item.valorUnitario),
        valorTotal: parseFloat(item.valorTotal),
        ncm: item.ncm || null,
        cfop: item.cfop || null
      }))
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Número da Nota *</label>
          <input
            type="text"
            name="numeroNota"
            value={formData.numeroNota}
            onChange={handleChange}
            required
            disabled={!!notaFiscal}
          />
        </div>
        <div className="form-group">
          <label>Série</label>
          <input
            type="text"
            name="serie"
            value={formData.serie}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Pedido (Opcional)</label>
        <select
          name="pedidoId"
          value={formData.pedidoId}
          onChange={handlePedidoChange}
        >
          <option value="">Selecione um pedido</option>
          {pedidos.map(pedido => (
            <option key={pedido.id} value={pedido.id}>
              {pedido.numeroPedido} - {pedido.clienteNome}
            </option>
          ))}
        </select>
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
          <label>CNPJ/CPF *</label>
          <input
            type="text"
            name="clienteCnpjCpf"
            value={formData.clienteCnpjCpf}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Data de Emissão *</label>
          <input
            type="date"
            name="dataEmissao"
            value={formData.dataEmissao}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Data de Vencimento</label>
          <input
            type="date"
            name="dataVencimento"
            value={formData.dataVencimento}
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
          <label>Chave de Acesso</label>
          <input
            type="text"
            name="chaveAcesso"
            value={formData.chaveAcesso}
            onChange={handleChange}
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
          <div key={index} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
              <input
                type="text"
                placeholder="NCM"
                value={item.ncm}
                onChange={(e) => handleItemChange(index, 'ncm', e.target.value)}
              />
              <input
                type="text"
                placeholder="CFOP"
                value={item.cfop}
                onChange={(e) => handleItemChange(index, 'cfop', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="btn btn-danger btn-sm"
                disabled={formData.itens.length === 1}
              >
                Remover
              </button>
            </div>
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

export default NotaFiscalForm;












