# 🚀 Guide Rapide - Orchestration Multi-Agents ORION

Guide de démarrage rapide pour utiliser les nouvelles fonctionnalités d'orchestration multi-agents.

## 📦 Installation

```bash
# Cloner le repo (si pas déjà fait)
git clone <repo-url>
cd workspace

# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev
```

## 🎯 Utilisation du Système Multi-Agents

### Déclenchement Automatique

Le système multi-agents se déclenche automatiquement selon:

1. **Profil d'appareil** (détecté automatiquement)
2. **Complexité de la requête** (longueur > 50 caractères)

### Exemples de Questions qui Déclenchent le Débat

#### ✅ Questions Complexes (Débat Multi-Agents)

```
"Analyse les implications éthiques, techniques et sociétales de l'IA générative. 
Donne-moi une vision équilibrée avec les pour et les contre."

"Quels sont les avantages et inconvénients des énergies renouvelables ? 
Considère les aspects économiques, environnementaux et sociaux."

"Comment l'intelligence artificielle va-t-elle transformer le marché du travail 
dans les 10 prochaines années ?"
```

**Résultat**: 4 agents consultés → réponse enrichie et nuancée

#### ❌ Questions Simples (Réponse Directe)

```
"Quelle est la capitale de la France ?"
"2+2 = ?"
"Bonjour ORION"
```

**Résultat**: Réponse directe sans débat (plus rapide)

### Visualiser le Flux

Le **CognitiveFlow** affiche les étapes en temps réel:

1. 🔍 **Recherche d'outils** - "Analyse de la requête..."
2. 🧠 **Recherche en mémoire** - "Recherche dans la mémoire..."
3. 💭 **Agent Logique** - "Agent Logique : Analyse structurée..."
4. 🎨 **Agent Créatif** - "Agent Créatif en cours..."
5. 🔍 **Agent Critique** - "Agent Critique en cours..."
6. 🔄 **Agent Synthétiseur** - "Synthèse finale en cours..."
7. ✅ **Réponse finale** - Affichage de la réponse

## 🧪 Tests

### Tests Unitaires

```bash
# Tous les tests
npm run test

# Avec watch mode
npm run test -- --watch

# Avec couverture
npm run test:coverage

# Tests spécifiques
npm run test -- llm.worker
npm run test -- orchestrator.worker
```

### Tests E2E

```bash
# Tous les tests E2E
npm run test:e2e

# Avec UI interactive
npm run test:e2e:ui

# Test spécifique
npm run test:e2e -- multi-agent-flow

# Génerer le rapport
npm run test:e2e:report
```

## 📊 Analyse du Bundle

### Générer le Rapport

```bash
# Build production avec analyse
npm run build

# Le rapport est automatiquement généré
open dist/bundle-stats.html
```

### Interpréter le Rapport

- **Treemap**: Visualisation des tailles de chunks
- **Gzip Size**: Taille après compression Gzip
- **Brotli Size**: Taille après compression Brotli
- **Parsed Size**: Taille réelle du code

**Objectifs**:
- ✅ Chunks UI < 100KB chacun
- ✅ Workers séparés pour lazy loading
- ✅ Vendors chunked par catégorie

## 🔧 Configuration

### Profils d'Appareil

Le profil est détecté automatiquement, mais peut être forcé:

```typescript
// Dans le code
const profile: DeviceProfile = 'full' | 'lite' | 'micro';

// Via les paramètres (UI)
Settings → Profil d'appareil → Sélectionner
```

### Workers

#### Utilisation Manuelle

```typescript
import { workerManager } from '@/utils/workerManager';

// Obtenir un worker (lazy loading)
const llmWorker = await workerManager.getWorker('llm');

// Précharger des workers critiques
await workerManager.preloadWorkers(['orchestrator', 'llm']);

// Statistiques
const stats = workerManager.getStats();
console.log('Workers actifs:', stats.activeWorkers);
```

#### Debugging

En développement, le WorkerManager est accessible globalement:

```javascript
// Dans la console du navigateur
window.__workerManager.getStats()

// Résultat
{
  activeWorkers: 2,
  inactiveWorkers: 1,
  totalWorkers: 3,
  workers: [
    {
      type: 'orchestrator',
      isActive: true,
      lastUsed: 1697...,
      idleTime: 0
    },
    ...
  ]
}
```

### Retry

#### Configuration par Défaut

```typescript
// Stratégies disponibles dans src/utils/retry.ts
import { retryStrategies } from '@/utils/retry';

retryStrategies.llm       // LLM: 2 tentatives, 2s-5s
retryStrategies.memory    // Memory: 3 tentatives, 0.5s-2s
retryStrategies.embedding // Embedding: 2 tentatives, 1s-3s
retryStrategies.storage   // Storage: 3 tentatives, 0.3s-1s
```

#### Utilisation Personnalisée

```typescript
import { withRetry } from '@/utils/retry';

const result = await withRetry(
  async () => {
    // Votre opération
    return await someAsyncOperation();
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    onRetry: (error, attempt) => {
      console.warn(`Tentative ${attempt} échouée:`, error.message);
    }
  }
);
```

## 🚨 Gestion d'Erreurs

### Logger Centralisé

```typescript
import { errorLogger, UserMessages } from '@/utils/errorLogger';

// Logger une erreur
errorLogger.error(
  'ComponentName',
  'Technical error description',
  UserMessages.LLM_INFERENCE_FAILED, // Message utilisateur
  error, // Error object
  { context: 'additional info' }
);

// Récupérer les logs
const allLogs = errorLogger.getLogs();
const errors = errorLogger.getLogs('error');
const recent = errorLogger.getRecentLogs(10);

// S'abonner aux nouveaux logs
const unsubscribe = errorLogger.subscribe((log) => {
  if (log.severity === 'critical') {
    // Alerter
  }
});

// Exporter pour analyse
const jsonLogs = errorLogger.export();
```

### Messages Utilisateur

Les messages techniques sont automatiquement convertis en messages conviviaux:

```typescript
UserMessages.LLM_LOAD_FAILED
// → "Le modèle IA n'a pas pu être chargé. Vérifiez votre connexion internet."

UserMessages.LLM_INFERENCE_FAILED
// → "Une erreur est survenue lors de la génération de la réponse. Veuillez réessayer."

UserMessages.MEMORY_SEARCH_FAILED
// → "La recherche dans la mémoire a échoué. L'IA va répondre sans contexte historique."
```

## 📱 Mobile

### Détection Automatique

```typescript
import { isMobileDevice, detectBrowserCompatibility } from '@/utils/browserCompatibility';

// Simple
const isMobile = isMobileDevice();

// Complet
const compat = await detectBrowserCompatibility();
console.log({
  isMobile: compat.isMobile,
  webGPU: compat.webGPU.supported,
  webGL: compat.webGL.supported,
  warnings: compat.warnings,
  recommendations: compat.recommendations
});
```

### Profils Mobiles

| RAM | Cores | WebGPU | Profil | Modèle | Tokens |
|-----|-------|--------|--------|--------|--------|
| 4GB+ | 4+ | ✅ | lite | 400MB | 256 |
| 2GB+ | 2+ | ❌ | micro | 250MB | 128 |
| < 2GB | - | ❌ | micro | 150MB | 64 |

### WebGL Fallback

Si WebGPU n'est pas disponible:

1. **WebGL 2.0**: Essayé en premier (meilleur support)
2. **WebGL 1.0**: Fallback si WebGL 2 indisponible
3. **CPU**: Fallback final (très lent)

```typescript
import { getExecutionStrategy } from '@/utils/browserCompatibility';

const strategy = getExecutionStrategy(compatibility);

if (strategy.useWebGPU) {
  // Meilleure performance
} else if (strategy.useWebGL) {
  // Performance moyenne (fallback)
} else {
  // Performance réduite (CPU)
}
```

## 🎨 Agents Multi-Agents

### Configuration des Agents

Les agents sont définis dans `src/config/agents.ts`:

```typescript
// Agent Logique
{
  temperature: 0.3,  // Déterministe
  maxTokens: 256,
  systemPrompt: "Tu es un analyste logique et rigoureux..."
}

// Agent Créatif
{
  temperature: 0.9,  // Créatif
  maxTokens: 256,
  systemPrompt: "Tu es un penseur créatif et non conventionnel..."
}

// Agent Critique
{
  temperature: 0.5,  // Équilibré
  maxTokens: 256,
  systemPrompt: "Tu es un critique sceptique..."
}

// Agent Synthétiseur
{
  temperature: 0.7,  // Standard
  maxTokens: 300,
  systemPrompt: "Tu es un synthétiseur expert..."
}
```

### Personnaliser les Agents

Pour modifier un agent, éditez `src/config/agents.ts`:

```typescript
export const LOGICAL_AGENT: AgentConfig = {
  id: 'logical',
  name: 'Agent Logique',
  role: 'Analyste Logique',
  systemPrompt: `
    Tu es un analyste logique et rigoureux dans le système ORION.
    
    Ton rôle :
    - Décomposer la question en ses parties fondamentales
    - Identifier les faits, les hypothèses et les objectifs
    - ...
  `,
  temperature: 0.3,
  maxTokens: 256,
  description: 'Analyse logique et décomposition structurée',
};
```

## 🔍 Debugging

### Mode Développement

```bash
npm run dev
```

**Fonctionnalités de debug**:
- ✅ Hot Module Replacement (HMR)
- ✅ WorkerManager accessible via `window.__workerManager`
- ✅ Logs détaillés dans la console
- ✅ React DevTools
- ✅ Source maps pour debugging

### Logs Utiles

```javascript
// Workers actifs
window.__workerManager.getStats()

// Logs d'erreurs
import { errorLogger } from '@/utils/errorLogger'
errorLogger.getLogs()

// Profil d'appareil
import { detectDeviceCapabilities } from '@/utils/deviceProfiler'
const caps = await detectDeviceCapabilities()
console.log(caps)
```

### Performance Monitor

```typescript
// Démarrer le monitoring
performance.mark('query-start');

// Après la réponse
performance.mark('query-end');
performance.measure('query-duration', 'query-start', 'query-end');

const measure = performance.getEntriesByName('query-duration')[0];
console.log(`Query took ${measure.duration}ms`);
```

## 🚀 Production

### Build

```bash
# Build production
npm run build

# Preview du build
npm run preview
```

### Optimisations Appliquées

- ✅ Minification (ESBuild)
- ✅ Tree shaking (code mort supprimé)
- ✅ Code splitting (chunks optimisés)
- ✅ Compression (Gzip + Brotli)
- ✅ Cache busting (hash dans les noms)
- ✅ Service Worker (PWA)

### Déploiement

```bash
# Sur Netlify
netlify deploy --prod

# Sur Vercel
vercel --prod

# Sur serveur custom
# Servir le dossier 'dist' avec un serveur web
```

## 📋 Checklist Avant Déploiement

- [ ] `npm run build` réussit sans erreurs
- [ ] `npm run test` passe tous les tests
- [ ] `npm run test:e2e` passe tous les tests E2E
- [ ] `dist/bundle-stats.html` vérifié (pas de chunks > 500KB)
- [ ] Testé sur mobile (iOS + Android)
- [ ] Testé sur desktop (Chrome, Firefox, Edge)
- [ ] Service Worker fonctionne (offline)
- [ ] Messages d'erreur conviviaux affichés
- [ ] Débat multi-agents fonctionne pour questions complexes
- [ ] Profils d'appareil s'adaptent correctement

## 🆘 Problèmes Communs

### "WebGPU not available"

**Solution**: Le navigateur utilise automatiquement WebGL en fallback. Pour activer WebGPU:
- Chrome/Edge: Version 113+
- Firefox: Activer dans `about:config` → `dom.webgpu.enabled`

### "Worker failed to load"

**Solution**: Vérifier que les workers sont bien dans `src/workers/` et que le build est correct.

```bash
# Nettoyer et rebuilder
rm -rf dist node_modules
npm install
npm run build
```

### "Tests failing"

**Solution**: Vérifier que les dépendances sont installées:

```bash
npm install
npm run test
```

### "Bundle trop gros"

**Solution**: Analyser avec le bundle visualizer:

```bash
npm run build
open dist/bundle-stats.html
```

Chercher les gros chunks (> 500KB) et envisager:
- Lazy loading supplémentaire
- Code splitting plus agressif
- Suppression de dépendances inutilisées

## 📚 Ressources

### Documentation

- [AMELIORATIONS_ORCHESTRATION.md](./AMELIORATIONS_ORCHESTRATION.md) - Documentation complète
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Résumé d'implémentation

### Code

- [src/config/agents.ts](./src/config/agents.ts) - Configuration des agents
- [src/workers/orchestrator.worker.ts](./src/workers/orchestrator.worker.ts) - Orchestrateur
- [src/utils/workerManager.ts](./src/utils/workerManager.ts) - Gestionnaire de workers

### Tests

- [src/workers/__tests__/](./src/workers/__tests__/) - Tests unitaires
- [e2e/](./e2e/) - Tests E2E

## 🎓 Exemples d'Utilisation

### Exemple 1: Question Simple

```
User: "Bonjour ORION"

Flow:
1. Tool search → No tool
2. Memory search → No context
3. LLM simple → Response

Time: ~2s
Agents: 1 (LLMAgent)
```

### Exemple 2: Question Complexe

```
User: "Analyse l'impact de l'IA sur le marché du travail 
avec les aspects économiques, sociaux et éthiques."

Flow:
1. Tool search → No tool
2. Memory search → Context found
3. Multi-agent debate:
   - Agent Logique → Analyse structurée
   - Agent Créatif → Perspectives innovantes
   - Agent Critique → Risques identifiés
   - Agent Synthétiseur → Réponse finale

Time: ~15-20s
Agents: 4 (Logical, Creative, Critical, Synthesizer)
```

### Exemple 3: Calcul Simple

```
User: "2+2"

Flow:
1. Tool search → Calculator found
2. Tool execution → 4
3. Response

Time: ~0.5s
Agents: None (Tool)
```

---

🎉 **Vous êtes prêt à utiliser le nouveau système d'orchestration multi-agents !**

Pour plus de détails, consultez [AMELIORATIONS_ORCHESTRATION.md](./AMELIORATIONS_ORCHESTRATION.md).
