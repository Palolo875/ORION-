# ORION - Architecture et Flux de Données

## 📋 Vue d'Ensemble

Ce document décrit le flux complet de données dans ORION, de l'entrée utilisateur jusqu'à la réponse de l'IA.

## 🔄 Flux Principal : User Query → AI Response

```
┌─────────────┐
│   Utilisateur │
│  tape message │
└───────┬───────┘
        │
        ▼
┌──────────────────┐
│   ChatInput.tsx  │  ← Composant UI
│  - Validation    │
│  - Sanitization  │
│  - Rate limiting │
└────────┬─────────┘
         │ onSend(message, attachments)
         ▼
┌──────────────────────┐
│    Index.tsx         │  ← Page principale
│  handleSendMessage() │
└──────────┬───────────┘
           │
           ▼
┌───────────────────────────┐
│ useConversationHandlers   │  ← Hook métier
│   handleSendMessage()     │
└──────────┬────────────────┘
           │
           ▼
┌────────────────────────────┐
│  useOrchestratorWorker     │  ← Hook worker
│    sendQuery()             │
└──────────┬─────────────────┘
           │ postMessage({ type: 'query', payload, meta })
           ▼
┌═══════════════════════════════════════════════════════════┐
║                  ORCHESTRATOR WORKER                       ║
║  (src/workers/orchestrator.worker.ts)                     ║
║                                                            ║
║  1. Receive query message                                 ║
║  2. Check circuit breaker                                 ║
║  3. Save context (currentQueryContext)                    ║
║  4. ToolExecutionManager.findAndExecuteTool()             ║
║                                                            ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  ToolExecutionManager                        │        ║
║  │  - Détecte si un outil peut répondre         │        ║
║  │  - Envoie à ToolUser Worker si outil trouvé  │        ║
║  │  - Sinon → handleNoToolFound()                │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  handleNoToolFound()                         │        ║
║  │  1. Send 'search_memory' to Memory Worker    │        ║
║  │  2. Get ambient context from IndexedDB       │        ║
║  │  3. Wait for memory results                  │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  Memory Worker Response                      │        ║
║  │  → handleMemorySearchResult()                │        ║
║  │     currentMemoryHits = results              │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  sendToContextManager()                      │        ║
║  │  - Send conversation history                │        ║
║  │  - Optimize context for token limit          │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  Context Manager Response                    │        ║
║  │  → handleContextOptimized()                  │        ║
║  │     currentQueryContext = optimizedContext   │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  MultiAgentCoordinator                       │        ║
║  │  .processWithDebate()                        │        ║
║  │                                               │        ║
║  │  → Decides based on deviceProfile:           │        ║
║  │    - micro: Synthesizer only                 │        ║
║  │    - lite: Logical + Synthesizer             │        ║
║  │    - full: All agents (Logical, Creative,    │        ║
║  │            Critical, Synthesizer)             │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  getLLMWorker() - Lazy Loading               │        ║
║  │  First call loads the LLM worker (~5.4MB)    │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ╔═══════════════════════════════════════════╗           ║
║  ║        LLM WORKER                         ║           ║
║  ║  (src/workers/llm.worker.ts)              ║           ║
║  ║                                            ║           ║
║  ║  1. Load model if needed (WebLLM)         ║           ║
║  ║     → Send progress updates                ║           ║
║  ║                                            ║           ║
║  ║  2. For each agent persona:               ║           ║
║  ║     - Prepare system prompt               ║           ║
║  ║     - Set temperature                     ║           ║
║  ║     - Run inference                       ║           ║
║  ║     - Stream response                     ║           ║
║  ║                                            ║           ║
║  ║  3. Return result to Orchestrator         ║           ║
║  ╚══════════════┬════════════════════════════╝           ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  MultiAgentCoordinator receives results      │        ║
║  │  - Logical agent response                    │        ║
║  │  - Creative agent response (if full)         │        ║
║  │  - Critical agent analysis (if full)         │        ║
║  │  - Synthesizer final answer                  │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  ResponseFormatter                            │        ║
║  │  .formatFinalResponse()                      │        ║
║  │                                               │        ║
║  │  Creates FinalResponsePayload:               │        ║
║  │  - response: string                          │        ║
║  │  - confidence: number                        │        ║
║  │  - provenance: { fromAgents, memoryHits }    │        ║
║  │  - debug: { inferenceTimeMs, rounds }        │        ║
║  │  - reasoningSteps: []                        │        ║
║  └──────────────┬───────────────────────────────┘        ║
║                 │                                          ║
║                 ▼                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │  postMessage to UI                            │        ║
║  │  type: 'final_response'                      │        ║
║  │  payload: FinalResponsePayload               │        ║
║  │  meta: { traceId }                           │        ║
║  └──────────────┬───────────────────────────────┘        ║
╚═════════════════╪═══════════════════════════════════════╝
                  │
                  ▼
┌────────────────────────────┐
│  useOrchestratorWorker     │
│  onmessage handler         │
│  → onFinalResponse()       │
└──────────┬─────────────────┘
           │
           ▼
┌───────────────────────────┐
│    Index.tsx              │
│  onFinalResponse callback │
│  - addAssistantMessage()  │
│  - updateConversation()   │
│  - addInferenceTime()     │
└──────────┬────────────────┘
           │
           ▼
┌──────────────────────┐
│  ChatMessages.tsx    │  ← UI updates
│  Display AI response │
│  with metadata       │
└──────────────────────┘
```

## 🧠 Workers Architecture

### 1. Orchestrator Worker
**Rôle**: Chef d'orchestre central
- Coordonne tous les autres workers
- Gère le circuit breaker
- Route les requêtes
- Assemble les réponses finales

### 2. LLM Worker (Lazy-loaded)
**Rôle**: Inférence IA
- Charge les modèles WebLLM
- Exécute l'inférence
- Gère plusieurs personas (agents)
- ~5.4MB, chargé à la première utilisation

### 3. Memory Worker
**Rôle**: Mémoire vectorielle
- Génère embeddings (@xenova/transformers)
- Recherche HNSW pour similarité
- Stocke dans IndexedDB
- TTL: 24h pour résultats d'outils

### 4. ToolUser Worker
**Rôle**: Exécution d'outils
- 12 outils disponibles (calculatrice, conversions, etc.)
- Détection par regex
- Exécution sécurisée (pas d'eval)
- Cache des résultats

### 5. ContextManager Worker
**Rôle**: Optimisation du contexte
- Résume conversations longues
- Extrait entités nommées (NER)
- Scoring d'importance des messages
- Reste dans limites de tokens

### 6. GeniusHour Worker
**Rôle**: Apprentissage continu
- Analyse feedback négatif
- Identifie patterns d'échecs
- Suggère améliorations
- Cycle toutes les 30s

## 🔒 Sécurité - Couches Multiples

```
User Input
    │
    ▼
┌─────────────────────────┐
│ 1. Rate Limiting        │  ← 10 msg/min
│    (ChatInput)          │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 2. Input Validation     │  ← Max length, type check
│    (validateUserInput)  │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 3. Sanitization         │  ← DOMPurify, URL validation
│    (sanitizeContent)    │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 4. Prompt Guardrails    │  ← Détection XSS, injection
│    (promptGuardrails)   │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 5. Zod Validation       │  ← Type safety runtime
│    (Worker payloads)    │
└──────────┬──────────────┘
           ▼
        Safe for LLM
```

## 📊 OIE (Orion Inference Engine)

```
User Query
    │
    ▼
┌─────────────────────────┐
│  NeuralRouter           │  ← ~95% précision
│  (MobileBERT)           │     (vs 85% SimpleRouter)
│                         │
│  Analyse:               │
│  - Intent (code/chat)   │
│  - Langue               │
│  - Complexité           │
│  - Modalité             │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Agent Selection        │
│                         │
│  6 agents spécialisés:  │
│  ├─ ConversationAgent   │  ← Phi-3, q3, 1.2GB
│  ├─ CodeAgent           │  ← CodeGemma, q3, 800MB
│  ├─ VisionAgent         │  ← Phi-3-Vision, q3, 3GB
│  ├─ MultilingualAgent   │  ← Qwen2, q3, 600MB
│  ├─ CreativeAgent       │  ← SD 2.1, q4, 1.3GB
│  └─ LogicalAgent        │  ← Phi-3, q3
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Cache Manager          │  ← LRU, 5000 items max
│  Check cache first      │
└──────────┬──────────────┘
           │ Cache miss
           ▼
┌─────────────────────────┐
│  Progressive Loader     │  ← TTFT < 3s
│  - 2 shards initial     │     (vs 15-20s before)
│  - 4 shards background  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Agent.process()        │
│  - Input preparation    │
│  - Temperature setting  │
│  - Inference            │
│  - Output formatting    │
└──────────┬──────────────┘
           │
           ▼
       Response
```

## 🚀 Performance Optimizations

### Code Splitting
```
Bundle Structure:
├─ react-vendor.js          (~150KB)  ← React core
├─ web-llm.js               (~5.4MB)  ← Lazy loaded
├─ transformers.js          (~2MB)    ← Embeddings
├─ worker-orchestrator.js   (~50KB)
├─ worker-llm.js            (~30KB)   ← Lazy loaded
├─ worker-memory.js         (~80KB)
└─ ui-components.js         (~200KB)
```

### Caching Strategy
```
Service Worker:
├─ Models (HuggingFace)  → Cache-First, 60 days
├─ Embeddings            → Cache-First, 60 days
├─ WASM files            → Cache-First, 90 days
├─ Static assets         → Cache-First, 30 days
└─ API calls             → Network-First, 7 days
```

### Memory Management
- **Budget**: 5000 embeddings max
- **TTL**: 24h pour outils
- **LRU**: Éviction des moins utilisés
- **Quantification**: q3 pour agents standards, q4 pour vision/créatif

## 🧪 Testing Strategy

### 1. Unit Tests (Vitest)
- Workers individuels (avec mocks)
- Hooks React
- Utilitaires (sanitizer, logger, etc.)

### 2. Integration Tests
- Orchestrator ↔ Workers communication
- Memory search end-to-end
- Tool execution pipeline

### 3. E2E Tests (Playwright)
- User flow complet
- Model selection → Query → Response
- UI interactions
- Error handling

## 📚 Références

- **Architecture**: [replit.md](../replit.md)
- **OIE**: [src/oie/README.md](../src/oie/README.md)
- **Workers**: [src/workers/](../src/workers/)
- **Sécurité**: [src/utils/security/](../src/utils/security/)
