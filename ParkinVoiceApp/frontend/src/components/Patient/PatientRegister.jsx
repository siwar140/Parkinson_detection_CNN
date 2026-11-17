import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patientRegister } from '../../services/api';

const PatientRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', birth_date: '', email: '', doctor_email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await patientRegister(form);
      navigate('/patient/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Impossible de créer le compte patient.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">ParkinVoice</p><h1 className="mt-2 text-2xl font-black text-slate-900">Créer un compte patient</h1><p className="mt-1 text-sm text-slate-500">Votre médecin doit d'abord avoir créé votre dossier.</p></div>
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-slate-700">Prénom<input name="first_name" required value={form.first_name} onChange={update} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal outline-none focus:border-blue-500" /></label>
          <label className="text-sm font-semibold text-slate-700">Nom<input name="last_name" required value={form.last_name} onChange={update} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal outline-none focus:border-blue-500" /></label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Date de naissance<input type="date" name="birth_date" required max={new Date().toISOString().split('T')[0]} value={form.birth_date} onChange={update} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /></label>
        <label className="block text-sm font-semibold text-slate-700">Email patient<input type="email" name="email" required value={form.email} onChange={update} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" /></label>
        <label className="block text-sm font-semibold text-slate-700">Email du médecin<input type="email" name="doctor_email" required value={form.doctor_email} onChange={update} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" /></label>
        <label className="block text-sm font-semibold text-slate-700">Mot de passe<input type="password" name="password" required minLength={8} value={form.password} onChange={update} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" /></label>
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Création...' : 'Créer mon compte'}</button>
        <Link to="/patient/login" className="block text-center text-sm font-semibold text-slate-500 hover:text-blue-600">Retour à la connexion patient</Link>
      </form>
    </main>
  );
};

export default PatientRegister;