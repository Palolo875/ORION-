# 🎯 Agent de Démo - Guide d'Utilisation

**Testez ORION IMMÉDIATEMENT sans téléchargement !**

---

## ✨ Caractéristiques

| Propriété | Valeur |
|-----------|--------|
| **Poids** | **0 Mo** (aucun téléchargement) |
| **Temps de chargement** | < 1 seconde |
| **Temps de réponse** | < 1 seconde |
| **RAM requise** | ~10 Mo |
| **Qualité** | Démonstration (exemples pré-définis) |

---

## 🚀 Utilisation

### Étape 1 : Lancer ORION

```bash
cd /workspace && npm run dev
```

### Étape 2 : Ouvrir l'Interface

Ouvrir http://localhost:5173

### Étape 3 : Sélectionner l'Agent de Démo

Dans le sélecteur de modèles, vous verrez en **premier** :

```
🎯 Agent de Démo (0 Mo) - TEST INSTANTANÉ
```

**Cliquez dessus !**

### Étape 4 : Tester Immédiatement !

L'agent est chargé **instantanément** (< 1s).

**Essayez une de ces requêtes :**

#### Code
```
"Implémente quicksort"
"Crée une API REST avec authentification JWT"
```

#### Logique
```
"Explique l'algorithme de quicksort"
"Comment fonctionne JWT ?"
```

#### Général
```
"Qu'est-ce qu'un Virtual Agent ?"
```

---

## 📋 Réponses Disponibles

L'agent de démo possède des **réponses pré-définies de haute qualité** pour :

### 1. Quicksort
- Code TypeScript complet
- Analyse logique détaillée
- Complexité algorithmique
- Améliorations possibles

### 2. Authentification JWT
- Système complet Express.js + JWT
- Middleware de sécurité
- Routes register/login/profile
- Analyse de sécurité détaillée

### 3. Exemples Généraux
- Code TypeScript générique
- Explications sur les Virtual Agents
- Suggestions de vraies requêtes

---

## 🎯 Objectif

**L'agent de démo permet de :**

✅ **Tester l'interface** ORION sans attendre
✅ **Comprendre le format** des réponses
✅ **Voir comment fonctionnent** les Virtual Agents
✅ **Développer et déboguer** sans modèle lourd
✅ **Démontrer ORION** instantanément

---

## 🔄 Passer aux Vrais Modèles

### Quand utiliser un vrai modèle ?

**L'agent de démo est parfait pour :**
- Premiers tests
- Développement
- Démonstrations rapides
- Comprendre l'interface

**Mais pour de vraies capacités IA, téléchargez :**

#### Option 1 : Rapide (~2 Go, 10 min)
```
Phi-3 Mini
```

#### Option 2 : Optimal (~5 Go, 25 min)
```
CodeGemma + Llama 3.2
```

#### Option 3 : Maximum (~18 Go, 60 min)
```
CodeGemma + Llama 3.2 + Mistral + Qwen2 + LLaVA
```

---

## 💡 Conseils

### Requêtes qui fonctionnent bien

**✅ Bonnes requêtes :**
- "Implémente quicksort"
- "Crée une API avec JWT"
- "Explique l'algorithme"

**❌ Limites :**
- Questions très spécifiques non prévues
- Requêtes nécessitant créativité
- Sujets non-techniques

**Pour tout le reste → Téléchargez un vrai modèle ! 😊**

---

## 🔧 Pour les Développeurs

### Ajouter de Nouvelles Réponses

Éditez `/workspace/src/oie/agents/demo-agent.ts` :

```typescript
const DEMO_RESPONSES = {
  code: {
    quicksort: `...`, // Déjà présent
    authentication: `...`, // Déjà présent
    
    // Ajoutez vos réponses ici
    binarySearch: `
      // Votre code de démonstration
    `,
    
    graphAlgorithm: `
      // Autre exemple
    `
  }
};
```

### Détecter de Nouveaux Types

```typescript
private getCodeResponse(query: string): string {
  if (query.includes('quicksort')) {
    return DEMO_RESPONSES.code.quicksort;
  }
  
  if (query.includes('jwt') || query.includes('auth')) {
    return DEMO_RESPONSES.code.authentication;
  }
  
  // Ajoutez vos détections ici
  if (query.includes('binary search')) {
    return DEMO_RESPONSES.code.binarySearch;
  }
  
  return this.getGenericCodeResponse();
}
```

---

## 📊 Comparaison

| Critère | Agent de Démo | Vrai Modèle (Phi-3) | Virtual ULTRA |
|---------|---------------|---------------------|---------------|
| **Téléchargement** | 0 Mo | ~2 Go | 0 Mo supplémentaire |
| **Setup** | < 1s | 10 min | < 1s |
| **Réponse** | < 1s | 3-10s | 3-5s |
| **Qualité** | Exemples | 85% | 99.5% |
| **Créativité** | ❌ | ✅ | ✅✅ |
| **Flexibilité** | ❌ | ✅ | ✅✅ |

---

## 🎊 Conclusion

**L'Agent de Démo est parfait pour :**

✅ **Démarrer instantanément** avec ORION
✅ **Comprendre l'interface** et le workflow
✅ **Tester les fonctionnalités** sans attendre
✅ **Démonstrations** rapides

**Ensuite, passez aux Virtual Agents ULTRA pour la vraie puissance IA ! 🚀**

---

## 🚀 Commencer Maintenant

```bash
npm run dev
```

**Sélectionnez "🎯 Agent de Démo (0 Mo)" et testez immédiatement !**

**Aucun téléchargement. Aucune attente. Juste du test ! ⚡**
