/* KOMUTA — dünya: arazi, şehir bölgeleri, girilebilir binalar, kapılar, çarpışma, ışın testi, ortam/hava */
'use strict';
(function () {
  const U = K.U, M = K.models;
  const W = K.world = {
    colliders: [], hash: new Map(), CELL: 8, stamp: 1,
    doors: [], interactables: [], lamps: [], poi: {}, zones: {}, sidewalks: [], trafficLoops: [], parking: [],
    navLayers: [], env: { time: 'day', weather: 'clear' }, floors: {}, elevators: [],
  };
  const CITY = W.CITY = { x0: -266, x1: 266, z0: -212, z1: 262 };
  const flats = [];

  // ───────── Arazi ─────────
  function rawH(x, z) {
    if (x > 266 && z > 96 && z < 460) return -5;
    const dx = Math.max(CITY.x0 - x, 0, x - CITY.x1);
    const dz = Math.max(CITY.z0 - z, 0, z - CITY.z1);
    const d = Math.hypot(dx, dz);
    if (d <= 0) return 0;
    let h = U.smooth(0, 70, d) * (5 + U.fbm(x * 0.008 + 3, z * 0.008 - 7, 4) * 34) + U.smooth(70, 220, d) * 25;
    if (x > 266) h = Math.min(h, U.lerp(-5, h, U.smooth(0, 30, Math.min(z - 96, 460 - z))));
    return h;
  }
  W.terrainH = function (x, z) {
    let h = rawH(x, z);
    for (let i = 0; i < flats.length; i++) {
      const f = flats[i], d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + f.blend) { const t = U.smooth(f.r, f.r + f.blend, d); h = f.h + (h - f.h) * t; }
    }
    return h;
  };
  function flatten(x, z, r, blend = 18) { flats.push({ x, z, r, blend, h: rawH(x, z) }); }
  W.inCity = (x, z) => x > CITY.x0 && x < CITY.x1 && z > CITY.z0 && z < CITY.z1;

  // ───────── Geometri oluşturucu (dünya ölçekli UV) ─────────
  class GB {
    constructor() { this.p = []; this.n = []; this.uv = []; }
    quad(a, b, c, d, n, ua, ub, uc, ud) {
      this.p.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < 6; i++) this.n.push(n[0], n[1], n[2]);
      this.uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
    }
    // o: {us, vs, faces (string 'pxnxpznzpyny'), y0ref, uo, vo}
    box(x0, y0, z0, x1, y1, z1, o = {}) {
      const us = o.us || 4, vs = o.vs || us, f = o.faces || 'pxnxpznzpy', yr = o.y0ref != null ? o.y0ref : y0;
      const uo = o.uo || 0, vo = o.vo || 0;
      const V = (y) => (y - yr) / vs + vo;
      const lx = x1 - x0, lz = z1 - z0;
      if (f.includes('pz')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [uo, V(y0)], [uo + lx / us, V(y0)], [uo + lx / us, V(y1)], [uo, V(y1)]);
      if (f.includes('nz')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [uo, V(y0)], [uo + lx / us, V(y0)], [uo + lx / us, V(y1)], [uo, V(y1)]);
      if (f.includes('px')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [uo, V(y0)], [uo + lz / us, V(y0)], [uo + lz / us, V(y1)], [uo, V(y1)]);
      if (f.includes('nx')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [uo, V(y0)], [uo + lz / us, V(y0)], [uo + lz / us, V(y1)], [uo, V(y1)]);
      const ts = o.tus || us;
      if (f.includes('py')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 / ts, -z1 / ts], [x1 / ts, -z1 / ts], [x1 / ts, -z0 / ts], [x0 / ts, -z0 / ts]);
      if (f.includes('ny')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [x0 / ts, z0 / ts], [x1 / ts, z0 / ts], [x1 / ts, z1 / ts], [x0 / ts, z1 / ts]);
    }
    floor(x0, z0, x1, z1, y, us = 4) { this.box(x0, y, z0, x1, y, z1, { faces: 'py', tus: us }); }
    mesh(mat, cast = true, recv = true) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = recv;
      return m;
    }
  }
  W.GB = GB;

  // ───────── Çarpıştırıcılar ─────────
  function hkey(ix, iz) { return (ix + 1024) * 4096 + (iz + 1024); }
  function addC(x0, y0, z0, x1, y1, z1, o = {}) {
    const c = { min: { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) }, max: { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) }, on: true, surf: o.surf || 'concrete', nav: o.nav !== false, door: o.door || null, tag: o.tag || null, see: !!o.see, _s: 0, cells: [] };
    W.colliders.push(c);
    hashInsert(c);
    return c;
  }
  W.addC = addC;
  function hashInsert(c) {
    const C = W.CELL;
    const ix0 = Math.floor(c.min.x / C), ix1 = Math.floor(c.max.x / C), iz0 = Math.floor(c.min.z / C), iz1 = Math.floor(c.max.z / C);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
      const k = hkey(ix, iz);
      let a = W.hash.get(k); if (!a) { a = []; W.hash.set(k, a); }
      a.push(c); c.cells.push(k);
    }
  }
  W.removeC = function (c) {
    for (const k of c.cells) { const a = W.hash.get(k); if (a) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); } }
    c.cells = []; c.on = false;
    const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1);
  };
  const qOut = [];
  W.query = function (x0, z0, x1, z1) {
    const C = W.CELL, s = ++W.stamp;
    qOut.length = 0;
    const ix0 = Math.floor(x0 / C), ix1 = Math.floor(x1 / C), iz0 = Math.floor(z0 / C), iz1 = Math.floor(z1 / C);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
      const a = W.hash.get(hkey(ix, iz));
      if (!a) continue;
      for (let i = 0; i < a.length; i++) { const c = a[i]; if (c._s !== s && c.on) { c._s = s; qOut.push(c); } }
    }
    return qOut;
  };
  // zemin yüksekliği: arazi + üstüne basılabilir kutular
  W.groundAt = function (x, z, maxY, r = 0.15) {
    let h = W.terrainH(x, z);
    const list = W.query(x - r, z - r, x + r, z + r);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.max.y > maxY || c.max.y <= h) continue;
      if (x >= c.min.x - r && x <= c.max.x + r && z >= c.min.z - r && z <= c.max.z + r) h = c.max.y;
    }
    return h;
  };
  // dikey kapsül (daire) itme — karakter ve araçlar için
  W.pushCircle = function (p, r, y0, y1, out) {
    out = out || { hit: false, nx: 0, nz: 0 };
    out.hit = false; out.nx = 0; out.nz = 0;
    const list = W.query(p.x - r - 0.1, p.z - r - 0.1, p.x + r + 0.1, p.z + r + 0.1);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.max.y <= y0 || c.min.y >= y1) continue;
      const cx = U.clamp(p.x, c.min.x, c.max.x), cz = U.clamp(p.z, c.min.z, c.max.z);
      let dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2), push = r - d;
        dx /= d; dz /= d;
        p.x += dx * push; p.z += dz * push;
        out.nx += dx; out.nz += dz;
      } else {
        const l = p.x - c.min.x, rr = c.max.x - p.x, b = p.z - c.min.z, f = c.max.z - p.z;
        const m = Math.min(l, rr, b, f);
        if (m === l) { p.x = c.min.x - r; out.nx -= 1; } else if (m === rr) { p.x = c.max.x + r; out.nx += 1; }
        else if (m === b) { p.z = c.min.z - r; out.nz -= 1; } else { p.z = c.max.z + r; out.nz += 1; }
      }
      out.hit = true; out.c = c;
    }
    return out;
  };
  // ışın testi (kutular + arazi)
  const rayRes = { d: 0, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, c: null, surf: '' };
  function rayBox(ox, oy, oz, dx, dy, dz, c, best) {
    let tmin = 0, tmax = best, nx = 0, ny = 0, nz = 0;
    const mn = c.min, mx = c.max;
    for (let a = 0; a < 3; a++) {
      const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz;
      const lo = a === 0 ? mn.x : a === 1 ? mn.y : mn.z, hi = a === 0 ? mx.x : a === 1 ? mx.y : mx.z;
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; }
      let t1 = (lo - o) / d, t2 = (hi - o) / d, s = -1;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
      if (t1 > tmin) { tmin = t1; nx = ny = nz = 0; if (a === 0) nx = s; else if (a === 1) ny = s; else nz = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    if (tmin <= 0) return -1;
    rayBox.nx = nx; rayBox.ny = ny; rayBox.nz = nz;
    return tmin;
  }
  W.raycast = function (ox, oy, oz, dx, dy, dz, maxD, opts) {
    let best = maxD, hitC = null, hnx = 0, hny = 0, hnz = 0;
    const SEG = 32;
    for (let s0 = 0; s0 < maxD && !hitC; s0 += SEG) {
      const s1 = Math.min(maxD, s0 + SEG);
      const ax = ox + dx * s0, az = oz + dz * s0, bx = ox + dx * s1, bz = oz + dz * s1;
      const list = W.query(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz));
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (opts && opts.ignoreDoors && c.door) continue;
        if (c.see && !(opts && opts.solid)) continue;
        const t = rayBox(ox, oy, oz, dx, dy, dz, c, best);
        if (t > 0 && t < best) { best = t; hitC = c; hnx = rayBox.nx; hny = rayBox.ny; hnz = rayBox.nz; }
      }
    }
    // arazi / zemin
    let tg = Infinity;
    if (dy < -1e-4) {
      const tp = -oy / dy;
      const px = ox + dx * tp, pz = oz + dz * tp;
      if (W.inCity(px, pz) && tp > 0) tg = tp;
    }
    if (!W.inCity(ox, oz) || !W.inCity(ox + dx * best, oz + dz * best)) {
      const step = 1.5;
      let prevT = 0;
      for (let t = step; t < Math.min(best, tg); t += step) {
        const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
        if (y < W.terrainH(x, z)) {
          let a = prevT, b = t;
          for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (oy + dy * m < W.terrainH(ox + dx * m, oz + dz * m)) b = m; else a = m; }
          tg = b; break;
        }
        prevT = t;
      }
    }
    if (tg < best) {
      rayRes.d = tg; rayRes.x = ox + dx * tg; rayRes.y = oy + dy * tg; rayRes.z = oz + dz * tg;
      rayRes.nx = 0; rayRes.ny = 1; rayRes.nz = 0; rayRes.c = null; rayRes.surf = W.inCity(rayRes.x, rayRes.z) ? 'concrete' : 'grass';
      return rayRes;
    }
    if (!hitC) return null;
    rayRes.d = best; rayRes.x = ox + dx * best; rayRes.y = oy + dy * best; rayRes.z = oz + dz * best;
    rayRes.nx = hnx; rayRes.ny = hny; rayRes.nz = hnz; rayRes.c = hitC; rayRes.surf = hitC.surf;
    return rayRes;
  };
  W.los = function (ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
    if (d < 0.01) return true;
    const h = W.raycast(ax, ay, az, dx / d, dy / d, dz / d, d - 0.05);
    return !h;
  };


  // ───────── Statik ağları parçalara böl (görüş dışı ayıklama için) ─────────
  W.chunkify = function (mesh, size = 90) {
    const g = mesh.geometry, pos = g.attributes.position, n = pos.count;
    if (n < 3000) return [mesh];
    const attrs = Object.keys(g.attributes);
    const buckets = new Map();
    for (let t = 0; t < n; t += 3) {
      const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3, cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
      const k = Math.floor(cx / size) * 1000 + Math.floor(cz / size);
      let b = buckets.get(k); if (!b) { b = []; buckets.set(k, b); } b.push(t);
    }
    if (buckets.size <= 1) return [mesh];
    const out = [];
    for (const tris of buckets.values()) {
      const ng = new THREE.BufferGeometry();
      for (const a of attrs) {
        const src = g.attributes[a], is = src.itemSize, arr = new Float32Array(tris.length * 3 * is);
        let o = 0;
        for (const t of tris) for (let v = 0; v < 3; v++) for (let c = 0; c < is; c++) arr[o++] = src.array[(t + v) * is + c];
        ng.setAttribute(a, new THREE.BufferAttribute(arr, is));
      }
      ng.computeBoundingSphere(); ng.computeBoundingBox();
      const m = new THREE.Mesh(ng, mesh.material); m.castShadow = mesh.castShadow; m.receiveShadow = mesh.receiveShadow;
      out.push(m);
    }
    g.dispose();
    return out;
  };

  // ───────── Malzemeler ─────────
  function mat(map, rep, o = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ map, roughness: 0.85, metalness: 0.0 }, o));
  }
  function facadeMat(f, o = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.7, metalness: 0.1 }, o));
  }

  // ───────── Dünya kurulumu ─────────
  W.build = function (scene, onProgress) {
    W.scene = scene;
    const T = K.tex;
    const rnd = U.rng(20261107);
    const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
    const rf = (a, b) => a + rnd() * (b - a);

    W.mats = {
      asphalt: mat(T.asphalt, 1, { roughness: 0.9 }),
      sidewalk: mat(T.sidewalk, 1, { roughness: 0.9 }),
      paving: mat(T.paving, 1),
      concrete: mat(T.concrete, 1),
      roof: mat(T.roof, 1, { roughness: 0.95 }),
      plaster: mat(T.plaster, 1, { roughness: 0.92 }),
      tiles: mat(T.tiles, 1, { roughness: 0.45 }),
      carpet: mat(T.carpet, 1, { roughness: 1 }),
      wood: mat(T.wood, 1, { roughness: 0.6 }),
      metal: mat(T.metal, 1, { roughness: 0.55, metalness: 0.5 }),
      grass: new THREE.MeshStandardMaterial({ map: T.ground, color: 0x5f7a3a, roughness: 1 }),
      dirt: new THREE.MeshStandardMaterial({ map: T.ground, color: 0x7a6a50, roughness: 1 }),
      lane: new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.6 }),
      laneY: new THREE.MeshStandardMaterial({ color: 0xd8a830, roughness: 0.6 }),
      fence: new THREE.MeshStandardMaterial({ map: T.fence, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6 }),
      water: new THREE.MeshStandardMaterial({ color: 0x0f2a3a, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.92 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x8fb4c8, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.35, depthWrite: false }),
      door: new THREE.MeshStandardMaterial({ map: T.wood, color: 0xb08a68, roughness: 0.6 }),
      doorMetal: new THREE.MeshStandardMaterial({ map: T.metal, color: 0x9aa4ae, roughness: 0.5, metalness: 0.6 }),
    };
    W.facadeMats = {};
    for (const k in T.facades) W.facadeMats[k] = facadeMat(T.facades[k], k === 'glass' ? { metalness: 0.55, roughness: 0.35 } : {});

    const G = {
      asphalt: new GB(), sidewalk: new GB(), paving: new GB(), concrete: new GB(), roof: new GB(), plaster: new GB(),
      tiles: new GB(), carpet: new GB(), wood: new GB(), metal: new GB(), grass: new GB(), dirt: new GB(), lane: new GB(), laneY: new GB(),
      fence: new GB(),
    };
    const FG = {}; for (const k in T.facades) FG[k] = new GB();
    W.G = G; W.FG = FG;
    const P = new M.Parts();   // birleşik sahne eşyaları
    W.P = P;
    if (K.wa.enabled) { K.wa.wrapProps(); K.wa.capture = true; }
    const lampPts = [];

    // düzlükler (dağ üssü, kamp, iniş alanları)
    flatten(-40, -262, 34);
    flatten(-150, -300, 24);
    flatten(-110, -238, 12);

    // ── Zemin: şehir kaplaması
    G.paving.floor(CITY.x0, CITY.z0, CITY.x1, CITY.z1, 0.02, 6);

    // ── Yollar
    const RW = 12, SW = 3.5;
    const H = [ // z, x0, x1
      [0, -262, 262], [-110, -70, 262], [110, -262, 262], [-205, -70, 70],
    ];
    const V = [ // x, z0, z1
      [-70, -205, 255], [70, -205, 255], [200, 0, 255], [-150, 110, 128],
    ];
    W.roadsH = H; W.roadsV = V;
    const asph = G.asphalt, yR = 0.035;
    function emitStrip(isH, c, a, b) {
      if (b - a < 0.1) return;
      if (isH) asph.floor(a, c - RW / 2, b, c + RW / 2, yR, 8);
      else asph.floor(c - RW / 2, a, c + RW / 2, b, yR, 8);
    }
    function subtract(a, b, cuts) {
      let segs = [[a, b]];
      for (const [ca, cb] of cuts) {
        const ns = [];
        for (const [sa, sb] of segs) {
          if (cb <= sa || ca >= sb) { ns.push([sa, sb]); continue; }
          if (ca > sa) ns.push([sa, ca]);
          if (cb < sb) ns.push([cb, sb]);
        }
        segs = ns;
      }
      return segs;
    }
    for (const [z, x0, x1] of H) emitStrip(true, z, x0, x1);
    for (const [x, z0, z1] of V) {
      const cuts = H.filter((h) => x >= h[1] - 1 && x <= h[2] + 1).map((h) => [h[0] - RW / 2, h[0] + RW / 2]);
      for (const [a, b] of subtract(z0, z1, cuts)) emitStrip(false, x, a, b);
    }
    // şerit çizgileri + kaldırımlar
    const curbH = 0.16;
    function sidewalkAlong(isH, c, a, b, cutsFull) {
      for (const side of [-1, 1]) {
        const off = side * (RW / 2 + SW / 2);
        for (const [sa, sb] of subtract(a, b, cutsFull)) {
          if (sb - sa < 0.5) continue;
          if (isH) { G.sidewalk.box(sa, 0, c + off - SW / 2, sb, curbH, c + off + SW / 2, { us: 4, faces: 'pznzpxnxpy', tus: 4 }); addC(sa, 0, c + off - SW / 2, sb, curbH, c + off + SW / 2, { nav: false }); W.sidewalks.push({ ax: sa + 1, az: c + off, bx: sb - 1, bz: c + off }); }
          else { G.sidewalk.box(c + off - SW / 2, 0, sa, c + off + SW / 2, curbH, sb, { us: 4, faces: 'pznzpxnxpy', tus: 4 }); addC(c + off - SW / 2, 0, sa, c + off + SW / 2, curbH, sb, { nav: false }); W.sidewalks.push({ ax: c + off, az: sa + 1, bx: c + off, bz: sb - 1 }); }
          // lambalar
          for (let t = sa + 8; t < sb - 4; t += 28) {
            const lx = isH ? t : c + off + side * (SW / 2 - 0.4), lz = isH ? c + off + side * (SW / 2 - 0.4) : t;
            const ry = isH ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
            M.props.lampPost(P, lx, curbH, lz, ry);
            const hx = lx + Math.sin(ry) * 1.3, hz = lz + Math.cos(ry) * 1.3;
            lampPts.push(hx, curbH + 6.2, hz); W.lamps.push({ x: hx, y: curbH + 6.2, z: hz });
            addC(lx - 0.15, 0, lz - 0.15, lx + 0.15, 6.5, lz + 0.15, { surf: 'metal', nav: false });
          }
        }
      }
    }
    for (const [z, x0, x1] of H) {
      const cuts = V.filter((v) => z >= v[1] - 1 && z <= v[2] + 1).map((v) => [v[0] - RW / 2 - SW, v[0] + RW / 2 + SW]);
      sidewalkAlong(true, z, x0, x1, cuts);
      const lcuts = V.filter((v) => z >= v[1] - 1 && z <= v[2] + 1).map((v) => [v[0] - RW / 2, v[0] + RW / 2]);
      for (const [a, b] of subtract(x0, x1, lcuts)) for (let x = a + 1; x < b - 3; x += 6) G.lane.floor(x, z - 0.08, x + 3, z + 0.08, yR + 0.008, 4);
    }
    for (const [x, z0, z1] of V) {
      const cuts = H.filter((h) => x >= h[1] - 1 && x <= h[2] + 1).map((h) => [h[0] - RW / 2 - SW, h[0] + RW / 2 + SW]);
      sidewalkAlong(false, x, z0, z1, cuts);
      const lcuts = H.filter((h) => x >= h[1] - 1 && x <= h[2] + 1).map((h) => [h[0] - RW / 2, h[0] + RW / 2]);
      for (const [a, b] of subtract(z0, z1, lcuts)) for (let z = a + 1; z < b - 3; z += 6) G.lane.floor(x - 0.08, z, x + 0.08, z + 3, yR + 0.008, 4);
    }
    // yaya geçitleri
    for (const [z, x0, x1] of H) for (const [x, z0, z1] of V) {
      if (x < x0 - 1 || x > x1 + 1 || z < z0 - 1 || z > z1 + 1) continue;
      for (const s of [-1, 1]) {
        for (let i = -5; i <= 5; i += 1.4) G.lane.floor(x + s * (RW / 2 + 1.0) - 0.9, z + i - 0.3, x + s * (RW / 2 + 1.0) + 0.9, z + i + 0.3, yR + 0.008, 4);
        for (let i = -5; i <= 5; i += 1.4) G.lane.floor(x + i - 0.3, z + s * (RW / 2 + 1.0) - 0.9, x + i + 0.3, z + s * (RW / 2 + 1.0) + 0.9, yR + 0.008, 4);
      }
      M.props.trafficLight(P, x + RW / 2 + 0.8, curbH, z + RW / 2 + 0.8, Math.PI);
      M.props.trafficLight(P, x - RW / 2 - 0.8, curbH, z - RW / 2 - 0.8, 0);
    }
    // trafik döngüleri (sağ şerit)
    W.trafficLoops = [
      [[-67, 3], [-67, 107], [67, 107], [67, 3]].map(([x, z]) => ({ x, z })),
      [[73, -3], [73, -107], [-67, -107], [-67, -3]].map(([x, z]) => ({ x, z })).reverse(),
      [[-259, 3], [-73, 3], [-73, 107], [-259, 107]].map(([x, z]) => ({ x, z })).reverse(),
      [[73, 3], [197, 3], [197, 107], [73, 107]].map(([x, z]) => ({ x, z })).reverse(),
      [[73, -113], [259, -113], [259, -3], [73, -3]].map(([x, z]) => ({ x, z })).reverse(),
    ];

    // ── Bina yardımcıları
    // sokağa bakan kenar: en yakın yol çizgisine göre
    function frontSide(x0, z0, x1, z1) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      let best = 1e9, side = 'pz';
      for (const [rz, a, b] of H) { if (cx < a - 20 || cx > b + 20) continue; const d = Math.min(Math.abs(rz - z0), Math.abs(rz - z1)); if (d < best) { best = d; side = rz > cz ? 'pz' : 'nz'; } }
      for (const [rx, a, b] of V) { if (cz < a - 20 || cz > b + 20) continue; const d = Math.min(Math.abs(rx - x0), Math.abs(rx - x1)); if (d < best) { best = d; side = rx > cx ? 'px' : 'nx'; } }
      return side;
    }
    const WA = K.wa;
    const GLB_STYLE = { glass: 'glass', office: 'office', old: 'old', old2: 'old', apt: 'apt', ind: 'ind', shack: 'shack' };
    function building(x0, z0, x1, z1, h, style, o = {}) {
      // Sketchfab bina seti varsa cephe yerine onu yerleştir (çarpıştırıcı kutu olarak kalır)
      if (WA.enabled && !o.proc) {
        const st = (h < 7.5 && (style === 'old' || style === 'old2') && WA.list('building', 'shack').length) ? 'shack' : GLB_STYLE[style] || style;
        const plan = WA.planBuilding(x0, z0, x1, z1, h, st, rnd, o.front || frontSide(x0, z0, x1, z1));
        if (plan) {
          for (const p of plan.pieces) WA.put(p.id, p.x, 0, p.z, p.ry, p.sx, p.sy, p.sz);
          if (o.collider !== false) addC(x0, 0, z0, x1, Math.max(3, plan.h), z1, { surf: style === 'ind' ? 'metal' : 'concrete' });
          W.glbBuildings = (W.glbBuildings || 0) + 1;
          return;
        }
      }
      const fg = FG[style] || FG.office;
      fg.box(x0, 0, z0, x1, h, z1, { us: 14, vs: 13.2, faces: 'pxnxpznz', uo: o.uo || 0 });
      G.concrete.box(x0 - 0.15, 0, z0 - 0.15, x1 + 0.15, 0.6, z1 + 0.15, { us: 4, faces: 'pxnxpznz' });
      G.roof.box(x0, h, z0, x1, h + 0.02, z1, { faces: 'py', tus: 8 });
      // korkuluk
      const pt = 0.3, ph = 0.8;
      G.concrete.box(x0, h, z0, x1, h + ph, z0 + pt, { us: 4 }); G.concrete.box(x0, h, z1 - pt, x1, h + ph, z1, { us: 4 });
      G.concrete.box(x0, h, z0, x0 + pt, h + ph, z1, { us: 4 }); G.concrete.box(x1 - pt, h, z0, x1, h + ph, z1, { us: 4 });
      if (!o.noRoofProps && (x1 - x0) > 8) {
        P.box(2.2, 1.4, 1.6, 0x9aa0a6, 'METAL', U.lerp(x0, x1, 0.3), h + 0.7, U.lerp(z0, z1, 0.4));
        if (rnd() < 0.5) P.cyl(1.0, 1.0, 2.2, 10, 0x6a6e72, 'METAL', U.lerp(x0, x1, 0.7), h + 1.1, U.lerp(z0, z1, 0.65));
      }
      if (o.collider !== false) addC(x0, 0, z0, x1, h, z1, { surf: style === 'ind' ? 'metal' : 'concrete' });
    }
    W.building = building;
    // açıklıklı duvar: eksen 'x' (z sabit) veya 'z' (x sabit)
    function wall(axis, c, a, b, y0, h, t, openings, o = {}) {
      const gb = o.gb || G.plaster, fg = o.fg || null, outer = o.outer || 0;
      let segs = [[a, b, 0, h]];
      const cuts = (openings || []).slice().sort((p, q) => p[0] - q[0]);
      const pieces = [];
      let cur = a;
      for (const op of cuts) {
        const [oa, ob, top = 2.3, sill = 0] = op;
        if (oa > cur) pieces.push([cur, oa, 0, h]);
        if (top < h) pieces.push([oa, ob, top, h]);
        if (sill > 0) pieces.push([oa, ob, 0, sill]);
        cur = ob;
      }
      if (cur < b) pieces.push([cur, b, 0, h]);
      segs = pieces;
      for (const [sa, sb, ya, yb] of segs) {
        if (sb - sa < 0.01) continue;
        let x0, z0, x1, z1;
        if (axis === 'x') { x0 = sa; x1 = sb; z0 = c - t / 2; z1 = c + t / 2; }
        else { z0 = sa; z1 = sb; x0 = c - t / 2; x1 = c + t / 2; }
        const Y0 = y0 + ya, Y1 = y0 + yb;
        if (fg && outer) {
          // dış yüz cephe, iç yüzler sıva
          const outFace = axis === 'x' ? (outer > 0 ? 'pz' : 'nz') : (outer > 0 ? 'px' : 'nx');
          fg.box(x0, Y0, z0, x1, Y1, z1, { us: 14, vs: 13.2, faces: outFace, y0ref: 0 });
          const rest = 'pxnxpznzpyny'.match(/../g).filter((f) => f !== outFace).join('');
          gb.box(x0, Y0, z0, x1, Y1, z1, { us: 3, vs: 3, faces: rest, y0ref: y0 });
        } else gb.box(x0, Y0, z0, x1, Y1, z1, { us: 3, vs: 3, faces: o.faces || 'pxnxpznzpyny', y0ref: y0 });
        if (o.collider !== false) addC(x0, Y0, z0, x1, Y1, z1, { surf: o.surf || 'concrete' });
      }
    }
    W.wall = wall;

    // ── Kapılar
    function door(o) {
      // o: {x, z, axis:'x'|'z' (duvar ekseni), w, h, y, locked, code, key, name, auto, metal, glass, open}
      const w = o.w || 1.6, h = o.h || 2.25, y = o.y || 0, t = 0.08;
      const pivot = new THREE.Group();
      const d = { id: W.doors.length, o, open: false, ang: 0, target: 0, locked: !!o.locked, code: o.code || null, keyId: o.key || null, name: o.name || 'Kapı', auto: !!o.auto, pivot, x: o.x, z: o.z, y, axis: o.axis, w, layer: o.layer || 0 };
      const matD = o.glass ? W.mats.glass : (o.metal ? W.mats.doorMetal : W.mats.door);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(o.axis === 'x' ? w : t, h, o.axis === 'x' ? t : w), matD);
      mesh.castShadow = !o.glass; mesh.receiveShadow = true;
      if (o.axis === 'x') { pivot.position.set(o.x - w / 2, y, o.z); mesh.position.set(w / 2, h / 2, 0); }
      else { pivot.position.set(o.x, y, o.z - w / 2); mesh.position.set(0, h / 2, w / 2); }
      pivot.add(mesh);
      if (!o.glass) { const hd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.14), W.mats.doorMetal); if (o.axis === 'x') hd.position.set(w - 0.15, 1.0, 0); else hd.position.set(0, 1.0, w - 0.15); pivot.add(hd); }
      if (o.glass) { const fr = new THREE.Mesh(new THREE.BoxGeometry(o.axis === 'x' ? w : 0.1, 0.1, o.axis === 'x' ? 0.1 : w), W.mats.doorMetal); fr.position.copy(mesh.position); fr.position.y = h - 0.05; pivot.add(fr); }
      scene.add(pivot);
      d.mesh = mesh;
      const hw = w / 2;
      const dop = { door: d, surf: o.glass ? 'metal' : 'wood', see: !!o.glass || !!o.fenceGate };
      d.col = o.axis === 'x' ? addC(o.x - hw, y, o.z - 0.12, o.x + hw, y + h, o.z + 0.12, dop) : addC(o.x - 0.12, y, o.z - hw, o.x + 0.12, y + h, o.z + hw, dop);
      d.setOpen = function (v, silent) {
        if (v && d.locked) return false;
        if (d.open === v) return true;
        d.open = v; d.target = v ? 1 : 0; d.col.on = !v;
        if (!silent) K.audio.door({ x: d.x, y: d.y + 1, z: d.z });
        K.bus.emit('door', d);
        return true;
      };
      W.doors.push(d);
      if (o.open) d.setOpen(true, true);
      if (!d.auto) {
        W.interactables.push({
          id: 'door' + d.id, x: o.x, y: y + 1.0, z: o.z, r: 1.8, layer: d.layer, door: d,
          label: () => d.locked ? (d.code ? `${d.name}: Şifreli kilit — tuş takımını kullan` : (d.keyId ? `${d.name}: Kilitli (anahtar gerekli)` : `${d.name}: Kilitli`)) : (d.open ? `${d.name}: Kapat` : `${d.name}: Aç`),
          use: (actor) => {
            if (d.locked) {
              if (d.code) { K.ui.keypad(d); return; }
              if (d.keyId && K.game.hasItem(d.keyId)) { d.locked = false; K.ui.toast(`${d.name} anahtarla açıldı`, 'ok'); d.setOpen(true); K.bus.emit('unlock', d); return; }
              K.audio.ui('bad'); K.ui.toast(d.keyId ? 'Kapı kilitli. Anahtarı bulmalısın.' : 'Kapı kilitli.', 'bad');
              return;
            }
            d.setOpen(!d.open);
          },
        });
      }
      return d;
    }
    W.door = door;

    // ── Etkileşim nesneleri (dünya tabanlı)
    W.addInteract = function (it) { W.interactables.push(it); return it; };

    onProgress && onProgress(0.25, 'Yollar ve bloklar');

    // ════════ BÖLGE: Modern kent merkezi — VERTEX PLAZA (ofis, görev 01) ════════
    buildOffice(G, FG, P, door, wall, scene);
    // meydan
    G.paving.floor(-58, -38, 58, -10, 0.05, 3);
    M.props.fountain(P, 0, 0.05, -24); addC(-4.3, 0, -28.3, 4.3, 0.65, -19.7, { nav: true });
    for (let i = 0; i < 6; i++) { M.props.bench(P, -40 + i * 16, 0.05, -14, Math.PI); M.props.tree(P, -48 + i * 19, 0.05, -34, 0.9); addC(-48 + i * 19 - 0.3, 0, -34.3, -48 + i * 19 + 0.3, 3, -33.7); }
    W.poi.plaza = { x: 0, z: -22 };
    // merkez çevresi kuleler
    building(-58, -98, -36, -46, 46, 'glass');
    building(36, -98, 58, -64, 38, 'glass', { uo: 0.5 });
    building(36, -60, 58, -42, 18, 'office');
    for (const [x0, z0, x1, z1, h, s] of [[-58, -198, -22, -170, 62, 'glass'], [-16, -198, 22, -160, 40, 'office'], [28, -198, 58, -168, 54, 'glass'], [-58, -160, -30, -122, 30, 'office'], [-24, -150, 18, -122, 24, 'apt'], [26, -158, 58, -122, 34, 'glass']]) building(x0, z0, x1, z1, h, s);
    // KD blok
    for (const [x0, z0, x1, z1, h, s] of [[82, -98, 112, -64, 48, 'glass'], [118, -98, 150, -70, 30, 'office'], [156, -98, 196, -60, 58, 'glass'], [202, -98, 256, -66, 26, 'office'], [82, -56, 120, -14, 22, 'apt'], [128, -56, 170, -14, 36, 'glass'], [178, -50, 222, -14, 16, 'office'], [228, -54, 256, -14, 28, 'apt']]) building(x0, z0, x1, z1, h, s);
    // ════════ KULE PLAZA (mafya binası, görev 06) ════════
    buildTower(G, FG, P, door, wall, scene);
    for (const [x0, z0, x1, z1, h, s] of [[82, -198, 122, -168, 44, 'glass'], [82, -160, 122, -122, 26, 'office'], [178, -198, 220, -170, 50, 'glass'], [178, -160, 220, -122, 30, 'apt'], [228, -198, 256, -122, 38, 'office']]) building(x0, z0, x1, z1, h, s);

    onProgress && onProgress(0.4, 'Eski şehir');
    // ════════ ESKİ ŞEHİR (görev 02, EK-4) ════════
    {
      // çarşı sokağı
      G.paving.floor(-250, -104, -86, -96, 0.05, 2);
      W.poi.market = { x: -150, z: -100 };
      W.poi.courtyard = { x: -130, z: -152 };
      W.poi.safehouse = { x: -183, z: -145 };
      const skip = (x0, z0, x1, z1) => {
        if (z1 > -106 && z0 < -94) return true;                     // çarşı
        if (x1 > -144 && x0 < -116 && z1 > -166 && z0 < -138) return true; // avlu
        if (x1 > -194 && x0 < -172 && z1 > -154 && z0 < -136) return true; // güvenli ev
        if (x1 > -225 && x0 < -195 && z1 > -72 && z0 < -48) return true;   // arama alanı 1
        if (x1 > -128 && x0 < -108 && z1 > -194 && z0 < -170) return true; // arama alanı 2
        if (x1 > -134 && x0 < -104 && z1 > -68 && z0 < -46) return true;   // kafe
        return false;
      };
      for (let gx = -256; gx < -86; gx += 13) {
        for (let gz = -198; gz < -12; gz += 13) {
          const w = rf(8, 11), d = rf(8, 11);
          const x0 = gx + rf(0, 13 - w - 2.5), z0 = gz + rf(0, 13 - d - 2.5);
          const x1 = x0 + w, z1 = z0 + d;
          if (x1 > -82 || z1 > -11) continue;
          if (skip(x0 - 2, z0 - 2, x1 + 2, z1 + 2)) continue;
          if (rnd() < 0.08) { M.props.tree(P, (x0 + x1) / 2, 0, (z0 + z1) / 2, 0.9); addC((x0 + x1) / 2 - 0.3, 0, (z0 + z1) / 2 - 0.3, (x0 + x1) / 2 + 0.3, 3, (z0 + z1) / 2 + 0.3); continue; }
          building(x0, z0, x1, z1, Math.round(rf(2, 3.6)) * 3.3 + 0.4, rnd() < 0.5 ? 'old' : 'old2', { uo: rnd() });
        }
      }
      // çarşı tezgâhları
      for (let x = -240; x < -92; x += 7) {
        if (rnd() < 0.25) continue;
        const s = rnd() < 0.5 ? -1 : 1;
        M.props.stall(P, x, 0.05, -100 + s * 2.4, s > 0 ? Math.PI : 0, U.pick([0xb03a2a, 0x2a6ab0, 0x3a8a3a, 0xc08a2a]));
        addC(x - 1.3, 0, -100 + s * 2.4 - 0.6, x + 1.3, 0.95, -100 + s * 2.4 + 0.6, { surf: 'wood' });
      }
      // avlu
      G.paving.floor(-144, -166, -116, -138, 0.05, 2);
      M.props.well(P, -130, 0.05, -152); addC(-131, 0, -153, -129, 0.85, -151);
      M.props.tree(P, -138, 0.05, -144, 1.1); M.props.tree(P, -122, 0.05, -160, 1.0);
      // güvenli ev (girilebilir)
      buildSafehouse(G, FG, P, door, wall);
      // kafe terası (EK-4)
      G.paving.floor(-134, -68, -104, -46, 0.05, 2);
      for (let i = 0; i < 6; i++) { const tx = -128 + (i % 3) * 9, tz = -62 + Math.floor(i / 3) * 9; M.props.table(P, tx, 0.05, tz, 0, 1.0, 1.0, 0x5a3a28); M.props.chair(P, tx + 0.9, 0.05, tz, -Math.PI / 2); M.props.chair(P, tx - 0.9, 0.05, tz, Math.PI / 2); addC(tx - 0.5, 0, tz - 0.5, tx + 0.5, 0.78, tz + 0.5, { surf: 'wood', nav: true }); }
      building(-134, -46 + 0.01, -104, -40, 7, 'old', { noRoofProps: true });
      W.poi.cafe = { x: -119, z: -57 };
      // arama alanı 1: yıkık avlu
      G.dirt.floor(-225, -72, -195, -48, 0.05, 4);
      M.props.wreck(P, -210, 0.05, -60, 0.6); addC(-211, 0, -62.2, -209, 1.2, -57.8);
      for (let i = 0; i < 5; i++) M.props.barrel(P, -220 + i * 1.3, 0.05, -52, 0x6a4a2a);
      addC(-220.3, 0, -52.3, -214.5, 0.9, -51.7);
      W.poi.search1 = { x: -210, z: -60 };
      // arama alanı 2: arka sokak deposu
      G.dirt.floor(-128, -194, -108, -170, 0.05, 4);
      for (let i = 0; i < 4; i++) { M.props.pallet(P, -124 + i * 3, 0.05, -188, 0); }
      addC(-124.6, 0, -188.5, -114.4, 1.0, -187.5);
      W.poi.search2 = { x: -118, z: -182 };
    }

    onProgress && onProgress(0.5, 'Kırmızı bölge');
    // ════════ BATI — KIRMIZI BÖLGE (gecekondu, görev 07) ════════
    {
      for (let gx = -256; gx < -86; gx += 11) for (let gz = 12; gz < 100; gz += 11) {
        if (rnd() < 0.18) continue;
        const w = rf(5, 8), d = rf(5, 8);
        const x0 = gx + rf(0, 11 - w - 2.6), z0 = gz + rf(0, 11 - d - 2.6);
        if (x0 + w > -82 || z0 + d > 98) continue;
        if (x0 < -188 && x0 + w > -212 && z0 < 52 && z0 + d > 28) continue; // A meydanı
        if (x0 < -108 && x0 + w > -132 && z0 < 82 && z0 + d > 58) continue; // B meydanı
        building(x0, z0, x0 + w, z0 + d, rnd() < 0.6 ? 3.6 : 6.9, rnd() < 0.5 ? 'old2' : 'old', { noRoofProps: true, uo: rnd() });
      }
      G.dirt.floor(-212, 28, -188, 52, 0.05, 4); G.dirt.floor(-132, 58, -108, 82, 0.05, 4);
      W.poi.redA = { x: -200, z: 40 }; W.poi.redB = { x: -120, z: 70 };
      M.props.wreck(P, -196, 0.05, 36, 1.2); addC(-197.2, 0, 33.8, -194.8, 1.3, 38.2);
      M.props.sandbags(P, -205, 0.05, 46, 0); addC(-206.2, 0, 45.6, -203.8, 0.75, 46.4);
      M.props.wreck(P, -116, 0.05, 74, 2.2); addC(-118, 0, 72.8, -114, 1.3, 75.2);
    }

    onProgress && onProgress(0.58, 'Operasyon merkezi');
    // ════════ OPERASYON MERKEZİ (HQ) ════════
    buildHQ(G, FG, P, door, wall, building);

    // ════════ TESİS (görev 04) ════════
    buildFacility(G, FG, P, door, wall, building);

    // ════════ GÜNEY: konut + hastane + park ════════
    {
      building(-50, 130, -10, 170, 20, 'apt', { noRoofProps: true });
      G.concrete.floor(-44, 136, -16, 164, 20.03, 4);
      const hp = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: T.helipad, transparent: true, roughness: 0.8 }));
      hp.rotation.x = -Math.PI / 2; hp.position.set(-30, 20.06, 150); scene.add(hp);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), new THREE.MeshBasicMaterial({ map: T.sign('ŞEHİR HASTANESİ', '#b0151c', '#ffffff'), toneMapped: false }));
      sign.position.set(-30, 16.5, 170.05); scene.add(sign);
      W.poi.hospitalRoof = { x: -30, z: 150, y: 20 };
      W.poi.hospitalDoor = { x: -30, z: 173 };
      for (const [x0, z0, x1, z1, h] of [[0, 128, 26, 150, 18], [32, 128, 58, 156, 24], [0, 158, 22, 196, 15], [-58, 180, -30, 210, 21], [30, 206, 58, 248, 27], [-24, 218, 22, 248, 12]]) building(x0, z0, x1, z1, h, 'apt');
      // park
      G.grass.floor(-26, 176, 26, 212, 0.05, 6);
      for (let i = 0; i < 14; i++) { const tx = rf(-22, 22), tz = rf(180, 208); M.props.tree(P, tx, 0.05, tz, rf(0.8, 1.2)); addC(tx - 0.3, 0, tz - 0.3, tx + 0.3, 3, tz + 0.3); }
      for (let i = 0; i < 4; i++) M.props.bench(P, -18 + i * 12, 0.05, 194, 0);
    }

    onProgress && onProgress(0.66, 'Sanayi ve liman');
    // ════════ SANAYİ / DEPO (görev 03) ════════
    buildDepot(G, FG, P, door, wall, building, scene);
    // TIR garajı
    {
      const x0 = 214, z0 = 22, x1 = 256, z1 = 84, h = 9;
      G.concrete.floor(208, 12, 260, 100, 0.05, 6);
      for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]]) { P.box(0.5, h, 0.5, 0x3a3d40, 'METAL', cx, h / 2, cz); addC(cx - 0.25, 0, cz - 0.25, cx + 0.25, h, cz + 0.25, { surf: 'metal' }); }
      G.metal.box(x0, h, z0, x1, h + 0.3, z1, { us: 4, faces: 'pyny' });
      wall('z', x1, z0, z1, 0, h, 0.3, [], { gb: G.metal, surf: 'metal' });
      wall('x', z0, x0, x1, 0, h, 0.3, [], { gb: G.metal, surf: 'metal' });
      W.poi.truckGarage = { x: 235, z: 52 };
      for (let i = 0; i < 4; i++) M.props.pallet(P, 250, 0.05, 30 + i * 2, 0);
      addC(249.4, 0, 29.5, 250.6, 1.05, 36.5, { surf: 'wood' });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshBasicMaterial({ map: T.mafiaLogo, toneMapped: false }));
      sg.position.set(235, 7, 84.4); sg.rotation.y = 0; scene.add(sg);
    }
    // ════════ LİMAN ════════
    {
      G.concrete.floor(80, 120, 266, 255, 0.05, 6);
      // liman kapısı (görev 09)
      W.poi.portGate = { x: 200, z: 128 };
      // konteyner sahası
      const colors = [0xa83a2a, 0x2a5aa8, 0x3a8a4a, 0xc8a030, 0x7a7a80, 0xa86a2a, 0x2a7a8a];
      for (let row = 0; row < 6; row++) for (let col = 0; col < 5; col++) {
        const cx = 98 + col * 18, cz = 145 + row * 16;
        if (col === 2 && row === 2) continue; // açık alan
        const stack = 1 + Math.floor(rnd() * 3);
        for (let s = 0; s < stack; s++) M.props.container(P, cx, s * 2.6, cz, Math.PI / 2, colors[ri(0, colors.length - 1)]);
        if (rnd() < 0.6) for (let s = 0; s < 1 + Math.floor(rnd() * 2); s++) M.props.container(P, cx, s * 2.6, cz + 2.6, Math.PI / 2, colors[ri(0, colors.length - 1)]);
        addC(cx - 3.05, 0, cz - 1.25, cx + 3.05, stack * 2.6, cz + 3.9, { surf: 'metal' });
      }
      W.poi.containerYard = { x: 134, z: 177 };
      // rıhtım
      for (let z = 110; z < 252; z += 2.2) { P.cyl(0.18, 0.22, 0.9, 8, 0x2a2a2a, 'METAL', 264.5, 0.45, z); }
      addC(264, 0, 100, 265.2, 1.2, 254, { surf: 'metal', nav: true });
      M.props.crane(P, 240, 0, 170, -Math.PI / 2);
      for (const [cx, cz] of [[236, 165], [244, 165], [236, 175], [244, 175]]) addC(cx - 0.3, 0, cz - 0.3, cx + 0.3, 26, cz + 0.3, { surf: 'metal' });
      M.props.crane(P, 240, 0, 225, -Math.PI / 2);
      for (const [cx, cz] of [[236, 220], [244, 220], [236, 230], [244, 230]]) addC(cx - 0.3, 0, cz - 0.3, cx + 0.3, 26, cz + 0.3, { surf: 'metal' });
      for (let i = 0; i < 5; i++) M.props.forklift(P, 180 + i * 4, 0.05, 240, 0);
      addC(178.5, 0, 238.5, 197.5, 2.4, 241.5);
      // su
      const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 400), W.mats.water);
      water.rotation.x = -Math.PI / 2; water.position.set(520, -1.2, 270); scene.add(water); W.water = water;
      // gemi
      P.box(18, 7, 90, 0x2a3a4a, 'METAL', 285, 1.5, 190); P.box(16, 9, 14, 0xd8d8d8, 'METAL', 285, 9, 150);
      for (let i = 0; i < 5; i++) for (let s = 0; s < 2; s++) M.props.container(P, 285, 5 + s * 2.6, 170 + i * 12, Math.PI / 2, colors[(i + s) % colors.length]);
      addC(276, -5, 145, 294, 8, 235, { surf: 'metal', nav: false });
    }

    onProgress && onProgress(0.74, 'Dağlık bölge');
    // ════════ DAĞ ÜSSÜ + kamp (görev 08) ════════
    {
      const bx = -40, bz = -262, by = W.terrainH(bx, bz);
      W.poi.mountainBase = { x: bx, z: bz, y: by };
      const hp = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: T.helipad, transparent: true, roughness: 0.8 }));
      hp.rotation.x = -Math.PI / 2; hp.position.set(bx, by + 0.05, bz); scene.add(hp);
      W.poi.mountainLZ = { x: bx, z: bz };
      for (const [dx, dz, w, d] of [[22, -8, 10, 7], [22, 8, 8, 6], [-22, -10, 9, 9]]) {
        const x0 = bx + dx - w / 2, z0 = bz + dz - d / 2;
        FG.ind.box(x0, by, z0, x0 + w, by + 4, z0 + d, { us: 14, vs: 13.2, faces: 'pxnxpznz', y0ref: by });
        G.roof.box(x0, by + 4, z0, x0 + w, by + 4.02, z0 + d, { faces: 'py', tus: 8 });
        addC(x0, by - 2, z0, x0 + w, by + 4, z0 + d, { surf: 'metal' });
      }
      M.props.flagpole(P, bx - 10, by, bz + 12);
      // gözetleme kuleleri (Sketchfab)
      if (WA.has('watchtower')) for (const [dx, dz] of [[34, -18], [-31, 19]]) {
        const x = bx + dx, z = bz + dz, y = W.terrainH(x, z), md = WA.models.watchtower, s = 9 / md.h, hw = md.w * s / 2, hd = md.d * s / 2;
        WA.put('watchtower', x, y - 0.1, z, Math.PI / 4, s);
        for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addC(x + ox * hw * 0.62 - 0.25, y - 1, z + oz * hd * 0.62 - 0.25, x + ox * hw * 0.62 + 0.25, y + 6, z + oz * hd * 0.62 + 0.25, { surf: 'wood' });
      }
      const cx = -150, cz = -300, cy = W.terrainH(cx, cz);
      W.poi.camp = { x: cx, z: cz, y: cy };
      for (const [dx, dz, ry] of [[-6, -4, 0.3], [7, -6, -0.4], [0, 8, 1.4]]) { M.props.tent(P, cx + dx, cy, cz + dz, ry, 0x4a4e3a); addC(cx + dx - 1.6, cy - 1, cz + dz - 1.8, cx + dx + 1.6, cy + 2, cz + dz + 1.8, { surf: 'wood' }); }
      // kulübe (rehine)
      const kx = cx + 12, kz = cz + 4;
      FG.old2.box(kx - 3, cy, kz - 2.5, kx + 3, cy + 3.2, kz + 2.5, { us: 14, vs: 13.2, faces: 'pxnxnz', y0ref: cy });
      wall('x', kz + 2.5, kx - 3, kx + 3, cy, 3.2, 0.2, [[kx - 0.7, kx + 0.7, 2.1]], { fg: FG.old2, outer: 1 });
      wall('z', kx - 3, kz - 2.5, kz + 2.5, cy, 3.2, 0.2, []); wall('z', kx + 3, kz - 2.5, kz + 2.5, cy, 3.2, 0.2, []); wall('x', kz - 2.5, kx - 3, kx + 3, cy, 3.2, 0.2, []);
      G.roof.box(kx - 3.2, cy + 3.2, kz - 2.7, kx + 3.2, cy + 3.4, kz + 2.7, { tus: 4 });
      G.wood.floor(kx - 2.9, kz - 2.4, kx + 2.9, kz + 2.4, cy + 0.05, 2);
      addC(kx - 3, cy - 1, kz - 2.4, kx + 3, cy + 0.05, kz + 2.4, { nav: false });
      W.poi.cabin = { x: kx, z: kz, y: cy };
      M.props.sandbags(P, cx - 2, cy, cz - 12, 0, 3.6); addC(cx - 3.8, cy - 1, cz - 12.4, cx - 0.2, cy + 0.72, cz - 11.6);
      for (let i = 0; i < 3; i++) P.box(1.0, 1.0, 1.0, 0x6a5a3a, 'FABRIC', cx + 3 + i * 1.1, cy + 0.5, cz - 1);
      addC(cx + 2.5, cy - 1, cz - 1.5, cx + 5.8, cy + 1, cz - 0.5, { surf: 'wood' });
    }
    // çam ağaçları (dağlar)
    {
      let n = 0;
      for (let i = 0; i < 2600 && n < 520; i++) {
        const x = rf(-420, 420), z = rf(-440, 440);
        if (W.inCity(x, z)) continue;
        if (x > 255 && z > 80) continue;
        const h = W.terrainH(x, z);
        if (h < 0.5) continue;
        let near = false;
        for (const f of flats) if (Math.hypot(x - f.x, z - f.z) < f.r + 4) near = true;
        if (Math.abs(x - 0) < 7 && z < -200 && z > -265) near = true;
        if (near) continue;
        M.props.pine(P, x, h - 0.2, z, rf(0.8, 1.5));
        if (Math.hypot(x + 80, z + 270) < 140) addC(x - 0.3, h - 1, z - 0.3, x + 0.3, h + 5, z + 0.3, { surf: 'wood' });
        n++;
      }
    }
    // park edilmiş araçlar (statik)
    {
      const carCols = [0x8a8f96, 0x2a2a2e, 0xd8d8d8, 0x7a1d1d, 0x1d3a6a, 0x3a5a3a, 0xa8a090, 0x5a5a60];
      let n = 0;
      for (const [z, x0, x1] of H) for (const side of [-1, 1]) {
        for (let x = x0 + 14; x < x1 - 14; x += rf(9, 22)) {
          if (V.some((v) => Math.abs(v[0] - x) < 14)) continue;
          if (rnd() < 0.55) continue;
          const zz = z + side * (RW / 2 - 1.0);
          M.addStaticCar(P, x, zz, Math.PI / 2 * (side > 0 ? 1 : -1), rnd() < 0.15 ? 'van' : 'sedan', carCols[ri(0, carCols.length - 1)]);
          addC(x - 2.3, 0, zz - 1.0, x + 2.3, 1.6, zz + 1.0, { surf: 'metal', tag: 'car' });
          W.parking.push({ x, z: zz, ry: Math.PI / 2 * (side > 0 ? 1 : -1) });
          n++;
        }
      }
    }

    onProgress && onProgress(0.82, 'Arazi');
    // ── Arazi ağı
    {
      const S = 900, N = 180;
      const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
      const cg = new THREE.Color(0x56683a), cd = new THREE.Color(0x77674c), cr = new THREE.Color(0x7d7b76), cs = new THREE.Color(0xc8bfa8), tmp = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        let h = W.terrainH(x, z);
        if (W.inCity(x, z)) h -= 0.08;
        pos.setY(i, h);
        const slope = Math.abs(W.terrainH(x + 2, z) - W.terrainH(x - 2, z)) + Math.abs(W.terrainH(x, z + 2) - W.terrainH(x, z - 2));
        tmp.copy(cg).lerp(cd, U.clamp(slope * 0.35 + U.noise2(x * 0.05, z * 0.05) * 0.4 - 0.1, 0, 1));
        if (h > 30) tmp.lerp(cr, U.clamp((h - 30) / 20, 0, 0.8));
        if (h < 0.2 && x > 250) tmp.copy(cs);
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      const tex = T.ground.clone(); tex.needsUpdate = true; tex.repeat.set(120, 120);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 1 }));
      m.receiveShadow = true; scene.add(m); W.terrain = m;
      // dağ yolu (arazi şeridi)
      const pts = [[0, -205], [-2, -222], [-12, -238], [-26, -252], [-40, -262]];
      const gb = new GB();
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 3);
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps, t1 = (s + 1) / steps;
          const x0 = U.lerp(ax, bx, t0), z0 = U.lerp(az, bz, t0), x1 = U.lerp(ax, bx, t1), z1 = U.lerp(az, bz, t1);
          const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), nx = -dz / l * 3.5, nz = dx / l * 3.5;
          const y = (x, z) => W.terrainH(x, z) + 0.08;
          gb.quad([x0 - nx, y(x0 - nx, z0 - nz), z0 - nz], [x0 + nx, y(x0 + nx, z0 + nz), z0 + nz], [x1 + nx, y(x1 + nx, z1 + nz), z1 + nz], [x1 - nx, y(x1 - nx, z1 - nz), z1 - nz], [0, 1, 0], [0, t0 * 3], [1, t0 * 3], [1, t1 * 3], [0, t1 * 3]);
        }
      }
      const rm = gb.mesh(W.mats.dirt, false, true); rm.material = W.mats.dirt; scene.add(rm);
    }

    onProgress && onProgress(0.9, 'Birleştirme');
    // ── birleşik ağları sahneye ekle
    const mm = W.mats;
    const add = (gb, m, cast = true) => { if (gb.p.length) { const me = gb.mesh(m, cast, true); for (const c of W.chunkify(me)) scene.add(c); } };
    add(G.asphalt, mm.asphalt, false); add(G.sidewalk, mm.sidewalk, false); add(G.paving, mm.paving, false);
    add(G.concrete, mm.concrete); add(G.roof, mm.roof, false); add(G.plaster, mm.plaster); add(G.tiles, mm.tiles, false);
    add(G.carpet, mm.carpet, false); add(G.wood, mm.wood); add(G.metal, mm.metal); add(G.grass, mm.grass, false);
    add(G.dirt, mm.dirt, false); add(G.lane, mm.lane, false); add(G.laneY, mm.laneY, false); add(G.fence, mm.fence, false);
    for (const k in FG) add(FG[k], W.facadeMats[k]);
    const pm = P.mesh(M.matProp, true); for (const c of W.chunkify(pm)) scene.add(c);
    if (WA.enabled) { WA.build(scene); }
    WA.capture = false;
    // lamba parıltıları
    {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lampPts, 3));
      W.lampGlow = new THREE.Points(g, new THREE.PointsMaterial({ map: T.glow, size: 4.5, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd7a0, toneMapped: false }));
      scene.add(W.lampGlow);
      W.lampLights = [];
    }
    buildSky(scene);
    buildRain(scene);
    onProgress && onProgress(1, 'Hazır');
  };

  // ═════════════════════ GİRİLEBİLİR BİNALAR ═════════════════════
  function buildOffice(G, FG, P, door, wall, scene) {
    // Vertex Plaza: x[-30,30] z[-90,-40], zemin kat 4.2m, üst katlar dolu
    const x0 = -30, x1 = 30, z0 = -90, z1 = -40, h = 4.2, H = 30;
    const Pr = M.props;
    // dış kabuk (zemin kat duvarları açıklıklı)
    wall('x', z1, x0, x1, 0, h, 0.3, [[-2.2, 2.2, 3.0]], { fg: FG.glass, outer: 1 });
    wall('x', z0, x0, x1, 0, h, 0.3, [[20.2, 21.8, 2.25]], { fg: FG.glass, outer: -1 });
    wall('z', x0, z0, z1, 0, h, 0.3, [], { fg: FG.glass, outer: -1 });
    wall('z', x1, z0, z1, 0, h, 0.3, [], { fg: FG.glass, outer: 1 });
    // üst katlar
    FG.glass.box(x0, h, z0, x1, H, z1, { us: 14, vs: 13.2, faces: 'pxnxpznz', y0ref: 0 });
    G.roof.box(x0, H, z0, x1, H + 0.02, z1, { faces: 'py', tus: 8 });
    G.plaster.box(x0, h - 0.02, z0, x1, h, z1, { faces: 'ny', tus: 3 });
    W.addC(x0, h, z0, x1, H, z1);
    G.concrete.box(x0 - 0.2, h, z1, x1 + 0.2, h + 0.5, z1 + 1.5, { us: 4 }); // saçak
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.6), new THREE.MeshBasicMaterial({ map: K.tex.sign('VERTEX PLAZA', '#0e1824', '#d4874a'), toneMapped: false }));
    sign.position.set(0, h + 0.25, z1 + 1.52); scene.add(sign);
    // zeminler
    G.tiles.floor(-12, -53, 12, -40, 0.03, 3);    // lobi
    G.tiles.floor(x0, -58, x1, -53, 0.03, 3);     // koridor
    G.carpet.floor(x0, z0, 0, -58, 0.03, 4);      // açık ofis
    G.wood.floor(0, -74, 14, -58, 0.03, 3);       // müdür
    G.tiles.floor(14, -74, x1, -58, 0.03, 3);     // arşiv
    G.tiles.floor(0, z0, x1, -74, 0.03, 3);       // sunucu
    G.tiles.floor(x0, -53, -12, -40, 0.03, 3);    // dinlenme
    G.carpet.floor(12, -53, x1, -40, 0.03, 4);    // İK / sekreter
    // iç duvarlar
    wall('x', -53, x0, x1, 0, h, 0.2, [[-1.2, 1.2, 2.3], [-21.6, -20, 2.25], [20, 21.6, 2.25]]);
    wall('z', -12, -53, -40, 0, h, 0.2, []);
    wall('z', 12, -53, -40, 0, h, 0.2, []);
    wall('x', -58, x0, x1, 0, h, 0.2, [[-16, -13, 2.3], [6, 7.6, 2.25], [21, 22.6, 2.25]]);
    wall('z', 0, z0, -58, 0, h, 0.2, []);
    wall('z', 14, -74, -58, 0, h, 0.2, []);
    wall('x', -74, 0, x1, 0, h, 0.2, [[24, 25.6, 2.25]]);
    // kapılar
    const D = {};
    D.front = door({ x: 0, z: z1, axis: 'x', w: 4.2, h: 2.9, glass: true, auto: true, name: 'Giriş' });
    D.turnstile = door({ x: 0, z: -53, axis: 'x', w: 2.4, h: 2.2, glass: true, locked: true, name: 'Turnike kapısı' });
    D.breakroom = door({ x: -20.8, z: -53, axis: 'x', name: 'Dinlenme odası' });
    D.hr = door({ x: 20.8, z: -53, axis: 'x', name: 'Sekreterlik' });
    D.openOffice = door({ x: -14.5, z: -58, axis: 'x', w: 3, glass: true, auto: true, name: 'Açık ofis' });
    D.manager = door({ x: 6.8, z: -58, axis: 'x', locked: true, key: 'key_manager', name: 'Müdür odası' });
    D.archive = door({ x: 21.8, z: -58, axis: 'x', locked: true, code: '0000', metal: true, name: 'Arşiv (yetkili personel)' });
    D.server = door({ x: 24.8, z: -74, axis: 'x', metal: true, name: 'Sunucu odası' });
    D.emergency = door({ x: 21, z: z0, axis: 'x', metal: true, name: 'Acil çıkış' });
    W.officeDoors = D;
    // mobilya: lobi
    Pr.counter(P, 0, 0.03, -47, Math.PI, 4); W.addC(-2.05, 0, -47.45, 2.05, 1.15, -46.55, { surf: 'wood' });
    Pr.turnstile(P, 0, 0.03, -53.6, 0);
    Pr.sofa(P, -8, 0.03, -42.5, Math.PI); W.addC(-9, 0, -43, -7, 0.9, -42, { surf: 'wood' });
    Pr.sofa(P, 8, 0.03, -42.5, Math.PI); W.addC(7, 0, -43, 9, 0.9, -42, { surf: 'wood' });
    Pr.plant(P, -11, 0.03, -41); Pr.plant(P, 11, 0.03, -41); Pr.plant(P, -11, 0.03, -52); Pr.plant(P, 11, 0.03, -52);
    // açık ofis masaları
    W.officeDesks = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const dx = -26 + c * 6.5, dz = -86 + r * 6.5;
      Pr.desk(P, dx, 0.03, dz, 0); Pr.monitor(P, dx - 0.2, 0.8, dz - 0.15, 0); Pr.chair(P, dx, 0.03, dz + 0.8, Math.PI);
      W.addC(dx - 0.8, 0, dz - 0.4, dx + 0.8, 0.78, dz + 0.4, { surf: 'wood' });
      W.officeDesks.push({ x: dx, z: dz });
    }
    Pr.whiteboard(P, -15, 0.03, -89.7, 0); Pr.copier(P, -2, 0.03, -86, -Math.PI / 2); W.addC(-2.3, 0, -86.4, -1.7, 1.1, -85.6);
    for (let i = 0; i < 4; i++) { Pr.cabinet(P, -29.4, 0.03, -80 + i * 1.2, Math.PI / 2); }
    W.addC(-29.7, 0, -80.6, -29.1, 1.4, -75.4);
    // müdür odası
    Pr.desk(P, 7, 0.03, -68, 0); Pr.monitor(P, 6.8, 0.8, -68.2, 0); Pr.chair(P, 7, 0.03, -69, 0);
    W.addC(6.2, 0, -68.4, 7.8, 0.78, -67.6, { surf: 'wood' });
    Pr.sofa(P, 7, 0.03, -59.5, Math.PI); W.addC(6, 0, -60, 8, 0.9, -59, { surf: 'wood' });
    Pr.shelf(P, 1, 0.03, -66, Math.PI / 2, 3, 2.2, 0.5); W.addC(0.7, 0, -67.5, 1.3, 2.2, -64.5);
    Pr.plant(P, 13, 0.03, -73);
    // arşiv
    for (let r = 0; r < 3; r++) { Pr.shelf(P, 22, 0.03, -71 + r * 3.2, 0, 10, 2.4, 0.7); W.addC(17, 0, -71.35 + r * 3.2, 27, 2.4, -70.65 + r * 3.2, { surf: 'metal' }); }
    Pr.cabinet(P, 29.4, 0.03, -60, -Math.PI / 2); Pr.cabinet(P, 29.4, 0.03, -61, -Math.PI / 2);
    W.addC(29.1, 0, -61.5, 29.7, 1.4, -59.5, { surf: 'metal' });
    Pr.copier(P, 15, 0.03, -60, Math.PI / 2); W.addC(14.7, 0, -60.4, 15.3, 1.1, -59.6);
    // sunucu
    for (let i = 0; i < 6; i++) { Pr.server(P, 4 + i * 2.2, 0.03, -86, 0); }
    W.addC(3.65, 0, -86.45, 15.35, 2.0, -85.55, { surf: 'metal' });
    // dinlenme odası
    Pr.table(P, -21, 0.03, -47, 0, 2.4, 1.1); W.addC(-22.2, 0, -47.55, -19.8, 0.78, -46.45, { surf: 'wood' });
    Pr.vending(P, -29, 0.03, -44, Math.PI / 2); W.addC(-29.4, 0, -44.45, -28.6, 1.9, -43.55);
    Pr.sofa(P, -15, 0.03, -41.5, Math.PI); W.addC(-16, 0, -42, -14, 0.9, -41, { surf: 'wood' });
    // sekreterlik
    Pr.desk(P, 21, 0.03, -46, Math.PI); Pr.monitor(P, 21.2, 0.8, -45.8, Math.PI); Pr.chair(P, 21, 0.03, -46.9, 0);
    W.addC(20.2, 0, -46.4, 21.8, 0.78, -45.6, { surf: 'wood' });
    Pr.cabinet(P, 29.4, 0.03, -48, -Math.PI / 2); Pr.plant(P, 13, 0.03, -41);
    // tavan lambaları (emissive şeritler)
    const LP = new M.Parts();
    for (let x = -26; x <= 26; x += 6.5) for (let z = -86; z <= -44; z += 6.5) LP.box(1.2, 0.04, 0.3, 0xfff6e8, 'FLAT', x, h - 0.05, z);
    const lm = new THREE.Mesh(LP.build(), M.matLight); scene.add(lm);
    W.poi.officeLobby = { x: 0, z: -46 }; W.poi.officeExit = { x: 0, z: -30 };
    W.poi.archive = { x: 22, z: -66 }; W.poi.managerOffice = { x: 7, z: -66 };
    W.zones.officeRestricted = { x0: 14, z0: -74, x1: 30, z1: -58 };
    W.zones.officeInside = { x0: -30, z0: -90, x1: 30, z1: -40 };
    W.zones.officeSecure = { x0: -30, z0: -90, x1: 30, z1: -53 };
  }

  function buildTower(G, FG, P, door, wall, scene) {
    // Kule Plaza: x[130,170] z[-180,-140]; katlar 0, 4.5, 9, 13.5; üstü dolu
    const x0 = 130, x1 = 170, z0 = -180, z1 = -140, FH = 4.5, NF = 4, H = 52, Pr = M.props;
    const topY = NF * FH;
    for (let f = 0; f < NF; f++) {
      const y = f * FH;
      const frontOpen = f === 0 ? [[147.8, 152.2, 2.8]] : [];
      wall('x', z1, x0, x1, y, FH, 0.3, frontOpen, { fg: FG.glass, outer: 1 });
      wall('x', z0, x0, x1, y, FH, 0.3, [], { fg: FG.glass, outer: -1 });
      wall('z', x0, z0, z1, y, FH, 0.3, [], { fg: FG.glass, outer: -1 });
      wall('z', x1, z0, z1, y, FH, 0.3, [], { fg: FG.glass, outer: 1 });
      // döşeme (alt kat tavanı)
      if (f > 0) { G.plaster.box(x0, y - 0.3, z0, x1, y, z1, { faces: 'ny', tus: 3 }); W.addC(x0, y - 0.3, z0, x1, y, z1); }
      const fm = f === 0 ? G.tiles : f === 3 ? G.wood : G.carpet;
      fm.floor(x0, z0, x1, z1, y + 0.03, f === 3 ? 3 : 4);
      // asansör çekirdeği
      wall('x', -159, 147, 153, y, FH, 0.25, [[149, 151, 2.4]]);
      wall('x', -165, 147, 153, y, FH, 0.25, []);
      wall('z', 147, -165, -159, y, FH, 0.25, []); wall('z', 153, -165, -159, y, FH, 0.25, []);
      P.box(2.0, 2.4, 0.06, 0xa8b0b8, 'METAL', 150, y + 1.2, -158.85);
      P.box(0.2, 0.3, 0.05, 0xd4874a, 'FLAT', 151.4, y + 1.3, -158.8);
      W.floors['tower' + f] = { y, x0, z0, x1, z1 };
      // merdiven kapısı
      P.box(1.4, 2.2, 0.08, 0x6a6e72, 'METAL', 162, y + 1.1, -158.9);
      wall('x', -159, 160, 165, y, FH, 0.2, [[161.3, 162.7, 2.2]]); wall('z', 160, -165, -159, y, FH, 0.2, []); wall('z', 165, -165, -159, y, FH, 0.2, []); wall('x', -165, 160, 165, y, FH, 0.2, []);
    }
    FG.glass.box(x0, topY, z0, x1, H, z1, { us: 14, vs: 13.2, faces: 'pxnxpznz', y0ref: 0 });
    G.plaster.box(x0, topY - 0.3, z0, x1, topY, z1, { faces: 'ny', tus: 3 });
    G.roof.box(x0, H, z0, x1, H + 0.02, z1, { faces: 'py', tus: 8 });
    W.addC(x0, topY - 0.3, z0, x1, H, z1);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 2), new THREE.MeshBasicMaterial({ map: K.tex.sign('KULE PLAZA', '#120c0e', '#d9b46a'), toneMapped: false }));
    sign.position.set(150, 3.6, z1 + 0.2); scene.add(sign);
    door({ x: 150, z: z1, axis: 'x', w: 4.4, h: 2.8, glass: true, auto: true, name: 'Kule girişi' });
    // ── Lobi (kat 0)
    Pr.counter(P, 150, 0.03, -150, Math.PI, 5); W.addC(147.45, 0, -150.45, 152.55, 1.15, -149.55, { surf: 'wood' });
    for (const sx of [136, 164]) { Pr.sofa(P, sx, 0.03, -146, Math.PI / 2 * (sx < 150 ? 1 : -1)); W.addC(sx - 0.5, 0, -147, sx + 0.5, 0.9, -145, { surf: 'wood' }); }
    Pr.plant(P, 132, 0.03, -142); Pr.plant(P, 168, 0.03, -142); Pr.plant(P, 132, 0.03, -178); Pr.plant(P, 168, 0.03, -178);
    // ── Kat 1: muhasebe
    const y1 = FH;
    wall('x', -168, x0, x1, y1, FH, 0.2, [[138, 139.6, 2.25]]);
    door({ x: 138.8, z: -168, axis: 'x', y: y1, name: 'Muhasebe', layer: 2 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const dx = 136 + c * 8 + (c > 1 ? 4 : 0), dz = -150 + r * 6;
      if (dx > 144 && dx < 156) continue;
      Pr.desk(P, dx, y1, dz, Math.PI); Pr.monitor(P, dx + 0.2, y1 + 0.78, dz + 0.15, Math.PI); Pr.chair(P, dx, y1, dz - 0.8, 0);
      W.addC(dx - 0.8, y1, dz - 0.4, dx + 0.8, y1 + 0.78, dz + 0.4, { surf: 'wood' });
    }
    for (let i = 0; i < 6; i++) Pr.cabinet(P, 131, y1, -177 + i * 1.1, Math.PI / 2);
    W.addC(130.7, y1, -177.6, 131.3, y1 + 1.4, -171.4, { surf: 'metal' });
    Pr.desk(P, 142, y1, -172, 0); Pr.chair(P, 142, y1, -173, 0); W.addC(141.2, y1, -172.4, 142.8, y1 + 0.78, -171.6, { surf: 'wood' });
    Pr.shelf(P, 158, y1, -176, 0, 6, 2.2, 0.6); W.addC(155, y1, -176.3, 161, y1 + 2.2, -175.7);
    // ── Kat 2: güvenlik
    const y2 = FH * 2;
    wall('x', -168, x0, x1, y2, FH, 0.2, [[156.2, 157.8, 2.25]]);
    door({ x: 157, z: -168, axis: 'x', y: y2, metal: true, name: 'Güvenlik odası', layer: 3 });
    for (let i = 0; i < 5; i++) { Pr.desk(P, 156 + i * 2.6, y2, -176, 0); Pr.monitor(P, 155.6 + i * 2.6, y2 + 0.78, -176.2, 0); Pr.monitor(P, 156.4 + i * 2.6, y2 + 0.78, -176.2, 0); }
    W.addC(155, y2, -176.4, 167.6, y2 + 0.78, -175.6, { surf: 'wood' });
    for (let i = 0; i < 3; i++) { Pr.bunk(P, 135 + i * 3, y2, -174, 0); }
    W.addC(134.5, y2, -175, 141.5, y2 + 0.7, -173, { surf: 'wood' });
    for (let i = 0; i < 4; i++) Pr.cabinet(P, 132 + i * 0.6, y2, -150, 0, 0x4a5058);
    W.addC(131.7, y2, -150.3, 134.4, y2 + 1.4, -149.7, { surf: 'metal' });
    // ── Kat 3: yönetim
    const y3 = FH * 3;
    wall('x', -168, x0, x1, y3, FH, 0.2, [[149.2, 150.8, 2.25]]);
    door({ x: 150, z: -168, axis: 'x', y: y3, name: 'Yönetim ofisi', layer: 4 });
    Pr.desk(P, 150, y3, -174, 0); Pr.desk(P, 151.6, y3, -174, 0); Pr.chair(P, 150.8, y3, -175, 0);
    W.addC(149.2, y3, -174.4, 152.4, y3 + 0.78, -173.6, { surf: 'wood' });
    Pr.sofa(P, 138, y3, -170, Math.PI / 2, 0x2a1a1a); Pr.sofa(P, 162, y3, -170, -Math.PI / 2, 0x2a1a1a);
    W.addC(137.5, y3, -171, 138.5, y3 + 0.9, -169, { surf: 'wood' }); W.addC(161.5, y3, -171, 162.5, y3 + 0.9, -169, { surf: 'wood' });
    Pr.table(P, 150, y3, -150, 0, 6, 2, 0x3a2418); W.addC(147, y3, -151, 153, y3 + 0.78, -149, { surf: 'wood' });
    for (let i = 0; i < 5; i++) { Pr.chair(P, 147.6 + i * 1.2, y3, -151.4, 0); Pr.chair(P, 147.6 + i * 1.2, y3, -148.6, Math.PI); }
    Pr.shelf(P, 131, y3, -175, Math.PI / 2, 4, 2.2, 0.5); W.addC(130.7, y3, -177, 131.3, y3 + 2.2, -173);
    for (const px of [133, 167]) Pr.plant(P, px, y3, -178);
    // tavan lambaları
    const LP = new M.Parts();
    for (let f = 0; f < NF; f++) for (let x = 134; x <= 166; x += 8) for (let z = -176; z <= -144; z += 8) LP.box(1.2, 0.04, 0.3, 0xfff6e8, 'FLAT', x, f * FH + FH - 0.32, z);
    scene.add(new THREE.Mesh(LP.build(), M.matLight));
    // asansör & merdiven etkileşimleri
    for (let f = 0; f < NF; f++) {
      const y = f * FH;
      W.addInteract({ id: 'elev' + f, x: 150, y: y + 1.1, z: -158.4, r: 1.8, layer: f === 0 ? 0 : f + 1, label: () => 'Asansör: kat seç', use: () => K.game.elevatorMenu(f) });
      W.addInteract({ id: 'stair' + f, x: 162, y: y + 1.1, z: -158.4, r: 1.6, layer: f === 0 ? 0 : f + 1, label: () => 'Merdiven: ' + (f < NF - 1 ? 'üst kata çık' : 'alt kata in'), use: () => K.game.changeFloor(f < NF - 1 ? f + 1 : f - 1) });
    }
    W.poi.towerFront = { x: 150, z: -134 };
    W.poi.towerLobby = { x: 150, z: -144 };
    W.poi.towerElev = { x: 150, z: -157.5 };
    // kat nav katmanları: 0 = zemin dünya, 2..4 = kule katları 1..3
    for (let f = 1; f < NF; f++) W.navLayers.push({ id: f + 1, y: f * FH, x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + 1, name: 'tower' + f });
  }

  function buildSafehouse(G, FG, P, door, wall) {
    // eski şehir güvenli evi: x[-192,-174] z[-152,-138]
    const x0 = -192, x1 = -174, z0 = -152, z1 = -138, h = 3.6;
    wall('x', z1, x0, x1, 0, h, 0.3, [[-184.8, -183.2, 2.2]], { fg: FG.old, outer: 1 });
    wall('x', z0, x0, x1, 0, h, 0.3, [], { fg: FG.old, outer: -1 });
    wall('z', x0, z0, z1, 0, h, 0.3, [], { fg: FG.old, outer: -1 });
    wall('z', x1, z0, z1, 0, h, 0.3, [[-149, -147.4, 2.2]], { fg: FG.old, outer: 1 });
    wall('z', -183, z0, z1, 0, h, 0.2, [[-146, -144.4, 2.2]]);
    FG.old.box(x0, h, z0, x1, h + 3.3, z1, { us: 14, vs: 13.2, faces: 'pxnxpznz', y0ref: 0 });
    G.roof.box(x0, h + 3.3, z0, x1, h + 3.32, z1, { faces: 'py', tus: 8 });
    G.plaster.box(x0, h - 0.02, z0, x1, h, z1, { faces: 'ny', tus: 3 });
    W.addC(x0, h, z0, x1, h + 3.3, z1);
    G.wood.floor(x0, z0, x1, z1, 0.03, 2);
    door({ x: -184, z: z1, axis: 'x', name: 'Ev kapısı' });
    door({ x: -183, z: -145.2, axis: 'z', name: 'Arka oda' });
    door({ x: x1, z: -148.2, axis: 'z', name: 'Yan kapı', locked: true });
    M.props.table(P, -179, 0.03, -142, 0, 1.6, 0.9); W.addC(-179.8, 0, -142.45, -178.2, 0.78, -141.55, { surf: 'wood' });
    M.props.bunk(P, -190, 0.03, -148, 0); W.addC(-190.5, 0, -149, -189.5, 0.7, -147, { surf: 'wood' });
    M.props.cabinet(P, -186, 0.03, -151.4, 0, 0x6a5a48);
    W.poi.safehouseBack = { x: -188, z: -146 };
  }

  function buildDepot(G, FG, P, door, wall, building, scene) {
    // Sanayi deposu: avlu x[100,170] z[22,95], hangar x[110,160] z[30,80]
    const Pr = M.props;
    G.concrete.floor(100, 22, 170, 95, 0.05, 6);
    // çit + ana kapı + kesilebilir çit
    const fh = 2.6;
    const fenceSeg = (axis, c, a, b) => {
      for (let t = a; t < b - 0.01; t += 3) {
        const e = Math.min(b, t + 3);
        if (axis === 'x') { G.fence.box(t, 0, c, e, fh, c, { us: 3, vs: 3, faces: 'pz' }); P.cyl(0.05, 0.05, fh, 6, 0x777777, 'METAL', t, fh / 2, c); }
        else { G.fence.box(c, 0, t, c, fh, e, { us: 3, vs: 3, faces: 'px' }); P.cyl(0.05, 0.05, fh, 6, 0x777777, 'METAL', c, fh / 2, t); }
      }
      if (axis === 'x') W.addC(a, 0, c - 0.1, b, fh, c + 0.1, { surf: 'metal', see: true }); else W.addC(c - 0.1, 0, a, c + 0.1, fh, b, { surf: 'metal', see: true });
    };
    fenceSeg('x', 22, 100, 170); fenceSeg('x', 95, 100, 130); fenceSeg('x', 95, 138, 170);
    fenceSeg('z', 100, 22, 95); fenceSeg('z', 170, 22, 59.5); fenceSeg('z', 170, 62.5, 95);
    // kesilebilir çit parçası
    const cutMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, fh), W.mats.fence);
    cutMesh.rotation.y = Math.PI / 2; cutMesh.position.set(170, fh / 2, 61); scene.add(cutMesh);
    const cutC = W.addC(169.9, 0, 59.5, 170.1, fh, 62.5, { surf: 'metal', see: true, door: { locked: true, fence: true } });
    W.depotFence = { mesh: cutMesh, col: cutC, cut: false };
    // ana kapı (sürgülü)
    W.depotGate = door({ x: 134, z: 95, axis: 'x', w: 8, h: 2.6, metal: true, locked: true, fenceGate: true, name: 'Depo ana kapısı' });
    // hangar
    const x0 = 110, x1 = 160, z0 = 30, z1 = 80, h = 10;
    wall('x', z1, x0, x1, 0, h, 0.3, [[128, 136, 5.5]], { fg: FG.ind, outer: 1, surf: 'metal', gb: G.metal });
    wall('x', z0, x0, x1, 0, h, 0.3, [], { fg: FG.ind, outer: -1, surf: 'metal', gb: G.metal });
    wall('z', x0, z0, z1, 0, h, 0.3, [[50, 51.6, 2.25]], { fg: FG.ind, outer: -1, surf: 'metal', gb: G.metal });
    wall('z', x1, z0, z1, 0, h, 0.3, [], { fg: FG.ind, outer: 1, surf: 'metal', gb: G.metal });
    G.metal.box(x0, h, z0, x1, h + 0.3, z1, { us: 4, faces: 'pyny' });
    W.addC(x0, h, z0, x1, h + 0.3, z1, { surf: 'metal' });
    G.concrete.floor(x0, z0, x1, z1, 0.06, 4);
    W.depotRoll = door({ x: 132, z: z1, axis: 'x', w: 8, h: 5.5, metal: true, locked: true, name: 'Yükleme kapısı' });
    door({ x: x0, z: 50.8, axis: 'z', metal: true, name: 'Personel kapısı' });
    // raflar
    for (let r = 0; r < 4; r++) for (let s = 0; s < 2; s++) {
      const sx = 118 + r * 7, sz = 46 + s * 16;
      Pr.shelf(P, sx, 0.06, sz, Math.PI / 2, 12, 4.5, 1.2);
      W.addC(sx - 0.65, 0, sz - 6, sx + 0.65, 4.5, sz + 6, { surf: 'metal' });
    }
    for (let i = 0; i < 8; i++) Pr.pallet(P, 150 + (i % 2) * 2, 0.06, 56 + Math.floor(i / 2) * 2.4, 0);
    W.addC(149.4, 0, 55.5, 152.6, 1.1, 64.6, { surf: 'wood' });
    Pr.forklift(P, 140, 0.06, 70, 0.4); W.addC(139, 0, 68.6, 141, 2.4, 71.4, { surf: 'metal' });
    // ofis kabini (KD köşe)
    const ox0 = 146, ox1 = 159.7, oz0 = 30.3, oz1 = 42;
    wall('x', oz1, ox0, ox1, 0, 3, 0.2, [[150, 151.6, 2.2]], { gb: G.plaster });
    wall('z', ox0, oz0, oz1, 0, 3, 0.2, [], { gb: G.plaster });
    G.plaster.box(ox0, 3, oz0, ox1, 3.15, oz1, { tus: 3 }); W.addC(ox0, 3, oz0, ox1, 3.15, oz1);
    door({ x: 150.8, z: oz1, axis: 'x', name: 'Depo ofisi' });
    Pr.desk(P, 154, 0.06, 36, 0); Pr.chair(P, 154, 0.06, 35.2, 0); W.addC(153.2, 0, 35.6, 154.8, 0.78, 36.4, { surf: 'wood' });
    Pr.cabinet(P, 158.9, 0.06, 33, -Math.PI / 2); Pr.cabinet(P, 158.9, 0.06, 34, -Math.PI / 2); W.addC(158.6, 0, 32.5, 159.2, 1.4, 34.5, { surf: 'metal' });
    Pr.whiteboard(P, 152, 0.06, 30.6, 0);
    // tavan lambaları
    const LP = new M.Parts();
    for (let x = 116; x <= 156; x += 8) for (let z = 36; z <= 76; z += 10) LP.box(0.4, 0.1, 2.4, 0xfff1d8, 'FLAT', x, h - 0.2, z);
    scene.add(new THREE.Mesh(LP.build(), M.matLight));
    // avluda kamyonlar/konteynerler
    Pr.container(P, 106, 0.05, 60, 0, 0x7a7a80); W.addC(104.75, 0, 56.95, 107.25, 2.6, 63.05, { surf: 'metal' });
    Pr.container(P, 165, 0.05, 30, 0, 0xa83a2a); W.addC(163.75, 0, 26.95, 166.25, 2.6, 33.05, { surf: 'metal' });
    for (let i = 0; i < 6; i++) Pr.barrel(P, 104 + (i % 3) * 0.7, 0.05, 86 + Math.floor(i / 3) * 0.7, 0x2a5a8a);
    W.addC(103.6, 0, 85.6, 105.8, 0.9, 87.4, { surf: 'metal' });
    W.poi.depotGate = { x: 134, z: 100 }; W.poi.depotFence = { x: 172.5, z: 61 }; W.poi.depotInside = { x: 135, z: 55 };
    W.poi.depotOffice = { x: 153, z: 36 }; W.poi.depotPersonnel = { x: 107, z: 50.8 };
    W.zones.depotHall = { x0: 110, z0: 30, x1: 160, z1: 80 };
    W.zones.depotYard = { x0: 100, z0: 22, x1: 170, z1: 95 };
  }

  function buildFacility(G, FG, P, door, wall, building) {
    const Pr = M.props;
    G.concrete.floor(-56, 14, 56, 98, 0.05, 6);
    const fh = 2.8;
    const segs = [['x', 14, -56, 56], ['x', 98, -56, -4], ['x', 98, 4, 56], ['z', -56, 14, 40], ['z', -56, 46, 98], ['z', 56, 14, 60], ['z', 56, 66, 98]];
    for (const [axis, c, a, b] of segs) {
      for (let t = a; t < b - 0.01; t += 3) {
        const e = Math.min(b, t + 3);
        if (axis === 'x') { G.fence.box(t, 0, c, e, fh, c, { us: 3, vs: 3, faces: 'pz' }); P.cyl(0.05, 0.05, fh, 6, 0x777777, 'METAL', t, fh / 2, c); }
        else { G.fence.box(c, 0, t, c, fh, e, { us: 3, vs: 3, faces: 'px' }); P.cyl(0.05, 0.05, fh, 6, 0x777777, 'METAL', c, fh / 2, t); }
      }
      if (axis === 'x') W.addC(a, 0, c - 0.1, b, fh, c + 0.1, { surf: 'metal', see: true }); else W.addC(c - 0.1, 0, a, c + 0.1, fh, b, { surf: 'metal', see: true });
    }
    // kontrol binası (A bölgesi)
    const x0 = -32, x1 = -6, z0 = 26, z1 = 48, h = 4;
    wall('x', z1, x0, x1, 0, h, 0.3, [[-20, -17.6, 2.3]], { fg: FG.office, outer: 1 });
    wall('x', z0, x0, x1, 0, h, 0.3, [], { fg: FG.office, outer: -1 });
    wall('z', x0, z0, z1, 0, h, 0.3, [], { fg: FG.office, outer: -1 });
    wall('z', x1, z0, z1, 0, h, 0.3, [[36, 37.6, 2.25]], { fg: FG.office, outer: 1 });
    G.roof.box(x0, h, z0, x1, h + 0.25, z1, { tus: 8 }); G.plaster.box(x0, h - 0.02, z0, x1, h, z1, { faces: 'ny', tus: 3 });
    W.addC(x0, h, z0, x1, h + 0.25, z1);
    G.tiles.floor(x0, z0, x1, z1, 0.06, 3);
    door({ x: -18.8, z: z1, axis: 'x', w: 2.4, metal: true, name: 'Kontrol binası', open: true });
    door({ x: x1, z: 36.8, axis: 'z', metal: true, name: 'Yan kapı' });
    for (let i = 0; i < 5; i++) { Pr.desk(P, -28 + i * 4.5, 0.06, 28.5, 0); Pr.monitor(P, -28.2 + i * 4.5, 0.84, 28.3, 0); Pr.monitor(P, -27.4 + i * 4.5, 0.84, 28.3, 0); }
    W.addC(-28.8, 0, 28.1, -9.2, 0.8, 28.9, { surf: 'wood' });
    for (let i = 0; i < 3; i++) Pr.server(P, -30.6, 0.06, 33 + i * 1.2, Math.PI / 2);
    W.addC(-31.05, 0, 32.4, -30.15, 2, 36, { surf: 'metal' });
    // jeneratör bahçesi (B bölgesi)
    Pr.generator(P, 22, 0.05, 62, 0); W.addC(20.4, 0, 61, 23.6, 2.2, 63, { surf: 'metal' });
    Pr.generator(P, 32, 0.05, 62, 0); W.addC(30.4, 0, 61, 33.6, 2.2, 63, { surf: 'metal' });
    Pr.transformer(P, 22, 0.05, 76, 0); W.addC(20.9, 0, 75.2, 23.1, 2.6, 76.8, { surf: 'metal' });
    Pr.transformer(P, 32, 0.05, 76, 0); W.addC(30.9, 0, 75.2, 33.1, 2.6, 76.8, { surf: 'metal' });
    // depo tankı
    P.cyl(4, 4, 7, 16, 0xb8bcc0, 'METAL', 30, 3.5, 30); W.addC(26.5, 0, 26.5, 33.5, 7, 33.5, { surf: 'metal' });
    Pr.sandbags(P, -19, 0.05, 54, 0, 4.8); W.addC(-21.4, 0, 53.6, -16.6, 0.72, 54.4);
    Pr.sandbags(P, 18, 0.05, 54, 0, 3.6); W.addC(16.2, 0, 53.6, 19.8, 0.72, 54.4);
    for (let i = 0; i < 3; i++) { Pr.barrier(P, -2 + i * 2.1, 0.05, 90, 0); }
    W.addC(-3, 0, 89.7, 3.2, 0.8, 90.3);
    W.poi.facilityControl = { x: -19, z: 37 }; W.poi.facilityGen = { x: 27, z: 69 }; W.poi.facilityGate = { x: 0, z: 104 };
    W.zones.facility = { x0: -56, z0: 14, x1: 56, z1: 98 };
  }

  function buildHQ(G, FG, P, door, wall, building) {
    const Pr = M.props, scene = W.scene;
    G.concrete.floor(-258, 122, -82, 255, 0.05, 6);
    // çit
    const fh = 3;
    for (const [axis, c, a, b] of [['x', 122, -258, -154], ['x', 122, -146, -82], ['x', 255, -258, -82], ['z', -258, 122, 255], ['z', -82, 122, 255]]) {
      for (let t = a; t < b - 0.01; t += 3) {
        const e = Math.min(b, t + 3);
        if (axis === 'x') { G.fence.box(t, 0, c, e, fh, c, { us: 3, vs: 3, faces: 'pz' }); P.cyl(0.06, 0.06, fh, 6, 0x777777, 'METAL', t, fh / 2, c); }
        else { G.fence.box(c, 0, t, c, fh, e, { us: 3, vs: 3, faces: 'px' }); P.cyl(0.06, 0.06, fh, 6, 0x777777, 'METAL', c, fh / 2, t); }
      }
      if (axis === 'x') W.addC(a, 0, c - 0.1, b, fh, c + 0.1, { surf: 'metal', see: true }); else W.addC(c - 0.1, 0, a, c + 0.1, fh, b, { surf: 'metal', see: true });
    }
    // giriş kulübesi
    building(-162, 124, -156, 130, 3.4, 'office', { noRoofProps: true });
    P.box(8, 0.2, 0.2, 0xd8d8d8, 'FLAT', -150, 1.1, 122.6); P.box(1, 0.2, 0.22, 0xc82020, 'FLAT', -152, 1.1, 122.6);
    // hangar (açık önlü)
    const hx0 = -252, hx1 = -212, hz0 = 150, hz1 = 196, hh = 12;
    wall('x', hz0, hx0, hx1, 0, hh, 0.4, [], { fg: FG.ind, outer: -1, gb: G.metal, surf: 'metal' });
    wall('z', hx0, hz0, hz1, 0, hh, 0.4, [], { fg: FG.ind, outer: -1, gb: G.metal, surf: 'metal' });
    wall('x', hz1, hx0, hx1, 0, hh, 0.4, [[hx0 + 4, hx1 - 2, 9]], { fg: FG.ind, outer: 1, gb: G.metal, surf: 'metal' });
    wall('z', hx1, hz0, hz1, 0, hh, 0.4, [[hz0 + 3, hz1 - 3, 10]], { fg: FG.ind, outer: 1, gb: G.metal, surf: 'metal' });
    G.metal.box(hx0, hh, hz0, hx1, hh + 0.4, hz1, { us: 4, faces: 'pyny' }); W.addC(hx0, hh, hz0, hx1, hh + 0.4, hz1, { surf: 'metal' });
    for (let i = 0; i < 6; i++) Pr.barrel(P, -250 + i * 0.7, 0.05, 152, 0x3a5a3a);
    W.addC(-250.4, 0, 151.6, -245.8, 0.9, 152.4);
    // brifing binası, koğuşlar
    building(-205, 132, -170, 150, 8, 'office');
    building(-125, 132, -95, 146, 7, 'apt');
    building(-125, 150, -95, 164, 7, 'apt');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshBasicMaterial({ map: K.tex.sign('OPERASYON MERKEZİ', '#1c2a1d', '#d4874a'), toneMapped: false }));
    sign.position.set(-187.5, 6.2, 150.05); scene.add(sign);
    // helikopter pistleri
    for (const [x, z] of [[-150, 205], [-115, 205]]) {
      const hp = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: K.tex.helipad, transparent: true, roughness: 0.8 }));
      hp.rotation.x = -Math.PI / 2; hp.position.set(x, 0.07, z); scene.add(hp);
    }
    W.poi.hqPad = { x: -150, z: 205 }; W.poi.hqPad2 = { x: -115, z: 205 };
    // kule
    for (const [cx, cz] of [[-96, 236], [-104, 236], [-96, 244], [-104, 244]]) { P.box(0.4, 9, 0.4, 0x6a6e72, 'METAL', cx, 4.5, cz); W.addC(cx - 0.2, 0, cz - 0.2, cx + 0.2, 9, cz + 0.2, { surf: 'metal' }); }
    P.box(10, 3, 10, 0x5a5e62, 'METAL', -100, 10.5, 240); P.box(10.5, 0.3, 10.5, 0x3a3d40, 'METAL', -100, 12.1, 240);
    // eğitim parkuru
    for (let i = 0; i < 8; i++) { const bx = -248 + i * 5.5, bz = 225 + (i % 2) * 8; G.concrete.box(bx, 0, bz, bx + 3, 1.0 + (i % 3) * 0.5, bz + 0.4, { us: 4 }); W.addC(bx, 0, bz, bx + 3, 1.0 + (i % 3) * 0.5, bz + 0.4); }
    for (let i = 0; i < 4; i++) { Pr.sandbags(P, -240 + i * 9, 0.05, 245, 0, 3.6); W.addC(-241.8 + i * 9, 0, 244.6, -238.2 + i * 9, 0.72, 245.4); }
    Pr.flagpole(P, -187, 0.05, 160); W.addC(-187.6, 0, 159.4, -186.4, 10, 160.6, { surf: 'metal' });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 2, 8, 4), new THREE.MeshStandardMaterial({ map: K.tex.flag, side: THREE.DoubleSide, roughness: 0.8 }));
    flag.position.set(-185.5, 8.8, 160); scene.add(flag); W.flag = flag; W.flagBase = flag.geometry.attributes.position.array.slice();
    // komuta masası (dış alanda brifing çadırı)
    Pr.tent(P, -170, 0.05, 178, Math.PI / 2, 0x4e5240); addC2(-172.1, -168, 175.9, 180.1);
    const tbl = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 2.2), new THREE.MeshBasicMaterial({ map: K.tex.mapTable, toneMapped: false }));
    tbl.position.set(-170, 0.95, 178); scene.add(tbl);
    P.box(3.7, 0.9, 2.3, 0x2a2d30, 'METAL', -170, 0.45, 178); W.addC(-171.85, 0, 176.85, -168.15, 1.0, 179.15, { surf: 'metal' });
    W.poi.hqTable = { x: -170, z: 178 };
    W.poi.hqSpawn = { x: -165, z: 186 };
    W.poi.hqGate = { x: -150, z: 118 };
    W.poi.hqVehicles = { x: -200, z: 215 };
    function addC2(a, b, c, d) { W.addC(a, 0, c, b, 0.2, d, { nav: false }); }
  }

  // ───────── Gökyüzü ─────────
  function buildSky(scene) {
    const g = new THREE.SphereGeometry(1800, 32, 16);
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x3a6aa8) }, hor: { value: new THREE.Color(0xbcd0e0) }, bot: { value: new THREE.Color(0x60656a) }, sunDir: { value: new THREE.Vector3(0.3, 0.6, 0.2) }, sunCol: { value: new THREE.Color(0xfff2d0) }, sunSize: { value: 0.9992 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; }',
      fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize; varying vec3 vD;
        void main(){ float y = vD.y; vec3 c = y>0.0 ? mix(hor, top, pow(clamp(y,0.0,1.0),0.55)) : mix(hor, bot, clamp(-y*4.0,0.0,1.0));
        float s = dot(normalize(vD), normalize(sunDir)); c += sunCol * (smoothstep(sunSize, 1.0, s)*2.5 + pow(max(s,0.0), 12.0)*0.35);
        gl_FragColor = vec4(c,1.0); }`,
    });
    const sky = new THREE.Mesh(g, m); sky.renderOrder = -10; scene.add(sky); W.sky = sky;
    const N = 1400, sp = new Float32Array(N * 3), r = U.rng(7);
    for (let i = 0; i < N; i++) { const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95); sp[i * 3] = Math.sin(ph) * Math.cos(th) * 1700; sp[i * 3 + 1] = Math.cos(ph) * 1700; sp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 1700; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    W.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
    scene.add(W.stars);
  }
  // ───────── Yağmur ─────────
  function buildRain(scene) {
    const N = 2600, pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const x = U.rand(-35, 35), y = U.rand(0, 30), z = U.rand(-35, 35); pos.set([x, y, z, x + 0.05, y + 0.55, z + 0.02], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    W.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xa8bccc, transparent: true, opacity: 0.32, depthWrite: false }));
    W.rain.frustumCulled = false; W.rain.visible = false; scene.add(W.rain);
  }

  // ───────── Ortam ön ayarları ─────────
  const PRESETS = {
    day: { top: 0x3f72b2, hor: 0xc4d6e4, bot: 0x6a6e72, sun: [0.45, 0.75, 0.35], sunCol: 0xfff4e0, sunI: 2.6, hemiS: 0xbcd4ec, hemiG: 0x5a5448, hemiI: 0.9, fog: 0xbfd0de, fogN: 120, fogF: 720, lamps: 0, win: 0.0, exp: 0.95, stars: 0 },
    dusk: { amb: 0.18, top: 0x2c3a66, hor: 0xd99a78, bot: 0x3a3438, sun: [-0.7, 0.16, 0.45], sunCol: 0xffb070, sunI: 1.9, hemiS: 0x9a90b8, hemiG: 0x4a4038, hemiI: 0.95, fog: 0x8a7c80, fogN: 90, fogF: 560, lamps: 0.8, win: 0.8, exp: 1.1, stars: 0.15 },
    night: { top: 0x070d1e, hor: 0x23304a, bot: 0x0a0c10, sun: [0.3, 0.55, 0.4], sunCol: 0x9ab0ff, sunI: 0.9, hemiS: 0x6a7ca6, hemiG: 0x2c2c38, hemiI: 1.35, amb: 0.5, fog: 0x18223a, fogN: 50, fogF: 360, lamps: 1.0, win: 1.25, exp: 1.65, stars: 1 },
  };
  W.setEnv = function (time, weather) {
    W.env.time = time; W.env.weather = weather || 'clear';
    const p = Object.assign({}, PRESETS[time] || PRESETS.day);
    const rain = weather === 'rain', fogW = weather === 'fog';
    if (rain) { p.top = new THREE.Color(p.top).lerp(new THREE.Color(0x3a4048), 0.6).getHex(); p.hor = new THREE.Color(p.hor).lerp(new THREE.Color(0x4a525a), 0.55).getHex(); p.sunI *= 0.5; p.fogN *= 0.5; p.fogF *= 0.55; p.fog = new THREE.Color(p.fog).lerp(new THREE.Color(0x30383f), 0.6).getHex(); p.stars = 0; }
    if (fogW) { p.fogN = 10; p.fogF = 140; p.sunI *= 0.6; }
    const s = W.sky.material.uniforms;
    s.top.value.set(p.top); s.hor.value.set(p.hor); s.bot.value.set(p.bot); s.sunCol.value.set(p.sunCol);
    s.sunDir.value.set(p.sun[0], p.sun[1], p.sun[2]).normalize();
    s.sunSize.value = time === 'night' ? 0.9997 : 0.9992;
    W.sunDir = s.sunDir.value.clone();
    W.scene.fog = new THREE.Fog(p.fog, p.fogN, p.fogF);
    W.scene.background = new THREE.Color(p.fog);
    if (W.sun) { W.sun.color.set(p.sunCol); W.sun.intensity = p.sunI; }
    if (W.amb) { W.amb.intensity = (p.amb || 0) * (rain ? 1.1 : 1); W.amb.color.set(time === 'night' ? 0x8090c0 : 0xb0a8a0); }
    if (W.hemi) { W.hemi.color.set(p.hemiS); W.hemi.groundColor.set(p.hemiG); W.hemi.intensity = p.hemiI * (rain ? 0.9 : 1); }
    W.lampLevel = p.lamps;
    W.lampGlow.visible = p.lamps > 0; W.lampGlow.material.opacity = p.lamps;
    for (const k in W.facadeMats) W.facadeMats[k].emissiveIntensity = p.win;
    W.stars.material.opacity = p.stars * 0.85; W.stars.visible = p.stars > 0;
    W.rain.visible = rain;
    const wet = rain ? 0.22 : 0.9;
    W.mats.asphalt.roughness = wet; W.mats.asphalt.metalness = rain ? 0.25 : 0;
    W.mats.paving.roughness = rain ? 0.35 : 0.85; W.mats.sidewalk.roughness = rain ? 0.35 : 0.9;
    W.exposure = p.exp;
    if (K.renderer) K.renderer.toneMappingExposure = p.exp;
    // çevre haritası (yansımalar)
    if (K.renderer) {
      const pm = new THREE.PMREMGenerator(K.renderer);
      const envScene = new THREE.Scene();
      const sk = new THREE.Mesh(W.sky.geometry, W.sky.material); envScene.add(sk);
      if (W.envRT) W.envRT.dispose();
      W.envRT = pm.fromScene(envScene, 0.02);
      W.scene.environment = W.envRT.texture;
      pm.dispose();
    }
    K.audio.setLoop('rain', rain ? 0.35 : 0);
    K.audio.setLoop('wind', time === 'night' || fogW ? 0.12 : 0.06);
  };

  // ───────── Kare güncellemesi ─────────
  const _tmpV = new THREE.Vector3();
  W.update = function (dt, cam, focus) {
    if (K.wa.cullList && cam) K.wa.update(dt, cam.position);
    if (cam && W.sky.scale.x < 1) W.sky.position.set(cam.position.x, 0, cam.position.z);   // küçük kubbe kamerayı izler
    // kapılar
    for (const d of W.doors) {
      if (d.auto) {
        let near = false;
        const acts = K.game ? K.game.actors : [];
        for (let i = 0; i < acts.length && !near; i++) { const a = acts[i]; if (a.alive !== false && Math.abs(a.pos.y - d.y) < 2 && Math.hypot(a.pos.x - d.x, a.pos.z - d.z) < 3.2) near = true; }
        if (K.game && K.game.player && K.game.player.vehicle == null && Math.hypot(K.game.player.pos.x - d.x, K.game.player.pos.z - d.z) < 3.2) near = true;
        if (near !== d.open && !d.locked) d.setOpen(near, true);
      }
      if (Math.abs(d.ang - d.target) > 0.001) {
        d.ang += (d.target - d.ang) * (1 - Math.exp(-8 * dt));
        if (d.auto) {
          // sürgülü cam kapı
          if (d.axis === 'x') d.mesh.position.x = d.w / 2 + d.ang * d.w * 0.95; else d.mesh.position.z = d.w / 2 + d.ang * d.w * 0.95;
        } else d.pivot.rotation.y = (d.axis === 'x' ? -1 : 1) * d.ang * Math.PI * 0.5;
      }
    }
    // yağmur kamerayı izler
    if (W.env.weather === 'rain' && cam) {
      W._roofT = (W._roofT || 0) - dt;
      if (W._roofT <= 0) { W._roofT = 0.3; const h = W.raycast(cam.position.x, cam.position.y + 0.2, cam.position.z, 0, 1, 0, 40); W.rainHidden = !!h; W.rain.visible = !W.rainHidden; K.audio.setLoop('rain', W.rainHidden ? 0.12 : 0.35); }
    }
    if (W.rain.visible && cam) {
      const pos = W.rain.geometry.attributes.position, a = pos.array;
      const fall = 26 * dt;
      for (let i = 0; i < a.length; i += 6) {
        a[i + 1] -= fall; a[i + 4] -= fall;
        if (a[i + 1] < -2) { const x = U.rand(-35, 35), z = U.rand(-35, 35), y = 28 + Math.random() * 4; a[i] = x; a[i + 1] = y; a[i + 2] = z; a[i + 3] = x + 0.05; a[i + 4] = y + 0.55; a[i + 5] = z + 0.02; }
      }
      pos.needsUpdate = true;
      W.rain.position.set(cam.position.x, cam.position.y - 12, cam.position.z);
    }
    // bayrak dalgası
    if (W.flag) {
      const a = W.flag.geometry.attributes.position, b = W.flagBase, t = performance.now() * 0.003;
      for (let i = 0; i < a.count; i++) { const x = b[i * 3]; a.array[i * 3 + 2] = Math.sin(x * 2 + t) * 0.18 * (x + 1.5) / 3; }
      a.needsUpdate = true;
    }
    // gece sokak lambası ışık havuzu
    if (W.lampLevel > 0 && focus) {
      W._lampT = (W._lampT || 0) - dt;
      if (W._lampT <= 0) {
        W._lampT = 0.5;
        const near = W.lamps.map((l) => ({ l, d: (l.x - focus.x) ** 2 + (l.z - focus.z) ** 2 })).sort((p, q) => p.d - q.d);
        for (let i = 0; i < W.lampLights.length; i++) {
          const L = W.lampLights[i], n = near[i];
          if (n && n.d < 70 * 70) { L.position.set(n.l.x, n.l.y - 0.4, n.l.z); L.intensity = 30 * W.lampLevel; } else L.intensity = 0;
        }
      }
    } else if (W.lampLights) for (const L of W.lampLights) L.intensity = 0;
    // güneş gölgesi odağı izler
    if (W.sun && focus) {
      _tmpV.copy(W.sunDir).multiplyScalar(160);
      W.sun.position.set(focus.x + _tmpV.x, focus.y + _tmpV.y, focus.z + _tmpV.z);
      W.sun.target.position.set(focus.x, focus.y, focus.z);
      W.sun.target.updateMatrixWorld();
    }
  };

  W.setLampLightCount = function (n) {
    while (W.lampLights.length > n) { const l = W.lampLights.pop(); W.scene.remove(l); l.dispose && l.dispose(); }
    while (W.lampLights.length < n) { const l = new THREE.PointLight(0xffc98a, 0, 22, 1.6); W.scene.add(l); W.lampLights.push(l); }
    W._lampT = 0;
  };
  // Etkileşim için en uygun nesne
  W.bestInteract = function (actor, fwdX, fwdZ) {
    if (K.cam && K.cam.mode === 'foot' && actor === K.game.player) { fwdX = Math.sin(K.cam.yaw); fwdZ = Math.cos(K.cam.yaw); }
    let best = null, bs = Infinity;
    for (const it of W.interactables) {
      if (it.enabled && !it.enabled()) continue;
      if ((it.layer || 0) !== (actor.layer || 0)) continue;
      const dx = it.x - actor.pos.x, dz = it.z - actor.pos.z, dy = (it.y != null ? it.y : actor.pos.y + 1) - (actor.pos.y + 1);
      const d = Math.hypot(dx, dz);
      if (d > (it.r || 1.8) || Math.abs(dy) > 1.6) continue;
      const dot = d > 0.3 ? (dx * fwdX + dz * fwdZ) / d : 1;
      if (dot < 0.1) continue;
      const s = d - dot * 0.8;
      if (s < bs) { bs = s; best = it; }
    }
    return best;
  };
})();
