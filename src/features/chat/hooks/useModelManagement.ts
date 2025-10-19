import { useState, useEffect } from "react";
import { MODELS, DEFAULT_MODEL } from "@/config/models";

interface ModelLoadProgress {
  progress: number;
  text: string;
  loaded: number;
  total: number;
}

/**
 * Custom hook to manage model selection and loading state
 */
export function useModelManagement() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState<ModelLoadProgress>({ 
    progress: 0, 
    text: '', 
    loaded: 0, 
    total: 0 
  });

  // Check for cached model on mount
  useEffect(() => {
    const cachedModel = localStorage.getItem('orion_selected_model');
    if (cachedModel) {
      setSelectedModel(cachedModel);
    }
  }, []);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('orion_selected_model', modelId);
    return modelId;
  };

  const updateLoadProgress = (progress: { progress: number; text: string; loaded: number; total: number }) => {
    setIsModelLoading(true);
    setModelLoadProgress(progress);
    
    // If loading is complete, hide loader after delay
    if (progress.progress >= 100) {
      setTimeout(() => {
        setIsModelLoading(false);
      }, 1000);
    }
  };

  const getCurrentModelInfo = () => {
    if (!selectedModel) return null;
    
    for (const [key, model] of Object.entries(MODELS)) {
      if (model.id === selectedModel) {
        return { key, ...model };
      }
    }
    return null;
  };

  return {
    selectedModel,
    isModelLoading,
    modelLoadProgress,
    handleModelSelect,
    updateLoadProgress,
    getCurrentModelInfo,
  };
}
