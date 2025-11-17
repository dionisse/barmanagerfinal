import React, { useState, useEffect } from 'react';
import { User, Packaging, PackagingPurchase } from '../types';
import { Plus, Search, Package, ShoppingBag, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { getPackaging, addPackaging, updatePackaging, deletePackaging, getPackagingPurchases, addPackagingPurchase } from '../utils/dataService';

interface EmballagesModuleProps {
  user: User;
}

const EmballagesModule: React.FC<EmballagesModuleProps> = ({ user }) => {
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [packagingPurchases, setPackagingPurchases] = useState<PackagingPurchase[]>([]);
  const [showPackagingForm, setShowPackagingForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<Packaging | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [packagingFormData, setPackagingFormData] = useState({
    nom: '',
    type: '',
    prixUnitaire: '',
    stockActuel: '',
    seuilAlerte: ''
  });
  const [purchaseFormData, setPurchaseFormData] = useState({
    fournisseur: '',
    packagingId: '',
    quantite: '',
    prixUnitaire: ''
  });
  const [inventoryData, setInventoryData] = useState({
    packagingId: '',
    stockReel: ''
  });

  const packagingTypes = ['Sac', 'Bouteille', 'Boîte', 'Emballage', 'Autre'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const packagingData = await getPackaging();
    const purchasesData = await getPackagingPurchases();
    setPackaging(packagingData);
    setPackagingPurchases(purchasesData);
  };

  const resetPackagingForm = () => {
    setPackagingFormData({
      nom: '',
      type: '',
      prixUnitaire: '',
      stockActuel: '',
      seuilAlerte: ''
    });
    setEditingPackaging(null);
  };

  const handlePackagingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const packagingData: Packaging = {
      id: editingPackaging?.id || Date.now().toString(),
      nom: packagingFormData.nom,
      type: packagingFormData.type,
      stockActuel: parseInt(packagingFormData.stockActuel),
      prixUnitaire: parseFloat(packagingFormData.prixUnitaire),
      seuilAlerte: packagingFormData.seuilAlerte ? parseInt(packagingFormData.seuilAlerte) : undefined
    };

    if (editingPackaging) {
      await updatePackaging(packagingData);
    } else {
      await addPackaging(packagingData);
    }

    resetPackagingForm();
    setShowPackagingForm(false);
    loadData();
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPackaging = packaging.find(p => p.id === purchaseFormData.packagingId);
    if (!selectedPackaging) return;

    const quantite = parseInt(purchaseFormData.quantite);
    const prixUnitaire = parseFloat(purchaseFormData.prixUnitaire);

    const purchase: PackagingPurchase = {
      id: Date.now().toString(),
      dateAchat: new Date().toISOString().split('T')[0],
      fournisseur: purchaseFormData.fournisseur,
      packagingId: purchaseFormData.packagingId,
      packagingNom: selectedPackaging.nom,
      quantite: quantite,
      prixUnitaire: prixUnitaire,
      total: quantite * prixUnitaire
    };

    await addPackagingPurchase(purchase);

    // Update packaging stock
    const updatedPackaging = {
      ...selectedPackaging,
      stockActuel: selectedPackaging.stockActuel + quantite,
      prixUnitaire: prixUnitaire
    };
    await updatePackaging(updatedPackaging);

    setPurchaseFormData({ fournisseur: '', packagingId: '', quantite: '', prixUnitaire: '' });
    setShowPurchaseForm(false);
    loadData();
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPackaging = packaging.find(p => p.id === inventoryData.packagingId);
    if (!selectedPackaging) return;

    const updatedPackaging = {
      ...selectedPackaging,
      stockActuel: parseInt(inventoryData.stockReel)
    };

    await updatePackaging(updatedPackaging);
    setInventoryData({ packagingId: '', stockReel: '' });
    setShowInventoryForm(false);
    loadData();
  };

  const handleEdit = (pkg: Packaging) => {
    setEditingPackaging(pkg);
    setPackagingFormData({
      nom: pkg.nom,
      type: pkg.type,
      prixUnitaire: pkg.prixUnitaire.toString(),
      stockActuel: pkg.stockActuel.toString(),
      seuilAlerte: pkg.seuilAlerte?.toString() || ''
    });
    setShowPackagingForm(true);
  };

  const handleDelete = async (packagingId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet emballage ?')) {
      await deletePackaging(packagingId);
      loadData();
    }
  };

  const filteredPackaging = packaging.filter(pkg =>
    pkg.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockPackaging = packaging.filter(pkg => 
    pkg.seuilAlerte && pkg.stockActuel <= pkg.seuilAlerte
  );

  const totalValue = packaging.reduce((sum, pkg) => sum + (pkg.stockActuel * pkg.prixUnitaire), 0);
  const totalPurchases = packagingPurchases.reduce((sum, purchase) => sum + purchase.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Emballages</h1>
          <p className="text-gray-600 mt-2">Gérez vos emballages et contenants</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowInventoryForm(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Package className="h-5 w-5" />
            <span>Inventaire</span>
          </button>
          <button
            onClick={() => setShowPurchaseForm(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Achat Emballage</span>
          </button>
          <button
            onClick={() => setShowPackagingForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nouvel Emballage</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Emballages</p>
              <p className="text-2xl font-bold text-blue-600">{packaging.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valeur Stock</p>
              <p className="text-2xl font-bold text-green-600">{totalValue.toLocaleString()} FCFA</p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Achats</p>
              <p className="text-2xl font-bold text-purple-600">{totalPurchases.toLocaleString()} FCFA</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Faible</p>
              <p className="text-2xl font-bold text-amber-600">{lowStockPackaging.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
        </div>
      </div>

      {lowStockPackaging.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-800">Alertes Stock Emballages</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockPackaging.map(pkg => (
              <div key={pkg.id} className="bg-white p-4 rounded-lg border border-amber-200">
                <p className="font-medium text-gray-900">{pkg.nom}</p>
                <p className="text-sm text-gray-600">{pkg.type}</p>
                <p className="text-sm text-amber-700">
                  Stock: {pkg.stockActuel} / Seuil: {pkg.seuilAlerte}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Packaging Form Modal */}
      {showPackagingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPackaging ? 'Modifier Emballage' : 'Nouvel Emballage'}
              </h2>
            </div>
            <form onSubmit={handlePackagingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'emballage
                </label>
                <input
                  type="text"
                  value={packagingFormData.nom}
                  onChange={(e) => setPackagingFormData({ ...packagingFormData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={packagingFormData.type}
                  onChange={(e) => setPackagingFormData({ ...packagingFormData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un type</option>
                  {packagingTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={packagingFormData.prixUnitaire}
                    onChange={(e) => setPackagingFormData({ ...packagingFormData, prixUnitaire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock actuel
                  </label>
                  <input
                    type="number"
                    value={packagingFormData.stockActuel}
                    onChange={(e) => setPackagingFormData({ ...packagingFormData, stockActuel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seuil d'alerte
                </label>
                <input
                  type="number"
                  value={packagingFormData.seuilAlerte}
                  onChange={(e) => setPackagingFormData({ ...packagingFormData, seuilAlerte: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetPackagingForm();
                    setShowPackagingForm(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPackaging ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Form Modal */}
      {showPurchaseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Achat d'Emballage</h2>
            </div>
            <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={purchaseFormData.fournisseur}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, fournisseur: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emballage
                </label>
                <select
                  value={purchaseFormData.packagingId}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, packagingId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un emballage</option>
                  {packaging.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.nom} - {pkg.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité
                  </label>
                  <input
                    type="number"
                    value={purchaseFormData.quantite}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, quantite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix Unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseFormData.prixUnitaire}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, prixUnitaire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {purchaseFormData.quantite && purchaseFormData.prixUnitaire && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800 font-semibold">
                    Total: {(parseInt(purchaseFormData.quantite || '0') * parseFloat(purchaseFormData.prixUnitaire || '0')).toLocaleString()} FCFA
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPurchaseForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Form Modal */}
      {showInventoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Inventaire Emballages</h2>
            </div>
            <form onSubmit={handleInventorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emballage
                </label>
                <select
                  value={inventoryData.packagingId}
                  onChange={(e) => setInventoryData({ ...inventoryData, packagingId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un emballage</option>
                  {packaging.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.nom} - Stock actuel: {pkg.stockActuel}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock réel
                </label>
                <input
                  type="number"
                  value={inventoryData.stockReel}
                  onChange={(e) => setInventoryData({ ...inventoryData, stockReel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInventoryForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un emballage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emballage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Unitaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valeur Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPackaging.map((pkg) => {
                const stockValue = pkg.stockActuel * pkg.prixUnitaire;
                const isLowStock = pkg.seuilAlerte && pkg.stockActuel <= pkg.seuilAlerte;
                
                return (
                  <tr key={pkg.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-amber-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{pkg.nom}</div>
                          {isLowStock && (
                            <div className="flex items-center text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Stock faible
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                        {pkg.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={isLowStock ? 'text-amber-600 font-semibold' : ''}>
                        {pkg.stockActuel}
                      </span>
                      {pkg.seuilAlerte && (
                        <span className="text-gray-500 text-xs ml-1">
                          (seuil: {pkg.seuilAlerte})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pkg.prixUnitaire.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {stockValue.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEdit(pkg)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(pkg.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPackaging.length === 0 && (
          <div className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun emballage trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmballagesModule;