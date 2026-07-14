import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Stock from "./pages/Stock";
import Ventes from "./pages/Ventes";
import Achats from "./pages/Achats";
import Rapports from "./pages/Rapports";
import Parametres from "./pages/Parametres";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-night-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<DashboardLayout onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/pos" element={<POSLayout onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/stock" element={<StockLayout onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/ventes" element={<VentesLayout onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/achats" element={<AchatsLayout onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/rapports" element={<RapportsLayout onMenuClick={() => setSidebarOpen(true)} />} />
          <Route path="/parametres" element={<ParametresLayout onMenuClick={() => setSidebarOpen(true)} />} />
        </Routes>
      </div>
    </div>
  );
}

type LayoutProps = { onMenuClick: () => void };

function DashboardLayout({ onMenuClick }: LayoutProps) {
  return (
    <>
      <Header title="Tableau de bord" subtitle="Vue d'ensemble de votre activité" onMenuClick={onMenuClick} />
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto"><Dashboard /></main>
    </>
  );
}
function POSLayout({ onMenuClick }: LayoutProps) {
  return (
    <>
      <Header title="Point de vente" subtitle="Enregistrer une nouvelle vente" onMenuClick={onMenuClick} />
      <main className="flex-1 overflow-hidden"><POS /></main>
    </>
  );
}
function StockLayout({ onMenuClick }: LayoutProps) {
  return (
    <>
      <Header title="Stock & Produits" subtitle="Gérer votre inventaire" onMenuClick={onMenuClick} />
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto"><Stock /></main>
    </>
  );
}
function VentesLayout({ onMenuClick }: LayoutProps) {
  return (
    <>
      <Header title="Ventes" subtitle="Historique des transactions" onMenuClick={onMenuClick} />
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto"><Ventes /></main>
    </>
  );
}
function AchatsLayout({ onMenuClick }: LayoutProps) {
  return (
    <>
      <Header title="Approvisionnement" subtitle="Achats et commandes fournisseurs" onMenuClick={onMenuClick} />
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto"><Achats /></main>
    </>
  );
}
function RapportsLayout({ onMenuClick }: LayoutProps) {
  return (
    <>
      <Header title="Rapports & Analytics" subtitle="Analyse de performance" onMenuClick={onMenuClick} />
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto"><Rapports /></main>
    </>
  );
}
function ParametresLayout({ onMenuClick }: LayoutProps) {
  return (
    <>
      <Header title="Paramètres" subtitle="Configuration de l'application" onMenuClick={onMenuClick} />
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto"><Parametres /></main>
    </>
  );
}
