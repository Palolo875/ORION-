# Pipeline de Gestion des Modèles ORION

Ce dossier contient les outils pour gérer, optimiser et déployer les modèles LLM pour ORION.

## 🎯 Vue d'ensemble

Le pipeline ORION comprend trois outils principaux:

1. **Quantification** (`quantize-model.py`) - Réduction de taille
2. **Fusion** (`merge-models.py`) - Création de modèles hybrides  
3. **Sharding** (`shard-model.py`) - Chargement progressif

## 📦 Installation des dépendances

```bash
# Dépendances Python de base
pip install torch transformers safetensors

# Pour la quantification
pip install optimum[onnxruntime] onnx

# Pour la fusion de modèles
git clone https://github.com/cg123/mergekit.git
cd mergekit && pip install -e .

# Optionnel: PyYAML pour les configurations
pip install pyyaml
```

## 🔧 Outils disponibles

### 1. Quantification de modèles

Réduit la taille d'un modèle de 50-75% avec une perte de qualité minimale.

**Usage:**
```bash
# Quantification standard (Q4)
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-q4 \
  --level q4

# Quantification agressive (Q2) pour taille minimale
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-q2 \
  --level q2 \
  --test
```

**Niveaux de quantification:**
- `q4` (défaut): 4-bit, meilleur compromis (~75% de réduction)
- `q3`: 3-bit, très agressif (~85% de réduction)
- `q2`: 2-bit, ultra-compact (~90% de réduction, qualité réduite)

**Résultat:**
```
models/phi-3-q4/
├── quantized/          # Modèle quantifié
│   ├── model.onnx
│   └── tokenizer/
├── metadata.json       # Métadonnées
└── onnx/              # Modèle ONNX intermédiaire
```

### 2. Fusion de modèles

Crée des modèles hybrides en fusionnant plusieurs modèles.

**Usage:**
```bash
# Fusion linéaire (moyenne pondérée)
python scripts/merge-models.py \
  --models microsoft/phi-3-mini-4k-instruct TinyLlama/TinyLlama-1.1B-Chat-v1.0 \
  --ratios 0.7 0.3 \
  --output models/phi-tiny-hybrid \
  --method linear

# Fusion SLERP (sphérique - préserve mieux les propriétés)
python scripts/merge-models.py \
  --models microsoft/phi-3-mini-4k-instruct meta-llama/Llama-2-7b-chat-hf \
  --ratios 0.5 0.5 \
  --method slerp \
  --output models/phi-llama-slerp

# Fusion TIES (intelligente - élection des meilleurs paramètres)
python scripts/merge-models.py \
  --models model1 model2 model3 \
  --ratios 0.5 0.3 0.2 \
  --method ties \
  --output models/ensemble
```

**Méthodes de fusion:**
- `linear`: Moyenne pondérée simple (rapide)
- `slerp`: Interpolation sphérique (2 modèles uniquement, préserve mieux)
- `ties`: Trim, Elect, and Merge (intelligent, plusieurs modèles)
- `dare`: Drop And REscale (avec dropout, robuste)

**Cas d'usage:**
- **Spécialisation**: Fusionner un modèle général + un modèle spécialisé (code, maths)
- **Multilingue**: Combiner des modèles de différentes langues
- **Taille optimale**: Mélanger un grand modèle (qualité) + un petit modèle (rapidité)

### 3. Sharding de modèles

Découpe un modèle en morceaux pour un chargement progressif.

**Usage:**
```bash
# Sharding en 4 morceaux
python scripts/shard-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-sharded \
  --shards 4

# Sharding avec taille max par shard
python scripts/shard-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-sharded \
  --max-shard-size 500

# Sharding d'un modèle local
python scripts/shard-model.py \
  --model ./models/custom_model \
  --output models/custom_sharded \
  --shards 8
```

**Résultat:**
```
models/phi-3-sharded/
├── shard_00.safetensors  # Premier shard (essentiel)
├── shard_01.safetensors
├── shard_02.safetensors
├── shard_03.safetensors
├── shard_manifest.json   # Manifeste de chargement
├── config.json           # Configuration du modèle
├── tokenizer.json        # Tokenizer
└── SHARDING_INFO.md      # Documentation
```

**Avantages:**
- ⚡ **TTFT optimisé**: Premier token en quelques secondes
- 📦 **Chargement progressif**: Utilisable avant chargement complet
- 💾 **Optimisation mémoire**: Charge seulement ce qui est nécessaire

## 🎬 Workflows recommandés

### Workflow 1: Optimisation d'un modèle standard

```bash
# 1. Télécharger et quantifier
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-optimized \
  --level q4

# 2. Sharder pour chargement progressif
python scripts/shard-model.py \
  --model models/phi-3-optimized/quantized \
  --output models/phi-3-production \
  --shards 4
```

Résultat: Modèle 75% plus petit, chargement 5x plus rapide

### Workflow 2: Création d'un modèle spécialisé

```bash
# 1. Fusionner un modèle général + spécialisé
python scripts/merge-models.py \
  --models microsoft/phi-3-mini-4k-instruct google/codegemma-2b \
  --ratios 0.6 0.4 \
  --method slerp \
  --output models/phi-code-hybrid

# 2. Quantifier le résultat
python scripts/quantize-model.py \
  --model models/phi-code-hybrid/merged \
  --output models/phi-code-optimized \
  --level q4

# 3. Sharder
python scripts/shard-model.py \
  --model models/phi-code-optimized/quantized \
  --output models/phi-code-production \
  --shards 4
```

Résultat: Modèle hybride optimisé pour le code, ultra-compact

### Workflow 3: Pipeline complet pour production

```bash
# Script automatisé
cat > optimize-for-production.sh << 'EOF'
#!/bin/bash
MODEL=$1
OUTPUT_DIR=$2

echo "🚀 Optimisation de $MODEL pour production..."

# Étape 1: Quantification
echo "1️⃣ Quantification..."
python scripts/quantize-model.py \
  --model $MODEL \
  --output ${OUTPUT_DIR}/quantized \
  --level q4

# Étape 2: Sharding
echo "2️⃣ Sharding..."
python scripts/shard-model.py \
  --model ${OUTPUT_DIR}/quantized/quantized \
  --output ${OUTPUT_DIR}/production \
  --shards 4

# Étape 3: Mise à jour du registry
echo "3️⃣ Mise à jour du Model Registry..."
# Ajouter au models.json...

echo "✅ Optimisation terminée!"
echo "📁 Modèle disponible: ${OUTPUT_DIR}/production"
EOF

chmod +x optimize-for-production.sh

# Utilisation
./optimize-for-production.sh microsoft/phi-3-mini-4k-instruct models/phi-3
```

## 📊 Comparaison des optimisations

| Technique | Réduction taille | Impact qualité | Vitesse | Cas d'usage |
|-----------|------------------|----------------|---------|-------------|
| **Quantification Q4** | ~75% | Minimal (~2%) | ++ | Standard, recommandé |
| **Quantification Q3** | ~85% | Léger (~5%) | +++ | Appareils limités |
| **Quantification Q2** | ~90% | Moyen (~10%) | ++++ | Prototypes, tests |
| **Fusion SLERP** | Variable | Minimal | + | Spécialisation |
| **Fusion TIES** | Variable | Minimal | + | Ensembles multi-tâches |
| **Sharding** | 0% | Aucun | ++++ (TTFT) | Production, UX |

## 🔗 Intégration avec ORION

### Model Registry

Tous les modèles optimisés doivent être référencés dans `/models.json`:

```json
{
  "models": {
    "custom-agent": {
      "id": "phi-3-optimized-q4",
      "name": "Phi-3 Optimisé",
      "type": "causal-lm",
      "size_mb": 512,
      "urls": {
        "base": "/models/phi-3-production",
        "shards": [
          "/models/phi-3-production/shard_00.safetensors",
          "/models/phi-3-production/shard_01.safetensors",
          "/models/phi-3-production/shard_02.safetensors",
          "/models/phi-3-production/shard_03.safetensors"
        ]
      }
    }
  }
}
```

### Chargement dans ORION

```typescript
import { ProgressiveLoader } from '@/oie/utils/progressive-loader';

// Initialiser le registry
await ProgressiveLoader.initializeRegistry('/models.json');

// Charger avec Web Worker et sharding
const result = await ProgressiveLoader.loadFromRegistry(
  'custom-agent',
  {
    useWorker: true,
    shardingConfig: {
      enabled: true,
      numShards: 4,
      initialShards: 1 // TTFT optimisé
    },
    onProgress: (progress) => {
      console.log(`Chargement: ${progress.progress * 100}%`);
    }
  }
);

console.log('Modèle prêt!', result.stats);
```

## 🎯 Meilleures pratiques

### 1. Choix de la quantification

- **Production web**: Q4 (meilleur compromis)
- **Mobile/Edge**: Q3 (taille critique)
- **Prototypes**: Q2 (rapidité de développement)

### 2. Fusion de modèles

- **2 modèles similaires**: SLERP
- **3+ modèles**: TIES ou DARE
- **Rapidité importante**: Linear

### 3. Sharding

- **Modèles < 1GB**: 2-4 shards
- **Modèles 1-5GB**: 4-8 shards
- **Modèles > 5GB**: 8-16 shards

### 4. Testing

Toujours tester le modèle optimisé:

```bash
# Test après quantification
python scripts/quantize-model.py --model ... --test

# Test manuel
python << EOF
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("models/output")
tokenizer = AutoTokenizer.from_pretrained("models/output")

inputs = tokenizer("Bonjour, comment vas-tu?", return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=50)
print(tokenizer.decode(outputs[0]))
EOF
```

## 📚 Ressources

- [mergekit Documentation](https://github.com/cg123/mergekit)
- [ONNX Runtime Quantization](https://onnxruntime.ai/docs/performance/quantization.html)
- [SafeTensors Format](https://huggingface.co/docs/safetensors)
- [WebLLM Documentation](https://webllm.mlc.ai/)

## 🐛 Dépannage

### Erreur: "Out of memory"

```bash
# Réduire la taille du batch ou utiliser low_cpu_mem_usage
python scripts/quantize-model.py --model ... --low-cpu-mem
```

### Erreur: "Model architecture not compatible"

```bash
# Utiliser --allow-crimes avec mergekit (expérimental)
# Voir merge-models.py ligne 89
```

### Modèle quantifié donne des résultats étranges

```bash
# Essayer Q4 au lieu de Q2/Q3
# Vérifier que le modèle source est compatible avec ONNX
```

## 📝 Notes

- Les scripts créent automatiquement des fichiers `metadata.json` avec toutes les infos
- Les shards sont au format `.safetensors` (plus sûr que `.bin`)
- Le Model Registry est validé par `models.schema.json`
- Tous les scripts supportent `--help` pour plus d'options

## 🚀 Prochaines étapes

1. Ajouter support pour d'autres formats (GGUF, GPTQ)
2. Automatiser le benchmark des modèles optimisés
3. Intégrer avec CI/CD pour optimisation automatique
4. Dashboard web pour gérer le pipeline
