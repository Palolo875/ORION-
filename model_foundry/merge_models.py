#!/usr/bin/env python3
"""
ORION Model Foundry - Fusion de modèles
Utilise mergekit pour combiner deux modèles ou plus
"""

import argparse
import sys
from pathlib import Path
import yaml
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_recipe(recipe_path: Path) -> dict:
    """Charge une recette de fusion depuis un fichier YAML."""
    logger.info(f"📖 Chargement de la recette: {recipe_path}")
    
    if not recipe_path.exists():
        logger.error(f"❌ Recette introuvable: {recipe_path}")
        sys.exit(1)
    
    with open(recipe_path, 'r', encoding='utf-8') as f:
        recipe = yaml.safe_load(f)
    
    logger.info(f"✅ Recette chargée: {recipe.get('metadata', {}).get('name', 'Sans nom')}")
    return recipe


def validate_recipe(recipe: dict) -> bool:
    """Valide qu'une recette contient tous les champs requis."""
    required_fields = ['models', 'merge_method', 'parameters', 'dtype']
    
    for field in required_fields:
        if field not in recipe:
            logger.error(f"❌ Champ requis manquant: {field}")
            return False
    
    if len(recipe['models']) < 2:
        logger.error("❌ Au moins 2 modèles sont requis pour la fusion")
        return False
    
    logger.info("✅ Recette valide")
    return True


def merge_models(recipe_path: Path, output_path: Path, copy_tokenizer: bool = True) -> bool:
    """
    Fusionne des modèles selon une recette.
    
    Args:
        recipe_path: Chemin vers le fichier de recette YAML
        output_path: Chemin de sortie pour le modèle fusionné
        copy_tokenizer: Copier le tokenizer du premier modèle
    
    Returns:
        True si succès, False sinon
    """
    try:
        # Charger et valider la recette
        recipe = load_recipe(recipe_path)
        if not validate_recipe(recipe):
            return False
        
        # Afficher les informations de fusion
        logger.info("🔨 Configuration de fusion:")
        logger.info(f"  - Méthode: {recipe['merge_method']}")
        logger.info(f"  - Modèles sources:")
        for i, model in enumerate(recipe['models'], 1):
            logger.info(f"    {i}. {model['model']}")
        
        if 'parameters' in recipe:
            logger.info(f"  - Paramètres: {recipe['parameters']}")
        
        # Créer le dossier de sortie
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Note: L'utilisation réelle de mergekit se fait via la CLI
        # car c'est plus stable que l'API Python
        logger.info("ℹ️  Pour fusionner, exécutez:")
        logger.info(f"    mergekit-yaml {recipe_path} {output_path} --copy-tokenizer")
        
        # Pour l'instant, on retourne True si la validation a réussi
        # Dans une implémentation complète, on appellerait directement mergekit
        logger.info("✅ Validation réussie - Prêt pour la fusion")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la fusion: {e}")
        return False


def main():
    """Point d'entrée principal."""
    parser = argparse.ArgumentParser(
        description="ORION Model Foundry - Fusion de modèles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  # Fusionner selon une recette
  python merge_models.py recipes/dev-polyglot-v1.yml merged_models/dev-polyglot-v1

  # Sans copier le tokenizer
  python merge_models.py recipes/my-recipe.yml output/ --no-copy-tokenizer

Pour plus d'informations: https://github.com/cg123/mergekit
        """
    )
    
    parser.add_argument(
        'recipe',
        type=Path,
        help="Chemin vers la recette de fusion (YAML)"
    )
    
    parser.add_argument(
        'output',
        type=Path,
        help="Chemin de sortie pour le modèle fusionné"
    )
    
    parser.add_argument(
        '--no-copy-tokenizer',
        action='store_true',
        help="Ne pas copier le tokenizer du premier modèle"
    )
    
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help="Mode verbose"
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Fusionner les modèles
    success = merge_models(
        recipe_path=args.recipe,
        output_path=args.output,
        copy_tokenizer=not args.no_copy_tokenizer
    )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
