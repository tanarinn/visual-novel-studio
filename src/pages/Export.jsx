import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/useProjectStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { exportToHTML, exportToReaderHTML, downloadHTML, previewHTML } from '../features/export/htmlExporter'

function ExportOption({ icon, title, description, badge, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '16px',
        padding: '20px', width: '100%', textAlign: 'left',
        background: disabled ? '#f9fafb' : '#fff',
        border: '1px solid #e5e7eb', borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
        marginBottom: '12px',
      }}
    >
      <span style={{ fontSize: '2em' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: '700', color: '#1a1a2e', fontSize: '1em' }}>{title}</span>
          {badge && (
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 8px', borderRadius: '999px', fontSize: '0.75em', fontWeight: '600' }}>
              {badge}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.85em', color: '#6b7280', lineHeight: '1.5' }}>{description}</p>
      </div>
      {!disabled && <span style={{ color: '#9ca3af', alignSelf: 'center' }}>→</span>}
    </button>
  )
}

function ModeCard({ mode, label, icon, description, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '16px', textAlign: 'left',
        border: `2px solid ${selected ? '#6366f1' : '#e5e7eb'}`,
        borderRadius: '12px',
        background: selected ? '#eef2ff' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: '1.6em', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontWeight: '700', color: selected ? '#4338ca' : '#1a1a2e', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '0.8em', color: '#6b7280', lineHeight: '1.4' }}>{description}</div>
    </button>
  )
}

export default function Export() {
  const navigate = useNavigate()
  const { project } = useProjectStore()
  const { readerSettings } = useSettingsStore()
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [exportMode, setExportMode] = useState('story')

  const imageCount = project.scenes?.filter((s) => s.image).length || 0
  const totalScenes = project.scenes?.length || 0

  const buildHTML = () =>
    exportMode === 'story'
      ? exportToHTML(project, readerSettings)
      : exportToReaderHTML(project, readerSettings)

  const handleExportHTML = async () => {
    if (!project.id) return
    setExporting(true)
    try {
      const html = buildHTML()
      const filename = `${project.title.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_') || 'novel'}.html`
      downloadHTML(html, filename)
      setExported(true)
    } catch (e) {
      alert('エクスポートに失敗しました: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const handlePreviewHTML = () => {
    if (!project.id) return
    try {
      previewHTML(buildHTML())
    } catch (e) {
      alert('プレビューに失敗しました: ' + e.message)
    }
  }

  const handleExportImages = () => {
    project.scenes.forEach((scene, idx) => {
      if (!scene.image) return
      const a = document.createElement('a')
      a.href = scene.image
      a.download = `scene_${String(idx + 1).padStart(2, '0')}_${scene.title.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_') || 'scene'}.png`
      a.click()
    })
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(project, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.title || 'project'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!project.id) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#6b7280' }}>
        <p>プロジェクトが読み込まれていません。</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          ホームへ戻る
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '660px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.5em', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>
        💾 エクスポート
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.9em', marginBottom: '32px' }}>
        作成したビジュアルノベルを各形式で出力します。
      </p>

      {/* Project summary */}
      <div style={{
        background: '#f0f4ff', border: '1px solid #c7d2fe',
        borderRadius: '12px', padding: '16px 20px', marginBottom: '32px',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.1em', color: '#4338ca' }}>{project.title}</h2>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85em', color: '#4b5563' }}>
          <span>📄 {totalScenes}シーン</span>
          <span>🖼️ 挿絵 {imageCount}/{totalScenes}枚</span>
          <span>📅 {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
        </div>
      </div>

      {/* HTML output mode selector */}
      <h2 style={{ fontSize: '1em', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>出力スタイル</h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <ModeCard
          mode="story"
          label="ストーリーモード"
          icon="🎬"
          description="フルスクリーン・ビジュアルノベルスタイル"
          selected={exportMode === 'story'}
          onClick={() => setExportMode('story')}
        />
        <ModeCard
          mode="reader"
          label="リーダーモード"
          icon="📖"
          description="アプリ内リーダーと同じシンプルレイアウト"
          selected={exportMode === 'reader'}
          onClick={() => setExportMode('reader')}
        />
      </div>

      {/* Main export */}
      <h2 style={{ fontSize: '1em', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>メイン出力</h2>

      <ExportOption
        icon="🌐"
        title="HTMLファイルとして保存"
        badge="推奨"
        description={exportMode === 'story'
          ? 'VNスタイル・SNSシェアボタン付きスタンドアロンHTML。'
          : 'リーダーと同じシンプルレイアウト・フォント/テーマ設定を反映したスタンドアロンHTML。'}
        onClick={handleExportHTML}
        disabled={exporting}
      />

      {exported && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          color: '#15803d', padding: '10px 16px', borderRadius: '8px',
          marginBottom: '16px', fontSize: '0.85em',
        }}>
          ✅ HTMLファイルをダウンロードしました。
        </div>
      )}

      {/* Image export */}
      <h2 style={{ fontSize: '1em', fontWeight: '700', color: '#374151', marginTop: '24px', marginBottom: '12px' }}>
        画像の個別保存
      </h2>

      <ExportOption
        icon="🖼️"
        title="全挿絵を個別ダウンロード"
        description={`${imageCount}枚の挿絵を1枚ずつダウンロードします。`}
        onClick={handleExportImages}
        disabled={imageCount === 0}
      />

      {/* Project JSON */}
      <h2 style={{ fontSize: '1em', fontWeight: '700', color: '#374151', marginTop: '24px', marginBottom: '12px' }}>
        プロジェクトデータ
      </h2>

      <ExportOption
        icon="📦"
        title="プロジェクトJSONを保存"
        description="シーン解析結果・生成済み画像を含む完全なプロジェクトデータ。ホーム画面にドロップすると別のブラウザやPCで作業を再開できます。"
        onClick={handleExportJSON}
        disabled={false}
      />

      {/* Preview buttons */}
      <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/reader')}
          style={{
            padding: '12px 28px',
            background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontSize: '0.95em', fontWeight: '600',
          }}
        >
          📖 アプリ内プレビュー
        </button>
        <button
          onClick={handlePreviewHTML}
          disabled={!project.id}
          style={{
            padding: '12px 28px',
            background: '#0f172a', color: '#fff',
            border: 'none', borderRadius: '10px',
            cursor: project.id ? 'pointer' : 'not-allowed',
            fontSize: '0.95em', fontWeight: '600',
            opacity: project.id ? 1 : 0.5,
          }}
        >
          🌐 HTMLプレビュー（新しいタブ）
        </button>
      </div>

      {/* Tips */}
      <div style={{ marginTop: '32px', padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '0.9em', color: '#374151' }}>💡 ヒント</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85em', color: '#6b7280', lineHeight: '1.8' }}>
          <li>HTMLファイルは挿絵がbase64で埋め込まれるため、単一ファイルで完結します</li>
          <li>ストーリーモードはビジュアルノベルスタイルの演出・SNSシェア機能付き</li>
          <li>リーダーモードはフォント・カラーテーマなど現在の表示設定が反映されます</li>
          <li>エクスポート前に📖リーダーでプレビューすることをおすすめします</li>
        </ul>
      </div>
    </div>
  )
}
