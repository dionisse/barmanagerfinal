import React, { useState } from 'react';
import { User } from '../types';
import { simpleAuth } from '../utils/simpleAuthService';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authResult = await simpleAuth.login(username, password);

      if (authResult.success && authResult.user) {
        onLogin(authResult.user);
      } else {
        setError(authResult.message || 'Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion. Vérifiez votre connexion Internet.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-aurora" aria-hidden="true">
        <span className="login-blob login-blob-1" />
        <span className="login-blob login-blob-2" />
        <span className="login-blob login-blob-3" />
      </div>

      <div className="login-card">
        <div className="login-aside">
          <div className="login-brand">
            <span className="login-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 7v10M7.5 9.5 12 12l4.5-2.5M7.5 14.5 12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="login-brand-name">AHANDJO</span>
          </div>

          <div className="login-aside-content">
            <h1 className="login-aside-title">
              Bienvenue à<br />nouveau.
            </h1>
            <p className="login-aside-sub">
              Connectez-vous pour reprendre la gestion de votre établissement là où vous l'avez laissée.
            </p>

            <ul className="login-features">
              <li>
                <span className="login-feat-dot" />
                Gestion des ventes en temps réel
              </li>
              <li>
                <span className="login-feat-dot" />
                Suivi des stocks et achats
              </li>
              <li>
                <span className="login-feat-dot" />
                Système de licences sécurisé
              </li>
            </ul>
          </div>

          <p className="login-aside-footer">© 2026 AHANDJO — Gestion de Bar</p>
        </div>

        <div className="login-form-panel">
          <div className="login-form-head">
            <h2 className="login-form-title">Connexion</h2>
            <p className="login-form-sub">Entrez vos identifiants pour continuer.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="username">Nom d'utilisateur</label>
              <div className={`login-input-wrap ${error ? 'is-error' : ''}`}>
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Entrez votre nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Mot de passe</label>
              <div className={`login-input-wrap ${error ? 'is-error' : ''}`}>
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M9.4 5.2A10.5 10.5 0 0 1 12 5c5 0 9 5 9 7a14 14 0 0 1-2.3 2.8M6.2 6.2C3.8 7.7 3 10 3 12c0 2 4 7 9 7a9.5 9.5 0 0 0 3.8-.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 12c0-2 4-7 9-7s9 5 9 7-4 7-9 7-9-5-9-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-alert login-alert-error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 7.5v5M12 16v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  Vérification…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>Accès par licence</span>
          </div>

          <div style={{
            background: 'rgba(59,130,246,.08)',
            border: '1px solid rgba(59,130,246,.2)',
            borderRadius: '8px',
            padding: '12px 14px',
          }}>
            <p style={{
              fontSize: '.75rem',
              color: 'var(--login-text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}>
              Les utilisateurs Gestionnaire et Employé doivent avoir une licence active pour accéder au système.
            </p>
          </div>

          <p className="login-form-foot">
            AHANDJO v2.0.1 — Système de Gestion de Bar Professionnel
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
