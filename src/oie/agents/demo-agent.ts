/**
 * Demo Agent - Agent de démonstration ultra-léger
 * 
 * Caractéristiques:
 * - Aucun téléchargement requis (0 Mo)
 * - Réponses instantanées (< 1s)
 * - Simule le comportement des Virtual Agents
 * - Parfait pour tester l'interface
 * - Exemples de réponses de qualité
 */

import { IAgent, AgentInput, AgentOutput, AgentMetadata, AgentState } from '../types/agent.types';
import { debugLogger } from '../utils/debug-logger';

/**
 * Templates de réponses pour différents types de requêtes
 */
const DEMO_RESPONSES = {
  code: {
    quicksort: `\`\`\`typescript
function quicksort<T>(arr: T[], compareFn?: (a: T, b: T) => number): T[] {
  // Cas de base: tableau vide ou avec un seul élément
  if (arr.length <= 1) {
    return arr;
  }

  // Choisir le pivot (dernier élément)
  const pivot = arr[arr.length - 1];
  const left: T[] = [];
  const right: T[] = [];

  // Partitionner le tableau
  for (let i = 0; i < arr.length - 1; i++) {
    const comparison = compareFn 
      ? compareFn(arr[i], pivot) 
      : (arr[i] as any) - (pivot as any);
    
    if (comparison < 0) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }

  // Récursion et combinaison
  return [
    ...quicksort(left, compareFn),
    pivot,
    ...quicksort(right, compareFn)
  ];
}

// Exemple d'utilisation
const numbers = [64, 34, 25, 12, 22, 11, 90];
const sorted = quicksort(numbers);
console.log(sorted); // [11, 12, 22, 25, 34, 64, 90]
\`\`\`

## Analyse Logique

Ce code implémente l'algorithme de tri rapide (quicksort) en TypeScript avec les étapes suivantes :

### 1. **Cas de Base (Ligne 2-4)**
- Si le tableau a 0 ou 1 élément, il est déjà trié
- Retourner directement le tableau

### 2. **Sélection du Pivot (Ligne 7)**
- Choix du dernier élément comme pivot
- Stratégie simple et efficace
- Alternative : pivot médian pour meilleure performance

### 3. **Partitionnement (Ligne 11-22)**
- Parcourir tous les éléments sauf le pivot
- Comparer chaque élément au pivot
- \`left\`: éléments < pivot
- \`right\`: éléments >= pivot

### 4. **Récursion (Ligne 25-29)**
- Trier récursivement \`left\` et \`right\`
- Combiner: [left trié] + [pivot] + [right trié]
- Retourner le tableau complet trié

### Complexité
- **Temps moyen:** O(n log n)
- **Pire cas:** O(n²) (tableau déjà trié)
- **Espace:** O(log n) (pile de récursion)

### Améliorations Possibles
1. Pivot aléatoire pour éviter O(n²)
2. Tri par insertion pour petits tableaux (< 10 éléments)
3. Tri sur place pour économiser mémoire

---

*Agent de Démo ORION - Simulation de Virtual Code & Logic Agent*`,

    authentication: `\`\`\`typescript
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const app = express();
app.use(express.json());

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Types
interface User {
  id: string;
  email: string;
  passwordHash: string;
}

interface JWTPayload {
  userId: string;
  email: string;
}

// Middleware de vérification JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

// Route: Inscription
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password trop court (min 8 caractères)' });
  }

  try {
    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur (simulé - utiliser une vraie DB en production)
    const user: User = {
      id: crypto.randomUUID(),
      email,
      passwordHash
    };

    // Générer le JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({ 
      message: 'Utilisateur créé',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route: Connexion
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  try {
    // Récupérer l'utilisateur (simulé - utiliser une vraie DB)
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Générer le JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ 
      message: 'Connexion réussie',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route protégée: Profile
app.get('/api/auth/profile', authenticateToken, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  res.json({ 
    message: 'Profil utilisateur',
    user 
  });
});

// Démarrer le serveur
app.listen(3000, () => {
  console.log('🔐 Serveur d\\'authentification sur http://localhost:3000');
});
\`\`\`

## Analyse de la Logique de Sécurité

### 1. **Hachage des Mots de Passe (bcrypt)**

**Pourquoi c'est sécurisé :**
- \`bcrypt\` utilise un algorithme de hachage lent (intentionnellement)
- Paramètre \`saltRounds = 10\` : 2^10 itérations
- Chaque hash est unique grâce au "salt" aléatoire
- Impossible de retrouver le mot de passe original

**Protection contre :**
- ✅ Rainbow tables (tables pré-calculées)
- ✅ Attaques par force brute (très lent)
- ✅ Fuites de base de données

### 2. **JSON Web Tokens (JWT)**

**Comment ça fonctionne :**

\`\`\`
Header.Payload.Signature
↓
eyJhbGc...  .  eyJ1c2VySWQ...  .  SflKxwRJ...
(Algorithme)   (Données user)     (Signature)
\`\`\`

**Sécurité :**
- Signature cryptographique avec \`JWT_SECRET\`
- Impossible de modifier le payload sans connaître le secret
- Expiration automatique après 24h
- Validation côté serveur à chaque requête

### 3. **Middleware d'Authentification**

**Flux de validation :**

\`\`\`
1. Client envoie: Authorization: Bearer <token>
2. Middleware extrait le token
3. jwt.verify() vérifie la signature
4. Si valide → décode le payload
5. Si invalide → erreur 403
6. req.user = payload (disponible dans la route)
\`\`\`

**Protection contre :**
- ✅ Tokens falsifiés
- ✅ Tokens expirés
- ✅ Requêtes non authentifiées

### 4. **Stratégie de Sécurité Complète**

**Bonnes pratiques implémentées :**

1. **Validation des entrées**
   - Email et password requis
   - Longueur minimale du password (8 caractères)

2. **Gestion des erreurs**
   - Messages génériques (pas de détails sensibles)
   - Codes HTTP appropriés (401, 403, 404, 500)

3. **Séparation des responsabilités**
   - Middleware dédié pour l'authentification
   - Routes distinctes (register, login, profile)

4. **Expiration des tokens**
   - 24h par défaut
   - Force le renouvellement régulier

### 5. **Améliorations Recommandées**

Pour la production :

1. **Refresh Tokens**
   \`\`\`typescript
   // Token court (15 min) + refresh token long (7 jours)
   const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });
   const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
   \`\`\`

2. **Rate Limiting**
   \`\`\`typescript
   import rateLimit from 'express-rate-limit';
   
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 min
     max: 5 // 5 tentatives max
   });
   
   app.post('/api/auth/login', loginLimiter, ...);
   \`\`\`

3. **HTTPS Obligatoire**
   - Tokens transmis uniquement sur HTTPS
   - Empêche l'interception

4. **Stockage Sécurisé du Secret**
   - Variables d'environnement
   - Vault (HashiCorp Vault, AWS Secrets Manager)

5. **Blacklist des Tokens**
   - Redis pour stocker tokens révoqués
   - Vérification à chaque requête

---

*Agent de Démo ORION - Simulation de Virtual Code & Logic Agent*`
  },
  
  general: `Je suis l'**Agent de Démo ORION** - une simulation des Virtual Hybrid Agents.

### 🎯 Caractéristiques

- **Poids:** 0 Mo (aucun téléchargement)
- **Vitesse:** < 1 seconde
- **Objectif:** Tester l'interface ORION

### 💡 Pour de vraies réponses IA

Téléchargez un modèle réel :
1. Paramètres → Modèles IA
2. Sélectionnez **Phi-3 Mini** (~2 Go)
3. Attendez le téléchargement (5-10 min)
4. Sélectionnez **ORION Code & Logic (Ultra-Optimized)**

### 🚀 Exemples de requêtes que je peux simuler

**Code :**
- "Implémente quicksort"
- "Crée une API REST avec authentification JWT"
- "Fonction de recherche binaire"

**Logique :**
- "Explique l'algorithme de Dijkstra"
- "Comment fonctionne la récursion ?"

**Général :**
- "Qu'est-ce qu'un Virtual Agent ?"

Essayez une de ces requêtes pour voir une démonstration !

---

*Ceci est une démonstration. Pour de vraies capacités IA, téléchargez un modèle.*`
};

/**
 * Agent de Démo - Simule les Virtual Hybrid Agents
 */
export class DemoAgent implements IAgent {
  metadata: AgentMetadata;
  state: AgentState = 'idle';

  constructor() {
    this.metadata = {
      id: 'demo-agent',
      name: 'Agent de Démo (0 Mo)',
      version: '1.0.0',
      description: 'Agent de démonstration ultra-léger - Aucun téléchargement requis',
      capabilities: [
        'demo',
        'instant-response',
        'code-examples',
        'logic-examples',
        'no-download'
      ],
      supportedModalities: ['text'],
      estimatedSizeMB: 0,
      requiredMemoryMB: 10 // Quasi rien
    };
  }

  async load(): Promise<void> {
    this.state = 'loading';
    debugLogger.info('DemoAgent', 'Loading demo agent...');
    
    // Simuler un petit délai de chargement
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.state = 'ready';
    debugLogger.info('DemoAgent', 'Demo agent ready (0 MB)');
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    this.state = 'processing';
    const startTime = performance.now();
    
    // Simuler un délai de réflexion (50-200ms)
    const thinkingTime = Math.random() * 150 + 50;
    await new Promise(resolve => setTimeout(resolve, thinkingTime));
    
    // Détecter le type de requête
    const query = input.content.toLowerCase();
    let response: string;
    
    if (this.isCodeRequest(query)) {
      response = this.getCodeResponse(query);
    } else if (this.isLogicRequest(query)) {
      response = this.getLogicResponse(query);
    } else {
      response = DEMO_RESPONSES.general;
    }
    
    this.state = 'ready';
    
    return {
      agentId: this.metadata.id,
      content: response,
      confidence: 0.95, // Démo, donc confiance simulée
      processingTime: performance.now() - startTime,
      metadata: {
        demo: true,
        simulatedResponse: true,
        actualModel: 'none',
        message: 'Ceci est une démonstration. Téléchargez un vrai modèle pour des réponses IA authentiques.'
      }
    };
  }

  async unload(): Promise<void> {
    this.state = 'unloading';
    debugLogger.info('DemoAgent', 'Unloading demo agent...');
    
    // Rien à décharger
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.state = 'idle';
  }

  /**
   * Détecte si c'est une requête de code
   */
  private isCodeRequest(query: string): boolean {
    const codeKeywords = [
      'implémente', 'implement', 'code', 'fonction', 'function',
      'crée', 'create', 'écris', 'write', 'programme', 'program',
      'api', 'classe', 'class', 'algorithme', 'algorithm'
    ];
    
    return codeKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Détecte si c'est une requête de logique
   */
  private isLogicRequest(query: string): boolean {
    const logicKeywords = [
      'explique', 'explain', 'pourquoi', 'why', 'comment', 'how',
      'logique', 'logic', 'raisonne', 'reason', 'analyse', 'analyze'
    ];
    
    return logicKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Retourne une réponse de code appropriée
   */
  private getCodeResponse(query: string): string {
    if (query.includes('quicksort') || query.includes('tri')) {
      return DEMO_RESPONSES.code.quicksort;
    }
    
    if (query.includes('authentification') || query.includes('jwt') || query.includes('auth')) {
      return DEMO_RESPONSES.code.authentication;
    }
    
    // Réponse générique pour le code
    return `\`\`\`typescript
// Exemple de fonction TypeScript
function example(input: string): string {
  // Implémentation
  return \`Résultat: \${input}\`;
}

// Utilisation
const result = example("test");
console.log(result);
\`\`\`

## Analyse Logique

Cette fonction démontre une structure simple :
1. **Paramètre typé** : \`input: string\` pour la sécurité des types
2. **Retour typé** : \`string\` pour la clarté
3. **Template literal** : Pour construire la chaîne de résultat

---

*Agent de Démo ORION - Pour de vraies réponses IA, téléchargez un modèle*

### 💡 Suggestion

Essayez une requête plus spécifique comme :
- "Implémente quicksort"
- "Crée une API REST avec JWT"

Ou téléchargez un vrai modèle pour des capacités complètes !`;
  }

  /**
   * Retourne une réponse de logique appropriée
   */
  private getLogicResponse(query: string): string {
    return `## Explication Logique (Démo)

Cette question nécessite une analyse approfondie par un vrai modèle IA.

### 🎯 Pour obtenir une vraie réponse

1. **Téléchargez un modèle :**
   - Paramètres → Modèles IA
   - Sélectionnez **Phi-3 Mini** ou **Llama 3.2**

2. **Activez un Virtual Agent :**
   - **ORION Code & Logic (Ultra-Optimized)**

3. **Posez votre question à nouveau**

### 💡 Exemples de questions que les vrais agents peuvent traiter

**Algorithmes :**
- "Explique comment fonctionne Dijkstra"
- "Quelle est la complexité de quicksort ?"

**Concepts :**
- "Qu'est-ce que la récursion ?"
- "Comment fonctionne le garbage collector ?"

**Logique :**
- "Pourquoi utiliser async/await ?"
- "Quelle est la différence entre Promise et Observable ?"

---

*Agent de Démo ORION - Simulation uniquement*`;
  }
}
