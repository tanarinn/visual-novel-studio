import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/useProjectStore'
import { useSettingsStore } from '../store/useSettingsStore'

// ── Inline markdown renderer ──────────────────────────────────────────────────
// Supports **bold**, *italic*, ~~strikethrough~~, `code`
function renderInline(text) {
  if (!text) return []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`/g
  const result = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) result.push(text.slice(lastIndex, match.index))
    if (match[1] !== undefined) result.push(<strong key={match.index}>{match[1]}</strong>)
    else if (match[2] !== undefined) result.push(<em key={match.index}>{match[2]}</em>)
    else if (match[3] !== undefined) result.push(<s key={match.index}>{match[3]}</s>)
    else if (match[4] !== undefined) result.push(<code key={match.index} style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.07)', padding: '0 4px', borderRadius: '3px', fontSize: '0.9em' }}>{match[4]}</code>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) result.push(text.slice(lastIndex))
  return result
}

// Compute page groups from scenes based on pageBreakBefore field.
// If no scene has pageBreakBefore, returns one scene per page (default).
function buildPageGroups(scenes) {
  const hasBreaks = scenes.some(s => s.pageBreakBefore)
  if (!hasBreaks) return scenes.map(s => [s])
  const groups = []
  let current = []
  scenes.forEach(scene => {
    if (scene.pageBreakBefore && current.length > 0) {
      groups.push(current)
      current = [scene]
    } else {
      current.push(scene)
    }
  })
  if (current.length > 0) groups.push(current)
  return groups
}

function SceneSection({ scene, readerSettings, isActive }) {
  if (!scene) return null

  const { fontSize, lineHeight, letterSpacing, fontFamily, colorTheme, textWidth, imagePlacement = 'above', noIndent } = readerSettings

  const theme = {
    light: { bg: '#ffffff', text: '#1a1a2e', metaColor: '#9ca3af', panelBg: '#f8f9fa' },
    dark: { bg: '#1a1a2e', text: '#e8e8f0', metaColor: '#6b7280', panelBg: '#2d2d44' },
    sepia: { bg: '#f4ede4', text: '#3d2b1f', metaColor: '#8b7355', panelBg: '#ede0d4' },
  }[colorTheme] || { bg: '#ffffff', text: '#1a1a2e', metaColor: '#9ca3af', panelBg: '#f8f9fa' }

  const fontStack = fontFamily === 'serif'
    ? '"游明朝", "YuMincho", "Hiragino Mincho ProN", Georgia, serif'
    : '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif'

  const content = scene.content ?? ''

  const paraStyle = {
    fontFamily: fontStack,
    fontSize: `${fontSize}px`,
    lineHeight,
    letterSpacing: `${letterSpacing}em`,
    color: theme.text,
    margin: '0 0 1.2em',
    textIndent: noIndent ? 0 : '1em',
  }

  // Render paragraph blocks, supporting markdown and single-line breaks
  const renderBody = () => {
    const blocks = content.split(/\n{2,}/).filter(Boolean).map(b => b.trimEnd())
    return blocks.map((block, i) => {
      const lines = block.split('\n').map(l => l.replace(/\s+$/, ''))
      const nonEmpty = lines.filter(l => l.trim())

      // Blockquote: all non-empty lines start with >
      if (nonEmpty.length > 0 && nonEmpty.every(l => l.startsWith('>'))) {
        return (
          <blockquote key={i} style={{
            borderLeft: `3px solid ${theme.metaColor}`,
            paddingLeft: '1em',
            margin: '0 0 1.2em 0',
            color: theme.text,
            opacity: 0.85,
          }}>
            {nonEmpty.map((l, j) => {
              const text = l.replace(/^>\s?/, '')
              return (
                <p key={j} style={{ ...paraStyle, fontStyle: 'italic', margin: j > 0 ? '0.4em 0 0' : 0, textIndent: 0 }}>
                  {renderInline(text)}
                </p>
              )
            })}
          </blockquote>
        )
      }

      // Regular paragraph: preserve single-line breaks with <br>
      const elements = []
      let first = true
      lines.forEach((line, j) => {
        if (!line.trim()) return
        if (!first) elements.push(<br key={`br-${i}-${j}`} />)
        first = false
        elements.push(<span key={`line-${i}-${j}`}>{renderInline(line)}</span>)
      })

      return <p key={i} style={paraStyle}>{elements}</p>
    })
  }

  const isSide = scene.image && (imagePlacement === 'left' || imagePlacement === 'right')

  // Shared image element
  const imageEl = scene.image ? (
    <img
      src={scene.image}
      alt={scene.title}
      style={{
        maxWidth: '100%',
        width: '100%',
        height: 'auto',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        display: 'block',
      }}
      loading="lazy"
    />
  ) : null

  // Text block (title + meta + body)
  const textEl = (
    <div style={{ maxWidth: isSide ? 'none' : `${textWidth}px`, margin: isSide ? 0 : '0 auto' }}>
      {scene.title && (
        <h2 style={{
          fontSize: `${fontSize * 1.3}px`,
          fontFamily: fontStack,
          color: theme.text,
          borderBottom: `2px solid ${theme.metaColor}33`,
          paddingBottom: '8px',
          marginTop: 0,
          marginBottom: '8px',
        }}>
          {scene.title}
        </h2>
      )}
      {(scene.location || scene.timeOfDay) && (
        <p style={{ fontSize: '0.85em', color: theme.metaColor, marginBottom: '24px', fontFamily: fontStack }}>
          {[scene.location, scene.timeOfDay].filter(Boolean).join(' · ')}
        </p>
      )}
      <div>{renderBody()}</div>
    </div>
  )

  return (
    <section
      style={{
        marginBottom: '80px',
        opacity: isActive ? 1 : 0.4,
        transition: 'opacity 0.5s ease',
      }}
    >
      {isSide ? (
        /* ── Side-by-side layout (left / right) ── */
        <div style={{
          display: 'flex',
          flexDirection: imagePlacement === 'left' ? 'row' : 'row-reverse',
          gap: '40px',
          alignItems: 'flex-start',
        }}>
          {/* Image column – sticky so it stays visible while reading */}
          <div style={{
            flexShrink: 0,
            width: '38%',
            position: 'sticky',
            top: '80px',
            alignSelf: 'flex-start',
          }}>
            {imageEl}
          </div>
          {/* Text column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {textEl}
          </div>
        </div>
      ) : (
        /* ── Above layout (default) ── */
        <>
          {scene.image && (
            <div style={{ textAlign: 'center', marginBottom: '36px', maxHeight: '600px', overflow: 'hidden' }}>
              <img
                src={scene.image}
                alt={scene.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '600px',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
                loading="lazy"
              />
            </div>
          )}
          {textEl}
        </>
      )}
    </section>
  )
}

export default function Reader() {
  const navigate = useNavigate()
  const { project } = useProjectStore()
  const { readerSettings, setReaderSettings } = useSettingsStore()

  const [currentSceneIdx, setCurrentSceneIdx] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [displayMode, setDisplayMode] = useState(readerSettings.displayMode || 'scroll')
  const contentRef = useRef(null)
  const sectionRefs = useRef([])

  const { fontSize, lineHeight, letterSpacing, fontFamily, colorTheme, textWidth } = readerSettings

  const themes = {
    light: { bg: '#f8f9fa', headerBg: '#ffffff', headerBorder: '#e5e7eb', text: '#1a1a2e', panelBg: '#ffffff' },
    dark: { bg: '#111827', headerBg: '#1a1a2e', headerBorder: '#374151', text: '#e8e8f0', panelBg: '#1f2937' },
    sepia: { bg: '#f0e8d8', headerBg: '#f4ede4', headerBorder: '#d4b99a', text: '#3d2b1f', panelBg: '#f4ede4' },
  }
  const theme = themes[colorTheme] || themes.light

  // Track scroll position for progress and active scene
  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return

    const scrolled = window.scrollY
    const total = document.documentElement.scrollHeight - window.innerHeight
    setScrollProgress(total > 0 ? (scrolled / total) * 100 : 0)

    // Find current scene based on scroll position
    if (displayMode === 'scroll') {
      sectionRefs.current.forEach((ref, idx) => {
        if (ref) {
          const rect = ref.getBoundingClientRect()
          if (rect.top <= 200 && rect.bottom > 200) {
            setCurrentSceneIdx(idx)
          }
        }
      })
    }
  }, [displayMode])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Save progress to localStorage
  useEffect(() => {
    if (project.id) {
      localStorage.setItem(`reader_progress_${project.id}`, JSON.stringify({ sceneIdx: currentSceneIdx }))
    }
  }, [currentSceneIdx, project.id])

  // Restore progress
  useEffect(() => {
    if (project.id) {
      const saved = localStorage.getItem(`reader_progress_${project.id}`)
      if (saved) {
        try {
          const { sceneIdx } = JSON.parse(saved)
          const scenesLen = Array.isArray(project.scenes) ? project.scenes.length : 0
          if (scenesLen > 0) {
            setCurrentSceneIdx(Math.max(0, Math.min(sceneIdx, scenesLen - 1)))
          }
        } catch {
          // ignore malformed progress data
        }
      }
    }
  }, [project.id, project.scenes?.length])

  const jumpToScene = (idx) => {
    if (displayMode === 'scroll') {
      sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      setCurrentSceneIdx(idx)
    }
    setShowToc(false)
  }

  const scenes = Array.isArray(project.scenes) ? project.scenes : []

  if (!project.id || scenes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#6b7280' }}>
        <p>{!project.id ? 'プロジェクトが読み込まれていません。' : 'シーンがありません。シーン編集画面でシーンを追加してください。'}</p>
        <button onClick={() => navigate(!project.id ? '/' : '/scenes')} style={{ marginTop: '16px', padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {!project.id ? 'ホームへ戻る' : 'シーン編集へ'}
        </button>
      </div>
    )
  }

  // Page-flip mode
  if (displayMode === 'page') {
    const pageGroups = buildPageGroups(scenes)
    const totalPages = pageGroups.length
    const safePageIdx = Math.max(0, Math.min(currentSceneIdx, totalPages - 1))
    const currentPageScenes = pageGroups[safePageIdx] || []
    // For TOC highlight: use the first scene index of current page
    const firstSceneOfPage = scenes.indexOf(currentPageScenes[0])

    return (
      <div style={{ background: theme.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <ReaderHeader
          project={project}
          currentSceneIdx={safePageIdx}
          total={totalPages}
          scrollProgress={scrollProgress}
          displayMode={displayMode}
          theme={theme}
          onShowToc={() => setShowToc(true)}
          onShowSettings={() => setShowSettings(!showSettings)}
        />

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px 120px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {currentPageScenes.map(scene => (
              <SceneSection
                key={scene.id}
                scene={scene}
                readerSettings={readerSettings}
                isActive={true}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '12px', alignItems: 'center',
          background: theme.panelBg, padding: '12px 20px', borderRadius: '999px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={() => setCurrentSceneIdx(Math.max(0, safePageIdx - 1))}
            disabled={safePageIdx === 0}
            style={navBtnStyle(safePageIdx === 0)}
          >
            ← 前へ
          </button>
          <span style={{ fontSize: '0.85em', color: theme.text }}>
            {safePageIdx + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentSceneIdx(Math.min(totalPages - 1, safePageIdx + 1))}
            disabled={safePageIdx === totalPages - 1}
            style={navBtnStyle(safePageIdx === totalPages - 1)}
          >
            次へ →
          </button>
        </div>

        {/* TOC & Settings */}
        {showToc && <TocPanel scenes={scenes} onJump={jumpToScene} onClose={() => setShowToc(false)} theme={theme} currentIdx={firstSceneOfPage} />}
        {showSettings && <SettingsPanel readerSettings={readerSettings} setReaderSettings={setReaderSettings} displayMode={displayMode} setDisplayMode={setDisplayMode} theme={theme} onClose={() => setShowSettings(false)} />}
      </div>
    )
  }

  // Scroll mode (default)
  return (
    <div style={{ background: theme.bg, minHeight: '100vh' }}>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, height: '3px', width: `${scrollProgress}%`, background: '#6366f1', zIndex: 1000, transition: 'width 0.1s' }} />

      {/* Header */}
      <ReaderHeader
        project={project}
        currentSceneIdx={currentSceneIdx}
        total={scenes.length}
        scrollProgress={scrollProgress}
        displayMode={displayMode}
        theme={theme}
        onShowToc={() => setShowToc(true)}
        onShowSettings={() => setShowSettings(!showSettings)}
      />

      {/* Content */}
      <div ref={contentRef} style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px 120px' }}>
        {scenes.map((scene, idx) => (
          <div
            key={scene.id}
            ref={(el) => (sectionRefs.current[idx] = el)}
          >
            <SceneSection
              scene={scene}
              readerSettings={readerSettings}
              isActive={idx === currentSceneIdx}
            />
          </div>
        ))}
      </div>

      {/* TOC & Settings */}
      {showToc && <TocPanel scenes={scenes} onJump={jumpToScene} onClose={() => setShowToc(false)} theme={theme} currentIdx={currentSceneIdx} />}
      {showSettings && <SettingsPanel readerSettings={readerSettings} setReaderSettings={setReaderSettings} displayMode={displayMode} setDisplayMode={setDisplayMode} theme={theme} onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function ReaderHeader({ project, currentSceneIdx, total, scrollProgress, displayMode, theme, onShowToc, onShowSettings }) {
  const navigate = useNavigate()
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}`,
      padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/scenes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.2em' }}>←</button>
        <span style={{ fontSize: '0.9em', fontWeight: '600', color: theme.text }}>{project.title}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8em', color: '#9ca3af' }}>{currentSceneIdx + 1}/{total}</span>
        <button onClick={onShowToc} style={iconBtnStyle}>📋 目次</button>
        <button onClick={onShowSettings} style={iconBtnStyle}>⚙️</button>
        <button onClick={() => navigate('/export')} style={iconBtnStyle}>💾 エクスポート</button>
      </div>
    </header>
  )
}

const iconBtnStyle = {
  background: 'none', border: '1px solid #e5e7eb',
  borderRadius: '6px', padding: '6px 10px',
  cursor: 'pointer', fontSize: '0.8em', color: '#374151',
}

function navBtnStyle(disabled) {
  return {
    padding: '8px 16px', background: disabled ? '#f3f4f6' : '#6366f1',
    color: disabled ? '#9ca3af' : '#fff', border: 'none',
    borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.9em',
  }
}

function TocPanel({ scenes, onJump, onClose, theme, currentIdx }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <nav style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '280px',
        background: theme.panelBg, zIndex: 201, overflowY: 'auto',
        padding: '24px', boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1em', fontWeight: '700', color: theme.text }}>目次</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#9ca3af' }}>✕</button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {scenes.map((scene, idx) => (
            <li key={scene.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <button
                onClick={() => onJump(idx)}
                style={{
                  display: 'block', width: '100%', padding: '10px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontSize: '0.9em',
                  color: idx === currentIdx ? '#6366f1' : theme.text,
                  fontWeight: idx === currentIdx ? '700' : '400',
                }}
              >
                <span style={{ marginRight: '8px', opacity: 0.5 }}>{idx + 1}.</span>
                {scene.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

function SettingsPanel({ readerSettings, setReaderSettings, displayMode, setDisplayMode, theme, onClose }) {
  const set = (key, value) => setReaderSettings({ [key]: value })

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: '56px', right: '16px',
        background: theme.panelBg, borderRadius: '12px', padding: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 201, width: '280px',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.95em', fontWeight: '700', color: theme.text }}>表示設定</h3>

        <Setting label="表示モード">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{ v: 'scroll', l: 'スクロール' }, { v: 'page', l: 'ページめくり' }].map(({ v, l }) => (
              <button key={v} onClick={() => setDisplayMode(v)}
                style={{ flex: 1, padding: '5px', border: `2px solid ${displayMode === v ? '#6366f1' : '#e5e7eb'}`, borderRadius: '6px', background: displayMode === v ? '#eef2ff' : theme.panelBg, color: displayMode === v ? '#4338ca' : theme.text, cursor: 'pointer', fontSize: '0.8em' }}>
                {l}
              </button>
            ))}
          </div>
        </Setting>

        <Setting label={`フォントサイズ: ${readerSettings.fontSize}px`}>
          <input type="range" min={12} max={28} value={readerSettings.fontSize}
            onChange={(e) => set('fontSize', Number(e.target.value))}
            style={{ width: '100%' }} />
        </Setting>

        <Setting label={`行間: ${readerSettings.lineHeight}`}>
          <input type="range" min={1.4} max={2.5} step={0.1} value={readerSettings.lineHeight}
            onChange={(e) => set('lineHeight', Number(e.target.value))}
            style={{ width: '100%' }} />
        </Setting>

        <Setting label="フォント">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{ v: 'serif', l: '明朝体' }, { v: 'sans', l: 'ゴシック' }].map(({ v, l }) => (
              <button key={v} onClick={() => set('fontFamily', v)}
                style={{ flex: 1, padding: '5px', border: `2px solid ${readerSettings.fontFamily === v ? '#6366f1' : '#e5e7eb'}`, borderRadius: '6px', background: readerSettings.fontFamily === v ? '#eef2ff' : theme.panelBg, color: readerSettings.fontFamily === v ? '#4338ca' : theme.text, cursor: 'pointer', fontSize: '0.8em' }}>
                {l}
              </button>
            ))}
          </div>
        </Setting>

        <Setting label="カラーテーマ">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{ v: 'light', l: 'ライト' }, { v: 'dark', l: 'ダーク' }, { v: 'sepia', l: 'セピア' }].map(({ v, l }) => (
              <button key={v} onClick={() => set('colorTheme', v)}
                style={{ flex: 1, padding: '5px', border: `2px solid ${readerSettings.colorTheme === v ? '#6366f1' : '#e5e7eb'}`, borderRadius: '6px', background: readerSettings.colorTheme === v ? '#eef2ff' : theme.panelBg, color: readerSettings.colorTheme === v ? '#4338ca' : theme.text, cursor: 'pointer', fontSize: '0.75em' }}>
                {l}
              </button>
            ))}
          </div>
        </Setting>

        <Setting label="挿絵の表示位置">
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { v: 'above', l: '上', icon: '⬆️' },
              { v: 'left',  l: '左', icon: '⬅️' },
              { v: 'right', l: '右', icon: '➡️' },
            ].map(({ v, l, icon }) => (
              <button key={v} onClick={() => set('imagePlacement', v)}
                style={{
                  flex: 1, padding: '5px 4px',
                  border: `2px solid ${(readerSettings.imagePlacement ?? 'above') === v ? '#6366f1' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  background: (readerSettings.imagePlacement ?? 'above') === v ? '#eef2ff' : theme.panelBg,
                  color: (readerSettings.imagePlacement ?? 'above') === v ? '#4338ca' : theme.text,
                  cursor: 'pointer', fontSize: '0.75em', textAlign: 'center',
                }}>
                {icon} {l}
              </button>
            ))}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.72em', color: '#9ca3af' }}>
            左・右: 挿絵とテキストを横並びに配置（PC向け）
          </p>
        </Setting>

        <Setting label="字下げ">
          <button
            onClick={() => set('noIndent', !(readerSettings.noIndent ?? false))}
            style={{
              width: '100%', padding: '6px',
              border: `2px solid ${(readerSettings.noIndent) ? '#6366f1' : '#e5e7eb'}`,
              borderRadius: '6px',
              background: (readerSettings.noIndent) ? '#eef2ff' : theme.panelBg,
              color: (readerSettings.noIndent) ? '#4338ca' : theme.text,
              cursor: 'pointer', fontSize: '0.8em',
            }}
          >
            {readerSettings.noIndent ? '字下げなし（原稿フォーマット）' : '字下げあり（標準）'}
          </button>
        </Setting>
      </div>
    </>
  )
}

function Setting({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '0.78em', color: '#6b7280', marginBottom: '6px' }}>{label}</div>
      {children}
    </div>
  )
}
