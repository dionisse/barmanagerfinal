import { useState } from "react";
import { Building2, Receipt, RotateCcw, Save, Check } from "lucide-react";
import { useStore, storeActions, resetData } from "../lib/store";
import { formatFCFA } from "../lib/utils";

export default function Parametres() {
  const data = useStore();
  const [entreprise, setEntreprise] = useState(data.settings.entreprise);
  const [facturation, setFacturation] = useState(data.settings.facturation);
  const [saved, setSaved] = useState(false);

  function save() {
    storeActions.updateSettings({
      entreprise,
      facturation,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleReset() {
    if (confirm("Réinitialiser toutes les données ? Cette action est irréversible.")) {
      resetData();
      window.location.reload();
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Company settings */}
      <div className="card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">Informations de l'entreprise</h3>
            <p className="text-xs text-night-400">Affichées sur les factures</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-night-300 mb-1.5">Nom du bar</label>
            <input
              type="text"
              value={entreprise.nom}
              onChange={(e) => setEntreprise({ ...entreprise, nom: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-night-300 mb-1.5">Téléphone</label>
            <input
              type="text"
              value={entreprise.telephone}
              onChange={(e) => setEntreprise({ ...entreprise, telephone: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-night-300 mb-1.5">Email</label>
            <input
              type="email"
              value={entreprise.email}
              onChange={(e) => setEntreprise({ ...entreprise, email: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-night-300 mb-1.5">Adresse</label>
            <input
              type="text"
              value={entreprise.adresse}
              onChange={(e) => setEntreprise({ ...entreprise, adresse: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Billing settings */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-400/15 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">Paramètres de facturation</h3>
            <p className="text-xs text-night-400">Configuration des factures</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-night-300 mb-1.5">Préfixe facture</label>
            <input
              type="text"
              value={facturation.prefixeFacture}
              onChange={(e) => setFacturation({ ...facturation, prefixeFacture: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-night-300 mb-1.5">TVA (%)</label>
            <input
              type="number"
              value={facturation.tva}
              onChange={(e) => setFacturation({ ...facturation, tva: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-night-300 mb-1.5">Mentions légales</label>
            <textarea
              value={facturation.mentionsLegales}
              onChange={(e) => setFacturation({ ...facturation, mentionsLegales: e.target.value })}
              className="input min-h-[80px] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Data stats */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "160ms" }}>
        <h3 className="font-display font-semibold text-white mb-4">Données de l'application</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-night-800/50 text-center">
            <p className="text-2xl font-display font-bold text-white">{data.products.length}</p>
            <p className="text-xs text-night-400">Produits</p>
          </div>
          <div className="p-3 rounded-xl bg-night-800/50 text-center">
            <p className="text-2xl font-display font-bold text-white">{data.sales.length}</p>
            <p className="text-xs text-night-400">Ventes</p>
          </div>
          <div className="p-3 rounded-xl bg-night-800/50 text-center">
            <p className="text-2xl font-display font-bold text-white">{data.purchases.length}</p>
            <p className="text-xs text-night-400">Achats</p>
          </div>
          <div className="p-3 rounded-xl bg-night-800/50 text-center">
            <p className="text-2xl font-display font-bold text-white">{data.expenses.length}</p>
            <p className="text-xs text-night-400">Dépenses</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-night-800/30 flex items-center justify-between">
          <span className="text-sm text-night-300">Valeur totale du stock</span>
          <span className="font-semibold text-primary-400">{formatFCFA(data.products.reduce((s, p) => s + Math.max(0, p.stockActuel) * p.prixAchat, 0))}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={save} className="btn-primary flex-1">
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? "Enregistré !" : "Enregistrer les modifications"}
        </button>
        <button onClick={handleReset} className="btn-ghost text-red-400 hover:bg-red-500/10 hover:border-red-500/20">
          <RotateCcw className="w-5 h-5" />
          Réinitialiser les données
        </button>
      </div>
    </div>
  );
}
