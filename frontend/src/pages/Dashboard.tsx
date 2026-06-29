import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../api';
import type { Expediente, Usuario } from '../entities';

// Icons
const IconTotal = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconPending = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const CHART_COLORS = {
  APROBADO: '#10b981',
  PENDIENTE: '#f59e0b',
  RECHAZADO: '#ef4444',
};

const PIE_GRADIENT_IDS = {
  APROBADO: 'gradAprobado',
  PENDIENTE: 'gradPendiente',
  RECHAZADO: 'gradRechazado',
};

function getBadgeClass(estado: string) {
  const map: Record<string, string> = {
    PENDIENTE: 'badge-warning',
    APROBADO: 'badge-success',
    RECHAZADO: 'badge-danger',
  };
  return map[estado] || 'badge-neutral';
}

function getBadgeText(estado: string): string {
  const texts: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
  };
  return texts[estado] || estado;
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        boxShadow: 'var(--shadow-lg)',
      }}>
        {label && <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>}
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
            {p.value} {p.name === 'Cantidad' ? 'expedientes' : p.name === 'Pendientes' ? 'tareas' : ''}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

    Promise.all([api.getExpedientes(), api.getStats()])
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
    rechazado: expedientes.filter(e => e.estado === 'RECHAZADO').length,
  };

  const filteredExpedientes = selectedTab === 'todos'
    ? expedientes
    : expedientes.filter(e => e.estado === selectedTab);

  const pieData = statsData?.estados.map(item => ({
    name: getBadgeText(item.estado),
    value: item.cantidad,
    estado: item.estado,
  })) || [];

  const areaData = statsData?.areas.map(item => ({
    name: item.area,
    Cantidad: item.cantidad,
  })) || [];

  const revisoresData = statsData?.revisores.map(item => ({
    name: item.revisor,
    Pendientes: item.cantidad,
  })) || [];

  if (loading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner" />
        <span className="spinner-text">Cargando Dashboard...</span>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="fade-in">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--accent-600) 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 160, height: 160, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: 4 }}>{greeting},</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
            {usuario?.nombre || 'Usuario'} 👋
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>
            Tienes <strong style={{ color: 'white' }}>{stats.pendiente}</strong> expediente{stats.pendiente !== 1 ? 's' : ''} pendiente{stats.pendiente !== 1 ? 's' : ''} de revisión
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card brand">
          <div className="stat-icon brand"><IconTotal /></div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Expedientes</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon warning"><IconPending /></div>
          <div className="stat-value">{stats.pendiente}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><IconCheck /></div>
          <div className="stat-value">{stats.aprobado}</div>
          <div className="stat-label">Aprobados</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon danger"><IconX /></div>
          <div className="stat-value">{stats.rechazado}</div>
          <div className="stat-label">Rechazados</div>
        </div>
      </div>

      {/* Charts */}
      {statsData && (
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {/* Pie Chart */}
          <div className="card">
            <div className="card-body">
              <div className="card-title" style={{ marginBottom: 4 }}>Distribución por Estado</div>
              <div className="card-subtitle" style={{ marginBottom: 16 }}>Proporción de expedientes</div>
              {pieData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">Sin datos</div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <defs>
                        <linearGradient id="gradAprobado" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="gradPendiente" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="gradRechazado" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`url(#${PIE_GRADIENT_IDS[entry.estado as keyof typeof PIE_GRADIENT_IDS] || 'gradAprobado'})`}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {pieData.map((entry) => (
                      <div key={entry.estado} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[entry.estado as keyof typeof CHART_COLORS] || '#888' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bar Chart - Areas */}
          <div className="card">
            <div className="card-body">
              <div className="card-title" style={{ marginBottom: 4 }}>Expedientes por Área</div>
              <div className="card-subtitle" style={{ marginBottom: 16 }}>Distribución por unidad</div>
              {areaData.length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">Sin datos de áreas</div></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={areaData} barSize={28}>
                    <defs>
                      <linearGradient id="barBrand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4338ca" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Bar dataKey="Cantidad" fill="url(#barBrand)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bar Chart - Revisores */}
          <div className="card">
            <div className="card-body">
              <div className="card-title" style={{ marginBottom: 4 }}>Tareas por Revisor</div>
              <div className="card-subtitle" style={{ marginBottom: 16 }}>Pendientes asignados</div>
              {revisoresData.length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">Sin tareas pendientes</div></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revisoresData} barSize={28}>
                    <defs>
                      <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                    <Bar dataKey="Pendientes" fill="url(#barGreen)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Expedientes */}
      <div className="card">
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="card-title">Expedientes Recientes</div>
              <div className="card-subtitle">Últimos documentos registrados en el sistema</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/expedientes')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Ver todos <IconArrow />
            </button>
          </div>

          {/* Tabs */}
          <div className="tab-list" style={{ marginBottom: 16 }}>
            {[
              { value: 'todos', label: 'Todos' },
              { value: 'PENDIENTE', label: 'Pendientes' },
              { value: 'APROBADO', label: 'Aprobados' },
              { value: 'RECHAZADO', label: 'Rechazados' },
            ].map(tab => (
              <button
                key={tab.value}
                className={`tab-item ${selectedTab === tab.value ? 'active' : ''}`}
                onClick={() => setSelectedTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          {filteredExpedientes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="empty-state-title">No hay expedientes</div>
              <div className="empty-state-sub">No se encontraron registros para este filtro</div>
            </div>
          ) : (
            <div>
              {filteredExpedientes.slice(0, 10).map(exp => (
                <div
                  key={exp.id}
                  className="exp-list-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/expedientes/${exp.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div>
                      <div className="exp-list-title">{exp.titulo}</div>
                      <div className="exp-list-meta">Versión {exp.version}</div>
                    </div>
                  </div>
                  <span className={`badge ${getBadgeClass(exp.estado)}`}>
                    {getBadgeText(exp.estado)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}