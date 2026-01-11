import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-title">Faturamento Logístico</h1>
          <div className="navbar-user">
            <span>{user?.name}</span>
            <span className="navbar-role">({user?.role})</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="layout-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <nav className="sidebar-nav">
            <Link to="/" className="sidebar-link">
              <span>📊</span>
              {sidebarOpen && <span>Dashboard</span>}
            </Link>
            <Link to="/pedidos" className="sidebar-link">
              <span>📦</span>
              {sidebarOpen && <span>Pedidos</span>}
            </Link>
            <Link to="/notas-fiscais" className="sidebar-link">
              <span>🧾</span>
              {sidebarOpen && <span>Notas Fiscais</span>}
            </Link>
            <Link to="/romaneios" className="sidebar-link">
              <span>🚚</span>
              {sidebarOpen && <span>Romaneios</span>}
            </Link>
            <Link to="/desmembramento" className="sidebar-link">
              <span>✂️</span>
              {sidebarOpen && <span>Desmembramento</span>}
            </Link>
            {user?.role === 'ADMINISTRATIVO' && (
              <>
                <Link to="/usuarios" className="sidebar-link">
                  <span>👥</span>
                  {sidebarOpen && <span>Usuários</span>}
                </Link>
                <Link to="/configuracoes" className="sidebar-link">
                  <span>⚙️</span>
                  {sidebarOpen && <span>Configurações</span>}
                </Link>
              </>
            )}
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
