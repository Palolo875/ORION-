# 🔧 Guide d'installation - ORION Model Foundry

## Prérequis système

### Minimum requis

| Composant | Minimum | Recommandé | Idéal |
|-----------|---------|------------|-------|
| **CPU** | Intel i5 / AMD Ryzen 5 | Intel i7 / AMD Ryzen 7 | Intel Xeon / AMD Threadripper |
| **RAM** | 16 GB | 32 GB | 64 GB |
| **Stockage** | 50 GB libre | 100 GB libre | 500 GB libre SSD |
| **Connexion** | 10 Mbps | 50 Mbps | 100+ Mbps |
| **OS** | Linux, macOS, Windows | Linux Ubuntu 22.04+ | Linux Ubuntu 22.04+ |
| **GPU** | Optionnel | NVIDIA RTX 3060 | NVIDIA RTX 4090 |

### Logiciels requis

- **Python** : 3.10, 3.11 ou 3.12
- **Poetry** : 1.7.0+ (recommandé) OU pip + virtualenv
- **Git** : Pour cloner les modèles (optionnel)

## Installation

### Option A : Installation avec Poetry (Recommandé)

**1. Vérifier Python**

```bash
python3 --version
# Devrait afficher: Python 3.10.x, 3.11.x ou 3.12.x
```

**2. Installer Poetry**

```bash
# Linux / macOS / WSL
curl -sSL https://install.python-poetry.org | python3 -

# Ajouter Poetry au PATH (si nécessaire)
export PATH="$HOME/.local/bin:$PATH"

# Vérifier l'installation
poetry --version
```

**3. Initialiser la fonderie**

```bash
cd model_foundry
./foundry.sh init
```

Ceci va :
- ✅ Créer un environnement virtuel isolé
- ✅ Installer toutes les dépendances
- ✅ Configurer l'environnement

**4. Vérifier l'installation**

```bash
poetry run python --version
poetry run python -c "import torch; print(f'PyTorch: {torch.__version__}')"
```

### Option B : Installation avec pip

**1. Créer un environnement virtuel**

```bash
cd model_foundry
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# OU
.venv\Scripts\activate  # Windows
```

**2. Installer les dépendances**

```bash
pip install -r requirements.txt
```

**3. Vérifier l'installation**

```bash
python --version
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
```

### Option C : Installation pour développement

```bash
cd model_foundry

# Installer avec les dépendances de développement
poetry install --with dev

# OU avec pip
pip install -r requirements.txt
pip install pytest black flake8
```

## Configuration

### 1. Hugging Face (Recommandé)

Certains modèles nécessitent une authentification Hugging Face.

```bash
# Installer le CLI
pip install huggingface-hub

# Se connecter
huggingface-cli login

# Entrer votre token (obtenir sur: https://huggingface.co/settings/tokens)
```

### 2. GPU (Optionnel mais recommandé)

**Vérifier CUDA**

```bash
nvidia-smi
```

**Installer PyTorch avec CUDA** (si nécessaire)

```bash
# CUDA 12.1
pip install torch --index-url https://download.pytorch.org/whl/cu121

# CUDA 11.8
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

**Vérifier GPU dans PyTorch**

```bash
python -c "import torch; print(f'CUDA disponible: {torch.cuda.is_available()}')"
```

### 3. Swap (Si RAM limitée)

Si vous avez moins de 32 GB de RAM, créez un fichier de swap.

```bash
# Créer un swap de 16 GB
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendre permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Test de l'installation

### Test rapide

```bash
cd model_foundry
./foundry.sh list
```

Devrait afficher :
```
📋 Recettes disponibles:
  - dev-polyglot-v1.yml
  - creative-coder-v1.yml
  - data-analyst-v1.yml
```

### Test complet (optionnel)

```bash
# Tester les imports Python
poetry run python -c "
import torch
import transformers
import yaml
import safetensors
print('✅ Tous les imports fonctionnent!')
"
```

## Dépannage

### Erreur : "Poetry not found"

**Solution :**

```bash
# Vérifier l'installation
ls ~/.local/bin/poetry

# Ajouter au PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Erreur : "Python version incompatible"

**Solution :** Installer Python 3.10+

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.10 python3.10-venv

# macOS (via Homebrew)
brew install python@3.10

# Utiliser cette version
poetry env use python3.10
```

### Erreur : "Torch not found" ou "CUDA unavailable"

**Solution :**

```bash
# Désinstaller torch actuel
pip uninstall torch

# Réinstaller avec CUDA
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

### Erreur : "Out of disk space"

**Solution :**

1. Libérer de l'espace :
   ```bash
   # Nettoyer le cache pip
   pip cache purge
   
   # Nettoyer le cache Hugging Face
   rm -rf ~/.cache/huggingface/
   ```

2. Utiliser un autre disque :
   ```bash
   # Définir le cache Hugging Face ailleurs
   export HF_HOME=/chemin/vers/gros/disque/.cache/huggingface
   ```

### Erreur : Permission denied sur foundry.sh

**Solution :**

```bash
chmod +x foundry.sh
chmod +x merge_models.py
chmod +x optimize_for_web.py
```

## Désinstallation

### Supprimer l'environnement Poetry

```bash
cd model_foundry
poetry env remove python
```

### Supprimer les modèles téléchargés

```bash
# Modèles de la fonderie
rm -rf merged_models/* optimized_models/*

# Cache Hugging Face
rm -rf ~/.cache/huggingface/hub/
```

### Supprimer complètement

```bash
cd ..
rm -rf model_foundry/
```

## Vérification finale

Après l'installation, vous devriez pouvoir exécuter :

```bash
cd model_foundry

# Afficher l'aide
./foundry.sh help

# Afficher les recettes
./foundry.sh list

# Afficher la version
make version
```

Si tout fonctionne, vous êtes prêt ! 🎉

**Prochaine étape :** Consultez [QUICK_START.md](QUICK_START.md) pour créer votre premier agent.

## Support

- 📖 Documentation : [README.md](README.md)
- 🚀 Guide rapide : [QUICK_START.md](QUICK_START.md)
- 📚 Guide complet : [../docs/MODEL_FOUNDRY_GUIDE.md](../docs/MODEL_FOUNDRY_GUIDE.md)
- 🐛 Issues : [GitHub Issues](#)

---

**Dernière mise à jour :** 2025-10-22  
**Équipe ORION** 🏭
