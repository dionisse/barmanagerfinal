import React, { useState, useEffect } from 'react';
import { User, Sale, Product, StockSalesCalculation } from '../types';
import { Plus, Search, Filter, Receipt, TrendingUp, Trash2, FileText, ShoppingCart, Edit, AlertTriangle, CheckCircle, XCircle, Calculator } from 'lucide-react';
import { getSales, getProducts, addSale, updateProduct, updateSale, deleteSale, getStockSalesCalculations, addStockSalesCalculation, deleteStockSalesCalculation } from '../utils/dataService';
import { generateInvoicePDF, autoGenerateSimpleInvoice } from '../utils/pdfService';
import { emecefService } from '../utils/emecefService';
import { getSettings } from '../utils/dataService';

interface VentesModuleProps {
  user: User;
}

interface CartItem {
  produitId: string;
  produitNom: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
}

const VentesModule: React.FC<VentesModuleProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'pos' | 'stock-calc'>('pos');
  const [stockCalculations, setStockCalculations] = useState<StockSalesCalculation[]>([]);
  const [showStockCalcForm, setShowStockCalcForm] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    produitId: '',
    quantite: '1'
  });
  const [editFormData, setEditFormData] = useState({
    client: '',
    quantite: '',
    prixUnitaire: ''
  });
  const [stockCalcFormData, setStockCalcFormData] = useState({
    productId: '',
    initialStock: '',
    finalStock: '',
    damaged: '0',
    broken: '0',
    leaking: '0',
    notes: ''
  });

  useEffect(() => {
    loadData();
    generateInvoiceNumber();
  }, []);

  const loadData = async () => {
    const salesData = await getSales();
    const productsData = await getProducts();
    const stockCalcData = await getStockSalesCalculations();
    setSales(salesData);
    setProducts(productsData);
    setStockCalculations(stockCalcData);
  };

  const generateInvoiceNumber = () => {
    const invoiceNum = `FAC-${Date.now()}`;
    setCurrentInvoiceNumber(invoiceNum);
  };

  const addToCart = () => {
    const selectedProduct = products.find(p => p.id === formData.produitId);
    if (!selectedProduct) return;

    const quantite = parseInt(formData.quantite);
    if (selectedProduct.stockActuel < quantite) {
      alert('Stock insuffisant pour cette vente');
      return;
    }

    const existingIndex = cart.findIndex(item => item.produitId === formData.produitId);
    
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantite += quantite;
      updatedCart[existingIndex].total = updatedCart[existingIndex].quantite * selectedProduct.prixVente;
      setCart(updatedCart);
    } else {
      const newItem: CartItem = {
        produitId: formData.produitId,
        produitNom: selectedProduct.nom,
        prixUnitaire: selectedProduct.prixVente,
        quantite: quantite,
        total: selectedProduct.prixVente * quantite
      };
      setCart([...cart, newItem]);
    }

    setFormData({ ...formData, produitId: '', quantite: '1' });
  };

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  const getTotalCart = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      alert('Aucun article dans le panier');
      return;
    }

    try {
      const clientName = formData.client || 'Client anonyme';
      const dateVente = new Date().toISOString().split('T')[0];
      let emecefCode: string | undefined;

      // Récupérer les paramètres pour vérifier si eMecef est activé
      const settings = await getSettings();
      
      // Générer le code eMecef si activé
      if (settings.fiscalite.emecefEnabled) {
        try {
          const invoiceData = {
            client: {
              nom: clientName,
              adresse: '',
              telephone: '',
              email: '',
              nif: ''
            },
            items: cart.map(item => ({
              designation: item.produitNom,
              quantite: item.quantite,
              prixUnitaire: item.prixUnitaire,
              total: item.total,
              tva: settings.facturation.tva
            })),
            total: getTotalCart(),
            tva: settings.facturation.tva,
            totalTTC: getTotalCart() * (1 + settings.facturation.tva / 100),
            numeroFacture: currentInvoiceNumber,
            dateFacture: dateVente
          };

          // Log des données de facture préparées pour eMecef
          console.log('=== DONNÉES DE FACTURE POUR EMECEF ===');
          console.log('Données de facture préparées:', JSON.stringify(invoiceData, null, 2));
          console.log('Paramètres fiscaux actifs:', {
            emecefEnabled: settings.fiscalite.emecefEnabled,
            nif: settings.fiscalite.nif,
            rccm: settings.fiscalite.rccm,
            apiUrl: settings.fiscalite.emecefApiUrl
          });
          console.log('=====================================');

          // Vérifier que l'URL de l'API est configurée
          if (!settings.fiscalite.emecefApiUrl) {
            console.warn('⚠️ URL de l\'API eMecef non configurée - vente continuée sans code eMecef');
            // Continuer sans eMecef
          } else {
          const emecefResult = await emecefService.generateEmecefCode(invoiceData, settings.fiscalite);
          if (emecefResult.success && emecefResult.data) {
            emecefCode = emecefResult.data.codeEmecef;
            console.log('✅ Code eMecef généré avec succès:', emecefCode);
          } else {
            console.error('❌ Échec de la génération du code eMecef:', emecefResult.error || emecefResult.message);
              // Afficher un message d'avertissement mais continuer la vente
              console.warn('⚠️ Vente continuée sans code eMecef en raison de l\'erreur ci-dessus');
          }
          }
        } catch (emecefError) {
          console.error('❌ Erreur lors de l\'appel eMecef:', emecefError);
          console.warn('Erreur eMecef, vente continuée sans code:', emecefError);
          // Afficher un message informatif à l'utilisateur
          console.warn('⚠️ La vente sera enregistrée sans code eMecef en raison d\'un problème de connectivité');
        }
      }

      for (const item of cart) {
        const newSale: Sale = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          dateVente: dateVente,
          client: clientName,
          produitId: item.produitId,
          produitNom: item.produitNom,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          total: item.total,
          numeroFacture: currentInvoiceNumber,
          emecefCode: emecefCode,
          emecefStatus: emecefCode ? 'success' : (settings.fiscalite.emecefEnabled ? 'error' : undefined)
        };

        await addSale(newSale);

        const product = products.find(p => p.id === item.produitId);
        if (product) {
          const updatedProduct = {
            ...product,
            stockActuel: product.stockActuel - item.quantite
          };
          await updateProduct(updatedProduct);
        }
      }

      // Générer automatiquement la facture PDF simple
      try {
        await autoGenerateSimpleInvoice({
          invoiceNumber: currentInvoiceNumber,
          client: clientName,
          items: cart,
          total: getTotalCart(),
          emecefCode: emecefCode
        });
      } catch (pdfError) {
        console.warn('Erreur lors de la génération automatique du PDF:', pdfError);
        // Ne pas bloquer la vente si le PDF échoue
      }

      alert('Vente finalisée avec succès !');
      resetSale();
      loadData();
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      alert('Erreur lors de la finalisation de la vente');
    }
  };

  const generatePDF = () => {
    if (cart.length === 0) {
      alert('Aucun article à facturer');
      return;
    }

    const invoiceData = {
      invoiceNumber: currentInvoiceNumber,
      date: new Date().toLocaleDateString('fr-FR'),
      client: formData.client || 'Client anonyme',
      items: cart,
      total: getTotalCart()
    };

    generateInvoicePDF(invoiceData);
  };

  const resetSale = () => {
    setCart([]);
    setFormData({ client: '', produitId: '', quantite: '1' });
    generateInvoiceNumber();
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditFormData({
      client: sale.client,
      quantite: sale.quantite.toString(),
      prixUnitaire: sale.prixUnitaire.toString()
    });
    setShowEditModal(true);
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;

    try {
      const newQuantite = parseInt(editFormData.quantite);
      const newPrixUnitaire = parseFloat(editFormData.prixUnitaire);
      const oldQuantite = editingSale.quantite;
      const quantiteDifference = newQuantite - oldQuantite;

      // Vérifier le stock disponible si on augmente la quantité
      if (quantiteDifference > 0) {
        const product = products.find(p => p.id === editingSale.produitId);
        if (product && product.stockActuel < quantiteDifference) {
          alert('Stock insuffisant pour cette modification');
          return;
        }
      }

      const updatedSale: Sale = {
        ...editingSale,
        client: editFormData.client,
        quantite: newQuantite,
        prixUnitaire: newPrixUnitaire,
        total: newQuantite * newPrixUnitaire
      };

      await updateSale(updatedSale);

      // Ajuster le stock
      const product = products.find(p => p.id === editingSale.produitId);
      if (product) {
        const updatedProduct = {
          ...product,
          stockActuel: product.stockActuel - quantiteDifference
        };
        await updateProduct(updatedProduct);
      }

      alert('Vente modifiée avec succès !');
      setShowEditModal(false);
      setEditingSale(null);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('Erreur lors de la modification de la vente');
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette vente ?\n\nFacture: ${sale.numeroFacture}\nClient: ${sale.client}\nProduit: ${sale.produitNom}\nMontant: ${sale.total} FCFA`)) {
      return;
    }

    try {
      await deleteSale(sale.id);

      // Remettre le stock
      const product = products.find(p => p.id === sale.produitId);
      if (product) {
        const updatedProduct = {
          ...product,
          stockActuel: product.stockActuel + sale.quantite
        };
        await updateProduct(updatedProduct);
      }

      alert('Vente supprimée avec succès !');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la vente');
    }
  };

  const calculateQuantitySold = () => {
    const initial = parseInt(stockCalcFormData.initialStock || '0');
    const final = parseInt(stockCalcFormData.finalStock || '0');
    const damaged = parseInt(stockCalcFormData.damaged || '0');
    const broken = parseInt(stockCalcFormData.broken || '0');
    const leaking = parseInt(stockCalcFormData.leaking || '0');

    return final - initial - (damaged + broken + leaking);
  };

  const handleStockCalcSubmit = async () => {
    if (!stockCalcFormData.productId || !stockCalcFormData.initialStock || !stockCalcFormData.finalStock) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const selectedProduct = products.find(p => p.id === stockCalcFormData.productId);
    if (!selectedProduct) return;

    const quantitySold = calculateQuantitySold();

    const newCalculation: StockSalesCalculation = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      productId: stockCalcFormData.productId,
      productName: selectedProduct.nom,
      initialStock: parseInt(stockCalcFormData.initialStock),
      finalStock: parseInt(stockCalcFormData.finalStock),
      damaged: parseInt(stockCalcFormData.damaged || '0'),
      broken: parseInt(stockCalcFormData.broken || '0'),
      leaking: parseInt(stockCalcFormData.leaking || '0'),
      quantitySold: quantitySold,
      notes: stockCalcFormData.notes,
      createdAt: new Date().toISOString(),
      createdBy: user.username
    };

    try {
      await addStockSalesCalculation(newCalculation);
      alert('Calcul de ventes enregistré avec succès !');
      setStockCalcFormData({
        productId: '',
        initialStock: '',
        finalStock: '',
        damaged: '0',
        broken: '0',
        leaking: '0',
        notes: ''
      });
      setShowStockCalcForm(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      alert('Erreur lors de l\'enregistrement du calcul');
    }
  };

  const handleDeleteStockCalc = async (calcId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce calcul ?')) {
      return;
    }

    try {
      await deleteStockSalesCalculation(calcId);
      alert('Calcul supprimé avec succès !');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du calcul');
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.produitNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVentes = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Point de Vente</h1>
          <p className="text-gray-600 mt-2">Gestion des ventes et facturation</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'pos') {
              setShowForm(!showForm);
            } else {
              setShowStockCalcForm(!showStockCalcForm);
            }
          }}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>
            {activeTab === 'pos'
              ? (showForm ? 'Masquer POS' : 'Ouvrir POS')
              : (showStockCalcForm ? 'Masquer Formulaire' : 'Nouveau Calcul')
            }
          </span>
        </button>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('pos')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'pos'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Point de Vente</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stock-calc')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'stock-calc'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Calcul Ventes par Stock</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'pos' && showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Vente</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client
                    </label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Nom du client"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Produit
                    </label>
                    <select
                      value={formData.produitId}
                      onChange={(e) => setFormData({ ...formData, produitId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.filter(p => p.stockActuel > 0).map(product => (
                        <option key={product.id} value={product.id}>
                          {product.nom} - {product.prixVente} FCFA (Stock: {product.stockActuel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantité
                    </label>
                    <input
                      type="number"
                      value={formData.quantite}
                      onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="1"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={addToCart}
                      disabled={!formData.produitId}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix Unit.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité
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
                            {item.prixUnitaire.toLocaleString()} FCFA
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantite}
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
                    Aucun article dans le panier
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Facture</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">N° Facture:</span>
                  <span className="font-semibold">{currentInvoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-semibold">{formData.client || 'Client anonyme'}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {getTotalCart().toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={finalizeSale}
                  disabled={cart.length === 0}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Receipt className="h-5 w-5" />
                  <span>Finaliser Vente</span>
                </button>
                
                <button
                  onClick={generatePDF}
                  disabled={cart.length === 0}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <FileText className="h-5 w-5" />
                  <span>PDF Détaillé</span>
                </button>
                
                <button
                  onClick={resetSale}
                  className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Nouvelle Vente</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé du Jour</h3>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800 font-medium text-sm">Facturation Automatique</span>
                  </div>
                  <p className="text-blue-700 text-xs">
                    Une facture PDF simple (ticket de caisse) est générée automatiquement après chaque vente finalisée.
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Ventes:</span>
                  <span className="font-semibold text-green-600">{totalVentes.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre de Ventes:</span>
                  <span className="font-semibold">{filteredSales.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vente Moyenne:</span>
                  <span className="font-semibold">
                    {filteredSales.length > 0 ? (totalVentes / filteredSales.length).toLocaleString() : 0} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock-calc' && showStockCalcForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calcul de Ventes par Stock</h3>
          <p className="text-sm text-gray-600 mb-6">
            Formule: Stock Final - Stock Initial - (Endommagés + Cassés + Fuyants) = Quantité Vendue
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produit <span className="text-red-500">*</span>
              </label>
              <select
                value={stockCalcFormData.productId}
                onChange={(e) => setStockCalcFormData({ ...stockCalcFormData, productId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Sélectionner un produit</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Initial <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={stockCalcFormData.initialStock}
                onChange={(e) => setStockCalcFormData({ ...stockCalcFormData, initialStock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                placeholder="Stock au début"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Final (après inventaire) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={stockCalcFormData.finalStock}
                onChange={(e) => setStockCalcFormData({ ...stockCalcFormData, finalStock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                placeholder="Stock après comptage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantité Endommagée
              </label>
              <input
                type="number"
                value={stockCalcFormData.damaged}
                onChange={(e) => setStockCalcFormData({ ...stockCalcFormData, damaged: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                placeholder="Articles endommagés"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantité Cassée
              </label>
              <input
                type="number"
                value={stockCalcFormData.broken}
                onChange={(e) => setStockCalcFormData({ ...stockCalcFormData, broken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                placeholder="Articles cassés"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantité Fuyante
              </label>
              <input
                type="number"
                value={stockCalcFormData.leaking}
                onChange={(e) => setStockCalcFormData({ ...stockCalcFormData, leaking: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                placeholder="Articles fuyants"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={stockCalcFormData.notes}
                onChange={(e) => setStockCalcFormData({ ...stockCalcFormData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={2}
                placeholder="Observations (optionnel)"
              />
            </div>
          </div>

          {stockCalcFormData.initialStock && stockCalcFormData.finalStock && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-green-800 font-medium">Quantité Vendue Calculée:</span>
                <span className="text-2xl font-bold text-green-600">
                  {calculateQuantitySold()} unités
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowStockCalcForm(false);
                setStockCalcFormData({
                  productId: '',
                  initialStock: '',
                  finalStock: '',
                  damaged: '0',
                  broken: '0',
                  leaking: '0',
                  notes: ''
                });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleStockCalcSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Enregistrer le Calcul
            </button>
          </div>
        </div>
      )}

      {activeTab === 'stock-calc' && !showStockCalcForm && (
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Historique des Calculs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Initial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pertes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité Vendue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockCalculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(calc.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {calc.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calc.initialStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calc.finalStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-red-600">
                        {calc.damaged + calc.broken + calc.leaking}
                        {(calc.damaged > 0 || calc.broken > 0 || calc.leaking > 0) && (
                          <div className="text-xs text-gray-500">
                            (E:{calc.damaged} C:{calc.broken} F:{calc.leaking})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {calc.quantitySold}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {calc.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteStockCalc(calc.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {stockCalculations.length === 0 && (
            <div className="p-8 text-center">
              <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Aucun calcul enregistré</p>
              <p className="text-sm text-gray-400 mt-2">
                Utilisez le bouton "Nouveau Calcul" pour commencer
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de modification de vente */}
      {showEditModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Modifier la Vente</h2>
              <p className="text-sm text-gray-600 mt-1">Facture: {editingSale.numeroFacture}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produit
                </label>
                <input
                  type="text"
                  value={editingSale.produitNom}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client
                </label>
                <input
                  type="text"
                  value={editFormData.client}
                  onChange={(e) => setEditFormData({ ...editFormData, client: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité
                  </label>
                  <input
                    type="number"
                    value={editFormData.quantite}
                    onChange={(e) => setEditFormData({ ...editFormData, quantite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix Unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.prixUnitaire}
                    onChange={(e) => setEditFormData({ ...editFormData, prixUnitaire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {editFormData.quantite && editFormData.prixUnitaire && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 font-semibold">
                    Nouveau Total: {(parseInt(editFormData.quantite || '0') * parseFloat(editFormData.prixUnitaire || '0')).toLocaleString()} FCFA
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateSale}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pos' && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                placeholder="Rechercher par client, produit ou facture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  N° Facture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  eMecef
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.dateVente).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      {sale.numeroFacture}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.produitNom}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.quantite}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.prixUnitaire.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {sale.total.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {sale.emecefCode ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 text-xs">Généré</span>
                      </div>
                    ) : sale.emecefStatus === 'error' ? (
                      <div className="flex items-center space-x-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 text-xs">Erreur</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditSale(sale)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSale(sale)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Supprimer"
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

        {filteredSales.length === 0 && (
          <div className="p-8 text-center">
            <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune vente trouvée</p>
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default VentesModule;