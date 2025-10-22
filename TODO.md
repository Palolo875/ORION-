# 📋 TODO ORION - Travaux Futurs

## 🔴 Priorité Haute

### Tests Workers (8 tests skip)
**Fichier**: `src/workers/__tests__/llm.worker.test.ts`

**Problème**: Les tests du LLM worker sont actuellement marqués `.skip()` car ils ne s'exécutent pas correctement dans le contexte de test actuel.

**Cause racine**: 
- L'import dynamique du worker ne garantit pas que `self.onmessage` est configuré à temps
- Les mocks ne capturent pas correctement les réponses postMessage du worker
- L'architecture de test actuelle n'est pas adaptée pour tester les Web Workers

**Tests affectés** (8 tests):
1. ✅ Initialisation - `devrait répondre à un message init` (PASSE)
2. ⏭️ Changement de modèle - `devrait permettre de changer le modèle` (SKIP)
3. ⏭️ Génération de réponse - `devrait générer une réponse avec le LLM` (SKIP)
4. ⏭️ System prompt - `devrait utiliser le system prompt personnalisé` (SKIP)
5. ⏭️ Gestion erreurs - `devrait gérer les erreurs d'initialisation` (SKIP)
6. ⏭️ Progression - `devrait envoyer des mises à jour de progression` (SKIP)
7. ⏭️ Persona logique - `devrait maintenir la cohérence de la persona logique` (SKIP)
8. ⏭️ Persona créative - `devrait maintenir la cohérence de la persona créative` (SKIP)
9. ⏭️ Non-contamination - `ne devrait pas contaminer la réponse créative` (SKIP)

**Solution proposée**:
1. Créer un wrapper de test pour les workers qui simule correctement l'environnement
2. Utiliser une approche basée sur des "test workers" réels plutôt que des mocks
3. Implémenter des helpers de test spécifiques pour workers (pattern Message/Response)
4. Considérer l'utilisation de bibliothèques spécialisées pour tester les Web Workers

**Impact**: ⚠️ Les fonctionnalités du LLM worker ne sont pas couvertes par les tests automatisés, mais le worker fonctionne en production (testé manuellement).

**Estimation**: 2-3 jours pour refonte complète de l'architecture de test des workers

---

## 🟡 Priorité Moyenne

### Documentation Avancée

#### API Documentation
- [ ] Générer la documentation API complète avec TypeDoc
- [ ] Documenter tous les hooks personnalisés
- [ ] Créer des exemples d'utilisation pour chaque worker
- [ ] Ajouter des diagrammes d'architecture (mermaid)

#### Guides Utilisateur
- [ ] Guide de migration entre versions
- [ ] Guide de troubleshooting détaillé
- [ ] FAQ étendue
- [ ] Tutoriels vidéo (optionnel)

### Performance

#### Optimisations
- [ ] Analyse du bundle size et optimisations
- [ ] Lazy loading plus agressif
- [ ] Optimisation des images et assets
- [ ] Service Worker caching strategies review

#### Monitoring
- [ ] Ajouter métriques de performance (Web Vitals)
- [ ] Implémenter error tracking (Sentry optionnel)
- [ ] Dashboard de monitoring (optionnel)

### Fonctionnalités

#### LLM Features
- [ ] Streaming responses (actuellement désactivé)
- [ ] Support de plus de modèles LLM
- [ ] Fine-tuning local des modèles
- [ ] RAG (Retrieval-Augmented Generation) avancé

#### UI/UX
- [ ] Thèmes additionnels (au-delà de dark/light)
- [ ] Personnalisation de l'interface
- [ ] Raccourcis clavier avancés
- [ ] Mode focus / zen

---

## 🟢 Priorité Basse

### Infrastructure

#### CI/CD
- [ ] Ajouter tests de régression visuelle (Percy, Chromatic)
- [ ] Automatiser les releases (semantic-release)
- [ ] Ajouter preview deployments pour PRs
- [ ] Configurer Renovate en plus de Dependabot

#### Qualité
- [ ] Augmenter le coverage à >90%
- [ ] Ajouter mutation testing
- [ ] Configurer SonarQube pour analyse statique
- [ ] Audit d'accessibilité automatisé (axe-core)

### Internationalization
- [ ] Support multi-langues (i18n)
- [ ] Traductions FR, EN, ES, DE
- [ ] RTL support pour langues arabes/hébraïques

### Documentation Archive
- [ ] Nettoyer complètement docs/archive/
- [ ] Migrer les informations pertinentes vers la nouvelle structure
- [ ] Supprimer les fichiers vraiment obsolètes

---

## ✅ Récemment Complété (Octobre 2025)

### Tests
- ✅ Correction des erreurs TypeScript dans llm.worker.ts
- ✅ Documentation des tests skip avec TODO explicatifs
- ✅ Tous les tests (sauf workers) passent : 305 tests passed

### Documentation
- ✅ Nouveau README.md principal professionnel
- ✅ Guide de contribution (CONTRIBUTING.md)
- ✅ Documentation de sécurité (docs/SECURITY.md)
- ✅ Guide des tests (docs/TESTING.md)
- ✅ Index de documentation (docs/DOCUMENTATION_INDEX.md)
- ✅ Archivage de ~50 fichiers redondants

### Sécurité
- ✅ CSP headers améliorés (block-all-mixed-content, Permissions-Policy)
- ✅ Documentation complète de la sécurité
- ✅ Validation Zod pour tous les payloads workers

### CI/CD
- ✅ Configuration Codecov pour coverage
- ✅ Upload des artifacts de coverage
- ✅ Dependabot déjà configuré et actif
- ✅ GitHub Actions optimisé

### Qualité de Code
- ✅ lint-staged configuré
- ✅ Husky pre-commit hooks
- ✅ Scripts lint:fix
- ✅ Types globaux complets

---

## 📊 Métriques Actuelles

- **Tests**: 305 passed | 8 skipped | 0 failed
- **Coverage**: ~80% (estimation, à vérifier avec coverage report)
- **Build**: ✅ Réussit sans erreurs TypeScript
- **LSP Diagnostics**: 6 warnings (tous dans tests skip)
- **Documentation**: 6 fichiers principaux + archives organisées
- **Dépendances**: 0 vulnérabilités critiques

---

## 🎯 Objectifs Q1 2026

1. **Tests Workers** - Refonte complète et 100% passing
2. **Coverage** - Atteindre 90%+
3. **Performance** - Web Vitals dans le vert
4. **i18n** - Support FR + EN minimum
5. **Streaming** - Activer les réponses streaming

---

**Dernière mise à jour** : Octobre 2025  
**Mainteneur** : Équipe ORION
