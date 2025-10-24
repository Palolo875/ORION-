#!/bin/bash
# Script ultra-simplifié pour lancer le build

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ORION Model Foundry - Lanceur Rapide"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /workspace/model_foundry
export PATH="/home/ubuntu/.local/bin:$PATH"

LOG_FILE="build_$(date +%Y%m%d_%H%M%S).log"

echo "📊 Log file: $LOG_FILE"
echo "⏱️  Temps estimé: 2-3 heures"
echo "💾 Taille finale: ~7.5 Go"
echo ""
echo "🔨 Démarrage du build en arrière-plan..."

nohup ./build_orion_models.sh all > "$LOG_FILE" 2>&1 &

PID=$!

echo ""
echo "✅ Build lancé (PID: $PID)"
echo ""
echo "📊 Commandes utiles:"
echo "  - Suivre: tail -f $LOG_FILE"
echo "  - Stop:   kill $PID"
echo "  - Status: ps aux | grep $PID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
