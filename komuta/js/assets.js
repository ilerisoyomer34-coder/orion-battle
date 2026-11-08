/* KOMUTA — dış GLB modelleri: yükleme, doku bağlama, önbellek, örnek üretme
   Kaynak: call-of-duty projesi (lisans atıfları K.ASSETDATA içinde ve Arşiv → Lisanslar ekranında) */
'use strict';
(function () {
  const A = K.assets = {
    loader: null, tl: null, cache: {}, tex: {}, chars: {}, weapons: {}, heli: null,
    pendingWeapons: {}, failed: {}, enabled: true,
    init() {
      if (!THREE.GLTFLoader) { this.enabled = false; return; }
      this.loader = new THREE.GLTFLoader();
      this.tl = new THREE.TextureLoader();
    },
    // telefon (düşük kalite): assets/lo/ altındaki küçük sürümler (normal/ORM dokusu yok, 256–512 px)
    lo() { return K.game && K.game.qualityLevel && K.game.qualityLevel() === 'low'; },
    tierUrl(url) { return this.lo() && /^assets\/(world|characters|props|weapons)\//.test(url) ? 'assets/lo/' + url.slice(7) : url; },
    loadGLB(url0) {
      const url = this.tierUrl(url0);
      if (!this.cache[url]) {
        // .glb.json: GLB baytları base64 olarak JSON içinde (yalnız JSON sunan barındırmalar için paketleme)
        if (/\.glb\.json$/.test(url)) {
          const base = url.slice(0, url.lastIndexOf('/') + 1);
          this.cache[url] = fetch(url).then((r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }).then((j) => {
            const bin = atob(j.glb), n = bin.length, buf = new Uint8Array(n);
            for (let i = 0; i < n; i++) buf[i] = bin.charCodeAt(i);
            j.glb = null;
            return new Promise((res, rej) => this.loader.parse(buf.buffer, base, res, rej));
          });
        } else this.cache[url] = new Promise((res, rej) => this.loader.load(url, res, undefined, rej));
      }
      return this.cache[url];
    },
    // düşük kalitede (telefon) dokuları küçült: GPU belleği ~4 kat azalır
    texMax() { const q = K.game && K.game.qualityLevel ? K.game.qualityLevel() : 'high'; return q === 'low' ? 512 : q === 'med' ? 1024 : 4096; },
    shrinkTex(t, max) {
      if (!t || !t.image || t.userData.shrunk) return;
      const im = t.image, w = im.width || im.naturalWidth, h = im.height || im.naturalHeight;
      if (!w || !h || Math.max(w, h) <= max) return;
      const k = max / Math.max(w, h), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      try { c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); } catch (e) { return; }
      if (im.close) try { im.close(); } catch (e) { /* ImageBitmap zaten kapalı */ }
      t.image = c; t.userData.shrunk = true; t.needsUpdate = true;
    },
    shrink(root) {
      const max = this.texMax(); if (max >= 4096 || !root) return;
      const seen = new Set();
      root.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!m) continue;
          for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) { const t = m[k]; if (t && !seen.has(t)) { seen.add(t); this.shrinkTex(t, max); } }
        }
      });
    },
    texture(url, srgb) {
      const key = url + (srgb ? '#s' : '');
      if (!this.tex[key]) {
        const max = this.texMax();
        const t = this.tl.load(url, (tt) => this.shrinkTex(tt, max));
        t.flipY = false;                      // glTF UV düzeni
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        this.tex[key] = t;
      }
      return this.tex[key];
    },
    // malzeme adına göre dokuları bağla (map, normal, ORM: R=AO, G=pürüz, B=metal)
    applyMaterials(root, mats) {
      if (!mats) return;
      root.traverse((o) => {
        if (!o.isMesh) return;
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of list) {
          const d = mats[m.name]; if (!d) continue;
          if (d.map) { m.map = this.texture(d.map, true); m.color.set(0xffffff); }
          if (d.normalMap && !this.lo()) m.normalMap = this.texture(d.normalMap, false);
          if (d.ormMap && !this.lo()) { const t = this.texture(d.ormMap, false); m.roughnessMap = t; m.metalnessMap = t; m.roughness = 1; m.metalness = 1; }
          if (d.emissiveMap) { m.emissiveMap = this.texture(d.emissiveMap, true); m.emissive = new THREE.Color(0xffffff); }
          m.needsUpdate = true;
        }
      });
    },
    // ── Karakterler (açılışta)
    async loadCharacters(onStep, only) {
      if (!this.enabled) return;
      const C = K.ASSETDATA.characters;
      const ids = only || Object.keys(C);
      let i = 0;
      for (const id of ids) {
        const d = C[id];
        try {
          const g = await this.loadGLB(d.file);
          this.applyMaterials(g.scene, d.materials); this.shrink(g.scene);
          let lod = null;
          if (d.lod) { try { const gl = await this.loadGLB(d.lod); this.applyMaterials(gl.scene, d.materials); this.shrink(gl.scene); lod = gl.scene; } catch (e) { lod = null; } }
          this.chars[id] = { id, scene: g.scene, lod, data: d };
          K.glbChar.prepare(this.chars[id]);
        } catch (e) { delete this.chars[id]; this.failed[id] = e.message || String(e); console.warn('Karakter modeli yüklenemedi:', id, e); }
        onStep && onStep(++i / ids.length, id);
        await new Promise((r) => setTimeout(r, 0));   // menü akıcı kalsın
      }
    },
    // menü açıldıktan sonra: askerler, siviller, araçlar, helikopter (görev başlamadan önce beklenir)
    background(onProgress) {
      if (this.bg) return this.bg;
      const C = K.ASSETDATA.characters;
      const soldiers = Object.keys(C).filter((id) => !C[id].civ), civs = Object.keys(C).filter((id) => C[id].civ);
      const vf = K.wa.vehicleFiles ? K.wa.vehicleFiles() : [];
      const total = soldiers.length + civs.length + vf.length + 1;
      let done = 0;
      const tick = () => { done++; this.bgProgress = done / total; onProgress && onProgress(this.bgProgress); };
      this.bgProgress = 0;
      this.bg = (async () => {
        await this.loadCharacters(tick, soldiers);
        this.preloadWeapons(['kr4', 'pistol_s', 'ak47']);
        await this.loadHeli(); tick();
        await this.loadCharacters(tick, civs);
        K.models.bindCivLooks();
        if (K.wa.loadVehicles) await K.wa.loadVehicles(tick);
        this.bgDone = true;
        K.bus.emit('assetsReady');
      })();
      return this.bg;
    },
    async loadHeli() {
      if (!this.enabled) return;
      const d = K.ASSETDATA.heli;
      try { const g = await this.loadGLB(d.file); this.shrink(g.scene); this.heli = { scene: g.scene, data: d }; }
      catch (e) { this.failed.heli = e.message || String(e); console.warn('Helikopter modeli yüklenemedi', e); }
    },
    // ── Silahlar (talep üzerine)
    weaponReady(asset) { return !!this.weapons[asset]; },
    requestWeapon(asset) {
      if (!this.enabled || !asset || this.weapons[asset] || this.pendingWeapons[asset] || this.failed[asset]) return;
      const d = K.ASSETDATA.weapons[asset]; if (!d) return;
      this.pendingWeapons[asset] = this.loadGLB(d.file).then((g) => {
        this.applyMaterials(g.scene, d.materials); this.shrink(g.scene);
        g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; const m = o.material; if (m && m.transparent && m.opacity > 0.95) m.transparent = false; } });
        this.weapons[asset] = { scene: g.scene, data: d };
        delete this.pendingWeapons[asset];
        K.bus.emit('weaponAssetReady', asset);
      }).catch((e) => { this.failed[asset] = e.message || String(e); delete this.pendingWeapons[asset]; console.warn('Silah modeli yüklenemedi:', asset, e); });
    },
    weaponClone(asset) {
      const w = this.weapons[asset]; if (!w) return null;
      const c = w.scene.clone(true);
      c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return c;
    },
    preloadWeapons(ids) { for (const id of ids) { const W = K.WEAPONS[id]; if (W && W.asset) this.requestWeapon(W.asset); } },
    // ── Lisans atıfları (CC BY 4.0 gereği)
    credits() {
      const out = [];
      const seen = new Set();
      const add = (what, c, change) => { if (!c) return; const k = c.source || c.title; if (seen.has(k + what)) return; seen.add(k + what); out.push({ what, title: c.title, author: c.author, license: c.license, source: c.source, change }); };
      const D = K.ASSETDATA;
      for (const id in D.characters) {
        const c = D.characters[id];
        if (c.civ) add('Sivil: ' + (c.label || id), c.credit, 'Sadeleştirildi, dokular küçültüldü (WebP), boy 1,75 m\'ye ölçeklendi; kemikler oyunun prosedürel animasyonuyla sürülür');
        else add(id === 'soldier' ? 'Düşman askerleri' : 'Tim askerleri (Demir, Kaya, Yıldız)', c.credit, 'Üç asker ayrıldı, T pozuna getirildi, sadeleştirildi (call-of-duty projesi); oyunda kemikler prosedürel animasyonla sürülür');
      }
      if (D.world && D.world.credits) for (const k in D.world.credits) { const c = D.world.credits[k]; add(c.what || k, c, c.change || 'Dokular küçültüldü (WebP), ağlar nicemlendi; oyunda ölçeklenip birleştirilerek yerleştirildi'); }
      add('Nakliye helikopteri', D.heli.credit, 'Sadeleştirildi, pervaneler ayrıldı, gövde askerî yeşile boyandı');
      for (const id in D.weapons) {
        const W = Object.values(K.WEAPONS).find((w) => w.asset === id);
        add('Silah: ' + (W ? W.name : id), D.weapons[id].credit, 'Yönlendirildi, ölçeklendi, marka yazıları silindi; dokular 1024 px\'e küçültüldü');
      }
      return out;
    },
  };
})();
