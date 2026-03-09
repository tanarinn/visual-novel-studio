import { create } from 'zustand'

// API providers config
export const TEXT_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  },
  ollama: {
    name: 'Ollama（ローカル）',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'gemma2', 'phi3.5', 'qwen2.5', 'deepseek-r1'],
  },
  custom: {
    name: 'OpenAI互換（カスタム）',
    baseUrl: '',
    models: [],
  },
}

export const IMAGE_PROVIDERS = {
  openai: {
    name: 'OpenAI DALL·E',
    baseUrl: 'https://api.openai.com/v1',
    models: ['dall-e-3', 'dall-e-2', 'gpt-image-1'],
  },
  stability: {
    name: 'Stability AI',
    baseUrl: 'https://api.stability.ai/v1',
    models: ['stable-diffusion-xl-1024-v1-0'],
  },
  custom: {
    name: 'カスタム (A1111 / ComfyUI)',
    baseUrl: '',
    models: [],
  },
}

export const STYLE_PRESETS = {
  anime: {
    name: 'アニメ風',
    prompt: 'anime style, high quality, detailed, vibrant colors, 2D illustration',
    negativePrompt: 'realistic, 3D, photographic, blurry, low quality',
  },
  watercolor: {
    name: '水彩イラスト',
    prompt: 'watercolor illustration, soft colors, artistic, painterly, delicate',
    negativePrompt: '3D, photographic, harsh lighting, digital art',
  },
  oil: {
    name: '油絵',
    prompt: 'oil painting, rich colors, textured, classical style, detailed brushwork',
    negativePrompt: 'anime, cartoon, 3D, photographic',
  },
  monochrome: {
    name: 'モノクロ',
    prompt: 'monochrome, black and white, pen drawing, sketch style, ink illustration',
    negativePrompt: 'color, colorful, vibrant',
  },
  custom: {
    name: 'カスタム',
    prompt: '',
    negativePrompt: '',
  },
}

const defaultSettings = {
  textApi: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    customModel: '',
  },
  imageApi: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'dall-e-3',
    customModel: '',
  },
  stylePreset: 'anime',
  customStyle: {
    prompt: '',
    negativePrompt: '',
  },
  readerSettings: {
    fontSize: 18,
    lineHeight: 1.8,
    letterSpacing: 0.05,
    fontFamily: 'serif',
    colorTheme: 'light',
    textWidth: 680,
    displayMode: 'scroll',
    imagePlacement: 'above', // 'above' | 'left' | 'right'
    noIndent: false, // true = no first-line indent (raw format)
  },
}

export const useSettingsStore = create((set, get) => ({
  ...defaultSettings,

  setTextApi: (updates) =>
    set((state) => ({ textApi: { ...state.textApi, ...updates } })),

  setImageApi: (updates) =>
    set((state) => ({ imageApi: { ...state.imageApi, ...updates } })),

  setStylePreset: (preset) => set({ stylePreset: preset }),

  setCustomStyle: (updates) =>
    set((state) => ({ customStyle: { ...state.customStyle, ...updates } })),

  setReaderSettings: (updates) =>
    set((state) => ({ readerSettings: { ...state.readerSettings, ...updates } })),

  getEffectiveStylePrompt: () => {
    const { stylePreset, customStyle } = get()
    if (stylePreset === 'custom') return customStyle.prompt
    return STYLE_PRESETS[stylePreset]?.prompt || ''
  },

  getEffectiveNegativePrompt: () => {
    const { stylePreset, customStyle } = get()
    if (stylePreset === 'custom') return customStyle.negativePrompt
    return STYLE_PRESETS[stylePreset]?.negativePrompt || ''
  },

  // Clear API keys (call on unload if desired)
  clearApiKeys: () =>
    set((state) => ({
      textApi: { ...state.textApi, apiKey: '' },
      imageApi: { ...state.imageApi, apiKey: '' },
    })),
}))
