#!/usr/bin/env python3
"""
Script de quantification de modèles pour ORION
Permet de réduire la taille des modèles tout en maintenant la qualité

Usage:
    python scripts/quantize-model.py --model microsoft/phi-3-mini-4k-instruct --output models/phi-3-q4
    
    Options:
    --model: ID du modèle Hugging Face (requis)
    --output: Chemin de sortie (requis)
    --level: Niveau de quantification (q4, q3, q2) - défaut: q4
    --avx512: Utiliser AVX512 pour de meilleures performances (défaut: True)
    --test: Tester le modèle quantifié après génération
"""

import argparse
import os
import sys
from pathlib import Path

def check_dependencies():
    """Vérifie que toutes les dépendances sont installées"""
    required_packages = {
        'optimum': 'optimum[onnxruntime]',
        'onnx': 'onnx',
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
        sys.exit(1)

def quantize_model(model_name: str, output_path: str, level: str = 'q4', use_avx512: bool = True):
    """
    Quantifie un modèle Hugging Face
    
    Args:
        model_name: ID du modèle sur Hugging Face
        output_path: Chemin où sauvegarder le modèle quantifié
        level: Niveau de quantification (q4, q3, q2)
        use_avx512: Utiliser AVX512 pour l'optimisation
    """
    from optimum.onnxruntime import ORTQuantizer, ORTModelForCausalLM
    from optimum.onnxruntime.configuration import AutoQuantizationConfig
    from transformers import AutoTokenizer
    
    print(f"🚀 Démarrage de la quantification de {model_name}")
    print(f"📊 Niveau: {level}")
    print(f"💾 Sortie: {output_path}")
    print()
    
    # Créer le dossier de sortie
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Étape 1: Charger le modèle et le convertir en ONNX
    print("1️⃣ Chargement et conversion du modèle en ONNX...")
    try:
        onnx_path = output_dir / "onnx"
        model = ORTModelForCausalLM.from_pretrained(
            model_name, 
            export=True,
            provider="CPUExecutionProvider"
        )
        model.save_pretrained(onnx_path)
        print(f"   ✅ Modèle ONNX sauvegardé dans {onnx_path}")
    except Exception as e:
        print(f"   ❌ Erreur lors de la conversion ONNX: {e}")
        raise
    
    # Étape 2: Configurer la quantification
    print(f"\n2️⃣ Configuration de la quantification {level}...")
    
    quantization_configs = {
        'q4': {
            'is_static': False,
            'per_channel': False,
            'format': 'QOperator',
            'weight_type': 'QInt8'
        },
        'q3': {
            'is_static': False,
            'per_channel': True,
            'format': 'QDQ',
            'weight_type': 'QUInt8'
        },
        'q2': {
            'is_static': False,
            'per_channel': True,
            'format': 'QDQ',
            'weight_type': 'QUInt8',
            'reduce_range': True
        }
    }
    
    if level not in quantization_configs:
        print(f"   ⚠️  Niveau '{level}' inconnu, utilisation de q4 par défaut")
        level = 'q4'
    
    config_params = quantization_configs[level]
    
    if use_avx512:
        qconfig = AutoQuantizationConfig.avx512_vnni(**config_params)
    else:
        qconfig = AutoQuantizationConfig.arm64(**config_params)
    
    print(f"   ✅ Configuration: {config_params}")
    
    # Étape 3: Quantifier le modèle
    print(f"\n3️⃣ Quantification du modèle...")
    try:
        quantized_path = output_dir / "quantized"
        quantizer = ORTQuantizer.from_pretrained(model)
        quantizer.quantize(
            save_dir=quantized_path,
            quantization_config=qconfig
        )
        print(f"   ✅ Modèle quantifié sauvegardé dans {quantized_path}")
    except Exception as e:
        print(f"   ❌ Erreur lors de la quantification: {e}")
        raise
    
    # Étape 4: Sauvegarder le tokenizer
    print(f"\n4️⃣ Sauvegarde du tokenizer...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.save_pretrained(quantized_path)
        print(f"   ✅ Tokenizer sauvegardé")
    except Exception as e:
        print(f"   ❌ Erreur lors de la sauvegarde du tokenizer: {e}")
        raise
    
    # Étape 5: Calculer les statistiques de taille
    print(f"\n5️⃣ Statistiques de compression...")
    
    def get_size(path: Path) -> int:
        """Calcule la taille totale d'un dossier"""
        return sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
    
    onnx_size = get_size(onnx_path) / (1024 * 1024)  # MB
    quantized_size = get_size(quantized_path) / (1024 * 1024)  # MB
    compression_ratio = (1 - quantized_size / onnx_size) * 100
    
    print(f"   📊 Taille ONNX: {onnx_size:.1f} MB")
    print(f"   📊 Taille quantifiée: {quantized_size:.1f} MB")
    print(f"   📊 Compression: {compression_ratio:.1f}%")
    
    print(f"\n✅ Quantification terminée avec succès!")
    print(f"📁 Modèle disponible dans: {quantized_path}")
    
    return quantized_path

def test_quantized_model(model_path: str):
    """Teste le modèle quantifié avec une simple génération"""
    from optimum.onnxruntime import ORTModelForCausalLM
    from transformers import AutoTokenizer
    
    print(f"\n🧪 Test du modèle quantifié...")
    
    try:
        # Charger le modèle et le tokenizer
        model = ORTModelForCausalLM.from_pretrained(model_path)
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        
        # Test de génération simple
        prompt = "Hello, my name is"
        inputs = tokenizer(prompt, return_tensors="pt")
        
        print(f"   Prompt: '{prompt}'")
        
        outputs = model.generate(**inputs, max_new_tokens=20)
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        print(f"   Génération: '{generated_text}'")
        print(f"   ✅ Test réussi!")
        
    except Exception as e:
        print(f"   ❌ Erreur lors du test: {e}")
        raise

def create_metadata(output_path: str, model_name: str, level: str):
    """Crée un fichier metadata.json pour le modèle quantifié"""
    import json
    from datetime import datetime
    
    metadata = {
        "original_model": model_name,
        "quantization_level": level,
        "created_at": datetime.now().isoformat(),
        "tool": "ORION Quantization Pipeline",
        "usage": {
            "transformers": f"model = ORTModelForCausalLM.from_pretrained('{output_path}')",
            "web": "Hébergez ce dossier et référencez-le dans vos agents ORION"
        }
    }
    
    metadata_path = Path(output_path) / "metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n📄 Métadonnées sauvegardées dans {metadata_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Pipeline de quantification de modèles pour ORION",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  # Quantification standard (q4)
  python scripts/quantize-model.py --model microsoft/phi-3-mini-4k-instruct --output models/phi-3-q4
  
  # Quantification agressive (q2) pour une taille minimale
  python scripts/quantize-model.py --model microsoft/phi-3-mini-4k-instruct --output models/phi-3-q2 --level q2
  
  # Avec test du modèle après quantification
  python scripts/quantize-model.py --model microsoft/phi-3-mini-4k-instruct --output models/phi-3-q4 --test
        """
    )
    
    parser.add_argument(
        '--model',
        type=str,
        required=True,
        help='ID du modèle Hugging Face (ex: microsoft/phi-3-mini-4k-instruct)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        help='Chemin de sortie pour le modèle quantifié'
    )
    
    parser.add_argument(
        '--level',
        type=str,
        default='q4',
        choices=['q4', 'q3', 'q2'],
        help='Niveau de quantification (défaut: q4)'
    )
    
    parser.add_argument(
        '--avx512',
        action='store_true',
        default=True,
        help='Utiliser AVX512 pour de meilleures performances (défaut: True)'
    )
    
    parser.add_argument(
        '--test',
        action='store_true',
        help='Tester le modèle après quantification'
    )
    
    args = parser.parse_args()
    
    # Vérifier les dépendances
    check_dependencies()
    
    # Quantifier le modèle
    quantized_path = quantize_model(
        model_name=args.model,
        output_path=args.output,
        level=args.level,
        use_avx512=args.avx512
    )
    
    # Créer les métadonnées
    create_metadata(args.output, args.model, args.level)
    
    # Tester si demandé
    if args.test:
        test_quantized_model(quantized_path)

if __name__ == '__main__':
    main()
