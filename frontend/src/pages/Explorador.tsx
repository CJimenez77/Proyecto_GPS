import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Badge, Button } from '@fluentui/react-components';
import { api } from '../api';
import type { JerarquiaEmpresa, JerarquiaArea, JerarquiaProyecto, JerarquiaDisciplina, Expediente } from '../entities';

// --- SVG Icons ---
const IconFolder = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(99,102,241,0.15))' }}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);

const IconFileDoc = ({ type }: { type: string }) => {
  let color = 'var(--brand-500)';
  if (type === 'pdf') color = '#ef4444'; // Red
  else if (['doc', 'docx'].includes(type)) color = '#2563eb'; // Blue
  else if (['xls', 'xlsx'].includes(type)) color = '#16a34a'; // Green
  else if (['zip', 'rar'].includes(type)) color = '#8b5cf6'; // Purple
  else if (['txt', 'csv'].includes(type)) color = '#6b7280'; // Grey

  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
};

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconExternal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// --- Translation Helpers ---
const estadoLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente de Revisión',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado (Espera Corrección)',
  RECHAZADO_DEFINITIVO: 'Rechazado Definitivo',
  ARCHIVADO: 'Archivado'
};

const estadoColors: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDIENTE: 'warning',
  APROBADO: 'success',
  RECHAZADO: 'danger',
  RECHAZADO_DEFINITIVO: 'danger',
  ARCHIVADO: 'neutral'
};

export default function Explorador() {
  const navigate = useNavigate();

  // Navigation levels: 'root' | 'empresa' | 'area' | 'proyecto' | 'disciplina' | 'expediente'
  const [level, setLevel] = useState<'root' | 'empresa' | 'area' | 'proyecto' | 'disciplina' | 'expediente'>('root');
  
  const [jerarquia, setJerarquia] = useState<JerarquiaEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedEmpresa, setSelectedEmpresa] = useState<JerarquiaEmpresa | null>(null);
  const [selectedArea, setSelectedArea] = useState<JerarquiaArea | null>(null);
  const [selectedProyecto, setSelectedProyecto] = useState<JerarquiaProyecto | null>(null);
  const [selectedDisciplina, setSelectedDisciplina] = useState<JerarquiaDisciplina | null>(null);
  const [selectedExpediente, setSelectedExpediente] = useState<Expediente | null>(null);

  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loadingExpedientes, setLoadingExpedientes] = useState(false);
  
  const [downloadUrls, setDownloadUrls] = useState<Array<{ url: string; nombre_archivo: string; content_type: string }>>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);

  // Load companies hierarchy on mount
  useEffect(() => {
    setLoading(true);
    api.getJerarquia()
      .then(data => setJerarquia(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch expedientes when selecting a discipline
  const fetchExpedientes = async (projId: number, discId: number) => {
    setLoadingExpedientes(true);
    try {
      const data = await api.getExpedientes({ id_proyecto: projId, id_disciplina: discId, incluir_archivados: true });
      setExpedientes(data);
    } catch (err) {
      console.error('Error fetching expedientes:', err);
    } finally {
      setLoadingExpedientes(false);
    }
  };

  // Fetch file download URLs when selecting an expediente
  const fetchDownloadUrls = async (expId: number) => {
    setLoadingUrls(true);
    try {
      const data = await api.getExpedienteUrl(expId);
      if ((data as any).archivos) {
        setDownloadUrls((data as any).archivos);
      } else {
        setDownloadUrls([{ url: data.url, nombre_archivo: data.nombre_archivo, content_type: data.content_type || '' }]);
      }
    } catch (err) {
      console.error('Error fetching download urls:', err);
      setDownloadUrls([]);
    } finally {
      setLoadingUrls(false);
    }
  };

  // Breadcrumbs Navigation Click Handler
  const handleBreadcrumbClick = (targetLevel: typeof level) => {
    setSearchQuery('');
    if (targetLevel === 'root') {
      setSelectedEmpresa(null);
      setSelectedArea(null);
      setSelectedProyecto(null);
      setSelectedDisciplina(null);
      setSelectedExpediente(null);
      setLevel('root');
    } else if (targetLevel === 'empresa' && selectedEmpresa) {
      setSelectedArea(null);
      setSelectedProyecto(null);
      setSelectedDisciplina(null);
      setSelectedExpediente(null);
      setLevel('empresa');
    } else if (targetLevel === 'area' && selectedArea) {
      setSelectedProyecto(null);
      setSelectedDisciplina(null);
      setSelectedExpediente(null);
      setLevel('area');
    } else if (targetLevel === 'proyecto' && selectedProyecto) {
      setSelectedDisciplina(null);
      setSelectedExpediente(null);
      setLevel('proyecto');
    } else if (targetLevel === 'disciplina' && selectedDisciplina) {
      setSelectedExpediente(null);
      setLevel('disciplina');
    }
  };

  // Back one level
  const handleBack = () => {
    if (level === 'expediente') handleBreadcrumbClick('disciplina');
    else if (level === 'disciplina') handleBreadcrumbClick('proyecto');
    else if (level === 'proyecto') handleBreadcrumbClick('area');
    else if (level === 'area') handleBreadcrumbClick('empresa');
    else if (level === 'empresa') handleBreadcrumbClick('root');
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  // Render lists based on level
  const renderExplorerContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
          <Spinner size="large" />
          <span style={{ color: 'var(--text-secondary)' }}>Cargando estructura...</span>
        </div>
      );
    }

    let itemsToDisplay: Array<{ id: number; nombre: string; type: 'folder' | 'expediente'; rawData: any }> = [];

    if (level === 'root') {
      itemsToDisplay = jerarquia.map(emp => ({
        id: emp.id,
        nombre: emp.nombre,
        type: 'folder',
        rawData: emp
      }));
    } else if (level === 'empresa' && selectedEmpresa) {
      itemsToDisplay = selectedEmpresa.areas.map(area => ({
        id: area.id,
        nombre: area.nombre,
        type: 'folder',
        rawData: area
      }));
    } else if (level === 'area' && selectedArea) {
      itemsToDisplay = selectedArea.proyectos.map(proj => ({
        id: proj.id,
        nombre: proj.nombre,
        type: 'folder',
        rawData: proj
      }));
    } else if (level === 'proyecto' && selectedProyecto) {
      itemsToDisplay = selectedProyecto.disciplinas.map(disc => ({
        id: disc.id,
        nombre: disc.nombre,
        type: 'folder',
        rawData: disc
      }));
    } else if (level === 'disciplina' && selectedDisciplina) {
      if (loadingExpedientes) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <Spinner />
            <span style={{ color: 'var(--text-secondary)' }}>Buscando expedientes...</span>
          </div>
        );
      }
      itemsToDisplay = expedientes.map(exp => ({
        id: exp.id,
        nombre: exp.titulo,
        type: 'expediente',
        rawData: exp
      }));
    }

    // Filter by search query
    const filtered = itemsToDisplay.filter(item => 
      item.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filtered.length === 0) {
      return (
        <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
          <div className="empty-state-icon" style={{ marginBottom: 12 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div className="empty-state-title">No hay elementos</div>
          <div className="empty-state-sub">No se encontraron carpetas o archivos que coincidan con la búsqueda.</div>
        </div>
      );
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16
      }}>
        {filtered.map(item => (
          <div
            key={item.id}
            onClick={() => {
              setSearchQuery('');
              if (level === 'root') {
                setSelectedEmpresa(item.rawData);
                setLevel('empresa');
              } else if (level === 'empresa') {
                setSelectedArea(item.rawData);
                setLevel('area');
              } else if (level === 'area') {
                setSelectedProyecto(item.rawData);
                setLevel('proyecto');
              } else if (level === 'proyecto') {
                setSelectedDisciplina(item.rawData);
                fetchExpedientes(selectedProyecto!.id, item.rawData.id);
                setLevel('disciplina');
              } else if (level === 'disciplina') {
                setSelectedExpediente(item.rawData);
                fetchDownloadUrls(item.rawData.id);
                setLevel('expediente');
              }
            }}
            className="card-hover-effect"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {item.type === 'folder' ? (
              <IconFolder />
            ) : (
              <IconFileDoc type={getFileExtension(item.rawData.nombre_archivo)} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.nombre}
              </span>
              {item.type === 'expediente' && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Versión {item.rawData.version} • {estadoLabel[item.rawData.estado] || item.rawData.estado}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {level !== 'root' && (
            <button
              onClick={handleBack}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, padding: 0, borderRadius: '50%' }}
              title="Volver"
            >
              <IconArrowLeft />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Navegador de Archivos
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Explora expedientes organizados jerárquicamente por empresa, área, proyecto y disciplina.
            </p>
          </div>
        </div>

        {level !== 'expediente' && (
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 320
          }}>
            <input
              type="text"
              placeholder="Buscar en esta carpeta..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 13,
                transition: 'var(--transition)'
              }}
            />
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
              <IconSearch />
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        background: 'var(--bg-secondary)',
        padding: '8px 16px',
        borderRadius: 'var(--radius-sm)',
        flexWrap: 'wrap',
        border: '1px solid var(--border-color)'
      }}>
        <span
          onClick={() => handleBreadcrumbClick('root')}
          style={{ cursor: 'pointer', color: level === 'root' ? 'var(--brand-600)' : 'var(--text-secondary)', fontWeight: level === 'root' ? 700 : 500 }}
        >
          Inicio
        </span>
        
        {selectedEmpresa && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span
              onClick={() => handleBreadcrumbClick('empresa')}
              style={{ cursor: 'pointer', color: level === 'empresa' ? 'var(--brand-600)' : 'var(--text-secondary)', fontWeight: level === 'empresa' ? 700 : 500 }}
            >
              {selectedEmpresa.nombre}
            </span>
          </>
        )}

        {selectedArea && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span
              onClick={() => handleBreadcrumbClick('area')}
              style={{ cursor: 'pointer', color: level === 'area' ? 'var(--brand-600)' : 'var(--text-secondary)', fontWeight: level === 'area' ? 700 : 500 }}
            >
              {selectedArea.nombre}
            </span>
          </>
        )}

        {selectedProyecto && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span
              onClick={() => handleBreadcrumbClick('proyecto')}
              style={{ cursor: 'pointer', color: level === 'proyecto' ? 'var(--brand-600)' : 'var(--text-secondary)', fontWeight: level === 'proyecto' ? 700 : 500 }}
            >
              {selectedProyecto.nombre}
            </span>
          </>
        )}

        {selectedDisciplina && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span
              onClick={() => handleBreadcrumbClick('disciplina')}
              style={{ cursor: 'pointer', color: level === 'disciplina' ? 'var(--brand-600)' : 'var(--text-secondary)', fontWeight: level === 'disciplina' ? 700 : 500 }}
            >
              {selectedDisciplina.nombre}
            </span>
          </>
        )}

        {selectedExpediente && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span style={{ color: 'var(--brand-600)', fontWeight: 700 }}>
              {selectedExpediente.titulo}
            </span>
          </>
        )}
      </div>

      {/* Main Grid or Detailed View */}
      {level !== 'expediente' ? (
        renderExplorerContent()
      ) : (
        selectedExpediente && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* Left Column: File List & Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Document Info Card */}
              <div className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {selectedExpediente.titulo}
                      </h2>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        ID Expediente: #{selectedExpediente.id} • Versión: {selectedExpediente.version}
                      </span>
                    </div>
                    <Badge color={estadoColors[selectedExpediente.estado]}>
                      {estadoLabel[selectedExpediente.estado] || selectedExpediente.estado}
                    </Badge>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <Button
                      onClick={() => navigate(`/expedientes/${selectedExpediente.id}`)}
                      appearance="primary"
                      icon={<IconExternal />}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      Ir al detalle completo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="card">
                <div className="card-body">
                  <div className="card-title" style={{ marginBottom: 16 }}>
                    Archivos Adjuntos
                  </div>

                  {loadingUrls ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                      <Spinner size="small" />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Obteniendo enlaces de descarga...</span>
                    </div>
                  ) : downloadUrls.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No hay archivos adjuntos disponibles.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {downloadUrls.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-secondary)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <IconFileDoc type={getFileExtension(file.nombre_archivo)} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {file.nombre_archivo}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                Formato: {getFileExtension(file.nombre_archivo).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}
                            title="Descargar archivo"
                          >
                            <IconDownload /> Descargar
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Metadata Pane */}
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div className="card-body">
                <div className="card-title" style={{ marginBottom: 16 }}>Detalles de Carpeta</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Empresa</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEmpresa?.nombre}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Área</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedArea?.nombre}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Proyecto</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedProyecto?.nombre}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Disciplina</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedDisciplina?.nombre}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Creado el</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {new Date(selectedExpediente.created_at).toLocaleDateString('es-CL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )
      )}
    </div>
  );
}
