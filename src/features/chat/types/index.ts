// Chat-specific types
import { ProcessedFile } from "@/utils/fileProcessor";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  confidence?: number;
  attachments?: ProcessedFile[];
  provenance?: {
    fromAgents?: string[];
    memoryHits?: string[];
    toolUsed?: string;
  };
  debug?: {
    totalRounds?: number;
    inferenceTimeMs?: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isActive: boolean;
}

export interface MemoryStats {
  totalMemories: number;
  avgInferenceTime: number;
  feedbackRatio: { likes: number; dislikes: number };
  totalTokensGenerated: number;
  tokensPerSecond: number;
}
