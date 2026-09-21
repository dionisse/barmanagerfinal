/**
 * Modale de vérification Email (gratuit Resend) + WhatsApp via wa.me support
 * En MVP 0€ : code envoyé par Email réel, WhatsApp = lien wa.me pour support
 */
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Mail, ShieldCheck, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { getWhatsappLink } from '../utils/whatsappService';

interface WhatsappVerificationModalProps {
  identifier: string; // email ou numéro WhatsApp
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
  const [lastWaLink, setLastWaLink] = useState('');

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

  useEffect(() => {
    const wa = localStorage.getItem('ahandjo_last_whatsapp_link');
    if (wa) setLastWaLink(wa);
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
        setResendMessage('Nouveau code envoyé par Email ! Vérifiez votre boîte + spam');
        setCode('');
        const wa = localStorage.getItem('ahandjo_last_whatsapp_link');
        if (wa) setLastWaLink(wa);
      } else {
        setError(result.message || 'Impossible de renvoyer le code');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur renvoi code');
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    const lastCode = localStorage.getItem('ahandjo_last_verification_code');
    if (lastCode && lastCode.length === 6) {
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
            <div className="p-2.5 rounded-xl bg-blue-100">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-espresso-900">
                Vérification Email (gratuit)
              </h2>
              <p className="text-xs text-espresso-600 mt-0.5">
                Code envoyé à {identifier}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-espresso-500 hover:bg-cream-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              Nous avons envoyé un code à 6 chiffres par <strong>Email via Resend (100/j gratuit)</strong> à {identifier}. Saisissez-le ci-dessous.
            </p>
            <p className="text-xs text-blue-700 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Expire dans {formatTime(timeLeft)} • Vérifiez spam si non reçu
            </p>
          </div>

          <div className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl p-3">
            <p className="text-xs font-bold text-[#128C7E] flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> WhatsApp Support via wa.me (0€)
            </p>
            <p className="text-xs text-espresso-600 mt-1">
              Pas d'API payante pour l'instant. Le support peut vous écrire manuellement sur WhatsApp depuis son numéro.
            </p>
            {lastWaLink && (
              <a href={lastWaLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#25D366] hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> Ouvrir chat WhatsApp support → client
              </a>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-espresso-800 mb-2">
              Code de vérification (6 chiffres)
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
            <span className="text-espresso-500">Pas reçu ?</span>
            <button
              onClick={handleResend}
              disabled={resending || timeLeft > 540}
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
                  Renvoyer par Email
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-espresso-400 text-center">
            MVP 0€ : Email réel via Resend + WhatsApp via wa.me support manuel. Code aussi en console F12 en dev.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsappVerificationModal;
