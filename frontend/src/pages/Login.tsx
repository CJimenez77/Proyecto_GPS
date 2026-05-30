import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button, Input, Field, Text } from '@fluentui/react-components';
import { api } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.login(username, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('usuario', JSON.stringify(response.user));
      navigate('/');
    } catch {
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white',
        padding: 40,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: 400
      }}>
        <Text weight="semibold" size={600} block style={{ marginBottom: 24, textAlign: 'center' }}>
          Sistema de Gestión Documental
        </Text>

        {justRegistered && (
          <div style={{
            backgroundColor: '#dff6dd',
            border: '1px solid #107c10',
            borderRadius: 4,
            padding: '10px 14px',
            marginBottom: 16,
          }}>
            <Text style={{ color: '#107c10', fontSize: 13 }}>
              ✅ Cuenta creada exitosamente. Inicia sesión con tus credenciales.
            </Text>
          </div>
        )}

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

        <Field label="Usuario">
          <Input
            id="login-username"
            value={username}
            onChange={(_e, data) => setUsername(data.value)}
            placeholder="Ej: admin"
            required
          />
        </Field>
        <Field label="Contraseña" style={{ marginTop: 16 }}>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(_e, data) => setPassword(data.value)}
            placeholder="••••••••"
            required
          />
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <Link to="/forgot-password" style={{ color: '#0078d4', textDecoration: 'none', fontSize: '12px' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </Field>
        <Button
          id="login-submit"
          type="submit"
          appearance="primary"
          disabled={loading}
          style={{ marginTop: 24, width: '100%' }}
        >
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </Button>

        <Text block style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#666' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" style={{ color: '#0078d4', textDecoration: 'none', fontWeight: 600 }}>
            Regístrate aquí
          </Link>
        </Text>
      </form>
    </div>
  );
}