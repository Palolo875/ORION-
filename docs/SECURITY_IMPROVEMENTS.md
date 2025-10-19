# 🔒 Améliorations de Sécurité et Logging - ORION

## 📋 Résumé des Implémentations

Ce document décrit les améliorations de sécurité et de logging implémentées dans ORION pour protéger contre les attaques XSS, les injections et améliorer l'observabilité en production.

---

## 🛡️ 1. Sanitization et Protection XSS

### 📦 Installation
```bash
npm install dompurify @types/dompurify
```

### 🔧 Fichiers Créés

#### `src/utils/sanitizer.ts`
Utilitaires de sanitization avec DOMPurify pour nettoyer le contenu HTML/texte :

**Fonctionnalités :**
- ✅ Configuration stricte de DOMPurify avec whitelist de balises
- ✅ Sanitization des URLs (blocage de `javascript:`, `data:`, etc.)
- ✅ Détection de contenu malveillant (scripts, iframes, event handlers)
- ✅ Sanitization des attributs HTML
- ✅ Nettoyage de noms de fichiers
- ✅ Normalisation Unicode pour recherche

**Exemple d'utilisation :**
```typescript
import { sanitizeContent, detectMaliciousContent } from '@/utils/sanitizer';

// Nettoyer du HTML
const safe = sanitizeContent(userInput, { stripAll: true });

// Détecter du contenu suspect
const { isSuspicious, reasons } = detectMaliciousContent(content);
```

#### `src/components/SafeMessage.tsx`
Composant React sécurisé pour afficher les messages :

**Fonctionnalités :**
- ✅ Affichage sécurisé des messages utilisateur (texte brut uniquement)
- ✅ Affichage sécurisé des messages assistant (Markdown autorisé)
- ✅ Détection et alerte pour contenu suspect
- ✅ Sanitization automatique avant rendu

**Utilisation :**
```tsx
<SafeMessage 
  content={message.content} 
  sender="user"  // ou "assistant"
  allowMarkdown={false}  // true pour assistant
/>
```

---

## 🔐 2. Validation des Inputs Utilisateur

### 🔧 Fichiers Créés

#### `src/utils/inputValidator.ts`
Validation et sanitization des inputs avec limites de sécurité :

**Fonctionnalités :**
- ✅ Limite de taille des messages (10,000 caractères par défaut)
- ✅ Détection de lignes excessivement longues (buffer overflow)
- ✅ Détection de contenu malveillant avec blocage
- ✅ Normalisation Unicode (évite homoglyphes)
- ✅ Suppression de caractères de contrôle invisibles
- ✅ Détection de double encodage
- ✅ Validation d'URLs, noms de fichiers, JSON
- ✅ Rate limiting côté client

**Exemple d'utilisation :**
```typescript
import { validateUserInput } from '@/utils/inputValidator';

const validation = validateUserInput(userMessage, {
  maxLength: 10000,
  context: 'ChatInput'
});

if (validation.blocked) {
  // Message contient du contenu dangereux
  showError();
} else {
  // Utiliser validation.sanitized
  sendMessage(validation.sanitized);
}
```

#### Intégration dans `ChatInput.tsx`
- ✅ Validation automatique avant envoi
- ✅ Rate limiting (10 messages/minute)
- ✅ Notifications utilisateur en cas de contenu suspect
- ✅ Sanitization transparente

---

## 🔒 3. Encryption pour IndexedDB

### 🔧 Fichiers Créés

#### `src/utils/encryption.ts`
Système d'encryption AES-GCM pour données sensibles :

**Fonctionnalités :**
- ✅ Chiffrement AES-GCM 256 bits
- ✅ Clé dérivée du device (PBKDF2 avec 100,000 itérations)
- ✅ IV aléatoire pour chaque encryption
- ✅ Hash SHA-256 sécurisé
- ✅ Génération de tokens aléatoires
- ✅ Device fingerprinting

**Exemple d'utilisation :**
```typescript
import { secureStorage } from '@/utils/encryption';

// Initialiser
await secureStorage.initialize();

// Chiffrer des données
const encrypted = await secureStorage.encrypt({ 
  text: "Données sensibles" 
});

// Déchiffrer
const decrypted = await secureStorage.decrypt(encrypted);

// Hash
const hash = await secureStorage.hash("mot de passe");
```

**⚠️ Usage Futur :**
Pour l'instant créé mais pas encore intégré aux workers de mémoire. À intégrer dans `memory.worker.ts` pour chiffrer les textes avant stockage dans IndexedDB.

---

## 📊 4. Logging Structuré

### 🔧 Fichiers Créés

#### `src/utils/logger.ts`
Logger production-ready avec niveaux et sanitization :

**Fonctionnalités :**
- ✅ 5 niveaux de log : DEBUG, INFO, WARN, ERROR, CRITICAL
- ✅ Sanitization automatique des données sensibles
- ✅ Console uniquement en dev, storage en prod
- ✅ Export des logs pour debugging
- ✅ Statistiques et filtres
- ✅ Buffer circulaire (1000 logs max)
- ✅ Alerting pour erreurs critiques

**Exemple d'utilisation :**
```typescript
import { logger } from '@/utils/logger';

// Différents niveaux
logger.debug('Component', 'Debug info', { data });
logger.info('Component', 'Opération réussie');
logger.warn('Component', 'Attention', { warning });
logger.error('Component', 'Erreur', error);
logger.critical('Component', 'Erreur critique', error);

// Export des logs
const logs = logger.exportLogs();

// Statistiques
const stats = logger.getStats();
```

#### `src/utils/workerLogger.ts`
Version simplifiée du logger pour Web Workers :

**Fonctionnalités :**
- ✅ Logging dans les workers
- ✅ Envoi des logs au thread principal
- ✅ API identique au logger principal

**Utilisation dans les workers :**
```typescript
import { logger } from '@/utils/workerLogger';

logger.info('LLMWorker', 'Modèle chargé', { modelId });
```

---

## 🔒 5. Content Security Policy (CSP)

### 🔧 Configuration dans `vite.config.ts`

**Headers de sécurité ajoutés :**
```typescript
server: {
  headers: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://huggingface.co",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
}
```

### 🔧 Configuration dans `netlify.toml`

**Headers de production pour Netlify :**
- ✅ CSP stricte
- ✅ Protection XSS
- ✅ Protection clickjacking (X-Frame-Options)
- ✅ Protection MIME sniffing
- ✅ Politique de référent sécurisée
- ✅ Permissions restrictives

---

## 🔄 6. Intégrations

### ChatMessage.tsx
- ✅ Utilise `SafeMessage` pour tous les messages
- ✅ Sanitization automatique du contenu
- ✅ Protection contre XSS

### ChatInput.tsx
- ✅ Validation avant envoi
- ✅ Rate limiting
- ✅ Sanitization des inputs
- ✅ Notifications utilisateur

### main.tsx
- ✅ Configuration de DOMPurify au démarrage
- ✅ Initialisation du logger

---

## 📈 7. Métriques et Monitoring

### Logger Stats
```typescript
const stats = logger.getStats();
// {
//   total: 1000,
//   byLevel: { DEBUG: 500, INFO: 300, WARN: 150, ERROR: 45, CRITICAL: 5 },
//   byComponent: { LLM: 400, Memory: 300, ... }
// }
```

### Export des Logs
```typescript
// Exporter tous les logs
const allLogs = logger.exportLogs();

// Filtrer les logs
const errors = logger.getLogs({ 
  level: LogLevel.ERROR,
  since: Date.now() - 3600000 // Dernière heure
});
```

---

## ⚠️ Limitations et Améliorations Futures

### Limitations Actuelles
1. **Encryption** : Implémentée mais pas encore intégrée aux workers de mémoire
2. **Console.log** : Toujours présents en production (pas supprimés automatiquement)
3. **CSP** : Nécessite `'unsafe-inline'` pour Tailwind
4. **Rate Limiting** : Côté client uniquement (peut être contourné)

### Améliorations Futures
1. ✅ Intégrer l'encryption dans `memory.worker.ts`
2. ✅ Implémenter un système de monitoring externe (Sentry, etc.)
3. ✅ Ajouter une page d'administration pour voir les logs
4. ✅ Implémenter un rate limiting côté serveur
5. ✅ Ajouter des tests de sécurité automatisés
6. ✅ Créer un système de rotation des clés d'encryption
7. ✅ Ajouter une détection d'anomalies dans les patterns d'usage

---

## 🧪 Tests de Sécurité

### Tests Manuels à Effectuer

1. **Test XSS :**
   ```javascript
   // Envoyer dans le chat
   <script>alert('XSS')</script>
   <img src=x onerror="alert('XSS')">
   ```
   → **Attendu** : Contenu bloqué ou nettoyé, pas d'exécution de script

2. **Test Injection HTML :**
   ```javascript
   <iframe src="javascript:alert('XSS')"></iframe>
   <a href="javascript:void(0)" onclick="alert('XSS')">Click</a>
   ```
   → **Attendu** : Balises supprimées ou URLs neutralisées

3. **Test Rate Limiting :**
   - Envoyer rapidement 15 messages
   → **Attendu** : Blocage après 10 messages avec toast d'erreur

4. **Test Caractères Invisibles :**
   ```javascript
   // Envoyer un message avec caractères de contrôle Unicode
   "Hello\x00\x01\x02World"
   ```
   → **Attendu** : Caractères supprimés, message nettoyé

5. **Test Logging :**
   ```javascript
   // Dans la console
   logger.info('Test', 'Message de test', { password: '123456' });
   logger.exportLogs();
   ```
   → **Attendu** : password masqué par [REDACTED]

---

## 📚 Documentation des APIs

### Sanitizer API
```typescript
// Sanitize du contenu
sanitizeContent(content: string, options?: {
  allowMarkdown?: boolean;
  stripAll?: boolean;
}): string

// Sanitize une URL
sanitizeUrl(url: string): string

// Détecter du contenu malveillant
detectMaliciousContent(content: string): {
  isSuspicious: boolean;
  reasons: string[];
}

// Configurer DOMPurify
configureDOMPurify(): void
```

### InputValidator API
```typescript
// Valider un input utilisateur
validateUserInput(input: string, options?: {
  maxLength?: number;
  allowHtml?: boolean;
  context?: string;
}): ValidationResult

// Valider une URL
validateUrl(url: string): ValidationResult

// Valider un nom de fichier
validateFileName(filename: string): ValidationResult

// Rate limiting
rateLimiter.check(key: string, maxAttempts: number, windowMs: number): boolean
```

### Encryption API
```typescript
// Initialiser
await secureStorage.initialize()

// Chiffrer
await secureStorage.encrypt(data: unknown): Promise<string>

// Déchiffrer
await secureStorage.decrypt(encrypted: string): Promise<unknown>

// Hash
await secureStorage.hash(data: string): Promise<string>

// Token aléatoire
secureStorage.generateToken(length?: number): string
```

### Logger API
```typescript
// Niveaux de log
logger.debug(component: string, message: string, data?: unknown, traceId?: string)
logger.info(component: string, message: string, data?: unknown, traceId?: string)
logger.warn(component: string, message: string, data?: unknown, traceId?: string)
logger.error(component: string, message: string, error?: Error, traceId?: string)
logger.critical(component: string, message: string, error?: Error, traceId?: string)

// Utilitaires
logger.exportLogs(): string
logger.clearLogs(): void
logger.getLogs(filter?: LogFilter): LogEntry[]
logger.getStats(): LogStats
```

---

## ✅ Checklist d'Implémentation

- [x] Installation de DOMPurify
- [x] Création de `sanitizer.ts`
- [x] Création de `inputValidator.ts`
- [x] Création de `encryption.ts`
- [x] Création de `logger.ts`
- [x] Création de `workerLogger.ts`
- [x] Création de `SafeMessage.tsx`
- [x] Intégration dans `ChatMessage.tsx`
- [x] Intégration dans `ChatInput.tsx`
- [x] Configuration CSP dans `vite.config.ts`
- [x] Configuration headers Netlify
- [x] Tests de compilation
- [x] Tests de linting
- [ ] Tests de sécurité manuels
- [ ] Intégration encryption dans memory.worker
- [ ] Documentation complète

---

## 🎯 Conclusion

Ces améliorations fournissent une base solide de sécurité pour ORION :

1. **Protection XSS** : Sanitization multi-niveaux avec DOMPurify
2. **Validation Input** : Validation stricte avec rate limiting
3. **Encryption** : Système AES-GCM prêt à l'emploi
4. **Logging** : Logger structuré production-ready
5. **CSP** : Headers de sécurité stricts

**Statut** : ✅ **Implémenté et testé (compilation)**

**Prochaines étapes** :
1. Tests de sécurité manuels
2. Intégration de l'encryption dans les workers
3. Monitoring en production
