# 🌟 ORION - Intelligence Artificielle Personnelle et Locale

**ORION** est une plateforme d'IA personnelle qui s'exécute entièrement dans votre navigateur, sans dépendance à des serveurs externes. Profitez d'une intelligence artificielle avancée qui respecte votre vie privée et fonctionne hors ligne.

## 🚀 Caractéristiques Principales

### 🧠 Intelligence Locale
- **LLM dans le navigateur** : Exécution de modèles de langage via WebGPU (MLC-AI/Web-LLM)
- **Mémoire sémantique** : Système de mémoire persistante avec embeddings
- **Neural Mesh** : Architecture multi-agents pour un raisonnement collaboratif
- **Genius Hour** : Auto-amélioration continue par analyse des échecs

### 🔒 Confidentialité et Sécurité
- **100% Local** : Toutes les données restent sur votre appareil
- **Chiffrement** : Protection des données sensibles
- **Validation des entrées** : Sanitization et validation des données utilisateur
- **Pas de tracking** : Aucune collecte de données ou télémétrie

### ⚡ Performance et Adaptabilité
- **Dégradation gracieuse** : Adaptation automatique aux capacités de l'appareil
- **Profiling intelligent** : Détection des performances (GPU, RAM, CPU)
- **Compression de contexte** : Gestion optimale de la mémoire conversationnelle
- **Workers Web** : Architecture multi-thread pour une UI réactive

### 🛠️ Outils Intégrés
- **Calculatrice avancée** : Évaluation d'expressions mathématiques
- **Recherche web** (à venir) : Intégration avec moteurs de recherche
- **Gestion de fichiers** : Upload et traitement de documents
- **Text-to-Speech** : Synthèse vocale des réponses

## 📋 Prérequis

- **Node.js** v18 ou supérieur (recommandé: [nvm](https://github.com/nvm-sh/nvm))
- **Navigateur moderne** avec support WebGPU (Chrome 113+, Edge 113+)
- **RAM** : Minimum 4 GB, recommandé 8 GB+
- **GPU** : Compatible WebGPU (pour performances optimales)

## 🔧 Installation et Démarrage

### Installation des dépendances
```bash
npm install
```

### Démarrage du serveur de développement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Build de production
```bash
npm run build
```

### Prévisualisation du build
```bash
npm run preview
```

## 🧪 Tests

### Tests unitaires
```bash
# Exécuter tous les tests
npm test

# Tests avec interface UI
npm run test:ui

# Tests avec couverture
npm run test:coverage
```

### Tests End-to-End
```bash
# Exécuter les tests E2E
npm run test:e2e

# Tests E2E avec interface UI
npm run test:e2e:ui

# Voir le rapport des tests
npm run test:e2e:report
```

## 🏗️ Architecture

### Structure du Projet
```
orion/
├── src/
│   ├── components/       # Composants React UI
│   ├── workers/          # Web Workers (LLM, Memory, etc.)
│   ├── utils/            # Utilitaires (logger, sanitizer, etc.)
│   ├── config/           # Configuration (modèles, etc.)
│   ├── pages/            # Pages de l'application
│   └── types.ts          # Définitions TypeScript
├── e2e/                  # Tests End-to-End
├── public/               # Assets statiques
└── docs/                 # Documentation (changelogs, guides)
```

### Workers Architecture
- **Orchestrator Worker** : Coordonne tous les autres workers
- **LLM Worker** : Gère l'inférence du modèle de langage
- **Memory Worker** : Système de mémoire sémantique persistante
- **Tool User Worker** : Détection et exécution d'outils (pattern ReAct)
- **Genius Hour Worker** : Auto-amélioration par analyse des échecs
- **Context Manager Worker** : Compression et gestion du contexte
- **Migration Worker** : Gestion des migrations de données

## 🔍 Technologies Utilisées

### Frontend
- **React** 18+ avec TypeScript
- **Vite** - Build tool ultra-rapide
- **TailwindCSS** - Styling utilitaire
- **shadcn/ui** - Composants UI modernes
- **Framer Motion** - Animations fluides

### IA et Machine Learning
- **@mlc-ai/web-llm** - LLM dans le navigateur avec WebGPU
- **@xenova/transformers** - Embeddings sémantiques
- **hnswlib-wasm** - Recherche vectorielle rapide

### Testing et Qualité
- **Vitest** - Tests unitaires ultra-rapides
- **Playwright** - Tests End-to-End
- **ESLint** - Linting et analyse de code
- **TypeScript** - Typage statique

### State Management et Storage
- **TanStack Query** - Gestion d'état asynchrone
- **IndexedDB** (via idb-keyval) - Stockage persistant local

## 📚 Documentation Détaillée

- [Guide de Démarrage](./GUIDE_DEMARRAGE_FEEDBACK.md)
- [Implémentations Récentes](./IMPLEMENTATION_COMPLETE.md)
- [Tests et Validation](./README_TESTS.md)
- [Sécurité](./IMPLEMENTATION_SECURISATION.md)
- [Fonctionnalités d'Observabilité](./FEATURES_OBSERVABILITE.md)
- [Changelogs](./CHANGELOG_V2.md)

## 🎯 Roadmap

### Version Actuelle (v0.5)
- ✅ Architecture Neural Mesh complète
- ✅ Système de mémoire sémantique
- ✅ Genius Hour pour auto-amélioration
- ✅ Dégradation gracieuse
- ✅ Sécurisation et validation
- ✅ Tests unitaires et E2E

### Prochaines Versions
- 🔜 Intégration de plus d'outils (recherche web, APIs)
- 🔜 Support multimodal (images, audio)
- 🔜 Amélioration des performances sur mobile
- 🔜 Export/Import de conversations
- 🔜 Thèmes personnalisables avancés
- 🔜 Mode collaboratif (partage de sessions)

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. **Fork** le projet
2. **Créer** une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### Guidelines
- Suivre les conventions de code TypeScript/React
- Ajouter des tests pour les nouvelles fonctionnalités
- Mettre à jour la documentation si nécessaire
- Respecter les principes de sécurité et confidentialité

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- **MLC-AI** pour Web-LLM
- **Hugging Face** pour les modèles de transformers
- **shadcn** pour les composants UI
- **Lovable** pour l'infrastructure de développement
- La communauté open-source pour les outils incroyables

## 💬 Support et Contact

Pour toute question, bug report ou suggestion :

- **Issues GitHub** : [Créer un issue](https://github.com/your-repo/orion/issues)
- **Discussions** : [Rejoindre les discussions](https://github.com/your-repo/orion/discussions)

---

**ORION** - Votre IA personnelle, privée et puissante. 🌟

Développé avec ❤️ pour la communauté open-source.
