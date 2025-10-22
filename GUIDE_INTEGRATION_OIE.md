# Guide d'Intégration Rapide - Orion Inference Engine (OIE)

## 🎯 Objectif

Ce guide vous montre comment intégrer l'OIE dans votre application ORION existante pour remplacer ou compléter le système de workers LLM actuel.

## 🚀 Étape 1 : Import du hook useOIE

Le moyen le plus simple d'utiliser l'OIE est via le hook React `useOIE`.

### Dans un composant existant

```tsx
import { useOIE } from '@/hooks/useOIE';

function MonComposant() {
  const { isReady, isProcessing, ask, error } = useOIE();
  
  // Utiliser ask() pour envoyer des requêtes
  const handleQuery = async (query: string) => {
    if (!isReady) return;
    
    const response = await ask(query);
    console.log(response.content);
  };
  
  return <div>...</div>;
}
```

## 🔄 Étape 2 : Migration depuis l'orchestrator existant

### Avant (avec orchestrator worker)

```tsx
const { sendQuery } = useOrchestratorWorker({
  onFinalResponse: (payload) => {
    setMessages([...messages, payload.response]);
  }
});

// Envoyer une requête
sendQuery(userMessage, {
  context: ambientContext,
  history: conversationHistory
});
```

### Après (avec OIE)

```tsx
const { ask } = useOIE();

// Envoyer une requête
const handleSend = async (userMessage: string) => {
  const response = await ask(userMessage, {
    conversationHistory,
    ambientContext,
  });
  
  setMessages([...messages, {
    role: 'assistant',
    content: response.content
  }]);
};
```

## 📝 Étape 3 : Exemples d'utilisation avancée

### 3.1 Avec historique de conversation

```tsx
const { ask } = useOIE();

const response = await ask(userQuery, {
  conversationHistory: messages.map(m => ({
    role: m.role,
    content: m.content
  })),
  ambientContext: "Contexte de la conversation"
});
```

### 3.2 Forcer un agent spécifique

```tsx
// Forcer l'agent de code
const codeResponse = await ask(userQuery, {
  forceAgent: 'code-agent',
  temperature: 0.3,
  maxTokens: 2000
});

// Forcer l'agent logique
const logicalResponse = await ask(userQuery, {
  forceAgent: 'logical-agent'
});
```

### 3.3 Avec images (multimodal)

```tsx
const response = await ask("Décris cette image", {
  images: [
    {
      content: 'data:image/png;base64,...',
      type: 'image/png'
    }
  ]
});
```

### 3.4 Monitoring du cache

```tsx
const { getStats } = useOIE();

const stats = getStats();
console.log(`Mémoire utilisée: ${stats.totalMemoryMB}MB`);
console.log(`Agents chargés: ${stats.agentsLoaded}`);
```

## 🎨 Étape 4 : Intégration dans Index.tsx

Voici comment intégrer l'OIE dans la page principale :

```tsx
import { useOIE } from '@/hooks/useOIE';

const Index = () => {
  // Option 1: Utiliser useOIE en plus de l'orchestrator existant
  const { isReady: oieReady, ask: askOIE } = useOIE({
    maxMemoryMB: 8000,
    maxAgentsInMemory: 2,
    autoInit: false // Initialiser manuellement si besoin
  });
  
  // Option 2: Remplacer complètement l'orchestrator
  const handleSendMessage = async (content: string) => {
    if (!oieReady) {
      // Fallback vers l'ancien système
      return sendQuery(content, options);
    }
    
    try {
      const response = await askOIE(content, {
        conversationHistory: getConversationHistory(),
        ambientContext: getCurrentContext(),
      });
      
      addAssistantMessage(response.content);
    } catch (error) {
      console.error('OIE error, falling back', error);
      // Fallback vers l'ancien système
      sendQuery(content, options);
    }
  };
  
  return <div>...</div>;
};
```

## ⚡ Étape 5 : Configuration optimale

### Configuration recommandée selon la RAM

```tsx
// Pour 4-8GB RAM
const { ask } = useOIE({
  maxMemoryMB: 4000,
  maxAgentsInMemory: 1,
  enableVision: false,
  enableCode: true,
});

// Pour 8-16GB RAM
const { ask } = useOIE({
  maxMemoryMB: 8000,
  maxAgentsInMemory: 2,
  enableVision: true,
  enableCode: true,
});

// Pour 16GB+ RAM
const { ask } = useOIE({
  maxMemoryMB: 12000,
  maxAgentsInMemory: 3,
  enableVision: true,
  enableCode: true,
});
```

## 🔧 Étape 6 : Gestion des erreurs

### Pattern de fallback recommandé

```tsx
const handleQuery = async (query: string) => {
  try {
    // Tenter avec OIE
    const response = await ask(query);
    return response;
  } catch (oieError) {
    console.warn('OIE failed, using fallback:', oieError);
    
    // Fallback vers le système existant
    return await sendQueryWithOrchestrator(query);
  }
};
```

## 📊 Étape 7 : Monitoring et debugging

### Ajouter un panneau de monitoring

```tsx
import { useOIE } from '@/hooks/useOIE';

function MonitoringPanel() {
  const { getStats, availableAgents, isReady } = useOIE();
  const stats = getStats();
  
  return (
    <div>
      <h3>OIE Status</h3>
      <p>Ready: {isReady ? '✅' : '❌'}</p>
      <p>Agents: {availableAgents.join(', ')}</p>
      {stats && (
        <>
          <p>Memory: {stats.totalMemoryMB}MB / {stats.maxMemoryMB}MB</p>
          <p>Loaded: {stats.agentsLoaded}</p>
        </>
      )}
    </div>
  );
}
```

## 🎯 Étape 8 : Stratégies d'intégration

### Stratégie 1: Intégration progressive (Recommandé)

Utilisez l'OIE pour certaines requêtes et gardez l'ancien système pour d'autres :

```tsx
const handleSend = async (query: string) => {
  // Utiliser OIE pour les requêtes simples
  if (isSimpleQuery(query) && oieReady) {
    return await askOIE(query);
  }
  
  // Utiliser l'orchestrator pour les requêtes complexes (débat multi-agents)
  return await sendQueryWithDebate(query);
};
```

### Stratégie 2: Remplacement complet

Remplacez complètement l'orchestrator par l'OIE :

```tsx
// Supprimer useOrchestratorWorker
// const { sendQuery } = useOrchestratorWorker(...);

// Utiliser uniquement useOIE
const { ask } = useOIE();

const handleSend = async (query: string) => {
  const response = await ask(query, options);
  // Traiter la réponse
};
```

### Stratégie 3: Dual-mode

Permettre à l'utilisateur de choisir :

```tsx
const [mode, setMode] = useState<'oie' | 'orchestrator'>('oie');
const { ask } = useOIE();
const { sendQuery } = useOrchestratorWorker(...);

const handleSend = async (query: string) => {
  if (mode === 'oie') {
    return await ask(query);
  } else {
    return await sendQuery(query, options);
  }
};
```

## 🧪 Étape 9 : Tests

### Tester l'OIE

```tsx
// Test basique
const { ask, isReady } = useOIE();

useEffect(() => {
  if (isReady) {
    testOIE();
  }
}, [isReady]);

const testOIE = async () => {
  const tests = [
    "Bonjour !",
    "Écris une fonction JavaScript",
    "Pourquoi le ciel est bleu ?",
  ];
  
  for (const test of tests) {
    const response = await ask(test);
    console.log(`Test: ${test}`);
    console.log(`Agent: ${response.agentId}`);
    console.log(`Response: ${response.content.substring(0, 100)}`);
  }
};
```

## 📚 Ressources

- **Documentation complète** : `/src/oie/README.md`
- **Implémentation** : `/src/oie/`
- **Hook React** : `/src/hooks/useOIE.ts`
- **Composant démo** : `/src/components/OIEDemo.tsx`

## ✅ Checklist d'intégration

- [ ] Importer `useOIE` dans votre composant
- [ ] Configurer les options (mémoire, agents)
- [ ] Tester avec des requêtes simples
- [ ] Ajouter la gestion d'erreurs avec fallback
- [ ] Monitorer l'utilisation mémoire
- [ ] Tester avec différents types de requêtes
- [ ] Optimiser la configuration selon votre RAM
- [ ] Documenter l'utilisation dans votre équipe

## 🆘 Dépannage

### Problème : "OIE non prêt"
**Solution** : Attendre que `isReady` soit `true` avant d'appeler `ask()`

### Problème : "Agent introuvable"
**Solution** : Vérifier que l'agent est activé dans la config (`enableCode`, `enableVision`)

### Problème : Mémoire insuffisante
**Solution** : Réduire `maxMemoryMB` ou `maxAgentsInMemory`

### Problème : Chargement lent
**Solution** : Les modèles sont téléchargés au premier usage. Les suivants utilisent le cache.

## 🎉 Prêt !

Vous êtes maintenant prêt à utiliser l'OIE dans votre application ORION !

Pour toute question, consultez la documentation dans `/src/oie/README.md`.
