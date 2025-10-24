# 🚀 Quick Start - OIE Ultimate

> Démarrage rapide pour l'Orion Inference Engine "Ultimate"

## 📋 Prérequis

- Node.js 18+
- npm ou bun
- Python 3.10+ (pour la Model Foundry)
- 8 Go RAM minimum (16 Go recommandé)
- Navigateur compatible WebGPU (Chrome 113+, Edge 113+)

## ⚡ Installation en 3 minutes

### 1. Installer les dépendances

```bash
# Dépendances Node.js
npm install

# (Optionnel) Dépendances Model Foundry
cd model_foundry
poetry install
cd ..
```

### 2. Lancer l'application

```bash
npm run dev
```

Ouvrir http://localhost:5173

### 3. Vérifier l'initialisation

L'OIE s'initialise automatiquement au démarrage. Vous verrez dans la console :

```
[OIE] 🚀 Initialisation du moteur Orion Inference Engine...
[OIE] 🧠 Initialisation du NeuralRouter (MobileBERT ~95 Mo)...
[OIE] ✅ NeuralRouter prêt - Précision de routage: ~95%
[OIE] 🤖 Enregistrement des agents optimisés...
[OIE] ✅ Moteur prêt avec optimisations avancées
```

## 🎯 Première utilisation

### Tester le routage automatique

1. **Requête de code:**
   ```
   Écris une fonction TypeScript pour valider un email
   ```
   → Agent utilisé : `code-agent`

2. **Requête de traduction:**
   ```
   Traduis "Hello World" en français, espagnol et japonais
   ```
   → Agent utilisé : `multilingual-agent`

3. **Requête créative:**
   ```
   Écris une courte histoire sur un robot explorateur
   ```
   → Agent utilisé : `creative-agent`

### Utiliser les modèles ORION hybrides

Les modèles ORION ne sont **pas chargés automatiquement**. Vous devez les créer d'abord:

#### Option A: Forcer un agent ORION (si déjà créé)

Dans l'interface, ouvrez les paramètres et sélectionnez un modèle ORION personnalisé.

#### Option B: Créer les modèles ORION

```bash
cd model_foundry

# 1. ORION Code & Logic
mergekit-yaml recipes/orion-code-logic-v1.yml merged_models/ORION-Code-Logic-v1
python optimize_pipeline.py \
  --model_path merged_models/ORION-Code-Logic-v1 \
  --output_path ../public/models/ORION-Code-Logic-v1-q4 \
  --quantization q4 \
  --shard_size 150

# 2. ORION Creative & Multilingual
mergekit-yaml recipes/orion-creative-multilingual-v1.yml merged_models/ORION-Creative-Multilingual-v1
python optimize_pipeline.py \
  --model_path merged_models/ORION-Creative-Multilingual-v1 \
  --output_path ../public/models/ORION-Creative-Multilingual-v1-q4 \
  --quantization q4 \
  --shard_size 200
```

**Note:** Chaque modèle ORION prend ~30-60 min à créer selon votre machine.

## 🔧 Configuration

### Mode développement (par défaut)

```typescript
// src/hooks/useOIE.ts
const { isReady, ask } = useOIE({
  maxMemoryMB: 8000,
  maxAgentsInMemory: 3,
  useNeuralRouter: true,
  enableVision: true,
  enableCode: true,
  enableMultilingual: true,
  verboseLogging: true
});
```

### Mode production

```typescript
const { isReady, ask } = useOIE({
  maxMemoryMB: 4000,
  maxAgentsInMemory: 2,
  useNeuralRouter: true,
  enableVision: false, // Économiser RAM
  enableCode: true,
  enableMultilingual: true,
  verboseLogging: false
});
```

### Mode device bas de gamme

```typescript
const { isReady, ask } = useOIE({
  maxMemoryMB: 2000,
  maxAgentsInMemory: 1,
  useNeuralRouter: false, // SimpleRouter consomme moins
  enableVision: false,
  enableCode: true,
  enableMultilingual: false,
  verboseLogging: false
});
```

## 📊 Vérifier la performance

### 1. Vérifier WebGPU

Ouvrez la console et tapez:

```javascript
if (navigator.gpu) {
  console.log('✅ WebGPU disponible');
} else {
  console.log('❌ WebGPU indisponible - Fallback WASM');
}
```

### 2. Vérifier les stats OIE

```javascript
// Dans la console
window.oieStats();
```

Vous verrez:
```json
{
  "agentsLoaded": 2,
  "totalMemoryMB": 2200,
  "cacheHitRate": 0.85,
  "routingAccuracy": 0.95,
  "backend": "webgpu"
}
```

### 3. Mesurer TTFT (Time To First Token)

Le TTFT devrait être < 3s pour les agents standards avec sharding.

Dans l'UI, envoyez une requête et regardez le temps avant le premier mot.

## 🧪 Lancer les tests

### Tests unitaires

```bash
npm run test
```

### Tests E2E

```bash
npm run test:e2e
```

### Tests E2E en mode UI (interactif)

```bash
npm run test:e2e:ui
```

## 🐛 Debugging

### Activer les logs verbeux

Dans l'interface, ouvrez les paramètres et activez "Logs verbeux".

Vous verrez dans la console:
- `[OIE]` - Logs du moteur
- `[NeuralRouter]` - Logs du routeur
- `[CacheManager]` - Logs du cache
- `[AgentFactory]` - Logs de la factory
- `[WebGPUManager]` - Logs WebGPU

### Vérifier les Circuit Breakers

```javascript
// Dans la console
window.circuitBreakerStats();
```

### Vérifier le cache

```javascript
// Dans la console
window.cacheStats();
```

## 🚨 Problèmes courants

### "WebGPU not available"

**Cause:** Navigateur non compatible ou GPU non détecté

**Solution:**
1. Utiliser Chrome 113+ ou Edge 113+
2. Vérifier que GPU est activé dans `chrome://gpu`
3. L'OIE basculera automatiquement sur WASM (plus lent)

### "Out of memory"

**Cause:** Trop d'agents chargés en mémoire

**Solutions:**
1. Réduire `maxAgentsInMemory` à 1 ou 2
2. Réduire `maxMemoryMB` à 2000-4000
3. Désactiver agents non essentiels (vision, creative)
4. Fermer d'autres onglets

### "Model not found"

**Cause:** Modèle ORION non créé

**Solution:**
Créer le modèle avec Model Foundry (voir ci-dessus) ou utiliser les agents standards.

### TTFT > 10s

**Causes possibles:**
1. Première utilisation (téléchargement du modèle)
2. WebGPU désactivé → utilise WASM (plus lent)
3. Connexion lente
4. Device bas de gamme

**Solutions:**
1. Attendre la fin du premier chargement (mise en cache)
2. Activer WebGPU
3. Utiliser le mode "device bas de gamme"

## 📚 Ressources

- 📖 [Documentation complète](./ORION_INFERENCE_ENGINE_ULTIMATE_IMPLEMENTATION.md)
- 🏭 [Model Foundry Guide](./model_foundry/README.md)
- 🧪 [Guide des tests](./README_TESTS_MOCKS.md)
- 🎨 [Guide UI/UX](./DESIGN_ORGANIQUE_GUIDE.md)

## 🆘 Support

Problème non résolu? Ouvrez une issue sur GitHub avec:
1. Console logs (avec `verboseLogging: true`)
2. Navigateur et version
3. RAM disponible
4. Étapes pour reproduire

---

**Bon développement! 🚀**
