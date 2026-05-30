import { useEffect, useState } from 'react';
import { Button, Text, Badge, Input, Field, Drawer, DrawerHeader, DrawerBody, DrawerFooter, Select } from '@fluentui/react-components';
import { Add24Regular, Search24Regular, Edit24Regular } from '@fluentui/react-icons';
import { api, getCurrentUser } from '../api';
import type { Usuario, JerarquiaEmpresa } from '../entities';

export default function Usuarios() {
  const currentUser = getCurrentUser();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [jerarquia, setJerarquia] = useState<JerarquiaEmpresa[]>([]);
  const [search, setSearch] = useState('');

  // Drawer: crear usuario
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({ username: '', nombre: '', email: '', password: '', rol: 'lector', id_area: 0 });

  // Drawer: editar rol
  const [isRolDrawerOpen, setIsRolDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [rolForm, setRolForm] = useState({ rol: 'lector', id_area: 0 });
  const [savingRol, setSavingRol] = useState(false);

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
    } catch (e: unknown) {
      alert('Error al crear usuario: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    }
  };

  const openRolDrawer = (u: Usuario) => {
    setEditingUser(u);
    setRolForm({ rol: u.rol, id_area: u.id_area ?? 0 });
    setIsRolDrawerOpen(true);
  };

  const handleSaveRol = async () => {
    if (!editingUser) return;
    if (rolForm.rol !== 'administrador' && !rolForm.id_area) {
      alert('Debes seleccionar un área para este rol');
      return;
    }
    setSavingRol(true);
    try {
      const updated = await api.updateUsuario(editingUser.id, {
        rol: rolForm.rol,
        id_area: rolForm.rol === 'administrador' ? null : rolForm.id_area,
      });
      setUsuarios(usuarios.map(u => u.id === updated.id ? updated : u));
      setIsRolDrawerOpen(false);
      setEditingUser(null);
    } catch (e: unknown) {
      alert('Error al actualizar rol: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    } finally {
      setSavingRol(false);
    }
  };

  const toggleEstado = async (id: number, estadoActual: string) => {
    try {
      const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
      const actual = await api.updateUsuarioEstado(id, nuevoEstado);
      setUsuarios(usuarios.map(u => u.id === id ? actual : u));
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    }
  };

  const getRolColor = (rol: string): 'danger' | 'informative' | 'warning' | 'neutral' => {
    switch (rol) {
      case 'administrador': return 'danger';
      case 'revisor': return 'informative';
      case 'usuario_terreno': return 'warning';
      default: return 'neutral';
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
                    <Badge appearance="tint" color={getRolColor(u.rol)}>
                      {u.rol}
                    </Badge>
                  </td>
                  <td style={{ padding: 12 }}><Text>{nombreArea}</Text></td>
                  <td style={{ padding: 12 }}>
                    <Badge color={u.estado === 'activo' ? 'success' : 'danger'}>{u.estado}</Badge>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<Edit24Regular />}
                        onClick={() => openRolDrawer(u)}
                      >
                        Editar Rol
                      </Button>
                      {u.username !== 'admin' && (
                        <Button size="small" appearance="subtle" onClick={() => toggleEstado(u.id, u.estado)}>
                          {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drawer: Crear Usuario */}
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

      {/* Drawer: Editar Rol */}
      <Drawer open={isRolDrawerOpen} onOpenChange={(_, o) => setIsRolDrawerOpen(o.open)} position="end">
        <DrawerHeader>
          <Text weight="semibold" size={500}>Editar Rol</Text>
          {editingUser && (
            <Text block size={300} style={{ color: '#666', marginTop: 4 }}>
              {editingUser.nombre} ({editingUser.username})
            </Text>
          )}
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              backgroundColor: '#fff4ce',
              border: '1px solid #ffd335',
              borderRadius: 4,
              padding: '10px 14px',
            }}>
              <Text style={{ fontSize: 12, color: '#835200' }}>
                ⚠️ Cambiar el rol modifica los permisos del usuario en el sistema inmediatamente.
              </Text>
            </div>

            <Field label="Nuevo Rol" required>
              <Select value={rolForm.rol} onChange={e => setRolForm({ ...rolForm, rol: e.target.value })}>
                <option value="lector">Lector</option>
                <option value="usuario_terreno">Usuario de Terreno</option>
                <option value="revisor">Revisor</option>
                <option value="administrador">Administrador</option>
              </Select>
            </Field>

            {rolForm.rol !== 'administrador' && (
              <Field label="Área Asignada" required>
                <select
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d1d1', fontFamily: 'inherit' }}
                  value={rolForm.id_area}
                  onChange={e => setRolForm({ ...rolForm, id_area: Number(e.target.value) })}
                >
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
          <Button appearance="secondary" onClick={() => setIsRolDrawerOpen(false)}>Cancelar</Button>
          <Button appearance="primary" onClick={handleSaveRol} disabled={savingRol}>
            {savingRol ? 'Guardando...' : 'Guardar Rol'}
          </Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}