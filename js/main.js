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
        $$('.fade').forEach(function (el) { el.classList.add('in'); });
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
        '.wcard-title',
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
      var els = $$('.reveal, .reveal-stagger, .fade');
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

      // NOTE: '.work-row .wr-media' is deliberately excluded — the reference
      // site keeps those five images completely static.
      var SEL = [
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
    // 9b. WORK-ROW MEDIA — cursor follow
    // Matches the reference site: the image is completely static
    // on scroll, and pans with the cursor while hovering the row.
    // Desktop pointers only.
    // =========================================================
    safe('workMediaFollow', function () {
      if (!motionOK || !fine) return;

      var items = $$('.work-row, .wcard').map(function (row) {
        var box = $('.wr-media', row);
        var img = box ? $('img', box) : null;
        if (!box || !img) return null;
        img.classList.add('wr-follow');
        return { row: row, box: box, img: img,
                 tx: 0, ty: 0, ts: 1,      // target
                 cx: 0, cy: 0, cs: 1 };    // current
      }).filter(Boolean);

      if (!items.length) return;

      var TRAVEL = 0.06;   // ±3% of the frame — stays inside the 1.07 scale headroom
      var SCALE  = 1.07;

      items.forEach(function (it) {
        it.row.addEventListener('mousemove', function (e) {
          var r = it.box.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var nx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
          var ny = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
          it.tx = nx * r.width * TRAVEL;    // moves WITH the cursor
          it.ty = ny * r.height * TRAVEL;
          it.ts = SCALE;
        }, { passive: true });

        it.row.addEventListener('mouseleave', function () {
          it.tx = 0; it.ty = 0; it.ts = 1;
        });
      });

      addTicker(function () {
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var dx = it.tx - it.cx, dy = it.ty - it.cy, ds = it.ts - it.cs;
          if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 && Math.abs(ds) < 0.0004) continue;
          it.cx += dx * 0.11;
          it.cy += dy * 0.11;
          it.cs += ds * 0.11;
          it.img.style.setProperty('--mx', it.cx.toFixed(2) + 'px');
          it.img.style.setProperty('--my', it.cy.toFixed(2) + 'px');
          it.img.style.setProperty('--ms', it.cs.toFixed(4));
        }
      });
    });

    // =========================================================
    // 9c. COLUMN DRIFT — homepage work grid
    // Odd cards rise slightly, even cards sink, mapped to how far
    // through the grid you've scrolled. Bounded so it can never
    // push a card into the section below.
    // =========================================================
    // =========================================================
    // VIDEO — play muted loops while in view, one-at-a-time sound
    // =========================================================
    safe('videoLoops', function () {
      var vids = $$('video[data-autoloop]');
      if (!vids.length) return;

      function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

      if ('IntersectionObserver' in window) {
        var vo = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            var v = en.target;
            if (en.isIntersecting) { if (v.paused) play(v); }
            else if (!v.paused && v.muted) { v.pause(); }   // never interrupt a video the user is listening to
          });
        }, { threshold: 0.25 });
        vids.forEach(function (v) { vo.observe(v); });
      } else {
        vids.forEach(play);
      }

      $$('[data-sound]').forEach(function (btn) {
        var frame = btn.parentNode;
        var v = $('video', frame);
        if (!v) return;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var turningOn = v.muted;
          if (turningOn) {
            // only one soundtrack at a time
            vids.forEach(function (o) {
              if (o !== v && !o.muted) {
                o.muted = true;
                var ob = $('[data-sound]', o.parentNode);
                if (ob) ob.textContent = 'Sound on';
              }
            });
          }
          v.muted = !turningOn ? true : false;
          btn.textContent = v.muted ? 'Sound on' : 'Sound off';
          if (v.paused) play(v);
        });
      });
    });

    // =========================================================
    // BOUNCING BALL LOOP — [data-balls] canvases
    // A train of balls follows one continuous path: a wide arc
    // across the top, then decaying bounces travelling back along
    // the floor. Squash on contact, vertical stretch + gradient
    // trail at speed. Pauses when off-screen.
    // =========================================================
    safe('ballLoop', function () {
      var canvases = $$('canvas[data-balls]');
      if (!canvases.length) return;

      var COLOR = '175,255,132';   // #AFFF84

      canvases.forEach(function (cv) {
        var ctx = cv.getContext && cv.getContext('2d');
        if (!ctx) return;

        var COUNT  = parseInt(cv.getAttribute('data-count'), 10) || 7;
        var PERIOD = parseFloat(cv.getAttribute('data-period')) || 3.4;   // seconds per lap

        var W = 0, H = 0, dpr = 1;
        function resize() {
          var r = cv.getBoundingClientRect();
          if (!r.width || !r.height) return false;
          dpr = Math.min(window.devicePixelRatio || 1, 2);
          W = r.width; H = r.height;
          cv.width  = Math.round(W * dpr);
          cv.height = Math.round(H * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          return true;
        }

        // --- path geometry -------------------------------------------------
        // A wave travels through the resting row: each ball throws itself up
        // in a full arc, lands, settles with two decaying hops, then waits
        // its turn again. Neighbours are offset by one slot of the cycle, so
        // the airborne balls read as an arc sweeping across the frame.
        var FLY  = 0.46;      // share of the cycle spent in the air
        var SET1 = 0.055;     // first settle hop
        var SET2 = 0.032;     // second settle hop
        var impacts = [FLY, FLY + SET1, FLY + SET1 + SET2, 1];

        function yAt(u, R, ground) {
          u = u - Math.floor(u);
          var apex = (ground - R) * 0.86, s;
          if (u < FLY) {
            s = u / FLY;
            return ground - 4 * apex * s * (1 - s);
          }
          var v = u - FLY;
          if (v < SET1) {
            s = v / SET1;
            return ground - 4 * (apex * 0.085) * s * (1 - s);
          }
          if (v < SET1 + SET2) {
            s = (v - SET1) / SET2;
            return ground - 4 * (apex * 0.028) * s * (1 - s);
          }
          return ground;
        }

        function draw(now) {
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, W, H);

          var R      = W / (COUNT * 2);          // balls exactly fill the width in a row
          var ground = H - R * 0.62;             // resting centre, slightly cropped by the frame
          var t      = now / 1000;

          for (var i = 0; i < COUNT; i++) {
            var u  = (t / PERIOD) - i / COUNT;   // wave travels left to right
            var x  = R + i * 2 * R;
            var y  = yAt(u, R, ground);
            var dt = 0.016 / PERIOD;
            var vy = (yAt(u + dt, R, ground) - y) / 0.016;   // px per second

            // stretch with vertical speed
            var speed   = Math.min(Math.abs(vy) / (H * 2.4), 1);
            var stretch = 1 + speed * 0.9;

            // squash pulse near each floor contact
            var lap = u - Math.floor(u), imp = 1;
            for (var k = 0; k < impacts.length; k++) {
              var d = Math.abs(lap - impacts[k]);
              d = Math.min(d, 1 - d) * PERIOD;   // seconds to nearest impact
              imp = Math.min(imp, d);
            }
            var squash = Math.exp(-(imp / 0.06) * (imp / 0.06));

            var sy = stretch * (1 - squash) + 0.7 * squash;
            var sx = 1 / Math.pow(sy, 0.6);

            var p = { x: x, y: y };
            var hw = R * sx, hh = R * sy;

            // gradient trail on the tail end when stretched
            var fade = clamp((sy - 1.12) / 0.75, 0, 1);
            var grad;
            if (fade > 0.02) {
              var down = vy > 0;
              grad = ctx.createLinearGradient(0, p.y - hh, 0, p.y + hh);
              if (down) {
                grad.addColorStop(0, 'rgba(' + COLOR + ',' + (1 - fade * 0.95).toFixed(3) + ')');
                grad.addColorStop(0.55, 'rgba(' + COLOR + ',' + (1 - fade * 0.35).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + COLOR + ',1)');
              } else {
                grad.addColorStop(0, 'rgba(' + COLOR + ',1)');
                grad.addColorStop(0.45, 'rgba(' + COLOR + ',' + (1 - fade * 0.35).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + COLOR + ',' + (1 - fade * 0.95).toFixed(3) + ')');
              }
            }

            ctx.fillStyle = grad || 'rgb(' + COLOR + ')';
            ctx.beginPath();
            var rad = Math.min(hw, hh);
            if (ctx.roundRect) {
              ctx.roundRect(p.x - hw, p.y - hh, hw * 2, hh * 2, rad);
            } else {
              ctx.arc(p.x, p.y, hw, 0, Math.PI * 2);
            }
            ctx.fill();
          }
        }

        function drawStatic() {
          // reduced-motion / no-rAF fallback: the resting row from the cover
          if (!W) return;
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, W, H);
          var R = W / (COUNT * 2), ground = H - R * 0.62;
          ctx.fillStyle = 'rgb(' + COLOR + ')';
          for (var i = 0; i < COUNT; i++) {
            ctx.beginPath();
            ctx.arc(R + i * R * 2, ground, R, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (!resize()) {
          // laid out later (e.g. font load) — try again on the next frame
          requestAnimationFrame(function () { resize(); });
        }
        cv.classList.add('is-live');

        if (!motionOK) { drawStatic(); return; }

        var visible = true;
        if ('IntersectionObserver' in window) {
          visible = false;
          new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
          }, { rootMargin: '120px' }).observe(cv);
        }

        var lastW = 0, lastH = 0;
        addTicker(function () {
          if (!visible) return;
          var r = cv.getBoundingClientRect();
          if (Math.abs(r.width - lastW) > 1 || Math.abs(r.height - lastH) > 1) {
            if (resize()) { lastW = r.width; lastH = r.height; }
          }
          if (W && H) draw(performance.now());
        });
      });
    });

    safe('columnDrift', function () {
      if (!motionOK || !fine) return;
      var grid = $('[data-drift-grid]');
      if (!grid) return;

      var cards = $$('.wcard', grid);
      if (cards.length < 2) return;

      var MAX = 70;   // px of travel in each direction

      addTicker(function () {
        var r = grid.getBoundingClientRect();
        var vh = window.innerHeight;
        if (r.bottom < -200 || r.top > vh + 200) return;   // offscreen
        // 0 when the grid is just below the fold, 1 when it has fully passed
        var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
        var shift = (p - 0.5) * 2 * MAX;                   // -MAX .. +MAX
        for (var i = 0; i < cards.length; i++) {
          var dir = (i % 2 === 0) ? -1 : 1;
          cards[i].style.setProperty('--drift', (shift * dir).toFixed(1) + 'px');
        }
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
