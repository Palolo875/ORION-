# 🔧 Guide de Maintenance - ORION

Ce document décrit les procédures de maintenance, de débogage et d'optimisation pour le projet ORION.

## 📋 Table des matières

1. [Monitoring et Surveillance](#monitoring-et-surveillance)
2. [Débogage](#débogage)
3. [Optimisation des Performances](#optimisation-des-performances)
4. [Sécurité](#sécurité)
5. [Tests](#tests)
6. [Résolution de Problèmes](#résolution-de-problèmes)
7. [Checklist de Maintenance](#checklist-de-maintenance)

## 🔍 Monitoring et Surveillance

### Outils de Monitoring

ORION inclut plusieurs outils de monitoring intégrés :

#### 1. Logger
```typescript
import { logger } from './utils/logger';

// Logs structurés par niveau
logger.debug('Component', 'Message de debug', data);
logger.info('Component', 'Information', data);
logger.warn('Component', 'Avertissement', data);
logger.error('Component', 'Erreur', error);
logger.critical('Component', 'Erreur critique', error);

// Export des logs
const logs = logger.exportLogs();

// Statistiques
const stats = logger.getStats();
```

#### 2. Performance Monitor
```typescript
import { performanceMonitor } from './utils/performanceMonitor';

// Tracker une opération
const endTracking = performanceMonitor.startTracking('Component', 'operation');
// ... faire le travail ...
endTracking({ metadata: 'optional' });

// Rapport de performance
const report = performanceMonitor.getReport();

// Export des métriques
const metrics = performanceMonitor.exportMetrics();
```

#### 3. Debugger
```typescript
import { debugger } from './utils/debugger';

// Activer le mode debug complet
debugger.enableDebugMode();

// Dans la console du navigateur
window.orionDebug.summary();        // Résumé complet
window.orionDebug.download();       // Télécharger snapshot
window.orionDebug.performance();    // Rapport performance
window.orionDebug.logs();           // Tous les logs

// Vérifier la santé du système
const health = debugger.healthCheck();
```

### Métriques à Surveiller

1. **Performance**
   - Temps de réponse LLM (< 5s idéalement)
   - Temps de recherche en mémoire (< 500ms)
   - Temps de chargement des modèles
   - P50, P95, P99 des opérations

2. **Mémoire**
   - Utilisation heap JavaScript (< 90% de la limite)
   - Nombre de souvenirs en IndexedDB
   - Taille des données stockées

3. **Erreurs**
   - Taux d'erreurs par worker
   - Erreurs critiques dans les 24h
   - Échecs de chargement de modèle

4. **Utilisation**
   - Nombre de requêtes par session
   - Outils les plus utilisés
   - Taux de feedback négatif

## 🐛 Débogage

### Mode Debug en Développement

Le mode debug est automatiquement activé en développement :

```typescript
// En dev, ces commandes sont disponibles :
window.orionDebug.summary();     // Résumé complet
window.orionDebug.logs();        // Voir tous les logs
window.orionDebug.performance(); // Métriques de performance
window.orionDebug.download();    // Snapshot de debug complet
```

### Debugging des Workers

Pour déboguer un worker spécifique :

```typescript
// Enregistrer un worker pour le monitoring
debugger.registerWorker('MyWorker');

// Logger une erreur de worker
debugger.logWorkerError('MyWorker', 'Error message');

// Statistiques des erreurs
const errorStats = debugger.getWorkerErrorStats();
```

### Debugging de l'Inférence LLM

1. **Activer les logs verbeux** :
   ```typescript
   debugger.configure({ 
     enableVerboseLogging: true,
     logWorkerMessages: true 
   });
   ```

2. **Vérifier le chargement du modèle** :
   - Rechercher "[LLM]" dans les logs console
   - Vérifier la progression du chargement
   - Confirmer "Moteur et modèle prêts !"

3. **Tracer une requête complète** :
   - Chaque requête a un `traceId` unique
   - Filtrer les logs par `traceId`
   - Observer le flux : Orchestrator → Memory → LLM

### Debugging de la Mémoire

1. **Vérifier les embeddings** :
   ```javascript
   // Dans la console
   const memories = await getAll(); // depuis idb-keyval
   console.log(memories);
   ```

2. **Analyser les recherches** :
   - Activer le logging verbeux
   - Observer les scores de similarité
   - Vérifier le seuil (> 0.6)

3. **Nettoyage de la mémoire** :
   ```typescript
   // Déclencher manuellement
   // (normalement automatique au-delà de 5000 souvenirs)
   ```

## ⚡ Optimisation des Performances

### Stratégies d'Optimisation

#### 1. Profiling de l'Appareil
```typescript
// deviceProfiler détecte automatiquement :
// - GPU (WebGPU disponible?)
// - RAM (>4GB? >8GB?)
// - CPU (nombre de cores)
// → Profile: 'micro', 'lite', 'full'
```

#### 2. Compression du Contexte
```typescript
// Si >10 messages dans l'historique :
// - ContextManager compresse automatiquement
// - Réduit la taille du contexte
// - Maintient les informations importantes
```

#### 3. Dégradation Gracieuse
```typescript
// En fonction du profile :
// 'micro' : Outils uniquement, pas de LLM lourd
// 'lite'  : LLM léger + outils
// 'full'  : Toutes les capacités
```

#### 4. Optimisation de la Mémoire
```typescript
// Nettoyage automatique :
// - TTL : 24h pour tool_result
// - LRU : Suppression des moins utilisés
// - Budget : Max 5000 souvenirs
```

### Checklist d'Optimisation

- [ ] Vérifier P95 de chaque composant (< 5s)
- [ ] Analyser l'utilisation mémoire (< 90%)
- [ ] Optimiser les embeddings (modèle plus petit?)
- [ ] Réduire les logs en production
- [ ] Implémenter lazy loading des modèles
- [ ] Mettre en cache les résultats fréquents
- [ ] Compresser les données dans IndexedDB

## 🔒 Sécurité

### Audit de Sécurité

#### 1. Validation des Entrées
```typescript
// Tous les inputs utilisateur passent par :
import { validateUserInput } from './utils/inputValidator';
import { sanitizeContent } from './utils/sanitizer';

// Valider
const validation = validateUserInput(input);
if (!validation.isValid) {
  // Rejeter
}

// Sanitizer
const safe = sanitizeContent(input, { stripAll: true });
```

#### 2. Chiffrement des Données Sensibles
```typescript
import { secureStorage } from './utils/encryption';

// Chiffrer avant stockage
const encrypted = await secureStorage.encrypt(sensitiveData);

// Déchiffrer à la lecture
const decrypted = await secureStorage.decrypt(encrypted);
```

#### 3. Protection XSS
```typescript
// DOMPurify automatiquement appliqué
// - Whitelist stricte de balises HTML
// - Blocage des event handlers
// - Validation des URLs
```

### Checklist de Sécurité

- [ ] Vérifier que tous les inputs sont validés
- [ ] S'assurer que le contenu est sanitized
- [ ] Confirmer le chiffrement des données sensibles
- [ ] Auditer les dépendances (npm audit)
- [ ] Vérifier CSP (Content Security Policy)
- [ ] Tester contre XSS et injection
- [ ] Valider les URLs externes
- [ ] Limiter la taille des uploads

## 🧪 Tests

### Exécution des Tests

```bash
# Tests unitaires
npm test                    # Tous les tests
npm run test:ui             # Interface UI
npm run test:coverage       # Avec couverture

# Tests E2E
npm run test:e2e            # Tous les E2E
npm run test:e2e:ui         # Interface UI
npm run test:e2e:report     # Rapport

# Linter
npm run lint                # Vérifier le code
```

### Coverage Attendu

- **Global** : > 70%
- **Utilitaires critiques** : > 90% (logger, sanitizer, encryption)
- **Workers** : > 60%
- **Composants UI** : > 50%

### Écrire de Nouveaux Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## 🔧 Résolution de Problèmes

### Problèmes Courants

#### 1. "LLM Worker ne répond pas"

**Symptômes** : Pas de réponse après envoi d'un message

**Diagnostic** :
```typescript
// Vérifier les logs
window.orionDebug.logs()
  .filter(l => l.component === 'LLM')
  .slice(-10);

// Vérifier l'état du worker
debugger.printSummary();
```

**Solutions** :
- Vérifier WebGPU disponible (chrome://gpu)
- Essayer un autre modèle
- Vider le cache du navigateur
- Redémarrer le worker

#### 2. "Mémoire sature"

**Symptômes** : Ralentissements, crashes

**Diagnostic** :
```typescript
performanceMonitor.checkMemoryUsage();
```

**Solutions** :
- Purger la mémoire : Settings → Clear Memory
- Réduire MEMORY_BUDGET dans memory.worker.ts
- Analyser les fuites mémoire avec Chrome DevTools

#### 3. "Performances dégradées"

**Symptômes** : Temps de réponse > 10s

**Diagnostic** :
```typescript
const report = performanceMonitor.getReport();
// Identifier les composants lents
```

**Solutions** :
- Vérifier le profil d'appareil
- Forcer le mode 'lite' ou 'micro'
- Optimiser la compression du contexte
- Réduire le nombre de souvenirs

#### 4. "Erreurs de validation"

**Symptômes** : Inputs rejetés

**Diagnostic** :
```typescript
import { validateUserInput } from './utils/inputValidator';
const result = validateUserInput(input);
console.log(result.errors);
```

**Solutions** :
- Vérifier la longueur (max 10000 chars)
- Éviter les caractères spéciaux suspects
- Respecter les limites de taille

## ✅ Checklist de Maintenance

### Quotidienne
- [ ] Vérifier les erreurs critiques dans les logs
- [ ] Monitorer l'utilisation mémoire
- [ ] Surveiller les temps de réponse

### Hebdomadaire
- [ ] Analyser les logs d'erreurs
- [ ] Vérifier les métriques de performance
- [ ] Examiner les feedbacks négatifs
- [ ] Tester les nouvelles fonctionnalités

### Mensuelle
- [ ] Audit de sécurité (npm audit)
- [ ] Mise à jour des dépendances
- [ ] Revue du code (code review)
- [ ] Optimisation de la base de code
- [ ] Tests de régression complets
- [ ] Backup des données de test

### Trimestrielle
- [ ] Audit de performance complet
- [ ] Revue de l'architecture
- [ ] Planification des évolutions
- [ ] Formation de l'équipe
- [ ] Documentation mise à jour

## 📊 Métriques de Santé

Un système sain doit respecter ces seuils :

| Métrique | Seuil Bon | Seuil Avertissement | Seuil Critique |
|----------|-----------|---------------------|----------------|
| Temps réponse LLM | < 3s | 3-10s | > 10s |
| Utilisation mémoire | < 70% | 70-90% | > 90% |
| Taux d'erreurs | < 1% | 1-5% | > 5% |
| P95 operations | < 2s | 2-5s | > 5s |
| Coverage tests | > 80% | 60-80% | < 60% |

## 🚨 Plan d'Urgence

En cas de problème critique :

1. **Identifier** : `window.orionDebug.healthCheck()`
2. **Snapshot** : `window.orionDebug.download()`
3. **Isoler** : Désactiver les workers problématiques
4. **Fallback** : Mode 'micro' force
5. **Reporter** : Créer un issue avec le snapshot
6. **Restaurer** : Clear data et redémarrer

## 📞 Support

Pour toute question sur la maintenance :

- **Documentation** : Voir `/docs`
- **Issues** : GitHub Issues
- **Logs** : Toujours fournir un debug snapshot

---

**Dernière mise à jour** : 2025-10-18
**Version** : v0.5
**Mainteneur** : Équipe ORION
