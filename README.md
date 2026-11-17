#  ParkinVoice

### Application web d'aide au dépistage de la maladie de Parkinson par analyse vocale

<p align="center">
  <strong>Projet réalisé dans le cadre d'un stage ingénieur chez MedCity Connect</strong>
</p>

---

##  1. Présentation du projet

**ParkinVoice** est un projet réalisé dans le cadre d'un **stage ingénieur au sein de [MedCity Connect](https://medcity.tn/)**, une entreprise tunisienne spécialisée dans le domaine des technologies et des solutions numériques.

Ce projet porte sur la conception et le développement d'une application web médicale d'aide au dépistage de la maladie de Parkinson à partir de l'analyse des caractéristiques vocales.

La maladie de Parkinson peut entraîner différentes altérations de la voix, notamment une diminution de son intensité, des variations anormales de la fréquence fondamentale et des perturbations de la qualité vocale.

ParkinVoice exploite ces caractéristiques à l'aide d'un modèle de Deep Learning basé sur un réseau de neurones convolutif (CNN), afin de distinguer deux catégories :

- **HC (Healthy Control)** : sujets sains.
- **PD (Parkinson's Disease)** : sujets atteints de la maladie de Parkinson.

L'application propose une interface destinée aux médecins, leur permettant de gérer les dossiers des patients, d'enregistrer ou d'importer des échantillons vocaux, de lancer une analyse automatique et de consulter les résultats précédents.

L'objectif est de mettre en œuvre une solution combinant intelligence artificielle, traitement du signal audio et développement web afin d'explorer l'apport des technologies numériques dans le domaine de la santé.

> **Important :** ParkinVoice est un outil expérimental d'aide à la décision médicale. Ses résultats ne constituent pas un diagnostic médical définitif et doivent être interprétés par un professionnel de santé.

---

##  2. Objectifs et fonctionnalités principales

###  Gestion des médecins

- Création de comptes et authentification sécurisée.
- Connexion et déconnexion.
- Gestion des sessions avec JWT.
- Réinitialisation du mot de passe.

###  Gestion des patients

- Ajout de nouveaux patients.
- Consultation de la liste des patients.
- Accès aux informations détaillées d'un patient.
- Modification et suppression des dossiers.
- Association des analyses vocales à chaque patient.

###  Analyse vocale et prédiction IA

- Enregistrement d'un échantillon vocal.
- Importation de fichiers audio au format WAV.
- Validation du fichier audio avant analyse.
- Découpage du signal en segments d'une seconde.
- Prétraitement et extraction des représentations spectrogrammes.
- Classification automatique par un modèle CNN.
- Agrégation des prédictions des segments par une stratégie de voting.
- Affichage de la classe prédite (HC / PD) et du niveau de confiance.

###  Historique et statistiques

- Consultation de l'historique des analyses.
- Visualisation des résultats par patient.
- Suivi des prédictions précédentes.
- Tableau de bord avec des statistiques globales.

###  Administration

- Authentification administrateur.
- Tableau de bord administratif.
- Gestion et consultation des médecins.
- Consultation de l'ensemble des prédictions.
- Visualisation des statistiques de la plateforme.

---

##  3. Architecture du projet

ParkinVoice repose sur une architecture client-serveur composée de trois éléments principaux :

1. **Frontend :** interface utilisateur développée avec React.
2. **Backend :** API REST développée avec FastAPI.
3. **Base de données :** PostgreSQL pour la persistance des informations.

Le modèle de Deep Learning est intégré directement au backend pour réaliser les analyses vocales.

### Structure du projet

```text
ParkinVoiceApp/
│
├── backend/
│   │
│   ├── app/
│   │   ├── main.py              # Point d'entrée de l'API
│   │   ├── config.py            # Configuration de l'application
│   │   ├── database.py          # Connexion à PostgreSQL
│   │   ├── auth.py              # Authentification et JWT
│   │   ├── schemas.py           # Schémas Pydantic
│   │   ├── ml_inference.py      # Pipeline d'inférence IA
│   │   │
│   │   ├── models/              # Modèles SQLAlchemy
│   │   ├── routes/              # Routes de l'API REST
│   │   └── services/            # Services métier
│   │
│   ├── models_ia/               # Modèles de Deep Learning
│   ├── requirements.txt         # Dépendances Python
│   └── Dockerfile               # Image Docker du backend
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/          # Composants React
│   │   ├── pages/               # Pages de l'application
│   │   ├── services/            # Communication avec l'API
│   │   └── utils/               # Fonctions utilitaires
│   │
│   ├── package.json
│   └── vercel.json
│
├── init_postgres.py             # Initialisation de la BDD
├── docker-compose.yml           # Orchestration Docker
├── render.yaml                  # Configuration de déploiement
└── README.md
```

---

##  4. Technologies utilisées

### Backend

| Technologie | Rôle |
|---|---|
| Python 3.11+ | Langage de programmation |
| FastAPI | Développement de l'API REST |
| SQLAlchemy | Mapping objet-relationnel (ORM) |
| PostgreSQL | Gestion de la base de données |
| Pydantic | Validation des données |
| TensorFlow / Keras | Chargement et exécution du modèle CNN |
| Librosa | Traitement des signaux audio |
| JWT | Gestion de l'authentification |
| Bcrypt | Hachage des mots de passe |

### Frontend

| Technologie | Rôle |
|---|---|
| React 18 | Développement de l'interface |
| Vite | Outil de développement et de compilation |
| Tailwind CSS | Mise en forme de l'interface |
| Axios | Communication HTTP avec le backend |
| React Router | Navigation entre les pages |

### Infrastructure et déploiement

| Technologie | Rôle |
|---|---|
| Docker | Conteneurisation |
| Docker Compose | Orchestration des services |
| Render | Hébergement du backend et de la base de données |
| Vercel | Hébergement du frontend |
| Git / GitHub | Gestion du code source |

---

##  5. Fonctionnement du système d'intelligence artificielle

Le module d'intelligence artificielle est intégré au backend et utilise un modèle CNN préalablement entraîné.

### Pipeline de traitement

1. **Acquisition audio :** le médecin enregistre ou importe un fichier vocal.
2. **Validation :** vérification du format et de la durée minimale du signal.
3. **Prétraitement :** chargement et normalisation du signal audio.
4. **Segmentation :** découpage du signal en segments d'une seconde.
5. **Extraction des caractéristiques :** génération des spectrogrammes STFT.
6. **Classification :** chaque spectrogramme est transmis au modèle CNN.
7. **Agrégation :** les prédictions individuelles sont combinées par une stratégie de voting.
8. **Résultat :** attribution d'une classe finale HC ou PD et calcul du niveau de confiance.

### Stratégie de décision

Le système utilise une approche de voting pour agréger les prédictions des différents segments audio.

Cette stratégie permet d'obtenir une décision globale à partir de plusieurs observations du même enregistrement.

---

##  6. Performances du modèle

Les performances du modèle ont été évaluées sur un jeu de données externe (Razi).

| Indicateur | Résultat |
|---|---:|
| Accuracy globale | 73.28 % |
| Stratégie | Voting |
| Durée des segments | 1 seconde |
| Seuil de décision | 0.27 |

Ces résultats correspondent à une évaluation expérimentale et ne doivent pas être interprétés comme une garantie de performance clinique.

---

##  7. Installation et configuration

### 7.1. Prérequis

Avant de commencer, installer les outils suivants :

- Python 3.11 ou supérieur.
- Node.js 18 ou supérieur.
- PostgreSQL 15 ou supérieur.
- Git.
- Docker et Docker Compose (pour le déploiement conteneurisé).

### 7.2. Cloner le projet

```bash
git clone <URL_D