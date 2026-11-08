/* KOMUTA — silah tanımları, aktör temeli, isabet testi, patlama, parçacık ve iz efektleri */
'use strict';
(function () {
  const U = K.U, V3 = THREE.Vector3;

  // ───────── Silahlar: call-of-duty projesindeki 28 silah (kurgusal adlar, gerçek atış değerleri) + 2 susturuculu ─────────
  // [ad, sınıf, kalibre, rpm, hasar, menzil, şarjör, yedek, şarjör süresi, mod(a=otomatik,s=tek), kalça saçılması°, nişan çarpanı, tepme, gürültü, ses, model, rütbe, ek]
  const DEG = Math.PI / 180;
  const ROWS = {
    rifle: ['AR-7 Vanguard', 'Piyade Tüfeği', '7,62×39 mm', 720, 30, 260, 30, 150, 1.8, 'a', 2.6, 0.1, 0.9, 70, 'rifle', 'proc:rifle', 0],
    kr4: ['KR-4 Atmaca', 'Karabina', '5,56×45 mm NATO', 800, 27, 240, 30, 150, 1.75, 'a', 2.5, 0.1, 0.85, 68, 'rifle', 'kr4', 0],
    mar556: ['MAR-556', 'Taarruz Tüfeği', '5,56×45 mm NATO', 800, 26, 260, 30, 150, 1.9, 'a', 2.8, 0.08, 0.85, 70, 'rifle', 'mar556', 1],
    k8: ['K8 Bozkurt', 'Taarruz Tüfeği', '5,56×45 mm NATO', 700, 32, 300, 30, 150, 1.95, 'a', 2.9, 0.08, 0.95, 72, 'rifle', 'k8', 1],
    ak47: ['TK-47 Köz', 'Taarruz Tüfeği', '7,62×39 mm', 600, 35, 280, 30, 150, 2.0, 'a', 2.8, 0.08, 1.15, 72, 'ak', 'ak47', 1],
    smg: ['SMG-9 Akrep', 'Hafif Makineli', '9×19 mm', 950, 20, 160, 32, 160, 1.6, 'a', 2.0, 0.18, 0.7, 55, 'smg', 'proc:smg', 1],
    shotgun: ['SG-12 Breaker', 'Pompalı Tüfek', '12 kalibre', 70, 17, 60, 7, 21, 2.8, 's', 1.2, 0.6, 2.4, 80, 'shotgun', 'proc:shotgun', 1, { pellets: 9 }],
    bren2: ['BR-2 Şimşek', 'Kısa Taarruz Tüfeği', '5,56×45 mm NATO', 850, 25, 230, 30, 150, 1.75, 'a', 2.4, 0.1, 0.78, 66, 'rifle', 'bren2', 2],
    stm556: ['ST-56 Yel', 'Taarruz Tüfeği', '5,56×45 mm NATO', 780, 30, 230, 30, 150, 1.75, 'a', 2.4, 0.1, 0.78, 66, 'rifle', 'stm556', 2],
    adar215: ['SK-15 Sedir', 'Yarı Otomatik Karabina', '5,56×45 mm NATO', 350, 38, 300, 10, 60, 1.95, 's', 2.9, 0.08, 1.1, 72, 'rifle', 'adar215', 2],
    mp7: ['HM-7 Kıvılcım', 'Kişisel Savunma Silahı', '4,6×30 mm', 950, 21, 160, 30, 120, 1.8, 'a', 2.1, 0.14, 0.62, 66, 'smg', 'mp7', 2],
    ithaca37: ['PT-37 Koru', 'Pompalı Av Tüfeği', '12 kalibre', 75, 18, 60, 5, 25, 2.1, 's', 1.2, 0.6, 2.4, 80, 'shotgun', 'ithaca37', 2, { pellets: 8 }],
    smg_s: ['SMG-9 Akrep S', 'Hafif Makineli · susturuculu', '9×19 mm', 800, 22, 100, 30, 180, 1.8, 'a', 2.2, 0.18, 0.55, 14, 'smg_s', 'proc:smg_s', 2, { silenced: true }],
    lmg: ['MG-43', 'Hafif Makineli Tüfek', '5,56×45 mm NATO', 900, 29, 280, 100, 200, 3.8, 'a', 4.0, 0.14, 1.0, 80, 'lmg', 'mg43', 3, { mob: 0.86 }],
    ak74: ['AK-74 Poyraz', 'Taarruz Tüfeği', '5,45×39 mm', 650, 30, 280, 30, 150, 2.0, 'a', 2.8, 0.08, 0.92, 72, 'ak', 'ak74', 3],
    g95: ['GT-95 Kalkan', 'Taarruz Tüfeği', '5,56×45 mm NATO', 750, 29, 300, 30, 150, 2.05, 'a', 2.9, 0.08, 0.95, 72, 'rifle', 'g95', 3],
    kt9: ['KT-9 Kaplan', 'Taktik Nişancı Tüfeği', '6,8×43 mm SPC', 360, 58, 380, 20, 80, 2.15, 's', 4.5, 0.02, 1.8, 85, 'dmr', 'kt9', 3, { adsFov: 0.3 }],
    ar10t: ['NT-10 Kartal', 'Muharebe Tüfeği', '7,62×51 mm NATO', 300, 47, 400, 20, 60, 1.95, 's', 3.2, 0.035, 1.65, 72, 'dmr', 'ar10t', 3],
    uar10: ['UN-10 Vaşak', 'Dürbünlü Nişancı Tüfeği', '7,62×51 mm NATO', 280, 52, 450, 20, 60, 1.95, 's', 3.6, 0.025, 1.75, 72, 'dmr', 'uar10', 3, { adsFov: 0.25 }],
    m4super90: ['YO-90 Fırtına', 'Yarı Otomatik Av Tüfeği', '12 kalibre', 220, 15, 60, 7, 28, 2.8, 's', 1.2, 0.6, 2.4, 80, 'shotgun', 'm4super90', 3, { pellets: 8 }],
    mk4: ['MK-4 Doğan', 'Karabina · Holografik', '5,56×45 mm NATO', 820, 26, 250, 30, 150, 1.8, 'a', 2.6, 0.07, 0.8, 70, 'rifle', 'mk4', 4],
    awm: ['NT-33 Şahin', 'Sürgülü Keskin Nişancı', '.338 Lapua Magnum', 48, 165, 520, 5, 20, 2.6, 's', 7.5, 0, 2.6, 105, 'awm', 'awm', 4, { adsFov: 0.13 }],
    pr10: ['PR-10 Tayfun', 'Pompalı Nişancı Tüfeği', '.44-40 WCF', 75, 92, 400, 8, 24, 3.2, 's', 4.5, 0.02, 2.0, 90, 'dmr', 'proc:dmr', 4, { adsFov: 0.22 }],
    sniper: ['MR-82 Marret', 'Anti-Materyal Tüfek', '.50 BMG (12,7×99 mm)', 70, 145, 450, 10, 20, 2.8, 's', 7.0, 0, 3.0, 110, 'bmg', 'm82', 5, { adsFov: 0.16, mob: 0.85 }],
    minigun: ['M134 Kasırga', 'Döner Makineli', '7,62×51 mm NATO', 1800, 40, 320, 1000, 9000, 2.4, 'a', 2.2, 1, 0.22, 95, 'minigun', 'minigun', 7, { spin: true, noAim: true, mob: 0.8 }],
    // yan silahlar
    pistol_s: ['P-9 Sentinel S', 'Tabanca · susturuculu', '9×19 mm', 420, 34, 70, 12, 72, 1.4, 's', 1.6, 0.25, 1.0, 9, 'pistol_s', 'proc:pistol_s', 0, { silenced: true, kind: 'pistol', slot: 'secondary' }],
    pistol: ['P-9 Sentinel', 'Tabanca', '9×19 mm', 450, 34, 120, 17, 51, 1.3, 's', 1.8, 0.15, 1.3, 55, 'pistol', 'proc:pistol', 0, { kind: 'pistol', slot: 'secondary' }],
    knife: ['Muharebe Bıçağı', 'Bıçak', '18 cm çelik ağız', 140, 120, 2.4, 0, 0, 0, 's', 0, 1, 0, 8, 'melee', 'knife', 0, { melee: true, kind: 'knife', slot: 'secondary', noAim: true }],
    d50: ['D-50 Kartal', 'Ağır Tabanca', '.50 AE', 160, 62, 150, 7, 28, 1.5, 's', 2.4, 0.12, 2.2, 70, 'magnum', 'd50', 2, { kind: 'pistol', slot: 'secondary' }],
    rpg: ['BZ-20 Yıldırım', 'Bazuka', '88,9 mm roket', 60, 280, 300, 1, 3, 2.1, 's', 3.0, 0.1, 3.2, 90, 'rocket', 'bazooka', 5, { rocket: true, kind: 'launcher', slot: 'secondary', mob: 0.9 }],
  };
  K.WEAPONS = {};
  for (const id in ROWS) {
    const [name, cls, cal, rpm, dmg, range, mag, res, reload, mode, hip, ads, kick, noise, snd, model, rank, ex = {}] = ROWS[id];
    const glb = !model.startsWith('proc:');
    const proc = glb ? ({ smg: 'smg_s', shotgun: 'shotgun', lmg: 'lmg', bmg: 'dmr', awm: 'dmr', dmr: 'dmr', minigun: 'lmg', magnum: 'pistol', rocket: 'launcher', melee: 'knife' }[snd] || (ex.kind === 'pistol' ? 'pistol' : 'rifle')) : model.slice(5);
    const sp = hip * DEG * 0.62;
    const w = {
      id, name, sub: cls + ' · ' + cal, cls, cal, dmg, rof: 60 / rpm, mag, mags: mag ? Math.max(1, Math.round(res / mag)) : 0, reload, range, noise,
      auto: mode === 'a', spread: ex.pellets ? 0.065 : sp, aimSpread: ex.pellets ? 0.045 : Math.max(0.0007, sp * ads * 1.8), recoil: 0.014 * kick,
      slot: ex.slot || 'primary', snd, rank, asset: glb ? model : null, proc, kind: ex.kind || 'rifle', mob: ex.mob || 1,
      pellets: ex.pellets, silenced: !!ex.silenced, melee: !!ex.melee, rocket: !!ex.rocket, spin: !!ex.spin, noAim: !!ex.noAim,
      zoom: ex.adsFov ? Math.max(12, Math.min(30, ex.adsFov * 95)) : undefined,
    };
    K.WEAPONS[id] = w;
  }
  K.WEAPON_TYPES = [['Taarruz tüfekleri', ['rifle', 'kr4', 'mar556', 'k8', 'ak47', 'bren2', 'stm556', 'ak74', 'g95', 'mk4', 'adar215']], ['Hafif makineli', ['smg', 'smg_s', 'mp7']], ['Pompalı', ['shotgun', 'ithaca37', 'm4super90']], ['Makineli', ['lmg', 'minigun']], ['Nişancı', ['kt9', 'ar10t', 'uar10', 'pr10', 'awm', 'sniper']], ['Yan silah / özel', ['pistol_s', 'pistol', 'd50', 'knife', 'rpg']]];
  K.GADGETS = {
    medkit: { id: 'medkit', name: 'İlk yardım çantası', desc: 'Kendini veya yakındaki yaralıyı iyileştirir (3 adet).', count: 3 },
    drone: { id: 'drone', name: 'Keşif dronu', desc: 'Havadan keşif: görülen düşmanlar 40 sn haritada işaretlenir.', count: 2, rank: 2 },
    flash: { id: 'flash', name: 'Şok bombası', desc: '10 m içindeki düşmanları 5 sn sersemletir; öldürücü değildir.', count: 3, rank: 1 },
    nvg: { id: 'nvg', name: 'Gece görüş', desc: 'N tuşuyla aç/kapat. Karanlıkta görüşü artırır.', count: 1, rank: 2 },
  };
  K.OUTFITS = {
    civil: { id: 'civil', name: 'Sivil görünüm', desc: 'Silah ve yelek gizli. Şüphe çok yavaş yükselir. Zırh yok. Yalnızca tabanca.', armor: 0, look: 'playerCivil', speed: 1.02 },
    tactical: { id: 'tactical', name: 'Operasyon üniforması', desc: 'Dengeli zırh ve hareket. Görülünce şüphe hızlı yükselir.', armor: 50, look: 'soldier', speed: 1 },
    heavy: { id: 'heavy', name: 'Ağır zırh', desc: 'Yüksek koruma, daha yavaş koşu.', armor: 100, look: 'steel', speed: 0.9, rank: 3 },
  };

  // ───────── Aktör temeli ─────────
  let UID = 0;
  const _push = { hit: false, nx: 0, nz: 0 };
  class Actor {
    constructor(o) {
      this.id = ++UID; this.team = o.team || 'civ'; this.name = o.name || ''; this.kind = o.kind || this.team;
      this.rig = K.models.character(o.look, { weapon: o.weapon, shield: o.shield });
      this.root = this.rig.root;
      K.game.dyn.add(this.root);
      this.layer = o.layer || 0;
      const y = o.y != null ? o.y : K.world.groundAt(o.x, o.z, (o.layer ? K.nav.layers[o.layer].y : 0) + 1.0);
      this.pos = new V3(o.x, y, o.z); this.vel = new V3(); this.vy = 0;
      this.yaw = o.yaw || 0; this.radius = 0.35; this.height = 1.8;
      this.maxHp = this.hp = o.hp || 100; this.armor = o.armor || 0; this.maxArmor = this.armor;
      this.alive = true; this.downed = false; this.onGround = true;
      this.anim = { speed: 0, legYaw: 0, back: false, crouch: 0, aim: 0, pitch: 0, armed: false, reload: -1, pose: 'normal', fire: 0, torsoYaw: 0, showWeapon: true };
      this.crouched = false; this.vehicle = null; this.seat = -1;
      this.weaponId = o.weapon || null; this.wdef = o.weapon ? K.WEAPONS[o.weapon] : null;
      this.ammo = this.wdef ? this.wdef.mag : 0; this.fireT = 0; this.reloadT = -1;
      this.stepAcc = 0; this.hitFlash = 0; this.lastHitT = -99; this.lastHitBy = null;
      this.tags = new Set(o.tags || []);
      this.nonLethal = false; this.visible = true;
      if (o.pose) this.anim.pose = o.pose;
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
      if (K.glbChar && o.look && K.glbChar.forLook(o.look)) { try { K.glbChar.attach(this, o.look.glb, { tint: o.look.glbTint }); } catch (e) { console.warn('GLB asker bağlanamadı', e); } }
    }
    get eyeY() { return this.pos.y + (this.crouched ? 1.15 : 1.62); }
    get chestY() { return this.pos.y + (this.downed || !this.alive ? 0.3 : this.crouched ? 0.9 : 1.3); }
    fwd() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
    dist(o) { return Math.hypot(o.x - this.pos.x, o.z - this.pos.z); }
    physics(dt) {
      if (this.vehicle) return;
      const W = K.world, p = this.pos;
      const mx = this.vel.x * dt, mz = this.vel.z * dt;
      const steps = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.25));
      const h = this.crouched ? 1.25 : this.height;
      for (let s = 0; s < steps; s++) {
        p.x += mx / steps; p.z += mz / steps;
        W.pushCircle(p, this.radius, p.y + 0.42, p.y + h, _push);
        K.game.pushFromVehicles(this);
      }
      const g = W.groundAt(p.x, p.z, p.y + 0.5, 0.12);
      if (this.vy <= 0 && p.y <= g + 0.05) {
        p.y = g; this.vy = 0; this.onGround = true;
      } else {
        this.vy -= 22 * dt; p.y += this.vy * dt;
        if (this.vy > 0) {
          const ceil = W.query(p.x - 0.2, p.z - 0.2, p.x + 0.2, p.z + 0.2);
          for (const c of ceil) if (c.min.y > p.y + 0.5 && c.min.y < p.y + h + 0.1 && p.x > c.min.x && p.x < c.max.x && p.z > c.min.z && p.z < c.max.z) { this.vy = 0; break; }
        }
        if (p.y <= g) { p.y = g; this.vy = 0; this.onGround = true; }
        else if (this.onGround && this.vy <= 0 && p.y - g < 0.5) { p.y = g; this.vy = 0; }
        else this.onGround = false;
      }
      if (p.y < -0.9 && W.terrainH(p.x, p.z) < -0.5) this.inWater(dt);
      // ayak sesi
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (this.onGround && sp > 0.5) {
        this.stepAcc += sp * dt;
        const stride = sp > 5 ? 1.05 : 0.75;
        if (this.stepAcc > stride) {
          this.stepAcc = 0;
          const vol = this.crouched ? 0.04 : sp > 5 ? 0.16 : 0.09;
          K.audio.step(p, this.team === 'player' ? vol * 0.8 : vol);
          if (this.team === 'player' && sp > 5.2 && !this.crouched) K.bus.emit('noise', { x: p.x, y: p.y, z: p.z, r: 7, src: this, type: 'step' });
        }
      }
    }
    inWater() { if (this.alive) { this.damage(9999, null, { drown: true }); } }
    setAnim(dt) {
      const a = this.anim, sp = Math.hypot(this.vel.x, this.vel.z);
      a.speed = this.onGround ? sp : 0.3;
      if (sp > 0.3) {
        const my = Math.atan2(this.vel.x, this.vel.z);
        let rel = U.angDiff(this.yaw, my);
        if (Math.abs(rel) > 1.9) { a.back = true; rel = U.angDiff(this.yaw, my + Math.PI); } else a.back = false;
        a.legYaw = U.clamp(rel, -1.2, 1.2);
      } else { a.legYaw *= 0.9; a.back = false; }
      a.crouch = U.damp(a.crouch, this.crouched ? 1 : 0, 10, dt);
      a.fire = Math.max(0, a.fire - dt * 9);
    }
    syncRig(dt) {
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.yaw;
      this.root.visible = this.visible && !this.vehicle;
      if (!this.root.visible) return;
      // ekrandan uzaksa animasyonu seyrek güncelle
      const cam = K.cam && K.cam.camera;
      if (cam) {
        const d = cam.position.distanceToSquared(this.pos);
        if (d > 160 * 160) { this.root.visible = d < 260 * 260; return; }
        if (d < 2.1 * 2.1 && this !== K.game.player && K.cam.mode === 'foot') { this.root.visible = false; return; }
        const cs = K.game.charShadows || 0, sh = d < cs * cs;
        if (sh !== this._sh) { this._sh = sh; this.root.traverse((o) => { if (o.isMesh) o.castShadow = sh; }); }
        if (this !== K.game.player) K.models.weaponLOD(this.rig, d < 22 * 22);
      }
      K.models.animate(this.rig, this.anim, dt);
      if (this.glb) K.glbChar.sync(this);
    }
    damage(amount, src, o = {}) {
      if (!this.alive || this.invuln) return 0;
      let dmg = amount;
      if (o.headshot) dmg *= 2.2;
      if (this.armor > 0 && !o.drown) {
        const absorb = Math.min(this.armor, dmg * 0.55);
        this.armor -= absorb * 0.8; dmg -= absorb;
      }
      if (this.dmgMul) dmg *= this.dmgMul;
      this.hp -= dmg; this.lastHitT = K.game.time; this.lastHitBy = src; this.hitFlash = 1;
      this.onDamaged && this.onDamaged(dmg, src, o);
      if (this.hp <= 0) {
        this.hp = 0;
        if (this.canBeDowned && !o.drown && !o.explode) this.goDown(src);
        else this.die(src, o);
      }
      return dmg;
    }
    goDown(src) {
      if (this.downed) return;
      this.downed = true; this.bleed = this.bleedMax || 45; this.anim.pose = 'downed'; this.vel.set(0, 0, 0);
      this.onDowned && this.onDowned(src);
      K.bus.emit('downed', { actor: this, src });
    }
    revive(hpFrac = 0.4) {
      if (!this.alive) return;
      this.downed = false; this.hp = this.maxHp * hpFrac; this.anim.pose = 'normal';
      K.bus.emit('revived', { actor: this });
    }
    die(src, o = {}) {
      if (!this.alive) return;
      this.alive = false; this.downed = false; this.anim.pose = 'dead'; this.vel.set(0, 0, 0);
      this.deathT = K.game.time;
      this.onDeath && this.onDeath(src, o);
      K.bus.emit('death', { actor: this, src, o });
    }
    remove() { K.game.dyn.remove(this.root); this.removed = true; }
  }
  K.Actor = Actor;

  // ───────── Parçacık sistemi ─────────
  class Particles {
    constructor(max, tex, additive) {
      this.max = max; this.n = 0;
      this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.col = new Float32Array(max * 4);
      this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max);
      this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('rgba', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
      this.mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex }, scale: { value: 500 } },
        vertexShader: 'attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float scale; void main(){ vC=rgba; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize = size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }',
        fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t=texture2D(map, gl_PointCoord); float a=vC.a*t.a; if(a<0.004) discard; gl_FragColor=vec4(vC.rgb*t.rgb, a); }',
        transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
      this.geo = g;
    }
    spawn(x, y, z, vx, vy, vz, life, s0, s1, r, gg, b, a, drag = 0, grav = 0) {
      let i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      this.life[i] = life; this.age[i] = 0; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a;
      this.col[i * 4] = r; this.col[i * 4 + 1] = gg; this.col[i * 4 + 2] = b; this.col[i * 4 + 3] = a;
      this.drag[i] = drag; this.grav[i] = grav; this.size[i] = s0;
    }
    update(dt) {
      for (let i = 0; i < this.n; i++) {
        this.age[i] += dt;
        if (this.age[i] >= this.life[i]) {
          const l = --this.n;
          if (i !== l) {
            this.pos.copyWithin(i * 3, l * 3, l * 3 + 3); this.vel.copyWithin(i * 3, l * 3, l * 3 + 3); this.col.copyWithin(i * 4, l * 4, l * 4 + 4);
            this.life[i] = this.life[l]; this.age[i] = this.age[l]; this.s0[i] = this.s0[l]; this.s1[i] = this.s1[l]; this.a0[i] = this.a0[l]; this.drag[i] = this.drag[l]; this.grav[i] = this.grav[l]; this.size[i] = this.size[l];
            i--;
          }
          continue;
        }
        const t = this.age[i] / this.life[i], d = Math.max(0, 1 - this.drag[i] * dt);
        this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
        this.col[i * 4 + 3] = this.a0[i] * (1 - t) * (t < 0.1 ? t / 0.1 : 1);
      }
      this.geo.setDrawRange(0, this.n);
      this.geo.attributes.position.needsUpdate = true; this.geo.attributes.size.needsUpdate = true; this.geo.attributes.rgba.needsUpdate = true;
    }
    clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
  }

  // ───────── Efektler ─────────
  const FX = K.fx = {
    init(scene) {
      this.scene = scene;
      this.sparks = new Particles(600, K.tex.soft, true);
      this.smoke = new Particles(700, K.tex.smoke, false);
      this.fire = new Particles(400, K.tex.soft, true);
      scene.add(this.smoke.points); scene.add(this.fire.points); scene.add(this.sparks.points);
      this.tracers = [];
      const tm = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const tg = new THREE.BoxGeometry(0.025, 0.025, 1); tg.translate(0, 0, 0.5);
      for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(tg, tm.clone()); m.visible = false; m.frustumCulled = false; scene.add(m); this.tracers.push({ m, t: 0 }); }
      this.flashes = [];
      const fm = new THREE.SpriteMaterial({ map: K.tex.glow, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
      for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(fm.clone()); s.visible = false; scene.add(s); this.flashes.push({ s, t: 0 }); }
      this.light = new THREE.PointLight(0xffb060, 0, 14, 2); scene.add(this.light); this.lightT = 0;
      this.boomLight = new THREE.PointLight(0xff8a30, 0, 60, 1.6); scene.add(this.boomLight); this.boomT = 0;
      this.ti = 0; this.fi = 0;
    },
    setScale(h, fov) { const s = h / (2 * Math.tan(fov * Math.PI / 360)); this.sparks.mat.uniforms.scale.value = s; this.smoke.mat.uniforms.scale.value = s; this.fire.mat.uniforms.scale.value = s; },
    tracer(ax, ay, az, bx, by, bz, col = 0xffd28a) {
      const tr = this.tracers[this.ti++ % this.tracers.length];
      const len = Math.hypot(bx - ax, by - ay, bz - az);
      tr.m.position.set(ax, ay, az); tr.m.lookAt(bx, by, bz); tr.m.scale.set(1, 1, len);
      tr.m.material.color.set(col); tr.m.material.opacity = 0.9; tr.m.visible = true; tr.t = 0.07;
    },
    muzzle(x, y, z, big = 1) {
      const f = this.flashes[this.fi++ % this.flashes.length];
      f.s.position.set(x, y, z); f.s.scale.setScalar(0.5 * big + Math.random() * 0.25); f.s.material.rotation = Math.random() * 6; f.s.visible = true; f.t = 0.05;
      this.light.position.set(x, y, z); this.light.intensity = 6 * big; this.lightT = 0.05;
    },
    impact(x, y, z, nx, ny, nz, surf) {
      const n = surf === 'flesh' ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const vx = nx * 3 + (Math.random() - 0.5) * 4, vy = ny * 3 + Math.random() * 3, vz = nz * 3 + (Math.random() - 0.5) * 4;
        if (surf === 'flesh') this.smoke.spawn(x, y, z, vx * 0.3, vy * 0.3, vz * 0.3, 0.35, 0.15, 0.5, 0.45, 0.06, 0.05, 0.7, 2, 1);
        else if (surf === 'metal') this.sparks.spawn(x, y, z, vx * 1.6, vy * 1.6, vz * 1.6, 0.25 + Math.random() * 0.2, 0.08, 0.02, 1, 0.75, 0.35, 1, 1, 9);
        else this.smoke.spawn(x, y, z, vx * 0.4, vy * 0.4, vz * 0.4, 0.6, 0.12, 0.6, 0.55, 0.52, 0.48, 0.6, 2.5, 0.5);
      }
      if (surf !== 'flesh') this.sparks.spawn(x, y, z, 0, 0, 0, 0.06, 0.25, 0.1, 1, 0.8, 0.5, 1);
    },
    explosion(x, y, z, s = 1) {
      for (let i = 0; i < 26 * s; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2, sp = 4 + Math.random() * 10 * s; this.fire.spawn(x, y + 0.5, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 2, Math.sin(a) * Math.cos(e) * sp, 0.5 + Math.random() * 0.4, 1.2 * s, 3.5 * s, 1, 0.55 + Math.random() * 0.2, 0.2, 1, 3, -1); }
      for (let i = 0; i < 30 * s; i++) { const a = Math.random() * 6.28, sp = 1 + Math.random() * 4 * s; this.smoke.spawn(x + (Math.random() - 0.5) * 2, y + 1 + Math.random() * 2, z + (Math.random() - 0.5) * 2, Math.cos(a) * sp, 1.5 + Math.random() * 3, Math.sin(a) * sp, 3 + Math.random() * 3, 2 * s, 9 * s, 0.18, 0.17, 0.16, 0.85, 0.6, -0.4); }
      for (let i = 0; i < 40 * s; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.4, sp = 8 + Math.random() * 20; this.sparks.spawn(x, y + 0.5, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, 0.6 + Math.random() * 0.6, 0.12, 0.04, 1, 0.7, 0.3, 1, 0.5, 14); }
      this.boomLight.position.set(x, y + 2, z); this.boomLight.intensity = 400 * s; this.boomT = 0.35;
    },
    dust(x, y, z, n = 1, r = 0.55, g = 0.5, b = 0.42, size = 1.2) {
      for (let i = 0; i < n; i++) this.smoke.spawn(x + (Math.random() - 0.5), y + 0.2, z + (Math.random() - 0.5), (Math.random() - 0.5) * 2, 0.5 + Math.random(), (Math.random() - 0.5) * 2, 1.2 + Math.random(), size * 0.6, size * 2.5, r, g, b, 0.35, 1.5, -0.2);
    },
    fireSmoke(x, y, z) {
      this.fire.spawn(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), 0, 2 + Math.random() * 2, 0, 0.6, 0.8, 0.3, 1, 0.5, 0.15, 0.9, 0, -1);
      if (Math.random() < 0.5) this.smoke.spawn(x, y + 1, z, (Math.random() - 0.5), 2 + Math.random(), (Math.random() - 0.5), 3, 1, 5, 0.12, 0.12, 0.12, 0.6, 0.3, -0.3);
    },
    update(dt) {
      this.sparks.update(dt); this.smoke.update(dt); this.fire.update(dt);
      for (const tr of this.tracers) if (tr.m.visible) { tr.t -= dt; tr.m.material.opacity = Math.max(0, tr.t / 0.07); if (tr.t <= 0) tr.m.visible = false; }
      for (const f of this.flashes) if (f.s.visible) { f.t -= dt; if (f.t <= 0) f.s.visible = false; }
      if (this.lightT > 0) { this.lightT -= dt; if (this.lightT <= 0) this.light.intensity = 0; }
      if (this.boomT > 0) { this.boomT -= dt; this.boomLight.intensity *= Math.exp(-10 * dt); if (this.boomT <= 0) this.boomLight.intensity = 0; }
    },
    clear() { this.sparks.clear(); this.smoke.clear(); this.fire.clear(); },
  };

  // ───────── İsabet testi ─────────
  const C = K.combat = {};
  function rayActor(ox, oy, oz, dx, dy, dz, a, maxD) {
    // aktörü dikey silindir olarak yaklaşıkla
    const px = a.pos.x - ox, pz = a.pos.z - oz;
    const hl = Math.hypot(dx, dz);
    if (hl < 1e-5) return -1;
    const ux = dx / hl, uz = dz / hl;
    const tH = px * ux + pz * uz; // yatay mesafe
    if (tH < 0) return -1;
    const cx = px - ux * tH, cz = pz - uz * tH;
    const r = a.downed || !a.alive ? 0.5 : 0.32;
    const d2 = cx * cx + cz * cz;
    if (d2 > r * r) return -1;
    const back = Math.sqrt(r * r - d2);
    const tt = (tH - back) / hl;
    if (tt <= 0 || tt > maxD) return -1;
    const y = oy + dy * tt;
    const top = a.downed || !a.alive ? a.pos.y + 0.45 : a.pos.y + (a.crouched ? 1.25 : 1.82);
    if (y < a.pos.y - 0.05 || y > top) return -1;
    C._head = !a.downed && a.alive && y > top - 0.28;
    return tt;
  }
  C.rayActor = rayActor;
  // shooter, köken, yön (birim), silah tanımı; filtre (aktör → bool)
  C.hitscan = function (shooter, ox, oy, oz, dx, dy, dz, w, filter) {
    const range = w.range || 150;
    const wh = K.world.raycast(ox, oy, oz, dx, dy, dz, range);
    let best = wh ? wh.d : range, target = null, head = false, veh = null;
    const wpt = wh ? { x: wh.x, y: wh.y, z: wh.z, nx: wh.nx, ny: wh.ny, nz: wh.nz, surf: wh.surf } : null;
    for (const a of K.game.actors) {
      if (a === shooter || !a.alive || a.vehicle || a.removed) continue;
      if (filter && !filter(a)) continue;
      const t = rayActor(ox, oy, oz, dx, dy, dz, a, best);
      if (t > 0 && t < best) { best = t; target = a; head = C._head; }
    }
    for (const v of K.game.vehicles) {
      if (shooter && shooter.vehicle === v) continue;
      const t = v.rayHit(ox, oy, oz, dx, dy, dz, best);
      if (t > 0 && t < best) { best = t; target = null; veh = v; }
    }
    const hx = ox + dx * best, hy = oy + dy * best, hz = oz + dz * best;
    if (target) {
      const dmgM = shooter && shooter.dmgOut ? shooter.dmgOut : 1;
      target.damage(w.dmg * dmgM, shooter, { headshot: head });
      FX.impact(hx, hy, hz, -dx, -dy, -dz, 'flesh');
      K.bus.emit('hit', { target, src: shooter, head, x: hx, y: hy, z: hz });
      return { type: 'actor', target, x: hx, y: hy, z: hz, d: best, head };
    }
    if (veh) {
      veh.damage(w.dmg * 0.25, shooter);
      FX.impact(hx, hy, hz, -dx, -dy, -dz, 'metal'); K.audio.impact({ x: hx, y: hy, z: hz }, 'metal');
      return { type: 'vehicle', target: veh, x: hx, y: hy, z: hz, d: best };
    }
    if (wpt) {
      FX.impact(wpt.x, wpt.y, wpt.z, wpt.nx, wpt.ny, wpt.nz, wpt.surf);
      K.audio.impact(wpt, wpt.surf);
      return { type: 'world', x: wpt.x, y: wpt.y, z: wpt.z, d: best };
    }
    return { type: 'none', x: hx, y: hy, z: hz, d: best };
  };
  C.explode = function (x, y, z, radius, dmg, src, o = {}) {
    FX.explosion(x, y, z, o.size || 1);
    K.audio.explosion({ x, y, z }, o.size || 1);
    K.cam && K.cam.shakeAt(x, y, z, 1.2 * (o.size || 1));
    K.bus.emit('noise', { x, y, z, r: 150, src, type: 'explosion' });
    for (const a of K.game.actors) {
      if (!a.alive || a.vehicle) continue;
      const d = Math.hypot(a.pos.x - x, a.pos.y + 1 - y, a.pos.z - z);
      if (d > radius) continue;
      if (!K.world.los(x, y + 0.5, z, a.pos.x, a.pos.y + 1, a.pos.z)) continue;
      const f = 1 - d / radius;
      a.damage(dmg * f * f + 10, src, { explode: f > 0.6 });
    }
    for (const v of K.game.vehicles) {
      const d = Math.hypot(v.pos.x - x, v.pos.z - z);
      if (d < radius + 2) v.damage(dmg * 1.6 * (1 - d / (radius + 2)), src, { explode: true });
    }
    K.bus.emit('explosion', { x, y, z, radius, src });
  };
  // ───────── Roket mermisi (bazuka) ─────────
  C.rockets = [];
  let rktGeo = null;
  function rocketMesh() {
    if (!rktGeo) {
      const parts = [];
      const body = new THREE.CylinderGeometry(0.042, 0.042, 0.5, 10); body.rotateX(Math.PI / 2); parts.push(body);
      const nose = new THREE.ConeGeometry(0.042, 0.18, 10); nose.rotateX(Math.PI / 2); nose.translate(0, 0, 0.34); parts.push(nose);
      for (let i = 0; i < 4; i++) { const f = new THREE.BoxGeometry(0.004, 0.09, 0.12); f.translate(0, 0.07, -0.2); f.rotateZ(i * Math.PI / 2); parts.push(f); }
      rktGeo = THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeGeometries(parts) : parts;
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0x4d5440, roughness: 0.6, metalness: 0.3 });
    if (Array.isArray(rktGeo)) { const g = new THREE.Group(); for (const p of rktGeo) g.add(new THREE.Mesh(p, mat)); return g; }
    return new THREE.Mesh(rktGeo, mat);
  }
  C.fireRocket = function (src, x, y, z, dx, dy, dz, w, filter) {
    const m = rocketMesh(); m.position.set(x, y, z); m.lookAt(x + dx, y + dy, z + dz);
    K.game.dyn.add(m);
    C.rockets.push({ src, x, y, z, dx, dy, dz, sp: 62, t: 0, w, m, filter });
    // geri tepme dumanı (arkaya)
    for (let i = 0; i < 14; i++) FX.smoke.spawn(x - dx * 0.9, y - dy * 0.9, z - dz * 0.9, -dx * (4 + Math.random() * 5) + (Math.random() - 0.5) * 2, -dy * 4 + Math.random(), -dz * (4 + Math.random() * 5) + (Math.random() - 0.5) * 2, 1.4 + Math.random(), 0.4, 2.2, 0.72, 0.7, 0.66, 0.55, 2.2, -0.15);
  };
  C.updateRockets = function (dt) {
    for (let i = C.rockets.length - 1; i >= 0; i--) {
      const r = C.rockets[i]; r.t += dt;
      r.sp = Math.min(95, r.sp + 40 * dt);
      const step = r.sp * dt;
      const h = K.world.raycast(r.x, r.y, r.z, r.dx, r.dy, r.dz, step);
      let best = h ? h.d : step, hit = !!h;
      for (const a of K.game.actors) {
        if (a === r.src || !a.alive || a.vehicle || a.removed || (r.filter && !r.filter(a))) continue;
        const t = rayActor(r.x, r.y, r.z, r.dx, r.dy, r.dz, a, best); if (t > 0 && t < best) { best = t; hit = true; }
      }
      for (const v of K.game.vehicles) {
        if (r.src && r.src.vehicle === v) continue;
        const t = v.rayHit(r.x, r.y, r.z, r.dx, r.dy, r.dz, best); if (t > 0 && t < best) { best = t; hit = true; }
      }
      const nx = r.x + r.dx * best, ny = r.y + r.dy * best, nz = r.z + r.dz * best;
      if (hit || r.t > 4.5) {
        if (r.m.parent) r.m.parent.remove(r.m);
        C.rockets.splice(i, 1);
        C.explode(nx - r.dx * 0.25, ny - r.dy * 0.25, nz - r.dz * 0.25, 7.5, r.w.dmg, r.src, { size: 1.15 });
        continue;
      }
      r.x = nx; r.y = ny; r.z = nz;
      r.m.position.set(nx, ny, nz);
      FX.smoke.spawn(nx - r.dx * 0.35, ny - r.dy * 0.35, nz - r.dz * 0.35, (Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5, 1.1 + Math.random() * 0.6, 0.18, 1.3, 0.8, 0.78, 0.74, 0.5, 1.4, -0.25);
      FX.sparks.spawn(nx - r.dx * 0.32, ny - r.dy * 0.32, nz - r.dz * 0.32, -r.dx * 3, -r.dy * 3, -r.dz * 3, 0.07, 0.32, 0.08, 1, 0.62, 0.22, 1);
    }
  };
  C.clearRockets = function () { for (const r of C.rockets) if (r.m.parent) r.m.parent.remove(r.m); C.rockets.length = 0; };
  C.flashbang = function (x, y, z, src) {
    FX.sparks.spawn(x, y + 0.5, z, 0, 0, 0, 0.15, 6, 14, 1, 1, 1, 1);
    FX.boomLight.position.set(x, y + 1, z); FX.boomLight.intensity = 600; FX.boomT = 0.2;
    K.audio.explosion({ x, y, z }, 0.4);
    K.bus.emit('noise', { x, y, z, r: 40, src, type: 'flash' });
    let n = 0;
    for (const a of K.game.actors) {
      if (!a.alive || a.team !== 'enemy') continue;
      const d = Math.hypot(a.pos.x - x, a.pos.z - z);
      if (d < 10 && Math.abs(a.pos.y - y) < 3 && K.world.los(x, y + 0.6, z, a.pos.x, a.eyeY, a.pos.z)) { a.stun && a.stun(5); n++; }
    }
    return n;
  };
})();
