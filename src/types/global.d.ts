/**
 * Déclarations de types globaux pour ORION
 * Ces types étendent les interfaces standard du navigateur avec des API non-standard
 * mais largement disponibles dans les navigateurs modernes.
 */

/**
 * Extension de l'interface Navigator pour les API non-standard
 */
interface Navigator {
  /**
   * API Device Memory (Chrome/Edge)
   * Retourne la quantité de RAM en Go (approximative)
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
   */
  deviceMemory?: number;

  /**
   * API WebGPU (Chrome/Edge/Firefox en développement)
   * @see https://developer.mozilla.org/en-US/docs/Web/API/GPU
   */
  gpu?: GPU;
}

/**
 * Extension de l'interface Performance pour l'API Memory (Chrome/Edge)
 */
interface Performance {
  /**
   * API Performance Memory (Chrome/Edge)
   * Fournit des informations sur l'utilisation de la mémoire JavaScript
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
   */
  memory?: {
    /** Taille du tas JavaScript utilisé en octets */
    usedJSHeapSize: number;
    /** Taille totale du tas JavaScript en octets */
    totalJSHeapSize: number;
    /** Limite maximale du tas JavaScript en octets */
    jsHeapSizeLimit: number;
  };
}

/**
 * Types pour l'extension WebGL Debug Renderer Info
 */
interface WEBGL_debug_renderer_info {
  readonly UNMASKED_VENDOR_WEBGL: number;
  readonly UNMASKED_RENDERER_WEBGL: number;
}

/**
 * Extension du contexte WebGL pour l'extension debug renderer
 */
interface WebGLRenderingContext {
  getExtension(name: 'WEBGL_debug_renderer_info'): WEBGL_debug_renderer_info | null;
}

interface WebGL2RenderingContext {
  getExtension(name: 'WEBGL_debug_renderer_info'): WEBGL_debug_renderer_info | null;
}

/**
 * Types pour l'API WebGPU
 */
interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
  powerPreference?: 'low-power' | 'high-performance';
  forceFallbackAdapter?: boolean;
}

interface GPUAdapter {
  readonly name: string;
  readonly features: GPUSupportedFeatures;
  readonly limits: GPUSupportedLimits;
  readonly isFallbackAdapter: boolean;
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPUSupportedFeatures extends ReadonlySet<string> {}
interface GPUSupportedLimits {
  readonly maxTextureDimension1D: number;
  readonly maxTextureDimension2D: number;
  readonly maxTextureDimension3D: number;
  readonly maxTextureArrayLayers: number;
  readonly maxBindGroups: number;
  readonly maxDynamicUniformBuffersPerPipelineLayout: number;
  readonly maxDynamicStorageBuffersPerPipelineLayout: number;
  readonly maxSampledTexturesPerShaderStage: number;
  readonly maxSamplersPerShaderStage: number;
  readonly maxStorageBuffersPerShaderStage: number;
  readonly maxStorageTexturesPerShaderStage: number;
  readonly maxUniformBuffersPerShaderStage: number;
  readonly maxUniformBufferBindingSize: number;
  readonly maxStorageBufferBindingSize: number;
  readonly minUniformBufferOffsetAlignment: number;
  readonly minStorageBufferOffsetAlignment: number;
  readonly maxVertexBuffers: number;
  readonly maxVertexAttributes: number;
  readonly maxVertexBufferArrayStride: number;
  readonly maxInterStageShaderComponents: number;
  readonly maxComputeWorkgroupStorageSize: number;
  readonly maxComputeInvocationsPerWorkgroup: number;
  readonly maxComputeWorkgroupSizeX: number;
  readonly maxComputeWorkgroupSizeY: number;
  readonly maxComputeWorkgroupSizeZ: number;
  readonly maxComputeWorkgroupsPerDimension: number;
}

interface GPUDeviceDescriptor {
  requiredFeatures?: Iterable<string>;
  requiredLimits?: Record<string, number>;
}

interface GPUDevice extends EventTarget {
  readonly features: GPUSupportedFeatures;
  readonly limits: GPUSupportedLimits;
  readonly queue: unknown;
  destroy(): void;
  createBuffer(descriptor: unknown): unknown;
  createTexture(descriptor: unknown): unknown;
  createSampler(descriptor?: unknown): unknown;
  createBindGroupLayout(descriptor: unknown): unknown;
  createPipelineLayout(descriptor: unknown): unknown;
  createBindGroup(descriptor: unknown): unknown;
  createShaderModule(descriptor: unknown): unknown;
  createComputePipeline(descriptor: unknown): unknown;
  createRenderPipeline(descriptor: unknown): unknown;
  createCommandEncoder(descriptor?: unknown): unknown;
  createRenderBundleEncoder(descriptor: unknown): unknown;
  createQuerySet(descriptor: unknown): unknown;
}

/**
 * Déclaration pour les modules virtuels de Vite
 */
declare module 'virtual:pwa-register' {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  };

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

/**
 * Déclaration pour les modules virtuels de Vite PWA
 */
declare module 'virtual:pwa-register/react' {
  import type { RegisterSWOptions } from 'virtual:pwa-register';
  
  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, (value: boolean) => void];
    offlineReady: [boolean, (value: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
