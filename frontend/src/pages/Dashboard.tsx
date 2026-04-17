import { useEffect, useState } from 'react';
import { Text, Badge, TabList, Tab } from '@fluentui/react-components';
import { api } from '../api';
import type { Expediente, Usuario } from '../entities';

function getBadgeColor(estado: Expediente['estado']): "neutral" | "warning" | "informative" | "success" | "danger" {
  const colors: Record<Expediente['estado'], "neutral" | "warning" | "informative" | "success" | "danger"> = {
    borrador: 'neutral',
    en_revision: 'warning',
    en_aprobacion: 'informative',
    cerrado: 'success',
    rechazado: 'danger'
  };
  return colors[estado];
}

function getBadgeText(estado: Expediente['estado']): string {
  const texts: Record<Expediente['estado'], string> = {
    borrador: 'Borrador',
    en_revision: 'En Revisión',
    en_aprobacion: 'En Aprobación',
    cerrado: 'Cerrado',
    rechazado: 'Rechazado'
  };
  return texts[estado];
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
    borrador: expedientes.filter(e => e.estado === 'borrador').length,
    enRevision: expedientes.filter(e => e.estado === 'en_revision').length,
    enAprobacion: expedientes.filter(e => e.estado === 'en_aprobacion').length,
    cerrado: expedientes.filter(e => e.estado === 'cerrado').length,
    rechazado: expedientes.filter(e => e.estado === 'rechazado').length
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>Total</Text>
          <Text block size={600} weight="semibold">{stats.total}</Text>
        </div>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>Borrador</Text>
          <Text block size={600} weight="semibold">{stats.borrador}</Text>
        </div>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>En Revisión</Text>
          <Text block size={600} weight="semibold">{stats.enRevision}</Text>
        </div>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>En Aprobación</Text>
          <Text block size={600} weight="semibold">{stats.enAprobacion}</Text>
        </div>
        <div style={cardStyle}>
          <Text block style={{ color: 'gray' }}>Cerrados</Text>
          <Text block size={600} weight="semibold">{stats.cerrado}</Text>
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
          <Tab value="borrador">Borrador</Tab>
          <Tab value="en_revision">En Revisión</Tab>
          <Tab value="en_aprobacion">En Aprobación</Tab>
          <Tab value="cerrado">Cerrado</Tab>
          <Tab value="rechazado">Rechazado</Tab>
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
                  <Text block style={{ color: 'gray', fontSize: 12 }}>{exp.descripcion}</Text>
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