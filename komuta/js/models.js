/* KOMUTA — prosedürel modeller: parça birleştirici, asker/sivil iskeleti, silahlar, IK'lı animasyon */
'use strict';
(function () {
  const U = K.U;
  const M = K.models = {};
  const V3 = THREE.Vector3;
  const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new V3(), _s = new V3();
  function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
    return new THREE.Matrix4().compose(_p, _q, _s);
  }
  M.mtx = mtx;
  const _c = new THREE.Color();

  // ───────── Parça listesi: vertex renkli + atlas UV bölgeli, tek geometriye birleşir ─────────
  class Parts {
    constructor() { this.list = []; this.stack = [new THREE.Matrix4()]; }
    get top() { return this.stack[this.stack.length - 1]; }
    push(m) { this.stack.push(this.top.clone().multiply(m)); return this; }
    pushT(x, y, z, ry = 0, rx = 0, rz = 0, s = 1) { return this.push(mtx(x, y, z, rx, ry, rz, s, s, s)); }
    pop() { if (this.stack.length > 1) this.stack.pop(); return this; }
    add(geo, color, region = 'FLAT', m = null) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      geo.dispose();
      const Mx = m ? this.top.clone().multiply(m) : this.top;
      g.applyMatrix4(Mx);
      const R = K.tex.R[region] || K.tex.R.FLAT, ins = 0.012;
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, R[0] + ins + (uv.getX(i) % 1.0001) * (R[2] - R[0] - 2 * ins), R[1] + ins + (uv.getY(i) % 1.0001) * (R[3] - R[1] - 2 * ins));
      }
      _c.set(color);
      const n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.list.push(g);
      return this;
    }
    box(w, h, d, color, region, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), color, region, mtx(x, y, z, rx, ry, rz)); }
    cyl(rt, rb, h, seg, color, region, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, region, mtx(x, y, z, rx, ry, rz)); }
    sph(r, color, region, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ws = 10, hs = 8, ph0 = 0, phL = Math.PI * 2, th0 = 0, thL = Math.PI) {
      return this.add(new THREE.SphereGeometry(r, ws, hs, ph0, phL, th0, thL), color, region, mtx(x, y, z, 0, 0, 0, sx, sy, sz));
    }
    cap(r, len, color, region, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CapsuleGeometry(r, len, 3, 8), color, region, mtx(x, y, z, rx, ry, rz)); }
    plane(w, h, color, region, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.PlaneGeometry(w, h), color, region, mtx(x, y, z, rx, ry, rz)); }
    get count() { return this.list.length; }
    build() { const g = mergeGeos(this.list); this.list = []; return g; }
    mesh(mat, shadow = true) {
      const m = new THREE.Mesh(this.build(), mat);
      m.castShadow = shadow; m.receiveShadow = true;
      return m;
    }
  }
  M.Parts = Parts;

  function mergeGeos(list) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array.subarray(0, c * 3), o * 3);
      nor.set(g.attributes.normal.array.subarray(0, c * 3), o * 3);
      uv.set(g.attributes.uv.array.subarray(0, c * 2), o * 2);
      col.set(g.attributes.color.array.subarray(0, c * 3), o * 3);
      o += c; g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    return geo;
  }
  M.mergeGeos = mergeGeos;

  M.init = function () {
    M.matChar = new THREE.MeshStandardMaterial({ map: K.tex.atlas, vertexColors: true, roughness: 0.86, metalness: 0.04 });
    M.matVeh = new THREE.MeshStandardMaterial({ map: K.tex.atlas, vertexColors: true, roughness: 0.5, metalness: 0.45 });
    M.matProp = new THREE.MeshStandardMaterial({ map: K.tex.atlas, vertexColors: true, roughness: 0.78, metalness: 0.12 });
    M.matLight = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    M.matTrack = new THREE.MeshStandardMaterial({ map: K.tex.track, roughness: 0.9, metalness: 0.3 });
    M.matPaper = new THREE.MeshStandardMaterial({ map: K.tex.paper, roughness: 0.9 });
    M.matScreen = new THREE.MeshBasicMaterial({ map: K.tex.screen, toneMapped: false });
  };

  // ───────── Silahlar (yerel +z ileri, orijin tabanca kabzası üstü) ─────────
  const GUN = 0x26282b, GUN2 = 0x3a3d40, TAN = 0x7d6e52;
  M.WEAPONS = {
    pistol_s: { grip: new V3(0, -0.05, -0.01), fore: new V3(0.03, -0.06, 0.0), muzzle: new V3(0, 0.025, 0.34), kind: 'pistol',
      build(P) { P.box(0.032, 0.04, 0.19, GUN, 'METAL', 0, 0.02, 0.05); P.box(0.03, 0.11, 0.045, GUN2, 'FLAT', 0, -0.045, -0.01, 0.25); P.cyl(0.016, 0.016, 0.14, 8, 0x1d1e20, 'METAL', 0, 0.025, 0.21, Math.PI / 2); } },
    pistol: { grip: new V3(0, -0.05, -0.01), fore: new V3(0.03, -0.06, 0.0), muzzle: new V3(0, 0.025, 0.16), kind: 'pistol',
      build(P) { P.box(0.032, 0.042, 0.19, GUN, 'METAL', 0, 0.02, 0.05); P.box(0.03, 0.11, 0.045, GUN2, 'FLAT', 0, -0.045, -0.01, 0.25); } },
    smg: { grip: new V3(0, -0.07, -0.02), fore: new V3(0, -0.05, 0.12), muzzle: new V3(0, 0.02, 0.3), kind: 'rifle',
      build(P) { P.box(0.05, 0.08, 0.28, GUN, 'METAL', 0, 0.01, 0.03); P.cyl(0.012, 0.012, 0.08, 8, 0x1c1c1c, 'METAL', 0, 0.02, 0.2, Math.PI / 2); P.box(0.03, 0.15, 0.04, GUN2, 'FLAT', 0, -0.09, 0.06); P.box(0.033, 0.1, 0.04, GUN2, 'FLAT', 0, -0.065, -0.04, 0.3); P.box(0.03, 0.05, 0.18, GUN2, 'FLAT', 0, 0.0, -0.18); } },
    launcher: { grip: new V3(0, -0.07, -0.03), fore: new V3(0, -0.06, 0.25), muzzle: new V3(0, 0.04, 0.72), kind: 'rifle',
      build(P) { P.cyl(0.05, 0.05, 1.35, 12, 0x4a4f3a, 'METAL', 0, 0.04, 0.05, Math.PI / 2); P.box(0.03, 0.1, 0.04, GUN2, 'FLAT', 0, -0.05, -0.03, 0.3); P.box(0.03, 0.1, 0.04, GUN2, 'FLAT', 0, -0.05, 0.25); } },
    knife: { grip: new V3(0, -0.01, -0.02), fore: new V3(0.05, -0.12, -0.1), muzzle: new V3(0, 0, 0.22), kind: 'knife',
      build(P) { P.box(0.025, 0.03, 0.11, 0x1a1a1a, 'FABRIC', 0, 0, -0.02); P.box(0.006, 0.035, 0.18, 0xb8bcc0, 'METAL', 0, 0.004, 0.12); P.box(0.04, 0.012, 0.012, 0x333333, 'METAL', 0, 0, 0.035); } },
    rifle: { grip: new V3(0, -0.07, -0.03), fore: new V3(0, -0.04, 0.17), muzzle: new V3(0, 0.02, 0.56), kind: 'rifle',
      build(P) {
        P.box(0.055, 0.085, 0.36, GUN, 'METAL', 0, 0.01, 0.03);
        P.box(0.06, 0.065, 0.22, GUN2, 'FLAT', 0, 0.015, 0.25);
        P.cyl(0.012, 0.012, 0.18, 8, 0x111111, 'METAL', 0, 0.02, 0.45, Math.PI / 2);
        P.box(0.05, 0.08, 0.24, TAN, 'FLAT', 0, -0.005, -0.27);
        P.box(0.034, 0.13, 0.06, GUN, 'FLAT', 0, -0.08, 0.09, -0.25);
        P.box(0.033, 0.1, 0.04, GUN2, 'FLAT', 0, -0.065, -0.04, 0.35);
        P.box(0.04, 0.045, 0.09, 0x111111, 'METAL', 0, 0.075, 0.02);
        P.box(0.02, 0.02, 0.02, 0xff4433, 'FLAT', 0, 0.085, -0.02);
      } },
    smg_s: { grip: new V3(0, -0.07, -0.02), fore: new V3(0, -0.05, 0.12), muzzle: new V3(0, 0.02, 0.48), kind: 'rifle',
      build(P) {
        P.box(0.05, 0.08, 0.28, GUN, 'METAL', 0, 0.01, 0.03);
        P.cyl(0.022, 0.022, 0.2, 8, 0x1c1c1c, 'METAL', 0, 0.02, 0.32, Math.PI / 2);
        P.box(0.03, 0.15, 0.04, GUN2, 'FLAT', 0, -0.09, 0.06);
        P.box(0.033, 0.1, 0.04, GUN2, 'FLAT', 0, -0.065, -0.04, 0.3);
        P.box(0.03, 0.05, 0.18, GUN2, 'FLAT', 0, 0.0, -0.18);
      } },
    dmr: { grip: new V3(0, -0.07, -0.03), fore: new V3(0, -0.04, 0.2), muzzle: new V3(0, 0.02, 0.74), kind: 'rifle', scope: true,
      build(P) {
        P.box(0.055, 0.085, 0.42, 0x3b3f2f, 'METAL', 0, 0.01, 0.06);
        P.cyl(0.013, 0.013, 0.36, 8, 0x111111, 'METAL', 0, 0.02, 0.55, Math.PI / 2);
        P.box(0.055, 0.09, 0.28, 0x3b3f2f, 'FLAT', 0, -0.005, -0.3);
        P.cyl(0.024, 0.024, 0.26, 10, 0x151515, 'METAL', 0, 0.09, 0.04, Math.PI / 2);
        P.box(0.034, 0.12, 0.05, GUN, 'FLAT', 0, -0.075, 0.1);
        P.box(0.033, 0.1, 0.04, GUN2, 'FLAT', 0, -0.065, -0.04, 0.35);
      } },
    lmg: { grip: new V3(0, -0.07, -0.03), fore: new V3(0, -0.05, 0.2), muzzle: new V3(0, 0.03, 0.62), kind: 'rifle',
      build(P) {
        P.box(0.075, 0.11, 0.42, GUN, 'METAL', 0, 0.01, 0.05);
        P.cyl(0.02, 0.02, 0.32, 8, 0x111111, 'METAL', 0, 0.03, 0.46, Math.PI / 2);
        P.box(0.1, 0.12, 0.12, 0x3b4033, 'FLAT', -0.07, -0.06, 0.06);
        P.box(0.055, 0.09, 0.22, GUN2, 'FLAT', 0, 0, -0.27);
        P.box(0.033, 0.1, 0.04, GUN2, 'FLAT', 0, -0.065, -0.04, 0.35);
        P.box(0.01, 0.16, 0.01, GUN2, 'METAL', 0.03, -0.08, 0.5, 0.4); P.box(0.01, 0.16, 0.01, GUN2, 'METAL', -0.03, -0.08, 0.5, 0.4);
      } },
    shotgun: { grip: new V3(0, -0.07, -0.03), fore: new V3(0, -0.04, 0.2), muzzle: new V3(0, 0.02, 0.6), kind: 'rifle',
      build(P) {
        P.box(0.055, 0.08, 0.3, GUN, 'METAL', 0, 0.01, 0.02);
        P.cyl(0.016, 0.016, 0.42, 8, 0x111111, 'METAL', 0, 0.03, 0.36, Math.PI / 2);
        P.cyl(0.018, 0.018, 0.3, 8, 0x5a4630, 'FLAT', 0, -0.015, 0.3, Math.PI / 2);
        P.box(0.05, 0.08, 0.26, 0x5a4630, 'FLAT', 0, -0.01, -0.26);
        P.box(0.033, 0.1, 0.04, GUN2, 'FLAT', 0, -0.065, -0.04, 0.35);
      } },
  };
  const weaponGeoCache = {};
  M.weaponMesh = function (id) {
    const W = M.WEAPONS[id] || M.WEAPONS.rifle;
    if (!weaponGeoCache[id]) { const P = new Parts(); W.build(P); weaponGeoCache[id] = P.build(); }
    const m = new THREE.Mesh(weaponGeoCache[id], M.matChar);
    m.castShadow = true;
    return m;
  };

  // ───────── Karakter görünümleri ─────────
  M.LOOKS = {
    soldier: { glb: 'squad_woodland', uniform: 0x6b7356, region: 'CAMO', pants: 0x6b7356, vest: 0x3f4534, helmet: 0x4f5643, goggles: true, gloves: 0x2a2a28, boots: 0x2b2620, backpack: true, pouches: true },
    steel: { glb: 'squad_desert', uniform: 0x5a5f55, region: 'CAMO', pants: 0x5a5f55, vest: 0x2f332c, helmet: 0x30352d, mask: true, gloves: 0x222222, boots: 0x222018, heavy: true, pouches: true },
    riot: { uniform: 0x2f3a4f, region: 'FABRIC', pants: 0x2b3446, vest: 0x1d2433, helmet: 0x1d2433, visor: true, gloves: 0x111111, boots: 0x161616, pouches: true },
    special: { glb: 'squad_forest', uniform: 0x2e3133, region: 'CAMO', pants: 0x2e3133, vest: 0x1f2122, helmet: 0x232526, goggles: true, mask: true, gloves: 0x151515, boots: 0x151515, pouches: true },
    elite: { glb: 'squad_forest', uniform: 0x5d5a46, region: 'CAMO', pants: 0x5d5a46, vest: 0x3e3b2d, beret: 0x6e1420, gloves: 0x2a2a28, boots: 0x2b2620, pouches: true, backpack: true },
    agent: { uniform: 0x2c3540, region: 'FABRIC', pants: 0x2a2d33, jacket: true, hair: 0x2b1e15, boots: 0x1a1612, shirt: 0xe8e4dc },
    playerCivil: { uniform: 0x3b3f48, region: 'FABRIC', pants: 0x2b2f38, jacket: true, hair: 0x241a12, boots: 0x18140f, shirt: 0xdcd8cf },
    enemy: { glb: 'soldier', glbTint: 0xa8a8a8, uniform: 0x2a2a2c, region: 'FABRIC', pants: 0x26272b, vest: 0x1b1b1d, armband: 0x9a1b1b, hair: 0x18120d, boots: 0x111111, cap: 0x161616, gloves: 0x111111 },
    enemyHeavy: { glb: 'soldier', glbTint: 0x7c7c80, uniform: 0x2a2a2c, region: 'CAMO', pants: 0x26272b, vest: 0x161618, armband: 0x9a1b1b, helmet: 0x1b1b1d, mask: true, boots: 0x111111, gloves: 0x111111, pouches: true },
    guard: { uniform: 0x2f3d55, region: 'FABRIC', pants: 0x232a38, cap: 0x1d2433, hair: 0x2a1d14, boots: 0x111111, shirt: 0x9fb2c9 },
    boss: { uniform: 0x1b1b1f, region: 'FABRIC', pants: 0x1b1b1f, jacket: true, shirt: 0x7a1d1d, hair: 0x5a5a5a, boots: 0x0d0d0d },
    pilot: { uniform: 0x5b6150, region: 'FABRIC', pants: 0x5b6150, helmet: 0x4a5040, visor: true, gloves: 0x3a3a35, boots: 0x2b2620 },
    medic: { uniform: 0xd8d8d8, region: 'FABRIC', pants: 0x2a4d7a, hair: 0x2a1d14, boots: 0x222222, armband: 0xc81e1e },
  };
  const SKINS = [0xe0b48f, 0xcf9f78, 0xb98763, 0x9c6b4b, 0xe8c4a2, 0xc69472];
  const CIV_TOPS = [0x8a2d2d, 0x2d5a8a, 0x3d6b3d, 0xb0883a, 0x6b4a7a, 0x555a60, 0xc7c2b6, 0x2f6a6a, 0x7a5232, 0x1f2f4f, 0xa04a2a];
  const CIV_PANTS = [0x2a3040, 0x3a3a3a, 0x50463a, 0x1f2430, 0x6a6255, 0x2b2b2b];
  const HAIRS = [0x1b120c, 0x2b1e15, 0x4a3524, 0x6a5a48, 0x8a8a8a, 0x15100c];
  // Sketchfab sivil modelleri (K.ASSETDATA.characters içinde civ: 'm' | 'f')
  M.civGLB = function (gender, r = Math.random) {
    if (!K.assets || !K.assets.chars) return null;
    const C = K.ASSETDATA.characters, ids = Object.keys(C).filter((id) => C[id].civ && K.assets.chars[id] && (!gender || C[id].civ === gender) && !C[id].special);
    return ids.length ? ids[Math.floor(r() * ids.length)] : null;
  };
  M.civLook = function (r = Math.random, gender) {
    const pick = (a) => a[Math.floor(r() * a.length)];
    const L = { uniform: pick(CIV_TOPS), region: 'FABRIC', pants: pick(CIV_PANTS), hair: pick(HAIRS), boots: pick([0x1a1612, 0x3a2a1a, 0x222222, 0x5a5a5a]), skin: pick(SKINS), jacket: r() < 0.35, shirt: pick([0xe8e4dc, 0xbfc8d4, 0x333333]), bald: r() < 0.12 };
    const g = M.civGLB(gender, r); if (g) L.glb = g;
    return L;
  };
  // görünümü modele bağla (yükleme sonrası): ajan, patron, sivil kılıklı oyuncu
  M.bindCivLooks = function () {
    const C = K.ASSETDATA.characters, has = (id) => C[id] && K.assets.chars[id];
    if (has('civ_eric')) M.LOOKS.boss.glb = 'civ_eric';
    if (has('civ_nathan')) M.LOOKS.playerCivil.glb = 'civ_nathan';
    if (has('civ_bizman')) M.LOOKS.agent.glb = 'civ_bizman';
  };

  // ───────── İskelet oluşturma ─────────
  const UA = 0.31, FA = 0.33; // üst kol, ön kol + el (avuç merkezine)
  M.ARM = { UA, FA };
  M.character = function (lookIn, opts = {}) {
    const L = Object.assign({}, lookIn);
    const skin = L.skin || SKINS[Math.floor(Math.random() * 3)];
    const heavy = !!L.heavy, w = heavy ? 1.12 : 1;
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);
    const mk = (P) => { const m = P.mesh(M.matChar); return m; };
    // kalça
    const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
    let P = new Parts();
    P.box(0.34 * w, 0.2, 0.22 * w, L.pants, L.region === 'CAMO' ? 'CAMO' : 'FABRIC', 0, -0.02, 0);
    P.box(0.36 * w, 0.05, 0.24 * w, 0x2a2622, 'FLAT', 0, 0.07, 0);
    hips.add(mk(P));
    const legs = [];
    for (const side of [1, -1]) {
      const th = new THREE.Group(); th.position.set(0.1 * side * w, -0.04, 0); hips.add(th);
      P = new Parts();
      P.box(0.16 * w, 0.46, 0.18 * w, L.pants, L.region === 'CAMO' ? 'CAMO' : 'FABRIC', 0, -0.22, 0);
      if (L.pouches && side === -1) P.box(0.05, 0.16, 0.12, L.vest || 0x333333, 'FABRIC', -0.1, -0.15, 0.0);
      if (L.vest && !L.jacket) P.box(0.17 * w, 0.1, 0.19 * w, 0x2a2a28, 'FLAT', 0, -0.4, 0.01); // dizlik
      th.add(mk(P));
      const kn = new THREE.Group(); kn.position.y = -0.45; th.add(kn);
      P = new Parts();
      P.box(0.135 * w, 0.42, 0.15 * w, L.pants, L.region === 'CAMO' ? 'CAMO' : 'FABRIC', 0, -0.21, 0);
      P.box(0.15 * w, 0.11, 0.28, L.boots, 'FLAT', 0, -0.45, 0.05);
      P.box(0.15 * w, 0.14, 0.17, L.boots, 'FLAT', 0, -0.35, 0.0);
      kn.add(mk(P));
      legs.push({ th, kn });
    }
    // gövde
    const torso = new THREE.Group(); torso.position.y = 0.95; body.add(torso);
    P = new Parts();
    const topCol = L.jacket ? L.uniform : L.uniform;
    P.box(0.38 * w, 0.52, 0.23 * w, topCol, L.region, 0, 0.3, 0);
    P.box(0.42 * w, 0.14, 0.25 * w, topCol, L.region, 0, 0.5, 0);
    if (L.jacket) {
      P.box(0.12, 0.3, 0.02, L.shirt || 0xe0e0e0, 'FABRIC', 0, 0.42, 0.118);
      P.box(0.04, 0.24, 0.02, 0x6a1d1d, 'FLAT', 0, 0.38, 0.122);
    } else if (L.shirt && !L.vest) {
      P.box(0.12, 0.08, 0.02, L.shirt, 'FABRIC', 0, 0.55, 0.118);
    }
    if (L.vest) {
      P.box(0.43 * w, 0.4, 0.31 * w, L.vest, 'FABRIC', 0, 0.33, 0);
      if (L.pouches) {
        for (let i = -1; i <= 1; i++) P.box(0.1, 0.12, 0.06, L.vest, 'FABRIC', i * 0.12, 0.24, 0.17 * w);
        P.box(0.14, 0.08, 0.05, 0x2a2a28, 'FLAT', -0.1, 0.43, 0.165 * w);
        P.box(0.05, 0.12, 0.05, 0x222222, 'FLAT', 0.16, 0.45, 0.15); // telsiz
        P.cyl(0.005, 0.005, 0.25, 4, 0x111111, 'FLAT', 0.17, 0.62, 0.14);
      }
      if (heavy) { P.box(0.5, 0.1, 0.34, L.vest, 'FABRIC', 0, 0.12, 0); P.box(0.22, 0.12, 0.32, L.vest, 'FABRIC', 0.25, 0.52, 0, 0, 0, -0.3); P.box(0.22, 0.12, 0.32, L.vest, 'FABRIC', -0.25, 0.52, 0, 0, 0, 0.3); }
    }
    if (L.backpack) { P.box(0.34, 0.38, 0.16, L.vest || 0x4a4a3a, 'FABRIC', 0, 0.32, -0.21); P.box(0.3, 0.1, 0.14, 0x2a2a22, 'FLAT', 0, 0.1, -0.21); }
    if (L.medicCross) P.box(0.14, 0.14, 0.01, 0xc81e1e, 'FLAT', 0, 0.35, 0.17);
    torso.add(mk(P));
    // baş
    const neck = new THREE.Group(); neck.position.y = 0.6; torso.add(neck);
    P = new Parts();
    P.cyl(0.055, 0.06, 0.1, 8, skin, 'FLAT', 0, 0.02, 0);
    P.sph(0.112, skin, 'FLAT', 0, 0.15, 0.01, 0.92, 1.08, 1);
    P.box(0.03, 0.04, 0.03, skin, 'FLAT', 0, 0.14, 0.115); // burun
    P.box(0.02, 0.05, 0.03, skin, 'FLAT', 0.105, 0.15, 0); P.box(0.02, 0.05, 0.03, skin, 'FLAT', -0.105, 0.15, 0);
    P.box(0.02, 0.012, 0.01, 0x1a1a1a, 'FLAT', 0.04, 0.17, 0.105); P.box(0.02, 0.012, 0.01, 0x1a1a1a, 'FLAT', -0.04, 0.17, 0.105);
    if (L.helmet) {
      P.sph(0.135, L.helmet, 'CAMO', 0, 0.18, 0, 1, 0.92, 1.05, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
      P.box(0.27, 0.03, 0.02, L.helmet, 'FLAT', 0, 0.17, 0.125);
      if (L.goggles) { P.box(0.2, 0.05, 0.04, 0x1d1d1d, 'FLAT', 0, 0.23, 0.12); P.box(0.17, 0.035, 0.02, 0x4a6670, 'METAL', 0, 0.23, 0.14); }
      if (L.visor) P.box(0.24, 0.12, 0.02, 0x0e1a22, 'METAL', 0, 0.15, 0.135);
    } else if (L.beret) {
      P.sph(0.125, L.beret, 'FABRIC', 0.02, 0.21, 0, 1.08, 0.5, 1.02, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
      P.sph(0.105, L.hair || 0x1b120c, 'FABRIC', 0, 0.18, -0.02, 1, 0.8, 1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    } else if (L.cap) {
      P.sph(0.12, L.cap, 'FABRIC', 0, 0.2, 0, 1, 0.7, 1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
      P.box(0.16, 0.015, 0.1, L.cap, 'FLAT', 0, 0.21, 0.12);
    } else if (!L.bald) {
      P.sph(0.118, L.hair || 0x1b120c, 'FABRIC', 0, 0.18, -0.01, 1, 0.85, 1.04, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52);
    }
    if (L.mask) P.box(0.2, 0.08, 0.05, 0x1d1d1d, 'FABRIC', 0, 0.1, 0.095);
    const head = mk(P); neck.add(head);
    // kollar
    const arms = [];
    for (const side of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(0.23 * side * w, 0.5, 0); torso.add(sh);
      P = new Parts();
      P.box(0.11 * w, UA, 0.12 * w, L.uniform, L.region, 0, -UA / 2, 0);
      if (L.vest && L.pouches) P.box(0.13 * w, 0.1, 0.14 * w, L.vest, 'FABRIC', 0, -0.04, 0);
      if (L.armband && side === 1) P.box(0.12, 0.05, 0.13, L.armband, 'FLAT', 0, -0.14, 0);
      if (side === 1 && !L.jacket && L.region === 'CAMO') P.box(0.005, 0.05, 0.07, 0xd4874a, 'FLAT', 0.058 * w, -0.09, 0); // amblem
      sh.add(mk(P));
      const el = new THREE.Group(); el.position.y = -UA; sh.add(el);
      P = new Parts();
      P.box(0.095 * w, 0.27, 0.1 * w, L.uniform, L.region, 0, -0.135, 0);
      P.box(0.085, 0.09, 0.09, L.gloves || skin, 'FLAT', 0, -0.31, 0.0);
      el.add(mk(P));
      arms.push({ sh, el });
    }
    const gun = new THREE.Group(); torso.add(gun);
    const rig = {
      root, body, hips, torso, neck, head,
      thL: legs[0].th, knL: legs[0].kn, thR: legs[1].th, knR: legs[1].kn,
      shL: arms[0].sh, elL: arms[0].el, shR: arms[1].sh, elR: arms[1].el,
      gun, gunMesh: null, weapon: null, shield: null,
      look: L, phase: Math.random() * 6, t: Math.random() * 10,
      cur: { hipsY: 0.95, lean: 0, bodyX: 0, bodyY: 0 },
      gunPos: new V3(0, 0.3, 0.3), gunRot: new THREE.Euler(0, 0, 0),
      hL: new V3(0.2, 0.2, 0.2), hR: new V3(-0.2, 0.2, 0.2), ikW: 0,
      w,
    };
    if (opts.weapon) M.setWeapon(rig, opts.weapon);
    if (opts.shield) M.addShield(rig);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return rig;
  };

  // GLB silah: köken sağ el kavrama noktası, ileri -z (call-of-duty hazırlama düzeni) → oyunun +z düzenine çevrilir
  const GLB_OFF = new V3(0, -0.035, -0.03);
  const glbDefs = {};
  function glbDef(W) {
    if (glbDefs[W.id]) return glbDefs[W.id];
    const d = K.ASSETDATA.weapons[W.asset], p = d.points;
    const tr = (a, dy = 0) => new V3(-a[0] + GLB_OFF.x, a[1] + GLB_OFF.y + dy, -a[2] + GLB_OFF.z);
    const kind = W.kind === 'launcher' ? 'rifle' : W.kind;
    const def = {
      grip: new V3(0, GLB_OFF.y - 0.03, GLB_OFF.z), kind,
      fore: p.leftHand ? tr(p.leftHand, kind === 'pistol' ? -0.02 : -0.03) : new V3(0.05, -0.12, -0.1),
      muzzle: tr(p.muzzle || p.tip || [0, 0, -0.5]), scope: !!W.zoom,
    };
    glbDefs[W.id] = def;
    return def;
  }
  M.gunDef = function (rig) { return rig.gunDef || (rig.weapon ? M.WEAPONS[rig.weapon] : null); };
  M.setWeapon = function (rig, id, forceProc) {
    if (rig.gunMesh) { rig.gun.remove(rig.gunMesh); rig.gunMesh = null; }
    rig.weapon = id || null; rig.gunGLB = false; rig.gunDef = null; rig.gunSpin = null;
    if (!id) return;
    const W = K.WEAPONS[id];
    if (W && W.asset && K.assets && K.assets.weaponReady(W.asset) && !forceProc) {
      const wrap = new THREE.Group();
      const c = K.assets.weaponClone(W.asset);
      c.rotation.y = Math.PI; c.position.copy(GLB_OFF); wrap.add(c);
      let spin = null; c.traverse((o) => { if (o.name === 'spin' && !spin) spin = o; });
      if (spin) {
        // namlu demeti kendi ekseni etrafında dönsün: pivotu ağın merkezine taşı
        const bb = new THREE.Box3().setFromObject(spin), ctr = bb.getCenter(new V3());
        c.updateMatrixWorld(true); spin.parent.worldToLocal(ctr);
        const piv = new THREE.Group(); piv.position.set(ctr.x, ctr.y, 0);
        spin.parent.add(piv); piv.add(spin); spin.position.set(-ctr.x, -ctr.y, 0);
        rig.gunSpin = piv;
      }
      rig.gunMesh = wrap; rig.gunGLB = true; rig.gunDef = glbDef(W);
    } else {
      if (W && W.asset && K.assets) K.assets.requestWeapon(W.asset);
      const pid = W ? W.proc : id;
      rig.gunMesh = M.weaponMesh(pid); rig.gunDef = M.WEAPONS[pid] || M.WEAPONS.rifle;
    }
    rig.gun.add(rig.gunMesh);
  };
  // uzaktaki askerde hafif prosedürel model, yakında GLB
  M.weaponLOD = function (rig, near) {
    if (!rig.weapon) return;
    const W = K.WEAPONS[rig.weapon]; if (!W || !W.asset) return;
    if (near && !rig.gunGLB && K.assets.weaponReady(W.asset)) M.setWeapon(rig, rig.weapon);
    else if (!near && rig.gunGLB) M.setWeapon(rig, rig.weapon, true);
  };
  M.addShield = function (rig) {
    const P = new Parts();
    P.box(0.5, 0.85, 0.04, 0x1d2433, 'METAL', 0, 0, 0);
    P.box(0.42, 0.18, 0.045, 0x9cb4cc, 'METAL', 0, 0.22, 0.003);
    P.box(0.36, 0.06, 0.05, 0xe8e8e8, 'FLAT', 0, -0.1, 0.006);
    const m = P.mesh(M.matChar);
    m.position.set(0.02, -0.25, 0.08); m.rotation.set(0, 0, 0);
    rig.elL.add(m); rig.shield = m;
  };

  // ───────── 2 kemikli IK (omuz → dirsek → el) ─────────
  const DOWN = new V3(0, -1, 0);
  const _d = new V3(), _ax = new V3(), _u = new V3(), _E = new V3(), _f = new V3(), _qa = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  function solveArm(sh, el, T, pole, a, b, k) {
    const S = sh.position;
    _d.subVectors(T, S);
    let dist = _d.length();
    if (dist < 1e-4) return;
    _d.divideScalar(dist);
    dist = U.clamp(dist, 0.08, a + b - 0.002);
    const cosA = U.clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1);
    const A = Math.acos(cosA);
    _ax.crossVectors(_d, pole);
    if (_ax.lengthSq() < 1e-6) _ax.set(1, 0, 0);
    _ax.normalize();
    _u.copy(_d).applyAxisAngle(_ax, A);
    _E.copy(S).addScaledVector(_u, a);
    _f.subVectors(T, _E).normalize();
    _qa.setFromUnitVectors(DOWN, _u);
    sh.quaternion.slerp(_qa, k);
    _qi.copy(sh.quaternion).invert();
    _f.applyQuaternion(_qi);
    _qb.setFromUnitVectors(DOWN, _f);
    el.quaternion.slerp(_qb, k);
  }
  M.solveArm = solveArm;
  const POLE_L = new V3(0.7, -1, -0.3).normalize(), POLE_R = new V3(-0.8, -1, -0.3).normalize();
  const POLE_LS = new V3(1, -0.4, 0).normalize(), POLE_RS = new V3(-1, -0.3, 0.1).normalize();

  function fk(sh, el, sx, sz, ex, k) {
    _e.set(sx, 0, sz); _qa.setFromEuler(_e); sh.quaternion.slerp(_qa, k);
    _e.set(ex, 0, 0); _qa.setFromEuler(_e); el.quaternion.slerp(_qa, k);
  }
  function setRotX(o, v, k) { o.rotation.x += (v - o.rotation.x) * k; }

  const _gp = new V3(), _gq = new THREE.Quaternion(), _gm = new THREE.Matrix4(), _tL = new V3(), _tR = new V3();
  /*
    st: { speed, legYaw, back, crouch(0..1), aim(0..1), pitch, armed, wkind('rifle'|'pistol'), reload(-1|0..1),
          pose('normal'|'dead'|'downed'|'surrender'|'cuffed'|'salute'|'radio'|'sit'|'cower'|'kneel'|'interact'|'talk'|'limp'),
          fire(0..1), torsoYaw }
  */
  M.animate = function (R, st, dt) {
    const k = 1 - Math.exp(-14 * dt), kf = 1 - Math.exp(-22 * dt), ks = 1 - Math.exp(-6 * dt);
    R.t += dt;
    const sp = st.speed || 0, pose = st.pose || 'normal';
    const crouch = st.crouch || 0;
    const run = sp > 5.2;
    const stride = run ? 2.4 : 1.55;
    R.phase += (st.back ? -1 : 1) * sp * dt / stride * Math.PI * 2;
    const ph = R.phase;
    let amp = U.clamp(sp / 3.4, 0, 1) * (run ? 0.85 : 0.55);
    if (pose === 'limp') amp *= 0.7;
    // ── bacaklar
    const s = Math.sin(ph), c = Math.cos(ph);
    let thL = -s * amp, thR = s * amp;
    let knL = Math.max(0, c) * amp * 1.7 + 0.06, knR = Math.max(0, -c) * amp * 1.7 + 0.06;
    let hipsY = 0.95 - Math.abs(s) * 0.045 * amp - (pose === 'limp' ? Math.max(0, s) * 0.06 : 0);
    let lean = (run ? 0.22 : 0.05) + amp * 0.05;
    if (crouch > 0) {
      const cs = crouch;
      thL = U.lerp(thL, -1.15 + thL * 0.55, cs); thR = U.lerp(thR, -1.15 + thR * 0.55, cs);
      knL = U.lerp(knL, 1.75 + knL * 0.3, cs); knR = U.lerp(knR, 1.75 + knR * 0.3, cs);
      hipsY = U.lerp(hipsY, 0.58 - Math.abs(s) * 0.02 * amp, cs);
      lean = U.lerp(lean, 0.32, cs);
    }
    let bodyX = 0, bodyY = 0;
    let legYaw = st.legYaw || 0;
    if (pose === 'dead') { bodyX = -1.52; bodyY = 0.14; thL = -0.1; thR = 0.15; knL = 0.3; knR = 0.1; hipsY = 0.95; lean = 0; legYaw = 0; }
    else if (pose === 'downed') { bodyX = -1.35; bodyY = 0.2; thL = -0.6; thR = -0.2; knL = 1.0; knR = 0.4; hipsY = 0.95; lean = -0.3; legYaw = 0; }
    else if (pose === 'sit') { thL = -1.55; thR = -1.55; knL = 1.5; knR = 1.5; hipsY = 0.5; lean = 0.08; legYaw = 0; }
    else if (pose === 'cuffed') { thL = 0.05; thR = 0.05; knL = 1.6; knR = 1.6; hipsY = 0.48; lean = 0.1; legYaw = 0; }
    else if (pose === 'kneel' || pose === 'cower') { thL = -1.4; thR = 0.2; knL = 1.5; knR = 1.7; hipsY = 0.52; lean = pose === 'cower' ? 0.6 : 0.35; legYaw = 0; }
    R.cur.hipsY += (hipsY - R.cur.hipsY) * k;
    R.cur.lean += (lean - R.cur.lean) * k;
    R.cur.bodyX += (bodyX - R.cur.bodyX) * (pose === 'dead' ? 1 - Math.exp(-5 * dt) : k);
    R.cur.bodyY += (bodyY - R.cur.bodyY) * k;
    R.body.rotation.x = R.cur.bodyX; R.body.position.y = R.cur.bodyY;
    R.hips.position.y = R.cur.hipsY; R.torso.position.y = R.cur.hipsY;
    R.hips.rotation.y += (legYaw - R.hips.rotation.y) * k;
    setRotX(R.thL, thL, kf); setRotX(R.thR, thR, kf); setRotX(R.knL, knL, kf); setRotX(R.knR, knR, kf);
    // ── gövde / baş
    const pitch = st.pitch || 0, aim = st.aim || 0;
    let tLean = R.cur.lean - pitch * 0.35 * aim;
    if (pose === 'talk') tLean += Math.sin(R.t * 2) * 0.02;
    R.torso.rotation.x += (tLean - R.torso.rotation.x) * k;
    R.torso.rotation.y += ((st.torsoYaw || 0) - R.torso.rotation.y) * k;
    const breathe = Math.sin(R.t * 1.6) * 0.008;
    R.torso.position.y += breathe;
    let neckX = -pitch * 0.55 * Math.max(aim, 0.4);
    if (pose === 'dead' || pose === 'downed') neckX = 0.2;
    if (pose === 'cower') neckX = 0.5;
    setRotX(R.neck, neckX, k);
    // ── kollar
    const armed = st.armed && R.weapon && !['dead', 'downed', 'surrender', 'cuffed', 'salute', 'sit', 'cower', 'kneel'].includes(pose);
    if (R.gunMesh) R.gunMesh.visible = !!(R.weapon && st.showWeapon !== false && pose !== 'surrender' && pose !== 'cuffed');
    const W = M.gunDef(R);
    const isPistol = W && (W.kind === 'pistol' || W.kind === 'knife');
    if (armed) {
      // silah yuvası hedefi
      let gx, gy, gz, rx, ry, rz = 0;
      const fire = st.fire || 0;
      if (isPistol) {
        gx = U.lerp(-0.05, -0.02, aim); gy = U.lerp(0.24, 0.42, aim); gz = U.lerp(0.3, 0.44, aim);
        rx = U.lerp(0.9, -pitch * 0.65, aim); ry = U.lerp(0.2, 0, aim);
      } else {
        gx = U.lerp(-0.06, -0.075, aim); gy = U.lerp(0.3, 0.42, aim); gz = U.lerp(0.3, 0.33, aim);
        rx = U.lerp(0.55, -pitch * 0.65, aim); ry = U.lerp(0.4, 0.02, aim);
      }
      if (run && aim < 0.3) { rx = 0.8; ry = 0.6; gy -= 0.04; }
      gz -= fire * 0.04; rx -= fire * 0.09;
      if (st.reload >= 0) { const rp = Math.sin(st.reload * Math.PI); rz += rp * 0.5; rx += rp * 0.25; gy -= rp * 0.03; }
      R.gunPos.x += (gx - R.gunPos.x) * kf; R.gunPos.y += (gy - R.gunPos.y) * kf; R.gunPos.z += (gz - R.gunPos.z) * kf;
      R.gunRot.x += (rx - R.gunRot.x) * kf; R.gunRot.y += (ry - R.gunRot.y) * kf; R.gunRot.z += (rz - R.gunRot.z) * kf;
      R.gun.position.copy(R.gunPos); R.gun.rotation.copy(R.gunRot);
      R.gun.updateMatrix();
      _tR.copy(W.grip).applyMatrix4(R.gun.matrix);
      if (st.reload >= 0) {
        const t = st.reload;
        const fore = _tL.copy(W.fore).applyMatrix4(R.gun.matrix);
        const pouch = _gp.set(0.12, 0.22, 0.2);
        const magw = new V3(0, -0.12, isPistol ? -0.02 : 0.09).applyMatrix4(R.gun.matrix);
        if (t < 0.35) fore.lerp(magw, t / 0.35);
        else if (t < 0.65) fore.copy(magw).lerp(pouch, Math.sin((t - 0.35) / 0.3 * Math.PI));
        else fore.copy(magw).lerp(_tL.copy(W.fore).applyMatrix4(R.gun.matrix), (t - 0.65) / 0.35);
        _tL.copy(fore);
      } else if (R.shield) {
        _tL.set(0.16, 0.36, 0.32);
      } else {
        _tL.copy(W.fore).applyMatrix4(R.gun.matrix);
      }
      solveArm(R.shR, R.elR, _tR, POLE_R, UA, FA, kf);
      solveArm(R.shL, R.elL, _tL, POLE_L, UA, FA, kf);
    } else {
      // silah sırtta (tüfek) veya gizli
      if (R.weapon && !isPistol) { R.gun.position.set(0.02, 0.32, -0.2); R.gun.rotation.set(0.0, Math.PI / 2, 0.85); }
      else if (R.weapon) { R.gun.position.set(-0.2, -0.12, 0.05); R.gun.rotation.set(1.5, 0, 0); }
      const sw = amp * 0.75;
      switch (pose) {
        case 'surrender': fk(R.shL, R.elL, -2.75, 0.35, -0.6, k); fk(R.shR, R.elR, -2.75, -0.35, -0.6, k); break;
        case 'cuffed': fk(R.shL, R.elL, 0.55, -0.25, -1.1, k); fk(R.shR, R.elR, 0.55, 0.25, -1.1, k); break;
        case 'dead': fk(R.shL, R.elL, -0.4, 1.1, -0.3, ks); fk(R.shR, R.elR, -0.2, -1.2, -0.2, ks); break;
        case 'downed': _tL.set(0.08, 0.28, 0.16); _tR.set(-0.06, 0.32, 0.18); solveArm(R.shL, R.elL, _tL, POLE_L, UA, FA, k); solveArm(R.shR, R.elR, _tR, POLE_R, UA, FA, k); break;
        case 'salute': _tR.set(-0.08, 0.8, 0.13); solveArm(R.shR, R.elR, _tR, POLE_RS, UA, FA, k); fk(R.shL, R.elL, 0, 0.06, -0.05, k); break;
        case 'radio': _tL.set(0.13, 0.74, 0.04); solveArm(R.shL, R.elL, _tL, POLE_LS, UA, FA, k); fk(R.shR, R.elR, -s * sw, -0.08, -0.3, k); break;
        case 'sit': _tL.set(0.16, 0.18, 0.42 + Math.sin(R.t * 9) * 0.01); _tR.set(-0.16, 0.18, 0.42 + Math.cos(R.t * 8) * 0.01); solveArm(R.shL, R.elL, _tL, POLE_L, UA, FA, k); solveArm(R.shR, R.elR, _tR, POLE_R, UA, FA, k); break;
        case 'cower': _tL.set(0.1, 0.82, 0.12); _tR.set(-0.1, 0.82, 0.12); solveArm(R.shL, R.elL, _tL, POLE_LS, UA, FA, k); solveArm(R.shR, R.elR, _tR, POLE_RS, UA, FA, k); break;
        case 'kneel': case 'interact': {
          const yy = pose === 'kneel' ? -0.2 : 0.2;
          _tR.set(-0.1, yy + Math.sin(R.t * 6) * 0.03, 0.5); _tL.set(0.12, yy + Math.cos(R.t * 5) * 0.03, 0.46);
          solveArm(R.shL, R.elL, _tL, POLE_L, UA, FA, k); solveArm(R.shR, R.elR, _tR, POLE_R, UA, FA, k); break;
        }
        case 'talk': fk(R.shL, R.elL, -0.3 + Math.sin(R.t * 2.7) * 0.15, 0.1, -0.9 + Math.sin(R.t * 3.1) * 0.2, k); fk(R.shR, R.elR, -0.2 + Math.cos(R.t * 2.2) * 0.12, -0.1, -0.7, k); break;
        default:
          fk(R.shL, R.elL, s * sw, 0.07 + crouch * 0.1, -0.2 - sw * 0.5 - crouch * 0.4, k);
          fk(R.shR, R.elR, -s * sw, -0.07 - crouch * 0.1, -0.2 - sw * 0.5 - crouch * 0.4, k);
      }
    }
  };

  // ───────── Basit nesneler (etkileşim) ─────────
  M.documentMesh = function () {
    const g = new THREE.Group();
    const P = new Parts();
    P.box(0.32, 0.03, 0.24, 0x8a6a3a, 'FLAT', 0, 0.015, 0);
    g.add(P.mesh(M.matProp));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), M.matPaper);
    paper.rotation.x = -Math.PI / 2; paper.position.y = 0.032; g.add(paper);
    return g;
  };
  M.evidenceBag = function (color = 0xd8c88a) {
    const P = new Parts();
    P.box(0.22, 0.06, 0.16, color, 'FABRIC', 0, 0.03, 0);
    P.box(0.22, 0.01, 0.04, 0xb02020, 'FLAT', 0, 0.065, -0.05);
    return P.mesh(M.matProp);
  };
  M.laptop = function () {
    const g = new THREE.Group();
    const P = new Parts();
    P.box(0.34, 0.02, 0.24, 0x2a2c30, 'METAL', 0, 0.01, 0);
    P.box(0.34, 0.22, 0.015, 0x2a2c30, 'METAL', 0, 0.12, -0.12, -0.25);
    g.add(P.mesh(M.matProp));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), M.matScreen);
    scr.position.set(0, 0.12, -0.11); scr.rotation.x = -0.25; g.add(scr);
    return g;
  };
})();
