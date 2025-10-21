/**
 * useMemoryHandlers Hook
 * Gestion centralisée des opérations de mémoire et cache
 */
import { toast } from "@/hooks/use-toast";

interface MemoryHandlersProps {
  purgeMemory: () => void;
  exportMemory: () => void;
  importMemory: (data: Record<string, unknown>) => void;
  exportCache: () => string;
  importCache: (content: string) => void;
  resetStats: () => void;
}

export const useMemoryHandlers = ({
  purgeMemory,
  exportMemory,
  importMemory,
  exportCache,
  importCache,
  resetStats,
}: MemoryHandlersProps) => {
  
  const handlePurgeMemory = () => {
    purgeMemory();
    resetStats();
  };

  const handleExportMemory = () => {
    exportMemory();
  };

  const handleImportMemory = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        importMemory(data);
      } catch (error) {
        console.error('[UI] Erreur lors de l\'import:', error);
        toast({
          title: "Erreur d'import",
          description: "Le fichier n'est pas valide",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExportCache = () => {
    try {
      const cacheData = exportCache();
      const dataBlob = new Blob([cacheData], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orion-cache-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[UI] Erreur lors de l\'export du cache:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le cache",
        variant: "destructive",
      });
    }
  };

  const handleImportCache = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importCache(content);
        toast({
          title: "Import réussi",
          description: "Le cache a été importé avec succès",
        });
      } catch (error) {
        console.error('[UI] Erreur lors de l\'import du cache:', error);
        toast({
          title: "Erreur d'import",
          description: "Le fichier n'est pas valide",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return {
    handlePurgeMemory,
    handleExportMemory,
    handleImportMemory,
    handleExportCache,
    handleImportCache,
  };
};
