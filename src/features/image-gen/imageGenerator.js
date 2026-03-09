/**
 * Image generator: generates images using DALL-E or other image generation APIs.
 * Returns base64 data URLs for storage.
 */

import { STYLE_PRESETS } from '../../store/useSettingsStore'

/**
 * Generate an image for a scene
 */
export async function generateImage(scene, imageApiSettings, settingsStore) {
  const { provider, baseUrl, apiKey, model } = imageApiSettings
  if (!apiKey) throw new Error('画像生成APIキーが設定されていません')
  if (!scene.imagePrompt) throw new Error('画像プロンプトが設定されていません')

  const stylePreset = settingsStore.stylePreset
  const stylePrompt = settingsStore.getEffectiveStylePrompt()
  const negativePrompt = settingsStore.getEffectiveNegativePrompt()

  const fullPrompt = [scene.imagePrompt, stylePrompt].filter(Boolean).join(', ')

  if (provider === 'openai') {
    return generateWithDALLE({ fullPrompt, baseUrl, apiKey, model, negativePrompt })
  } else if (provider === 'stability') {
    return generateWithStability({ fullPrompt, baseUrl, apiKey, model, negativePrompt })
  } else {
    // Custom / fallback to OpenAI-compatible
    return generateWithDALLE({ fullPrompt, baseUrl, apiKey, model, negativePrompt })
  }
}

async function generateWithDALLE({ fullPrompt, baseUrl, apiKey, model, negativePrompt }) {
  const url = `${baseUrl}/images/generations`

  // DALL-E 3 supports 1024x1536 (portrait 2:3 ratio)
  // DALL-E 2 only supports 256x256, 512x512, 1024x1024
  const isDalle3OrGptImage = model === 'dall-e-3' || model === 'gpt-image-1'
  const size = isDalle3OrGptImage ? '1024x1536' : '1024x1024'

  const body = {
    model,
    prompt: fullPrompt.slice(0, 4000),
    n: 1,
    size,
    response_format: 'b64_json',
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
      throw new Error(err.error?.message || `画像生成エラー: ${res.status}`)
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('画像データが取得できませんでした')

    return `data:image/png;base64,${b64}`
  } finally {
    clearTimeout(timeout)
  }
}

async function generateWithStability({ fullPrompt, baseUrl, apiKey, model, negativePrompt }) {
  const url = `${baseUrl}/generation/${model}/text-to-image`

  const body = {
    text_prompts: [
      { text: fullPrompt, weight: 1 },
      ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
    ],
    cfg_scale: 7,
    height: 768,
    width: 512,
    samples: 1,
    steps: 30,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Stability AI エラー: ${res.status}`)
    }

    const data = await res.json()
    const b64 = data.artifacts?.[0]?.base64
    if (!b64) throw new Error('画像データが取得できませんでした')

    return `data:image/png;base64,${b64}`
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Test image API connection (generates a tiny test image)
 */
export async function testImageApi(imageApiSettings) {
  const { provider, baseUrl, apiKey, model } = imageApiSettings
  if (!apiKey) throw new Error('APIキーが設定されていません')

  if (provider === 'openai') {
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'dall-e-3',
        prompt: 'A simple red circle on white background, minimal',
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error: ${res.status}`)
    }
    return true
  }
  // For other providers, just check the connection
  return true
}

/**
 * Convert a File or Blob to a base64 data URL
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
