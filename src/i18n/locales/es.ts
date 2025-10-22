/**
 * Traducciones en español para ORION
 */

import type { Translations } from './fr';

export const es: Translations = {
  common: {
    app_name: 'ORION',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    search: 'Buscar',
    settings: 'Configuración',
  },

  browser: {
    compatibility_banner_title: 'Compatibilidad del navegador',
    webgpu_not_supported: 'WebGPU no compatible',
    webgpu_supported: 'WebGPU disponible',
    webgl_fallback: 'Modo de respaldo WebGL activo',
    update_browser: 'Por favor actualice su navegador',
    recommended_browsers: 'Navegadores recomendados',
  },

  chat: {
    placeholder: 'Escriba su mensaje...',
    send: 'Enviar',
    new_conversation: 'Nueva conversación',
    clear_history: 'Borrar historial',
    thinking: 'Pensando...',
    generating: 'Generando...',
    error_occurred: 'Ocurrió un error',
    retry: 'Reintentar',
  },

  agents: {
    conversation: 'Agente de Conversación',
    code: 'Agente de Código',
    vision: 'Agente de Visión',
    logical: 'Agente Lógico',
    speech: 'Agente de Transcripción',
    creative: 'Agente Creativo',
    multilingual: 'Agente Multilingüe',
    selecting: 'Seleccionando agente...',
  },

  models: {
    loading: 'Cargando modelo...',
    loaded: 'Modelo cargado',
    failed: 'Fallo en la carga',
    downloading: 'Descargando',
    size: 'Tamaño',
    parameters: 'Parámetros',
    quantization: 'Cuantización',
  },

  errors: {
    generic: 'Ocurrió un error inesperado',
    network: 'Error de red',
    model_load_failed: 'Fallo al cargar el modelo',
    unsupported_browser: 'Navegador no compatible',
    webgpu_required: 'WebGPU requerido para esta función',
    permission_denied: 'Permiso denegado',
  },

  performance: {
    memory_usage: 'Uso de memoria',
    processing_time: 'Tiempo de procesamiento',
    tokens_per_second: 'Tokens por segundo',
    confidence: 'Confianza',
  },

  settings: {
    title: 'Configuración',
    language: 'Idioma',
    theme: 'Tema',
    dark_mode: 'Modo oscuro',
    light_mode: 'Modo claro',
    auto_mode: 'Automático',
    advanced: 'Avanzado',
    reset: 'Restablecer',
    export_data: 'Exportar datos',
    import_data: 'Importar datos',
  },
};
