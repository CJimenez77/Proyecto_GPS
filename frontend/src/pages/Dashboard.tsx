import { useEffect, useState } from 'react';
import { Text, Badge, TabList, Tab } from '@fluentui/react-components';
import { api } from '../api';
import type { Expediente, Usuario } from '../entities';

function getBadgeColor(estado: string): "neutral" | "warning" | "success" | "danger" {
  const colors: Record<string, "neutral" | "warning" | "success" | "danger"> = {
    PENDIENTE: 'warning',
    APROBADO: 'success',
    RECHAZADO: 'danger'
  };
  return colors[estado] || 'neutral';
}

function getBadgeText(estado: string): string {
  const texts: Record<string, string> = {
    PENDIENTE: 'Pendiente de Revisión',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado'
  };
  return texts[estado] || estado;
}

export default function Dashboard() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('todos');

  useEffect(() => {
    const stored = localStorage.getItem('usuario');
    if (stored && stored !== 'undefined') {
      try {
        setUsuario(JSON.parse(stored));
      } catch {
        localStorage.removeItem('usuario');
      }
    }
    api.getExpedientes().then(setExpedientes).catch(console.error);
  }, []);

  const stats = {
    total: expedientes.length,
    pendiente: expedientes.filter(e => e.estado === 'PENDIENTE').length,
    aprobado: expedientes.filter(e => e.estado === 'APROBADO').length,
    rechazado: expedientes.filter(e => e.estado === 'RECHAZADO').length
  };

  const filteredExpedientes = selectedTab === 'todos' 
    ? expedientes 
    : expedientes.filter(e => e.estado === selectedTab);

  const cardStyle: React.CSSProperties = {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div>
      <Text weight="semibold" size={800} block style={{ marginBottom: 24 }}>
        Dashboard - Bienvenido {usuario?.nombre || 'Usuario'}
      </Text>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>Total</Text>
          <Text block size={600} weight="semibold">{stats.total}</Text>
        </div>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>Pendientes</Text>
          <Text block size={600} weight="semibold">{stats.pendiente}</Text>
        </div>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>Aprobados</Text>
          <Text block size={600} weight="semibold">{stats.aprobado}</Text>
        </div>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>Rechazados</Text>
          <Text block size={600} weight="semibold">{stats.rechazado}</Text>
        </div>
      </div>

      <div style={cardStyle}>
        <Text weight="semibold" size={400} block style={{ marginBottom: 16 }}>Expedientes Recientes</Text>
        <TabList selectedValue={selectedTab} onTabSelect={(_, data) => setSelectedTab(data.value as string)}>
          <Tab value="todos">Todos</Tab>
          <Tab value="PENDIENTE">Pendientes</Tab>
          <Tab value="APROBADO">Aprobados</Tab>
          <Tab value="RECHAZADO">Rechazados</Tab>
        </TabList>
        <div style={{ marginTop: 16 }}>
          {filteredExpedientes.length === 0 ? (
            <Text>No hay expedientes</Text>
          ) : (
            filteredExpedientes.slice(0, 10).map(exp => (
              <div key={exp.id} style={{ 
                padding: 12, 
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <Text weight="semibold">{exp.titulo}</Text>
                  <Text block style={{ color: 'gray', fontSize: 12 }}>Versión {exp.version}</Text>
                </div>
                <Badge appearance="filled" color={getBadgeColor(exp.estado)}>
                  {getBadgeText(exp.estado)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}