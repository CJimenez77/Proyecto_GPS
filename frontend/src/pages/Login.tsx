import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useTheme } from '../components/ThemeContext';

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

const IconLock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
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
      setError('Credenciales inválidas. Por favor verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', zIndex: 1 }}>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
          style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
        >
          {theme === 'light' ? <IconMoon /> : <IconSun />}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 420 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>Sistema de Gestión Documental</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>SGD · Plataforma Documental</div>
            </div>
          </div>

          <div className="auth-card fade-in" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconLock />
              </div>
              <h2 className="auth-title" style={{ margin: 0 }}>Iniciar Sesión</h2>
            </div>
            <p className="auth-subtitle">Ingresa tus credenciales para acceder al sistema</p>

            {justRegistered && (
              <div className="auth-alert success">
                <span>✓</span>
                <span>Cuenta creada exitosamente. Ya puedes iniciar sesión.</span>
              </div>
            )}

            {error && (
              <div className="auth-alert error">
                <span>✕</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label className="auth-label">Usuario</label>
                <input
                  id="login-username"
                  className="auth-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ej: admin"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="auth-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="auth-label">Contraseña</label>
                  <Link to="/forgot-password" className="auth-forgot-link">¿Olvidaste tu contraseña?</Link>
                </div>
                <input
                  id="login-password"
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                className="auth-btn"
                disabled={loading}
                style={{ marginTop: 20 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Iniciando sesión...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </form>

            <p className="auth-link-text">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="auth-link">Regístrate aquí</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}