/**
 * Formulaire d'inscription client AHANDJO
 * - Nom du Bar, Adresse, Nom/Prénom, Tel, WhatsApp, Email, Identifiant auto, MDP x2
 * - Vérification par Email (gratuit via Resend) + WhatsApp via wa.me support (0€)
 * - Essai 7 jours
 */
import React, { useState, useEffect } from 'react';
import { Store, MapPin, User, Phone, MessageCircle, Mail, Key, Lock, Eye, EyeOff, Sparkles, Loader2, CheckCircle, AlertTriangle, Building, BadgeCheck } from 'lucide-react';
import { checkPasswordStrength, validateRegistrationData } from '../utils/securityService';
import { suggestUsername, checkUsername, createVerificationCode, registerNewClient } from '../utils/registrationService';
import WhatsappVerificationModal from './WhatsappVerificationModal';
import WhatsappSupportButton from './WhatsappSupportButton';
import { getWhatsappLink } from '../utils/whatsappService';

interface RegistrationFormProps {
  onBackToHome?: () => void;
  onBackToLogin?: () => void;
  onRegistered?: (username: string) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBackToHome, onBackToLogin, onRegistered }) => {
  const [formData, setFormData] = useState({
    barName: '',
    barAddress: '',
    managerFullName: '',
    phone: '',
    whatsapp: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [suggestedUsername, setSuggestedUsername] = useState('');

  // Vérification
  const [showVerification, setShowVerification] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [verificationType, setVerificationType] = useState<'whatsapp' | 'email'>('email');
  const [pendingRegistration, setPendingRegistration] = useState(false);
  const [supportWaLink, setSupportWaLink] = useState('');

  // Génère un username auto à partir du nom du bar
  useEffect(() => {
    if (formData.barName && formData.barName.length >= 2 && !formData.username) {
      const timer = setTimeout(async () => {
        const suggestion = await suggestUsername(formData.barName);
        setSuggestedUsername(suggestion);
        setFormData(prev => ({ ...prev, username: suggestion }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.barName]);

  // Vérifie disponibilité username
  useEffect(() => {
    if (formData.username && formData.username.length >= 3) {
      const timer = setTimeout(async () => {
        setUsernameChecking(true);
        const result = await checkUsername(formData.username);
        setUsernameAvailable(result.available);
        setUsernameChecking(false);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setUsernameAvailable(null);
    }
  }, [formData.username]);

  // Génère lien wa.me support -> client pour aide
  useEffect(() => {
    if (formData.whatsapp) {
      const link = getWhatsappLink(formData.whatsapp, `Bonjour ${formData.managerFullName || ''} 👋\n\nVotre code de vérification AHANDJO arrive par Email (${formData.email}). Si besoin, je peux vous aider ici.\n\n- Support AHANDJO`);
      setSupportWaLink(link);
    }
  }, [formData.whatsapp, formData.managerFullName, formData.email]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleGenerateUsername = async () => {
    if (!formData.barName) {
      setErrors(prev => ({ ...prev, barName: 'Entrez d\'abord le nom du bar' }));
      return;
    }
    const suggestion = await suggestUsername(formData.barName);
    setFormData(prev => ({ ...prev, username: suggestion }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const validation = validateRegistrationData(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (usernameAvailable === false) {
      setErrors(prev => ({ ...prev, username: 'Cet identifiant est déjà pris' }));
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess('');

    try {
      // 1. Envoie code par EMAIL (gratuit via Resend) — canal réel
      const verifResult = await createVerificationCode(formData.email, 'email');

      if (!verifResult.success || !verifResult.verificationId) {
        setErrors({ email: verifResult.message || 'Impossible d\'envoyer le code de vérification par Email' });
        setLoading(false);
        return;
      }

      setVerificationId(verifResult.verificationId);
      setVerificationType('email');
      setPendingRegistration(true);
      setShowVerification(true);
      setLoading(false);
    } catch (err: any) {
      setErrors({ general: err.message || 'Erreur lors de l\'inscription' });
      setLoading(false);
    }
  };

  const handleVerified = async () => {
    setShowVerification(false);
    setLoading(true);

    try {
      const result = await registerNewClient(formData, verificationId);

      if (result.success) {
        setSuccess(result.message || 'Inscription réussie !');
        // Auto-login après 2 secondes
        setTimeout(() => {
          onRegistered?.(formData.username);
        }, 2000);
      } else {
        setErrors({ general: result.message || 'Erreur lors de la création du compte' });
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Erreur inattendue' });
    } finally {
      setLoading(false);
      setPendingRegistration(false);
    }
  };

  const handleResendCode = async () => {
    // Resend par Email (gratuit)
    const result = await createVerificationCode(formData.email, 'email');
    return result;
  };

  const passwordStrength = formData.password ? checkPasswordStrength(formData.password) : null;

  return (
    <div className="login-page">
      <div className="login-aurora" aria-hidden="true">
        <span className="login-blob login-blob-1" />
        <span className="login-blob login-blob-2" />
        <span className="login-blob login-blob-3" />
      </div>

      <div className="login-card !max-w-5xl">
        <div className="login-aside !hidden lg:!flex">
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
              Créez votre<br />
              <em>bar en 2 minutes.</em>
            </h1>
            <p className="login-aside-sub">
              7 jours d'essai gratuit, sans carte bancaire. Vérification par Email (gratuit) + support WhatsApp via wa.me
            </p>

            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-400 text-espresso-900">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-cream-50">Essai gratuit 7 jours</p>
                  <p className="text-xs text-cream-100/70">Accès complet, sans limitation</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400 text-white">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-cream-50">Vérification Email (0€)</p>
                  <p className="text-xs text-cream-100/70">Via Resend - 100/jour gratuit</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366] text-white">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-cream-50">Support WhatsApp wa.me</p>
                  <p className="text-xs text-cream-100/70">Lien direct, pas d'API payante</p>
                </div>
              </div>
            </div>
          </div>

          <p className="login-aside-footer">© 2026 AHANDJO — Conçu au Bénin, pour l'Afrique de l'Ouest 🌍</p>
        </div>

        <div className="login-form-panel !overflow-y-auto max-h-[90vh]">
          <div className="login-form-head">
            <div className="login-form-head-row">
              <div>
                <h2 className="login-form-title">Inscription Bar</h2>
                <p className="login-form-sub">Email réel gratuit + WhatsApp support via wa.me</p>
              </div>
              <div className="flex gap-2">
                {onBackToLogin && (
                  <button type="button" className="login-back-btn" onClick={onBackToLogin}>
                    Connexion
                  </button>
                )}
                {onBackToHome && (
                  <button type="button" className="login-back-btn" onClick={onBackToHome} aria-label="Retour à l'accueil">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Accueil</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Section Bar */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-espresso-700 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Informations du Bar
              </h3>

              <div className="login-field">
                <label htmlFor="barName">Nom du Bar *</label>
                <div className={`login-input-wrap ${errors.barName ? 'is-error' : ''}`}>
                  <Store className="login-input-icon h-5 w-5" />
                  <input
                    id="barName"
                    type="text"
                    placeholder="Ex: Bar Le Maquis d'Or"
                    value={formData.barName}
                    onChange={(e) => handleChange('barName', e.target.value)}
                    required
                  />
                </div>
                {errors.barName && <p className="text-xs text-red-600 mt-1">{errors.barName}</p>}
                {suggestedUsername && !formData.username && (
                  <p className="text-xs text-clay-600 mt-1">Identifiant suggéré : {suggestedUsername}</p>
                )}
              </div>

              <div className="login-field">
                <label htmlFor="barAddress">Adresse du Bar *</label>
                <div className={`login-input-wrap ${errors.barAddress ? 'is-error' : ''}`}>
                  <MapPin className="login-input-icon h-5 w-5" />
                  <input
                    id="barAddress"
                    type="text"
                    placeholder="Ex: Rue 123, Cotonou, Bénin"
                    value={formData.barAddress}
                    onChange={(e) => handleChange('barAddress', e.target.value)}
                    required
                  />
                </div>
                {errors.barAddress && <p className="text-xs text-red-600 mt-1">{errors.barAddress}</p>}
              </div>
            </div>

            {/* Section Gestionnaire */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-espresso-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Gestionnaire / Propriétaire
              </h3>

              <div className="login-field">
                <label htmlFor="managerFullName">Nom et Prénom *</label>
                <div className={`login-input-wrap ${errors.managerFullName ? 'is-error' : ''}`}>
                  <User className="login-input-icon h-5 w-5" />
                  <input
                    id="managerFullName"
                    type="text"
                    placeholder="Ex: Jean Dupont"
                    value={formData.managerFullName}
                    onChange={(e) => handleChange('managerFullName', e.target.value)}
                    required
                  />
                </div>
                {errors.managerFullName && <p className="text-xs text-red-600 mt-1">{errors.managerFullName}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="login-field">
                  <label htmlFor="phone">Téléphone *</label>
                  <div className={`login-input-wrap ${errors.phone ? 'is-error' : ''}`}>
                    <Phone className="login-input-icon h-5 w-5" />
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+229 97 00 00 00"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>

                <div className="login-field">
                  <label htmlFor="whatsapp">WhatsApp (support wa.me) *</label>
                  <div className={`login-input-wrap ${errors.whatsapp ? 'is-error' : ''}`}>
                    <MessageCircle className="login-input-icon h-5 w-5" />
                    <input
                      id="whatsapp"
                      type="tel"
                      placeholder="+229 97 00 00 00"
                      value={formData.whatsapp}
                      onChange={(e) => handleChange('whatsapp', e.target.value)}
                      required
                    />
                  </div>
                  {errors.whatsapp && <p className="text-xs text-red-600 mt-1">{errors.whatsapp}</p>}
                  <p className="text-xs text-espresso-400 mt-1">Utilisé pour lien wa.me support → client (0€)</p>
                  {supportWaLink && (
                    <a href={supportWaLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#25D366] hover:underline mt-1 inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> Tester lien WhatsApp support
                    </a>
                  )}
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="email">Email (vérification réelle gratuite) *</label>
                <div className={`login-input-wrap ${errors.email ? 'is-error' : ''}`}>
                  <Mail className="login-input-icon h-5 w-5" />
                  <input
                    id="email"
                    type="email"
                    placeholder="jean@exemple.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                <p className="text-xs text-blue-600 mt-1">Code envoyé par Email via Resend (100/j gratuit)</p>
              </div>
            </div>

            {/* Section Connexion */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-espresso-700 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Identifiants de Connexion
              </h3>

              <div className="login-field">
                <label htmlFor="username">Identifiant de Connexion *</label>
                <div className={`login-input-wrap ${errors.username ? 'is-error' : ''} ${usernameAvailable === true ? '!border-green-500' : ''} ${usernameAvailable === false ? '!border-red-500' : ''}`}>
                  <Key className="login-input-icon h-5 w-5" />
                  <input
                    id="username"
                    type="text"
                    placeholder="Auto-généré depuis le nom du bar"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {usernameChecking && <Loader2 className="h-4 w-4 animate-spin text-espresso-400" />}
                    {usernameAvailable === true && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {usernameAvailable === false && <AlertTriangle className="h-5 w-5 text-red-600" />}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
                    {usernameAvailable === true && <p className="text-xs text-green-600">✓ Identifiant disponible</p>}
                    {usernameAvailable === false && <p className="text-xs text-red-600">✗ Identifiant déjà pris</p>}
                  </div>
                  <button type="button" onClick={handleGenerateUsername} className="text-xs text-clay-600 hover:text-clay-700 font-semibold">
                    Générer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="login-field">
                  <label htmlFor="password">Mot de passe *</label>
                  <div className={`login-input-wrap ${errors.password ? 'is-error' : ''}`}>
                    <Lock className="login-input-icon h-5 w-5" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 caractères"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                    />
                    <button type="button" className="login-toggle-eye" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i <= passwordStrength.score ? (passwordStrength.score >=3 ? 'bg-green-500' : passwordStrength.score===2 ? 'bg-amber-500' : 'bg-red-500') : 'bg-espresso-200'}`} />
                        ))}
                      </div>
                      <p className="text-xs mt-1 text-espresso-500">
                        Force : {passwordStrength.score===0 ? 'Très faible' : passwordStrength.score===1 ? 'Faible' : passwordStrength.score===2 ? 'Moyenne' : passwordStrength.score===3 ? 'Forte' : 'Très forte'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="login-field">
                  <label htmlFor="confirmPassword">Confirmer MDP *</label>
                  <div className={`login-input-wrap ${errors.confirmPassword ? 'is-error' : ''}`}>
                    <Lock className="login-input-icon h-5 w-5" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Répétez le mot de passe"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      required
                    />
                    <button type="button" className="login-toggle-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {errors.general && (
              <div className="login-alert login-alert-error" role="alert">
                <AlertTriangle className="h-5 w-5" />
                <span>{errors.general}</span>
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-800"><strong>0€ MVP :</strong> Vérification par Email réel (Resend gratuit). WhatsApp via lien wa.me pour que le support vous écrive manuellement. Pas d'API payante.</p>
            </div>

            <button className="login-submit" type="submit" disabled={loading || pendingRegistration}>
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  Création du compte...
                </>
              ) : pendingRegistration ? (
                'Vérification en cours...'
              ) : (
                'Créer mon bar - Essai 7 jours gratuit'
              )}
            </button>

            <p className="text-xs text-espresso-400 text-center">
              Email de vérification gratuit (Resend) + support WhatsApp wa.me
            </p>
          </form>
        </div>
      </div>

      {showVerification && (
        <WhatsappVerificationModal
          identifier={formData.email}
          type={verificationType}
          verificationId={verificationId}
          onVerified={handleVerified}
          onClose={() => {
            setShowVerification(false);
            setPendingRegistration(false);
          }}
          onResend={handleResendCode}
        />
      )}
    </div>
  );
};

export default RegistrationForm;
