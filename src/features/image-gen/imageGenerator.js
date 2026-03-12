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
  if (!apiKey && provider !== 'a1111') throw new Error('画像生成APIキーが設定されていません')
  if (!scene.imagePrompt) throw new Error('画像プロンプトが設定されていません')

  const stylePreset = settingsStore.stylePreset
  const stylePrompt = settingsStore.getEffectiveStylePrompt()
  const negativePrompt = settingsStore.getEffectiveNegativePrompt()

  const fullPrompt = [scene.imagePrompt, stylePrompt].filter(Boolean).join(', ')

  if (provider === 'openai') {
    return generateWithDALLE({ fullPrompt, baseUrl, apiKey, model, negativePrompt })
  } else if (provider === 'gemini') {
    return generateWithGemini({ fullPrompt, baseUrl, apiKey, model })
  } else if (provider === 'stability') {
    return generateWithStability({ fullPrompt, baseUrl, apiKey, model, negativePrompt })
  } else if (provider === 'a1111') {
    return generateWithA1111({ fullPrompt, baseUrl, negativePrompt })
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
  if (!apiKey && provider !== 'a1111') throw new Error('APIキーが設定されていません')

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
  } else if (provider === 'gemini') {
    const actualModel = model || 'imagen-3.0-generate-002'
    const isImagenModel = actualModel.startsWith('imagen-')

    let res
    if (isImagenModel) {
      // Imagen models use the predict endpoint
      res = await fetch(`${baseUrl}/models/${actualModel}:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: 'A simple red circle on white background, minimal' }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' }
        })
      })
    } else {
      // Gemini native image generation models use generateContent with responseModalities
      res = await fetch(`${baseUrl}/models/${actualModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'A simple red circle on white background, minimal' }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        })
      })
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Gemini API エラー: ${res.status}`)
    }
    return true
  } else if (provider === 'a1111') {
    const res = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'test',
        steps: 1,
        width: 128,
        height: 128
      })
    })
    if (!res.ok) {
      throw new Error(`A1111 API エラー: ${res.status} (APIが有効か確認してください)`)
    }
    return true
  }
  // For other providers, just check the connection
  return true
}

async function generateWithGemini({ fullPrompt, baseUrl, apiKey, model }) {
  const isImagenModel = model.startsWith('imagen-')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    let res, data

    if (isImagenModel) {
      // Imagen 3: uses the predict endpoint
      const url = `${baseUrl}/models/${model}:predict?key=${apiKey}`
      const body = {
        instances: [{ prompt: fullPrompt.slice(0, 4000) }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' }
      }
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Gemini API エラー: ${res.status}`)
      }
      data = await res.json()
    } else {
      // Gemini native image models (gemini-3.1-flash-image-preview etc.):
      // uses generateContent with responseModalities TEXT+IMAGE (IMAGE alone is not allowed)
      const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
      const body = {
        contents: [{ parts: [{ text: fullPrompt.slice(0, 4000) }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      }
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Gemini API エラー: ${res.status}`)
      }
      data = await res.json()
    }

    // Handle predict format output
    if (data.predictions?.length > 0) {
      const b64 = data.predictions[0]?.bytesBase64Encoded
      if (b64) {
        const mimeType = data.predictions[0]?.mimeType || 'image/jpeg'
        return `data:${mimeType};base64,${b64}`
      }
    }

    // Handle generateContent format output (e.g. gemini-3.1-flash-image-preview return base64 inline)
    if (data.candidates?.length > 0) {
      const parts = data.candidates[0].content?.parts || []
      const imagePart = parts.find(p => p.inlineData || (p.text && p.text.length > 1000 /* rough heuristic for b64 text */))
      if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      }
    }

    throw new Error('画像データが取得できませんでした (レスポンス形式が不明確です)')
  } finally {
    clearTimeout(timeout)
  }
}

async function generateWithA1111({ fullPrompt, baseUrl, negativePrompt }) {
  const url = `${baseUrl}/sdapi/v1/txt2img`

  const body = {
    prompt: fullPrompt,
    negative_prompt: negativePrompt || '',
    steps: 20,
    width: 512,
    height: 768,
    cfg_scale: 7,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      let errMsg = `A1111 エラー: ${res.status}`
      try { const err = await res.json(); errMsg = err.error || errMsg } catch (e) { }
      throw new Error(errMsg)
    }

    const data = await res.json()
    const b64 = data.images?.[0]
    if (!b64) throw new Error('画像データが取得できませんでした')

    return `data:image/png;base64,${b64}`
  } finally {
    clearTimeout(timeout)
  }
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
