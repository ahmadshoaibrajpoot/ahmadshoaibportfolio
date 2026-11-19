class Component extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = { filter: 'all', step: 0, menu: false, sec: 0, ticks: [], ready: false };
  }
  componentDidUpdate() {
    this._syncSeg();
    this._syncShots();
    this._reveal();
  }
  _syncSeg() {
    const seg = this._seg;
    if (!seg) return;
    const on = seg.querySelector('.vx-t.on'), ind = seg.querySelector('.vx-ind');
    if (!on || !ind) return;
    ind.style.width = on.offsetWidth + 'px';
    ind.style.height = on.offsetHeight + 'px';
    ind.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
    if (!seg.classList.contains('ready')) requestAnimationFrame(() => seg.classList.add('ready'));
  }
  _reveal() {
    const root = this._root;
    if (!root) return;
    const vh = window.innerHeight || 800;
    const all = !this._motionOn || !(this.state && this.state.ready);
    root.querySelectorAll('.rv:not(.in)').forEach((el) => {
      if (!this._motionOn || (!all && el.getBoundingClientRect().top < vh * 0.9)) el.classList.add('in');
    });
  }
  _startLoader() {
    if (this._ldrStarted) return;
    this._ldrStarted = true;
    let skip = false, reduce = false;
    try { skip = window.sessionStorage.getItem('as-pf-loaded') === '1'; } catch (e) {}
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    const done = () => {
      try { window.sessionStorage.setItem('as-pf-loaded', '1'); } catch (e) {}
      if (!(this.state && this.state.ready)) this.setState({ ready: true });
      setTimeout(() => this._measure(), 900);
    };
    if (skip || reduce || !this._motionOn) { done(); return; }
    // the counter follows real work: it waits for the fonts, and never runs past 92% until they are in
    let fontsIn = false;
    const fr = document.fonts && document.fonts.ready;
    if (fr && fr.then) fr.then(() => { fontsIn = true; }); else fontsIn = true;
    const t0 = performance.now(), MIN = 1700, MAX = 4500;
    let shown = 0;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const tick = (t) => {
      const el = t - t0;
      let goal = ease(Math.min(1, el / MIN));
      if (!fontsIn && el < MAX) goal = Math.min(goal, 0.92);
      shown += (goal - shown) * 0.22;
      if (goal >= 1 && shown > 0.995) shown = 1;
      if (this._ldrNum) this._ldrNum.textContent = String(Math.round(shown * 100)).padStart(3, '0');
      if (this._ldrBar) this._ldrBar.style.setProperty('--p', shown.toFixed(4));
      if (shown < 1) requestAnimationFrame(tick); else setTimeout(done, 260);
    };
    requestAnimationFrame(tick);
  }
  _syncShots() {
    const root = this._root;
    if (!root) return;
    const view = root.querySelector('.shot-view');
    if (!view) return;
    const vr = view.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const seen = vr.bottom > 0 && vr.top < vh;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    const auto = seen && this._motionOn && !reduce;
    root.querySelectorAll('video.auto-v').forEach((v) => {
      const r = v.getBoundingClientRect();
      const on = r.bottom > 0 && r.top < vh && this._motionOn && !reduce;
      if (on) {
        if (!v.getAttribute('src')) { v.preload = 'auto'; v.setAttribute('src', v.getAttribute('data-src')); }
        v.muted = true;
        if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      } else if (!v.paused) v.pause();
    });
    const cur = this._shotPageNow || 0;
    if (!this._warm && vr.top < vh * 2.5 && vr.bottom > -vh) {
      this._warm = true;
      // fetch and decode every cover now, so paging never waits on the network
      view.querySelectorAll('.shot-img').forEach((img) => {
        img.loading = 'eager';
        const src = img.getAttribute('src');
        const pre = new Image();
        pre.decoding = 'async';
        pre.src = src;
        if (pre.decode) pre.decode().catch(() => {});
      });
    }
    view.querySelectorAll('.shot-page').forEach((pg, i) => {
      const on = i === cur;
      pg.inert = !on;
      if (on) pg.removeAttribute('aria-hidden'); else pg.setAttribute('aria-hidden', 'true');
      pg.querySelectorAll('.shot-img').forEach((img) => {
        const src = img.getAttribute('src');
        if (img.getAttribute('data-ok') !== src) {
          if (img.complete && img.naturalWidth) { img.setAttribute('data-ok', src); img.classList.add('in'); }
          else img.classList.remove('in');
        }
      });
      pg.querySelectorAll('.shot-m').forEach((wrap) => {
        const v = wrap.querySelector('video');
        if (!v) return;
        const want = on && auto && !this._paused[wrap.getAttribute('data-name')];
        if (!want && this._warm && i === cur + 1 && !v.getAttribute('src')) {
          v.preload = 'auto';
          v.setAttribute('src', v.getAttribute('data-src'));
        }
        if (want) {
          if (v.getAttribute('src') !== v.getAttribute('data-src')) { v.preload = 'auto'; v.setAttribute('src', v.getAttribute('data-src')); }
          v.muted = true;
          if (!v._wired) {
            v._wired = true;
            v.addEventListener('playing', () => { if (v.parentElement) v.parentElement.classList.add('playing'); });
            v.addEventListener('pause', () => { if (v.parentElement) v.parentElement.classList.remove('playing'); });
          }
          if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        } else if (!v.paused) {
          v.pause();
        }
        if (!want) wrap.classList.remove('playing');
      });
    });
  }
  componentWillUnmount() {
    this._stopMesh();
    this._unbindScroll();
  }
  _bindScroll() {
    if (this._scrollBound) return;
    this._scrollBound = true;
    this._onScroll = () => {
      if (this._sraf) return;
      this._sraf = requestAnimationFrame(() => { this._sraf = 0; this._measure(); });
    };
    window.addEventListener('scroll', this._onScroll, { passive: true, capture: true });
    window.addEventListener('resize', this._onScroll);
    this._onScroll();
    this._late = setTimeout(this._onScroll, 600);
    this._startLoader();
    this._stTimer = setInterval(() => {
      const root = this._root, st = this.state || {};
      if (!root || !this._motionOn || st.stepAuto === false) return;
      const el = root.querySelector('#process');
      if (!el) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
      if (r.top > vh * 0.6 || r.bottom < vh * 0.3) return;
      this.setState({ step: ((st.step || 0) + 1) % 5 });
    }, 10000);
  }
  _unbindScroll() {
    if (!this._scrollBound) return;
    this._scrollBound = false;
    window.removeEventListener('scroll', this._onScroll, { capture: true });
    window.removeEventListener('resize', this._onScroll);
    clearTimeout(this._late);
    clearInterval(this._stTimer);
    clearTimeout(this._copyT);
    if (this._sraf) cancelAnimationFrame(this._sraf);
    this._sraf = 0;
  }
  _measure() {
    this._syncSeg();
    if (this._lpPin) this._lpPin();
    const root = this._root;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const span = r.height - vh;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const prog = span > 4 ? clamp(-r.top / span) : 0;
    if (this._dot) this._dot.style.top = (prog * 100).toFixed(2) + '%';
    const ids = this._secIds;
    const ticks = [];
    let cur = 0;
    for (let i = 0; i < ids.length; i++) {
      const el = i === 0 ? root : root.querySelector('#' + ids[i]);
      if (!el) { ticks.push(0); continue; }
      const top = el.getBoundingClientRect().top;
      const pos = top - r.top;
      ticks.push(Math.round((span > 4 ? clamp(pos / span) : clamp(pos / Math.max(1, r.height))) * 1000) / 10);
      if (top <= vh * 0.45) cur = i;
    }
    const s = this.state || {};
    const cw = r.width;
    const cols = cw >= 1180 ? 3 : cw >= 760 ? 2 : 1;
    if (cur !== s.sec || ticks.join() !== (s.ticks || []).join() || cols !== (s.shotCols || 3)) this.setState({ sec: cur, ticks, shotCols: cols });
    this._syncShots();
    this._reveal();
  }
  _stopMesh() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
  _startMesh() {
    if (this._raf || !this._cv) return;
    const loop = (t) => {
      this._raf = requestAnimationFrame(loop);
      this._drawMesh(t);
    };
    this._raf = requestAnimationFrame(loop);
  }
  _drawMesh(t) {
    const cv = this._cv;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > (window.innerHeight || 2000)) { this._lastT = t; return; }
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = this._ctx && this._ctx.canvas === cv ? this._ctx : (this._ctx = cv.getContext('2d'));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const dt = Math.min(50, Math.max(1, t - (this._lastT || t - 16)));
    this._lastT = t;
    const f = dt / 16.667; // 1 at 60fps
    const follow = (tau) => 1 - Math.exp(-dt / tau);

    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    const physics = this._motionOn && !reduce;

    // ---- pointer -------------------------------------------------------
    // Until the visitor first moves the mouse, the light is parked on the right.
    const parked = !this._touched;
    const raw = parked ? { x: w * 0.74, y: h * 0.5 } : (this._target || { x: w * 0.74, y: h * 0.5 });
    const on = parked || this._hover;
    const prevPresence = this._pr || 0;
    this._pr = prevPresence + ((on ? 1 : 0) - prevPresence) * follow(on ? 180 : 380);
    const presence = this._pr;

    if (!this._p) { this._p = { x: raw.x, y: raw.y }; this._s = { x: raw.x, y: raw.y }; this._d = { x: raw.x, y: raw.y }; this._ring = { x: raw.x, y: raw.y }; this._pv = { x: 0, y: 0 }; }
    if (on && prevPresence < 0.04) { // re-entering: start where the cursor is, don't glide across the page
      this._p.x = this._s.x = this._d.x = this._ring.x = raw.x;
      this._p.y = this._s.y = this._d.y = this._ring.y = raw.y;
    }
    const lpx = this._p.x, lpy = this._p.y;
    if (on) { this._p.x = raw.x; this._p.y = raw.y; }
    // pointer velocity (px per 60fps frame), lightly smoothed
    const vx = (this._p.x - lpx) / f, vy = (this._p.y - lpy) / f;
    this._pv.x += (vx - this._pv.x) * 0.5; this._pv.y += (vy - this._pv.y) * 0.5;
    const pvx = Math.max(-60, Math.min(60, this._pv.x)), pvy = Math.max(-60, Math.min(60, this._pv.y));

    // light, dot and ring each trail the cursor a bit more than the last
    const fs = follow(170), fd = follow(70), fr = follow(320);
    this._s.x += (this._p.x - this._s.x) * fs; this._s.y += (this._p.y - this._s.y) * fs;
    this._d.x += (this._p.x - this._d.x) * fd; this._d.y += (this._p.y - this._d.y) * fd;
    this._ring.x += (this._p.x - this._ring.x) * fr; this._ring.y += (this._p.y - this._ring.y) * fr;
    const sx = this._s.x, sy = this._s.y, ppx = this._p.x, ppy = this._p.y;

    // ---- grid ----------------------------------------------------------
    const S = 36;
    const cols = Math.ceil(w / S) + 3, rows = Math.ceil(h / S) + 3;
    const gx0 = (w - (cols - 1) * S) / 2, gy0 = (h - (rows - 1) * S) / 2;
    const N = cols * rows;
    if (!this._ox || this._ox.length !== N) {
      this._ox = new Float32Array(N); this._oy = new Float32Array(N);
      this._vx = new Float32Array(N); this._vy = new Float32Array(N);
      this._X = new Float32Array(N); this._Y = new Float32Array(N); this._I = new Float32Array(N);
    }
    const ox = this._ox, oy = this._oy, nvx = this._vx, nvy = this._vy, X = this._X, Y = this._Y, I = this._I;

    const SIG = 118;            // size of the light
    const inv2s = 1 / (2 * SIG * SIG);
    const PSIG = 105;           // reach of the cursor's push
    const invP = 1 / (2 * PSIG * PSIG);
    const K = 0.07, DAMP = Math.pow(0.885, f), BULGE = 13, DRAG = 0.05;
    const maxOff = S * 0.85;

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const n = j * cols + i;
        const rx = gx0 + i * S, ry = gy0 + j * S;
        // spring-mass node: the cursor drags it along and bulges it outward, then it wobbles back
        const dx = rx - ppx, dy = ry - ppy;
        const d2 = dx * dx + dy * dy;
        let txo = 0, tyo = 0;
        if (d2 < 160000 && presence > 0.01) {
          const infl = Math.exp(-d2 * invP) * presence;
          const d = Math.sqrt(d2) + 0.0001;
          const b = BULGE * infl * (d / (d + 46));
          txo = (dx / d) * b; tyo = (dy / d) * b;
          if (physics) { nvx[n] += pvx * infl * DRAG * f; nvy[n] += pvy * infl * DRAG * f; }
        }
        if (physics) {
          nvx[n] += (txo - ox[n]) * K * f; nvy[n] += (tyo - oy[n]) * K * f;
          nvx[n] *= DAMP; nvy[n] *= DAMP;
          ox[n] += nvx[n] * f; oy[n] += nvy[n] * f;
          const m2 = ox[n] * ox[n] + oy[n] * oy[n];
          if (m2 > maxOff * maxOff) { const m = maxOff / Math.sqrt(m2); ox[n] *= m; oy[n] *= m; }
        } else { ox[n] = txo; oy[n] = tyo; }
        const x = rx + ox[n], y = ry + oy[n];
        X[n] = x; Y[n] = y;
        const ex = x - sx, ey = y - sy;
        I[n] = Math.exp(-(ex * ex + ey * ey) * inv2s) * presence;
      }
    }

    // ---- lines: grid + one diagonal, barely there until the light hits them
    const BK = 12;
    const paths = this._paths || (this._paths = []);
    for (let b = 0; b < BK; b++) paths[b] = null;
    const base = new Path2D();
    const add = (a, c) => {
      const k = (I[a] + I[c]) * 0.5;
      if (k < 0.02) { base.moveTo(X[a], Y[a]); base.lineTo(X[c], Y[c]); return; }
      const bi = Math.min(BK - 1, (k * BK) | 0);
      const p = paths[bi] || (paths[bi] = new Path2D());
      p.moveTo(X[a], Y[a]); p.lineTo(X[c], Y[c]);
    };
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const n = j * cols + i;
        add(n, n + 1); add(n, n + cols); add(n, n + cols + 1);
      }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.028)';
    ctx.stroke(base);
    for (let b = 0; b < BK; b++) {
      if (!paths[b]) continue;
      const k = (b + 0.5) / BK;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.03 + 0.5 * Math.pow(k, 1.15)).toFixed(3) + ')';
      ctx.stroke(paths[b]);
    }

    // ---- nodes: tiny dim dots; inside the light they become soft glowing points
    if (!this._glow) {
      const gc = document.createElement('canvas'); gc.width = gc.height = 64;
      const g2 = gc.getContext('2d');
      const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.18, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.16)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      this._glow = gc;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.075)';
    for (let n = 0; n < N; n++) {
      if (I[n] < 0.03) ctx.fillRect(X[n] - 0.6, Y[n] - 0.6, 1.2, 1.2);
    }
    for (let n = 0; n < N; n++) {
      const k = I[n];
      if (k < 0.03) continue;
      ctx.globalAlpha = Math.min(1, 0.12 + k * 0.95);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(X[n], Y[n], 0.7 + k * 1.5, 0, 6.2832); ctx.fill();
      if (k > 0.22) {
        const r = 4 + k * 9;
        ctx.globalAlpha = Math.min(1, (k - 0.22) * 1.15);
        ctx.drawImage(this._glow, X[n] - r, Y[n] - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;

    // ---- cursor companions: a small dot close behind, a thin ring further behind
    if (presence > 0.02) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.2 * presence).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this._ring.x, this._ring.y, 16, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * presence).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(this._d.x, this._d.y, 2.6, 0, 6.2832); ctx.fill();
    }
  }
  renderVals() {
    const accent = this.props.accent ?? '#93B1FF';
    const motion = this.props.motion ?? true;
    this._accent = accent;
    this._motionOn = motion;
    this._secIds = ['top', 'about', 'work', 'kind-words', 'process', 'toolkit', 'experience', 'contact'];
    const secNames = ['HOME', 'ABOUT', 'WORK', 'RECOMMENDATIONS', 'PROCESS', 'TOOLKIT', 'EXPERIENCE', 'CONTACT'];
    if (!this._rootRef) {
      this._rootRef = (el) => { if (el) { this._root = el; this._bindScroll(); } else { this._unbindScroll(); this._root = null; } };
      this._dotRef = (el) => { this._dot = el; };
      this._segRef = (el) => { this._seg = el; if (el) requestAnimationFrame(() => this._syncSeg()); };
      this._ldrNumRef = (el) => { this._ldrNum = el; };
      this._ldrBarRef = (el) => { this._ldrBar = el; };
      this._toggleMenu = () => this.setState({ menu: !(this.state && this.state.menu) });
      this._closeMenu = () => { if (this.state && this.state.menu) this.setState({ menu: false }); };
    }
    const st0 = this.state || {};
    const menuOpen = !!st0.menu;
    const secIdx = st0.sec || 0;
    const menu = [['About', '#about'], ['Work', '#work'], ['Process', '#process'], ['Experience', '#experience'], ['Contact', '#contact']]
      .map((m, i) => ({ label: m[0].toUpperCase(), href: m[1], num: '0' + (i + 1), delay: (0.18 + i * 0.06).toFixed(2) + 's' }));
    const menu2 = [['Recommendations', '#kind-words'], ['Toolkit', '#toolkit']].map((m) => ({ label: m[0].toUpperCase(), href: m[1] }));
    const ticks = (st0.ticks || []).map((v) => ({ top: v + '%' }));
    if (!this._meshRef) {
      this._meshRef = (el) => {
        if (el) { this._cv = el; this._startMesh(); }
        else { this._stopMesh(); this._cv = null; }
      };
      this._onHeroMove = (e) => {
        if (!this._cv) return;
        const r = this._cv.getBoundingClientRect();
        this._target = { x: e.clientX - r.left, y: e.clientY - r.top };
        this._hover = true;
        this._touched = true;
      };
      this._onHeroLeave = () => { this._hover = false; this._touched = true; };
    }
    const s = this.state || {};
    const filter = s.filter || 'all';
    const step = s.step || 0;

    const words = ['UX Research', 'Interface Design', 'Design Systems', 'Prototyping', 'Mobile Apps', 'SaaS Dashboards', 'Usability Testing', 'Dev Handoff'];
    const marquee = words.concat(words).map((w) => ({ label: w }));

    const tools = ['Figma', 'FigJam', 'Adobe XD', 'Illustrator', 'Photoshop', 'InDesign', 'After Effects', 'Webflow', 'Framer', 'HTML / CSS', 'VS Code', 'Figma AI', 'Claude', 'Midjourney'].map((t) => ({ label: t }));

    const toolsText = tools.map((t) => t.label).join(', ') + '.';
    const tkData = [
      [['FJ', 'FigJam', 'Flows, journeys and team critiques'], ['Mi', 'Miro', 'Workshops and affinity maps']],
      [['Fg', 'Figma', 'UI, components and prototypes'], ['Xd', 'Adobe XD', 'Legacy files and quick prototypes'], ['Il', 'Illustrator', 'Icons, illustrations and vector assets'], ['Ph', 'Photoshop', 'Image editing and mockups'], ['In', 'InDesign', 'Print and editorial layouts']],
      [['AE', 'After Effects', 'Product motion and micro-interactions'], ['Pr', 'Premiere Pro', 'Editing product and case-study videos']],
      [['FA', 'Figma AI', 'Faster layouts and content variants'], ['Cl', 'Claude', 'Research synthesis and UX writing'], ['Mj', 'Midjourney', 'Moodboards and visual exploration'], ['Hf', 'Higgsfield', 'AI video and imagery for concepts'], ['CG', 'ChatGPT', 'Ideation, copy drafts and quick research']],
      [['Wf', 'Webflow', 'Production sites with a CMS'], ['Fr', 'Framer', 'Interactive sites and prototypes'], ['<>', 'HTML / CSS', 'Hand-built pages and fixes'], ['VS', 'VS Code', 'Reading and editing front-end code']]
    ].map((g) => g.map(([b, name, use]) => ({ b, name, use })));
    const tkCount = tkData.reduce((n, g) => n + g.length, 0);

    const socials = [
      // original line icons: a grid of shots, stacked case studies, a briefcase
      { label: 'Dribbble', aria: 'Dribbble: UI shots (opens in a new tab)', handle: '@im_ahmad', url: 'https://dribbble.com/im_ahmad', icon: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z' },
      { label: 'Behance', aria: 'Behance: case studies (opens in a new tab)', handle: '@im_ahmad', url: 'https://www.behance.net/im_ahmad', icon: 'M12 3 3 7.5 12 12l9-4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5' },
      { label: 'LinkedIn', aria: 'LinkedIn profile (opens in a new tab)', handle: '/ahmad-shoaib1', url: 'https://www.linkedin.com/in/ahmad-shoaib1/', icon: 'M4 8h16v11H4zM9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M4 13h16' }
    ];

    const portfolio = [
      { label: 'BEHANCE', note: 'Case studies and full projects', url: 'https://www.behance.net/im_ahmad' },
      { label: 'DRIBBBLE', note: 'Shots and UI explorations', url: 'https://dribbble.com/im_ahmad' }
    ];

    const shotData = [
      { name: 'Motorcycle Heaven', ind: 'Automotive', desc: 'Motorcycle showroom website', kind: 'WEB', url: 'https://dribbble.com/shots/27822089-Ducati-Website-Concept', img: 'assets/c92685cc3917d78fc22759e65291dc36.jpg', vid: 'assets/70119020276c7ff7344291a6318810a0.mp4' },
      { name: 'LuxDrive', ind: 'Automotive', desc: 'Exotic car booking app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27819986-Exotic-Car-Booking-App', img: 'assets/7a31ec0dca0fd3c10ec3f1380d226fed.jpg', vid: 'assets/4a4822a30c4cfcc388e3e01e6b029e47.mp4' },
      { name: 'Verdance', ind: 'Travel', desc: 'Forest retreat landing page', kind: 'WEB', url: 'https://dribbble.com/shots/27847034-Verdance-Forest-Retreat-Landing-Page', img: 'assets/dd2ec0b1082dc5c09de20dbe14c3aea8.jpg', vid: 'assets/3a43388350f53020acd12c7e95bf405b.mp4' },
      { name: 'Haven', ind: 'Travel', desc: 'Hotel and resort booking app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27837963-Resort-and-Hotel-Booking-App', img: 'assets/2c3d47dbb523241ff1353ea1ba3ddad0.jpg', vid: 'assets/8c5cc349894b85bee10740e060ead0f4.mp4' },
      { name: 'Nocturne', ind: 'AI', desc: 'AI model landing page', kind: 'WEB', url: 'https://dribbble.com/shots/27843921-Next-Gen-AI-Hero', img: 'assets/002df0e69ce269a621a26ed1e1e34eca.jpg', vid: 'assets/20586747a2627d404c61d7ff23b0d0b7.mp4' },
      { name: 'Nexora', ind: 'Productivity', desc: 'Workspace dashboard for creative teams', kind: 'DASHBOARD', url: 'https://dribbble.com/shots/27834612-Tech-Team-Management-System', img: 'assets/28ca7a55db3063cf3f3302ed94e0ff27.jpg', vid: 'assets/7cd1f359a897e5fde3fe06245f95ebc0.mp4' },
      { name: 'Infinitude', ind: 'Health & Fitness', desc: 'Meditation and breathwork app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27837997-Meditation-App', img: 'assets/356b87ae8bd410ecb5203c3d14f709b3.jpg', vid: 'assets/28a7eab397d32463b9354365acb2b195.mp4' },
      { name: 'Lumora', ind: 'Finance', desc: 'Personal finance dashboard', kind: 'DASHBOARD', url: 'https://dribbble.com/shots/27812582-Finance-Management-Dashboard', img: 'assets/8de2814bc267e4a9798ed1b0f0da891a.jpg', vid: 'assets/ca5176e84988638aa4ea7c3292300504.mp4' },
      { name: 'Lunar Builder', ind: 'AI', desc: 'AI website builder dashboard', kind: 'DASHBOARD', url: 'https://dribbble.com/im_ahmad', img: 'assets/ea5ef1dbe9be520f8b2dbc3c401dea14.jpg', vid: 'assets/32f2a157db5db8b22d3da8bbc9558b78.mp4' },
      { name: 'Waggle', ind: 'E-commerce', desc: 'Pet store shopping app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27819808-Pet-Store-App', img: 'assets/d0ca44b99cfb54aa43cd79d35942f557.jpg', vid: 'assets/6a7d8fa74712cfb6349b0800a1dee8f4.mp4' },
      { name: 'Wildroot', ind: 'Travel', desc: 'Wilderness travel website', kind: 'WEB', url: 'https://dribbble.com/shots/27814214-Wilderness-Website-Design', img: 'assets/df0b56e6f78c98d3a6a6209e30fa403f.jpg', vid: 'assets/2f36a2353d3450bdc578fea56fcefc7d.mp4' },
      { name: 'Nook', ind: 'E-commerce', desc: 'Furniture shopping app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27818940-Furniture-App-Design', img: 'assets/7f94c59e40ba8ee736fbd09e0acffaff.jpg', vid: 'assets/d034bf300468380cc95f295331157b84.mp4' },
      { name: 'Nova', ind: 'AI', desc: 'AI agent assistant app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27813729-Ai-Agentic-App', img: 'assets/4a20814cf0e0a2cf2b925a3100b79c41.jpg', vid: 'assets/e729ef9891c6c57a9fa2ad3e29a05c91.mp4' },
      { name: 'Lunio', ind: 'AI', desc: 'AI website builder landing page', kind: 'WEB', url: 'https://dribbble.com/im_ahmad', img: 'assets/5020df68de08156285cb9a90480e11ca.jpg', vid: 'assets/be557b9129f342265a30bdf6f07ae4e0.mp4' },
      { name: 'Teo', ind: 'Productivity', desc: 'Recruitment and hiring dashboard', kind: 'DASHBOARD', url: 'https://dribbble.com/shots/27812447-Tech-Company-Management-System', img: 'assets/602299703b3deab69e8bb3263367f0e3.jpg', vid: '' },
      { name: 'Crave', ind: 'Food', desc: 'Food delivery app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27820618-Fast-Food-App', img: 'assets/516ccd46ce3b6ffd8b2c8a86fab803e5.jpg', vid: '' },
      { name: 'Luma', ind: 'E-commerce', desc: 'Eyewear shopping app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27824825-Shades-Mobile-App', img: 'assets/0c695d2ca5f76a4815eee8e5ffdf0021.jpg', vid: '' },
      { name: 'Exover', ind: 'Finance', desc: 'Currency exchange and banking dashboard', kind: 'DASHBOARD', url: 'https://dribbble.com/shots/23925045-Currency-Exchange-Management-Dashboard', img: 'assets/eb94810c0e5170bfbec054cb0f984a5b.jpg', vid: '' },
      { name: 'Pulse', ind: 'Health & Fitness', desc: 'Health and activity tracking app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27814209-Health-Care-App', img: 'assets/6a06e6b5e6bad7233a1e36037be48d26.jpg', vid: '' },
      { name: 'Munch', ind: 'Food', desc: 'Recipe and calorie tracking app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27817009-Food-Calorie-App', img: 'assets/9950aaf7f2cad77acb1c73c1a0911e7f.jpg', vid: '' },
      { name: 'Garage', ind: 'Automotive', desc: 'Car companion app', kind: 'MOBILE', url: 'https://dribbble.com/shots/27817029-Car-Inspection-App', img: 'assets/ce33d53b720ad637f5f4eda9ddb422a4.jpg', vid: '' },
      { name: 'Team Assistant', ind: 'Productivity', desc: 'Hotel housekeeping management app', kind: 'MOBILE', url: 'https://dribbble.com/shots/23925011-Hotel-Management-App', img: 'assets/586be4aa664678985148d49b8fd60137.jpg', vid: '' },
      { name: 'ReZip', ind: 'E-commerce', desc: 'Reusable packaging rewards app', kind: 'MOBILE', url: 'https://www.behance.net/gallery/194403009/Packaging-Mobile-App', img: 'assets/8f31c634f463844df8545c4c5f28f8b5.jpg', vid: '' },
      { name: 'Gym Admin', ind: 'Health & Fitness', desc: 'Gym management dashboard', kind: 'DASHBOARD', url: 'https://dribbble.com/im_ahmad', img: 'assets/50fc155d5eccb2a07babc7b3069700a2.jpg', vid: '' },
      { name: 'Coaching Club', ind: 'Business', desc: 'Esports coaching dashboard', kind: 'DASHBOARD', url: 'https://dribbble.com/im_ahmad', img: 'assets/93dcddebd0f0c5efd5b0bdb25b266029.jpg', vid: '' },
      { name: 'ContentLab74', ind: 'Business', desc: 'Marketing agency website', kind: 'WEB', url: 'https://dribbble.com/im_ahmad', img: 'assets/fff7b405ca64e6dda7a244baef6f51fd.jpg', vid: '' },
      { name: 'Paradise Des Noix', ind: 'E-commerce', desc: 'Dry fruit store website', kind: 'WEB', url: 'https://dribbble.com/im_ahmad', img: 'assets/7415d5a87e3479125c9b60719745e510.jpg', vid: '' },
      { name: 'Dental Practice', ind: 'Health & Fitness', desc: 'Treatment pages for a dental clinic', kind: 'WEB', url: 'https://dribbble.com/im_ahmad', img: 'assets/e18e1360f81013e75d0dffcc0cee0f57.jpg', vid: '' }
    ];
    if (!this._shotToggle) {
      this._paused = {};
      this._shotToggle = (e) => {
        const wrap = e.currentTarget.parentElement;
        const key = wrap.getAttribute('data-name');
        this._paused[key] = wrap.classList.contains('playing');
        this._syncShots();
      };
      this._shotLoaded = (e) => {
        const img = e.currentTarget;
        img.setAttribute('data-ok', img.getAttribute('src'));
        img.classList.add('in');
      };
    }
    const shotFilter = st0.shotFilter || 'ALL';
    const shotFilters = ['ALL', 'MOBILE', 'DASHBOARD', 'WEB'].map((k) => ({
      label: k === 'ALL' ? 'All work' : k === 'DASHBOARD' ? 'Dashboards' : k === 'MOBILE' ? 'Mobile apps' : 'Websites',
      count: k === 'ALL' ? shotData.length : shotData.filter((x) => x.kind === k).length,
      cls: 'vx-t' + (k === shotFilter ? ' on' : ''), pressed: k === shotFilter ? 'true' : 'false',
      pick: () => { if (k === shotFilter) return; this._fTick = (this._fTick || 0) + 1; this.setState({ shotFilter: k, shotPage: 0 }); }
    }));
    // industries: counts follow the type filter; an industry with nothing left falls back to all
    const indColors = { 'AI': '#9B8CFF', 'E-commerce': '#FF8A4C', 'Finance': '#4FD1C5', 'Travel': '#5AB0FF', 'Health & Fitness': '#3DDC84',
      'Food': '#F2C230', 'Automotive': '#FF5C6C', 'Productivity': '#93B1FF', 'Business': '#C9A46A' };
    const kindLabel = { MOBILE: 'Mobile app', DASHBOARD: 'Dashboard', WEB: 'Website' };
    const byType = shotData.filter((x) => shotFilter === 'ALL' || x.kind === shotFilter);
    const indOrder = Object.keys(indColors).map((k) => [k, byType.filter((x) => x.ind === k).length]).filter((e) => e[1] > 0).sort((p, q) => q[1] - p[1]);
    let shotInd = st0.shotInd || 'all';
    if (shotInd !== 'all' && !indOrder.some((e) => e[0] === shotInd)) shotInd = 'all';
    const indChips = [['all', byType.length]].concat(indOrder).map(([k, n]) => ({
      label: k === 'all' ? 'All industries' : k, count: n, color: k === 'all' ? '#EDEDEE' : indColors[k],
      cls: 'vx-c' + (k === shotInd ? ' on' : ''), pressed: k === shotInd ? 'true' : 'false',
      pick: () => { if (k === shotInd) return; this._fTick = (this._fTick || 0) + 1; this.setState({ shotInd: k, shotPage: 0 }); }
    }));
    const nK = (k) => shotData.filter((x) => x.kind === k).length;
    const allInds = Object.keys(indColors).filter((k) => shotData.some((x) => x.ind === k)).length;
    const vxLead = shotData.length + ' product concepts: ' + nK('MOBILE') + ' mobile apps, ' + nK('DASHBOARD') + ' dashboards and ' + nK('WEB') + ' websites across ' + allInds + ' industries, from fintech and AI to travel and food. Explorations I design to test ideas, interaction and visual systems outside client work.';
    // a sliding track of pages; every page keeps its own images, so nothing is swapped in place
    const shotCols = st0.shotCols || 3;
    const perPage = shotCols === 1 ? 3 : shotCols * 2;
    const shotList = byType.filter((x) => shotInd === 'all' || x.ind === shotInd);
    const shotPages = Math.max(1, Math.ceil(shotList.length / perPage));
    const shotPage = Math.min(st0.shotPage || 0, shotPages - 1);
    this._shotPageNow = shotPage;
    const goShot = (d) => () => {
      const n = Math.max(0, Math.min(shotPages - 1, shotPage + d));
      if (n !== shotPage) this.setState({ shotPage: n });
    };
    const two = (n) => (n < 10 ? '0' : '') + n;
    const pages = [];
    for (let i = 0; i < shotPages; i++) {
      const near = this._warm || Math.abs(i - shotPage) <= 1;
      pages.push({
        label: 'Page ' + (i + 1) + ' of ' + shotPages,
        items: shotList.slice(i * perPage, i * perPage + perPage).map((x) => ({
          ...x, color: indColors[x.ind], kindLabel: kindLabel[x.kind], no: two(shotData.indexOf(x) + 1), hasVid: !!x.vid, target: x.url.indexOf('.dc.html') !== -1 ? '_self' : '_blank', alt: x.name + ', ' + x.desc.toLowerCase(),
          loading: near ? 'eager' : 'lazy',
          toggleLabel: 'Pause or play the motion preview of ' + x.name,
          toggle: this._shotToggle, loaded: this._shotLoaded
        }))
      });
    }
    const shotDots = [];
    for (let i = 0; i < shotPages; i++) shotDots.push({ on: i === shotPage, off: i !== shotPage, label: 'Go to page ' + (i + 1), go: goShot(i - shotPage) });

    const bhData = [
      { title: 'Packaging Mobile App', kind: 'Mobile app', color: '#4FD1A5', img: 'assets/2d398d81da7f2750ac2984fded0df710.jpg', url: 'https://www.behance.net/gallery/194403009/Packaging-Mobile-App' },
      { title: 'Kwik eShopping App', kind: 'Mobile app', color: '#FF5C6C', img: 'assets/d8549e25d3bb5d7509ed44e75527cd98.jpg', url: 'https://www.behance.net/gallery/133340329/Kwik-eShopping-App' },
      { title: 'Askari Guards Security Services', kind: 'Mobile app', color: '#5AB0FF', img: 'assets/9f812befdbbabda853d7b2e341658e10.jpg', url: 'https://www.behance.net/gallery/130098993/Askari-Guards-Security-Sevices' },
      { title: 'Label Design', kind: 'Packaging', color: '#F2C230', img: 'assets/c64ed9012344508e73554829fd1e3056.jpg', url: 'https://www.behance.net/gallery/110704759/Label-Design' },
      { title: 'Mystical Creatures', kind: 'Logo & illustration', color: '#3DDC84', img: 'assets/e99fe7f0a9f94e6323d41d8d61dace9a.jpg', url: 'https://www.behance.net/gallery/89456581/MYSTICAL-CREATURES' },
      { title: 'Digital Teams Management System', kind: 'Web app', color: '#9B7CFF', img: 'assets/644bf74e604cde627c6b1d14326c0200.jpg', url: 'https://www.behance.net/gallery/258024841/Digital-Teams-Management-System' },
      { title: 'SaaS Portal', kind: 'SaaS', color: '#5B7CFF', img: 'assets/51b3376a63c0d175208bec768e319896.jpg', url: 'https://www.behance.net/gallery/257507159/SAAS-Portal' }
    ];
    const bhDesc = { 'Web app': 'The full case study on Behance: the problem, the flows and the final product screens.', 'SaaS': 'The full case study on Behance: the problem, the flows and the final product screens.',
      'Mobile app': 'The complete app walkthrough on Behance, from key flows to the final screens.', 'Website': 'The complete website project on Behance, page by page.',
      'Packaging': 'Print and packaging work on Behance, showing the label designs in full.', 'Logo & illustration': 'Mascot logos and illustration work on Behance, shown piece by piece.' };
    const two2 = (n) => (n < 10 ? '0' : '') + n;

    const jobsRaw = [
      { period: '2022 – Present', current: true, role: 'Senior UI/UX Designer', company: 'Teo International', place: 'Islamabad, PK', tint: accent, body: 'Leading UX strategy with executive leadership and engineering; owning the full UI lifecycle for web, mobile and SaaS products, from research and personas to tested prototypes.' },
      { period: 'Feb 2024 – May 2026', current: false, role: 'Product Designer', company: 'StableLogic', place: 'Remote · UK', tint: '#B8A4FF', body: 'Led end-to-end UX for digital products, built design systems in Figma and shipped designs in Webflow to close the gap between design and development.' },
      { period: 'Feb 2024 – Oct 2025', current: false, role: 'UX Engineer', company: 'Veroxos', place: 'Remote · USA', tint: '#FF9F6B', body: 'Turned complex telecom, mobile and cloud expense data into clear interfaces for a B2B SaaS platform, backed by a scalable design system.' },
      { period: 'Jul 2022 – Mar 2023', current: false, role: 'UI/UX Designer', company: 'GOTOKO', place: 'Remote · Indonesia', tint: '#7CF0D6', body: 'Designed a B2B e-commerce platform end to end, researching and testing with small retailers (warungs) to make ordering simple and accessible.' },
      { period: '2021 – 2022', current: false, role: 'UI/UX Designer', company: 'AppinSnap', place: 'Islamabad, PK', tint: accent, body: 'Partnered with the CEO and product team to align UX with business goals through a lean, iterative design process.' },
      { period: '2020 – 2021', current: false, role: 'UI/UX Designer', company: 'Tek2D', place: 'Pakistan', tint: '#B8A4FF', body: 'Owned the design system across core products and extended into brand work, logos, labels and social content.' },
      { period: '2019 – 2020', current: false, role: 'Graphics & UI Designer', company: 'LUMS', place: 'Pakistan', tint: '#FF9F6B', body: 'Designed a mobile app UI from concept to final assets, plus branding and print work for the university.' }
    ];

    const jobs = jobsRaw.map((j, i) => {
      const remote = /remote/i.test(j.place);
      return { ...j, no: (i < 9 ? '0' : '') + (i + 1), cls: j.current ? 'now' : '',
        type: j.current ? 'Current' : remote ? 'Remote' : 'On-site', tagCls: 'xp-tag' + (j.current ? ' now' : '') };
    });
    const xpCompanies = (jobsRaw.length < 10 ? '0' : '') + new Set(jobsRaw.map((j) => j.company)).size;
    const brands = [
      { label: 'TinyMobileRobots', url: 'https://tinymobilerobots.com/' },
      { label: 'EasyStorage', url: 'https://www.easystorage.com/' }
    ];

    const stepData = [
      { num: '01', verb: 'Listen', time: 'DISCOVERY', title: 'Kickoff & discovery', q: 'What problem are we really solving, for whom, and how will we know it worked?', methods: ['Stakeholder interviews', 'Heuristic audit', 'Analytics review', 'Competitor scan'], with: 'Founders and PMs, the engineering lead, support and sales', lens: 'I don’t move to screens until the problem and the success metrics are agreed in writing.', body: 'I start with stakeholders, not a mood board: learning the business, the users and the constraints, auditing what already exists, and agreeing on goals we can actually measure.', gets: ['A one-page problem brief', 'Clear goals and success metrics', 'A timeline with milestones'] },
      { num: '02', verb: 'Map', time: 'DEFINITION', title: 'Research & structure', q: 'What do users actually do today, and where does it break?', methods: ['User interviews', 'Journey mapping', 'Task flows', 'Card sorting'], with: 'The PM, real users and anyone who talks to customers', lens: 'I turn research into a handful of decisions the team can act on, not a deck that sits in a drive.', body: 'User interviews, quick surveys or analytics deep-dives, whatever the question needs. Then I map journeys, flows and the information architecture so everyone sees the same picture.', gets: ['Key user insights', 'User flows and journey maps', 'Sitemap / app structure'] },
      { num: '03', verb: 'Sketch', time: 'IDEATION', title: 'Wireframes & concepts', q: 'What’s the simplest thing that could work, and how do we test it cheaply?', methods: ['Wireframes', 'Crazy 8s', 'Clickable prototypes', 'Guerrilla tests'], with: 'The PM, engineers for feasibility, and users for quick tests', lens: 'Engineers see concepts early, so expensive ideas are dropped before anyone polishes them.', body: 'Low-fidelity wireframes and two or three directions explored fast. I test early and cheaply, so the big decisions are made before any polish.', gets: ['Clickable wireframe prototype', 'Concept directions to compare', 'Early usability feedback'] },
      { num: '04', verb: 'Craft', time: 'DESIGN', title: 'UI & design system', q: 'Does it work in every state, on every screen, for everyone?', methods: ['Design tokens', 'Component variants', 'Responsive layouts', 'WCAG checks'], with: 'Other designers, front-end developers and brand', lens: 'I design the system, not just the screen: empty, loading, error and edge cases included.', body: 'High-fidelity screens with every state, built on a reusable component library. Accessibility and responsiveness are checked as I go, not bolted on at the end.', gets: ['Polished, responsive UI', 'Component library with variants', 'Accessibility-checked designs'] },
      { num: '05', verb: 'Ship', time: 'DELIVERY', title: 'Handoff & iterate', q: 'Is it built as designed, and is it moving the metric?', methods: ['Annotated specs', 'Design QA', 'Usability follow-ups', 'Analytics review'], with: 'Engineering, QA and the PM', lens: 'Launch is a checkpoint, not the finish line: I measure, learn and feed the next iteration.', body: 'A tidy, annotated Figma file engineers can build from directly. I stay close during the build for QA, then help iterate based on what real users do.', gets: ['Dev-ready, annotated files', 'Design QA on the build', 'Post-launch improvement list'] }
    ];
    const steps = stepData.map((d, i) => ({ ...d, active: i === step, inactive: i !== step, pick: () => this.setState({ step: i, stepAuto: false }) }));
    const curRaw = stepData[step];
    const cur = { ...curRaw, gets: curRaw.gets.map((g) => ({ label: g })), methodsL: curRaw.methods.map((t) => ({ t })) };
    const pvc = (i) => (i === step ? 'on' : '');


    const filterDefs = [ { id: 'all', label: 'All' }, { id: 'mobile', label: 'Mobile' }, { id: 'web', label: 'Web' }, { id: 'saas', label: 'SaaS' } ];
    const filters = filterDefs.map((f) => ({ ...f, active: f.id === filter, inactive: f.id !== filter, pick: () => this.setState({ filter: f.id }) }));

    const caseData = [];
    const cases = caseData
            .map((c) => ({ ...c, hasUrl: !!c.url, hasImg: !!c.img, alt: c.client + ' project cover', isMobile: c.kind === 'mobile', isWeb: c.kind === 'web', tagText: c.tags.join(', '), tags: c.tags.map((t) => ({ label: t })) }));

    const liveData = [
      { name: 'Veroxos', tint: '#4C7DFF', c1: 'Enterprise', c2: 'Telecom & mobility', kind: 'WEB APP', domain: 'veroxos.com', url: 'https://www.veroxos.com/', img: 'assets/17eba1322801dd1ea14e057416af3613.jpg', full: true, sy: '-74.46%', desc: 'Enterprise telecom, mobility and asset-lifecycle management platform.' },
      { name: 'StableLogic', tint: '#3D8BFF', c1: 'United Kingdom', c2: 'Cloud & AI services', kind: 'WEBSITE', domain: 'stablelogic.com', url: 'https://stablelogic.com/', img: 'assets/0bb8bccbe8ab48d9fa1ee05d2df88c0d.jpg', full: true, sy: '-74.46%', desc: 'AWS partner, AI consultancy and software house in the UK.' },
      { name: 'CSCS', tint: '#F2C230', c1: 'United Kingdom', c2: 'Construction', kind: 'WEBSITE', domain: 'cscs.uk.com', url: 'https://www.cscs.uk.com/', img: 'assets/75b133243049b0e944fe661604892d39.jpg', full: true, sy: '-68.86%', desc: 'The Construction Skills Certification Scheme, the UK’s construction card scheme.' },
      { name: 'easyStorage', tint: '#FF6A13', c1: 'United Kingdom', c2: 'Self-storage', kind: 'WEBSITE', domain: 'easystorage.com', url: 'https://easystorage.com/', img: 'assets/53e067f2a1856c372f91789201b236fb.jpg', full: true, sy: '-74.46%', desc: 'Self-storage across the UK, with collection, drop-off and drive-up units.' },
      { name: 'TinyMobileRobots', tint: '#7ED957', c1: 'Denmark', c2: 'Robotics', kind: 'WEBSITE', domain: 'tinymobilerobots.com', url: 'https://tinymobilerobots.com/', img: 'assets/de45035179e2b0593517dccac323dbd1.jpg', full: true, sy: '-74.46%', desc: 'Line-marking robots for sports fields and construction sites.' },
      { name: 'Firstcom Europe', tint: '#FF8A1F', c1: 'United Kingdom', c2: 'IT & communications', kind: 'WEBSITE', domain: 'firstcomeurope.co.uk', url: 'https://firstcomeurope.co.uk/', img: 'assets/c760bafe108f5bd1527300d01bad6335.jpg', full: true, sy: '-74.46%', desc: 'Managed IT, cyber security and business communications in the UK.' },
      { name: 'Pamogi', tint: '#8B7CFF', c1: 'Web3', c2: 'Co-creation', kind: 'WEB APP', domain: 'pamogi · case study', url: 'pamogi.html', img: 'assets/15aebe9659fcf46450d0977f16b98e7b.jpg', desc: 'A gamified co-creation platform where projects grow as planets.', cta: 'Read the case study' },
      { name: 'Zindigi', tint: '#4FD1C5', c1: 'Pakistan', c2: 'Fintech', kind: 'FINTECH APP', domain: 'zindigi.pk', url: 'https://zindigi.pk/', img: 'assets/dfb5c583c64377497f1e73e598980941.jpg', full: true, sy: '-74.46%', desc: 'All-in-one digital finance app from JS Bank, for Android and iOS.' }
    ];
    if (!this._lpRailRef) {
      this._lpPinRef = (el) => { this._lpPinEl = el; };
      this._lpRailRef = (el) => { this._lpRail = el; if (el) requestAnimationFrame(() => this._lpPin()); };
      this._lpNumRef = (el) => { this._lpNum = el; };
      this._lpBarRef = (el) => { this._lpBar = el; };
      // the stage stays pinned for exactly as long as it takes the cards to travel across
      this._lpPin = () => {
        const pin = this._lpPinEl, r = this._lpRail;
        if (!pin || !r) return;
        const vh = window.innerHeight || 800, vw = pin.clientWidth || window.innerWidth;
        if (vh > 1400) {
          if (!pin.classList.contains('lp-flat')) { pin.classList.add('lp-flat'); pin.style.height = ''; this._lpH = 0; r.style.transform = ''; if (this._lpBar) this._lpBar.style.transform = 'scaleX(1)'; }
          return;
        }
        if (pin.classList.contains('lp-flat')) pin.classList.remove('lp-flat');
        const dist = Math.max(0, r.scrollWidth - vw);
        const want = Math.round(vh + dist);
        if (Math.abs((this._lpH || 0) - want) > 1) { pin.style.height = want + 'px'; this._lpH = want; }
        const top = pin.getBoundingClientRect().top;
        const p = dist ? Math.min(1, Math.max(0, -top / dist)) : 0;
        r.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
        const tot = r.querySelectorAll('.lp-card').length || 1; const n = Math.min(tot, Math.floor(p * (tot - 0.001)) + 1);
        if (this._lpNum) this._lpNum.textContent = (n < 10 ? '0' : '') + n;
        if (this._lpBar) this._lpBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      };
      this._lpMove = (e) => { const t = e.currentTarget, b = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - b.left) + 'px'); t.style.setProperty('--my', (e.clientY - b.top) + 'px'); };
    }
    // Behance case studies follow the live sites in the same rail
    const bhCards = bhData.map((b) => ({ name: b.title, tint: b.color, c1: b.kind, c2: 'Case study', kind: b.kind.toUpperCase(), domain: 'behance.net', url: b.url, img: b.img, desc: bhDesc[b.kind], bh: true }));
    const live = liveData.concat(bhCards).map((x, i) => {
      const isDc = x.url.indexOf('.dc.html') !== -1;
      const off = !x.img, cs = isDc, bh = !!x.bh;
      return { ...x, imgCls: x.full ? 'lp-full' : 'lp-cover', sy: x.sy || '0%', num: (i < 9 ? '0' : '') + (i + 1), hasImg: !!x.img, noImg: off,
        alt: bh ? 'Cover of ' + x.name + ' on Behance' : 'Homepage of ' + x.name, target: isDc ? '_self' : '_blank', rd: (Math.min(i, 3) * 0.08).toFixed(2) + 's',
        status: off ? 'OFFLINE' : bh ? 'BEHANCE' : cs ? 'CASE STUDY' : 'LIVE', tagCls: 'lp-tag' + (off ? ' off' : bh ? ' bh' : cs ? ' cs' : ''),
        go: off ? 'Company page' : bh ? 'View' : cs ? 'Read it' : 'Visit',
        aria: off ? x.name + ' on LinkedIn' : bh ? 'View ' + x.name + ' on Behance (opens in a new tab)' : cs ? 'Read the ' + x.name + ' case study' : 'Visit ' + x.name + ' (opens in a new tab)' };
    });


    const nameChars = 'AHMAD SHOAIB'.split('').map((ch, i) => ({
      ch: ch === ' ' ? '\u00A0' : ch,
      d: (0.08 + i * 0.045).toFixed(3) + 's',
      rd: (i * 0.022).toFixed(3) + 's'
    }));
    const ready = !!st0.ready || !motion;
    if (!this._copyMail) {
      this._copyMail = () => {
        const ok = () => { this.setState({ copied: true }); clearTimeout(this._copyT); this._copyT = setTimeout(() => this.setState({ copied: false }), 2200); };
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('ahmadshoaib225@gmail.com').then(ok, () => {});
        } catch (e) {}
      };
    }
    const bandWords = ['Product design', 'UX research', 'Design systems', 'Prototyping', 'SaaS', 'Fintech', 'Mobile apps', 'Webflow', 'Framer'];
    const band = bandWords.concat(bandWords).map((t) => ({ t }));
    const skills = [['UX', 'UX Research'], ['UI', 'Interface Design'], ['DS', 'Design Systems'], ['PR', 'Prototyping'], ['IA', 'Information Architecture'],
      ['UL', 'UX Leadership'], ['Fg', 'Figma'], ['Wf', 'Webflow'], ['Fr', 'Framer'], ['SA', 'SaaS Products'], ['FT', 'Fintech'], ['MB', 'Mobile Apps']];
    const skillStrip = skills.concat(skills).map(([b, t], i) => ({ b, t, dup: i >= skills.length ? 'true' : 'false' }));
    return {
      skillStrip,
      band, copyMail: this._copyMail, copyLabel: st0.copied ? 'COPIED ✓' : 'COPY EMAIL', copyCls: 'copy' + (st0.copied ? ' done' : ''),
      pvc1: pvc(0), pvc2: pvc(1), pvc3: pvc(2), pvc4: pvc(3), pvc5: pvc(4),
      stepBarCls: 'st-bar' + (st0.stepAuto === false ? '' : ' auto'),
      liveN: (live.length < 10 ? '0' : '') + live.length, liveOnly: two2(liveData.length), live, lpPinRef: this._lpPinRef, lpRailRef: this._lpRailRef, lpNumRef: this._lpNumRef, lpBarRef: this._lpBarRef, lpMove: this._lpMove,
      accent, nameChars, ldrNumRef: this._ldrNumRef, ldrBarRef: this._ldrBarRef,
      rootCls: (motion ? 'motion-on js-rv' : 'motion-off') + (ready ? ' is-ready' : '') + (menuOpen ? ' menu-open' : ''),
      rootRef: this._rootRef, dotRef: this._dotRef, toggleMenu: this._toggleMenu, closeMenu: this._closeMenu,
      menuExpanded: menuOpen ? 'true' : 'false', menuLabel: menuOpen ? 'CLOSE' : 'MENU', menu, menu2, ticks,
      secNum: (secIdx < 10 ? '0' : '') + secIdx, secName: secNames[secIdx],
      meshRef: this._meshRef, onHeroMove: this._onHeroMove, onHeroLeave: this._onHeroLeave,
      marquee, tools, steps, cur, filters, cases, socials, jobs, brands, toolsText, portfolio, tk1a: tkData[0].slice(0, 2), tk1b: tkData[0].slice(2), tk1m: { has: tkData[0].length > 2, none: tkData[0].length <= 2, n: tkData[0].length, label: tkData[0].length === 1 ? '1 tool' : tkData[0].length + ' tools' }, tk2a: tkData[1].slice(0, 2), tk2b: tkData[1].slice(2), tk2m: { has: tkData[1].length > 2, none: tkData[1].length <= 2, n: tkData[1].length, label: tkData[1].length === 1 ? '1 tool' : tkData[1].length + ' tools' }, tk3a: tkData[2].slice(0, 2), tk3b: tkData[2].slice(2), tk3m: { has: tkData[2].length > 2, none: tkData[2].length <= 2, n: tkData[2].length, label: tkData[2].length === 1 ? '1 tool' : tkData[2].length + ' tools' }, tk4a: tkData[3].slice(0, 2), tk4b: tkData[3].slice(2), tk4m: { has: tkData[3].length > 2, none: tkData[3].length <= 2, n: tkData[3].length, label: tkData[3].length === 1 ? '1 tool' : tkData[3].length + ' tools' }, tk5a: tkData[4].slice(0, 2), tk5b: tkData[4].slice(2), tk5m: { has: tkData[4].length > 2, none: tkData[4].length <= 2, n: tkData[4].length, label: tkData[4].length === 1 ? '1 tool' : tkData[4].length + ' tools' }, tkCount, xpCompanies, pages, shotFilters, segRef: this._segRef, indChips, vxLead, vxTotal: shotData.length, vxMotion: shotData.filter((x) => x.vid).length, vxInd: allInds, bhTotal: two2(bhData.length), shotCols,
      shotTrackCls: 'shot-track ' + ((this._fTick || 0) % 2 ? 'fa' : 'fb'), shotShift: (-100 * shotPage) + '%', shotPageNow: two(shotPage + 1), shotPageTotal: two(shotPages),
      shotPrev: goShot(-1), shotNext: goShot(1), shotAtStart: shotPage === 0, shotAtEnd: shotPage >= shotPages - 1, shotDots,
      shotFrom: shotList.length ? shotPage * perPage + 1 : 0, shotTo: Math.min(shotList.length, shotPage * perPage + perPage), shotCount: shotList.length
    };
  }
}
