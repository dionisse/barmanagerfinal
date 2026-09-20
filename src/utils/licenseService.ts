/**
 * ============================================================================
 * SERVICE CENTRAL DES LICENCES AHANDJO
 * ============================================================================
 * Restructuration du système de licences : ce service est la source unique de
 * vérité pour les tarifs, le calcul de statut (J-7 / J-3 / J-0), le
 * renouvellement (prolongation sans trou d'accès) et la lecture des licences
 * côté Supabase. Auparavant cette logique était dupliquée entre
 * LicencesModule, dataService, supabaseService et Navigation.
 * ============================================================================
 */
import { License, LicensePlan, LicenseStatusInfo, UserLot } from '../types';
import { supabase } from './supabaseService';

/* ---------------------------------------------------------------------------
 * Offres commerciales (tarifs officiels AHANDJO — FCFA)
 * Kpêvi = 1 mois, Kléoun = 3 mois, Agbon = 6 mois, Baba = 12 mois
 * ------------------------------------------------------------------------- */
export const LICENSE_PLANS: LicensePlan[] = [
  {
    key: 'Kpêvi',
    libelle: 'Kpêvi — 1 mois',
    duree: 1,
    prix: 15000,
    description: 'Idéal pour tester la solution',
    couleur: 'border-blue-500 bg-blue-50'
  },
  {
    key: 'Kléoun',
    libelle: 'Kléoun — 3 mois',
    duree: 3,
    prix: 40000,
    description: 'Trimestre économique',
    couleur: 'border-emerald-500 bg-emerald-50',
    economie: 'Économisez 5 000 FCFA'
  },
  {
    key: 'Agbon',
    libelle: 'Agbon — 6 mois',
    duree: 6,
    prix: 70000,
    description: 'Semestre, le meilleur rapport durée/prix',
    couleur: 'border-gold-500 bg-gold-50',
    economie: 'Économisez 20 000 FCFA'
  },
  {
    key: 'Baba',
    libelle: 'Baba — 12 mois',
    duree: 12,
    prix: 120000,
    description: 'Année complète, tranquillité assurée',
    couleur: 'border-clay-600 bg-clay-50',
    economie: 'Économisez 60 000 FCFA'
  }
];

export const getPlan = (key: string): LicensePlan | undefined =>
  LICENSE_PLANS.find(p => p.key === key);

/* ---------------------------------------------------------------------------
 * Calcul de statut — jalons de notification J-7, J-3 et jour d'expiration
 * ------------------------------------------------------------------------- */
export function computeLicenseStatus(license: Pick<License, 'dateFin'>): LicenseStatusInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(license.dateFin);
  endDate.setHours(23, 59, 59, 999); // fin de journée de la date d'expiration

  // Jours calendaires restants (floor, pas ceil) : si dateFin = aujourd'hui,
  // daysRemaining = 0 (« expire aujourd'hui ») ; le lendemain = -1 (expirée).
  // Aligné sur le contrôle d'accès (fin de journée de la date de fin incluse).
  const daysRemaining = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining, milestone: 0 };
  }
  if (daysRemaining === 0) {
    return { status: 'warning', daysRemaining: 0, milestone: 0 }; // dernier jour
  }

  let milestone: 7 | 3 | 0 | null = null;
  if (daysRemaining <= 3) milestone = 3;
  else if (daysRemaining <= 7) milestone = 7;

  return {
    status: daysRemaining <= 7 ? 'warning' : 'active',
    daysRemaining,
    milestone
  };
}

/** Libellé humain du jalon (utilisé par les notifications) */
export function milestoneLabel(daysRemaining: number): string {
  if (daysRemaining < 0) return "Votre licence AHANDJO a expiré";
  if (daysRemaining === 0) return "Votre licence AHANDJO expire aujourd'hui";
  return `Votre licence AHANDJO expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`;
}

/* ---------------------------------------------------------------------------
 * Génération de clé de licence (format XXXX-XXXX-XXXX-XXXX)
 * ------------------------------------------------------------------------- */
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${block()}-${block()}-${block()}-${block()}`;
}

/* ---------------------------------------------------------------------------
 * Utilitaires de dates (local, format YYYY-MM-DD)
 * ------------------------------------------------------------------------- */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Gestion fin de mois (ex. 31 janv + 1 mois → 28/29 fév)
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/* ---------------------------------------------------------------------------
 * Lectures Supabase
 * ------------------------------------------------------------------------- */

/** Toutes les licences d'un lot, triées de la plus ancienne à la plus récente */
export async function getLicensesForLot(userLotId: string): Promise<License[]> {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('user_lot_id', userLotId)
    .order('date_debut', { ascending: true });

  if (error) {
    console.error('❌ getLicensesForLot:', error.message);
    return [];
  }
  return (data || []).map(mapDbLicense);
}

/** Toutes les licences + lots (vue propriétaire) */
export async function getAllLicensesWithLots(): Promise<{ licenses: License[]; userLots: UserLot[] }> {
  const [licRes, lotRes] = await Promise.all([
    supabase.from('licenses').select('*').order('date_debut', { ascending: false }),
    supabase.from('user_lots').select('*').order('date_creation', { ascending: false })
  ]);

  const lots: UserLot[] = (lotRes.data || []).map((l: any) => ({
    id: l.id,
    gestionnaire: { username: l.gestionnaire_username, password: l.gestionnaire_password },
    employe: { username: l.employe_username, password: l.employe_password },
    dateCreation: l.date_creation,
    status: l.status
  }));

  const licenses: License[] = (licRes.data || []).map((l: any) => {
    const lic = mapDbLicense(l);
    lic.userLot = lots.find(lot => lot.id === lic.userLotId);
    return lic;
  });

  return { licenses, userLots: lots };
}

/** La licence valide (couvrant aujourd'hui) d'un lot, ou la plus récente expirée */
export async function getValidLicenseForLot(userLotId: string): Promise<License | null> {
  const licenses = await getLicensesForLot(userLotId);
  if (licenses.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Licences actives couvrant aujourd'hui → prendre la plus longue échéance
  const valid = licenses
    .filter(l => {
      const end = new Date(l.dateFin);
      end.setHours(23, 59, 59, 999);
      return l.active && end >= today;
    })
    .sort((a, b) => new Date(b.dateFin).getTime() - new Date(a.dateFin).getTime());

  if (valid.length > 0) return valid[0];

  // Sinon la plus récente (expirée) pour affichage
  return licenses[licenses.length - 1];
}

/** Mapping colonnes snake_case Supabase → modèle License de l'app */
export function mapDbLicense(l: any): License {
  return {
    id: String(l.id),
    type: l.license_type,
    duree: l.duree,
    prix: Number(l.prix),
    dateDebut: l.date_debut,
    dateFin: l.date_fin,
    cle: l.cle,
    active: l.active,
    userLotId: l.user_lot_id
  };
}

/* ---------------------------------------------------------------------------
 * RENOUVELLEMENT — prolongation sans trou d'accès
 * -------------------------------------------------------------------------
 * Principe : la nouvelle licence démarre à la date de fin de la licence
 * courante si celle-ci est encore valide (l'abonnement payé est ajouté à la
 * période restante), sinon elle démarre aujourd'hui. L'ancienne licence reste
 * active jusqu'à son expiration naturelle afin que l'accès ne soit jamais
 * interrompu.
 * ------------------------------------------------------------------------- */
export interface RenewLicenseResult {
  success: boolean;
  license?: License;
  message?: string;
}

export async function renewLicenseForLot(
  userLotId: string,
  plan: LicensePlan,
  options: { source?: string } = {}
): Promise<RenewLicenseResult> {
  try {
    if (!navigator.onLine) {
      return { success: false, message: 'Hors ligne — le renouvellement nécessite une connexion internet.' };
    }

    const current = await getValidLicenseForLot(userLotId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateDebut: Date;
    if (current) {
      const currentEnd = new Date(current.dateFin);
      currentEnd.setHours(23, 59, 59, 999);
      // Prolongation : démarrer à l'échéance si la licence courante couvre encore aujourd'hui
      dateDebut = currentEnd >= today ? new Date(current.dateFin) : today;
    } else {
      dateDebut = today;
    }

    const dateFin = addMonths(dateDebut, plan.duree);

    const newLicense: License = {
      id: `LIC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      type: plan.key,
      duree: plan.duree,
      prix: plan.prix,
      dateDebut: toLocalISODate(dateDebut),
      dateFin: toLocalISODate(dateFin),
      cle: generateLicenseKey(),
      active: true,
      userLotId
    };

    // 1. Insertion dans Supabase (source de vérité)
    const { error } = await supabase.from('licenses').insert([{
      id: newLicense.id,
      license_type: newLicense.type,
      duree: newLicense.duree,
      prix: newLicense.prix,
      date_debut: newLicense.dateDebut,
      date_fin: newLicense.dateFin,
      cle: newLicense.cle,
      active: true,
      user_lot_id: userLotId
    }]);

    if (error) {
      console.error('❌ renewLicenseForLot — insert Supabase:', error.message);
      return { success: false, message: `Erreur d'enregistrement : ${error.message}` };
    }

    // 2. Persistance locale (IndexedDB) pour un accès hors-ligne cohérent
    //    (écriture directe — sans repasser par addLicense qui resynchroniserait
    //    le lot et la licence vers Supabase et créerait des doublons)
    try {
      const { indexedDBService } = await import('./indexedDBService');
      await indexedDBService.saveData('licenses', newLicense);
    } catch (e) {
      console.warn('⚠️ Persistance locale de la licence impossible (non bloquant):', e);
    }

    // 3. Rafraîchit la licence de l'utilisateur connecté si c'est son lot
    refreshCurrentUserLicense(newLicense);

    // 4. Notifie l'application (bandeaux, Navigation, Dashboard…)
    window.dispatchEvent(new CustomEvent('licenseRenewed', {
      detail: { license: newLicense, userLotId, source: options.source || 'manual' }
    }));

    console.log(`✅ Licence ${plan.key} activée pour le lot ${userLotId} (${newLicense.dateDebut} → ${newLicense.dateFin})`);
    return { success: true, license: newLicense };
  } catch (error: any) {
    console.error('❌ renewLicenseForLot:', error);
    return { success: false, message: error?.message || 'Erreur inconnue' };
  }
}

/** Met à jour l'utilisateur courant (localStorage) avec la nouvelle licence */
export function refreshCurrentUserLicense(newLicense: License) {
  try {
    const raw = localStorage.getItem('gobex_current_user');
    if (!raw) return;
    const user = JSON.parse(raw);
    if (user.userLotId && user.userLotId === newLicense.userLotId) {
      user.license = newLicense;
      localStorage.setItem('gobex_current_user', JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('userDataUpdated'));
    }
  } catch (e) {
    console.warn('⚠️ refreshCurrentUserLicense:', e);
  }
}
