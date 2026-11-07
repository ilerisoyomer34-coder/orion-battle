/* KOMUTA — navigasyon: 0.5 m ızgara, bağlantı bileşenleri, A* + yol düzleştirme, çok katlı katmanlar */
'use strict';
(function () {
  const U = K.U;
  const CS = 0.5, R = 0.3, MAX_EXP = 90000;

  class NavGrid {
    constructor(L) {
      this.id = L.id; this.y = L.y || 0; this.cs = CS;
      this.x0 = L.x0; this.z0 = L.z0;
      this.w = Math.ceil((L.x1 - L.x0) / CS); this.h = Math.ceil((L.z1 - L.z0) / CS);
      this.n = this.w * this.h;
      this.blk = new Uint8Array(this.n);          // 0 boş, 1 dolu, 2 kapı
      this.doorRef = new Map();                    // hücre → kapı nesnesi
      this.comp = new Int32Array(this.n);
      this.g = new Float32Array(this.n); this.par = new Int32Array(this.n); this.st = new Uint32Array(this.n); this.cl = new Uint32Array(this.n);
      this.stamp = 0;
      this.heapI = new Int32Array(MAX_EXP * 8 + 16); this.heapF = new Float32Array(MAX_EXP * 8 + 16);
    }
    idx(x, z) {
      const ix = Math.floor((x - this.x0) / CS), iz = Math.floor((z - this.z0) / CS);
      if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return -1;
      return iz * this.w + ix;
    }
    cx(i) { return this.x0 + ((i % this.w) + 0.5) * CS; }
    cz(i) { return this.z0 + (Math.floor(i / this.w) + 0.5) * CS; }
    rasterize(colliders) {
      const W = K.world;
      // dünya dışı / su
      if (this.id === 0) {
        for (let iz = 0; iz < this.h; iz++) for (let ix = 0; ix < this.w; ix++) {
          const x = this.x0 + (ix + 0.5) * CS, z = this.z0 + (iz + 0.5) * CS;
          if (x > 258 && W.terrainH(x, z) < -0.4) this.blk[iz * this.w + ix] = 1;
        }
        for (let ix = 0; ix < this.w; ix++) { this.blk[ix] = 1; this.blk[(this.h - 1) * this.w + ix] = 1; }
        for (let iz = 0; iz < this.h; iz++) { this.blk[iz * this.w] = 1; this.blk[iz * this.w + this.w - 1] = 1; }
      }
      const doorCells = [];
      for (const c of colliders) {
        if (!c.nav) continue;
        let base = this.y;
        if (this.id === 0) {
          const mx = (c.min.x + c.max.x) / 2, mz = (c.min.z + c.max.z) / 2;
          base = W.inCity(mx, mz) ? 0 : W.terrainH(mx, mz);
        }
        if (c.max.y <= base + 0.4 || c.min.y >= base + 1.7) continue;
        const inf = R;
        const ix0 = Math.max(0, Math.floor((c.min.x - inf - this.x0) / CS)), ix1 = Math.min(this.w - 1, Math.floor((c.max.x + inf - this.x0) / CS));
        const iz0 = Math.max(0, Math.floor((c.min.z - inf - this.z0) / CS)), iz1 = Math.min(this.h - 1, Math.floor((c.max.z + inf - this.z0) / CS));
        for (let iz = iz0; iz <= iz1; iz++) {
          const z = this.z0 + (iz + 0.5) * CS;
          if (z < c.min.z - inf || z > c.max.z + inf) continue;
          for (let ix = ix0; ix <= ix1; ix++) {
            const x = this.x0 + (ix + 0.5) * CS;
            if (x < c.min.x - inf || x > c.max.x + inf) continue;
            const i = iz * this.w + ix;
            if (c.door) doorCells.push(i, c.door);
            else this.blk[i] = 1;
          }
        }
      }
      // kapı hücreleri: duvarla çakışmıyorsa kapı olarak işaretle (kapı açıklığı tam hücre merkezine denk gelmese de geçit garanti)
      for (let k = 0; k < doorCells.length; k += 2) {
        const i = doorCells[k];
        if (this.blk[i] === 1) continue;
        this.blk[i] = 2; this.doorRef.set(i, doorCells[k + 1]);
      }
      this.components();
    }
    components() {
      const comp = this.comp; comp.fill(0);
      let id = 0; const stack = new Int32Array(this.n);
      for (let s = 0; s < this.n; s++) {
        if (this.blk[s] === 1 || comp[s]) continue;
        id++; let sp = 0; stack[sp++] = s; comp[s] = id;
        while (sp) {
          const i = stack[--sp], ix = i % this.w;
          const nb = [ix > 0 ? i - 1 : -1, ix < this.w - 1 ? i + 1 : -1, i - this.w, i + this.w];
          for (const j of nb) { if (j < 0 || j >= this.n || comp[j] || this.blk[j] === 1) continue; comp[j] = id; stack[sp++] = j; }
        }
      }
      this.ncomp = id;
    }
    passable(i) {
      const b = this.blk[i];
      if (b === 0) return true;
      if (b === 2) { const d = this.doorRef.get(i); return !(d && d.locked); }
      return false;
    }
    nearestFree(x, z, maxR = 10) {
      const i0 = this.idx(x, z);
      if (i0 >= 0 && this.passable(i0)) return i0;
      const cix = Math.floor((x - this.x0) / CS), ciz = Math.floor((z - this.z0) / CS);
      const mr = Math.ceil(maxR / CS);
      let best = -1, bd = Infinity;
      for (let r = 1; r <= mr; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const ix = cix + dx, iz = ciz + dz;
          if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) continue;
          const i = iz * this.w + ix;
          if (!this.passable(i)) continue;
          const d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) return best;
      }
      return -1;
    }
    lineFree(ax, az, bx, bz) {
      const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (CS * 0.5));
      for (let k = 1; k < n; k++) {
        const t = k / n, i = this.idx(ax + (bx - ax) * t, az + (bz - az) * t);
        if (i < 0 || !this.passable(i)) return false;
      }
      return true;
    }
    findPath(sx, sz, tx, tz) {
      let s = this.nearestFree(sx, sz, 3), t = this.nearestFree(tx, tz, 8);
      if (s < 0 || t < 0) return null;
      if (this.comp[s] !== this.comp[t]) {
        // hedef farklı bileşende: hedefe en yakın, başlangıçla aynı bileşendeki hücre
        const tt = this.nearestInComp(tx, tz, this.comp[s], 14);
        if (tt < 0) return null;
        t = tt;
        var partial = true;
      }
      const W = this.w, g = this.g, par = this.par, st = this.st, cl = this.cl;
      const stamp = ++this.stamp;
      const hI = this.heapI, hF = this.heapF; let hn = 0;
      const tix = t % W, tiz = Math.floor(t / W);
      const heur = (i) => { const dx = Math.abs(i % W - tix), dz = Math.abs(Math.floor(i / W) - tiz); return (dx + dz + (1.4142 - 2) * Math.min(dx, dz)) * 1.25; };
      const push = (i, f) => { let k = hn++; while (k > 0) { const p = (k - 1) >> 1; if (hF[p] <= f) break; hI[k] = hI[p]; hF[k] = hF[p]; k = p; } hI[k] = i; hF[k] = f; };
      const pop = () => { const top = hI[0]; const li = hI[--hn], lf = hF[hn]; let k = 0; while (true) { let c = 2 * k + 1; if (c >= hn) break; if (c + 1 < hn && hF[c + 1] < hF[c]) c++; if (hF[c] >= lf) break; hI[k] = hI[c]; hF[k] = hF[c]; k = c; } hI[k] = li; hF[k] = lf; return top; };
      g[s] = 0; st[s] = stamp; par[s] = -1; push(s, heur(s));
      let exp = 0, found = false, bestI = s, bestH = heur(s);
      const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1], DC = [1, 1, 1, 1, 1.4142, 1.4142, 1.4142, 1.4142];
      while (hn > 0 && exp < MAX_EXP) {
        const i = pop();
        if (cl[i] === stamp) continue;
        cl[i] = stamp; exp++;
        if (i === t) { found = true; break; }
        const h = heur(i); if (h < bestH) { bestH = h; bestI = i; }
        const ix = i % W, iz = (i - ix) / W;
        for (let k = 0; k < 8; k++) {
          const nx = ix + DX[k], nz = iz + DZ[k];
          if (nx < 0 || nz < 0 || nx >= W || nz >= this.h) continue;
          const j = nz * W + nx;
          if (!this.passable(j)) continue;
          if (k >= 4 && (!this.passable(iz * W + nx) || !this.passable(nz * W + ix))) continue;
          const ng = g[i] + DC[k];
          if (st[j] !== stamp || ng < g[j]) { st[j] = stamp; g[j] = ng; par[j] = i; push(j, ng + heur(j)); if (hn >= hI.length - 8) break; }
        }
      }
      let end = found ? t : bestI;
      if (!found) partial = true;
      const cells = [];
      for (let i = end; i >= 0 && cells.length < 5000; i = par[i]) { cells.push(i); if (i === s) break; }
      cells.reverse();
      // düzleştirme (string pulling)
      const pts = [];
      let ax = sx, az = sz;
      let k = 0;
      while (k < cells.length) {
        let far = k;
        for (let j = Math.min(cells.length - 1, k + 60); j > k; j--) { if (this.lineFree(ax, az, this.cx(cells[j]), this.cz(cells[j]))) { far = j; break; } }
        const px = this.cx(cells[far]), pz = this.cz(cells[far]);
        pts.push({ x: px, z: pz });
        ax = px; az = pz; k = far + 1;
      }
      if (found && !partial) {
        if (this.lineFree(ax, az, tx, tz) && this.passable(this.idx(tx, tz))) { if (pts.length) pts[pts.length - 1] = { x: tx, z: tz }; else pts.push({ x: tx, z: tz }); }
      }
      return { pts, ok: found && !partial, partial: !!partial || !found, exp };
    }
    nearestInComp(x, z, comp, maxR) {
      const cix = Math.floor((x - this.x0) / CS), ciz = Math.floor((z - this.z0) / CS), mr = Math.ceil(maxR / CS);
      for (let r = 0; r <= mr; r++) {
        let best = -1, bd = Infinity;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const ix = cix + dx, iz = ciz + dz;
          if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) continue;
          const i = iz * this.w + ix;
          if (this.comp[i] !== comp || !this.passable(i)) continue;
          const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) return best;
      }
      return -1;
    }
  }

  const N = K.nav = {
    layers: {},
    build() {
      const W = K.world;
      const t0 = performance.now();
      const ground = new NavGrid({ id: 0, y: 0, x0: -300, z0: -330, x1: 300, z1: 300 });
      ground.rasterize(W.colliders);
      N.layers[0] = ground;
      for (const L of W.navLayers) { const g = new NavGrid(L); g.rasterize(W.colliders); N.layers[L.id] = g; }
      N.buildMs = performance.now() - t0;
    },
    path(layer, sx, sz, tx, tz) { const g = N.layers[layer || 0]; return g ? g.findPath(sx, sz, tx, tz) : null; },
    free(layer, x, z) { const g = N.layers[layer || 0]; if (!g) return true; const i = g.idx(x, z); return i >= 0 && g.passable(i); },
    nearestFree(layer, x, z, maxR = 6) {
      const g = N.layers[layer || 0]; if (!g) return { x, z };
      const i = g.nearestFree(x, z, maxR); if (i < 0) return null;
      return { x: g.cx(i), z: g.cz(i) };
    },
    reachable(layer, sx, sz, tx, tz) {
      const g = N.layers[layer || 0]; if (!g) return true;
      const a = g.nearestFree(sx, sz, 3), b = g.nearestFree(tx, tz, 4);
      return a >= 0 && b >= 0 && g.comp[a] === g.comp[b];
    },
    // kilitli kapıları da hesaba katan gerçek erişilebilirlik (A*)
    canReach(layer, sx, sz, tx, tz) {
      if (!N.reachable(layer, sx, sz, tx, tz)) return false;
      const r = N.path(layer, sx, sz, tx, tz);
      return !!(r && r.ok);
    },
    layerOfY(x, z, y) {
      // kule katları
      for (const id in N.layers) { const g = N.layers[id]; if (+id === 0) continue; if (Math.abs(y - g.y) < 1.5 && g.idx(x, z) >= 0) return +id; }
      return 0;
    },
    randomFreeNear(layer, x, z, r) {
      for (let k = 0; k < 20; k++) { const a = Math.random() * Math.PI * 2, d = Math.random() * r; const p = N.nearestFree(layer, x + Math.cos(a) * d, z + Math.sin(a) * d, 2); if (p) return p; }
      return N.nearestFree(layer, x, z, r);
    },
  };
})();
