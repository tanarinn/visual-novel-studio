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
    noIndent = false,
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
        <div class="scene-text">${markdownToHtml(scene.content, noIndent)}</div>
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
      padding: 10px 20px;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
    }

    .header-left { display: flex; align-items: center; }
    .header-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    .header-title {
      font-size: 1.1em;
      font-weight: bold;
      margin: 0;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      white-space: nowrap;
    }

    .hdr-share-btn {
      background: none;
      border: 1px solid var(--border);
      color: var(--text);
      width: 34px;
      height: 34px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.72em;
      font-weight: bold;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s;
      padding: 0;
    }
    .hdr-share-btn:hover { opacity: 0.65; }
    @media (max-width: 480px) { .hdr-share-btn { display: none; } }

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
      text-indent: ${noIndent ? '0' : '1em'};
    }

    .scene-text p:first-child { margin-top: 0; }

    .scene-text blockquote {
      border-left: 3px solid rgba(128,128,128,0.4);
      padding-left: 1em;
      margin: 0 0 1.2em 0;
      opacity: 0.85;
    }

    .scene-text blockquote p {
      font-style: italic;
      margin: 0.4em 0 0;
      text-indent: 0;
    }

    .scene-text blockquote p:first-child { margin-top: 0; }

    .scene-text code {
      font-family: monospace;
      background: rgba(0,0,0,0.07);
      padding: 0 4px;
      border-radius: 3px;
      font-size: 0.9em;
    }

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

    /* Share section */
    .share-section {
      max-width: var(--text-width);
      margin: 0 auto 80px;
      padding: 32px 0;
      border-top: 1px solid var(--border);
      text-align: center;
    }
    .share-section-heading {
      font-size: 0.9em;
      opacity: 0.6;
      margin: 0 0 16px;
    }
    .share-buttons-row {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .share-big-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.88em;
      font-weight: bold;
      color: #fff;
      transition: opacity 0.15s;
    }
    .share-big-btn:hover { opacity: 0.85; }
    .btn-x    { background: #000; }
    .btn-fb   { background: #1877F2; }
    .btn-line { background: #06C755; }
    .btn-copy { background: #6366f1; }
  </style>
</head>
<body>
  <div class="progress" id="progress"></div>

  <header class="header">
    <div class="header-left">
      <button class="toc-toggle" onclick="toggleToc()">目次</button>
    </div>
    <h1 class="header-title">${escapeHtml(project.title)}</h1>
    <div class="header-right">
      <button class="hdr-share-btn" onclick="shareX()" title="Xでシェア">&#120143;</button>
      <button class="hdr-share-btn" onclick="shareFB()" title="Facebookでシェア">FB</button>
      <button class="hdr-share-btn" onclick="shareLine()" title="LINEでシェア">LINE</button>
      <button class="hdr-share-btn" id="hdr-copy-btn" onclick="copyUrl('hdr')" title="URLをコピー">&#128279;</button>
    </div>
  </header>

  <div class="toc-overlay" id="toc-overlay" onclick="closeToc()">
    <nav class="toc-panel" onclick="event.stopPropagation()">
      <h2>目次</h2>
      <ul>${tocHTML}</ul>
    </nav>
  </div>

  <main class="main">
    ${scenesHTML}
    <div class="share-section">
      <p class="share-section-heading">この作品をシェアする</p>
      <div class="share-buttons-row">
        <button class="share-big-btn btn-x" onclick="shareX()">&#120143; Xでシェア</button>
        <button class="share-big-btn btn-fb" onclick="shareFB()">f Facebookでシェア</button>
        <button class="share-big-btn btn-line" onclick="shareLine()">LINE LINEでシェア</button>
        <button class="share-big-btn btn-copy" id="main-copy-btn" onclick="copyUrl('main')">&#128279; URLをコピー</button>
      </div>
    </div>
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

    // Share
    const PAGE_TITLE = ${JSON.stringify(project.title)};
    function shareX() {
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(PAGE_TITLE) + '&url=' + encodeURIComponent(location.href), '_blank');
    }
    function shareFB() {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(location.href), '_blank');
    }
    function shareLine() {
      window.open('https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(location.href) + '&text=' + encodeURIComponent(PAGE_TITLE), '_blank');
    }
    function copyUrl(src) {
      const btn = document.getElementById(src === 'hdr' ? 'hdr-copy-btn' : 'main-copy-btn');
      const orig = btn.innerHTML;
      const doCopy = () => {
        if (navigator.clipboard) return navigator.clipboard.writeText(location.href);
        const ta = document.createElement('textarea');
        ta.value = location.href; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta); return Promise.resolve();
      };
      doCopy().then(() => {
        btn.textContent = '✓ コピー済み';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      });
    }
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

// Convert inline markdown to HTML (escaping plain text segments)
function inlineToHtml(text) {
  if (!text) return ''
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`/g
  let result = ''
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index))
    if (match[1] !== undefined) result += `<strong>${escapeHtml(match[1])}</strong>`
    else if (match[2] !== undefined) result += `<em>${escapeHtml(match[2])}</em>`
    else if (match[3] !== undefined) result += `<s>${escapeHtml(match[3])}</s>`
    else if (match[4] !== undefined) result += `<code>${escapeHtml(match[4])}</code>`
    lastIndex = match.index + match[0].length
  }
  result += escapeHtml(text.slice(lastIndex))
  return result
}

// Convert full markdown text to HTML, supporting:
// - Paragraphs (blank line separated)
// - Single-line breaks preserved within paragraphs
// - > Blockquotes
// - **bold**, *italic*, ~~strike~~, `code`
function markdownToHtml(text, noIndent = false) {
  if (!text) return ''
  const indentStyle = noIndent ? '' : ' style="text-indent:1em"'
  const blocks = text.split(/\n{2,}/).filter(Boolean).map(b => b.trimEnd())

  return blocks.map(block => {
    const lines = block.split('\n').map(l => l.replace(/\s+$/, ''))
    const nonEmpty = lines.filter(l => l.trim())

    // Blockquote: all non-empty lines start with >
    if (nonEmpty.length > 0 && nonEmpty.every(l => l.startsWith('>'))) {
      const inner = nonEmpty.map((l, j) => {
        const txt = l.replace(/^>\s?/, '')
        return `<p style="margin:${j > 0 ? '0.4em' : '0'} 0 0;font-style:italic;text-indent:0">${inlineToHtml(txt)}</p>`
      }).join('\n')
      return `<blockquote>${inner}</blockquote>`
    }

    // Regular paragraph: lines joined with <br>
    let first = true
    const content = lines.map(line => {
      if (!line.trim()) return ''
      const html = inlineToHtml(line)
      const result = first ? html : `<br>${html}`
      first = false
      return result
    }).join('')

    return `<p${indentStyle}>${content}</p>`
  }).join('\n')
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
