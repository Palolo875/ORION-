import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E d'ORION
 */
export default defineConfig({
  testDir: './e2e',
  
  // Timeout maximum pour chaque test
  timeout: 120 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
  },
  
  // Exécuter les tests en parallèle
  fullyParallel: true,
  
  // Échouer le build si des tests passent accidentellement en CI
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Nombre de workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter à utiliser
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // Configuration partagée pour tous les projets
  use: {
    // URL de base pour `await page.goto('/')`
    baseURL: 'http://localhost:8080',
    
    // Collecter les traces en cas d'échec
    trace: 'on-first-retry',
    
    // Prendre des captures d'écran uniquement en cas d'échec
    screenshot: 'only-on-failure',
    
    // Enregistrer la vidéo en cas d'échec
    video: 'retain-on-failure',
  },

  // Projets de test pour différents navigateurs
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Permissions pour WebGPU, microphone, etc.
        permissions: ['microphone'],
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        permissions: ['microphone'],
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        permissions: ['microphone'],
      },
    },

    // Tests mobiles
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        permissions: ['microphone'],
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        permissions: ['microphone'],
      },
    },
  ],

  // Serveur de développement à démarrer avant les tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
