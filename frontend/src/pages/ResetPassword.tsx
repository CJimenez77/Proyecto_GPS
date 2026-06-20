import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, Input, Field, Text } from '@fluentui/react-components';
import { WeatherMoon24Regular, WeatherSunny24Regular } from '@fluentui/react-icons';
import { api } from '../api';
import { useTheme } from '../components/ThemeContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const token = searchParams.get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token de recuperación no válido o inexistente.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      navigate('/login', { state: { registered: false } });
      alert('Tu contraseña se ha restablecido correctamente. Ya puedes iniciar sesión con tu nueva contraseña.');
      navigate('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
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
        width: 400
      }}>
        <Text weight="semibold" size={600} block style={{ marginBottom: 8, textAlign: 'center' }}>
          Nueva Contraseña
        </Text>
        <Text block style={{ textAlign: 'center', color: 'var(--colorNeutralForeground3)', fontSize: 13, marginBottom: 24 }}>
          Establece tu nueva contraseña de acceso
        </Text>

        {!token ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              backgroundColor: theme === 'light' ? '#fde7e9' : '#3d1619',
              border: '1px solid ' + (theme === 'light' ? '#f1707a' : '#a22029'),
              borderRadius: 4,
              padding: '12px 14px',
            }}>
              <Text style={{ color: theme === 'light' ? '#d13438' : '#f88086', fontSize: 13, display: 'block', lineHeight: '1.5' }}>
                ❌ Token de recuperación no válido o inexistente. Por favor, solicita un nuevo enlace de recuperación.
              </Text>
            </div>
            
            <Text block style={{ textAlign: 'center', marginTop: 8 }}>
              <Link to="/forgot-password" style={{ color: '#0078d4', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                Solicitar nuevo enlace
              </Link>
            </Text>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                backgroundColor: theme === 'light' ? '#fde7e9' : '#3d1619',
                border: '1px solid ' + (theme === 'light' ? '#f1707a' : '#a22029'),
                borderRadius: 4,
                padding: '10px 14px',
                marginBottom: 16,
              }}>
                <Text style={{ color: theme === 'light' ? '#d13438' : '#f88086', fontSize: 13 }}>{error}</Text>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Nueva contraseña" required>
                <Input
                  type="password"
                  value={password}
                  onChange={(_e, data) => setPassword(data.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </Field>

              <Field label="Confirmar nueva contraseña" required>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(_e, data) => setConfirm(data.value)}
                  placeholder="Repita su nueva contraseña"
                  required
                />
              </Field>
            </div>

            <Button
              type="submit"
              appearance="primary"
              disabled={loading}
              style={{ marginTop: 28, width: '100%' }}
            >
              {loading ? 'Guardando contraseña...' : 'Restablecer Contraseña'}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
