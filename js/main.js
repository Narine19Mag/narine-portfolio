// ============================================
// NARINE MAGHAKYAN — PORTFOLIO
// Shared interactions + motion system
//
// SAFETY MODEL
// Nothing is hidden by CSS alone. The class `js-motion` is added to <html>
// by this script, and only then do the "hidden" states apply. If this file
// fails to load or throws, the page renders fully visible and static.
// A failsafe timer additionally force-reveals everything after 3s.
// ============================================

(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}
  var fine = false;
  try {
    fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  } catch (e) {}

  var motionOK = !reduced;

  // Arm the motion system as early as possible so hidden states apply
  // before first paint of below-the-fold content.
  if (motionOK) root.classList.add('js-motion');

  // ---------- tiny helpers ----------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function safe(name, fn) {
    try { fn(); } catch (err) {
      if (window.console && console.warn) console.warn('[motion] ' + name + ' failed:', err);
    }
  }

  // Shared rAF loop — one loop drives smooth scroll + parallax
  var tickers = [];
  var looping = false;
  function addTicker(fn) { tickers.push(fn); startLoop(); }
  function startLoop() {
    if (looping) return;
    looping = true;
    (function frame() {
      for (var i = 0; i < tickers.length; i++) {
        try { tickers[i](); } catch (e) {}
      }
      requestAnimationFrame(frame);
    })();
  }

  document.addEventListener('DOMContentLoaded', function () {

    // never initialise twice (guards against double-fired ready events)
    if (window.__nmMotionBooted) return;
    window.__nmMotionBooted = true;

    // =========================================================
    // 1. FAILSAFE — content can never stay hidden
    // =========================================================
    setTimeout(function () {
      safe('failsafe', function () {
        $$('.reveal, .reveal-stagger').forEach(function (el) { el.classList.add('in'); });
        $$('[data-mask]').forEach(function (el) { el.classList.add('mask-in'); });
        $$('.wr-media').forEach(function (el) { el.classList.add('wr-in'); });
      });
    }, 3000);

    // =========================================================
    // 2. MOBILE NAV
    // =========================================================
    safe('nav', function () {
      var toggle = $('.nav-toggle');
      var links = $('.nav-links');
      if (!toggle || !links) return;
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
        toggle.textContent = links.classList.contains('open') ? 'Close' : 'Menu';
      });
      $$('a', links).forEach(function (a) {
        a.addEventListener('click', function () {
          links.classList.remove('open');
          toggle.textContent = 'Menu';
        });
      });
    });

    // =========================================================
    // 3. CUSTOM CURSOR
    // =========================================================
    safe('cursor', function () {
      if (!fine) return;
      var dot = document.createElement('div'); dot.className = 'cursor-dot';
      var ring = document.createElement('div'); ring.className = 'cursor-ring';
      document.body.appendChild(dot); document.body.appendChild(ring);
      var rx = 0, ry = 0, mx = 0, my = 0;
      window.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px'; dot.style.top = my + 'px';
      }, { passive: true });
      addTicker(function () {
        rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      });
      $$('a, button, .cursor-hover').forEach(function (el) {
        el.addEventListener('mouseenter', function () { ring.classList.add('hover'); });
        el.addEventListener('mouseleave', function () { ring.classList.remove('hover'); });
      });
    });

    // =========================================================
    // 4. GRAIN OVERLAY
    // =========================================================
    safe('grain', function () {
      var grain = document.createElement('div');
      grain.className = 'grain';
      document.body.appendChild(grain);
    });

    // =========================================================
    // 5. TEXT MASK REVEAL — words rise out from behind a mask
    // =========================================================
    safe('maskReveal', function () {
      if (!motionOK) return;

      var SELECTORS = [
        'h1:not(.masthead-name)',
        '.masthead-role',
        '.wr-title',
        '.footer-top h2',
        '.bnd-hero h2',
        '.pj-hero h2',
        '.mkt-head h2',
        'section .wrap > h2',
        '.wrap h2.reveal',
        '[data-mask-me]'
      ].join(',');

      var targets = $$(SELECTORS).filter(function (el) {
        return !el.hasAttribute('data-no-mask') && el.textContent.trim().length;
      });

      function splitNode(node, out, state) {
        if (node.nodeType === 3) {
          var parts = node.textContent.split(/(\s+)/);
          for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p === '') continue;
            if (/^\s+$/.test(p)) { out.appendChild(document.createTextNode(' ')); continue; }
            var outer = document.createElement('span');
            outer.className = 'mk';
            var inner = document.createElement('span');
            inner.className = 'mk-i';
            inner.textContent = p;
            inner.style.transitionDelay = Math.min(state.i * 0.045, 0.9) + 's';
            state.i++;
            outer.appendChild(inner);
            out.appendChild(outer);
          }
        } else if (node.nodeType === 1) {
          if (node.tagName === 'BR') { out.appendChild(document.createElement('br')); return; }
          var clone = node.cloneNode(false);
          var sub = document.createDocumentFragment();
          var kids = Array.prototype.slice.call(node.childNodes);
          for (var k = 0; k < kids.length; k++) splitNode(kids[k], sub, state);
          clone.appendChild(sub);
          out.appendChild(clone);
        }
      }

      targets.forEach(function (el) {
        if (el.getAttribute('data-mask') === '1') return;
        var frag = document.createDocumentFragment();
        var state = { i: 0 };
        var kids = Array.prototype.slice.call(el.childNodes);
        for (var i = 0; i < kids.length; i++) splitNode(kids[i], frag, state);
        el.innerHTML = '';
        el.appendChild(frag);
        el.setAttribute('data-mask', '1');
        // this element now animates via the mask, not the generic fade
        el.classList.remove('reveal');
      });

      var masked = $$('[data-mask="1"]');
      if (!masked.length) return;

      if (!('IntersectionObserver' in window)) {
        masked.forEach(function (el) { el.classList.add('mask-in'); });
        return;
      }
      var mo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('mask-in');
            mo.unobserve(en.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
      masked.forEach(function (el) { mo.observe(el); });
    });

    // =========================================================
    // 6. GENERIC SCROLL REVEAL (fade/rise) — unchanged behaviour
    // =========================================================
    safe('reveal', function () {
      var els = $$('.reveal, .reveal-stagger');
      if (!els.length) return;
      if (!('IntersectionObserver' in window) || !motionOK) {
        els.forEach(function (el) { el.classList.add('in'); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.15 });
      els.forEach(function (el) { io.observe(el); });
    });

    // =========================================================
    // 7. SCROLL PROGRESS BAR
    // =========================================================
    safe('progress', function () {
      var bar = document.createElement('div');
      bar.className = 'progress-bar';
      document.body.appendChild(bar);
      addTicker(function () {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
        bar.style.width = pct + '%';
      });
    });

    // =========================================================
    // 8. MAGNETIC CARDS
    // =========================================================
    safe('magnetic', function () {
      $$('.magnetic').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width / 2) * 0.04;
          var y = (e.clientY - r.top - r.height / 2) * 0.04;
          card.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        });
        card.addEventListener('mouseleave', function () {
          card.style.transform = 'translate(0,0)';
        });
      });
    });

    // =========================================================
    // 9. IMAGE PARALLAX
    // Writes --py (px offset). CSS composes it with --ps (scale),
    // so :hover scale effects keep working.
    // =========================================================
    safe('parallax', function () {
      if (!motionOK || !fine) return;

      var SEL = [
        '.work-row .wr-media',
        '.bnd-hero-media',
        '.pj-hero-media',
        '.mkt-hero-img',
        '[data-parallax]'
      ].join(',');

      var items = $$(SEL).map(function (box) {
        var img = $('img', box);
        if (!img) return null;
        box.classList.add('px-box');
        img.classList.add('px-img');
        return { box: box, img: img, cur: 0, target: 0, active: false };
      }).filter(Boolean);

      if (!items.length) return;

      // only run maths for boxes currently on screen
      if ('IntersectionObserver' in window) {
        var pio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            for (var i = 0; i < items.length; i++) {
              if (items[i].box === en.target) { items[i].active = en.isIntersecting; break; }
            }
          });
        }, { rootMargin: '15% 0px 15% 0px' });
        items.forEach(function (it) { pio.observe(it.box); });
      } else {
        items.forEach(function (it) { it.active = true; });
      }

      var AMOUNT = 0.06; // matches the 1.12 scale in CSS (6% headroom each side)

      addTicker(function () {
        var vh = window.innerHeight;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (!it.active) continue;
          var r = it.box.getBoundingClientRect();
          if (!r.height) continue;
          // -1 (entering from below) .. 1 (leaving at top)
          var mid = r.top + r.height / 2;
          var prog = clamp((vh / 2 - mid) / (vh / 2 + r.height / 2), -1, 1);
          it.target = prog * r.height * AMOUNT;
          it.cur += (it.target - it.cur) * 0.12;
          // set on the BOX so every stacked layer inside inherits the offset
          it.box.style.setProperty('--py', it.cur.toFixed(2) + 'px');
        }
      });
    });

    // =========================================================
    // 9b. WORK-ROW MEDIA — the five hero thumbnails on the homepage
    //  · wipe-in from the bottom as the row scrolls into view
    //  · hover cycles through real work from that project
    //  · frame tilts toward the cursor in 3D
    // =========================================================
    safe('workMedia', function () {
      var boxes = $$('.work-row .wr-media');
      if (!boxes.length) return;

      // --- entrance wipe (runs on every device) ---
      if ('IntersectionObserver' in window && motionOK) {
        var wio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('wr-in'); wio.unobserve(en.target); }
          });
        }, { threshold: 0.2 });
        boxes.forEach(function (b) { wio.observe(b); });
      } else {
        boxes.forEach(function (b) { b.classList.add('wr-in'); });
      }

      // --- cycling + tilt are desktop-pointer only ---
      if (!motionOK || !fine) return;

      function pad(n) { return n < 10 ? '0' + n : '' + n; }

      boxes.forEach(function (box) {
        var list = (box.getAttribute('data-stack') || '')
          .split(',')
          .map(function (s) { return s.trim(); })
          .filter(Boolean);

        var row = box.closest ? box.closest('.work-row') : null;
        if (!row) row = box.parentNode;

        // ---- tilt ----
        row.addEventListener('mousemove', function (e) {
          var r = box.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var cx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
          var cy = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
          box.style.setProperty('--ry', (cx * 7).toFixed(2) + 'deg');
          box.style.setProperty('--rx', (-cy * 7).toFixed(2) + 'deg');
        }, { passive: true });

        row.addEventListener('mouseleave', function () {
          box.style.setProperty('--rx', '0deg');
          box.style.setProperty('--ry', '0deg');
        });

        if (!list.length) return;

        // ---- counter badge ----
        var badge = document.createElement('span');
        badge.className = 'wr-count';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = '01/' + pad(list.length + 1);
        box.appendChild(badge);

        // ---- layers (built on first need) ----
        var layers = [];
        function ensureLayers() {
          if (layers.length) return;
          for (var i = 0; i < list.length; i++) {
            var im = document.createElement('img');
            im.className = 'wr-layer px-img';
            im.alt = '';
            im.setAttribute('aria-hidden', 'true');
            im.decoding = 'async';
            im.src = list[i];
            box.appendChild(im);
            layers.push(im);
          }
        }

        var idx = -1, z = 1, timer = null, clearTimer = null;

        function show(n) {
          var el = layers[n];
          if (!el) return;
          el.classList.remove('out');
          el.style.zIndex = ++z;
          el.classList.add('on');
          badge.textContent = pad(n + 2) + '/' + pad(list.length + 1);
        }

        function step() {
          idx = (idx + 1) % layers.length;
          show(idx);
          timer = setTimeout(step, 1050);
        }

        row.addEventListener('mouseenter', function () {
          ensureLayers();
          clearTimeout(clearTimer);
          clearTimeout(timer);
          idx = -1;
          timer = setTimeout(step, 130);
        });

        row.addEventListener('mouseleave', function () {
          clearTimeout(timer);
          timer = null;
          layers.forEach(function (l) {
            if (l.classList.contains('on')) l.classList.add('out');
          });
          badge.textContent = '01/' + pad(list.length + 1);
          clearTimer = setTimeout(function () {
            layers.forEach(function (l) { l.classList.remove('on'); l.classList.remove('out'); });
            z = 1;
          }, 430);
        });

        // warm the first frame of each stack once the page is idle,
        // so the very first hover has no loading hitch
        function warm() {
          var pre = new Image();
          pre.src = list[0];
        }
        if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 4000 });
        else setTimeout(warm, 2500);
      });
    });

    // =========================================================
    // 10. SMOOTH SCROLL (lerp) — desktop pointers only
    // Native scrolling is untouched on touch devices.
    // =========================================================
    safe('smoothScroll', function () {
      if (!motionOK || !fine) return;
      if (!('scrollTo' in window)) return;

      root.classList.add('js-smooth');

      var target = window.scrollY || window.pageYOffset || 0;
      var current = target;
      var EASE = 0.09;
      var selfScroll = false;
      var enabled = true;

      function maxScroll() {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      }

      function isInsideScrollable(node) {
        while (node && node !== document.body && node !== document.documentElement) {
          if (node.nodeType === 1) {
            var st = getComputedStyle(node);
            var oy = st.overflowY;
            if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) return true;
          }
          node = node.parentNode;
        }
        return false;
      }

      window.addEventListener('wheel', function (e) {
        if (!enabled) return;
        if (e.ctrlKey) return;                     // pinch zoom
        if (isInsideScrollable(e.target)) return;  // let inner scrollers work
        e.preventDefault();
        var d = e.deltaY;
        if (e.deltaMode === 1) d *= 16;            // lines -> px
        else if (e.deltaMode === 2) d *= window.innerHeight;
        target = clamp(target + d, 0, maxScroll());
      }, { passive: false });

      // Resync if anything else moved the page (scrollbar drag, keys,
      // anchor jumps, devtools, find-in-page).
      window.addEventListener('scroll', function () {
        if (selfScroll) { selfScroll = false; return; }
        var y = window.scrollY || window.pageYOffset || 0;
        if (Math.abs(y - current) > 2) { current = y; target = y; }
      }, { passive: true });

      window.addEventListener('resize', function () {
        target = clamp(target, 0, maxScroll());
      });

      // Anchor links: hand off to native so target stays in sync
      $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function () {
          setTimeout(function () {
            var y = window.scrollY || window.pageYOffset || 0;
            current = y; target = y;
          }, 60);
        });
      });

      addTicker(function () {
        if (!enabled) return;
        var d = target - current;
        if (Math.abs(d) < 0.08) { current = target; return; }
        current += d * EASE;
        selfScroll = true;
        window.scrollTo(0, current);
      });
    });

    // =========================================================
    // 10b. PAGE TRANSITION
    // Fades the page in on load, and out before an internal
    // navigation — the one motion the reference site has that
    // this one didn't. The overlay is created by JS only, so a
    // JS failure means no overlay rather than a black screen.
    // =========================================================
    safe('pageTransition', function () {
      if (!motionOK) return;

      var ov = document.createElement('div');
      ov.className = 'page-fade';
      ov.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ov);

      function reveal() { ov.classList.remove('is-in'); ov.classList.add('is-out'); }

      // fade in on arrival
      requestAnimationFrame(function () { requestAnimationFrame(reveal); });
      // and whenever we come back via bfcache / browser back button
      window.addEventListener('pageshow', reveal);
      window.addEventListener('popstate', reveal);

      document.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;

        var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#') return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
        if (a.hasAttribute('download')) return;
        if (a.target && a.target !== '' && a.target !== '_self') return;

        var url;
        try { url = new URL(a.href, location.href); } catch (err) { return; }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname) return;   // same page / anchor

        e.preventDefault();
        ov.classList.remove('is-out');
        ov.classList.add('is-in');

        var went = false;
        function go() { if (went) return; went = true; location.href = a.href; }
        setTimeout(go, 340);
        setTimeout(go, 1200);   // hard fallback — navigation must never be lost
      });
    });

    // =========================================================
    // 11. INTERACTIVE PARTICLE WORDMARK (homepage hero)
    // The name is rendered as a particle field that scatters
    // away from the cursor and springs back into shape.
    // =========================================================
    safe('particleHero', function () {
      var h1 = $('.masthead-name');
      if (!h1) return;
      if (!motionOK || !fine) return;
      if (!window.requestAnimationFrame) return;

      var ctxTest = document.createElement('canvas');
      if (!ctxTest.getContext || !ctxTest.getContext('2d')) return;

      // wrap the h1 so the canvas can overlay it exactly
      var wrap = document.createElement('div');
      wrap.className = 'hero-particles';
      h1.parentNode.insertBefore(wrap, h1);
      wrap.appendChild(h1);

      var canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      wrap.appendChild(canvas);
      var ctx = canvas.getContext('2d');

      var parts = [];
      var W = 0, H = 0, dpr = 1;
      var mx = -9999, my = -9999;
      var ready = false;
      var visible = true;
      var settleFrom = 0;

      var TEXT = (h1.textContent || 'NARINE MAGHAKYAN').replace(/\s+/g, ' ').trim();

      function build() {
        var rect = h1.getBoundingClientRect();
        W = Math.max(1, Math.round(rect.width));
        H = Math.max(1, Math.round(rect.height));
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var cs = getComputedStyle(h1);

        // offscreen sample pass
        var oc = document.createElement('canvas');
        oc.width = W; oc.height = H;
        var octx = oc.getContext('2d');
        var fontPx = parseFloat(cs.fontSize) || 80;
        octx.fillStyle = '#fff';
        octx.textBaseline = 'middle';
        octx.textAlign = 'center';
        try {
          if ('letterSpacing' in octx) octx.letterSpacing = cs.letterSpacing;
        } catch (e) {}
        octx.font = (cs.fontStyle || 'normal') + ' ' + (cs.fontWeight || '800') + ' ' +
                    fontPx + 'px ' + (cs.fontFamily || 'sans-serif');

        // shrink to fit if the canvas font metrics run wider than the box
        var w = octx.measureText(TEXT).width;
        if (w > W && w > 0) {
          fontPx = fontPx * (W / w) * 0.995;
          octx.font = (cs.fontStyle || 'normal') + ' ' + (cs.fontWeight || '800') + ' ' +
                      fontPx + 'px ' + (cs.fontFamily || 'sans-serif');
        }
        octx.fillText(TEXT, W / 2, H / 2);

        var data;
        try {
          data = octx.getImageData(0, 0, W, H).data;
        } catch (e) { return false; }

        // adaptive sampling — keeps particle count sane on big screens
        var step = Math.max(2, Math.round(W / 300));
        var found = [];
        for (var y = 0; y < H; y += step) {
          for (var x = 0; x < W; x += step) {
            if (data[(y * W + x) * 4 + 3] > 128) found.push(x, y);
          }
        }
        if (found.length < 40) return false;   // font not ready / nothing drawn

        var MAXP = 7000;
        var stride = Math.max(1, Math.ceil((found.length / 2) / MAXP));

        parts = [];
        for (var i = 0; i < found.length; i += 2 * stride) {
          parts.push({
            hx: found[i], hy: found[i + 1],
            x: found[i] + (Math.random() - 0.5) * W * 0.8,
            y: found[i + 1] + (Math.random() - 0.5) * H * 6,
            vx: 0, vy: 0,
            a: Math.random() < 0.055
          });
        }
        settleFrom = performance.now();
        return true;
      }

      function draw() {
        if (!ready || !visible) return;
        ctx.clearRect(0, 0, W, H);

        var R = 130, R2 = R * R, FORCE = 3.1;
        var spring = 0.055, damp = 0.855;
        var size = dpr > 1 ? 1.35 : 1.6;

        var accent = '#d9ff4f';
        var base = '#f4f3ef';
        ctx.fillStyle = base;

        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          var dx = mx - p.x, dy = my - p.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1;
            var f = (1 - d / R) * FORCE;
            p.vx -= (dx / d) * f;
            p.vy -= (dy / d) * f;
          }
          p.vx += (p.hx - p.x) * spring;
          p.vy += (p.hy - p.y) * spring;
          p.vx *= damp; p.vy *= damp;
          p.x += p.vx; p.y += p.vy;

          if (p.a) { ctx.fillStyle = accent; ctx.fillRect(p.x, p.y, size, size); ctx.fillStyle = base; }
          else { ctx.fillRect(p.x, p.y, size, size); }
        }
      }

      function boot() {
        if (build()) {
          ready = true;
          h1.classList.add('is-particled');
          addTicker(draw);
        }
      }

      wrap.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
      }, { passive: true });
      wrap.addEventListener('mouseleave', function () { mx = -9999; my = -9999; });

      // also track the cursor across the whole masthead for a wider feel
      var mast = h1.closest('header') || document.body;
      mast.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        var lx = e.clientX - r.left, ly = e.clientY - r.top;
        if (lx > -240 && lx < r.width + 240 && ly > -240 && ly < r.height + 240) {
          mx = lx; my = ly;
        }
      }, { passive: true });

      if ('IntersectionObserver' in window) {
        var vio = new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
        }, { threshold: 0 });
        vio.observe(wrap);
      }

      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          if (!ready) { boot(); return; }
          build();
        }, 220);
      });

      // wait for webfonts so the sampled shape matches the real type
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { setTimeout(boot, 30); }).catch(boot);
      } else {
        setTimeout(boot, 400);
      }
      // late retry in case fonts resolve slowly
      setTimeout(function () { if (!ready) boot(); }, 1500);
    });

  });
})();
