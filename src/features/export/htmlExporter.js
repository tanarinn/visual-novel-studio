/**
 * HTML Exporter: generates a standalone HTML file with embedded images.
 */

export function exportToHTML(project, readerSettings = {}) {
  const {
    fontSize = 18,
    lineHeight = 1.8,
    letterSpacing = 0.05,
    fontFamily = 'serif',
    colorTheme = 'light',
    textWidth = 680,
  } = readerSettings

  const themes = {
    light: { bg: '#ffffff', text: '#1a1a2e', panel: '#f8f9fa', border: '#e5e7eb' },
    dark: { bg: '#1a1a2e', text: '#e8e8f0', panel: '#2d2d44', border: '#3d3d5c' },
    sepia: { bg: '#f4ede4', text: '#3d2b1f', panel: '#ede0d4', border: '#c8b4a0' },
  }
  const theme = themes[colorTheme] || themes.light

  const fontStack =
    fontFamily === 'serif'
      ? '"游明朝", "YuMincho", "Hiragino Mincho ProN", Georgia, serif'
      : '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif'

  const scenesHTML = project.scenes
    .map(
      (scene, idx) => `
    <section class="scene" id="scene-${idx}">
      ${
        scene.image
          ? `<div class="scene-image-wrap">
          <img class="scene-image" src="${scene.image}" alt="${escapeHtml(scene.title)}" loading="lazy" />
        </div>`
          : ''
      }
      <div class="scene-content">
        <h2 class="scene-title">${escapeHtml(scene.title)}</h2>
        ${scene.location || scene.timeOfDay ? `<p class="scene-meta">${[scene.location, scene.timeOfDay].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
        <div class="scene-text">${markdownToHtml(scene.content)}</div>
      </div>
    </section>`
    )
    .join('\n')

  const tocHTML = project.scenes
    .map(
      (scene, idx) =>
        `<li><a href="#scene-${idx}">${escapeHtml(scene.title)}</a></li>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    :root {
      --bg: ${theme.bg};
      --text: ${theme.text};
      --panel: ${theme.panel};
      --border: ${theme.border};
      --font-size: ${fontSize}px;
      --line-height: ${lineHeight};
      --letter-spacing: ${letterSpacing}em;
      --text-width: ${textWidth}px;
    }

    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ${fontStack};
      font-size: var(--font-size);
      line-height: var(--line-height);
      letter-spacing: var(--letter-spacing);
    }

    /* Header */
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .header-title {
      font-size: 1.1em;
      font-weight: bold;
      margin: 0;
    }

    .toc-toggle {
      background: none;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85em;
    }

    /* Table of Contents */
    .toc-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 200;
    }

    .toc-overlay.open { display: block; }

    .toc-panel {
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      width: 280px;
      background: var(--bg);
      padding: 24px;
      overflow-y: auto;
      z-index: 201;
      box-shadow: 4px 0 20px rgba(0,0,0,0.2);
    }

    .toc-panel h2 { font-size: 1em; margin-top: 0; }
    .toc-panel ul { list-style: none; padding: 0; margin: 0; }
    .toc-panel li { border-bottom: 1px solid var(--border); }
    .toc-panel a {
      display: block;
      padding: 10px 0;
      color: var(--text);
      text-decoration: none;
      font-size: 0.9em;
    }
    .toc-panel a:hover { opacity: 0.7; }

    /* Main content */
    .main { max-width: 900px; margin: 0 auto; padding: 40px 24px; }

    /* Scene */
    .scene { margin-bottom: 80px; }

    .scene-image-wrap {
      text-align: center;
      margin-bottom: 32px;
    }

    .scene-image {
      max-width: 100%;
      max-height: 600px;
      width: auto;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    }

    .scene-content { max-width: var(--text-width); margin: 0 auto; }

    .scene-title {
      font-size: 1.4em;
      border-bottom: 2px solid var(--border);
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 8px;
    }

    .scene-meta {
      font-size: 0.8em;
      opacity: 0.6;
      margin-bottom: 24px;
    }

    .scene-text p {
      margin: 0 0 1.2em;
      text-indent: 1em;
    }

    .scene-text p:first-child { margin-top: 0; }

    /* Progress bar */
    .progress {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: #6366f1;
      transition: width 0.1s;
      z-index: 999;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .main { padding: 24px 16px; }
      .scene-image { max-height: 400px; }
    }
  </style>
</head>
<body>
  <div class="progress" id="progress"></div>

  <header class="header">
    <h1 class="header-title">${escapeHtml(project.title)}</h1>
    <button class="toc-toggle" onclick="toggleToc()">目次</button>
  </header>

  <div class="toc-overlay" id="toc-overlay" onclick="closeToc()">
    <nav class="toc-panel" onclick="event.stopPropagation()">
      <h2>目次</h2>
      <ul>${tocHTML}</ul>
    </nav>
  </div>

  <main class="main">
    ${scenesHTML}
  </main>

  <script>
    function toggleToc() {
      document.getElementById('toc-overlay').classList.toggle('open');
    }
    function closeToc() {
      document.getElementById('toc-overlay').classList.remove('open');
    }
    document.querySelectorAll('.toc-panel a').forEach(a => {
      a.addEventListener('click', closeToc);
    });

    // Progress bar
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      document.getElementById('progress').style.width = pct + '%';
    });
  </script>
</body>
</html>`
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markdownToHtml(text) {
  if (!text) return ''
  // Basic markdown to HTML conversion for the exported file
  let html = text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>')

  // Wrap in paragraphs
  return html
    .split(/(<br>){2,}/)
    .filter((s) => s && s !== '<br>')
    .map((p) => `<p>${p.replace(/^(<br>)+|(<br>)+$/g, '')}</p>`)
    .join('\n')
}

export function downloadHTML(html, filename = 'visual-novel.html') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
