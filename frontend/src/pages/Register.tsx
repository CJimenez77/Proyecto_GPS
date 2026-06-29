import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
const IconUserPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

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
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

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
          Únete a la<br />
          plataforma de<br />
          <span>gestión documental</span>
        </h1>

        <p className="auth-left-sub">
          Crea tu cuenta y comienza a gestionar documentos de manera eficiente, segura y centralizada.
        </p>

        <div className="auth-features">
          {[
            'Acceso seguro con roles definidos',
            'Historial completo de versiones',
            'Notificaciones en tiempo real',
          ].map((text, i) => (
            <div key={i} className="auth-feature">
              <div className="auth-feature-dot" />
              <span className="auth-feature-text">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
        >
          {theme === 'light' ? <IconMoon /> : <IconSun />}
        </button>

        <div className="auth-card fade-in" style={{ maxWidth: 440 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconUserPlus />
            </div>
            <h2 className="auth-title" style={{ margin: 0 }}>Crear Cuenta</h2>
          </div>
          <p className="auth-subtitle">Completa el formulario para registrarte en el sistema</p>

          {error && (
            <div className="auth-alert error">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="auth-form-group" style={{ marginBottom: 0 }}>
                <label className="auth-label">Nombre completo</label>
                <input
                  className="auth-input"
                  type="text"
                  {...field('nombre')}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div className="auth-form-group" style={{ marginBottom: 0 }}>
                <label className="auth-label">Username</label>
                <input
                  className="auth-input"
                  type="text"
                  {...field('username')}
                  placeholder="juan_perez"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group" style={{ marginTop: 12 }}>
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                {...field('email')}
                placeholder="correo@ejemplo.cl"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div className="auth-form-group" style={{ marginBottom: 0 }}>
                <label className="auth-label">Contraseña</label>
                <input
                  className="auth-input"
                  type="password"
                  {...field('password')}
                  placeholder="Mín. 6 caracteres"
                  required
                />
              </div>
              <div className="auth-form-group" style={{ marginBottom: 0 }}>
                <label className="auth-label">Confirmar contraseña</label>
                <input
                  className="auth-input"
                  type="password"
                  {...field('confirm')}
                  placeholder="Repite tu contraseña"
                  required
                />
              </div>
            </div>

            <div className="auth-alert info" style={{ marginTop: 16 }}>
              <span>ℹ</span>
              <span>Tu cuenta será creada con rol de <strong>Lector</strong>. El administrador puede asignarte permisos adicionales.</span>
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Creando cuenta...
                </span>
              ) : 'Crear Cuenta'}
            </button>
          </form>

          <p className="auth-link-text">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-link">Iniciar Sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
