# ORION Tool System

## Architecture

Le système de Tools d'ORION implémente une architecture modulaire et sécurisée pour l'exécution d'outils dans le navigateur.

### Principes Fondamentaux

1. **Zero Cost**: Tous les outils s'exécutent localement, sans coût externe
2. **Confidentialité Totale**: Aucune donnée n'est envoyée à un serveur externe
3. **Isolation**: Chaque outil s'exécute dans un Web Worker dédié
4. **Résilience**: Circuit Breaker pour chaque outil
5. **Performance**: Pool de workers pour la réutilisation

## Composants

### Tool Gateway (`tool-gateway.ts`)

Le gestionnaire central des Tool Workers. Il gère:
- Création et destruction de workers
- Pool de workers pour la réutilisation
- Circuit Breaker par outil
- Timeouts et gestion des erreurs
- Communication via postMessage

### Tool Registry (`tool-registry.ts`)

Registre de tous les outils disponibles avec:
- Métadonnées (nom, description, capacités)
- Validation des arguments
- Patterns de détection d'intention
- Requirements de modèles d'IA

### Tool Workers (`workers/`)

12 outils spécialisés:

#### 1. Computation
- **Calculator** (`calculator.worker.ts`): Calculs mathématiques avancés avec math.js
- **Converter** (`converter.worker.ts`): Conversions d'unités, devises, températures

#### 2. Data Analysis
- **Data Analyzer** (`dataAnalyzer.worker.ts`): Analyse de données CSV/JSON/Excel

#### 3. Code Execution
- **Code Sandbox** (`codeSandbox.worker.ts`): Exécution sécurisée de JavaScript

#### 4. Search
- **Memory Search** (`memorySearch.worker.ts`): Recherche sémantique en mémoire

#### 5. Image Processing
- **Image Processor** (`imageProcessor.worker.ts`): Redimensionnement, filtres, rotation

#### 6. Visualization
- **Diagram Generator** (`diagramGenerator.worker.ts`): Génération de diagrammes Mermaid

#### 7. Generation
- **QR Generator** (`qrGenerator.worker.ts`): QR codes et codes-barres

#### 8. Audio (STT/TTS)
- **Speech to Text** (`speechToText.worker.ts`): Transcription avec Whisper
- **Text to Speech** (`textToSpeech.worker.ts`): Synthèse vocale avec Kokoro TTS

#### 9. AI (Vision & Creative)
- **Vision Analyzer** (`visionAnalyzer.worker.ts`): Classification et détection d'objets
- **Image Generator** (`imageGenerator.worker.ts`): Génération d'images avec Stable Diffusion

## Usage

### Basique

```typescript
import { getToolGateway } from '@/tools';

// Obtenir le gateway
const gateway = getToolGateway();

// Exécuter un outil
const result = await gateway.executeTool('calculator', ['2 + 2']);

if (result.success) {
  console.log(result.result); // "2 + 2 = 4"
}
```

### Avec Détection d'Intention

```typescript
import { findToolByIntent } from '@/tools';

const query = "calcule la racine carrée de 144";
const tool = findToolByIntent(query);

if (tool) {
  const result = await gateway.executeTool(tool.id, ['sqrt(144)']);
}
```

### Vérification des Dépendances

```typescript
import { getToolRequirements, isToolAvailable } from '@/tools';

// Vérifier si un outil nécessite des modèles d'IA
const requirements = getToolRequirements('visionAnalyzer');
// ['mobilenetV3', 'yolov8Nano']

// Vérifier si l'outil est disponible
const available = isToolAvailable('visionAnalyzer', loadedModels);
```

## Modèles d'IA Intégrés

### Audio
- **Whisper Base** (~290MB): Speech-to-Text multilingue
- **Kokoro TTS** (~150MB): Text-to-Speech naturel

### Vision
- **MobileNetV3** (~5MB): Classification rapide
- **YOLOv8 Nano** (~6MB): Détection d'objets
- **Phi-3 Vision** (~2.4GB): Vision multimodale avancée

### Creative
- **Stable Diffusion Tiny** (~1.5GB): Génération d'images

## Sécurité

### Validation
Tous les outils valident leurs entrées avec:
- Whitelist de patterns autorisés
- Validation des types
- Détection de code malveillant

### Isolation
- Exécution dans des Web Workers dédiés
- Pas d'accès au DOM ou APIs dangereuses
- Timeout strict sur chaque exécution

### Circuit Breaker
- Seuil d'échecs configurable (défaut: 5)
- États: CLOSED → OPEN → HALF_OPEN
- Récupération automatique après timeout

## Performance

### Optimisations
- Pool de workers (3 par outil par défaut)
- Réutilisation des workers
- Lazy loading des modèles d'IA
- Quantization 4-bit des modèles lourds

### Timeouts
- Outils simples: 5s
- Outils de data: 15s
- Outils audio: 20-30s
- Génération d'images: 60s

## Extensibilité

### Ajouter un Nouvel Outil

1. **Créer le worker** (`src/tools/workers/myTool.worker.ts`):
```typescript
self.onmessage = async (event) => {
  const { toolId, args } = event.data;
  
  // Logique de l'outil
  const result = processMyTool(args);
  
  self.postMessage({
    type: 'tool_result',
    result: {
      success: true,
      toolId,
      result,
      executionTime: 0,
    },
  });
};
```

2. **Enregistrer dans le registre** (`tool-registry.ts`):
```typescript
export const TOOL_REGISTRY = {
  myTool: {
    id: 'myTool',
    name: 'My Tool',
    category: 'computation',
    description: 'Description',
    argCount: 1,
    examples: ['example 1'],
    capabilities: ['capability1'],
    validator: (args) => typeof args[0] === 'string',
    requiresWorker: true,
  },
};
```

3. **Ajouter le pattern de détection**:
```typescript
const patterns = {
  myTool: [
    /my tool pattern/i,
  ],
};
```

## Tests

Les tests sont organisés par catégorie:

```bash
# Tests unitaires des outils
npm test -- src/tools/__tests__/

# Tests d'intégration
npm test -- src/tools/__tests__/integration/

# Tests de performance
npm test -- src/tools/__tests__/performance/
```

## Roadmap

### Phase 1 (Actuelle)
- ✅ Architecture Tool Gateway
- ✅ 12 outils de base
- ✅ Circuit Breaker
- ✅ Pool de workers

### Phase 2 (Prochaine)
- [ ] Intégration complète des modèles audio (Whisper, Kokoro)
- [ ] Intégration MobileNetV3 et YOLOv8
- [ ] Intégration Stable Diffusion Tiny
- [ ] Tests E2E complets

### Phase 3 (Future)
- [ ] Outils Python via Pyodide
- [ ] Support WebAssembly pour outils natifs
- [ ] Outils collaboratifs multi-utilisateurs
- [ ] Marketplace d'outils communautaires

## Contribution

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour les guidelines de contribution.

## Licence

Projet ORION - Propriétaire
