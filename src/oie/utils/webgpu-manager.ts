/**
 * WebGPU Manager - Gestion de l'accélération matérielle
 * 
 * Responsabilités:
 * - Détection et initialisation de WebGPU
 * - Fallback automatique vers WebAssembly si WebGPU indisponible
 * - Monitoring de la compatibilité navigateur
 * - Configuration des backends d'inférence
 */

import { debugLogger } from './debug-logger';

/**
 * Backend d'inférence disponible
 */
export type InferenceBackend = 'webgpu' | 'wasm' | 'cpu';

/**
 * État de WebGPU
 */
export interface WebGPUStatus {
  available: boolean;
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  limits: GPUSupportedLimits | null;
  features: Set<GPUFeatureName>;
  backend: InferenceBackend;
  fallbackReason?: string;
}

/**
 * Configuration du manager
 */
export interface WebGPUManagerConfig {
  /**
   * Forcer un backend spécifique
   */
  forceBackend?: InferenceBackend;
  
  /**
   * Timeout pour l'initialisation (ms)
   */
  initTimeout?: number;
  
  /**
   * Activer les logs verbeux
   */
  verbose?: boolean;
  
  /**
   * Caractéristiques GPU requises
   */
  requiredFeatures?: GPUFeatureName[];
  
  /**
   * Limites GPU requises
   */
  requiredLimits?: Partial<Record<keyof GPUSupportedLimits, number>>;
}

/**
 * Manager singleton pour WebGPU
 */
export class WebGPUManager {
  private static instance: WebGPUManager;
  private status: WebGPUStatus = {
    available: false,
    adapter: null,
    device: null,
    limits: null,
    features: new Set(),
    backend: 'cpu'
  };
  private config: WebGPUManagerConfig;
  private initialized = false;
  
  private constructor(config: WebGPUManagerConfig = {}) {
    this.config = {
      initTimeout: 10000,
      verbose: false,
      ...config
    };
  }
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(config?: WebGPUManagerConfig): WebGPUManager {
    if (!WebGPUManager.instance) {
      WebGPUManager.instance = new WebGPUManager(config);
    }
    return WebGPUManager.instance;
  }
  
  /**
   * Reset l'instance (pour tests)
   */
  static resetInstance(): void {
    if (WebGPUManager.instance?.status.device) {
      WebGPUManager.instance.status.device.destroy();
    }
    WebGPUManager.instance = null as unknown as WebGPUManager;
  }
  
  /**
   * Initialise WebGPU et détermine le meilleur backend
   */
  async initialize(): Promise<WebGPUStatus> {
    if (this.initialized) {
      debugLogger.info('WebGPUManager', 'Déjà initialisé', this.status);
      return this.status;
    }
    
    debugLogger.info('WebGPUManager', 'Initialisation du backend d\'inférence...');
    
    // Vérifier si un backend est forcé
    if (this.config.forceBackend) {
      debugLogger.info('WebGPUManager', `Backend forcé: ${this.config.forceBackend}`);
      this.status.backend = this.config.forceBackend;
      this.status.available = this.config.forceBackend === 'webgpu';
      this.initialized = true;
      return this.status;
    }
    
    try {
      // 1. Vérifier la disponibilité de l'API WebGPU
      if (!navigator.gpu) {
        this.setFallback('wasm', 'WebGPU API non disponible dans ce navigateur');
        return this.status;
      }
      
      debugLogger.info('WebGPUManager', 'API WebGPU détectée');
      
      // 2. Demander un adaptateur GPU avec timeout
      const adapter = await this.requestAdapterWithTimeout();
      
      if (!adapter) {
        this.setFallback('wasm', 'Aucun adaptateur GPU trouvé');
        return this.status;
      }
      
      this.status.adapter = adapter;
      
      // 3. Vérifier les features disponibles
      const features = new Set(adapter.features);
      this.status.features = features;
      
      // Vérifier les features requises
      if (this.config.requiredFeatures) {
        const missingFeatures = this.config.requiredFeatures.filter(
          f => !features.has(f)
        );
        
        if (missingFeatures.length > 0) {
          this.setFallback(
            'wasm',
            `Features GPU manquantes: ${missingFeatures.join(', ')}`
          );
          return this.status;
        }
      }
      
      // 4. Obtenir les limites du GPU
      const limits = adapter.limits;
      this.status.limits = limits;
      
      if (this.config.verbose) {
        debugLogger.debug('WebGPUManager', 'Limites GPU', {
          maxBufferSize: limits.maxBufferSize,
          maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize,
          maxComputeWorkgroupSizeX: limits.maxComputeWorkgroupSizeX
        });
      }
      
      // 5. Demander un device
      const device = await adapter.requestDevice({
        requiredFeatures: this.config.requiredFeatures,
      });
      
      if (!device) {
        this.setFallback('wasm', 'Impossible d\'obtenir un device GPU');
        return this.status;
      }
      
      this.status.device = device;
      
      // 6. Écouter les erreurs du device
      device.addEventListener('uncapturederror', (event) => {
        debugLogger.error('WebGPUManager', 'Erreur GPU non capturée', event.error);
      });
      
      // 7. Succès - WebGPU disponible
      this.status.available = true;
      this.status.backend = 'webgpu';
      this.initialized = true;
      
      debugLogger.info('WebGPUManager', '✅ WebGPU initialisé avec succès', {
        backend: 'webgpu',
        features: Array.from(features),
        maxBufferSize: `${(limits.maxBufferSize / 1024 / 1024).toFixed(0)} MB`
      });
      
      return this.status;
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      debugLogger.error('WebGPUManager', 'Erreur d\'initialisation WebGPU', error);
      this.setFallback('wasm', `Erreur: ${errMsg}`);
      return this.status;
    }
  }
  
  /**
   * Demande un adaptateur GPU avec timeout
   */
  private async requestAdapterWithTimeout(): Promise<GPUAdapter | null> {
    return Promise.race([
      navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      }),
      new Promise<null>((resolve) => {
        setTimeout(() => {
          debugLogger.warn('WebGPUManager', 'Timeout de demande d\'adaptateur GPU');
          resolve(null);
        }, this.config.initTimeout);
      })
    ]);
  }
  
  /**
   * Configure le fallback vers un autre backend
   */
  private setFallback(backend: InferenceBackend, reason: string): void {
    this.status.available = false;
    this.status.backend = backend;
    this.status.fallbackReason = reason;
    this.initialized = true;
    
    debugLogger.warn('WebGPUManager', `⚠️ Fallback vers ${backend}`, { reason });
  }
  
  /**
   * Obtient le statut actuel
   */
  getStatus(): WebGPUStatus {
    return { ...this.status };
  }
  
  /**
   * Obtient le backend recommandé pour ONNX Runtime
   */
  getONNXBackend(): 'webgpu' | 'wasm' {
    if (this.status.backend === 'webgpu' && this.status.available) {
      return 'webgpu';
    }
    return 'wasm';
  }
  
  /**
   * Obtient le device WebGPU (si disponible)
   */
  getDevice(): GPUDevice | null {
    return this.status.device;
  }
  
  /**
   * Obtient l'adaptateur WebGPU (si disponible)
   */
  getAdapter(): GPUAdapter | null {
    return this.status.adapter;
  }
  
  /**
   * Vérifie si WebGPU est disponible
   */
  isWebGPUAvailable(): boolean {
    return this.status.available && this.status.backend === 'webgpu';
  }
  
  /**
   * Obtient des informations de compatibilité navigateur
   */
  getBrowserCompatibility(): {
    browser: string;
    webgpuSupported: boolean;
    wasmSupported: boolean;
    recommendedBackend: InferenceBackend;
  } {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    }
    
    const webgpuSupported = 'gpu' in navigator;
    const wasmSupported = typeof WebAssembly !== 'undefined';
    
    let recommendedBackend: InferenceBackend = 'cpu';
    if (webgpuSupported && this.status.available) {
      recommendedBackend = 'webgpu';
    } else if (wasmSupported) {
      recommendedBackend = 'wasm';
    }
    
    return {
      browser,
      webgpuSupported,
      wasmSupported,
      recommendedBackend
    };
  }
  
  /**
   * Affiche un rapport de compatibilité
   */
  printCompatibilityReport(): void {
    const compat = this.getBrowserCompatibility();
    const status = this.getStatus();
    
    console.log('\n=== WebGPU Compatibility Report ===');
    console.log(`Browser: ${compat.browser}`);
    console.log(`WebGPU API: ${compat.webgpuSupported ? '✅' : '❌'}`);
    console.log(`WebAssembly: ${compat.wasmSupported ? '✅' : '❌'}`);
    console.log(`Current Backend: ${status.backend}`);
    console.log(`Recommended Backend: ${compat.recommendedBackend}`);
    
    if (status.fallbackReason) {
      console.log(`Fallback Reason: ${status.fallbackReason}`);
    }
    
    if (status.available && status.limits) {
      console.log('\n=== GPU Limits ===');
      console.log(`Max Buffer Size: ${(status.limits.maxBufferSize / 1024 / 1024).toFixed(0)} MB`);
      console.log(`Max Storage Buffer: ${(status.limits.maxStorageBufferBindingSize / 1024 / 1024).toFixed(0)} MB`);
      console.log(`Max Workgroup Size: ${status.limits.maxComputeWorkgroupSizeX}`);
    }
    
    if (status.features.size > 0) {
      console.log('\n=== GPU Features ===');
      console.log(Array.from(status.features).join(', '));
    }
    
    console.log('=====================================\n');
  }
  
  /**
   * Nettoie les ressources
   */
  async dispose(): Promise<void> {
    if (this.status.device) {
      debugLogger.info('WebGPUManager', 'Destruction du device GPU');
      this.status.device.destroy();
      this.status.device = null;
    }
    
    this.status.adapter = null;
    this.status.available = false;
    this.initialized = false;
  }
}

/**
 * Helper function pour obtenir le manager
 */
export function getWebGPUManager(config?: WebGPUManagerConfig): WebGPUManager {
  return WebGPUManager.getInstance(config);
}

/**
 * Helper function pour initialiser WebGPU rapidement
 */
export async function initializeWebGPU(config?: WebGPUManagerConfig): Promise<WebGPUStatus> {
  const manager = getWebGPUManager(config);
  return await manager.initialize();
}
