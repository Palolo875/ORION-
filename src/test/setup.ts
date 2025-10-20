import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// === Configuration des Mocks pour Workers ===
// Par défaut, utiliser les mocks pour des tests rapides
// Pour utiliser les vrais modèles: LOAD_REAL_MODELS=true npm test

const USE_REAL_MODELS = process.env.LOAD_REAL_MODELS === 'true';

if (USE_REAL_MODELS) {
  console.log('🧠 Tests avec VRAIS MODÈLES (lent)');
} else {
  console.log('🎭 Tests avec MOCKS (rapide)');
  
  // Mock des Workers avec nos classes mockées
  // @ts-expect-error - Mock global du constructeur Worker
  global.Worker = vi.fn((url) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Déterminer quel mock utiliser selon l'URL
    if (urlString.includes('llm.worker')) {
      const { MockLLMWorker } = require('../workers/__mocks__/llm.worker');
      return new MockLLMWorker();
    }
    
    if (urlString.includes('memory.worker')) {
      const { MockMemoryWorker } = require('../workers/__mocks__/memory.worker');
      return new MockMemoryWorker();
    }
    
    if (urlString.includes('toolUser.worker')) {
      const { MockToolUserWorker } = require('../workers/__mocks__/toolUser.worker');
      return new MockToolUserWorker();
    }
    
    if (urlString.includes('contextManager.worker')) {
      const { MockContextManagerWorker } = require('../workers/__mocks__/contextManager.worker');
      return new MockContextManagerWorker();
    }
    
    if (urlString.includes('geniusHour.worker')) {
      const { MockGeniusHourWorker } = require('../workers/__mocks__/geniusHour.worker');
      return new MockGeniusHourWorker();
    }
    
    // Worker générique par défaut
    return {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
    };
  });
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

// Mock navigator.gpu for WebGPU tests
Object.defineProperty(navigator, 'gpu', {
  writable: true,
  value: undefined,
});

// Mock speechSynthesis for TTS tests
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
    speaking: false,
    paused: false,
    pending: false,
  },
});

// Mock SpeechRecognition for voice input tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).SpeechRecognition = undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).webkitSpeechRecognition = undefined;
