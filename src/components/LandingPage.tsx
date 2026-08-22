import React, { useState, useEffect } from 'react';
import { Building, ShoppingCart, TrendingUp, Package, ChartBar as BarChart3, Shield, Users, DollarSign, Settings, ArrowRight, Check, Menu, X, Smartphone, Cloud, Lock, Zap, Star, Quote } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: ShoppingCart,
      title: 'Gestion des Achats',
      description: 'Enregistrez et suivez tous vos achats avec un système de multi-achats pour gagner du temps.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'Ventes en Temps Réel',
      description: 'Un point de vente intégré avec génération automatique de factures professionnelles.',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Package,
      title: 'Suivi des Stocks',
      description: 'Contrôlez votre inventaire avec calculs automatiques basés sur le stock initial et final.',
      color: 'from-orange-500 to-amber-500',
    },
    {
      icon: BarChart3,
      title: 'Rapports Détaillés',
      description: 'Visualisez votre chiffre d\'affaires, vos bénéfices et vos dépenses avec des graphiques clairs.',
      color: 'from-violet-500 to-purple-500',
    },
    {
      icon: Users,
      title: 'Gestion des Clients',
      description: 'Centralisez les informations de vos clients et suivez l\'historique de leurs achats.',
      color: 'from-rose-500 to-pink-500',
    },
    {
      icon: Shield,
      title: 'Système de Licences',
      description: 'Sécurisez l\'accès de vos employés et gestionnaires avec un système de licences par lot.',
      color: 'from-indigo-500 to-blue-500',
    },
  ];

  const stats = [
    { value: '9', label: 'Modules intégrés' },
    { value: '100%', label: 'Hors ligne disponible' },
    { value: '24/7', label: 'Synchronisation cloud' },
    { value: 'PWA', label: 'Installable sur mobile' },
  ];

  const steps = [
    {
      number: '01',
      title: 'Configurez votre établissement',
      description: 'Ajoutez vos produits, vos prix et vos catégories en quelques minutes.',
    },
    {
      number: '02',
      title: 'Enregistrez vos ventes',
      description: 'Utilisez le point de vente intégré pour encaisser rapidement et générer des factures.',
    },
    {
      number: '03',
      title: 'Analysez vos résultats',
      description: 'Consultez vos rapports pour prendre des décisions éclairées sur votre activité.',
    },
  ];

  const testimonials = [
    {
      name: 'Jean-Marc A.',
      role: 'Gérant de bar, Cotonou',
      content: 'GOBEX a transformé ma façon de gérer mon établissement. Je vois mes bénéfices en temps réel.',
      rating: 5,
    },
    {
      name: 'Sarah K.',
      role: 'Restauratrice, Porto-Novo',
      content: 'Le suivi des stocks m\'a fait économiser des dizaines de milliers de FCFA par mois.',
      rating: 5,
    },
    {
      name: 'Paul D.',
      role: 'Propriétaire, Parakou',
      content: 'Le système de licences me permet de contrôler qui accède à mes données. Parfait.',
      rating: 5,
    },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                scrolled
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-500'
                  : 'bg-white/10 backdrop-blur-sm border border-white/20'
              }`}>
                <Building className={`h-5 w-5 ${scrolled ? 'text-white' : 'text-white'}`} />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${scrolled ? 'text-gray-900' : 'text-white'}`}>AHANDJO</h1>
                <p className={`text-xs ${scrolled ? 'text-gray-500' : 'text-white/70'}`}>Gestion de Bar</p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-8">
              {[
                { label: 'Fonctionnalités', id: 'features' },
                { label: 'Comment ça marche', id: 'how' },
                { label: 'Témoignages', id: 'testimonials' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-gray-600 hover:text-blue-600'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={onGetStarted}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  scrolled
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                    : 'bg-white text-gray-900 hover:bg-gray-100 shadow-lg'
                }`}
              >
                <span>Se connecter</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-4 space-y-3">
              {[
                { label: 'Fonctionnalités', id: 'features' },
                { label: 'Comment ça marche', id: 'how' },
                { label: 'Témoignages', id: 'testimonials' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { onGetStarted(); setMobileMenuOpen(false); }}
                className="flex items-center justify-center space-x-2 w-full px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold"
              >
                <span>Se connecter</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[90px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-white/90 font-medium">Nouveau : Synchronisation cloud automatique</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Gérez votre bar
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                comme un professionnel
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/70 leading-relaxed mb-10 max-w-2xl">
              AHANDJO est la solution complète de gestion de bar : ventes, stocks, achats, clients et rapports —
              le tout dans une application installable qui fonctionne même hors ligne.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onGetStarted}
                className="group flex items-center justify-center space-x-2 px-7 py-4 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-gray-100 transition-all duration-200 shadow-2xl shadow-blue-900/30"
              >
                <span>Commencer maintenant</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="flex items-center justify-center space-x-2 px-7 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold text-base hover:bg-white/15 transition-all duration-200"
              >
                <span>Découvrir les fonctionnalités</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-10 border-t border-white/10">
              {stats.map((stat, i) => (
                <div key={i}>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/60 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Fonctionnalités</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Tout ce qu'il faut pour gérer votre établissement
            </h2>
            <p className="text-lg text-gray-500">
              Neuf modules intégrés qui couvrent l'intégralité de votre activité, du stock à la facturation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group p-7 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Extra highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
            {[
              { icon: Smartphone, label: 'Installable comme une application mobile' },
              { icon: Cloud, label: 'Synchronisation cloud entre appareils' },
              { icon: Lock, label: 'Données sécurisées et isolées par utilisateur' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <Icon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Comment ça marche</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Démarrez en trois étapes
            </h2>
            <p className="text-lg text-gray-500">
              Une interface pensée pour la simplicité, même sans expérience informatique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-bold text-blue-100 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 h-px bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Témoignages</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Ils gèrent leur bar avec AHANDJO
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-7 bg-gray-50 rounded-2xl border border-gray-100">
                <Quote className="h-8 w-8 text-blue-200 mb-4" />
                <p className="text-gray-700 leading-relaxed mb-6">"{t.content}"</p>
                <div className="flex items-center space-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="h-12 w-12 text-white/90 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Prêt à prendre le contrôle de votre bar ?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Connectez-vous maintenant pour accéder à tous les outils de gestion professionnels d'AHANDJO.
          </p>
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center space-x-2 px-8 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-200 shadow-2xl"
          >
            <span>Accéder à l'application</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-white/70 text-sm">
            {['Sans installation', 'Fonctionne hors ligne', 'Données sécurisées'].map((item, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-white" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">AHANDJO</p>
                <p className="text-sm text-gray-400">Gestion de Bar Professionnel</p>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-400">
              {['Fonctionnalités', 'Comment ça marche', 'Témoignages'].map((label, i) => {
                const ids = ['features', 'how', 'testimonials'];
                return (
                  <button
                    key={i}
                    onClick={() => scrollToSection(ids[i])}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-sm text-gray-500">© 2026 AHANDJO — Système de Gestion de Bar Professionnel. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
