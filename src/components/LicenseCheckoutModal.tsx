/**
 * ============================================================================
 * MODALE D'ACHAT / RENOUVELLEMENT DE LICENCE (paiement FEDAPAY)
 * ============================================================================
 * Utilisée par :
 *   • le bandeau du Dashboard (gestionnaire / employé renouvelle son lot),
 *   • le module Licences (le propriétaire renouvelle pour un client).
 * Choix du plan → paiement FEDAPAY (Mobile Money / carte) → retour dans
 * l'app → activation automatique de la licence.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { X, CreditCard, ShieldCheck, Loader2, TriangleAlert as AlertTriangle, Sparkles, Phone, BadgeCheck } from 'lucide-react';
import { License, User, LicensePlan } from '../types';
import { LICENSE_PLANS, computeLicenseStatus, milestoneLabel } from '../utils/licenseService';
import { startLicenseCheckout, getFedapayConfig, FedapayConfig } from '../utils/fedapayService';

interface LicenseCheckoutModalProps {
  user: User;
  /** Lot concerné (par défaut : celui de l'utilisateur connecté) */
  userLotId?: string;
  lotLabel?: string;
  currentLicense?: License | null;
  onClose: () => void;
  /** Callback optionnel après renouvellement confirmé (retour paiement) */
  onRenewed?: () => void;
}

const LicenseCheckoutModal: React.FC<LicenseCheckoutModalProps> = ({
  user,
  userLotId,
  lotLabel,
  currentLicense,
  onClose,
  onRenewed
}) => {
  const [selectedPlan, setSelectedPlan] = useState<LicensePlan | null>(null);
  const [payerPhone, setPayerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FedapayConfig | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);

  const effectiveLotId = userLotId || user.userLotId;

  useEffect(() => {
    getFedapayConfig()
      .then(setConfig)
      .finally(() => setCheckingConfig(false));
  }, []);

  useEffect(() => {
    const handleRenewed = () => {
      onRenewed?.();
      onClose();
    };
    window.addEventListener('licenseRenewed', handleRenewed);
    return () => window.removeEventListener('licenseRenewed', handleRenewed);
  }, [onRenewed, onClose]);

  const statusInfo = currentLicense ? computeLicenseStatus(currentLicense) : null;

  const handlePay = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);

    const result = await startLicenseCheckout({
      plan: selectedPlan,
      user,
      userLotId: effectiveLotId,
      payerPhone: payerPhone.trim() || undefined
    });

    setLoading(false);

    if (!result.success || !result.paymentUrl) {
      setError(result.message || 'Impossible de démarrer le paiement.');
      return;
    }

    // Redirection vers la page de paiement sécurisée FEDAPAY.
    // Au retour (?fedapay_return=1&status=…), App.tsx active la licence.
    setRedirecting(true);
    window.location.href = result.paymentUrl;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Fond */}
      <div
        className="absolute inset-0 bg-espresso-900/60 backdrop-blur-sm"
        onClick={redirecting ? undefined : onClose}
      />

      {/* Modale */}
      <div className="relative bg-cream-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        {/* Liseré kente */}
        <div className="kente-strip h-1.5 rounded-t-2xl" aria-hidden="true" />

        {/* En-tête */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-espresso-900/10">
          <div>
            <h2 className="text-xl font-display font-bold text-espresso-900">
              {currentLicense ? 'Renouveler votre licence' : 'Acheter une licence'}
            </h2>
            <p className="text-sm text-espresso-600 mt-1">
              {lotLabel
                ? `Lot : ${lotLabel} — `
                : ''}
              Paiement sécurisé FEDAPAY · Mobile Money & carte bancaire
            </p>
          </div>
          {!redirecting && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-espresso-500 hover:bg-cream-200 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Statut de la licence courante */}
          {statusInfo && currentLicense && (
            <div className={`rounded-xl p-4 border ${
              statusInfo.status === 'expired'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                {statusInfo.status === 'expired'
                  ? <AlertTriangle className="h-5 w-5 text-red-600" />
                  : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                <div>
                  <p className="font-semibold text-sm text-espresso-900">
                    {milestoneLabel(statusInfo.daysRemaining)}
                  </p>
                  <p className="text-xs text-espresso-600 mt-0.5">
                    Licence actuelle : {currentLicense.type} — expire le{' '}
                    {new Date(currentLicense.dateFin).toLocaleDateString('fr-FR')}.
                    Le temps restant est conservé : la nouvelle période s'ajoute à votre échéance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Choix du plan */}
          <div>
            <h3 className="text-sm font-semibold text-espresso-800 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-600" />
              Choisissez votre formule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LICENSE_PLANS.map((plan) => {
                const isSelected = selectedPlan?.key === plan.key;
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    disabled={redirecting}
                    className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? 'border-clay-600 bg-clay-50 shadow-md ring-2 ring-clay-600/20'
                        : 'border-espresso-900/10 bg-white hover:border-clay-400'
                    }`}
                  >
                    {plan.economie && (
                      <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-gold-500 text-espresso-900 text-[10px] font-bold">
                        {plan.economie}
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-espresso-900">{plan.key}</span>
                      {isSelected && <BadgeCheck className="h-5 w-5 text-clay-600" />}
                    </div>
                    <p className="text-xs text-espresso-600 mt-0.5">{plan.duree} mois · {plan.description}</p>
                    <p className="text-lg font-bold text-clay-700 mt-2">
                      {plan.prix.toLocaleString('fr-FR')} <span className="text-xs font-medium text-espresso-600">FCFA</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Téléphone payeur (reçu Mobile Money) */}
          <div>
            <label className="text-sm font-semibold text-espresso-800 flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-clay-600" />
              Téléphone pour le reçu de paiement <span className="font-normal text-espresso-500">(optionnel)</span>
            </label>
            <input
              type="tel"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder="ex : 229 97 00 00 00"
              disabled={redirecting}
              className="w-full rounded-lg border border-espresso-900/15 bg-white px-3 py-2 text-sm text-espresso-900 placeholder-espresso-400 focus:outline-none focus:ring-2 focus:ring-clay-500"
            />
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Configuration manquante */}
          {checkingConfig ? (
            <div className="flex items-center gap-2 text-sm text-espresso-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Vérification de la configuration du paiement…
            </div>
          ) : !config || (!config.secretKey && !config.edgeFunctionUrl) ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800">
                <strong>Paiement en ligne non configuré.</strong> Le propriétaire de la plateforme doit
                activer FEDAPAY dans <em>Paramètres → Paiements FEDAPAY</em> (clé secrète sandbox ou
                production). En attendant, contactez-le directement pour renouveler votre licence.
              </p>
            </div>
          ) : null}

          {/* Récap + bouton payer */}
          <div className="rounded-xl bg-espresso-900 text-cream-100 p-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Formule sélectionnée</span>
              <span className="font-semibold">{selectedPlan ? `${selectedPlan.key} (${selectedPlan.duree} mois)` : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Montant à payer</span>
              <span className="font-bold text-gold-400">
                {selectedPlan ? `${selectedPlan.prix.toLocaleString('fr-FR')} FCFA` : '—'}
              </span>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={!selectedPlan || loading || redirecting || checkingConfig || (!!config && !config.secretKey && !config.edgeFunctionUrl)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-clay-600 hover:bg-clay-700 disabled:bg-espresso-300 disabled:cursor-not-allowed text-cream-50 font-semibold py-3 px-4 transition-colors"
          >
            {redirecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirection vers la page de paiement sécurisée…
              </>
            ) : loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Création du paiement…
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                {selectedPlan
                  ? `Payer ${selectedPlan.prix.toLocaleString('fr-FR')} FCFA via FEDAPAY`
                  : 'Sélectionnez une formule'}
              </>
            )}
          </button>

          <p className="text-xs text-espresso-500 flex items-center justify-center gap-1.5 text-center">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Paiement sécurisé FEDAPAY — activation automatique de votre licence dès confirmation du règlement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseCheckoutModal;
