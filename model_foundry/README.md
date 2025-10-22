# 🏭 ORION Model Foundry

**Fonderie de Modèles AI pour ORION** - Créez, fusionnez et optimisez vos propres modèles d'IA

## 📋 Vue d'ensemble

La Model Foundry est un environnement dédié pour créer des agents AI hybrides en fusionnant des modèles existants. Elle permet de combiner les forces de plusieurs modèles pour créer des agents uniques et optimisés pour des tâches spécifiques.

### Pourquoi fusionner des modèles ?

- **Combiner des expertises** : Créez un agent qui excelle en code ET en multilingue
- **Réduire la complexité** : Un seul modèle au lieu de deux agents séparés
- **Optimiser les ressources** : Moins de RAM, moins de temps de chargement
- **Personnaliser** : Ajustez le ratio pour privilégier certaines capacités

## 🏗️ Architecture

```
model_foundry/
├── recipes/              # Recettes de fusion (YAML)
│   └── dev-polyglot-v1.yml
├── merged_models/        # Modèles fusionnés (sortie brute)
├── optimized_models/     # Modèles optimisés pour le web
├── merge_models.py       # Script de fusion
├── optimize_for_web.py   # Script d'optimisation
├── foundry.sh           # Orchestrateur principal
├── pyproject.toml       # Configuration Poetry
└── README.md
```

## 🚀 Démarrage rapide

### 1. Installation

**Prérequis :**
- Python 3.10+
- Poetry ([Installation](https://python-poetry.org/docs/#installation))
- 16 GB RAM minimum (recommandé: 32 GB)
- GPU optionnel (accélère le processus)

**Initialiser l'environnement :**

```bash
cd model_foundry
./foundry.sh init
```

Ceci installera toutes les dépendances nécessaires dans un environnement virtuel isolé.

### 2. Voir les recettes disponibles

```bash
./foundry.sh list
```

### 3. Créer votre premier agent hybride

**Option A : Pipeline complet (recommandé)**

```bash
./foundry.sh pipeline recipes/dev-polyglot-v1.yml
```

Cette commande effectue automatiquement :
1. La fusion des modèles
2. L'optimisation pour le web
3. La création des métadonnées

**Option B : Étape par étape**

```bash
# 1. Fusionner les modèles
./foundry.sh merge recipes/dev-polyglot-v1.yml

# 2. Optimiser pour le web
./foundry.sh optimize merged_models/ORION-dev-polyglot-v1
```

## 📝 Créer une recette personnalisée

Une recette est un fichier YAML qui décrit comment fusionner des modèles.

### Structure d'une recette

```yaml
# recipes/my-custom-agent-v1.yml

models:
  - model: google/codegemma-2b        # Modèle 1
  - model: Qwen/Qwen2-1.5B-Instruct   # Modèle 2

merge_method: slerp  # Méthode de fusion

parameters:
  t: 0.4  # Ratio: 0.0 = 100% modèle 1, 1.0 = 100% modèle 2

dtype: bfloat16  # Précision (bfloat16 recommandé)

metadata:
  description: "Mon agent personnalisé"
  capabilities: ["code", "chat"]
```

### Paramètres de fusion

- **t = 0.0** : 100% du premier modèle
- **t = 0.3** : 70% premier modèle + 30% second
- **t = 0.5** : Équilibre parfait (50/50)
- **t = 0.7** : 30% premier modèle + 70% second
- **t = 1.0** : 100% du second modèle

**Exemple :** Pour un agent qui privilégie le code mais avec un support multilingue :
- `t: 0.3` → 70% CodeGemma + 30% Qwen2

### Exemples de recettes

**Agent Documentation (Expert en rédaction technique) :**

```yaml
models:
  - model: google/gemma-2b-it
  - model: mistralai/Mistral-7B-Instruct-v0.2

merge_method: slerp
parameters:
  t: 0.6  # Favorise Mistral pour la créativité

metadata:
  description: "Expert en documentation technique"
```

**Agent Analyse de Données (Code + Maths) :**

```yaml
models:
  - model: google/codegemma-2b
  - model: meta-llama/Llama-3.2-3B-Instruct

merge_method: slerp
parameters:
  t: 0.5  # Équilibre code/raisonnement

metadata:
  description: "Analyse de données et visualisation"
```

## 🔧 Utilisation avancée

### Scripts Python directement

**Fusion avec options personnalisées :**

```bash
poetry run python merge_models.py \
  --recipe recipes/dev-polyglot-v1.yml \
  --output merged_models/my-custom-name
```

**Optimisation avec quantification :**

```bash
poetry run python optimize_for_web.py \
  --model merged_models/ORION-dev-polyglot-v1 \
  --output optimized_models/custom-output \
  --quantization q4f16_1 \
  --name "ORION-Custom-Agent-v1"
```

### Types de quantification

- `q4f16_1` : Quantification 4-bit (recommandé, ~70% de réduction)
- `q8` : Quantification 8-bit (~50% de réduction)
- `fp16` : Float 16-bit (~50% de réduction)
- `fp32` : Float 32-bit (aucune compression)

## 🔗 Intégration dans ORION

Une fois votre modèle créé et optimisé :

### 1. Ajouter au model registry

Éditez `/workspace/models.json` :

```json
{
  "models": {
    "hybrid-developer": {
      "id": "ORION-Dev-Polyglot-v1-q4f16_1-MLC",
      "name": "ORION Dev Polyglot",
      "type": "causal-lm",
      "size_mb": 1200,
      "quality": "high",
      "speed": "fast",
      "description": "Agent hybride code + multilingue",
      "capabilities": ["code", "multilingual", "chat", "reasoning"],
      "min_ram_gb": 4,
      "prompt_format": {
        "system_prefix": "<|system|>\n",
        "user_prefix": "<|user|>\n",
        "assistant_prefix": "<|assistant|>\n",
        "eos_token": "<|end|>"
      },
      "urls": {
        "base": "/models/ORION-Dev-Polyglot-v1-q4f16_1/",
        "shards": null
      },
      "config": {
        "max_tokens": 4096,
        "temperature": 0.5,
        "top_p": 0.9
      }
    }
  }
}
```

### 2. Créer l'agent correspondant

Créez `/workspace/src/oie/agents/hybrid-developer.ts` :

```typescript
/**
 * Agent Hybrid Developer - Expert en code + multilingue
 * Modèle fusionné: CodeGemma 2B + Qwen2 1.5B
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { OPTIMIZATION_PRESETS } from '../types/optimization.types';
import { ProgressiveLoader } from '../utils/progressive-loader';

export class HybridDeveloperAgent extends BaseAgent {
  private engine: any = null;
  
  constructor() {
    super({
      id: 'hybrid-developer',
      name: 'Hybrid Developer',
      capabilities: ['code_generation', 'multilingual', 'chat'],
      modelSize: 1200,
      priority: 9,
      modelId: 'ORION-Dev-Polyglot-v1-q4f16_1-MLC'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[HybridDeveloper] Chargement du modèle hybride...`);
    
    const result = await ProgressiveLoader.loadModel(
      this.metadata.modelId,
      { enabled: true, numShards: 4, initialShards: 1 },
      (progress) => {
        console.log(`[HybridDeveloper] ${(progress.progress * 100).toFixed(1)}%`);
      }
    );
    
    this.engine = result.engine;
  }
  
  protected async unloadModel(): Promise<void> {
    if (this.engine) {
      this.engine = null;
    }
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    const messages = [
      {
        role: 'system',
        content: `Tu es un développeur expert polyglotte. Tu maitrises:
- Programmation: Python, JavaScript, TypeScript, et plus
- Langues: Français, Anglais, Espagnol, Chinois, et plus
Fournis des réponses précises et bien structurées.`
      },
      {
        role: 'user',
        content: input.content
      }
    ];
    
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: input.temperature || 0.5,
      max_tokens: input.maxTokens || 2000
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 85,
      processingTime: 0
    };
  }
}
```

### 3. Enregistrer l'agent

Éditez `/workspace/src/oie/agents/index.ts` :

```typescript
export { HybridDeveloperAgent } from './hybrid-developer';
```

## 📊 Métriques et statistiques

### Tailles typiques

| Modèle | Original | Fusionné | Optimisé (q4) | Gain |
|--------|----------|----------|---------------|------|
| CodeGemma 2B | 2.5 GB | - | - | - |
| Qwen2 1.5B | 1.8 GB | - | - | - |
| **Dev Polyglot** | - | 4.3 GB | **1.2 GB** | **72%** |

### Performance

- **Temps de fusion** : 10-30 minutes (selon CPU/GPU)
- **Temps d'optimisation** : 5-15 minutes
- **Chargement dans le navigateur** : ~3-5 secondes (avec sharding)

## 🔬 Cas d'usage avancés

### 1. Agent spécialisé domaine

Fusionnez un modèle général avec un modèle spécialisé (médical, juridique, etc.)

### 2. Amélioration progressive

Créez des versions itératives (v1, v2, v3) en ajustant le ratio

### 3. Multi-fusion

Fusionnez plus de 2 modèles en chaîne :
```bash
# Fusion A + B = AB
./foundry.sh merge recipes/step1-ab.yml

# Fusion AB + C = ABC
./foundry.sh merge recipes/step2-abc.yml
```

## ⚠️ Limitations et considérations

1. **Compatibilité architecturale** : Les modèles doivent avoir des architectures compatibles
2. **Qualité variable** : La fusion ne garantit pas toujours de meilleurs résultats
3. **Taille** : Le modèle fusionné peut être plus gros que les parents
4. **Licence** : Respectez les licences des modèles sources
5. **Ressources** : La fusion nécessite beaucoup de RAM (2-3x la taille des modèles)

## 🐛 Dépannage

### Erreur : "Out of memory"

- **Solution** : Utilisez un serveur avec plus de RAM ou activez le swap
- Fermez les applications gourmandes en mémoire
- Utilisez `dtype: fp16` au lieu de `fp32`

### Erreur : "Model architectures incompatible"

- **Solution** : Vérifiez que les deux modèles ont des architectures similaires
- Privilégiez les modèles de la même famille (ex: Gemma + CodeGemma)

### Les modèles ne se téléchargent pas

- **Solution** : Vérifiez votre connexion internet
- Configurez votre token Hugging Face : `huggingface-cli login`
- Certains modèles nécessitent une acceptation de licence

## 📚 Ressources

- [Hugging Face Model Hub](https://huggingface.co/models)
- [Transformers Documentation](https://huggingface.co/docs/transformers)
- [Model Merging Guide](https://huggingface.co/blog/mlabonne/merge-models)
- [ORION Documentation](../README.md)

## 🤝 Contribution

Pour suggérer des améliorations ou partager vos recettes :

1. Créez une nouvelle recette dans `recipes/`
2. Documentez les résultats obtenus
3. Partagez vos trouvailles avec l'équipe

## 📝 Changelog

### Version 1.0.0 (2025-10-22)

- ✨ Système de fusion par moyenne pondérée (SLERP)
- ✨ Optimisation automatique pour le web
- ✨ Support de la quantification multi-niveaux
- ✨ Sharding automatique pour chargement progressif
- ✨ Interface CLI avec `foundry.sh`
- 📝 Recette exemple : Dev Polyglot v1
- 📚 Documentation complète

## 📄 Licence

Ce projet fait partie d'ORION et suit la même licence.

---

**Créé avec ❤️ par l'équipe ORION** 🚀
