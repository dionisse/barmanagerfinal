import React, { useState, useEffect } from 'react';
import { User, Expense } from '../types';
import { Plus, Search, Filter, Edit, Trash2, DollarSign, TrendingDown, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../utils/dataService';

interface DepensesModuleProps {
  user: User;
}

type SortField = 'date' | 'montant' | 'description' | 'categorie';
type SortOrder = 'asc' | 'desc';

const DepensesModule: React.FC<DepensesModuleProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    montant: '',
    categorie: '',
    destinataire: '',
    type: 'Dépense' as 'Dépense' | 'Charge'
  });

  const categories = [
    'Électricité',
    'Eau',
    'Loyer',
    'Salaires',
    'Transport',
    'Maintenance',
    'Fournitures',
    'Marketing',
    'Assurance',
    'Taxes',
    'Autres'
  ];

  useEffect(() => {
    loadExpenses();

    // Écouter l'événement de restauration des données
    const handleDataRestored = () => {
      console.log('Données restaurées, rechargement du module Dépenses...');
      loadExpenses();
    };

    window.addEventListener('dataRestored', handleDataRestored);

    return () => {
      window.removeEventListener('dataRestored', handleDataRestored);
    };
  }, []);

  const loadExpenses = async () => {
    const expensesData = await getExpenses();
    setExpenses(expensesData);
  };

  const resetForm = () => {
    setFormData({
      description: '',
      date: new Date().toISOString().split('T')[0],
      montant: '',
      categorie: '',
      destinataire: '',
      type: 'Dépense'
    });
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      date: expense.date,
      montant: expense.montant.toString(),
      categorie: expense.categorie,
      destinataire: expense.destinataire,
      type: expense.type
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const expenseData: Expense = {
      id: editingExpense?.id || Date.now().toString(),
      date: formData.date,
      description: formData.description,
      montant: parseFloat(formData.montant),
      categorie: formData.categorie,
      destinataire: formData.destinataire,
      type: formData.type
    };

    if (editingExpense) {
      await updateExpense(expenseData);
    } else {
      await addExpense(expenseData);
    }

    resetForm();
    setShowForm(false);
    loadExpenses();
  };

  const handleDelete = async (expenseId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      await deleteExpense(expenseId);
      loadExpenses();
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  const resetPeriodFilters = () => {
    setDateDebut('');
    setDateFin('');
  };

  const setPeriodToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateDebut(today);
    setDateFin(today);
  };

  const setPeriodThisWeek = () => {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    setDateDebut(firstDay.toISOString().split('T')[0]);
    setDateFin(lastDay.toISOString().split('T')[0]);
  };

  const setPeriodThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setDateDebut(firstDay.toISOString().split('T')[0]);
    setDateFin(lastDay.toISOString().split('T')[0]);
  };

  const setPeriodThisYear = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    const lastDay = new Date(today.getFullYear(), 11, 31);
    setDateDebut(firstDay.toISOString().split('T')[0]);
    setDateFin(lastDay.toISOString().split('T')[0]);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.destinataire.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || expense.categorie === selectedCategory;
    const matchesType = selectedType === '' || expense.type === selectedType;

    const matchesDateDebut = dateDebut === '' || expense.date >= dateDebut;
    const matchesDateFin = dateFin === '' || expense.date <= dateFin;

    return matchesSearch && matchesCategory && matchesType && matchesDateDebut && matchesDateFin;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'date':
        comparison = a.date.localeCompare(b.date);
        break;
      case 'montant':
        comparison = a.montant - b.montant;
        break;
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
      case 'categorie':
        comparison = a.categorie.localeCompare(b.categorie);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Calculate statistics for the selected period
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const periodExpenses = dateDebut || dateFin
    ? expenses.filter(e => {
        const matchesDateDebut = dateDebut === '' || e.date >= dateDebut;
        const matchesDateFin = dateFin === '' || e.date <= dateFin;
        return matchesDateDebut && matchesDateFin;
      })
    : expenses;

  const todayExpenses = expenses.filter(e => e.date === today);
  const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth));

  const totalToday = todayExpenses.reduce((sum, expense) => sum + expense.montant, 0);
  const totalMonth = monthExpenses.reduce((sum, expense) => sum + expense.montant, 0);

  const totalPeriodDepenses = periodExpenses.filter(e => e.type === 'Dépense').reduce((sum, expense) => sum + expense.montant, 0);
  const totalPeriodCharges = periodExpenses.filter(e => e.type === 'Charge').reduce((sum, expense) => sum + expense.montant, 0);
  const totalPeriod = totalPeriodDepenses + totalPeriodCharges;

  const totalDepenses = expenses.filter(e => e.type === 'Dépense').reduce((sum, expense) => sum + expense.montant, 0);
  const totalCharges = expenses.filter(e => e.type === 'Charge').reduce((sum, expense) => sum + expense.montant, 0);

  // Group by category for analysis - use period expenses if filtered
  const expensesByCategory = periodExpenses.reduce((acc, expense) => {
    acc[expense.categorie] = (acc[expense.categorie] || 0) + expense.montant;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(expensesByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const isPeriodFiltered = dateDebut !== '' || dateFin !== '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dépenses et Charges</h1>
          <p className="text-gray-600 mt-2">Gérez vos dépenses journalières et charges fixes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle Dépense</span>
        </button>
      </div>

      {/* Filtres de période */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-600" />
          Filtrer par Période
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <button
            onClick={setPeriodToday}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            Aujourd'hui
          </button>
          <button
            onClick={setPeriodThisWeek}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
          >
            Cette Semaine
          </button>
          <button
            onClick={setPeriodThisMonth}
            className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
          >
            Ce Mois
          </button>
          <button
            onClick={setPeriodThisYear}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
          >
            Cette Année
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de début
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={resetPeriodFilters}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques de la période */}
      {isPeriodFiltered && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Statistiques de la Période Sélectionnée
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Période</p>
              <p className="text-2xl font-bold text-blue-700">{totalPeriod.toLocaleString()} FCFA</p>
              <p className="text-xs text-gray-500 mt-1">{periodExpenses.length} transaction(s)</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Dépenses Période</p>
              <p className="text-2xl font-bold text-red-600">{totalPeriodDepenses.toLocaleString()} FCFA</p>
              <p className="text-xs text-gray-500 mt-1">
                {periodExpenses.filter(e => e.type === 'Dépense').length} dépense(s)
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Charges Période</p>
              <p className="text-2xl font-bold text-green-600">{totalPeriodCharges.toLocaleString()} FCFA</p>
              <p className="text-xs text-gray-500 mt-1">
                {periodExpenses.filter(e => e.type === 'Charge').length} charge(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dépenses du Jour</p>
              <p className="text-2xl font-bold text-red-600">{totalToday.toLocaleString()} FCFA</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <Calendar className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-gray-500">{todayExpenses.length} transaction(s)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total du Mois</p>
              <p className="text-2xl font-bold text-orange-600">{totalMonth.toLocaleString()} FCFA</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-500">{monthExpenses.length} dépenses</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Dépenses</p>
              <p className="text-2xl font-bold text-red-700">{totalDepenses.toLocaleString()} FCFA</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-700" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-500">Toutes périodes</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Charges</p>
              <p className="text-2xl font-bold text-green-700">{totalCharges.toLocaleString()} FCFA</p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-700" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-500">Toutes périodes</span>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 5 Catégories de Dépenses {isPeriodFiltered && '(Période sélectionnée)'}
          </h3>
          <div className="space-y-3">
            {topCategories.map(([category, amount], index) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <span className="font-medium text-gray-900">{category}</span>
                </div>
                <span className="font-semibold text-red-600">{amount.toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingExpense ? 'Modifier la Dépense' : 'Nouvelle Dépense'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Dépense' | 'Charge' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="Dépense">Dépense</option>
                  <option value="Charge">Charge</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    Montant (FCFA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinataire
                  </label>
                  <input
                    type="text"
                    value={formData.destinataire}
                    onChange={(e) => setFormData({ ...formData, destinataire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {editingExpense ? 'Modifier' : 'Enregistrer'}
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
                placeholder="Rechercher une dépense..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Tous les types</option>
              <option value="Dépense">Dépenses</option>
              <option value="Charge">Charges</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    {getSortIcon('date')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Description</span>
                    {getSortIcon('description')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('categorie')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Catégorie</span>
                    {getSortIcon('categorie')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destinataire
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('montant')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Montant</span>
                    {getSortIcon('montant')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      expense.type === 'Dépense' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {expense.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                      {expense.categorie}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.destinataire}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    {expense.montant.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(expense.id)}
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

        {sortedExpenses.length === 0 && (
          <div className="p-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune dépense trouvée</p>
            {isPeriodFiltered && (
              <p className="text-sm text-gray-400 mt-2">Essayez d'ajuster la période sélectionnée</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepensesModule;