/**
 * Bandeau d'essai 7 jours + mode lecture seule
 */
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CreditCard, Lock, Sparkles } from 'lucide-react';
import { UserLot, License } from '../types';
import { computeTrialStatus } from '../utils/trialService';
import LicenseCheckoutModal from './LicenseCheckoutModal';
import { User } from '../types';

interface TrialBannerProps {
  user: User;
  userLot: UserLot | null;
  license: License | null;
  onLicensePurchased?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ user, userLot, license, onLicensePurchased }) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [trialStatus, setTrialStatus] = useState(() => computeTrialStatus(userLot, license));

  useEffect(() => {
    setTrialStatus(computeTrialStatus(userLot, license));
    const interval = setInterval(() => {
      setTrialStatus(computeTrialStatus(userLot, license));
    }, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [userLot, license]);

  if (!trialStatus.isTrial && !trialStatus.isReadOnly) return null;

  if (trialStatus.isExpired) {
    return (
      <>
        <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100 flex-shrink-0">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {trialStatus.isTrial ? 'Essai expiré — Mode lecture seule' : 'Licence expirée — Mode lecture seule'}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {trialStatus.message} Vous pouvez consulter vos données mais vous ne pouvez plus ajouter, modifier ou supprimer de données.
                Achetez une licence pour réactiver immédiatement toutes les fonctionnalités. Activation automatique après paiement FEDAPAY.
              </p>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-cream-50 text-sm font-bold shadow-card flex-shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              Acheter une licence
            </button>
          </div>
        </div>

        {showCheckout && (
          <LicenseCheckoutModal
            user={user}
            userLotId={userLot?.id || user.userLotId}
            lotLabel={userLot?.barName || user.username}
            currentLicense={license}
            onClose={() => setShowCheckout(false)}
            onRenewed={() => {
              setShowCheckout(false);
              onLicensePurchased?.();
              window.location.reload();
            }}
          />
        )}
      </>
    );
  }

  // Essai en cours
  const isUrgent = trialStatus.daysRemaining <= 2;

  return (
    <>
      <div className={`mb-6 rounded-xl border-2 p-5 ${isUrgent ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`p-3 rounded-xl flex-shrink-0 ${isUrgent ? 'bg-amber-100' : 'bg-blue-100'}`}>
            {isUrgent ? <Clock className="h-6 w-6 text-amber-600" /> : <Sparkles className="h-6 w-6 text-blue-600" />}
          </div>
          <div className="flex-1">
            <h3 className={`font-display font-bold text-lg flex items-center gap-2 ${isUrgent ? 'text-amber-800' : 'text-blue-800'}`}>
              <Sparkles className="h-5 w-5" />
              Essai gratuit : {trialStatus.daysRemaining} jour{trialStatus.daysRemaining > 1 ? 's' : ''} restant{trialStatus.daysRemaining > 1 ? 's' : ''}
            </h3>
            <p className={`text-sm mt-1 ${isUrgent ? 'text-amber-700' : 'text-blue-700'}`}>
              Votre bar <strong>{userLot?.barName || 'votre établissement'}</strong> est en période d'essai gratuit jusqu'au {trialStatus.trialEndsAt ? new Date(trialStatus.trialEndsAt).toLocaleDateString('fr-FR') : ''}.
              {isUrgent
                ? ' Pensez à choisir votre licence pour éviter le passage en lecture seule.'
                : ' Profitez de toutes les fonctionnalités. Choisissez votre licence quand vous êtes prêt.'}
            </p>
          </div>
          <button
            onClick={() => setShowCheckout(true)}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-card flex-shrink-0 ${isUrgent ? 'bg-clay-600 hover:bg-clay-700 text-cream-50' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            <CreditCard className="h-4 w-4" />
            Choisir ma licence
          </button>
        </div>
      </div>

      {showCheckout && (
        <LicenseCheckoutModal
          user={user}
          userLotId={userLot?.id || user.userLotId}
          lotLabel={userLot?.barName || user.username}
          currentLicense={license}
          onClose={() => setShowCheckout(false)}
          onRenewed={() => {
            setShowCheckout(false);
            onLicensePurchased?.();
          }}
        />
      )}
    </>
  );
};

export default TrialBanner;
