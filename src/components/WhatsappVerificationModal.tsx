/**
 * Modale de vérification WhatsApp / Email
 * Envoie un code à 6 chiffres et demande à l'utilisateur de le saisir
 */
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Mail, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';

interface WhatsappVerificationModalProps {
  identifier: string; // numéro WhatsApp ou email
  type: 'whatsapp' | 'email';
  verificationId: string;
  onVerified: () => void;
  onClose: () => void;
  onResend: () => Promise<{ success: boolean; verificationId?: string; message?: string }>;
}

const WhatsappVerificationModal: React.FC<WhatsappVerificationModalProps> = ({
  identifier,
  type,
  verificationId,
  onVerified,
  onClose,
  onResend
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 min
  const [currentVerificationId, setCurrentVerificationId] = useState(verificationId);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { verifyCode } = await import('../utils/registrationService');
      const result = await verifyCode(currentVerificationId, code);

      if (result.success) {
        onVerified();
      } else {
        setError(result.message || 'Code incorrect');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de vérification');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    setError('');

    try {
      const result = await onResend();
      if (result.success && result.verificationId) {
        setCurrentVerificationId(result.verificationId);
        setTimeLeft(600);
        setResendMessage('Nouveau code envoyé !');
        setCode('');
      } else {
        setError(result.message || 'Impossible de renvoyer le code');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur renvoi code');
    } finally {
      setResending(false);
    }
  };

  // Pour dev : auto-remplissage si code en localStorage
  useEffect(() => {
    const lastCode = localStorage.getItem('ahandjo_last_verification_code');
    if (lastCode && lastCode.length === 6) {
      // Ne pas auto-remplir en prod, mais aide en dev
      console.log('🔑 Dernier code (dev):', lastCode);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-espresso-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-cream-50 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="kente-strip h-1.5 rounded-t-2xl" />

        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-espresso-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-clay-100">
              {type === 'whatsapp' ? (
                <MessageCircle className="h-5 w-5 text-clay-600" />
              ) : (
                <Mail className="h-5 w-5 text-clay-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-espresso-900">
                Vérification {type === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </h2>
              <p className="text-xs text-espresso-600 mt-0.5">
                Code envoyé à {identifier}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-espresso-500 hover:bg-cream-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              {type === 'whatsapp'
                ? `Nous avons envoyé un code à 6 chiffres sur WhatsApp au ${identifier}. Saisissez-le ci-dessous pour vérifier votre numéro.`
                : `Nous avons envoyé un code à 6 chiffres par email à ${identifier}.`}
            </p>
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Expire dans {formatTime(timeLeft)} • Ne partagez jamais ce code
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-espresso-800 mb-2">
              Code de vérification
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full text-center text-2xl font-bold tracking-[0.3em] rounded-xl border-2 border-espresso-900/15 bg-white px-4 py-3 text-espresso-900 placeholder-espresso-300 focus:outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {resendMessage && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <p className="text-sm text-green-700">{resendMessage}</p>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-clay-600 hover:bg-clay-700 disabled:bg-espresso-300 text-cream-50 font-semibold py-3 px-4 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                Vérifier le code
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-sm">
            <span className="text-espresso-500">
              Vous n'avez pas reçu le code ?
            </span>
            <button
              onClick={handleResend}
              disabled={resending || timeLeft > 540} // attend 1 min avant resend
              className="flex items-center gap-1.5 text-clay-600 hover:text-clay-700 font-semibold disabled:text-espresso-400 disabled:cursor-not-allowed"
            >
              {resending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Renvoyer
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-espresso-400 text-center">
            En développement, le code s'affiche dans la console du navigateur (F12)
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsappVerificationModal;
