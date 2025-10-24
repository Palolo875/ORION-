# 🧠 Système de Comportement Humain Amélioré pour ORION

## Vue d'ensemble

Ce système permet à ORION de se comporter de manière plus naturelle et humaine, **en conservant uniquement les avantages humains** tout en **réduisant drastiquement les erreurs et hallucinations**.

## 🎯 Objectifs

### Avantages Humains Conservés
- ✅ **Honnêteté** : Admet l'incertitude et l'ignorance
- ✅ **Pensée visible** : Montre le processus de réflexion
- ✅ **Auto-correction** : Se corrige en temps réel
- ✅ **Demandes de clarification** : Pose des questions quand nécessaire
- ✅ **Empathie cognitive** : Comprend le contexte et les nuances

### Erreurs Humaines Éliminées
- ❌ **Hallucinations** : Système de détection et prévention
- ❌ **Biais de confirmation** : Validation croisée entre agents
- ❌ **Sur-confiance** : Calibration précise de la certitude
- ❌ **Invention de faits** : Vérifications anti-hallucination
- ❌ **Manque de rigueur** : Score de confiance obligatoire

## 📦 Composants

### 1. Module Core (`src/utils/humanBehavior.ts`)

Le module principal fournit :

```typescript
import {
  enrichWithHumanBehavior,
  calculateConfidence,
  detectPotentialHallucination,
  validateAgentConsensus,
  needsClarification,
} from '@/utils/humanBehavior';
```

#### Fonctions Principales

**`enrichWithHumanBehavior(response, query, config, context)`**
Enrichit une réponse avec des comportements humains naturels.

```typescript
const enriched = enrichWithHumanBehavior(
  "Voici ma réponse...",
  "Question de l'utilisateur",
  {
    enableThinking: true,
    enableUncertainty: true,
    confidenceThreshold: 0.7,
  },
  { hasMemory: true, agentConsensus: 0.85 }
);

console.log(enriched.confidence.score); // 0.85
console.log(enriched.thinking); // "Laissez-moi réfléchir à cela..."
```

**`calculateConfidence(response, query, context)`**
Calcule un score de confiance basé sur plusieurs facteurs.

```typescript
const confidence = calculateConfidence(
  "Selon les données de 2020, la réponse est X",
  "Question",
  { hasMemory: true }
);

// {
//   score: 0.82,
//   reasoning: "Score basé sur : bonnes bases factuelles, cohérence logique forte",
//   factors: {
//     factualBasis: 0.8,
//     logicalConsistency: 0.9,
//     domainExpertise: 0.7,
//     uncertaintyLevel: 0.2
//   }
// }
```

**`detectPotentialHallucination(response)`**
Détecte les hallucinations potentielles dans une réponse.

```typescript
const check = detectPotentialHallucination(
  "En 2028, cet événement s'est produit. Exactement 99.99% des gens..."
);

// {
//   likely: true,
//   warnings: [
//     "Mention de dates futures (possible hallucination)",
//     "Affirmations très spécifiques sans source"
//   ],
//   confidence: 0.3
// }
```

**`validateAgentConsensus(responses)`**
Valide la cohérence entre plusieurs réponses d'agents.

```typescript
const validation = validateAgentConsensus([
  { agent: 'logical', response: 'Solution A est optimale car X' },
  { agent: 'creative', response: 'Je propose A avec l\'approche Y' },
  { agent: 'critical', response: 'A semble correct mais attention à Z' }
]);

// {
//   consensus: 0.75,
//   contradictions: [],
//   recommendations: []
// }
```

### 2. Hook React (`src/hooks/useHumanBehavior.ts`)

Hook principal pour intégrer facilement les fonctionnalités.

```typescript
import { useHumanBehavior } from '@/hooks/useHumanBehavior';

function MyComponent() {
  const {
    enrichResponse,
    checkHallucination,
    calculateResponseConfidence,
    validateMultipleAgents,
    lastConfidence,
  } = useHumanBehavior({
    config: {
      enableThinking: true,
      confidenceThreshold: 0.7,
    }
  });
  
  const handleResponse = (response: string, query: string) => {
    // Enrichir la réponse
    const enriched = enrichResponse(response, query, { hasMemory: true });
    
    // Vérifier les hallucinations
    const hallucinationCheck = checkHallucination(response);
    
    if (hallucinationCheck.likely) {
      console.warn("Possible hallucination détectée!");
    }
    
    return enriched;
  };
}
```

#### Hooks Spécialisés

**`useHallucinationDetector()`** - Détection d'hallucinations en temps réel
```typescript
const { checkHallucination, isResponseSafe } = useHallucinationDetector();

if (!isResponseSafe(response, 0.6)) {
  // Alerter l'utilisateur
}
```

**`useConfidenceTracking()`** - Suivi historique de la confiance
```typescript
const { 
  trackConfidence, 
  averageConfidence, 
  lowConfidenceCount 
} = useConfidenceTracking();

const confidence = trackConfidence(response, query);
console.log(`Confiance moyenne : ${averageConfidence * 100}%`);
```

### 3. Composants UI

**`ConfidenceIndicator`** - Affichage visuel du score de confiance

```tsx
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';

<ConfidenceIndicator
  confidence={confidence}
  showDetails={true}
  hallucinationWarnings={["Dates futures détectées"]}
/>
```

**`ConfidenceBadge`** - Version compacte inline

```tsx
import { ConfidenceBadge } from '@/components/ConfidenceIndicator';

<p>
  Réponse <ConfidenceBadge confidence={confidence} />
</p>
```

## 🔧 Configuration des Agents

Les prompts système des agents ont été enrichis avec des instructions de comportement humain avancé.

### Agent Logique
```
COMPORTEMENT HUMAIN AVANCÉ :
- Si tu n'as pas assez d'informations, ADMETS-LE
- Si plusieurs interprétations sont possibles, MENTIONNE-LES
- N'invente JAMAIS de données - utilise "données non disponibles"
- Calibre ta certitude : "certain", "probable", "hypothétique"
```

### Agent Créatif
```
COMPORTEMENT HUMAIN AVANCÉ :
- Distingue entre "idée spéculative" et "proposition concrète"
- Utilise "imagination" ou "hypothèse créative" pour cadrer tes idées
- Si une analogie peut être mal comprise, PRÉCISE son sens
- Reste créatif SANS inventer de faux faits
```

### Agent Critique
```
COMPORTEMENT HUMAIN AVANCÉ :
- Distingue entre "risque prouvé" et "risque hypothétique"
- Si tu identifies une erreur factuelle, CITE pourquoi
- Sois critique mais HONNÊTE : si un argument est solide, reconnais-le
- Évite les critiques basées sur des suppositions non vérifiées
```

### Agent Synthétiseur
```
COMPORTEMENT HUMAIN AVANCÉ :
- CALIBRE ta confiance : si les agents divergent, MENTIONNE-LE
- Si une information clé manque, DIS-LE
- Utilise : 🟢 Confiance élevée | 🟡 Confiance moyenne | 🔴 Incertitude
- Si tu détectes une hallucination, ALERTE l'utilisateur
```

## 📊 Système de Score de Confiance

### Facteurs de Calcul

| Facteur | Poids | Description |
|---------|-------|-------------|
| **Bases factuelles** | 30% | Présence de faits, chiffres, références |
| **Cohérence logique** | 30% | Structure, absence de contradictions |
| **Expertise domaine** | 20% | Consensus entre agents |
| **Niveau certitude** | 20% | Absence de marqueurs d'incertitude |

### Interprétation

- **🟢 0.8 - 1.0** : Confiance élevée - Réponse fiable
- **🟡 0.6 - 0.8** : Confiance moyenne - Réponse valide mais à nuancer
- **🔴 0.0 - 0.6** : Incertitude - Vérification recommandée

## 🛡️ Système Anti-Hallucination

### Détections Automatiques

1. **Dates futures** : Détecte les références temporelles impossibles
2. **Affirmations spécifiques sans source** : "Exactement 73.456%"
3. **Contradictions internes** : "C'est vrai... mais c'est faux"
4. **Noms propres inventés** : Détection heuristique
5. **Langage sur-confiant** : "Absolument certain" sans justification

### Actions Automatiques

Quand une hallucination est détectée :
- ⚠️ Ajout d'un disclaimer visible
- 📉 Réduction automatique du score de confiance
- 🔔 Alerte dans le composant UI
- 📝 Logging pour analyse

## 🧪 Tests

### Exécution des Tests

```bash
npm run test -- src/utils/__tests__/humanBehavior.test.ts
```

### Couverture

- ✅ Détection de clarification
- ✅ Calcul de confiance
- ✅ Détection d'hallucination
- ✅ Validation consensus agents
- ✅ Enrichissement de réponses
- ✅ Génération de prompts

## 📈 Intégration dans le Flow Existant

### Dans le LLM Worker

```typescript
import { generateHumanAwarePrompt } from '@/utils/humanBehavior';

// Enrichir le system prompt
const enrichedPrompt = generateHumanAwarePrompt(baseSystemPrompt, {
  enableThinking: true,
  enableUncertainty: true,
  confidenceThreshold: 0.7,
});
```

### Dans les Composants Chat

```typescript
import { useHumanBehavior } from '@/hooks/useHumanBehavior';
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';

function ChatMessage({ message }) {
  const { enrichResponse, checkHallucination } = useHumanBehavior();
  
  // Enrichir la réponse
  const enriched = enrichResponse(message.text, message.query);
  
  // Vérifier hallucinations
  const halluCheck = checkHallucination(message.text);
  
  return (
    <div>
      {enriched.thinking && <p className="italic">{enriched.thinking}</p>}
      <p>{enriched.response}</p>
      <ConfidenceIndicator 
        confidence={enriched.confidence}
        hallucinationWarnings={halluCheck.warnings}
      />
    </div>
  );
}
```

### Dans Multi-Agent Coordinator

```typescript
import { validateAgentConsensus } from '@/utils/humanBehavior';

// Après collecte des réponses
const validation = validateAgentConsensus(agentResponses);

if (validation.consensus < 0.5) {
  console.warn('Faible consensus entre agents');
}

// Utiliser le consensus dans la synthèse
const finalResponse = synthesize(
  agentResponses, 
  { consensus: validation.consensus }
);
```

## 🎨 Exemples d'Usage

### Exemple 1 : Question Simple

**Input** : "Quelle est la capitale de la France ?"

**Output** :
```
Réponse : "Paris est la capitale de la France."
Confiance : 🟢 95% (Confiance élevée)
Facteurs :
  - Bases factuelles : 100%
  - Cohérence logique : 95%
  - Expertise : 90%
```

### Exemple 2 : Question Ambiguë

**Input** : "Explique-moi ça"

**Output** :
```
Clarification nécessaire : "Votre question contient des pronoms ambigus. 
À quoi faites-vous référence exactement ?"
```

### Exemple 3 : Hallucination Détectée

**Input** : Question complexe

**Output** :
```
⚠️ Note : Affirmations très spécifiques sans source

Réponse : [...]

Confiance : 🔴 45% (Incertitude)
⚠️ Cette réponse pourrait contenir des informations incorrectes.
Vérifiez les faits importants.
```

### Exemple 4 : Désaccord Entre Agents

**Validation** :
```
Consensus : 40%
Contradictions :
  - Désaccord entre agents sur la validité de certaines affirmations

Recommandations :
  - Résolution de contradictions nécessaire dans la synthèse finale
  - Considérez demander plus de détails à l'utilisateur
```

## 🚀 Roadmap

### Phase 1 : Fondations (✅ Complété)
- [x] Module core humanBehavior
- [x] Hook React useHumanBehavior
- [x] Composants UI ConfidenceIndicator
- [x] Enrichissement des prompts agents
- [x] Tests unitaires

### Phase 2 : Intégration (🚧 En cours)
- [ ] Intégration dans le LLM Worker
- [ ] Intégration dans Multi-Agent Coordinator
- [ ] Intégration dans les composants Chat
- [ ] Tests E2E

### Phase 3 : Optimisation (📋 Planifié)
- [ ] Machine learning pour améliorer la détection d'hallucination
- [ ] Historique de confiance par utilisateur
- [ ] A/B testing des configurations
- [ ] Métriques de performance

## 📝 Notes de Développement

### Principes de Design

1. **Non-intrusif** : Le système enrichit sans modifier le flow existant
2. **Configurable** : Tous les comportements sont activables/désactivables
3. **Transparent** : Scores et raisonnements visibles pour l'utilisateur
4. **Performant** : Calculs légers, pas de latence ajoutée significative

### Limitations Connues

- Détection d'hallucination basée sur heuristiques (pas ML pour l'instant)
- Consensus agents basé sur analyse lexicale simple
- Pas de vérification externe de faits (future amélioration)

## 🤝 Contribution

Pour contribuer à ce système :

1. Lire la documentation complète
2. Exécuter les tests : `npm test`
3. Ajouter des tests pour nouvelles fonctionnalités
4. Documenter les changements dans ce fichier

## 📚 Références

- [Calibrated Confidence in AI Systems](https://arxiv.org/abs/...)
- [Hallucination Detection in LLMs](https://arxiv.org/abs/...)
- [Human-AI Collaboration Best Practices](https://...)

---

**Dernière mise à jour** : Octobre 2025  
**Mainteneur** : Équipe ORION
