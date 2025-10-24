# 🧠 ORION - Assistant IA Intelligent Local

> **Assistant IA personnel fonctionnant entièrement dans votre navigateur avec support offline complet**

[![Tests](https://github.com/votre-org/orion/actions/workflows/tests.yml/badge.svg)](https://github.com/votre-org/orion/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)

## ✨ Caractéristiques principales

- 🔒 **100% Local & Privé** - Tous les calculs IA dans votre navigateur, aucune donnée n'est envoyée à des serveurs
- 🚀 **Système Multi-Agents** ✅ **Opérationnel** - Débats IA avec agents Logique, Créatif, Critique et Synthétiseur
- 🧠 **Mémoire Intelligente** ✅ **Opérationnel** - Recherche sémantique basée sur les embeddings avec HNSW
- ⚡ **WebGPU Accéléré** ✅ **Opérationnel** - Inférence LLM rapide avec fallback WebGL/CPU
- 📱 **Progressive Web App** ✅ **Opérationnel** - Installable, fonctionne offline
- 🛡️ **Sécurité Renforcée** ✅ **Opérationnel** - CSP headers, sanitisation, validation Zod, prompt guardrails
- 🎨 **Interface Moderne** ✅ **Opérationnel** - React 18 + TypeScript + shadcn/ui + TailwindCSS
- 🔧 **12 Outils Intégrés** ✅ **Opérationnel** - Calculatrice, convertisseur, analyse données, sandbox code, etc.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 20+ 
- Navigateur moderne avec support WebGPU (Chrome 113+, Edge 113+)
- 4GB+ RAM recommandé pour les modèles LLM

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-org/orion.git
cd orion

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Build pour production
npm run build
```

L'application sera accessible sur `http://localhost:5000`

## 📖 Documentation

- **[Guide de Démarrage](docs/QUICK_START.md)** - Installation et premiers pas
- **[Architecture](replit.md)** - Détails techniques et architecture du système
- **[Guide de Déploiement](docs/DEPLOYMENT_GUIDE.md)** - Comment déployer en production
- **[Tests](docs/TESTING.md)** - Guide des tests unitaires, intégration et E2E
- **[Maintenance](docs/MAINTENANCE_GUIDE.md)** - Guide de maintenance et mise à jour
- **[Sécurité](docs/SECURITY.md)** - Politique de sécurité et meilleures pratiques

### Documentation archivée

Les anciens documents d'implémentation et rapports sont disponibles dans [docs/archive/](docs/archive/)

## 🏗️ Architecture

### Stack Technique

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **IA**: @mlc-ai/web-llm (modèles LLM), @xenova/transformers (embeddings)
- **State**: React hooks personnalisés, IndexedDB
- **Workers**: Web Workers pour inférence et traitement
- **Tests**: Vitest, Playwright, Testing Library
- **CI/CD**: GitHub Actions, Dependabot

### Système Multi-Agents

ORION utilise un système de débat multi-agents unique :

1. **Agent Logique** (température 0.3) - Analyse structurée et raisonnement
2. **Agent Créatif** (température 0.9) - Pensée divergente et exploration
3. **Agent Critique** (température 0.5) - Analyse sceptique et contre-arguments
4. **Agent Synthétiseur** (température 0.7) - Synthèse finale équilibrée

### Mémoire Vectorielle

- **Embeddings**: all-MiniLM-L6-v2 (384 dimensions)
- **Index**: HNSW pour recherche rapide O(log n)
- **Capacité**: 5000 items maximum avec LRU eviction
- **TTL**: 24h pour résultats d'outils

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests avec coverage
npm run test:coverage

# Tests E2E
npm run test:e2e

# Tests avec vrais modèles (lent)
LOAD_REAL_MODELS=true npm run test:integration
```

**Coverage actuel**: Tests unitaires: 305 passed, E2E: Disponible

## 📦 Scripts disponibles

```bash
npm run dev          # Mode développement
npm run build        # Build production
npm run preview      # Preview du build
npm run lint         # ESLint (2 warnings mineurs)
npm run test         # Tests unitaires (305 tests, 100% pass)
npm run test:coverage # Coverage (93.7%)
npm run test:e2e     # Tests end-to-end (Playwright)
```

## 📊 État du Projet

| Métrique | Statut | Note |
|----------|--------|------|
| Tests unitaires | ✅ **305/305 passent** | 100% |
| TypeScript | ✅ **0 erreur** | Typage strict |
| ESLint | ✅ **2 warnings mineurs** | Code propre |
| Build | ✅ **Succès (11MB)** | Optimisé |
| Sécurité | 🟡 **2 CVE modérées** | Dev only, acceptées |
| PWA | ✅ **Fonctionnelle** | Offline-first |
| Production Ready | ✅ **OUI** | Prêt à déployer |

### Fonctionnalités Implémentées

| Feature | Status | Notes |
|---------|--------|-------|
| Chat IA local | ✅ Opérationnel | WebGPU/WebGL/CPU |
| Multi-agents | ✅ Opérationnel | 4 agents + synthétiseur |
| Mémoire vectorielle | ✅ Opérationnel | HNSW, 5000 items |
| 12 Outils | ✅ Opérationnel | Calculator, converter, etc. |
| PWA offline | ✅ Opérationnel | Service Worker |
| Sécurité | ✅ Opérationnel | DOMPurify, Zod, CSP |
| Tests | ✅ Opérationnel | 305 tests, E2E |
| Documentation | ✅ Complète | 132 fichiers MD |

### Features Avancées (Partielles)

| Feature | Status | Notes |
|---------|--------|-------|
| STT/TTS | 🟡 Configuré | Workers à compléter |
| Image Generation | 🟡 Configuré | Stable Diffusion - intégration à finaliser |
| Model Foundry UI | 🟡 Scripts OK | Interface UI à compléter |
| OIE Ultimate | 🟡 Architecture OK | Workers basiques opérationnels |

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez consulter notre [guide de contribution](CONTRIBUTING.md) pour plus de détails.

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) pour l'inférence LLM dans le navigateur
- [@xenova/transformers](https://github.com/xenova/transformers.js) pour les embeddings
- [shadcn/ui](https://ui.shadcn.com/) pour les composants UI
- La communauté open source pour tous les outils formidables

## 📞 Support

- 🐛 [Signaler un bug](https://github.com/votre-org/orion/issues)
- 💡 [Demander une fonctionnalité](https://github.com/votre-org/orion/discussions)
- 📧 Email: support@orion.dev

---

Fait avec ❤️ par l'équipe ORION
