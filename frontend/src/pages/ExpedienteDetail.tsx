import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Text, Badge, Field, Input, Drawer, DrawerHeader, DrawerBody,
  DrawerFooter, Spinner, Divider
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular, ArrowDownload24Regular, Add24Regular,
  Form24Regular, DocumentPdf24Regular, CalendarLtr24Regular
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
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadData(Number(id));
  }, [id]);

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

  const handleDownload = async (expId: number) => {
    try {
      const data = await api.getExpedienteUrl(expId);
      window.open(data.url, '_blank');
    } catch (e: any) { alert('Error descargando: ' + e.message); }
  };

  const handleNuevaVersion = async () => {
    if (!archivo || !expediente) { alert('Debe adjuntar el archivo corregido'); return; }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('titulo', `${expediente.titulo} (Corregido)`);
      formData.append('id_proyecto', expediente.id_proyecto.toString());
      formData.append('id_disciplina', expediente.id_disciplina.toString());
      formData.append('archivo', archivo);
      const res = await api.createNuevaVersion(expediente.id, formData);
      setIsDrawerOpen(false);
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

          {/* Documento */}
          <div style={{ padding: 20, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Text weight="semibold" size={400} block style={{ marginBottom: 16 }}>Documento</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <DocumentPdf24Regular style={{ color: '#c50f1f', fontSize: 32 }} />
              <div style={{ flex: 1 }}>
                <Text weight="semibold" block>{expediente.nombre_archivo}</Text>
                <Text size={200} style={{ color: 'gray' }}>
                  Subido el {new Date(expediente.created_at).toLocaleDateString('es-CL', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </div>
              <Button
                appearance="primary"
                icon={<ArrowDownload24Regular />}
                onClick={() => handleDownload(expediente.id)}
              >
                Descargar
              </Button>
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
            <Field label="Archivo Corregido" required>
              <input type="file" onChange={e => setArchivo(e.target.files?.[0] || null)} style={{ padding: '8px 0' }} />
            </Field>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => setIsDrawerOpen(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button appearance="primary" onClick={handleNuevaVersion} disabled={isSubmitting || !archivo}>
            {isSubmitting ? <Spinner size="extra-tiny" /> : 'Subir Versión'}
          </Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}
