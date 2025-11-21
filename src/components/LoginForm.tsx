import React, { useState } from 'react';
import { User, UserType } from '../types';
import { Lock, User as UserIcon, Building, Shield, AlertTriangle } from 'lucide-react';
import { simpleAuth } from '../utils/simpleAuthService';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<UserType>('Gestionnaire');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authResult = await simpleAuth.login(username, password);

      if (authResult.success && authResult.user) {
        if (!authResult.hasLicenseAccess && authResult.user.role !== 'Propriétaire') {
          setError(authResult.message || 'Accès refusé - Licence invalide ou expirée');
          setLoading(false);
          return;
        }

        const user: User = {
          username: authResult.user.username,
          password: password,
          role: authResult.user.role as UserType
        };

        onLogin(user);
      } else {
        setError(authResult.message || 'Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion. Vérifiez votre connexion Internet.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-center">
            <Building className="mx-auto h-16 w-16 text-white mb-4" />
            <h1 className="text-3xl font-bold text-white">AHANDJO</h1>
            <p className="text-blue-100 mt-2">Gestion de Bar</p>
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Shield className="h-4 w-4 text-blue-200" />
              <span className="text-blue-200 text-sm">Système de licences intégré</span>
            </div>
          </div>
          
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Entrez votre nom d'utilisateur"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Entrez votre mot de passe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'utilisateur
                </label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as UserType)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="Gestionnaire">Gestionnaire</option>
                  <option value="Employé">Employé</option>
                  <option value="Propriétaire">Propriétaire</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {loading ? 'Vérification...' : 'Se connecter'}
              </button>
            </form>

            {/* Information sur les licences */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 font-medium text-sm">Accès par licence</span>
              </div>
              <p className="text-blue-700 text-xs">
                Les utilisateurs Gestionnaire et Employé doivent avoir une licence active pour accéder au système.
              </p>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                AHANDJO v2.0.1 - Système de Gestion de Bar Professionnel
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Système de licences intégré et sécurisé
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;