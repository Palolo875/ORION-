// src/utils/deviceProfiler.ts

import { isMobileDevice } from '../browser/browserCompatibility';

export type DeviceProfile = 'full' | 'lite' | 'micro';

export interface DeviceCapabilities {
  profile: DeviceProfile;
  ram: number;
  cores: number;
  hasWebGPU: boolean;
  hasWebGL: boolean;
  isMobile: boolean;
  recommendedModelSize: number; // en MB
  recommendedMaxTokens: number;
}

/**
 * Analyse les capacités de l'appareil pour déterminer un profil de performance.
 * @returns {Promise<DeviceProfile>} Le profil de l'appareil.
 */
export async function detectDeviceProfile(): Promise<DeviceProfile> {
  const capabilities = await detectDeviceCapabilities();
  return capabilities.profile;
}

/**
 * Analyse complète des capacités de l'appareil
 * @returns {Promise<DeviceCapabilities>} Les capacités détaillées de l'appareil
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  console.log("[Profiler] Détection des capacités de l'appareil...");

  // 1. Vérifier la RAM (API Device Memory définie dans global.d.ts)
  const ram = navigator.deviceMemory || 2; // On suppose 2GB par défaut si inconnu

  // 2. Vérifier le nombre de cœurs CPU
  const cores = navigator.hardwareConcurrency || 2; // 2 cœurs par défaut

  // 3. Détecter si c'est un mobile
  const isMobile = isMobileDevice();

  // 4. Vérifier la présence de WebGPU (le plus important pour les LLM)
  let hasWebGPU = false;
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) {
        hasWebGPU = true;
      }
    } catch (e) {
      hasWebGPU = false;
    }
  }

  // 5. Vérifier WebGL comme fallback
  let hasWebGL = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    hasWebGL = !!gl;
  } catch (e) {
    hasWebGL = false;
  }

  console.log(`[Profiler] Capacités détectées: RAM ~${ram}GB, Cores: ${cores}, WebGPU: ${hasWebGPU}, WebGL: ${hasWebGL}, Mobile: ${isMobile}`);

  // Logique de décision pour les profils avec prise en compte du mobile
  let profile: DeviceProfile;
  let recommendedModelSize: number;
  let recommendedMaxTokens: number;

  if (isMobile) {
    // Sur mobile, on est plus conservateur
    if (hasWebGPU && ram >= 4 && cores >= 4) {
      profile = 'lite'; // Jamais 'full' sur mobile pour économiser la batterie
      recommendedModelSize = 400; // MB
      recommendedMaxTokens = 256;
      console.log("[Profiler] Profil 'lite' sélectionné (mobile puissant).");
    } else if ((hasWebGPU || hasWebGL) && ram >= 2) {
      profile = 'micro';
      recommendedModelSize = 250; // MB
      recommendedMaxTokens = 128;
      console.log("[Profiler] Profil 'micro' sélectionné (mobile standard).");
    } else {
      profile = 'micro';
      recommendedModelSize = 150; // MB
      recommendedMaxTokens = 64;
      console.log("[Profiler] Profil 'micro' sélectionné (mobile limité).");
    }
  } else {
    // Sur desktop, profils standard
    if (hasWebGPU && ram >= 6 && cores >= 4) {
      profile = 'full';
      recommendedModelSize = 1500; // MB
      recommendedMaxTokens = 512;
      console.log("[Profiler] Profil 'full' sélectionné (desktop puissant).");
    } else if ((hasWebGPU || hasWebGL) && ram >= 4 && cores >= 2) {
      profile = 'lite';
      recommendedModelSize = 800; // MB
      recommendedMaxTokens = 256;
      console.log("[Profiler] Profil 'lite' sélectionné (desktop standard).");
    } else {
      profile = 'micro';
      recommendedModelSize = 400; // MB
      recommendedMaxTokens = 128;
      console.log("[Profiler] Profil 'micro' sélectionné (desktop limité).");
    }
  }

  return {
    profile,
    ram,
    cores,
    hasWebGPU,
    hasWebGL,
    isMobile,
    recommendedModelSize,
    recommendedMaxTokens
  };
}
