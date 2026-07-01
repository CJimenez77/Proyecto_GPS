/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Expedientes from './pages/Expedientes'
import ExpedienteDetail from './pages/ExpedienteDetail'
import Usuarios from './pages/Usuarios'
import Tareas from './pages/Tareas'
import Mantenedores from './pages/Mantenedores'
import Layout from './components/Layout'
import Explorador from './pages/Explorador'
import './index.css'

function getCurrentUserRole(): string | null {
  try {
    const stored = localStorage.getItem('usuario');
    if (!stored) return null;
    return JSON.parse(stored)?.rol ?? null;
  } catch { return null; }
}

function PrivateRoutes() {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

// Guard that only allows certain roles; redirects others to /
function RoleRoute({ roles }: { roles: string[] }) {
  const role = getCurrentUserRole();
  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  const token = localStorage.getItem('token');

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/forgot-password" element={token ? <Navigate to="/" replace /> : <ForgotPassword />} />
        <Route path="/reset-password" element={token ? <Navigate to="/" replace /> : <ResetPassword />} />
        <Route path="/" element={<PrivateRoutes />}>
          <Route index element={<Dashboard />} />
          <Route path="expedientes" element={<Expedientes />} />
          <Route path="expedientes/:id" element={<ExpedienteDetail />} />

          {/* Solo revisor y administrador */}
          <Route element={<RoleRoute roles={['revisor', 'administrador']} />}>
            <Route path="tareas" element={<Tareas />} />
          </Route>

          {/* Solo administrador */}
          <Route element={<RoleRoute roles={['administrador']} />}>
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="mantenedores" element={<Mantenedores />} />
            <Route path="explorador" element={<Explorador />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)