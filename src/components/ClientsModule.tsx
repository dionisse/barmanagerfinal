import React, { useState, useEffect } from 'react';
import { User, Client } from '../types';
import { Plus, Search, CreditCard as Edit, Trash2, Users, Phone, MapPin, Wallet, TrendingUp, UserPlus, CircleAlert as AlertCircle } from 'lucide-react';
import { getClients, addClient, updateClient, deleteClient, getSales } from '../utils/dataService';

interface ClientsModuleProps {
  user: User;
}

interface ClientWithStats extends Client {
  totalAchats: number;
  nombreAchats: number;
}

const ClientsModule: React.FC<ClientsModuleProps> = ({ user }) => {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    adresse: '',
    soldeDette: '',
    notes: ''
  });

  useEffect(() => {
    loadData();

    const handleDataRestored = () => loadData();
    window.addEventListener('dataRestored', handleDataRestored);
    return () => window.removeEventListener('dataRestored', handleDataRestored);
  }, []);

  const loadData = async () => {
    const clientsData = await getClients();
    const salesData = await getSales();

    const enriched: ClientWithStats[] = clientsData.map(client => {
      const clientSales = salesData.filter(s =>
        s.client.toLowerCase().includes(client.nom.toLowerCase())
      );
      return {
        ...client,
        totalAchats: clientSales.reduce((sum, s) => sum + s.total, 0),
        nombreAchats: clientSales.length
      };
    });

    setClients(enriched);
  };

  const resetForm = () => {
    setFormData({ nom: '', telephone: '', adresse: '', soldeDette: '', notes: '' });
    setEditingClient(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nom: client.nom,
      telephone: client.telephone,
      adresse: client.adresse,
      soldeDette: client.soldeDette.toString(),
      notes: client.notes
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clientData: Client = {
      id: editingClient?.id || Date.now().toString(),
      nom: formData.nom,
      telephone: formData.telephone,
      adresse: formData.adresse,
      soldeDette: parseFloat(formData.soldeDette) || 0,
      notes: formData.notes,
      dateCreation: editingClient?.dateCreation || new Date().toISOString()
    };

    if (editingClient) {
      await updateClient(clientData);
    } else {
      await addClient(clientData);
    }

    resetForm();
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (clientId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(clientId);
      loadData();
    }
  };

  const handleSettleDebt = async (client: Client) => {
    if (client.soldeDette <= 0) return;
    if (!window.confirm(`Marquer la dette de ${client.soldeDette.toLocaleString()} FCFA comme réglée pour ${client.nom} ?`)) return;

    await updateClient({ ...client, soldeDette: 0 });
    loadData();
  };

  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telephone.includes(searchTerm)
  );

  const totalDettes = clients.reduce((sum, c) => sum + c.soldeDette, 0);
  const clientsAvecDette = clients.filter(c => c.soldeDette > 0).length;
  const totalAchatsClients = clients.reduce((sum, c) => sum + c.totalAchats, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-2">Gérez votre base de clients et suivez les dettes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
        >
          <UserPlus className="h-5 w-5" />
          <span>Nouveau Client</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-blue-600">{clients.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Achats Totaux</p>
              <p className="text-2xl font-bold text-green-600">{totalAchatsClients.toLocaleString()} FCFA</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dettes en Cours</p>
              <p className="text-2xl font-bold text-red-600">{totalDettes.toLocaleString()} FCFA</p>
            </div>
            <Wallet className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">{clientsAvecDette} client(s) concerné(s)</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clients Endettés</p>
              <p className="text-2xl font-bold text-amber-600">{clientsAvecDette}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achats</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dette</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className={`hover:bg-gray-50 cursor-pointer ${client.soldeDette > 0 ? 'bg-red-50' : ''}`}
                  onClick={() => setSelectedClient(client)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{client.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.telephone || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.adresse || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="font-medium text-green-600">{client.totalAchats.toLocaleString()} FCFA</span>
                    <span className="text-xs text-gray-400 ml-1">({client.nombreAchats})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {client.soldeDette > 0 ? (
                      <span className="font-semibold text-red-600">{client.soldeDette.toLocaleString()} FCFA</span>
                    ) : (
                      <span className="text-green-600 font-medium">Réglé</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                      {client.soldeDette > 0 && (
                        <button
                          onClick={() => handleSettleDebt(client)}
                          className="text-emerald-600 hover:text-emerald-900 p-1 rounded"
                          title="Régler la dette"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
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

        {filteredClients.length === 0 && (
          <div className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun client trouvé</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingClient ? 'Modifier le Client' : 'Nouveau Client'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: +229 12 34 56 78"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solde Dette (FCFA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.soldeDette}
                  onChange={(e) => setFormData({ ...formData, soldeDette: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Laissez à 0 si le client n'a pas de dette</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Informations complémentaires..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowForm(false); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingClient ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClient(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedClient.nom}</h2>
                    <p className="text-sm text-gray-500">
                      Client depuis le {new Date(selectedClient.dateCreation).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {selectedClient.telephone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-900">{selectedClient.telephone}</span>
                </div>
              )}
              {selectedClient.adresse && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-900">{selectedClient.adresse}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total des Achats</p>
                  <p className="text-xl font-bold text-green-600">{selectedClient.totalAchats.toLocaleString()} FCFA</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedClient.nombreAchats} achat(s)</p>
                </div>
                <div className={`rounded-lg p-4 ${selectedClient.soldeDette > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-sm text-gray-600">Dette Actuelle</p>
                  <p className={`text-xl font-bold ${selectedClient.soldeDette > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedClient.soldeDette.toLocaleString()} FCFA
                  </p>
                  {selectedClient.soldeDette > 0 && (
                    <button
                      onClick={() => { handleSettleDebt(selectedClient); setSelectedClient(null); }}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-medium mt-1"
                    >
                      Marquer comme réglée
                    </button>
                  )}
                </div>
              </div>
              {selectedClient.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-sm text-gray-900">{selectedClient.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsModule;
