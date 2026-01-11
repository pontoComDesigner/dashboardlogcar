import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/relatorios/dashboard');
      setData(response.data.dashboard);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Carregando dashboard...</div>;
  }

  if (!data) {
    return <div className="empty-state">Erro ao carregar dados do dashboard</div>;
  }

  return (
    <div className="content">
      <h1>Dashboard</h1>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Total de Pedidos</h3>
          <p className="dashboard-value">
            {data.pedidosPorStatus.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <div className="dashboard-details">
            {data.pedidosPorStatus.map((item) => (
              <div key={item.status} className="dashboard-detail-item">
                <span>{item.status}:</span>
                <span>{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Entregas Realizadas</h3>
          <p className="dashboard-value">
            {data.pedidosPorStatus.find(item => item.status === 'ENTREGUE')?.total || 0}
          </p>
          <div className="dashboard-details">
            <div className="dashboard-detail-item">
              <span>Eficiência:</span>
              <span>
                {Math.round((data.pedidosPorStatus.find(item => item.status === 'ENTREGUE')?.total || 0) / 
                (data.pedidosPorStatus.reduce((sum, item) => sum + item.total, 0) || 1) * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Tempo Médio de Entrega</h3>
          <p className="dashboard-value">
            {data.tempoMedioEntregaDias || 0} dias
          </p>
          <div className="dashboard-details">
            <div className="dashboard-detail-item">
              <span>Meta:</span>
              <span>2 dias</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3>Top Motoristas</h3>
          <div className="dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Cargas</th>
                </tr>
              </thead>
              <tbody>
                {data.topMotoristas.map((item) => (
                  <tr key={item.motorista}>
                    <td>{item.motorista}</td>
                    <td>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-section">
          <h3>Cargas Recentes</h3>
          <div className="dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Motorista</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.cargasRecentes.map((item) => (
                  <tr key={item.id}>
                    <td>{item.numeroCarga}</td>
                    <td>{item.motorista}</td>
                    <td>
                      <span className={`status-badge status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
