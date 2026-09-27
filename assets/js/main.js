// GPMA site – small progressive enhancements (the site works without JS)
var GPMA_SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
function gpmaLang() { return document.documentElement.getAttribute('data-lang') === 'pt' ? 'pt' : 'en'; }
function gpmaApplyLang() {
  var l = gpmaLang();
  document.querySelectorAll('option[data-en], input[data-en]').forEach(function (el) {
    var v = el.getAttribute('data-' + l);
    if (el.tagName === 'INPUT') el.placeholder = v; else el.textContent = v;
  });
  document.dispatchEvent(new Event('gpma:lang'));
}
(function () {
  document.querySelectorAll('[data-setlang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var l = b.getAttribute('data-setlang'), h = document.documentElement;
      h.setAttribute('data-lang', l); h.lang = l === 'pt' ? 'pt-BR' : 'en';
      try { localStorage.setItem('gpma-lang', l); } catch (e) {}
      gpmaApplyLang();
    });
  });
  gpmaApplyLang();
})();
(function () {
  // mobile menu
  var t = document.getElementById('navtoggle'), nav = document.getElementById('nav');
  if (t && nav) {
    t.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('is-open'); t.setAttribute('aria-expanded', 'false'); }
    });
  }

  // copy e-mail buttons
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.getAttribute('data-copy'));
      if (!el) return;
      var txt = el.textContent.trim(), label = b.textContent;
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = label; }, 1600); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(el);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, fallback);
      } else { fallback(); }
    });
  });

  // publication filters
  var list = document.getElementById('publist');
  if (list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('.pub'));
    var fLine = document.getElementById('f-line'), fType = document.getElementById('f-type'),
        fQ = document.getElementById('f-q'), count = document.getElementById('f-count'),
        empty = document.getElementById('f-empty');
    var run = function () {
      var line = fLine.value, type = fType.value, q = fQ.value.trim().toLowerCase(), n = 0;
      items.forEach(function (li) {
        var ok = (!line || li.getAttribute('data-line') === line) &&
                 (!type || li.getAttribute('data-type') === type) &&
                 (!q || li.textContent.toLowerCase().indexOf(q) >= 0);
        li.hidden = !ok; if (ok) n++;
      });
      count.textContent = n + ' ' + count.getAttribute('data-of-' + gpmaLang()) + ' ' + items.length;
      empty.hidden = n > 0;
    };
    [fLine, fType].forEach(function (el) { el.addEventListener('change', run); });
    fQ.addEventListener('input', run);
    document.addEventListener('gpma:lang', run);
    run();
  }
})();

// ------------------------------------------------------------------
// Home hero: carousel alternating photos and a printing simulation
// ------------------------------------------------------------------
(function () {
  var stage = document.getElementById('stage');
  if (!stage) return;
  var slides = Array.prototype.slice.call(stage.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(stage.querySelectorAll('.dot'));
  var pauseBtn = document.getElementById('stagePause');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var secs = parseFloat(stage.getAttribute('data-seconds')) || 7;
  var idx = 0, timer = null, playing = !reduce;
  var ACC = '#8BB0CE';

  // ---------- printing simulation ----------
  var TONES = {
    dark:  { bg: '#0B0D0F', grid: '#15191D', old: ['#34404B', '#1C232A'], cur: ['#EEF4F9', '#4E6C86'], acc: '#8BB0CE', glow: '139,176,206' },
    light: { bg: '#FFFFFF', grid: '#F0F2F4', old: ['#D5DCE3', '#E9EDF1'], cur: ['#141414', '#A3ADB8'], acc: '#2E6594', glow: '46,101,148' }
  };
  function Printer(canvas, hud) {
    this.c = canvas; this.hud = hud; this.ctx = canvas.getContext('2d');
    this.t = TONES[canvas.getAttribute('data-tone')] || TONES.dark;
    this.place = canvas.getAttribute('data-place') || 'right';
    this.raf = null; this.onDone = null;
  }
  Printer.prototype.size = function () {
    var r = this.c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
    this.c.width = this.w * d; this.c.height = this.h * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
    this.build();
  };
  Printer.prototype.build = function () {
    if (this.geo) return this.buildGeo();
    // fallback part: 120 x 80 mm plate with a 24 mm hole, fitted to the canvas
    var W = 120, H = 80, R = 12, wide = this.w > 900 && this.place === 'right';
    var s = wide ? Math.min(this.w * 0.42 / W, this.h * 0.62 / H) : Math.min(this.w * 0.82 / W, this.h * (this.place === 'right' ? 0.45 : 0.6) / H);
    this.s = s;
    this.ox = wide ? this.w * 0.73 - W * s / 2 : (this.w - W * s) / 2;
    this.oy = wide ? (this.h - H * s) / 2 - this.h * 0.02 : (this.place === 'right' ? this.h * 0.12 : (this.h - H * s) / 2 + this.h * 0.02);
    var self = this, cx = W / 2, cy = H / 2, bead = 1.6;
    function rect(o) { return [[o, o], [W - o, o], [W - o, H - o], [o, H - o], [o, o]]; }
    function circ(r) { var p = []; for (var k = 0; k <= 72; k++) { var a = k / 72 * Math.PI * 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
    function infill(sign) {
      var segs = [], lo = 2 * bead + 0.4, sp = 2.2, n = 0;
      for (var c = -H; c < W + H; c += sp) {
        // line: y = sign*(x - c)  -> param by x, clip to [lo, W-lo] x [lo, H-lo]
        var pts = [];
        for (var x = lo; x <= W - lo; x += 0.25) {
          var y = sign > 0 ? x - c : c - x + H;
          var inside = y >= lo && y <= H - lo && Math.hypot(x - cx, y - cy) > R + 2 * bead;
          pts.push(inside ? [x, y] : null);
        }
        var cur = [];
        for (var i = 0; i < pts.length; i++) {
          if (pts[i]) cur.push(pts[i]); else if (cur.length > 1) { segs.push([cur[0], cur[cur.length - 1]]); cur = []; } else cur = [];
        }
        if (cur.length > 1) segs.push([cur[0], cur[cur.length - 1]]);
      }
      segs.forEach(function (sg, i) { if (i % 2) sg.reverse(); });
      return segs;
    }
    this.layers = [0, 1].map(function (L) {
      var paths = [rect(bead / 2), rect(bead * 1.5), circ(R + bead / 2), circ(R + bead * 1.5)].concat(infill(L % 2 ? -1 : 1));
      var len = 0; paths.forEach(function (p) { for (var i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); });
      return { paths: paths, len: len, kinds: paths.map(function (p, i) { return i < 4 ? 0 : 1; }), widths: [1.6 * s, 0.9 * s] };
    });
    this.mm = 1; this.perLayer = 4.2;
  };
  // toolpath from assets/data/hero-toolpath.json (walls = drawing lines, infill = hatch)
  Printer.prototype.buildGeo = function () {
    var g = this.geo, W = g.w, H = g.h;
    var right = this.place === 'right' && this.w > 900;
    var s = right ? Math.min(this.w * 0.42 / W, this.h * 0.62 / H) : Math.min(this.w * 0.9 / W, this.h * 0.8 / H);
    this.s = s;
    this.ox = right ? this.w * 0.93 - W * s : (this.w - W * s) / 2;
    this.oy = (this.h - H * s) / 2 + (right ? this.h * 0.02 : 0);
    this.mm = g.mm_per_px || 0.1; this.perLayer = 6.5;
    var wallW = Math.max(1.5, g.wall * 0.62 * s), infW = Math.max(0.75, 2.2 * s);
    this.layers = g.layers.map(function (L) {
      var paths = L.walls.concat(L.infill), kinds = L.walls.map(function () { return 0; }).concat(L.infill.map(function () { return 1; }));
      var len = 0; paths.forEach(function (p) { for (var i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); });
      return { paths: paths, kinds: kinds, len: len, widths: [wallW, infW] };
    });
  };
  Printer.prototype.X = function (x) { return this.ox + x * this.s; };
  Printer.prototype.Y = function (y) { return this.oy + y * this.s; };
  Printer.prototype.drawPaths = function (layer, upto, colors) {
    var ctx = this.ctx, done = 0, tip = null, paths = layer.paths;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var k = 0; k < paths.length; k++) {
      var kind = layer.kinds[k];
      ctx.strokeStyle = colors[kind]; ctx.lineWidth = layer.widths[kind];
      var p = paths[k]; ctx.beginPath(); ctx.moveTo(this.X(p[0][0]), this.Y(p[0][1]));
      for (var i = 1; i < p.length; i++) {
        var seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        if (done + seg >= upto) {
          var f = (upto - done) / seg, x = p[i - 1][0] + f * (p[i][0] - p[i - 1][0]), y = p[i - 1][1] + f * (p[i][1] - p[i - 1][1]);
          ctx.lineTo(this.X(x), this.Y(y)); ctx.stroke(); return [x, y];
        }
        ctx.lineTo(this.X(p[i][0]), this.Y(p[i][1])); done += seg;
      }
      ctx.stroke(); tip = p[p.length - 1];
    }
    return tip;
  };
  Printer.prototype.frame = function (t) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var T = this.t;
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
    var step = (10 / this.mm) * this.s;
    for (var gx = this.ox % step; gx < w; gx += step) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
    for (var gy = this.oy % step; gy < h; gy += step) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
    var perLayer = this.perLayer, L = Math.min(this.layers.length - 1, Math.floor(t / perLayer));
    var frac = Math.min(1, (t - L * perLayer) / perLayer);
    for (var k = 0; k < L; k++) this.drawPaths(this.layers[k], 1e9, T.old);
    var tip = this.drawPaths(this.layers[L], frac * this.layers[L].len, T.cur);
    if (tip && frac < 1) {
      var x = this.X(tip[0]), y = this.Y(tip[1]);
      var g = ctx.createRadialGradient(x, y, 0, x, y, 18); g.addColorStop(0, 'rgba(' + T.glow + ',.8)'); g.addColorStop(1, 'rgba(' + T.glow + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = T.acc; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (this.hud) {
      var X = tip ? (tip[0] * this.mm).toFixed(2) : '0.00', Y = tip ? (tip[1] * this.mm).toFixed(2) : '0.00';
      this.hud.textContent = '; LAYER ' + (L + 1) + '/' + this.layers.length + '   Z ' + ((L + 1) * 0.2).toFixed(2) + ' mm\n' +
        'G1 X' + X + ' Y' + Y + ' E' + (frac * this.layers[L].len * this.mm * 0.033).toFixed(3) + '\n' +
        '; infill ' + (L % 2 ? '-45' : '+45') + '°  ' + Math.round(frac * 100) + '%';
    }
    return t >= perLayer * this.layers.length;
  };
  Printer.prototype.start = function (onDone) {
    var self = this; this.stop(); this.size(); this.onDone = onDone;
    if (reduce) { this.frame(this.perLayer * this.layers.length); return; }
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var finished = self.frame((ts - t0) / 1000);
      if (finished) { self.raf = null; if (self.onDone) setTimeout(self.onDone, 1200); return; }
      self.raf = requestAnimationFrame(step);
    }
    this.raf = requestAnimationFrame(step);
  };
  Printer.prototype.stop = function () { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; this.onDone = null; };

  // ---------- 3D inspection: extruded part, camera orbits 360° ----------
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  function loadThree(cb) {
    if (window.THREE) return cb(true);
    var s = document.createElement('script'); s.src = THREE_URL; s.async = true;
    s.onload = function () { cb(!!window.THREE); }; s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  function Orbit(canvas) { this.c = canvas; this.raf = null; this.ready = false; }
  Orbit.prototype.init = function (solid, printer) {
    var T = window.THREE; this.T = T; this.printer = printer;
    try { this.r = new T.WebGLRenderer({ canvas: this.c, antialias: true }); } catch (e) { return false; }
    this.r.setClearColor(0x0B0D0F, 1);
    this.scene = new T.Scene();
    this.cam = new T.PerspectiveCamera(28, 1, 1, 4000); this.cam.up.set(0, 0, 1);
    var sc = this.scene;
    sc.add(new T.HemisphereLight(0xE6EEF5, 0x0B0D0F, 0.75));
    var key = new T.DirectionalLight(0xffffff, 0.85); key.position.set(-80, -60, 140); sc.add(key);
    var rim = new T.DirectionalLight(0x8BB0CE, 0.55); rim.position.set(90, 120, 40); sc.add(rim);
    function mk(list, depth, color, rough) {
      var shapes = list.map(function (sh) {
        var s = new T.Shape(sh.outer.map(function (p) { return new T.Vector2(p[0], p[1]); }));
        sh.holes.forEach(function (h) { s.holes.push(new T.Path(h.map(function (p) { return new T.Vector2(p[0], p[1]); }))); });
        return s;
      });
      var g = new T.ExtrudeGeometry(shapes, { depth: depth, bevelEnabled: false, curveSegments: 1 });
      return new T.Mesh(g, new T.MeshStandardMaterial({ color: color, roughness: rough, metalness: 0.05 }));
    }
    var part = new T.Group();
    part.add(mk(solid.walls, solid.wall_h, 0xE9EEF2, 0.55));
    part.add(mk(solid.faces, solid.face_h, 0x3E5A73, 0.8));
    var box = new T.Box3().setFromObject(part), ctr = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
    this.center = new T.Vector3(ctr.x, ctr.y, solid.wall_h * 0.4); this.size = size;
    sc.add(part);
    var plate = new T.Mesh(new T.PlaneGeometry(size.x * 3, size.y * 3), new T.MeshStandardMaterial({ color: 0x101418, roughness: 1 }));
    plate.position.set(ctr.x, ctr.y, -0.05); sc.add(plate);
    var grid = new T.GridHelper(Math.max(size.x, size.y) * 3, 36, 0x26313B, 0x19212A);
    grid.rotation.x = Math.PI / 2; grid.position.set(ctr.x, ctr.y, 0); sc.add(grid);
    this.ready = true; return true;
  };
  Orbit.prototype.fit = function () {
    var T = this.T, p = this.printer, w = this.c.clientWidth || 10, h = this.c.clientHeight || 10;
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    // match the 2D top view: same on-screen size and position
    var pxPerMm = p.s / p.mm, fracH = (this.size.y * pxPerMm) / h;
    this.d0 = (this.size.y / 2) / Math.tan(T.MathUtils.degToRad(this.cam.fov / 2)) / fracH;
    var cx = p.ox + (this.size.x * pxPerMm) / 2, cy = p.oy + (this.size.y * pxPerMm) / 2;
    this.cam.setViewOffset(w, h, -(cx - w / 2), -(cy - h / 2), w, h);
    this.cam.updateProjectionMatrix();
  };
  Orbit.prototype.pose = function (el, az, dist) {
    var T = this.T, c = this.center, e = T.MathUtils.degToRad(el), a = T.MathUtils.degToRad(az);
    this.cam.position.set(c.x + dist * Math.cos(e) * Math.cos(a), c.y + dist * Math.cos(e) * Math.sin(a), c.z + dist * Math.sin(e));
    this.cam.lookAt(c); this.r.render(this.scene, this.cam);
  };
  Orbit.prototype.run = function (secs, onDone) {
    var self = this; this.stop(); this.fit();
    function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = (ts - t0) / 1000 / secs;
      var tilt = ease(p / 0.18) - ease((p - 0.86) / 0.14);          // 0 → 1 → 0
      var el = 89.5 - tilt * 57;                                    // top view → 32.5° → top view
      var az = -90 + 360 * ease((p - 0.12) / 0.78);                 // one full turn
      var dist = self.d0 * (1 + 0.18 * tilt);
      self.pose(el, az, dist);
      if (p >= 1) { self.raf = null; if (onDone) onDone(); return; }
      self.raf = requestAnimationFrame(step);
    }
    this.raf = requestAnimationFrame(step);
  };
  Orbit.prototype.stop = function () { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; };

  // ---------- hero cycle: print (2D) → orbit (3D) → repeat ----------
  var slide = stage.querySelector('.slide');
  var printer = new Printer(stage.querySelector('.slide__canvas'), stage.querySelector('.hud'));
  var glCanvas = stage.querySelector('.slide__gl');
  var orbit = null, geo = null, cycleTimer = null;
  function cycle() {
    clearTimeout(cycleTimer);
    slide.classList.remove('is-3d');
    printer.start(function () {
      if (!playing) return;
      if (orbit && orbit.ready) {
        orbit.fit(); orbit.pose(89.5, -90, orbit.d0);
        slide.classList.add('is-3d');
        orbit.run(14, function () {
          slide.classList.remove('is-3d');
          if (playing) cycleTimer = setTimeout(cycle, 900);
        });
      } else if (playing) cycleTimer = setTimeout(cycle, 600);
    });
  }
  function haltAll() { clearTimeout(cycleTimer); printer.stop(); if (orbit) orbit.stop(); }
  if (pauseBtn) {
    var lbl = function () {
      var key = playing ? 'data-pause' : 'data-play', parts = (pauseBtn.getAttribute(key) || 'Pause|Pausar').split('|');
      pauseBtn.setAttribute('aria-label', gpmaLang() === 'pt' ? parts[1] : parts[0]);
      pauseBtn.textContent = playing ? 'II' : '▶';
      pauseBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
    };
    lbl(); document.addEventListener('gpma:lang', lbl);
    pauseBtn.addEventListener('click', function () {
      playing = !playing; lbl();
      if (playing) cycle(); else { haltAll(); slide.classList.remove('is-3d'); printer.size(); printer.frame(999); }
    });
  }
  var rt; window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(function () { printer.size(); if (!printer.raf) printer.frame(999); if (orbit && orbit.ready) orbit.fit(); }, 150);
  });
  function begin() {
    if (reduce) { printer.size(); printer.frame(999); return; }
    cycle();
    if (geo && geo.solid && glCanvas) loadThree(function (ok) {
      if (!ok) return;
      printer.size();
      orbit = new Orbit(glCanvas); if (!orbit.init(geo.solid, printer)) orbit = null;
    });
  }
  var tpUrl = GPMA_SCRIPT_SRC ? new URL('../data/hero-toolpath.json', GPMA_SCRIPT_SRC).href : '';
  if (tpUrl && window.fetch) {
    fetch(tpUrl).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.layers) { geo = d; printer.geo = d; } begin(); })
      .catch(function () { begin(); });
  } else begin();
})();

/* Logo sizing: a single rule for horizontal, square and vertical marks.
   Every logo gets the same visual area, so a wide wordmark and a square seal read at the same weight. */
(function () {
  var AREA = 2900, MAX_H = 50, MAX_W = 150;
  function size(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return;
    var r = w / h, k = parseFloat(img.getAttribute('data-scale') || '1');
    var a = AREA * k * k;
    var lw = Math.sqrt(a * r), lh = Math.sqrt(a / r);
    var cap = Math.min(1, (MAX_H * k) / lh, (MAX_W * k) / lw);
    img.style.width = Math.round(lw * cap) + 'px';
    img.style.height = Math.round(lh * cap) + 'px';
    img.classList.add('is-sized');
  }
  function run() {
    document.querySelectorAll('.affil__logo').forEach(function (img) {
      if (img.complete && img.naturalWidth) size(img); else img.addEventListener('load', function () { size(img); }, { once: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
