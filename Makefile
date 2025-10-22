# Makefile pour ORION
# Simplifie les tâches courantes de développement et de production

.PHONY: help install dev build test test-e2e clean optimize-model setup-python docs

# Variables
PYTHON := python3
NPM := npm
MODEL_DIR := models
SCRIPTS_DIR := scripts

# Couleurs pour les messages
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

##@ Général

help: ## Affiche cette aide
	@echo "$(BLUE)ORION - Makefile$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Installation et configuration

install: ## Installe toutes les dépendances
	@echo "$(GREEN)Installation des dépendances...$(NC)"
	$(NPM) install
	@echo "$(GREEN)✓ Dépendances installées$(NC)"

setup-python: ## Installe les dépendances Python pour les scripts de modèles
	@echo "$(GREEN)Installation des dépendances Python...$(NC)"
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install torch transformers safetensors optimum onnx pyyaml
	@echo "$(YELLOW)Note: Pour la fusion de modèles, installez mergekit manuellement$(NC)"
	@echo "$(YELLOW)  git clone https://github.com/cg123/mergekit.git$(NC)"
	@echo "$(YELLOW)  cd mergekit && pip install -e .$(NC)"
	@echo "$(GREEN)✓ Dépendances Python installées$(NC)"

setup: install ## Configuration complète (npm + téléchargement modèles)
	@echo "$(GREEN)Configuration de ORION...$(NC)"
	$(NPM) run setup
	@echo "$(GREEN)✓ Configuration terminée$(NC)"

##@ Développement

dev: ## Lance le serveur de développement
	@echo "$(GREEN)Démarrage du serveur de développement...$(NC)"
	$(NPM) run dev

build: ## Build de production
	@echo "$(GREEN)Build de production...$(NC)"
	$(NPM) run build
	@echo "$(GREEN)✓ Build terminé$(NC)"

preview: build ## Preview du build de production
	@echo "$(GREEN)Prévisualisation du build...$(NC)"
	$(NPM) run preview

##@ Tests

test: ## Exécute tous les tests unitaires
	@echo "$(GREEN)Exécution des tests...$(NC)"
	$(NPM) test

test-watch: ## Tests en mode watch
	@echo "$(GREEN)Tests en mode watch...$(NC)"
	$(NPM) run test:watch

test-coverage: ## Tests avec coverage
	@echo "$(GREEN)Tests avec coverage...$(NC)"
	$(NPM) run test:coverage

test-integration: ## Tests d'intégration avec vrais modèles
	@echo "$(YELLOW)⚠ Tests avec vrais modèles (lent)$(NC)"
	$(NPM) run test:integration

test-e2e: ## Tests end-to-end avec Playwright
	@echo "$(GREEN)Tests E2E...$(NC)"
	$(NPM) run test:e2e

test-e2e-ui: ## Tests E2E en mode UI
	@echo "$(GREEN)Tests E2E (mode UI)...$(NC)"
	$(NPM) run test:e2e:ui

test-e2e-report: ## Affiche les rapports des tests E2E
	@echo "$(GREEN)Rapports des tests E2E...$(NC)"
	$(NPM) run test:e2e:report

test-all: test test-e2e ## Exécute tous les types de tests
	@echo "$(GREEN)✓ Tous les tests terminés$(NC)"

##@ Optimisation de modèles

quantize-model: ## Quantifie un modèle (usage: make quantize-model MODEL=microsoft/phi-3 OUTPUT=models/phi-3-q4 LEVEL=q4)
	@echo "$(GREEN)Quantification du modèle $(MODEL)...$(NC)"
	@if [ -z "$(MODEL)" ] || [ -z "$(OUTPUT)" ]; then \
		echo "$(RED)Erreur: MODEL et OUTPUT requis$(NC)"; \
		echo "$(YELLOW)Usage: make quantize-model MODEL=microsoft/phi-3 OUTPUT=models/phi-3-q4 [LEVEL=q4]$(NC)"; \
		exit 1; \
	fi
	$(PYTHON) $(SCRIPTS_DIR)/quantize-model.py --model $(MODEL) --output $(OUTPUT) --level $(or $(LEVEL),q4)
	@echo "$(GREEN)✓ Quantification terminée$(NC)"

merge-models: ## Fusionne des modèles (usage: make merge-models MODELS="model1 model2" RATIOS="0.6 0.4" OUTPUT=models/merged METHOD=slerp)
	@echo "$(GREEN)Fusion de modèles...$(NC)"
	@if [ -z "$(MODELS)" ] || [ -z "$(OUTPUT)" ]; then \
		echo "$(RED)Erreur: MODELS et OUTPUT requis$(NC)"; \
		echo "$(YELLOW)Usage: make merge-models MODELS=\"model1 model2\" RATIOS=\"0.6 0.4\" OUTPUT=models/merged [METHOD=slerp]$(NC)"; \
		exit 1; \
	fi
	$(PYTHON) $(SCRIPTS_DIR)/merge-models.py --models $(MODELS) --ratios $(RATIOS) --output $(OUTPUT) --method $(or $(METHOD),linear)
	@echo "$(GREEN)✓ Fusion terminée$(NC)"

shard-model: ## Sharde un modèle (usage: make shard-model MODEL=microsoft/phi-3 OUTPUT=models/phi-3-sharded SHARDS=4)
	@echo "$(GREEN)Sharding du modèle $(MODEL)...$(NC)"
	@if [ -z "$(MODEL)" ] || [ -z "$(OUTPUT)" ]; then \
		echo "$(RED)Erreur: MODEL et OUTPUT requis$(NC)"; \
		echo "$(YELLOW)Usage: make shard-model MODEL=microsoft/phi-3 OUTPUT=models/phi-3-sharded [SHARDS=4]$(NC)"; \
		exit 1; \
	fi
	$(PYTHON) $(SCRIPTS_DIR)/shard-model.py --model $(MODEL) --output $(OUTPUT) --shards $(or $(SHARDS),4)
	@echo "$(GREEN)✓ Sharding terminé$(NC)"

optimize-model: ## Pipeline complet d'optimisation (quantize + shard)
	@echo "$(GREEN)Pipeline d'optimisation complet...$(NC)"
	@if [ -z "$(MODEL)" ] || [ -z "$(OUTPUT)" ]; then \
		echo "$(RED)Erreur: MODEL et OUTPUT requis$(NC)"; \
		echo "$(YELLOW)Usage: make optimize-model MODEL=microsoft/phi-3 OUTPUT=models/phi-3-optimized$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)1/2 Quantification...$(NC)"
	$(PYTHON) $(SCRIPTS_DIR)/quantize-model.py --model $(MODEL) --output $(OUTPUT)-quantized --level q4
	@echo "$(BLUE)2/2 Sharding...$(NC)"
	$(PYTHON) $(SCRIPTS_DIR)/shard-model.py --model $(OUTPUT)-quantized/quantized --output $(OUTPUT)-production --shards 4
	@echo "$(GREEN)✓ Optimisation terminée!$(NC)"
	@echo "$(YELLOW)N'oubliez pas de mettre à jour models.json$(NC)"

##@ Documentation

docs: ## Génère la documentation
	@echo "$(GREEN)Génération de la documentation...$(NC)"
	@echo "$(YELLOW)Documentation disponible:$(NC)"
	@echo "  - OIE_ULTIMATE_IMPLEMENTATION.md"
	@echo "  - scripts/README_MODELS_PIPELINE.md"
	@echo "  - models.json (Model Registry)"
	@echo "$(GREEN)✓ Documentation à jour$(NC)"

##@ Nettoyage

clean: ## Nettoie les fichiers générés
	@echo "$(GREEN)Nettoyage...$(NC)"
	rm -rf dist/
	rm -rf node_modules/.cache/
	rm -rf test-results/
	rm -rf playwright-report/
	rm -rf coverage/
	@echo "$(GREEN)✓ Nettoyage terminé$(NC)"

clean-all: clean ## Nettoie tout (y compris node_modules)
	@echo "$(YELLOW)Nettoyage complet (node_modules inclus)...$(NC)"
	rm -rf node_modules/
	@echo "$(GREEN)✓ Nettoyage complet terminé$(NC)"

##@ Utilitaires

lint: ## Exécute le linter
	@echo "$(GREEN)Linting...$(NC)"
	$(NPM) run lint

lint-fix: ## Corrige automatiquement les erreurs de linting
	@echo "$(GREEN)Correction automatique...$(NC)"
	$(NPM) run lint -- --fix

format: ## Formate le code (si prettier configuré)
	@echo "$(GREEN)Formatage du code...$(NC)"
	@if [ -f .prettierrc ]; then \
		npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"; \
	else \
		echo "$(YELLOW)Prettier non configuré$(NC)"; \
	fi

check: lint test ## Vérifications avant commit (lint + tests)
	@echo "$(GREEN)✓ Toutes les vérifications OK$(NC)"

##@ Production

deploy-check: test-all lint build ## Vérifications avant déploiement
	@echo "$(GREEN)✓ Prêt pour le déploiement$(NC)"
	@echo "$(YELLOW)Checklist:$(NC)"
	@echo "  [x] Tests unitaires passent"
	@echo "  [x] Tests E2E passent"
	@echo "  [x] Linting OK"
	@echo "  [x] Build OK"
	@echo "  [ ] models.json à jour ?"
	@echo "  [ ] Variables d'environnement configurées ?"
	@echo "  [ ] Secrets configurés ?"

##@ Exemples

example-quantize: ## Exemple: Quantifier Phi-3
	@echo "$(BLUE)Exemple: Quantification de Phi-3$(NC)"
	make quantize-model MODEL=microsoft/Phi-3-mini-4k-instruct OUTPUT=models/phi-3-q4 LEVEL=q4

example-merge: ## Exemple: Fusionner Phi-3 et CodeGemma
	@echo "$(BLUE)Exemple: Fusion Phi-3 + CodeGemma$(NC)"
	make merge-models MODELS="microsoft/Phi-3-mini-4k-instruct google/codegemma-2b" RATIOS="0.6 0.4" OUTPUT=models/phi-code-hybrid METHOD=slerp

example-optimize: ## Exemple: Optimisation complète de Phi-3
	@echo "$(BLUE)Exemple: Optimisation complète$(NC)"
	make optimize-model MODEL=microsoft/Phi-3-mini-4k-instruct OUTPUT=models/phi-3

.DEFAULT_GOAL := help
