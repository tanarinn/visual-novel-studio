/**
 * Scene analyzer: uses LLM to analyze scene content and generate image prompts.
 * Supports OpenAI-compatible APIs and Anthropic API.
 */

const ANALYSIS_SYSTEM_PROMPT = `You are an assistant that analyzes Japanese novel scenes and extracts visual information for illustration generation.

For each scene, extract:
1. characters: list of character names appearing in the scene
2. location: the setting/location of the scene
3. timeOfDay: time of day and weather (e.g., "朝・晴れ", "夕暮れ・曇り")
4. tone: emotional atmosphere (e.g., "穏やか・希望", "緊張・不安", "悲しい・孤独")
5. keywords: up to 5 visually important elements
6. imagePrompt: an English image generation prompt (detailed, visual, suitable for DALL-E or Stable Diffusion)
7. imagePromptJa: Japanese translation of the image prompt

Respond ONLY with a valid JSON object. Do not include any other text.`

const ANALYSIS_USER_TEMPLATE = (title, content) => `Scene title: ${title}

Scene content:
${content.slice(0, 2000)}

Analyze this scene and respond with JSON in this exact format:
{
  "characters": ["name1", "name2"],
  "location": "location description",
  "timeOfDay": "time and weather",
  "tone": "emotional atmosphere",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "imagePrompt": "detailed English prompt for image generation",
  "imagePromptJa": "日本語プロンプト"
}`

/**
 * Analyze a scene using OpenAI-compatible or Anthropic API
 */
export async function analyzeScene(scene, textApiSettings) {
  const { provider, baseUrl, apiKey, model } = textApiSettings

  if (!apiKey && provider !== 'ollama') throw new Error('APIキーが設定されていません')

  const userContent = ANALYSIS_USER_TEMPLATE(scene.title, scene.content)

  if (provider === 'anthropic') {
    return analyzeWithAnthropic({ userContent, baseUrl, apiKey, model })
  } else {
    return analyzeWithOpenAICompatible({ userContent, baseUrl, apiKey, model, provider })
  }
}

async function analyzeWithOpenAICompatible({ userContent, baseUrl, apiKey, model, provider }) {
  const url = `${baseUrl}/chat/completions`
  const body = {
    model,
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
    // Ollama thinking models (Qwen3 etc.) consume many tokens for reasoning;
    // use a larger budget so the actual JSON response is not cut off.
    max_tokens: provider === 'ollama' ? 8192 : 1000,
  }
  if (provider !== 'ollama') {
    body.response_format = { type: 'json_object' }
  } else {
    // Disable thinking mode for Ollama thinking models (Qwen3 etc.).
    // Thinking is unnecessary for structured JSON tasks and wastes tokens.
    // `think: false` is supported by Ollama v0.7+; safely ignored on older versions.
    body.think = false
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey || 'ollama'}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(err.error?.message || `API Error: ${res.status}`)
  }

  const data = await res.json()
  let content = data.choices?.[0]?.message?.content ?? ''
  // Strip <think>...</think> blocks that thinking models (Qwen3, DeepSeek-R1 etc.) prepend
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  if (!content) throw new Error('APIからの応答が空です')

  return parseAnalysisResult(content)
}

async function analyzeWithAnthropic({ userContent, baseUrl, apiKey, model }) {
  const url = `${baseUrl}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(err.error?.message || `API Error: ${res.status}`)
  }

  const data = await res.json()
  const content = data.content?.[0]?.text
  if (!content) throw new Error('APIからの応答が空です')

  return parseAnalysisResult(content)
}

function parseAnalysisResult(content) {
  // Strategy 1: extract from markdown code block (```json ... ``` or ``` ... ```)
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]) } catch {}
  }

  // Strategy 2: direct parse (model returned raw JSON as instructed)
  try { return JSON.parse(content.trim()) } catch {}

  // Strategy 3: extract outermost { ... } braces (handles preamble/suffix text)
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(content.slice(start, end + 1)) } catch {}
  }

  throw new Error('APIからのJSON解析に失敗しました: ' + content.slice(0, 200))
}

/**
 * Regenerate only the image prompt for a scene
 */
export async function regeneratePrompt(scene, textApiSettings, styleHint = '') {
  const REGEN_PROMPT = `Based on this scene analysis, generate a new, creative image generation prompt in English.
${styleHint ? `Art style preference: ${styleHint}` : ''}

Scene: ${scene.title}
Characters: ${scene.characters?.join(', ') || 'unspecified'}
Location: ${scene.location || 'unspecified'}
Time: ${scene.timeOfDay || 'unspecified'}
Tone: ${scene.tone || 'unspecified'}
Keywords: ${scene.keywords?.join(', ') || 'unspecified'}

Respond with JSON: {"imagePrompt": "...", "imagePromptJa": "..."}`

  const result = await analyzeScene(
    { title: scene.title, content: REGEN_PROMPT },
    textApiSettings
  )
  return { imagePrompt: result.imagePrompt, imagePromptJa: result.imagePromptJa }
}

/**
 * Split scenes using LLM into a target number of scenes.
 * Used when the markdown has few/no headings (e.g. a single long scene).
 *
 * @param {Array}  scenes          - current scenes (content will be concatenated)
 * @param {number} targetCount     - desired number of output scenes
 * @param {'content'|'length'} policy - grouping strategy
 * @param {object} textApiSettings - { provider, baseUrl, apiKey, model }
 * @returns {Array} new scenes in project-scene format
 */
export async function splitScenesWithLLM(scenes, targetCount, policy, textApiSettings) {
  const { provider, baseUrl, apiKey, model } = textApiSettings
  if (!apiKey && provider !== 'ollama') throw new Error('APIキーが設定されていません')

  const fullText = scenes.map((s) => s.content).join('\n\n')
  const policyDesc =
    policy === 'content'
      ? '内容・テーマが近い段落をまとめてシーンにする。物語の流れとして自然な区切りを選ぶ。登場人物の変化、場所・時間の転換、感情の変化などを区切りの目安にする。'
      : '各シーンの文字数がなるべく均等になるよう分割する。段落の途中で切らず、最も近い段落境界で区切る。'

  // Strategy: ask the LLM for split BOUNDARIES (startsWith markers) only.
  // Scene content is reconstructed from the FULL original text — nothing is lost.
  const MAX_CHARS = 40000
  const truncated = fullText.length > MAX_CHARS
  const textToSend = fullText.slice(0, MAX_CHARS)

  const systemPrompt = `あなたは小説のシーン構成を分析するアシスタントです。与えられた小説テキストを指定数のシーンに分割するための境界位置を特定してください。

各シーンについて:
- 日本語のシーンタイトル（15文字以内）
- そのシーン本文の【最初の30文字を原文のまま正確に引用】（改行・句読点も含め原文通りに）

第1シーンの"startsWith"はテキストの冒頭30文字です。
必ずJSONのみで応答してください。マークダウンのコードブロックは使わないでください。`

  const userPrompt = `以下の小説テキストをちょうど${targetCount}個のシーンに分割してください。

分割の方針: ${policyDesc}
${truncated ? `\n⚠️ テキストが長いため先頭${MAX_CHARS}文字のみ表示しています。全ての境界をこの範囲内で選んでください。\n` : ''}
JSONフォーマット:
{"scenes":[{"title":"シーンタイトル","startsWith":"シーン開始の原文30文字"},...]}

テキスト:
${textToSend}`

  let content
  if (provider === 'anthropic') {
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `API Error: ${res.status}`)
    }
    const data = await res.json()
    content = data.content?.[0]?.text
  } else {
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: provider === 'ollama' ? 8192 : 2000,
    }
    // json_object mode for providers that support it (reduces markdown wrapping)
    if (['openai', 'groq'].includes(provider)) body.response_format = { type: 'json_object' }
    // Disable thinking mode for Ollama thinking models
    if (provider === 'ollama') body.think = false

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey || 'ollama'}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `API Error: ${res.status}`)
    }
    const data = await res.json()
    content = data.choices?.[0]?.message?.content ?? ''
    // Strip <think> blocks from thinking models
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  }

  if (!content) throw new Error('APIからの応答が空です')

  const parsed = parseAnalysisResult(content)

  // Robustly extract the scenes array — LLMs sometimes use different key names or return a bare array.
  let rawScenes =
    parsed.scenes ||
    parsed.Scenes ||
    parsed.scene_list ||
    parsed.sceneList ||
    parsed.result ||
    (Array.isArray(parsed) ? parsed : null) ||
    Object.values(parsed).find((v) => Array.isArray(v))

  if (!rawScenes || !Array.isArray(rawScenes) || rawScenes.length === 0) {
    throw new Error('シーン分割の結果が不正です。別のモデルやパラメーターをお試しください。')
  }

  // Normalize each scene entry: support various field name variants LLMs may use.
  const normalizeScene = (s) => ({
    title: s.title || s.name || s.sceneName || s.scene_name || '',
    startsWith: s.startsWith || s.starts_with || s.start || s.beginning || s.opening || s.first || '',
  })

  const sceneDefs = rawScenes.map(normalizeScene)

  // Resolve each scene's start position in the FULL original text.
  // Uses progressively shorter prefixes for fuzzy matching (handles minor LLM quoting differences).
  const splitPositions = sceneDefs.map((s, i) => {
    if (i === 0) return 0 // First scene always starts at the beginning
    const marker = (s.startsWith || '').trim()
    if (!marker) return -1
    for (let len = Math.min(marker.length, 30); len >= 8; len -= 4) {
      const pos = fullText.indexOf(marker.slice(0, len))
      if (pos > 0) return pos
    }
    return -1
  })

  // Build result scenes by slicing the FULL original text — no content is lost.
  let counter = Date.now()
  const result = []
  for (let i = 0; i < sceneDefs.length; i++) {
    const start = splitPositions[i]
    if (start < 0) continue // Skip if boundary couldn't be found

    let end = fullText.length
    for (let j = i + 1; j < splitPositions.length; j++) {
      if (splitPositions[j] > start) { end = splitPositions[j]; break }
    }

    result.push({
      id: `scene_llm_${counter++}_${i}`,
      title: sceneDefs[i].title || `シーン ${result.length + 1}`,
      level: 2,
      content: fullText.slice(start, end).trim(),
      characters: [],
      location: '',
      timeOfDay: '',
      tone: '',
      keywords: [],
      imagePrompt: '',
      imagePromptJa: '',
      imageMode: 'ai',
      image: null,
      imageHistory: [],
      analyzed: false,
      generating: false,
    })
  }

  if (result.length === 0) {
    throw new Error('シーン分割の結果が不正です。別のモデルやパラメーターをお試しください。')
  }

  return result
}

/**
 * Test text API connection
 */
export async function testTextApi(textApiSettings) {
  const { provider, baseUrl, apiKey, model } = textApiSettings
  if (!apiKey && provider !== 'ollama') throw new Error('APIキーが設定されていません')

  if (provider === 'anthropic') {
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error: ${res.status}`)
    }
    return true
  } else {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey || 'ollama'}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error: ${res.status}`)
    }
    return true
  }
}
