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
    loadGLB(url) {
      if (!this.cache[url]) {
        // .glb.json: GLB baytları base64 olarak JSON içinde (yalnız JSON sunan barındırmalar için paketleme)
        if (/\.glb\.json$/.test(url)) {
          const base = url.slice(0, url.lastIndexOf('/') + 1);
          this.cache[url] = fetch(url).then((r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }).then((j) => {
            const bin = atob(j.glb), buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            return new Promise((res, rej) => this.loader.parse(buf.buffer, base, res, rej));
          });
        } else this.cache[url] = new Promise((res, rej) => this.loader.load(url, res, undefined, rej));
      }
      return this.cache[url];
    },
    texture(url, srgb) {
      const key = url + (srgb ? '#s' : '');
      if (!this.tex[key]) {
        const t = this.tl.load(url);
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
          if (d.normalMap) m.normalMap = this.texture(d.normalMap, false);
          if (d.ormMap) { const t = this.texture(d.ormMap, false); m.roughnessMap = t; m.metalnessMap = t; m.roughness = 1; m.metalness = 1; }
          if (d.emissiveMap) { m.emissiveMap = this.texture(d.emissiveMap, true); m.emissive = new THREE.Color(0xffffff); }
          m.needsUpdate = true;
        }
      });
    },
    // ── Karakterler (açılışta)
    async loadCharacters(onStep) {
      if (!this.enabled) return;
      const C = K.ASSETDATA.characters;
      const ids = Object.keys(C);
      let i = 0;
      for (const id of ids) {
        const d = C[id];
        try {
          const g = await this.loadGLB(d.file);
          this.applyMaterials(g.scene, d.materials);
          let lod = null;
          if (d.lod) { try { const gl = await this.loadGLB(d.lod); this.applyMaterials(gl.scene, d.materials); lod = gl.scene; } catch (e) { lod = null; } }
          this.chars[id] = { id, scene: g.scene, lod, data: d };
          K.glbChar.prepare(this.chars[id]);
        } catch (e) { this.failed[id] = e.message || String(e); console.warn('Karakter modeli yüklenemedi:', id, e); }
        onStep && onStep(++i / ids.length, id);
      }
    },
    async loadHeli() {
      if (!this.enabled) return;
      const d = K.ASSETDATA.heli;
      try { const g = await this.loadGLB(d.file); this.heli = { scene: g.scene, data: d }; }
      catch (e) { this.failed.heli = e.message || String(e); console.warn('Helikopter modeli yüklenemedi', e); }
    },
    // ── Silahlar (talep üzerine)
    weaponReady(asset) { return !!this.weapons[asset]; },
    requestWeapon(asset) {
      if (!this.enabled || !asset || this.weapons[asset] || this.pendingWeapons[asset] || this.failed[asset]) return;
      const d = K.ASSETDATA.weapons[asset]; if (!d) return;
      this.pendingWeapons[asset] = this.loadGLB(d.file).then((g) => {
        this.applyMaterials(g.scene, d.materials);
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
