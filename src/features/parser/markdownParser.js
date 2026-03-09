/**
 * Markdown parser: splits markdown text into scenes
 * Splitting rules (priority order):
 * 1. <!-- scene --> custom tag
 * 2. --- horizontal rule
 * 3. # / ## / ### headings
 */

// Generate a unique id for scenes
let sceneCounter = 0
const genId = () => `scene_${Date.now()}_${sceneCounter++}`

/**
 * Parse raw markdown into an array of scenes.
 * Each scene has:
 *   id, title, content, level (heading level or 0 for ---)
 */
export function parseMarkdown(rawText) {
  sceneCounter = 0
  // Normalize line endings (CRLF → LF, CR → LF)
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const scenes = []
  let currentTitle = 'はじめに'
  let currentLevel = 0
  let currentLines = []

  const pushScene = () => {
    const content = currentLines.join('\n').trim()
    if (content || currentTitle !== 'はじめに' || scenes.length === 0) {
      scenes.push({
        id: genId(),
        title: currentTitle,
        level: currentLevel,
        content,
        // These will be filled in by LLM analysis
        characters: [],
        location: '',
        timeOfDay: '',
        tone: '',
        keywords: [],
        imagePrompt: '',
        imagePromptJa: '',
        imageMode: 'ai', // 'ai' | 'upload' | 'none'
        image: null,
        imageHistory: [],
        analyzed: false,
        generating: false,
        pageBreakBefore: false, // true = start a new reader page at this scene
      })
    }
    currentLines = []
  }

  for (const line of lines) {
    // Custom scene tag
    if (line.trim() === '<!-- scene -->') {
      pushScene()
      currentTitle = `シーン ${scenes.length + 1}`
      currentLevel = 0
      continue
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line.trim()) || /^\*\*\*+\s*$/.test(line.trim()) || /^___+\s*$/.test(line.trim())) {
      pushScene()
      currentTitle = `シーン ${scenes.length + 1}`
      currentLevel = 0
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      pushScene()
      currentLevel = headingMatch[1].length
      currentTitle = headingMatch[2].trim()
      continue
    }

    currentLines.push(line)
  }

  // Push the last scene
  pushScene()

  // Filter out empty scenes
  return scenes.filter((s) => s.content.trim().length > 0 || scenes.length === 1)
}

/**
 * Merge adjacent scenes by their indices
 */
export function mergeScenes(scenes, indices) {
  if (indices.length < 2) return scenes
  const sorted = [...indices].sort((a, b) => a - b)
  const merged = {
    ...scenes[sorted[0]],
    id: genId(),
    title: scenes[sorted[0]].title,
    content: sorted.map((i) => scenes[i].content).join('\n\n'),
    analyzed: false,
    imagePrompt: '',
    image: null,
  }
  const result = scenes.filter((_, i) => !sorted.includes(i))
  result.splice(sorted[0], 0, merged)
  return result
}

/**
 * Split a scene at a given character offset in its content
 */
export function splitScene(scenes, sceneId, splitOffset) {
  const idx = scenes.findIndex((s) => s.id === sceneId)
  if (idx === -1) return scenes
  const scene = scenes[idx]
  const before = scene.content.slice(0, splitOffset).trim()
  const after = scene.content.slice(splitOffset).trim()
  const scene1 = { ...scene, id: genId(), content: before }
  const scene2 = {
    ...scene,
    id: genId(),
    title: `${scene.title}（続き）`,
    content: after,
    analyzed: false,
    imagePrompt: '',
    image: null,
  }
  const result = [...scenes]
  result.splice(idx, 1, scene1, scene2)
  return result
}

/**
 * Detect title from the beginning of markdown (first heading or first line)
 */
export function detectTitle(rawText) {
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)/)
    if (m) return m[1].trim()
    if (line.trim()) return line.trim().slice(0, 50)
  }
  return 'Untitled Novel'
}
