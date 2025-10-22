# Guide des Tests - ORION

## Vue d'ensemble

Le projet ORION dispose d'une suite de tests complète comprenant :
- **Tests unitaires** : Tests des composants et utilitaires individuels
- **Tests d'intégration** : Tests des interactions entre composants
- **Tests E2E** : Tests de bout en bout avec Playwright

## Structure des Tests

```
tests/
├── src/
│   ├── components/__tests__/      # Tests des composants React
│   ├── utils/__tests__/            # Tests des utilitaires
│   ├── hooks/__tests__/            # Tests des hooks React
│   ├── oie/__tests__/              # Tests de l'OIE
│   └── ...
└── e2e/                            # Tests E2E Playwright
    ├── app.spec.ts
    ├── chat.spec.ts
    ├── multi-agent-flow.spec.ts
    └── oie-workflow.spec.ts
```

## Commandes de Tests

### Tests Unitaires et d'Intégration

```bash
# Exécuter tous les tests
npm run test

# Exécuter les tests en mode watch
npm run test:watch

# Exécuter les tests avec interface UI
npm run test:ui

# Générer un rapport de couverture
npm run test:coverage
```

### Tests E2E Playwright

```bash
# Exécuter les tests E2E
npm run test:e2e

# Exécuter les tests E2E en mode UI
npm run test:e2e:ui

# Voir le rapport des tests E2E
npm run test:e2e:report
```

## Couverture de Tests

Objectif : **80%+ de couverture**

### Vérifier la Couverture

```bash
npm run test:coverage
```

Le rapport de couverture sera généré dans le dossier `coverage/` et affichera :
- Couverture des lignes
- Couverture des branches
- Couverture des fonctions
- Couverture des instructions

### Améliorer la Couverture

Pour identifier les fichiers avec une faible couverture :

1. Exécutez `npm run test:coverage`
2. Ouvrez `coverage/index.html` dans votre navigateur
3. Identifiez les fichiers avec une couverture < 80%
4. Créez des tests pour ces fichiers dans `__tests__/`

## Écrire de Nouveaux Tests

### Tests de Composants

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonComposant } from '../MonComposant';

describe('MonComposant', () => {
  it('should render correctly', () => {
    render(<MonComposant />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Tests d'Utilitaires

```typescript
import { describe, it, expect } from 'vitest';
import { maFonction } from '../monUtilitaire';

describe('monUtilitaire', () => {
  it('should process data correctly', () => {
    const result = maFonction('input');
    expect(result).toBe('expected output');
  });
});
```

### Tests E2E

```typescript
import { test, expect } from '@playwright/test';

test.describe('Fonctionnalité', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('element')).toBeVisible();
  });
});
```

## Bonnes Pratiques

### 1. Utiliser des data-testid

Les éléments critiques doivent avoir des `data-testid` pour les tests E2E :

```tsx
<button data-testid="send-button">Envoyer</button>
```

### 2. Tests Isolés

Chaque test doit être indépendant et ne pas dépendre d'autres tests :

```typescript
beforeEach(() => {
  // Réinitialiser l'état avant chaque test
});
```

### 3. Mocker les Dépendances

Utilisez des mocks pour les dépendances externes :

```typescript
vi.mock('../api', () => ({
  fetchData: vi.fn(() => Promise.resolve(mockData))
}));
```

### 4. Tester les Cas Limites

N'oubliez pas de tester :
- Valeurs vides
- Valeurs null/undefined
- Erreurs
- États de chargement

## Tests E2E avec Playwright

### Configuration

Les tests E2E sont configurés pour s'exécuter sur :
- Chrome (desktop)
- Firefox (desktop)
- Safari (desktop)
- Chrome Mobile
- Safari Mobile

### Data-testid Disponibles

Les principaux éléments ont des `data-testid` :

- `app-loaded` : Application chargée
- `orion-logo` : Logo ORION
- `chat-input` : Input de chat
- `send-button` : Bouton d'envoi
- `orion-message` : Message de l'IA
- `chat-message` : Message utilisateur
- `cognitive-flow` : Flux cognitif
- `settings-button` : Bouton paramètres
- `theme-toggle` : Toggle du thème
- `sidebar` : Barre latérale
- `suggestion-chip` : Puces de suggestion
- `menu-button` : Bouton menu

## CI/CD

Les tests sont automatiquement exécutés sur GitHub Actions :

### Workflow

1. **Tests Unitaires** : Exécutés sur chaque push et PR
2. **Tests E2E** : Exécutés sur chaque push et PR
3. **Couverture** : Rapport envoyé à Codecov

### Configuration GitHub Actions

Le fichier `.github/workflows/tests.yml` configure l'exécution automatique des tests.

## Dépannage

### Tests E2E Échouent Localement

```bash
# Réinstaller les navigateurs Playwright
npx playwright install --with-deps
```

### Tests Unitaires Lents

```bash
# Exécuter uniquement les tests modifiés
npm run test -- --changed
```

### Problèmes de Couverture

```bash
# Nettoyer le cache
rm -rf coverage/
npm run test:coverage
```

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Guide Testing React](https://react.dev/learn/testing)

## Contribution

Lors de l'ajout de nouvelles fonctionnalités :

1. ✅ Écrivez les tests **avant** le code (TDD)
2. ✅ Assurez-vous que tous les tests passent
3. ✅ Maintenez une couverture ≥ 80%
4. ✅ Ajoutez des `data-testid` pour les éléments critiques
5. ✅ Documentez les comportements complexes

## Contact

Pour toute question sur les tests, consultez l'équipe de développement ORION.
