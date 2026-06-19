/* ═══════════════════════════════════════════════
   COLLAB NOVELLA READER — APP.JS
   Bilingual (EN/BN) collaborative novella reader.
   Config: data/config.json
   Author bios: data/authors.txt
   ═══════════════════════════════════════════════ */

'use strict';

const State = {
  lang:           'en',   // 'en' | 'bn'
  config:         null,
  authors:        [],     // parsed from authors.txt
  currentChapter: -1,     // index into config.chapters
  chapterCache:   {},     // { 'en-0': text, 'bn-0': text, ... }
  fontSize:       'font-md',
};

// ── INIT ──────────────────────────────────────────
async function init() {
  document.body.classList.add(State.fontSize);
  setupMobile();

  try {
    State.config  = await fetchJSON('data/config.json');
    State.authors = await parseAuthors('data/authors.txt');
    applyBranding();
    buildSidebar();
    showWelcome();
  } catch (e) {
    console.error('Init failed:', e);
    showLoadError('Could not load config.json. Check that the file exists in data/.');
  }
}

// ── BRANDING ──────────────────────────────────────
function applyBranding() {
  const cfg = State.config;
  const L   = State.lang;

  const title = L === 'bn' ? cfg.title_bn : cfg.title_en;
  const sub   = L === 'bn' ? cfg.subtitle_bn : cfg.subtitle_en;

  document.title = title;
  setText('novella-title', title);
  setText('novella-sub', sub);
  setText('mob-title', title);
  setText('pub-label', cfg.publisher || 'Fractured Cynicism');
}

// ── SIDEBAR ───────────────────────────────────────
function buildSidebar() {
  const cfg  = State.config;
  const L    = State.lang;
  const list = document.getElementById('chapter-list');
  if (!list) return;

  list.innerHTML = cfg.chapters.map((ch, i) => `
    <div class="chapter-item ${i === State.currentChapter ? 'active' : ''}"
         data-index="${i}" onclick="loadChapter(${i})">
      <div class="ch-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="ch-info">
        <div class="ch-title">${esc(L === 'bn' ? ch.title_bn : ch.title_en)}</div>
        <div class="ch-author">${esc(L === 'bn' ? ch.author_bn : ch.author_en)}</div>
      </div>
    </div>
  `).join('');

  // Sync to mobile drawer
  const mob = document.getElementById('mob-chapter-list');
  if (mob) mob.innerHTML = list.innerHTML;
}

function updateSidebarActive(index) {
  document.querySelectorAll('.chapter-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
}

// ── LANGUAGE TOGGLE ───────────────────────────────
function setLang(lang) {
  State.lang = lang;
  document.body.classList.toggle('lang-bn', lang === 'bn');

  // Update toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Re-apply all text
  applyBranding();
  buildSidebar();

  // Re-render current chapter if one is open
  if (State.currentChapter >= 0) {
    loadChapter(State.currentChapter);
  } else {
    showWelcome();
  }
}

// ── WELCOME SCREEN ────────────────────────────────
function showWelcome() {
  const cfg = State.config;
  const L   = State.lang;

  const el = document.getElementById('reader-content');
  if (!el) return;

  const voices = cfg.chapters.map((ch, i) => `
    <div class="voice-row" onclick="loadChapter(${i})">
      <div class="voice-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="voice-name">${esc(L === 'bn' ? ch.author_bn : ch.author_en)}</div>
      <div class="voice-role">${esc(L === 'bn' ? ch.author_role_bn : ch.author_role_en)}</div>
    </div>
  `).join('');

  el.innerHTML = `
    <div id="welcome" class="fade-in">
      <div class="welcome-pub">${esc(cfg.publisher || 'Fractured Cynicism')} · ${cfg.year || ''}</div>
      <div class="welcome-title">${esc(L === 'bn' ? cfg.title_bn : cfg.title_en)}</div>
      <div class="welcome-sub">${esc(L === 'bn' ? cfg.subtitle_bn : cfg.subtitle_en)}</div>
      <div class="welcome-rule"></div>
      <div class="welcome-voices">
        <div class="voices-label">${L === 'bn' ? 'চার কণ্ঠ' : 'Four Voices'}</div>
        ${voices}
      </div>
      <button class="begin-btn" onclick="loadChapter(0)">
        ${L === 'bn' ? 'পড়া শুরু করুন' : 'Begin Reading'}
      </button>
    </div>
  `;

  updateTopbar(L === 'bn' ? cfg.title_bn : cfg.title_en, '');
  updateProgress(0);
  State.currentChapter = -1;
  updateSidebarActive(-1);
}

// ── LOAD CHAPTER ──────────────────────────────────
async function loadChapter(index) {
  const cfg = State.config;
  if (index < 0 || index >= cfg.chapters.length) return;

  State.currentChapter = index;
  updateSidebarActive(index);
  closeMobileDrawer();

  const el = document.getElementById('reader-content');
  if (el) el.innerHTML = `
    <div id="loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">${State.lang === 'bn' ? 'লোড হচ্ছে…' : 'Loading…'}</div>
    </div>`;

  const ch  = cfg.chapters[index];
  const L   = State.lang;
  const key = `${L}-${index}`;

  // Fetch text (with cache)
  let rawText = State.chapterCache[key];
  if (!rawText) {
    try {
      rawText = await fetchText(L === 'bn' ? ch.file_bn : ch.file_en);
      State.chapterCache[key] = rawText;
    } catch (e) {
      showLoadError(`Could not load ${L === 'bn' ? ch.file_bn : ch.file_en}`);
      return;
    }
  }

  // Get author bio
  const authorName = L === 'bn' ? ch.author_bn : ch.author_en;
  const authorRole = L === 'bn' ? ch.author_role_bn : ch.author_role_en;
  const authorData = State.authors.find(a =>
    a.name_en === ch.author_en || a.name_bn === ch.author_bn
  );
  const bio = authorData
    ? (L === 'bn' ? authorData.bio_bn : authorData.bio_en)
    : '';

  const chTitle = L === 'bn' ? ch.title_bn : ch.title_en;
  const seriesTitle = L === 'bn' ? cfg.title_bn : cfg.title_en;

  const prose = processText(stripMeta(rawText));
  const isFirst = index === 0;
  const isLast  = index === cfg.chapters.length - 1;

  if (el) {
    el.innerHTML = `
      <div id="chapter-view" class="fade-in">

        <div class="author-card">
          <div class="author-card-top">
            <div class="author-name">${esc(authorName)}</div>
            <div class="author-role-badge">${esc(authorRole)}</div>
          </div>
          ${bio ? `<div class="author-bio">${esc(bio)}</div>` : ''}
        </div>

        <div class="chapter-header">
          <div class="chapter-eyebrow">${esc(seriesTitle)}</div>
          <div class="chapter-title">${esc(chTitle)}</div>
        </div>

        <div class="prose">${prose}</div>

        <div class="chapter-footer">
          <button class="foot-btn" onclick="loadChapter(${index - 1})"
            ${isFirst ? 'disabled' : ''}>
            ← ${L === 'bn' ? 'আগের অধ্যায়' : 'Previous'}
          </button>
          <span class="foot-label">${index + 1} / ${cfg.chapters.length}</span>
          <button class="foot-btn" onclick="loadChapter(${index + 1})"
            ${isLast ? 'disabled' : ''}>
            ${L === 'bn' ? 'পরের অধ্যায়' : 'Next'} →
          </button>
        </div>

      </div>
    `;
    el.scrollTop = 0;
  }

  updateTopbar(seriesTitle, chTitle);
  setupScrollTracking();
  updateProgress(0);
}

// ── TEXT PROCESSING ───────────────────────────────
function stripMeta(raw) {
  const lines = raw.split('\n');
  const metaRx = /^(AUTHOR|AUTHOR_BN|AUTHOR_ROLE|TITLE|SUBTITLE|SETTING)\s*[:：]/i;
  const sepRx  = /^[═=─\-*]{4,}$/;
  let end = 0, inMeta = false;

  for (let i = 0; i < Math.min(lines.length, 60); i++) {
    const t = lines[i].trim();
    if (sepRx.test(t) || metaRx.test(t)) { inMeta = true; end = i + 1; }
    else if (inMeta && t === '')          { end = i + 1; }
    else if (inMeta && t !== '')          { break; }
  }
  return lines.slice(end).join('\n');
}

// Detects "wall of text" blocks — runs of consecutive non-blank lines
// that are too long to be intentional short lines (dialogue, verse)
// and are almost certainly hard-wrapped paragraphs from a Word/Docs
// export with no blank line inserted between them. Unlike a global
// file-wide ratio, this looks at each run independently, so a file
// that mixes some properly-spaced sections with some wall-of-text
// sections gets fixed in the right places only.
//
// A run of N consecutive non-blank lines is treated as "needs splitting"
// if N is large (say 6+) — a real paragraph-per-blank-line file rarely
// has 6+ unbroken lines in a row without hitting a blank line, while a
// wall-of-text file can have 50-200+ in a row.
const WALL_OF_TEXT_RUN_THRESHOLD = 6;

function processText(raw) {
  const lines = raw.split('\n');
  let html = '';

  // First pass: group lines into blocks separated by blank lines /
  // scene breaks / timestamps, tracking the run length of each block.
  let block = [];
  const blocks = []; // { type: 'prose'|'scene'|'timestamp', lines: [...] }

  const pushBlock = () => {
    if (block.length) blocks.push({ type: 'prose', lines: block });
    block = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (/^(\*{3,}|—{3,}|-{3,}|·{3,})$/.test(t)) {
      pushBlock();
      blocks.push({ type: 'scene', lines: [] });
    } else if (/^\*[^*]{2,}\*$/.test(t) && t.length < 120) {
      pushBlock();
      blocks.push({ type: 'timestamp', lines: [t.slice(1, -1)] });
    } else if (t === '') {
      pushBlock();
    } else {
      block.push(t);
    }
  }
  pushBlock();

  // Second pass: render each block. Prose blocks longer than the
  // threshold are treated as wall-of-text and split — one line per
  // paragraph. Shorter prose blocks (normal blank-line-separated
  // paragraphs) are joined as a single paragraph, as before.
  for (const b of blocks) {
    if (b.type === 'scene') {
      html += `<div class="scene-break">· · ·</div>`;
    } else if (b.type === 'timestamp') {
      html += `<span class="timestamp-line">${esc(b.lines[0])}</span>`;
    } else if (b.type === 'prose' && b.lines.length) {
      if (b.lines.length >= WALL_OF_TEXT_RUN_THRESHOLD) {
        // Wall-of-text run — each line is its own paragraph
        for (const l of b.lines) html += `<p>${esc(l)}</p>`;
      } else {
        // Normal short block — join into a single paragraph
        html += `<p>${esc(b.lines.join(' '))}</p>`;
      }
    }
  }

  return html;
}

// ── AUTHOR BIO PARSER ─────────────────────────────
async function parseAuthors(url) {
  let raw = '';
  try { raw = await fetchText(url); } catch { return []; }

  const authors = [];
  let current = null;

  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (/^AUTHOR\s*:/i.test(t) && !/^AUTHOR_BN/i.test(t) && !/^AUTHOR_ROLE/i.test(t)) {
      if (current) authors.push(current);
      current = { name_en: t.replace(/^AUTHOR\s*:\s*/i, '').trim(), name_bn: '', bio_en: '', bio_bn: '' };
    } else if (/^AUTHOR_BN\s*:/i.test(t) && current) {
      current.name_bn = t.replace(/^AUTHOR_BN\s*:\s*/i, '').trim();
    } else if (/^BIO_EN\s*:/i.test(t) && current) {
      current.bio_en = t.replace(/^BIO_EN\s*:\s*/i, '').trim();
    } else if (/^BIO_BN\s*:/i.test(t) && current) {
      current.bio_bn = t.replace(/^BIO_BN\s*:\s*/i, '').trim();
    }
  }
  if (current) authors.push(current);
  return authors;
}

// ── TOPBAR ────────────────────────────────────────
function updateTopbar(series, chapter) {
  const el = document.getElementById('topbar-loc');
  if (!el) return;
  el.innerHTML = chapter
    ? `<span>${esc(series)}</span><span style="margin:0 8px;opacity:0.3">·</span><span class="current">${esc(chapter)}</span>`
    : `<span>${esc(series)}</span>`;
}

// ── SCROLL TRACKING ───────────────────────────────
function setupScrollTracking() {
  const panel = document.getElementById('reader');
  if (!panel) return;
  panel.onscroll = () => {
    const pct = panel.scrollHeight - panel.clientHeight > 0
      ? Math.round((panel.scrollTop / (panel.scrollHeight - panel.clientHeight)) * 100) : 0;
    updateProgress(pct);
  };
}

function updateProgress(pct) {
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
}

// ── FONT SIZE ─────────────────────────────────────
function changeFontSize(delta) {
  const sizes = ['font-sm', 'font-md', 'font-lg', 'font-xl'];
  const i = sizes.indexOf(State.fontSize);
  const next = i + delta;
  if (next < 0 || next >= sizes.length) return;
  document.body.classList.remove(State.fontSize);
  State.fontSize = sizes[next];
  document.body.classList.add(State.fontSize);
}

// ── MOBILE ────────────────────────────────────────
function setupMobile() {
  const overlay = document.getElementById('drawer-overlay');
  if (overlay) overlay.addEventListener('click', closeMobileDrawer);
}

function toggleMobileDrawer() {
  const drawer  = document.getElementById('mob-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const btn     = document.getElementById('mob-nav-btn');
  if (!drawer) return;
  const open = drawer.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open', open);
  if (btn)     btn.classList.toggle('active', open);
}

function closeMobileDrawer() {
  const drawer  = document.getElementById('mob-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const btn     = document.getElementById('mob-nav-btn');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (btn)     btn.classList.remove('active');
}

// ── KEYBOARD ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.altKey && e.key === 'ArrowRight') loadChapter(State.currentChapter + 1);
  if (e.altKey && e.key === 'ArrowLeft')  loadChapter(State.currentChapter - 1);
  if (e.key === 'Escape') closeMobileDrawer();
});

// ── HELPERS ───────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '';
}
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.text();
}
function showLoadError(msg) {
  const el = document.getElementById('reader-content');
  if (el) el.innerHTML = `<div id="loading"><div class="loading-text" style="color:#8A3020;max-width:300px;text-align:center;line-height:1.7">${msg}</div></div>`;
}

// ── GLOBALS & START ───────────────────────────────
window.loadChapter      = loadChapter;
window.setLang          = setLang;
window.changeFontSize   = changeFontSize;
window.toggleMobileDrawer = toggleMobileDrawer;
window.showWelcome      = showWelcome;

document.addEventListener('DOMContentLoaded', init);
