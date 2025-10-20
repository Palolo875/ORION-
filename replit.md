# ORION - AI Chat Assistant

## Overview

ORION is a sophisticated browser-based AI chat assistant that runs entirely locally using WebLLM technology. It features a multi-agent debate system, intelligent memory management, and comprehensive tool integration - all without requiring a backend server.

The application leverages modern web technologies (React, TypeScript, Web Workers) to provide a responsive chat interface with advanced AI capabilities including embeddings-based memory search, context management, and real-time cognitive flow visualization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:**
- React 18 with TypeScript for type-safe UI components
- Vite as the build tool and development server
- TailwindCSS + shadcn/ui for styling and component library
- Framer Motion for animations and transitions

**Key Design Patterns:**
- Feature-based code organization (`src/features/chat/`)
- Custom React hooks for state management and worker communication
- Error boundaries for graceful failure handling
- Progressive Web App (PWA) with offline-first capabilities

**State Management:**
- Local React state with custom hooks (`useConversations`, `useChatMessages`, `useModelManagement`)
- IndexedDB for persistent storage of conversations and memory
- Web Workers for background processing without blocking UI

### Multi-Agent System

**Architecture Decision:** Single LLM worker with dynamic persona switching via system prompts instead of multiple worker instances.

**Rationale:** 
- Memory efficiency: Load one model instead of four
- Flexibility: Easy to modify agent behaviors by changing prompts
- Simplicity: Single engine to maintain

**Agent Types:**
1. **Logical Agent** (temperature: 0.3) - Structured analysis and reasoning
2. **Creative Agent** (temperature: 0.9) - Divergent thinking and exploration
3. **Critical Agent** (temperature: 0.5) - Skeptical analysis and counter-arguments
4. **Synthesizer Agent** (temperature: 0.7) - Final balanced synthesis

**Execution Strategy:**
- Simple queries: Direct response from Synthesizer
- Complex queries: Parallel execution of Logical + Creative → Critical → Synthesizer
- Performance gain: ~5 seconds on complex queries (10s vs 15s sequential)

### Worker Architecture

**Web Workers Implementation:**
All heavy computation runs in dedicated workers to keep UI responsive:

1. **orchestrator.worker.ts** - Central coordinator
   - Routes requests to appropriate workers
   - Manages multi-agent debate flow
   - Handles tool detection and execution
   - Implements circuit breaker pattern for error recovery

2. **llm.worker.ts** - AI inference engine
   - Uses @mlc-ai/web-llm for in-browser LLM execution
   - Supports WebGPU acceleration with WebGL fallback
   - Handles model loading with progress tracking
   - Implements retry logic with exponential backoff

3. **memory.worker.ts** - Vector-based memory system
   - Uses @xenova/transformers for text embeddings
   - HNSW (Hierarchical Navigable Small World) index for fast similarity search
   - Implements TTL (24h for tool results) and LRU eviction policies
   - Maximum 5000 memories to prevent browser storage exhaustion

4. **toolUser.worker.ts** - Tool execution
   - Whitelisted tools only (security by design)
   - Supports 12 tools: calculator, unit conversions, timers, etc.
   - Uses mathjs instead of eval() for safe expression evaluation
   - Intent detection via regex patterns

5. **contextManager.worker.ts** - Context optimization
   - Preserves conversation context beyond token limits (50+ messages)
   - Scoring algorithm for message importance
   - Automatic summarization when needed
   - Named Entity Recognition (NER) for knowledge extraction

6. **geniusHour.worker.ts** - Background learning
   - Analyzes negative feedback every 30 seconds
   - Identifies failure patterns using semantic similarity
   - Generates alternative prompt suggestions
   - Stores learnings for future improvement

### Memory and Search System

**Vector Database Architecture:**
- Embeddings generated using all-MiniLM-L6-v2 model (384 dimensions)
- HNSW index for O(log n) similarity search vs O(n) linear
- 10-100x faster on large memory sets (>1000 items)
- Embedding cache with 1-hour TTL for frequent queries

**Memory Management:**
- Budget: 5000 items maximum
- TTL: 24 hours for tool results
- LRU: Evicts least recently accessed when over budget
- Version tracking for embedding model migrations

**Rationale:**
Browser storage limits (typically 50MB-1GB) require aggressive memory management. HNSW provides production-grade search performance while the multi-tier eviction strategy ensures the most valuable memories are retained.

### Performance Optimization

**Code Splitting:**
- Manual chunks for vendor libraries (React, UI components, ML libraries)
- Lazy loading of workers
- Route-based splitting (though currently single-page)

**Caching Strategy:**
- Service Worker with Cache API for offline functionality
- Network-first for API calls, cache-first for static assets
- Model files cached up to 100MB with 60-day expiration
- Cache purge on quota exceeded

**Progressive Web App:**
- Installable on desktop and mobile
- Offline-first with service worker
- Background sync for pending operations
- Push notifications for model updates

### Security Measures

**Input Validation:**
- DOMPurify for HTML sanitization
- URL validation to block javascript: and data: schemes
- File upload size limits (10MB max)
- Rate limiting (10 messages per minute)

**Tool Execution:**
- Strict whitelist - only pre-approved tools can execute
- Argument validation before execution
- No eval() - uses mathjs for calculations
- Sandboxed worker execution

**Zod Runtime Validation:**
- All worker payloads validated at runtime
- Type-safe message passing between workers
- Prevents corrupted data from crashing workers

### Observability Features

**Cognitive Flow Visualization:**
Real-time display of AI thinking process:
- Query analysis
- Tool search
- Memory scan
- LLM reasoning
- Final synthesis

**Provenance Tracking:**
Every response shows its sources:
- Tools used
- Memory items consulted
- Agents involved
- Confidence levels

**Control Panel:**
- Performance profiles (micro/lite/full)
- Memory operations (export/import/purge)
- Audit log of all actions
- Real-time metrics

## External Dependencies

### AI and Machine Learning
- **@mlc-ai/web-llm** (v0.2.79) - WebGPU-accelerated LLM inference in browser
  - Runs Phi-3, Mistral, Gemma models locally
  - No server required, complete privacy
  
- **@xenova/transformers** (v2.17.2) - Transformers.js for embeddings
  - Generates semantic embeddings for memory search
  - Runs MiniLM model for text similarity

### Core Frontend
- **React** (v18) - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - Radix UI component collection

### Utilities
- **DOMPurify** - XSS protection and HTML sanitization
- **mathjs** - Safe mathematical expression evaluation
- **hnswlib-wasm** - Fast approximate nearest neighbor search
- **date-fns** - Date manipulation

### Storage
- **IndexedDB** (browser native) - Persistent storage for conversations and memory
- **Cache API** (browser native) - Service worker caching

### Testing
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **@testing-library/react** - Component testing utilities

### Development
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript ESLint** - TypeScript-specific linting rules

### PWA
- **vite-plugin-pwa** - Progressive Web App generation
- **workbox** - Service worker utilities

### Performance
- **rollup-plugin-visualizer** - Bundle analysis

**Note on Database:**
The application currently uses IndexedDB (browser-native) for all persistence. While the codebase mentions Drizzle ORM in some documentation, it is not actively used. If PostgreSQL support is needed in the future, Drizzle can be added as it's already referenced in the architecture.

**Deployment:**
The application is designed to be deployed as a static site (Netlify, Vercel, GitHub Pages) since all computation happens client-side. No backend server is required.