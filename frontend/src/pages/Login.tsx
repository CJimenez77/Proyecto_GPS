import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Field, Text } from '@fluentui/react-components';
import { api } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
          GPS - Iniciar Sesión
        </Text>
        {error && (
          <Text block style={{ color: '#d13438', marginBottom: 16 }}>
            {error}
          </Text>
        )}
        <Field label="Usuario">
          <Input
            value={username}
            onChange={(e, data) => setUsername(data.value)}
            placeholder="admin"
            required
          />
        </Field>
        <Field label="Contraseña" style={{ marginTop: 16 }}>
          <Input
            type="password"
            value={password}
            onChange={(e, data) => setPassword(data.value)}
            placeholder="********"
            required
          />
        </Field>
        <Button
          type="submit"
          appearance="primary"
          disabled={loading}
          style={{ marginTop: 24, width: '100%' }}
        >
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </Button>
        <Text block style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'gray' }}>
          Credenciales:
        </Text>
      </form>
    </div>
  );
}