#!/usr/bin/env python3
"""
Script de fusion de modèles pour ORION
Utilise mergekit pour créer des modèles hybrides optimisés

Usage:
    python scripts/merge-models.py --models model1 model2 --ratios 0.6 0.4 --output models/merged
    
    Options:
    --models: Liste des modèles à fusionner (requis)
    --ratios: Ratios de fusion (optionnel, par défaut égaux)
    --output: Chemin de sortie (requis)
    --method: Méthode de fusion (linear, slerp, ties, dare) - défaut: linear
    --name: Nom du modèle fusionné
"""

import argparse
import json
import os
import sys
import yaml
from pathlib import Path
from typing import List, Dict, Any

def check_dependencies():
    """Vérifie que toutes les dépendances sont installées"""
    required_packages = {
        'mergekit': 'mergekit',
        'torch': 'torch',
        'transformers': 'transformers'
    }
    
    missing = []
    for package, install_name in required_packages.items():
        try:
            __import__(package)
        except ImportError:
            missing.append(install_name)
    
    if missing:
        print("❌ Dépendances manquantes. Installez-les avec:")
        print(f"   pip install {' '.join(missing)}")
        print("\nPour mergekit:")
        print("   git clone https://github.com/cg123/mergekit.git")
        print("   cd mergekit && pip install -e .")
        sys.exit(1)

def create_merge_config(
    models: List[str],
    ratios: List[float],
    method: str = 'linear',
    output_path: str = 'merged_model'
) -> Dict[str, Any]:
    """
    Crée une configuration de fusion pour mergekit
    
    Args:
        models: Liste des IDs de modèles à fusionner
        ratios: Ratios de fusion pour chaque modèle
        method: Méthode de fusion (linear, slerp, ties, dare)
        output_path: Chemin de sortie
        
    Returns:
        Configuration au format mergekit
    """
    # Normaliser les ratios pour qu'ils somment à 1
    total = sum(ratios)
    normalized_ratios = [r / total for r in ratios]
    
    if method == 'linear':
        # Fusion linéaire simple (moyenne pondérée)
        config = {
            'merge_method': 'linear',
            'slices': [
                {
                    'sources': [
                        {
                            'model': model,
                            'layer_range': [0, -1]
                        }
                    ]
                }
                for model in models
            ],
            'models': [
                {
                    'model': model,
                    'parameters': {
                        'weight': ratio
                    }
                }
                for model, ratio in zip(models, normalized_ratios)
            ],
            'dtype': 'float16',
            'out_dtype': 'float16'
        }
    
    elif method == 'slerp':
        # SLERP (Spherical Linear Interpolation) - pour 2 modèles uniquement
        if len(models) != 2:
            raise ValueError("SLERP nécessite exactement 2 modèles")
        
        config = {
            'merge_method': 'slerp',
            'slices': [
                {
                    'sources': [
                        {
                            'model': models[0],
                            'layer_range': [0, -1]
                        },
                        {
                            'model': models[1],
                            'layer_range': [0, -1]
                        }
                    ]
                }
            ],
            'parameters': {
                't': normalized_ratios[1]  # t=0 -> model1, t=1 -> model2
            },
            'dtype': 'float16',
            'out_dtype': 'float16'
        }
    
    elif method == 'ties':
        # TIES (Trim, Elect, and Merge) - fusion intelligente
        config = {
            'merge_method': 'ties',
            'slices': [
                {
                    'sources': [
                        {
                            'model': model,
                            'layer_range': [0, -1]
                        }
                    ]
                }
                for model in models
            ],
            'models': [
                {
                    'model': model,
                    'parameters': {
                        'weight': ratio,
                        'density': 0.5  # Densité de préservation des paramètres
                    }
                }
                for model, ratio in zip(models, normalized_ratios)
            ],
            'dtype': 'float16',
            'out_dtype': 'float16'
        }
    
    elif method == 'dare':
        # DARE (Drop And REscale) - fusion avec dropout
        config = {
            'merge_method': 'dare_linear',
            'slices': [
                {
                    'sources': [
                        {
                            'model': model,
                            'layer_range': [0, -1]
                        }
                    ]
                }
                for model in models
            ],
            'models': [
                {
                    'model': model,
                    'parameters': {
                        'weight': ratio,
                        'density': 0.5  # Probabilité de garder les paramètres
                    }
                }
                for model, ratio in zip(models, normalized_ratios)
            ],
            'dtype': 'float16',
            'out_dtype': 'float16'
        }
    
    else:
        raise ValueError(f"Méthode de fusion inconnue: {method}")
    
    return config

def merge_models(
    models: List[str],
    ratios: List[float],
    output_path: str,
    method: str = 'linear',
    model_name: str = 'merged_model'
):
    """
    Fusionne plusieurs modèles en utilisant mergekit
    
    Args:
        models: Liste des IDs de modèles Hugging Face
        ratios: Ratios de fusion
        output_path: Chemin de sortie
        method: Méthode de fusion
        model_name: Nom du modèle fusionné
    """
    print(f"🚀 Démarrage de la fusion de modèles")
    print(f"📊 Modèles: {models}")
    print(f"📊 Ratios: {ratios}")
    print(f"📊 Méthode: {method}")
    print(f"💾 Sortie: {output_path}")
    print()
    
    # Créer le dossier de sortie
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Étape 1: Créer la configuration de fusion
    print("1️⃣ Création de la configuration de fusion...")
    try:
        config = create_merge_config(models, ratios, method, output_path)
        
        # Sauvegarder la config
        config_path = output_dir / "merge_config.yaml"
        with open(config_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
        
        print(f"   ✅ Configuration sauvegardée dans {config_path}")
        print(f"   📄 Contenu:")
        print(yaml.dump(config, default_flow_style=False, indent=2))
    except Exception as e:
        print(f"   ❌ Erreur lors de la création de la configuration: {e}")
        raise
    
    # Étape 2: Exécuter la fusion avec mergekit
    print(f"\n2️⃣ Fusion des modèles avec mergekit...")
    print("   ⏳ Cette opération peut prendre plusieurs minutes...")
    
    try:
        # Utiliser mergekit en ligne de commande
        import subprocess
        
        cmd = [
            'mergekit-yaml',
            str(config_path),
            str(output_dir / 'merged'),
            '--copy-tokenizer',
            '--allow-crimes'  # Permet la fusion de modèles avec architectures différentes
        ]
        
        print(f"   🔧 Commande: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        print(result.stdout)
        print(f"   ✅ Fusion terminée avec succès!")
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Erreur lors de la fusion: {e}")
        print(f"   STDOUT: {e.stdout}")
        print(f"   STDERR: {e.stderr}")
        raise
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        raise
    
    # Étape 3: Créer les métadonnées
    print(f"\n3️⃣ Création des métadonnées...")
    create_metadata(output_path, models, ratios, method, model_name)
    
    print(f"\n✅ Fusion terminée avec succès!")
    print(f"📁 Modèle disponible dans: {output_dir / 'merged'}")
    
    return output_dir / 'merged'

def create_metadata(
    output_path: str,
    models: List[str],
    ratios: List[float],
    method: str,
    model_name: str
):
    """Crée un fichier metadata.json pour le modèle fusionné"""
    from datetime import datetime
    
    metadata = {
        "name": model_name,
        "type": "merged_model",
        "source_models": models,
        "merge_ratios": ratios,
        "merge_method": method,
        "created_at": datetime.now().isoformat(),
        "tool": "ORION Model Merging Pipeline",
        "description": f"Modèle hybride créé par fusion de {len(models)} modèles",
        "usage": {
            "transformers": f"model = AutoModelForCausalLM.from_pretrained('{output_path}/merged')",
            "web": "Hébergez ce dossier et référencez-le dans vos agents ORION"
        }
    }
    
    metadata_path = Path(output_path) / "metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"   📄 Métadonnées sauvegardées dans {metadata_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Pipeline de fusion de modèles pour ORION",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  # Fusion linéaire de 2 modèles
  python scripts/merge-models.py --models microsoft/phi-3-mini-4k-instruct TinyLlama/TinyLlama-1.1B-Chat-v1.0 --ratios 0.7 0.3 --output models/phi-tiny-hybrid
  
  # Fusion SLERP (sphérique) - meilleure préservation des propriétés
  python scripts/merge-models.py --models microsoft/phi-3-mini-4k-instruct meta-llama/Llama-2-7b-chat-hf --ratios 0.5 0.5 --method slerp --output models/phi-llama-slerp
  
  # Fusion TIES - fusion intelligente avec élection des meilleurs paramètres
  python scripts/merge-models.py --models model1 model2 model3 --ratios 0.5 0.3 0.2 --method ties --output models/ensemble
        """
    )
    
    parser.add_argument(
        '--models',
        nargs='+',
        required=True,
        help='Liste des IDs de modèles Hugging Face à fusionner'
    )
    
    parser.add_argument(
        '--ratios',
        nargs='+',
        type=float,
        help='Ratios de fusion (optionnel, par défaut égaux)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        help='Chemin de sortie pour le modèle fusionné'
    )
    
    parser.add_argument(
        '--method',
        type=str,
        default='linear',
        choices=['linear', 'slerp', 'ties', 'dare'],
        help='Méthode de fusion (défaut: linear)'
    )
    
    parser.add_argument(
        '--name',
        type=str,
        default='merged_model',
        help='Nom du modèle fusionné'
    )
    
    args = parser.parse_args()
    
    # Définir les ratios par défaut si non spécifiés
    if args.ratios is None:
        num_models = len(args.models)
        args.ratios = [1.0 / num_models] * num_models
    
    # Vérifier que le nombre de ratios correspond au nombre de modèles
    if len(args.ratios) != len(args.models):
        print(f"❌ Erreur: {len(args.models)} modèles fournis mais {len(args.ratios)} ratios")
        sys.exit(1)
    
    # Vérifier les dépendances
    check_dependencies()
    
    # Fusionner les modèles
    merged_path = merge_models(
        models=args.models,
        ratios=args.ratios,
        output_path=args.output,
        method=args.method,
        model_name=args.name
    )

if __name__ == '__main__':
    main()
