# 🔒 Politique de Sécurité ORION

## 🛡️ Signalement de Vulnérabilités

Si vous découvrez une vulnérabilité de sécurité dans ORION, **ne créez PAS d'issue publique**. 

Envoyez un email à : **security@orion.dev**

Incluez :
- Description détaillée de la vulnérabilité
- Steps to reproduce
- Impact potentiel
- Suggestions de correctif (optionnel)

Nous nous engageons à répondre sous 48h et à publier un correctif dans les 7 jours pour les vulnérabilités critiques.

## 🔐 Mesures de Sécurité Implémentées

### Content Security Policy (CSP)

ORION utilise des CSP headers stricts configurés dans `index.html` :

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'wasm-unsafe-eval'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               img-src 'self' data: blob: https:; 
               font-src 'self' data: https://fonts.gstatic.com; 
               connect-src 'self' https://huggingface.co https://*.huggingface.co; 
               worker-src 'self' blob:; 
               frame-src 'none'; 
               object-src 'none'; 
               base-uri 'self'; 
               form-action 'self'; 
               upgrade-insecure-requests" />
```

**Explications** :
- `default-src 'self'` : Par défaut, seules les ressources du même origin sont autorisées
- `script-src 'wasm-unsafe-eval'` : Nécessaire pour WebAssembly (HNSW, modèles LLM)
- `connect-src` : Autorise HuggingFace pour le téléchargement de modèles
- `frame-src 'none'` : Prévient le clickjacking
- `object-src 'none'` : Bloque les plugins dangereux

### Sanitisation des Entrées

#### HTML Sanitization
```typescript
import DOMPurify from 'dompurify';

// Toujours sanitiser avant d'afficher du contenu utilisateur
const cleanHTML = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
  ALLOWED_ATTR: []
});
```

#### URL Validation
```typescript
// Bloquer les protocoles dangereux
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

function isUrlSafe(url: string): boolean {
  const normalized = url.toLowerCase().trim();
  return !DANGEROUS_PROTOCOLS.some(protocol => 
    normalized.startsWith(protocol)
  );
}
```

### Validation des Données

Utilisation de **Zod** pour la validation runtime :

```typescript
import { z } from 'zod';

const QueryPayloadSchema = z.object({
  query: z.string().min(1).max(10000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })),
  temperature: z.number().min(0).max(2).optional()
});

// Validation avant traitement
const validatedData = QueryPayloadSchema.parse(untrustedData);
```

### Rate Limiting

Protection contre les abus :

```typescript
// Limite: 10 messages par minute
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000
};
```

### Gestion Sécurisée des Secrets

- **Jamais de secrets dans le code source**
- Utilisation de variables d'environnement
- `.gitignore` configuré pour exclure `.env` et fichiers sensibles
- Rotation régulière des clés API

### Sécurité des Workers

Les Web Workers sont sandboxés :

```typescript
// Workers ne peuvent pas accéder au DOM
// Communication uniquement via postMessage
// Pas d'accès direct aux cookies ou localStorage
```

### Protection XSS

- Pas d'utilisation de `dangerouslySetInnerHTML` sans sanitisation
- Échappement automatique par React
- DOMPurify pour tout contenu HTML
- CSP headers pour bloquer l'injection de scripts

### Protection CSRF

- Pas de cookies sensibles
- Toutes les données en localStorage/IndexedDB
- Application SPA sans formulaires POST traditionnels

### Dépendances Sécurisées

- **Dependabot** activé pour mises à jour automatiques
- Scan de vulnérabilités avec `npm audit`
- Mises à jour régulières des dépendances
- Revue manuelle des PRs Dependabot

## 🔍 Audits de Sécurité

### Audits Automatiques

```bash
# Audit npm des vulnérabilités
npm audit

# Audit avec correction automatique
npm audit fix

# Audit strict (CI/CD)
npm audit --audit-level=high
```

### Audits Manuels

Audits de sécurité périodiques :
- **Mensuel** : npm audit et review des dépendances
- **Trimestriel** : Audit complet du code
- **Annuel** : Penetration testing (si ressources disponibles)

## 🚨 Incident Response

En cas de compromission :

1. **Isoler** - Désactiver les fonctionnalités affectées
2. **Évaluer** - Comprendre l'étendue de la compromission
3. **Corriger** - Développer et déployer un correctif
4. **Communiquer** - Informer les utilisateurs affectés
5. **Post-mortem** - Documenter et apprendre de l'incident

## ✅ Meilleures Pratiques pour les Contributeurs

### Code Review Checklist

- [ ] Pas de `eval()` ou `Function()` constructors
- [ ] Validation de toutes les entrées utilisateur
- [ ] Sanitisation du HTML avec DOMPurify
- [ ] Pas de secrets hardcodés
- [ ] Utilisation de Zod pour la validation runtime
- [ ] CSP headers respectés
- [ ] Pas de dépendances avec vulnérabilités connues
- [ ] Tests de sécurité écrits

### Ne JAMAIS

- ❌ Utiliser `eval()` ou `new Function()`
- ❌ Insérer du HTML non sanitisé
- ❌ Stocker des secrets dans le code
- ❌ Faire confiance aux entrées utilisateur
- ❌ Désactiver les CSP headers
- ❌ Utiliser des dépendances non maintenues
- ❌ Ignorer les warnings de sécurité

### TOUJOURS

- ✅ Valider toutes les entrées
- ✅ Sanitiser le HTML
- ✅ Utiliser HTTPS en production
- ✅ Garder les dépendances à jour
- ✅ Logger les erreurs de sécurité
- ✅ Tester les cas limites
- ✅ Documenter les risques de sécurité

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSP Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Zod Documentation](https://zod.dev/)

## 🔄 Mises à Jour de cette Politique

Cette politique de sécurité est revue et mise à jour trimestriellement.

**Dernière mise à jour** : Octobre 2025

---

🔒 **La sécurité est la responsabilité de tous. Merci de contribuer à un ORION plus sûr !**
