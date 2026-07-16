import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";

type Field = "email" | "password";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<Field, string>>({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    email: false,
    password: false,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  function validateEmail(value: string): string {
    if (!value.trim()) return "L'email est requis.";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value)) return "Format d'email invalide.";
    return "";
  }

  function validatePassword(value: string): string {
    if (!value) return "Le mot de passe est requis.";
    if (value.length < 8) return "Au moins 8 caractères.";
    return "";
  }

  function validate(): boolean {
    const e = validateEmail(email);
    const p = validatePassword(password);
    setErrors({ email: e, password: p });
    setTouched({ email: true, password: true });
    return !e && !p;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 1100));
    if (email === "demo@bolt.dev" && password === "password") {
      setStatus("success");
    } else {
      setStatus("error");
      setServerError("Email ou mot de passe incorrect.");
    }
  }

  function handleBlur(field: Field) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      email: field === "email" ? validateEmail(email) : prev.email,
      password: field === "password" ? validatePassword(password) : prev.password,
    }));
  }

  return (
    <div className="login-page">
      <div className="aurora" aria-hidden="true">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>

      <div className="card">
        <div className="card-aside">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 7v10M7.5 9.5 12 12l4.5-2.5M7.5 14.5 12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="brand-name">Northwind</span>
          </div>

          <div className="aside-content">
            <h1 className="aside-title">
              Bienvenue à<br />nouveau.
            </h1>
            <p className="aside-sub">
              Connectez-vous pour reprendre votre travail là où vous l'avez laissé.
            </p>

            <ul className="features">
              <li>
                <span className="feat-dot" />
                Tableau de bord en temps réel
              </li>
              <li>
                <span className="feat-dot" />
                Collaboration sécurisée
              </li>
              <li>
                <span className="feat-dot" />
                Données chiffrées de bout en bout
              </li>
            </ul>
          </div>

          <p className="aside-footer">© 2026 Northwind Inc.</p>
        </div>

        <div className="card-form">
          <div className="form-head">
            <h2 className="form-title">Connexion</h2>
            <p className="form-sub">Entrez vos identifiants pour continuer.</p>
          </div>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Adresse email</label>
              <div className={`input-wrap ${touched.email && errors.email ? "is-error" : ""} ${email && !errors.email ? "is-valid" : ""}`}>
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  aria-invalid={touched.email && !!errors.email}
                  aria-describedby={errors.email ? "email-err" : undefined}
                />
              </div>
              {touched.email && errors.email && (
                <p id="email-err" className="field-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <div className={`input-wrap ${touched.password && errors.password ? "is-error" : ""}`}>
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  aria-invalid={touched.password && !!errors.password}
                  aria-describedby={errors.password ? "pw-err" : undefined}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  tabIndex={0}
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
              {touched.password && errors.password && (
                <p id="pw-err" className="field-error">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="row-between">
              <label className="check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="check-box" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="m2.5 6 2.5 2.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Se souvenir de moi</span>
              </label>
              <a className="link" href="#forgot">
                Mot de passe oublié ?
              </a>
            </div>

            {serverError && (
              <div className="alert alert-error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 7.5v5M12 16v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {status === "success" && (
              <div className="alert alert-success" role="status">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                  <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Connexion réussie. Redirection…</span>
              </div>
            )}

            <button className="submit" type="submit" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Connexion…
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="divider">
            <span>ou continuer avec</span>
          </div>

          <div className="socials">
            <button type="button" className="social" aria-label="Continuer avec Google">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M21.35 11.1H12v3.8h5.35c-.5 2.6-2.8 4.1-5.35 4.1A6 6 0 1 1 15.5 6.5l2.7-2.7A9.8 9.8 0 1 0 12 21.8c5.2 0 9.8-3.8 9.8-9.8 0-.5-.05-.8-.45-.9Z" fill="currentColor" />
              </svg>
              Google
            </button>
            <button type="button" className="social" aria-label="Continuer avec Apple">
              <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.7-1-2.7-4Zm-2.5-7.3c.7-.8 1.1-1.9 1-3-1 0-2.2.6-2.9 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.3Z" />
              </svg>
              Apple
            </button>
          </div>

          <p className="form-foot">
            Pas encore de compte ?{" "}
            <a className="link" href="#signup">
              Créer un compte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
