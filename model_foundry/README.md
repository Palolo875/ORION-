# ORION Model Foundry 🔨

> Pipeline de création, fusion et optimisation de modèles pour l'écosystème ORION

## 🎯 Vue d'ensemble

La **Model Foundry** (Fonderie de Modèles) est l'atelier où sont créés, fusionnés et optimisés les modèles IA qui alimentent l'Orion Inference Engine (OIE). C'est un pipeline Python séparé qui transforme des modèles bruts en variants optimisés pour le web.

## 🏗️ Architecture

```
model_foundry/
├── recipes/                  # Recettes de fusion au format YAML
│   ├── dev-polyglot-v1.yml  # Agent Développeur Polyglotte
│   └── ...
├── merged_models/            # Modèles fusionnés (sortie)
├── optimized_models/         # Modèles optimisés pour le web
├── scripts/
│   ├── merge_models.py      # Fusion de modèles avec mergekit
│   ├── quantize_model.py    # Quantification ONNX avec optimum
│   ├── shard_model.py       # Découpage en shards
│   └── optimize_pipeline.py # Pipeline complet
├── pyproject.toml           # Configuration Poetry
├── requirements.txt         # Dépendances Python
└── Makefile                 # Commandes automatisées
```

## 📦 Installation

### Prérequis

- Python 3.10+
- Poetry (gestionnaire de dépendances)
- CUDA (optionnel, pour accélération GPU)

### Installation rapide

```bash
cd model_foundry

# Option 1: Avec Poetry (recommandé)
poetry install

# Option 2: Avec pip
pip install -r requirements.txt
```

## 🚀 Quick Start

### 1. Créer un modèle hybride

```bash
# Activer l'environnement Poetry
poetry shell

# Fusionner deux modèles
mergekit-yaml recipes/dev-polyglot-v1.yml merged_models/ORION-Dev-Polyglot-v1
```

### 2. Optimiser pour le web

```bash
# Quantifier + Sharder en une commande
python optimize_pipeline.py \
  --model_path merged_models/ORION-Dev-Polyglot-v1 \
  --output_path ../public/models/ORION-Dev-Polyglot-v1-q4 \
  --quantization q4 \
  --shard_size 100
```

### 3. Utiliser dans l'OIE

Le modèle optimisé est automatiquement ajouté à `models.json` et prêt à être utilisé !

## 🧪 Recettes de Fusion

### Format d'une recette

Les recettes sont des fichiers YAML qui décrivent comment fusionner deux modèles ou plus.

```yaml
# recipes/dev-polyglot-v1.yml
models:
  - model: google/codegemma-2b-it
  - model: Qwen/Qwen2-1.5B-Instruct

merge_method: slerp  # Spherical Linear Interpolation

parameters:
  t: 0.4  # 60% premier modèle, 40% second modèle

dtype: bfloat16
```

### Méthodes de fusion disponibles

- **SLERP** (Spherical Linear Interpolation): Interpole les poids sur une sphère
- **Linear**: Moyenne pondérée simple
- **Task Arithmetic**: Fusion basée sur des tâches spécifiques
- **TIES**: Résolution des conflits de fusion
- **DARE**: Drop And REscale

## ⚙️ Stratégies d'optimisation

### Quantification

Réduit la précision des poids pour diminuer la taille du modèle.

| Niveau | Précision | Taille | Qualité | Cas d'usage |
|--------|-----------|--------|---------|-------------|
| **FP16** | 16-bit float | 100% | Excellente | Référence |
| **q4** | 4-bit int | ~25% | Très bonne | Défaut recommandé |
| **q3** | 3-bit int | ~19% | Bonne | Modèles robustes |
| **q2** | 2-bit int | ~12% | Correcte | Ultra-compact |

**Commande:**
```bash
python quantize_model.py \
  --model microsoft/Phi-3-mini-4k-instruct \
  --output optimized_models/Phi-3-mini-q3 \
  --quantization q3
```

### Sharding

Découpe un modèle en plusieurs fichiers pour chargement progressif.

**Avantages:**
- Chargement partiel du modèle
- Première inférence plus rapide
- Hydratation progressive en arrière-plan

**Commande:**
```bash
python shard_model.py \
  --model_path merged_models/ORION-Dev-Polyglot-v1 \
  --output_path optimized_models/ORION-Dev-Polyglot-v1-sharded \
  --shard_size 100  # Mo par shard
```

## 📊 Validation de qualité

Après optimisation, validez que le modèle fonctionne correctement:

```bash
# Tests automatisés
python scripts/validate_model.py \
  --model_path optimized_models/Phi-3-mini-q3 \
  --benchmark hellaswag,arc

# Test manuel
python scripts/test_inference.py \
  --model optimized_models/Phi-3-mini-q3 \
  --prompt "Écris une fonction Python qui..."
```

## 🎨 Modèles hybrides ORION

### ORION-Dev-Polyglot v1

**Fusion:** CodeGemma 2B + Qwen2 1.5B (ratio 60/40)
**Objectif:** Expert en code multilingue
**Avantages:** 
- Remplace 2 agents (CodeAgent + MultilingualAgent)
- Économise ~700 Mo de RAM
- Performance combinée supérieure

**Création:**
```bash
mergekit-yaml recipes/dev-polyglot-v1.yml merged_models/ORION-Dev-Polyglot-v1
python optimize_pipeline.py \
  --model_path merged_models/ORION-Dev-Polyglot-v1 \
  --output_path ../public/models/ORION-Dev-Polyglot-v1-q4 \
  --quantization q4 \
  --shard_size 100
```

## 🔧 Makefile - Commandes rapides

```bash
# Installer les dépendances
make install

# Créer tous les modèles hybrides
make build-all

# Créer un modèle spécifique
make build-dev-polyglot

# Nettoyer les fichiers temporaires
make clean

# Tests de validation
make test

# Afficher l'aide
make help
```

## 📝 Workflow de développement

### 1. Concevoir une recette

Créez une nouvelle recette dans `recipes/my-model-v1.yml`:

```yaml
models:
  - model: base/model-1
  - model: base/model-2

merge_method: slerp
parameters:
  t: 0.5

dtype: bfloat16
```

### 2. Tester la fusion

```bash
mergekit-yaml recipes/my-model-v1.yml merged_models/my-model-v1 --copy-tokenizer
```

### 3. Valider la qualité

```bash
python scripts/validate_model.py --model_path merged_models/my-model-v1
```

### 4. Optimiser pour production

```bash
python optimize_pipeline.py \
  --model_path merged_models/my-model-v1 \
  --output_path ../public/models/my-model-v1-q4 \
  --quantization q4 \
  --shard_size 100
```

### 5. Intégrer dans ORION

Ajoutez l'entrée dans `models.json`:

```json
{
  "my-custom-agent": {
    "id": "my-model-v1-q4",
    "name": "My Custom Model",
    "size_mb": 1200,
    "urls": {
      "base": "/models/my-model-v1-q4/"
    },
    "metadata": {
      "fusion": {
        "method": "slerp",
        "sources": ["base/model-1", "base/model-2"],
        "created_by": "ORION Model Foundry"
      }
    }
  }
}
```

## 🛡️ Bonnes pratiques

1. **Versionnez vos recettes** - Utilisez git pour tracker les changements
2. **Testez avant de fusionner** - Validez chaque modèle parent individuellement
3. **Documentez les ratios** - Notez pourquoi vous avez choisi un ratio spécifique
4. **Benchmarkez** - Mesurez la performance avant/après fusion
5. **Gardez les métadonnées** - Tracez l'origine de chaque modèle fusionné

## 🔬 Expérimentation

### Tester différents niveaux de quantification

```bash
# Créer plusieurs variants
for quant in q2 q3 q4; do
  python quantize_model.py \
    --model my-model \
    --output my-model-$quant \
    --quantization $quant
done

# Comparer les performances
python scripts/benchmark_variants.py my-model-*
```

### Trouver le ratio optimal

```bash
# Tester plusieurs ratios
for ratio in 0.3 0.4 0.5 0.6 0.7; do
  echo "Testing ratio $ratio"
  # Modifier la recette
  sed "s/t: .*/t: $ratio/" recipes/base.yml > recipes/test-$ratio.yml
  # Fusionner
  mergekit-yaml recipes/test-$ratio.yml merged_models/test-$ratio
  # Valider
  python scripts/validate_model.py --model_path merged_models/test-$ratio
done
```

## 📚 Ressources

- [Mergekit Documentation](https://github.com/cg123/mergekit)
- [Optimum ONNX Runtime](https://huggingface.co/docs/optimum/onnxruntime/overview)
- [ONNX Model Zoo](https://github.com/onnx/models)
- [Model Compression Techniques](https://arxiv.org/abs/2308.07633)

## 🤝 Contribution

Pour ajouter une nouvelle recette ou améliorer le pipeline:

1. Créez une branche: `git checkout -b feature/new-model`
2. Ajoutez votre recette dans `recipes/`
3. Testez: `make test`
4. Documentez dans ce README
5. Soumettez une PR

## 📄 Licence

Ce pipeline fait partie du projet ORION. Voir LICENSE à la racine du projet.

---

**Made with ❤️ by the ORION Team**
