import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Field, Text } from '@fluentui/react-components';
import { api } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.forgotPassword(email);
      setSuccess(response.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
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
      backgroundColor: '#f5f7fa',
      padding: 24
    }}>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white',
        padding: 40,
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        width: 400,
        height: 'fit-content'
      }}>
        <Text weight="semibold" size={600} block style={{ marginBottom: 8, textAlign: 'center', color: '#111' }}>
          Recuperar Contraseña
        </Text>
        <Text block style={{ textAlign: 'center', color: '#666', fontSize: 13, marginBottom: 24 }}>
          Sistema de Gestión Documental
        </Text>

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              backgroundColor: '#dff6dd',
              border: '1px solid #107c10',
              borderRadius: 6,
              padding: '14px',
            }}>
              <Text style={{ color: '#107c10', fontSize: 13, display: 'block', lineHeight: '1.5', fontWeight: 500 }}>
                ✅ {success}
              </Text>
            </div>
            
            <Text block style={{ fontSize: 13, color: '#555', textAlign: 'center', lineHeight: '1.6' }}>
              Por favor, revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
            </Text>

            <Text block style={{ textAlign: 'center', marginTop: 12 }}>
              <Link to="/login" style={{ color: '#0078d4', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                Volver al Iniciar Sesión
              </Link>
            </Text>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                backgroundColor: '#fde7e9',
                border: '1px solid #f1707a',
                borderRadius: 6,
                padding: '12px 14px',
                marginBottom: 16,
              }}>
                <Text style={{ color: '#d13438', fontSize: 13 }}>{error}</Text>
              </div>
            )}

            <Field label="Correo electrónico" required hint="Ingrese el correo electrónico asociado a su cuenta.">
              <Input
                type="email"
                value={email}
                onChange={(_e, data) => setEmail(data.value)}
                placeholder="correo@ejemplo.cl"
                required
                style={{ width: '100%' }}
              />
            </Field>

            <Button
              type="submit"
              appearance="primary"
              disabled={loading}
              style={{ marginTop: 24, width: '100%', height: 38 }}
            >
              {loading ? 'Enviando solicitud...' : 'Enviar Instrucciones'}
            </Button>

            <Text block style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#666' }}>
              ¿Recordaste tu contraseña?{' '}
              <Link to="/login" style={{ color: '#0078d4', textDecoration: 'none', fontWeight: 600 }}>
                Inicia sesión aquí
              </Link>
            </Text>
          </>
        )}
      </form>
    </div>
  );
}
