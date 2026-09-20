import React, { useState, useEffect } from 'react';
import {
  ArrowRight, BadgeCheck, ChartBar as BarChart3, BatteryFull, Bell, Check, Cloud,
  Facebook, FileText, Home, Instagram, Mail, Menu, Package, Package2, Quote, Settings,
  ShieldCheck, ShoppingCart, Signal, Smartphone, Star, TrendingUp, Users, Wallet,
  Wifi, WifiOff, X,
} from 'lucide-react';
import { LogoMark, Brand } from './Brand';

interface LandingPageProps {
  onGetStarted: () => void;
}

/* ────────────────────────────────────────────────────────────────
   Éléments d'identité — marque AHANDJO « Terra »
   (LogoMark & Brand : voir components/Brand.tsx)
   ──────────────────────────────────────────────────────────────── */

/** Petit repère « losange bogolan » devant les sur-titres */
const EyebrowMarker: React.FC = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="absolute inline-flex h-full w-full rotate-45 rounded-[2px] bg-gold-400/60" />
    <span className="relative inline-flex h-2.5 w-2.5 rotate-45 rounded-[2px] bg-gold-400" />
  </span>
);

const SectionEyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light = false }) => (
  <p className={`mb-4 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.22em] ${light ? 'text-gold-300' : 'text-clay-600'}`}>
    <EyebrowMarker />
    {children}
  </p>
);

/* ────────────────────────────────────────────────────────────────
   Maquettes téléphone (100 % code — nettes à toutes les tailles)
   ──────────────────────────────────────────────────────────────── */

const PhoneMockup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative ${className}`}>
    <div className="relative rounded-[2.8rem] bg-espresso-950 p-[10px] shadow-[0_50px_100px_-25px_rgba(24,15,11,0.65)] ring-1 ring-espresso-950">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[2.15rem] bg-cream-50">
        {/* encoche */}
        <div className="absolute left-1/2 top-2.5 z-30 h-5 w-20 -translate-x-1/2 rounded-full bg-espresso-950" />
        {/* barre d'état */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-3 text-[10px] font-bold text-espresso-900">
          <span>21:47</span>
          <span className="flex items-center gap-1">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3.5 w-3.5" />
          </span>
        </div>
        {children}
      </div>
    </div>
  </div>
);

/** Écran 1 — tableau de bord (hero) */
const MiniDashboard: React.FC = () => {
  const bars = [38, 58, 46, 72, 60, 88, 100];
  const stocks = [
    { name: 'Bières', level: 72, qty: '12 casiers', tone: 'bg-clay-500' },
    { name: 'Guinness', level: 24, qty: '3 casiers', tone: 'bg-gold-400' },
    { name: 'Sodas', level: 55, qty: '8 caisses', tone: 'bg-clay-300' },
  ];
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden px-3.5 pb-3 pt-11">
      {/* en-tête appli */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <LogoMark className="h-6 w-6 rounded-lg" />
          <span className="font-display text-[11px] font-semibold tracking-wide text-espresso-900">AHANDJO</span>
        </div>
        <div className="relative">
          <Bell className="h-3.5 w-3.5 text-espresso-400" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-clay-500" />
        </div>
      </div>

      <div>
        <p className="text-[13px] font-bold text-espresso-900">Bonsoir, Jean-Marc 👋</p>
        <p className="text-[9px] text-espresso-400">Vendredi 12 septembre · Bar Le Maquis d'Or</p>
      </div>

      {/* chiffre d'affaires */}
      <div className="pattern-bogolan relative overflow-hidden rounded-2xl bg-espresso-900 p-3 text-cream-50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-cream-100/60">
              Chiffre d'affaires · aujourd'hui
            </p>
            <p className="font-display text-xl font-semibold">187 500 <span className="text-[11px] text-gold-300">FCFA</span></p>
          </div>
          <span className="rounded-full bg-kente-green/30 px-1.5 py-0.5 text-[8px] font-bold text-emerald-300">+12,4%</span>
        </div>
      </div>

      {/* graphique */}
      <div className="rounded-2xl border border-espresso-900/10 bg-white p-3">
        <div className="flex h-16 items-end gap-1.5">
          {bars.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={`flex-1 rounded-t-[3px] ${i === bars.length - 1 ? 'bg-gradient-to-t from-clay-600 to-gold-400' : 'bg-clay-200'}`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-espresso-400">Cette semaine</p>
      </div>

      {/* deux mini stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-cream-100 p-2.5">
          <p className="font-display text-base font-semibold text-espresso-900">84</p>
          <p className="text-[8px] font-semibold uppercase tracking-wide text-espresso-400">ventes du soir</p>
        </div>
        <div className="rounded-xl bg-cream-100 p-2.5">
          <p className="font-display text-base font-semibold text-espresso-900">52 300 F</p>
          <p className="text-[8px] font-semibold uppercase tracking-wide text-espresso-400">bénéfice net</p>
        </div>
      </div>

      {/* stocks */}
      <div className="rounded-2xl border border-espresso-900/10 bg-white p-3">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-espresso-500">Niveaux de stock</p>
        <div className="flex flex-col gap-1.5">
          {stocks.map((s) => (
            <div key={s.name}>
              <div className="flex items-baseline justify-between">
                <span className="text-[9px] font-semibold text-espresso-800">{s.name}</span>
                <span className="text-[8px] text-espresso-400">{s.qty}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-espresso-900/10">
                <div style={{ width: `${s.level}%` }} className={`h-full rounded-full ${s.tone}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* nav bas */}
      <div className="mt-auto flex items-center justify-around rounded-2xl border border-espresso-900/10 bg-white py-2.5">
        <Home className="h-4 w-4 text-clay-600" />
        <ShoppingCart className="h-4 w-4 text-espresso-300" />
        <TrendingUp className="h-4 w-4 text-espresso-300" />
        <BarChart3 className="h-4 w-4 text-espresso-300" />
        <Settings className="h-4 w-4 text-espresso-300" />
      </div>
    </div>
  );
};

/** Écran 2 — point de vente (section « Comment ça marche ») */
const MiniPOS: React.FC = () => {
  const items = [
    { name: 'Bière La Béninoise', qty: '× 12', price: '4 800 F' },
    { name: 'Sodas', qty: '× 8', price: '2 000 F' },
    { name: 'Eau minérale', qty: '× 6', price: '1 200 F' },
  ];
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden px-3.5 pb-3 pt-11">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-espresso-900">Nouvelle vente</p>
        <span className="rounded-full bg-clay-100 px-2 py-0.5 text-[9px] font-bold text-clay-700">Table 4</span>
      </div>

      {/* articles */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-espresso-900/10 bg-white">
        {items.map((it, i) => (
          <div key={it.name} className={`flex items-center justify-between px-3 py-2.5 ${i > 0 ? 'border-t border-espresso-900/5' : ''}`}>
            <div>
              <p className="text-[11px] font-semibold text-espresso-900">{it.name}</p>
              <p className="text-[9px] text-espresso-400">{it.qty}</p>
            </div>
            <p className="text-[11px] font-bold text-espresso-900">{it.price}</p>
          </div>
        ))}
        <div className="flex items-center justify-between border-t-2 border-dashed border-espresso-900/10 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-espresso-500">Sous-total</p>
          <p className="font-display text-lg font-semibold text-espresso-900">8 000 F</p>
        </div>
      </div>

      {/* bouton encaisser */}
      <button className="w-full rounded-xl bg-gradient-to-r from-clay-600 to-clay-500 py-2.5 text-[12px] font-bold text-white shadow-warm">
        Encaisser · 8 000 FCFA
      </button>

      {/* facture */}
      <div className="flex items-center gap-2 rounded-xl bg-cream-100 p-2.5">
        <FileText className="h-4 w-4 text-clay-600" />
        <div className="flex-1">
          <p className="text-[10px] font-bold text-espresso-900">Facture n° 1284 générée</p>
          <p className="text-[8px] text-espresso-400">PDF prête à imprimer</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-kente-green/15 px-2 py-0.5 text-[8px] font-bold text-kente-green">
          <Check className="h-2.5 w-2.5" /> Payé
        </span>
      </div>

      <p className="mt-auto text-center text-[8px] font-semibold uppercase tracking-[0.14em] text-espresso-300">
        Vente enregistrée hors ligne
      </p>
    </div>
  );
};

/** Petites cartes flottantes autour du téléphone */
const FloatingCard: React.FC<{
  className?: string;
  animation?: string;
  tileClass: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}> = ({ className = '', animation = '', tileClass, icon, title, sub }) => (
  <div
    className={`pointer-events-none absolute z-20 flex items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 shadow-lift ring-1 ring-espresso-900/10 backdrop-blur ${animation} ${className}`}
  >
    <span className={`grid h-9 w-9 place-items-center rounded-xl ${tileClass}`}>{icon}</span>
    <span>
      <span className="block text-[11px] font-bold leading-tight text-espresso-900">{title}</span>
      <span className="block text-[10px] leading-tight text-espresso-400">{sub}</span>
    </span>
  </div>
);

/* ────────────────────────────────────────────────────────────────
   Contenu
   ──────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Ventes & facturation',
    description:
      'Un point de vente rapide qui encaisse en quelques touches et génère des factures professionnelles, automatiquement, en FCFA.',
    tile: 'bg-gradient-to-br from-clay-400 to-clay-600',
  },
  {
    icon: Package,
    title: 'Stocks & inventaire',
    description:
      'Stock initial, stock final, alertes de rupture : votre inventaire se met à jour à chaque vente, sans calculs à la main.',
    tile: 'bg-gradient-to-br from-gold-300 to-gold-500',
  },
  {
    icon: BarChart3,
    title: 'Rapports & bénéfices',
    description:
      "Chiffre d'affaires, marges et dépenses présentés en graphiques clairs, jour après jour, pour piloter votre établissement.",
    tile: 'bg-gradient-to-br from-[#3E8258] to-[#24513A]',
  },
  {
    icon: Users,
    title: 'Clients & fidélité',
    description:
      "Centralisez vos clients habitués, suivez l'historique de leurs consommations et faites revenir le monde.",
    tile: 'bg-gradient-to-br from-espresso-600 to-espresso-800',
  },
];

const EXTRA_MODULES = [
  { icon: ShoppingCart, label: 'Achats' },
  { icon: Package2, label: 'Emballages' },
  { icon: Wallet, label: 'Dépenses' },
  { icon: ShieldCheck, label: 'Licences' },
];

const STATS = [
  { value: '9', label: 'Modules intégrés' },
  { value: '100%', label: 'Fonctionne hors ligne' },
  { value: '24/7', label: 'Synchronisation cloud' },
  { value: '5/5', label: 'Satisfaction des gérants' },
];

const STEPS = [
  {
    number: '01',
    title: 'Configurez votre établissement',
    description: 'Ajoutez vos produits, vos prix et vos catégories en quelques minutes.',
  },
  {
    number: '02',
    title: 'Enregistrez vos ventes',
    description: 'Encaissez rapidement au comptoir et générez des factures professionnelles.',
  },
  {
    number: '03',
    title: 'Analysez vos résultats',
    description: 'Suivez chiffre d’affaires, bénéfices et dépenses pour décider en connaissance de cause.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Jean-Marc A.',
    role: 'Gérant de bar · Cotonou',
    content: 'AHANDJO a transformé ma façon de gérer mon établissement. Je vois mes bénéfices en temps réel.',
    initials: 'JM',
    tile: 'bg-gradient-to-br from-clay-400 to-clay-600',
  },
  {
    name: 'Sarah K.',
    role: 'Restauratrice · Porto-Novo',
    content: 'Le suivi des stocks m’a fait économiser des dizaines de milliers de FCFA par mois.',
    initials: 'SK',
    tile: 'bg-gradient-to-br from-gold-400 to-gold-600',
  },
  {
    name: 'Paul D.',
    role: 'Propriétaire · Parakou',
    content: 'Le système de licences me permet de contrôler qui accède à mes données. Parfait.',
    initials: 'PD',
    tile: 'bg-gradient-to-br from-[#3E8258] to-[#24513A]',
  },
];

const FAQS = [
  {
    title: 'L’application fonctionne-t-elle sans internet ?',
    desc: 'Oui. AHANDJO a été conçue pour fonctionner pleinement hors ligne : ventes, stocks et rapports restent disponibles même sans connexion. Dès que le réseau revient, vos données se synchronisent automatiquement avec le cloud.',
  },
  {
    title: 'Comment installer AHANDJO sur mon téléphone ?',
    desc: 'AHANDJO est une application web progressive (PWA) : depuis votre navigateur, touchez simplement « Installer » ou « Ajouter à l’écran d’accueil ». Aucun store, aucun câble, aucune manipulation compliquée.',
  },
  {
    title: 'Comment fonctionnent les licences ?',
    desc: 'Le propriétaire achète des licences par lot — Kpêvi, Kléoun, Agbon ou Baba, de 1 à 12 mois — puis les attribue à ses gestionnaires et employés. Chaque utilisateur n’accède qu’aux données de son lot.',
  },
  {
    title: 'Mes données sont-elles en sécurité ?',
    desc: 'Vos données sont isolées par utilisateur et par lot de licences. Elles sont conservées sur votre appareil et synchronisées vers le cloud de façon sécurisée, sans jamais être mélangées à celles des autres établissements.',
  },
  {
    title: 'Puis-je gérer plusieurs employés ?',
    desc: 'Oui. Trois rôles sont disponibles — Propriétaire, Gestionnaire et Employé — avec des accès adaptés à chacun. Le propriétaire garde le contrôle total depuis son tableau de bord.',
  },
  {
    title: 'Dans quelle devise se font les calculs ?',
    desc: 'Toute l’application travaille en francs CFA (FCFA) : prix, factures, rapports et licences. Les factures générées sont professionnelles, prêtes à être imprimées ou partagées.',
  },
];

const NAV_LINKS = [
  { label: 'Fonctionnalités', id: 'features' },
  { label: 'Comment ça marche', id: 'how' },
  { label: 'Témoignages', id: 'testimonials' },
  { label: 'FAQ', id: 'faq' },
];

/* ────────────────────────────────────────────────────────────────
   Page de présentation
   ──────────────────────────────────────────────────────────────── */

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-cream-100 font-body text-espresso-900 antialiased">
      {/* liseré kente — fil conducteur du site */}
      <div className="kente-strip pointer-events-none fixed inset-x-0 top-0 z-[70] h-1" aria-hidden="true" />

      {/* ══════════════ Navigation ══════════════ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-cream-50/95 py-3 shadow-[0_1px_0_rgba(36,23,17,0.08)] backdrop-blur-md' : 'bg-transparent py-5'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Brand dark={!scrolled} />

            {/* liens bureau */}
            <nav className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-semibold transition-colors ${
                    scrolled ? 'text-espresso-600 hover:text-clay-600' : 'text-cream-100/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <button
                onClick={onGetStarted}
                className={`group flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                  scrolled
                    ? 'bg-clay-600 text-white shadow-warm hover:bg-clay-700'
                    : 'bg-cream-50 text-espresso-900 shadow-lift hover:bg-white'
                }`}
              >
                <span>Se connecter</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* hamburger mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`rounded-lg p-2 transition-colors md:hidden ${
                scrolled ? 'text-espresso-700 hover:bg-espresso-900/5' : 'text-cream-100 hover:bg-white/10'
              }`}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* menu mobile */}
        {mobileMenuOpen && (
          <div className="mx-4 mt-2 rounded-2xl border border-espresso-900/10 bg-cream-50 p-4 shadow-lift md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-espresso-700 hover:bg-cream-200"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  onGetStarted();
                  setMobileMenuOpen(false);
                }}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-5 py-3 text-sm font-bold text-white"
              >
                <span>Se connecter</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════ Hero ══════════════ */}
      <section className="relative overflow-hidden bg-espresso-900">
        {/* décors */}
        <div className="pattern-bogolan absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-clay-500/25 blur-[130px]" />
          <div className="absolute -right-32 top-1/3 h-[420px] w-[420px] rounded-full bg-gold-500/15 blur-[110px]" />
          <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-kente-green/10 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-36 pt-32 sm:px-6 lg:px-8 lg:pb-44 lg:pt-40">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* texte */}
            <div className="max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-cream-100/15 bg-cream-100/10 px-4 py-2 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-400" />
                </span>
                <span className="text-sm font-medium text-cream-100/90">Nouveau · Synchronisation cloud automatique</span>
              </div>

              <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-cream-50 sm:text-5xl xl:text-6xl">
                Tenez votre bar
                <span className="block italic text-gold-300">comme un chef.</span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-cream-100/70">
                Ventes, stocks, achats, clients, rapports : AHANDJO réunit toute la gestion de votre établissement dans
                une application simple, en français, qui fonctionne même sans internet.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-300 to-gold-400 px-7 py-4 text-base font-bold text-espresso-950 shadow-lift transition-all duration-200 hover:from-gold-200 hover:to-gold-300"
                >
                  <span>Commencer maintenant</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream-100/20 bg-cream-100/5 px-7 py-4 text-base font-semibold text-cream-100 backdrop-blur-sm transition-all duration-200 hover:bg-cream-100/10"
                >
                  Découvrir les fonctionnalités
                </button>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2">
                {['Fonctionne hors ligne', 'Factures en FCFA', 'Données sécurisées'].map((item) => (
                  <span key={item} className="flex items-center gap-2 text-sm font-medium text-cream-100/60">
                    <Check className="h-4 w-4 text-gold-300" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* téléphone + cartes flottantes */}
            <div className="relative mx-auto w-fit lg:ml-auto lg:mr-0">
              <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/15 blur-[90px]" aria-hidden="true" />
              <PhoneMockup className="relative z-10 w-[260px] sm:w-[290px]">
                <MiniDashboard />
              </PhoneMockup>

              <FloatingCard
                className="-right-4 top-10 sm:-right-14"
                animation="animate-float"
                tileClass="bg-kente-green/10 text-kente-green"
                icon={<BadgeCheck className="h-[18px] w-[18px]" />}
                title="Vente encaissée"
                sub="+ 4 500 FCFA"
              />
              <FloatingCard
                className="-left-3 top-1/3 sm:-left-16"
                animation="animate-float-delayed"
                tileClass="bg-gold-100 text-gold-600"
                icon={<Package className="h-[18px] w-[18px]" />}
                title="Stock faible"
                sub="Guinness · 3 casiers"
              />
              <FloatingCard
                className="-bottom-6 right-2 sm:-right-10"
                animation="animate-float-slow"
                tileClass="bg-clay-100 text-clay-600"
                icon={<Cloud className="h-[18px] w-[18px]" />}
                title="Synchronisé"
                sub="Cloud · il y a 2 min"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ Carte de présentation (surimpression, comme le template) ══════════════ */}
      <div className="relative z-20 mx-4 -mt-24 sm:mx-8 lg:mx-auto lg:-mt-28 lg:max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-espresso-900/5 bg-white p-6 shadow-lift md:p-12">
          <div className="kente-strip absolute inset-x-0 top-0 h-1" aria-hidden="true" />
          <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-tight text-espresso-900 md:text-3xl">
                Une gestion complète, du comptoir au bilan du mois
              </h3>
              <p className="mt-4 leading-relaxed text-espresso-600/90">
                Neuf modules intégrés couvrent toute votre activité : ventes et facturation, achats, stocks,
                emballages, clients, dépenses, rapports et licences. Installez l’application sur votre téléphone ou
                votre ordinateur, et retrouvez vos données partout — même avec une connexion instable.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { icon: WifiOff, label: '100% hors ligne', sub: 'Aucune connexion requise pour vendre' },
                { icon: Smartphone, label: 'Installable en 1 minute', sub: 'Directement depuis le navigateur' },
                { icon: Cloud, label: 'Sync entre appareils', sub: 'Comptoir, téléphone, ordinateur' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-cream-100 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-clay-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-espresso-900">{item.label}</span>
                      <span className="block text-xs text-espresso-500">{item.sub}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ Fonctionnalités ══════════════ */}
      <section id="features" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <SectionEyebrow>Votre application de gestion</SectionEyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-espresso-900 md:text-4xl">
              Tout ce qu’il faut pour tenir un bar rentable
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-espresso-500">
              Chaque module est pensé pour la réalité des bars et maquis d’Afrique de l’Ouest : simple, rapide et
              utile au quotidien.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl p-6 transition-colors duration-300 hover:bg-cream-200/60"
                >
                  <div
                    className={`mb-5 grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 ${feature.tile}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-espresso-900">{feature.title}</h3>
                  <p className="mt-2 leading-relaxed text-espresso-600/80">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* modules complémentaires */}
          <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-3">
            <span className="text-sm font-semibold text-espresso-500">Et aussi :</span>
            {EXTRA_MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <span
                  key={m.label}
                  className="inline-flex items-center gap-2 rounded-full border border-espresso-900/10 bg-white px-4 py-2 text-sm font-semibold text-espresso-800 transition-colors hover:border-clay-500/40 hover:text-clay-700"
                >
                  <Icon className="h-4 w-4 text-clay-600" />
                  {m.label}
                </span>
              );
            })}
            <span className="rounded-full bg-espresso-900 px-4 py-2 text-sm font-bold text-gold-300">
              9 modules au total
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════ Comment ça marche + statistiques ══════════════ */}
      <section id="how" className="scroll-mt-24 border-y border-espresso-900/5 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* téléphone */}
            <div className="relative mx-auto w-fit">
              <div
                className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay-400/15 blur-[90px]"
                aria-hidden="true"
              />
              <PhoneMockup className="relative z-10 w-[250px] sm:w-[280px]">
                <MiniPOS />
              </PhoneMockup>
            </div>

            {/* texte + stats */}
            <div>
              <SectionEyebrow>Comment ça marche</SectionEyebrow>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-espresso-900 md:text-4xl">
                Pensé pour le rythme des bars ouest-africains
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-espresso-500">
                Une coupure de courant ou de réseau ne doit jamais arrêter votre service. AHANDJO travaille en local
                sur votre appareil et se synchronise automatiquement dès que le réseau revient.
              </p>

              <div className="mt-9 grid grid-cols-2 gap-4">
                {STATS.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-espresso-900/10 bg-cream-100/70 p-5">
                    <div className="kente-strip mb-4 h-[3px] w-9 rounded-full" aria-hidden="true" />
                    <p className="font-display text-3xl font-semibold text-clay-600 md:text-4xl">{stat.value}</p>
                    <p className="mt-1 text-sm font-medium text-espresso-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* les 3 étapes */}
          <div className="mx-auto mt-20 max-w-6xl border-t border-espresso-900/10 pt-16">
            <div className="mb-12 text-center">
              <SectionEyebrow>Démarrez en trois étapes</SectionEyebrow>
            </div>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.number} className="relative">
                  <p className="font-display text-6xl font-semibold italic leading-none text-clay-200">{step.number}</p>
                  <h3 className="mt-4 text-lg font-bold text-espresso-900">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-espresso-500">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <div
                      className="absolute right-0 top-8 hidden h-px w-12 border-t-2 border-dashed border-clay-300 md:block"
                      style={{ right: '-1.5rem' }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ Témoignages ══════════════ */}
      <section id="testimonials" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 flex flex-col items-center text-center">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-espresso-900 text-gold-300">
              <Quote className="h-6 w-6" />
            </div>
            <SectionEyebrow>Ils nous font confiance</SectionEyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-espresso-900 md:text-4xl">
              Ce que disent nos clients
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-espresso-500">
              Bars, maquis et restaurants nous font confiance au Bénin — et au-delà.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-3xl border border-espresso-900/5 bg-white p-8 text-center shadow-[0_2px_24px_rgba(36,23,17,0.05)] transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-lg font-bold text-white ring-4 ring-gold-100 ${t.tile}`}
                >
                  {t.initials}
                </div>
                <div className="mb-3 flex items-center justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="leading-relaxed text-espresso-700">« {t.content} »</p>
                <p className="mt-5 font-bold text-espresso-900">{t.name}</p>
                <p className="mt-0.5 text-sm font-medium text-espresso-400">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section id="faq" className="scroll-mt-24 border-t border-espresso-900/5 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <SectionEyebrow>FAQ</SectionEyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-espresso-900 md:text-4xl">
              Questions fréquentes
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-espresso-500">
              Tout ce que vous devez savoir avant de vous lancer. Une autre question ? Contactez-nous.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {FAQS.map((faq) => (
              <div key={faq.title}>
                <h3 className="flex items-start gap-3 font-display text-lg font-semibold leading-snug text-espresso-900">
                  <span className="mt-2 inline-block h-2 w-2 shrink-0 rotate-45 rounded-[2px] bg-gold-400" aria-hidden="true" />
                  {faq.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-espresso-500">{faq.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ Appel à l'action ══════════════ */}
      <section className="relative z-10 -mb-20 px-4 pb-24 sm:px-6 lg:px-8">
        <div className="pattern-bogolan relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-espresso-900 px-6 py-16 text-center shadow-lift md:py-20">
          <div className="kente-strip absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-clay-500/30 blur-[90px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gold-500/20 blur-[90px]"
            aria-hidden="true"
          />

          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-cream-50 md:text-4xl">
              Prêt à prendre le contrôle <span className="italic text-gold-300">de votre bar ?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-cream-100/70">
              Connectez-vous et retrouvez dès aujourd’hui tous les outils d’une gestion professionnelle — sans
              installation compliquée.
            </p>
            <button
              onClick={onGetStarted}
              className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-300 to-gold-400 px-8 py-4 text-lg font-bold text-espresso-950 shadow-lift transition-all duration-200 hover:from-gold-200 hover:to-gold-300"
            >
              <span>Accéder à l’application</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-cream-100/60">
              {['Sans engagement', 'Fonctionne hors ligne', 'Vos données restent les vôtres'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-gold-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ Pied de page ══════════════ */}
      <footer className="relative bg-espresso-950 pt-32">
        <div className="kente-strip absolute inset-x-0 top-0 h-1" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 pb-12 md:grid-cols-[1.5fr_1fr]">
            <div>
              <Brand dark />
              <p className="mt-5 max-w-md leading-relaxed text-cream-100/60">
                Le logiciel de gestion de bar pensé pour l’Afrique de l’Ouest. Vendez, suivez vos stocks et pilotez
                vos bénéfices — même sans internet.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
                {NAV_LINKS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="text-sm font-semibold text-cream-100/60 transition-colors hover:text-gold-300"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 md:items-end">
              <div className="md:text-right">
                <p className="font-display text-lg font-semibold text-cream-100">Prêt à démarrer ?</p>
                <p className="mt-1 text-sm text-cream-100/60">Accédez à votre espace en un clic.</p>
              </div>
              <button
                onClick={onGetStarted}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-300 to-gold-400 px-6 py-3 text-sm font-bold text-espresso-950 shadow-lift transition-all hover:from-gold-200 hover:to-gold-300"
              >
                <span>Se connecter</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <div className="mt-2 flex items-center gap-2">
                {[Facebook, Instagram, Mail].map((Icon, i) => (
                  <button
                    key={i}
                    onClick={onGetStarted}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-cream-100/10 text-cream-100/50 transition-colors hover:border-gold-300/40 hover:text-gold-300"
                    aria-label={['Facebook', 'Instagram', 'Email'][i]}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-cream-100/10 py-7 text-sm text-cream-100/40 md:flex-row">
            <p>© 2026 AHANDJO — Système de gestion de bar professionnel.</p>
            <p className="flex items-center gap-2">
              Conçu au Bénin, pour l’Afrique de l’Ouest
              <span aria-hidden="true">🌍</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
