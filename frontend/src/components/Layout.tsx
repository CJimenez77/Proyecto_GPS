import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button, Text } from '@fluentui/react-components';
import { Home24Regular, Document24Regular, People24Regular, SignOut24Regular } from '@fluentui/react-icons';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home24Regular /> },
    { path: '/expedientes', label: 'Expedientes', icon: <Document24Regular /> },
    { path: '/usuarios', label: 'Usuarios', icon: <People24Regular /> },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text weight="semibold">GPS - Gestión de Proyectos</Text>
        <div style={{ display: 'flex', gap: 8 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              appearance="subtle"
              onClick={() => navigate(item.path)}
              style={{
                backgroundColor: location.pathname === item.path ? '#f0f0f0' : undefined
              }}
            >
              {item.icon}
              <span style={{ marginLeft: 8 }}>{item.label}</span>
            </Button>
          ))}
        </div>
        <Button appearance="subtle" icon={<SignOut24Regular />} onClick={handleLogout}>
          Salir
        </Button>
      </div>
      <main style={{ flex: 1, padding: 24, backgroundColor: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}