import { useEffect, useState } from 'react';
import {
  Text, Button, Badge, Input, Field, Spinner,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter, Select,
  Tab, TabList, Checkbox,
} from '@fluentui/react-components';
import {
  Add24Regular, Edit24Regular, Delete24Regular,
  Building24Regular, Folder24Regular,
  DocumentFolder24Regular, AppFolder24Regular, Form24Regular,
  Flowchart24Regular, Person24Regular, ArrowRight24Regular
} from '@fluentui/react-icons';
import { api, getCurrentUser } from '../api';
import type { Empresa, Area, Proyecto, Disciplina, Formulario, CampoFormulario, Proceso, Etapa, Usuario } from '../entities';

type TabId = 'empresas' | 'areas' | 'proyectos' | 'disciplinas' | 'formularios' | 'procesos';
type CampoTipo = 'texto' | 'lista' | 'fecha';

const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f0f0f0' };
const thStyle: React.CSSProperties = { ...cellStyle, fontWeight: 600, background: '#fafafa', borderBottom: '2px solid #eee', textAlign: 'left' };
const sel: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d1d1', fontFamily: 'inherit', fontSize: 14 };

const TIPOS: CampoTipo[] = ['texto', 'lista', 'fecha'];

interface CampoEdit {
  id?: number;
  nombre: string;
  etiqueta: string;
  tipo: CampoTipo;
  opciones: string;   // CSV para tipo lista
  requerido: boolean;
  orden: number;
}

function emptyCampo(orden: number): CampoEdit {
  return { nombre: '', etiqueta: '', tipo: 'texto', opciones: '', requerido: false, orden };
}

export default function Mantenedores() {
  const user = getCurrentUser();
  const [tab, setTab] = useState<TabId>('empresas');
  const [loading, setLoading] = useState(false);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [revisores, setRevisores] = useState<Usuario[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Workflow designer specific states
  const [expandedProcesos, setExpandedProcesos] = useState<Record<number, boolean>>({});
  const [procesoEtapas, setProcesoEtapas] = useState<Record<number, Etapa[]>>({});
  const [processDrawerOpen, setProcessDrawerOpen] = useState(false);
  const [stageDrawerOpen, setStageDrawerOpen] = useState(false);

  // Forms
  const [empForm, setEmpForm] = useState({ nombre: '', rut: '' });
  const [areaForm, setAreaForm] = useState({ nombre: '', id_empresa: 0 });
  const [proyForm, setProyForm] = useState({ nombre: '', id_area: 0, descripcion: '' });
  const [discForm, setDiscForm] = useState({ nombre: '', id_proyecto: 0 });
  const [formForm, setFormForm] = useState({ nombre: '', id_proyecto: 0, id_disciplina: 0 });
  const [campos, setCampos] = useState<CampoEdit[]>([emptyCampo(1)]);
  const [procesoForm, setProcesoForm] = useState({ nombre: '', id_area: 0 });
  const [etapaForm, setEtapaForm] = useState({ nombre: '', orden: 1, id_revisor: 0, id_proceso: 0 });

  const [procesoEtapasForm, setProcesoEtapasForm] = useState<{ nombre: string; id_revisor: number }[]>([]);

  const [editProcesoId, setEditProcesoId] = useState<number | null>(null);
  const [editEtapaId, setEditEtapaId] = useState<number | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, a, p, d, fList, procs, usrs] = await Promise.all([
        api.getEmpresas(), api.getAreas(), api.getProyectos(),
        api.getDisciplinas(), api.getFormularios(),
        api.getProcesos(), api.getUsuarios()
      ]);
      // Cargar cada formulario con sus campos para mostrar conteo correcto
      const fFull = await Promise.all(fList.map(f => api.getFormulario(f.id)));
      setEmpresas(e); setAreas(a); setProyectos(p); setDisciplinas(d); setFormularios(fFull);
      setProcesos(procs);
      setRevisores(usrs.filter(u => u.rol === 'revisor'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleProceso = async (procId: number) => {
    const isExpanded = !expandedProcesos[procId];
    setExpandedProcesos(prev => ({ ...prev, [procId]: isExpanded }));
    if (isExpanded && !procesoEtapas[procId]) {
      try {
        const ets = await api.getEtapas(procId);
        setProcesoEtapas(prev => ({ ...prev, [procId]: ets }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const refreshEtapas = async (procId: number) => {
    try {
      const ets = await api.getEtapas(procId);
      setProcesoEtapas(prev => ({ ...prev, [procId]: ets }));
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.rol !== 'administrador') return <Text>No tienes permisos para acceder a mantenedores.</Text>;

  const openCreate = () => {
    if (tab === 'procesos') {
      setEditProcesoId(null);
      setProcesoForm({ nombre: '', id_area: 0 });
      setProcesoEtapasForm([]);
      setProcessDrawerOpen(true);
      return;
    }
    setEditId(null);
    setEmpForm({ nombre: '', rut: '' });
    setAreaForm({ nombre: '', id_empresa: 0 });
    setProyForm({ nombre: '', id_area: 0, descripcion: '' });
    setDiscForm({ nombre: '', id_proyecto: 0 });
    setFormForm({ nombre: '', id_proyecto: 0, id_disciplina: 0 });
    setCampos([emptyCampo(1)]);
    setDrawerOpen(true);
  };

  const openEditProceso = (proc: Proceso) => {
    setEditProcesoId(proc.id);
    setProcesoForm({ nombre: proc.nombre, id_area: proc.id_area });
    setProcessDrawerOpen(true);
  };

  const openCreateEtapa = (procesoId: number) => {
    setEditEtapaId(null);
    const currentEtapas = procesoEtapas[procesoId] || [];
    const nextOrden = currentEtapas.length > 0 ? Math.max(...currentEtapas.map(et => et.orden)) + 1 : 1;
    setEtapaForm({ nombre: '', orden: nextOrden, id_revisor: 0, id_proceso: procesoId });
    setStageDrawerOpen(true);
  };

  const openEditEtapa = (procesoId: number, et: Etapa) => {
    setEditEtapaId(et.id);
    setEtapaForm({ nombre: et.nombre, orden: et.orden, id_revisor: et.id_revisor || 0, id_proceso: procesoId });
    setStageDrawerOpen(true);
  };

  const openEditForm = async (f: Formulario) => {
    setEditId(f.id);
    setFormForm({
      nombre: f.nombre,
      id_proyecto: (f as any).id_proyecto ?? 0,
      id_disciplina: f.id_disciplina ?? 0,
    });
    // Cargar campos completos
    try {
      const full = await api.getFormulario(f.id);
      const cs = (full.campos || []).map((c: CampoFormulario) => ({
        id: c.id,
        nombre: c.nombre,
        etiqueta: c.etiqueta,
        tipo: c.tipo as CampoTipo,
        opciones: Array.isArray(c.opciones) ? c.opciones.join(', ') : '',
        requerido: c.requerido,
        orden: c.orden,
      }));
      setCampos(cs.length ? cs : [emptyCampo(1)]);
    } catch { setCampos([emptyCampo(1)]); }
    setDrawerOpen(true);
  };

  const openEditEntity = (entity: Empresa | Area | Proyecto | Disciplina) => {
    setEditId(entity.id);
    if (tab === 'empresas') { const e = entity as Empresa; setEmpForm({ nombre: e.nombre, rut: e.rut || '' }); }
    else if (tab === 'areas') { const a = entity as Area; setAreaForm({ nombre: a.nombre, id_empresa: a.id_empresa }); }
    else if (tab === 'proyectos') { const p = entity as Proyecto; setProyForm({ nombre: p.nombre, id_area: p.id_area, descripcion: p.descripcion || '' }); }
    else { const d = entity as Disciplina; setDiscForm({ nombre: d.nombre, id_proyecto: d.id_proyecto }); }
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    try {
      if (tab === 'empresas') {
        if (!empForm.nombre) { alert('Nombre requerido'); return; }
        if (editId) { const u = await api.updateEmpresa(editId, empForm); setEmpresas(empresas.map(e => e.id === editId ? u : e)); }
        else { const n = await api.createEmpresa(empForm); setEmpresas([...empresas, n]); }
      } else if (tab === 'areas') {
        if (!areaForm.nombre || !areaForm.id_empresa) { alert('Nombre y empresa requeridos'); return; }
        if (editId) { const u = await api.updateArea(editId, { nombre: areaForm.nombre }); setAreas(areas.map(a => a.id === editId ? u : a)); }
        else { const n = await api.createArea(areaForm); setAreas([...areas, n]); }
      } else if (tab === 'proyectos') {
        if (!proyForm.nombre || !proyForm.id_area) { alert('Nombre y área requeridos'); return; }
        if (editId) { const u = await api.updateProyecto(editId, { nombre: proyForm.nombre, descripcion: proyForm.descripcion }); setProyectos(proyectos.map(p => p.id === editId ? u : p)); }
        else { const n = await api.createProyecto(proyForm); setProyectos([...proyectos, n]); }
      } else if (tab === 'disciplinas') {
        if (!discForm.nombre || !discForm.id_proyecto) { alert('Nombre y proyecto requeridos'); return; }
        if (editId) { const u = await api.updateDisciplina(editId, { nombre: discForm.nombre }); setDisciplinas(disciplinas.map(d => d.id === editId ? u : d)); }
        else { const n = await api.createDisciplina(discForm); setDisciplinas([...disciplinas, n]); }
      } else {
        // Formularios
        if (!formForm.nombre) { alert('Nombre del formulario requerido'); return; }
        const payload = {
          nombre: formForm.nombre,
          id_proyecto: formForm.id_proyecto || null,
          id_disciplina: formForm.id_disciplina || null,
          campos: campos.map((c, i) => ({
            ...(c.id ? { id: c.id } : {}),
            nombre: c.nombre || `campo_${i + 1}`,
            etiqueta: c.etiqueta || `Campo ${i + 1}`,
            tipo: c.tipo,
            opciones: c.tipo === 'lista' ? c.opciones.split(',').map(o => o.trim()).filter(Boolean) : null,
            requerido: c.requerido,
            orden: i + 1,
          })),
        };
        if (editId) {
          await api.updateFormulario(editId, payload);
          const full = await api.getFormulario(editId);
          setFormularios(formularios.map(f => f.id === editId ? full : f));
        } else {
          const n = await api.createFormulario(payload);
          const full = await api.getFormulario(n.id);
          setFormularios([...formularios, full]);
        }
      }
      setDrawerOpen(false);
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleSaveProceso = async () => {
    if (!procesoForm.nombre || !procesoForm.id_area) { alert('Nombre y área requeridos'); return; }
    
    // Only enforce stages on creation
    if (!editProcesoId) {
      if (procesoEtapasForm.length === 0) {
        alert('Debe agregar al menos una etapa para crear el proceso.');
        return;
      }
      for (const et of procesoEtapasForm) {
        if (!et.nombre.trim() || !et.id_revisor) {
          alert('Todas las etapas deben tener un nombre y un revisor asignado.');
          return;
        }
      }
    }

    try {
      if (editProcesoId) {
        const updated = await api.updateProceso(editProcesoId, procesoForm);
        setProcesos(procesos.map(p => p.id === editProcesoId ? updated : p));
      } else {
        const created = await api.createProceso({
          nombre: procesoForm.nombre,
          id_area: procesoForm.id_area,
          etapas: procesoEtapasForm.map((et, idx) => ({
            nombre: et.nombre,
            orden: idx + 1,
            id_revisor: et.id_revisor
          }))
        });
        setProcesos([...procesos, created]);
      }
      setProcessDrawerOpen(false);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleSaveEtapa = async () => {
    if (!etapaForm.nombre || !etapaForm.orden || !etapaForm.id_proceso) { alert('Nombre, orden y proceso son requeridos'); return; }
    try {
      const payload = {
        nombre: etapaForm.nombre,
        orden: Number(etapaForm.orden),
        id_proceso: etapaForm.id_proceso,
        id_revisor: etapaForm.id_revisor ? Number(etapaForm.id_revisor) : null
      };
      if (editEtapaId) {
        await api.updateEtapa(editEtapaId, payload);
      } else {
        await api.createEtapa(payload);
      }
      refreshEtapas(etapaForm.id_proceso);
      setStageDrawerOpen(false);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const toggleProcesoEstado = async (proc: Proceso) => {
    const nuevoEstado = proc.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      const updated = await api.updateProceso(proc.id, { nombre: proc.nombre, id_area: proc.id_area, estado: nuevoEstado });
      setProcesos(procesos.map(p => p.id === proc.id ? updated : p));
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const toggleEstado = async (entity: Empresa | Area | Proyecto | Disciplina, t: TabId) => {
    const nuevo = entity.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      if (t === 'empresas') { const u = await api.updateEmpresaEstado(entity.id, nuevo); setEmpresas(empresas.map(e => e.id === entity.id ? u : e)); }
      else if (t === 'areas') { const u = await api.updateAreaEstado(entity.id, nuevo); setAreas(areas.map(a => a.id === entity.id ? u : a)); }
      else if (t === 'proyectos') { const u = await api.updateProyectoEstado(entity.id, nuevo); setProyectos(proyectos.map(p => p.id === entity.id ? u : p)); }
      else { const u = await api.updateDisciplinaEstado(entity.id, nuevo); setDisciplinas(disciplinas.map(d => d.id === entity.id ? u : d)); }
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const empresaNombre = (id: number) => empresas.find(e => e.id === id)?.nombre ?? '-';
  const areaNombre = (id: number) => areas.find(a => a.id === id)?.nombre ?? '-';
  const proyectoNombre = (id: number) => proyectos.find(p => p.id === id)?.nombre ?? '-';
  const disciplinaNombre = (id: number) => disciplinas.find(d => d.id === id)?.nombre ?? '-';

  const tabLabel: Record<TabId, string> = {
    empresas: 'Nueva Empresa', areas: 'Nueva Área', proyectos: 'Nuevo Proyecto',
    disciplinas: 'Nueva Disciplina', formularios: 'Nuevo Formulario', procesos: 'Nuevo Proceso'
  };

  const accionCampo = (idx: number, key: keyof CampoEdit, val: any) =>
    setCampos(campos.map((c, i) => i === idx ? { ...c, [key]: val } : c));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Text weight="semibold" size={800}>Mantenedores</Text>
          <Text block style={{ color: 'gray', marginTop: 2 }}>Gestión de Empresas, Áreas, Proyectos, Disciplinas y Formularios</Text>
        </div>
        <Button appearance="primary" icon={<Add24Regular />} onClick={openCreate}>{tabLabel[tab]}</Button>
      </div>

      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as TabId)} style={{ marginBottom: 16 }}>
        <Tab icon={<Building24Regular />} value="empresas">Empresas</Tab>
        <Tab icon={<Folder24Regular />} value="areas">Áreas</Tab>
        <Tab icon={<DocumentFolder24Regular />} value="proyectos">Proyectos</Tab>
        <Tab icon={<AppFolder24Regular />} value="disciplinas">Disciplinas</Tab>
        <Tab icon={<Form24Regular />} value="formularios">Formularios</Tab>
        <Tab icon={<Flowchart24Regular />} value="procesos">Diseñador de Flujos</Tab>
      </TabList>

      <div style={{ backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : (
          <>
            {/* EMPRESAS */}
            {tab === 'empresas' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Nombre</th><th style={thStyle}>RUT</th><th style={thStyle}>Estado</th><th style={thStyle}>Acciones</th></tr></thead>
                <tbody>
                  {empresas.length === 0
                    ? <tr><td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'gray' }}>Sin empresas</td></tr>
                    : empresas.map(e => (
                      <tr key={e.id}>
                        <td style={cellStyle}><Text weight="semibold">{e.nombre}</Text></td>
                        <td style={cellStyle}>{e.rut || '-'}</td>
                        <td style={cellStyle}><Badge color={e.estado === 'activo' ? 'success' : 'danger'}>{e.estado}</Badge></td>
                        <td style={cellStyle}>
                          <Button size="small" appearance="subtle" icon={<Edit24Regular />} onClick={() => openEditEntity(e)}>Editar</Button>
                          <Button size="small" appearance="subtle" onClick={() => toggleEstado(e, 'empresas')}>{e.estado === 'activo' ? 'Desactivar' : 'Activar'}</Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* ÁREAS */}
            {tab === 'areas' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Nombre</th><th style={thStyle}>Empresa</th><th style={thStyle}>Estado</th><th style={thStyle}>Acciones</th></tr></thead>
                <tbody>
                  {areas.length === 0
                    ? <tr><td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'gray' }}>Sin áreas</td></tr>
                    : areas.map(a => (
                      <tr key={a.id}>
                        <td style={cellStyle}><Text weight="semibold">{a.nombre}</Text></td>
                        <td style={cellStyle}>{empresaNombre(a.id_empresa)}</td>
                        <td style={cellStyle}><Badge color={a.estado === 'activo' ? 'success' : 'danger'}>{a.estado}</Badge></td>
                        <td style={cellStyle}>
                          <Button size="small" appearance="subtle" icon={<Edit24Regular />} onClick={() => openEditEntity(a)}>Editar</Button>
                          <Button size="small" appearance="subtle" onClick={() => toggleEstado(a, 'areas')}>{a.estado === 'activo' ? 'Desactivar' : 'Activar'}</Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* PROYECTOS */}
            {tab === 'proyectos' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Nombre</th><th style={thStyle}>Área</th><th style={thStyle}>Descripción</th><th style={thStyle}>Estado</th><th style={thStyle}>Acciones</th></tr></thead>
                <tbody>
                  {proyectos.length === 0
                    ? <tr><td colSpan={5} style={{ ...cellStyle, textAlign: 'center', color: 'gray' }}>Sin proyectos</td></tr>
                    : proyectos.map(p => (
                      <tr key={p.id}>
                        <td style={cellStyle}><Text weight="semibold">{p.nombre}</Text></td>
                        <td style={cellStyle}>{areaNombre(p.id_area)}</td>
                        <td style={cellStyle}><Text style={{ color: 'gray' }}>{p.descripcion || '-'}</Text></td>
                        <td style={cellStyle}><Badge color={p.estado === 'activo' ? 'success' : 'danger'}>{p.estado}</Badge></td>
                        <td style={cellStyle}>
                          <Button size="small" appearance="subtle" icon={<Edit24Regular />} onClick={() => openEditEntity(p)}>Editar</Button>
                          <Button size="small" appearance="subtle" onClick={() => toggleEstado(p, 'proyectos')}>{p.estado === 'activo' ? 'Desactivar' : 'Activar'}</Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* DISCIPLINAS */}
            {tab === 'disciplinas' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Nombre</th><th style={thStyle}>Proyecto</th><th style={thStyle}>Estado</th><th style={thStyle}>Acciones</th></tr></thead>
                <tbody>
                  {disciplinas.length === 0
                    ? <tr><td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'gray' }}>Sin disciplinas</td></tr>
                    : disciplinas.map(d => (
                      <tr key={d.id}>
                        <td style={cellStyle}><Text weight="semibold">{d.nombre}</Text></td>
                        <td style={cellStyle}>{proyectoNombre(d.id_proyecto)}</td>
                        <td style={cellStyle}><Badge color={d.estado === 'activo' ? 'success' : 'danger'}>{d.estado}</Badge></td>
                        <td style={cellStyle}>
                          <Button size="small" appearance="subtle" icon={<Edit24Regular />} onClick={() => openEditEntity(d)}>Editar</Button>
                          <Button size="small" appearance="subtle" onClick={() => toggleEstado(d, 'disciplinas')}>{d.estado === 'activo' ? 'Desactivar' : 'Activar'}</Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* FORMULARIOS */}
            {tab === 'formularios' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Nombre</th><th style={thStyle}>Proyecto</th><th style={thStyle}>Disciplina</th><th style={thStyle}>Campos</th><th style={thStyle}>Acciones</th></tr></thead>
                <tbody>
                  {formularios.length === 0
                    ? <tr><td colSpan={5} style={{ ...cellStyle, textAlign: 'center', color: 'gray' }}>Sin formularios. Crea uno para asociarlo a un proyecto/disciplina.</td></tr>
                    : formularios.map(f => (
                      <tr key={f.id}>
                        <td style={cellStyle}><Text weight="semibold">{f.nombre}</Text></td>
                        <td style={cellStyle}>{proyectoNombre((f as any).id_proyecto)}</td>
                        <td style={cellStyle}>{disciplinaNombre(f.id_disciplina)}</td>
                        <td style={cellStyle}><Badge appearance="tint" color="brand">{(f.campos || []).length} campos</Badge></td>
                        <td style={cellStyle}>
                          <Button size="small" appearance="subtle" icon={<Edit24Regular />} onClick={() => openEditForm(f)}>Editar</Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* PROCESOS */}
            {tab === 'procesos' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {procesos.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'gray' }}>Sin procesos creados.</div>
                ) : (
                  procesos.map(proc => {
                    const isExpanded = expandedProcesos[proc.id];
                    const etapas = procesoEtapas[proc.id] || [];
                    return (
                      <div key={proc.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fafafa' }}>
                        <div style={{ 
                          padding: '12px 16px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          backgroundColor: '#f1f5f9', 
                          cursor: 'pointer',
                          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                        }} onClick={() => toggleProceso(proc.id)}>
                          <div>
                            <Text weight="semibold" style={{ fontSize: 16 }}>{proc.nombre}</Text>
                            <Text block size={200} style={{ color: 'gray' }}>Área: {areaNombre(proc.id_area)}</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                            <Badge color={proc.estado === 'activo' ? 'success' : 'danger'}>{proc.estado}</Badge>
                            <Button size="small" appearance="subtle" icon={<Edit24Regular />} onClick={() => openEditProceso(proc)}>Editar</Button>
                            <Button size="small" appearance="subtle" onClick={() => toggleProcesoEstado(proc)}>
                              {proc.estado === 'activo' ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button size="small" appearance="subtle" onClick={() => toggleProceso(proc.id)}>
                              {isExpanded ? 'Contraer' : 'Expandir'}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: 16, backgroundColor: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <Text weight="semibold">Flujo de Aprobación (Etapas)</Text>
                              <Button size="small" appearance="primary" icon={<Add24Regular />} onClick={() => openCreateEtapa(proc.id)}>
                                Agregar Etapa
                              </Button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0' }}>
                              {etapas.length === 0 ? (
                                <Text style={{ color: 'gray', fontStyle: 'italic' }}>Este proceso no tiene etapas. Agrega una para comenzar.</Text>
                              ) : (
                                etapas.map((etapa, idx) => (
                                  <div key={etapa.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {idx > 0 && <ArrowRight24Regular style={{ color: '#0078d4' }} />}
                                    
                                    <div style={{ 
                                      padding: '12px 16px', 
                                      border: '1px solid #c5d0f0', 
                                      borderRadius: 8, 
                                      backgroundColor: '#f0f4ff', 
                                      minWidth: 160,
                                      position: 'relative',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <Badge appearance="tint" color="brand">#{etapa.orden}</Badge>
                                        <Button size="small" appearance="subtle" icon={<Edit24Regular />} onClick={() => openEditEtapa(proc.id, etapa)} />
                                      </div>
                                      <Text weight="semibold" block style={{ fontSize: 14 }}>{etapa.nombre}</Text>
                                      <Text size={100} style={{ color: 'gray', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <Person24Regular style={{ fontSize: 12 }} />
                                        {etapa.revisor_nombre || 'Sin revisor'}
                                      </Text>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* DRAWER */}
      <Drawer open={drawerOpen} onOpenChange={(_, o) => setDrawerOpen(o.open)} position="end" size={tab === 'formularios' ? 'medium' : 'small'}>
        <DrawerHeader>
          <Text weight="semibold" size={500}>
            {editId ? 'Editar' : 'Nuevo'} {{ empresas: 'Empresa', areas: 'Área', proyectos: 'Proyecto', disciplinas: 'Disciplina', formularios: 'Formulario' }[tab]}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>

            {/* Empresa */}
            {tab === 'empresas' && <>
              <Field label="Nombre" required><Input value={empForm.nombre} onChange={(_, d) => setEmpForm({ ...empForm, nombre: d.value })} /></Field>
              <Field label="RUT"><Input value={empForm.rut} onChange={(_, d) => setEmpForm({ ...empForm, rut: d.value })} placeholder="76.123.456-7" /></Field>
            </>}

            {/* Área */}
            {tab === 'areas' && <>
              <Field label="Nombre" required><Input value={areaForm.nombre} onChange={(_, d) => setAreaForm({ ...areaForm, nombre: d.value })} /></Field>
              {!editId && <Field label="Empresa" required>
                <Select value={areaForm.id_empresa} onChange={e => setAreaForm({ ...areaForm, id_empresa: Number(e.target.value) })}>
                  <option value={0}>Seleccionar...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </Select>
              </Field>}
            </>}

            {/* Proyecto */}
            {tab === 'proyectos' && <>
              <Field label="Nombre" required><Input value={proyForm.nombre} onChange={(_, d) => setProyForm({ ...proyForm, nombre: d.value })} /></Field>
              <Field label="Descripción"><Input value={proyForm.descripcion} onChange={(_, d) => setProyForm({ ...proyForm, descripcion: d.value })} /></Field>
              {!editId && <Field label="Área" required>
                <Select value={proyForm.id_area} onChange={e => setProyForm({ ...proyForm, id_area: Number(e.target.value) })}>
                  <option value={0}>Seleccionar...</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </Select>
              </Field>}
            </>}

            {/* Disciplina */}
            {tab === 'disciplinas' && <>
              <Field label="Nombre" required><Input value={discForm.nombre} onChange={(_, d) => setDiscForm({ ...discForm, nombre: d.value })} /></Field>
              {!editId && <Field label="Proyecto" required>
                <Select value={discForm.id_proyecto} onChange={e => setDiscForm({ ...discForm, id_proyecto: Number(e.target.value) })}>
                  <option value={0}>Seleccionar...</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Select>
              </Field>}
            </>}

            {/* Formulario */}
            {tab === 'formularios' && <>
              <Field label="Nombre del formulario" required>
                <Input value={formForm.nombre} onChange={(_, d) => setFormForm({ ...formForm, nombre: d.value })} placeholder="Ej: Formulario Mecánica" />
              </Field>
              <Field label="Proyecto (opcional)">
                <select style={sel} value={formForm.id_proyecto} onChange={e => setFormForm({ ...formForm, id_proyecto: Number(e.target.value) })}>
                  <option value={0}>Cualquier proyecto</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>
              <Field label="Disciplina (opcional)">
                <select style={sel} value={formForm.id_disciplina} onChange={e => setFormForm({ ...formForm, id_disciplina: Number(e.target.value) })}>
                  <option value={0}>Cualquier disciplina</option>
                  {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </Field>

              <div style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text weight="semibold">Campos del formulario</Text>
                  <Button size="small" icon={<Add24Regular />} onClick={() => setCampos([...campos, emptyCampo(campos.length + 1)])}>
                    Agregar campo
                  </Button>
                </div>

                {campos.map((c, idx) => (
                  <div key={idx} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text weight="semibold" size={200}>Campo {idx + 1}</Text>
                      {campos.length > 1 && (
                        <Button size="small" appearance="subtle" icon={<Delete24Regular />} onClick={() => setCampos(campos.filter((_, i) => i !== idx))} />
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <Field label="Etiqueta (visible)">
                        <Input size="small" value={c.etiqueta} onChange={(_, d) => accionCampo(idx, 'etiqueta', d.value)} placeholder="Ej: Número de plano" />
                      </Field>
                      <Field label="Tipo">
                        <select style={{ ...sel, padding: '4px 8px' }} value={c.tipo} onChange={e => accionCampo(idx, 'tipo', e.target.value)}>
                          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                    </div>
                    {c.tipo === 'lista' && (
                      <Field label="Opciones (separadas por coma)" style={{ marginTop: 8 }}>
                        <Input size="small" value={c.opciones} onChange={(_, d) => accionCampo(idx, 'opciones', d.value)} placeholder="Opción 1, Opción 2, Opción 3" />
                      </Field>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <Checkbox label="Campo obligatorio" checked={c.requerido} onChange={(_, d) => accionCampo(idx, 'requerido', d.checked)} />
                    </div>
                  </div>
                ))}
              </div>
            </>}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
          <Button appearance="primary" onClick={handleSave}>{editId ? 'Guardar cambios' : 'Crear'}</Button>
        </DrawerFooter>
      </Drawer>

      {/* DRAWER NUEVO/EDITAR PROCESO */}
      <Drawer open={processDrawerOpen} onOpenChange={(_, o) => setProcessDrawerOpen(o.open)} position="end" size="medium">
        <DrawerHeader>
          <Text weight="semibold" size={500}>
            {editProcesoId ? 'Editar Proceso' : 'Nuevo Proceso'}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <Field label="Nombre del Proceso" required>
              <Input value={procesoForm.nombre} onChange={(_, d) => setProcesoForm({ ...procesoForm, nombre: d.value })} placeholder="Ej: Proceso de Aprobación Civil" />
            </Field>
            <Field label="Área de Aprobación" required>
              <Select 
                value={procesoForm.id_area} 
                onChange={e => {
                  setProcesoForm({ ...procesoForm, id_area: Number(e.target.value) });
                  setProcesoEtapasForm([]);
                }}
              >
                <option value={0}>Seleccionar área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </Select>
            </Field>

            {/* Listado de etapas para creación obligatoria */}
            {!editProcesoId && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text weight="semibold">Etapas del Proceso</Text>
                  <Button 
                    size="small" 
                    icon={<Add24Regular />} 
                    disabled={!procesoForm.id_area}
                    onClick={() => setProcesoEtapasForm([...procesoEtapasForm, { nombre: '', id_revisor: 0 }])}
                  >
                    Agregar Etapa
                  </Button>
                </div>
                
                {!procesoForm.id_area && (
                  <Text size={200} style={{ color: 'gray', fontStyle: 'italic' }}>
                    Seleccione un área para poder agregar etapas.
                  </Text>
                )}

                {procesoForm.id_area && procesoEtapasForm.length === 0 && (
                  <Text size={200} style={{ color: '#d13438', fontStyle: 'italic' }}>
                    Debe agregar al menos una etapa para este proceso.
                  </Text>
                )}

                {procesoForm.id_area && procesoEtapasForm.map((et, idx) => (
                  <div key={idx} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text weight="semibold" size={200}>Etapa #{idx + 1}</Text>
                      <Button size="small" appearance="subtle" icon={<Delete24Regular />} onClick={() => setProcesoEtapasForm(procesoEtapasForm.filter((_, i) => i !== idx))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <Field label="Nombre de Etapa" required>
                        <Input 
                          size="small" 
                          value={et.nombre} 
                          onChange={(_, d) => setProcesoEtapasForm(procesoEtapasForm.map((item, i) => i === idx ? { ...item, nombre: d.value } : item))} 
                          placeholder="Ej: Revisión Técnica" 
                        />
                      </Field>
                      <Field label="Revisor Asignado" required>
                        <select 
                          style={{ ...sel, padding: '4px 8px' }} 
                          value={et.id_revisor} 
                          onChange={e => setProcesoEtapasForm(procesoEtapasForm.map((item, i) => i === idx ? { ...item, id_revisor: Number(e.target.value) } : item))}
                        >
                          <option value={0}>Seleccionar...</option>
                          {revisores.filter(r => r.id_area === procesoForm.id_area).map(r => (
                            <option key={r.id} value={r.id}>{r.nombre}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => setProcessDrawerOpen(false)}>Cancelar</Button>
          <Button appearance="primary" onClick={handleSaveProceso}>{editProcesoId ? 'Guardar' : 'Crear'}</Button>
        </DrawerFooter>
      </Drawer>

      {/* DRAWER NUEVO/EDITAR ETAPA */}
      <Drawer open={stageDrawerOpen} onOpenChange={(_, o) => setStageDrawerOpen(o.open)} position="end" size="small">
        <DrawerHeader>
          <Text weight="semibold" size={500}>
            {editEtapaId ? 'Editar Etapa' : 'Nueva Etapa'}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <Field label="Nombre de la Etapa" required>
              <Input value={etapaForm.nombre} onChange={(_, d) => setEtapaForm({ ...etapaForm, nombre: d.value })} placeholder="Ej: Revisión Inicial" />
            </Field>
            <Field label="Orden del Flujo" required hint="El número secuencial en el que se ejecuta la etapa">
              <Input type="number" value={String(etapaForm.orden)} onChange={(_, d) => setEtapaForm({ ...etapaForm, orden: Number(d.value) })} />
            </Field>
            <Field label="Revisor Asignado" required>
              <Select value={etapaForm.id_revisor} onChange={e => setEtapaForm({ ...etapaForm, id_revisor: Number(e.target.value) })}>
                <option value={0}>Seleccionar revisor...</option>
                {revisores.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.email})</option>)}
              </Select>
            </Field>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => setStageDrawerOpen(false)}>Cancelar</Button>
          <Button appearance="primary" onClick={handleSaveEtapa}>{editEtapaId ? 'Guardar' : 'Crear'}</Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}
