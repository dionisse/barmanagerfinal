import React, { useState, useEffect } from 'react';
import { User, Product, InventoryRecord } from '../types';
import { Plus, Search, AlertTriangle, Package, Edit, Trash2, RefreshCw, TrendingUp, TrendingDown, ClipboardList, Settings, Calculator } from 'lucide-react';
import { getProducts, addProduct, updateProduct, deleteProduct, getInventoryRecords, addInventoryRecord } from '../utils/dataService';

interface StocksModuleProps {
  user: User;
}

const StocksModule: React.FC<StocksModuleProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prixAchat: '',
    prixVente: '',
    categorie: '',
    stockActuel: '',
    seuilAlerte: ''
  });
  const [adjustData, setAdjustData] = useState({
    nouveauStock: '',
    motif: ''
  });
  const [inventoryData, setInventoryData] = useState({
    stockReel: '',
    avaries: '',
    stockVendu: '',
    observations: ''
  });

  const categories = ['Boissons', 'Alcools', 'Snacks', 'Cigarettes', 'Autres'];
  const motifs = ['Inventaire', 'Perte/Casse', 'Vol', 'Correction d\'erreur', 'Retour fournisseur'];

  useEffect(() => {
    loadData();

    // Écouter l'événement de restauration des données
    const handleDataRestored = () => {
      console.log('Données restaurées, rechargement du module Stocks...');
      loadData();
    };

    window.addEventListener('dataRestored', handleDataRestored);

    return () => {
      window.removeEventListener('dataRestored', handleDataRestored);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const productsData = await getProducts();
      const inventoryData = await getInventoryRecords();
      setProducts(productsData);
      setInventoryRecords(inventoryData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prixAchat: '',
      prixVente: '',
      categorie: '',
      stockActuel: '',
      seuilAlerte: ''
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nom: product.nom,
      prixAchat: product.prixAchat.toString(),
      prixVente: product.prixVente.toString(),
      categorie: product.categorie,
      stockActuel: product.stockActuel.toString(),
      seuilAlerte: product.seuilAlerte?.toString() || ''
    });
    setShowForm(true);
  };

  const handleAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustData({
      nouveauStock: product.stockActuel.toString(),
      motif: ''
    });
    setShowAdjustModal(true);
  };

  const handleInventory = (product: Product) => {
    setInventoryProduct(product);
    setInventoryData({
      stockReel: '',
      avaries: '0',
      stockVendu: '',
      observations: ''
    });
    setShowInventoryModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData: Product = {
      id: editingProduct?.id || Date.now().toString(),
      nom: formData.nom,
      prixAchat: parseFloat(formData.prixAchat),
      prixVente: parseFloat(formData.prixVente),
      categorie: formData.categorie,
      stockActuel: parseInt(formData.stockActuel),
      seuilAlerte: formData.seuilAlerte ? parseInt(formData.seuilAlerte) : undefined
    };

    if (editingProduct) {
      await updateProduct(productData);
    } else {
      await addProduct(productData);
    }

    resetForm();
    setShowForm(false);
    loadData();
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adjustingProduct) return;

    const updatedProduct = {
      ...adjustingProduct,
      stockActuel: parseInt(adjustData.nouveauStock)
    };

    await updateProduct(updatedProduct);
    
    setShowAdjustModal(false);
    setAdjustingProduct(null);
    setAdjustData({ nouveauStock: '', motif: '' });
    loadData();
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inventoryProduct) return;

    const stockReel = parseInt(inventoryData.stockReel) || 0;
    const avaries = parseInt(inventoryData.avaries) || 0;
    const stockTheorique = inventoryProduct.stockActuel;
    
    // Utiliser le stock vendu saisi manuellement ou le calculer
    const stockVendu = inventoryData.stockVendu 
      ? parseInt(inventoryData.stockVendu) 
      : stockTheorique - stockReel + avaries;
      
    const coutVente = stockVendu * inventoryProduct.prixAchat;

    const inventoryRecord: InventoryRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      produitId: inventoryProduct.id,
      produitNom: inventoryProduct.nom,
      stockTheorique: stockTheorique,
      stockReel: stockReel,
      avaries: avaries,
      stockVendu: stockVendu,
      coutVente: coutVente,
      observations: inventoryData.observations
    };

    await addInventoryRecord(inventoryRecord);

    // Update product stock to real stock
    const updatedProduct = {
      ...inventoryProduct,
      stockActuel: stockReel
    };
    await updateProduct(updatedProduct);

    setShowInventoryModal(false);
    setInventoryProduct(null);
    setInventoryData({ stockReel: '', avaries: '', stockVendu: '', observations: '' });
    loadData();
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      await deleteProduct(productId);
      loadData();
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.categorie.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || product.categorie === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter(product => 
    product.seuilAlerte && product.stockActuel <= product.seuilAlerte
  );

  const outOfStockProducts = products.filter(product => product.stockActuel === 0);

  const totalValue = products.reduce((sum, product) => 
    sum + (product.stockActuel * product.prixAchat), 0
  );

  const totalProducts = products.length;
  const productsInStock = products.filter(p => p.stockActuel > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Stocks</h1>
          <p className="text-gray-600 mt-2">Gérez votre inventaire et surveillez les stocks</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Chargement...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                <span>Actualiser</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Produits</p>
              <p className="text-2xl font-bold text-blue-600">{totalProducts}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">{productsInStock} en stock</span>
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
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-500">Valeur totale d'achat</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertes Stock</p>
              <p className="text-2xl font-bold text-amber-600">{lowStockProducts.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingDown className="h-4 w-4 text-amber-500 mr-1" />
            <span className="text-amber-600">Stock faible</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Épuisé</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
            </div>
            <Package className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-red-600">Rupture de stock</span>
          </div>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-800">Alertes de Stock Faible</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-lg border border-amber-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{product.nom}</p>
                    <p className="text-sm text-gray-600">{product.categorie}</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Stock: {product.stockActuel} / Seuil: {product.seuilAlerte}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleAdjust(product)}
                      className="text-amber-600 hover:text-amber-800 text-xs font-medium px-2 py-1 bg-amber-100 rounded"
                    >
                      Ajuster
                    </button>
                    <button
                      onClick={() => handleInventory(product)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 bg-blue-100 rounded"
                    >
                      Inventaire
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du produit
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix d'achat (FCFA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.prixAchat}
                    onChange={(e) => setFormData({ ...formData, prixAchat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix de vente (FCFA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.prixVente}
                    onChange={(e) => setFormData({ ...formData, prixVente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock actuel
                  </label>
                  <input
                    type="number"
                    value={formData.stockActuel}
                    onChange={(e) => setFormData({ ...formData, stockActuel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seuil d'alerte
                  </label>
                  <input
                    type="number"
                    value={formData.seuilAlerte}
                    onChange={(e) => setFormData({ ...formData, seuilAlerte: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {formData.prixAchat && formData.prixVente && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800 font-semibold">
                    Marge: {(((parseFloat(formData.prixVente) - parseFloat(formData.prixAchat)) / parseFloat(formData.prixAchat)) * 100).toFixed(1)}%
                  </p>
                  <p className="text-green-700 text-sm">
                    Bénéfice unitaire: {(parseFloat(formData.prixVente) - parseFloat(formData.prixAchat)).toFixed(0)} FCFA
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingProduct ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Ajuster Stock</h2>
            </div>
            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produit
                </label>
                <input
                  type="text"
                  value={adjustingProduct.nom}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Actuel
                </label>
                <input
                  type="text"
                  value={adjustingProduct.stockActuel}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau Stock
                </label>
                <input
                  type="number"
                  value={adjustData.nouveauStock}
                  onChange={(e) => setAdjustData({ ...adjustData, nouveauStock: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif
                </label>
                <select
                  value={adjustData.motif}
                  onChange={(e) => setAdjustData({ ...adjustData, motif: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un motif</option>
                  {motifs.map(motif => (
                    <option key={motif} value={motif}>{motif}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && inventoryProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Inventaire - {inventoryProduct.nom}</h2>
            </div>
            <form onSubmit={handleInventorySubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Théorique
                  </label>
                  <input
                    type="text"
                    value={inventoryProduct.stockActuel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Réel
                  </label>
                  <input
                    type="number"
                    value={inventoryData.stockReel}
                    onChange={(e) => {
                      const newStockReel = e.target.value;
                      setInventoryData(prev => {
                        // Calculer automatiquement le stock vendu si le stock réel change
                        const stockReel = parseInt(newStockReel) || 0;
                        const avaries = parseInt(prev.avaries) || 0;
                        const stockTheorique = inventoryProduct?.stockActuel || 0;
                        const calculatedStockVendu = stockTheorique - stockReel + avaries;
                        
                        return {
                          ...prev,
                          stockReel: newStockReel,
                          stockVendu: calculatedStockVendu.toString()
                        };
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avaries / Pertes
                </label>
                <input
                  type="number"
                  value={inventoryData.avaries}
                  onChange={(e) => {
                    const newAvaries = e.target.value;
                    setInventoryData(prev => {
                      // Recalculer le stock vendu si les avaries changent
                      const stockReel = parseInt(prev.stockReel) || 0;
                      const avaries = parseInt(newAvaries) || 0;
                      const stockTheorique = inventoryProduct?.stockActuel || 0;
                      const calculatedStockVendu = stockTheorique - stockReel + avaries;
                      
                      return {
                        ...prev,
                        avaries: newAvaries,
                        stockVendu: calculatedStockVendu.toString()
                      };
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Vendu <span className="text-xs text-gray-500">(calculé ou manuel)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={inventoryData.stockVendu}
                      onChange={(e) => setInventoryData({ ...inventoryData, stockVendu: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Calculator className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formule: Stock Théorique - Stock Réel + Avaries
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coût de Vente
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {inventoryData.stockVendu && inventoryProduct 
                      ? ((parseInt(inventoryData.stockVendu) || 0) * inventoryProduct.prixAchat).toLocaleString() 
                      : '0'} FCFA
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formule: Stock Vendu × Prix d'Achat
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observations
                </label>
                <textarea
                  value={inventoryData.observations}
                  onChange={(e) => setInventoryData({ ...inventoryData, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Observations sur l'inventaire..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                  <Calculator className="h-4 w-4 mr-2" />
                  Résumé de l'Inventaire
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    <span className="text-gray-600">Stock Théorique:</span>
                    <p className="font-semibold">{inventoryProduct?.stockActuel || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Stock Réel:</span>
                    <p className="font-semibold">{inventoryData.stockReel || '0'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Avaries:</span>
                    <p className="font-semibold">{inventoryData.avaries || '0'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Stock Vendu:</span>
                    <p className="font-semibold">{inventoryData.stockVendu || '0'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInventoryModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Enregistrer Inventaire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Achat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Vente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marge
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
              {filteredProducts.map((product) => {
                const margin = ((product.prixVente - product.prixAchat) / product.prixAchat) * 100;
                const stockValue = product.stockActuel * product.prixAchat;
                const isLowStock = product.seuilAlerte && product.stockActuel <= product.seuilAlerte;
                const isOutOfStock = product.stockActuel === 0;
                
                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-amber-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.nom}</div>
                          {(isLowStock || isOutOfStock) && (
                            <div className="flex items-center text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span className={isOutOfStock ? 'text-red-600' : 'text-amber-600'}>
                                {isOutOfStock ? 'Stock épuisé' : 'Stock faible'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                        {product.categorie}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-semibold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                        {product.stockActuel}
                      </span> 
                      {product.seuilAlerte && (
                        <span className="text-gray-500 text-xs ml-1">
                          (seuil: {product.seuilAlerte})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.prixAchat.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {product.prixVente.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {margin.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {stockValue.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleAdjust(product)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Ajuster stock"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleInventory(product)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="Inventaire"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Supprimer"
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

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun produit trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StocksModule;