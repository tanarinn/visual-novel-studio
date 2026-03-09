import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/useProjectStore'
import { parseMarkdown, detectTitle } from '../features/parser/markdownParser'

export default function Home() {
  const navigate = useNavigate()
  const { createProject, setScenes, projects, loadProjectById, deleteProject, importProject } = useProjectStore()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const fileInputRef = useRef(null)

  const handleMarkdown = useCallback(async (text, filename) => {
    setLoading(true)
    setError('')
    try {
      const title = detectTitle(text) || filename?.replace(/\.md$/, '') || 'New Novel'
      createProject(title, text)
      const scenes = parseMarkdown(text)
      setScenes(scenes)
      navigate('/scenes')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [createProject, setScenes, navigate])

  const handleJsonImport = useCallback(async (file) => {
    setLoading(true)
    setError('')
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await importProject(data)
      navigate('/scenes')
    } catch (e) {
      setError('JSONの読み込みに失敗しました: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [importProject, navigate])

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setError('ファイルサイズが50MBを超えています')
      return
    }
    // JSON project file
    if (file.name.endsWith('.json') || file.type === 'application/json') {
      handleJsonImport(file)
      return
    }
    // Markdown / text file
    if (file.size > 10 * 1024 * 1024) {
      setError('テキストファイルのサイズが10MBを超えています')
      return
    }
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let text
    // Check for UTF-8 BOM (EF BB BF)
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      text = new TextDecoder('utf-8').decode(buffer)
    } else {
      // Try strict UTF-8 first; fall back to Shift-JIS on invalid sequences
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      } catch {
        text = new TextDecoder('shift-jis').decode(buffer)
      }
    }
    handleMarkdown(text, file.name)
  }, [handleMarkdown, handleJsonImport])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const loadDefaultSample = async () => {
    try {
      const res = await fetch('/nopower.md')
      if (res.ok) {
        const text = await res.text()
        handleMarkdown(text, 'nopower.md')
      } else {
        setError('サンプルファイルの読み込みに失敗しました')
      }
    } catch {
      setError('サンプルファイルの読み込みに失敗しました')
    }
  }

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return
    handleMarkdown(pasteText, 'pasted-text.md')
  }

  const handleLoadProject = async (id) => {
    const proj = await loadProjectById(id)
    if (proj) navigate('/scenes')
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '12px' }}>
          ✨ AI Novel Studio
        </h1>
        <p style={{ fontSize: '1.1em', color: '#6b7280', maxWidth: '520px', margin: '0 auto' }}>
          Markdownファイルをアップロードして、AIが挿絵付きのビジュアルノベルを自動生成します
        </p>
      </div>

      {/* Upload area */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#eef2ff' : '#f9fafb',
          transition: 'all 0.2s',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <p style={{ fontSize: '1.1em', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
          Markdownファイルをドラッグ＆ドロップ
        </p>
        <p style={{ fontSize: '0.9em', color: '#9ca3af', marginBottom: '16px' }}>
          または クリックしてファイルを選択 (.md / .txt / .json)
        </p>
        <span
          style={{
            display: 'inline-block',
            background: '#6366f1',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '0.95em',
            fontWeight: '500',
          }}
        >
          ファイルを選択
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.json,text/markdown,text/plain,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            e.stopPropagation()
            handleFileSelect(e.target.files[0])
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowPaste(!showPaste)}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.95em',
            color: '#374151',
          }}
        >
          📋 テキストを貼り付け
        </button>
        <button
          onClick={loadDefaultSample}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.95em',
            color: '#374151',
          }}
        >
          📚 サンプル原稿を読み込む
        </button>
      </div>

      {/* Paste area */}
      {showPaste && (
        <div style={{ marginBottom: '24px' }}>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="ここにMarkdown本文を貼り付けてください..."
            style={{
              width: '100%',
              height: '200px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontSize: '0.9em',
              fontFamily: 'monospace',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <button
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: pasteText.trim() ? 'pointer' : 'not-allowed',
              opacity: pasteText.trim() ? 1 : 0.5,
              fontSize: '0.95em',
            }}
          >
            このテキストで開始
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '12px 16px', borderRadius: '8px',
          marginBottom: '16px', fontSize: '0.9em',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#6366f1' }}>
          解析中...
        </div>
      )}

      {/* Saved projects */}
      {projects.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '1.1em', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
            📁 保存済みプロジェクト
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px 16px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#1a1a2e' }}>{p.title}</div>
                  <div style={{ fontSize: '0.8em', color: '#9ca3af' }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ja-JP') : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleLoadProject(p.id)}
                    style={{
                      padding: '6px 14px',
                      background: '#6366f1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85em',
                    }}
                  >
                    開く
                  </button>
                  <button
                    onClick={() => deleteProject(p.id)}
                    style={{
                      padding: '6px 14px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85em',
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps guide */}
      <div style={{ marginTop: '48px', padding: '24px', background: '#f0f4ff', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1em', color: '#4338ca' }}>使い方</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#4b5563', fontSize: '0.9em', lineHeight: '2' }}>
          <li>Markdownファイルをアップロード（または貼り付け）</li>
          <li>⚙️ API設定でテキスト生成・画像生成APIを設定</li>
          <li>📝 シーン編集でAI解析・挿絵プロンプトを確認・編集</li>
          <li>挿絵を生成してビジュアルノベルを完成</li>
          <li>💾 HTMLファイルとしてエクスポート</li>
        </ol>
      </div>
    </div>
  )
}
