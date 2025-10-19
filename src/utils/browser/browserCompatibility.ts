/**
 * Utilitaire pour détecter la compatibilité du navigateur avec WebGPU
 * et autres fonctionnalités requises pour ORION
 */

export interface BrowserCompatibility {
  webGPU: {
    supported: boolean;
    message: string;
  };
  webGL: {
    supported: boolean;
    message: string;
    version?: 1 | 2;
  };
  speechRecognition: {
    supported: boolean;
    message: string;
  };
  speechSynthesis: {
    supported: boolean;
    message: string;
  };
  fileAPI: {
    supported: boolean;
    message: string;
  };
  webWorkers: {
    supported: boolean;
    message: string;
  };
  isMobile: boolean;
  isCompatible: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Détecte la compatibilité WebGPU
 */
async function detectWebGPU(): Promise<{ supported: boolean; message: string }> {
  if (!(navigator as any).gpu) {
    return {
      supported: false,
      message: "WebGPU n'est pas disponible dans votre navigateur. Utilisez Chrome 113+ ou Edge 113+ pour des performances optimales."
    };
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        message: "Aucun adaptateur WebGPU disponible. Vérifiez que votre GPU est compatible."
      };
    }

    return {
      supported: true,
      message: "WebGPU est disponible et fonctionnel."
    };
  } catch (error) {
    return {
      supported: false,
      message: `Erreur lors de la détection WebGPU: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}

/**
 * Détecte la compatibilité WebGL (fallback pour WebGPU)
 * Teste WebGL2 en priorité, puis WebGL1
 */
function detectWebGL(): { supported: boolean; message: string; version?: 1 | 2 } {
  try {
    const canvas = document.createElement('canvas');
    
    // Essayer WebGL2 d'abord (meilleur support pour les calculs)
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      return {
        supported: true,
        message: "WebGL 2.0 est disponible (mode fallback optimisé).",
        version: 2
      };
    }
    
    // Fallback sur WebGL1
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl1) {
      return {
        supported: true,
        message: "WebGL 1.0 est disponible (mode fallback de base).",
        version: 1
      };
    }
    
    return {
      supported: false,
      message: "WebGL n'est pas disponible. Les performances seront limitées."
    };
  } catch (error) {
    return {
      supported: false,
      message: "Erreur lors de la détection WebGL."
    };
  }
}

/**
 * Détecte la compatibilité de la reconnaissance vocale
 */
function detectSpeechRecognition(): { supported: boolean; message: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (SpeechRecognitionAPI) {
    return {
      supported: true,
      message: "Reconnaissance vocale disponible."
    };
  }
  
  return {
    supported: false,
    message: "Reconnaissance vocale non disponible. Utilisez Chrome ou Edge pour cette fonctionnalité."
  };
}

/**
 * Détecte la compatibilité de la synthèse vocale (TTS)
 */
function detectSpeechSynthesis(): { supported: boolean; message: string } {
  if ('speechSynthesis' in window) {
    return {
      supported: true,
      message: "Synthèse vocale (TTS) disponible."
    };
  }
  
  return {
    supported: false,
    message: "Synthèse vocale non disponible dans ce navigateur."
  };
}

/**
 * Détecte la compatibilité de l'API File
 */
function detectFileAPI(): { supported: boolean; message: string } {
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    return {
      supported: true,
      message: "API File disponible pour l'import de fichiers."
    };
  }
  
  return {
    supported: false,
    message: "API File non disponible. L'import de fichiers ne fonctionnera pas."
  };
}

/**
 * Détecte la compatibilité des Web Workers
 */
function detectWebWorkers(): { supported: boolean; message: string } {
  if (typeof Worker !== 'undefined') {
    return {
      supported: true,
      message: "Web Workers disponibles pour le traitement en arrière-plan."
    };
  }
  
  return {
    supported: false,
    message: "Web Workers non disponibles. ORION ne fonctionnera pas correctement."
  };
}

/**
 * Fonction principale pour détecter toutes les compatibilités
 */
export async function detectBrowserCompatibility(): Promise<BrowserCompatibility> {
  const webGPU = await detectWebGPU();
  const webGL = detectWebGL();
  const speechRecognition = detectSpeechRecognition();
  const speechSynthesis = detectSpeechSynthesis();
  const fileAPI = detectFileAPI();
  const webWorkers = detectWebWorkers();

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Avertissements critiques
  if (!webWorkers.supported) {
    warnings.push("⚠️ Web Workers requis mais non disponibles - ORION ne fonctionnera pas");
    recommendations.push("Mettez à jour votre navigateur vers une version récente");
  }

  if (!fileAPI.supported) {
    warnings.push("⚠️ API File non disponible - L'import de fichiers est désactivé");
  }

  // Avertissements de performance
  if (!webGPU.supported) {
    warnings.push("⚠️ WebGPU non disponible - Utilisation du mode CPU (plus lent)");
    
    if (webGL.supported) {
      recommendations.push("Mode fallback WebGL activé. Envisagez Chrome 113+ ou Edge 113+ pour WebGPU");
    } else {
      recommendations.push("Utilisez Chrome 113+, Edge 113+ pour des performances optimales avec WebGPU");
    }
  }

  // Avertissements de fonctionnalités
  if (!speechRecognition.supported) {
    warnings.push("ℹ️ Reconnaissance vocale non disponible");
    recommendations.push("Utilisez Chrome ou Edge pour la reconnaissance vocale");
  }

  if (!speechSynthesis.supported) {
    warnings.push("ℹ️ Synthèse vocale (TTS) non disponible");
  }

  // Déterminer si le navigateur est compatible
  const isCompatible = webWorkers.supported && (webGPU.supported || webGL.supported);
  const isMobile = isMobileDevice();
  
  // Avertissements spécifiques mobiles
  if (isMobile) {
    warnings.push("ℹ️ Appareil mobile détecté - Modèles légers recommandés");
    recommendations.push("Sur mobile, utilisez des modèles < 500MB pour de meilleures performances");
  }

  return {
    webGPU,
    webGL,
    speechRecognition,
    speechSynthesis,
    fileAPI,
    webWorkers,
    isMobile,
    isCompatible,
    warnings,
    recommendations
  };
}

/**
 * Obtient une recommandation de navigateur basée sur l'OS
 */
export function getBrowserRecommendation(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('mac') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return "Sur macOS/iOS: Chrome 113+ ou Edge 113+ (Safari a un support WebGPU limité)";
  }
  
  if (userAgent.includes('windows')) {
    return "Sur Windows: Chrome 113+, Edge 113+, ou Firefox (support WebGPU partiel)";
  }
  
  if (userAgent.includes('linux')) {
    return "Sur Linux: Chrome 113+ ou Firefox (support WebGPU en développement)";
  }
  
  return "Navigateurs recommandés: Chrome 113+, Edge 113+";
}

/**
 * Détecte si l'appareil est un mobile
 */
export function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  
  // Vérifier les mots-clés mobiles
  const hasMobileKeyword = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Vérifier la taille de l'écran
  const hasSmallScreen = window.innerWidth < 768;
  
  // Vérifier l'API touch
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return hasMobileKeyword || (hasSmallScreen && hasTouchScreen);
}

/**
 * Obtient des informations détaillées sur le navigateur
 */
export function getBrowserInfo(): {
  name: string;
  version: string;
  os: string;
  isMobile: boolean;
} {
  const userAgent = navigator.userAgent;
  
  let name = "Inconnu";
  let version = "0";
  let os = "Inconnu";
  
  // Détecter le navigateur
  if (userAgent.includes("Edg/")) {
    name = "Edge";
    version = userAgent.match(/Edg\/(\d+)/)?.[1] || "0";
  } else if (userAgent.includes("Chrome/")) {
    name = "Chrome";
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || "0";
  } else if (userAgent.includes("Firefox/")) {
    name = "Firefox";
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || "0";
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) {
    name = "Safari";
    version = userAgent.match(/Version\/(\d+)/)?.[1] || "0";
  }
  
  // Détecter l'OS
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  
  return { name, version, os, isMobile: isMobileDevice() };
}

/**
 * Détermine la stratégie d'exécution optimale selon les capacités
 */
export function getExecutionStrategy(compatibility: BrowserCompatibility): {
  useWebGPU: boolean;
  useWebGL: boolean;
  useCPU: boolean;
  recommendedModelSize: 'tiny' | 'small' | 'medium' | 'large';
  maxTokens: number;
} {
  const isMobile = compatibility.isMobile;
  
  if (compatibility.webGPU.supported && !isMobile) {
    return {
      useWebGPU: true,
      useWebGL: false,
      useCPU: false,
      recommendedModelSize: 'medium',
      maxTokens: 512
    };
  }
  
  if (compatibility.webGL.supported) {
    return {
      useWebGPU: false,
      useWebGL: true,
      useCPU: false,
      recommendedModelSize: isMobile ? 'tiny' : 'small',
      maxTokens: isMobile ? 128 : 256
    };
  }
  
  // Fallback CPU (très lent)
  return {
    useWebGPU: false,
    useWebGL: false,
    useCPU: true,
    recommendedModelSize: 'tiny',
    maxTokens: 64
  };
}
