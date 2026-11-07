/* KOMUTA — oyuncu (saha lideri) ve kamera sistemi */
'use strict';
(function () {
  const U = K.U, V3 = THREE.Vector3;
  const _v = new V3(), _v2 = new V3(), _m = new V3();

  // ═════════ Kamera ═════════
  const CAM = K.cam = {
    camera: null, yaw: 0, pitch: -0.1, shoulder: 1, dist: 3.4, curDist: 3.4, fov: 70, mode: 'orbit',
    pos: new V3(), look: new V3(), shakeA: 0, pivotY: 1.6, orbitT: 0, cine: null, idleT: 0,
    init(camera) { this.camera = camera; },
    shake(a) { this.shakeA = Math.min(1.5, this.shakeA + a); },
    shakeAt(x, y, z, a) { const d = this.camera.position.distanceTo(_v.set(x, y, z)); this.shake(a * Math.max(0, 1 - d / 80)); },
    forward(out) { const cp = Math.cos(this.pitch); return (out || new V3()).set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp); },
    right(out) { return (out || new V3()).set(-Math.cos(this.yaw), 0, Math.sin(this.yaw)); },
    look_(dt, lockPitch) {
      const ld = K.input.lookDelta();
      const aimSlow = K.game.player && K.game.player.aiming ? (K.game.player.zoomed ? 0.35 : 0.65) : 1;
      this.yaw -= ld.dx * aimSlow; this.pitch -= ld.dy * aimSlow;
      this.pitch = U.clamp(this.pitch, -1.25, lockPitch || 1.2);
      if (Math.abs(ld.dx) + Math.abs(ld.dy) > 0.0005) this.idleT = 0; else this.idleT += dt;
    },
    collidePlace(pivot, desired, minD = 0.35) {
      const dx = desired.x - pivot.x, dy = desired.y - pivot.y, dz = desired.z - pivot.z, d = Math.hypot(dx, dy, dz);
      if (d < 0.01) return desired;
      const h = K.world.raycast(pivot.x, pivot.y, pivot.z, dx / d, dy / d, dz / d, d + 0.25);
      if (h) { const nd = Math.max(minD, h.d - 0.3); desired.set(pivot.x + dx / d * nd, pivot.y + dy / d * nd, pivot.z + dz / d * nd); }
      return desired;
    },
    update(dt) {
      const P = K.game.player, cam = this.camera;
      const s = K.save.data.settings;
      let targetFov = s.fov;
      if (this.mode === 'foot' && P) {
        this.look_(dt);
        const v = P.vehicle;
        const crouchY = P.downed ? 0.5 : P.crouched ? 1.22 : 1.62;
        this.pivotY = U.damp(this.pivotY, crouchY, 10, dt);
        const pv = _v.set(P.pos.x, P.pos.y + this.pivotY, P.pos.z);
        const aiming = P.aiming;
        const dist = P.downed ? 3.2 : aiming ? (P.zoomed ? 0.6 : 1.45) : 3.3;
        this.curDist = U.damp(this.curDist, dist, 12, dt);
        const f = this.forward(_v2), r = this.right(_m);
        const sh = (aiming ? 0.62 : 0.55) * this.shoulder;
        const des = new V3(pv.x - f.x * this.curDist + r.x * sh, pv.y - f.y * this.curDist + 0.18, pv.z - f.z * this.curDist + r.z * sh);
        // omuz noktası (duvar içinden geçmesin)
        const shoulderPt = new V3(pv.x + r.x * sh * 0.8, pv.y + 0.1, pv.z + r.z * sh * 0.8);
        this.collidePlace(pv, shoulderPt, 0.05);
        this.collidePlace(shoulderPt, des, 0.2);
        this.pos.copy(des);
        cam.position.copy(this.pos);
        cam.lookAt(this.pos.x + f.x * 10, this.pos.y + f.y * 10, this.pos.z + f.z * 10);
        if (aiming) targetFov = P.zoomed ? (P.wdef && P.wdef.zoom) || 30 : s.fov * 0.74;
        else if (P.sprinting) targetFov = s.fov + 6;
      } else if (this.mode === 'vehicle' && P && P.vehicle) {
        const v = P.vehicle, D = v.def;
        this.look_(dt, 0.6);
        if (v.def.kind !== 'heli' && this.idleT > 1.6 && Math.abs(v.speed) > 3 && v.type !== 'tank') this.yaw = U.dampAng(this.yaw, v.yaw, 2.2, dt);
        if (v.def.kind === 'heli' && this.idleT > 0.8 && v.flying) this.yaw = U.dampAng(this.yaw, v.yaw, 1.5, dt);
        const close = this.vehClose;
        const dist = close ? D.cam[0] * 0.45 : D.cam[0];
        const pv = _v.set(v.pos.x, v.pos.y + D.cam[1], v.pos.z);
        const f = this.forward(_v2);
        const des = new V3(pv.x - f.x * dist, pv.y - f.y * dist + 1.0, pv.z - f.z * dist);
        this.collidePlace(pv, des, 1.5);
        const gh = K.world.terrainH(des.x, des.z) + 0.5; if (des.y < gh) des.y = gh;
        this.pos.lerp(des, 1 - Math.exp(-14 * dt));
        cam.position.copy(this.pos);
        cam.lookAt(pv.x + f.x * 8, pv.y + f.y * 8, pv.z + f.z * 8);
        targetFov = s.fov + Math.min(10, Math.abs(v.speed) * 0.3);
        if (v.type === 'tank' && P.aiming) targetFov = 28;
      } else if (this.mode === 'cine' && this.cine) {
        this.cine(dt, cam);
        targetFov = this.cineFov || 55;
      } else if (this.mode === 'drone' && P && P.drone) {
        this.look_(dt, 0.2);
        const d = P.drone;
        cam.position.copy(d.pos);
        const f = this.forward(_v2);
        cam.lookAt(d.pos.x + f.x, d.pos.y + f.y, d.pos.z + f.z);
        targetFov = 60;
      } else if (this.mode === 'orbit') {
        this.orbitT += dt * 0.04;
        const c = this.orbitCenter || { x: -170, y: 0, z: 190 };
        const R = this.orbitR || 60, H = this.orbitH || 26;
        cam.position.set(c.x + Math.sin(this.orbitT) * R, c.y + H + Math.sin(this.orbitT * 0.7) * 4, c.z + Math.cos(this.orbitT) * R);
        cam.lookAt(c.x, c.y + 4, c.z);
        targetFov = 55;
      }
      // sarsıntı
      if (this.shakeA > 0.001) {
        const a = this.shakeA * 0.06;
        cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a; cam.position.z += (Math.random() - 0.5) * a;
        cam.rotation.z += (Math.random() - 0.5) * a * 0.3;
        this.shakeA *= Math.exp(-6 * dt);
      }
      if (Math.abs(cam.fov - targetFov) > 0.05) { cam.fov = U.damp(cam.fov, targetFov, 10, dt); cam.updateProjectionMatrix(); K.fx.setScale(K.renderer.domElement.height, cam.fov); }
      K.audio.L.x = cam.position.x; K.audio.L.y = cam.position.y; K.audio.L.z = cam.position.z;
      const fw = cam.getWorldDirection(_v); K.audio.L.yaw = Math.atan2(fw.x, fw.z);
    },
    // ekran merkezinden dünya ışını
    aimPoint(maxD = 300, filter) {
      const cam = this.camera, f = cam.getWorldDirection(new V3());
      const o = cam.position.clone();
      const P = K.game.player;
      // kamerayla oyuncu arasındaki engelleri atla
      if (P && !P.vehicle) { const t = Math.max(0, (P.pos.x - o.x) * f.x + (P.pos.y + 1.4 - o.y) * f.y + (P.pos.z - o.z) * f.z); o.addScaledVector(f, Math.min(t, 4)); }
      const h = K.world.raycast(o.x, o.y, o.z, f.x, f.y, f.z, maxD);
      let best = h ? h.d : maxD, actor = null;
      for (const a of K.game.actors) {
        if (a === P || !a.alive || a.vehicle) continue;
        if (filter && !filter(a)) continue;
        const t = K.combat.rayActor(o.x, o.y, o.z, f.x, f.y, f.z, a, best);
        if (t > 0 && t < best) { best = t; actor = a; }
      }
      return { x: o.x + f.x * best, y: o.y + f.y * best, z: o.z + f.z * best, d: best, actor, hit: !!h || !!actor, o, f };
    },
  };

  // ═════════ Oyuncu ═════════
  class Player extends K.Actor {
    constructor(o) {
      super(Object.assign({ team: 'player', name: o.name || 'Saha Lideri' }, o));
      this.canBeDowned = true; this.bleedMax = 30;
      this.outfit = K.OUTFITS[o.outfit || 'tactical'];
      const sk = K.prog.skillVal;
      this.maxHp = this.hp = 100 * (1 + 0.15 * sk('hp'));
      this.armor = this.maxArmor = this.outfit.armor;
      this.dmgMul = 1 - 0.07 * sk('armor');
      this.maxStamina = this.stamina = 100 * (1 + 0.25 * sk('stamina'));
      this.weapons = [];
      const add = (id) => { if (!id || !K.WEAPONS[id]) return; const w = K.WEAPONS[id]; this.weapons.push({ id, def: w, ammo: w.mag, reserve: w.mag * (w.mags + sk('carry')) }); };
      if (this.outfit.id !== 'civil') add(o.primary || 'rifle');
      add(o.secondary || 'pistol_s');
      this.wi = 0; this.holstered = this.outfit.id === 'civil';
      this.setWeaponIdx(0, true);
      const g = K.GADGETS[o.gadget || 'medkit'];
      this.gadget = g ? { id: g.id, count: g.count, def: g } : null;
      this.items = new Set(); this.aiming = false; this.zoomed = false; this.sprinting = false;
      this.reloadT = -1; this.swapT = -1; this.interactHold = 0; this.holdTarget = null; this.nvg = false;
      this.spreadBloom = 0; this.everDrew = false; this.lastSafePos = this.pos.clone();
      this.regenT = 0; this.drone = null; this.actionT = 0;
    }
    get w() { return this.weapons[this.wi]; }
    setWeaponIdx(i, silent) {
      if (!this.weapons.length) return;
      this.wi = (i + this.weapons.length) % this.weapons.length;
      const w = this.w;
      this.weaponId = w.id; this.wdef = w.def;
      K.models.setWeapon(this.rig, w.id);
      if (!silent) { this.swapT = 0.6 * (1 - 0.15 * K.prog.skillVal('swap')); K.audio.reload(); }
    }
    get armed() { return !this.holstered && !this.downed && !!this.w; }
    update(dt) {
      const I = K.input, G = K.game;
      if (!this.alive) return;
      if (this.downed) {
        this.bleed -= dt;
        this.vel.set(0, 0, 0);
        if (this.bleed <= 0) this.die(this.lastHitBy);
        this.physics(dt); this.setAnim(dt);
        return;
      }
      if (this.drone) { this.updateDrone(dt); this.vel.set(0, 0, 0); this.physics(dt); this.setAnim(dt); return; }
      if (this.vehicle) { this.updateVehicle(dt); return; }
      // yön ve hız
      const mv = I.moveVec(), camYaw = CAM.yaw;
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
      let wx = fx * mv.y + rx * mv.x, wz = fz * mv.y + rz * mv.x;
      const ml = Math.hypot(wx, wz);
      if (I.hit('crouch')) this.crouched = !this.crouched;
      const wantAim = I.aim() && this.armed && this.swapT < 0 && G.canControl();
      this.aiming = wantAim;
      this.zoomed = wantAim && !!(this.wdef && this.wdef.zoom);
      this.sprinting = I.down('sprint') && ml > 0.2 && !this.aiming && this.stamina > 1 && !this.crouched && mv.y > -0.2;
      if (this.sprinting && this.crouched) this.crouched = false;
      let speed = 4.3;
      if (this.sprinting) speed = 7.0; else if (this.crouched) speed = 2.1; else if (this.aiming) speed = 2.7;
      if (ml < 0.6 && ml > 0.05 && !this.sprinting) speed *= 0.75;
      speed *= this.outfit.speed * (this.carrying ? 0.6 : 1);
      if (this.sprinting) this.stamina = Math.max(0, this.stamina - 18 * dt); else this.stamina = Math.min(this.maxStamina, this.stamina + 14 * dt);
      const tvx = ml > 0.01 ? wx / Math.max(1, ml) * speed : 0, tvz = ml > 0.01 ? wz / Math.max(1, ml) * speed : 0;
      const acc = this.onGround ? 14 : 3;
      this.vel.x = U.damp(this.vel.x, tvx, acc, dt); this.vel.z = U.damp(this.vel.z, tvz, acc, dt);
      if (I.hit('jump') && this.onGround && !this.crouched && G.canControl()) { this.vy = 5.6; this.onGround = false; }
      // bakış yönü
      const faceCam = this.aiming || (this.armed && (I.fire() || this.fireT > -0.4)) || this.reloadT >= 0;
      if (faceCam) this.yaw = U.dampAng(this.yaw, camYaw, 18, dt);
      else if (ml > 0.1) this.yaw = U.dampAng(this.yaw, Math.atan2(wx, wz), 10, dt);
      this.physics(dt);
      if (this.onGround && K.world.terrainH(this.pos.x, this.pos.z) > -0.3) this.lastSafePos.copy(this.pos);
      // silah işlemleri
      this.fireT -= dt; this.spreadBloom = Math.max(0, this.spreadBloom - dt * 2.5);
      if (this.swapT >= 0) { this.swapT -= dt; }
      if (this.reloadT >= 0) {
        this.reloadT += dt / (this.wdef.reload * (1 - 0.15 * K.prog.skillVal('swap')));
        if (this.reloadT >= 1) {
          const w = this.w, need = w.def.mag - w.ammo, take = Math.min(need, w.reserve);
          w.ammo += take; w.reserve -= take; this.reloadT = -1;
        }
      }
      if (G.canControl()) {
        if (I.hit('holster')) this.toggleHolster();
        if (I.hit('weapon') || I.wheel !== 0 && !K.ui.wheelOpen) {
          if (this.weapons.length > 1) { this.setWeaponIdx(this.wi + (I.wheel < 0 ? -1 : 1)); this.reloadT = -1; }
        }
        if (I.hit('reload')) this.startReload();
        if (I.hit('gadget')) this.useGadget();
        if (I.hit('nvg') && this.gadget && this.gadget.id === 'nvg') { this.nvg = !this.nvg; K.ui.toast(this.nvg ? 'Gece görüş açık' : 'Gece görüş kapalı'); }
        if (I.hit('camera')) CAM.shoulder *= -1;
        // ateş
        if (I.fire() && this.w) {
          if (this.holstered && I.fireHit()) this.toggleHolster();
          else if (this.armed && !this.sprinting && this.reloadT < 0 && this.swapT < 0 && this.fireT <= 0) {
            if (this.w.def.auto || I.fireHit()) {
              if (this.w.ammo > 0) this.shoot();
              else if (I.fireHit()) { K.audio.empty(); this.startReload(); }
            }
          }
        }
      }
      // yenilenme
      this.regenT -= dt;
      if (G.time - this.lastHitT > 6 && this.hp < this.maxHp * 0.6) this.hp = Math.min(this.maxHp * 0.6, this.hp + 3 * dt);
      // animasyon durumları
      this.setAnim(dt);
      const a = this.anim;
      a.armed = this.armed && this.swapT < 0.3;
      a.aim = U.damp(a.aim, this.aiming || (this.armed && this.fireT > -0.35) ? 1 : 0, 14, dt);
      a.pitch = CAM.pitch;
      a.reload = this.reloadT;
      a.torsoYaw = 0;
      a.pose = this.actionT > 0 ? (this.actionPose || 'interact') : 'normal';
      a.showWeapon = !(this.outfit.id === 'civil' && this.holstered);
      if (this.actionT > 0) this.actionT -= dt;
      if (this.outfit.id === 'civil' && this.holstered && this.rig.gunMesh) this.rig.gunMesh.visible = false;
    }
    toggleHolster() {
      this.holstered = !this.holstered;
      if (!this.holstered) { this.everDrew = true; K.bus.emit('weaponDrawn', this); }
      this.swapT = 0.45; K.audio.reload();
    }
    startReload() {
      const w = this.w;
      if (!w || this.reloadT >= 0 || w.ammo >= w.def.mag || w.reserve <= 0 || this.holstered) return;
      this.reloadT = 0; K.audio.reload();
    }
    muzzlePos(out) {
      const W = this.wdef && K.models.WEAPONS[this.weaponId];
      if (!W || !this.rig.gunMesh) return out.set(this.pos.x, this.pos.y + 1.4, this.pos.z);
      this.rig.gunMesh.updateWorldMatrix(true, false);
      return out.copy(W.muzzle).applyMatrix4(this.rig.gunMesh.matrixWorld);
    }
    shoot() {
      const w = this.w, d = w.def, G = K.game;
      this.fireT = d.rof; w.ammo--;
      const sk = K.prog.skillVal('aim');
      const moving = Math.hypot(this.vel.x, this.vel.z) > 1;
      let spread = (this.aiming ? d.aimSpread : d.spread) * (moving ? 1.7 : 1) * (this.crouched ? 0.7 : 1) * (1 - 0.2 * sk) + this.spreadBloom * 0.02;
      const ap = CAM.aimPoint(d.range, (a) => a.team !== 'squad' && a.team !== 'player');
      // namludan nişan noktasına doğru
      const mz = this.muzzlePos(new V3());
      const pellets = d.pellets || 1;
      let lastRes = null;
      for (let i = 0; i < pellets; i++) {
        const dx0 = ap.x - CAM.camera.position.x, dy0 = ap.y - CAM.camera.position.y, dz0 = ap.z - CAM.camera.position.z;
        const l0 = Math.hypot(dx0, dy0, dz0) || 1;
        let dx = dx0 / l0 + (Math.random() - 0.5) * 2 * spread, dy = dy0 / l0 + (Math.random() - 0.5) * 2 * spread, dz = dz0 / l0 + (Math.random() - 0.5) * 2 * spread;
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        const o = ap.o;
        const res = K.combat.hitscan(this, o.x, o.y, o.z, dx, dy, dz, d, (a) => a.team !== 'squad' && a.team !== 'player');
        if (i === 0 || res.type === 'actor') lastRes = res;
        if (i < 3) K.fx.tracer(mz.x, mz.y, mz.z, res.x, res.y, res.z);
        if (res.type === 'actor') { K.audio.hitmark(); K.ui.hitMarker(res.head); }
      }
      K.fx.muzzle(mz.x, mz.y, mz.z, d.silenced ? 0.35 : 1);
      K.audio.shot(d.snd, this.pos);
      K.bus.emit('noise', { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: d.noise, src: this, type: 'shot' });
      K.bus.emit('playerShot', { w: d, res: lastRes });
      this.anim.fire = 1; this.spreadBloom = Math.min(1.5, this.spreadBloom + 0.35);
      const rec = d.recoil * (1 - 0.3 * sk) * (this.crouched ? 0.75 : 1);
      CAM.pitch += rec; CAM.yaw += (Math.random() - 0.5) * rec * 0.6;
      CAM.shake(d.recoil * 3);
      G.stats.shots++;
      if (lastRes && lastRes.type === 'actor') G.stats.hits++;
      if (w.ammo === 0 && w.reserve > 0) setTimeout(() => this.alive && this.startReload(), 250);
    }
    useGadget() {
      const g = this.gadget; if (!g) return;
      if (g.count <= 0 && g.id !== 'nvg') { K.ui.toast(`${g.def.name} kalmadı`, 'bad'); return; }
      if (g.id === 'medkit') {
        const near = K.game.actors.find((a) => a !== this && (a.team === 'squad' || a.team === 'vip') && a.alive && (a.downed || a.hp < a.maxHp * 0.7) && this.dist(a.pos) < 2.6);
        if (near) { if (near.downed) near.revive(0.8); else near.hp = near.maxHp; g.count--; K.ui.toast(`${near.name} tedavi edildi`, 'ok'); this.actionT = 1.0; this.actionPose = 'kneel'; K.audio.pickup(); return; }
        if (this.hp >= this.maxHp) { K.ui.toast('Sağlığın zaten tam'); return; }
        this.hp = this.maxHp; g.count--; K.ui.toast('İlk yardım uygulandı', 'ok'); K.audio.pickup(); this.actionT = 0.8;
      } else if (g.id === 'flash') {
        const ap = CAM.aimPoint(22);
        const x = ap.x, y = K.world.groundAt(ap.x, ap.z, this.pos.y + 3), z = ap.z;
        g.count--; K.ui.toast('Şok bombası atıldı');
        this.actionT = 0.5; this.actionPose = 'interact';
        setTimeout(() => { const n = K.combat.flashbang(x, y, z, this); if (n) K.ui.toast(`${n} şüpheli sersemledi`, 'ok'); }, 900);
      } else if (g.id === 'drone') {
        if (this.vehicle) return;
        g.count--;
        this.drone = { pos: new V3(this.pos.x, this.pos.y + 4, this.pos.z), t: 30, vel: new V3() };
        CAM.mode = 'drone'; CAM.pitch = -0.7;
        K.ui.toast('Dron havada — WASD ile uçur, G ile geri çağır. Görülen düşmanlar işaretlenir.', 'ok');
      } else if (g.id === 'nvg') { this.nvg = !this.nvg; }
    }
    updateDrone(dt) {
      const I = K.input, d = this.drone;
      d.t -= dt;
      const mv = I.moveVec(), f = CAM.forward(_v), r = CAM.right(_m);
      const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw);
      d.vel.x = U.damp(d.vel.x, (fx * mv.y + r.x * mv.x) * 14, 3, dt);
      d.vel.z = U.damp(d.vel.z, (fz * mv.y + r.z * mv.x) * 14, 3, dt);
      d.vel.y = U.damp(d.vel.y, ((I.down('up') ? 1 : 0) - (I.down('down') ? 1 : 0)) * 6, 3, dt);
      d.pos.addScaledVector(d.vel, dt);
      const g = K.world.groundAt(d.pos.x, d.pos.z, 200, 0.5);
      d.pos.y = U.clamp(d.pos.y, g + 3, g + 60);
      const dd = Math.hypot(d.pos.x - this.pos.x, d.pos.z - this.pos.z);
      if (dd > 140) { d.pos.x = this.pos.x + (d.pos.x - this.pos.x) / dd * 140; d.pos.z = this.pos.z + (d.pos.z - this.pos.z) / dd * 140; }
      // görüş alanındaki düşmanları işaretle
      for (const e of K.game.actors) {
        if (e.team !== 'enemy' || !e.alive) continue;
        const dx = e.pos.x - d.pos.x, dz = e.pos.z - d.pos.z, dy = e.pos.y - d.pos.y, l = Math.hypot(dx, dy, dz);
        if (l > 70) continue;
        const dot = (dx * f.x + dy * f.y + dz * f.z) / l;
        if (dot > 0.6 && K.world.los(d.pos.x, d.pos.y, d.pos.z, e.pos.x, e.pos.y + 1.2, e.pos.z)) { if (!e.marked || e.marked < K.game.time) K.bus.emit('marked', e); e.marked = K.game.time + 40; }
      }
      if (d.t <= 0 || I.hit('gadget') || I.hit('interact')) { this.drone = null; CAM.mode = 'foot'; K.ui.toast('Dron geri döndü'); }
    }
    updateVehicle(dt) {
      const v = this.vehicle, I = K.input;
      this.pos.copy(v.pos);
      if (v.seats[0].actor === this) {
        if (K.game.canControl()) v.control(I, dt);
        else { v.input.t = 0; v.input.s = 0; v.input.up = 0; v.input.fwd = 0; v.input.yaw = 0; }
        if (v.def.kind === 'heli') { if (!v.engine) v.engine = true; }
        if (I.hit('lights') || (I.hit('camera') && v.def.kind !== 'tank')) { if (I.hit('lights')) v.setLights(!v.lightsOn); else CAM.vehClose = !CAM.vehClose; }
        if (v.type === 'tank') this.tankControl(v, dt);
      } else if (I.hit('camera')) CAM.vehClose = !CAM.vehClose;
      this.aiming = I.aim() && v.type === 'tank';
      if (I.hit('interact') && K.game.canControl()) {
        const sp = v.def.kind === 'heli' ? (v.flying ? 99 : v.speed) : Math.abs(v.speed);
        if (sp < 3.5) { I.consume('interact'); v.exit(this); CAM.mode = 'foot'; CAM.yaw = this.yaw; K.audio.setLoop('engine', 0); if (v.def.kind === 'heli' && !v.ai) v.engine = false; }
        else K.ui.toast(v.def.kind === 'heli' && v.flying ? 'İnmeden araçtan çıkamazsın' : 'Önce yavaşla');
      }
    }
    tankControl(v, dt) {
      const want = U.angDiff(v.yaw, CAM.yaw);
      v.turretYaw += U.clamp(U.angDiff(v.turretYaw, want), -0.9 * dt, 0.9 * dt);
      v.barrelPitch = U.damp(v.barrelPitch, U.clamp(CAM.pitch + 0.12, -0.12, 0.35), 4, dt);
      v.reloadT -= dt;
      if (K.input.fireHit() && v.reloadT <= 0 && K.game.canControl()) {
        v.reloadT = 3.2;
        const m = v.m.muzzle; m.updateWorldMatrix(true, false);
        const mp = new V3().setFromMatrixPosition(m.matrixWorld);
        const ap = CAM.aimPoint(400);
        let dx = ap.x - mp.x, dy = ap.y - mp.y, dz = ap.z - mp.z; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        // namlu yönünden çok sapmasın
        const bf = new V3(0, 0, 1).transformDirection(m.matrixWorld);
        if (bf.x * dx + bf.y * dy + bf.z * dz < 0.96) { dx = bf.x; dy = bf.y; dz = bf.z; }
        const h = K.world.raycast(mp.x, mp.y, mp.z, dx, dy, dz, 400);
        let best = h ? h.d : 400;
        for (const vv of K.game.vehicles) { if (vv === v) continue; const t = vv.rayHit(mp.x, mp.y, mp.z, dx, dy, dz, best); if (t > 0 && t < best) best = t; }
        for (const a of K.game.actors) { if (!a.alive || a.vehicle) continue; const t = K.combat.rayActor(mp.x, mp.y, mp.z, dx, dy, dz, a, best); if (t > 0 && t < best) best = t; }
        const ex = mp.x + dx * best, ey = mp.y + dy * best, ez = mp.z + dz * best;
        K.fx.muzzle(mp.x, mp.y, mp.z, 3); K.fx.tracer(mp.x, mp.y, mp.z, ex, ey, ez, 0xffa040);
        for (let i = 0; i < 10; i++) K.fx.smoke.spawn(mp.x, mp.y, mp.z, dx * 6 + (Math.random() - 0.5) * 3, dy * 6 + Math.random() * 2, dz * 6 + (Math.random() - 0.5) * 3, 1.5, 0.8, 3, 0.6, 0.58, 0.55, 0.5, 2, -0.2);
        K.audio.shot('tank', v.pos); CAM.shake(0.8);
        setTimeout(() => K.combat.explode(ex, ey, ez, 8, 260, this, { size: 1.2 }), Math.min(400, best * 2));
        K.bus.emit('tankFire', { x: ex, y: ey, z: ez });
      }
    }
    onDamaged(dmg) { K.audio.hurt(); K.ui.damageFlash(dmg); CAM.shake(0.15 + dmg * 0.01); }
    onDowned() { this.crouched = false; this.aiming = false; K.ui.toast('YARALANDIN — ekip seni ayağa kaldırmalı!', 'bad'); K.audio.say('Lider yaralandı!'); }
    inWater() { this.pos.copy(this.lastSafePos); this.damage(25, null); K.ui.toast('Sudan çıkarıldın', 'bad'); }
  }
  K.Player = Player;
})();
