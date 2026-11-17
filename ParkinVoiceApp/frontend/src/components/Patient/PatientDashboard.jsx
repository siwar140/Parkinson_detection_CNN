import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPatientProfile,
  getPatientPredictions,
  patientLogout,
  updatePatientProfile,
  uploadPatientProfileImage,
  updatePatientPassword,
  getProfileImageUrl,
} from '../../services/api';
import {
  UserCircleIcon,
  CameraIcon,
  KeyIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import ParkinsonInfo from '../Shared/ParkinsonInfo';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'info' | 'profile'
  const [patient, setPatient] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire Profil
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    birth_date: '',
    gender: '',
    email: '',
  });
  const [profileImage, setProfileImage] = useState(null);

  // Formulaire Mot de Passe
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profile, history] = await Promise.all([
          getPatientProfile(),
          getPatientPredictions(),
        ]);
        setPatient(profile);
        setPredictions(history);

        setProfileForm({
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          phone: profile?.phone || '',
          birth_date: profile?.birth_date || '',
          gender: profile?.gender || '',
          email: profile?.email || '',
        });

        if (profile?.profile_image) {
          setProfileImage(`${getProfileImageUrl(profile.profile_image)}?v=${Date.now()}`);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          patientLogout();
          navigate('/patient/login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [navigate]);

  const logout = () => {
    patientLogout();
    navigate('/patient/login', { replace: true });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updatePatientProfile(profileForm);
      setPatient(updated);
      setSuccess('Profil mis à jour avec succès');
    } catch (err) {
      console.error('Erreur profil:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');
    setSuccess('');
    try {
      const res = await uploadPatientProfileImage(file);
      const updatedProfile = await getPatientProfile();
      setPatient(updatedProfile);
      const imagePath = res?.profile_image || updatedProfile?.profile_image;
      if (imagePath) {
        setProfileImage(`${getProfileImageUrl(imagePath)}?v=${Date.now()}`);
      }
      setSuccess('Photo de profil mise à jour');
    } catch (err) {
      console.error('Erreur image:', err);
      setError(err.response?.data?.detail || "Erreur lors de l'upload de la photo");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    setSavingPassword(true);
    try {
      await updatePatientPassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setSuccess('Mot de passe modifié avec succès !');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error('Erreur mot de passe:', err);
      setError(err.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading)
    return (
      <div className="py-20 text-center text-slate-500 font-medium">
        Chargement de votre espace...
      </div>
    );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header Espace Patient */}
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-400 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {patient?.first_name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Espace patient
            </p>
            <h1 className="mt-1 text-2xl font-black">
              {patient?.first_name} {patient?.last_name}
            </h1>
            <p className="text-xs text-slate-300">{patient?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Déconnexion
        </button>
      </header>

      {/* Navigation par Onglets */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('results');
            setError('');
            setSuccess('');
          }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'results'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ChartBarIcon className="w-5 h-5" />
          Mes résultats
        </button>

        <button
          onClick={() => {
            setActiveTab('info');
            setError('');
            setSuccess('');
          }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'info'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpenIcon className="w-5 h-5" />
          Comprendre Parkinson
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
            setError('');
            setSuccess('');
          }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          Mon Profil & Sécurité
        </button>
      </div>

      {/* Messages Feedback Global */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* ONGLET 1: RÉSULTATS */}
      {activeTab === 'results' && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Résultats d'analyses transmis par votre médecin
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consultez ici les comptes-rendus des analyses vocales biométriques partagées par votre praticien.
            </p>
          </div>

          {predictions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <p className="font-semibold text-slate-600">
                Aucun résultat d'analyse transmis pour le moment.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Les résultats envoyés par votre médecin après une consultation s'afficheront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <article
                  key={prediction.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          prediction.result === 'Malade'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prediction.result === 'Malade' ? 'bg-red-600' : 'bg-emerald-600'
                          }`}
                        />
                        {prediction.result === 'Malade'
                          ? 'Présence de Signes (Parkinson)'
                          : 'Sain (Pas de signe détecté)'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 pt-1">
                      Diagnostiqué par :{' '}
                      <strong className="text-slate-800">
                        {prediction.doctor_name || 'Votre Médecin'}
                      </strong>
                    </p>

                    <p className="text-xs text-slate-400">
                      Date :{' '}
                      {prediction.created_at
                        ? new Date(prediction.created_at).toLocaleString('fr-FR')
                        : 'Date inconnue'}
                      {prediction.duration && ` • Durée audio : ${prediction.duration.toFixed(1)}s`}
                    </p>

                    {prediction.notes && (
                      <p className="mt-2 text-xs text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200/60">
                        <strong>Remarque du médecin :</strong> {prediction.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                      Taux de Confiance
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {Math.round(prediction.confidence * 100)}%
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ONGLET 2: COMPRENDRE PARKINSON */}
      {activeTab === 'info' && <ParkinsonInfo />}

      {/* ONGLET 3: PROFIL & SÉCURITÉ */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Photo de profil */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Photo de profil</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Photo de profil"
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserCircleIcon className="w-16 h-16 text-blue-500" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md cursor-pointer disabled:opacity-50"
                  title="Changer la photo"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Formats acceptés : JPEG, PNG, WEBP
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cliquez sur l'icône appareil photo pour mettre à jour votre avatar
                </p>
              </div>
            </div>
          </div>

          {/* Formulaire des informations personnelles */}
          <form
            onSubmit={handleProfileSubmit}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 mb-2">Informations personnelles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.first_name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, first_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="+216 -- --- ---"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={profileForm.birth_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, birth_date: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Genre</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {savingProfile ? 'Enregistrement...' : 'Mettre à jour le profil'}
            </button>
          </form>

          {/* Formulaire Changement de mot de passe */}
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-blue-600" />
                Changer le mot de passe
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Saisissez votre ancien mot de passe puis le nouveau mot de passe souhaité.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ancien mot de passe *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.old_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, old_password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nouveau mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password: e.target.value })
                    }
                    placeholder="8 caractères minimum"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmer le nouveau mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                    }
                    placeholder="Identique au nouveau"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="mt-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              {savingPassword ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
};

export default PatientDashboard;