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
  isCompatible: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Détecte la compatibilité WebGPU
 */
async function detectWebGPU(): Promise<{ supported: boolean; message: string }> {
  if (!navigator.gpu) {
    return {
      supported: false,
      message: "WebGPU n'est pas disponible dans votre navigateur. Utilisez Chrome 113+ ou Edge 113+ pour des performances optimales."
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
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
 */
function detectWebGL(): { supported: boolean; message: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      return {
        supported: true,
        message: "WebGL est disponible (mode fallback possible)."
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

  return {
    webGPU,
    webGL,
    speechRecognition,
    speechSynthesis,
    fileAPI,
    webWorkers,
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
 * Obtient des informations détaillées sur le navigateur
 */
export function getBrowserInfo(): {
  name: string;
  version: string;
  os: string;
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
  else if (userAgent.includes("iOS")) os = "iOS";
  
  return { name, version, os };
}
