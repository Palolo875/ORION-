# 🧪 Guide des Tests ORION

Ce guide couvre tous les aspects des tests dans ORION : unitaires, intégration et E2E.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Tests Unitaires](#tests-unitaires)
- [Tests d'Intégration](#tests-dintégration)
- [Tests End-to-End](#tests-end-to-end)
- [Coverage](#coverage)
- [Bonnes Pratiques](#bonnes-pratiques)
- [CI/CD](#cicd)

## 🎯 Vue d'ensemble

### Stack de test

- **Vitest** - Framework de test rapide pour tests unitaires et d'intégration
- **Playwright** - Tests E2E cross-browser
- **Testing Library** - Utilitaires pour tester les composants React
- **@vitest/coverage-v8** - Coverage des tests

### Commandes rapides

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Tests avec coverage
npm run test:coverage

# Tests E2E
npm run test:e2e

# Tests E2E en mode UI
npm run test:e2e:ui

# Tous les tests
npm run test && npm run test:e2e
```

## 🔬 Tests Unitaires

### Configuration

Les tests unitaires utilisent Vitest et sont configurés dans `vitest.config.ts` :

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts']
    }
  }
});
```

### Structure des tests

```
src/
  components/
    MyComponent.tsx
    __tests__/
      MyComponent.test.tsx
  utils/
    helpers.ts
    __tests__/
      helpers.test.ts
  workers/
    llm.worker.ts
    __tests__/
      llm.worker.test.ts
```

### Exemple de test de composant

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Exemple de test d'utilitaire

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, calculateScore } from '../helpers';

describe('helpers', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-01-15');
      expect(formatDate(date)).toBe('15/01/2025');
    });

    it('should handle invalid dates', () => {
      expect(formatDate(null)).toBe('Invalid date');
    });
  });

  describe('calculateScore', () => {
    it('should calculate score with default weights', () => {
      const result = calculateScore({ accuracy: 0.9, speed: 0.8 });
      expect(result).toBeCloseTo(0.85, 2);
    });
  });
});
```

### Mocking

#### Mocking de modules

```typescript
// Mock d'un module entier
vi.mock('@mlc-ai/web-llm', () => ({
  WebWorkerMLCEngine: {
    create: vi.fn().mockResolvedValue({
      reload: vi.fn(),
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'Response' } }]
          })
        }
      }
    })
  }
}));
```

#### Mocking de fonctions

```typescript
// Mock d'une fonction spécifique
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Setup du mock
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: 'test' })
});
```

#### Mocking de Workers

```typescript
// Mock des Web Workers (configuré dans setup.ts)
vi.mock('worker-loader!../workers/llm.worker', () => ({
  default: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn()
  }))
}));
```

## 🔗 Tests d'Intégration

Les tests d'intégration vérifient l'interaction entre plusieurs modules.

```typescript
describe('Orchestrator Integration', () => {
  it('should coordinate between LLM and Memory workers', async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.initialize();

    const response = await orchestrator.processQuery({
      query: 'What is AI?',
      conversationHistory: []
    });

    expect(response).toHaveProperty('answer');
    expect(response).toHaveProperty('sources');
  });
});
```

### Tests avec vrais modèles

```bash
# Tests avec vrais modèles LLM (lent, nécessite WebGPU)
LOAD_REAL_MODELS=true npm run test:integration
```

## 🌐 Tests End-to-End

### Configuration Playwright

Les tests E2E utilisent Playwright configuré dans `playwright.config.ts` :

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Structure des tests E2E

```
e2e/
  chat.spec.ts
  model-selection.spec.ts
  memory.spec.ts
  settings.spec.ts
```

### Exemple de test E2E

```typescript
import { test, expect } from '@playwright/test';

test('user can send a message and receive response', async ({ page }) => {
  await page.goto('/');

  // Attendre que l'app soit chargée
  await expect(page.getByText('Bienvenue dans ORION')).toBeVisible();

  // Sélectionner un modèle
  await page.getByRole('button', { name: 'Standard' }).click();

  // Envoyer un message
  const input = page.getByPlaceholder('Votre message...');
  await input.fill('Bonjour ORION');
  await input.press('Enter');

  // Vérifier la réponse
  await expect(page.getByText('Bonjour')).toBeVisible({ timeout: 30000 });
});
```

### Tests multi-browser

```bash
# Tester sur tous les navigateurs
npx playwright test

# Tester sur un navigateur spécifique
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📊 Coverage

### Générer un rapport de coverage

```bash
# Générer le coverage
npm run test:coverage

# Ouvrir le rapport HTML
open coverage/index.html
```

### Objectifs de coverage

- **Statements** : > 80%
- **Branches** : > 75%
- **Functions** : > 80%
- **Lines** : > 80%

### Exclure du coverage

Fichiers exclus (configuré dans vitest.config.ts) :
- `node_modules/`
- `src/test/`
- `**/*.d.ts`
- `**/*.config.*`
- `**/__mocks__/**`

## ✅ Bonnes Pratiques

### Nommage des tests

```typescript
// ✅ BON - Descriptif et clair
it('should display error message when API fails', () => {})
it('should disable submit button when form is invalid', () => {})

// ❌ MAUVAIS - Vague et peu informatif
it('works', () => {})
it('test1', () => {})
```

### Organisation des tests

```typescript
describe('UserProfile', () => {
  describe('rendering', () => {
    it('should render user name', () => {})
    it('should render user avatar', () => {})
  });

  describe('interactions', () => {
    it('should open settings on button click', () => {})
  });

  describe('edge cases', () => {
    it('should handle missing user data', () => {})
  });
});
```

### Arrange-Act-Assert (AAA)

```typescript
it('should calculate total price correctly', () => {
  // Arrange
  const cart = createCart();
  cart.addItem({ price: 10, quantity: 2 });
  cart.addItem({ price: 5, quantity: 3 });

  // Act
  const total = cart.getTotal();

  // Assert
  expect(total).toBe(35);
});
```

### Tests isolés

```typescript
// ✅ BON - Chaque test est indépendant
describe('Counter', () => {
  it('should increment', () => {
    const counter = new Counter();
    counter.increment();
    expect(counter.value).toBe(1);
  });

  it('should decrement', () => {
    const counter = new Counter();
    counter.decrement();
    expect(counter.value).toBe(-1);
  });
});

// ❌ MAUVAIS - Tests dépendants
let counter; // État partagé

it('should increment', () => {
  counter = new Counter();
  counter.increment();
  expect(counter.value).toBe(1);
});

it('should decrement', () => {
  counter.decrement(); // Dépend du test précédent
  expect(counter.value).toBe(0);
});
```

### Éviter les magic numbers

```typescript
// ✅ BON
const EXPECTED_RESPONSE_TIME_MS = 1000;
expect(responseTime).toBeLessThan(EXPECTED_RESPONSE_TIME_MS);

// ❌ MAUVAIS
expect(responseTime).toBeLessThan(1000);
```

## 🔄 CI/CD

Les tests sont automatiquement exécutés sur GitHub Actions pour chaque push et PR.

```yaml
# .github/workflows/tests.yml
jobs:
  unit-tests:
    - run: npm run test
    - run: npm run test:coverage
    
  e2e-tests:
    - run: npm run test:e2e
    
  lint:
    - run: npm run lint
```

### Badges de statut

[![Tests](https://github.com/org/orion/actions/workflows/tests.yml/badge.svg)](https://github.com/org/orion/actions/workflows/tests.yml)

## 📚 Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Rappel** : Les tests ne sont pas une perte de temps, ils sont un investissement dans la qualité et la maintenabilité du code !
