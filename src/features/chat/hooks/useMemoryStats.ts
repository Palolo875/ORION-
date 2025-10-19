import { useState, useEffect } from "react";
import { MemoryStats } from "../types";

/**
 * Custom hook to manage memory statistics
 */
export function useMemoryStats() {
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    totalMemories: 0,
    avgInferenceTime: 0,
    feedbackRatio: { likes: 0, dislikes: 0 },
    totalTokensGenerated: 0,
    tokensPerSecond: 0
  });
  const [inferenceHistory, setInferenceHistory] = useState<number[]>([]);

  // Calculate average inference time when history changes
  useEffect(() => {
    const avgTime = inferenceHistory.length > 0 
      ? Math.round(inferenceHistory.reduce((a, b) => a + b, 0) / inferenceHistory.length)
      : 0;
    
    setMemoryStats(prev => ({
      ...prev,
      avgInferenceTime: avgTime
    }));
  }, [inferenceHistory]);

  const addInferenceTime = (time: number) => {
    setInferenceHistory(prev => [...prev, time].slice(-5));
  };

  const incrementLikes = () => {
    setMemoryStats(prev => ({
      ...prev,
      feedbackRatio: {
        ...prev.feedbackRatio,
        likes: prev.feedbackRatio.likes + 1
      }
    }));
  };

  const incrementDislikes = () => {
    setMemoryStats(prev => ({
      ...prev,
      feedbackRatio: {
        ...prev.feedbackRatio,
        dislikes: prev.feedbackRatio.dislikes + 1
      }
    }));
  };

  const resetStats = () => {
    setMemoryStats({
      totalMemories: 0,
      avgInferenceTime: 0,
      feedbackRatio: { likes: 0, dislikes: 0 },
      totalTokensGenerated: 0,
      tokensPerSecond: 0
    });
    setInferenceHistory([]);
  };

  return {
    memoryStats,
    addInferenceTime,
    incrementLikes,
    incrementDislikes,
    resetStats,
  };
}
