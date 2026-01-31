import React, { useState, useEffect } from 'react';
import { User, MultiPurchase, PurchaseItem, Product } from '../types';
import { Plus, Search, Filter, Edit, Trash2, Package, ShoppingBag, ShoppingCart, Calculator } from 'lucide-react';
import { getMultiPurchases, getProducts, addMultiPurchase, updateProduct, addProduct, updateMultiPurchase, deleteMultiPurchase } from '../utils/dataService';

interface AchatsModuleProps {
  user: User;
}

const AchatsModule: React.FC<AchatsModuleProps> = ({ user }) => {
  const [purchases, setPurchases] = useState<MultiPurchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<MultiPurchase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [currentOrderNumber, setCurrentOrderNumber] = useState('');
  const [formData, setFormData] = useState({
    fournisseur: '',
    dateAchat: new Date().toISOString().split('T')[0],
    produitId: '',
    nombreCasiers: '',
    unitesParCasier: '12',
    prixUnitaire: '',
    prixCasier: ''
  });
  const [newProductData, setNewProductData] = useState({
    nom: '',
    prixVente: '',
    categorie: 'Boissons'
  });

  const categories = ['Boissons',  'Alcools', 'Snacks', 'Cigarettes', 'Autres'];
  const unitesParCasierOptions = [
    { value: '12', label: '12 unités/casier' },
    { value: '20', label: '20 unités/casier' },
    { value: '24', label: '24 unités/casier' },
    { value: '1', label: 'Unité simple' }
  ];

  useEffect(() => {
    loadData();
    generateOrderNumber();

    // Écouter l'événement de restauration des données
    const handleDataRestored = () => {
      console.log('Données restaurées, rechargement du module Achats...');
      loadData();
    };

    window.addEventListener('dataRestored', handleDataRestored);

    return () => {
      window.removeEventListener('dataRestored', handleDataRestored);
    };
  }, []);

  useEffect(() => {
    // Calculer le prix unitaire lorsque le prix du casier ou le nombre d'unités par casier change
    if (formData.prixCasier && formData.unitesParCasier !== '1') {
      const prixCasier = parseFloat(formData.prixCasier);
      const unitesParCasier = parseInt(formData.unitesParCasier);
      if (!isNaN(prixCasier) && !isNaN(unitesParCasier) && unitesParCasier > 0) {
        const prixUnitaire = prixCasier / unitesParCasier;
        setFormData(prev => ({
          ...prev,
          prixUnitaire: prixUnitaire.toFixed(2)
        }));
      }
    }
  }, [formData.prixCasier, formData.unitesParCasier]);

  const loadData = async () => {
    console.log('[ACHATS] Chargement des données...');
    const purchasesData = await getMultiPurchases();
    const productsData = await getProducts();
    console.log('[ACHATS] Produits chargés:', productsData.length);
    setPurchases(purchasesData);
    setProducts(productsData);
  };

  const generateOrderNumber = () => {
    const orderNum = `CMD-${Date.now()}`;
    setCurrentOrderNumber(orderNum);
  };

  const calculateTotalUnits = () => {
    const nombreCasiers = parseInt(formData.nombreCasiers) || 0;
    const unitesParCasier = parseInt(formData.unitesParCasier) || 1;
    return nombreCasiers * unitesParCasier;
  };

  const calculateTotalPrice = () => {
    const totalUnits = calculateTotalUnits();
    const prixUnitaire = parseFloat(formData.prixUnitaire) || 0;
    return totalUnits * prixUnitaire;
  };

  const addToCart = () => {
    const selectedProduct = products.find(p => p.id === formData.produitId);
    if (!selectedProduct) {
      alert('Veuillez sélectionner un produit');
      return;
    }

    const nombreCasiers = parseInt(formData.nombreCasiers);
    const unitesParCasier = parseInt(formData.unitesParCasier);
    const totalUnits = nombreCasiers * unitesParCasier;
    const prixUnitaire = parseFloat(formData.prixUnitaire);
    const totalPrice = totalUnits * prixUnitaire;

    if (!nombreCasiers || !prixUnitaire || isNaN(nombreCasiers) || isNaN(prixUnitaire)) {
      alert('Veuillez remplir tous les champs correctement');
      return;
    }

    if (nombreCasiers <= 0 || prixUnitaire <= 0) {
      alert('Les quantités et prix doivent être supérieurs à 0');
      return;
    }

    console.log('[ACHAT] Ajout au panier:', {
      produit: selectedProduct.nom,
      nombreCasiers,
      unitesParCasier,
      totalUnits,
      prixUnitaire,
      totalPrice
    });

    const existingIndex = cart.findIndex(item => item.produitId === formData.produitId);

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantite += totalUnits;
      updatedCart[existingIndex].total = updatedCart[existingIndex].quantite * prixUnitaire;
      setCart(updatedCart);
      console.log('[ACHAT] Produit déjà dans le panier, quantité mise à jour');
    } else {
      const newItem: PurchaseItem = {
        produitId: formData.produitId,
        produitNom: selectedProduct.nom,
        quantite: totalUnits,
        prixUnitaire: prixUnitaire,
        total: totalPrice
      };
      setCart([...cart, newItem]);
      console.log('[ACHAT] Nouveau produit ajouté au panier');
    }

    setFormData({
      ...formData,
      produitId: '',
      nombreCasiers: '',
      prixUnitaire: '',
      prixCasier: ''
    });
  };

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  const getTotalCart = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const finalizeMultiPurchase = async () => {
    if (cart.length === 0 || !formData.fournisseur) {
      alert('Veuillez ajouter des produits et spécifier un fournisseur');
      return;
    }

    try {
      console.log('[ACHAT] Début de la finalisation de l\'achat multiple');
      console.log('[ACHAT] Panier:', cart);

      const newMultiPurchase: MultiPurchase = {
        id: Date.now().toString(),
        dateAchat: formData.dateAchat,
        fournisseur: formData.fournisseur,
        items: cart,
        totalGeneral: getTotalCart(),
        numeroCommande: currentOrderNumber
      };

      await addMultiPurchase(newMultiPurchase);
      console.log('[ACHAT] Commande enregistrée avec succès');

      // Recharger les produits pour avoir les données les plus récentes
      const freshProducts = await getProducts();
      console.log('[ACHAT] Produits rechargés:', freshProducts.length);

      // Update product stocks and prices (stock is always in units)
      let updateCount = 0;
      for (const item of cart) {
        const product = freshProducts.find(p => p.id === item.produitId);
        if (product) {
          const nouveauStock = product.stockActuel + item.quantite;
          console.log(`[ACHAT] Mise à jour stock pour ${product.nom}:`, {
            produitId: product.id,
            stockAvant: product.stockActuel,
            quantiteAjoutee: item.quantite,
            stockApres: nouveauStock,
            prixAchatAvant: product.prixAchat,
            prixAchatNouveau: item.prixUnitaire
          });

          const updatedProduct = {
            ...product,
            stockActuel: nouveauStock,
            prixAchat: item.prixUnitaire
          };

          await updateProduct(updatedProduct);
          updateCount++;
          console.log(`[ACHAT] ✓ Stock mis à jour avec succès pour ${product.nom}, nouveau stock: ${nouveauStock} unités`);
        } else {
          console.error(`[ACHAT] ✗ Produit non trouvé dans la base: ${item.produitId} (${item.produitNom})`);
        }
      }

      console.log(`[ACHAT] ${updateCount}/${cart.length} produits mis à jour avec succès`);

      alert(`Achat multiple finalisé avec succès !\n${updateCount} produit(s) ajouté(s) au stock.`);
      resetPurchase();

      // Recharger les données pour rafraîchir l'interface
      await loadData();

      console.log('[ACHATS] Déclenchement de l\'événement stockUpdated');
      window.dispatchEvent(new CustomEvent('stockUpdated'));
    } catch (error) {
      console.error('[ACHAT] Erreur lors de la finalisation:', error);
      alert('Erreur lors de la finalisation de l\'achat: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const resetPurchase = () => {
    setCart([]);
    setFormData({
      fournisseur: '',
      dateAchat: new Date().toISOString().split('T')[0],
      produitId: '',
      nombreCasiers: '',
      unitesParCasier: '12',
      prixUnitaire: '',
      prixCasier: ''
    });
    generateOrderNumber();
  };

  const handleNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newProduct: Product = {
      id: Date.now().toString(),
      nom: newProductData.nom,
      prixAchat: 0,
      prixVente: parseFloat(newProductData.prixVente),
      categorie: newProductData.categorie,
      stockActuel: 0
    };

    await addProduct(newProduct);
    setNewProductData({ nom: '', prixVente: '', categorie: 'Boissons' });
    setShowProductForm(false);
    loadData();
  };

  const handleEditPurchase = (purchase: MultiPurchase) => {
    setEditingPurchase(purchase);
    setShowEditModal(true);
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return;
    
    try {
      await updateMultiPurchase(editingPurchase);
      setShowEditModal(false);
      setEditingPurchase(null);
      loadData();
      alert('Commande mise à jour avec succès !');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour de la commande');
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) {
      alert('Commande introuvable');
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette commande ?\n\nATTENTION: Le stock des produits ne sera PAS automatiquement diminué.\nSi vous avez déjà reçu la marchandise, vous devrez ajuster manuellement le stock.`)) {
      return;
    }

    try {
      console.log('[ACHAT] Suppression de la commande:', purchaseId);
      await deleteMultiPurchase(purchaseId);

      await loadData();
      alert('Commande supprimée avec succès !');

      window.dispatchEvent(new CustomEvent('stockUpdated'));
    } catch (error) {
      console.error('[ACHAT] Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la commande');
    }
  };

  const handlePrixCasierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prixCasier = e.target.value;
    setFormData(prev => ({
      ...prev,
      prixCasier
    }));
  };

  const handleUnitesParCasierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unitesParCasier = e.target.value;
    setFormData(prev => ({
      ...prev,
      unitesParCasier,
      // Réinitialiser le prix unitaire si on change pour "Unité simple"
      prixUnitaire: unitesParCasier === '1' ? '' : prev.prixUnitaire,
      // Réinitialiser le prix du casier si on change pour "Unité simple"
      prixCasier: unitesParCasier === '1' ? '' : prev.prixCasier
    }));
  };

  const handlePrixUnitaireChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prixUnitaire = e.target.value;
    setFormData(prev => ({
      ...prev,
      prixUnitaire,
      // Calculer le prix du casier si on modifie directement le prix unitaire
      prixCasier: prev.unitesParCasier !== '1' ? 
        (parseFloat(prixUnitaire) * parseInt(prev.unitesParCasier)).toFixed(2) : 
        ''
    }));
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.numeroCommande.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAchats = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalGeneral, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Achats</h1>
          <p className="text-gray-600 mt-2">Gérez vos approvisionnements par casiers avec conversion automatique en unités</p>
          <p className="text-sm text-green-600 mt-1 font-medium">✓ Le stock est automatiquement mis à jour lors de la finalisation</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowProductForm(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Package className="h-5 w-5" />
            <span>Nouveau Produit</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>{showForm ? 'Masquer' : 'Nouvel Achat'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total des Achats</p>
              <p className="text-2xl font-bold text-blue-600">{totalAchats.toLocaleString()} FCFA</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Commandes</p>
              <p className="text-2xl font-bold text-green-600">{filteredPurchases.length}</p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Produits Référencés</p>
              <p className="text-2xl font-bold text-purple-600">{products.length}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Nouvel Achat par Casiers</h3>
                <p className="text-sm text-gray-600 mt-1">Les achats se font par casiers, le stock est géré en unités individuelles</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fournisseur
                    </label>
                    <input
                      type="text"
                      value={formData.fournisseur}
                      onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom du fournisseur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date d'Achat
                    </label>
                    <input
                      type="date"
                      value={formData.dateAchat}
                      onChange={(e) => setFormData({ ...formData, dateAchat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Produit
                    </label>
                    <select
                      value={formData.produitId}
                      onChange={(e) => setFormData({ ...formData, produitId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.nom} - Stock: {product.stockActuel} unités
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unités/Casier
                    </label>
                    <select
                      value={formData.unitesParCasier}
                      onChange={handleUnitesParCasierChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {unitesParCasierOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de Casiers
                    </label>
                    <input
                      type="number"
                      value={formData.nombreCasiers}
                      onChange={(e) => setFormData({ ...formData, nombreCasiers: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      placeholder="Ex: 5"
                    />
                  </div>

                  {formData.unitesParCasier !== '1' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prix/Casier (FCFA)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.prixCasier}
                        onChange={handlePrixCasierChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Prix par casier"
                      />
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix/Unité (FCFA)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.prixUnitaire}
                      onChange={handlePrixUnitaireChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Prix unitaire"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={addToCart}
                      disabled={!formData.produitId || !formData.nombreCasiers || !formData.prixUnitaire}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                {/* Calculateur en temps réel */}
                {formData.nombreCasiers && formData.unitesParCasier && formData.prixUnitaire && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-800">Calcul Automatique</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Casiers:</span>
                        <p className="font-semibold text-blue-800">{formData.nombreCasiers}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Unités/Casier:</span>
                        <p className="font-semibold text-blue-800">{formData.unitesParCasier}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Unités:</span>
                        <p className="font-semibold text-green-600">{calculateTotalUnits()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Prix Total:</span>
                        <p className="font-semibold text-green-600">{calculateTotalPrice().toLocaleString()} FCFA</p>
                      </div>
                      {formData.unitesParCasier !== '1' && (
                        <>
                          <div>
                            <span className="text-gray-600">Prix/Casier:</span>
                            <p className="font-semibold text-blue-800">
                              {formData.prixCasier ? parseFloat(formData.prixCasier).toLocaleString() :
                                (parseFloat(formData.prixUnitaire) * parseInt(formData.unitesParCasier)).toLocaleString()} FCFA
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Prix/Unité:</span>
                            <p className="font-semibold text-blue-800">{parseFloat(formData.prixUnitaire).toLocaleString()} FCFA</p>
                          </div>
                        </>
                      )}
                      {formData.produitId && (() => {
                        const selectedProduct = products.find(p => p.id === formData.produitId);
                        if (selectedProduct) {
                          return (
                            <>
                              <div>
                                <span className="text-gray-600">Stock Actuel:</span>
                                <p className="font-semibold text-gray-800">{selectedProduct.stockActuel} unités</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Stock Après Achat:</span>
                                <p className="font-semibold text-green-700">{selectedProduct.stockActuel + calculateTotalUnits()} unités</p>
                              </div>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité (Unités)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix Unit.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cart.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.produitNom}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                              {item.quantite} unités
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.prixUnitaire.toLocaleString()} FCFA
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                            {item.total.toLocaleString()} FCFA
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => removeFromCart(index)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {cart.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun produit dans le panier d'achat
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Commande</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">N° Commande:</span>
                  <span className="font-semibold">{currentOrderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{new Date(formData.dateAchat).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fournisseur:</span>
                  <span className="font-semibold">{formData.fournisseur || 'Non spécifié'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Articles:</span>
                  <span className="font-semibold">{cart.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Unités:</span>
                  <span className="font-semibold text-green-600">
                    {cart.reduce((sum, item) => sum + item.quantite, 0)} unités
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {getTotalCart().toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={finalizeMultiPurchase}
                  disabled={cart.length === 0 || !formData.fournisseur}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Package className="h-5 w-5" />
                  <span>Finaliser Achat</span>
                </button>
                
                <button
                  onClick={resetPurchase}
                  className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Nouvelle Commande</span>
                </button>
              </div>
            </div>

            {/* Aide sur les casiers */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">💡 Aide Casiers</h3>
              <div className="space-y-2 text-sm">
                <p><strong>12 unités/casier:</strong> Bières, sodas standards</p>
                <p><strong>20 unités/casier:</strong> Petites bouteilles</p>
                <p><strong>24 unités/casier:</strong> Canettes, bouteilles 33cl</p>
                <p><strong>Unité simple:</strong> Produits vendus à l'unité</p>
              </div>
            </div>

            {/* Info mise à jour automatique du stock */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">✓ Mise à Jour Automatique</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Stock en unités:</strong> Le stock est toujours géré en unités individuelles</p>
                <p><strong>Achats en casiers:</strong> Les casiers sont automatiquement convertis en unités</p>
                <p><strong>Exemple:</strong> 5 casiers × 12 unités = 60 unités ajoutées au stock</p>
                <p className="mt-3 pt-3 border-t border-green-400">
                  <strong>Important:</strong> Le stock sera mis à jour automatiquement après la finalisation
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouveau produit */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Nouveau Produit</h2>
            </div>
            <form onSubmit={handleNewProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du produit
                </label>
                <input
                  type="text"
                  value={newProductData.nom}
                  onChange={(e) => setNewProductData({ ...newProductData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={newProductData.categorie}
                  onChange={(e) => setNewProductData({ ...newProductData, categorie: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix de vente (FCFA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProductData.prixVente}
                  onChange={(e) => setNewProductData({ ...newProductData, prixVente: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'édition de commande */}
      {showEditModal && editingPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Modifier la Commande</h2>
              <p className="text-sm text-gray-600 mt-1">N° {editingPurchase.numeroCommande}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={editingPurchase.fournisseur}
                  onChange={(e) => setEditingPurchase({...editingPurchase, fournisseur: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'achat
                </label>
                <input
                  type="date"
                  value={editingPurchase.dateAchat}
                  onChange={(e) => setEditingPurchase({...editingPurchase, dateAchat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Articles
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {editingPurchase.items.map((item, index) => (
                    <div key={index} className="p-3 border-b border-gray-200 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.produitNom}</p>
                          <p className="text-sm text-gray-600">{item.quantite} unités × {item.prixUnitaire.toLocaleString()} FCFA</p>
                        </div>
                        <p className="font-semibold text-green-600">{item.total.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-800">Total:</span>
                  <span className="font-bold text-blue-800">{editingPurchase.totalGeneral.toLocaleString()} FCFA</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdatePurchase}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mettre à jour
                </button>
              </div>
            </div>
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
                placeholder="Rechercher par fournisseur ou commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Commande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fournisseur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Articles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Unités
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(purchase.dateAchat).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      {purchase.numeroCommande}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{purchase.fournisseur}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.items.length} article(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                      {purchase.items.reduce((sum, item) => sum + item.quantite, 0)} unités
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {purchase.totalGeneral.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditPurchase(purchase)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeletePurchase(purchase.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPurchases.length === 0 && (
          <div className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun achat trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchatsModule;