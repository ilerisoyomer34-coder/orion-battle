/* KOMUTA — oyun çekirdeği: açılış, döngü, durumlar, görev akışı, etkileşim, intikal, ortam */
'use strict';
(function () {
  const U = K.U, V3 = THREE.Vector3, $ = U.$;
  const G = K.game = {
    state: 'boot', time: 0, actors: [], enemies: [], civs: [], squad: [], vehicles: [], player: null, fxMarkers: [],
    stats: {}, paused: false, cinematic: false, fps: 60, interaction: null, holdProg: 0, aimActor: null, followers: 0,

    async init() {
      const bar = $('bootBar'), txt = $('bootTxt');
      const step = (p, t) => new Promise((res) => { bar.style.width = Math.round(p * 100) + '%'; txt.textContent = t; setTimeout(res, 16); });
      K.save.load();
      K.input.init($('c'));
      await step(0.05, 'Grafik motoru hazırlanıyor');
      this.setupRenderer();
      await step(0.08, 'Prosedürel dokular üretiliyor');
      K.tex.build(); K.models.init();
      K.assets.init();
      await step(0.1, 'Şehir modelleri yükleniyor');
      await K.wa.load((p) => { bar.style.width = Math.round((0.1 + p * 0.15) * 100) + '%'; txt.textContent = 'Şehir modelleri yükleniyor (' + Math.round(p * 100) + '%)'; });
      K.bus.on('weaponAssetReady', (asset) => this.refreshWeaponModels(asset));
      await step(0.25, 'Şehir inşa ediliyor');
      this.scene = new THREE.Scene();
      this.dyn = new THREE.Group(); this.scene.add(this.dyn);
      const hemi = new THREE.HemisphereLight(0xbcd4ec, 0x5a5448, 0.9); this.scene.add(hemi); K.world.hemi = hemi;
      const amb = new THREE.AmbientLight(0x8090c0, 0); this.scene.add(amb); K.world.amb = amb;
      const sun = new THREE.DirectionalLight(0xfff4e0, 2.6); sun.castShadow = true;
      sun.shadow.camera.left = -70; sun.shadow.camera.right = 70; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
      sun.shadow.camera.near = 10; sun.shadow.camera.far = 420; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
      this.scene.add(sun); this.scene.add(sun.target); K.world.sun = sun;
      await new Promise((res) => setTimeout(res, 10));
      K.world.build(this.scene, (p, t) => { bar.style.width = Math.round((0.25 + p * 0.48) * 100) + '%'; txt.textContent = t; });
      await step(0.75, 'Navigasyon ızgarası hesaplanıyor');
      K.nav.build();
      await step(0.88, 'Harita ve efektler');
      K.fx.init(this.scene);
      K.cam.init(this.camera);
      K.ui.init();
      K.ui.buildMapImage();
      this.applyQuality();
      K.world.setEnv('dusk', 'clear');
      await step(1, 'Hazır');
      K.bus.on('pointerunlock', () => { if (this.state === 'playing' && !this.paused && !K.ui.dialogOpen && !K.ui.mapOpen && !K.ui.keypadOpen && !K.ui.modal && !this._intentUnlock && !K.input.touch.enabled) this.pause(); });
      $('boot').classList.add('hidden');
      this.toMenu();
      // askerler, siviller, araçlar ve helikopter menü açıkken yüklenir
      K.ui.assetProgress(0);
      K.assets.background((p) => K.ui.assetProgress(p)).then(() => {
        K.ui.assetProgress(1);
        if (this.state === 'menu' || this.state === 'hq') this.ambientHQ();
        K.pwa.precacheAll();
      });
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
      window.addEventListener('resize', () => this.resize());
    },
    setupRenderer() {
      const q = this.qualityLevel();
      const r = new THREE.WebGLRenderer({ canvas: $('c'), antialias: q !== 'low', powerPreference: 'high-performance' });
      r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      K.renderer = r;
      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.15, 2600);
      this.resize();
    },
    qualityLevel() {
      const s = K.save.data.settings.quality;
      if (s !== 'auto') return s;
      const mobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia('(pointer: coarse)').matches;
      return mobile ? 'low' : 'high';
    },
    applyQuality() {
      const q = this.qualityLevel(), r = K.renderer, dpr = window.devicePixelRatio || 1;
      r.setPixelRatio(q === 'high' ? Math.min(dpr, 2) : q === 'med' ? Math.min(dpr, 1.5) : Math.min(dpr, 1));
      const sun = K.world.sun;
      if (sun) { const size = q === 'high' ? 2048 : 1024; r.shadowMap.enabled = q !== 'low'; sun.castShadow = q !== 'low'; if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
      this.camera.far = q === 'low' ? 900 : 2600; this.camera.updateProjectionMatrix();
      K.world.setLampLightCount && K.world.setLampLightCount(q === 'high' ? 6 : q === 'med' ? 4 : 2);
      this.charShadows = q === 'high' ? 45 : q === 'med' ? 25 : 0;
      this.resize();
    },
    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      K.renderer.setSize(w, h, false);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      if (K.fx.sparks) K.fx.setScale(K.renderer.domElement.height, this.camera.fov);
    },
    // ═════════ Durumlar ═════════
    toMenu() {
      this.clearMission(); this.state = 'menu'; this.paused = false; K.pwa.releaseWake();
      K.world.setEnv('dusk', 'clear');
      this.ambientHQ();
      K.cam.mode = 'orbit'; K.cam.orbitCenter = { x: -160, y: 0, z: 195 }; K.cam.orbitR = 70; K.cam.orbitH = 24;
      K.ui.updateMenu(); K.ui.screen('menu');
      K.audio.setLoop('music', 0.25, 0.2); K.audio.setLoop('pulse', 0); K.audio.setLoop('engine', 0);
    },
    toHQ(tab) {
      K.pwa.releaseWake();
      if (this.state !== 'hq') { this.clearMission(); K.world.setEnv('dusk', 'clear'); this.ambientHQ(); }
      this.state = 'hq'; this.paused = false;
      K.cam.mode = 'orbit'; K.cam.orbitCenter = { x: -170, y: 0, z: 182 }; K.cam.orbitR = 26; K.cam.orbitH = 9;
      K.ui.hq(tab || 'missions');
      K.audio.setLoop('pulse', 0); K.audio.setLoop('engine', 0); K.audio.setLoop('music', 0.25, 0.15);
    },
    openBriefing(id) {
      const def = K.MISSIONS.find((m) => m.id === id); if (!def) return;
      if (this.state !== 'hq') { this.clearMission(); K.world.setEnv('dusk', 'clear'); this.ambientHQ(); }
      this.state = 'hq';
      K.cam.mode = 'orbit'; K.cam.orbitCenter = { x: -170, y: 0, z: 182 }; K.cam.orbitR = 22; K.cam.orbitH = 8;
      K.ui.briefing(def);
    },
    pause() { if (this.state !== 'playing') return; this.paused = true; K.input.releaseAll(); K.ui.screen('pause'); },
    resume() { this.paused = false; K.ui.screen(null); this.relock(); },
    wantsPointerLock() { return this.state === 'playing' && !this.paused && !K.ui.dialogOpen && !K.ui.keypadOpen && !K.ui.mapOpen && !K.ui.modal && !K.input.touch.enabled; },
    relock() { if (this.wantsPointerLock() && !K.input.noLock) { const c = $('c'); try { const p = c.requestPointerLock && c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* kullanıcı tıklaması gerekir */ } } },
    canControl() { return this.state === 'playing' && !this.paused && !this.cinematic && !K.ui.dialogOpen && !K.ui.keypadOpen && !K.ui.mapOpen && !K.ui.modal; },
    // ═════════ Varlıklar ═════════
    spawnEnemy(o) { const e = new K.Enemy(o); this.actors.push(e); this.enemies.push(e); return e; },
    spawnCiv(o) { const c = new K.Civilian(o); this.actors.push(c); this.civs.push(c); return c; },
    spawnVehicle(type, o) { const v = new K.Vehicle(type, o); this.vehicles.push(v); v.setLights(K.world.env.time !== 'day' && type !== 'heli'); return v; },
    hasItem(id) { return this.player && this.player.items.has(id); },
    giveItem(id) { if (this.player) this.player.items.add(id); },
    clearMission() {
      for (const a of this.actors) a.remove();
      if (this.player) this.player.remove();
      K.combat.clearRockets();
      for (const v of this.vehicles) v.remove();
      for (const m of this.fxMarkers) this.dyn.remove(m.m);
      while (this.dyn.children.length) this.dyn.remove(this.dyn.children[0]);
      this.actors = []; this.enemies = []; this.civs = []; this.squad = []; this.vehicles = []; this.player = null; this.fxMarkers = [];
      K.mission.reset(); K.fx.clear && K.fx.sparks && K.fx.clear();
      // dünya durumunu sıfırla
      for (const d of K.world.doors) { d.locked = !!d.o.locked; if (d.o.code) d.code = d.o.code; d.open = false; d.target = 0; d.ang = 0; d.col.on = true; d.pivot.rotation.y = 0; if (d.auto) { if (d.axis === 'x') d.mesh.position.x = d.w / 2; else d.mesh.position.z = d.w / 2; } if (d.o.open) d.setOpen(true, true); }
      const f = K.world.depotFence;
      if (f && f.cut) { f.cut = false; f.mesh.visible = true; f.col.door.locked = true; f.col.on = true; f.col.cells = []; K.world.colliders.push(f.col); (function ins(c) { const C = K.world.CELL; for (let ix = Math.floor(c.min.x / C); ix <= Math.floor(c.max.x / C); ix++) for (let iz = Math.floor(c.min.z / C); iz <= Math.floor(c.max.z / C); iz++) { const k = (ix + 1024) * 4096 + (iz + 1024); let a = K.world.hash.get(k); if (!a) { a = []; K.world.hash.set(k, a); } a.push(c); c.cells.push(k); } })(f.col); }
      K.ui.closeWheel(); K.ui.closeMap(); if (K.ui.dialogOpen) K.ui.closeDialog(); if (K.ui.keypadOpen) K.ui.closeKeypad();
      if (K.ui.journalOpen) K.ui.toggleJournal();
      K.ui.letterbox(false); this.cinematic = false; document.body.classList.remove('cine'); $('titleCard').classList.remove('show');
      K.renderer.domElement.style.filter = ''; K.ui._nv = false; $('nvg').classList.remove('show');
      K.audio.setLoop('engine', 0); K.audio.setLoop('rotor', 0);
    },
    // Menü/merkez arka plan sahnesi
    ambientHQ() {
      this.clearMission();
      const h = this.spawnVehicle('heli', { x: -150, z: 205, yaw: Math.PI / 2 }); h.parked = true; h.rotor = 0.35; h.engine = false;
      const t = this.spawnVehicle('tank', { x: -232, z: 182, yaw: Math.PI / 2 }); t.parked = true;
      const a = this.spawnVehicle('apc', { x: -222, z: 168, yaw: Math.PI / 2 }); a.parked = true;
      const p = this.spawnVehicle('patrol', { x: -198, z: 214, yaw: 0.3 }); p.parked = true;
      const p2 = this.spawnVehicle('patrol', { x: -192, z: 214, yaw: 0.3 }); p2.parked = true;
      const looks = ['soldier', 'steel', 'special', 'elite', 'riot'];
      for (let i = 0; i < 10; i++) { const c = this.spawnCiv({ x: -178 + (i % 5) * 1.4, z: 166 + Math.floor(i / 5) * 1.6, yaw: Math.PI, look: K.models.LOOKS[looks[i % 5]], state: 'idle', pose: i === 0 ? 'salute' : 'normal', panicImmune: true }); c.anim.armed = false; }
      for (let i = 0; i < 4; i++) { const c = this.spawnCiv({ x: -172 + i * 1.2, z: 176 + (i % 2), yaw: Math.PI / 2 + i, look: K.models.LOOKS[looks[(i + 1) % 5]], state: 'idle', pose: 'talk', panicImmune: true }); }
      for (let i = 0; i < 5; i++) { const c = this.spawnCiv({ x: -200 + i * 6, z: 190, look: K.models.LOOKS.soldier, state: 'wander', panicImmune: true }); c.wanderR = 25; }
      this.spawnTraffic(6, { x: -160, z: 190 }, 30);
    },
    spawnTraffic(n, near, minD = 40) {
      if (!K.save.data.settings.traffic) return;
      const loops = K.world.trafficLoops, cols = [0x8a8f96, 0x2a2a2e, 0xd8d8d8, 0x7a1d1d, 0x1d3a6a, 0x3a5a3a, 0xa8a090];
      let made = 0;
      for (let tries = 0; tries < n * 6 && made < n; tries++) {
        const L = U.pick(loops), i = Math.floor(Math.random() * L.length), a = L[i], b = L[(i + 1) % L.length], t = Math.random();
        const x = U.lerp(a.x, b.x, t), z = U.lerp(a.z, b.z, t);
        if (near && Math.hypot(x - near.x, z - near.z) < minD) continue;
        if (this.vehicles.some((v) => Math.hypot(v.pos.x - x, v.pos.z - z) < 14)) continue;
        const v = this.spawnVehicle(U.pick(['sedan', 'sedan', 'suv', 'van']), { x, z, yaw: Math.atan2(b.x - a.x, b.z - a.z), team: 'civ', color: U.pick(cols) });
        v.ai = { path: L, idx: (i + 1) % L.length, loop: true, speed: 8 + Math.random() * 3, reach: 6 };
        v.traffic = true; made++;
      }
    },
    // ═════════ Görev akışı ═════════
    startMission(id, lo) {
      const def = K.MISSIONS.find((m) => m.id === id); if (!def) return;
      this.clearMission();
      this.currentId = id; this.loadout = lo;
      this.stats = { kills: 0, arrests: 0, takedowns: 0, civSaved: 0, civLost: 0, downed: 0, kia: 0, shots: 0, hits: 0, evidence: 0, alarms: 0 };
      this.time = 0;
      const idx = K.MISSIONS.filter((m) => !m.pack).indexOf(def);
      this.diffAcc = idx < 0 ? 1 : idx < 3 ? 0.82 : idx < 6 ? 0.95 : 1.08;
      this.diffRate = idx < 0 ? 1 : idx < 3 ? 0.85 : idx < 6 ? 1 : 1.1;
      this.diffDmg = idx < 0 ? 0.7 : idx < 3 ? 0.6 : idx < 6 ? 0.68 : 0.75;
      K.world.setEnv(def.time, def.weather);
      // oyuncu
      const ins = def.insertion;
      const outfitId = def.forceOutfit || lo.outfit || 'tactical';
      const of = K.OUTFITS[outfitId];
      const look = Object.assign({}, K.models.LOOKS[of.look]);
      const cos = K.COSMETICS[K.save.data.cosmetic];
      if (cos && outfitId === 'tactical') { look.uniform = cos.tint; look.pants = cos.tint; if (cos.glb) { look.glb = cos.glb; look.glbTint = cos.glbTint; } }
      const gadget = lo.gadget;
      let secondary = lo.secondary || 'pistol_s';
      if (!K.WEAPONS[secondary] || !K.prog.weaponUnlocked(secondary)) secondary = 'pistol_s';
      let primary = def.noWeapons ? null : lo.primary;
      if (outfitId === 'civil' && primary && !['pistol_s', 'pistol', 'd50', 'knife'].includes(primary)) primary = null;
      if (outfitId === 'civil' && !['pistol_s', 'pistol', 'd50', 'knife'].includes(secondary)) secondary = 'pistol_s';
      K.assets.preloadWeapons([primary, secondary, 'ak47', 'ak74', 'mp7', 'd50'].filter(Boolean));
      this.player = new K.Player({ x: ins.x, z: ins.z, yaw: ins.yaw || 0, look, outfit: outfitId, primary, secondary, gadget });
      if (K.prog.skillVal('support') >= 2 && this.player.gadget) this.player.gadget.count++;
      if (def.noWeapons) { this.player.weapons = []; this.player.holstered = true; K.models.setWeapon(this.player.rig, null); }
      this.actors.push(this.player);
      K.cam.yaw = ins.yaw || 0; K.cam.pitch = -0.08;
      this.player.canBeDowned = Math.min(def.squadMax || 0, K.prog.squadMax()) > 0 && (lo.squad || []).length > 0;
      // ekip
      const maxSq = Math.min(def.squadMax || 0, K.prog.squadMax());
      const roster = (lo.squad || []).map((rid) => K.ROSTER.find((r) => r.id === rid)).filter((r) => r && K.prog.unitUnlocked(r.unit)).slice(0, maxSq);
      roster.forEach((r, i) => {
        const F = K.ai.FORMS.free[i % 9], c = Math.cos(ins.yaw || 0), s = Math.sin(ins.yaw || 0);
        let x = ins.x + F[0] * c + F[1] * s, z = ins.z - F[0] * s + F[1] * c;
        const p = K.nav.nearestFree(0, x, z, 4); if (p) { x = p.x; z = p.z; }
        const m = new K.SquadMember({ x, z, yaw: ins.yaw || 0, unit: r.unit, name: r.name, slot: i, rosterId: r.id });
        if (def.stealth) m.fireMode = 'hold';
        this.actors.push(m); this.squad.push(m);
      });
      K.squad.formation = 'free';
      // görev
      K.mission.reset();
      K.mission.begin(def);
      this.state = 'playing'; this.paused = false;
      K.ui.screen(null);
      K.ui.objectivesChanged(); K.ui.squadChanged();
      if (def.traffic || ['m01', 'm06', 'p1', 'p2'].includes(def.id)) this.spawnTraffic(8, { x: ins.x, z: ins.z }, 45);
      // intikal
      if (ins.type === 'vehicle') {
        const v = this.spawnVehicle(ins.vehicle, { x: ins.x, z: ins.z, yaw: ins.yaw || 0 });
        v.enter(this.player, 'driver'); K.cam.mode = 'vehicle';
        if (!ins.squadWalk) for (const m of this.squad) { if (v.freeSeats() > 0) v.enter(m); }
        for (const m of this.squad) if (!m.vehicle) { const p = K.nav.nearestFree(0, ins.x - Math.sin(ins.yaw || 0) * (v.def.len / 2 + 3) + (Math.random() - 0.5) * 6, ins.z - Math.cos(ins.yaw || 0) * (v.def.len / 2 + 3) + (Math.random() - 0.5) * 6, 6); if (p) m.pos.set(p.x, K.world.groundAt(p.x, p.z, 2), p.z); }
        K.ui.letterbox(false, `GÖREV ${def.no} · ${def.title}`, `${def.place} — ${def.type}`);
      } else if (ins.type === 'heli') {
        this.heliInsertion(def);
      } else {
        K.cam.mode = 'foot';
        K.ui.letterbox(false, `GÖREV ${def.no} · ${def.title}`, `${def.place} — ${def.type}`);
      }
      K.audio.say(def.title);
      K.pwa.enterPlay();
      setTimeout(() => this.relock(), 50);
    },
    // GLB silah modeli geç yüklendiğinde eldeki prosedürel yedeği değiştir
    refreshWeaponModels(asset) {
      const P = this.player; if (!P || !P.rig) return;   // diğer aktörler mesafeye göre weaponLOD ile güncellenir
      const R = P.rig, W = R.weapon && K.WEAPONS[R.weapon];
      if (W && W.asset === asset && !R.gunGLB) K.models.setWeapon(R, R.weapon);
    },
    restartMission() { if (this.currentId) this.startMission(this.currentId, this.loadout); },
    abortMission() { this.paused = false; this.toHQ(); },
    missionFinished(success) {
      if (this.state !== 'playing') return;
      const def = K.mission.def;
      const rep = K.mission.report(success);
      const aw = K.prog.award(def, rep);
      this.state = 'report';
      document.exitPointerLock && document.exitPointerLock();
      K.audio.setLoop('engine', 0); K.audio.setLoop('rotor', 0); K.audio.setLoop('pulse', 0);
      K.ui.report(rep, aw, def);
      this.lastReport = rep;
    },
    heliInsertion(def) {
      const ins = def.insertion, P = this.player;
      const yaw = Math.atan2(ins.lz.x - ins.from.x, ins.lz.z - ins.from.z);
      const h = this.spawnVehicle('heli', { x: ins.from.x, z: ins.from.z, yaw, rotorOn: true });
      h.rotor = 1; h.doorOpen = 1;
      h.seats[1].actor = P; P.vehicle = h; P.seat = 1;
      for (const m of this.squad) h.enter(m);
      this.cinematic = true; document.body.classList.add('cine'); K.cam.mode = 'cine'; K.ui.letterbox(true, `GÖREV ${def.no} · ${def.title}`, `${def.place} — helikopterle intikal · atlamak için E / Boşluk`);
      let t = 0;
      const mid = { x: (ins.from.x + ins.lz.x) / 2 + 30, z: (ins.from.z + ins.lz.z) / 2 };
      const arrive = () => {
        if (!this.cinematic) return;
        this.cinematic = false; document.body.classList.remove('cine'); K.ui.letterbox(false);
        h.exit(P, 0); let i = 1; for (const m of this.squad) if (m.vehicle === h) h.exit(m, i++);
        K.cam.mode = 'foot'; K.cam.yaw = h.yaw;
        K.ui.toast('İniş bölgesindesiniz', 'ok');
        setTimeout(() => { if (h.alive && !h.removed) h.flyTo([{ x: ins.lz.x, z: ins.lz.z + 120 }, ins.from], { land: false, speed: 30, alt: 60 }); }, 2500);
        this.relock();
      };
      h.flyTo([mid, { x: ins.lz.x, z: ins.lz.z }], { land: true, speed: 34, alt: 55, onArrive: arrive });
      this.heliSkip = () => { const g = K.world.groundAt(ins.lz.x, ins.lz.z, 200, 1.4); h.pos.set(ins.lz.x, g, ins.lz.z); h.vel.set(0, 0, 0); h.ai.idx = h.ai.path.length - 1; h.ai.arrived = true; arrive(); };
      K.cam.cineFov = 50;
      K.cam.cine = (dt, cam) => {
        t += dt;
        const ang = t * 0.12 + yaw + 2.2, R = 24;
        const tx = h.pos.x + Math.sin(ang) * R, tz = h.pos.z + Math.cos(ang) * R, ty = h.pos.y + 6 + Math.sin(t * 0.3) * 3;
        cam.position.lerp(new V3(tx, Math.max(ty, K.world.terrainH(tx, tz) + 3), tz), 1 - Math.exp(-3 * dt));
        cam.lookAt(h.pos.x, h.pos.y + 2, h.pos.z);
        if ((K.input.hit('interact') || K.input.hit('jump') || K.input.pressed.has('Enter')) && t > 0.5 && this.cinematic) this.heliSkip();
      };
    },
    // ═════════ Etkileşimler ═════════
    nearestVehicle(p, maxD, filter) { let best = null, bd = maxD; for (const v of this.vehicles) { if (filter && !filter(v)) continue; const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z); if (d < bd) { bd = d; best = v; } } return best; },
    interactNear(pt) {
      let best = null, bd = 3.5;
      for (const it of K.world.interactables) { if (it.enabled && !it.enabled()) continue; if (it.door && !it.door.locked && false) continue; const d = Math.hypot(it.x - pt.x, it.z - pt.z) + Math.abs((it.y || 1) - (pt.y || 1)) * 0.3; if (d < bd) { bd = d; best = it; } }
      return best;
    },
    findInteraction() {
      const P = this.player; if (!P || !P.alive || P.downed || P.vehicle || P.drone) return null;
      const f = K.cam.mode === 'foot' ? { x: Math.sin(K.cam.yaw), z: Math.cos(K.cam.yaw) } : P.fwd(), cands = [];
      const consider = (x, z, y, r, o) => {
        const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz);
        if (d > r || Math.abs((y != null ? y : P.pos.y + 1) - (P.pos.y + 1)) > 1.7) return;
        const dot = d > 0.3 ? (dx * f.x + dz * f.z) / d : 1;
        if (dot < -0.2) return;
        cands.push(Object.assign({ s: d - dot * 0.9 }, o));
      };
      // araçlar
      for (const v of this.vehicles) {
        if (!v.alive || v.locked || v.parked && v.team !== 'player' || v.traffic) continue;
        if (v.team === 'mafia' && !(K.mission.def && K.mission.def.id === 'p1' && v === K.mission.tir && K.mission.obj('o5') && K.mission.obj('o5').state === 'active')) continue;
        if (v.team === 'civ' && v.type !== 'sedan') continue;
        if (!v.nearDoor(P, 2.2)) continue;
        if (v.def.kind === 'heli' && !K.prog.vehicleUnlocked('heli') && !v.seats[0].actor) {
          const d0 = v.seats[0].actor;
          cands.push({ s: 1.5, label: `${v.name}: yolcu olarak bin`, use: () => this.enterVehicle(v, 'passenger') });
          continue;
        }
        if (v.type === 'tank' && !K.prog.vehicleUnlocked('tank') && !(K.mission.def && K.mission.def.id === 'm09')) { cands.push({ s: 1.6, label: `${v.name}: Tuğgeneral rütbesi gerekli`, use: () => K.ui.toast('Tank kullanımı Tuğgeneral rütbesinde açılır', 'bad') }); continue; }
        const driverFree = !v.seats[0].actor;
        cands.push({ s: 1.2, label: driverFree ? `${v.name}: sürücü olarak bin` : `${v.name}: yolcu olarak bin`, use: () => this.enterVehicle(v, driverFree ? 'driver' : 'passenger') });
      }
      for (const a of this.actors) {
        if (a === P || !a.alive || a.vehicle) continue;
        if (Math.abs(a.pos.x - P.pos.x) > 4 || Math.abs(a.pos.z - P.pos.z) > 4) continue;
        if (a.downed && (a.team === 'squad' || a.team === 'vip')) { consider(a.pos.x, a.pos.z, a.pos.y + 0.5, 2.0, { hold: a.team === 'vip' && !a.wasRevived ? 4 : 3, label: a.team === 'vip' ? `${a.name}: ilk yardım uygula` : `${a.name}: yaralıyı ayağa kaldır`, pose: 'kneel', use: () => { a.revive(a.team === 'vip' ? 0.5 : 0.45); a.wasRevived = true; if (a.team === 'vip' && (a.followAfterRevive || a.state === 'follow' || a.leader)) a.setLeader && a.setLeader(P); } }); continue; }
        if (a.team === 'enemy') {
          if (a.surrendered || (a.knocked && !a.arrested)) { consider(a.pos.x, a.pos.z, a.pos.y + 0.8, 2.0, { hold: 1.2, label: `${a.name || 'Şüpheli'}: kelepçele (gözaltı)`, pose: 'kneel', use: () => a.arrest() }); continue; }
          if (!a.threat) continue;
          const toP = { x: P.pos.x - a.pos.x, z: P.pos.z - a.pos.z }, d = Math.hypot(toP.x, toP.z);
          const ef = a.fwd(), behind = d > 0.1 && (toP.x * ef.x + toP.z * ef.z) / d < -0.25;
          if (d < 1.8 && a.state !== 'combat' && (behind || a.state === 'patrol' && a.susp < 30 || a.stunT > 0)) consider(a.pos.x, a.pos.z, a.pos.y + 1, 1.9, { label: `${a.name || 'Muhafız'}: sessizce etkisiz hâle getir`, pose: 'interact', use: () => { a.knockOut(); K.audio.impact(a.pos, 'flesh'); } });
          continue;
        }
        if (a.team === 'civ' || a.team === 'vip') {
          if (a.dialogue) { consider(a.pos.x, a.pos.z, a.pos.y + 1.2, 2.3, { label: `Konuş: ${a.name || 'Sivil'}`, use: () => a.dialogue() }); continue; }
          const sz = K.mission.safeZone && K.mission.safeZone();
          if ((a.escortable || a.team === 'vip') && !a.safe && !a.downed && sz) {
            if (a.leader === P) consider(a.pos.x, a.pos.z, a.pos.y + 1.2, 2.3, { label: `${a.name || 'Sivil'}: burada bekleyin`, use: () => { a.setLeader(null); a.state = 'idle'; } });
            else consider(a.pos.x, a.pos.z, a.pos.y + 1.2, 2.3, { label: `${a.name || 'Sivil'}: "Beni takip edin!"`, use: () => { const n = this.civs.filter((c) => c.leader === P && c.alive).length; if (n >= 4) { K.ui.toast('Aynı anda en fazla 4 sivili yönlendirebilirsin', 'bad'); return; } a.setLeader(P); K.ui.toast('Sivil seni takip ediyor — güvenli bölgeye götür', 'ok'); } });
          }
        }
      }
      // teslim ol çağrısı (nişan alırken)
      const ta = this.aimActor;
      if (ta && ta.team === 'enemy' && ta.threat && ta.canSurrender && ta.faction !== 'security' && P.aiming && ta.dist(P.pos) < 11) {
        const can = ta.state !== 'combat' || ta.hp < ta.maxHp * 0.45 || ta.stunT > 0;
        cands.push({ s: -1, label: can ? `${ta.name || 'Şüpheli'}: "TESLİM OL!"` : `${ta.name || 'Şüpheli'} çatışmada — teslim olmaz (yarala veya sersemlet)`, use: () => { if (can) ta.surrender(); else K.audio.ui('bad'); } });
      }
      // dünya etkileşimleri
      const wi = K.world.bestInteract(P, f.x, f.z);
      if (wi) { const dx = wi.x - P.pos.x, dz = wi.z - P.pos.z, d = Math.hypot(dx, dz); const dot = d > 0.3 ? (dx * f.x + dz * f.z) / d : 1; cands.push({ s: d - dot * 0.8 + (wi.door ? 0.4 : 0), label: typeof wi.label === 'function' ? wi.label() : wi.label, hold: wi.hold || 0, use: () => wi.use(P), key: wi.id }); }
      if (!cands.length) return null;
      cands.sort((a, b) => a.s - b.s);
      return cands[0];
    },
    enterVehicle(v, pref) {
      const P = this.player;
      const idx = v.enter(P, pref === 'driver' ? 'driver' : null);
      if (idx < 0) { K.ui.toast('Boş koltuk yok', 'bad'); return; }
      K.cam.mode = 'vehicle'; K.cam.yaw = v.yaw; K.cam.pitch = -0.15;
      if (v.def.kind === 'heli' && idx === 0) { v.engine = true; v.ai = null; K.ui.toast('Pilot koltuğu: Boşluk yüksel, C alçal, W/S ileri-geri, A/D dönüş'); }
      if (idx === 0 && K.world.env.time !== 'day') v.setLights(true);
      K.mission.hint('vehicle', 'Araçtayken komut tekerinden "Araca bin / in" ile ekibi bindirip indirebilirsin. V: kamera, L: farlar.');
    },
    placeBarrier(m, o) {
      const x = o.x, z = o.z;
      const ob = K.mission.obstacle({ build: (P) => { K.models.props.barrier(P, x - 1.05, 0.05, z, 0, 0x2a3a6a); K.models.props.barrier(P, x + 1.05, 0.05, z, 0, 0x2a3a6a); }, boxes: [[x - 2.1, 0, z - 0.3, x + 2.1, 0.8, z + 0.3]] });
      K.bus.emit('barrierPlaced', { x, z, m });
    },
    elevatorMenu(f) { K.ui.elevator(f, 4, (t) => this.changeFloor(t)); },
    changeFloor(target) {
      const P = this.player; if (!P) return;
      const FH = 4.5, y = target * FH, layer = target === 0 ? 0 : target + 1;
      const from = P.pos.clone(), fromLayer = P.layer;
      const followers = [];
      for (const m of this.squad) if (m.alive && !m.downed && !m.vehicle && m.layer === fromLayer && m.order.type === 'follow' && m.dist(from) < 16) followers.push(m);
      for (const c of this.civs) if (c.alive && c.leader === P && c.layer === fromLayer) followers.push(c);
      for (const a of this.enemies) if (a.alive && a.escortFollow && a.layer === fromLayer && a.dist(from) < 16) followers.push(a);
      $('fade').classList.add('show');
      this._intentUnlock = true;
      setTimeout(() => {
        P.layer = layer; P.pos.set(150, y + 0.05, -157.0); P.vel.set(0, 0, 0); P.vy = 0; P.yaw = 0; K.cam.yaw = 0;
        const pts = K.squad.spreadPoints(150, -154.5, followers.length, layer);
        followers.forEach((a, i) => { a.layer = layer; a.pos.set(pts[i].x, y + 0.05, pts[i].z); a.vel.set(0, 0, 0); a.path = null; a.wantPath = null; });
        K.ui.toast(['Lobi', '1. kat — Muhasebe', '2. kat — Güvenlik', '3. kat — Yönetim'][target], 'ok');
        setTimeout(() => { $('fade').classList.remove('show'); this._intentUnlock = false; }, 250);
      }, 350);
    },
    pushFromVehicles(a) {
      for (let i = 0; i < this.vehicles.length; i++) this.vehicles[i].pushActor(a);
      if (a === this.player) {
        for (const o of this.actors) {
          if (o === a || !o.alive || o.vehicle || o.downed || o.layer !== a.layer) continue;
          const dx = a.pos.x - o.pos.x, dz = a.pos.z - o.pos.z, d2 = dx * dx + dz * dz;
          if (d2 < 0.42 && d2 > 1e-6 && Math.abs(o.pos.y - a.pos.y) < 1.2) { const d = Math.sqrt(d2), p = (0.65 - d); a.pos.x += dx / d * p; a.pos.z += dz / d * p; }
        }
      }
    },
    // ═════════ Döngü ═════════
    loop(now) {
      requestAnimationFrame((t) => this.loop(t));
      let dt = (now - this.last) / 1000; this.last = now;
      if (!(dt > 0)) dt = 0.016;
      dt = Math.min(dt, 0.05);
      this.fps = this.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
      try {
        if (this.state === 'playing') this.updatePlaying(dt);
        else this.updateAmbient(dt);
        K.renderer.render(this.scene, this.camera);
      } catch (e) { console.error(e); if (!this._errShown) { this._errShown = true; K.ui.toast('Hata: ' + e.message, 'bad'); } }
      K.input.endFrame();
    },
    updateAmbient(dt) {
      this.time += dt;
      K.ai.pathBudget = 3;
      for (const a of this.actors) { a.update(dt); a.syncRig(dt); }
      for (const v of this.vehicles) v.update(dt);
      K.combat.updateRockets(dt);
      K.world.update(dt, this.camera, K.cam.orbitCenter ? { x: K.cam.orbitCenter.x, y: 0, z: K.cam.orbitCenter.z } : null);
      K.fx.update(dt);
      K.cam.update(dt);
      K.audio.setLoop('rotor', 0); K.audio.setLoop('city', 0.05);
      K.audio.update(dt);
    },
    step(dt) { this.updatePlaying(dt, true); },
    updatePlaying(dt, headless) {
      const I = K.input, UI = K.ui, P = this.player;
      // ── genel tuşlar
      if (!this.paused && !UI.dialogOpen && !UI.keypadOpen && !UI.modal) {
        if (I.hit('pause') && !UI.mapOpen && !UI.wheelOpen) { if (UI.journalOpen) UI.toggleJournal(); else this.pause(); }
        else if (I.hit('pause') && UI.mapOpen) { UI.closeMap(); this.relock(); }
        if (I.hit('map') && !this.cinematic) { if (UI.mapOpen) { UI.closeMap(); this.relock(); } else UI.openMap(); }
        if (I.hit('journal') && !this.cinematic) UI.toggleJournal();
        if (!UI.mapOpen && !this.cinematic && P && P.alive) {
          if (I.hit('wheel')) { if (I.keys.has('T_wheel') && UI.wheelOpen) UI.closeWheel(); else UI.openWheel(); }
          if (I.up('wheel') && UI.wheelOpen && !I.released.has('T_wheel')) { if (UI.wheelHover) UI.wheelExec(UI.wheelHover.id); else UI.closeWheel(); }
          for (let i = 1; i <= 8; i++) if (I.pressed.has('Digit' + i)) K.squad.select(i - 1, I.down('sprint'));
          if (I.hit('selectAll')) K.squad.selectAll();
          if (!UI.wheelOpen && this.squad.length) {
            if (I.hit('follow')) K.squad.command('follow');
            if (I.hit('hold')) K.squad.command('hold');
            if (I.hit('quickMove') || I.mbHit[1]) { const ap = K.cam.aimPoint(220); K.squad.command('move', { point: ap }); }
          }
        }
      }
      let ts = 1;
      if (this.paused || UI.dialogOpen || UI.keypadOpen || UI.modal) ts = 0;
      else if (UI.wheelOpen) ts = 0.25;
      else if (UI.mapOpen) ts = 0.15;
      const sdt = dt * ts;
      if (sdt > 0) {
        this.time += sdt;
        K.ai.pathBudget = 4;
        // nişan alınan aktör
        if (P && P.aiming) { const ap = K.cam.aimPoint(60); this.aimActor = ap.actor; } else this.aimActor = null;
        if (P) { if (!UI.wheelOpen) P.update(sdt); else { P.vel.x *= 0.9; P.vel.z *= 0.9; P.physics(sdt); P.setAnim(sdt); } }
        if (P && P.downed && P.alive && !this.squad.some((m) => m.order.type === 'revive' && m.order.target === P)) {
          const cands = this.squad.filter((m) => m.alive && !m.downed && !m.vehicle && m.layer === P.layer).sort((a, b) => a.dist(P.pos) - b.dist(P.pos));
          if (cands[0] && (this._revCall || 0) < this.time) { this._revCall = this.time + 1; cands[0].applyOrder({ type: 'revive', target: P, after: { type: 'follow' } }); K.ui.radio(cands[0].name, 'Lider yaralı! Geliyorum!'); }
        }
        for (const a of this.actors) if (a !== P) a.update(sdt);
        this._rotorVol = 0;
        for (const v of this.vehicles) v.update(sdt);
        K.combat.updateRockets(sdt);
        K.audio.setLoop('rotor', Math.min(0.8, this._rotorVol || 0), this._rotorRate || 0);
        if (!P || !P.vehicle) K.audio.setLoop('engine', 0);
        if (!this.cinematic) K.mission.update(sdt);
        K.world.update(sdt, this.camera, P ? (P.vehicle ? P.vehicle.pos : P.pos) : null);
        K.fx.update(sdt);
        for (const a of this.actors) a.syncRig(sdt);
        for (let i = this.fxMarkers.length - 1; i >= 0; i--) { const m = this.fxMarkers[i]; m.t -= sdt; m.m.material.opacity = Math.min(0.9, m.t); m.m.scale.setScalar(1 + (2.5 - m.t) * 0.3); if (m.t <= 0) { this.dyn.remove(m.m); this.fxMarkers.splice(i, 1); } }
        // trafik araçlarını oyuncuya yakın tut
        if (P) for (const v of this.vehicles) if (v.traffic && Math.hypot(v.pos.x - P.pos.x, v.pos.z - P.pos.z) > 330) { v.pos.y = -100; v.ai = null; }
      }
      // ── etkileşim
      if (P && this.canControl() && !UI.wheelOpen) {
        const it = this.findInteraction();
        if (!it || !this.interaction || it.label !== this.interaction.label) this.holdProg = 0;
        this.interaction = it;
        if (it) {
          if (it.hold) {
            if (I.down('interact')) {
              this.holdProg += dt / (it.hold * (1 - 0.25 * K.prog.skillVal('evidence')));
              P.actionT = 0.2; P.actionPose = it.pose || 'interact';
              if (this.holdProg >= 1) { this.holdProg = 0; it.use(); this.interaction = null; }
            } else this.holdProg = 0;
          } else if (I.hit('interact')) { I.consume('interact'); it.use(); P.actionT = 0.4; P.actionPose = it.pose || 'interact'; this.interaction = null; }
        }
      } else { this.interaction = null; this.holdProg = 0; }
      // ── kamera, ses, HUD
      if (!UI.wheelOpen || K.cam.mode !== 'foot') { if (!UI.wheelOpen) K.cam.update(dt); else { const sv = K.input.mdx; K.input.mdx = 0; const sy = K.input.mdy; K.input.mdy = 0; K.cam.update(dt); K.input.mdx = sv; K.input.mdy = sy; } }
      else { const sv = K.input.mdx, sy = K.input.mdy; K.input.mdx = 0; K.input.mdy = 0; K.cam.update(dt); K.input.mdx = sv; K.input.mdy = sy; }
      K.audio.setLoop('city', K.world.inCity(this.camera.position.x, this.camera.position.z) ? (K.world.env.time === 'night' ? 0.05 : 0.1) : 0.02);
      K.audio.update(dt);
      if (!headless) UI.updateHUD(dt);
      if (P && P.vehicle && P.vehicle.def.kind === 'heli') P.vehicle.mouseYaw = 0;
    },
  };

  window.addEventListener('load', () => {
    K.pwa.init();
    G.init().catch((e) => { console.error(e); const t = $('bootTxt'); if (t) t.textContent = 'Başlatma hatası: ' + e.message; });
  });
})();
