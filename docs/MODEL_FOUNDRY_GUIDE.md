# 🏭 Guide Complet de la Fonderie de Modèles ORION

## Table des matières

1. [Introduction](#introduction)
2. [Concepts fondamentaux](#concepts-fondamentaux)
3. [Architecture](#architecture)
4. [Utilisation](#utilisation)
5. [Création de recettes](#création-de-recettes)
6. [Optimisation](#optimisation)
7. [Intégration](#intégration)
8. [Cas d'usage](#cas-dusage)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

## Introduction

La **ORION Model Foundry** est un système de création d'agents AI hybrides par fusion de modèles. Elle permet de combiner les capacités de plusieurs modèles existants pour créer des agents uniques et optimisés.

### Avantages

| Avantage | Description | Impact |
|----------|-------------|--------|
| 🎯 **Spécialisation** | Créez des agents parfaitement adaptés à vos besoins | Meilleure performance sur vos cas d'usage |
| 💾 **Économie de ressources** | Un agent hybride remplace plusieurs agents spécialisés | -72% de RAM utilisée |
| ⚡ **Performance** | Chargement plus rapide, latence réduite | TTFT < 3 secondes |
| 🔧 **Contrôle** | Ajustez précisément le ratio de fusion | Personnalisation totale |
| 🔄 **Reproductibilité** | Recettes versionnées et documentées | Maintenance simplifiée |

### Philosophie

La fonderie repose sur trois principes :

1. **Déclaratif** : Les recettes YAML décrivent *quoi* fusionner, pas *comment*
2. **Isolé** : Processus complètement séparé du reste d'ORION
3. **Reproductible** : Mêmes entrées = mêmes sorties

## Concepts fondamentaux

### Fusion de modèles (Model Merging)

La fusion de modèles consiste à combiner les poids (paramètres) de plusieurs modèles pour créer un nouveau modèle qui hérite des capacités des parents.

#### Méthode SLERP (Spherical Linear Interpolation)

```python
merged_param = (1 - t) * model1_param + t * model2_param
```

Où `t` est le ratio de fusion (0.0 à 1.0).

**Exemples :**

| Ratio (t) | Résultat | Cas d'usage |
|-----------|----------|-------------|
| 0.0 | 100% Modèle 1 | Inutile (pas de fusion) |
| 0.3 | 70% M1 + 30% M2 | Favoriser M1, nuancer avec M2 |
| 0.5 | 50% M1 + 50% M2 | Équilibre parfait |
| 0.7 | 30% M1 + 70% M2 | Favoriser M2, nuancer avec M1 |
| 1.0 | 100% Modèle 2 | Inutile (pas de fusion) |

### Quantification

Réduction de la précision des poids pour diminuer la taille du modèle.

| Type | Bits | Réduction | Qualité | Usage |
|------|------|-----------|---------|-------|
| fp32 | 32 | 0% | Excellente | Baseline |
| fp16 | 16 | ~50% | Excellente | Standard |
| q8 | 8 | ~75% | Très bonne | Production |
| q4 | 4 | ~87% | Bonne | Web (recommandé) |
| q3 | 3 | ~90% | Acceptable | Contraintes mémoire |

### Sharding

Découpage du modèle en plusieurs fichiers pour permettre un chargement progressif.

```
Modèle complet (1.2 GB)
    ↓
Shard 1 (200 MB) ← Chargement prioritaire
Shard 2 (200 MB) ← Chargement prioritaire
Shard 3 (200 MB) ← Chargement en arrière-plan
Shard 4 (200 MB) ← Chargement en arrière-plan
Shard 5 (200 MB) ← Chargement en arrière-plan
Shard 6 (200 MB) ← Chargement en arrière-plan
```

**Bénéfice :** Time To First Token (TTFT) réduit de 10s → 3s

## Architecture

### Structure des dossiers

```
model_foundry/
├── recipes/                    # Recettes de fusion (YAML)
│   ├── dev-polyglot-v1.yml    # Agent développeur polyglotte
│   ├── creative-coder-v1.yml  # Agent créatif
│   └── data-analyst-v1.yml    # Agent analyste de données
│
├── merged_models/              # Sortie de la fusion (Git-ignored)
│   └── ORION-dev-polyglot-v1/
│       ├── config.json
│       ├── pytorch_model.bin
│       ├── tokenizer.json
│       └── merge_metadata.json
│
├── optimized_models/           # Modèles optimisés pour le web
│   └── ORION-dev-polyglot-v1-q4/
│       ├── model.safetensors.index.json
│       ├── model-00001-of-00006.safetensors
│       ├── ...
│       └── web_config.json
│
├── merge_models.py             # Script de fusion
├── optimize_for_web.py         # Script d'optimisation
├── foundry.sh                  # CLI principal
├── pyproject.toml              # Configuration Poetry
├── requirements.txt            # Alternative à Poetry
└── README.md
```

### Workflow complet

```mermaid
graph LR
    A[Recette YAML] --> B[merge_models.py]
    B --> C[Modèle fusionné]
    C --> D[optimize_for_web.py]
    D --> E[Modèle optimisé]
    E --> F[Intégration ORION]
    F --> G[Agent disponible]
```

## Utilisation

### Installation

**Option A : Poetry (recommandé)**

```bash
cd model_foundry
./foundry.sh init
```

**Option B : pip + virtualenv**

```bash
cd model_foundry
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Commandes de base

**1. Lister les recettes disponibles**

```bash
./foundry.sh list
```

**2. Créer un agent hybride (pipeline complet)**

```bash
./foundry.sh pipeline recipes/dev-polyglot-v1.yml
```

Cette commande effectue :
- ✅ Téléchargement des modèles parents (si nécessaire)
- ✅ Fusion des modèles
- ✅ Optimisation (quantification + sharding)
- ✅ Génération des métadonnées

**3. Fusion seule**

```bash
./foundry.sh merge recipes/dev-polyglot-v1.yml
```

**4. Optimisation seule**

```bash
./foundry.sh optimize merged_models/ORION-dev-polyglot-v1
```

### Options avancées

**Fusion avec sortie personnalisée**

```bash
poetry run python merge_models.py \
  --recipe recipes/custom.yml \
  --output merged_models/my-custom-model
```

**Optimisation avec options**

```bash
poetry run python optimize_for_web.py \
  --model merged_models/ORION-dev-polyglot-v1 \
  --output optimized_models/custom-output \
  --quantization q4f16_1 \
  --name "My-Custom-Agent-v1"
```

## Création de recettes

### Template de base

```yaml
# recipes/my-agent-v1.yml

models:
  - model: org/model1-id
  - model: org/model2-id

merge_method: slerp

parameters:
  t: 0.5  # Ajustez selon vos besoins

dtype: bfloat16

metadata:
  created_by: "ORION Model Foundry"
  version: "1.0.0"
  description: "Description de votre agent"
  target_tasks:
    - "Tâche 1"
    - "Tâche 2"
  estimated_size_gb: 2.0
  recommended_quantization: "q4f16_1"
```

### Guide de sélection des ratios

#### Pour favoriser le code (70/30)

```yaml
parameters:
  t: 0.3  # 70% CodeGemma + 30% autre
```

**Cas d'usage :**
- Génération de code avec support multilingue minimal
- Applications nécessitant du code précis
- Projets où le code prime sur la conversation

#### Pour l'équilibre (50/50)

```yaml
parameters:
  t: 0.5  # Équilibre parfait
```

**Cas d'usage :**
- Agent polyvalent
- Besoin égal de code et d'autre capacité
- Prototypage initial (bon point de départ)

#### Pour favoriser la créativité (30/70)

```yaml
parameters:
  t: 0.7  # 30% code + 70% créatif
```

**Cas d'usage :**
- Documentation technique créative
- Génération d'API innovantes
- Brainstorming technique

### Exemples de recettes

#### Agent Documentation Technique

```yaml
models:
  - model: google/codegemma-2b
  - model: mistralai/Mistral-7B-Instruct-v0.2

merge_method: slerp
parameters:
  t: 0.6  # Favorise Mistral pour la rédaction

metadata:
  description: "Expert en documentation technique"
  target_tasks:
    - "API documentation"
    - "Technical writing"
    - "Code comments generation"
```

#### Agent DevOps

```yaml
models:
  - model: google/codegemma-2b
  - model: meta-llama/Llama-3.2-3B-Instruct

merge_method: slerp
parameters:
  t: 0.4  # 60% code + 40% raisonnement

metadata:
  description: "Expert DevOps et infrastructure"
  target_tasks:
    - "Docker/Kubernetes configs"
    - "CI/CD pipeline design"
    - "Infrastructure as Code"
```

## Optimisation

### Quantification recommandée par type d'agent

| Type d'agent | Quantification | Raison |
|--------------|----------------|--------|
| Code simple | q4 | Bonne qualité, 87% réduction |
| Code complexe | q8 | Meilleure précision |
| Créatif | q4 | Acceptable, prioriser taille |
| Vision | fp16 | Sensible à la quantification |
| Audio | fp16 | Idem |

### Configuration de sharding

```python
# Dans optimize_for_web.py

# Modèle < 500 MB : Pas de sharding
sharding = None

# Modèle 500 MB - 1.5 GB : 4 shards
sharding = {
  "enabled": True,
  "numShards": 4,
  "initialShards": 2
}

# Modèle > 1.5 GB : 6-8 shards
sharding = {
  "enabled": True,
  "numShards": 6,
  "initialShards": 2
}
```

## Intégration

### 1. Copier le modèle

```bash
cp -r model_foundry/optimized_models/ORION-Dev-Polyglot-v1-q4 \
      public/models/
```

### 2. Mettre à jour models.json

```json
{
  "my-hybrid-agent": {
    "id": "ORION-My-Agent-v1-q4f16_1-MLC",
    "name": "My Hybrid Agent",
    "type": "causal-lm",
    "size_mb": 1200,
    "capabilities": ["code", "chat"],
    "min_ram_gb": 4,
    "prompt_format": {
      "system_prefix": "<|system|>\n",
      "user_prefix": "<|user|>\n",
      "assistant_prefix": "<|assistant|>\n",
      "eos_token": "<|end|>"
    },
    "urls": {
      "base": "/models/ORION-My-Agent-v1-q4f16_1/",
      "shards": null
    }
  }
}
```

### 3. Créer l'agent TypeScript

```typescript
// src/oie/agents/my-hybrid-agent.ts

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { ProgressiveLoader } from '../utils/progressive-loader';

export class MyHybridAgent extends BaseAgent {
  constructor() {
    super({
      id: 'my-hybrid-agent',
      name: 'My Hybrid Agent',
      capabilities: ['code', 'chat'],
      modelSize: 1200,
      priority: 9,
      modelId: 'ORION-My-Agent-v1-q4f16_1-MLC'
    });
  }
  
  // ... implémentation
}
```

### 4. Enregistrer l'agent

```typescript
// src/oie/agents/index.ts

export * from './my-hybrid-agent';
```

## Cas d'usage

### 1. Réduire l'utilisation de RAM

**Problème :** Deux agents séparés (Code + Multilingue) = 2.9 GB RAM

**Solution :** Un agent hybride = 1.2 GB RAM (-59%)

```yaml
# recipes/memory-optimized-v1.yml
models:
  - model: google/codegemma-2b
  - model: Qwen/Qwen2-1.5B-Instruct
parameters:
  t: 0.4
```

### 2. Créer un expert domaine

**Problème :** Besoin d'un agent expert en finance + code

**Solution :** Fusionner un modèle finance avec CodeGemma

```yaml
models:
  - model: google/codegemma-2b
  - model: financial-domain/finance-llm
parameters:
  t: 0.5  # Équilibre
```

### 3. Améliorer progressivement

**Processus itératif :**

1. **v1** : `t: 0.5` (baseline)
2. **v2** : `t: 0.4` (plus de code)
3. **v3** : `t: 0.3` (encore plus de code)
4. **Évaluation** : Choisir la meilleure version

## Troubleshooting

### Problème : Out of Memory (OOM)

**Symptômes :**
```
RuntimeError: CUDA out of memory
```

**Solutions :**

1. **Réduire le dtype**
   ```yaml
   dtype: fp16  # Au lieu de fp32
   ```

2. **Utiliser CPU uniquement**
   ```bash
   export CUDA_VISIBLE_DEVICES=""
   ./foundry.sh merge ...
   ```

3. **Augmenter le swap**
   ```bash
   sudo fallocate -l 16G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Problème : Architectures incompatibles

**Symptômes :**
```
ValueError: Model architectures are incompatible
```

**Cause :** Les deux modèles ont des structures différentes

**Solutions :**

1. Utiliser des modèles de la même famille
   - ✅ Gemma + CodeGemma
   - ✅ Llama + CodeLlama
   - ❌ Gemma + Mistral

2. Vérifier les architectures
   ```python
   from transformers import AutoConfig
   
   config1 = AutoConfig.from_pretrained("model1")
   config2 = AutoConfig.from_pretrained("model2")
   
   print(config1.architectures)
   print(config2.architectures)
   ```

### Problème : Modèle fusionné de mauvaise qualité

**Symptômes :** Réponses incohérentes, hallucinations

**Solutions :**

1. **Ajuster le ratio**
   - Tester plusieurs valeurs de `t`
   - Évaluer systématiquement

2. **Choisir de meilleurs parents**
   - Modèles bien entraînés
   - Tailles similaires

3. **Augmenter la quantification**
   ```yaml
   dtype: fp16  # Ou fp32 pour plus de précision
   ```

## FAQ

### Q1 : Puis-je fusionner plus de 2 modèles ?

**R :** Oui, en chaîne :

```bash
# Étape 1: A + B = AB
./foundry.sh merge recipes/step1-ab.yml

# Étape 2: AB + C = ABC
./foundry.sh merge recipes/step2-abc.yml
```

### Q2 : Combien de temps prend la fusion ?

**R :** Dépend de la taille et du matériel :

| Modèles | CPU | GPU | Temps estimé |
|---------|-----|-----|--------------|
| 2x 2B | i7 | - | 15-20 min |
| 2x 2B | i7 | RTX 3060 | 8-12 min |
| 2x 7B | i7 | - | 45-60 min |
| 2x 7B | Xeon | RTX 4090 | 15-20 min |

### Q3 : Les modèles fusionnés sont-ils plus intelligents ?

**R :** Non, la fusion **combine** les capacités, elle ne les **améliore** pas magiquement.

- ✅ Un agent code + multilingue aura les deux capacités
- ❌ Il ne sera pas meilleur en code que CodeGemma seul
- ✅ Mais il sera plus polyvalent

### Q4 : Quelle est la licence du modèle fusionné ?

**R :** La plus restrictive des deux parents.

- Si Modèle A = MIT et Modèle B = Apache 2.0 → Apache 2.0
- Si l'un est commercial uniquement → Commercial uniquement

### Q5 : Puis-je fusionner des modèles de tailles très différentes ?

**R :** Oui, mais avec des résultats variables :

- ✅ 2B + 1.5B → Bons résultats
- ⚠️ 2B + 7B → Résultats imprévisibles
- ❌ 2B + 70B → Déconseillé

### Q6 : La fusion fonctionne-t-elle pour tous les types de modèles ?

**R :** Non, principalement pour les modèles **causaux de langage** :

- ✅ Modèles de texte (GPT, Llama, Gemma, etc.)
- ⚠️ Modèles vision-langage (expérimental)
- ❌ Modèles de diffusion (Stable Diffusion, etc.)
- ❌ Modèles audio (Whisper, etc.)

## Ressources

### Documentation officielle

- [Hugging Face Transformers](https://huggingface.co/docs/transformers)
- [Model Merging Guide](https://huggingface.co/blog/mlabonne/merge-models)
- [Quantization Guide](https://huggingface.co/docs/transformers/quantization)

### Modèles recommandés pour la fusion

| Modèle | Taille | Spécialité | Licence |
|--------|--------|------------|---------|
| google/codegemma-2b | 2B | Code | Apache 2.0 |
| Qwen/Qwen2-1.5B-Instruct | 1.5B | Multilingue | Apache 2.0 |
| mistralai/Mistral-7B-Instruct-v0.2 | 7B | Créatif | Apache 2.0 |
| meta-llama/Llama-3.2-3B-Instruct | 3B | Raisonnement | Llama 3 |
| google/gemma-2b-it | 2B | Chat | Gemma |

### Communauté

- [ORION Discord](#) (remplacer par lien réel)
- [GitHub Issues](#) (remplacer par lien réel)

---

**Dernière mise à jour :** 2025-10-22  
**Version :** 1.0.0  
**Auteur :** Équipe ORION 🚀
