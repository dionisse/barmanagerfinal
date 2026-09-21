/**
 * ============================================================================
 * SERVICE DE SÉCURITÉ — Authentification renforcée AHANDJO
 * ============================================================================
 * Fonctionnalités :
 * - Hachage des mots de passe (bcrypt)
 * - Rate limiting : blocage après 5 tentatives échouées (10min, 15min, 30min...)
 * - Codes de vérification WhatsApp / Email
 * - Validation de la force des mots de passe
 * - Génération d'identifiants sécurisés
 * - Tokens de réinitialisation
 * ============================================================================
 */
import bcrypt from 'bcryptjs';
import { supabase } from './supabaseService';
import { LoginAttempt } from '../types';

const SALT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;
const LOGIN_ATTEMPTS_KEY = 'ahandjo_login_attempts';
const LOCKOUT_DURATIONS = [10, 15, 30, 60, 120, 240]; // minutes: 10, 15, 30, 1h, 2h, 4h

/* ---------------------------------------------------------------------------
 * Hachage des mots de passe
 * ------------------------------------------------------------------------- */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  // Support rétrocompatibilité : si le mot de passe stocké n'est pas hashé (ancien système)
  if (!hashed.startsWith('$2a$') && !hashed.startsWith('$2b$') && !hashed.startsWith('$2y$')) {
    return plain === hashed;
  }
  return await bcrypt.compare(plain, hashed);
}

/* ---------------------------------------------------------------------------
 * Validation de la force du mot de passe
 * ------------------------------------------------------------------------- */
export interface PasswordStrength {
  score: number; // 0-4
  isStrong: boolean;
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Le mot de passe doit contenir au moins 8 caractères');
  } else {
    score++;
  }

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Utilisez des majuscules et minuscules');
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    feedback.push('Ajoutez au moins un chiffre');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Ajoutez un caractère spécial (!@#$%...)');
  }

  // Liste de mots de passe courants à bloquer
  const commonPasswords = ['password', '123456', '12345678', 'azerty', 'admin', 'gobex', 'ahandjo', 'motdepasse'];
  if (commonPasswords.includes(password.toLowerCase())) {
    feedback.push('Ce mot de passe est trop courant');
    score = 0;
  }

  return {
    score: Math.min(score, 4),
    isStrong: score >= 3 && password.length >= 8,
    feedback
  };
}

/* ---------------------------------------------------------------------------
 * Génération d'identifiant à partir du nom du bar
 * ------------------------------------------------------------------------- */
export function generateUsernameFromBarName(barName: string): string {
  // Nettoie le nom du bar : minuscules, sans accents, sans espaces spéciaux
  let base = barName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlève accents
    .replace(/[^a-z0-9]/g, '') // garde seulement alphanum
    .substring(0, 12);

  if (base.length < 3) base = 'bar' + base;

  // Ajoute un suffixe aléatoire pour l'unicité
  const suffix = Math.floor(100 + Math.random() * 900); // 100-999
  return `${base}${suffix}`;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    // Vérifie dans Supabase si le username existe déjà
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Vérification username Supabase échouée:', error.message);
        // En cas d'erreur, on fait une vérification locale
      } else if (data) {
        return false; // existe déjà
      }

      // Vérifie aussi dans user_lots
      const { data: lots, error: lotsError } = await supabase
        .from('user_lots')
        .select('gestionnaire_username, employe_username')
        .or(`gestionnaire_username.eq.${username},employe_username.eq.${username}`);

      if (!lotsError && lots && lots.length > 0) {
        return false;
      }
    }

    // Vérification locale dans IndexedDB via localStorage fallback
    const localUsers = JSON.parse(localStorage.getItem('ahandjo_local_usernames') || '[]');
    if (localUsers.includes(username)) {
      return false;
    }

    return true;
  } catch (e) {
    console.warn('⚠️ isUsernameAvailable error:', e);
    return true; // en cas d'erreur, on laisse passer (sera vérifié à la création)
  }
}

export async function generateUniqueUsername(barName: string): Promise<string> {
  let attempts = 0;
  let username = generateUsernameFromBarName(barName);

  while (attempts < 10) {
    if (await isUsernameAvailable(username)) {
      return username;
    }
    // Génère un nouveau suffixe
    username = generateUsernameFromBarName(barName + Math.random().toString(36).substring(2, 5));
    attempts++;
  }

  // Dernier recours : timestamp
  return `bar${Date.now().toString().slice(-6)}`;
}

/* ---------------------------------------------------------------------------
 * Rate limiting — blocage après 5 tentatives
 * ------------------------------------------------------------------------- */
function readAttempts(): Record<string, LoginAttempt> {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAttempts(data: Record<string, LoginAttempt>) {
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
}

export function getLoginAttempt(username: string): LoginAttempt | null {
  const all = readAttempts();
  return all[username.toLowerCase()] || null;
}

export function isAccountLocked(username: string): { locked: boolean; remainingMinutes?: number; lockedUntil?: string } {
  const attempt = getLoginAttempt(username);
  if (!attempt || !attempt.lockedUntil) return { locked: false };

  const lockedUntil = new Date(attempt.lockedUntil);
  const now = new Date();

  if (lockedUntil > now) {
    const remainingMs = lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { locked: true, remainingMinutes, lockedUntil: attempt.lockedUntil };
  }

  // Déverrouillé
  return { locked: false };
}

export function recordFailedAttempt(username: string): { locked: boolean; remainingMinutes?: number; attempts: number } {
  const key = username.toLowerCase();
  const all = readAttempts();
  const now = new Date().toISOString();

  let attempt = all[key] || {
    username: key,
    attempts: 0,
    lastAttempt: now,
    lockCount: 0
  };

  attempt.attempts += 1;
  attempt.lastAttempt = now;

  if (attempt.attempts >= MAX_ATTEMPTS) {
    // Bloque le compte
    const lockDuration = LOCKOUT_DURATIONS[Math.min(attempt.lockCount, LOCKOUT_DURATIONS.length - 1)];
    const lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000).toISOString();
    attempt.lockedUntil = lockedUntil;
    attempt.lockCount += 1;
    attempt.attempts = 0; // reset pour le prochain cycle

    console.log(`🔒 Compte ${username} bloqué ${lockDuration}min après ${MAX_ATTEMPTS} tentatives`);

    all[key] = attempt;
    writeAttempts(all);

    // Sauvegarde aussi côté Supabase si possible (audit)
    saveAttemptToSupabase(attempt).catch(() => {});

    return { locked: true, remainingMinutes: lockDuration, attempts: MAX_ATTEMPTS };
  }

  all[key] = attempt;
  writeAttempts(all);
  saveAttemptToSupabase(attempt).catch(() => {});

  return { locked: false, attempts: attempt.attempts };
}

export function recordSuccessfulLogin(username: string) {
  const key = username.toLowerCase();
  const all = readAttempts();
  if (all[key]) {
    delete all[key];
    writeAttempts(all);
  }
}

async function saveAttemptToSupabase(attempt: LoginAttempt) {
  try {
    if (!navigator.onLine) return;
    await supabase.from('login_attempts').upsert({
      username: attempt.username,
      attempts: attempt.attempts,
      last_attempt: attempt.lastAttempt,
      locked_until: attempt.lockedUntil || null,
      lock_count: attempt.lockCount,
      updated_at: new Date().toISOString()
    }, { onConflict: 'username' });
  } catch (e) {
    // Table peut ne pas exister, non bloquant
  }
}

/* ---------------------------------------------------------------------------
 * Codes de vérification (WhatsApp / Email)
 * ------------------------------------------------------------------------- */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 chiffres
}

export function generatePasswordResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/* ---------------------------------------------------------------------------
 * Validation des champs d'inscription
 * ------------------------------------------------------------------------- */
export interface RegistrationValidation {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateRegistrationData(data: {
  barName: string;
  barAddress: string;
  managerFullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}): RegistrationValidation {
  const errors: Record<string, string> = {};

  if (!data.barName || data.barName.trim().length < 2) {
    errors.barName = 'Le nom du bar doit contenir au moins 2 caractères';
  }

  if (!data.barAddress || data.barAddress.trim().length < 5) {
    errors.barAddress = "L'adresse doit contenir au moins 5 caractères";
  }

  if (!data.managerFullName || data.managerFullName.trim().length < 3) {
    errors.managerFullName = 'Le nom complet doit contenir au moins 3 caractères';
  }

  if (!data.phone || !/^\+?[0-9\s\-]{8,15}$/.test(data.phone.replace(/\s/g, ''))) {
    errors.phone = 'Numéro de téléphone invalide';
  }

  if (!data.whatsapp || !/^\+?[0-9\s\-]{8,15}$/.test(data.whatsapp.replace(/\s/g, ''))) {
    errors.whatsapp = 'Numéro WhatsApp invalide';
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Adresse email invalide';
  }

  if (!data.username || data.username.trim().length < 3) {
    errors.username = "L'identifiant doit contenir au moins 3 caractères";
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.username = "L'identifiant ne doit contenir que lettres, chiffres et _";
  }

  if (!data.password) {
    errors.password = 'Le mot de passe est requis';
  } else {
    const strength = checkPasswordStrength(data.password);
    if (!strength.isStrong) {
      errors.password = strength.feedback[0] || 'Mot de passe trop faible';
    }
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
