import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/useProjectStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { analyzeScene, regeneratePrompt, splitScenesWithLLM } from '../features/text-gen/sceneAnalyzer'
import { generateImage, fileToDataUrl } from '../features/image-gen/imageGenerator'

function SceneCard({ scene, index, total, onUpdate, onAnalyze, onGenerate, onUpload, onMergeWithPrev, onDelete, analyzing, generating }) {
  const [showText, setShowText] = useState(false)
  const [editingContent, setEditingContent] = useState(false)
  const [contentDraft, setContentDraft] = useState(scene.content)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [promptDraft, setPromptDraft] = useState(scene.imagePrompt)
  const [showJaPrompt, setShowJaPrompt] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(scene.title)
  const fileInputRef = useRef(null)

  const handleTitleSave = () => {
    const trimmed = titleDraft.trim()
    if (trimmed) onUpdate({ title: trimmed })
    else setTitleDraft(scene.title)
    setEditingTitle(false)
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleTitleSave() }
    if (e.key === 'Escape') { setTitleDraft(scene.title); setEditingTitle(false) }
  }

  const handleContentSave = () => {
    onUpdate({ content: contentDraft, analyzed: false })
    setEditingContent(false)
  }

  const handlePromptSave = () => {
    onUpdate({ imagePrompt: promptDraft })
    setEditingPrompt(false)
  }

  const handlePromptReset = () => {
    setPromptDraft(scene.imagePrompt)
    setEditingPrompt(false)
  }

  const handleUpload = async (file) => {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    onUpdate({ image: dataUrl, imageMode: 'upload' })
  }

  const imageModes = [
    { value: 'ai', label: '🤖 AI生成' },
    { value: 'upload', label: '📁 手動アップロード' },
    { value: 'none', label: '❌ なし' },
  ]

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{
          background: '#eef2ff', color: '#4338ca',
          padding: '2px 8px', borderRadius: '4px',
          fontSize: '0.75em', fontWeight: '700', flexShrink: 0,
        }}>
          {index + 1} / {total}
        </span>
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            style={{
              flex: 1, minWidth: 0,
              fontSize: '1em', fontWeight: '700', color: '#1a1a2e',
              border: '1px solid #6366f1', borderRadius: '4px',
              padding: '2px 6px', outline: 'none',
            }}
          />
        ) : (
          <h3
            onClick={() => { setTitleDraft(scene.title); setEditingTitle(true) }}
            title="クリックして編集"
            style={{ margin: 0, fontSize: '1em', fontWeight: '700', color: '#1a1a2e', flex: 1, minWidth: 0, cursor: 'text' }}
          >
            {scene.title}
          </h3>
        )}
        {scene.analyzed && (
          <span style={{ fontSize: '0.75em', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>
            ✅ 解析済
          </span>
        )}
        {/* Page break toggle */}
        {index > 0 && (
          <button
            onClick={() => onUpdate({ pageBreakBefore: !scene.pageBreakBefore })}
            title="このシーンの前でページを分割する（ノベル表示の「前へ」「次へ」で移動）"
            style={{
              background: scene.pageBreakBefore ? '#eef2ff' : 'none',
              border: `1px solid ${scene.pageBreakBefore ? '#6366f1' : '#d1d5db'}`,
              borderRadius: '6px', padding: '3px 8px',
              cursor: 'pointer', fontSize: '0.75em',
              color: scene.pageBreakBefore ? '#4338ca' : '#6b7280',
              flexShrink: 0,
            }}
          >
            {scene.pageBreakBefore ? '📄 ページ区切り ✓' : '📄 ページ区切り'}
          </button>
        )}
        {/* Merge with previous */}
        {index > 0 && (
          <button
            onClick={onMergeWithPrev}
            title="前のシーンと統合（テキストを結合）"
            style={{
              background: 'none', border: '1px solid #d1d5db',
              borderRadius: '6px', padding: '3px 8px',
              cursor: 'pointer', fontSize: '0.75em', color: '#6b7280',
              flexShrink: 0,
            }}
          >
            ↑ 前と統合
          </button>
        )}
        {/* Delete scene */}
        <button
          onClick={onDelete}
          title="このシーンを削除"
          style={{
            background: 'none', border: '1px solid #fecaca',
            borderRadius: '6px', padding: '3px 8px',
            cursor: 'pointer', fontSize: '0.75em', color: '#dc2626',
            flexShrink: 0,
          }}
        >
          🗑️
        </button>
      </div>

      {/* Metadata */}
      {scene.analyzed && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {scene.characters?.length > 0 && (
            <Tag label="👤" value={scene.characters.join('、')} color="#dbeafe" textColor="#1d4ed8" />
          )}
          {scene.location && <Tag label="📍" value={scene.location} color="#dcfce7" textColor="#15803d" />}
          {scene.timeOfDay && <Tag label="🕐" value={scene.timeOfDay} color="#fef9c3" textColor="#854d0e" />}
          {scene.tone && <Tag label="💫" value={scene.tone} color="#f3e8ff" textColor="#7e22ce" />}
        </div>
      )}

      {/* Text preview toggle */}
      <button
        onClick={() => setShowText(!showText)}
        style={{
          background: 'none', border: '1px solid #e5e7eb',
          borderRadius: '6px', padding: '4px 12px',
          fontSize: '0.8em', color: '#6b7280', cursor: 'pointer',
          marginBottom: showText ? '10px' : '12px',
        }}
      >
        {showText ? '▲ 本文を隠す' : '▼ 本文を表示'}
      </button>

      {showText && (
        <div style={{ marginBottom: '12px' }}>
          {editingContent ? (
            <div>
              <textarea
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #6366f1', borderRadius: '8px',
                  fontSize: '0.88em', fontFamily: 'serif', lineHeight: '1.8',
                  resize: 'vertical', outline: 'none', minHeight: '200px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <BtnSmall onClick={handleContentSave} color="#6366f1">保存</BtnSmall>
                <BtnSmall onClick={() => { setContentDraft(scene.content); setEditingContent(false) }} color="#6b7280">キャンセル</BtnSmall>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#f9fafb', padding: '12px', borderRadius: '8px',
              fontSize: '0.9em', color: '#374151', lineHeight: '1.7',
              maxHeight: '200px', overflowY: 'auto',
              fontFamily: 'serif', whiteSpace: 'pre-wrap',
            }}>
              {scene.content.slice(0, 800)}{scene.content.length > 800 ? '…' : ''}
              <div style={{ marginTop: '8px' }}>
                <BtnSmall onClick={() => { setContentDraft(scene.content); setEditingContent(true) }} color="#374151">
                  ✏️ 本文を編集
                </BtnSmall>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image prompt */}
      {scene.analyzed && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8em', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            📝 画像プロンプト
            <button
              onClick={() => setShowJaPrompt(!showJaPrompt)}
              style={{
                marginLeft: '8px', background: 'none', border: '1px solid #e5e7eb',
                borderRadius: '4px', padding: '1px 6px', fontSize: '0.85em',
                color: '#6b7280', cursor: 'pointer',
              }}
            >
              {showJaPrompt ? 'EN' : '日本語'}
            </button>
          </div>
          {editingPrompt ? (
            <div>
              <textarea
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: '8px 10px',
                  border: '1px solid #6366f1', borderRadius: '8px',
                  fontSize: '0.85em', resize: 'vertical', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <BtnSmall onClick={handlePromptSave} color="#6366f1">保存</BtnSmall>
                <BtnSmall onClick={handlePromptReset} color="#6b7280">キャンセル</BtnSmall>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#f9fafb', padding: '10px 12px',
              borderRadius: '8px', fontSize: '0.85em',
              color: '#374151', fontFamily: 'monospace',
              marginBottom: '6px',
            }}>
              {showJaPrompt ? (scene.imagePromptJa || '(翻訳なし)') : (scene.imagePrompt || '(プロンプトなし)')}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <BtnSmall onClick={() => { setPromptDraft(scene.imagePrompt); setEditingPrompt(true) }} color="#374151">
              編集
            </BtnSmall>
            <BtnSmall onClick={() => onAnalyze(true)} color="#059669">
              再生成
            </BtnSmall>
            <BtnSmall
              onClick={() => navigator.clipboard?.writeText(scene.imagePrompt)}
              color="#6b7280"
            >
              コピー
            </BtnSmall>
          </div>
        </div>
      )}

      {/* Image mode selector */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.8em', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>挿絵設定</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {imageModes.map((m) => (
            <button
              key={m.value}
              onClick={() => onUpdate({ imageMode: m.value })}
              style={{
                padding: '5px 12px',
                border: `2px solid ${scene.imageMode === m.value ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: '6px',
                background: scene.imageMode === m.value ? '#eef2ff' : '#fff',
                color: scene.imageMode === m.value ? '#4338ca' : '#374151',
                cursor: 'pointer',
                fontSize: '0.8em',
                fontWeight: scene.imageMode === m.value ? '600' : '400',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image preview */}
      {scene.image && (
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <img
            src={scene.image}
            alt={scene.title}
            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }}
          />
          <div style={{ marginTop: '6px' }}>
            <BtnSmall onClick={() => onUpdate({ image: null })} color="#dc2626">画像を削除</BtnSmall>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
        {!scene.analyzed ? (
          <button
            onClick={() => onAnalyze(false)}
            disabled={analyzing}
            style={{
              padding: '8px 16px',
              background: analyzing ? '#e5e7eb' : '#6366f1',
              color: analyzing ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: '8px',
              cursor: analyzing ? 'not-allowed' : 'pointer',
              fontSize: '0.9em', fontWeight: '500',
            }}
          >
            {analyzing ? '解析中...' : '🔍 このシーンを解析'}
          </button>
        ) : null}

        {scene.imageMode === 'ai' && scene.analyzed && (
          <button
            onClick={onGenerate}
            disabled={generating}
            style={{
              padding: '8px 16px',
              background: generating ? '#e5e7eb' : '#059669',
              color: generating ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: '8px',
              cursor: generating ? 'not-allowed' : 'pointer',
              fontSize: '0.9em', fontWeight: '500',
            }}
          >
            {generating ? '生成中...' : '🎨 挿絵を生成'}
          </button>
        )}

        {scene.imageMode === 'upload' && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 16px',
                background: '#f0f4ff', color: '#4338ca',
                border: '1px solid #c7d2fe', borderRadius: '8px',
                cursor: 'pointer', fontSize: '0.9em',
              }}
            >
              📁 画像をアップロード
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleUpload(e.target.files[0])}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Tag({ label, value, color, textColor }) {
  return (
    <span style={{
      background: color, color: textColor,
      padding: '2px 10px', borderRadius: '999px',
      fontSize: '0.78em', fontWeight: '500',
    }}>
      {label} {value}
    </span>
  )
}

function BtnSmall({ onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        background: 'transparent',
        border: `1px solid ${color}`,
        color: color,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.78em',
      }}
    >
      {children}
    </button>
  )
}

// ─── シーン数調整モーダル ────────────────────────────────────────────────────
function SceneAdjustModal({ scenes, rawMarkdown, textApiSettings, onApply, onClose }) {
  const currentCount = scenes.length
  // Sensible slider range: min 2, max = min(20, 2× current, char-based estimate)
  const charCount = scenes.reduce((acc, s) => acc + s.content.length, 0)
  const maxCount = Math.min(20, Math.max(currentCount * 3, Math.floor(charCount / 300)))
  const minCount = 2

  const [targetCount, setTargetCount] = useState(
    Math.min(Math.max(Math.round(currentCount * 1.5), minCount), maxCount)
  )
  const [policy, setPolicy] = useState('content')
  const [phase, setPhase] = useState('config') // 'config' | 'loading' | 'preview' | 'error'
  const [previewScenes, setPreviewScenes] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  const handlePreview = async () => {
    setPhase('loading')
    setErrorMsg('')
    try {
      const result = await splitScenesWithLLM(scenes, targetCount, policy, textApiSettings)
      setPreviewScenes(result)
      setPhase('preview')
    } catch (e) {
      setErrorMsg(e.message)
      setPhase('error')
    }
  }

  const handleApply = () => {
    onApply(previewScenes)
    onClose()
  }

  const handleRetry = () => {
    setPhase('config')
    setPreviewScenes([])
    setErrorMsg('')
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', padding: '28px',
          width: '100%', maxWidth: '560px',
          maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1em', fontWeight: '700', color: '#1a1a2e' }}>
            ✂️ シーン数を調整
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#9ca3af' }}
          >
            ✕
          </button>
        </div>

        {/* ── Config phase ── */}
        {(phase === 'config' || phase === 'error') && (
          <>
            {/* Current scene count info */}
            <div style={{
              background: '#f0f4ff', borderRadius: '10px', padding: '12px 16px',
              marginBottom: '20px', fontSize: '0.9em', color: '#4338ca',
            }}>
              現在のシーン数: <strong>{currentCount}</strong>
              <span style={{ marginLeft: '12px', color: '#6b7280', fontSize: '0.85em' }}>
                (全{charCount.toLocaleString()}文字)
              </span>
            </div>

            {/* Target count slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.85em', fontWeight: '600', color: '#374151', marginBottom: '10px',
              }}>
                <span>目標シーン数</span>
                <span style={{
                  background: '#6366f1', color: '#fff',
                  padding: '2px 12px', borderRadius: '999px', fontSize: '1em',
                }}>
                  {targetCount}
                </span>
              </div>
              <input
                type="range"
                min={minCount}
                max={maxCount}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75em', color: '#9ca3af', marginTop: '4px' }}>
                <span>{minCount}</span>
                <span>{maxCount}</span>
              </div>
            </div>

            {/* Policy selector */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.85em', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                統合の方針
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  {
                    value: 'content',
                    label: '内容が近いシーンを自動で統合',
                    desc: '物語の転換点・場所・感情の変化を基準に自然な区切りを選択',
                    badge: 'おすすめ',
                  },
                  {
                    value: 'length',
                    label: '文字数が均等になるよう統合',
                    desc: '各シーンの長さを揃え、読者のリズムを一定に保つ',
                    badge: null,
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${policy === opt.value ? '#6366f1' : '#e5e7eb'}`,
                      background: policy === opt.value ? '#eef2ff' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="policy"
                      value={opt.value}
                      checked={policy === opt.value}
                      onChange={() => setPolicy(opt.value)}
                      style={{ marginTop: '2px', accentColor: '#6366f1' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9em', color: policy === opt.value ? '#4338ca' : '#1a1a2e' }}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span style={{
                            background: '#dcfce7', color: '#15803d',
                            fontSize: '0.7em', padding: '1px 6px', borderRadius: '999px', fontWeight: '600',
                          }}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8em', color: '#6b7280' }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Error */}
            {phase === 'error' && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', padding: '10px 14px', borderRadius: '8px',
                marginBottom: '16px', fontSize: '0.85em',
              }}>
                ❌ {errorMsg}
              </div>
            )}

            {/* Warning if no API key */}
            {!textApiSettings.apiKey && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fef08a',
                color: '#92400e', padding: '10px 14px', borderRadius: '8px',
                marginBottom: '16px', fontSize: '0.85em',
              }}>
                ⚠️ テキスト生成APIキーが未設定です
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={btnStyle('ghost')}>キャンセル</button>
              <button
                onClick={handlePreview}
                disabled={!textApiSettings.apiKey}
                style={btnStyle('primary', !textApiSettings.apiKey)}
              >
                🔍 プレビューを確認
              </button>
            </div>
          </>
        )}

        {/* ── Loading phase ── */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '2em', marginBottom: '16px' }}>⏳</div>
            <p style={{ color: '#6b7280', fontSize: '0.95em', margin: '0 0 4px' }}>
              LLMがシーンを再構成中...
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.8em', margin: 0 }}>
              {currentCount}シーン → {targetCount}シーン
            </p>
          </div>
        )}

        {/* ── Preview phase ── */}
        {phase === 'preview' && (
          <>
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: '#15803d', padding: '10px 14px', borderRadius: '8px',
              marginBottom: '16px', fontSize: '0.85em',
            }}>
              ✅ {previewScenes.length}シーンに再構成されました。内容を確認して「適用」してください。
            </div>

            {/* Preview list */}
            <div style={{ marginBottom: '20px', maxHeight: '340px', overflowY: 'auto' }}>
              {previewScenes.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid #e5e7eb', borderRadius: '10px',
                    padding: '12px 14px', marginBottom: '8px',
                    background: '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      background: '#eef2ff', color: '#4338ca',
                      padding: '1px 7px', borderRadius: '4px',
                      fontSize: '0.72em', fontWeight: '700',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: '700', fontSize: '0.9em', color: '#1a1a2e' }}>
                      {s.title}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.72em', color: '#9ca3af' }}>
                      {s.content.length.toLocaleString()}文字
                    </span>
                  </div>
                  <p style={{
                    margin: 0, fontSize: '0.8em', color: '#6b7280',
                    lineHeight: '1.5', fontFamily: 'serif',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {s.content.slice(0, 120)}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={handleRetry} style={btnStyle('ghost')}>← やり直す</button>
              <button onClick={handleApply} style={btnStyle('primary')}>
                ✅ 適用する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function btnStyle(variant, disabled = false) {
  if (variant === 'primary') return {
    padding: '9px 20px', background: disabled ? '#e5e7eb' : '#6366f1',
    color: disabled ? '#9ca3af' : '#fff', border: 'none',
    borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.9em', fontWeight: '600',
  }
  return {
    padding: '9px 20px', background: '#fff', color: '#374151',
    border: '1px solid #d1d5db', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.9em',
  }
}
// ────────────────────────────────────────────────────────────────────────────

export default function SceneEditor() {
  const navigate = useNavigate()
  const { project, updateScene, setScenes, saveProject, setTitle } = useProjectStore()
  const settings = useSettingsStore()

  const [analyzingAll, setAnalyzingAll] = useState(false)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [analyzingIds, setAnalyzingIds] = useState(new Set())
  const [generatingIds, setGeneratingIds] = useState(new Set())
  const [error, setError] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [editingProjectTitle, setEditingProjectTitle] = useState(false)
  const [projectTitleDraft, setProjectTitleDraft] = useState(project.title)

  const handleProjectTitleSave = () => {
    const trimmed = projectTitleDraft.trim()
    if (trimmed) setTitle(trimmed)
    else setProjectTitleDraft(project.title)
    setEditingProjectTitle(false)
  }

  const handleSave = useCallback(async () => {
    await saveProject()
    setSavedAt(new Date())
  }, [saveProject])

  // Auto-save when leaving this page
  useEffect(() => {
    return () => { saveProject() }
  }, [saveProject])

  const handleAnalyze = useCallback(async (sceneId, regenPromptOnly = false) => {
    setAnalyzingIds((prev) => new Set([...prev, sceneId]))
    setError('')
    const scene = project.scenes.find((s) => s.id === sceneId)
    if (!scene) return

    try {
      if (regenPromptOnly && scene.analyzed) {
        const result = await regeneratePrompt(scene, settings.textApi, settings.getEffectiveStylePrompt())
        updateScene(sceneId, result)
      } else {
        const result = await analyzeScene(scene, settings.textApi)
        updateScene(sceneId, { ...result, analyzed: true })
      }
    } catch (e) {
      setError(`シーン「${scene.title}」の解析に失敗: ${e.message}`)
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev)
        next.delete(sceneId)
        return next
      })
    }
  }, [project.scenes, settings, updateScene])

  const handleGenerate = useCallback(async (sceneId) => {
    setGeneratingIds((prev) => new Set([...prev, sceneId]))
    setError('')
    const scene = project.scenes.find((s) => s.id === sceneId)
    if (!scene) return

    try {
      const dataUrl = await generateImage(scene, settings.imageApi, settings)
      updateScene(sceneId, {
        image: dataUrl,
        imageHistory: [dataUrl, ...(scene.imageHistory || [])].slice(0, 5),
      })
    } catch (e) {
      setError(`シーン「${scene.title}」の画像生成に失敗: ${e.message}`)
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev)
        next.delete(sceneId)
        return next
      })
    }
  }, [project.scenes, settings, updateScene])

  const handleApplyAdjustedScenes = useCallback((newScenes) => {
    setScenes(newScenes)
  }, [setScenes])

  // Merge sceneId into the scene before it
  const handleMergeWithPrev = useCallback((sceneId) => {
    const scenes = project.scenes
    const idx = scenes.findIndex((s) => s.id === sceneId)
    if (idx <= 0) return
    const prev = scenes[idx - 1]
    const curr = scenes[idx]
    const merged = {
      ...prev,
      content: prev.content + '\n\n' + curr.content,
      analyzed: false,
      imagePrompt: '',
      imagePromptJa: '',
    }
    setScenes([...scenes.slice(0, idx - 1), merged, ...scenes.slice(idx + 1)])
  }, [project.scenes, setScenes])

  // Delete a scene from the list
  const handleDeleteScene = useCallback((sceneId) => {
    setScenes(project.scenes.filter((s) => s.id !== sceneId))
  }, [project.scenes, setScenes])

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true)
    setError('')
    for (const scene of project.scenes) {
      if (!scene.analyzed) {
        await handleAnalyze(scene.id)
      }
    }
    setAnalyzingAll(false)
  }

  const handleGenerateAll = async () => {
    setGeneratingAll(true)
    setError('')
    for (const scene of project.scenes) {
      if (scene.imageMode === 'ai' && scene.analyzed && !scene.image) {
        await handleGenerate(scene.id)
      }
    }
    setGeneratingAll(false)
  }

  if (!project.id) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#6b7280' }}>
        <p>プロジェクトが読み込まれていません。</p>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: '16px', padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          ホームへ戻る
        </button>
      </div>
    )
  }

  const analyzedCount = project.scenes.filter((s) => s.analyzed).length
  const imageCount = project.scenes.filter((s) => s.image).length

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          {editingProjectTitle ? (
            <input
              autoFocus
              value={projectTitleDraft}
              onChange={(e) => setProjectTitleDraft(e.target.value)}
              onBlur={handleProjectTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProjectTitleSave()
                if (e.key === 'Escape') { setProjectTitleDraft(project.title); setEditingProjectTitle(false) }
              }}
              style={{
                fontSize: '1.4em', fontWeight: '700', color: '#1a1a2e',
                border: '1px solid #6366f1', borderRadius: '6px',
                padding: '2px 8px', outline: 'none', width: '100%',
              }}
            />
          ) : (
            <h1
              onClick={() => { setProjectTitleDraft(project.title); setEditingProjectTitle(true) }}
              title="クリックしてタイトルを編集"
              style={{ margin: 0, fontSize: '1.4em', fontWeight: '700', color: '#1a1a2e', cursor: 'text' }}
            >
              {project.title}
            </h1>
          )}
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9em' }}>
            📝 シーン編集 · {project.scenes.length}シーン ・ 解析済: {analyzedCount}/{project.scenes.length} ・ 挿絵: {imageCount}/{project.scenes.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Save status */}
          {savedAt && (
            <span style={{ fontSize: '0.8em', color: '#16a34a', whiteSpace: 'nowrap' }}>
              ✅ {savedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に保存済
            </span>
          )}
          <button
            onClick={handleSave}
            title="プロジェクトを保存"
            style={{
              padding: '9px 18px',
              background: '#fff', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.9em', fontWeight: '600',
            }}
          >
            💾 保存
          </button>
          <button
            onClick={() => setShowAdjustModal(true)}
            title="LLMを使ってシーン数を調整する"
            style={{
              padding: '9px 18px',
              background: '#fff', color: '#6366f1',
              border: '1px solid #c7d2fe', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.9em',
            }}
          >
            ✂️ シーン数を調整
          </button>
          <button
            onClick={handleAnalyzeAll}
            disabled={analyzingAll || !settings.textApi.apiKey}
            style={{
              padding: '9px 18px',
              background: analyzingAll ? '#e5e7eb' : '#6366f1',
              color: analyzingAll ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: '8px',
              cursor: analyzingAll ? 'not-allowed' : 'pointer',
              fontSize: '0.9em',
            }}
          >
            {analyzingAll ? '解析中...' : '🔍 全シーンを解析'}
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || !settings.imageApi.apiKey}
            style={{
              padding: '9px 18px',
              background: generatingAll ? '#e5e7eb' : '#059669',
              color: generatingAll ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: '8px',
              cursor: generatingAll ? 'not-allowed' : 'pointer',
              fontSize: '0.9em',
            }}
          >
            {generatingAll ? '生成中...' : '🎨 全挿絵を一括生成'}
          </button>
          <button
            onClick={() => navigate('/reader')}
            style={{
              padding: '9px 18px',
              background: '#fff', color: '#6366f1',
              border: '2px solid #6366f1', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.9em', fontWeight: '600',
            }}
          >
            📖 ノベルを表示
          </button>
        </div>
      </div>

      {/* API warning */}
      {!settings.textApi.apiKey && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fef08a',
          color: '#92400e', padding: '10px 16px', borderRadius: '8px',
          marginBottom: '16px', fontSize: '0.85em',
        }}>
          ⚠️ テキスト生成APIキーが未設定です。<a href="/settings" style={{ color: '#6366f1' }}>API設定</a>でキーを設定してください。
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '10px 16px', borderRadius: '8px',
          marginBottom: '16px', fontSize: '0.85em',
        }}>
          ❌ {error}
          <button onClick={() => setError('')} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}

      {/* Scene list */}
      {project.scenes.map((scene, idx) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          index={idx}
          total={project.scenes.length}
          onUpdate={(updates) => updateScene(scene.id, updates)}
          onAnalyze={(regenOnly) => handleAnalyze(scene.id, regenOnly)}
          onGenerate={() => handleGenerate(scene.id)}
          onUpload={(file) => {/* handled in card */}}
          onMergeWithPrev={() => handleMergeWithPrev(scene.id)}
          onDelete={() => handleDeleteScene(scene.id)}
          analyzing={analyzingIds.has(scene.id)}
          generating={generatingIds.has(scene.id)}
        />
      ))}

      {/* Bottom nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px', background: '#fff',
            border: '1px solid #d1d5db', borderRadius: '8px',
            cursor: 'pointer', color: '#374151', fontSize: '0.9em',
          }}
        >
          ← ホームへ
        </button>
        <button
          onClick={() => { saveProject(); navigate('/reader') }}
          style={{
            padding: '10px 24px', background: '#6366f1',
            color: '#fff', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontSize: '0.9em', fontWeight: '600',
          }}
        >
          📖 ノベルを表示 →
        </button>
      </div>

      {/* Scene adjust modal */}
      {showAdjustModal && (
        <SceneAdjustModal
          scenes={project.scenes}
          rawMarkdown={project.rawMarkdown}
          textApiSettings={settings.textApi}
          onApply={handleApplyAdjustedScenes}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </div>
  )
}
