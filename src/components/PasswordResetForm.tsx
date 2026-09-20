/**
 * Formulaire de réinitialisation de mot de passe
 * - Saisie identifiant (username/email/phone/whatsapp)
 * - Envoi code WhatsApp/Email
 * - Vérification code + nouveau mot de passe
 */
import React, { useState } from 'react';
import { Key, Lock, MessageCircle, Mail, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { requestPasswordReset, verifyPasswordResetCode, resetPassword } from '../utils/registrationService';
import { checkPasswordStrength } from '../utils/securityService';

interface PasswordResetFormProps {
  onBackToLogin: () => void;
  onBackToHome?: () => void;
  onResetSuccess?: () => void;
}

type Step = 'request' | 'verify' | 'success';

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onBackToLogin, onBackToHome, onResetSuccess }) => {
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [resetId, setResetId] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Veuillez entrer votre identifiant, email ou numéro');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await requestPasswordReset(identifier.trim());
      if (result.success && result.resetId) {
        setResetId(result.resetId);
        setMessage(result.message || 'Code envoyé via WhatsApp / Email');
        setStep('verify');
      } else if (result.success) {
        // Ne révèle pas si compte existe (sécurité)
        setMessage(result.message || 'Si ce compte existe, un code a été envoyé');
        // Simule quand même un resetId pour dev
        const mockId = `RST-MOCK-${Date.now()}`;
        localStorage.setItem(`ahandjo_reset_${mockId}`, JSON.stringify({
          id: mockId,
          identifier,
          code: localStorage.getItem('ahandjo_last_reset_code') || '123456',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          used: false
        }));
        setResetId(mockId);
        setStep('verify');
      } else {
        setError(result.message || 'Erreur lors de la demande');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    const strength = checkPasswordStrength(newPassword);
    if (!strength.isStrong) {
      setError(strength.feedback[0] || 'Mot de passe trop faible');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await resetPassword(resetId, code, newPassword);
      if (result.success) {
        setStep('success');
        setMessage(result.message || 'Mot de passe réinitialisé');
        setTimeout(() => {
          onResetSuccess?.();
          onBackToLogin();
        }, 2000);
      } else {
        setError(result.message || 'Erreur réinitialisation');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = newPassword ? checkPasswordStrength(newPassword) : null;

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
                <circle cx="8.6" cy="5.9" r="1.7" fill="currentColor" />
                <circle cx="12" cy="4.6" r="2" fill="currentColor" />
                <circle cx="15.4" cy="5.9" r="1.7" fill="currentColor" />
                <path d="M6.8 8.6h10.4v9.6a2.2 2.2 0 0 1-2.2 2.2H9a2.2 2.2 0 0 1-2.2-2.2V8.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M17.2 10.8h1.6a2.6 2.6 0 0 1 0 5.2h-1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="login-brand-name">AHANDJO</span>
          </div>

          <div className="login-aside-content">
            <h1 className="login-aside-title">
              Mot de passe<br />
              <em>oublié ?</em>
            </h1>
            <p className="login-aside-sub">
              Pas de panique. Nous vous envoyons un code de vérification via WhatsApp ou Email pour réinitialiser votre accès en toute sécurité.
            </p>

            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-clay-500 text-white">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-cream-50">Code via WhatsApp</p>
                  <p className="text-xs text-cream-100/70">Reçu en 30 secondes</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-400 text-espresso-900">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-cream-50">Sécurisé</p>
                  <p className="text-xs text-cream-100/70">Expire en 15 minutes</p>
                </div>
              </div>
            </div>
          </div>

          <p className="login-aside-footer">© 2026 AHANDJO — Sécurité renforcée</p>
        </div>

        <div className="login-form-panel">
          <div className="login-form-head">
            <div className="login-form-head-row">
              <div>
                <h2 className="login-form-title">
                  {step === 'request' ? 'Réinitialiser' : step === 'verify' ? 'Nouveau mot de passe' : 'Succès'}
                </h2>
                <p className="login-form-sub">
                  {step === 'request' ? 'Entrez votre identifiant pour recevoir un code' : step === 'verify' ? 'Saisissez le code et votre nouveau mot de passe' : 'Votre mot de passe a été mis à jour'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="login-back-btn" onClick={onBackToLogin}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>Connexion</span>
                </button>
                {onBackToHome && (
                  <button type="button" className="login-back-btn" onClick={onBackToHome}>
                    <span>Accueil</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {step === 'request' && (
            <form className="login-form" onSubmit={handleRequest} noValidate>
              <div className="login-field">
                <label htmlFor="identifier">Identifiant, Email ou Téléphone</label>
                <div className={`login-input-wrap ${error ? 'is-error' : ''}`}>
                  <Key className="login-input-icon h-5 w-5" />
                  <input
                    id="identifier"
                    type="text"
                    placeholder="Ex: monbar123, +22997000000, email@exemple.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-espresso-400 mt-1">Nous enverrons un code via WhatsApp prioritairement, sinon Email</p>
              </div>

              {error && (
                <div className="login-alert login-alert-error" role="alert">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-700">{message}</p>
                </div>
              )}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Envoi du code...
                  </>
                ) : (
                  'Envoyer le code de vérification'
                )}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form className="login-form" onSubmit={handleVerifyAndReset} noValidate>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2">
                <p className="text-sm text-amber-800">
                  Code envoyé à <strong>{identifier}</strong> via WhatsApp / Email. Expire dans 15 minutes.
                </p>
                <p className="text-xs text-amber-700 mt-1">En dev, code visible dans console (F12)</p>
              </div>

              <div className="login-field">
                <label htmlFor="code">Code de vérification (6 chiffres)</label>
                <div className={`login-input-wrap ${error ? 'is-error' : ''}`}>
                  <MessageCircle className="login-input-icon h-5 w-5" />
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="newPassword">Nouveau mot de passe</label>
                <div className={`login-input-wrap ${error ? 'is-error' : ''}`}>
                  <Lock className="login-input-icon h-5 w-5" />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 caractères, majuscule, chiffre, symbole"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="login-toggle-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= passwordStrength.score ? (passwordStrength.score >=3 ? 'bg-green-500' : passwordStrength.score===2 ? 'bg-amber-500' : 'bg-red-500') : 'bg-espresso-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs mt-1 text-espresso-500">
                      {passwordStrength.feedback[0] || (passwordStrength.isStrong ? 'Mot de passe fort ✓' : 'Mot de passe faible')}
                    </p>
                  </div>
                )}
              </div>

              <div className="login-field">
                <label htmlFor="confirmPassword">Confirmer nouveau mot de passe</label>
                <div className={`login-input-wrap ${error ? 'is-error' : ''}`}>
                  <Lock className="login-input-icon h-5 w-5" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="login-alert login-alert-error" role="alert">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm text-blue-700">{message}</p>
                </div>
              )}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Réinitialisation...
                  </>
                ) : (
                  'Réinitialiser le mot de passe'
                )}
              </button>

              <button type="button" onClick={() => setStep('request')} className="text-sm text-espresso-500 hover:text-espresso-700 text-center w-full">
                ← Renvoyer un code ou changer d'identifiant
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 grid place-items-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-espresso-900">Mot de passe réinitialisé !</h3>
              <p className="text-sm text-espresso-600 mt-2">Vous allez être redirigé vers la connexion...</p>
            </div>
          )}

          <p className="login-form-foot">AHANDJO — Sécurité renforcée • Code à usage unique • Expire en 15 min</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetForm;
