# Guide de Migration - Optimisations Modèles ORION

## 📋 Vue d'Ensemble

Ce guide explique comment migrer le code existant pour utiliser les nouvelles optimisations.

---

## 🔄 Étape 1: Migrer les Workers vers le Service d'Embedding Partagé

### Avant (Workers Indépendants)

Chaque worker charge son propre modèle d'embedding:

```typescript
// memory.worker.ts, migration.worker.ts, geniusHour.worker.ts
import { pipeline, env } from '@xenova/transformers';

class EmbeddingPipeline {
  static instance: PipelineInstance | null = null;
  static async getInstance(): Promise<PipelineInstance> {
    if (this.instance === null) {
      this.instance = await pipeline('feature-extraction', MEMORY_CONFIG.EMBEDDING_MODEL);
    }
    return this.instance;
  }
}

async function createEmbedding(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const result = await extractor(text, {});
  return Array.from(result as ArrayLike<number>);
}
```

### Après (Service Partagé)

Tous les workers utilisent le service partagé:

```typescript
// Dans chaque worker qui a besoin d'embeddings
import { getSharedEmbeddingClient } from '../utils/sharedEmbedding';

// Créer le client (une seule fois au début du worker)
const embeddingClient = getSharedEmbeddingClient();

// Utiliser pour créer des embeddings
async function createEmbedding(text: string): Promise<number[]> {
  return await embeddingClient.createEmbedding(text);
}
```

### Modifications Nécessaires

#### memory.worker.ts

```typescript
// Ligne ~15: REMPLACER les imports
import { getSharedEmbeddingClient } from '../utils/sharedEmbedding';

// Lignes ~24-40: SUPPRIMER la classe EmbeddingPipeline locale

// Ligne ~182: REMPLACER createSemanticEmbedding
async function createSemanticEmbedding(text: string): Promise<number[]> {
  const client = getSharedEmbeddingClient();
  return await client.createEmbedding(text);
}
```

#### migration.worker.ts

```typescript
// Ligne ~13: REMPLACER les imports
import { getSharedEmbeddingClient } from '../utils/sharedEmbedding';

// Lignes ~27-43: SUPPRIMER la classe EmbeddingPipeline locale

// Ligne ~46: REMPLACER createSemanticEmbedding
async function createSemanticEmbedding(text: string): Promise<number[]> {
  const client = getSharedEmbeddingClient();
  return await client.createEmbedding(text);
}
```

#### geniusHour.worker.ts

```typescript
// Ligne ~15: REMPLACER les imports
import { getSharedEmbeddingClient } from '../utils/sharedEmbedding';

// Lignes ~68-84: SUPPRIMER la classe EmbeddingPipeline locale

// Ligne ~86: REMPLACER createEmbedding
async function createEmbedding(text: string): Promise<number[]> {
  const client = getSharedEmbeddingClient();
  return await client.createEmbedding(text);
}
```

---

## 🎯 Étape 2: Intégrer le Model Loader Optimisé

### Dans le LLM Worker

```typescript
// src/workers/llm.worker.ts

import { getModelLoader } from '../utils/modelLoader';

async function loadModel(modelKey: string) {
  const loader = getModelLoader();
  
  // Charger avec progression
  await loader.loadModel(modelKey, (progress) => {
    self.postMessage({
      type: 'load_progress',
      payload: { progress, modelKey }
    });
  });
  
  // Marquer comme utilisé
  loader.markModelUsed(modelKey);
}
```

### Dans les Composants React

```typescript
// src/components/ModelSelector.tsx

import { getModelLoader } from '@/utils/modelLoader';
import { useState } from 'react';

function ModelSelector() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleModelSelect = async (modelKey: string) => {
    setLoading(true);
    setProgress(0);
    
    try {
      const loader = getModelLoader();
      await loader.loadModel(modelKey, (p) => setProgress(p));
      
      // Notifier le succès
      toast.success('Modèle chargé avec succès!');
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };
  
  // ... reste du composant
}
```

---

## 📊 Étape 3: Ajouter le Monitoring Mémoire

### Dans le Layout Principal

```typescript
// src/pages/Index.tsx ou Layout.tsx

import { MemoryMonitorWidget, MemoryStatusIndicator } from '@/components/MemoryMonitorWidget';

function Layout() {
  return (
    <div>
      {/* Version complète (debug/dev) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 w-80">
          <MemoryMonitorWidget showDetails />
        </div>
      )}
      
      {/* Version compacte (production) */}
      <header>
        <div className="flex items-center gap-2">
          <span>ORION</span>
          <MemoryStatusIndicator />
        </div>
      </header>
      
      {/* Contenu principal */}
      <main>
        {children}
      </main>
    </div>
  );
}
```

### Avec un Hook Personnalisé

```typescript
// Dans n'importe quel composant

import { useMemoryMonitoring, useMemoryAlerts } from '@/hooks/useMemoryMonitoring';

function MyComponent() {
  const { pressure, isHealthy, isCritical } = useMemoryMonitoring();
  const { alerts, hasAlerts } = useMemoryAlerts();
  
  // Désactiver certaines fonctionnalités si critique
  useEffect(() => {
    if (isCritical) {
      // Décharger les modèles non essentiels
      console.warn('Mémoire critique - mode économie activé');
    }
  }, [isCritical]);
  
  return (
    <div>
      {hasAlerts && (
        <div className="alerts">
          {alerts.map((alert, i) => (
            <Alert key={i}>{alert}</Alert>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## ⚙️ Étape 4: Configuration de la Quantization

### Détection Automatique

Le système détecte automatiquement les capacités de l'appareil:

```typescript
// Automatique - pas besoin de configuration
import { getOptimizationStrategy } from '@/config/modelOptimization';

// La stratégie est appliquée automatiquement dans modelLoader
const loader = getModelLoader();
```

### Configuration Manuelle (Optionnel)

Pour forcer un niveau de quantization:

```typescript
import { applyQuantization, QUANTIZATION_LEVELS } from '@/config/modelOptimization';

// Forcer q4 pour Mistral
const modelId = 'Mistral-7B-Instruct-v0.2';
const quantizedId = applyQuantization(modelId, 'q4');
// Résultat: 'Mistral-7B-Instruct-v0.2-q4f16_1-MLC'

// Charger avec quantization forcée
await loader.loadModel(quantizedId);
```

---

## 🧪 Étape 5: Tests et Validation

### Test de l'Embedding Partagé

```typescript
// test/shared-embedding.test.ts

import { getSharedEmbeddingClient } from '@/utils/sharedEmbedding';

describe('SharedEmbeddingClient', () => {
  it('should create embeddings', async () => {
    const client = getSharedEmbeddingClient();
    const embedding = await client.createEmbedding('test');
    
    expect(embedding).toBeDefined();
    expect(embedding.length).toBeGreaterThan(0);
  });
  
  it('should use cache for same text', async () => {
    const client = getSharedEmbeddingClient();
    
    const start1 = performance.now();
    await client.createEmbedding('test repeated');
    const time1 = performance.now() - start1;
    
    const start2 = performance.now();
    await client.createEmbedding('test repeated');
    const time2 = performance.now() - start2;
    
    // Le 2ème appel devrait être beaucoup plus rapide (cache)
    expect(time2).toBeLessThan(time1 * 0.1);
  });
});
```

### Test du Model Loader

```typescript
// test/model-loader.test.ts

import { getModelLoader } from '@/utils/modelLoader';
import { MODELS } from '@/config/models';

describe('ModelLoader', () => {
  it('should load model with progress', async () => {
    const loader = getModelLoader();
    const progressValues: number[] = [];
    
    await loader.loadModel('demo', (progress) => {
      progressValues.push(progress);
    });
    
    expect(progressValues.length).toBeGreaterThan(0);
    expect(Math.max(...progressValues)).toBe(100);
  });
  
  it('should respect max concurrent models', async () => {
    const loader = getModelLoader();
    const stats = loader.getStats();
    
    expect(stats.loadedModels).toBeLessThanOrEqual(stats.maxConcurrentModels);
  });
});
```

### Test du Memory Monitor

```typescript
// test/memory-monitor.test.ts

import { getMemoryMonitor } from '@/utils/performance/memoryMonitor';

describe('MemoryMonitor', () => {
  it('should take snapshots', async () => {
    const monitor = getMemoryMonitor();
    const snapshot = await monitor.takeSnapshot();
    
    expect(snapshot).toBeDefined();
    expect(snapshot.pressure).toMatch(/low|medium|high|critical/);
    expect(snapshot.recommendations).toBeInstanceOf(Array);
  });
  
  it('should track history', async () => {
    const monitor = getMemoryMonitor();
    
    await monitor.takeSnapshot();
    await monitor.takeSnapshot();
    
    const snapshots = monitor.getSnapshots();
    expect(snapshots.length).toBeGreaterThan(1);
  });
});
```

---

## 🚀 Étape 6: Déploiement

### Checklist Pré-Déploiement

- [ ] Migrer tous les workers vers le service d'embedding partagé
- [ ] Tester le chargement de chaque modèle avec le nouveau loader
- [ ] Vérifier que le monitoring mémoire fonctionne
- [ ] Tester sur appareil low-end (2GB RAM)
- [ ] Tester sur appareil high-end (8GB+ RAM)
- [ ] Vérifier les logs pour détecter les erreurs
- [ ] Mesurer les métriques avant/après

### Configuration de Production

```typescript
// vite.config.ts

export default defineConfig({
  // ... autres configs
  define: {
    'process.env.ENABLE_MEMORY_MONITOR': JSON.stringify(
      process.env.NODE_ENV === 'development'
    ),
  },
});
```

### Variables d'Environnement

```bash
# .env.production

# Activer/désactiver le monitoring
VITE_ENABLE_MEMORY_MONITOR=false

# Niveau de quantization par défaut
VITE_DEFAULT_QUANTIZATION=q4

# Nombre max de modèles chargés
VITE_MAX_CONCURRENT_MODELS=2
```

---

## 📈 Métriques à Surveiller

### Avant la Migration

1. **Ouvrir DevTools Console**
2. **Noter les métriques:**
   ```javascript
   // Dans la console
   performance.memory.usedJSHeapSize / (1024 * 1024) // MB
   ```

### Après la Migration

1. **Comparer les métriques:**
   - Utilisation mémoire: devrait être réduite de ~60%
   - Temps de chargement: devrait être réduit de ~40%
   - Nombre de modèles chargés: devrait respecter les limites

2. **Utiliser le widget de monitoring:**
   ```typescript
   const monitor = getMemoryMonitor();
   const stats = monitor.getStats();
   console.log('Stats:', stats);
   ```

---

## ⚠️ Problèmes Courants et Solutions

### Problème 1: "Worker failed to initialize"

**Cause:** Le worker partagé ne se charge pas correctement

**Solution:**
```typescript
// Vérifier que le worker est bien configuré dans vite.config.ts
worker: {
  format: 'es',
}
```

### Problème 2: "Memory quota exceeded"

**Cause:** Trop de modèles chargés simultanément

**Solution:**
```typescript
// Forcer le déchargement des modèles
const loader = getModelLoader();
await loader.unloadModel('model-id');
```

### Problème 3: "Embedding creation timeout"

**Cause:** Le service partagé est surchargé

**Solution:**
```typescript
// Augmenter le timeout dans sharedEmbedding.ts
const timeout = window.setTimeout(() => {
  // ...
}, 60000); // 60 secondes au lieu de 30
```

---

## 🎓 Ressources Supplémentaires

- [Documentation Quantization](./docs/quantization.md)
- [Guide Performance](./docs/performance.md)
- [Architecture Workers](./docs/workers-architecture.md)

---

## ✅ Validation Finale

Une fois la migration terminée, vérifier:

1. ✅ Tous les workers utilisent le service d'embedding partagé
2. ✅ Les 3 nouveaux modèles se chargent avec quantization
3. ✅ Le monitoring mémoire affiche des données
4. ✅ Les tests passent
5. ✅ L'utilisation mémoire a diminué de ~60%
6. ✅ Aucune régression de qualité

**Commande de validation:**
```bash
npm run test
npm run build
npm run lint
```

---

**Date:** 2025-10-21  
**Version:** 1.0.0
