#!/usr/bin/env python3
"""
Script de sharding de modèles pour ORION
Découpe un modèle en plusieurs morceaux pour un chargement progressif

Usage:
    python scripts/shard-model.py --model microsoft/phi-3-mini-4k-instruct --output models/phi-3-sharded --shards 4
    
    Options:
    --model: ID du modèle Hugging Face ou chemin local (requis)
    --output: Chemin de sortie (requis)
    --shards: Nombre de shards (défaut: 4)
    --max-shard-size: Taille maximale par shard en MB (optionnel)
"""

import argparse
import json
import os
import sys
import shutil
from pathlib import Path
from typing import Dict, List, Any
import torch

def check_dependencies():
    """Vérifie que toutes les dépendances sont installées"""
    required_packages = {
        'torch': 'torch',
        'transformers': 'transformers',
        'safetensors': 'safetensors'
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
        sys.exit(1)

def get_model_size(model_path: Path) -> int:
    """Calcule la taille totale d'un modèle"""
    total_size = 0
    for file in model_path.rglob('*'):
        if file.is_file():
            total_size += file.stat().st_size
    return total_size

def shard_model(
    model_name: str,
    output_path: str,
    num_shards: int = 4,
    max_shard_size_mb: int = None
):
    """
    Découpe un modèle en plusieurs shards pour un chargement progressif
    
    Args:
        model_name: ID du modèle Hugging Face ou chemin local
        output_path: Chemin de sortie
        num_shards: Nombre de shards souhaité
        max_shard_size_mb: Taille maximale par shard en MB
    """
    from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig
    from safetensors.torch import save_file, load_file
    
    print(f"🚀 Démarrage du sharding de {model_name}")
    print(f"📊 Nombre de shards: {num_shards}")
    if max_shard_size_mb:
        print(f"📊 Taille max par shard: {max_shard_size_mb} MB")
    print(f"💾 Sortie: {output_path}")
    print()
    
    # Créer le dossier de sortie
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Étape 1: Charger le modèle
    print("1️⃣ Chargement du modèle...")
    try:
        config = AutoConfig.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True
        )
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        print(f"   ✅ Modèle chargé: {model.config.model_type}")
        print(f"   📊 Paramètres: {model.num_parameters():,}")
        
    except Exception as e:
        print(f"   ❌ Erreur lors du chargement: {e}")
        raise
    
    # Étape 2: Obtenir le state dict
    print(f"\n2️⃣ Extraction du state dict...")
    try:
        state_dict = model.state_dict()
        print(f"   ✅ {len(state_dict)} tenseurs extraits")
        
        # Calculer la taille totale
        total_size = sum(
            param.element_size() * param.nelement() 
            for param in state_dict.values()
        )
        total_size_mb = total_size / (1024 * 1024)
        print(f"   📊 Taille totale: {total_size_mb:.1f} MB")
        
    except Exception as e:
        print(f"   ❌ Erreur lors de l'extraction: {e}")
        raise
    
    # Étape 3: Déterminer la stratégie de sharding
    print(f"\n3️⃣ Planification du sharding...")
    
    # Organiser les tenseurs par couche
    layers: Dict[str, Dict[str, torch.Tensor]] = {}
    other_params: Dict[str, torch.Tensor] = {}
    
    for name, param in state_dict.items():
        # Identifier les couches (format typique: model.layers.0.*, model.layers.1.*, etc.)
        if '.layers.' in name or '.layer.' in name:
            # Extraire le numéro de couche
            parts = name.split('.')
            for i, part in enumerate(parts):
                if part in ['layers', 'layer'] and i + 1 < len(parts):
                    layer_num = parts[i + 1]
                    layer_key = f"layer_{layer_num}"
                    
                    if layer_key not in layers:
                        layers[layer_key] = {}
                    
                    layers[layer_key][name] = param
                    break
        else:
            other_params[name] = param
    
    num_layers = len(layers)
    print(f"   📊 Couches détectées: {num_layers}")
    print(f"   📊 Autres paramètres: {len(other_params)}")
    
    # Calculer la distribution des couches par shard
    if num_layers > 0:
        layers_per_shard = max(1, num_layers // num_shards)
        print(f"   📊 Couches par shard: {layers_per_shard}")
    else:
        # Fallback: diviser les paramètres en parts égales
        print(f"   ⚠️  Aucune couche détectée, division par taille...")
    
    # Étape 4: Créer les shards
    print(f"\n4️⃣ Création des shards...")
    
    shard_info = []
    
    if num_layers > 0:
        # Sharding par couches
        sorted_layers = sorted(layers.keys(), key=lambda x: int(x.split('_')[1]))
        
        for shard_idx in range(num_shards):
            start_layer = shard_idx * layers_per_shard
            end_layer = min((shard_idx + 1) * layers_per_shard, num_layers)
            
            # Collecter les tenseurs pour ce shard
            shard_dict = {}
            
            # Ajouter les paramètres de base au premier shard
            if shard_idx == 0:
                shard_dict.update(other_params)
            
            # Ajouter les couches assignées à ce shard
            for layer_key in sorted_layers[start_layer:end_layer]:
                shard_dict.update(layers[layer_key])
            
            # Sauvegarder le shard
            shard_path = output_dir / f"shard_{shard_idx:02d}.safetensors"
            save_file(shard_dict, str(shard_path))
            
            # Calculer la taille du shard
            shard_size = sum(
                param.element_size() * param.nelement() 
                for param in shard_dict.values()
            )
            shard_size_mb = shard_size / (1024 * 1024)
            
            shard_info.append({
                'shard_id': shard_idx,
                'filename': f"shard_{shard_idx:02d}.safetensors",
                'num_tensors': len(shard_dict),
                'size_mb': round(shard_size_mb, 2),
                'layer_range': f"{start_layer}-{end_layer - 1}" if num_layers > 0 else "N/A"
            })
            
            print(f"   ✅ Shard {shard_idx}: {len(shard_dict)} tenseurs, {shard_size_mb:.1f} MB")
    
    else:
        # Fallback: sharding par taille
        all_params = list(state_dict.items())
        params_per_shard = len(all_params) // num_shards
        
        for shard_idx in range(num_shards):
            start_idx = shard_idx * params_per_shard
            end_idx = (shard_idx + 1) * params_per_shard if shard_idx < num_shards - 1 else len(all_params)
            
            shard_dict = dict(all_params[start_idx:end_idx])
            
            # Sauvegarder le shard
            shard_path = output_dir / f"shard_{shard_idx:02d}.safetensors"
            save_file(shard_dict, str(shard_path))
            
            # Calculer la taille du shard
            shard_size = sum(
                param.element_size() * param.nelement() 
                for param in shard_dict.values()
            )
            shard_size_mb = shard_size / (1024 * 1024)
            
            shard_info.append({
                'shard_id': shard_idx,
                'filename': f"shard_{shard_idx:02d}.safetensors",
                'num_tensors': len(shard_dict),
                'size_mb': round(shard_size_mb, 2),
                'param_range': f"{start_idx}-{end_idx - 1}"
            })
            
            print(f"   ✅ Shard {shard_idx}: {len(shard_dict)} tenseurs, {shard_size_mb:.1f} MB")
    
    # Étape 5: Sauvegarder la configuration et le tokenizer
    print(f"\n5️⃣ Sauvegarde de la configuration...")
    try:
        config.save_pretrained(output_dir)
        tokenizer.save_pretrained(output_dir)
        print(f"   ✅ Configuration et tokenizer sauvegardés")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        raise
    
    # Étape 6: Créer le manifeste de sharding
    print(f"\n6️⃣ Création du manifeste de sharding...")
    create_shard_manifest(output_dir, model_name, num_shards, shard_info, total_size_mb)
    
    print(f"\n✅ Sharding terminé avec succès!")
    print(f"📁 Modèle disponible dans: {output_dir}")
    print(f"📊 {num_shards} shards créés")
    
    return output_dir

def create_shard_manifest(
    output_path: Path,
    model_name: str,
    num_shards: int,
    shard_info: List[Dict[str, Any]],
    total_size_mb: float
):
    """Crée un manifeste de sharding avec toutes les informations"""
    from datetime import datetime
    
    manifest = {
        "model_name": model_name,
        "sharding_date": datetime.now().isoformat(),
        "total_shards": num_shards,
        "total_size_mb": round(total_size_mb, 2),
        "shards": shard_info,
        "loading_order": [s['filename'] for s in shard_info],
        "tool": "ORION Model Sharding Pipeline",
        "usage": {
            "sequential": "Charger les shards dans l'ordre: shard_00, shard_01, ...",
            "progressive": "Charger shard_00 d'abord, puis les autres en arrière-plan",
            "web": "Utilisez le ProgressiveLoader d'ORION pour un chargement optimisé"
        }
    }
    
    manifest_path = output_path / "shard_manifest.json"
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"   📄 Manifeste sauvegardé dans {manifest_path}")
    
    # Créer aussi un fichier README
    readme_path = output_path / "SHARDING_INFO.md"
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(f"# Modèle Shardé: {model_name}\n\n")
        f.write(f"**Date de création**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"## Informations\n\n")
        f.write(f"- **Nombre de shards**: {num_shards}\n")
        f.write(f"- **Taille totale**: {total_size_mb:.1f} MB\n\n")
        f.write(f"## Shards\n\n")
        
        for shard in shard_info:
            f.write(f"### {shard['filename']}\n")
            f.write(f"- Tenseurs: {shard['num_tensors']}\n")
            f.write(f"- Taille: {shard['size_mb']} MB\n")
            if 'layer_range' in shard:
                f.write(f"- Couches: {shard['layer_range']}\n")
            f.write("\n")
        
        f.write(f"## Utilisation\n\n")
        f.write(f"### Chargement séquentiel\n")
        f.write(f"```python\n")
        f.write(f"from safetensors.torch import load_file\n\n")
        f.write(f"state_dict = {{}}\n")
        f.write(f"for i in range({num_shards}):\n")
        f.write(f"    shard = load_file(f'shard_{{i:02d}}.safetensors')\n")
        f.write(f"    state_dict.update(shard)\n")
        f.write(f"```\n\n")
        f.write(f"### Chargement progressif (ORION)\n")
        f.write(f"```javascript\n")
        f.write(f"import {{ ProgressiveLoader }} from '@/oie/utils/progressive-loader';\n\n")
        f.write(f"const loader = new ProgressiveLoader();\n")
        f.write(f"await loader.loadModel('{output_path}');\n")
        f.write(f"```\n")
    
    print(f"   📄 README créé: {readme_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Pipeline de sharding de modèles pour ORION",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  # Sharding en 4 morceaux
  python scripts/shard-model.py --model microsoft/phi-3-mini-4k-instruct --output models/phi-3-sharded --shards 4
  
  # Sharding avec taille maximale par shard
  python scripts/shard-model.py --model microsoft/phi-3-mini-4k-instruct --output models/phi-3-sharded --max-shard-size 500
  
  # Sharding d'un modèle local
  python scripts/shard-model.py --model ./models/custom_model --output models/custom_sharded --shards 8
        """
    )
    
    parser.add_argument(
        '--model',
        type=str,
        required=True,
        help='ID du modèle Hugging Face ou chemin local'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        help='Chemin de sortie pour le modèle shardé'
    )
    
    parser.add_argument(
        '--shards',
        type=int,
        default=4,
        help='Nombre de shards (défaut: 4)'
    )
    
    parser.add_argument(
        '--max-shard-size',
        type=int,
        help='Taille maximale par shard en MB (optionnel)'
    )
    
    args = parser.parse_args()
    
    # Vérifier les dépendances
    check_dependencies()
    
    # Sharder le modèle
    shard_model(
        model_name=args.model,
        output_path=args.output,
        num_shards=args.shards,
        max_shard_size_mb=args.max_shard_size
    )

if __name__ == '__main__':
    main()
