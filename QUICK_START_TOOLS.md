# 🚀 Guide de Démarrage Rapide - Système de Tools ORION

## Installation

Le système de Tools est déjà intégré dans ORION. Aucune installation supplémentaire n'est requise pour commencer.

## Utilisation de Base

### 1. Obtenir le Tool Gateway

```typescript
import { getToolGateway } from '@/tools';

const gateway = getToolGateway();
```

### 2. Exécuter un Outil

```typescript
// Exemple: Calculatrice
const result = await gateway.executeTool('calculator', ['2^10 + sqrt(144)']);

if (result.success) {
  console.log(result.result); // "2^10 + sqrt(144) = 1036"
  console.log(`Exécuté en ${result.executionTime}ms`);
}
```

### 3. Détection Automatique d'Outil

```typescript
import { findToolByIntent } from '@/tools';

const query = "convertis 100 euros en dollars";
const tool = findToolByIntent(query);

if (tool) {
  console.log(`Outil détecté: ${tool.name}`);
  const result = await gateway.executeTool(tool.id, [100, 'eur', 'usd']);
}
```

## Exemples par Catégorie

### 💻 Computation

```typescript
// Calculs mathématiques
await gateway.executeTool('calculator', ['sin(pi/2) + cos(0)']);

// Conversions
await gateway.executeTool('converter', [25, 'celsius', 'fahrenheit']);
await gateway.executeTool('converter', [10, 'km', 'miles']);
```

### 📊 Data Analysis

```typescript
// Analyser un fichier CSV
const csvData = "name,age\nAlice,30\nBob,25";
await gateway.executeTool('dataAnalyzer', [csvData, 'parse']);
```

### 🖥️ Code Execution

```typescript
// Exécuter du code JavaScript
const code = "const sum = (a, b) => a + b; console.log(sum(5, 3));";
await gateway.executeTool('codeSandbox', [code, 'javascript']);
```

### 🖼️ Image Processing

```typescript
// Traiter une image
const imageBlob = await fetch('/image.jpg').then(r => r.blob());
await gateway.executeTool('imageProcessor', [imageBlob, 'resize']);
```

### 📐 Visualization

```typescript
// Générer un diagramme Mermaid
const mermaidCode = `
graph TD
  A[Start] --> B[Process]
  B --> C[End]
`;
await gateway.executeTool('diagramGenerator', [mermaidCode, 'mermaid']);
```

### 🎤 Audio (STT/TTS)

```typescript
// Speech-to-Text
const audioBlob = await navigator.mediaDevices.getUserMedia({audio: true});
await gateway.executeTool('speechToText', [audioBlob]);

// Text-to-Speech
await gateway.executeTool('textToSpeech', ['Bonjour, comment allez-vous?']);
```

### 👁️ Vision & Creative

```typescript
// Analyser une image
await gateway.executeTool('visionAnalyzer', [imageBlob]);

// Générer une image
await gateway.executeTool('imageGenerator', ['A beautiful sunset over mountains']);
```

## Gestion des Erreurs

```typescript
const result = await gateway.executeTool('calculator', ['invalid']);

if (!result.success) {
  console.error(`Erreur: ${result.error}`);
  console.log(`Temps d'exécution: ${result.executionTime}ms`);
}
```

## Vérification des Capacités

### Lister tous les outils

```typescript
import { getAllTools } from '@/tools';

const tools = getAllTools();
console.log(`${tools.length} outils disponibles`);
```

### Vérifier les dépendances

```typescript
import { getToolRequirements, isToolAvailable } from '@/tools';

// Vérifier si un outil nécessite des modèles d'IA
const requirements = getToolRequirements('visionAnalyzer');
console.log('Modèles requis:', requirements); // ['mobilenetV3', 'yolov8Nano']

// Vérifier si l'outil est disponible
const loadedModels = ['mobilenetV3']; // Modèles actuellement chargés
const available = isToolAvailable('visionAnalyzer', loadedModels);
console.log('Outil disponible:', available); // false (manque yolov8Nano)
```

### Obtenir des statistiques

```typescript
import { getRegistryStats, getToolsAndModelsStats } from '@/tools';

// Statistiques du registre
const registryStats = getRegistryStats();
console.log(registryStats);
// {
//   totalTools: 12,
//   categories: ['computation', 'data', 'code', ...],
//   capabilities: ['arithmetic', 'algebra', ...],
//   toolsByCategory: { computation: 2, data: 1, ... }
// }

// Statistiques outils + modèles
const stats = getToolsAndModelsStats(['mobilenetV3']);
console.log(stats);
// {
//   total: 12,
//   available: 10,
//   unavailable: 2,
//   availableTools: ['calculator', 'converter', ...],
//   unavailableTools: ['visionAnalyzer', 'imageGenerator']
// }
```

## Configuration Avancée

### Personnaliser les Timeouts

```typescript
import { ToolGateway } from '@/tools';

const gateway = new ToolGateway({
  TIMEOUT: 60000,                    // 60s au lieu de 30s
  MAX_RETRIES: 5,                    // 5 tentatives au lieu de 3
  CIRCUIT_FAILURE_THRESHOLD: 10,     // 10 échecs avant ouverture
  WORKER_POOL_SIZE: 5,              // 5 workers par outil au lieu de 3
});
```

### Nettoyer les Ressources

```typescript
// À la fin de la session ou changement de page
gateway.cleanup();
```

### Obtenir les Statistiques

```typescript
const stats = gateway.getStats();
console.log(stats);
// {
//   activeWorkers: 2,
//   pooledWorkers: 15,
//   queueLength: 0,
//   circuits: { calculator: { state: 'CLOSED', ... }, ... }
// }
```

## Intégration dans une Application React

```typescript
import { useEffect, useState } from 'react';
import { getToolGateway, findToolByIntent } from '@/tools';

function CalculatorComponent() {
  const [result, setResult] = useState('');
  const [gateway] = useState(() => getToolGateway());

  const handleCalculate = async (expression: string) => {
    const result = await gateway.executeTool('calculator', [expression]);
    
    if (result.success) {
      setResult(result.result);
    } else {
      setResult(`Erreur: ${result.error}`);
    }
  };

  useEffect(() => {
    // Cleanup à la fin
    return () => gateway.cleanup();
  }, []);

  return (
    <div>
      <input onChange={(e) => handleCalculate(e.target.value)} />
      <p>{result}</p>
    </div>
  );
}
```

## Intégration avec l'Orchestrateur

Le système de Tools est automatiquement intégré dans l'orchestrateur d'ORION. Lorsque l'utilisateur pose une question, l'orchestrateur:

1. Détecte si un outil peut répondre
2. Exécute l'outil via le Tool Gateway
3. Retourne le résultat directement ou l'utilise comme contexte pour le LLM

```typescript
// Dans l'orchestrateur
const tool = findToolByIntent(query);

if (tool) {
  const result = await toolGateway.executeTool(tool.id, extractedArgs);
  
  if (result.success) {
    // Retourner directement le résultat
    return { response: result.result, toolUsed: tool.id };
  }
}

// Sinon, continuer avec le LLM
```

## Debugging

### Activer les Logs

```typescript
import { logger } from '@/utils/logger';

// Les logs sont automatiquement activés en mode développement
// Vérifier dans la console du navigateur:
// [ToolGateway] Tool executed: calculator (15ms)
// [ToolGateway] Circuit state: calculator -> CLOSED
```

### Inspecter l'État du Circuit

```typescript
const circuitState = gateway.getStats().circuits['calculator'];

console.log(circuitState);
// {
//   state: 'CLOSED',
//   failures: 0,
//   successes: 15,
//   consecutiveFailures: 0,
//   lastSuccessTime: 1698162430000
// }
```

## Limitations Actuelles

### Phase 1 (Actuelle)
- ✅ Architecture complète implémentée
- ✅ 12 outils fonctionnels
- ⚠️ Modèles audio/vision/creative: Configuration ready, intégration à venir

### Phase 2 (Prochaine)
- Chargement des modèles audio via @xenova/transformers
- Intégration MobileNetV3 et YOLOv8
- Intégration Stable Diffusion Tiny
- Support complet des bibliothèques externes (Papa Parse, qrcode.js)

## Support

Pour plus d'informations:
- 📖 Documentation complète: [src/tools/README.md](./src/tools/README.md)
- 📋 Implémentation détaillée: [IMPLEMENTATION_TOOLS_SYSTEM.md](./IMPLEMENTATION_TOOLS_SYSTEM.md)
- 🐛 Issues: Ouvrir une issue sur GitHub

---

**Note**: Ce système est en constante évolution. Les fonctionnalités marquées ⚠️ sont configurées mais nécessitent l'intégration complète des modèles d'IA (Phase 2).
