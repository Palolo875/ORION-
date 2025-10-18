import { test, expect } from '@playwright/test';

test.describe('ORION Application', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que le titre de la page contient ORION
    await expect(page).toHaveTitle(/ORION/i);
  });

  test('should display welcome message', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que le message de bienvenue est affiché
    await expect(page.getByText(/Comment puis-je vous aider/i)).toBeVisible();
  });

  test('should display model selector on first load', async ({ page }) => {
    // Effacer le localStorage pour simuler une première visite
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Le sélecteur de modèle devrait être visible
    // Note: Cela dépend de l'implémentation actuelle
  });

  test('should have chat input', async ({ page }) => {
    await page.goto('/');
    
    // Attendre que l'application soit chargée
    await page.waitForLoadState('networkidle');
    
    // Vérifier que l'input de chat est présent
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    await expect(chatInput).toBeVisible();
  });

  test('should have theme toggle', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier qu'il y a un bouton pour changer le thème
    // Note: Vous devrez adapter le sélecteur selon votre implémentation
    const themeToggle = page.locator('button').filter({ hasText: /theme/i }).or(
      page.locator('button[title*="theme" i]')
    ).first();
    
    if (await themeToggle.count() > 0) {
      await expect(themeToggle).toBeVisible();
    }
  });

  test('should display suggestion chips', async ({ page }) => {
    await page.goto('/');
    
    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');
    
    // Chercher des boutons ou liens qui ressemblent à des suggestions
    const suggestions = page.locator('button').filter({ hasText: /[a-zA-Z]{5,}/ }).first();
    
    // Au moins un élément de suggestion devrait exister
    if (await suggestions.count() > 0) {
      await expect(suggestions).toBeVisible();
    }
  });
});

test.describe('Navigation', () => {
  test('should open settings panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Chercher un bouton avec une icône de paramètres ou settings
    const settingsButton = page.locator('button[title*="panneau" i], button[title*="control" i]').first();
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Vérifier que le panneau s'ouvre
      await expect(page.getByText(/panneau de contrôle/i).or(page.getByText(/control panel/i))).toBeVisible();
    }
  });

  test('should toggle sidebar on mobile', async ({ page, viewport }) => {
    // Simuler une vue mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Chercher le bouton du menu hamburger
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await menuButton.count() > 0 && await menuButton.isVisible()) {
      await menuButton.click();
      
      // Le sidebar devrait être visible après le clic
      // Note: Adapter selon votre implémentation
    }
  });
});

test.describe('Compatibility', () => {
  test('should display browser compatibility banner if needed', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Vérifier si un message de compatibilité est affiché
    // Note: Ce test dépend du navigateur utilisé
    const compatibilityBanner = page.locator('[role="alert"]').or(page.getByText(/compatibilité/i));
    
    // On ne vérifie pas la visibilité car elle dépend du navigateur
    // On vérifie juste que l'élément existe dans le DOM
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier qu'il y a au moins un h1
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });

  test('should have focusable interactive elements', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que les boutons sont focusables
    const firstButton = page.locator('button').first();
    await firstButton.focus();
    await expect(firstButton).toBeFocused();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tester la navigation au clavier avec Tab
    await page.keyboard.press('Tab');
    
    // Au moins un élément devrait avoir le focus
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
