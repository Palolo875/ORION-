// src/workers/toolUser.worker.ts

/**
 * ToolUser Worker (Secure)
 * 
 * Ce worker gère l'exécution sécurisée des outils pour ORION.
 * Il utilise une whitelist stricte pour prévenir l'exécution de code malveillant.
 */

import type { WorkerMessage } from '../types';

console.log("ToolUser Worker (Secure) chargé et prêt.");

// --- Définition des Outils et de la Whitelist ---

// 1. La boîte à outils : un simple objet contenant nos fonctions locales.
const tools = {
  getTime: () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  getDate: () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  // On peut imaginer un outil avec des arguments plus tard :
  // greet: (name: string) => `Bonjour, ${name}!`
};

// 2. La Whitelist : notre garde du corps. C'est un contrat strict.
//    Chaque outil autorisé doit être listé ici avec ses spécifications.
const TOOL_WHITELIST = {
  getTime: {
    // Le nombre d'arguments attendus.
    argCount: 0, 
    // Une fonction optionnelle pour valider les arguments (pas nécessaire pour 0 arg).
    validator: (args: unknown[]) => args.length === 0 
  },
  getDate: {
    argCount: 0,
    validator: (args: unknown[]) => args.length === 0
  },
  // Exemple pour un outil futur :
  // greet: {
  //   argCount: 1,
  //   validator: (args: unknown[]) => typeof args[0] === 'string'
  // }
};

// --- Logique d'Exécution Sécurisée ---

/**
 * Tente d'exécuter un outil de manière sécurisée.
 * @param toolName Le nom de l'outil à appeler.
 * @param args Les arguments à passer à l'outil.
 * @returns Le résultat de l'exécution de l'outil.
 * @throws {Error} Si l'outil n'est pas autorisé ou si les arguments sont invalides.
 */
function safeToolCall(toolName: string, args: unknown[] = []): string {
  const toolSpec = TOOL_WHITELIST[toolName as keyof typeof TOOL_WHITELIST];

  // Vérification 1 : L'outil est-il dans la whitelist ?
  if (!toolSpec) {
    console.error(`[ToolUser] Tentative d'appel d'un outil non autorisé: "${toolName}"`);
    throw new Error(`Tool "${toolName}" is not in the whitelist.`);
  }

  // Vérification 2 : Le nombre d'arguments est-il correct ?
  if (args.length !== toolSpec.argCount) {
    console.error(`[ToolUser] Nombre d'arguments incorrect pour "${toolName}". Attendu: ${toolSpec.argCount}, Reçu: ${args.length}`);
    throw new Error(`Invalid number of arguments for tool "${toolName}".`);
  }

  // Vérification 3 : Les arguments sont-ils valides ?
  if (toolSpec.validator && !toolSpec.validator(args)) {
    console.error(`[ToolUser] Validation des arguments échouée pour "${toolName}".`);
    throw new Error(`Invalid arguments for tool "${toolName}".`);
  }

  // Si toutes les vérifications passent, on exécute l'outil.
  console.log(`[ToolUser] Appel sécurisé de l'outil: ${toolName}`);
  const toolFunction = tools[toolName as keyof typeof tools];
  return toolFunction(...(args as []));
}

// --- Le Worker Principal ---

self.onmessage = (event: MessageEvent<WorkerMessage<{ query: string }>>) => {
  const { type, payload } = event.data;

  if (type === 'find_and_execute_tool') {
    console.log(`[ToolUser] Recherche d'outil pour: "${payload.query}"`);
    const lowerQuery = payload.query.toLowerCase();
    let toolName: string | null = null;

    // Logique de détection d'intention (très simple pour l'instant)
    if (lowerQuery.includes('heure') || lowerQuery.includes('time')) {
      toolName = 'getTime';
    } else if (lowerQuery.includes('date') || lowerQuery.includes('jour')) {
      toolName = 'getDate';
    }

    if (toolName) {
      try {
        // On utilise notre fonction sécurisée
        const result = safeToolCall(toolName, []);
        self.postMessage({ type: 'tool_executed', payload: { toolName, result } });
      } catch (error) {
        console.error(error);
        self.postMessage({ type: 'tool_error', payload: { error: (error as Error).message } });
      }
    } else {
      console.log("[ToolUser] Aucun outil pertinent trouvé pour cette requête.");
      self.postMessage({ type: 'no_tool_found' });
    }
  } else if (type === 'init') {
    console.log('[ToolUser] Initialized');
    self.postMessage({ type: 'init_complete', payload: { success: true } });
  }
};
