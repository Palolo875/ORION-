/**
 * English translations for ORION
 */

import type { Translations } from './fr';

export const en: Translations = {
  common: {
    app_name: 'ORION',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    settings: 'Settings',
  },

  browser: {
    compatibility_banner_title: 'Browser Compatibility',
    webgpu_not_supported: 'WebGPU not supported',
    webgpu_supported: 'WebGPU available',
    webgl_fallback: 'WebGL fallback mode active',
    update_browser: 'Please update your browser',
    recommended_browsers: 'Recommended browsers',
  },

  chat: {
    placeholder: 'Type your message...',
    send: 'Send',
    new_conversation: 'New conversation',
    clear_history: 'Clear history',
    thinking: 'Thinking...',
    generating: 'Generating...',
    error_occurred: 'An error occurred',
    retry: 'Retry',
  },

  agents: {
    conversation: 'Conversation Agent',
    code: 'Code Agent',
    vision: 'Vision Agent',
    logical: 'Logical Agent',
    speech: 'Speech-to-Text Agent',
    creative: 'Creative Agent',
    multilingual: 'Multilingual Agent',
    selecting: 'Selecting agent...',
  },

  models: {
    loading: 'Loading model...',
    loaded: 'Model loaded',
    failed: 'Loading failed',
    downloading: 'Downloading',
    size: 'Size',
    parameters: 'Parameters',
    quantization: 'Quantization',
  },

  errors: {
    generic: 'An unexpected error occurred',
    network: 'Network error',
    model_load_failed: 'Model loading failed',
    unsupported_browser: 'Unsupported browser',
    webgpu_required: 'WebGPU required for this feature',
    permission_denied: 'Permission denied',
  },

  performance: {
    memory_usage: 'Memory usage',
    processing_time: 'Processing time',
    tokens_per_second: 'Tokens per second',
    confidence: 'Confidence',
  },

  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    dark_mode: 'Dark mode',
    light_mode: 'Light mode',
    auto_mode: 'Auto',
    advanced: 'Advanced',
    reset: 'Reset',
    export_data: 'Export data',
    import_data: 'Import data',
  },
};
