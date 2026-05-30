import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Text, Badge, Field, Input, Drawer, DrawerHeader, DrawerBody,
  DrawerFooter, Spinner, Divider
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular, ArrowDownload24Regular, Add24Regular,
  Form24Regular, DocumentPdf24Regular, CalendarLtr24Regular,
  Dismiss24Regular
} from '@fluentui/react-icons';
import { api, getCurrentUser } from '../api';
import type { Expediente, ExpedienteVersion } from '../entities';

const estadoColors: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  PENDIENTE: 'warning', APROBADO: 'success', RECHAZADO: 'danger'
};

const estadoLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente de Revisión', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado'
};

export default function ExpedienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [versiones, setVersiones] = useState<ExpedienteVersion[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [downloadUrls, setDownloadUrls] = useState<{ url: string; nombre_archivo: string; content_type: string }[]>([]);
  const [archivos, setArchivos] = useState<File[]>([]);

  useEffect(() => {
    if (id) loadData(Number(id));
  }, [id]);

  useEffect(() => {
    if (expediente) {
      api.getExpedienteUrl(expediente.id)
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
  }, [expediente]);

  const loadData = async (expId: number) => {
    try {
      const [exp, vers] = await Promise.all([
        api.getExpediente(expId),
        api.getExpedienteVersiones(expId)
      ]);
      setExpediente(exp);
      setVersiones(vers);
    } catch (e: any) { alert('Error cargando detalle: ' + e.message); }
  };

  const handleArchivoChange = (filesList: FileList | null) => {
    if (!filesList) {
      setArchivos([]);
      return;
    }
    const selectedFiles = Array.from(filesList);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      alert(`Los siguientes archivos superan el límite de 50MB y no se agregarán:\n${oversizedFiles.map(f => `- ${f.name} (${(f.size / (1024 * 1024)).toFixed(2)} MB)`).join('\n')}`);
      const validFiles = selectedFiles.filter(f => f.size <= MAX_FILE_SIZE);
      setArchivos(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        const filteredNew = validFiles.filter(f => !existingNames.has(f.name));
        return [...prev, ...filteredNew];
      });
    } else {
      setArchivos(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        const filteredNew = selectedFiles.filter(f => !existingNames.has(f.name));
        return [...prev, ...filteredNew];
      });
    }
  };

  const handleNuevaVersion = async () => {
    if (archivos.length === 0 || !expediente) { alert('Debe adjuntar al menos un archivo corregido'); return; }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('titulo', `${expediente.titulo} (Corregido)`);
      formData.append('id_proyecto', expediente.id_proyecto.toString());
      formData.append('id_disciplina', expediente.id_disciplina.toString());
      
      archivos.forEach(file => {
        formData.append('archivo', file);
      });

      const res = await api.createNuevaVersion(expediente.id, formData);
      setIsDrawerOpen(false);
      setArchivos([]);
      navigate(`/expedientes/${res.id}`, { replace: true });
    } catch (e: any) { alert('Error subiendo nueva versión: ' + e.message); }
    finally { setIsSubmitting(false); }
  };

  if (!expediente) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <Spinner label="Cargando expediente..." />
    </div>
  );

  const canSubirVersion = expediente.estado === 'RECHAZADO' &&
    (user?.rol === 'usuario_terreno' || user?.rol === 'administrador');

  const hasFormData = expediente.respuestas_formulario && expediente.respuestas_formulario.length > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={() => navigate(-1)} />
        <div style={{ flex: 1 }}>
          <Text weight="semibold" size={800} block>{expediente.titulo}</Text>
          <Text size={200} style={{ color: 'gray' }}>
            {(expediente as any).proyecto_nombre} · {(expediente as any).disciplina_nombre}
          </Text>
        </div>
        <Badge appearance="filled" color={estadoColors[expediente.estado]} size="large">
          {estadoLabel[expediente.estado] || expediente.estado}
        </Badge>
        <Badge color="informative" shape="rounded">Versión {expediente.version}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Columna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Alerta si está rechazado */}
          {expediente.estado === 'RECHAZADO' && (
            <div style={{ padding: 16, backgroundColor: '#fef0f0', borderRadius: 8, border: '1px solid #f1b0b0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text weight="semibold" block style={{ color: '#c50f1f' }}>Documento Rechazado</Text>
                <Text size={200} style={{ color: '#c50f1f' }}>Este expediente fue rechazado. Se debe subir una nueva versión corregida.</Text>
              </div>
              {canSubirVersion && (
                <Button icon={<Add24Regular />} appearance="primary" onClick={() => setIsDrawerOpen(true)}
                  style={{ backgroundColor: '#c50f1f' }}>
                  Subir Corrección
                </Button>
              )}
            </div>
          )}

          {/* Documentos */}
          <div style={{ padding: 20, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Text weight="semibold" size={400} block style={{ marginBottom: 16 }}>Documento(s)</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {downloadUrls.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                  <DocumentPdf24Regular style={{ color: '#c50f1f', fontSize: 24 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <Text weight="semibold" block style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre_archivo}</Text>
                    <Text size={200} style={{ color: 'gray' }}>
                      Subido el {new Date(expediente.created_at).toLocaleDateString('es-CL', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </div>
                  <Button
                    appearance="primary"
                    icon={<ArrowDownload24Regular />}
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    Descargar
                  </Button>
                </div>
              ))}
              {downloadUrls.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
                  <Spinner size="tiny" />
                  <Text size={200} style={{ color: 'gray' }}>Cargando enlaces de descarga...</Text>
                </div>
              )}
            </div>
          </div>

          {/* Metadatos del formulario dinámico */}
          <div style={{ padding: 20, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Form24Regular style={{ color: '#0078d4' }} />
              <Text weight="semibold" size={400}>Metadatos del Documento</Text>
              {hasFormData
                ? <Badge appearance="filled" color="success" size="small">{expediente.respuestas_formulario!.length} campos</Badge>
                : <Badge appearance="filled" color="neutral" size="small">Sin metadatos</Badge>
              }
            </div>

            {hasFormData ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {expediente.respuestas_formulario!.map(rf => (
                  <div key={rf.id_campo} style={{
                    padding: 12, borderRadius: 6,
                    borderLeft: '4px solid #0078d4',
                    backgroundColor: '#f0f4ff'
                  }}>
                    <Text size={100} style={{ color: '#0078d4', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }} block>
                      {rf.etiqueta}
                    </Text>
                    <Text weight="semibold" size={300} block style={{ marginTop: 4 }}>{rf.valor || '—'}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', backgroundColor: '#fafafa', borderRadius: 8, border: '1px dashed #ccc' }}>
                <Text style={{ color: 'gray' }}>Este expediente no tiene metadatos de formulario asociados.</Text>
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral: historial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CalendarLtr24Regular style={{ color: '#555' }} />
              <Text weight="semibold" size={400}>Historial de Versiones</Text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {versiones.map(v => (
                <div key={v.id} style={{
                  paddingLeft: 12,
                  borderLeft: v.id === expediente.id ? '3px solid #0078d4' : '3px solid #ddd'
                }}>
                  <Text weight="semibold" block style={{ color: v.id === expediente.id ? '#0078d4' : 'inherit' }}>
                    Versión {v.version}
                  </Text>
                  <Text size={200} block style={{ color: 'gray' }}>
                    {new Date(v.created_at).toLocaleDateString('es-CL')}
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Badge color={estadoColors[v.estado] || 'neutral'} size="small">{estadoLabel[v.estado] || v.estado}</Badge>
                    {v.id !== expediente.id && (
                      <Button size="small" appearance="transparent" onClick={() => navigate(`/expedientes/${v.id}`)}>Ver</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer nueva versión */}
      <Drawer open={isDrawerOpen} onOpenChange={(_, o) => setIsDrawerOpen(o.open)} position="end">
        <DrawerHeader>
          <Text weight="semibold" size={500}>Subir Versión Corregida</Text>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: '#fff4ce', borderRadius: 8, border: '1px solid #fbdc81' }}>
              <Text size={200} block weight="semibold">¿Qué ocurre al subir una nueva versión?</Text>
              <Text size={200} block style={{ marginTop: 4 }}>
                El archivo reemplazará la versión rechazada y se generará automáticamente una nueva tarea para los revisores.
              </Text>
            </div>
            <Divider />
            {/* Archivos Corregidos */}
            <Field label="Archivos Corregidos" required hint="Puede seleccionar más de un archivo. Máximo 50MB por archivo.">
              <input
                type="file"
                multiple
                onChange={e => handleArchivoChange(e.target.files)}
                style={{ padding: '8px 0' }}
              />
              {archivos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {archivos.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        backgroundColor: '#f3f2f1',
                        borderRadius: 4,
                        borderLeft: '3px solid #0078d4',
                      }}
                    >
                      <Text size={200} style={{ color: '#323130', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                        📄 {file.name} <span style={{ color: '#605e5c', marginLeft: 6 }}>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </Text>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<Dismiss24Regular style={{ fontSize: 14 }} />}
                        title="Quitar archivo"
                        onClick={() => setArchivos(archivos.filter((_, i) => i !== idx))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => { setIsDrawerOpen(false); setArchivos([]); }} disabled={isSubmitting}>Cancelar</Button>
          <Button appearance="primary" onClick={handleNuevaVersion} disabled={isSubmitting || archivos.length === 0}>
            {isSubmitting ? <Spinner size="extra-tiny" /> : 'Subir Versión'}
          </Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}
