#!/bin/bash
# ORION Model Foundry - Script d'orchestration
# Simplifie l'utilisation de la fonderie de modèles

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions d'affichage
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si Poetry est installé
check_poetry() {
    if ! command -v poetry &> /dev/null; then
        error "Poetry n'est pas installé"
        info "Installez Poetry: curl -sSL https://install.python-poetry.org | python3 -"
        exit 1
    fi
    success "Poetry détecté"
}

# Initialiser l'environnement
init_env() {
    info "Initialisation de l'environnement..."
    
    if [ ! -d ".venv" ]; then
        poetry install
        success "Environnement créé"
    else
        info "Environnement déjà existant"
    fi
}

# Fusionner des modèles
merge() {
    local recipe=$1
    local output=$2
    
    if [ -z "$recipe" ]; then
        error "Usage: ./foundry.sh merge <recipe> [output]"
        exit 1
    fi
    
    if [ ! -f "$recipe" ]; then
        error "Recette introuvable: $recipe"
        exit 1
    fi
    
    info "Fusion des modèles avec la recette: $recipe"
    
    if [ -n "$output" ]; then
        poetry run python merge_models.py --recipe "$recipe" --output "$output"
    else
        poetry run python merge_models.py --recipe "$recipe"
    fi
}

# Optimiser pour le web
optimize() {
    local model=$1
    local output=$2
    local quant=${3:-"q4f16_1"}
    
    if [ -z "$model" ]; then
        error "Usage: ./foundry.sh optimize <model> [output] [quantization]"
        exit 1
    fi
    
    if [ ! -d "$model" ]; then
        error "Modèle introuvable: $model"
        exit 1
    fi
    
    info "Optimisation du modèle: $model"
    info "Quantification: $quant"
    
    if [ -n "$output" ]; then
        poetry run python optimize_for_web.py --model "$model" --output "$output" --quantization "$quant"
    else
        poetry run python optimize_for_web.py --model "$model" --quantization "$quant"
    fi
}

# Pipeline complet
pipeline() {
    local recipe=$1
    
    if [ -z "$recipe" ]; then
        error "Usage: ./foundry.sh pipeline <recipe>"
        exit 1
    fi
    
    info "🏭 Lancement du pipeline complet"
    info "================================"
    
    # Étape 1: Fusion
    info "Étape 1/2: Fusion des modèles..."
    merge "$recipe"
    
    # Trouver le modèle fusionné
    recipe_name=$(basename "$recipe" .yml)
    merged_model="merged_models/ORION-$recipe_name"
    
    if [ ! -d "$merged_model" ]; then
        error "Modèle fusionné introuvable: $merged_model"
        exit 1
    fi
    
    # Étape 2: Optimisation
    info "Étape 2/2: Optimisation pour le web..."
    optimize "$merged_model"
    
    success "Pipeline terminé!"
    info "Le modèle optimisé est prêt à être intégré dans ORION"
}

# Lister les recettes disponibles
list_recipes() {
    info "Recettes disponibles:"
    for recipe in recipes/*.yml; do
        if [ -f "$recipe" ]; then
            echo "  - $(basename "$recipe")"
        fi
    done
}

# Afficher l'aide
show_help() {
    cat << EOF
🏭 ORION Model Foundry - Fonderie de Modèles AI

Usage: ./foundry.sh <command> [arguments]

Commandes:
  init              Initialiser l'environnement Poetry
  merge <recipe>    Fusionner des modèles selon une recette
  optimize <model>  Optimiser un modèle pour le web
  pipeline <recipe> Exécuter le pipeline complet (fusion + optimisation)
  list              Lister les recettes disponibles
  help              Afficher cette aide

Exemples:
  ./foundry.sh init
  ./foundry.sh list
  ./foundry.sh merge recipes/dev-polyglot-v1.yml
  ./foundry.sh optimize merged_models/ORION-dev-polyglot-v1
  ./foundry.sh pipeline recipes/dev-polyglot-v1.yml

Pour plus d'informations, consultez README.md
EOF
}

# Main
main() {
    local command=$1
    shift
    
    case $command in
        init)
            check_poetry
            init_env
            ;;
        merge)
            check_poetry
            merge "$@"
            ;;
        optimize)
            check_poetry
            optimize "$@"
            ;;
        pipeline)
            check_poetry
            init_env
            pipeline "$@"
            ;;
        list)
            list_recipes
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            error "Commande inconnue: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
