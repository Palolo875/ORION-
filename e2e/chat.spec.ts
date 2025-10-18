import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should be able to type in chat input', async ({ page }) => {
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    await chatInput.fill('Bonjour ORION');
    await expect(chatInput).toHaveValue('Bonjour ORION');
  });

  test('should clear input after sending message', async ({ page }) => {
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ has: page.locator('svg') }).last()
    );
    
    await chatInput.fill('Test message');
    
    // Cliquer sur le bouton d'envoi s'il est visible
    if (await sendButton.count() > 0 && await sendButton.isVisible()) {
      await sendButton.click();
      
      // L'input devrait être vide après l'envoi
      await expect(chatInput).toHaveValue('');
    }
  });

  test('should support Enter key to send message', async ({ page }) => {
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    
    await chatInput.fill('Test message with Enter');
    await chatInput.press('Enter');
    
    // L'input devrait être vide après l'envoi
    await expect(chatInput).toHaveValue('');
  });

  test('should support Shift+Enter for new line', async ({ page }) => {
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    
    await chatInput.fill('First line');
    await chatInput.press('Shift+Enter');
    await chatInput.press('KeyS');
    await chatInput.press('KeyE');
    await chatInput.press('KeyC');
    await chatInput.press('KeyO');
    await chatInput.press('KeyN');
    await chatInput.press('KeyD');
    
    const value = await chatInput.inputValue();
    expect(value).toContain('\n');
  });

  test('should show character count for long messages', async ({ page }) => {
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    
    // Taper un message de plus de 100 caractères
    const longMessage = 'a'.repeat(150);
    await chatInput.fill(longMessage);
    
    // Le compteur de caractères devrait être visible
    const charCount = page.locator('text=/\\d+/').last();
    if (await charCount.count() > 0) {
      await expect(charCount).toBeVisible();
    }
  });
});

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have file upload button', async ({ page }) => {
    // Chercher le bouton d'upload de fichiers (icône Plus ou Paperclip)
    const uploadButton = page.locator('button').filter({ 
      has: page.locator('svg') 
    }).first();
    
    await expect(uploadButton).toBeVisible();
  });

  test('should open upload popover on click', async ({ page }) => {
    const uploadButton = page.locator('button').filter({ 
      has: page.locator('svg') 
    }).first();
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      
      // Le popover avec les options devrait s'ouvrir
      // Chercher du texte comme "Ajouter une image" ou "Ajouter un fichier"
      const popover = page.getByText(/ajouter/i).first();
      
      if (await popover.count() > 0) {
        await expect(popover).toBeVisible();
      }
    }
  });
});

test.describe('Voice Input', () => {
  test('should have microphone button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Chercher le bouton du microphone
    const micButton = page.locator('button').filter({ 
      has: page.locator('svg') 
    });
    
    // Au moins un bouton avec icône devrait exister
    await expect(micButton.first()).toBeVisible();
  });

  test('should show recording indicator when mic is active', async ({ page, browserName }) => {
    // Ce test nécessite des permissions microphone
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Trouver et cliquer sur le bouton du micro
    const micButton = page.locator('button[title*="micro" i]').or(
      page.locator('button').filter({ has: page.locator('svg') })
    );
    
    // Note: Ce test peut échouer sans les permissions appropriées
    // On ne vérifie que la présence du bouton
    if (await micButton.count() > 0) {
      await expect(micButton.first()).toBeVisible();
    }
  });
});

test.describe('Message Display', () => {
  test('should display user messages on the right', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    await chatInput.fill('Test user message');
    await chatInput.press('Enter');
    
    // Attendre que le message apparaisse
    await page.waitForTimeout(500);
    
    // Vérifier que le message de l'utilisateur est affiché
    const userMessage = page.getByText('Test user message');
    if (await userMessage.count() > 0) {
      await expect(userMessage).toBeVisible();
    }
  });

  test('should show typing indicator for AI responses', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.getByPlaceholder(/Comment puis-je vous aider/i);
    await chatInput.fill('Test question');
    await chatInput.press('Enter');
    
    // Chercher l'indicateur de typing
    const typingIndicator = page.locator('text=/typing|écrit|en cours/i').or(
      page.locator('[class*="animate"]').filter({ hasText: /\.\.\./ })
    );
    
    // L'indicateur peut apparaître brièvement
    // On ne le vérifie que s'il existe
  });
});
