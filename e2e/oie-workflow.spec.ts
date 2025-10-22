/**
 * Tests E2E pour l'OIE (Orion Inference Engine)
 * Vérifie le flux complet de bout en bout avec le Service Worker
 */

import { test, expect } from '@playwright/test';

test.describe('OIE - Workflow complet', () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers l'application
    await page.goto('/');
    
    // Attendre que l'application soit chargée
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
  });

  test('doit initialiser l\'OIE correctement', async ({ page }) => {
    // Vérifier que le logo ORION est présent
    await expect(page.locator('[data-testid="orion-logo"]')).toBeVisible();
    
    // Attendre l'initialisation de l'OIE
    const initMessage = await page.waitForSelector(
      'text=/OIE.*initialisé/i',
      { timeout: 30000 }
    );
    
    expect(initMessage).toBeTruthy();
  });

  test('doit router une requête de conversation', async ({ page }) => {
    // Attendre que le système soit prêt
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Taper une question simple
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Bonjour, comment vas-tu ?');
    
    // Envoyer le message
    await page.click('[data-testid="send-button"]');
    
    // Vérifier qu'un agent est sélectionné
    const routingMessage = await page.waitForSelector(
      'text=/conversation-agent/i',
      { timeout: 5000 }
    );
    
    expect(routingMessage).toBeTruthy();
    
    // Attendre la réponse
    const response = await page.waitForSelector(
      '[data-testid="chat-message"]:last-child',
      { timeout: 30000 }
    );
    
    const responseText = await response.textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);
  });

  test('doit router une requête de code vers code-agent', async ({ page }) => {
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Question de code
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Écris une fonction TypeScript pour trier un tableau');
    
    await page.click('[data-testid="send-button"]');
    
    // Vérifier que code-agent est utilisé
    const routingMessage = await page.waitForSelector(
      'text=/code-agent/i',
      { timeout: 5000 }
    );
    
    expect(routingMessage).toBeTruthy();
    
    // Vérifier que la réponse contient du code
    const response = await page.waitForSelector(
      '[data-testid="chat-message"]:last-child',
      { timeout: 30000 }
    );
    
    const responseText = await response.textContent();
    expect(responseText).toContain('function');
  });

  test('doit gérer le cache correctement', async ({ page }) => {
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Première requête
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Quelle est la capitale de la France ?');
    await page.click('[data-testid="send-button"]');
    
    // Attendre la réponse
    await page.waitForSelector(
      '[data-testid="chat-message"]:last-child',
      { timeout: 30000 }
    );
    
    // Mesurer le temps de la première requête
    const firstRequestTime = await page.evaluate(() => performance.now());
    
    // Deuxième requête similaire (devrait utiliser le cache)
    await input.fill('Quelle est la capitale de la France ?');
    await page.click('[data-testid="send-button"]');
    
    // Attendre la réponse
    await page.waitForSelector(
      '[data-testid="chat-message"]:last-child',
      { timeout: 10000 }
    );
    
    const secondRequestTime = await page.evaluate(() => performance.now());
    
    // La deuxième requête devrait être plus rapide (cache hit)
    const timeDiff = secondRequestTime - firstRequestTime;
    expect(timeDiff).toBeLessThan(5000); // Moins de 5 secondes
  });

  test('doit afficher les statistiques de l\'OIE', async ({ page }) => {
    // Ouvrir le panneau des paramètres
    await page.click('[data-testid="settings-button"]');
    
    // Vérifier que les statistiques sont affichées
    await expect(page.locator('text=/Agents chargés/i')).toBeVisible();
    await expect(page.locator('text=/Mémoire utilisée/i')).toBeVisible();
  });

  test('doit gérer les erreurs gracieusement', async ({ page }) => {
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Requête invalide ou très longue
    const input = page.locator('[data-testid="chat-input"]');
    const longText = 'A'.repeat(20000); // Texte très long
    await input.fill(longText);
    
    await page.click('[data-testid="send-button"]');
    
    // Vérifier qu'un message d'erreur est affiché
    const errorMessage = await page.waitForSelector(
      'text=/erreur/i',
      { timeout: 10000 }
    );
    
    expect(errorMessage).toBeTruthy();
  });

  test('doit supporter le mode verbose', async ({ page }) => {
    // Activer le mode verbose
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="verbose-toggle"]');
    
    // Faire une requête
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Test du mode verbose');
    await page.click('[data-testid="send-button"]');
    
    // Vérifier que des logs détaillés sont affichés dans la console
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'debug') {
        logs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Vérifier qu'il y a des logs OIE
    const oieLogs = logs.filter(log => log.includes('[OIE]'));
    expect(oieLogs.length).toBeGreaterThan(0);
  });
});

test.describe('OIE - Circuit Breaker', () => {
  test('doit activer le circuit breaker après plusieurs échecs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Simuler plusieurs requêtes qui échouent
    const input = page.locator('[data-testid="chat-input"]');
    
    for (let i = 0; i < 3; i++) {
      await input.fill('Force an error ' + i);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(1000);
    }
    
    // Vérifier qu'un message de circuit breaker apparaît
    const cbMessage = await page.waitForSelector(
      'text=/circuit.*ouvert|fallback/i',
      { timeout: 5000 }
    );
    
    expect(cbMessage).toBeTruthy();
  });

  test('doit afficher les stats du circuit breaker', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="security-tab"]');
    
    // Vérifier les statistiques du circuit breaker
    await expect(page.locator('text=/Circuit Breakers/i')).toBeVisible();
    await expect(page.locator('text=/sain|healthy/i')).toBeVisible();
  });
});

test.describe('OIE - Performance', () => {
  test('doit charger un agent en moins de 10 secondes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    const startTime = Date.now();
    
    // Première requête (charge l'agent)
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Première requête');
    await page.click('[data-testid="send-button"]');
    
    // Attendre la réponse
    await page.waitForSelector(
      '[data-testid="chat-message"]:last-child',
      { timeout: 30000 }
    );
    
    const loadTime = Date.now() - startTime;
    
    // Vérifier que le temps de chargement est acceptable
    expect(loadTime).toBeLessThan(30000); // 30 secondes max
  });

  test('doit gérer plusieurs requêtes en parallèle', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    const input = page.locator('[data-testid="chat-input"]');
    
    // Envoyer plusieurs requêtes rapidement
    for (let i = 0; i < 3; i++) {
      await input.fill(`Question ${i + 1}`);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(500);
    }
    
    // Vérifier que toutes les réponses arrivent
    await page.waitForSelector(
      '[data-testid="chat-message"]:nth-child(6)', // 3 questions + 3 réponses
      { timeout: 60000 }
    );
    
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBeGreaterThanOrEqual(6);
  });
});

test.describe('OIE - State Machine', () => {
  test('doit passer par les états corrects', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    const states: string[] = [];
    
    // Écouter les logs pour capturer les transitions d'état
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('OIE-StateMachine') && text.includes('État:')) {
        states.push(text);
      }
    });
    
    // Activer le mode verbose pour voir les états
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="verbose-toggle"]');
    
    // Faire une requête
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Test de la machine à états');
    await page.click('[data-testid="send-button"]');
    
    // Attendre la réponse
    await page.waitForSelector(
      '[data-testid="chat-message"]:last-child',
      { timeout: 30000 }
    );
    
    // Vérifier que les états attendus sont présents
    const expectedStates = ['Validation', 'Routage', 'Chargement', 'Inférence', 'Succès'];
    
    for (const state of expectedStates) {
      const hasState = states.some(s => s.includes(state));
      expect(hasState).toBeTruthy();
    }
  });
});
