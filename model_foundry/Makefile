# ORION Model Foundry - Makefile
# Création automatisée des modèles hybrides ORION

SHELL := /bin/bash
PYTHON := python3
MERGEKIT := /home/ubuntu/.local/bin/mergekit-yaml

# Répertoires
RECIPES_DIR := recipes
MERGED_DIR := merged_models
OUTPUT_DIR := ../public/models

# Cibles principales
.PHONY: all help install clean build-all-orion

help:
	@echo "🔨 ORION Model Foundry - Makefile"
	@echo ""
	@echo "Commandes disponibles:"
	@echo "  make install           - Installer les dépendances"
	@echo "  make build-all-orion   - Créer les 3 modèles ORION (2-3h)"
	@echo "  make build-code-logic  - Créer ORION Code & Logic (~30-45 min)"
	@echo "  make build-creative    - Créer ORION Creative & Multilingual (~30-45 min)"
	@echo "  make build-vision      - Créer ORION Vision & Logic (~40-60 min)"
	@echo "  make clean             - Nettoyer les fichiers temporaires"
	@echo "  make clean-all         - Nettoyer tout (y compris modèles)"
	@echo ""
	@echo "Pour lancer en arrière-plan:"
	@echo "  nohup make build-all-orion > build.log 2>&1 &"
	@echo ""
	@echo "Puis suivre la progression:"
	@echo "  tail -f build.log"

install:
	@echo "📦 Installation des dépendances..."
	pip3 install --user torch transformers accelerate huggingface-hub pyyaml tqdm
	pip3 install --user git+https://github.com/arcee-ai/mergekit.git
	@echo "✅ Dépendances installées!"

build-all-orion: build-code-logic build-creative build-vision
	@echo ""
	@echo "🎉 Les 3 modèles ORION ont été créés avec succès!"
	@echo ""
	@echo "Modèles disponibles:"
	@ls -lh $(OUTPUT_DIR)/ORION-*/
	@echo ""
	@echo "Vous pouvez maintenant les utiliser dans ORION!"

# ORION Code & Logic v1
build-code-logic:
	@echo ""
	@echo "🔨 [1/3] Création de ORION Code & Logic v1"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Fusion: CodeGemma 2B + Llama 3.2 3B (50/50)"
	@echo "Taille estimée: ~1.5 Go"
	@echo "Temps estimé: 30-45 minutes"
	@echo ""
	
	@mkdir -p $(MERGED_DIR) $(OUTPUT_DIR)
	
	@echo "📥 Étape 1/3: Fusion des modèles avec SLERP..."
	@$(MERGEKIT) $(RECIPES_DIR)/orion-code-logic-v1.yml \
		$(MERGED_DIR)/ORION-Code-Logic-v1 \
		--copy-tokenizer \
		--allow-crimes \
		--verbose || (echo "❌ Erreur lors de la fusion"; exit 1)
	
	@echo "✅ Fusion terminée!"
	@echo ""
	@echo "🔧 Étape 2/3: Quantification q4..."
	@$(PYTHON) optimize_pipeline.py \
		--model_path $(MERGED_DIR)/ORION-Code-Logic-v1 \
		--output_path $(OUTPUT_DIR)/ORION-Code-Logic-v1-q4 \
		--quantization q4 \
		--shard_size 150 || (echo "❌ Erreur lors de la quantification"; exit 1)
	
	@echo "✅ Quantification terminée!"
	@echo ""
	@echo "📦 Étape 3/3: Vérification..."
	@ls -lh $(OUTPUT_DIR)/ORION-Code-Logic-v1-q4/
	@echo ""
	@echo "✅ ORION Code & Logic v1 créé avec succès!"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ORION Creative & Multilingual v1
build-creative:
	@echo ""
	@echo "🔨 [2/3] Création de ORION Creative & Multilingual v1"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Fusion: Mistral 7B + Qwen2 1.5B (70/30)"
	@echo "Taille estimée: ~2.6 Go"
	@echo "Temps estimé: 30-45 minutes"
	@echo ""
	
	@mkdir -p $(MERGED_DIR) $(OUTPUT_DIR)
	
	@echo "📥 Étape 1/3: Fusion des modèles avec SLERP..."
	@$(MERGEKIT) $(RECIPES_DIR)/orion-creative-multilingual-v1.yml \
		$(MERGED_DIR)/ORION-Creative-Multilingual-v1 \
		--copy-tokenizer \
		--allow-crimes \
		--verbose || (echo "❌ Erreur lors de la fusion"; exit 1)
	
	@echo "✅ Fusion terminée!"
	@echo ""
	@echo "🔧 Étape 2/3: Quantification q4..."
	@$(PYTHON) optimize_pipeline.py \
		--model_path $(MERGED_DIR)/ORION-Creative-Multilingual-v1 \
		--output_path $(OUTPUT_DIR)/ORION-Creative-Multilingual-v1-q4 \
		--quantization q4 \
		--shard_size 200 || (echo "❌ Erreur lors de la quantification"; exit 1)
	
	@echo "✅ Quantification terminée!"
	@echo ""
	@echo "📦 Étape 3/3: Vérification..."
	@ls -lh $(OUTPUT_DIR)/ORION-Creative-Multilingual-v1-q4/
	@echo ""
	@echo "✅ ORION Creative & Multilingual v1 créé avec succès!"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ORION Vision & Logic v1
build-vision:
	@echo ""
	@echo "🔨 [3/3] Création de ORION Vision & Logic v1"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Fusion: LLaVA 1.5 (LLM) + Llama 3.2 3B (60/40)"
	@echo "Taille estimée: ~3.4 Go"
	@echo "Temps estimé: 40-60 minutes"
	@echo ""
	
	@mkdir -p $(MERGED_DIR) $(OUTPUT_DIR)
	
	@echo "📥 Étape 1/3: Fusion des modèles avec SLERP..."
	@$(MERGEKIT) $(RECIPES_DIR)/orion-vision-logic-v1.yml \
		$(MERGED_DIR)/ORION-Vision-Logic-v1 \
		--copy-tokenizer \
		--allow-crimes \
		--verbose || (echo "❌ Erreur lors de la fusion"; exit 1)
	
	@echo "✅ Fusion terminée!"
	@echo ""
	@echo "🔧 Étape 2/3: Quantification q4..."
	@$(PYTHON) optimize_pipeline.py \
		--model_path $(MERGED_DIR)/ORION-Vision-Logic-v1 \
		--output_path $(OUTPUT_DIR)/ORION-Vision-Logic-v1-q4 \
		--quantization q4 \
		--shard_size 200 || (echo "❌ Erreur lors de la quantification"; exit 1)
	
	@echo "✅ Quantification terminée!"
	@echo ""
	@echo "📦 Étape 3/3: Vérification..."
	@ls -lh $(OUTPUT_DIR)/ORION-Vision-Logic-v1-q4/
	@echo ""
	@echo "✅ ORION Vision & Logic v1 créé avec succès!"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Nettoyage
clean:
	@echo "🧹 Nettoyage des fichiers temporaires..."
	@rm -rf __pycache__ *.pyc .pytest_cache
	@echo "✅ Nettoyage terminé!"

clean-merged:
	@echo "🧹 Suppression des modèles fusionnés (intermédiaires)..."
	@rm -rf $(MERGED_DIR)/*
	@echo "✅ Modèles fusionnés supprimés!"

clean-all: clean clean-merged
	@echo "🧹 Suppression de tous les modèles générés..."
	@rm -rf $(OUTPUT_DIR)/ORION-*
	@echo "⚠️  Tous les modèles ORION ont été supprimés!"

# Informations
info:
	@echo "📊 État de la Model Foundry"
	@echo ""
	@echo "Recettes disponibles:"
	@ls -1 $(RECIPES_DIR)/*.yml
	@echo ""
	@echo "Modèles fusionnés:"
	@ls -1d $(MERGED_DIR)/* 2>/dev/null || echo "Aucun"
	@echo ""
	@echo "Modèles optimisés:"
	@ls -1d $(OUTPUT_DIR)/ORION-* 2>/dev/null || echo "Aucun"
	@echo ""
	@echo "Espace disque:"
	@df -h /workspace | grep -v Filesystem

.DEFAULT_GOAL := help
