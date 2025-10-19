import { useRef, useEffect } from "react";

/**
 * Custom hook to manage the migration worker for embedding migrations
 */
export function useMigrationWorker() {
  const migrationWorker = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize the migration worker
    migrationWorker.current = new Worker(
      new URL('../../../workers/migration.worker.ts', import.meta.url),
      { type: 'module' }
    );

    migrationWorker.current.onmessage = (event: MessageEvent) => {
      const { type } = event.data;
      if (type === 'init_complete') {
        console.log('[UI] Migration Worker initialisé.');
      } else if (type === 'migration_complete') {
        console.log('[UI] Cycle de migration terminé.');
      }
    };

    migrationWorker.current.onerror = (error) => {
      console.error('[UI] Erreur du Migration Worker:', error);
    };

    console.log('[UI] Migration Worker lancé en arrière-plan.');

    // Cleanup on unmount
    return () => {
      migrationWorker.current?.terminate();
      console.log('[UI] Migration Worker terminé.');
    };
  }, []);

  return {};
}
