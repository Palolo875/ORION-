# ORION Model Foundry - Makefile
# Commandes automatisées pour le pipeline de création de modèles

.PHONY: help install clean build-all build-dev-polyglot optimize test

# Variables
PYTHON := python3
POETRY := poetry
MODELS_DIR := merged_models
OPTIMIZED_DIR := optimized_models
PUBLIC_DIR := ../public/models
RECIPES_DIR := recipes

# Couleurs pour output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Afficher cette aide
	@echo "$(BLUE)ORION Model Foundry - Commandes disponibles:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Installer les dépendances avec Poetry
	@echo "$(BLUE)Installation des dépendances...$(NC)"
	$(POETRY) install
	@echo "$(GREEN)✓ Installation terminée$(NC)"

install-pip: ## Installer les dépendances avec pip (alternative)
	@echo "$(BLUE)Installation des dépendances avec pip...$(NC)"
	pip install -r requirements.txt
	@echo "$(GREEN)✓ Installation terminée$(NC)"

clean: ## Nettoyer les fichiers temporaires
	@echo "$(YELLOW)Nettoyage des fichiers temporaires...$(NC)"
	rm -rf $(MODELS_DIR)/*
	rm -rf $(OPTIMIZED_DIR)/*
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf *.pyc
	@echo "$(GREEN)✓ Nettoyage terminé$(NC)"

build-all: ## Créer tous les modèles hybrides
	@echo "$(BLUE)Création de tous les modèles hybrides...$(NC)"
	$(MAKE) build-dev-polyglot
	@echo "$(GREEN)✓ Tous les modèles créés$(NC)"

build-dev-polyglot: ## Créer ORION-Dev-Polyglot-v1
	@echo "$(BLUE)Création du modèle ORION-Dev-Polyglot-v1...$(NC)"
	@echo "  - Fusion: CodeGemma 2B + Qwen2 1.5B"
	@echo "  - Ratio: 60/40"
	@echo "  - Méthode: SLERP"
	@mkdir -p $(MODELS_DIR)
	$(POETRY) run mergekit-yaml \
		$(RECIPES_DIR)/dev-polyglot-v1.yml \
		$(MODELS_DIR)/ORION-Dev-Polyglot-v1 \
		--copy-tokenizer \
		--allow-crimes
	@echo "$(GREEN)✓ Modèle fusionné créé$(NC)"
	@echo ""
	@echo "$(BLUE)Optimisation pour le web...$(NC)"
	$(MAKE) optimize-dev-polyglot
	@echo "$(GREEN)✓ ORION-Dev-Polyglot-v1 prêt !$(NC)"

optimize-dev-polyglot: ## Optimiser ORION-Dev-Polyglot-v1 (quantification + sharding)
	@echo "$(BLUE)Optimisation de ORION-Dev-Polyglot-v1...$(NC)"
	@mkdir -p $(PUBLIC_DIR)
	$(POETRY) run $(PYTHON) optimize_pipeline.py \
		--model_path $(MODELS_DIR)/ORION-Dev-Polyglot-v1 \
		--output_path $(PUBLIC_DIR)/ORION-Dev-Polyglot-v1-q4 \
		--quantization q4 \
		--shard_size 100 \
		--verbose
	@echo "$(GREEN)✓ Optimisation terminée$(NC)"

quantize: ## Quantifier un modèle (usage: make quantize MODEL=path/to/model QUANT=q4)
	@echo "$(BLUE)Quantification de $(MODEL) en $(QUANT)...$(NC)"
	@mkdir -p $(OPTIMIZED_DIR)
	$(POETRY) run $(PYTHON) quantize_model.py \
		--model $(MODEL) \
		--output $(OPTIMIZED_DIR)/$(notdir $(MODEL))-$(QUANT) \
		--quantization $(QUANT)
	@echo "$(GREEN)✓ Quantification terminée$(NC)"

shard: ## Découper un modèle en shards (usage: make shard MODEL=path/to/model SIZE=100)
	@echo "$(BLUE)Sharding de $(MODEL) (taille: $(SIZE)Mo/shard)...$(NC)"
	@mkdir -p $(OPTIMIZED_DIR)
	$(POETRY) run $(PYTHON) shard_model.py \
		--model_path $(MODEL) \
		--output_path $(OPTIMIZED_DIR)/$(notdir $(MODEL))-sharded \
		--shard_size $(SIZE)
	@echo "$(GREEN)✓ Sharding terminé$(NC)"

test: ## Lancer les tests de validation
	@echo "$(BLUE)Lancement des tests...$(NC)"
	$(POETRY) run pytest tests/ -v
	@echo "$(GREEN)✓ Tests terminés$(NC)"

validate: ## Valider un modèle (usage: make validate MODEL=path/to/model)
	@echo "$(BLUE)Validation de $(MODEL)...$(NC)"
	$(POETRY) run $(PYTHON) scripts/validate_model.py \
		--model_path $(MODEL) \
		--benchmark hellaswag,arc
	@echo "$(GREEN)✓ Validation terminée$(NC)"

test-inference: ## Tester l'inférence d'un modèle (usage: make test-inference MODEL=path/to/model)
	@echo "$(BLUE)Test d'inférence de $(MODEL)...$(NC)"
	$(POETRY) run $(PYTHON) scripts/test_inference.py \
		--model $(MODEL) \
		--prompt "Écris une fonction Python qui trie une liste"
	@echo "$(GREEN)✓ Test terminé$(NC)"

benchmark: ## Benchmarker tous les modèles optimisés
	@echo "$(BLUE)Benchmark des modèles...$(NC)"
	$(POETRY) run $(PYTHON) scripts/benchmark_variants.py $(OPTIMIZED_DIR)/*
	@echo "$(GREEN)✓ Benchmark terminé$(NC)"

list-models: ## Lister tous les modèles créés
	@echo "$(BLUE)Modèles fusionnés:$(NC)"
	@ls -lh $(MODELS_DIR)/ 2>/dev/null || echo "  Aucun modèle fusionné"
	@echo ""
	@echo "$(BLUE)Modèles optimisés:$(NC)"
	@ls -lh $(OPTIMIZED_DIR)/ 2>/dev/null || echo "  Aucun modèle optimisé"
	@echo ""
	@echo "$(BLUE)Modèles déployés:$(NC)"
	@ls -lh $(PUBLIC_DIR)/ 2>/dev/null || echo "  Aucun modèle déployé"

info: ## Afficher les informations sur l'environnement
	@echo "$(BLUE)Informations sur l'environnement:$(NC)"
	@echo "  Python: $$($(PYTHON) --version)"
	@echo "  Poetry: $$($(POETRY) --version)"
	@echo "  PyTorch: $$($(PYTHON) -c 'import torch; print(torch.__version__)' 2>/dev/null || echo 'Non installé')"
	@echo "  Transformers: $$($(PYTHON) -c 'import transformers; print(transformers.__version__)' 2>/dev/null || echo 'Non installé')"
	@echo "  CUDA disponible: $$($(PYTHON) -c 'import torch; print(torch.cuda.is_available())' 2>/dev/null || echo 'N/A')"

# Raccourcis
dev-polyglot: build-dev-polyglot ## Alias pour build-dev-polyglot

# Valeurs par défaut pour les paramètres
MODEL ?= merged_models/ORION-Dev-Polyglot-v1
QUANT ?= q4
SIZE ?= 100
