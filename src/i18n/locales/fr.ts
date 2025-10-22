/**
 * Traductions françaises pour ORION
 */

export const fr = {
  common: {
    app_name: 'ORION',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    search: 'Rechercher',
    settings: 'Paramètres',
  },

  browser: {
    compatibility_banner_title: 'Compatibilité du navigateur',
    webgpu_not_supported: 'WebGPU non supporté',
    webgpu_supported: 'WebGPU disponible',
    webgl_fallback: 'Mode de secours WebGL actif',
    update_browser: 'Veuillez mettre à jour votre navigateur',
    recommended_browsers: 'Navigateurs recommandés',
  },

  chat: {
    placeholder: 'Écrivez votre message...',
    send: 'Envoyer',
    new_conversation: 'Nouvelle conversation',
    clear_history: 'Effacer l\'historique',
    thinking: 'Réflexion en cours...',
    generating: 'Génération en cours...',
    error_occurred: 'Une erreur s\'est produite',
    retry: 'Réessayer',
  },

  agents: {
    conversation: 'Agent Conversation',
    code: 'Agent Code',
    vision: 'Agent Vision',
    logical: 'Agent Logique',
    speech: 'Agent Transcription',
    creative: 'Agent Créatif',
    multilingual: 'Agent Multilingue',
    selecting: 'Sélection de l\'agent...',
  },

  models: {
    loading: 'Chargement du modèle...',
    loaded: 'Modèle chargé',
    failed: 'Échec du chargement',
    downloading: 'Téléchargement en cours',
    size: 'Taille',
    parameters: 'Paramètres',
    quantization: 'Quantification',
  },

  errors: {
    generic: 'Une erreur inattendue s\'est produite',
    network: 'Erreur réseau',
    model_load_failed: 'Échec du chargement du modèle',
    unsupported_browser: 'Navigateur non supporté',
    webgpu_required: 'WebGPU requis pour cette fonctionnalité',
    permission_denied: 'Permission refusée',
  },

  performance: {
    memory_usage: 'Utilisation de la mémoire',
    processing_time: 'Temps de traitement',
    tokens_per_second: 'Tokens par seconde',
    confidence: 'Confiance',
  },

  settings: {
    title: 'Paramètres',
    language: 'Langue',
    theme: 'Thème',
    dark_mode: 'Mode sombre',
    light_mode: 'Mode clair',
    auto_mode: 'Automatique',
    advanced: 'Avancé',
    reset: 'Réinitialiser',
    export_data: 'Exporter les données',
    import_data: 'Importer les données',
  },
} as const;

export type Translations = typeof fr;
