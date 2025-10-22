# Orion Inference Engine (OIE)

## 📋 Vue d'ensemble

L'**Orion Inference Engine (OIE)** est un système d'orchestration intelligent pour les agents IA spécialisés dans ORION. Il gère automatiquement :

- 🧠 **Routage intelligent** : Sélectionne l'agent approprié selon la requête
- 💾 **Gestion de mémoire** : Cache LRU pour optimiser les ressources
- 🔄 **Chargement dynamique** : Les agents sont chargés à la demande
- 🎯 **Agents spécialisés** : Code, Vision, Conversation, Logique

## 🏗️ Architecture

```
src/oie/
├── core/              # Moteur principal
│   └── engine.ts      # OrionInferenceEngine
├── agents/            # Agents spécialisés
│   ├── base-agent.ts
│   ├── conversation-agent.ts
│   ├── code-agent.ts
│   ├── vision-agent.ts
│   └── logical-agent.ts
├── router/            # Routage intelligent
│   └── simple-router.ts
├── cache/             # Gestion mémoire
│   ├── lru-cache.ts
│   └── cache-manager.ts
└── types/             # Définitions TypeScript
```

## 🚀 Utilisation

### Avec le hook React (Recommandé)

```typescript
import { useOIE } from '@/hooks/useOIE';

function MyComponent() {
  const { isReady, isProcessing, ask, error } = useOIE({
    maxMemoryMB: 8000,
    maxAgentsInMemory: 2,
    enableVision: true,
    enableCode: true,
  });

  const handleQuery = async () => {
    if (!isReady) return;
    
    try {
      const response = await ask("Comment créer une fonction en JavaScript ?");
      console.log(response.content);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {!isReady && <div>Chargement du moteur...</div>}
      {error && <div>Erreur: {error}</div>}
      <button onClick={handleQuery} disabled={isProcessing || !isReady}>
        Poser une question
      </button>
    </div>
  );
}
```

### Utilisation directe (Avancé)

```typescript
import { OrionInferenceEngine } from '@/oie';

// Initialisation
const engine = new OrionInferenceEngine({
  maxMemoryMB: 8000,
  maxAgentsInMemory: 2,
  enableVision: true,
  enableCode: true,
});

await engine.initialize();

// Requête simple
const response = await engine.infer("Bonjour !");
console.log(response.content);

// Requête avec options
const codeResponse = await engine.infer(
  "Écris une fonction pour trier un tableau",
  {
    temperature: 0.3,
    maxTokens: 2000,
    conversationHistory: [
      { role: 'user', content: 'Précédent message' },
      { role: 'assistant', content: 'Précédente réponse' }
    ]
  }
);

// Forcer un agent spécifique
const logicalResponse = await engine.infer(
  "Analyse ce problème",
  { forceAgent: 'logical-agent' }
);

// Cleanup
await engine.shutdown();
```

## 🤖 Agents disponibles

### 1. **ConversationAgent** (`conversation-agent`)
- **Modèle** : Phi-3-mini-4k-instruct
- **Taille** : ~2GB
- **Capacités** : Conversation générale, écriture créative
- **Usage** : Agent par défaut pour le dialogue

### 2. **CodeAgent** (`code-agent`)
- **Modèle** : CodeGemma-2B
- **Taille** : ~1.6GB
- **Capacités** : Génération de code, explication, débogage
- **Usage** : Automatiquement sélectionné pour les questions de programmation

### 3. **VisionAgent** (`vision-agent`)
- **Modèle** : Phi-3-Vision
- **Taille** : ~2.4GB
- **Capacités** : Analyse d'images, description visuelle
- **Usage** : Automatiquement sélectionné quand des images sont présentes

### 4. **LogicalAgent** (`logical-agent`)
- **Modèle** : Phi-3-mini-4k-instruct
- **Taille** : ~2GB
- **Capacités** : Analyse logique, décomposition structurée
- **Usage** : Questions nécessitant du raisonnement rigoureux

## 📊 Gestion de mémoire

L'OIE utilise un **cache LRU (Least Recently Used)** pour optimiser l'utilisation de la RAM :

```typescript
// Configuration du cache
const engine = new OrionInferenceEngine({
  maxMemoryMB: 8000,        // Mémoire maximale
  maxAgentsInMemory: 2,     // Nombre max d'agents chargés simultanément
});

// Statistiques du cache
const stats = engine.getStats();
console.log(stats);
// {
//   agentsLoaded: 2,
//   totalMemoryMB: 3648,
//   maxMemoryMB: 8000,
//   memoryUsagePercent: 45.6,
//   agents: [...]
// }
```

## 🧭 Routage automatique

Le routeur détecte automatiquement l'intention :

| Mots-clés | Agent sélectionné |
|-----------|------------------|
| `code`, `fonction`, `script`, `programme` | CodeAgent |
| `image`, `photo`, `analyser image` | VisionAgent |
| `analyse`, `logique`, `étape` | LogicalAgent |
| Par défaut | ConversationAgent |

## 🔧 Configuration avancée

### Désactiver certains agents

```typescript
const engine = new OrionInferenceEngine({
  enableVision: false,  // Désactiver l'agent vision
  enableCode: false,    // Désactiver l'agent code
});
```

### Forcer un agent spécifique

```typescript
const response = await engine.infer("Question", {
  forceAgent: 'code-agent'  // Force l'utilisation de CodeAgent
});
```

### Avec images

```typescript
const response = await engine.infer("Décris cette image", {
  images: [
    { 
      content: 'data:image/png;base64,...',
      type: 'image/png'
    }
  ]
});
```

## 🎯 Exemple complet

```typescript
import { OrionInferenceEngine } from '@/oie';

async function demo() {
  // 1. Initialisation
  const engine = new OrionInferenceEngine({
    maxMemoryMB: 8000,
    maxAgentsInMemory: 2,
  });
  
  await engine.initialize();
  console.log('Agents disponibles:', engine.getAvailableAgents());
  
  // 2. Questions variées
  const responses = await Promise.all([
    engine.infer("Écris une fonction JavaScript pour calculer la factorielle"),
    engine.infer("Quelle est la capitale de la France ?"),
    engine.infer("Analyse logiquement: pourquoi le ciel est bleu ?"),
  ]);
  
  responses.forEach((res, i) => {
    console.log(`Question ${i + 1}:`);
    console.log(`Agent: ${res.agentId}`);
    console.log(`Réponse: ${res.content}`);
    console.log(`Temps: ${res.processingTime}ms`);
  });
  
  // 3. Statistiques
  console.log('Stats:', engine.getStats());
  
  // 4. Cleanup
  await engine.shutdown();
}

demo();
```

## 📝 Notes importantes

1. **Premier chargement** : Le premier appel à un agent prend du temps (téléchargement + initialisation)
2. **Cache persistant** : Les modèles sont mis en cache navigateur après le premier téléchargement
3. **Mémoire** : Surveillez l'utilisation RAM avec `getStats()`
4. **Fallback** : En cas d'erreur, l'OIE tente automatiquement le ConversationAgent

## 🐛 Debugging

```typescript
// Activer les logs détaillés
const engine = new OrionInferenceEngine({...});
await engine.initialize();

// Les logs apparaîtront dans la console :
// [OIE] 🚀 Initialisation...
// [SimpleRouter] Agent enregistré: Agent Conversation
// [OIE] ✅ Moteur prêt
// [OIE] 📥 Requête reçue: "..."
// [OIE] 🧭 Routage: code-agent (confiance: 85%)
// [CacheManager] Miss: code-agent - Chargement...
// [CodeAgent] Chargement du modèle...
// [OIE] ✅ Réponse générée en 1234ms
```

## 🔮 Roadmap

- [ ] Agent Multilingue (Qwen2)
- [ ] Agent Whisper (Speech-to-Text)
- [ ] Routeur neuronal (MobileBERT)
- [ ] Streaming des réponses
- [ ] Benchmark automatique
- [ ] Métriques de performance

## 📚 Ressources

- [Documentation WebLLM](https://webllm.mlc.ai/)
- [Configuration des modèles](/src/config/models.ts)
- [Configuration des agents](/src/config/agents.ts)
