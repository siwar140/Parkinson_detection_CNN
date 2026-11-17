import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getHistory, getPatients } from '../../services/api';
import {
  MicrophoneIcon,
  UserPlusIcon,
  UsersIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  ChartBarIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

// ==========================================================
// 1. CONFIGURATION DES MÉDIAS
// ==========================================================

const MEDIA = {
  hero: [
    { src: '/media/hero-consultation.jpg', caption: 'Consultation neurologique — Hôpital Razi' },
    { src: '/media/hero-enregistrement.jpg', caption: "Enregistrement d'une voyelle tenue /a/" },
    { src: '/media/hero-spectrogramme.jpg', caption: 'Spectrogramme analysé par le réseau de neurones' },
  ],

  facts: {
    neurones: '/media/parkinson-neurones.jpg',
    epidemio: '/media/parkinson-epidemiologie.jpg',
    moteurs: '/media/parkinson-symptomes-moteurs.jpg',
    nonMoteurs: '/media/parkinson-symptomes-non-moteurs.jpg',
  },

  voix: {
    principal: '/media/larynx-cordes-vocales.jpg',
    spectro: '/media/spectrogramme-comparaison.png',
  },

  etapes: {
    enregistrer: '/media/etape-enregistrement.jpg',
    analyser: '/media/etape-analyse.png',
    resultat: '/media/etape-resultat.png',
  },
};

// ==========================================================
// 2. CONTENU PÉDAGOGIQUE
// ==========================================================

const parkinsonFacts = [
  {
    image: '/synaps.jpg',
    title: 'Une maladie neurodégénérative',
    text: 'La maladie de Parkinson touche les neurones producteurs de dopamine dans le cerveau, affectant progressivement le contrôle des mouvements.',
  },
  {
    image: '/IRM.jpg',
    title: 'Deuxième maladie neurodégénérative',
    text: 'Après Alzheimer, elle concerne environ 1 % des personnes de plus de 65 ans, et plus de 25 000 nouveaux cas par an en France.',
  },
  {
    image: '/moteurs.jpg',
    title: 'Symptômes moteurs',
    text: "Tremblements, lenteur des mouvements (bradykinésie), rigidité musculaire et troubles de l'équilibre.",
  },
  {
    image: '/nonMoteurs.jpg',
    title: 'Symptômes non-moteurs',
    text: "Troubles du sommeil, de l'humeur, de l'olfaction et — cruciaux pour notre sujet — troubles de la parole et de la voix.",
  },
];

const voiceRelationSteps = [
  {
    step: '01',
    title: 'Contrôle moteur de la voix',
    text: 'Les cordes vocales sont contrôlées par des muscles fins. La dopamine joue un rôle clé dans leur coordination.',
  },
  {
    step: '02',
    title: 'Dysarthrie parkinsonienne',
    text: 'Chez 70 à 90 % des patients, la voix devient monotone, moins forte, plus lente et parfois tremblante.',
  },
  {
    step: '03',
    title: 'Signature acoustique',
    text: 'Ces altérations produisent des marqueurs mesurables : jitter, shimmer, HNR, instabilité de la F0 — détectables par IA.',
  },
  {
    step: '04',
    title: 'Détection précoce',
    text: 'Certaines anomalies vocales apparaissent des années avant le diagnostic moteur classique.',
  },
];

const voiceStats = [
  { value: 90, suffix: ' %', label: 'de patients présentent une atteinte de la voix' },
  { value: 5, prefix: 'jusqu’à ', suffix: ' ans', label: 'avant les premiers signes moteurs' },
  { value: 10, prefix: '< ', suffix: ' s', label: 'pour obtenir une analyse complète' },
];

const appSteps = [
  {
    icon: MicrophoneIcon,
    image: '/vowel.jpg',
    title: 'Enregistrez la voix',
    text: 'Le patient prononce une voyelle tenue (ex. /a/) pendant quelques secondes, dans un environnement calme.',
  },
  {
    icon: SparklesIcon,
    image: '/spectrogramme_IA.jpg',
    title: "L'IA analyse",
    text: 'Le son est converti en spectrogramme, puis traité par notre réseau de neurones convolutif pour en extraire des marqueurs fins.',
  },
  {
    icon: ShieldCheckIcon,
    image: '/result.jpg',
    title: 'Obtenez un résultat',
    text: 'Un score de confiance et une classification (Sain / Malade) sont affichés, puis archivés dans le dossier du patient.',
  },
];

const benefits = [
  {
    title: 'Non invasif',
    text: "Aucune prise de sang, aucun examen lourd — juste un enregistrement vocal de quelques secondes.",
  },
  {
    title: 'Rapide',
    text: 'Résultat en moins de 10 secondes, contre plusieurs jours pour un examen neurologique complet.',
  },
  {
    title: 'Reproductible',
    text: 'Mesures objectives et standardisées, sans variabilité inter-observateur.',
  },
  {
    title: 'Traçable',
    text: "Chaque analyse est enregistrée dans l'historique du patient pour un suivi longitudinal.",
  },
];

// ==========================================================
// 3. BRIQUES RÉUTILISABLES
// ==========================================================

const MediaSlot = ({
  src,
  alt = '',
  ratio = 'aspect-[16/10]',
  rounded = 'rounded-2xl',
  className = '',
  overlay = null,
  cover = true,
}) => {
  const [failed, setFailed] = useState(false);
  const missing = !src || failed;

  return (
    <div className={`relative overflow-hidden ${ratio} ${rounded} ${className}`}>
      {missing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 border border-dashed border-slate-300 px-3 text-center">
          <PhotoIcon className="w-7 h-7 text-slate-400" />
          <span className="text-[10px] font-mono text-slate-400 break-all leading-tight">
            {src || 'image à définir'}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full ${
            cover ? 'object-cover' : 'object-contain'
          } transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100`}
        />
      )}
      {overlay}
    </div>
  );
};

/** Déclenche une animation quand l'élément entre dans le viewport. */
const useInView = (options = { threshold: 0.3 }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, options);

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
};

/** Compteur qui monte jusqu'à la valeur cible. */
const CountUp = ({ to, duration = 1400, prefix = '', suffix = '' }) => {
  const [ref, inView] = useInView();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(to);
      return;
    }

    let raf;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
};

/** Onde sonore animée. */
const VoiceWave = ({ bars = 28, className = '' }) => (
  <div className={`flex items-end gap-[3px] h-10 ${className}`} aria-hidden="true">
    {Array.from({ length: bars }).map((_, i) => (
      <span
        key={i}
        className="pv-bar w-[3px] rounded-full bg-gradient-to-t from-blue-600 to-indigo-400"
        style={{
          animationDelay: `${(i % 9) * 0.11}s`,
          height: `${20 + ((i * 37) % 70)}%`,
        }}
      />
    ))}
  </div>
);

/** Diaporama de l'en-tête. */
const HeroSlideshow = ({ slides, interval = 5500 }) => {
  const [index, setIndex] = useState(0);
  const available = slides.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % available);
  }, [available]);

  useEffect(() => {
    if (available < 2) return undefined;

    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [next, interval, available]);

  return (
    <div className="relative h-56 md:h-full min-h-[14rem] rounded-2xl overflow-hidden ring-1 ring-white/20">
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <MediaSlot
            src={slide.src}
            alt={slide.caption}
            ratio="h-full w-full"
            rounded="rounded-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          <p className="absolute bottom-3 left-4 right-12 text-[11px] text-slate-100/90">
            {slide.caption}
          </p>
        </div>
      ))}

      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            onClick={() => setIndex(i)}
            aria-label={`Visuel ${i + 1}`}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// ==========================================================
// 4. COMPOSANT PRINCIPAL
// ==========================================================

const Dashboard = () => {
  const { user } = useAuth();
  const [allHistory, setAllHistory] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyData, patientsData] = await Promise.all([getHistory(), getPatients()]);
      setAllHistory(historyData);
      setPatients(patientsData);
    } catch (err) {
      console.error('Erreur chargement Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        Chargement du tableau de bord...
      </div>
    );
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const maladeCount = allHistory.filter((h) => h.result === 'Malade').length;
  const sainCount = allHistory.filter((h) => h.result === 'Sain').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <style>{`
        @keyframes pvWave {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1); }
        }
        .pv-bar {
          transform-origin: bottom;
          animation: pvWave 1.25s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pv-bar { animation: none; }
        }
      `}</style>

      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold tracking-wide">
              Espace pour specialistes en neurologie
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bonjour, {user?.full_name || 'Dr. Médecin'}
            </h1>
            <p className="text-slate-300 text-sm capitalize">
              {today} {user?.hospital ? `• ${user.hospital}` : ''}
            </p>
          </div>

          <VoiceWave className="opacity-80" />

          <div className="flex flex-wrap gap-3">
            <Link to="/consultation">
              <button className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer">
                <MicrophoneIcon className="w-5 h-5" />
                Nouvelle consultation
              </button>
            </Link>
            <Link to="/patients/new">
              <button className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-2xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer">
                <UserPlusIcon className="w-5 h-5" />
                Nouveau patient
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ================= INDICATEURS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Patients</span>
            <UsersIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            <CountUp to={patients.length} />
          </p>
          <span className="text-[11px] text-slate-400">Dossiers actifs</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Analyses</span>
            <SpeakerWaveIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            <CountUp to={allHistory.length} />
          </p>
          <span className="text-[11px] text-slate-400">Enregistrements traités</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Répartition</span>
            <ChartBarIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            <CountUp to={sainCount} /> <span className="text-slate-300">/</span>{' '}
            <CountUp to={maladeCount} />
          </p>
          <span className="text-[11px] text-slate-400">Sain / Malade</span>
        </div>
      </div>

      {/* ================= SECTION 1 : LA MALADIE ================= */}
      <section className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Comprendre la maladie de Parkinson
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Une pathologie neurodégénérative dont les premiers signes peuvent être détectés dans la voix.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {parkinsonFacts.map((fact) => (
            <article
              key={fact.title}
              className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <MediaSlot
                src={fact.image}
                alt={fact.title}
                ratio="aspect-[16/10]"
                rounded="rounded-none"
              />
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">{fact.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{fact.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= SECTION 2 : PARKINSON & VOIX ================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* En-tête */}
          <div className="flex items-start gap-3">
            <div className="w-1 h-12 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full" />
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Pourquoi analyser la voix ?
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl">
                La voix est un biomarqueur accessible, non invasif et sensible aux atteintes précoces du système nerveux.
              </p>
            </div>
          </div>

          {/* Statistiques mises en avant */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {voiceStats.map((stat) => (
              <div
                key={stat.label}
                className="relative bg-white rounded-2xl border border-slate-200/80 px-5 py-6 shadow-sm overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <p className="text-2xl sm:text-3xl font-black text-blue-700">
                  <CountUp
                    to={stat.value}
                    prefix={stat.prefix || ''}
                    suffix={stat.suffix}
                  />
                </p>
                <p className="text-xs text-slate-500 leading-snug mt-2">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Les 4 étapes en ligne */}
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {voiceRelationSteps.map((item) => (
              <li
                key={item.step}
                className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 pt-7 border border-white shadow-sm h-full"
              >
                <span className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-600/30">
                  {item.step}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ol>

          {/* Bandeau "Le saviez-vous ?" */}
          <div className="flex items-start gap-3 text-xs text-slate-600 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-4 border border-white">
            <SpeakerWaveIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong className="text-slate-800">Le saviez-vous ?</strong> Les altérations vocales peuvent précéder
              le diagnostic clinique de plusieurs années, offrant une fenêtre d'intervention précoce.
            </span>
          </div>
        </div>
      </section>

      {/* ================= SECTION 3 : UTILISATION ================= */}
      <section className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full" />
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Comment utiliser ParkinVoice ?
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Trois étapes simples pour obtenir une analyse vocale fiable.
            </p>
          </div>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {appSteps.map((step, i) => {
            const Icon = step.icon;

            return (
              <li
                key={step.title}
                className="group relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <MediaSlot
                  src={step.image}
                  alt={step.title}
                  ratio="aspect-[16/9]"
                  rounded="rounded-none"
                  overlay={
                    <span className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur text-emerald-600 flex items-center justify-center text-xs font-black shadow-sm">
                      {i + 1}
                    </span>
                  }
                />
                <div className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-600/20">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.text}</p>
                </div>
                {i < appSteps.length - 1 && (
                  <ArrowRightIcon className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 z-10" />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ================= SECTION 4 : BÉNÉFICES ================= */}
      <section className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full" />
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Pourquoi ParkinVoice ?
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Un assistant clinique pensé pour la pratique médicale quotidienne.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">{benefit.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;