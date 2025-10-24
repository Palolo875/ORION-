# 🚀 Quick Start - ORION Ultimate Edition

> Démarrez en 5 minutes avec l'écosystème ORION complet

---

## ⚡ Installation Rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer en mode dev
npm run dev

# 3. Ouvrir http://localhost:5173
```

---

## 🎯 Utilisation de Base

### Inférence Simple

```typescript
import { OrionInferenceEngine } from '@/oie';

// Créer une instance
const oie = new OrionInferenceEngine();

// Initialiser
await oie.initialize();

// Poser une question
const response = await oie.infer("Explique-moi le TypeScript");
console.log(response.content);
```

### Avec Routing Automatique

```typescript
// Code → Route automatiquement vers CodeAgent
await oie.infer("Écris une fonction de tri en Python");

// Image → Route vers VisionAgent
await oie.infer("Analyse cette image", {
  images: [{ content: base64Image, type: 'image/jpeg' }]
});

// Multilingue → Route vers MultilingualAgent
await oie.infer("Traduis en espagnol: Hello world");
```

---

## 🏭 Créer un Modèle Hybride

### 1. Écrire la recette

```bash
cd model_foundry
cat > recipes/my-hybrid.yml << EOF
models:
  - model: organization/model-a
  - model: organization/model-b

merge_method: slerp
parameters:
  t: 0.5
dtype: bfloat16
EOF
```

### 2. Fusionner et optimiser

```bash
# Installer les dépendances Python
make install

# Créer le modèle
mergekit-yaml recipes/my-hybrid.yml merged_models/my-hybrid

# Optimiser pour le web (quantification + sharding)
python optimize_pipeline.py \
  --model_path merged_models/my-hybrid \
  --output_path ../public/models/my-hybrid-q4 \
  --quantization q4 \
  --shard_size 100
```

### 3. Intégrer dans ORION

```json
// models.json
{
  "my-hybrid-agent": {
    "id": "my-hybrid-q4",
    "name": "My Hybrid Agent",
    "size_mb": 1200,
    "urls": {
      "base": "/models/my-hybrid-q4/"
    }
  }
}
```

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 🛡️ Sécurité

### Activer les garde-fous

```typescript
const oie = new OrionInferenceEngine({
  enableGuardrails: true,      // Protection anti-injection
  enableCircuitBreaker: true,  // Protection contre pannes
  enableRequestQueue: true     // Gestion de concurrence
});
```

### Vérifier un prompt manuellement

```typescript
import { promptGuardrails } from '@/utils/security/promptGuardrails';

const result = promptGuardrails.validate(userInput);
if (result.action === 'block') {
  console.error('Prompt suspect:', result.threats);
}
```

---

## 📊 Monitoring

```typescript
// Stats de cache
const stats = oie.getStats();
console.log('Mémoire:', stats.memoryUsedMB, 'Mo');

// Stats des circuits
import { circuitBreakerManager } from '@/utils/resilience/circuitBreaker';
const circuits = circuitBreakerManager.getAllStats();

// Logs structurés
import { logger } from '@/utils/logger';
logger.info('MyComponent', 'Action effectuée');
const logs = logger.exportLogs();
```

---

## 🚀 Déploiement

```bash
# Build production
npm run build

# Preview
npm run preview

# Deploy sur Vercel
vercel deploy

# Ou sur Netlify
netlify deploy
```

---

## 📚 Documentation Complète

- **Guide Complet**: [IMPLEMENTATION_COMPLETE_ORION_ULTIMATE.md](IMPLEMENTATION_COMPLETE_ORION_ULTIMATE.md)
- **Model Foundry**: [model_foundry/README.md](model_foundry/README.md)
- **Architecture**: [docs/ARCHITECTURE_FLOW.md](docs/ARCHITECTURE_FLOW.md)

---

## 💡 Exemples Avancés

### Custom Agent avec Context

```typescript
// Logger avec contexte
const childLogger = logger.createChild('MyFeature', { 
  userId: '123' 
});
childLogger.info('Action performed');

// Tracking de performance
logger.startPerformance('my-operation');
// ... opération ...
logger.endPerformance('my-operation', 'MyComponent', 'Opération terminée');
```

### Circuit Breaker Custom

```typescript
import { CircuitBreaker } from '@/utils/resilience/circuitBreaker';

const breaker = new CircuitBreaker({
  name: 'my-service',
  failureThreshold: 5,
  resetTimeout: 60000
});

const result = await breaker.execute(
  async () => await myRiskyOperation(),
  async () => fallbackOperation()  // Fallback optionnel
);
```

---

## 🎓 Tutoriels

### Créer un nouvel agent

1. Créer `src/oie/agents/my-agent.ts`:
```typescript
import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';

export class MyAgent extends BaseAgent {
  constructor() {
    super({
      id: 'my-agent',
      name: 'My Custom Agent',
      capabilities: ['custom-task'],
      modelSize: 1500,
      priority: 5,
      modelId: 'my-model-id'
    });
  }
  
  protected async loadModel(): Promise<void> {
    // Logique de chargement
  }
  
  protected async unloadModel(): Promise<void> {
    // Logique de déchargement
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    // Logique d'inférence
    return {
      agentId: this.metadata.id,
      content: "Response",
      confidence: 90,
      processingTime: 0
    };
  }
}
```

2. Enregistrer dans `src/oie/core/engine.ts`:
```typescript
import { MyAgent } from '../agents/my-agent';

// Dans initialize()
this.registerAgent('my-agent', () => new MyAgent());
```

3. Ajouter au routeur si nécessaire

---

## 🆘 Troubleshooting

### Problème: Modèle ne se charge pas

```typescript
// Vérifier les stats
const stats = oie.getStats();
console.log('Agents en cache:', stats.agentsInCache);
console.log('Erreurs:', stats.errors);

// Activer les logs verbose
const oie = new OrionInferenceEngine({
  verboseLogging: true
});
```

### Problème: Out of Memory

```typescript
// Réduire le nombre d'agents en mémoire
const oie = new OrionInferenceEngine({
  maxMemoryMB: 4000,        // Réduire la limite
  maxAgentsInMemory: 1      // Un seul agent à la fois
});
```

### Problème: Circuit ouvert

```typescript
// Forcer la fermeture du circuit (debug uniquement)
import { circuitBreakerManager } from '@/utils/resilience/circuitBreaker';

const breaker = circuitBreakerManager.getBreaker('agent-name');
breaker.forceClose();

// Ou reset tous les circuits
circuitBreakerManager.resetAll();
```

---

## 🔧 Configuration Avancée

```typescript
const oie = new OrionInferenceEngine({
  // Mémoire
  maxMemoryMB: 8000,
  maxAgentsInMemory: 2,
  
  // Agents
  enableVision: true,
  enableCode: true,
  enableSpeech: true,
  enableCreative: true,
  enableMultilingual: true,
  
  // Routing
  useNeuralRouter: true,  // MobileBERT vs règles simples
  
  // Sécurité
  enableGuardrails: true,
  enableCircuitBreaker: true,
  
  // Performance
  enableRequestQueue: true,
  enablePredictiveLoading: true,
  enableTelemetry: false,  // Opt-in
  
  // Debug
  verboseLogging: false,
  
  // Error reporting
  errorReporting: (error, context) => {
    console.error(`[${context}]`, error);
    // Intégration Sentry, etc.
  }
});
```

---

## 🎉 Vous êtes prêt !

L'écosystème ORION Ultimate est maintenant opérationnel avec:

✅ 10+ agents spécialisés  
✅ Routage neuronal intelligent  
✅ Sécurité multi-niveaux  
✅ Circuit breakers & resilience  
✅ Logging structuré  
✅ Model Foundry pour fusion  
✅ Tests automatisés  
✅ Documentation complète  

**Besoin d'aide?** Consultez [IMPLEMENTATION_COMPLETE_ORION_ULTIMATE.md](IMPLEMENTATION_COMPLETE_ORION_ULTIMATE.md) pour la documentation exhaustive.

---

**Made with ❤️ by the ORION Team**
