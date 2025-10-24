# 🚀 Guide de Démarrage - Création des Modèles ORION

**Date:** 24 octobre 2025  
**Statut:** ✅ Environnement prêt

---

## ✅ Ce qui est déjà fait

- ✅ Python 3.13 installé
- ✅ PyTorch et Transformers installés
- ✅ Mergekit installé
- ✅ 114 Go d'espace disque disponible
- ✅ 15 Go de RAM
- ✅ 3 recettes ORION créées
- ✅ Makefile optimisé
- ✅ Script de build automatique

---

## 🎯 Options de lancement

### Option 1: Build complet (recommandé)

Créer les 3 modèles ORION en une seule commande (2-3 heures):

```bash
cd /workspace/model_foundry

# Lancer en arrière-plan
nohup ./build_orion_models.sh all > build_all.log 2>&1 &

# Suivre la progression
tail -f build_all.log
```

### Option 2: Build individuel

Créer un seul modèle à la fois:

```bash
cd /workspace/model_foundry

# 1. ORION Code & Logic (~30-45 min)
nohup ./build_orion_models.sh code-logic > build_code.log 2>&1 &

# 2. ORION Creative & Multilingual (~30-45 min)
nohup ./build_orion_models.sh creative > build_creative.log 2>&1 &

# 3. ORION Vision & Logic (~40-60 min)
nohup ./build_orion_models.sh vision > build_vision.log 2>&1 &
```

### Option 3: Avec Makefile

```bash
cd /workspace/model_foundry

# Voir les commandes disponibles
make help

# Build tout
nohup make build-all-orion > build.log 2>&1 &

# Ou build individuel
make build-code-logic
make build-creative
make build-vision
```

---

## 📊 Suivre la progression

### Voir les logs en temps réel

```bash
# Pour le script
tail -f build_all.log

# Pour le Makefile
tail -f build.log
```

### Vérifier le processus

```bash
# Voir si le processus tourne
ps aux | grep -E "build_orion|mergekit|python"

# Voir l'utilisation RAM
free -h

# Voir l'espace disque
df -h /workspace
```

### Vérifier les modèles créés

```bash
# Lister les modèles en cours de création
ls -lh /workspace/model_foundry/merged_models/

# Lister les modèles finaux
ls -lh /workspace/public/models/ORION-*/
```

---

## ⏱️ Timeline estimée

### ORION Code & Logic (1/3)
- **Téléchargement:** 10-15 min
  - CodeGemma 2B (~1.1 Go)
  - Llama 3.2 3B (~1.9 Go)
- **Fusion SLERP:** 8-12 min
- **Quantification q4:** 5-8 min
- **Sharding:** 2-5 min
- **Total:** 25-40 min

### ORION Creative & Multilingual (2/3)
- **Téléchargement:** 15-20 min
  - Mistral 7B (~4.5 Go)
  - Qwen2 1.5B (~800 Mo)
- **Fusion SLERP:** 10-15 min
- **Quantification q4:** 6-10 min
- **Sharding:** 3-5 min
- **Total:** 34-50 min

### ORION Vision & Logic (3/3)
- **Téléchargement:** 15-20 min
  - LLaVA 1.5 (~4 Go)
  - Llama 3.2 3B (~1.9 Go)
- **Fusion SLERP:** 12-18 min
- **Quantification q4:** 8-12 min
- **Sharding:** 3-5 min
- **Total:** 38-55 min

### **TOTAL: 97-145 minutes (~1h40 à 2h25)**

---

## 🔍 Test rapide (5 minutes)

Pour vérifier que tout fonctionne avant de lancer le build complet:

```bash
cd /workspace/model_foundry

# Tester mergekit
export PATH="/home/ubuntu/.local/bin:$PATH"
mergekit-yaml --help

# Tester que Python peut importer les libs
python3 -c "import torch; import transformers; print('✅ OK')"

# Vérifier les recettes
ls -la recipes/orion-*.yml
```

---

## 🎯 Après la création

Une fois les modèles créés, ils seront automatiquement disponibles dans ORION!

### Vérifier l'intégration

```bash
# Les modèles doivent être dans:
ls -lh /workspace/public/models/ORION-Code-Logic-v1-q4/
ls -lh /workspace/public/models/ORION-Creative-Multilingual-v1-q4/
ls -lh /workspace/public/models/ORION-Vision-Logic-v1-q4/
```

### Utiliser dans ORION

```typescript
// Dans l'application ORION
const response = await engine.infer(
  "Conçois une architecture pour un système distribué",
  {
    forceAgent: 'orion-code-logic' // ✨ Nouveau modèle!
  }
);
```

---

## 🐛 Troubleshooting

### "mergekit-yaml: command not found"

```bash
export PATH="/home/ubuntu/.local/bin:$PATH"
```

### "Out of memory"

- Fermer d'autres applications
- Ou créer les modèles un par un au lieu de tous en même temps

### "Connection timeout" pendant le téléchargement

- Relancer la commande (mergekit reprend là où il s'est arrêté)
- Ou définir une variable d'environnement:
  ```bash
  export HF_DATASETS_OFFLINE=0
  ```

### Vérifier les erreurs

```bash
# Dans les logs
grep -i error build_all.log
grep -i failed build_all.log
```

---

## 📚 Ressources

- **Logs:** `build_all.log` ou `build_*.log`
- **Recettes:** `/workspace/model_foundry/recipes/orion-*.yml`
- **Modèles intermédiaires:** `/workspace/model_foundry/merged_models/`
- **Modèles finaux:** `/workspace/public/models/ORION-*/`
- **Documentation:** `/workspace/ORION_INFERENCE_ENGINE_ULTIMATE_IMPLEMENTATION.md`

---

## 🚀 Commande Rapide

Pour tout lancer maintenant:

```bash
cd /workspace/model_foundry && \
export PATH="/home/ubuntu/.local/bin:$PATH" && \
nohup ./build_orion_models.sh all > build_$(date +%Y%m%d_%H%M%S).log 2>&1 &

echo "✅ Build lancé en arrière-plan!"
echo "📊 Suivre avec: tail -f build_*.log"
```

---

**Bon build! 🔨**
