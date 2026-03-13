/**
 * HTML Exporter: generates a standalone HTML file with embedded images.
 */

export function exportToHTML(project, readerSettings = {}) {
  const {
    fontSize = 18,
    letterSpacing = 0.05,
    colorTheme = 'dark',
    textWidth = 680,
    noIndent = false,
  } = readerSettings

  // Cinematic / literary themes — designed for visual novel atmosphere
  const themes = {
    // dark: deep navy, cinematic
    dark: {
      bg: '#0c1020', bgRgb: '12,16,32',
      text: '#d4d8e8',
      glassBg: 'rgba(8,12,28,0.74)',
      glassBgOpaque: 'rgba(6,10,24,0.97)',
      glassBorder: 'rgba(180,200,255,0.13)',
      accent: '#7aaccc',
    },
    // sepia: warm dark grey, literary
    sepia: {
      bg: '#1c1814', bgRgb: '28,24,20',
      text: '#e4d8c0',
      glassBg: 'rgba(20,16,10,0.74)',
      glassBgOpaque: 'rgba(14,10,6,0.97)',
      glassBorder: 'rgba(220,190,140,0.13)',
      accent: '#c09a60',
    },
    // light: off-white, refined literary
    light: {
      bg: '#f0ece6', bgRgb: '240,236,230',
      text: '#1c1a17',
      glassBg: 'rgba(248,244,240,0.78)',
      glassBgOpaque: 'rgba(245,241,237,0.97)',
      glassBorder: 'rgba(30,20,10,0.14)',
      accent: '#7a6252',
    },
  }
  const theme = themes[colorTheme] || themes.dark

  // Extract first meaningful line as a "pull quote" for the scene card
  const extractPullQuote = (content) => {
    if (!content) return ''
    const plain = content.replace(/[*_~`>#\[\]]/g, '').trim()
    const line = plain.split('\n').find(l => l.trim().length > 8) || ''
    const q = line.trim().slice(0, 55)
    return q + (line.trim().length > 55 ? '…' : '')
  }

  const scenesHTML = project.scenes.map((scene, idx) => {
    const pull = extractPullQuote(scene.content)
    // Single-quotes inside url() to avoid conflicting with the HTML attribute's double-quotes
    const bgStyle = scene.image ? `background-image:url('${scene.image}');` : ''
    const cls = scene.image ? 'scene' : 'scene no-image'
    return `
<section class="${cls}" id="scene-${idx}">
  <div class="scene-bg" style="${bgStyle}">
    <div class="scene-overlay"></div>
    <div class="scene-card">
      <div class="scene-num">— ${idx + 1} —</div>
      <h2 class="scene-card-title">${escapeHtml(scene.title)}</h2>
      ${pull ? `<p class="scene-card-pull">${escapeHtml(pull)}</p>` : ''}
    </div>
  </div>
  <div class="scene-body">
    <div class="scene-glass">
      <div class="scene-text">${markdownToHtml(scene.content, noIndent)}</div>
    </div>
  </div>
</section>`
  }).join('\n')

  const tocHTML = project.scenes
    .map((scene, idx) => `<li><a href="#scene-${idx}">${escapeHtml(scene.title)}</a></li>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Serif+JP:wght@300;400;700&family=Zen+Antique+Soft&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:              ${theme.bg};
      --bg-rgb:          ${theme.bgRgb};
      --text:            ${theme.text};
      --glass-bg:        ${theme.glassBg};
      --glass-bg-opaque: ${theme.glassBgOpaque};
      --glass-border:    ${theme.glassBorder};
      --accent:          ${theme.accent};
      --font-size:       ${fontSize}px;
      --text-width:      min(${textWidth}px, calc(100vw - 80px));
      --font-display: 'Zen Antique Soft', '游明朝', 'YuMincho', 'Hiragino Mincho ProN', serif;
      --font-body:    'Noto Serif JP', '游明朝', 'YuMincho', Georgia, serif;
      --font-label:   'DM Mono', 'Consolas', 'Courier New', monospace;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-body);
      font-size: var(--font-size);
      line-height: 2.1;
      letter-spacing: ${letterSpacing}em;
    }

    /* ── Progress bar ── */
    .progress {
      position: fixed; top: 0; left: 0;
      height: 2px; width: 0;
      background: var(--accent);
      z-index: 9999;
      transition: width 0.1s;
      pointer-events: none;
    }

    /* ── Header ── */
    .header {
      position: fixed; top: 0; left: 0; right: 0;
      z-index: 200;
      padding: 14px 28px;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      transition: background 0.4s, backdrop-filter 0.4s, -webkit-backdrop-filter 0.4s;
    }
    .header.scrolled {
      background: rgba(var(--bg-rgb), 0.88);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--glass-border);
    }
    .header-left  { display: flex; align-items: center; }
    .header-right { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }

    .header-title {
      font-family: var(--font-display);
      font-size: 0.95em; font-weight: normal;
      margin: 0; text-align: center;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      color: rgba(255,255,255,0.92);
      transition: color 0.4s;
    }
    .header.scrolled .header-title { color: var(--text); }

    .toc-toggle, .hdr-share-btn {
      background: none;
      border: 1px solid rgba(255,255,255,0.3);
      color: rgba(255,255,255,0.88);
      cursor: pointer;
      transition: border-color 0.4s, color 0.4s, opacity 0.15s;
    }
    .toc-toggle {
      padding: 6px 14px; border-radius: 4px;
      font-family: var(--font-body); font-size: 0.82em; white-space: nowrap;
    }
    .hdr-share-btn {
      width: 32px; height: 32px; border-radius: 4px;
      font-size: 0.7em; font-weight: bold;
      display: inline-flex; align-items: center; justify-content: center; padding: 0;
    }
    .header.scrolled .toc-toggle,
    .header.scrolled .hdr-share-btn { border-color: var(--glass-border); color: var(--text); }
    .toc-toggle:hover, .hdr-share-btn:hover { opacity: 0.65; }
    @media (max-width: 480px) { .hdr-share-btn { display: none; } }

    /* ── TOC ── */
    .toc-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      z-index: 300;
    }
    .toc-overlay.open { display: block; }
    .toc-panel {
      position: fixed; top: 0; left: 0;
      height: 100%; width: 300px; max-width: 85vw;
      background: var(--bg);
      padding: 60px 32px 32px;
      overflow-y: auto; z-index: 301;
      box-shadow: 6px 0 40px rgba(0,0,0,0.5);
      border-right: 1px solid var(--glass-border);
    }
    .toc-panel h2 {
      font-family: var(--font-label); font-size: 0.7em; font-weight: 500;
      letter-spacing: 0.2em; opacity: 0.45; margin-bottom: 20px;
    }
    .toc-panel ul { list-style: none; }
    .toc-panel li { border-bottom: 1px solid var(--glass-border); }
    .toc-panel a {
      display: block; padding: 12px 0;
      color: var(--text); text-decoration: none;
      font-size: 0.88em; line-height: 1.6; letter-spacing: 0.02em;
    }
    .toc-panel a:hover { color: var(--accent); }

    /* ── Scene: sticky background ── */
    .scene { position: relative; }

    .scene-bg {
      position: sticky; top: 0;
      height: 100vh;
      background-size: cover; background-position: center;
      background-color: var(--bg);
      margin-bottom: -100vh;   /* pull next sibling up — doesn't affect parent height */
      z-index: 0; overflow: hidden;
    }

    /* Per-scene overlay: flat darkening for image brightness compensation */
    .scene-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.22);
    }
    .no-image .scene-bg {
      background-image:
        radial-gradient(ellipse 90% 60% at 65% 35%, rgba(255,255,255,0.04) 0%, transparent 70%),
        radial-gradient(ellipse 60% 50% at 20% 75%, rgba(255,255,255,0.025) 0%, transparent 65%) !important;
    }
    .no-image .scene-overlay { background: rgba(0,0,0,0.38); }

    /* Fixed viewport-bottom gradient — independent of scroll.
       Creates persistent dark vignette at bottom so chapter-card text is always readable.
       z-index: 1 = above scene-bg (0) but below scene-body (2). */
    .vn-gradient {
      position: fixed; bottom: 0; left: 0; right: 0;
      height: 62vh;
      background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.68) 62%, rgba(0,0,0,0.85) 100%);
      pointer-events: none;
      z-index: 1;
    }

    /* Chapter card — shown over the background */
    .scene-card {
      position: absolute; bottom: 26%; left: 50%;
      transform: translateX(-50%);
      text-align: center;
      width: min(700px, 88vw);
    }
    .scene-num {
      font-family: var(--font-label);
      font-size: 0.68em; letter-spacing: 0.28em;
      color: rgba(255,255,255,0.5); margin-bottom: 14px;
    }
    .scene-card-title {
      font-family: var(--font-display);
      font-size: clamp(1.5em, 4vw, 2.6em); font-weight: normal;
      line-height: 1.45; color: #fff;
      text-shadow: 0 2px 28px rgba(0,0,0,0.65);
      margin-bottom: 18px;
    }
    .scene-card-pull {
      font-family: var(--font-body);
      font-size: 0.84em; color: rgba(255,255,255,0.65);
      line-height: 1.9; letter-spacing: 0.04em;
      max-width: 420px; margin: 0 auto;
    }

    /* ── Glass text box ── */
    .scene-body {
      position: relative; z-index: 2;   /* above .vn-gradient (1) and .scene-bg (0) */
      padding: 84vh 40px 100px;
    }
    .scene-glass {
      max-width: var(--text-width); margin: 0 auto;
      background: var(--glass-bg);
      backdrop-filter: blur(22px) saturate(160%);
      -webkit-backdrop-filter: blur(22px) saturate(160%);
      border: 1px solid var(--glass-border);
      padding: 52px 68px;
    }
    .scene-text p {
      margin: 0 0 1.4em;
      text-indent: ${noIndent ? '0' : '1em'};
    }
    .scene-text p:first-child { margin-top: 0; }
    .scene-text blockquote {
      border-left: 2px solid var(--accent);
      padding-left: 1.2em; margin: 0 0 1.4em; opacity: 0.82;
    }
    .scene-text blockquote p { font-style: italic; margin: 0.3em 0 0; text-indent: 0; }
    .scene-text blockquote p:first-child { margin-top: 0; }
    .scene-text code {
      font-family: var(--font-label);
      background: rgba(128,128,128,0.15);
      padding: 0 5px; font-size: 0.88em;
    }

    /* ── Share section ── */
    .share-section {
      max-width: var(--text-width); margin: 0 auto 120px;
      padding: 48px 40px 0; text-align: center;
    }
    .share-section-heading {
      font-family: var(--font-label);
      font-size: 0.7em; letter-spacing: 0.22em; opacity: 0.4;
      margin-bottom: 20px;
    }
    .share-buttons-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .share-big-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 20px; border: none; cursor: pointer;
      font-family: var(--font-body); font-size: 0.85em; font-weight: bold;
      color: #fff; transition: opacity 0.15s; letter-spacing: 0.02em;
    }
    .share-big-btn:hover { opacity: 0.8; }
    .btn-x    { background: #111; }
    .btn-fb   { background: #1877F2; }
    .btn-line { background: #06C755; }
    .btn-copy { background: var(--glass-bg-opaque); color: var(--text); border: 1px solid var(--glass-border); }

    /* ── Mobile ── */
    @media (max-width: 640px) {
      /* On mobile: image shown normally above text, no sticky */
      .scene-bg {
        position: relative;
        height: 56vw; min-height: 200px; max-height: 340px;
        margin-bottom: 0;
      }
      .scene-card { bottom: 12%; }
      .scene-card-title { font-size: 1.35em; }
      .scene-card-pull { display: none; }
      /* Body starts right after the image */
      .scene-body { padding: 0 0 64px; }
      /* Near-opaque box for contrast on mobile — 12px margins, full width feel */
      .scene-glass {
        max-width: none;
        margin: 0 12px;
        padding: 24px 16px;
        background: var(--glass-bg-opaque);
        backdrop-filter: none; -webkit-backdrop-filter: none;
        border-left: none; border-right: none;
      }
      .share-section { padding: 32px 16px 0; }
      .toc-panel { width: 260px; padding: 48px 24px 24px; }
    }
  </style>
</head>
<body>
  <div class="progress" id="progress"></div>
  <!-- Fixed viewport-bottom gradient: stays at screen bottom regardless of scroll -->
  <div class="vn-gradient" aria-hidden="true"></div>

  <header class="header" id="header">
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
      <h2>目 次</h2>
      <ul>${tocHTML}</ul>
    </nav>
  </div>

  ${scenesHTML}

  <div class="share-section">
    <p class="share-section-heading">SHARE THIS STORY</p>
    <div class="share-buttons-row">
      <button class="share-big-btn btn-x"    onclick="shareX()">&#120143; Xでシェア</button>
      <button class="share-big-btn btn-fb"   onclick="shareFB()">f Facebookでシェア</button>
      <button class="share-big-btn btn-line" onclick="shareLine()">LINE LINEでシェア</button>
      <button class="share-big-btn btn-copy" id="main-copy-btn" onclick="copyUrl('main')">&#128279; URLをコピー</button>
    </div>
  </div>

  <script>
    function toggleToc() { document.getElementById('toc-overlay').classList.toggle('open'); }
    function closeToc()  { document.getElementById('toc-overlay').classList.remove('open'); }
    document.querySelectorAll('.toc-panel a').forEach(a => a.addEventListener('click', closeToc));

    const hdr = document.getElementById('header');

    window.addEventListener('scroll', function() {
      var s = window.scrollY;
      hdr.classList.toggle('scrolled', s > 60);
      var total = document.documentElement.scrollHeight - window.innerHeight;
      document.getElementById('progress').style.width = (total > 0 ? s / total * 100 : 0) + '%';
    }, { passive: true });

    // Share
    const PAGE_TITLE = ${JSON.stringify(project.title)};
    function shareX()    { window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(PAGE_TITLE) + '&url=' + encodeURIComponent(location.href), '_blank'); }
    function shareFB()   { window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(location.href), '_blank'); }
    function shareLine() { window.open('https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(location.href) + '&text=' + encodeURIComponent(PAGE_TITLE), '_blank'); }
    function copyUrl(src) {
      const btn = document.getElementById(src === 'hdr' ? 'hdr-copy-btn' : 'main-copy-btn');
      const orig = btn.innerHTML;
      const doCopy = () => {
        if (navigator.clipboard) return navigator.clipboard.writeText(location.href);
        const ta = Object.assign(document.createElement('textarea'), { value: location.href });
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta); return Promise.resolve();
      };
      doCopy().then(() => { btn.textContent = '✓ コピー済み'; setTimeout(() => { btn.innerHTML = orig; }, 2000); });
    }
  </script>
</body>
</html>`
}

// ── Reader-mode export: clean layout matching the in-app reader ────────────

export function exportToReaderHTML(project, readerSettings = {}) {
  const {
    fontSize = 18,
    lineHeight = 2.0,
    letterSpacing = 0.05,
    fontFamily = 'serif',
    colorTheme = 'light',
    textWidth = 680,
    noIndent = false,
    imagePlacement = 'above',
  } = readerSettings

  const themes = {
    light: { bg: '#f8f9fa', headerBg: '#ffffff', headerBorder: '#e5e7eb', text: '#1a1a2e', meta: '#9ca3af', panelBg: '#ffffff' },
    dark:  { bg: '#111827', headerBg: '#1a1a2e', headerBorder: '#374151', text: '#e8e8f0', meta: '#6b7280', panelBg: '#1f2937' },
    sepia: { bg: '#f0e8d8', headerBg: '#f4ede4', headerBorder: '#d4b99a', text: '#3d2b1f', meta: '#8b7355', panelBg: '#f4ede4' },
  }
  const theme = themes[colorTheme] || themes.light

  const fontStack = fontFamily === 'serif'
    ? '"游明朝", "YuMincho", "Hiragino Mincho ProN", Georgia, serif'
    : '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif'

  const renderScene = (scene, idx) => {
    const imgTag = scene.image
      ? `<img src="${scene.image}" alt="${escapeHtml(scene.title)}" loading="lazy" style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);display:block;">`
      : ''

    const metaEl = (scene.location || scene.timeOfDay)
      ? `<p style="font-size:0.85em;color:${theme.meta};margin:0 0 24px;font-family:${fontStack};">${[scene.location, scene.timeOfDay].filter(Boolean).map(escapeHtml).join(' · ')}</p>`
      : ''

    const titleEl = `<h2 style="font-family:${fontStack};font-size:${Math.round(fontSize * 1.3)}px;color:${theme.text};border-bottom:2px solid ${theme.meta}33;padding-bottom:8px;margin:0 0 8px;">${escapeHtml(scene.title)}</h2>`
    const textEl  = `<div class="scene-text">${markdownToHtml(scene.content, noIndent)}</div>`

    const isSide = imgTag && (imagePlacement === 'left' || imagePlacement === 'right')

    if (isSide) {
      return `
<section id="scene-${idx}" style="margin-bottom:80px;">
  <div style="display:flex;flex-direction:${imagePlacement === 'left' ? 'row' : 'row-reverse'};gap:40px;align-items:flex-start;">
    <div style="flex-shrink:0;width:38%;position:sticky;top:80px;align-self:flex-start;">${imgTag}</div>
    <div style="flex:1;min-width:0;">${titleEl}${metaEl}${textEl}</div>
  </div>
</section>`
    }

    return `
<section id="scene-${idx}" style="margin-bottom:80px;">
  ${imgTag ? `<div style="text-align:center;margin-bottom:36px;max-height:600px;overflow:hidden;">${imgTag}</div>` : ''}
  ${titleEl}${metaEl}${textEl}
</section>`
  }

  const scenesHTML = project.scenes.map((scene, idx) => renderScene(scene, idx)).join('\n')
  const sceneCount = project.scenes.length

  const tocHTML = project.scenes
    .map((scene, idx) => `<li><a href="#scene-${idx}">${escapeHtml(scene.title)}</a></li>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:            ${theme.bg};
      --header-bg:     ${theme.headerBg};
      --header-border: ${theme.headerBorder};
      --text:          ${theme.text};
      --meta:          ${theme.meta};
      --panel-bg:      ${theme.panelBg};
      --accent:        #6366f1;
    }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: ${fontStack};
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing}em;
    }

    /* Progress bar */
    .progress {
      position: fixed; top: 0; left: 0;
      height: 3px; width: 0;
      background: var(--accent);
      z-index: 9999; pointer-events: none;
      transition: width 0.1s;
    }

    /* Header */
    .header {
      position: sticky; top: 0; z-index: 100;
      background: var(--header-bg);
      border-bottom: 1px solid var(--header-border);
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .header-title { font-size: 0.9em; font-weight: 600; color: var(--text); }
    .hdr-right { display: flex; gap: 8px; align-items: center; }
    .hdr-btn {
      background: none;
      border: 1px solid var(--header-border);
      border-radius: 6px; padding: 6px 10px;
      cursor: pointer; font-size: 0.8em; color: var(--text);
    }
    .hdr-btn:hover { opacity: 0.7; }

    /* Content */
    .content {
      max-width: ${textWidth}px; margin: 0 auto;
      padding: 48px 24px 80px;
    }

    /* Scene text */
    .scene-text p {
      margin: 0 0 1.2em;
      text-indent: ${noIndent ? '0' : '1em'};
      font-family: ${fontStack};
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing}em;
      color: var(--text);
    }
    .scene-text p:first-child { margin-top: 0; }
    .scene-text blockquote {
      border-left: 3px solid var(--meta);
      padding-left: 1em; margin: 0 0 1.2em;
      opacity: 0.85;
    }
    .scene-text blockquote p { font-style: italic; text-indent: 0; }
    .scene-text code {
      font-family: monospace;
      background: rgba(0,0,0,0.07); padding: 0 4px;
      border-radius: 3px; font-size: 0.9em;
    }

    /* Share */
    .share-section {
      max-width: ${textWidth}px; margin: 0 auto 80px;
      padding: 40px 24px 0; text-align: center;
    }
    .share-label {
      font-family: monospace;
      font-size: 0.75em; letter-spacing: 0.18em;
      opacity: 0.45; margin-bottom: 16px;
    }
    .share-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .share-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border: none; cursor: pointer;
      font-size: 0.85em; font-weight: bold;
      color: #fff; transition: opacity 0.15s;
    }
    .share-btn:hover { opacity: 0.8; }
    .btn-x    { background: #111; }
    .btn-fb   { background: #1877F2; }
    .btn-line { background: #06C755; }
    .btn-copy { background: var(--header-bg); color: var(--text); border: 1px solid var(--header-border); }

    /* TOC */
    .toc-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 200;
    }
    .toc-overlay.open { display: block; }
    .toc-panel {
      position: fixed; top: 0; right: 0;
      height: 100%; width: 280px; max-width: 85vw;
      background: var(--panel-bg);
      padding: 24px; overflow-y: auto; z-index: 201;
      box-shadow: -4px 0 20px rgba(0,0,0,0.2);
    }
    .toc-panel-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .toc-panel h2 { margin: 0; font-size: 1em; font-weight: 700; color: var(--text); }
    .toc-close { background: none; border: none; cursor: pointer; font-size: 1.2em; color: var(--meta); line-height: 1; }
    .toc-panel ul { list-style: none; }
    .toc-panel li { border-bottom: 1px solid var(--header-border); }
    .toc-panel a {
      display: block; padding: 10px 0;
      color: var(--text); text-decoration: none;
      font-size: 0.9em; line-height: 1.5;
    }
    .toc-panel a:hover { color: var(--accent); }

    @media (max-width: 640px) {
      .content { padding: 32px 16px 64px; }
      .share-section { padding: 32px 16px 0; }
    }
  </style>
</head>
<body>
  <div class="progress" id="progress"></div>

  <header class="header">
    <span class="header-title">${escapeHtml(project.title)}</span>
    <div class="hdr-right">
      <span id="scene-counter" style="font-size:0.8em;color:var(--meta);">1/${sceneCount}</span>
      <button class="hdr-btn" onclick="toggleToc()">📋 目次</button>
    </div>
  </header>

  <div class="toc-overlay" id="toc-overlay" onclick="closeToc()">
    <nav class="toc-panel" onclick="event.stopPropagation()">
      <div class="toc-panel-hdr">
        <h2>目次</h2>
        <button class="toc-close" onclick="closeToc()">✕</button>
      </div>
      <ul>${tocHTML}</ul>
    </nav>
  </div>

  <main class="content">
    ${scenesHTML}
  </main>

  <div class="share-section">
    <p class="share-label">SHARE THIS STORY</p>
    <div class="share-row">
      <button class="share-btn btn-x"    onclick="shareX()">&#120143; Xでシェア</button>
      <button class="share-btn btn-fb"   onclick="shareFB()">f Facebookでシェア</button>
      <button class="share-btn btn-line" onclick="shareLine()">LINE LINEでシェア</button>
      <button class="share-btn btn-copy" id="rd-copy-btn" onclick="copyUrl()">&#128279; URLをコピー</button>
    </div>
  </div>

  <script>
    function toggleToc() { document.getElementById('toc-overlay').classList.toggle('open'); }
    function closeToc()  { document.getElementById('toc-overlay').classList.remove('open'); }
    document.querySelectorAll('.toc-panel a').forEach(function(a) { a.addEventListener('click', closeToc); });

    var sections = Array.from(document.querySelectorAll('section[id^="scene-"]'));
    var counter  = document.getElementById('scene-counter');
    var total    = ${sceneCount};

    window.addEventListener('scroll', function() {
      var s = window.scrollY;
      var totalH = document.documentElement.scrollHeight - window.innerHeight;
      document.getElementById('progress').style.width = (totalH > 0 ? s / totalH * 100 : 0) + '%';
      var cur = 0;
      sections.forEach(function(sec, i) { if (sec.getBoundingClientRect().top <= 200) cur = i; });
      counter.textContent = (cur + 1) + '/' + total;
    }, { passive: true });

    const PAGE_TITLE = ${JSON.stringify(project.title)};
    function shareX()    { window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(PAGE_TITLE) + '&url=' + encodeURIComponent(location.href), '_blank'); }
    function shareFB()   { window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(location.href), '_blank'); }
    function shareLine() { window.open('https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(location.href) + '&text=' + encodeURIComponent(PAGE_TITLE), '_blank'); }
    function copyUrl() {
      var btn = document.getElementById('rd-copy-btn');
      var orig = btn.innerHTML;
      var doCopy = function() {
        if (navigator.clipboard) return navigator.clipboard.writeText(location.href);
        var ta = Object.assign(document.createElement('textarea'), { value: location.href });
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta); return Promise.resolve();
      };
      doCopy().then(function() { btn.textContent = '✓ コピー済み'; setTimeout(function() { btn.innerHTML = orig; }, 2000); });
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

/** Open the generated HTML in a new browser tab for preview. */
export function previewHTML(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // Revoke after 2 minutes to free memory (tab keeps a copy once loaded)
  setTimeout(() => URL.revokeObjectURL(url), 120_000)
}
