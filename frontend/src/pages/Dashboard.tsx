import { useEffect, useState } from 'react';
import { Text, Badge, TabList, Tab, Spinner } from '@fluentui/react-components';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { api } from '../api';
import type { Expediente, Usuario } from '../entities';

const ESTADO_COLORS = {
  APROBADO: '#107c41', // Green matching Fluent UI
  PENDIENTE: '#c57f00', // Deep gold/yellow
  RECHAZADO: '#d83b01' // Red matching Fluent UI
};

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
  const [loading, setLoading] = useState(true);
  
  const [statsData, setStatsData] = useState<{
    estados: { estado: string; cantidad: number }[];
    areas: { area: string; cantidad: number }[];
    revisores: { revisor: string; cantidad: number }[];
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('usuario');
    if (stored && stored !== 'undefined') {
      try {
        setUsuario(JSON.parse(stored));
      } catch {
        localStorage.removeItem('usuario');
      }
    }

    Promise.all([
      api.getExpedientes(),
      api.getStats()
    ])
      .then(([exp, stats]) => {
        setExpedientes(exp);
        setStatsData({
          estados: stats.estados.map(item => ({ estado: item.estado, cantidad: Number(item.cantidad) })),
          areas: stats.areas.map(item => ({ area: item.area, cantidad: Number(item.cantidad) })),
          revisores: stats.revisores.map(item => ({ revisor: item.revisor, cantidad: Number(item.cantidad) })),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const pieData = statsData?.estados.map(item => ({
    name: getBadgeText(item.estado),
    value: item.cantidad,
    estado: item.estado
  })) || [];

  const areaData = statsData?.areas.map(item => ({
    name: item.area,
    Cantidad: item.cantidad
  })) || [];

  const revisoresData = statsData?.revisores.map(item => ({
    name: item.revisor,
    Pendientes: item.cantidad
  })) || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <Spinner size="large" label="Cargando Dashboard..." />
      </div>
    );
  }

  return (
    <div>
      <Text weight="semibold" size={800} block style={{ marginBottom: 24 }}>
        Dashboard - Bienvenido {usuario?.nombre || 'Usuario'}
      </Text>

      {/* Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
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

      {/* Charts Section */}
      {statsData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
          {/* Pie Chart: Status Distribution */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 300 }}>
            <Text weight="semibold" size={400} block style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
              Distribución por Estado
            </Text>
            {pieData.length === 0 ? (
              <Text style={{ color: 'gray', margin: 'auto' }}>Sin expedientes</Text>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ESTADO_COLORS[entry.estado as keyof typeof ESTADO_COLORS] || '#a0a0a0'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} expedientes`, 'Cantidad']} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar Chart: Area stats */}
          <div style={{ ...cardStyle, minHeight: 300 }}>
            <Text weight="semibold" size={400} block style={{ marginBottom: 16 }}>
              Expedientes por Área
            </Text>
            {areaData.length === 0 ? (
              <Text style={{ color: 'gray', display: 'block', textAlign: 'center', marginTop: 80 }}>Sin datos de áreas</Text>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={areaData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} expedientes`, 'Cantidad']} />
                  <Bar dataKey="Cantidad" fill="#0078d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar Chart: Revisor pending tasks */}
          <div style={{ ...cardStyle, minHeight: 300 }}>
            <Text weight="semibold" size={400} block style={{ marginBottom: 16 }}>
              Tareas Pendientes por Revisor
            </Text>
            {revisoresData.length === 0 ? (
              <Text style={{ color: 'gray', display: 'block', textAlign: 'center', marginTop: 80 }}>Sin tareas pendientes</Text>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revisoresData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} tareas`, 'Pendientes']} />
                  <Bar dataKey="Pendientes" fill="#107c41" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Recent Expedientes Table */}
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
            <Text style={{ color: 'gray' }}>No hay expedientes</Text>
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