import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button, Text, Avatar, Badge } from '@fluentui/react-components';
import { Home24Regular, Document24Regular, People24Regular, SignOut24Regular, CheckmarkSquare24Regular, Settings24Regular, Alert24Regular } from '@fluentui/react-icons';
import { api, getCurrentUser } from '../api';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home24Regular /> },
    { path: '/expedientes', label: 'Expedientes', icon: <Document24Regular /> }
  ];

  if (user?.rol === 'revisor' || user?.rol === 'administrador') {
    navItems.push({ path: '/tareas', label: 'Tareas', icon: <CheckmarkSquare24Regular /> });
  }

  if (user?.rol === 'administrador') {
    navItems.push({ path: '/usuarios', label: 'Usuarios', icon: <People24Regular /> });
    navItems.push({ path: '/mantenedores', label: 'Mantenedores', icon: <Settings24Regular /> });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <Text weight="semibold">GPS - Gestión de Proyectos</Text>
        <div style={{ display: 'flex', gap: 8 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              appearance="subtle"
              onClick={() => navigate(item.path)}
              style={{
                backgroundColor: location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/') ? '#f0f0f0' : undefined
              }}
            >
              {item.icon}
              <span style={{ marginLeft: 8 }}>{item.label}</span>
            </Button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Notification Bell */}
          {(user?.rol === 'revisor' || user?.rol === 'administrador') && (
            <div style={{ position: 'relative' }}>
              <Button 
                appearance="subtle" 
                icon={<Alert24Regular />} 
                onClick={() => setShowDropdown(!showDropdown)} 
                title="Notificaciones"
              />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: '#d83b01',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: 10,
                  fontWeight: 'bold',
                  pointerEvents: 'none'
                }}>
                  {unreadCount}
                </span>
              )}
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 40,
                  right: 0,
                  width: 300,
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  padding: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
                    <Text weight="semibold">Tareas Pendientes ({unreadCount})</Text>
                    <Button size="small" appearance="subtle" onClick={() => { setShowDropdown(false); navigate('/tareas'); }}>Ver todas</Button>
                  </div>
                  {recentTasks.length === 0 ? (
                    <div style={{ padding: '8px 0', textAlign: 'center', color: 'gray', fontSize: 13 }}>No tienes tareas pendientes</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                      {recentTasks.map((t) => (
                        <div 
                          key={t.id} 
                          onClick={() => { setShowDropdown(false); navigate(`/tareas`); }}
                          style={{
                            padding: 8,
                            borderRadius: 4,
                            backgroundColor: t.estado === 'ABIERTA' ? '#f0f7ff' : '#fafafa',
                            borderLeft: t.estado === 'ABIERTA' ? '3px solid #0078d4' : '3px solid #ccc',
                            cursor: 'pointer'
                          }}
                        >
                          <Text weight={t.estado === 'ABIERTA' ? 'semibold' : 'regular'} block size={200} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.expediente_titulo}
                          </Text>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
                            <Badge appearance="tint" color={t.estado === 'ABIERTA' ? 'brand' : 'neutral'} size="small">
                              {t.etapa_nombre || 'Pendiente'}
                            </Badge>
                            <Text size={100} style={{ color: 'gray' }}>
                              Ver. {t.expediente_version}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={user?.nombre || 'Usuario'} size={28} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text weight="semibold" size={200}>{user?.nombre}</Text>
              <Text size={200} style={{ color: 'gray' }}>{user?.rol}</Text>
            </div>
          </div>
          <Button appearance="subtle" icon={<SignOut24Regular />} onClick={handleLogout}>
            Salir
          </Button>
        </div>
      </div>
      <main style={{ flex: 1, padding: 24, backgroundColor: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}