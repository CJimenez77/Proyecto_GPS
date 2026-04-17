import { useEffect, useState } from 'react';
import { Button, Text, Badge, Input, Field, Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@fluentui/react-components';
import { Add24Regular, Search24Regular } from '@fluentui/react-icons';
import { api } from '../api';
import type { Expediente, Area, Contratista } from '../entities';

const estadoColors: Record<Expediente['estado'], "neutral" | "warning" | "informative" | "success" | "danger"> = {
  borrador: 'neutral', en_revision: 'warning', en_aprobacion: 'informative', cerrado: 'success', rechazado: 'danger'
};
const estadoText: Record<Expediente['estado'], string> = {
  borrador: 'Borrador', en_revision: 'En Revisión', en_aprobacion: 'En Aprobación', cerrado: 'Cerrado', rechazado: 'Rechazado'
};

export default function Expedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [contratistas, setContratistas] = useState<Contratista[]>([]);
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '', area_id: 0, contratista_id: 0 });

  useEffect(() => {
    api.getExpedientes().then(setExpedientes).catch(console.error);
    api.getAreas().then(setAreas).catch(console.error);
    api.getContratistas().then(setContratistas).catch(console.error);
  }, []);

  const filtered = expedientes.filter(e => 
    e.titulo.toLowerCase().includes(search.toLowerCase()) || 
    e.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      const nuevo = await api.createExpediente({ ...form, estado: 'borrador' as const });
      setExpedientes([...expedientes, nuevo]);
      setIsDrawerOpen(false);
      setForm({ titulo: '', descripcion: '', area_id: 0, contratista_id: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text weight="semibold" size={800}>Expedientes</Text>
        <Button appearance="primary" icon={<Add24Regular />} onClick={() => setIsDrawerOpen(true)}>
          Nuevo Expediente
        </Button>
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <Input contentBefore={<Search24Regular />} placeholder="Buscar..." value={search} onChange={(e, d) => setSearch(d.value)} style={{ width: 300 }} />
        </div>

        {filtered.length === 0 ? (
          <Text>No hay expedientes</Text>
        ) : (
          filtered.map(exp => (
            <div key={exp.id} style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Text weight="semibold">{exp.titulo}</Text>
                <Text block style={{ color: 'gray', fontSize: 12 }}>{exp.descripcion}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Text style={{ fontSize: 12 }}>{new Date(exp.created_at).toLocaleDateString()}</Text>
                <Badge appearance="filled" color={estadoColors[exp.estado]}>{estadoText[exp.estado]}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={(_, o) => setIsDrawerOpen(o.open)}>
        <DrawerHeader>
          <Text weight="semibold" size={500}>Nuevo Expediente</Text>
        </DrawerHeader>
        <DrawerBody>
          <Field label="Título">
            <Input value={form.titulo} onChange={(e, d) => setForm({ ...form, titulo: d.value })} />
          </Field>
          <Field label="Descripción" style={{ marginTop: 16 }}>
            <Input value={form.descripcion} onChange={(e, d) => setForm({ ...form, descripcion: d.value })} />
          </Field>
          <Field label="Contratista" style={{ marginTop: 16 }}>
            <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }} value={form.contratista_id} onChange={e => setForm({ ...form, contratista_id: Number(e.target.value) })}>
              <option value={0}>Seleccionar...</option>
              {contratistas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Área" style={{ marginTop: 16 }}>
            <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }} value={form.area_id} onChange={e => setForm({ ...form, area_id: Number(e.target.value) })}>
              <option value={0}>Seleccionar...</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </Field>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => setIsDrawerOpen(false)}>Cancelar</Button>
          <Button appearance="primary" onClick={handleCreate}>Crear</Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}