# Guide des Tests - ORION

Ce document décrit la configuration des tests pour le projet ORION.

## Tests Unitaires (Vitest)

### Installation
Les dépendances de test sont déjà installées. Si nécessaire, réinstallez avec :
```bash
npm install
```

### Exécution des tests

```bash
# Exécuter tous les tests unitaires
npm run test

# Exécuter les tests avec l'interface UI
npm run test:ui

# Générer un rapport de couverture
npm run test:coverage
```

### Structure des tests

Les tests unitaires sont organisés dans des dossiers `__tests__` à côté du code source :
- `src/utils/__tests__/` - Tests des utilitaires
- `src/components/__tests__/` - Tests des composants React

### Tests existants

1. **browserCompatibility.test.ts**
   - Teste la détection de la compatibilité WebGPU
   - Vérifie les recommandations de navigateur
   - Teste les informations du navigateur

2. **fileProcessor.test.ts**
   - Teste la validation des types de fichiers
   - Vérifie la catégorisation des fichiers
   - Teste le formatage de la taille des fichiers

3. **textToSpeech.test.ts**
   - Teste la disponibilité du TTS
   - Vérifie le découpage du texte pour la synthèse vocale

4. **ChatInput.test.tsx**
   - Teste le composant d'entrée de chat
   - Vérifie l'envoi des messages
   - Teste les états désactivés

## Tests E2E (Playwright)

### Installation des navigateurs
```bash
npx playwright install
```

### Exécution des tests E2E

```bash
# Exécuter tous les tests E2E
npm run test:e2e

# Exécuter avec l'interface UI
npm run test:e2e:ui

# Afficher le rapport
npm run test:e2e:report
```

### Tests E2E existants

1. **app.spec.ts**
   - Tests de chargement de l'application
   - Vérification de l'interface utilisateur
   - Tests de navigation
   - Tests d'accessibilité

2. **chat.spec.ts**
   - Tests de la fonctionnalité de chat
   - Tests d'upload de fichiers
   - Tests de la saisie vocale
   - Tests d'affichage des messages

### Configuration

La configuration Playwright teste l'application sur :
- Desktop: Chrome, Firefox, Safari
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

Le serveur de développement démarre automatiquement avant les tests.

## Intégration Continue

Un workflow GitHub Actions est configuré dans `.github/workflows/tests.yml` pour :
- Exécuter les tests unitaires
- Générer la couverture de code
- Exécuter les tests E2E
- Uploader les rapports

## Écrire de nouveaux tests

### Tests unitaires

Créez un fichier `*.test.ts` ou `*.test.tsx` dans `__tests__/` :

```typescript
import { describe, it, expect } from 'vitest';

describe('Ma fonctionnalité', () => {
  it('devrait fonctionner correctement', () => {
    expect(true).toBe(true);
  });
});
```

### Tests E2E

Créez un fichier `*.spec.ts` dans le dossier `e2e/` :

```typescript
import { test, expect } from '@playwright/test';

test('devrait afficher la page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ORION/);
});
```

## Bonnes pratiques

1. **Tests unitaires**
   - Testez les fonctions et composants isolément
   - Utilisez des mocks pour les dépendances externes
   - Visez une couverture de code élevée (>80%)

2. **Tests E2E**
   - Testez les parcours utilisateur complets
   - Vérifiez les interactions entre composants
   - Testez sur plusieurs navigateurs

3. **Général**
   - Nommez les tests de manière descriptive
   - Organisez les tests par fonctionnalité
   - Gardez les tests rapides et fiables
   - Mettez à jour les tests avec le code

## Dépannage

### Les tests Vitest échouent
- Vérifiez que toutes les dépendances sont installées
- Assurez-vous que le fichier `src/test/setup.ts` existe
- Vérifiez la configuration dans `vitest.config.ts`

### Les tests Playwright échouent
- Installez les navigateurs avec `npx playwright install`
- Vérifiez que le serveur de développement démarre correctement
- Consultez les captures d'écran et vidéos dans `test-results/`

### Problèmes de couverture
- Excluez les fichiers non pertinents dans `vitest.config.ts`
- Ajoutez des tests pour les fonctions non couvertes
- Utilisez `npm run test:coverage` pour voir le rapport détaillé
