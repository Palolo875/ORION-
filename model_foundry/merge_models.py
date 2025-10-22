#!/usr/bin/env python3
"""
Script de fusion de modèles pour ORION Model Foundry
Utilise une approche simplifiée de fusion par moyenne pondérée

Usage:
    python merge_models.py --recipe recipes/dev-polyglot-v1.yml
"""

import argparse
import yaml
import torch
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import Dict, Any
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_recipe(recipe_path: str) -> Dict[str, Any]:
    """Charge une recette de fusion depuis un fichier YAML"""
    with open(recipe_path, 'r', encoding='utf-8') as f:
        recipe = yaml.safe_load(f)
    logger.info(f"📖 Recette chargée: {recipe_path}")
    return recipe


def weighted_average_merge(
    model1_path: str,
    model2_path: str,
    weight: float,
    output_path: str,
    dtype: str = "bfloat16"
):
    """
    Fusionne deux modèles en faisant une moyenne pondérée de leurs poids
    
    Args:
        model1_path: Chemin ou ID Hugging Face du premier modèle
        model2_path: Chemin ou ID Hugging Face du second modèle
        weight: Poids pour la fusion (0.0-1.0). 0.4 = 60% model1 + 40% model2
        output_path: Chemin de sortie pour le modèle fusionné
        dtype: Type de données pour les calculs ('float32', 'bfloat16', etc.)
    """
    logger.info(f"🔄 Début de la fusion des modèles...")
    logger.info(f"  - Modèle 1: {model1_path} (poids: {1-weight:.1%})")
    logger.info(f"  - Modèle 2: {model2_path} (poids: {weight:.1%})")
    logger.info(f"  - Type de données: {dtype}")
    
    # Convertir le dtype string en torch dtype
    torch_dtype = getattr(torch, dtype) if hasattr(torch, dtype) else torch.bfloat16
    
    try:
        # Charger les modèles
        logger.info("📥 Chargement du modèle 1...")
        model1 = AutoModelForCausalLM.from_pretrained(
            model1_path,
            torch_dtype=torch_dtype,
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        
        logger.info("📥 Chargement du modèle 2...")
        model2 = AutoModelForCausalLM.from_pretrained(
            model2_path,
            torch_dtype=torch_dtype,
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        
        # Charger le tokenizer du premier modèle
        logger.info("📥 Chargement du tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model1_path, trust_remote_code=True)
        
        # Fusionner les poids
        logger.info("🔀 Fusion des poids...")
        state_dict1 = model1.state_dict()
        state_dict2 = model2.state_dict()
        
        merged_state_dict = {}
        total_params = len(state_dict1)
        
        for i, (key, param1) in enumerate(state_dict1.items(), 1):
            if key in state_dict2:
                param2 = state_dict2[key]
                
                # Vérifier que les formes correspondent
                if param1.shape == param2.shape:
                    # Fusion par moyenne pondérée: (1-t)*model1 + t*model2
                    merged_param = (1 - weight) * param1 + weight * param2
                    merged_state_dict[key] = merged_param
                else:
                    logger.warning(f"⚠️  Forme incompatible pour {key}, utilisation de model1")
                    merged_state_dict[key] = param1
            else:
                # Paramètre n'existe que dans model1
                merged_state_dict[key] = param1
            
            if i % 50 == 0:
                logger.info(f"  Progression: {i}/{total_params} paramètres fusionnés ({i/total_params*100:.1f}%)")
        
        # Charger les poids fusionnés dans model1
        logger.info("💾 Chargement des poids fusionnés...")
        model1.load_state_dict(merged_state_dict)
        
        # Sauvegarder le modèle fusionné
        logger.info(f"💾 Sauvegarde du modèle fusionné vers: {output_path}")
        Path(output_path).mkdir(parents=True, exist_ok=True)
        
        model1.save_pretrained(output_path, safe_serialization=True)
        tokenizer.save_pretrained(output_path)
        
        # Sauvegarder les métadonnées
        metadata = {
            "model_type": "merged",
            "merge_method": "weighted_average",
            "source_models": [model1_path, model2_path],
            "weights": [1 - weight, weight],
            "dtype": dtype,
            "created_by": "ORION Model Foundry"
        }
        
        with open(Path(output_path) / "merge_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info("✅ Fusion terminée avec succès!")
        logger.info(f"📁 Modèle sauvegardé dans: {output_path}")
        
        # Libérer la mémoire
        del model1, model2, merged_state_dict
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la fusion: {str(e)}")
        raise


def main():
    parser = argparse.ArgumentParser(description="ORION Model Foundry - Fusion de modèles")
    parser.add_argument(
        "--recipe",
        type=str,
        required=True,
        help="Chemin vers le fichier de recette YAML"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Chemin de sortie (par défaut: merged_models/[nom-recette])"
    )
    
    args = parser.parse_args()
    
    # Charger la recette
    recipe = load_recipe(args.recipe)
    
    # Extraire les informations
    models = recipe.get('models', [])
    if len(models) < 2:
        raise ValueError("La recette doit contenir au moins 2 modèles")
    
    model1_path = models[0]['model']
    model2_path = models[1]['model']
    
    merge_method = recipe.get('merge_method', 'slerp')
    if merge_method != 'slerp':
        logger.warning(f"⚠️  Méthode {merge_method} demandée, mais seule 'slerp' (weighted_average) est supportée")
    
    parameters = recipe.get('parameters', {})
    weight = parameters.get('t', 0.5)
    
    dtype = recipe.get('dtype', 'bfloat16')
    
    # Déterminer le chemin de sortie
    if args.output:
        output_path = args.output
    else:
        recipe_name = Path(args.recipe).stem
        output_path = f"merged_models/ORION-{recipe_name}"
    
    # Lancer la fusion
    logger.info("="*60)
    logger.info("🏭 ORION MODEL FOUNDRY - Fusion de modèles")
    logger.info("="*60)
    
    weighted_average_merge(
        model1_path=model1_path,
        model2_path=model2_path,
        weight=weight,
        output_path=output_path,
        dtype=dtype
    )
    
    logger.info("="*60)
    logger.info("✨ Processus terminé!")
    logger.info("="*60)
    logger.info(f"\n📝 Prochaines étapes:")
    logger.info(f"  1. Optimiser le modèle: python optimize_for_web.py --model {output_path}")
    logger.info(f"  2. Tester le modèle localement")
    logger.info(f"  3. Ajouter au model registry d'ORION")


if __name__ == "__main__":
    main()
