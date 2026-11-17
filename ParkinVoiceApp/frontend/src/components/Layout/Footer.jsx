import React from 'react';

const APP_INFO = {
  nom: 'ParkinVoice',
  anneeDebut: 2026,
  auteurs: ['MACHERKI Siwar eleve ingenieur specialité telecommunication '],
  licence: 'Tous droits réservés',
};

const Footer = () => {
  const annee = new Date().getFullYear();
  const periode =
    annee > APP_INFO.anneeDebut
      ? `${APP_INFO.anneeDebut}–${annee}`
      : `${APP_INFO.anneeDebut}`;

  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <p className="text-[11px] text-slate-500">
          © {periode} {APP_INFO.auteurs.join(', ')} — {APP_INFO.nom}. {APP_INFO.licence}.
        </p>
      </div>
    </footer>
  );
};

export default Footer;