/* KOMUTA — Sketchfab harita varlıkları: bina setleri, sokak eşyaları, ağaçlar, park hâlindeki araçlar
   Statik yerleşimler malzeme × bölge (80 m) başına tek ağda birleştirilir; çarpıştırıcılar prosedürel kalır.
   Lisans atıfları K.ASSETDATA.world.credits içinde ve Arşiv → Lisanslar ekranında. */
'use strict';
(function () {
  const V3 = THREE.Vector3, M4 = THREE.Matrix4;
  const CELL = 80;
  const _m = new M4(), _m2 = new M4(), _n3 = new THREE.Matrix3(), _v = new V3(), _q = new THREE.Quaternion(), _s = new V3(), _box = new THREE.Box3();

  const WA = K.wa = {
    enabled: false, models: {}, byKind: {}, buckets: new Map(), placed: 0, capture: false, failed: {},

    data() { return K.ASSETDATA && K.ASSETDATA.world; },
    has(id) { return this.enabled && !!this.models[id]; },
    list(kind, style) { const L = this.byKind[kind] || []; return style ? L.filter((m) => m.def.style && m.def.style.includes(style)) : L; },

    // ── yükleme (dünya kurulmadan önce)
    async load(onStep) {
      const D = this.data(); if (!D || !K.assets.enabled) return;
      const keys = Object.keys(D.files);
      let i = 0;
      const scenes = {};
      for (const k of keys) {
        try { const g = await K.assets.loadGLB(D.files[k]); scenes[k] = g.scene; }
        catch (e) { this.failed[k] = e.message || String(e); console.warn('Harita modeli yüklenemedi:', k, e); }
        onStep && onStep(++i / keys.length, k);
      }
      this.scenes = scenes;
      for (const id in D.models) {
        const def = D.models[id], sc = scenes[def.file];
        if (!sc) continue;
        try { const m = this.prep(id, def, sc); if (m) { this.models[id] = m; (this.byKind[def.kind] || (this.byKind[def.kind] = [])).push(m); } }
        catch (e) { console.warn('Model hazırlanamadı', id, e); }
      }
      this.enabled = Object.keys(this.models).length > 0;
    },
    // düğümün ağlarını yerel çerçeveye al, tabanı y=0'a, merkezi x/z=0'a taşı; önü +z
    prep(id, def, scene) {
      scene.updateMatrixWorld(true);
      const node = def.node ? scene.getObjectByName(def.node) : scene;
      if (!node) { console.warn('Düğüm yok:', id, def.node); return null; }
      const inv = new M4().copy(node.matrixWorld).invert();
      const pre = new M4().makeRotationY(def.rotY || 0).multiply(new M4().makeScale(def.scale || 1, def.scale || 1, def.scale || 1));
      const skip = def.skip ? new RegExp(def.skip, 'i') : null;
      const parts = [], box = new THREE.Box3();
      node.traverse((o) => {
        if (!o.isMesh || !o.geometry || (skip && skip.test(o.name))) return;
        for (let p = o.parent; p && p !== node; p = p.parent) if (skip && skip.test(p.name)) return;
        const mx = pre.clone().multiply(inv).multiply(o.matrixWorld);
        const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
        box.union(_box.copy(g.boundingBox).applyMatrix4(mx));
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.length > 1 && g.groups.length) for (const gr of g.groups) parts.push({ geo: g, mat: mats[gr.materialIndex], m: mx, group: gr });
        else parts.push({ geo: g, mat: mats[0], m: mx });
      });
      if (!parts.length) return null;
      const c = box.getCenter(new V3()), sz = box.getSize(new V3());
      const t = new M4().makeTranslation(-c.x, -box.min.y, -c.z);
      for (const p of parts) p.m.premultiply(t);
      for (const p of parts) this.fixMat(p.mat, def);
      return { id, def, parts, w: sz.x, h: sz.y, d: sz.z };
    },
    fixMat(m, def) {
      if (!m || m.userData.waFixed) return;
      m.userData.waFixed = true;
      if (m.transparent && m.opacity > 0.97 && !m.alphaMap) { m.transparent = false; }
      if (m.map && m.alphaTest === 0 && m.transparent) { m.alphaTest = 0.4; m.transparent = false; }
      if (def.kind === 'tree' || /leaf|leaves|foliage|bush|grass/i.test(m.name)) { m.alphaTest = Math.max(m.alphaTest, 0.45); m.transparent = false; m.side = THREE.DoubleSide; }
      if (m.metalness > 0.9 && !m.metalnessMap) m.metalness = 0.6;   // ortam haritası olmadığından aşırı koyu metal olmasın
      if (m.map) m.map.anisotropy = 4;
      m.needsUpdate = true;
    },

    // ── yerleşim kaydı: matris = dünya dönüşümü (model yerel çerçevesinde: taban merkez, ön +z)
    add(id, mx, tint) {
      const md = this.models[id]; if (!md) return false;
      _v.setFromMatrixPosition(mx);
      const ck = Math.floor(_v.x / CELL) * 1000 + Math.floor(_v.z / CELL);
      for (const p of md.parts) {
        const tinted = tint !== undefined && md.def.tint;
        const key = p.mat.uuid + (tinted ? '#t' : '') + '|' + ck;
        let b = this.buckets.get(key);
        if (!b) { b = { mat: p.mat, tinted, items: [], cast: md.def.cast !== false, kind: md.def.kind }; this.buckets.set(key, b); }
        b.items.push({ p, mx: mx.clone().multiply(p.m), tint });
      }
      this.placed++;
      return true;
    },
    put(id, x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, tint) {
      _q.setFromAxisAngle(_v.set(0, 1, 0), ry);
      return this.add(id, _m.compose(new V3(x, y, z), _q, _s.set(sx, sy, sz)), tint);
    },
    // Parts dönüşüm yığınının içinden (yerel konum) çağrılan eşyalar için
    putP(P, id, x, y, z, ry = 0, s = 1, tint) {
      _q.setFromAxisAngle(_v.set(0, 1, 0), ry);
      const local = new M4().compose(new V3(x, y, z), _q, _s.set(s, s, s));
      return this.add(id, P.top.clone().multiply(local), tint);
    },
    pick(kind, seed, style) {
      const L = this.list(kind, style); if (!L.length) return null;
      return L[Math.abs(Math.floor(seed)) % L.length].id;
    },

    // ── birleşik ağları üret
    build(scene) {
      const out = [];
      const tintMats = new Map();
      for (const b of this.buckets.values()) {
        let nv = 0, ni = 0, hasUV = true, hasN = true;
        for (const it of b.items) {
          const g = it.p.geo, cnt = it.p.group ? it.p.group.count : (g.index ? g.index.count : g.attributes.position.count);
          ni += cnt; nv += it.p.group ? cnt : g.attributes.position.count;
          if (!g.attributes.uv) hasUV = false;
          if (!g.attributes.normal) hasN = false;
        }
        if (!ni) continue;
        const pos = new Float32Array(nv * 3), nor = hasN ? new Float32Array(nv * 3) : null, uv = hasUV ? new Float32Array(nv * 2) : null;
        const col = b.tinted ? new Float32Array(nv * 3) : null;
        const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
        let vo = 0, io = 0;
        const c = new THREE.Color();
        for (const it of b.items) {
          const g = it.p.geo, P = g.attributes.position, N = g.attributes.normal, T = g.attributes.uv, I = g.index;
          _n3.getNormalMatrix(it.mx);
          if (col) c.set(it.tint === undefined ? 0xffffff : it.tint);
          if (it.p.group) {
            // grup: yalnız grubun üçgenlerini, köşeleri açarak al
            const gr = it.p.group;
            for (let k = 0; k < gr.count; k++) {
              const vi = I ? I.getX(gr.start + k) : gr.start + k;
              writeV(vi, vo + k);
              idx[io + k] = vo + k;
            }
            vo += gr.count; io += gr.count;
          } else {
            const n = P.count;
            for (let vi = 0; vi < n; vi++) writeV(vi, vo + vi);
            if (I) for (let k = 0; k < I.count; k++) idx[io + k] = vo + I.getX(k);
            else for (let k = 0; k < n; k++) idx[io + k] = vo + k;
            io += I ? I.count : n; vo += n;
          }
          function writeV(vi, o) {
            _v.fromBufferAttribute(P, vi).applyMatrix4(it.mx);
            pos[o * 3] = _v.x; pos[o * 3 + 1] = _v.y; pos[o * 3 + 2] = _v.z;
            if (nor) { _v.fromBufferAttribute(N, vi).applyMatrix3(_n3).normalize(); nor[o * 3] = _v.x; nor[o * 3 + 1] = _v.y; nor[o * 3 + 2] = _v.z; }
            if (uv) { uv[o * 2] = T.getX(vi); uv[o * 2 + 1] = T.getY(vi); }
            if (col) { col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b; }
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        if (nor) g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.setIndex(new THREE.BufferAttribute(idx.subarray(0, io), 1));
        if (!nor) g.computeVertexNormals();
        g.computeBoundingSphere(); g.computeBoundingBox();
        let mat = b.mat;
        if (b.tinted) { mat = tintMats.get(b.mat.uuid); if (!mat) { mat = b.mat.clone(); mat.vertexColors = true; tintMats.set(b.mat.uuid, mat); } }
        const mesh = new THREE.Mesh(g, mat);
        mesh.castShadow = b.cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        mesh.userData.wa = b.kind;
        scene.add(mesh); out.push(mesh);
      }
      this.meshes = out;
      this.buckets.clear();
      return out;
    },

    // ── prosedürel sahne eşyalarını dünya kurulumu sırasında GLB örnekleriyle değiştir
    wrapProps() {
      if (this._wrapped) return; this._wrapped = true;
      const Pr = K.models.props, self = this;
      const live = (P) => self.capture && P === K.world.P;
      const wrap = (name, fn) => { const orig = Pr[name]; if (!orig) return; Pr[name] = function (P, ...a) { if (live(P) && fn(P, ...a) !== false) return; return orig.call(this, P, ...a); }; };
      const seed = (x, z) => Math.abs(Math.floor(x * 7.31 + z * 3.17));
      const fitOne = (P, kind, x, y, z, ry, targetLen, axis = 'w', tint, style) => {
        const id = self.pick(kind, seed(x, z), style); if (!id) return false;
        const md = self.models[id]; const s = targetLen / (md[axis] || 1);
        return self.putP(P, id, x, y, z, ry, s, tint);
      };
      wrap('lampPost', (P, x, y, z, ry) => fitOne(P, 'lamp', x, y, z, ry + (self.models[self.pick('lamp', 0)] ? self.models[self.pick('lamp', 0)].def.armRot || 0 : 0), 6.6, 'h'));
      wrap('trafficLight', (P, x, y, z, ry) => fitOne(P, 'trafficLight', x, y, z, ry, 4.8, 'h'));
      wrap('tree', (P, x, y, z, s = 1) => fitOne(P, 'tree', x, y, z, (seed(x, z) % 628) / 100, 6.4 * s * (0.85 + (seed(z, x) % 30) / 100), 'h'));
      wrap('pine', (P, x, y, z, s = 1) => fitOne(P, 'pine', x, y, z, (seed(x, z) % 628) / 100, 8.5 * s * (0.85 + (seed(z, x) % 30) / 100), 'h') || fitOne(P, 'tree', x, y, z, 0, 7 * s, 'h'));
      wrap('bench', (P, x, y, z, ry) => fitOne(P, 'bench', x, y, z, ry, 1.8, 'w'));
      wrap('barrier', (P, x, y, z, ry, c) => fitOne(P, 'barrier', x, y, z, ry, 2.0, 'w'));
      wrap('barrel', (P, x, y, z, c) => fitOne(P, 'barrel', x, y, z, (seed(x, z) % 628) / 100, 0.9, 'h', c));
      wrap('container', (P, x, y, z, ry, c) => fitOne(P, 'container', x, y, z, ry, 6.06, 'd', c));
      wrap('tent', (P, x, y, z, ry, c) => fitOne(P, 'tent', x, y, z, ry, 4.2, 'd'));
      wrap('sandbags', (P, x, y, z, ry, w = 2.4) => {
        const id = self.pick('sandbags', 0); if (!id) return false;
        const md = self.models[id], n = Math.max(1, Math.round(w / md.w)), seg = w / n;
        for (let i = 0; i < n; i++) {
          const t = -w / 2 + seg * (i + 0.5), c = Math.cos(ry), s = Math.sin(ry);
          self.putP(P, id, x + t * c, y, z - t * s, ry, seg / md.w);
        }
        return true;
      });
      const origCar = K.models.addStaticCar;
      K.models.addStaticCar = function (P, x, z, ry, kind, color) {
        if (live(P)) {
          const id = self.pick(kind === 'van' ? 'van' : 'car', seed(x, z));
          if (id) { const md = self.models[id]; const s = (kind === 'van' ? 5.0 : 4.4) / md.d; if (self.putP(P, id, x, 0, z, ry, s)) return; }
        }
        return origCar.call(this, P, x, z, ry, kind, color);
      };
    },
    // ── bina yerleşim planı: taban (x0,z0)-(x1,z1), hedef yükseklik h, stil
    // dönüş: { pieces: [{id,x,z,ry,sx,sy,sz}], h } veya null
    planBuilding(x0, z0, x1, z1, h, style, rnd, front) {
      const L = this.list('building', style);
      if (!L.length) return null;
      const W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const alongX = W >= D, Ls = alongX ? W : D, Ss = alongX ? D : W;
      const frontLong = alongX ? (front === 'pz' || front === 'nz') : (front === 'px' || front === 'nx');
      const cands = [];
      for (const md of L) {
        const lim = md.def.maxTile || 6;
        for (const rot of [0, 1]) {
          // rot 0: modelin genişliği (x) uzun kenar boyunca; rot 1: derinliği
          const pl = rot ? md.d : md.w, ps = rot ? md.w : md.d;
          const s = Ss / ps;
          const n = Math.max(1, Math.min(lim, Math.round(Ls / (pl * s))));
          const k = Ls / (n * pl * s);
          const hh = md.h * s;
          const hk = Math.min(1.25, Math.max(0.8, h / hh));
          const cost = Math.abs(Math.log(k)) * 2.2 + Math.abs(Math.log(hh * hk / h)) * 0.6 + Math.abs(Math.log(hk)) * 1.2 + Math.abs(Math.log(s)) * 0.5 + (n - 1) * 0.06 + ((rot ? frontLong : !frontLong) ? 0.45 : 0);
          cands.push({ md, rot, s, n, k, hk, cost });
        }
      }
      cands.sort((a, b) => a.cost - b.cost);
      const top = cands.filter((c) => c.cost < cands[0].cost + 0.18).slice(0, 4);
      const ch = top[Math.floor(rnd() * top.length)] || cands[0];
      if (ch.cost > 2.6) return null;
      const { md, rot, s, n, k, hk } = ch;
      // ön yüz yönü: front = 'px'|'nx'|'pz'|'nz' (sokağa bakan kenar)
      const pieces = [];
      const pl = (rot ? md.d : md.w) * s * k;
      for (let i = 0; i < n; i++) {
        const t = -Ls / 2 + pl * (i + 0.5);
        const px = alongX ? cx + t : cx, pz = alongX ? cz : cz + t;
        // model önü +z; uzun kenar x boyuncaysa ve rot=0 ise önü ±z'ye bakar
        let ry;
        if (alongX) ry = rot ? (front === 'px' ? Math.PI / 2 : -Math.PI / 2) : (front === 'nz' ? Math.PI : 0);
        else ry = rot ? (front === 'nz' ? Math.PI : 0) : (front === 'px' ? Math.PI / 2 : -Math.PI / 2);
        // ölçek: modelin yerel x/z'si dönüşe göre
        const sxL = rot ? s : s * k, szL = rot ? s * k : s;
        pieces.push({ id: md.id, x: px, z: pz, ry, sx: sxL, sy: s * hk, sz: szL });
      }
      return { pieces, h: md.h * s * hk };
    },
  };
})();
