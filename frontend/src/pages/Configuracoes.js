import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Configuracoes.css';

const Configuracoes = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');
  const [cargas, setCargas] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [filtroNota, setFiltroNota] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [paginacao, setPaginacao] = useState({ pagina: 1, limite: 50, total: 0, totalPaginas: 1 });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setMessage('Por favor, selecione um arquivo CSV válido.');
        setMessageType('error');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Por favor, selecione um arquivo CSV.');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // Ler conteúdo do arquivo
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileContent = e.target.result;
          
          // Verificar se há token antes de enviar
          const token = localStorage.getItem('token');
          if (!token) {
            setMessage('Você não está autenticado. Por favor, faça login novamente.');
            setMessageType('error');
            setUploading(false);
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            return;
          }
          
          console.log('🔐 Enviando request com token:', token ? 'Token presente' : 'Token ausente');
          
          const response = await api.post('/configuracoes/upload-historico', {
            fileContent,
            fileName: file.name
          });

          if (response.data.success) {
            setMessage('Histórico importado com sucesso!');
            setMessageType('success');
            setFile(null);
            // Resetar input de arquivo
            document.getElementById('csv-file-input').value = '';
            // Recarregar histórico após importação
            loadHistorico();
            loadEstatisticas();
          } else {
            setMessage(response.data.message || 'Erro ao importar histórico.');
            setMessageType('error');
          }
        } catch (error) {
          console.error('Erro ao fazer upload:', error);
          console.error('Status:', error.response?.status);
          console.error('Data:', error.response?.data);
          
          if (error.response?.status === 401) {
            setMessage('Sua sessão expirou. Por favor, faça login novamente.');
            setMessageType('error');
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          } else if (error.response?.status === 403) {
            setMessage('Acesso negado. Você não tem permissão para importar histórico.');
            setMessageType('error');
          } else {
            setMessage(
              error.response?.data?.message || 
              'Erro ao importar histórico. Verifique o formato do arquivo CSV.'
            );
            setMessageType('error');
          }
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setMessage('Erro ao ler arquivo.');
        setMessageType('error');
        setUploading(false);
      };

      reader.readAsText(file, 'utf-8');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setMessage('Erro ao processar arquivo.');
      setMessageType('error');
      setUploading(false);
    }
  };

  const loadHistorico = async () => {
    try {
      setLoadingHistorico(true);
      const response = await api.get('/configuracoes/historico', {
        params: {
          page: paginacao.pagina,
          limit: paginacao.limite,
          numeroNotaFiscal: filtroNota || undefined,
          codigoProduto: filtroProduto || undefined
        }
      });
      
      if (response.data.success) {
        setCargas(response.data.cargas || []);
        setPaginacao(response.data.paginacao);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const loadEstatisticas = async () => {
    try {
      const response = await api.get('/configuracoes/historico/estatisticas');
      if (response.data.success) {
        setEstatisticas(response.data.estatisticas);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginacao.pagina, filtroNota, filtroProduto]);

  useEffect(() => {
    loadEstatisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltroChange = () => {
    setPaginacao({ ...paginacao, pagina: 1 });
  };

  return (
    <div className="configuracoes-container">
      <div className="configuracoes-header">
        <h1>⚙️ Configurações</h1>
        <p>Painel administrativo para configurações do sistema</p>
      </div>

      <div className="configuracoes-content">
        <div className="config-card">
          <div className="config-card-header">
            <h2>📥 Importar Histórico de Faturamentos</h2>
            <p>Faça upload de um arquivo CSV com histórico de faturamentos para melhorar o desmembramento automático.</p>
          </div>

          <div className="config-card-body">
            <div className="upload-section">
              <div className="file-input-wrapper">
                <label htmlFor="csv-file-input" className="file-input-label">
                  {file ? file.name : 'Selecionar arquivo CSV'}
                </label>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="file-input"
                  disabled={uploading}
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`btn btn-primary ${uploading ? 'loading' : ''}`}
              >
                {uploading ? '⏳ Importando...' : '📤 Importar Histórico'}
              </button>
            </div>

            {message && (
              <div className={`alert alert-${messageType}`}>
                {message}
              </div>
            )}

            <div className="info-box">
              <h3>📋 Formato do arquivo CSV:</h3>
              <p>O arquivo deve conter as seguintes colunas separadas por vírgula:</p>
              <ul>
                <li><strong>Número da Nota Fiscal</strong> - Ex: NF-123456</li>
                <li><strong>Código do Produto</strong> - Ex: 6000</li>
                <li><strong>Descrição do Produto</strong> - Ex: AREIA MEDIA * CARRADA 5 METROS *</li>
                <li><strong>Unidade</strong> - Ex: CA, UN, KG</li>
                <li><strong>Quantidade</strong> - Ex: 1, 5, 10</li>
              </ul>
              <p><strong>⚠️ IMPORTANTE - Como o sistema identifica as cargas:</strong></p>
              <ul>
                <li>Cada linha do CSV representa um <strong>produto em uma carga</strong></li>
                <li>Produtos da <strong>mesma nota fiscal</strong> que estão <strong>consecutivos no CSV</strong> serão agrupados na <strong>mesma carga</strong></li>
                <li>Quando a nota fiscal muda, inicia uma nova carga (ou nova nota fiscal)</li>
                <li><strong>Produtos especiais</strong> (6000, 50080, 19500) devem ter quantidade = 1 e estar sozinhos em uma linha</li>
              </ul>
              <p><strong>Exemplo de CSV correto:</strong></p>
              <code>
                NF-123456,9675,CIMENT O VOTORAN 50KG TODAS,UN,14<br />
                NF-123456,17704,TIJOLOS 8 FUROS,UN,1000<br />
                NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,1<br />
                NF-123456,50080,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1<br />
                NF-123457,9675,CIMENT O VOTORAN 50KG TODAS,UN,20
              </code>
              <p><strong>Resultado:</strong></p>
              <ul>
                <li><strong>Carga 1 (NF-123456):</strong> CIMENT (14), TIJOLOS (1000), AREIA (1), ARGAMASSA (1)</li>
                <li><strong>Carga 2 (NF-123457):</strong> CIMENT (20)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="config-card">
          <div className="config-card-header">
            <h2>🔧 Regras de Produtos Especiais</h2>
            <p>Produtos que requerem regras especiais de desmembramento.</p>
          </div>

          <div className="config-card-body">
            <div className="info-box">
              <p>Os seguintes produtos são considerados especiais e só podem ter <strong>1 unidade por carga</strong>:</p>
              <ul>
                <li><strong>6000</strong> - AREIA MEDIA * CARRADA 5 METROS *</li>
                <li><strong>50080</strong> - ARGAMASSA REBOCO * CARRADA 5 METROS *</li>
                <li><strong>19500</strong> - ARGAMASSA REBOCO 5METRO</li>
              </ul>
              <p>Essas regras são cadastradas automaticamente ao importar o histórico.</p>
            </div>
          </div>
        </div>

        <div className="config-card">
          <div className="config-card-header">
            <h2>📊 Como funciona o desmembramento automático</h2>
          </div>

          <div className="config-card-body">
            <div className="info-box">
              <p>O sistema utiliza a seguinte lógica:</p>
              <ol>
                <li><strong>Produtos Especiais:</strong> Cada unidade vai para uma carga separada (1 unidade por carga)</li>
                <li><strong>Produtos Normais:</strong> Consulta o histórico de faturamentos para ver como foram desmembrados anteriormente</li>
                <li><strong>Sem Histórico:</strong> Se não houver histórico, toda a quantidade vai em uma carga separada</li>
              </ol>
              
              <h4>Exemplo prático:</h4>
              <p>Nota Fiscal com:</p>
              <ul>
                <li>5 unidades do código <strong>19500</strong> (especial) → 5 cargas</li>
                <li>14 unidades do código <strong>9675</strong> (normal)</li>
                  <ul>
                    <li>Se histórico indicar 5 unidades por carga → 3 cargas (14 ÷ 5 = 2,8 → 3 cargas)</li>
                    <li>Se não houver histórico → 1 carga (toda quantidade junto)</li>
                  </ul>
              </ul>
              <p><strong>Total: 5 + 3 = 8 cargas</strong> (com histórico) ou <strong>5 + 1 = 6 cargas</strong> (sem histórico)</p>
            </div>
          </div>
        </div>

        <div className="config-card">
          <div className="config-card-header">
            <h2>📊 Histórico de Desmembramentos Importados</h2>
            <p>Visualize as notas fiscais e produtos que foram importados para o histórico.</p>
          </div>

          <div className="config-card-body">
            {estatisticas && (
              <div className="stats-box">
                <div className="stat-item">
                  <span className="stat-label">Total de Notas Fiscais:</span>
                  <span className="stat-value">{estatisticas.totalNotasFiscais}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total de Produtos:</span>
                  <span className="stat-value">{estatisticas.totalProdutos}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total de Registros:</span>
                  <span className="stat-value">{estatisticas.totalRegistros}</span>
                </div>
              </div>
            )}

            <div className="filtros-box">
              <div className="filtro-item">
                <label>Filtrar por Nota Fiscal:</label>
                <input
                  type="text"
                  value={filtroNota}
                  onChange={(e) => setFiltroNota(e.target.value)}
                  onBlur={handleFiltroChange}
                  placeholder="Ex: NF-123456"
                  className="filtro-input"
                />
              </div>
              <div className="filtro-item">
                <label>Filtrar por Código do Produto:</label>
                <input
                  type="text"
                  value={filtroProduto}
                  onChange={(e) => setFiltroProduto(e.target.value)}
                  onBlur={handleFiltroChange}
                  placeholder="Ex: 6000"
                  className="filtro-input"
                />
              </div>
            </div>

            {loadingHistorico ? (
              <div className="loading-box">Carregando histórico...</div>
            ) : cargas.length === 0 ? (
              <div className="empty-box">
                <p>Nenhum histórico encontrado. Importe um arquivo CSV para começar.</p>
                <div className="info-box" style={{ marginTop: '20px' }}>
                  <h4>📋 Formato do CSV esperado:</h4>
                  <p>Cada linha deve conter:</p>
                  <ul>
                    <li><strong>Número da Nota Fiscal</strong> (Ex: NF-123456)</li>
                    <li><strong>Código do Produto</strong> (Ex: 6000)</li>
                    <li><strong>Descrição do Produto</strong> (Ex: AREIA MEDIA * CARRADA 5 METROS *)</li>
                    <li><strong>Unidade</strong> (Ex: CA, UN, KG)</li>
                    <li><strong>Quantidade</strong> (Ex: 1, 5, 10)</li>
                  </ul>
                  <p><strong>Importante:</strong> Se uma nota fiscal tem múltiplos produtos em uma mesma carga, eles devem estar em linhas consecutivas com o mesmo número de nota.</p>
                  <p><strong>Exemplo:</strong></p>
                  <code>
                    NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,1<br />
                    NF-123456,9675,CIMENT O VOTORAN 50KG TODAS,UN,14<br />
                    NF-123457,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,2
                  </code>
                </div>
              </div>
            ) : (
              <>
                <div className="cargas-grid">
                  {cargas.map((carga, index) => (
                    <div key={index} className="carga-card">
                      <div className="carga-card-header">
                        <div className="carga-card-title">
                          <span className="carga-nf">{carga.numeroNotaFiscal}</span>
                          <span className="carga-numero">Carga #{carga.numeroCarga}</span>
                        </div>
                        <div className="carga-card-stats">
                          <span>{carga.totalProdutos} produto(s)</span>
                          <span>•</span>
                          <span>{carga.totalQuantidade} unidade(s)</span>
                        </div>
                      </div>
                      <div className="carga-card-body">
                        <div className="carga-produtos">
                          {carga.produtos.map((produto, prodIndex) => (
                            <div key={prodIndex} className="carga-produto-item">
                              <div className="produto-codigo">{produto.codigoProduto}</div>
                              <div className="produto-descricao">{produto.descricao || 'Sem descrição'}</div>
                              <div className="produto-quantidade">
                                <strong>{produto.quantidade}</strong> {produto.unidade}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {paginacao.totalPaginas > 1 && (
                  <div className="paginacao-box">
                    <button
                      onClick={() => setPaginacao({ ...paginacao, pagina: paginacao.pagina - 1 })}
                      disabled={paginacao.pagina === 1}
                      className="btn btn-secondary btn-sm"
                    >
                      ← Anterior
                    </button>
                    <span>
                      Página {paginacao.pagina} de {paginacao.totalPaginas} 
                      ({paginacao.total} registros)
                    </span>
                    <button
                      onClick={() => setPaginacao({ ...paginacao, pagina: paginacao.pagina + 1 })}
                      disabled={paginacao.pagina >= paginacao.totalPaginas}
                      className="btn btn-secondary btn-sm"
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
