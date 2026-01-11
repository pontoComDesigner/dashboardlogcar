import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pedidos from './pages/Pedidos';
import NotasFiscais from './pages/NotasFiscais';
import Romaneios from './pages/Romaneios';
import Desmembramento from './pages/Desmembramento';
import Usuarios from './pages/Usuarios';
import Configuracoes from './pages/Configuracoes';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="notas-fiscais" element={<NotasFiscais />} />
            <Route path="romaneios" element={<Romaneios />} />
            <Route path="desmembramento" element={<Desmembramento />} />
            <Route
              path="usuarios"
              element={
                <PrivateRoute requiredRole="ADMINISTRATIVO">
                  <Usuarios />
                </PrivateRoute>
              }
            />
            <Route
              path="configuracoes"
              element={
                <PrivateRoute requiredRole="ADMINISTRATIVO">
                  <Configuracoes />
                </PrivateRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
