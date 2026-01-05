import React, { useState } from 'react';
import api from '../services/api';
import './Configuracoes.css';

const Configuracoes = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');

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
          } else {
            setMessage(response.data.message || 'Erro ao importar histórico.');
            setMessageType('error');
          }
        } catch (error) {
          console.error('Erro ao fazer upload:', error);
          setMessage(
            error.response?.data?.message || 
            'Erro ao importar histórico. Verifique o formato do arquivo CSV.'
          );
          setMessageType('error');
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
              <p><strong>Exemplo:</strong></p>
              <code>
                NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,1<br />
                NF-123456,50080,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1<br />
                NF-123456,9675,CIMENT O VOTORAN 50KG TODAS,UN,14
              </code>
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
      </div>
    </div>
  );
};

export default Configuracoes;

