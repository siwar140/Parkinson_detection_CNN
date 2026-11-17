// frontend/src/components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAdminDashboard, 
  getAllDoctors, 
  getAllPredictions, 
  deleteDoctor, 
  adminLogout,
  getAllAdmins,
  createAdmin,
  changeMyAdminPassword
} from '../../services/api';
import { 
  ShieldCheckIcon, 
  UserGroupIcon, 
  UsersIcon, 
  TrashIcon, 
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PlusIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('doctors');
  const [adminUser, setAdminUser] = useState(null);

  // États pour création admin
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ 
    email: '', password: '', full_name: '', phone: '' 
  });

  // États pour changement de mot de passe
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '' });

  // Message global (succès/erreur)
  const [formMessage, setFormMessage] = useState(null);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      setAdminUser(JSON.parse(storedAdmin));
    }
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [dashStats, doctorsList, predictionsList, adminsList] = await Promise.all([
        getAdminDashboard(),
        getAllDoctors(),
        getAllPredictions(),
        getAllAdmins()
      ]);

      setStats(dashStats);
      setDoctors(doctorsList);
      setPredictions(predictionsList);
      setAdmins(adminsList);
    } catch (err) {
      console.error('Erreur chargement admin:', err);
      if (err.response?.status === 401) {
        adminLogout();
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const handleDeleteDoctor = async (id, name) => {
    if (window.confirm(`Voulez-vous supprimer le médecin "${name}" et l'ensemble de ses dossiers patients/analyses ?`)) {
      try {
        await deleteDoctor(id);
        setDoctors(prev => prev.filter(d => d.id !== id));
        fetchAdminData();
      } catch (err) {
        console.error('Erreur suppression médecin:', err);
      }
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setFormMessage(null);
    try {
      await createAdmin(newAdmin);
      setFormMessage({ type: 'success', text: 'Administrateur créé avec succès' });
      setNewAdmin({ email: '', password: '', full_name: '', phone: '' });
      setShowCreateAdmin(false);
      fetchAdminData();
    } catch (err) {
      setFormMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Erreur lors de la création' 
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFormMessage(null);
    try {
      await changeMyAdminPassword(pwdForm.old_password, pwdForm.new_password);
      setFormMessage({ type: 'success', text: 'Mot de passe changé avec succès' });
      setPwdForm({ old_password: '', new_password: '' });
      setShowChangePassword(false);
    } catch (err) {
      setFormMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Erreur lors du changement' 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-blue-400">Administration Système</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{adminUser?.full_name || 'Administrateur'}</h1>
            <p className="text-xs text-slate-400">{adminUser?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-xl text-sm font-semibold transition-all cursor-pointer"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Déconnexion Admin
        </button>
      </div>

      {/* Cartes statistiques globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Carte 1 : Médecins */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Médecins</span>
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {stats?.total_doctors ?? doctors.length}
          </p>
          <span className="text-[11px] text-slate-400">Praticiens actifs</span>
        </div>

        {/* Carte 2 : Total Patients */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Total Patients</span>
            <UsersIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {stats?.total_patients ?? 0}
          </p>
          <span className="text-[11px] text-slate-400">Patients enregistrés</span>
        </div>
      </div>

      {/* Message de succès/erreur global */}
      {formMessage && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          formMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {formMessage.text}
        </div>
      )}

      {/* Onglets de navigation */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'doctors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          👨‍⚕️ Médecins ({doctors.length})
        </button>
        <button
          onClick={() => setActiveTab('predictions')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'predictions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📊 Analyses ({predictions.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'admins' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🛡️ Administrateurs ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          👤 Mon profil
        </button>
      </div>

      {/* Vue Gestion Médecins */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-base">
            Liste des Médecins Praticiens
          </div>
          {doctors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Aucun médecin inscrit pour le moment.</div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Médecin</th>
                    <th className="px-6 py-3.5">Hôpital / Spécialité</th>
                    <th className="px-6 py-3.5">Patients</th>
                    <th className="px-6 py-3.5">Analyses</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{doc.full_name}</div>
                        <div className="text-xs text-slate-400">{doc.email} • {doc.phone || 'Sans tel'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{doc.hospital || 'Non renseigné'}</div>
                        <div className="text-xs text-slate-400">{doc.specialty || 'Généraliste'}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{doc.total_patients || 0}</td>
                      <td className="px-6 py-4 font-semibold text-blue-600">{doc.total_predictions || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteDoctor(doc.id, doc.full_name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Supprimer ce compte médecin"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vue Supervision Analyses */}
      {activeTab === 'predictions' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-base">
            Historique Global des Analyses
          </div>
          {predictions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Aucune analyse réalisée.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {predictions.map(pred => (
                <div key={pred.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${pred.result === 'Malade' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Patient: {pred.patient_name} <span className="text-xs font-normal text-slate-400">(Par {pred.doctor_name})</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(pred.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      pred.result === 'Malade' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}>
                      {pred.result === 'Malade' ? '🔴 Malade' : '🟢 Sain'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {(pred.confidence).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vue Gestion des Administrateurs */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-base">Liste des Administrateurs</span>
            <button
              onClick={() => setShowCreateAdmin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Créer un administrateur
            </button>
          </div>

          {/* Formulaire de création */}
          {showCreateAdmin && (
            <div className="mx-6 mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4">Nouvel administrateur</h3>
              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nom complet"
                  required
                  value={newAdmin.full_name}
                  onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateAdmin(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tableau des admins */}
          <div className="divide-y divide-slate-100 overflow-x-auto mt-4">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Administrateur</th>
                  <th className="px-6 py-3.5">Téléphone</th>
                  <th className="px-6 py-3.5">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {adm.full_name}
                        {adm.id === adminUser?.id && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{adm.email}</div>
                    </td>
                    <td className="px-6 py-4">{adm.phone || '—'}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(adm.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vue Mon Profil */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-base">Mon profil administrateur</span>
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl cursor-pointer"
            >
              <KeyIcon className="w-4 h-4" />
              {showChangePassword ? 'Annuler' : 'Changer mon mot de passe'}
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Nom complet</label>
              <p className="text-slate-900 font-semibold text-lg mt-1">{adminUser?.full_name}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
              <p className="text-slate-900 mt-1">{adminUser?.email}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Identifiant</label>
              <p className="text-slate-500 text-sm mt-1">#{adminUser?.id}</p>
            </div>
          </div>

          {/* Formulaire changement de mot de passe */}
          {showChangePassword && (
            <div className="mx-6 mb-6 p-5 bg-amber-50 rounded-2xl border border-amber-200">
              <h3 className="font-bold text-slate-900 mb-4">Changer mon mot de passe</h3>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="Ancien mot de passe"
                  required
                  value={pwdForm.old_password}
                  onChange={(e) => setPwdForm({...pwdForm, old_password: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  required
                  value={pwdForm.new_password}
                  onChange={(e) => setPwdForm({...pwdForm, new_password: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Valider le changement
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;