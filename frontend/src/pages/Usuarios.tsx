import { useEffect, useState } from 'react';
import { Button, Text, Badge, Input, Field, Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@fluentui/react-components';
import { Add24Regular, Delete24Regular, Edit24Regular, Search24Regular } from '@fluentui/react-icons';
import { api } from '../api';
import type { Usuario } from '../entities';

const rolColors: Record<Usuario['rol'], "danger" | "warning" | "informative" | "success" | "neutral"> = {
  administrador: 'danger', supervisor: 'warning', revisor: 'informative', colaborador: 'success', lector: 'neutral'
};
const rolText: Record<Usuario['rol'], string> = {
  administrador: 'Administrador', supervisor: 'Supervisor', revisor: 'Revisor', colaborador: 'Colaborador', lector: 'Lector'
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'colaborador' as Usuario['rol'], password: '' });

  useEffect(() => {
    api.getUsuarios().then(setUsuarios).catch(console.error);
  }, []);

  const filtered = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editId) {
        const updated = await api.updateUsuario(editId, form);
        setUsuarios(usuarios.map(u => u.id === editId ? updated : u));
      } else {
        const created = await api.createUsuario(form);
        setUsuarios([...usuarios, created]);
      }
      setIsDrawerOpen(false);
      setForm({ nombre: '', email: '', rol: 'colaborador', password: '' });
      setEditId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar usuario?')) return;
    try {
      await api.deleteUsuario(id);
      setUsuarios(usuarios.filter(u => u.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (u: Usuario) => {
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, password: '' });
    setEditId(u.id);
    setIsDrawerOpen(true);
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
        <Text weight="semibold" size={800}>Usuarios</Text>
        <Button appearance="primary" icon={<Add24Regular />} onClick={() => { setEditId(null); setForm({ nombre: '', email: '', rol: 'colaborador', password: '' }); setIsDrawerOpen(true); }}>
          Nuevo Usuario
        </Button>
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <Input contentBefore={<Search24Regular />} placeholder="Buscar..." value={search} onChange={(e, d) => setSearch(d.value)} style={{ width: 300 }} />
        </div>

        {filtered.length === 0 ? (
          <Text>No hay usuarios</Text>
        ) : (
          filtered.map(u => (
            <div key={u.id} style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text weight="semibold">{u.nombre}</Text>
                <Text block style={{ color: 'gray', fontSize: 12 }}>{u.email}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Badge appearance="filled" color={rolColors[u.rol]}>{rolText[u.rol]}</Badge>
                <Button appearance="subtle" icon={<Edit24Regular />} onClick={() => openEdit(u)} />
                <Button appearance="subtle" icon={<Delete24Regular />} onClick={() => handleDelete(u.id)} />
              </div>
            </div>
          ))
        )}
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={(_, o) => setIsDrawerOpen(o.open)}>
        <DrawerHeader>
          <Text weight="semibold" size={500}>{editId ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>
        </DrawerHeader>
        <DrawerBody>
          <Field label="Nombre">
            <Input value={form.nombre} onChange={(e, d) => setForm({ ...form, nombre: d.value })} />
          </Field>
          <Field label="Email" style={{ marginTop: 16 }}>
            <Input type="email" value={form.email} onChange={(e, d) => setForm({ ...form, email: d.value })} />
          </Field>
          <Field label="Rol" style={{ marginTop: 16 }}>
            <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }} value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value as Usuario['rol'] })}>
              <option value="administrador">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="revisor">Revisor</option>
              <option value="colaborador">Colaborador</option>
              <option value="lector">Lector</option>
            </select>
          </Field>
          <Field label={editId ? 'Nueva Contraseña (opcional)' : 'Contraseña'} style={{ marginTop: 16 }}>
            <Input type="password" value={form.password} onChange={(e, d) => setForm({ ...form, password: d.value })} />
          </Field>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => setIsDrawerOpen(false)}>Cancelar</Button>
          <Button appearance="primary" onClick={handleSave}>Guardar</Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}