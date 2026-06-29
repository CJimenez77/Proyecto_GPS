import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useTheme } from '../components/ThemeContext';

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
      </div>

      <div className="auth-left">
        <div className="auth-left-logo">
          <div className="auth-left-logo-icon" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>SGD</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sistema Gestión Documental</div>
          </div>
        </div>

        <h1 className="auth-left-heading">
          Recupera tu<br />
          <span>acceso al sistema</span>
        </h1>
        <p className="auth-left-sub">
          Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña de forma segura.
        </p>
      </div>

      <div className="auth-right">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
        >
          {theme === 'light' ? <IconMoon /> : <IconSun />}
        </button>

        <div className="auth-card fade-in">
          <h2 className="auth-title">Recuperar Contraseña</h2>
          <p className="auth-subtitle">Te enviaremos un enlace de recuperación a tu correo</p>

          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="auth-alert success">
                <span>✓</span>
                <span>{success}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, textAlign: 'center' }}>
                Revisa tu bandeja de entrada y sigue las instrucciones del correo para restablecer tu contraseña.
              </p>
              <Link to="/login" className="auth-btn" style={{ textAlign: 'center', marginTop: 8, display: 'block' }}>
                Volver a Iniciar Sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="auth-alert error">
                  <span>✕</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="auth-form-group">
                <label className="auth-label">Correo electrónico</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.cl"
                  required
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Ingresa el correo asociado a tu cuenta</span>
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Enviando instrucciones...
                  </span>
                ) : 'Enviar Instrucciones'}
              </button>

              <p className="auth-link-text">
                ¿Recordaste tu contraseña?{' '}
                <Link to="/login" className="auth-link">Inicia sesión aquí</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
