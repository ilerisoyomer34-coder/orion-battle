/* KOMUTA: Gizli Operasyon — çekirdek: yardımcılar, olay yolu, girdi, ses, kayıt */
'use strict';
window.K = window.K || {};

(function () {
  const TAU = Math.PI * 2;

  // ───────────────────────── Yardımcılar ─────────────────────────
  const U = K.U = {
    TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    damp: (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt)),
    angDiff(a, b) {
      let d = (b - a) % TAU;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      return d;
    },
    dampAng: (a, b, l, dt) => a + U.angDiff(a, b) * (1 - Math.exp(-l * dt)),
    rand: (a = 0, b = 1) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    d2: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
    smooth(e0, e1, x) {
      const t = U.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    rng(seed) {
      let s = seed | 0;
      return function () {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    fmtTime(s) {
      s = Math.max(0, Math.floor(s));
      const m = Math.floor(s / 60), r = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    },
    $: (id) => document.getElementById(id),
    h(tag, attrs, ...kids) {
      const e = document.createElement(tag);
      if (attrs) for (const k in attrs) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(e.style, attrs[k]);
        else e.setAttribute(k, attrs[k]);
      }
      for (const kid of kids.flat()) {
        if (kid == null || kid === false) continue;
        e.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
      }
      return e;
    },
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  };

  // Değer gürültüsü (arazi, dokular)
  const PERM = new Uint8Array(512);
  (function () {
    const r = U.rng(1337), p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  })();
  function hash2(x, z) { return PERM[(PERM[x & 255] + z) & 511] / 255; }
  U.noise2 = function (x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  U.fbm = function (x, z, oct = 4) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += U.noise2(x * f, z * f) * a; n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  };

  // ───────────────────────── Olay yolu ─────────────────────────
  const listeners = {};
  K.bus = {
    on(t, fn) { (listeners[t] = listeners[t] || []).push(fn); return fn; },
    off(t, fn) { const a = listeners[t]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    emit(t, d) { const a = listeners[t]; if (a) for (const fn of a.slice()) fn(d); },
    clear(t) { if (t) delete listeners[t]; },
  };

  // ───────────────────────── Girdi ─────────────────────────
  const BIND = {
    fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    sprint: ['ShiftLeft', 'ShiftRight', 'T_sprint'], crouch: ['ControlLeft', 'ControlRight', 'KeyC', 'T_crouch'],
    jump: ['Space', 'T_jump'], interact: ['KeyE', 'T_interact'], wheel: ['KeyQ', 'T_wheel'], journal: ['Tab', 'T_journal'],
    map: ['KeyM', 'T_map'], reload: ['KeyR', 'T_reload'], holster: ['KeyH', 'T_holster'], weapon: ['KeyX', 'T_weapon'],
    gadget: ['KeyG', 'T_gadget'], nvg: ['KeyN'], camera: ['KeyV', 'T_camera'], pause: ['Escape', 'KeyP', 'T_pause'],
    quickMove: ['KeyT', 'T_move'], follow: ['KeyF', 'T_follow'], hold: ['KeyB', 'T_hold'], lights: ['KeyL'],
    selectAll: ['Backquote', 'Digit0'], fire: ['T_fire'], aim: ['T_aim'], up: ['Space', 'T_jump'], down: ['ControlLeft', 'ControlRight', 'KeyC', 'T_crouch'],
  };
  const I = K.input = {
    BIND,
    keys: new Set(), pressed: new Set(), released: new Set(),
    mb: [false, false, false], mbHit: [false, false, false], mbUp: [false, false, false],
    mdx: 0, mdy: 0, wheel: 0, locked: false, canvas: null,
    touch: { enabled: false, mx: 0, my: 0, lookDX: 0, lookDY: 0 },
    typing: false,
    init(canvas) {
      this.canvas = canvas;
      window.addEventListener('keydown', (e) => {
        if (this.typing) return;
        if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (e.ctrlKey && ['KeyS', 'KeyD', 'KeyW', 'KeyR'].includes(e.code)) e.preventDefault();
        if (!this.keys.has(e.code)) this.pressed.add(e.code);
        this.keys.add(e.code);
        K.audio.init();
      });
      window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.released.add(e.code); });
      window.addEventListener('blur', () => { this.keys.clear(); this.mb = [false, false, false]; });
      canvas.addEventListener('mousedown', (e) => {
        K.audio.init();
        if (K.game && K.game.wantsPointerLock() && !this.locked && !this.touch.enabled) {
          canvas.requestPointerLock && canvas.requestPointerLock();
        }
        this.mb[e.button] = true; this.mbHit[e.button] = true;
        if (e.button === 1) e.preventDefault();
      });
      window.addEventListener('mouseup', (e) => { this.mb[e.button] = false; this.mbUp[e.button] = true; });
      window.addEventListener('mousemove', (e) => {
        if (this.locked) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; }
        this.mouseX = e.clientX; this.mouseY = e.clientY;
      });
      window.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('pointerlockchange', () => {
        this.locked = document.pointerLockElement === canvas;
        if (!this.locked) { this.mb = [false, false, false]; K.bus.emit('pointerunlock'); }
      });
    },
    down(a) { const b = BIND[a]; for (let i = 0; i < b.length; i++) if (this.keys.has(b[i])) return true; return false; },
    hit(a) { const b = BIND[a]; for (let i = 0; i < b.length; i++) if (this.pressed.has(b[i])) return true; return false; },
    up(a) { const b = BIND[a]; for (let i = 0; i < b.length; i++) if (this.released.has(b[i])) return true; return false; },
    fire() { return this.mb[0] || this.keys.has('T_fire'); },
    fireHit() { return this.mbHit[0] || this.pressed.has('T_fire'); },
    aim() { return this.mb[2] || this.keys.has('T_aim'); },
    consume(a) { for (const c of BIND[a]) this.pressed.delete(c); if (a === 'fire') this.mbHit[0] = false; },
    vpress(code) { if (!this.keys.has(code)) this.pressed.add(code); this.keys.add(code); },
    vrelease(code) { this.keys.delete(code); this.released.add(code); },
    moveVec() {
      let x = 0, y = 0;
      if (this.down('fwd')) y += 1; if (this.down('back')) y -= 1;
      if (this.down('right')) x += 1; if (this.down('left')) x -= 1;
      x += this.touch.mx; y += this.touch.my;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },
    lookDelta() {
      const s = K.save ? K.save.data.settings.sens : 1;
      const inv = K.save && K.save.data.settings.invertY ? -1 : 1;
      const dx = this.mdx * 0.0026 * s + this.touch.lookDX * 0.006 * s;
      const dy = (this.mdy * 0.0026 * s + this.touch.lookDY * 0.006 * s) * inv;
      return { dx, dy };
    },
    endFrame() {
      this.pressed.clear(); this.released.clear();
      this.mbHit = [false, false, false]; this.mbUp = [false, false, false];
      this.mdx = 0; this.mdy = 0; this.wheel = 0;
      this.touch.lookDX = 0; this.touch.lookDY = 0;
    },
    releaseAll() { this.keys.clear(); this.mb = [false, false, false]; },
  };

  // ───────────────────────── Ses (WebAudio, prosedürel) ─────────────────────────
  const A = K.audio = {
    ctx: null, ok: false, L: { x: 0, y: 0, z: 0, yaw: 0 }, loops: {},
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      try { this.ctx = new C(); } catch (e) { return; }
      const c = this.ctx;
      this.master = c.createGain(); this.master.connect(c.destination);
      this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 6;
      this.comp.connect(this.master);
      this.sfx = c.createGain(); this.sfx.connect(this.comp);
      this.amb = c.createGain(); this.amb.connect(this.comp);
      this.mus = c.createGain(); this.mus.connect(this.comp);
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      // kahverengi gürültü (rüzgar/yağmur için)
      const bb = c.createBuffer(1, len, c.sampleRate), bd = bb.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
      this.brown = bb;
      this.ok = true;
      this.applyVolumes();
      this.buildLoops();
    },
    applyVolumes() {
      if (!this.ok) return;
      const s = K.save.data.settings;
      this.master.gain.value = s.vol;
      this.sfx.gain.value = s.sfxVol;
      this.amb.gain.value = s.sfxVol * 0.8;
      this.mus.gain.value = s.musVol;
    },
    spatial(pos, maxD = 120) {
      if (!pos) return { g: 1, p: 0 };
      const dx = pos.x - this.L.x, dz = pos.z - this.L.z, dy = (pos.y || 0) - this.L.y;
      const d = Math.hypot(dx, dy, dz);
      if (d > maxD) return null;
      const g = 1 / (1 + d * d * 0.0022) * (1 - d / maxD);
      const ang = Math.atan2(dx, dz) - this.L.yaw;
      return { g, p: U.clamp(-Math.sin(ang), -1, 1) * Math.min(1, d / 4) };
    },
    out(sp) {
      const c = this.ctx, g = c.createGain();
      g.gain.value = sp ? sp.g : 1;
      if (c.createStereoPanner && sp) { const p = c.createStereoPanner(); p.pan.value = sp.p; g.connect(p); p.connect(this.sfx); }
      else g.connect(this.sfx);
      return g;
    },
    noiseHit(dest, { dur = 0.2, type = 'lowpass', f = 1200, q = 0.8, vol = 1, attack = 0.002, f2 = null, brown = false, rate = 1 }) {
      const c = this.ctx, t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = brown ? this.brown : this.noise; s.playbackRate.value = rate;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(dest);
      s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    },
    tone(dest, { f = 440, f2 = null, dur = 0.15, type = 'sine', vol = 0.3, attack = 0.005, delay = 0 }) {
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    },
    shot(kind, pos) {
      if (!this.ok) return;
      const loud = { pistol_s: 0.25, smg_s: 0.3, rifle: 1, dmr: 1.2, lmg: 1, shotgun: 1.2, enemy: 0.9, tank: 2, mg: 1 }[kind] || 1;
      const sp = this.spatial(pos, loud < 0.5 ? 40 : 260); if (!sp) return;
      const o = this.out(sp);
      if (loud < 0.5) {
        this.noiseHit(o, { dur: 0.09, type: 'bandpass', f: 2600, q: 1.2, vol: 0.5 });
        this.tone(o, { f: 300, f2: 90, dur: 0.06, type: 'triangle', vol: 0.2 });
      } else if (kind === 'tank') {
        this.noiseHit(o, { dur: 1.4, type: 'lowpass', f: 900, f2: 60, vol: 1.6, brown: true });
        this.tone(o, { f: 70, f2: 28, dur: 0.9, type: 'sine', vol: 1.2 });
      } else {
        this.noiseHit(o, { dur: 0.32 * loud, type: 'lowpass', f: 3800, f2: 300, vol: 0.9 * loud });
        this.tone(o, { f: 160, f2: 45, dur: 0.16, type: 'sine', vol: 0.55 * loud });
      }
    },
    explosion(pos, size = 1) {
      if (!this.ok) return;
      const sp = this.spatial(pos, 400); if (!sp) return;
      const o = this.out({ g: Math.min(1.5, sp.g * 2), p: sp.p });
      this.noiseHit(o, { dur: 2.2 * size, type: 'lowpass', f: 1400, f2: 40, vol: 1.6, brown: true });
      this.noiseHit(o, { dur: 0.5, type: 'lowpass', f: 5000, f2: 400, vol: 0.8 });
      this.tone(o, { f: 55, f2: 22, dur: 1.4, type: 'sine', vol: 1.3 });
    },
    impact(pos, surf) {
      if (!this.ok) return;
      const sp = this.spatial(pos, 40); if (!sp) return;
      const o = this.out(sp);
      if (surf === 'metal') this.tone(o, { f: 1800 + Math.random() * 900, f2: 900, dur: 0.12, type: 'triangle', vol: 0.12 });
      else this.noiseHit(o, { dur: 0.07, type: 'bandpass', f: 1500, q: 1.5, vol: 0.25 });
    },
    step(pos, vol = 0.12, surf) {
      if (!this.ok) return;
      const sp = this.spatial(pos, 25); if (!sp) return;
      const o = this.out(sp);
      this.noiseHit(o, { dur: 0.08, type: 'bandpass', f: surf === 'metal' ? 1700 : surf === 'grass' ? 600 : 900, q: 1.1, vol: vol * (K.world && K.world.env.weather === 'rain' ? 1.4 : 1) });
    },
    hurt() { if (!this.ok) return; const o = this.out(null); this.tone(o, { f: 220, f2: 110, dur: 0.18, type: 'sawtooth', vol: 0.08 }); this.noiseHit(o, { dur: 0.12, f: 700, vol: 0.3 }); },
    hitmark() { if (!this.ok) return; const o = this.out(null); this.tone(o, { f: 1500, dur: 0.05, type: 'square', vol: 0.05 }); },
    click() { if (!this.ok) return; const o = this.out(null); this.tone(o, { f: 900, dur: 0.04, type: 'square', vol: 0.05 }); },
    ui(kind = 'click') {
      if (!this.ok) return;
      const o = this.out(null);
      if (kind === 'ok') { this.tone(o, { f: 660, dur: 0.08, vol: 0.12 }); this.tone(o, { f: 990, dur: 0.12, vol: 0.12, delay: 0.08 }); }
      else if (kind === 'bad') { this.tone(o, { f: 300, f2: 180, dur: 0.22, type: 'square', vol: 0.07 }); }
      else if (kind === 'obj') { [523, 659, 784].forEach((f, i) => this.tone(o, { f, dur: 0.18, vol: 0.12, delay: i * 0.09 })); }
      else if (kind === 'rank') { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(o, { f, dur: 0.35, vol: 0.14, type: 'triangle', delay: i * 0.13 })); }
      else if (kind === 'fail') { [440, 349, 262].forEach((f, i) => this.tone(o, { f, dur: 0.4, vol: 0.12, type: 'triangle', delay: i * 0.18 })); }
      else this.tone(o, { f: 1200, dur: 0.03, type: 'square', vol: 0.04 });
    },
    radio() {
      if (!this.ok) return;
      const o = this.out(null);
      this.noiseHit(o, { dur: 0.12, type: 'bandpass', f: 2200, q: 2, vol: 0.12 });
      this.tone(o, { f: 1400, dur: 0.06, type: 'square', vol: 0.04, delay: 0.02 });
    },
    door(pos) { if (!this.ok) return; const sp = this.spatial(pos, 30); if (!sp) return; const o = this.out(sp); this.noiseHit(o, { dur: 0.35, f: 500, f2: 200, vol: 0.3 }); this.tone(o, { f: 120, dur: 0.1, type: 'triangle', vol: 0.15 }); },
    pickup() { if (!this.ok) return; const o = this.out(null); this.tone(o, { f: 880, dur: 0.06, vol: 0.12 }); this.tone(o, { f: 1320, dur: 0.1, vol: 0.12, delay: 0.06 }); },
    reload() { if (!this.ok) return; const o = this.out(null); this.tone(o, { f: 500, dur: 0.04, type: 'square', vol: 0.06 }); this.tone(o, { f: 300, dur: 0.05, type: 'square', vol: 0.06, delay: 0.25 }); this.tone(o, { f: 800, dur: 0.04, type: 'square', vol: 0.06, delay: 0.55 }); },
    empty() { if (!this.ok) return; const o = this.out(null); this.tone(o, { f: 1800, dur: 0.02, type: 'square', vol: 0.05 }); },
    alarm() { if (!this.ok) return; const o = this.out(null); for (let i = 0; i < 4; i++) { this.tone(o, { f: 880, dur: 0.22, type: 'square', vol: 0.06, delay: i * 0.5 }); this.tone(o, { f: 660, dur: 0.22, type: 'square', vol: 0.06, delay: i * 0.5 + 0.25 }); } },
    keypad() { if (!this.ok) return; const o = this.out(null); this.tone(o, { f: 1100 + Math.random() * 300, dur: 0.06, type: 'sine', vol: 0.08 }); },

    buildLoops() {
      const c = this.ctx;
      const mk = (buffer, ftype, f, q) => {
        const s = c.createBufferSource(); s.buffer = buffer; s.loop = true;
        const fl = c.createBiquadFilter(); fl.type = ftype; fl.frequency.value = f; fl.Q.value = q || 0.7;
        const g = c.createGain(); g.gain.value = 0;
        s.connect(fl); fl.connect(g); g.connect(this.amb); s.start();
        return { s, fl, g, target: 0 };
      };
      this.loops.rain = mk(this.noise, 'highpass', 900);
      this.loops.wind = mk(this.brown, 'lowpass', 400);
      this.loops.city = mk(this.brown, 'lowpass', 220);
      // motor: testere dişi + alçak geçiren
      const eo = c.createOscillator(); eo.type = 'sawtooth'; eo.frequency.value = 40;
      const eo2 = c.createOscillator(); eo2.type = 'square'; eo2.frequency.value = 20;
      const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 300;
      const eg = c.createGain(); eg.gain.value = 0;
      const eg2 = c.createGain(); eg2.gain.value = 0.4;
      eo.connect(ef); eo2.connect(eg2); eg2.connect(ef); ef.connect(eg); eg.connect(this.sfx); eo.start(); eo2.start();
      this.loops.engine = { o: eo, o2: eo2, fl: ef, g: eg, target: 0, f: 40 };
      // rotor: gürültü * LFO
      const rs = c.createBufferSource(); rs.buffer = this.brown; rs.loop = true;
      const rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 500;
      const rg = c.createGain(); rg.gain.value = 0;
      const am = c.createGain(); am.gain.value = 0.5;
      const lfo = c.createOscillator(); lfo.frequency.value = 6; const lg = c.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg); lg.connect(am.gain);
      rs.connect(rf); rf.connect(am); am.connect(rg); rg.connect(this.sfx); rs.start(); lfo.start();
      this.loops.rotor = { g: rg, lfo, fl: rf, target: 0 };
      // müzik: gergin pad
      const mg = c.createGain(); mg.gain.value = 0; mg.connect(this.mus);
      const mf = c.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 600; mf.connect(mg);
      const notes = [55, 82.4, 110.0, 130.8];
      this.padOsc = notes.map((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; const g = c.createGain(); g.gain.value = 0.07; o.connect(g); g.connect(mf); o.start(); return o; });
      const mlfo = c.createOscillator(); mlfo.frequency.value = 0.07; const mlg = c.createGain(); mlg.gain.value = 300; mlfo.connect(mlg); mlg.connect(mf.frequency); mlfo.start();
      this.loops.music = { g: mg, fl: mf, target: 0 };
      // nabız (çatışma gerilimi)
      const pg = c.createGain(); pg.gain.value = 0; pg.connect(this.mus);
      this.loops.pulse = { g: pg, target: 0, t: 0 };
    },
    setLoop(name, vol, param) {
      const l = this.loops[name]; if (!l) return;
      l.target = vol;
      if (param != null) l.param = param;
    },
    update(dt) {
      if (!this.ok) return;
      const c = this.ctx, t = c.currentTime;
      for (const k in this.loops) {
        const l = this.loops[k];
        if (!l.g) continue;
        l.g.gain.setTargetAtTime(l.target, t, 0.25);
      }
      const e = this.loops.engine;
      if (e.param != null) {
        const f = 28 + e.param * 70;
        e.o.frequency.setTargetAtTime(f, t, 0.1); e.o2.frequency.setTargetAtTime(f / 2, t, 0.1);
        e.fl.frequency.setTargetAtTime(220 + e.param * 900, t, 0.1);
      }
      const r = this.loops.rotor;
      if (r.param != null) { r.lfo.frequency.setTargetAtTime(2 + r.param * 16, t, 0.2); r.fl.frequency.setTargetAtTime(250 + r.param * 600, t, 0.2); }
      const m = this.loops.music;
      if (m.param != null) m.fl.frequency.setTargetAtTime(400 + m.param * 1400, t, 1.0);
      // çatışma nabzı
      const p = this.loops.pulse;
      if (p.target > 0.01) {
        p.t -= dt;
        if (p.t <= 0) {
          p.t = 0.5;
          this.tone(this.mus, { f: 55, f2: 40, dur: 0.25, type: 'sine', vol: 0.35 * p.target });
          this.noiseHit(this.mus, { dur: 0.05, type: 'highpass', f: 6000, vol: 0.08 * p.target });
        }
      }
    },
    silenceLoops() { for (const k in this.loops) this.loops[k].target = 0; },
    say(text) {
      if (!K.save.data.settings.voice || !window.speechSynthesis) return;
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'tr-TR'; u.rate = 1.12; u.pitch = 0.85; u.volume = 0.8 * K.save.data.settings.vol;
        const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('tr'));
        if (v) u.voice = v;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch (e) { /* desteklenmiyor */ }
    },
  };

  // ───────────────────────── Kayıt sistemi (sürümlü) ─────────────────────────
  const SAVE_KEY = 'komuta_gizli_operasyon_save';
  const SAVE_VERSION = 3;
  K.save = {
    data: null,
    defaults() {
      return {
        v: SAVE_VERSION,
        created: Date.now(),
        xp: 0, rank: 0, skillPts: 1, skills: {},
        missions: {},        // id → {done, best, grade, plays}
        evidence: [],        // toplanan delil kimlikleri (kampanya boyu)
        rescued: [],         // kurtarılan karakter kimlikleri
        decisions: {},       // anlatı kararları
        cosmetics: ['std'], cosmetic: 'std',
        loadout: { outfit: 'tactical', primary: 'rifle', secondary: 'pistol_s', gadget: 'medkit', squad: [] },
        stats: { kills: 0, arrests: 0, takedowns: 0, civSaved: 0, civLost: 0, playTime: 0, missionsDone: 0 },
        settings: {
          quality: 'auto', sens: 1, invertY: false, fov: 70, vol: 0.8, sfxVol: 0.9, musVol: 0.45,
          voice: false, touch: 'auto', showFps: false, traffic: true, aimAssist: true,
        },
        tutorial: {},
        campaignDone: false,
      };
    },
    load() {
      let d = null;
      try { const raw = localStorage.getItem(SAVE_KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
      const def = this.defaults();
      if (!d || typeof d !== 'object') d = def;
      // sürüm geçişleri
      if (!d.v || d.v < 2) { d.decisions = d.decisions || {}; d.rescued = d.rescued || []; d.v = 2; }
      if (d.v < 3) { d.cosmetics = d.cosmetics || ['std']; d.cosmetic = d.cosmetic || 'std'; d.v = 3; }
      // eksik alanları tamamla
      for (const k in def) if (d[k] === undefined) d[k] = def[k];
      for (const k in def.settings) if (d.settings[k] === undefined) d.settings[k] = def.settings[k];
      for (const k in def.stats) if (d.stats[k] === undefined) d.stats[k] = def.stats[k];
      for (const k in def.loadout) if (d.loadout[k] === undefined) d.loadout[k] = def.loadout[k];
      this.data = d;
      return d;
    },
    write() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
    },
    reset() {
      const keepSettings = this.data ? this.data.settings : null;
      this.data = this.defaults();
      if (keepSettings) this.data.settings = keepSettings;
      this.write();
    },
    hasProgress() { return this.data && (this.data.xp > 0 || Object.keys(this.data.missions).length > 0); },
  };
})();
