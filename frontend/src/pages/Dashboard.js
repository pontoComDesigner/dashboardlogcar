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
          <h3>Total de Notas Fiscais</h3>
          <p className="dashboard-value">
            {data.notasPorStatus.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <div className="dashboard-details">
            {data.notasPorStatus.map((item) => (
              <div key={item.status} className="dashboard-detail-item">
                <span>{item.status}:</span>
                <span>{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Total de Romaneios</h3>
          <p className="dashboard-value">
            {data.romaneiosPorStatus.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <div className="dashboard-details">
            {data.romaneiosPorStatus.map((item) => (
              <div key={item.status} className="dashboard-detail-item">
                <span>{item.status}:</span>
                <span>{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Valor Total de Pedidos</h3>
          <p className="dashboard-value">
            R$ {Number(data.valorTotalPedidos).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>Valor Total de Notas Fiscais</h3>
          <p className="dashboard-value">
            R$ {Number(data.valorTotalNotas).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;











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
          <h3>Total de Notas Fiscais</h3>
          <p className="dashboard-value">
            {data.notasPorStatus.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <div className="dashboard-details">
            {data.notasPorStatus.map((item) => (
              <div key={item.status} className="dashboard-detail-item">
                <span>{item.status}:</span>
                <span>{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Total de Romaneios</h3>
          <p className="dashboard-value">
            {data.romaneiosPorStatus.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <div className="dashboard-details">
            {data.romaneiosPorStatus.map((item) => (
              <div key={item.status} className="dashboard-detail-item">
                <span>{item.status}:</span>
                <span>{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Valor Total de Pedidos</h3>
          <p className="dashboard-value">
            R$ {Number(data.valorTotalPedidos).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>Valor Total de Notas Fiscais</h3>
          <p className="dashboard-value">
            R$ {Number(data.valorTotalNotas).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;











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
          <h3>Total de Notas Fiscais</h3>
          <p className="dashboard-value">
            {data.notasPorStatus.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <div className="dashboard-details">
            {data.notasPorStatus.map((item) => (
              <div key={item.status} className="dashboard-detail-item">
                <span>{item.status}:</span>
                <span>{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Total de Romaneios</h3>
          <p className="dashboard-value">
            {data.romaneiosPorStatus.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <div className="dashboard-details">
            {data.romaneiosPorStatus.map((item) => (
              <div key={item.status} className="dashboard-detail-item">
                <span>{item.status}:</span>
                <span>{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Valor Total de Pedidos</h3>
          <p className="dashboard-value">
            R$ {Number(data.valorTotalPedidos).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>Valor Total de Notas Fiscais</h3>
          <p className="dashboard-value">
            R$ {Number(data.valorTotalNotas).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;












