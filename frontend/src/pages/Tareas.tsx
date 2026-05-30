import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Text, Badge, Input, Drawer, DrawerHeader, DrawerBody, DrawerFooter,
  Field, Textarea, Spinner, Select, Divider
} from '@fluentui/react-components';
import {
  Search24Regular, Checkmark24Regular, Dismiss24Regular,
  DocumentArrowRight24Regular, Form24Regular, ArrowDownload24Regular
} from '@fluentui/react-icons';
import { api, getCurrentUser } from '../api';
import type { Tarea, Expediente } from '../entities';

const estadoColors: Record<Tarea['estado'], "neutral" | "warning" | "success" | "danger"> = {
  ABIERTA: 'neutral', EN_REVISION: 'warning', APROBADA: 'success', RECHAZADA: 'danger'
};

const estadoLabel: Record<string, string> = {
  ABIERTA: 'Abierta', EN_REVISION: 'En Revisión', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada'
};

export default function Tareas() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = user?.rol === 'administrador';

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [activeTarea, setActiveTarea] = useState<Tarea | null>(null);
  const [activeExpediente, setActiveExpediente] = useState<Expediente | null>(null);
  const [loadingExp, setLoadingExp] = useState(false);
  const [comentario, setComentario] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [downloadUrls, setDownloadUrls] = useState<{ url: string; nombre_archivo: string; content_type: string }[]>([]);

  useEffect(() => {
    if (activeExpediente) {
      api.getExpedienteUrl(activeExpediente.id)
        .then(data => {
          if ((data as any).archivos) {
            setDownloadUrls((data as any).archivos);
          } else {
            setDownloadUrls([{ url: data.url, nombre_archivo: data.nombre_archivo, content_type: data.content_type || '' }]);
          }
        })
        .catch(e => console.error(e));
    } else {
      setDownloadUrls([]);
    }
  }, [activeExpediente]);

  useEffect(() => { loadTareas(); }, [filtroEstado]);

  const loadTareas = async () => {
    try {
      const data = isAdmin
        ? await api.getTodasTareas(filtroEstado ? { estado: filtroEstado } : undefined)
        : await api.getMisTareas();
      setTareas(data);
    } catch (e) { console.error(e); }
  };

  const openResolver = async (t: Tarea) => {
    setActiveTarea(t);
    setComentario('');
    setActiveExpediente(null);
    setLoadingExp(true);
    try {
      const exp = await api.getExpediente(t.id_expediente);
      setActiveExpediente(exp);
    } catch (e) { console.error(e); }
    finally { setLoadingExp(false); }
  };

  const handleDownload = async (expId: number) => {
    try {
      const data = await api.getExpedienteUrl(expId);
      window.open(data.url, '_blank');
    } catch (e: any) { alert('Error descargando: ' + e.message); }
  };

  const handleResolve = async (estado: 'APROBADA' | 'RECHAZADA') => {
    if (!activeTarea) return;
    if (!comentario.trim()) { alert('Debe ingresar un comentario obligatorio.'); return; }
    setIsSubmitting(true);
    try {
      await api.resolverTarea(activeTarea.id, estado, comentario);
      setActiveTarea(null);
      setActiveExpediente(null);
      setComentario('');
      loadTareas();
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setIsSubmitting(false); }
  };

  const filtered = tareas.filter(t =>
    (t.expediente_titulo || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.proyecto_nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const canResolve = (t: Tarea) => {
    if (t.estado === 'APROBADA' || t.estado === 'RECHAZADA') return false;
    return isAdmin || t.id_usuario_asignado === user?.id;
  };

  const cardStyle: React.CSSProperties = {
    padding: 16, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Text weight="semibold" size={800}>{isAdmin ? 'Todas las Tareas' : 'Mis Tareas'}</Text>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Text size={200} style={{ color: 'gray' }}>Filtrar:</Text>
            <Select value={filtroEstado} onChange={(_, d) => setFiltroEstado(d.value)} style={{ minWidth: 150 }}>
              <option value="">Todos</option>
              <option value="ABIERTA">Abierta</option>
              <option value="EN_REVISION">En Revisión</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </Select>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <Input contentBefore={<Search24Regular />} placeholder="Buscar expediente o proyecto..." value={search} onChange={(_, d) => setSearch(d.value)} style={{ width: 350 }} />
        </div>

        {filtered.length === 0 ? (
          <Text>No hay tareas{filtroEstado ? ` con estado "${estadoLabel[filtroEstado]}"` : ''}.</Text>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: 12 }}><Text weight="semibold">Expediente</Text></th>
                <th style={{ padding: 12 }}><Text weight="semibold">Proyecto</Text></th>
                {isAdmin && <th style={{ padding: 12 }}><Text weight="semibold">Asignado a</Text></th>}
                <th style={{ padding: 12 }}><Text weight="semibold">Etapa</Text></th>
                <th style={{ padding: 12 }}><Text weight="semibold">Fecha</Text></th>
                <th style={{ padding: 12 }}><Text weight="semibold">Estado</Text></th>
                <th style={{ padding: 12 }}><Text weight="semibold">Acciones</Text></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text weight="semibold">{t.expediente_titulo}</Text>
                      <Badge color="informative" shape="rounded">v{t.expediente_version}</Badge>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}><Text style={{ color: 'gray' }}>{t.proyecto_nombre}</Text></td>
                  {isAdmin && <td style={{ padding: 12 }}><Text>{t.asignado_a_nombre}</Text></td>}
                  <td style={{ padding: 12 }}><Text>{t.etapa_nombre}</Text></td>
                  <td style={{ padding: 12 }}><Text>{new Date(t.created_at).toLocaleString()}</Text></td>
                  <td style={{ padding: 12 }}><Badge color={estadoColors[t.estado]}>{estadoLabel[t.estado] || t.estado}</Badge></td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="small" appearance="subtle" icon={<DocumentArrowRight24Regular />} onClick={() => navigate(`/expedientes/${t.id_expediente}`)}>
                        Ver
                      </Button>
                      {canResolve(t) && (
                        <Button size="small" appearance="primary" onClick={() => openResolver(t)}>
                          Resolver
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── DRAWER RESOLUCIÓN ─────────────────────────────────── */}
      <Drawer open={!!activeTarea} onOpenChange={(_, o) => { if (!o.open) { setActiveTarea(null); setActiveExpediente(null); } }} position="end" size="medium">
        <DrawerHeader>
          <Text weight="semibold" size={500}>Resolver Tarea de Revisión</Text>
        </DrawerHeader>
        <DrawerBody>
          {activeTarea && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Info del expediente */}
              <div style={{ padding: 14, backgroundColor: '#f0f4ff', borderRadius: 8, border: '1px solid #c5d0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text weight="semibold" size={400} block>{activeTarea.expediente_titulo}</Text>
                    <Text size={200} style={{ color: '#555' }} block>Proyecto: {activeTarea.proyecto_nombre}</Text>
                    <Text size={200} style={{ color: '#555' }} block>Etapa: {activeTarea.etapa_nombre}</Text>
                    {isAdmin && <Text size={200} style={{ color: '#555' }} block>Asignado a: {activeTarea.asignado_a_nombre}</Text>}
                  </div>
                  <Badge color={estadoColors[activeTarea.estado]}>{estadoLabel[activeTarea.estado]}</Badge>
                </div>
              </div>

              {/* Archivo y descarga */}
              {loadingExp ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spinner size="tiny" />
                  <Text size={200} style={{ color: 'gray' }}>Cargando información del documento...</Text>
                </div>
              ) : activeExpediente && (
                <>
                  {/* Archivos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Text weight="semibold" size={300} block>Archivo(s) Adjunto(s)</Text>
                    {downloadUrls.map((item, idx) => (
                      <div key={idx} style={{ padding: '10px 14px', backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', maxWidth: '75%' }}>
                          <Text size={200} style={{ color: '#323130', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📄 {item.nombre_archivo}</Text>
                        </div>
                        <Button
                          appearance="outline"
                          size="small"
                          icon={<ArrowDownload24Regular />}
                          onClick={() => window.open(item.url, '_blank')}
                        >
                          Descargar
                        </Button>
                      </div>
                    ))}
                    {downloadUrls.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Spinner size="tiny" />
                        <Text size={200} style={{ color: 'gray' }}>Cargando enlaces de descarga...</Text>
                      </div>
                    )}
                  </div>

                  {/* Metadatos del formulario dinámico */}
                  {activeExpediente.respuestas_formulario && activeExpediente.respuestas_formulario.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Form24Regular style={{ color: '#0078d4' }} />
                        <Text weight="semibold" size={300}>Metadatos del Documento</Text>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 14, backgroundColor: '#fafafa', borderRadius: 8, border: '1px solid #e8e8e8' }}>
                        {activeExpediente.respuestas_formulario.map(rf => (
                          <div key={rf.id_campo} style={{ borderLeft: '3px solid #0078d4', paddingLeft: 8 }}>
                            <Text size={100} style={{ color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }} block>{rf.etiqueta}</Text>
                            <Text weight="semibold" size={300} block>{rf.valor || '—'}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <Divider />

              {/* Comentario y resolución */}
              <Field label="Comentario de revisión (Obligatorio)" required hint="Explique los motivos de la aprobación o rechazo.">
                <Textarea
                  value={comentario}
                  onChange={(_, d) => setComentario(d.value)}
                  rows={4}
                  placeholder="Ej: Plano revisado y aprobado. Cumple con todos los requisitos del proyecto..."
                />
              </Field>
            </div>
          )}
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => { setActiveTarea(null); setActiveExpediente(null); }} disabled={isSubmitting}>Cancelar</Button>
          <Button
            style={{ backgroundColor: '#d13438', color: 'white' }}
            icon={<Dismiss24Regular />}
            onClick={() => handleResolve('RECHAZADA')}
            disabled={isSubmitting || !activeTarea}
          >
            {isSubmitting ? <Spinner size="extra-tiny" /> : 'Rechazar'}
          </Button>
          <Button
            style={{ backgroundColor: '#107c10', color: 'white' }}
            icon={<Checkmark24Regular />}
            onClick={() => handleResolve('APROBADA')}
            disabled={isSubmitting || !activeTarea}
          >
            {isSubmitting ? <Spinner size="extra-tiny" /> : 'Aprobar'}
          </Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}
