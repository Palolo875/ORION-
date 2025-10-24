/**
 * Tests E2E pour l'Orion Inference Engine (OIE)
 * Valide les scénarios critiques de bout en bout
 */

import { test, expect } from '@playwright/test';

test.describe('OIE Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers l'application
    await page.goto('/');
    
    // Attendre que l'interface soit chargée
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });
  
  test('Scénario 1: Chargement du modèle Lite', async ({ page }) => {
    // Vérifier que l'OIE est initialisé
    const oieStatus = await page.evaluate(() => {
      return (window as Window & { oieReady?: boolean }).oieReady;
    });
    
    // Le moteur devrait être prêt ou en cours de chargement
    expect(oieStatus !== undefined).toBeTruthy();
    
    // Attendre que le modèle soit chargé (max 30s)
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Vérifier le message de confirmation
    const statusMessage = await page.textContent('[data-testid="oie-status"]');
    expect(statusMessage).toContain('prêt');
  });
  
  test('Scénario 2: Routage correct vers agent Code', async ({ page }) => {
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Envoyer une requête de code
    const codeQuery = 'Écris une fonction TypeScript pour valider un email';
    
    await page.fill('[data-testid="chat-input"]', codeQuery);
    await page.click('[data-testid="send-button"]');
    
    // Attendre la réponse
    await page.waitForSelector('[data-testid="agent-response"]', { timeout: 60000 });
    
    // Vérifier que l'agent Code a été utilisé
    const agentUsed = await page.textContent('[data-testid="agent-indicator"]');
    expect(agentUsed).toContain('code-agent');
    
    // Vérifier que la réponse contient du code
    const response = await page.textContent('[data-testid="agent-response"]');
    expect(response).toContain('function');
  });
  
  test('Scénario 3: Bascule vers modèle Full', async ({ page }) => {
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Ouvrir les paramètres
    await page.click('[data-testid="settings-button"]');
    
    // Activer le mode Full
    await page.click('[data-testid="toggle-full-mode"]');
    
    // Attendre le chargement du modèle Full
    await page.waitForSelector('[data-testid="loading-progress"]', { timeout: 5000 });
    
    // Vérifier la progression
    const progressBar = page.locator('[data-testid="loading-progress"]');
    await expect(progressBar).toBeVisible();
    
    // Attendre que le chargement soit terminé (max 2 min)
    await page.waitForFunction(
      () => {
        const progress = document.querySelector('[data-testid="loading-progress"]');
        return progress?.getAttribute('data-progress') === '100';
      },
      { timeout: 120000 }
    );
    
    // Vérifier que le mode Full est actif
    const modeIndicator = await page.textContent('[data-testid="model-mode"]');
    expect(modeIndicator).toContain('Full');
  });
  
  test('Scénario 4: Déchargement d\'agent par CacheManager (LRU)', async ({ page }) => {
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Charger plusieurs agents en séquence
    const queries = [
      'Écris du code Python',  // Code agent
      'Traduis en espagnol',   // Multilingual agent
      'Analyse cette image',    // Vision agent (si activé)
    ];
    
    for (const query of queries) {
      await page.fill('[data-testid="chat-input"]', query);
      await page.click('[data-testid="send-button"]');
      await page.waitForSelector('[data-testid="agent-response"]', { timeout: 60000 });
      
      // Petit délai entre les requêtes
      await page.waitForTimeout(2000);
    }
    
    // Vérifier les stats du cache
    const cacheStats = await page.evaluate(() => {
      return (window as Window & { 
        getCacheStats?: () => { 
          agentsLoaded: number; 
          totalMemoryMB: number 
        } 
      }).getCacheStats?.();
    });
    
    expect(cacheStats).toBeDefined();
    expect(cacheStats!.agentsLoaded).toBeGreaterThan(0);
  });
  
  test('Scénario 5: Streaming de tokens en temps réel', async ({ page }) => {
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Envoyer une requête
    await page.fill('[data-testid="chat-input"]', 'Raconte une courte histoire');
    await page.click('[data-testid="send-button"]');
    
    // Vérifier que le streaming commence
    await page.waitForSelector('[data-testid="streaming-indicator"]', { timeout: 5000 });
    
    // Vérifier que le texte apparaît progressivement
    let previousLength = 0;
    let streamingDetected = false;
    
    for (let i = 0; i < 10; i++) {
      const currentText = await page.textContent('[data-testid="agent-response"]');
      const currentLength = currentText?.length || 0;
      
      if (currentLength > previousLength) {
        streamingDetected = true;
      }
      
      previousLength = currentLength;
      await page.waitForTimeout(500);
    }
    
    expect(streamingDetected).toBeTruthy();
    
    // Attendre la fin du streaming
    await page.waitForSelector('[data-testid="streaming-indicator"]', { 
      state: 'hidden',
      timeout: 60000 
    });
  });
  
  test('Scénario 6: Circuit Breaker - Gestion d\'erreur', async ({ page }) => {
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Simuler une erreur en envoyant une requête invalide
    await page.evaluate(() => {
      // Forcer une erreur dans l'agent
      (window as Window & { 
        forceAgentError?: (agentId: string) => void 
      }).forceAgentError?.('conversation-agent');
    });
    
    // Envoyer plusieurs requêtes pour déclencher le circuit breaker
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="chat-input"]', 'Test circuit breaker');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(2000);
    }
    
    // Vérifier qu'un message d'erreur est affiché
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toBeTruthy();
    
    // Vérifier que le fallback a été utilisé
    const fallbackIndicator = await page.textContent('[data-testid="fallback-indicator"]');
    expect(fallbackIndicator).toContain('fallback');
  });
  
  test('Scénario 7: WebGPU Detection et Fallback', async ({ page }) => {
    // Vérifier la détection de WebGPU
    const webgpuStatus = await page.evaluate(() => {
      return {
        available: 'gpu' in navigator,
        backend: (window as Window & { 
          inferenceBackend?: string 
        }).inferenceBackend
      };
    });
    
    expect(webgpuStatus).toBeDefined();
    expect(['webgpu', 'wasm', 'cpu']).toContain(webgpuStatus.backend);
    
    // Vérifier le message de compatibilité
    if (!webgpuStatus.available) {
      const compatMessage = await page.textContent('[data-testid="webgpu-warning"]');
      expect(compatMessage).toContain('WebGPU');
    }
  });
  
  test('Scénario 8: Validation de la performance (TTFT)', async ({ page }) => {
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Mesurer le Time To First Token
    const startTime = Date.now();
    
    await page.fill('[data-testid="chat-input"]', 'Bonjour');
    await page.click('[data-testid="send-button"]');
    
    // Attendre le premier token
    await page.waitForSelector('[data-testid="streaming-indicator"]', { timeout: 10000 });
    
    const ttft = Date.now() - startTime;
    
    // TTFT devrait être < 5 secondes pour un modèle déjà chargé
    expect(ttft).toBeLessThan(5000);
    
    console.log(`TTFT: ${ttft}ms`);
  });
  
  test('Scénario 9: Logs structurés et debugging', async ({ page }) => {
    // Capturer les logs console
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('[OIE]')) {
        logs.push(msg.text());
      }
    });
    
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Envoyer une requête
    await page.fill('[data-testid="chat-input"]', 'Test logging');
    await page.click('[data-testid="send-button"]');
    
    await page.waitForTimeout(3000);
    
    // Vérifier que des logs structurés ont été émis
    expect(logs.length).toBeGreaterThan(0);
    
    // Vérifier le format des logs
    const hasRouterLog = logs.some(log => log.includes('Routage'));
    const hasAgentLog = logs.some(log => log.includes('Agent'));
    
    expect(hasRouterLog || hasAgentLog).toBeTruthy();
  });
  
  test('Scénario 10: Persistence et versioning des modèles', async ({ page }) => {
    // Vérifier que le registry des modèles est accessible
    const modelRegistry = await page.evaluate(async () => {
      const response = await fetch('/models.json');
      return await response.json();
    });
    
    expect(modelRegistry).toBeDefined();
    expect(modelRegistry.version).toBeDefined();
    expect(modelRegistry.models).toBeDefined();
    
    // Vérifier que les modèles hybrides ORION sont présents
    const hasHybridModels = 'hybrid-developer' in modelRegistry.models;
    expect(hasHybridModels).toBeTruthy();
    
    // Vérifier les métadonnées de fusion
    if (hasHybridModels) {
      const hybridModel = modelRegistry.models['hybrid-developer'];
      expect(hybridModel.metadata?.fusion).toBeDefined();
      expect(hybridModel.metadata?.fusion?.method).toBe('slerp');
    }
  });
});

test.describe('OIE Performance Tests', () => {
  test('Mesure des métriques de performance', async ({ page }) => {
    await page.goto('/');
    
    // Attendre que l'OIE soit prêt
    await page.waitForFunction(
      () => (window as Window & { oieReady?: boolean }).oieReady === true,
      { timeout: 30000 }
    );
    
    // Obtenir les métriques de performance
    const perfMetrics = await page.evaluate(() => {
      return (window as Window & { 
        getOIEMetrics?: () => {
          initTime: number;
          routingLatency: number;
          inferenceLatency: number;
          cacheHitRate: number;
        }
      }).getOIEMetrics?.();
    });
    
    expect(perfMetrics).toBeDefined();
    
    // Vérifier que les métriques sont dans des limites acceptables
    if (perfMetrics) {
      expect(perfMetrics.initTime).toBeLessThan(60000); // < 1 min
      expect(perfMetrics.routingLatency).toBeLessThan(100); // < 100ms
      expect(perfMetrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(perfMetrics.cacheHitRate).toBeLessThanOrEqual(1);
    }
  });
});
