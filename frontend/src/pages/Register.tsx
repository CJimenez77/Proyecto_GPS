import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Field, Text } from '@fluentui/react-components';
import { WeatherMoon24Regular, WeatherSunny24Regular } from '@fluentui/react-icons';
import { api } from '../api';
import { useTheme } from '../components/ThemeContext';

export default function Register() {
  const [form, setForm] = useState({ nombre: '', username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.register({
        nombre: form.nombre,
        username: form.username,
        email: form.email,
        password: form.password,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (_: unknown, data: { value: string }) => setForm(f => ({ ...f, [key]: data.value })),
  });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--colorNeutralBackground2)',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <Button 
          appearance="subtle" 
          icon={theme === 'light' ? <WeatherMoon24Regular /> : <WeatherSunny24Regular />} 
          onClick={toggleTheme}
          title={theme === 'light' ? "Modo Oscuro" : "Modo Claro"}
        />
      </div>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'var(--colorNeutralBackground1)',
        padding: 40,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: 420,
      }}>
        <Text weight="semibold" size={600} block style={{ marginBottom: 8, textAlign: 'center' }}>
          Crear Cuenta
        </Text>
        <Text block style={{ textAlign: 'center', color: 'var(--colorNeutralForeground3)', fontSize: 13, marginBottom: 24 }}>
          Sistema de Gestión Documental
        </Text>

        {error && (
          <div style={{
            backgroundColor: '#fde7e9',
            border: '1px solid #f1707a',
            borderRadius: 4,
            padding: '10px 14px',
            marginBottom: 16,
          }}>
            <Text style={{ color: '#d13438', fontSize: 13 }}>{error}</Text>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nombre completo" required>
            <Input
              {...field('nombre')}
              placeholder="Ej: Juan Pérez"
              required
            />
          </Field>

          <Field label="Username" required>
            <Input
              {...field('username')}
              placeholder="Ej: juan_perez"
              required
            />
          </Field>

          <Field label="Email" required>
            <Input
              type="email"
              {...field('email')}
              placeholder="correo@ejemplo.cl"
              required
            />
          </Field>

          <Field label="Contraseña" required>
            <Input
              type="password"
              {...field('password')}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </Field>

          <Field label="Confirmar contraseña" required>
            <Input
              type="password"
              {...field('confirm')}
              placeholder="Repite tu contraseña"
              required
            />
          </Field>
        </div>

        <Button
          type="submit"
          appearance="primary"
          disabled={loading}
          style={{ marginTop: 24, width: '100%' }}
        >
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </Button>

        <Text block style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--colorNeutralForeground3)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#0078d4', textDecoration: 'none', fontWeight: 600 }}>
            Iniciar Sesión
          </Link>
        </Text>

        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          backgroundColor: theme === 'light' ? '#f0f9ff' : '#0f2c59',
          borderRadius: 4,
          border: '1px solid ' + (theme === 'light' ? '#cfe4f8' : '#114488'),
        }}>
          <Text block style={{ fontSize: 12, color: theme === 'light' ? '#005a9e' : '#9ecbff', lineHeight: '1.5' }}>
            ℹ️ Tu cuenta será creada con el rol de <strong>Lector</strong>. El administrador podrá asignarte un rol diferente según tus funciones.
          </Text>
        </div>
      </form>
    </div>
  );
}
