/* ============================================================
   waid-commands · template.js — vanilla, single-file
   ============================================================ */
(function () {
  "use strict";

  /* ---------- read fixture ---------- */
  var dataNode = document.getElementById("waid-data");
  var data = {};
  try { data = JSON.parse(dataNode.textContent); } catch (e) { console.error("waid: bad data", e); }

  function get(path) {
    return path.split(".").reduce(function (o, k) { return (o == null) ? undefined : o[k]; }, data);
  }
  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
    });
  }

  /* ---------- glossary substitution ---------- */
  // Wrap glossary terms (longest-first) in body text with .waid-glossary-ref
  function buildGlossaryRegex(terms) {
    if (!terms || !terms.length) return null;
    var sorted = terms.slice().sort(function(a,b){ return b.term.length - a.term.length; });
    var escaped = sorted.map(function(t){ return t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    return new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi");
  }
  var glossaryTerms = (data.glossary || []);
  var glossaryByLower = {};
  glossaryTerms.forEach(function(t){ glossaryByLower[t.term.toLowerCase()] = t; });
  var glossaryRegex = buildGlossaryRegex(glossaryTerms);

  function annotateGlossary(html) {
    if (!glossaryRegex) return html;
    return html.replace(glossaryRegex, function(match){
      var key = match.toLowerCase();
      if (!glossaryByLower[key]) return match;
      return '<span class="waid-glossary-ref" data-term="' + escapeHTML(glossaryByLower[key].term) + '" tabindex="0">' + escapeHTML(match) + '</span>';
    });
  }

  /* ---------- slot renderers ---------- */
  document.querySelectorAll("[data-slot]").forEach(function(el){
    var raw = get(el.getAttribute("data-slot"));
    if (raw == null || raw === "") {
      el.innerHTML = '<span class="waid-empty" style="display:inline-block;">No content for this view.</span>';
      return;
    }
    // if multiple paragraphs, split on \n\n; otherwise single paragraph.
    var paras = String(raw).split(/\n\n+/);
    var html = paras.map(function(p){ return "<p>" + annotateGlossary(escapeHTML(p)) + "</p>"; }).join("");
    el.innerHTML = html;
  });

  /* ---------- header meta ---------- */
  (function meta(){
    var name = data.projectName || "Project";
    document.title = "Under the Hood — " + name;
    var t = document.getElementById("waid-project-title"); if (t) t.textContent = name;
    var s = document.getElementById("waid-stack-label"); if (s) s.textContent = data.detectedStack || "";
    var p = document.getElementById("waid-project-label"); if (p) p.textContent = name;
    var when = data.generatedAt ? new Date(data.generatedAt) : null;
    var pretty = when ? when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
    var g = document.getElementById("waid-generated-label"); if (g) g.textContent = pretty;
    var f = document.getElementById("waid-footer-meta");     if (f) f.textContent = name + (pretty ? " · " + pretty : "");
  })();

  /* ---------- tech stack grid ---------- */
  (function techStack(){
    var grid = document.getElementById("waid-tech-grid");
    if (!grid) return;
    var entries = (get("tech_stack.entries") || []);
    if (!entries.length) {
      grid.innerHTML = '<div class="waid-empty">No dependencies declared.</div>';
      return;
    }
    grid.innerHTML = entries.map(function(e){
      var initial = (e.name || "?").trim().charAt(0).toUpperCase();
      return ''
        + '<div class="waid-stack-card">'
        +   '<div class="waid-stack-card__glyph" aria-hidden="true">' + escapeHTML(initial) + '</div>'
        +   '<div>'
        +     '<div class="waid-stack-card__name">' + escapeHTML(e.name || "") + '</div>'
        +     '<div class="waid-stack-card__role">' + escapeHTML(e.role || "") + '</div>'
        +   '</div>'
        +   (e.version ? '<div class="waid-stack-card__ver">' + escapeHTML(e.version) + '</div>' : '<div></div>')
        + '</div>';
    }).join("");
  })();

  /* ---------- algorithms list ---------- */
  (function algos(){
    var box = document.getElementById("waid-algo-list");
    if (!box) return;
    var entries = (get("algorithms.entries") || []);
    if (!entries.length) {
      box.innerHTML = '<div class="waid-empty">No notable algorithms in this project.</div>';
      return;
    }
    box.innerHTML = entries.map(function(e){
      var head = ''
        + '<div class="waid-card__head">'
        +   '<h3 class="waid-h3">' + escapeHTML(e.name || "") + '</h3>'
        +   (e.complexity ? '<span class="waid-badge waid-badge--accent">' + escapeHTML(e.complexity) + '</span>' : '')
        + '</div>';
      var views = ''
        + '<div class="waid-views">'
        +   '<div class="waid-view waid-body" data-view="technical"><p>' + annotateGlossary(escapeHTML(e.technical || "")) + '</p></div>'
        +   '<div class="waid-view waid-body" data-view="layman"><p>'    + annotateGlossary(escapeHTML(e.layman || "")) + '</p></div>'
        + '</div>';
      return '<div class="waid-card">' + head + views + '</div>';
    }).join("");
  })();

  /* ---------- methodologies ---------- */
  (function methods(){
    var box = document.getElementById("waid-method-list");
    if (!box) return;
    var entries = (get("methodologies.entries") || []);
    if (!entries.length) {
      box.innerHTML = '<div class="waid-empty">No methodology entries.</div>';
      return;
    }
    box.innerHTML = entries.map(function(e){
      return ''
        + '<div class="waid-card">'
        +   '<div class="waid-card__head"><h3 class="waid-h3">' + escapeHTML(e.name || "") + '</h3></div>'
        +   '<div class="waid-views">'
        +     '<div class="waid-view waid-body" data-view="technical"><p>' + annotateGlossary(escapeHTML(e.technical || "")) + '</p></div>'
        +     '<div class="waid-view waid-body" data-view="layman"><p>'    + annotateGlossary(escapeHTML(e.layman || "")) + '</p></div>'
        +   '</div>'
        + '</div>';
    }).join("");
  })();

  /* ---------- pattern rationale ---------- */
  (function patterns(){
    var box = document.getElementById("waid-pattern-list");
    if (!box) return;
    var entries = (get("pattern_rationale.entries") || []);
    if (!entries.length) {
      box.innerHTML = '<div class="waid-empty">No pattern entries.</div>';
      return;
    }
    box.innerHTML = entries.map(function(e){
      var trade = e.tradeoffs
        ? '<p style="margin-top:10px;color:var(--waid-color-text-muted);font-size:var(--waid-fs-caption);"><strong style="color:var(--waid-color-text);">Trade-off — </strong>' + annotateGlossary(escapeHTML(e.tradeoffs)) + '</p>'
        : '';
      return ''
        + '<div class="waid-card">'
        +   '<div class="waid-card__head"><h3 class="waid-h3">' + escapeHTML(e.pattern || "") + '</h3></div>'
        +   '<div class="waid-views">'
        +     '<div class="waid-view waid-body" data-view="technical"><p>' + annotateGlossary(escapeHTML(e.rationale_technical || "")) + '</p>' + trade + '</div>'
        +     '<div class="waid-view waid-body" data-view="layman"><p>'    + annotateGlossary(escapeHTML(e.rationale_layman || "")) + '</p></div>'
        +   '</div>'
        + '</div>';
    }).join("");
  })();

  /* ---------- pitfalls ---------- */
  (function pitfalls(){
    var box = document.getElementById("waid-pitfall-list");
    if (!box) return;
    var entries = (get("pitfalls.entries") || []);
    if (!entries.length) {
      box.innerHTML = '<div class="waid-empty">No pitfalls flagged. Either the project is unusually clean, or this analysis was minimal.</div>';
      return;
    }
    // sort high → medium → low
    var rank = { high: 0, medium: 1, low: 2 };
    entries.sort(function(a,b){ return (rank[a.severity]||9) - (rank[b.severity]||9); });

    box.innerHTML = entries.map(function(e){
      var sev = (e.severity || "low").toLowerCase();
      return ''
        + '<div class="waid-card waid-pitfall" data-severity="' + escapeHTML(sev) + '">'
        +   '<div class="waid-card__head">'
        +     '<h3 class="waid-h3">' + escapeHTML(e.title || "") + '</h3>'
        +     '<span class="waid-sev" data-severity="' + escapeHTML(sev) + '">' + escapeHTML(sev) + '</span>'
        +   '</div>'
        +   '<div class="waid-views">'
        +     '<div class="waid-view waid-body" data-view="technical"><p>' + annotateGlossary(escapeHTML(e.technical || "")) + '</p></div>'
        +     '<div class="waid-view waid-body" data-view="layman"><p>'    + annotateGlossary(escapeHTML(e.layman || "")) + '</p></div>'
        +   '</div>'
        + '</div>';
    }).join("");
  })();

  /* ---------- glossary list ---------- */
  (function gloss(){
    var box = document.getElementById("waid-gloss-list");
    if (!box) return;
    var entries = (data.glossary || []);
    if (!entries.length) {
      box.innerHTML = '<div class="waid-empty" style="grid-column:1/-1;">No glossary terms in this report.</div>';
      box.style.border = "0";
      box.style.background = "transparent";
      return;
    }
    var html = "";
    entries.forEach(function(g){
      html += ''
        + '<div class="waid-gloss__term">' + escapeHTML(g.term) + '</div>'
        + '<div class="waid-gloss__def">'
        +   '<div class="waid-views">'
        +     '<div class="waid-view" data-view="technical">' + escapeHTML(g.technical || "") + '</div>'
        +     '<div class="waid-view" data-view="layman">'    + escapeHTML(g.layman || "")    + '</div>'
        +   '</div>'
        + '</div>';
    });
    box.innerHTML = html;
  })();

  /* ---------- quiz ---------- */
  (function quiz(){
    var box = document.getElementById("waid-quiz-list");
    if (!box) return;
    var entries = (data.quiz || []);
    if (!entries.length) {
      box.innerHTML = '<div class="waid-empty">No quiz questions in this report.</div>';
      return;
    }
    box.innerHTML = entries.map(function(q, i){
      var choices = (q.choices || []).map(function(c, j){
        return ''
          + '<li>'
          +   '<button class="waid-quiz__choice" data-q="' + i + '" data-c="' + j + '">'
          +     '<span class="waid-quiz__icon" aria-hidden="true">' + String.fromCharCode(65 + j) + '</span>'
          +     '<span>' + escapeHTML(c) + '</span>'
          +   '</button>'
          + '</li>';
      }).join("");
      return ''
        + '<div class="waid-quiz__card" data-q="' + i + '">'
        +   '<div class="waid-quiz__qmeta">Question ' + (i + 1) + ' / ' + entries.length + '</div>'
        +   '<p class="waid-quiz__q">' + escapeHTML(q.question || "") + '</p>'
        +   '<ul class="waid-quiz__choices">' + choices + '</ul>'
        +   '<div class="waid-quiz__explain" data-q="' + i + '">'
        +     '<div class="waid-views">'
        +       '<div class="waid-view" data-view="technical">' + annotateGlossary(escapeHTML(q.explanation_technical || "")) + '</div>'
        +       '<div class="waid-view" data-view="layman">'    + annotateGlossary(escapeHTML(q.explanation_layman || ""))    + '</div>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    }).join("");

    box.addEventListener("click", function(ev){
      var btn = ev.target.closest(".waid-quiz__choice");
      if (!btn) return;
      var qi = +btn.getAttribute("data-q");
      var ci = +btn.getAttribute("data-c");
      var q = entries[qi];
      if (!q) return;
      var card = btn.closest(".waid-quiz__card");
      var allChoices = card.querySelectorAll(".waid-quiz__choice");
      // already answered? bail.
      var alreadyAnswered = false;
      allChoices.forEach(function(c){ if (c.disabled) alreadyAnswered = true; });
      if (alreadyAnswered) return;

      var correctIdx = q.answerIndex;
      allChoices.forEach(function(c, idx){
        c.disabled = true;
        if (idx === correctIdx) c.setAttribute("data-state", idx === ci ? "correct" : "reveal");
        else if (idx === ci) c.setAttribute("data-state", "wrong");
      });
      var explain = card.querySelector(".waid-quiz__explain");
      if (explain) explain.classList.add("is-visible");
    });
    // keyboard support comes free via <button>.
  })();

  /* ============================================================
     view toggle (Technical ↔ Layman/Plain)
     ============================================================ */
  (function viewToggle(){
    var html = document.documentElement;
    var stored = null;
    try { stored = localStorage.getItem("waid:view"); } catch (e) {}
    if (stored === "technical" || stored === "layman") html.setAttribute("data-view", stored);

    var buttons = document.querySelectorAll(".waid-viewtoggle button[data-view]");
    function setView(v){
      html.setAttribute("data-view", v);
      try { localStorage.setItem("waid:view", v); } catch(e){}
      buttons.forEach(function(b){
        b.setAttribute("aria-pressed", b.getAttribute("data-view") === v ? "true" : "false");
      });
    }
    setView(html.getAttribute("data-view") || "technical");
    buttons.forEach(function(b){
      b.addEventListener("click", function(){ setView(b.getAttribute("data-view")); });
    });
  })();

  /* ============================================================
     theme toggle (light / auto / dark)
     ============================================================ */
  (function themeToggle(){
    var html = document.documentElement;
    var stored = null;
    try { stored = localStorage.getItem("waid:theme"); } catch (e) {}
    if (stored === "light" || stored === "dark" || stored === "auto") html.setAttribute("data-theme", stored);

    var buttons = document.querySelectorAll(".waid-themetoggle button[data-theme]");
    function setTheme(t){
      html.setAttribute("data-theme", t);
      try { localStorage.setItem("waid:theme", t); } catch(e){}
      buttons.forEach(function(b){
        b.setAttribute("aria-pressed", b.getAttribute("data-theme") === t ? "true" : "false");
      });
      // re-render mermaid to pick up new colors
      try { renderMermaid(); } catch(e){}
    }
    setTheme(html.getAttribute("data-theme") || "auto");
    buttons.forEach(function(b){
      b.addEventListener("click", function(){ setTheme(b.getAttribute("data-theme")); });
    });

    // react to system change when in auto
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var handler = function(){
        if (html.getAttribute("data-theme") === "auto") {
          try { renderMermaid(); } catch(e){}
        }
      };
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else if (mq.addListener) mq.addListener(handler);
    }
  })();

  /* ============================================================
     mermaid render (light + dark aware)
     ============================================================ */
  function isDarkActive() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function readVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  var mermaidSeq = 0;
  function renderMermaid() {
    if (typeof mermaid === "undefined") return;
    var src = get("architecture.mermaid");
    var holder = document.getElementById("waid-mermaid");
    if (!holder) return;
    if (!src || !String(src).trim()) {
      holder.style.display = "none";
      return;
    }
    holder.style.display = "";
    var dark = isDarkActive();
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "strict",
      fontFamily: readVar("--waid-font-sans") || "Inter, sans-serif",
      themeVariables: {
        background: "transparent",
        primaryColor: dark ? "#1a2030" : "#ffffff",
        primaryTextColor: dark ? "#e6e3dc" : "#1a1814",
        primaryBorderColor: dark ? "#2e343e" : "#d6cfc1",
        lineColor: dark ? "#5a6275" : "#94907f",
        secondaryColor: dark ? "#1d222b" : "#f4f1ec",
        tertiaryColor: dark ? "#0e1014" : "#fbfaf7",
        edgeLabelBackground: dark ? "#161a21" : "#fbfaf7"
      }
    });
    var id = "waid-mm-" + (++mermaidSeq);
    holder.innerHTML = "";
    try {
      var p = mermaid.render(id, String(src));
      if (p && typeof p.then === "function") {
        p.then(function(res){
          holder.innerHTML = res.svg;
          if (typeof res.bindFunctions === "function") res.bindFunctions(holder);
        }).catch(function(err){
          holder.innerHTML = '<div class="waid-empty">Diagram failed to render.</div>';
          console.error("mermaid:", err);
        });
      }
    } catch (err) {
      holder.innerHTML = '<div class="waid-empty">Diagram failed to render.</div>';
      console.error("mermaid:", err);
    }
  }
  // wait one tick to ensure mermaid script is loaded
  if (document.readyState === "complete") renderMermaid();
  else window.addEventListener("load", renderMermaid);

  /* ============================================================
     scroll-spy TOC
     ============================================================ */
  (function scrollSpy(){
    var sections = document.querySelectorAll(".waid-section[id]");
    var links = document.querySelectorAll(".waid-toc__item a");
    if (!sections.length) return;
    var byId = {};
    links.forEach(function(a){
      var id = a.getAttribute("href").slice(1);
      byId[id] = a.parentElement;
    });
    var observer = new IntersectionObserver(function(entries){
      // pick the topmost intersecting section
      var visible = entries.filter(function(e){ return e.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function(a,b){ return a.boundingClientRect.top - b.boundingClientRect.top; });
      var id = visible[0].target.id;
      links.forEach(function(a){ a.parentElement.classList.remove("is-active"); });
      if (byId[id]) byId[id].classList.add("is-active");
    }, {
      rootMargin: "-30% 0px -55% 0px",
      threshold: 0.01
    });
    sections.forEach(function(s){ observer.observe(s); });
  })();

  /* ============================================================
     mobile TOC drawer
     ============================================================ */
  (function tocDrawer(){
    var trigger = document.getElementById("waid-toc-trigger");
    var toc = document.getElementById("waid-toc");
    var backdrop = document.getElementById("waid-toc-backdrop");
    if (!trigger || !toc || !backdrop) return;
    function open(){ toc.classList.add("is-open"); backdrop.removeAttribute("hidden"); requestAnimationFrame(function(){ backdrop.classList.add("is-open"); }); trigger.setAttribute("aria-expanded","true"); }
    function close(){ toc.classList.remove("is-open"); backdrop.classList.remove("is-open"); setTimeout(function(){ backdrop.setAttribute("hidden",""); }, 220); trigger.setAttribute("aria-expanded","false"); }
    trigger.addEventListener("click", function(){ if (toc.classList.contains("is-open")) close(); else open(); });
    backdrop.addEventListener("click", close);
    toc.addEventListener("click", function(ev){
      if (ev.target.closest("a")) close();
    });
    document.addEventListener("keydown", function(ev){ if (ev.key === "Escape") close(); });
  })();

  /* ============================================================
     glossary tooltips
     ============================================================ */
  (function tooltips(){
    var tip = document.getElementById("waid-tooltip");
    if (!tip) return;
    var current = null;

    function position(target){
      var r = target.getBoundingClientRect();
      // measure tooltip
      tip.style.left = "-9999px"; tip.style.top = "-9999px";
      tip.classList.add("is-visible");
      var tr = tip.getBoundingClientRect();
      var x = r.left + r.width/2 - tr.width/2;
      var y = r.top - tr.height - 10;
      var below = false;
      if (y < 8) { y = r.bottom + 10; below = true; }
      x = Math.max(8, Math.min(window.innerWidth - tr.width - 8, x));
      tip.style.left = x + "px";
      tip.style.top  = y + "px";
    }

    function show(target){
      var term = target.getAttribute("data-term");
      var entry = glossaryByLower[term.toLowerCase()];
      if (!entry) return;
      var view = document.documentElement.getAttribute("data-view") || "technical";
      var def = (view === "layman" ? entry.layman : entry.technical) || entry.technical || entry.layman || "";
      tip.innerHTML = '<div class="waid-tooltip__term">' + escapeHTML(entry.term) + '</div>' + escapeHTML(def);
      tip.setAttribute("aria-hidden", "false");
      position(target);
      current = target;
    }
    function hide(){
      tip.classList.remove("is-visible");
      tip.setAttribute("aria-hidden","true");
      current = null;
    }

    document.addEventListener("mouseover", function(ev){
      var t = ev.target.closest(".waid-glossary-ref");
      if (t) show(t);
    });
    document.addEventListener("mouseout", function(ev){
      var t = ev.target.closest(".waid-glossary-ref");
      if (t && !t.contains(ev.relatedTarget)) hide();
    });
    document.addEventListener("focusin", function(ev){
      var t = ev.target.closest(".waid-glossary-ref");
      if (t) show(t);
    });
    document.addEventListener("focusout", function(ev){
      var t = ev.target.closest(".waid-glossary-ref");
      if (t) hide();
    });
    window.addEventListener("scroll", function(){ if (current) position(current); }, { passive: true });
    window.addEventListener("resize", function(){ if (current) position(current); });
  })();

})();
