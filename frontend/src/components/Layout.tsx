import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api, getCurrentUser } from '../api';
import { useTheme } from './ThemeContext';

// --- SVG Icons ---
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconTasks = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconGear = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
  </svg>
);
const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
  </svg>
);

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const { theme, toggleTheme } = useTheme();

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const u = getCurrentUser();
      if (u?.rol === 'revisor' || u?.rol === 'administrador') {
        const tareas = await api.getMisTareas();
        const openTasks = tareas.filter(t => t.estado === 'ABIERTA');
        setUnreadCount(openTasks.length);
        setRecentTasks(tareas.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <IconHome /> },
    { path: '/expedientes', label: 'Expedientes', icon: <IconDoc /> },
  ];

  if (user?.rol === 'revisor' || user?.rol === 'administrador') {
    navItems.push({ path: '/tareas', label: 'Tareas', icon: <IconTasks /> });
  }

  const adminItems = [];
  if (user?.rol === 'administrador') {
    adminItems.push({ path: '/usuarios', label: 'Usuarios', icon: <IconUsers /> });
    adminItems.push({ path: '/mantenedores', label: 'Mantenedores', icon: <IconSettings /> });
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const pageInfo: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Dashboard', subtitle: 'Resumen general del sistema' },
    '/expedientes': { title: 'Expedientes', subtitle: 'Gestión de expedientes documentales' },
    '/tareas': { title: 'Tareas', subtitle: 'Revisión y aprobación de documentos' },
    '/usuarios': { title: 'Usuarios', subtitle: 'Administración de cuentas de usuario' },
    '/mantenedores': { title: 'Mantenedores', subtitle: 'Configuración del sistema' },
  };

  const currentPage = Object.entries(pageInfo).find(([path]) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  })?.[1] || { title: 'Sistema de Gestión Documental', subtitle: '' };

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <IconFile />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">SGD</span>
            <span className="sidebar-logo-subtitle">Gestión Documental</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Principal</span>
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.path === '/tareas' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </button>
          ))}

          {adminItems.length > 0 && (
            <>
              <span className="sidebar-section-label">Administración</span>
              {adminItems.map(item => (
                <button
                  key={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {getInitials(user?.nombre || 'U')}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.nombre || 'Usuario'}</div>
              <div className="user-role">{user?.rol}</div>
            </div>
          </div>

          <button className="sidebar-action-btn" onClick={toggleTheme}>
            <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
              {theme === 'light' ? <IconMoon /> : <IconSun />}
            </span>
            {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
          </button>

          <button className="sidebar-action-btn danger" onClick={handleLogout}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
              <IconLogout />
            </span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{currentPage.title}</h1>
            {currentPage.subtitle && (
              <span className="topbar-subtitle">{currentPage.subtitle}</span>
            )}
          </div>

          <div className="topbar-right">
            {/* Notification Bell */}
            {(user?.rol === 'revisor' || user?.rol === 'administrador') && (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  className="btn-ghost btn-icon"
                  onClick={() => setShowDropdown(!showDropdown)}
                  title="Notificaciones"
                  style={{ position: 'relative' }}
                >
                  <IconBell />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      backgroundColor: '#ef4444',
                      borderRadius: '50%',
                      border: '2px solid var(--bg-primary)',
                    }} />
                  )}
                </button>

                {showDropdown && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <span className="notif-title">
                        Tareas Pendientes
                        {unreadCount > 0 && (
                          <span className="badge badge-danger" style={{ marginLeft: 8 }}>{unreadCount}</span>
                        )}
                      </span>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => { setShowDropdown(false); navigate('/tareas'); }}
                      >
                        Ver todas →
                      </button>
                    </div>
                    {recentTasks.length === 0 ? (
                      <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                        No tienes tareas pendientes
                      </div>
                    ) : (
                      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {recentTasks.map(t => (
                          <div
                            key={t.id}
                            className="notif-item"
                            onClick={() => { setShowDropdown(false); navigate('/tareas'); }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.expediente_titulo}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              <span className={`badge ${t.estado === 'ABIERTA' ? 'badge-brand' : 'badge-neutral'}`}>
                                {t.etapa_nombre || 'Pendiente'}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                Ver. {t.expediente_version}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}>
              {theme === 'light' ? <IconMoon /> : <IconSun />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}