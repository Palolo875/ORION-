# ORION Model Foundry - Makefile
# Commandes utiles pour travailler avec la fonderie

.PHONY: help init install merge optimize pipeline clean test lint format

# Variables
PYTHON := poetry run python
RECIPE ?= recipes/dev-polyglot-v1.yml
MODEL ?= merged_models/ORION-dev-polyglot-v1

help:  ## Afficher cette aide
	@echo "🏭 ORION Model Foundry - Commandes disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Variables d'environnement:"
	@echo "  RECIPE - Chemin de la recette (défaut: $(RECIPE))"
	@echo "  MODEL  - Chemin du modèle (défaut: $(MODEL))"

init:  ## Initialiser l'environnement Poetry
	@echo "📦 Installation des dépendances..."
	poetry install
	@echo "✅ Environnement prêt!"

install: init  ## Alias pour init

merge:  ## Fusionner des modèles selon une recette
	@echo "🔄 Fusion des modèles avec $(RECIPE)..."
	$(PYTHON) merge_models.py --recipe $(RECIPE)

optimize:  ## Optimiser un modèle pour le web
	@echo "🔧 Optimisation de $(MODEL)..."
	$(PYTHON) optimize_for_web.py --model $(MODEL)

pipeline:  ## Pipeline complet (fusion + optimisation)
	@echo "🏭 Lancement du pipeline complet..."
	@echo "Recette: $(RECIPE)"
	@$(MAKE) merge RECIPE=$(RECIPE)
	@echo ""
	@echo "Optimisation du modèle fusionné..."
	@$(MAKE) optimize MODEL=$(shell ls -td merged_models/ORION-* | head -1)

list:  ## Lister les recettes disponibles
	@echo "📋 Recettes disponibles:"
	@for recipe in recipes/*.yml; do \
		echo "  - $$(basename $$recipe)"; \
	done

clean:  ## Nettoyer les fichiers temporaires
	@echo "🧹 Nettoyage..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.log" -delete
	@echo "✅ Nettoyage terminé!"

clean-models:  ## Supprimer tous les modèles (ATTENTION: action destructive!)
	@echo "⚠️  ATTENTION: Ceci va supprimer tous les modèles fusionnés et optimisés!"
	@read -p "Êtes-vous sûr? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -rf merged_models/* optimized_models/*; \
		echo "✅ Modèles supprimés!"; \
	else \
		echo "❌ Annulé."; \
	fi

test:  ## Exécuter les tests (si disponibles)
	@echo "🧪 Exécution des tests..."
	$(PYTHON) -m pytest tests/ -v || echo "⚠️  Aucun test trouvé"

lint:  ## Vérifier la qualité du code
	@echo "🔍 Analyse du code..."
	poetry run flake8 merge_models.py optimize_for_web.py || true

format:  ## Formater le code avec Black
	@echo "✨ Formatage du code..."
	poetry run black merge_models.py optimize_for_web.py
	@echo "✅ Code formaté!"

stats:  ## Afficher les statistiques des modèles
	@echo "📊 Statistiques des modèles:"
	@echo ""
	@echo "Modèles fusionnés:"
	@if [ -d "merged_models" ] && [ "$$(ls -A merged_models 2>/dev/null)" ]; then \
		for model in merged_models/*; do \
			if [ -d "$$model" ]; then \
				size=$$(du -sh "$$model" | cut -f1); \
				echo "  - $$(basename $$model): $$size"; \
			fi \
		done; \
	else \
		echo "  Aucun modèle fusionné"; \
	fi
	@echo ""
	@echo "Modèles optimisés:"
	@if [ -d "optimized_models" ] && [ "$$(ls -A optimized_models 2>/dev/null)" ]; then \
		for model in optimized_models/*; do \
			if [ -d "$$model" ]; then \
				size=$$(du -sh "$$model" | cut -f1); \
				echo "  - $$(basename $$model): $$size"; \
			fi \
		done; \
	else \
		echo "  Aucun modèle optimisé"; \
	fi

validate-recipe:  ## Valider une recette YAML
	@echo "✓ Validation de $(RECIPE)..."
	@$(PYTHON) -c "import yaml; yaml.safe_load(open('$(RECIPE)'))" && \
		echo "✅ Recette valide!" || \
		echo "❌ Recette invalide!"

# Exemples de recettes prédéfinies
dev-polyglot:  ## Créer l'agent Dev Polyglot (Code + Multilingue)
	@$(MAKE) pipeline RECIPE=recipes/dev-polyglot-v1.yml

creative-coder:  ## Créer l'agent Creative Coder (Code + Créativité)
	@$(MAKE) pipeline RECIPE=recipes/creative-coder-v1.yml

data-analyst:  ## Créer l'agent Data Analyst (Code + Raisonnement)
	@$(MAKE) pipeline RECIPE=recipes/data-analyst-v1.yml

# Installation alternative sans Poetry
install-pip:  ## Installer avec pip (sans Poetry)
	@echo "📦 Installation avec pip..."
	python3 -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt
	@echo "✅ Environnement prêt! Activez-le avec: source .venv/bin/activate"

# Documentation
docs:  ## Ouvrir la documentation
	@if command -v xdg-open > /dev/null; then \
		xdg-open README.md; \
	elif command -v open > /dev/null; then \
		open README.md; \
	else \
		echo "📖 Consultez README.md"; \
	fi

version:  ## Afficher la version
	@echo "ORION Model Foundry v1.0.0"
	@echo "Poetry: $$(poetry --version 2>/dev/null || echo 'non installé')"
	@echo "Python: $$(python3 --version)"

.DEFAULT_GOAL := help
