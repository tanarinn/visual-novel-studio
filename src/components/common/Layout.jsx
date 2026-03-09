import { Link, useLocation } from 'react-router-dom'
import { useProjectStore } from '../../store/useProjectStore'

const navItems = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/settings', label: 'API設定', icon: '⚙️' },
  { to: '/scenes', label: 'シーン編集', icon: '📝' },
  { to: '/reader', label: 'リーダー', icon: '📖' },
  { to: '/export', label: 'エクスポート', icon: '💾' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const project = useProjectStore((s) => s.project)
  const isReader = location.pathname === '/reader'

  if (isReader) {
    return <div style={{ minHeight: '100vh' }}>{children}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top header */}
      <header
        style={{
          background: '#1a1a2e',
          color: '#e8e8f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ color: '#e8e8f0', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1em' }}>
            ✨ AI Novel Studio
          </Link>
          {project.title && project.id && (
            <span style={{ fontSize: '0.85em', opacity: 0.6, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
              {project.title}
            </span>
          )}
        </div>
        <nav style={{ display: 'flex', gap: '4px' }}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                color: location.pathname === item.to ? '#818cf8' : '#a0a0c0',
                textDecoration: 'none',
                fontSize: '0.85em',
                background: location.pathname === item.to ? 'rgba(99,102,241,0.15)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ marginRight: '4px' }}>{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
