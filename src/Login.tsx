import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  };

  return (
    <div className="login-page" data-loaded="true">
      <div className="bg-blobs">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>

      <div className="card">
        <div className="card-visual">
          <div className="visual-overlay" />
          <div className="visual-content">
            <div className="brand">
              <div className="brand-icon">
                <svg viewBox="0 0 24 24" fill="none" className="brand-svg">
                  <path
                    d="M5 8h12l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 8h12M7 8V6a3 3 0 0 1 3-3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.5 12v4M12.5 12v4"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="brand-name">Teranga<span>Bar</span></span>
            </div>

            <div className="visual-tagline">
              <h2>
                Gérez votre bar,<br />à la manière d'ici.
              </h2>
              <p>
                Stocks, ventes, équipes et caisse — une plateforme pensée pour
                les bars d'Afrique de l'Ouest.
              </p>
            </div>

            <ul className="visual-features">
              <li>
                <span className="feat-dot" />
                Suivi des stocks en temps réel
              </li>
              <li>
                <span className="feat-dot" />
                Gestion des ventes & caisse
              </li>
              <li>
                <span className="feat-dot" />
                Rapports quotidiens simplifiés
              </li>
            </ul>

            <div className="visual-footer">
              <span>Dakar · Abidjan · Bamako · Lomé</span>
            </div>
          </div>
        </div>

        <div className="card-form">
          <div className="form-inner">
            <div className="form-header">
              <h1>Bon retour</h1>
              <p>Connectez-vous pour accéder à votre tableau de bord</p>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <label className="field">
                <span className="field-label">Adresse e-mail</span>
                <div className="field-control">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="email"
                    placeholder="vous@bar.sn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span className="field-label">Mot de passe</span>
                <div className="field-control">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label="Afficher le mot de passe"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c5 0 9 4.5 10 7-.5 1.3-1.6 3-3.2 4.4M6.2 7.8C4.6 9.2 3.5 10.8 3 12c1 2.5 5 7 9 7 1 0 2-.2 3-.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <div className="form-row">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="check-box" />
                  <span>Se souvenir de moi</span>
                </label>
                <a href="#" className="forgot">Mot de passe oublié ?</a>
              </div>

              <button
                type="submit"
                className={`submit-btn ${loading ? "is-loading" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Connexion…
                  </>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>

            <div className="divider">
              <span>ou continuez avec</span>
            </div>

            <div className="socials">
              <button type="button" className="social-btn">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3v2.5h3.3c2-1.8 3-4.5 3-7.3z" fill="#4285F4" />
                  <path d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
                  <path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6z" fill="#FBBC05" />
                  <path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.9 9.4 6.1 12 6.1z" fill="#EA4335" />
                </svg>
                Google
              </button>
              <button type="button" className="social-btn">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M17 3h3l-7 8 8 10h-6l-5-6-5 6H3l8-9L3 3h6l4 5 4-5z" fill="currentColor" />
                </svg>
                WhatsApp Business
              </button>
            </div>

            <p className="form-footer">
              Pas encore de compte ? <a href="#">Créer un établissement</a>
            </p>
          </div>
        </div>
      </div>

      <p className="copyright">
        © 2025 TerangaBar — Conçu pour les bars d'Afrique de l'Ouest
      </p>
    </div>
  );
}
