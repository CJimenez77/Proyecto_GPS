import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Text, Badge, Input, Field, Drawer, DrawerHeader, DrawerBody, DrawerFooter, Spinner, Divider, Tab, TabList } from '@fluentui/react-components';
import { Add24Regular, Search24Regular, FolderOpen24Regular, Form24Regular, Dismiss24Regular, Filter24Regular, Archive24Regular } from '@fluentui/react-icons';
import { api, getCurrentUser } from '../api';
import type { Expediente, JerarquiaEmpresa, Formulario } from '../entities';

const estadoColors: Record<Expediente['estado'], "neutral" | "warning" | "informative" | "success" | "danger"> = {
  PENDIENTE: 'warning', APROBADO: 'success', RECHAZADO: 'danger', RECHAZADO_DEFINITIVO: 'danger', ARCHIVADO: 'neutral'
};

const estadoLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado (Espera Corrección)', RECHAZADO_DEFINITIVO: 'Rechazado Definitivo', ARCHIVADO: 'Archivado'
};

const getNombreArchivoDisplay = (nombre: string) => {
  try {
    if (nombre.startsWith('[')) {
      const arr = JSON.parse(nombre) as string[];
      if (arr.length === 1) {
        return `1 archivo: ${arr[0]}`;
      }
      return `${arr.length} archivos`;
    }
  } catch {}
  return nombre;
};

export default function Expedientes() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [jerarquia, setJerarquia] = useState<JerarquiaEmpresa[]>([]);
  const [todosFormularios, setTodosFormularios] = useState<Formulario[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'activos' | 'archivados'>('activos');

  // Advanced filters state
  const [filterTitulo, setFilterTitulo] = useState('');
  const [filterProyecto, setFilterProyecto] = useState(0);
  const [filterDisciplina, setFilterDisciplina] = useState(0);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [selEmpresa, setSelEmpresa] = useState(0);
  const [selArea, setSelArea] = useState(0);
  const [selProyecto, setSelProyecto] = useState(0);
  const [selDisciplina, setSelDisciplina] = useState(0);
  const [archivos, setArchivos] = useState<File[]>([]);

  // Dynamic form
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
   const [loadingForm, setLoadingForm] = useState(false);
  const [formularioBuscado, setFormularioBuscado] = useState(false);
  const [mostrarSelectorForm, setMostrarSelectorForm] = useState(false);
  const [selFormManual, setSelFormManual] = useState(0);

  // Procesos states
  const [procesosArea, setProcesosArea] = useState<any[]>([]);
  const [selProceso, setSelProceso] = useState(0);
  const [loadingProcesos, setLoadingProcesos] = useState(false);

  // Cargar procesos al cambiar el área seleccionada
  useEffect(() => {
    if (selArea > 0) {
      setLoadingProcesos(true);
      api.getProcesos(selArea)
        .then(procs => {
          const activeProcs = procs.filter(p => p.estado === 'activo');
          setProcesosArea(activeProcs);
          setSelProceso(0);
        })
        .catch(err => {
          console.error(err);
          setProcesosArea([]);
          setSelProceso(0);
        })
        .finally(() => setLoadingProcesos(false));
    } else {
      setProcesosArea([]);
      setSelProceso(0);
    }
  }, [selArea]);

  const loadExpedientes = async (tab: 'activos' | 'archivados') => {
    try {
      setLoading(true);
      const params = tab === 'archivados' 
        ? { estado: 'ARCHIVADO', incluir_archivados: true } 
        : {};
      const exp = await api.getExpedientes(params);
      setExpedientes(exp);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpedientes(activeTab);
  }, [activeTab]);

  useEffect(() => { loadData(); }, []);

  const handleArchivar = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea archivar este expediente? Esta acción lo ocultará de los dashboards y las bandejas de tareas.')) return;
    try {
      await api.archivarExpediente(id);
      setExpedientes(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      alert('Error al archivar expediente: ' + e.message);
    }
  };

  const handleDesarchivar = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea desarchivar este expediente? Esto lo restaurará a su estado anterior.')) return;
    try {
      await api.desarchivarExpediente(id);
      setExpedientes(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      alert('Error al desarchivar expediente: ' + e.message);
    }
  };

  const loadData = async () => {
    try {
      const [, jer, forms] = await Promise.all([
        loadExpedientes(activeTab),
        api.getJerarquia(),
        api.getFormularios()
      ]);
      setJerarquia(jer);
      setTodosFormularios(forms);

      if (user?.id_area) {
        for (const emp of jer) {
          const area = emp.areas.find(a => a.id === user.id_area);
          if (area) { setSelEmpresa(emp.id); setSelArea(area.id); break; }
        }
      }
    } catch (e) { console.error(e); }
  };

  // Auto-detectar formulario por proyecto+disciplina
  useEffect(() => {
    if (selProyecto > 0 && selDisciplina > 0) {
      setLoadingForm(true);
      setFormularioBuscado(false);
      setFormulario(null);
      setMostrarSelectorForm(false);
      setSelFormManual(0);
      api.buscarFormulario(selProyecto, selDisciplina)
        .then(f => { setFormulario(f); setRespuestas({}); })
        .catch(() => setFormulario(null))
        .finally(() => { setLoadingForm(false); setFormularioBuscado(true); });
    } else {
      setFormulario(null);
      setFormularioBuscado(false);
    }
  }, [selProyecto, selDisciplina]);

  // Cargar formulario seleccionado manualmente
  const aplicarFormularioManual = async (id: number) => {
    if (!id) { setFormulario(null); setRespuestas({}); return; }
    try {
      const f = await api.getFormulario(id);
      setFormulario(f);
      setRespuestas({});
    } catch (e) { console.error(e); }
  };

  // Flatten projects and disciplines from jerarquia for filter dropdowns
  const allProjects = jerarquia.flatMap(emp =>
    emp.areas.flatMap(a => a.proyectos)
  );

  // We filter disciplines by selected project to make it dynamic
  const filteredDisciplines = filterProyecto
    ? allProjects.find(p => p.id === filterProyecto)?.disciplinas || []
    : jerarquia.flatMap(emp => emp.areas.flatMap(a => a.proyectos.flatMap(p => p.disciplinas)));

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      const params: any = {
        titulo: filterTitulo || undefined,
        id_proyecto: filterProyecto || undefined,
        id_disciplina: filterDisciplina || undefined,
        estado: activeTab === 'archivados' ? 'ARCHIVADO' : (filterEstado || undefined),
        fecha_desde: filterFechaDesde || undefined,
        fecha_hasta: filterFechaHasta || undefined,
        incluir_archivados: activeTab === 'archivados' ? true : undefined,
      };
      const res = await api.getExpedientes(params);
      setExpedientes(res);
    } catch (e) {
      console.error(e);
      alert('Error al aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = async () => {
    setFilterTitulo('');
    setFilterProyecto(0);
    setFilterDisciplina(0);
    setFilterEstado('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    await loadExpedientes(activeTab);
  };

  const filtered = expedientes.filter(e =>
    e.titulo.toLowerCase().includes(search.toLowerCase()) ||
    e.nombre_archivo.toLowerCase().includes(search.toLowerCase())
  );

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
        // Combinar archivos evitando duplicados por nombre
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

  const handleCreate = async () => {
    if (!titulo || !selProyecto || !selDisciplina || archivos.length === 0) {
      alert('Completar todos los campos obligatorios y adjuntar al menos un archivo');
      return;
    }
    if (!selProceso) {
      alert('Debe seleccionar obligatoriamente a qué proceso pertenecerá el expediente.');
      return;
    }
    if (formulario) {
      for (const campo of formulario.campos) {
        if (campo.requerido && !respuestas[campo.id]) {
          alert(`El campo "${campo.etiqueta}" es obligatorio`);
          return;
        }
      }
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('id_proyecto', selProyecto.toString());
      formData.append('id_disciplina', selDisciplina.toString());
      formData.append('id_proceso', selProceso.toString());
      
      archivos.forEach(file => {
        formData.append('archivo', file);
      });

      if (formulario) {
        const respArray = Object.keys(respuestas).map(k => ({ id_campo: Number(k), valor: respuestas[Number(k)] }));
        formData.append('respuestas_formulario', JSON.stringify(respArray));
      }
      const nuevo = await api.createExpediente(formData);
      if (Array.isArray(nuevo)) {
        setExpedientes([...expedientes, ...nuevo]);
      } else {
        setExpedientes([...expedientes, nuevo]);
      }
      setIsDrawerOpen(false);
      resetForm();
    } catch (e: any) {
      alert(`Error al crear expediente: ${e.message}`);
    } finally { setIsSubmitting(false); }
  };

  const resetForm = () => {
    setTitulo(''); setSelProyecto(0); setSelDisciplina(0);
    setArchivos([]); setRespuestas({}); setFormulario(null);
    setFormularioBuscado(false); setMostrarSelectorForm(false); setSelFormManual(0);
    setSelProceso(0); setProcesosArea([]);
  };

  const currentEmpresa = jerarquia.find(e => e.id === selEmpresa);
  const currentArea = currentEmpresa?.areas.find(a => a.id === selArea);
  const currentProyecto = currentArea?.proyectos.find(p => p.id === selProyecto);

  const cardStyle: React.CSSProperties = {
    padding: 16, backgroundColor: 'var(--colorNeutralBackground1)', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text weight="semibold" size={800}>Expedientes</Text>
        {user?.rol !== 'lector' && user?.rol !== 'revisor' && (
          <Button appearance="primary" icon={<Add24Regular />} onClick={() => setIsDrawerOpen(true)}>
            Subir Expediente
          </Button>
        )}
      </div>

      {user?.rol === 'administrador' && (
        <TabList 
          selectedValue={activeTab} 
          onTabSelect={(_, data) => setActiveTab(data.value as any)} 
          style={{ marginBottom: 16 }}
        >
          <Tab value="activos">Expedientes Activos</Tab>
          <Tab value="archivados">Expedientes Archivados</Tab>
        </TabList>
      )}

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
          <Input contentBefore={<Search24Regular />} placeholder="Buscar en resultados..." value={search} onChange={(_, d) => setSearch(d.value)} style={{ width: 300 }} />
          <Button 
            icon={<Filter24Regular />} 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            appearance={showAdvancedFilters ? 'primary' : 'outline'}
          >
            {showAdvancedFilters ? 'Ocultar Filtros' : 'Filtros Avanzados'}
          </Button>
        </div>

        {showAdvancedFilters && (
          <div style={{ 
            backgroundColor: 'var(--colorNeutralBackground3)', 
            border: '1px solid var(--colorNeutralStroke1)', 
            borderRadius: 6, 
            padding: 16, 
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Field label="Buscar por Título">
                <Input value={filterTitulo} onChange={(_, d) => setFilterTitulo(d.value)} placeholder="Ej: Plano..." />
              </Field>

              <Field label="Proyecto">
                <select style={selectStyle} value={filterProyecto} onChange={e => { setFilterProyecto(Number(e.target.value)); setFilterDisciplina(0); }}>
                  <option value={0}>Todos los proyectos</option>
                  {allProjects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>

              <Field label="Disciplina">
                <select style={selectStyle} value={filterDisciplina} onChange={e => setFilterDisciplina(Number(e.target.value))}>
                  <option value={0}>Todas las disciplinas</option>
                  {filteredDisciplines.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </Field>

              {activeTab !== 'archivados' && (
                <Field label="Estado">
                  <select style={selectStyle} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="APROBADO">Aprobado</option>
                    <option value="RECHAZADO">Rechazado (Espera Corrección)</option>
                    <option value="RECHAZADO_DEFINITIVO">Rechazado Definitivo</option>
                  </select>
                </Field>
              )}

              <Field label="Desde (Fecha)">
                <input type="date" style={selectStyle} value={filterFechaDesde} onChange={e => setFilterFechaDesde(e.target.value)} />
              </Field>

              <Field label="Hasta (Fecha)">
                <input type="date" style={selectStyle} value={filterFechaHasta} onChange={e => setFilterFechaHasta(e.target.value)} />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button onClick={handleClearFilters} appearance="subtle">Limpiar</Button>
              <Button onClick={handleApplyFilters} appearance="primary" disabled={loading}>
                {loading ? <Spinner size="extra-tiny" /> : 'Aplicar Filtros'}
              </Button>
            </div>
          </div>
        )}
        {filtered.length === 0 ? (
          <Text style={{ color: 'var(--colorNeutralForeground4)', display: 'block', padding: 8 }}>No hay expedientes</Text>
        ) : (
          filtered.map(exp => (
            <div key={exp.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--colorNeutralStroke2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text weight="semibold">{exp.titulo}</Text>
                <Text block style={{ color: 'var(--colorNeutralForeground4)', fontSize: 12 }}>Versión {exp.version} • {getNombreArchivoDisplay(exp.nombre_archivo)}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, marginRight: 8, color: 'var(--colorNeutralForeground4)' }}>{new Date(exp.created_at).toLocaleDateString()}</Text>
                <Badge appearance="filled" color={estadoColors[exp.estado] || 'neutral'} style={{ marginRight: 8 }}>{estadoLabel[exp.estado] || exp.estado}</Badge>
                <Button icon={<FolderOpen24Regular />} appearance="subtle" onClick={() => navigate(`/expedientes/${exp.id}`)}>
                  Abrir
                </Button>
                {user?.rol === 'administrador' && exp.estado !== 'ARCHIVADO' && (
                  <Button icon={<Archive24Regular />} appearance="subtle" onClick={() => handleArchivar(exp.id)}>
                    Archivar
                  </Button>
                )}
                {user?.rol === 'administrador' && exp.estado === 'ARCHIVADO' && (
                  <Button icon={<Archive24Regular />} appearance="subtle" onClick={() => handleDesarchivar(exp.id)}>
                    Desarchivar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── DRAWER SUBIR ─────────────────────────────────── */}
      <Drawer open={isDrawerOpen} onOpenChange={(_, o) => { if (!o.open) { setIsDrawerOpen(false); resetForm(); } }} position="end" size="medium">
        <DrawerHeader>
          <Text weight="semibold" size={500}>Subir Nuevo Expediente</Text>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Título */}
            <Field label="Título del Documento" required>
              <Input value={titulo} onChange={(_, d) => setTitulo(d.value)} placeholder="Ej: Plano Estructural PE-001" />
            </Field>

            {/* Jerarquía */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Empresa" required>
                <select style={selectStyle} value={selEmpresa} onChange={e => { setSelEmpresa(Number(e.target.value)); setSelArea(0); setSelProyecto(0); setSelDisciplina(0); }}>
                  <option value={0}>Seleccionar...</option>
                  {jerarquia.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </Field>
              <Field label="Área" required>
                <select style={selectStyle} value={selArea} onChange={e => { setSelArea(Number(e.target.value)); setSelProyecto(0); setSelDisciplina(0); }}>
                  <option value={0}>Seleccionar...</option>
                  {currentEmpresa?.areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </Field>
            </div>

            {/* Proceso (Obligatorio) */}
            {selArea > 0 && (
              <div>
                {loadingProcesos ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <Spinner size="tiny" />
                    <Text size={200} style={{ color: 'var(--colorNeutralForeground4)' }}>Cargando procesos de aprobación...</Text>
                  </div>
                ) : procesosArea.length === 0 ? (
                  <div style={{ 
                    padding: '12px 16px', 
                    backgroundColor: 'var(--colorStatusDangerBackground1)', 
                    color: 'var(--colorStatusDangerForeground1)', 
                    borderRadius: 8, 
                    border: '1px solid var(--colorStatusDangerBorder1)',
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: '1.4'
                  }}>
                    ⚠️ En el área seleccionada no existen procesos activos, por lo que no se pueden crear expedientes.
                  </div>
                ) : (
                  <Field label="Proceso de Aprobación" required>
                    <select 
                      style={selectStyle} 
                      value={selProceso} 
                      onChange={e => setSelProceso(Number(e.target.value))}
                    >
                      <option value={0}>Seleccionar proceso...</option>
                      {procesosArea.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Proyecto" required>
                <select style={selectStyle} value={selProyecto} onChange={e => { setSelEmpresa(selEmpresa); setSelArea(selArea); setSelProyecto(Number(e.target.value)); setSelDisciplina(0); }}>
                  <option value={0}>Seleccionar...</option>
                  {currentArea?.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>
              <Field label="Disciplina" required>
                <select style={selectStyle} value={selDisciplina} onChange={e => setSelDisciplina(Number(e.target.value))}>
                  <option value={0}>Seleccionar...</option>
                  {currentProyecto?.disciplinas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </Field>
            </div>

            <Divider />

            {/* ── SECCIÓN FORMULARIO DINÁMICO ─────────────────── */}
            {selProyecto > 0 && selDisciplina > 0 && (
              <div>
                {loadingForm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spinner size="tiny" />
                    <Text size={200} style={{ color: 'var(--colorNeutralForeground4)' }}>Buscando formulario de metadatos...</Text>
                  </div>
                ) : formulario ? (
                  // ✅ Formulario auto-detectado o elegido manualmente
                  <div style={{ borderRadius: 8, border: '1px solid var(--colorBrandStroke1)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--colorBrandBackground2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Form24Regular style={{ color: 'var(--colorBrandBackground)' }} />
                        <div>
                          <Text weight="semibold" size={300}>{formulario.nombre}</Text>
                          <Text size={100} block style={{ color: 'var(--colorNeutralForeground3)' }}>{formulario.campos.length} campo(s) — Complete los metadatos del documento</Text>
                        </div>
                      </div>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<Dismiss24Regular />}
                        title="Quitar formulario"
                        onClick={() => { setFormulario(null); setRespuestas({}); setSelFormManual(0); setMostrarSelectorForm(false); }}
                      />
                    </div>
                    <div style={{ padding: 14, backgroundColor: 'var(--colorNeutralBackground1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {formulario.campos.map(c => (
                        <Field key={c.id} label={c.etiqueta} required={c.requerido} hint={!c.requerido ? 'Opcional' : undefined}>
                          {c.tipo === 'lista' ? (
                            <select style={selectStyle} value={respuestas[c.id] || ''} onChange={e => setRespuestas({ ...respuestas, [c.id]: e.target.value })}>
                              <option value="">Seleccionar...</option>
                              {c.opciones?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : c.tipo === 'fecha' ? (
                            <input type="date" style={selectStyle} value={respuestas[c.id] || ''} onChange={e => setRespuestas({ ...respuestas, [c.id]: e.target.value })} />
                          ) : (
                            <Input value={respuestas[c.id] || ''} onChange={(_, d) => setRespuestas({ ...respuestas, [c.id]: d.value })} />
                          )}
                        </Field>
                      ))}
                    </div>
                  </div>
                ) : formularioBuscado && !mostrarSelectorForm ? (
                  // ℹ️ Sin formulario auto-detectado → ofrecer agregar uno
                  <div style={{ padding: 14, backgroundColor: 'var(--colorNeutralBackground3)', borderRadius: 8, border: '1px dashed var(--colorNeutralStroke1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text weight="semibold" size={300} block>Sin formulario de metadatos configurado</Text>
                      <Text size={200} style={{ color: 'var(--colorNeutralForeground4)' }}>El documento se subirá sin campos adicionales.</Text>
                    </div>
                    {todosFormularios.length > 0 && (
                      <Button size="small" appearance="outline" icon={<Form24Regular />} onClick={() => setMostrarSelectorForm(true)}>
                        Agregar formulario
                      </Button>
                    )}
                  </div>
                ) : mostrarSelectorForm ? (
                  // 🗂️ Selector manual de formulario
                  <div style={{ padding: 14, backgroundColor: 'var(--colorStatusWarningBackground1)', borderRadius: 8, border: '1px solid var(--colorStatusWarningBorder1)' }}>
                    <Text weight="semibold" size={300} block style={{ marginBottom: 10 }}>Seleccionar formulario de metadatos</Text>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        style={{ ...selectStyle, flex: 1 }}
                        value={selFormManual}
                        onChange={e => setSelFormManual(Number(e.target.value))}
                      >
                        <option value={0}>— Elegir formulario —</option>
                        {todosFormularios.map(f => (
                          <option key={f.id} value={f.id}>{f.nombre} ({f.campos?.length ?? 0} campos)</option>
                        ))}
                      </select>
                      <Button size="small" appearance="primary" disabled={!selFormManual} onClick={() => aplicarFormularioManual(selFormManual)}>
                        Aplicar
                      </Button>
                      <Button size="small" appearance="subtle" onClick={() => setMostrarSelectorForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Archivos */}
            <Field label="Archivos" required hint="Puede seleccionar más de un archivo. Máximo 50MB por archivo.">
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
                        backgroundColor: 'var(--colorNeutralBackground3)',
                        borderRadius: 4,
                        borderLeft: '3px solid var(--colorBrandBackground)',
                      }}
                    >
                      <Text size={200} style={{ color: 'var(--colorNeutralForeground1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                        📄 {file.name} <span style={{ color: 'var(--colorNeutralForeground4)', marginLeft: 6 }}>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
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
          <Button appearance="secondary" onClick={() => { setIsDrawerOpen(false); resetForm(); }} disabled={isSubmitting}>Cancelar</Button>
          <Button 
            appearance="primary" 
            onClick={handleCreate} 
            disabled={isSubmitting || (selArea > 0 && !loadingProcesos && procesosArea.length === 0)}
          >
            {isSubmitting ? <Spinner size="extra-tiny" /> : 'Subir Expediente'}
          </Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%', 
  padding: '6px 8px', 
  borderRadius: 4, 
  border: '1px solid var(--colorNeutralStroke1)', 
  backgroundColor: 'var(--colorNeutralBackground1)',
  color: 'var(--colorNeutralForeground1)',
  fontFamily: 'inherit', 
  fontSize: 14
};