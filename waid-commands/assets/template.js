// InteractiveJS — full implementation for waid-commands HTML report.
// Wrapped in IIFE; exposes window.WAID = { init, setView, setTheme, getState }.
// Tech: vanilla ES2020 — no bundler, no transpiler, no import/require.
// Tokens: --waid-color-quiz-correct, --waid-color-quiz-incorrect, --waid-duration-fast,
//         --waid-duration-medium, --waid-z-tooltip (all owned by CSS; referenced in comments only).

(function () {
  'use strict';

  // ─── Internal state ────────────────────────────────────────────────────────

  let _initialized = false;
  let _analysis = null;
  let _glossaryIndex = new Map(); // term → { layman, technical }
  let _collapsedSections = new Set();
  let _mermaidSvg = null;         // last rendered SVG string
  let _scrollSpyObserver = null;
  let _mediaQueryDark = null;

  // ─── localStorage helpers (tolerates private browsing) ────────────────────

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* ignore */ }
  }

  // ─── Custom event helper ───────────────────────────────────────────────────

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  // ─── Minimal Markdown renderer (safe: HTML-escaped first, then patterns) ───
  // Only: **bold**, *italic*, `code`, [text](url), newlines → <br>.
  // No raw HTML passthrough.

  function _md(str) {
    if (!str) return '';
    // 1. HTML-escape
    let s = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    // 2. Apply safe Markdown patterns on the escaped string
    s = s
      // `code`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // **bold**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // *italic* (only after bold consumed)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // [text](url) — only https?:// URLs allowed
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
      // newlines
      .replace(/\n/g, '<br>');
    return s;
  }

  // ─── Safe slot fill (textContent by default; mdSlots use _md + innerHTML) ─

  const MD_SLOTS = new Set(['technical', 'layman', 'explanation-layman', 'explanation-technical',
    'analogy', 'why', 'tradeoffs', 'complexity', 'location']);

  function fillSlots(fragment, data) {
    fragment.querySelectorAll('[data-waid-slot]').forEach(function (el) {
      const slot = el.getAttribute('data-waid-slot');
      const value = data[slot];
      if (value === undefined || value === null) return;
      if (MD_SLOTS.has(slot)) {
        // Limited Markdown path — safe because input is first HTML-escaped in _md()
        el.innerHTML = _md(String(value));
      } else {
        el.textContent = String(value);
      }
    });
  }

  // ─── Clone a <template> and fill slots ────────────────────────────────────

  function cloneTemplate(id, data) {
    const tpl = document.getElementById(id);
    if (!tpl) { console.warn('[WAID] missing template #' + id); return null; }
    const frag = tpl.content.cloneNode(true);
    if (data) fillSlots(frag, data);
    return frag;
  }

  // ─── Mermaid theme resolution ──────────────────────────────────────────────

  function resolveMermaidTheme() {
    const root = document.getElementById('waid-root');
    const waidTheme = root ? root.dataset.waidTheme : 'auto';
    if (waidTheme === 'light') return 'default';
    if (waidTheme === 'dark')  return 'dark';
    // auto: check OS preference
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark' : 'default';
  }

  // ─── Mermaid hydration (async; degrades gracefully) ───────────────────────

  function _hydrateMermaid(source) {
    const container = document.getElementById('waid-arch-diagram');
    if (!container) return;

    if (!source) {
      container.innerHTML = '<p class="waid-mermaid-fallback">No diagram available.</p>';
      return;
    }

    function renderWithMermaid() {
      if (typeof window.mermaid === 'undefined') return false;
      try {
        window.mermaid.initialize({ startOnLoad: false, theme: resolveMermaidTheme() });
        // mermaid.render returns a Promise in v10+, or accepts a callback in older versions
        const result = window.mermaid.render('waid-mermaid-svg', source);
        if (result && typeof result.then === 'function') {
          result.then(function (out) {
            _mermaidSvg = out.svg || out;
            container.innerHTML = _mermaidSvg;
            container.classList.add('waid-mermaid-loaded');
          }).catch(function () {
            showFallback();
          });
        } else if (typeof result === 'string') {
          _mermaidSvg = result;
          container.innerHTML = _mermaidSvg;
          container.classList.add('waid-mermaid-loaded');
        } else {
          showFallback();
        }
        return true;
      } catch (_) {
        showFallback();
        return true;
      }
    }

    function showFallback() {
      const pre = document.createElement('pre');
      pre.className = 'waid-mermaid-fallback';
      pre.textContent = source;
      container.innerHTML = '';
      container.appendChild(pre);
    }

    // Try immediately
    if (renderWithMermaid()) return;

    // Mermaid not yet loaded — listen for load event on its <script> tag
    const mermaidScript = document.querySelector('script[src*="mermaid"]');
    let retried = false;
    let timeoutId = null;

    function onMermaidLoad() {
      if (retried) return;
      retried = true;
      clearTimeout(timeoutId);
      if (!renderWithMermaid()) showFallback();
    }

    if (mermaidScript) {
      mermaidScript.addEventListener('load', onMermaidLoad, { once: true });
    }

    // 8-second fallback
    timeoutId = setTimeout(function () {
      if (!retried) { retried = true; showFallback(); }
    }, 8000);
  }

  // Re-render Mermaid when theme changes (if already rendered)
  function _rerenderMermaid() {
    if (!_analysis || !_analysis.architecture || !_analysis.architecture.mermaid) return;
    const container = document.getElementById('waid-arch-diagram');
    if (!container) return;
    const source = _analysis.architecture.mermaid;
    if (!source) return;
    if (typeof window.mermaid === 'undefined') return;
    try {
      window.mermaid.initialize({ startOnLoad: false, theme: resolveMermaidTheme() });
      const result = window.mermaid.render('waid-mermaid-svg-2', source);
      if (result && typeof result.then === 'function') {
        result.then(function (out) {
          _mermaidSvg = out.svg || out;
          container.innerHTML = _mermaidSvg;
          container.classList.add('waid-mermaid-loaded');
        }).catch(function () { /* keep current */ });
      } else if (typeof result === 'string') {
        _mermaidSvg = result;
        container.innerHTML = _mermaidSvg;
        container.classList.add('waid-mermaid-loaded');
      }
    } catch (_) { /* keep current */ }
  }

  // ─── Section renderers ─────────────────────────────────────────────────────

  function _renderOverview(a) {
    const body = document.getElementById('waid-section-body-overview');
    if (!body) return;
    // Narrative prose (Markdown-safe)
    const techP = document.createElement('p');
    techP.setAttribute('data-waid-view', 'technical');
    techP.innerHTML = _md(a.overview.technical || '');
    const laymanP = document.createElement('p');
    laymanP.setAttribute('data-waid-view', 'layman');
    laymanP.innerHTML = _md(a.overview.layman || '');
    body.appendChild(techP);
    body.appendChild(laymanP);
  }

  function _renderTechStack(a) {
    const body = document.getElementById('waid-section-body-tech-stack');
    if (!body) return;
    const section = document.getElementById('waid-section-tech-stack');

    // Section-level narrative
    const techP = document.createElement('p');
    techP.setAttribute('data-waid-view', 'technical');
    techP.innerHTML = _md(a.tech_stack.technical || '');
    const laymanP = document.createElement('p');
    laymanP.setAttribute('data-waid-view', 'layman');
    laymanP.innerHTML = _md(a.tech_stack.layman || '');
    body.appendChild(techP);
    body.appendChild(laymanP);

    const entries = (a.tech_stack.entries || []);
    if (entries.length === 0) {
      if (section) section.dataset.waidEmpty = 'true';
      const notice = document.createElement('p');
      notice.className = 'waid-empty-notice';
      notice.textContent = 'No entries available.';
      body.appendChild(notice);
      return;
    }

    entries.forEach(function (entry) {
      const frag = cloneTemplate('tpl-tech-stack-entry', {
        name:      entry.name      || '',
        kind:      entry.role      || '',
        version:   entry.version   || '',
        technical: '',
        layman:    '',
        analogy:   ''
      });
      if (frag) body.appendChild(frag);
    });
  }

  function _renderArchitecture(a) {
    const body = document.getElementById('waid-section-body-architecture');
    if (!body) return;

    // Section narrative (above diagram)
    const techP = document.createElement('p');
    techP.setAttribute('data-waid-view', 'technical');
    techP.innerHTML = _md(a.architecture.technical || '');
    const laymanP = document.createElement('p');
    laymanP.setAttribute('data-waid-view', 'layman');
    laymanP.innerHTML = _md(a.architecture.layman || '');
    body.insertBefore(techP, body.firstChild);
    body.insertBefore(laymanP, body.firstChild);

    // Mermaid diagram (async)
    _hydrateMermaid(a.architecture.mermaid || '');
  }

  function _renderEntriesSection(sectionName, bodyId, tplId, entries, buildData) {
    const body = document.getElementById(bodyId);
    const section = document.getElementById('waid-section-' + sectionName);
    if (!body) return;

    if (!entries || entries.length === 0) {
      if (section) section.dataset.waidEmpty = 'true';
      const notice = document.createElement('p');
      notice.className = 'waid-empty-notice';
      notice.textContent = 'No entries available.';
      body.appendChild(notice);
      return;
    }

    entries.forEach(function (entry, idx) {
      const frag = cloneTemplate(tplId, buildData(entry, idx));
      if (frag) body.appendChild(frag);
    });
  }

  function _renderNarrativeAndEntries(a, field, sectionName, tplId, buildData) {
    const body = document.getElementById('waid-section-body-' + sectionName);
    if (!body) return;
    const section = document.getElementById('waid-section-' + sectionName);
    const sectionData = a[field] || {};

    // Narrative
    const techP = document.createElement('p');
    techP.setAttribute('data-waid-view', 'technical');
    techP.innerHTML = _md(sectionData.technical || '');
    const laymanP = document.createElement('p');
    laymanP.setAttribute('data-waid-view', 'layman');
    laymanP.innerHTML = _md(sectionData.layman || '');
    body.appendChild(techP);
    body.appendChild(laymanP);

    const entries = sectionData.entries || [];
    if (entries.length === 0) {
      if (section) section.dataset.waidEmpty = 'true';
      const notice = document.createElement('p');
      notice.className = 'waid-empty-notice';
      notice.textContent = 'No entries available.';
      body.appendChild(notice);
      return;
    }

    entries.forEach(function (entry, idx) {
      const frag = cloneTemplate(tplId, buildData(entry, idx));
      if (frag) body.appendChild(frag);
    });
  }

  function _renderGlossary(a) {
    const body = document.getElementById('waid-section-body-glossary');
    const section = document.getElementById('waid-section-glossary');
    if (!body) return;
    const entries = a.glossary || [];

    if (entries.length === 0) {
      if (section) section.dataset.waidEmpty = 'true';
      const notice = document.createElement('p');
      notice.className = 'waid-empty-notice';
      notice.textContent = 'No entries available.';
      body.appendChild(notice);
      return;
    }

    entries.forEach(function (entry) {
      const frag = cloneTemplate('tpl-glossary-entry', {
        term:      entry.term    || '',
        layman:    entry.layman  || '',
        technical: entry.technical || entry.layman || ''
      });
      if (!frag) return;

      // Apply glossary-term class to <dt> element so tooltip wires up
      const dt = frag.querySelector('dt[data-waid-slot="term"]');
      if (dt) {
        dt.classList.add('waid-glossary-term');
        dt.dataset.term = entry.term || '';
      }

      body.appendChild(frag);
    });
  }

  function _renderQuiz(a) {
    const body = document.getElementById('waid-section-body-quiz');
    const section = document.getElementById('waid-section-quiz');
    if (!body) return;
    const items = a.quiz || [];

    if (items.length === 0) {
      if (section) section.dataset.waidEmpty = 'true';
      const notice = document.createElement('p');
      notice.className = 'waid-empty-notice';
      notice.textContent = 'No entries available.';
      body.appendChild(notice);
      return;
    }

    items.forEach(function (item, questionIndex) {
      const frag = cloneTemplate('tpl-quiz-entry', {
        question:              item.question              || '',
        'explanation-layman':    item.explanation_layman    || '',
        'explanation-technical': item.explanation_technical || ''
      });
      if (!frag) return;

      const entryEl = frag.querySelector('.waid-quiz-entry');
      const choicesEl = frag.querySelector('.waid-quiz-choices');

      // Validate answerIndex
      const rawIdx = item.answerIndex;
      const choices = item.choices || [];
      let answerIndex = parseInt(rawIdx, 10);
      if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
        console.warn('[WAID] quiz item ' + questionIndex + ': answerIndex ' + rawIdx +
          ' is out of bounds (choices.length=' + choices.length + '). Correct answer will not be highlighted.');
        answerIndex = -1;
      }

      // Store answer index on container (cosmetic obfuscation only)
      if (entryEl) entryEl.dataset.answerIndex = String(answerIndex);

      // Clone choice buttons
      choices.forEach(function (choiceText, choiceIdx) {
        const cfrag = cloneTemplate('tpl-quiz-choice', { label: choiceText });
        if (!cfrag) return;
        const btn = cfrag.querySelector('.waid-quiz-choice');
        if (btn) btn.dataset.choiceIndex = String(choiceIdx);
        if (choicesEl) choicesEl.appendChild(cfrag);
      });

      body.appendChild(frag);
    });
  }

  // ─── Render all sections ───────────────────────────────────────────────────

  function _renderAllSections(a) {
    _renderOverview(a);
    _renderTechStack(a);
    _renderArchitecture(a);

    _renderNarrativeAndEntries(a, 'algorithms', 'algorithms', 'tpl-algo-entry', function (e) {
      return { name: e.name || '', technical: e.technical || '', layman: e.layman || '',
        complexity: '', location: '' };
    });

    _renderNarrativeAndEntries(a, 'methodologies', 'methodologies', 'tpl-method-entry', function (e) {
      return { name: e.name || '', technical: e.technical || '', layman: e.layman || '' };
    });

    _renderNarrativeAndEntries(a, 'pattern_rationale', 'pattern-rationale', 'tpl-pattern-entry', function (e) {
      return {
        pattern:   e.pattern || '',
        technical: e.rationale_technical || '',
        layman:    e.rationale_layman    || '',
        why:       '',
        tradeoffs: ''
      };
    });

    _renderNarrativeAndEntries(a, 'pitfalls', 'pitfalls', 'tpl-pitfall-entry', function (e) {
      const sev = ['low', 'medium', 'high'].indexOf(e.severity) !== -1 ? e.severity : 'medium';
      const frag = cloneTemplate('tpl-pitfall-entry', {
        title:     e.title    || '',
        severity:  sev,
        technical: e.technical || '',
        layman:    e.layman   || ''
      });
      // Apply severity data-attribute to the article element
      if (frag) {
        const article = frag.querySelector('.waid-pitfall-entry');
        if (article) article.dataset.severity = sev;
      }
      return frag; // NOTE: pitfall uses a special path — see below
    });

    _renderGlossary(a);
    _renderQuiz(a);
  }

  // Pitfall rendering needs special handling (severity on article), so patch it:
  const _origRenderPitfalls = _renderNarrativeAndEntries;
  function _renderPitfalls(a) {
    const body = document.getElementById('waid-section-body-pitfalls');
    const section = document.getElementById('waid-section-pitfalls');
    if (!body) return;
    const sectionData = a.pitfalls || {};

    const techP = document.createElement('p');
    techP.setAttribute('data-waid-view', 'technical');
    techP.innerHTML = _md(sectionData.technical || '');
    const laymanP = document.createElement('p');
    laymanP.setAttribute('data-waid-view', 'layman');
    laymanP.innerHTML = _md(sectionData.layman || '');
    body.appendChild(techP);
    body.appendChild(laymanP);

    const entries = sectionData.entries || [];
    if (entries.length === 0) {
      if (section) section.dataset.waidEmpty = 'true';
      const notice = document.createElement('p');
      notice.className = 'waid-empty-notice';
      notice.textContent = 'No entries available.';
      body.appendChild(notice);
      return;
    }

    entries.forEach(function (e) {
      const sev = ['low', 'medium', 'high'].indexOf(e.severity) !== -1 ? e.severity : 'medium';
      const frag = cloneTemplate('tpl-pitfall-entry', {
        title:     e.title     || '',
        severity:  sev,
        technical: e.technical || '',
        layman:    e.layman    || ''
      });
      if (!frag) return;
      const article = frag.querySelector('.waid-pitfall-entry');
      if (article) article.dataset.severity = sev;
      body.appendChild(frag);
    });
  }

  // ─── Build TOC ─────────────────────────────────────────────────────────────

  const SECTIONS = [
    { name: 'overview',          title: 'Overview'                },
    { name: 'tech-stack',        title: 'Tech Stack'              },
    { name: 'architecture',      title: 'Architecture'            },
    { name: 'algorithms',        title: 'Key Algorithms'          },
    { name: 'methodologies',     title: 'Methodologies'           },
    { name: 'pattern-rationale', title: 'Pattern Rationale'       },
    { name: 'pitfalls',          title: 'Pitfalls'                },
    { name: 'glossary',          title: 'Glossary'                },
    { name: 'quiz',              title: 'Check Your Understanding' }
  ];

  function _buildToc() {
    const tocList = document.getElementById('waid-toc-list');
    if (!tocList) return;
    tocList.innerHTML = '';

    SECTIONS.forEach(function (s) {
      const sectionEl = document.getElementById('waid-section-' + s.name);
      if (!sectionEl) return;

      const frag = cloneTemplate('tpl-toc-item', { label: s.title });
      if (!frag) return;

      const li = frag.querySelector('.waid-toc-item');
      const a  = frag.querySelector('.waid-toc-link');

      if (li) {
        li.dataset.section = s.name;
        if (sectionEl.dataset.waidEmpty === 'true') {
          li.classList.add('waid-toc-item--empty');
        }
      }
      if (a) {
        a.href = '#waid-section-' + s.name;
        a.addEventListener('click', function (e) {
          e.preventDefault();
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      tocList.appendChild(frag);
    });
  }

  // ─── Scroll-spy via IntersectionObserver ──────────────────────────────────

  function _startScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    if (_scrollSpyObserver) _scrollSpyObserver.disconnect();

    _scrollSpyObserver = new IntersectionObserver(function (entries) {
      // Find the topmost visible section
      let topmost = null;
      let topmostY = Infinity;

      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const y = entry.boundingClientRect.top;
          if (y < topmostY) { topmostY = y; topmost = entry.target; }
        }
      });

      if (!topmost) return;
      const activeName = topmost.dataset.waidSection;

      document.querySelectorAll('.waid-toc-item').forEach(function (li) {
        li.classList.toggle('waid-toc-item--active', li.dataset.section === activeName);
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('[data-waid-section]').forEach(function (el) {
      _scrollSpyObserver.observe(el);
    });
  }

  // ─── Section collapse/expand ───────────────────────────────────────────────

  function _wireCollapseToggles() {
    document.querySelectorAll('.waid-section-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const bodyId = btn.getAttribute('aria-controls');
        const bodyEl = bodyId ? document.getElementById(bodyId) : null;
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        const nowExpanded = !expanded;

        btn.setAttribute('aria-expanded', String(nowExpanded));
        if (bodyEl) bodyEl.dataset.collapsed = String(!nowExpanded);

        // Track collapsed state in memory
        const sectionEl = btn.closest('[data-waid-section]');
        const sectionName = sectionEl ? sectionEl.dataset.waidSection : null;
        if (sectionName) {
          if (nowExpanded) _collapsedSections.delete(sectionName);
          else             _collapsedSections.add(sectionName);
        }

        emit('waid:section-toggle', { sectionName: sectionName, expanded: nowExpanded });
      });
    });
  }

  // ─── View toggle ──────────────────────────────────────────────────────────

  function _wireViewToggle() {
    const btn = document.getElementById('waid-view-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const root = document.getElementById('waid-root');
      const current = root ? root.dataset.waidView : 'technical';
      const next = current === 'technical' ? 'layman' : 'technical';
      window.WAID.setView(next);
    });
  }

  // ─── Theme toggle ─────────────────────────────────────────────────────────

  const THEME_CYCLE = ['auto', 'light', 'dark'];
  const THEME_ICONS = { auto: '◐', light: '☀', dark: '☽' };

  function _updateThemeIcon(theme) {
    const btn = document.getElementById('waid-theme-toggle');
    if (btn) btn.textContent = THEME_ICONS[theme] || THEME_ICONS.auto;
  }

  function _wireThemeToggle() {
    const btn = document.getElementById('waid-theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const root = document.getElementById('waid-root');
      const current = root ? root.dataset.waidTheme : 'auto';
      const idx = THEME_CYCLE.indexOf(current);
      const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
      window.WAID.setTheme(next);
    });
  }

  // ─── prefers-color-scheme listener (for auto theme) ──────────────────────

  function _wireMediaQuery() {
    _mediaQueryDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (!_mediaQueryDark) return;
    _mediaQueryDark.addEventListener('change', function () {
      const root = document.getElementById('waid-root');
      if (root && root.dataset.waidTheme === 'auto') {
        _rerenderMermaid();
      }
    });
  }

  // ─── Glossary tooltips ────────────────────────────────────────────────────

  function _buildGlossaryIndex(a) {
    _glossaryIndex = new Map();
    (a.glossary || []).forEach(function (entry) {
      if (entry.term) {
        _glossaryIndex.set(entry.term, {
          layman:    entry.layman    || '',
          technical: entry.technical || entry.layman || ''
        });
      }
    });
  }

  // Lazy tooltip creation — created on first hover of each unique term
  const _tooltipMap = new Map(); // term → tooltip DOM element

  function _getOrCreateTooltip(term) {
    if (_tooltipMap.has(term)) return _tooltipMap.get(term);
    const div = document.createElement('div');
    div.role = 'tooltip';
    div.id = 'waid-tooltip-' + term.replace(/\s+/g, '-');
    div.className = 'waid-tooltip';
    div.hidden = true;
    document.body.appendChild(div);
    _tooltipMap.set(term, div);
    return div;
  }

  function _positionTooltip(tooltip, anchor) {
    const rect = anchor.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const ttW = 288; // ~18rem estimate
    const ttH = 80;  // estimate
    let top  = rect.bottom + 6;
    let left = rect.left;

    // Clip right edge
    if (left + ttW > vpW - 8) left = vpW - ttW - 8;
    // Clip bottom — open upward
    if (top + ttH > vpH - 8) top = rect.top - ttH - 6;

    tooltip.style.top  = top  + 'px';
    tooltip.style.left = left + 'px';
  }

  function _wireGlossaryTooltips() {
    document.addEventListener('mouseover', function (e) {
      const term = e.target.closest && e.target.closest('.waid-glossary-term');
      if (!term) return;
      const termName = term.dataset.term || term.textContent;
      const def = _glossaryIndex.get(termName);
      if (!def) return;

      const tooltip = _getOrCreateTooltip(termName);
      const root = document.getElementById('waid-root');
      const view = root ? root.dataset.waidView : 'technical';
      tooltip.textContent = view === 'layman' ? def.layman : def.technical;
      tooltip.hidden = false;
      _positionTooltip(tooltip, term);
    });

    document.addEventListener('mouseout', function (e) {
      const term = e.target.closest && e.target.closest('.waid-glossary-term');
      if (!term) return;
      const termName = term.dataset.term || term.textContent;
      const tooltip = _tooltipMap.get(termName);
      if (tooltip) tooltip.hidden = true;
    });

    document.addEventListener('focusin', function (e) {
      const term = e.target.closest && e.target.closest('.waid-glossary-term');
      if (!term) return;
      const termName = term.dataset.term || term.textContent;
      const def = _glossaryIndex.get(termName);
      if (!def) return;
      const tooltip = _getOrCreateTooltip(termName);
      const root = document.getElementById('waid-root');
      const view = root ? root.dataset.waidView : 'technical';
      tooltip.textContent = view === 'layman' ? def.layman : def.technical;
      tooltip.hidden = false;
      _positionTooltip(tooltip, term);
    });

    document.addEventListener('focusout', function (e) {
      const term = e.target.closest && e.target.closest('.waid-glossary-term');
      if (!term) return;
      const termName = term.dataset.term || term.textContent;
      const tooltip = _tooltipMap.get(termName);
      if (tooltip) tooltip.hidden = true;
    });
  }

  // ─── Quiz logic ───────────────────────────────────────────────────────────

  function _wireQuiz() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('.waid-quiz-choice');
      if (!btn) return;
      if (btn.disabled) return;

      const entry = btn.closest('.waid-quiz-entry');
      if (!entry) return;

      const answerIndex = parseInt(entry.dataset.answerIndex, 10);
      const clickedIndex = parseInt(btn.dataset.choiceIndex, 10);
      const correct = (clickedIndex === answerIndex);

      // Mark chosen button
      btn.classList.add(correct ? 'waid-quiz-correct' : 'waid-quiz-wrong');

      // If wrong, also highlight the correct button
      if (!correct && answerIndex >= 0) {
        const allBtns = entry.querySelectorAll('.waid-quiz-choice');
        allBtns.forEach(function (b) {
          if (parseInt(b.dataset.choiceIndex, 10) === answerIndex) {
            b.classList.add('waid-quiz-correct');
          }
        });
      }

      // Reveal explanation matching active view
      const explanationEl = entry.querySelector('.waid-quiz-explanation');
      if (explanationEl) explanationEl.hidden = false;

      // Disable all choices in this entry
      entry.querySelectorAll('.waid-quiz-choice').forEach(function (b) {
        b.disabled = true;
      });

      // Find question index
      const allEntries = Array.from(document.querySelectorAll('.waid-quiz-entry'));
      const questionIndex = allEntries.indexOf(entry);

      emit('waid:quiz-answer', { questionIndex: questionIndex, correct: correct });
    });
  }

  // ─── Diagram zoom ─────────────────────────────────────────────────────────

  function _wireDiagramZoom() {
    const archDiagram = document.getElementById('waid-arch-diagram');
    const dialog = document.getElementById('waid-diagram-zoom');
    if (!archDiagram || !dialog) return;

    archDiagram.addEventListener('click', function () {
      // Clone current diagram content into zoom dialog
      const zoomContent = dialog.querySelector('.waid-diagram-zoom-content');
      if (zoomContent) {
        zoomContent.innerHTML = '';
        const clone = archDiagram.cloneNode(true);
        clone.id = ''; // avoid duplicate ID
        zoomContent.appendChild(clone);
      }
      if (typeof dialog.showModal === 'function') dialog.showModal();
    });

    // Close on backdrop click
    dialog.addEventListener('click', function (e) {
      const rect = dialog.getBoundingClientRect();
      const clickedBackdrop = (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom
      );
      if (clickedBackdrop && typeof dialog.close === 'function') dialog.close();
    });

    // Escape key closes dialog (native <dialog> supports this, but add for safety)
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && typeof dialog.close === 'function') dialog.close();
    });
  }

  // ─── Schema version warning banner ───────────────────────────────────────

  function _maybeShowSchemaWarning(a) {
    if (a.$schemaVersion === 1) return;
    const main = document.getElementById('waid-main');
    if (!main) return;
    const banner = document.createElement('div');
    banner.className = 'waid-schema-warning';
    banner.textContent = 'Warning: this report was generated with schema version ' +
      a.$schemaVersion + '. This viewer expects version 1. Some content may not display correctly.';
    main.insertBefore(banner, main.firstChild);
  }

  // ─── Unhide sections after rendering ──────────────────────────────────────

  function _unhideSections() {
    document.querySelectorAll('[data-waid-section]').forEach(function (el) {
      el.removeAttribute('hidden');
    });
  }

  // ─── Global error handler ─────────────────────────────────────────────────

  function _surfaceError(msg) {
    const errEl = document.getElementById('waid-error');
    if (errEl) {
      const p = errEl.querySelector('p') || errEl;
      p.textContent = msg || 'An unexpected error occurred.';
      errEl.removeAttribute('hidden');
    }
  }

  window.onerror = function (msg, src, line, col, err) {
    _surfaceError(err ? err.message : String(msg));
  };
  window.onunhandledrejection = function (e) {
    _surfaceError(e.reason ? String(e.reason.message || e.reason) : 'Unhandled promise rejection.');
  };

  // ─── Public API ───────────────────────────────────────────────────────────

  window.WAID = {
    _initialized: false,

    init: function (analysisJson) {
      if (this._initialized) return;
      this._initialized = true;
      _initialized = true;

      const root = document.getElementById('waid-root');

      // 1. Validate input
      if (!analysisJson || typeof analysisJson !== 'object') {
        if (root) root.dataset.waidState = 'error';
        const errEl = document.getElementById('waid-error');
        if (errEl) errEl.removeAttribute('hidden');
        return;
      }

      _analysis = analysisJson;

      // 2. Restore view + theme from localStorage
      const savedView  = lsGet('waid-view');
      const savedTheme = lsGet('waid-theme');
      const view  = (savedView  === 'layman') ? 'layman' : 'technical';
      const theme = (['light', 'dark', 'auto'].indexOf(savedTheme) !== -1) ? savedTheme : 'auto';

      if (root) {
        root.dataset.waidView  = view;
        root.dataset.waidTheme = theme;
      }

      const viewToggle = document.getElementById('waid-view-toggle');
      if (viewToggle) viewToggle.setAttribute('aria-pressed', String(view === 'layman'));
      _updateThemeIcon(theme);

      // 3. Populate page chrome
      const titleStr = (analysisJson.projectName || 'Project') + ' — Under the Hood';
      document.title = titleStr;
      const titleEl = document.getElementById('waid-title');
      if (titleEl) titleEl.textContent = titleStr;

      const schemaMeta = document.querySelector('meta[name="waid:schema-version"]');
      if (schemaMeta) schemaMeta.setAttribute('content', String(analysisJson.$schemaVersion || ''));

      // 4. Render each section
      _renderOverview(analysisJson);
      _renderTechStack(analysisJson);
      _renderArchitecture(analysisJson);
      _renderNarrativeAndEntries(analysisJson, 'algorithms', 'algorithms', 'tpl-algo-entry', function (e) {
        return { name: e.name || '', technical: e.technical || '', layman: e.layman || '', complexity: '', location: '' };
      });
      _renderNarrativeAndEntries(analysisJson, 'methodologies', 'methodologies', 'tpl-method-entry', function (e) {
        return { name: e.name || '', technical: e.technical || '', layman: e.layman || '' };
      });
      _renderNarrativeAndEntries(analysisJson, 'pattern_rationale', 'pattern-rationale', 'tpl-pattern-entry', function (e) {
        return { pattern: e.pattern || '', technical: e.rationale_technical || '', layman: e.rationale_layman || '', why: '', tradeoffs: '' };
      });
      _renderPitfalls(analysisJson);
      _renderGlossary(analysisJson);
      _renderQuiz(analysisJson);

      // Unhide sections
      _unhideSections();

      // 5. Build TOC
      _buildToc();

      // 6. Wire event listeners
      _wireCollapseToggles();
      _wireViewToggle();
      _wireThemeToggle();
      _wireGlossaryTooltips();
      _wireQuiz();
      _wireDiagramZoom();

      // 7. Start scroll-spy
      _startScrollSpy();

      // 8. Build glossary index (used for tooltips)
      _buildGlossaryIndex(analysisJson);

      // 9. Show schema warning if needed (Mermaid already triggered in _renderArchitecture)
      _maybeShowSchemaWarning(analysisJson);

      // 10. Wire OS theme change listener
      _wireMediaQuery();

      // 11. Set ready state
      if (root) root.dataset.waidState = 'ready';

      // 12. Fire waid:ready
      emit('waid:ready', {});
    },

    setView: function (view) {
      if (view !== 'technical' && view !== 'layman') {
        console.warn('[WAID] setView: invalid value "' + view + '". Use "technical" or "layman".');
        return;
      }
      const root = document.getElementById('waid-root');
      if (root) root.dataset.waidView = view;
      const btn = document.getElementById('waid-view-toggle');
      if (btn) btn.setAttribute('aria-pressed', String(view === 'layman'));
      lsSet('waid-view', view);
      emit('waid:view-change', { view: view });
    },

    setTheme: function (theme) {
      if (theme !== 'light' && theme !== 'dark' && theme !== 'auto') {
        console.warn('[WAID] setTheme: invalid value "' + theme + '". Use "light", "dark", or "auto".');
        return;
      }
      const root = document.getElementById('waid-root');
      if (root) root.dataset.waidTheme = theme;
      _updateThemeIcon(theme);
      lsSet('waid-theme', theme);
      emit('waid:theme-change', { theme: theme });
      // Re-render Mermaid with new theme
      _rerenderMermaid();
    },

    getState: function () {
      const root = document.getElementById('waid-root');
      return {
        view:              root ? root.dataset.waidView  : 'technical',
        theme:             root ? root.dataset.waidTheme : 'auto',
        collapsedSections: new Set(_collapsedSections)
      };
    }
  };

  // ─── Auto-init on DOMContentLoaded ───────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    const dataEl = document.getElementById('waid-data');
    let parsed = null;
    if (dataEl) {
      const text = dataEl.textContent.trim();
      if (text && text !== '__WAID_ANALYSIS_JSON__') {
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          parsed = null;
        }
      }
    }
    window.WAID.init(parsed);
  });

})();
