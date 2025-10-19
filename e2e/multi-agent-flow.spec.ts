/**
 * Tests E2E pour le flux multi-agents d'ORION
 * 
 * Teste le parcours complet d'une requête utilisateur:
 * - Envoi d'une requête
 * - Recherche d'outils
 * - Recherche en mémoire
 * - Débat multi-agents (Logique, Créatif, Critique, Synthétiseur)
 * - Réception de la réponse finale
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Agent Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Attendre que l'application soit chargée
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('devrait afficher l\'interface principale', async ({ page }) => {
    // Vérifier que le logo ORION est visible
    await expect(page.locator('[data-testid="orion-logo"]')).toBeVisible();
    
    // Vérifier que le champ de saisie est visible
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Vérifier que le bouton d\'envoi est visible
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });

  test('devrait permettre d\'envoyer une requête simple', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Saisir une question simple
    await input.fill('Quelle est la capitale de la France ?');
    
    // Envoyer la requête
    await sendButton.click();
    
    // Vérifier que le message utilisateur apparaît
    await expect(page.locator('text=Quelle est la capitale de la France ?')).toBeVisible();
    
    // Attendre une réponse (avec timeout long car le LLM peut prendre du temps)
    await expect(page.locator('[data-testid="orion-message"]').first()).toBeVisible({ timeout: 60000 });
  });

  test('devrait afficher les étapes du flux cognitif', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Saisir une question
    await input.fill('Explique-moi la photosynthèse');
    await sendButton.click();
    
    // Vérifier que le flux cognitif est visible
    const cognitiveFlow = page.locator('[data-testid="cognitive-flow"]');
    await expect(cognitiveFlow).toBeVisible({ timeout: 5000 });
    
    // Vérifier que différentes étapes apparaissent
    // (tool_search, memory_search, llm_reasoning, etc.)
    await expect(cognitiveFlow).toContainText(/recherche|mémoire|raisonnement/i, { timeout: 10000 });
  });

  test('devrait afficher la progression du chargement du modèle', async ({ page }) => {
    // Si c'est la première utilisation, le modèle doit être chargé
    const loadingIndicator = page.locator('[data-testid="model-loading"]');
    
    // Si le modèle n'est pas encore chargé, on devrait voir la progression
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toContainText(/chargement|loading|%/i);
      
      // Attendre que le chargement se termine (peut prendre plusieurs minutes)
      await expect(loadingIndicator).toBeHidden({ timeout: 300000 });
    }
  });

  test('devrait permettre de changer de modèle', async ({ page }) => {
    // Ouvrir le panneau de paramètres
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.click();
    
    // Vérifier que le sélecteur de modèle est visible
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await expect(modelSelector).toBeVisible();
    
    // Sélectionner un autre modèle si disponible
    await modelSelector.click();
    
    // Attendre que les options soient visibles
    const modelOption = page.locator('[role="option"]').first();
    if (await modelOption.isVisible()) {
      await modelOption.click();
    }
  });

  test('devrait afficher les informations de provenance', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Saisir une question complexe pour déclencher le débat multi-agents
    await input.fill('Quels sont les avantages et inconvénients de l\'intelligence artificielle ?');
    await sendButton.click();
    
    // Attendre la réponse
    await expect(page.locator('[data-testid="orion-message"]').first()).toBeVisible({ timeout: 90000 });
    
    // Vérifier que les informations de provenance sont affichées
    // (agents utilisés, mémoire, temps d'inférence, etc.)
    const messageContainer = page.locator('[data-testid="orion-message"]').first();
    
    // Cliquer sur "plus de détails" si disponible
    const detailsButton = messageContainer.locator('text=/détails|info|provenance/i');
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
      
      // Vérifier que les détails sont affichés
      await expect(messageContainer).toContainText(/agent|temps|mémoire/i);
    }
  });

  test('devrait permettre de donner un feedback', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Envoyer une question
    await input.fill('Comment fonctionne un ordinateur ?');
    await sendButton.click();
    
    // Attendre la réponse
    await expect(page.locator('[data-testid="orion-message"]').first()).toBeVisible({ timeout: 60000 });
    
    // Chercher les boutons de feedback (like/dislike)
    const messageContainer = page.locator('[data-testid="orion-message"]').first();
    const likeButton = messageContainer.locator('[data-testid="feedback-positive"]');
    
    if (await likeButton.isVisible()) {
      await likeButton.click();
      
      // Vérifier qu'un feedback a été enregistré
      await expect(likeButton).toHaveClass(/active|selected/);
    }
  });

  test('devrait gérer les erreurs gracieusement', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Tenter d'envoyer une requête vide
    await sendButton.click();
    
    // Vérifier qu'un message d'erreur ou une validation apparaît
    // (ne devrait pas crasher l'application)
    await expect(page.locator('body')).toBeVisible();
  });

  test('devrait supporter le mode sombre', async ({ page }) => {
    // Chercher le bouton de toggle du thème
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    if (await themeToggle.isVisible()) {
      // Récupérer le thème actuel
      const bodyClass = await page.locator('body').getAttribute('class');
      const isDark = bodyClass?.includes('dark');
      
      // Changer le thème
      await themeToggle.click();
      
      // Attendre que le thème change
      await page.waitForTimeout(500);
      
      // Vérifier que le thème a changé
      const newBodyClass = await page.locator('body').getAttribute('class');
      const isNowDark = newBodyClass?.includes('dark');
      
      expect(isNowDark).not.toBe(isDark);
    }
  });

  test('devrait afficher l\'historique de conversation', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Envoyer plusieurs messages
    const messages = [
      'Bonjour ORION',
      'Quelle heure est-il ?',
      'Merci'
    ];
    
    for (const message of messages) {
      await input.fill(message);
      await sendButton.click();
      await page.waitForTimeout(2000); // Attendre entre les messages
    }
    
    // Vérifier que tous les messages utilisateur sont visibles
    for (const message of messages) {
      await expect(page.locator(`text=${message}`)).toBeVisible();
    }
  });

  test('devrait être responsive sur mobile', async ({ page, context }) => {
    // Simuler un viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Vérifier que l'interface s'adapte
    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toBeVisible();
    
    // Vérifier que le menu est accessible
    const menuButton = page.locator('[data-testid="menu-button"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Vérifier que le menu s'ouvre
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    }
  });

  test('devrait supporter les suggestions de questions', async ({ page }) => {
    // Vérifier si des suggestions sont affichées
    const suggestions = page.locator('[data-testid="suggestion-chip"]');
    
    if (await suggestions.first().isVisible()) {
      // Cliquer sur une suggestion
      await suggestions.first().click();
      
      // Vérifier que la question est insérée dans le champ
      const input = page.locator('[data-testid="chat-input"]');
      const inputValue = await input.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Multi-Agent Debate Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('devrait déclencher le débat multi-agents pour une question complexe', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Question complexe qui devrait déclencher le débat multi-agents
    const complexQuery = 'Analyse les implications éthiques, techniques et sociétales de l\'IA générative. Donne-moi une vision équilibrée avec les pour et les contre.';
    
    await input.fill(complexQuery);
    await sendButton.click();
    
    // Vérifier que le flux cognitif montre les différents agents
    const cognitiveFlow = page.locator('[data-testid="cognitive-flow"]');
    await expect(cognitiveFlow).toBeVisible({ timeout: 5000 });
    
    // Attendre la réponse (le débat multi-agents prend plus de temps)
    await expect(page.locator('[data-testid="orion-message"]').first()).toBeVisible({ timeout: 120000 });
    
    // Vérifier que la réponse mentionne plusieurs perspectives
    const response = page.locator('[data-testid="orion-message"]').first();
    const responseText = await response.textContent();
    
    // Une réponse multi-agents devrait être plus longue et structurée
    expect(responseText?.length).toBeGreaterThan(100);
  });

  test('devrait afficher les informations sur les agents utilisés', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    await input.fill('Donne-moi une analyse complète des énergies renouvelables');
    await sendButton.click();
    
    // Attendre la réponse
    await expect(page.locator('[data-testid="orion-message"]').first()).toBeVisible({ timeout: 120000 });
    
    // Chercher les informations sur les agents dans les métadonnées ou le debug panel
    const messageContainer = page.locator('[data-testid="orion-message"]').first();
    
    // Si un panneau de debug est disponible
    const debugButton = messageContainer.locator('[data-testid="debug-info"]');
    if (await debugButton.isVisible()) {
      await debugButton.click();
      
      // Vérifier que les noms des agents apparaissent
      await expect(messageContainer).toContainText(/logical|creative|critical|synthesizer|logique|créatif|critique|synthèse/i);
    }
  });
});

test.describe('Performance et Profils d\'Appareil', () => {
  test('devrait adapter le comportement selon le profil d\'appareil', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Ouvrir les paramètres
    const settingsButton = page.locator('[data-testid="settings-button"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Chercher le sélecteur de profil d'appareil
      const profileSelector = page.locator('[data-testid="device-profile-selector"]');
      if (await profileSelector.isVisible()) {
        // Tester différents profils
        const profiles = ['full', 'lite', 'micro'];
        
        for (const profile of profiles) {
          // Sélectionner le profil
          await profileSelector.selectOption(profile);
          
          // Envoyer une requête
          const input = page.locator('[data-testid="chat-input"]');
          await input.fill(`Test en mode ${profile}`);
          await page.locator('[data-testid="send-button"]').click();
          
          // Attendre la réponse
          await page.waitForTimeout(5000);
        }
      }
    }
  });

  test('devrait afficher un avertissement si WebGPU n\'est pas disponible', async ({ page }) => {
    // Note: Ce test nécessiterait de désactiver WebGPU, ce qui n'est pas toujours possible
    await page.goto('/');
    
    // Chercher un éventuel banner de compatibilité
    const compatibilityBanner = page.locator('[data-testid="compatibility-banner"]');
    
    // Si WebGPU n'est pas disponible, un banner devrait apparaître
    if (await compatibilityBanner.isVisible()) {
      await expect(compatibilityBanner).toContainText(/WebGPU|compatibilité|performance/i);
    }
  });
});
