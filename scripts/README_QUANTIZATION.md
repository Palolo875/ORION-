# Pipeline de Quantification ORION

Ce dossier contient les outils pour quantifier et optimiser les modèles d'IA utilisés par ORION.

## 📋 Prérequis

### Installation des dépendances Python

```bash
pip install optimum[onnxruntime] onnx transformers torch
```

### Configuration système

- **RAM**: Minimum 16 GB recommandé pour quantifier des modèles de 2-4 GB
- **Espace disque**: Au moins 3x la taille du modèle original
- **CPU**: AVX512 recommandé pour de meilleures performances (optionnel)

## 🚀 Utilisation

### Quantification Standard (Q4)

La quantification Q4 est le meilleur équilibre entre taille et qualité:

```bash
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-q4 \
  --test
```

**Résultat attendu:**
- Taille originale: ~7 GB (FP32)
- Taille ONNX: ~3.5 GB (FP16)
- Taille Q4: ~1.8 GB
- Compression: ~50%

### Quantification Agressive (Q2)

Pour une taille minimale au prix d'une légère perte de qualité:

```bash
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-q2 \
  --level q2 \
  --test
```

**Résultat attendu:**
- Taille Q2: ~900 MB
- Compression: ~75%
- ⚠️ Légère dégradation possible de la qualité

### Quantification Intermédiaire (Q3)

Compromis entre Q4 et Q2:

```bash
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-q3 \
  --level q3
```

## 📊 Niveaux de Quantification

| Niveau | Taille | Qualité | Vitesse | Usage recommandé |
|--------|--------|---------|---------|------------------|
| Q4     | ~1.8 GB | Excellente | Rapide | Production standard |
| Q3     | ~1.2 GB | Bonne | Très rapide | Équilibre taille/qualité |
| Q2     | ~900 MB | Acceptable | Très rapide | Appareils limités |

## 🔧 Options Avancées

### Sans AVX512 (pour compatibilité ARM)

```bash
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-q4 \
  --no-avx512
```

### Batch Quantification

Pour quantifier plusieurs modèles:

```bash
# Créez un script batch
#!/bin/bash

models=(
  "microsoft/phi-3-mini-4k-instruct"
  "meta-llama/Llama-2-7b-chat-hf"
  "mistralai/Mistral-7B-Instruct-v0.2"
)

for model in "${models[@]}"; do
  model_name=$(basename $model)
  python scripts/quantize-model.py \
    --model "$model" \
    --output "models/${model_name}-q4" \
    --level q4
done
```

## 📁 Structure de Sortie

Après quantification, le dossier de sortie contient:

```
models/phi-3-q4/
├── onnx/                    # Modèle ONNX intermédiaire
│   ├── config.json
│   ├── model.onnx
│   └── ...
├── quantized/               # Modèle quantifié (À UTILISER)
│   ├── config.json
│   ├── model_quantized.onnx
│   ├── tokenizer.json
│   ├── tokenizer_config.json
│   └── special_tokens_map.json
└── metadata.json            # Métadonnées de quantification
```

## 🌐 Hébergement des Modèles

### Option 1: Hugging Face Hub

```bash
# Installer huggingface_hub
pip install huggingface_hub

# Upload du modèle
huggingface-cli upload \
  votre-username/phi-3-q4-orion \
  models/phi-3-q4/quantized \
  --repo-type model
```

### Option 2: Serveur Personnel

Hébergez le dossier `quantized/` sur votre serveur web:

```nginx
# Configuration Nginx exemple
location /models/ {
    root /var/www/orion;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=31536000";
}
```

### Option 3: CDN (Vercel, Netlify)

Uploadez le dossier `quantized/` dans votre dépôt et configurez le CDN.

## 🔗 Utilisation dans ORION

Une fois le modèle quantifié et hébergé, modifiez votre agent:

```typescript
// src/oie/agents/conversation-agent.ts
export class ConversationAgent extends BaseAgent {
  constructor() {
    super({
      id: 'conversation-agent',
      name: 'Agent Conversation',
      capabilities: ['conversation'],
      modelSize: 1800, // Taille en MB
      priority: 10,
      // Changez cette URL vers votre modèle hébergé
      modelId: 'https://votre-cdn.com/models/phi-3-q4'
    });
  }
}
```

## ✅ Validation de la Qualité

### Test Automatique

Le script peut tester automatiquement le modèle:

```bash
python scripts/quantize-model.py \
  --model microsoft/phi-3-mini-4k-instruct \
  --output models/phi-3-q4 \
  --test
```

### Test Manuel

```python
from optimum.onnxruntime import ORTModelForCausalLM
from transformers import AutoTokenizer

model_path = "models/phi-3-q4/quantized"
model = ORTModelForCausalLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

# Test de génération
prompt = "Explique-moi la quantification de modèles IA"
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0]))
```

### Benchmarks Recommandés

Pour évaluer objectivement la qualité:

```bash
# Installer lm-evaluation-harness
pip install lm-eval

# Évaluer le modèle
lm_eval --model ort \
  --model_args pretrained=models/phi-3-q4/quantized \
  --tasks arc_easy,hellaswag \
  --device cpu
```

## 🐛 Dépannage

### Erreur: Out of Memory

```bash
# Augmentez la swap ou utilisez un serveur cloud
# Exemple avec AWS EC2 t3.xlarge (16 GB RAM)
```

### Erreur: AVX512 non supporté

```bash
# Utilisez --no-avx512
python scripts/quantize-model.py --model ... --no-avx512
```

### Modèle trop gros pour le téléchargement

```bash
# Utilisez git-lfs pour les gros fichiers
git lfs install
git lfs track "*.onnx"
```

## 📚 Ressources Complémentaires

- [Documentation Optimum](https://huggingface.co/docs/optimum)
- [Guide ONNX Runtime](https://onnxruntime.ai/docs/)
- [Quantization Deep Dive](https://huggingface.co/docs/optimum/concept_guides/quantization)

## 🎯 Roadmap

- [ ] Support de la quantification dynamique
- [ ] Sharding automatique des modèles
- [ ] Interface web pour la quantification
- [ ] Benchmarking automatisé
- [ ] Support des modèles multimodaux

---

**Note**: Ce pipeline fait partie du "Chantier 3: Opération Poids Plume" d'ORION.
