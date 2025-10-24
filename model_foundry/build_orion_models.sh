#!/bin/bash
# Script de création des modèles ORION en arrière-plan
# Usage: ./build_orion_models.sh [code-logic|creative|vision|all]

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
export PATH="/home/ubuntu/.local/bin:$PATH"
LOG_FILE="build_$(date +%Y%m%d_%H%M%S).log"

# Fonctions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Vérifier les prérequis
check_requirements() {
    log "Vérification des prérequis..."
    
    if ! command -v mergekit-yaml &> /dev/null; then
        error "mergekit-yaml non trouvé dans PATH"
        error "Exécutez: export PATH=\"/home/ubuntu/.local/bin:\$PATH\""
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        error "Python 3 non trouvé"
        exit 1
    fi
    
    success "Prérequis OK"
}

# Afficher l'espace disque
check_disk_space() {
    log "Vérification de l'espace disque..."
    df -h /workspace | grep -v Filesystem
    
    AVAILABLE=$(df /workspace | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE" -lt 10485760 ]; then  # 10 GB en KB
        warning "Moins de 10 Go disponibles. Continuez-vous ? (y/n)"
        read -r response
        if [ "$response" != "y" ]; then
            exit 1
        fi
    fi
}

# Créer ORION Code & Logic
build_code_logic() {
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "🔨 [1/3] ORION Code & Logic v1"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    START_TIME=$(date +%s)
    
    cd /workspace/model_foundry
    make build-code-logic 2>&1 | tee -a "$LOG_FILE"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    success "ORION Code & Logic créé en $((DURATION / 60)) minutes"
}

# Créer ORION Creative & Multilingual
build_creative() {
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "🔨 [2/3] ORION Creative & Multilingual v1"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    START_TIME=$(date +%s)
    
    cd /workspace/model_foundry
    make build-creative 2>&1 | tee -a "$LOG_FILE"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    success "ORION Creative & Multilingual créé en $((DURATION / 60)) minutes"
}

# Créer ORION Vision & Logic
build_vision() {
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "🔨 [3/3] ORION Vision & Logic v1"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    START_TIME=$(date +%s)
    
    cd /workspace/model_foundry
    make build-vision 2>&1 | tee -a "$LOG_FILE"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    success "ORION Vision & Logic créé en $((DURATION / 60)) minutes"
}

# Résumé final
show_summary() {
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "📊 RÉSUMÉ"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    TOTAL_TIME=$(($(date +%s) - SCRIPT_START_TIME))
    log "Temps total: $((TOTAL_TIME / 60)) minutes ($TOTAL_TIME secondes)"
    log ""
    log "Modèles créés:"
    ls -lh /workspace/public/models/ORION-* 2>/dev/null || warning "Aucun modèle trouvé"
    log ""
    log "Log complet: $LOG_FILE"
    log ""
    success "🎉 Tous les modèles ORION ont été créés avec succès!"
}

# Main
SCRIPT_START_TIME=$(date +%s)

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🚀 ORION Model Foundry - Build Script"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_requirements
check_disk_space

TARGET="${1:-all}"

case "$TARGET" in
    code-logic)
        build_code_logic
        ;;
    creative)
        build_creative
        ;;
    vision)
        build_vision
        ;;
    all)
        build_code_logic
        build_creative
        build_vision
        ;;
    *)
        error "Argument invalide: $TARGET"
        echo "Usage: $0 [code-logic|creative|vision|all]"
        exit 1
        ;;
esac

show_summary

exit 0
