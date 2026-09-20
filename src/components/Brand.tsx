import React from 'react';

/**
 * Identité de marque AHANDJO « Terra » — partagée entre la page de
 * présentation et la navigation de l'application.
 * Composants purement présentationnels.
 */

/** Chope de bière — symbole de la marque */
export const BeerMug: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <circle cx="8.6" cy="5.9" r="1.7" fill="currentColor" />
    <circle cx="12" cy="4.6" r="2" fill="currentColor" />
    <circle cx="15.4" cy="5.9" r="1.7" fill="currentColor" />
    <path
      d="M6.8 8.6h10.4v9.6a2.2 2.2 0 0 1-2.2 2.2H9a2.2 2.2 0 0 1-2.2-2.2V8.6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M17.2 10.8h1.6a2.6 2.6 0 0 1 0 5.2h-1.6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/** Logo : tuile terre cuite → or, chope, liseré kente */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'h-10 w-10' }) => (
  <div className={`relative grid place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-clay-500 via-clay-600 to-gold-500 text-white shadow-warm ${className}`}>
    <BeerMug className="h-1/2 w-1/2" />
    <div className="kente-strip absolute inset-x-0 bottom-0 h-[3px]" />
  </div>
);

/** Bloc marque : logo + nom + baseline */
export const Brand: React.FC<{ dark?: boolean; className?: string; compact?: boolean }> = ({
  dark = false,
  className = '',
  compact = false,
}) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <LogoMark className={compact ? 'h-9 w-9' : 'h-10 w-10'} />
    <div className="leading-tight">
      <p className={`font-display ${compact ? 'text-base' : 'text-lg'} font-semibold tracking-wide ${dark ? 'text-cream-100' : 'text-espresso-900'}`}>
        AHANDJO
      </p>
      <p className={`text-[11px] font-medium uppercase tracking-[0.14em] ${dark ? 'text-cream-100/60' : 'text-espresso-400'}`}>
        Gestion de bar
      </p>
    </div>
  </div>
);
