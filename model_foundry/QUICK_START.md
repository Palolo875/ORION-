# 🚀 Quick Start - ORION Model Foundry

Guide ultra-rapide pour créer votre premier agent hybride en 5 minutes.

## Étape 1 : Installation (30 secondes)

```bash
cd model_foundry
./foundry.sh init
```

**Note :** Nécessite Python 3.10+ et Poetry installés.

## Étape 2 : Voir les recettes disponibles (5 secondes)

```bash
./foundry.sh list
```

Vous devriez voir :
```
📋 Recettes disponibles:
  - dev-polyglot-v1.yml
  - creative-coder-v1.yml
  - data-analyst-v1.yml
```

## Étape 3 : Créer votre premier agent (10-30 minutes)

### Option A : Agent Dev Polyglot (Code + Multilingue)

```bash
./foundry.sh pipeline recipes/dev-polyglot-v1.yml
```

Cet agent combine :
- 60% CodeGemma (expert en code)
- 40% Qwen2 (expert multilingue)

**Résultat :** Un agent qui code en Python/JS/TS ET parle FR/EN/ES/DE/ZH

### Option B : Utiliser le Makefile

```bash
make dev-polyglot
```

## Étape 4 : Vérifier le résultat (10 secondes)

```bash
ls optimized_models/
```

Vous devriez voir un dossier comme `ORION-dev-polyglot-v1-q4f16_1/`

## Étape 5 : Intégrer dans ORION (2 minutes)

### A. Copier le modèle

```bash
cp -r optimized_models/ORION-dev-polyglot-v1-q4f16_1 \
      ../public/models/
```

### B. L'agent est déjà configuré!

Bonne nouvelle : nous avons déjà intégré l'agent dans ORION :

- ✅ Configuration ajoutée à `models.json`
- ✅ Agent créé : `src/oie/agents/hybrid-developer.ts`
- ✅ Optimisations configurées : `src/oie/types/optimization.types.ts`

### C. Tester l'agent

Lancez ORION et sélectionnez "ORION Dev Polyglot" dans l'interface.

## Et après ?

### Créer votre propre recette

```bash
cp recipes/dev-polyglot-v1.yml recipes/my-agent-v1.yml
nano recipes/my-agent-v1.yml
```

Modifiez les modèles et le ratio :

```yaml
models:
  - model: google/codegemma-2b
  - model: votre/modele-prefere

parameters:
  t: 0.5  # Ajustez le ratio
```

Puis créez l'agent :

```bash
./foundry.sh pipeline recipes/my-agent-v1.yml
```

### Commandes utiles

```bash
# Voir l'aide
make help

# Statistiques des modèles
make stats

# Nettoyer les fichiers temporaires
make clean

# Valider une recette
make validate-recipe RECIPE=recipes/my-agent-v1.yml
```

## Troubleshooting

### Erreur : "Poetry not found"

**Solution :** Installez Poetry :

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### Erreur : "Out of memory"

**Solutions :**

1. Fermez les applications gourmandes en RAM
2. Utilisez un serveur avec plus de RAM (16-32 GB recommandé)
3. Activez le swap :
   ```bash
   sudo fallocate -l 16G /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Le téléchargement des modèles échoue

**Solution :** Configurez votre token Hugging Face :

```bash
pip install huggingface-hub
huggingface-cli login
```

## Ressources

- 📖 [README complet](README.md)
- 📚 [Guide détaillé](../docs/MODEL_FOUNDRY_GUIDE.md)
- 🎯 [Exemples de recettes](recipes/)

## Support

- GitHub Issues : [Créer un ticket](#)
- Discord : [#model-foundry](#)
- Email : support@orion.ai

---

**Temps total estimé :** 15-35 minutes (selon votre connexion)

**Créé par l'équipe ORION** 🚀
