// src/utils/deviceProfiler.ts

export type DeviceProfile = 'full' | 'lite' | 'micro';

/**
 * Analyse les capacités de l'appareil pour déterminer un profil de performance.
 * @returns {Promise<DeviceProfile>} Le profil de l'appareil.
 */
export async function detectDeviceProfile(): Promise<DeviceProfile> {
  console.log("[Profiler] Détection du profil de l'appareil...");

  // 1. Vérifier la RAM (si l'API est disponible)
  // @ts-expect-error - navigator.deviceMemory n'est pas standard partout
  const ram = navigator.deviceMemory || 2; // On suppose 2GB par défaut si inconnu

  // 2. Vérifier le nombre de cœurs CPU
  const cores = navigator.hardwareConcurrency || 2; // 2 cœurs par défaut

  // 3. Vérifier la présence de WebGPU (le plus important pour les LLM)
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

  console.log(`[Profiler] Capacités détectées: RAM ~${ram}GB, Cores: ${cores}, WebGPU: ${hasWebGPU}`);

  // Logique de décision pour les profils
  if (hasWebGPU && ram >= 6 && cores >= 4) {
    console.log("[Profiler] Profil 'full' sélectionné.");
    return 'full';
  }
  
  if (ram >= 2 && cores >= 2) {
    console.log("[Profiler] Profil 'lite' sélectionné.");
    return 'lite';
  }

  console.log("[Profiler] Profil 'micro' sélectionné.");
  return 'micro';
}
