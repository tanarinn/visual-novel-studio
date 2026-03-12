import { useState } from 'react'
import { useSettingsStore, TEXT_PROVIDERS, IMAGE_PROVIDERS, STYLE_PRESETS } from '../store/useSettingsStore'
import { testTextApi } from '../features/text-gen/sceneAnalyzer'
import { testImageApi } from '../features/image-gen/imageGenerator'

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '1.05em', fontWeight: '700', color: '#1a1a2e', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ type = 'text', value, onChange, placeholder, style: sx }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '0.9em',
        outline: 'none',
        ...sx,
      }}
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '0.9em',
        background: '#fff',
        outline: 'none',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function StatusBadge({ status }) {
  if (!status) return null
  const isSuccess = status.type === 'success'
  return (
    <div style={{
      marginTop: '8px',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '0.85em',
      background: isSuccess ? '#f0fdf4' : '#fef2f2',
      color: isSuccess ? '#16a34a' : '#dc2626',
      border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {isSuccess ? '✅' : '❌'} {status.message}
    </div>
  )
}

export default function Settings() {
  const settings = useSettingsStore()
  const { textApi, imageApi, stylePreset, customStyle, setTextApi, setImageApi, setStylePreset, setCustomStyle } = settings

  const [textTestStatus, setTextTestStatus] = useState(null)
  const [imageTestStatus, setImageTestStatus] = useState(null)
  const [testingText, setTestingText] = useState(false)
  const [testingImage, setTestingImage] = useState(false)

  const handleTextProviderChange = (provider) => {
    const config = TEXT_PROVIDERS[provider]
    setTextApi({
      provider,
      baseUrl: config.baseUrl || textApi.baseUrl,
      model: config.models[0] || textApi.model,
      // Ollama doesn't need a real API key; use placeholder so apiKey is truthy
      ...(provider === 'ollama' ? { apiKey: 'ollama' } : {}),
    })
  }

  const handleImageProviderChange = (provider) => {
    const config = IMAGE_PROVIDERS[provider]
    setImageApi({
      provider,
      baseUrl: config.baseUrl || imageApi.baseUrl,
      model: config.models[0] || imageApi.model,
      ...(provider === 'a1111' ? { apiKey: 'local' } : {}),
    })
  }

  const handleTestText = async () => {
    setTestingText(true)
    setTextTestStatus(null)
    try {
      await testTextApi(textApi)
      setTextTestStatus({ type: 'success', message: '接続成功しました' })
    } catch (e) {
      setTextTestStatus({ type: 'error', message: e.message })
    } finally {
      setTestingText(false)
    }
  }

  const handleTestImage = async () => {
    setTestingImage(true)
    setImageTestStatus(null)
    try {
      await testImageApi(imageApi)
      setImageTestStatus({ type: 'success', message: '接続成功しました' })
    } catch (e) {
      setImageTestStatus({ type: 'error', message: e.message })
    } finally {
      setTestingImage(false)
    }
  }

  const textProviderOptions = Object.entries(TEXT_PROVIDERS).map(([k, v]) => ({ value: k, label: v.name }))
  const imageProviderOptions = Object.entries(IMAGE_PROVIDERS).map(([k, v]) => ({ value: k, label: v.name }))

  const currentTextProvider = TEXT_PROVIDERS[textApi.provider]
  const currentImageProvider = IMAGE_PROVIDERS[imageApi.provider]

  const textModelOptions = [
    ...(currentTextProvider?.models || []).map((m) => ({ value: m, label: m })),
    ...(textApi.provider === 'custom' ? [{ value: textApi.model, label: textApi.model || 'カスタム' }] : []),
  ]

  const imageModelOptions = [
    ...(currentImageProvider?.models || []).map((m) => ({ value: m, label: m })),
    ...(imageApi.provider === 'custom' ? [{ value: imageApi.model, label: imageApi.model || 'カスタム' }] : []),
  ]

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.5em', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>⚙️ API設定</h1>
      <p style={{ color: '#6b7280', fontSize: '0.9em', marginBottom: '32px' }}>
        テキスト生成APIと画像生成APIを設定してください。
      </p>

      <div style={{
        background: '#fffbeb', border: '1px solid #fef08a',
        color: '#92400e', padding: '12px 16px', borderRadius: '8px',
        marginBottom: '24px', fontSize: '0.85em',
      }}>
        ⚠️ APIキーはこのセッション中のみメモリに保持されます。ページを再読み込みすると消去されます。
      </div>

      {/* Text Generation API */}
      <Section title="📝 テキスト生成API">
        <FormRow label="プロバイダー">
          <Select
            value={textApi.provider}
            onChange={handleTextProviderChange}
            options={textProviderOptions}
          />
        </FormRow>
        <FormRow label="ベースURL">
          <Input
            value={textApi.baseUrl}
            onChange={(v) => setTextApi({ baseUrl: v })}
            placeholder="https://api.openai.com/v1"
          />
        </FormRow>
        {textApi.provider === 'ollama' ? (
          <FormRow label="APIキー">
            <div style={{ fontSize: '0.85em', color: '#16a34a', background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              ✅ Ollamaはローカル実行のためAPIキーは不要です
            </div>
          </FormRow>
        ) : (
          <FormRow label="APIキー">
            <Input
              type="password"
              value={textApi.apiKey}
              onChange={(v) => setTextApi({ apiKey: v })}
              placeholder="sk-..."
            />
          </FormRow>
        )}
        <FormRow label="モデル">
          {textApi.provider === 'custom' || textApi.provider === 'ollama' || textModelOptions.length === 0 ? (
            <Input
              value={textApi.model}
              onChange={(v) => setTextApi({ model: v })}
              placeholder={textApi.provider === 'ollama' ? 'llama3.2, mistral, gemma2...' : 'モデル名を入力'}
            />
          ) : (
            <Select
              value={textApi.model}
              onChange={(v) => setTextApi({ model: v })}
              options={textModelOptions}
            />
          )}
        </FormRow>
        {textApi.provider === 'ollama' && (
          <div style={{ fontSize: '0.82em', color: '#92400e', background: '#fffbeb', border: '1px solid #fef08a', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', lineHeight: '1.6' }}>
            💡 <strong>CORS設定が必要です。</strong>以下のコマンドでOllamaを起動してください：<br />
            <code style={{ display: 'inline-block', marginTop: '4px', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.95em' }}>
              OLLAMA_ORIGINS=* ollama serve
            </code>
          </div>
        )}
        <button
          onClick={handleTestText}
          disabled={testingText || (!textApi.apiKey && textApi.provider !== 'ollama')}
          style={{
            padding: '8px 20px',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: testingText || !textApi.apiKey ? 'not-allowed' : 'pointer',
            opacity: testingText || !textApi.apiKey ? 0.5 : 1,
            fontSize: '0.9em',
          }}
        >
          {testingText ? '接続中...' : '接続テスト'}
        </button>
        <StatusBadge status={textTestStatus} />
      </Section>

      {/* Image Generation API */}
      <Section title="🎨 画像生成API">
        <FormRow label="プロバイダー">
          <Select
            value={imageApi.provider}
            onChange={handleImageProviderChange}
            options={imageProviderOptions}
          />
        </FormRow>
        <FormRow label="ベースURL">
          <Input
            value={imageApi.baseUrl}
            onChange={(v) => setImageApi({ baseUrl: v })}
            placeholder={imageApi.provider === 'a1111' ? "http://127.0.0.1:7860" : "https://api.openai.com/v1"}
          />
        </FormRow>
        {imageApi.provider === 'a1111' ? (
          <FormRow label="APIキー">
            <div style={{ fontSize: '0.85em', color: '#16a34a', background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              ✅ ローカル実行のためAPIキーは不要です
            </div>
          </FormRow>
        ) : (
          <FormRow label="APIキー">
            <Input
              type="password"
              value={imageApi.apiKey}
              onChange={(v) => setImageApi({ apiKey: v })}
              placeholder="sk-..."
            />
          </FormRow>
        )}
        <FormRow label="モデル">
          {imageApi.provider === 'custom' || imageModelOptions.length === 0 ? (
            <Input
              value={imageApi.model}
              onChange={(v) => setImageApi({ model: v })}
              placeholder="モデル名を入力"
            />
          ) : (
            <Select
              value={imageApi.model}
              onChange={(v) => setImageApi({ model: v })}
              options={imageModelOptions}
            />
          )}
        </FormRow>
        <button
          onClick={handleTestImage}
          disabled={testingImage || (!imageApi.apiKey && imageApi.provider !== 'a1111')}
          style={{
            padding: '8px 20px',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: testingImage || (!imageApi.apiKey && imageApi.provider !== 'a1111') ? 'not-allowed' : 'pointer',
            opacity: testingImage || (!imageApi.apiKey && imageApi.provider !== 'a1111') ? 0.5 : 1,
            fontSize: '0.9em',
          }}
        >
          {testingImage ? '接続中...' : '接続テスト'}
        </button>
        <StatusBadge status={imageTestStatus} />
      </Section>

      {/* Style preset */}
      <Section title="🖌️ スタイルプリセット">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {Object.entries(STYLE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setStylePreset(key)}
              style={{
                padding: '10px 12px',
                border: `2px solid ${stylePreset === key ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: '10px',
                background: stylePreset === key ? '#eef2ff' : '#fff',
                color: stylePreset === key ? '#4338ca' : '#374151',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontWeight: stylePreset === key ? '700' : '400',
                transition: 'all 0.15s',
                textAlign: 'center',
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {stylePreset === 'custom' && (
          <div>
            <FormRow label="カスタムプロンプト（英語）">
              <textarea
                value={customStyle.prompt}
                onChange={(e) => setCustomStyle({ prompt: e.target.value })}
                placeholder="anime style, high quality..."
                rows={2}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9em', resize: 'vertical' }}
              />
            </FormRow>
            <FormRow label="ネガティブプロンプト（英語）">
              <textarea
                value={customStyle.negativePrompt}
                onChange={(e) => setCustomStyle({ negativePrompt: e.target.value })}
                placeholder="blurry, low quality..."
                rows={2}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9em', resize: 'vertical' }}
              />
            </FormRow>
          </div>
        )}
        {stylePreset !== 'custom' && (
          <div style={{ fontSize: '0.85em', color: '#6b7280', background: '#f9fafb', padding: '10px 12px', borderRadius: '8px' }}>
            <strong>プロンプト:</strong> {STYLE_PRESETS[stylePreset]?.prompt}<br />
            <strong>ネガティブ:</strong> {STYLE_PRESETS[stylePreset]?.negativePrompt}
          </div>
        )}
      </Section>
    </div>
  )
}
