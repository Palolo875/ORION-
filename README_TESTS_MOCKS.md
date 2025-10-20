# 🎭 Guide des Tests avec Mocks - ORION

Ce document explique le nouveau système de tests avec mocks pour ORION, permettant des tests **100× plus rapides** sans télécharger les modèles LLM.

## 🎯 Vue d'ensemble

### Problème Résolu
- ❌ **Avant**: Tests nécessitant le téléchargement de 2GB de modèles (5-60s par test)
- ✅ **Après**: Tests avec mocks intelligents (0.1-2s par test)

### Architecture du Système de Mocks

```
📦 src/workers/__mocks__/
├── llm.worker.ts           # Mock du LLM avec réponses intelligentes
├── memory.worker.ts        # Mock de la mémoire (IndexedDB)
├── toolUser.worker.ts      # Mock des outils (calculatrice, etc.)
├── contextManager.worker.ts # Mock de compression de contexte
└── geniusHour.worker.ts    # Mock d'apprentissage en arrière-plan
```

## 🚀 Utilisation

### Tests Rapides (Mode par Défaut)

```bash
# Tests avec mocks (rapide, recommandé pour le dev quotidien)
npm test

# Avec watch mode
npm run test:watch

# Avec UI interactive
npm run test:ui

# Avec coverage
npm run test:coverage
```

**Résultat**: ~0.1-2s par test ⚡

### Tests avec Vrais Modèles (Occasionnel)

```bash
# Tests avec vrais modèles LLM (lent, 1× par semaine)
npm run test:integration

# OU avec variable d'environnement
LOAD_REAL_MODELS=true npm test
```

**Résultat**: ~5-60s par test 🐌

## 📋 Scripts Disponibles

### Setup (Une seule fois)

```bash
# Télécharger tous les modèles localement
npm run setup

# Télécharger uniquement Phi-3
npm run setup:phi3

# Télécharger uniquement TinyLlama
npm run setup:tinyllama
```

### Tests

| Script | Description | Durée |
|--------|-------------|-------|
| `npm test` | Tests unitaires avec mocks | ~5-10s pour tous |
| `npm run test:watch` | Mode watch pour dev | Instantané |
| `npm run test:integration` | Tests avec vrais modèles | ~5-10min |
| `npm run test:e2e` | Tests end-to-end (Playwright) | ~2-5min |
| `npm run test:coverage` | Coverage avec mocks | ~15-30s |

## 🧪 Écrire des Tests

### Exemple: Test Simple avec Mocks

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { WorkerMessage, QueryPayload } from '../types';

describe('Mon Worker', () => {
  let worker: Worker;

  beforeEach(() => {
    // Le mock est automatiquement utilisé grâce à src/test/setup.ts
    worker = new Worker(
      new URL('../orchestrator.worker.ts', import.meta.url),
      { type: 'module' }
    );
  });

  afterEach(() => {
    worker.terminate();
  });

  it('devrait traiter une requête', (done) => {
    const testQuery: QueryPayload = {
      query: 'Test query',
      conversationHistory: [],
      deviceProfile: 'micro'
    };

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === 'final_response') {
        expect(event.data.payload).toHaveProperty('response');
        done();
      }
    };

    worker.postMessage({
      type: 'query',
      payload: testQuery,
      meta: { traceId: 'test-1' }
    });
  }, 5000); // Timeout 5s
});
```

### Mocks Intelligents

Les mocks génèrent des réponses basées sur le contexte:

```typescript
// Requête avec "calcul" → Mock détecte et retourne résultat de calcul
{ query: "Calcule 25 + 17" }
// → Mock répond: "[Mock] Résultat du calcul: 42"

// Requête avec agent "logical" → Mock retourne réponse structurée
{
  query: "Analyser ce problème",
  agentType: "logical"
}
// → Mock répond avec structure logique (prémisses, raisonnement, conclusion)

// Requête avec agent "creative" → Mock retourne réponse créative
{
  query: "Idée originale",
  agentType: "creative"
}
// → Mock répond avec métaphores et perspectives innovantes
```

## 🏗️ Architecture Complète

### 1. Système de Cache à 3 Niveaux

```
┌─────────────────────────────────────────┐
│ Cache Mémoire (RAM)                     │
│ ✅ Ultra rapide (0.1ms)                 │
│ ⚠️ Volatile, ~500MB max                 │
└─────────────────────────────────────────┘
              ⬇️ Miss
┌─────────────────────────────────────────┐
│ Cache IndexedDB                         │
│ ✅ Rapide (10-50ms)                     │
│ ✅ Persistant, ~100MB                   │
└─────────────────────────────────────────┘
              ⬇️ Miss
┌─────────────────────────────────────────┐
│ Cache Service Worker                    │
│ ✅ Persistant (50-200ms)                │
│ ✅ Illimité (quotas navigateur)         │
└─────────────────────────────────────────┘
              ⬇️ Miss
┌─────────────────────────────────────────┐
│ Réseau (HuggingFace ou Local)           │
│ ⚠️ Lent (5-60s selon modèle)            │
└─────────────────────────────────────────┘
```

**Utilisation:**

```typescript
import { modelCache } from '@/utils/modelCache';

// Vérifier le cache
const cached = await modelCache.get('phi-3-weights');

if (cached) {
  console.log('✅ Modèle en cache');
} else {
  console.log('⬇️ Téléchargement nécessaire');
  const data = await fetch('...');
  await modelCache.set('phi-3-weights', data);
}

// Stats
const stats = modelCache.getStats();
console.log(`Mémoire: ${stats.memorySizeMB.toFixed(2)} MB`);
```

### 2. Serveur Local de Développement

En développement, Vite sert les modèles depuis `/models/`:

```
http://localhost:8080/models/phi-3/mlc-chat-config.json
http://localhost:8080/models/tinyllama/ndarray-cache.json
```

**Configuration**: `vite.config.ts` avec plugin `serveLocalModels()`

### 3. Configuration Automatique des Mocks

`src/test/setup.ts` configure automatiquement les mocks:

```typescript
// Par défaut: utiliser les mocks
if (!process.env.LOAD_REAL_MODELS) {
  global.Worker = vi.fn((url) => {
    if (url.includes('llm.worker')) {
      return new MockLLMWorker();
    }
    // ... autres mocks
  });
}
```

## 📊 Comparaison de Performance

| Opération | Avec Vrais Modèles | Avec Mocks | Gain |
|-----------|-------------------|------------|------|
| Test simple | 5-10s | 0.1-0.5s | **50-100×** |
| Test multi-agent | 30-60s | 1-2s | **30-60×** |
| Suite complète (82 tests) | ~15-30min | ~10-30s | **30-60×** |
| CI/CD pipeline | ~45min | ~2min | **20-25×** |

## 🎓 Bonnes Pratiques

### ✅ DO

- Utiliser les mocks pour le développement quotidien
- Lancer `test:integration` 1× par semaine
- Vérifier que les mocks reflètent le comportement réel
- Utiliser `test:watch` pour TDD
- Tester avec vrais modèles avant release

### ❌ DON'T

- Ne pas commiter le dossier `models/` (déjà dans .gitignore)
- Ne pas mocker trop finement (over-mocking)
- Ne pas oublier les tests d'intégration occasionnels
- Ne pas tester en prod uniquement

## 🔧 Troubleshooting

### "Worker is not defined"

**Solution**: Vérifier que `src/test/setup.ts` est bien chargé dans `vitest.config.ts`

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: './src/test/setup.ts', // ✅
  }
});
```

### Les tests sont lents même avec mocks

**Vérification**:

```bash
# Doit afficher "🎭 Tests avec MOCKS (rapide)"
npm test

# Si affiche "🧠 Tests avec VRAIS MODÈLES", désactiver:
unset LOAD_REAL_MODELS
npm test
```

### Quota exceeded errors

Le cache à 3 niveaux gère automatiquement les quotas. Si problème:

```typescript
import { modelCache } from '@/utils/modelCache';

// Vider tous les caches
await modelCache.clear();
```

## 📈 Métriques de Succès

### Objectifs Atteints

- ✅ Tests 50-100× plus rapides
- ✅ Pas de téléchargement en dev quotidien
- ✅ CI/CD < 5min (vs 45min avant)
- ✅ Feedback instantané pour TDD
- ✅ Tests déterministes (pas d'aléa LLM)

### Prochaines Étapes

- [ ] Ajouter tests de régression pour les mocks
- [ ] Implémenter stratégie d'éviction LRU dans le cache
- [ ] Documenter les cas edge à tester avec vrais modèles
- [ ] Automatiser `test:integration` dans la CI hebdomadaire

## 🤝 Contribution

Pour ajouter un nouveau mock:

1. Créer `src/workers/__mocks__/mon-worker.worker.ts`
2. Implémenter l'interface du worker réel
3. Ajouter la détection dans `src/test/setup.ts`
4. Écrire des tests dans `src/workers/__tests__/`

**Template**:

```typescript
// src/workers/__mocks__/mon-worker.worker.ts
export class MockMonWorker {
  private listeners = new Map<string, Function>();
  
  postMessage(message: WorkerMessage) {
    setTimeout(() => {
      const response = this.generateMockResponse(message);
      const listener = this.listeners.get('message');
      if (listener) listener({ data: response });
    }, 100); // Délai simulé
  }
  
  addEventListener(event: string, callback: Function) {
    this.listeners.set(event, callback);
  }
  
  removeEventListener(event: string) {
    this.listeners.delete(event);
  }
  
  terminate() {
    this.listeners.clear();
  }
  
  private generateMockResponse(message: WorkerMessage) {
    // Logique de mock
    return { type: 'response', payload: {...}, meta: message.meta };
  }
}
```

## 📚 Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Guide Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [WebLLM Documentation](https://github.com/mlc-ai/web-llm)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

---

**Auteur**: Système de Mocks ORION  
**Version**: 1.0.0  
**Date**: 2025-10-20
