import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './DesmembramentoNovo.css';

const DesmembramentoNovo = ({ notaFiscalId, onClose, onComplete }) => {
  const [notaFiscal, setNotaFiscal] = useState(null);
  const [cargas, setCargas] = useState([]);
  const [modo, setModo] = useState('preview'); // 'preview', 'manual', 'auto'
  const [numeroCargas, setNumeroCargas] = useState(1);
  const [sugestao, setSugestao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alert, setAlert] = useState(null);
  const [itemEditando, setItemEditando] = useState(null);
  const [quantidadeEditando, setQuantidadeEditando] = useState('');
  const [itensDisponiveis, setItensDisponiveis] = useState([]);

  useEffect(() => {
    loadNotaFiscal();
  }, [notaFiscalId]);

  const loadNotaFiscal = async () => {
    try {
      const response = await api.get(`/desmembramento/nota/${notaFiscalId}`);
      const nota = response.data.notaFiscal;
      setNotaFiscal(nota);
      
      // Inicializar itens disponíveis com todos os itens da NF
      if (nota.itens) {
        setItensDisponiveis(nota.itens.map(item => ({ ...item, idItem: item.id })));
      }
      
      if (nota.cargas && nota.cargas.length > 0) {
        // Já foi desmembrada - carregar cargas existentes
        loadCargas(notaFiscalId);
      } else {
        // Carregar sugestão
        loadSugestao();
      }
    } catch (error) {
      showAlert('Erro ao carregar nota fiscal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCargas = async (id) => {
    try {
      const response = await api.get(`/desmembramento/cargas/${id}`);
      setCargas(response.data.cargas || []);
    } catch (error) {
      console.error('Erro ao carregar cargas:', error);
    }
  };

  const loadSugestao = async () => {
    try {
      const response = await api.get(`/desmembramento/sugerir/${notaFiscalId}`);
      setSugestao(response.data);
      setNumeroCargas(response.data.numeroCargasSugerido);
    } catch (error) {
      console.error('Erro ao carregar sugestão:', error);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const gerarPreviewAutomatico = async () => {
    if (!notaFiscal || !notaFiscal.itens) return;

    try {
      setLoading(true);
      
      // Chamar endpoint do backend para gerar preview usando lógica correta
      const response = await api.post('/desmembramento/preview-automatico', {
        notaFiscalId: notaFiscal.id,
        numeroCargas: numeroCargas || null // null para calcular automaticamente
      });
      
      if (response.data.success) {
        setCargas(response.data.cargas);
        setNumeroCargas(response.data.numeroCargas);
        setModo('auto');
        showAlert('Preview gerado com sucesso!', 'success');
      } else {
        showAlert('Erro ao gerar preview', 'error');
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      showAlert(error.response?.data?.message || 'Erro ao gerar preview automático', 'error');
    } finally {
      setLoading(false);
    }
  };

  const iniciarModoManual = () => {
    // Criar cargas vazias
    const numeroCargasFinal = parseInt(numeroCargas) || 1;
    const cargasVazias = Array.from({ length: numeroCargasFinal }, (_, i) => ({
      id: `manual-${Date.now()}-${i}`,
      numeroCarga: `${notaFiscal.numeroNota}-C${String(i + 1).padStart(2, '0')}`,
      itens: [],
      pesoTotal: 0,
      volumeTotal: 0,
      valorTotal: 0
    }));

    // Colocar todos os itens na primeira carga para que possam ser arrastados
    if (notaFiscal.itens && notaFiscal.itens.length > 0) {
      const itensComId = notaFiscal.itens.map((item, index) => ({ 
        ...item, 
        idItem: item.id,
        itemUniqueId: `${item.id}-carga0-${index}` // ID único para renderização
      }));
      const pesoTotal = itensComId.reduce((sum, item) => sum + (item.peso || 0), 0);
      const volumeTotal = itensComId.reduce((sum, item) => sum + (item.volume || 0), 0);
      const valorTotal = itensComId.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
      
      cargasVazias[0].itens = itensComId;
      cargasVazias[0].pesoTotal = pesoTotal;
      cargasVazias[0].volumeTotal = volumeTotal;
      cargasVazias[0].valorTotal = valorTotal;
    }

    // Reinicializar itens disponíveis
    setItensDisponiveis(notaFiscal.itens.map(item => ({ ...item, idItem: item.id })));

    setCargas(cargasVazias);
    setModo('manual');
  };

  const handleDragStart = (e, item, cargaOrigemId) => {
    // Se estiver editando quantidade, não permitir drag
    if (itemEditando) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.setData('application/json', JSON.stringify({ item, cargaOrigemId }));
    e.dataTransfer.effectAllowed = 'move';
    
    // Adicionar classe visual durante o drag
    e.currentTarget.classList.add('dragging');
  };

  // Função auxiliar para calcular quantidade máxima disponível para um item
  const calcularQuantidadeMaximaDisponivel = (idItem, itemUniqueIdExcluir, cargaIdExcluir, quantidadeAtualExcluir) => {
    const itemOriginal = notaFiscal?.itens?.find(it => it.id === idItem);
    if (!itemOriginal) return 0;

    // Somar TODAS as instâncias do mesmo idItem em TODAS as cargas, EXCETO o item específico sendo editado
    const quantidadeDistribuida = cargas.reduce((sum, carga) => {
      const itensDoItem = carga.itens.filter(i => {
        // Incluir apenas itens do mesmo idItem
        if (i.idItem !== idItem) return false;
        
        // Excluir o item específico sendo editado
        const isItemExcluir = (itemUniqueIdExcluir && i.itemUniqueId === itemUniqueIdExcluir) ||
          (!itemUniqueIdExcluir && carga.id === cargaIdExcluir && 
           quantidadeAtualExcluir !== null && Math.abs(i.quantidade - quantidadeAtualExcluir) < 0.01);
        
        return !isItemExcluir; // Incluir apenas se NÃO for o item sendo excluído
      });
      
      return sum + itensDoItem.reduce((s, item) => s + Number(item.quantidade || 0), 0);
    }, 0);

    // Quantidade disponível = total da NF - quantidade já distribuída (excluindo o item sendo editado)
    return itemOriginal.quantidade - quantidadeDistribuida;
  };

  const handleDoubleClick = (item, cargaId) => {
    // Permitir edição em ambos os modos (manual e automático)
    if (modo !== 'manual' && modo !== 'auto') return;
    
    // Garantir que itemUniqueId seja preservado
    setItemEditando({ 
      ...item, 
      cargaId,
      itemUniqueId: item.itemUniqueId || `${item.idItem}-${cargaId}-${Date.now()}`
    });
    setQuantidadeEditando(item.quantidade.toString());
  };

  const handleSalvarQuantidade = () => {
    if (!itemEditando) return;
    
    const novaQuantidade = parseFloat(quantidadeEditando);
    if (isNaN(novaQuantidade) || novaQuantidade <= 0) {
      showAlert('Quantidade inválida. Deve ser maior que zero.', 'error');
      return;
    }

    // Buscar item original da NF para validar quantidade máxima
    const itemOriginal = notaFiscal.itens.find(it => it.id === itemEditando.idItem);
    if (!itemOriginal) {
      showAlert('Item não encontrado na nota fiscal', 'error');
      return;
    }

    // Calcular quantidade disponível usando função auxiliar
    const quantidadeDisponivel = calcularQuantidadeMaximaDisponivel(
      itemEditando.idItem,
      itemEditando.itemUniqueId,
      itemEditando.cargaId,
      itemEditando.quantidade
    );
    
    // Validar que a nova quantidade não excede o disponível
    if (novaQuantidade > quantidadeDisponivel) {
      const quantidadeJáDistribuida = itemOriginal.quantidade - quantidadeDisponivel;
      showAlert(
        `Quantidade inválida! Máximo disponível: ${quantidadeDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${itemOriginal.unidade}. Total na NF: ${itemOriginal.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${itemOriginal.unidade}. Já distribuído: ${quantidadeJáDistribuida.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${itemOriginal.unidade}.`,
        'error'
      );
      // Ajustar o valor do input para o máximo disponível
      setQuantidadeEditando(quantidadeDisponivel.toString());
      return;
    }

    const quantidadeAtual = itemEditando.quantidade;
    const diferenca = quantidadeAtual - novaQuantidade;

    // Calcular valores baseados no item original
    const proporcaoNova = novaQuantidade / itemOriginal.quantidade;
    const novoValorTotal = itemOriginal.valorUnitario * novaQuantidade;
    const novoPeso = itemOriginal.peso ? itemOriginal.peso * proporcaoNova : null;
    const novoVolume = itemOriginal.volume ? itemOriginal.volume * proporcaoNova : null;

    // Atualizar item na carga e criar item restante se necessário
    let novasCargas = cargas.map(carga => {
      if (carga.id === itemEditando.cargaId) {
        const itensAtualizados = [];
        
        // Atualizar o item editado
        let itemAtualizadoEncontrado = false;
        carga.itens.forEach(i => {
          // Encontrar o item sendo editado usando itemUniqueId ou comparação por idItem + quantidade
          const isItemEditado = (itemEditando.itemUniqueId && i.itemUniqueId === itemEditando.itemUniqueId) ||
            (!itemEditando.itemUniqueId && i.idItem === itemEditando.idItem && 
             Math.abs(i.quantidade - itemEditando.quantidade) < 0.01);
          
          if (isItemEditado && !itemAtualizadoEncontrado) {
            itemAtualizadoEncontrado = true;
            // Atualizar o item com a nova quantidade
            const itemAtualizado = {
              ...i,
              quantidade: novaQuantidade,
              valorTotal: novoValorTotal,
              peso: novoPeso,
              volume: novoVolume,
              itemUniqueId: i.itemUniqueId || `${i.idItem}-${carga.id}-${Date.now()}-${Math.random()}`
            };
            itensAtualizados.push(itemAtualizado);
            
            // Se reduziu a quantidade, criar item restante na mesma carga
            if (diferenca > 0.001) { // Tolerância para evitar problemas de ponto flutuante
              const proporcaoRestante = diferenca / itemOriginal.quantidade;
              const valorTotalRestante = itemOriginal.valorUnitario * diferenca;
              const pesoRestante = itemOriginal.peso ? itemOriginal.peso * proporcaoRestante : null;
              const volumeRestante = itemOriginal.volume ? itemOriginal.volume * proporcaoRestante : null;
              
              const itemRestante = {
                ...itemOriginal,
                idItem: itemOriginal.id,
                quantidade: diferenca,
                valorTotal: parseFloat(valorTotalRestante.toFixed(2)),
                peso: pesoRestante ? parseFloat(pesoRestante.toFixed(2)) : null,
                volume: volumeRestante ? parseFloat(volumeRestante.toFixed(3)) : null,
                valorUnitario: itemOriginal.valorUnitario,
                unidade: itemOriginal.unidade,
                descricao: itemOriginal.descricao,
                itemUniqueId: `${itemOriginal.id}-restante-${carga.id}-${Date.now()}-${Math.random()}`
              };
              
              // Adicionar item restante na mesma carga (logo após o item atualizado)
              itensAtualizados.push(itemRestante);
            }
          } else {
            // Manter outros itens
            itensAtualizados.push(i);
          }
        });

        // Recalcular totais da carga
        const novoPesoTotal = itensAtualizados.reduce((sum, i) => sum + (i.peso || 0), 0);
        const novoVolumeTotal = itensAtualizados.reduce((sum, i) => sum + (i.volume || 0), 0);
        const novoValorTotalCarga = itensAtualizados.reduce((sum, i) => sum + (i.valorTotal || 0), 0);

        return {
          ...carga,
          itens: itensAtualizados,
          pesoTotal: parseFloat(novoPesoTotal.toFixed(2)),
          volumeTotal: parseFloat(novoVolumeTotal.toFixed(3)),
          valorTotal: parseFloat(novoValorTotalCarga.toFixed(2))
        };
      }
      return carga;
    });

    setCargas(novasCargas);
    setItemEditando(null);
    setQuantidadeEditando('');
  };

  const handleCancelarEdicao = () => {
    setItemEditando(null);
    setQuantidadeEditando('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };
  
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };
  
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDrop = (e, cargaDestinoId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { item, cargaOrigemId } = data;

      if (cargaOrigemId === cargaDestinoId) return;

      // Remover item da carga origem (usar índice único para evitar remover item errado)
      const novasCargas = cargas.map(carga => {
        if (carga.id === cargaOrigemId) {
          // Encontrar o índice exato do item para remover
          const itemIndex = carga.itens.findIndex(i => 
            i.idItem === item.idItem && 
            Math.abs(i.quantidade - item.quantidade) < 0.01 &&
            Math.abs(i.valorTotal - item.valorTotal) < 0.01
          );
          
          if (itemIndex >= 0) {
            const novosItens = [...carga.itens];
            novosItens.splice(itemIndex, 1);
            
            return {
              ...carga,
              itens: novosItens,
              pesoTotal: carga.pesoTotal - (item.peso || 0),
              volumeTotal: carga.volumeTotal - (item.volume || 0),
              valorTotal: carga.valorTotal - (item.valorTotal || 0)
            };
          }
          return carga;
        }
        if (carga.id === cargaDestinoId) {
          // Adicionar item à carga destino com ID único
          const novoItem = { 
            ...item, 
            itemUniqueId: `${item.idItem}-${cargaDestinoId}-${Date.now()}-${Math.random()}`
          };
          return {
            ...carga,
            itens: [...carga.itens, novoItem],
            pesoTotal: carga.pesoTotal + (item.peso || 0),
            volumeTotal: carga.volumeTotal + (item.volume || 0),
            valorTotal: carga.valorTotal + (item.valorTotal || 0)
          };
        }
        return carga;
      });

      setCargas(novasCargas);
    } catch (error) {
      console.error('Erro ao processar drop:', error);
    }
  };

  const adicionarCarga = () => {
    const novaCarga = {
      id: `manual-${Date.now()}`,
      numeroCarga: `${notaFiscal.numeroNota}-C${String(cargas.length + 1).padStart(2, '0')}`,
      itens: [],
      pesoTotal: 0,
      volumeTotal: 0,
      valorTotal: 0
    };
    setCargas([...cargas, novaCarga]);
  };

  const removerCarga = (cargaId) => {
    // Contar cargas com itens
    const cargasComItens = cargas.filter(c => c.itens && c.itens.length > 0);
    
    const carga = cargas.find(c => c.id === cargaId);
    
    // Se a carga tem itens, não permitir remover (precisa remover itens primeiro)
    if (carga.itens && carga.itens.length > 0) {
      showAlert('Remova todos os itens antes de remover a carga', 'error');
      return;
    }
    
    // Permitir remover cargas vazias livremente
    // Mas garantir que sempre haja pelo menos uma carga (mesmo que vazia) para poder adicionar itens
    if (cargas.length <= 1) {
      // Se é a última carga, apenas limpar os itens ao invés de remover
      setCargas([{
        ...cargas[0],
        itens: [],
        pesoTotal: 0,
        volumeTotal: 0,
        valorTotal: 0
      }]);
      return;
    }

    setCargas(cargas.filter(c => c.id !== cargaId));
  };

  const validarDesmembramento = () => {
    // Filtrar apenas cargas com itens
    const cargasComItens = cargas.filter(c => c.itens && c.itens.length > 0);
    
    // Verificar se há pelo menos uma carga with itens
    if (cargasComItens.length === 0) {
      return { valido: false, mensagem: 'É necessário adicionar itens em pelo menos uma carga' };
    }

    // Verificar se as quantidades de cada item correspondem (apenas nas cargas com itens)
    for (const itemNF of notaFiscal.itens) {
      const quantidadeTotal = cargasComItens.reduce((sum, carga) => {
        if (!carga.itens) return sum;
        const itensDoItem = carga.itens.filter(i => i.idItem === itemNF.id);
        const somaItens = itensDoItem.reduce((s, item) => s + Number(item.quantidade || 0), 0);
        return sum + somaItens;
      }, 0);

      if (Math.abs(quantidadeTotal - Number(itemNF.quantidade)) > 0.01) {
        return { 
          valido: false, 
          mensagem: `Item "${itemNF.descricao}": quantidade distribuída (${quantidadeTotal.toFixed(2)}) não corresponde à quantidade da NF (${itemNF.quantidade})` 
        };
      }
    }

    return { valido: true };
  };

  const handleSalvar = async () => {
    const validacao = validarDesmembramento();
    if (!validacao.valido) {
      showAlert(validacao.mensagem, 'error');
      return;
    }

    setSalvando(true);
    try {
      let payload = {
        notaFiscalId: notaFiscalId,
        metodo: modo === 'manual' ? 'MANUAL' : 'AUTOMATICO'
      };

      // Filtrar cargas vazias - apenas cargas com itens serão registradas
      const cargasComItens = cargas.filter(c => c.itens && c.itens.length > 0);
      
      if (cargasComItens.length === 0) {
        showAlert('É necessário adicionar itens em pelo menos uma carga', 'error');
        setSalvando(false);
        return;
      }

      if (modo === 'manual' || modo === 'auto') {
        // Preparar distribuição (tanto manual quanto automático com edições)
        // Apenas cargas com itens serão incluídas
        const distribuicaoManual = cargasComItens.map(carga => ({
          itens: (carga.itens || []).map(item => ({
            idItem: item.idItem,
            quantidade: Number(item.quantidade || 0)
          })).filter(item => item.idItem && item.quantidade > 0) // Filtrar itens válidos
        }));
        
        payload.distribuicaoManual = distribuicaoManual;
        payload.metodo = 'MANUAL'; // Sempre usar MANUAL quando há distribuição manual
      } else {
        payload.numeroCargas = cargasComItens.length;
      }

      // console.log('Enviando desmembramento:', payload); // Debug: descomentar se necessário

      const response = await api.post('/desmembramento/desmembrar', payload);

      if (response.data.success) {
        showAlert('Desmembramento realizado com sucesso!', 'success');
        setTimeout(() => {
          if (onComplete) onComplete();
          if (onClose) onClose();
        }, 1000);
      } else {
        showAlert(response.data.message || 'Erro ao salvar desmembramento', 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar desmembramento:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao salvar desmembramento';
      showAlert(errorMessage, 'error');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="desmembramento-novo-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  if (!notaFiscal) {
    return (
      <div className="desmembramento-novo-container">
        <div className="error">Nota fiscal não encontrada</div>
      </div>
    );
  }

  // Calcular totais apenas das cargas com itens
  const cargasComItens = cargas.filter(c => c.itens && c.itens.length > 0);
  const totalValor = cargasComItens.reduce((sum, c) => sum + c.valorTotal, 0);
  const totalPeso = cargasComItens.reduce((sum, c) => sum + c.pesoTotal, 0);
  const totalVolume = cargasComItens.reduce((sum, c) => sum + c.volumeTotal, 0);

  return (
    <div className="desmembramento-novo-container">
      <div className="desmembramento-header">
        <div>
          <h2>Desmembrar Nota Fiscal {notaFiscal.numeroNota}</h2>
          <p className="cliente-info">{notaFiscal.clienteNome}</p>
        </div>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
          {alert.message}
        </div>
      )}

      {modo === 'preview' && (
        <div className="preview-mode">
          <div className="preview-actions">
            <div className="form-group-inline">
              <label>Número de Cargas:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={numeroCargas}
                onChange={(e) => setNumeroCargas(e.target.value)}
                className="input-cargas"
              />
              {sugestao && (
                <span className="sugestao-text">
                  💡 Sugestão: {sugestao.numeroCargasSugerido} cargas
                </span>
              )}
            </div>

            <div className="buttons-group">
              <button className="btn btn-primary" onClick={gerarPreviewAutomatico}>
                📊 Visualizar Automático
              </button>
              <button className="btn btn-success" onClick={iniciarModoManual}>
                ✋ Desmembrar Manualmente
              </button>
            </div>
          </div>

          <div className="nota-summary">
            <h3>Resumo da Nota Fiscal</h3>
            <div className="summary-grid">
              <div>
                <strong>Valor Total:</strong> R$ {Number(notaFiscal.valorTotal).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              {notaFiscal.pesoTotal > 0 && (
                <div>
                  <strong>Peso Total:</strong> {Number(notaFiscal.pesoTotal).toLocaleString('pt-BR', {
                    maximumFractionDigits: 2
                  })} kg
                </div>
              )}
              {notaFiscal.volumeTotal > 0 && (
                <div>
                  <strong>Volume Total:</strong> {Number(notaFiscal.volumeTotal).toFixed(3)} m³
                </div>
              )}
              <div>
                <strong>Total de Itens:</strong> {notaFiscal.itens.length}
              </div>
            </div>
          </div>

          <div className="produtos-lista">
            <h3>Produtos da Nota Fiscal</h3>
            <div className="produtos-table-container">
              <table className="produtos-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Quantidade</th>
                    <th>Unidade</th>
                    <th>Valor Unitário</th>
                    <th>Valor Total</th>
                    {notaFiscal.pesoTotal > 0 && <th>Peso</th>}
                    {notaFiscal.volumeTotal > 0 && <th>Volume</th>}
                  </tr>
                </thead>
                <tbody>
                  {notaFiscal.itens.map((item) => (
                    <tr key={item.id}>
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
                      {notaFiscal.pesoTotal > 0 && (
                        <td>{item.peso ? `${Number(item.peso).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : '-'}</td>
                      )}
                      {notaFiscal.volumeTotal > 0 && (
                        <td>{item.volume ? `${Number(item.volume).toFixed(3)} m³` : '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(modo === 'auto' || modo === 'manual') && (
        <div className="desmembramento-mode">
          <div className="modo-header">
            <span className="modo-badge">
              {modo === 'auto' ? '📊 Modo Automático' : '✋ Modo Manual'}
            </span>
            {(modo === 'manual' || modo === 'auto') && (
              <button className="btn btn-secondary btn-sm" onClick={adicionarCarga}>
                + Adicionar Carga
              </button>
            )}
            {modo === 'auto' && (
              <button className="btn btn-primary btn-sm" onClick={gerarPreviewAutomatico} disabled={loading}>
                🔄 Desmembrar Automaticamente
              </button>
            )}
            {(modo === 'auto' || modo === 'manual') && (
              <span style={{ fontSize: '12px', color: '#666' }}>
                💡 Duplo clique em um item para editar quantidade
              </span>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setModo('preview')}>
              ← Voltar
            </button>
          </div>

          <div className="cargas-container">
            {cargas.map((carga, index) => (
              <div
                key={carga.id}
                className="carga-box"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, carga.id)}
              >
                <div className="carga-header">
                  <h3>{carga.numeroCarga}</h3>
                  {modo === 'manual' && cargas.length > 1 && (
                    <button
                      className="btn-remove-carga"
                      onClick={() => removerCarga(carga.id)}
                      title="Remover carga"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="carga-totais">
                  <div>Valor: R$ {Number(carga.valorTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</div>
                  {carga.pesoTotal > 0 && (
                    <div>Peso: {Number(carga.pesoTotal).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2
                    })} kg</div>
                  )}
                  {carga.volumeTotal > 0 && (
                    <div>Volume: {Number(carga.volumeTotal).toFixed(3)} m³</div>
                  )}
                  <div className="itens-count">{carga.itens.length} item(s)</div>
                </div>

                <div className="carga-itens">
                  {carga.itens.length === 0 ? (
                    <div className="carga-vazia">
                      {modo === 'manual' ? 'Arraste itens aqui' : 'Vazio'}
                    </div>
                  ) : (
                    carga.itens.map((item, itemIndex) => {
                      const isEditando = itemEditando && 
                        ((itemEditando.itemUniqueId && itemEditando.itemUniqueId === item.itemUniqueId) ||
                        (itemEditando.idItem === item.idItem && itemEditando.cargaId === carga.id && 
                          Math.abs(itemEditando.quantidade - item.quantidade) < 0.01));
                      
                      return (
                        <div
                          key={item.itemUniqueId || `${item.idItem}-${carga.id}-${itemIndex}`}
                          className={`item-card ${isEditando ? 'editando' : ''}`}
                          draggable={(modo === 'manual' || modo === 'auto') && !isEditando}
                          onDragStart={(e) => handleDragStart(e, item, carga.id)}
                          onDragEnd={handleDragEnd}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleDoubleClick(item, carga.id);
                          }}
                          title={(modo === 'manual' || modo === 'auto') ? 'Duplo clique para editar quantidade | Arraste para mover entre cargas' : ''}
                        >
                          {isEditando ? (
                            <div className="item-edicao">
                              <div className="item-descricao">{item.descricao}</div>
                              <div className="edicao-quantidade">
                                <label>Quantidade:</label>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  max={(() => {
                                    if (!itemEditando) return item.quantidade;
                                    return calcularQuantidadeMaximaDisponivel(
                                      item.idItem,
                                      itemEditando.itemUniqueId,
                                      itemEditando.cargaId,
                                      itemEditando.quantidade
                                    );
                                  })()}
                                  value={quantidadeEditando}
                                  onChange={(e) => {
                                    let valor = e.target.value;
                                    
                                    // Calcular quantidade máxima disponível
                                    const itemOriginal = notaFiscal.itens.find(it => it.id === item.idItem);
                                    let quantidadeMaxima = Infinity;
                                    
                                    if (itemOriginal && itemEditando) {
                                      quantidadeMaxima = calcularQuantidadeMaximaDisponivel(
                                        item.idItem,
                                        itemEditando.itemUniqueId,
                                        itemEditando.cargaId,
                                        itemEditando.quantidade
                                      );
                                    }
                                    
                                    // Se o valor digitado for um número válido, validar
                                    const novaQtd = parseFloat(valor);
                                    if (!isNaN(novaQtd) && novaQtd > 0) {
                                      // Bloquear valores superiores ao máximo disponível
                                      if (novaQtd > quantidadeMaxima) {
                                        // Limitar ao máximo disponível
                                        valor = quantidadeMaxima.toFixed(2);
                                        e.target.style.borderColor = '#dc3545';
                                        e.target.title = `Máximo disponível: ${quantidadeMaxima.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${itemOriginal?.unidade || ''}`;
                                        // Feedback visual apenas, sem alerta (evita spam de alertas)
                                      } else {
                                        e.target.style.borderColor = '#ff9800';
                                        e.target.title = '';
                                      }
                                    }
                                    
                                    setQuantidadeEditando(valor);
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleSalvarQuantidade();
                                    if (e.key === 'Escape') handleCancelarEdicao();
                                  }}
                                  autoFocus
                                  className="input-quantidade"
                                />
                                <span>{item.unidade}</span>
                              </div>
                              <div className="edicao-buttons">
                                <button className="btn-salvar" onClick={handleSalvarQuantidade}>✓</button>
                                <button className="btn-cancelar" onClick={handleCancelarEdicao}>×</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="item-descricao">{item.descricao}</div>
                              <div className="item-detalhes">
                                <span>{Number(item.quantidade).toLocaleString('pt-BR')} {item.unidade}</span>
                                <span>R$ {Number(item.valorTotal).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="desmembramento-footer">
            <div className="totais-comparacao">
              <div>
                <strong>Nota Fiscal:</strong> R$ {Number(notaFiscal.valorTotal).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <div>
                <strong>Total Cargas:</strong> R$ {Number(totalValor).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>

            <div className="footer-actions">
              <button className="btn btn-secondary" onClick={() => setModo('preview')} disabled={salvando}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : '✅ Confirmar Desmembramento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesmembramentoNovo;
