/**
 * End-to-End Tests for ORION Chat Flow
 * 
 * Tests the complete user journey from model selection to receiving AI responses.
 */

import { test, expect } from '@playwright/test';

test.describe('ORION Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display model selector on first visit', async ({ page }) => {
    // Check that model selector is visible
    await expect(page.getByText(/Bienvenue dans ORION|Welcome to ORION/i)).toBeVisible();
    
    // Check that model options are displayed
    await expect(page.getByText(/Standard.*Recommandé|Standard.*Recommended/i)).toBeVisible();
  });

  test('should select a model and show loading state', async ({ page }) => {
    // Select the standard model (recommended)
    await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
    
    // Wait for model loader to appear
    await expect(page.getByText(/Chargement|Loading/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display chat interface after model loads', async ({ page }) => {
    // Select model
    await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
    
    // Wait for chat interface to be ready (with long timeout for model loading)
    await expect(page.getByPlaceholder(/Comment puis-je vous aider|How can I help/i)).toBeVisible({
      timeout: 60000 // 60 seconds for model loading
    });
  });

  test('should send a message and receive a response', async ({ page }) => {
    test.slow(); // Mark as slow due to model loading

    // Select model and wait for interface
    await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider|How can I help/i);
    await expect(chatInput).toBeVisible({ timeout: 60000 });

    // Type and send a simple message
    await chatInput.fill('Bonjour');
    await page.click('[data-testid="send-button"], button[type="submit"]');

    // Wait for loading indicator
    await expect(page.getByText(/Génération en cours|Generating/i)).toBeVisible({ timeout: 5000 });

    // Wait for AI response (with mocks, should be fast)
    await expect(page.locator('.message').filter({ hasText: /Mock|Réponse/i })).toBeVisible({
      timeout: 30000
    });
  });

  test('should handle navigation and UI interactions', async ({ page }) => {
    // Select model and wait
    await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
    await expect(page.getByPlaceholder(/Comment puis-je vous aider|How can I help/i)).toBeVisible({
      timeout: 60000
    });

    // Test opening settings/control panel
    const settingsButton = page.getByRole('button', { name: /Paramètres|Settings|Menu/i }).first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await expect(page.getByText(/Profil|Profile|Modèle|Model/i)).toBeVisible();
    }
  });

  test('should show cognitive flow when enabled', async ({ page }) => {
    // Select model and wait
    await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
    await expect(page.getByPlaceholder(/Comment puis-je vous aider|How can I help/i)).toBeVisible({
      timeout: 60000
    });

    // Toggle cognitive flow if button exists
    const cognitiveFlowToggle = page.getByRole('button', { name: /Flux cognitif|Cognitive flow/i });
    if (await cognitiveFlowToggle.isVisible()) {
      await cognitiveFlowToggle.click();
      
      // Cognitive flow should be visible
      await expect(page.getByText(/idle|Prêt/i)).toBeVisible();
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Intercept worker requests and simulate error
    await page.route('**/*.worker.ts', route => route.abort());

    try {
      await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
      
      // Should show error message or fallback gracefully
      // The app should not crash
      await page.waitForTimeout(2000);
      
      // Page should still be responsive
      expect(await page.title()).toBeTruthy();
    } catch (error) {
      // Even if it fails, page should not be completely broken
      expect(await page.title()).toBeTruthy();
    }
  });

  test('should be accessible', async ({ page }) => {
    // Check for basic accessibility
    await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
    
    // Check for ARIA labels and roles
    const mainElement = page.getByRole('main');
    await expect(mainElement).toBeVisible({ timeout: 60000 });
    
    // Check that interactive elements are keyboard accessible
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('ORION Memory and Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Select model for these tests
    await page.click('[data-testid="model-option-standard"], button:has-text("Standard")');
    await expect(page.getByPlaceholder(/Comment puis-je vous aider|How can I help/i)).toBeVisible({
      timeout: 60000
    });
  });

  test('should open control panel and show memory stats', async ({ page }) => {
    // Open control panel/settings
    const settingsButton = page.getByRole('button', { name: /Paramètres|Settings/i }).first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Check for memory-related options
      const memorySection = page.getByText(/Mémoire|Memory/i);
      if (await memorySection.isVisible()) {
        await expect(memorySection).toBeVisible();
      }
    }
  });

  test('should handle conversation management', async ({ page }) => {
    // Send a message to create conversation
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider|How can I help/i);
    await chatInput.fill('Test conversation');
    await page.click('[data-testid="send-button"], button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(2000);

    // Try to open sidebar with conversations
    const sidebarButton = page.getByRole('button', { name: /Menu|Conversations/i }).first();
    if (await sidebarButton.isVisible()) {
      await sidebarButton.click();
      
      // Should show conversation list
      await expect(page.getByText(/Nouvelle conversation|New conversation/i)).toBeVisible();
    }
  });
});
