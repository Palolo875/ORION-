# 🚀 Guide de Démarrage - Nouvelles Fonctionnalités ORION

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Build de production
npm run build
```

---

## 🌟 Fonctionnalités Implémentées

### 1. 💭 Contexte Ambiant

**Qu'est-ce que c'est ?**
Le contexte ambiant permet de définir des informations persistantes qui enrichissent automatiquement toutes vos conversations avec ORION.

**Comment l'utiliser ?**

1. Ouvrir le Panneau de Contrôle (icône ⚙️ en haut)
2. Cliquer sur l'onglet "Ctx." (Contexte)
3. Cliquer sur "Nouveau contexte"
4. Remplir le formulaire :
   - **Titre** (optionnel) : Ex. "Mon projet actuel"
   - **Contenu** (10-500 caractères) : Ex. "Je travaille sur une application React avec TypeScript et TailwindCSS"
5. Cliquer sur "Créer"
6. Le contexte est automatiquement activé (max 3 contextes actifs)

**Cas d'usage :**
- 📝 "Je suis un développeur senior spécialisé en React"
- 🎯 "Je travaille sur un projet de e-commerce avec Stripe"
- 🏢 "Mon équipe utilise les méthodologies Agile et Scrum"

**Avantages :**
- ✅ Plus besoin de répéter le contexte à chaque conversation
- ✅ Réponses plus pertinentes et personnalisées
- ✅ Gain de temps significatif

---

### 2. 🧠 Pensée Étape par Étape

**Qu'est-ce que c'est ?**
ORION affiche maintenant son processus de raisonnement de manière structurée et transparente.

**Comment voir les étapes ?**

1. Posez une question à ORION
2. Dans la réponse, cherchez le bouton "🔢 Étapes de raisonnement (X)"
3. Cliquez pour dérouler les étapes
4. Consultez le processus de pensée détaillé

**Types d'étapes :**
- 🔵 **Observation** : Constat initial
- 🟣 **Analysis** : Analyse logique
- 🟡 **Hypothesis** : Hypothèse formulée
- 🟢 **Conclusion** : Conclusion finale
- 🔴 **Critique** : Point critique ou risque
- 🟠 **Perspective** : Point de vue créatif

**Exemple de sortie :**
```
Étapes de raisonnement (4)

1. [observation] La question porte sur l'optimisation React
2. [analysis] Les problèmes courants sont : re-renders, bundle size, state management
3. [hypothesis] L'utilisation de React.memo et useMemo pourrait aider
4. [conclusion] Recommandation : profiling d'abord, optimisation ensuite
```

**Avantages :**
- ✅ Transparence totale du raisonnement
- ✅ Apprentissage du processus de pensée de l'IA
- ✅ Détection d'erreurs ou de biais
- ✅ Meilleure confiance dans les réponses

---

### 3. 🤖 Agents Personnalisables

**Qu'est-ce que c'est ?**
Créez vos propres agents IA avec des prompts et comportements sur mesure.

**Comment créer un agent ?**

#### Option 1 : Créer depuis un preset

1. Panneau de Contrôle → Onglet "Agents"
2. Cliquer sur "Presets"
3. Choisir un preset (4 disponibles) :
   - 💻 **Expert Code Review** : Analyse de code approfondie
   - ✍️ **Rédacteur Technique** : Documentation claire
   - 📊 **Analyste de Données** : Insights statistiques
   - 🔬 **Chercheur Académique** : Recherche rigoureuse
4. Cliquer sur "Utiliser"
5. Modifier si nécessaire

#### Option 2 : Créer de zéro

1. Panneau de Contrôle → Onglet "Agents"
2. Cliquer sur "Nouvel agent"
3. Remplir le formulaire :
   - **Nom** (3-50 caractères)
   - **Description** (10-200 caractères)
   - **Catégorie** (coding, writing, analysis, research, creative, other)
   - **System Prompt** (50-2000 caractères) - Les instructions détaillées
   - **Température** (0-2) - Créativité de l'agent
   - **Max Tokens** (100-4000) - Longueur des réponses
4. Activer l'agent
5. Sauvegarder

**Exemple de System Prompt :**
```
Tu es un expert en sécurité des applications web.

CONSIGNES :
1. Identifie les vulnérabilités (XSS, CSRF, injection SQL...)
2. Explique l'impact de chaque faille
3. Propose des solutions concrètes
4. Cite les standards OWASP

Format : Liste numérotée avec niveau de sévérité
```

**Actions disponibles :**
- ✏️ **Modifier** : Éditer un agent existant
- 📋 **Dupliquer** : Créer une copie
- 🗑️ **Supprimer** : Supprimer définitivement

**Limites :**
- Maximum 10 agents personnalisés
- Stockage local (IndexedDB)

---

### 4. 📊 Provenance et Traçabilité

**Qu'est-ce que c'est ?**
Chaque réponse d'ORION affiche maintenant sa provenance complète.

**Informations affichées :**

1. **Sources utilisées** (toujours visible)
   - 🔧 Outil Local (si utilisé)
   - 💾 Souvenirs (nombre de hits mémoire)
   - 🧠 Raisonnement LLM
   - 👥 Multi-agents (si débat)

2. **Étapes de raisonnement** (repliable)
   - Voir section "Pensée Étape par Étape"

3. **Métriques de qualité** (si débat multi-agents)
   - Scores de cohérence, diversité, profondeur
   - Convergence du débat

4. **Informations techniques** (en bas)
   - ⏱️ Temps de traitement (ms)
   - 🎯 Confiance (0-100%)
   - 🔄 Rounds de débat

**Avantages :**
- ✅ Transparence totale
- ✅ Vérifiabilité des sources
- ✅ Meilleure compréhension du processus

---

### 5. 🚀 Déploiement Vercel

**Configuration prête pour Vercel**

Le fichier `vercel.json` est configuré avec :
- ✅ Headers de sécurité (CORS, XSS, etc.)
- ✅ Cache optimisé pour les assets
- ✅ Rewrites pour SPA
- ✅ Build Vite automatique

**Déploiement en 3 étapes :**

```bash
# 1. Installer Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Déployer
vercel --prod
```

Ou via l'interface web Vercel :
1. Connecter votre repo GitHub
2. Vercel détecte automatiquement Vite
3. Déploiement automatique à chaque push

---

## 🎯 Scénarios d'utilisation

### Scénario 1 : Développeur travaillant sur un projet

1. **Créer un contexte ambiant** :
   ```
   Titre: Mon stack technique
   Contenu: Je développe une app fullstack avec Next.js 14, TypeScript, Prisma, PostgreSQL et TailwindCSS
   ```

2. **Créer un agent "Code Review"** depuis les presets

3. **Poser des questions** :
   - "Comment structurer mes composants serveur et client ?"
   - "Quelle stratégie de cache pour Prisma ?"

4. **Consulter les étapes de raisonnement** pour comprendre le processus

---

### Scénario 2 : Rédacteur de documentation

1. **Créer un agent personnalisé** :
   ```
   Nom: Rédacteur API Doc
   Catégorie: writing
   System Prompt: Tu rédiges de la documentation d'API REST.
   Format: OpenAPI/Swagger avec exemples.
   Ton: Clair, précis, avec cas d'usage.
   ```

2. **Utiliser l'agent** pour documenter vos endpoints

3. **Voir la provenance** pour vérifier les sources

---

### Scénario 3 : Analyste de données

1. **Contexte ambiant** :
   ```
   Je travaille avec des datasets de ventes e-commerce.
   Stack: Python, pandas, matplotlib, scikit-learn
   ```

2. **Utiliser le preset "Analyste de Données"**

3. **Questions d'analyse** :
   - "Comment détecter les anomalies dans mes données ?"
   - "Quelle visualisation pour montrer la saisonnalité ?"

---

## 🔧 Panneau de Contrôle

Le Panneau de Contrôle centralise toutes les nouvelles fonctionnalités :

### Onglets disponibles

| Onglet | Icône | Fonction |
|--------|-------|----------|
| **Perf.** | ⚡ | Profil de performance, métriques temps réel |
| **Ctx.** | ✨ | Gestion des contextes ambiants |
| **Agents** | 🧠 | Création et gestion d'agents personnalisés |
| **Débat** | 💬 | Configuration du mode débat multi-agents |
| **Mém.** | 💾 | Gestion de la mémoire et du cache |
| **Audit** | 📊 | Journal d'audit des actions système |

---

## 📈 Métriques et Statistiques

### Contextes Ambiants
- Nombre actifs / max (3/3)
- Longueur du contenu (10-500 caractères)
- Date de dernière modification

### Agents Personnalisés
- Nombre d'agents / max (X/10)
- Compteur d'utilisation par agent
- Catégorie et paramètres

### Étapes de Raisonnement
- Nombre d'étapes parsées
- Types d'étapes détectés
- Confiance extraite

---

## 🐛 Résolution de Problèmes

### Le contexte ambiant n'apparaît pas dans mes réponses

**Vérifications :**
1. Le contexte est-il **activé** ? (toggle on)
2. Avez-vous moins de 3 contextes actifs ?
3. Le contenu respecte-t-il la longueur min/max ?

**Solution :**
- Désactivez un contexte si vous êtes à la limite
- Vérifiez dans le Panneau de Contrôle → Ctx.

---

### Les étapes de raisonnement ne s'affichent pas

**Causes possibles :**
1. La réponse est trop courte
2. Le format n'est pas reconnu par le parser

**Solution :**
- Les étapes sont optionnelles
- Le parser fait un fallback intelligent
- Reformulez votre question pour une réponse plus structurée

---

### Mon agent personnalisé ne se sauvegarde pas

**Vérifications :**
1. Tous les champs obligatoires sont remplis ? (*)
2. Les longueurs min/max sont respectées ?
3. Vous n'avez pas atteint la limite de 10 agents ?

**Solution :**
- Vérifiez les compteurs de caractères
- Supprimez un agent inutilisé si limite atteinte

---

## 💡 Conseils et Bonnes Pratiques

### Contextes Ambiants

✅ **Faire :**
- Soyez spécifique et concis
- Mettez à jour régulièrement
- Utilisez un titre descriptif

❌ **Éviter :**
- Contextes trop génériques ("Je suis développeur")
- Informations obsolètes
- Activer trop de contextes à la fois

### Agents Personnalisés

✅ **Faire :**
- Testez avec des questions variées
- Ajustez la température selon le besoin
- Utilisez des exemples dans le prompt

❌ **Éviter :**
- Prompts trop vagues
- Température trop élevée (> 1.5) pour des tâches précises
- Dupliquer inutilement les agents

### Étapes de Raisonnement

✅ **Faire :**
- Consultez-les pour apprendre
- Vérifiez la logique du raisonnement
- Utilisez-les pour détecter les biais

❌ **Éviter :**
- Se fier uniquement à la conclusion
- Ignorer les étapes critiques

---

## 📚 Ressources

- **Documentation complète** : `/IMPLEMENTATION_ORION_FEATURES.md`
- **Guide de déploiement** : `/docs/DEPLOYMENT_GUIDE.md`
- **Changelog** : `/CHANGELOG_QUALITE.md`

---

## ✨ Conclusion

Vous disposez maintenant d'un système IA :
- 💭 **Contextuel** avec la mémoire ambiante
- 🧠 **Transparent** avec les étapes de raisonnement
- 🤖 **Personnalisable** avec vos propres agents
- 📊 **Traçable** avec la provenance complète
- 🚀 **Déployable** sur Vercel en un clic

**Profitez d'ORION !** 🎉
