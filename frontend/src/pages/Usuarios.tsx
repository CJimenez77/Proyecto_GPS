import { useEffect, useState } from 'react';
import { Button, Text, Badge, Input, Field, Drawer, DrawerHeader, DrawerBody, DrawerFooter, Select } from '@fluentui/react-components';
import { Add24Regular, Search24Regular } from '@fluentui/react-icons';
import { api, getCurrentUser } from '../api';
import type { Usuario, JerarquiaEmpresa } from '../entities';

export default function Usuarios() {
  const currentUser = getCurrentUser();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [jerarquia, setJerarquia] = useState<JerarquiaEmpresa[]>([]);
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [form, setForm] = useState({ username: '', nombre: '', email: '', password: '', rol: 'lector', id_area: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usr, jer] = await Promise.all([
        api.getUsuarios(),
        api.getJerarquia()
      ]);
      setUsuarios(usr);
      setJerarquia(jer);
    } catch (e) { console.error(e); }
  };

  const filtered = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.username || !form.nombre || !form.email || !form.password || !form.rol || (form.rol !== 'administrador' && !form.id_area)) {
      alert('Completar todos los campos');
      return;
    }
    try {
      const data: Partial<Usuario> & { password?: string } = { ...form };
      if (data.rol === 'administrador') data.id_area = null;
      
      const nuevo = await api.createUsuario(data);
      setUsuarios([...usuarios, nuevo]);
      setIsDrawerOpen(false);
      setForm({ username: '', nombre: '', email: '', password: '', rol: 'lector', id_area: 0 });
    } catch (e: any) {
      alert('Error al crear usuario: ' + e.message);
    }
  };

  const toggleEstado = async (id: number, estadoActual: string) => {
    try {
      const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
      const actual = await api.updateUsuarioEstado(id, nuevoEstado);
      setUsuarios(usuarios.map(u => u.id === id ? actual : u));
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: 16, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  };

  if (currentUser?.rol !== 'administrador') {
    return <Text>No tienes permisos para ver esta sección.</Text>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text weight="semibold" size={800}>Usuarios y Accesos</Text>
        <Button appearance="primary" icon={<Add24Regular />} onClick={() => setIsDrawerOpen(true)}>
          Nuevo Usuario
        </Button>
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <Input contentBefore={<Search24Regular />} placeholder="Buscar..." value={search} onChange={(_, d) => setSearch(d.value)} style={{ width: 300 }} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: 12 }}><Text weight="semibold">Nombre</Text></th>
              <th style={{ padding: 12 }}><Text weight="semibold">Username</Text></th>
              <th style={{ padding: 12 }}><Text weight="semibold">Rol</Text></th>
              <th style={{ padding: 12 }}><Text weight="semibold">Área</Text></th>
              <th style={{ padding: 12 }}><Text weight="semibold">Estado</Text></th>
              <th style={{ padding: 12 }}><Text weight="semibold">Acciones</Text></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              // Buscar nombre del área para mostrar
              let nombreArea = '-';
              if (u.id_area) {
                jerarquia.forEach(emp => {
                  emp.areas.forEach(a => { if (a.id === u.id_area) nombreArea = a.nombre; });
                });
              }

              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>
                    <Text weight="semibold" block>{u.nombre}</Text>
                    <Text size={200} style={{ color: 'gray' }}>{u.email}</Text>
                  </td>
                  <td style={{ padding: 12 }}><Text>{u.username}</Text></td>
                  <td style={{ padding: 12 }}>
                    <Badge appearance="tint" color={u.rol === 'administrador' ? 'danger' : u.rol === 'revisor' ? 'informative' : 'neutral'}>
                      {u.rol}
                    </Badge>
                  </td>
                  <td style={{ padding: 12 }}><Text>{nombreArea}</Text></td>
                  <td style={{ padding: 12 }}>
                    <Badge color={u.estado === 'activo' ? 'success' : 'danger'}>{u.estado}</Badge>
                  </td>
                  <td style={{ padding: 12 }}>
                    {u.username !== 'admin' && (
                      <Button size="small" appearance="subtle" onClick={() => toggleEstado(u.id, u.estado)}>
                        {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={(_, o) => setIsDrawerOpen(o.open)} position="end">
        <DrawerHeader>
          <Text weight="semibold" size={500}>Nuevo Usuario</Text>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nombre Completo" required>
              <Input value={form.nombre} onChange={(_, d) => setForm({ ...form, nombre: d.value })} />
            </Field>
            <Field label="Username (Login)" required>
              <Input value={form.username} onChange={(_, d) => setForm({ ...form, username: d.value })} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(_, d) => setForm({ ...form, email: d.value })} />
            </Field>
            <Field label="Contraseña" required>
              <Input type="password" value={form.password} onChange={(_, d) => setForm({ ...form, password: d.value })} />
            </Field>
            <Field label="Rol" required>
              <Select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                <option value="lector">Lector</option>
                <option value="usuario_terreno">Usuario de Terreno</option>
                <option value="revisor">Revisor</option>
                <option value="administrador">Administrador</option>
              </Select>
            </Field>
            {form.rol !== 'administrador' && (
              <Field label="Área Asignada" required>
                <select style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d1d1', fontFamily: 'inherit' }} value={form.id_area} onChange={e => setForm({ ...form, id_area: Number(e.target.value) })}>
                  <option value={0}>Seleccionar área...</option>
                  {jerarquia.map(emp => (
                    <optgroup key={emp.id} label={emp.nombre}>
                      {emp.areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button appearance="secondary" onClick={() => setIsDrawerOpen(false)}>Cancelar</Button>
          <Button appearance="primary" onClick={handleCreate}>Crear</Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}