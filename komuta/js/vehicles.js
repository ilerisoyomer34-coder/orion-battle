/* KOMUTA — araç sistemi: ortak temel (koltuk, hasar, ışık, giriş/çıkış), tekerli/paletli sürüş, helikopter uçuşu, TIR dorsesi, yapay zekâ sürüş */
'use strict';
(function () {
  const U = K.U, V3 = THREE.Vector3, W = () => K.world;

  const DEFS = {
    patrol: { name: '4x4 Zırhlı Devriye', hp: 900, len: 5.4, wid: 2.3, h: 2.9, maxSpeed: 24, accel: 9, brake: 20, steerMax: 0.55, wb: 3.5, kind: 'wheeled', cam: [9, 3.6], seats: ['driver', 'front', 'rear', 'rear', 'gunner'], model: () => K.models.veh4x4() },
    apc: { name: '8x8 Personel Taşıyıcı', hp: 1700, len: 7.9, wid: 2.9, h: 3.3, maxSpeed: 20, accel: 6.5, brake: 16, steerMax: 0.42, wb: 5.4, kind: 'wheeled', cam: [12, 4.6], seats: ['driver', 'gunner', 'rear', 'rear', 'rear', 'rear', 'rear', 'rear', 'rear', 'rear'], model: () => K.models.vehAPC() },
    tank: { name: 'Ana Muharebe Tankı', hp: 3200, len: 7.6, wid: 3.6, h: 2.9, maxSpeed: 15, accel: 3.6, brake: 9, steerMax: 0, turn: 0.75, wb: 4, kind: 'tracked', cam: [13, 5.2], seats: ['driver', 'crew', 'crew'], model: () => K.models.vehTank() },
    heli: { name: 'Nakliye Helikopteri', hp: 1500, len: 9, wid: 2.6, h: 3.6, maxSpeed: 42, kind: 'heli', cam: [16, 5], seats: ['pilot', 'copilot', 'rear', 'rear', 'rear', 'rear', 'rear', 'rear', 'rear', 'rear'], model: () => K.models.vehHeli() },
    truck: { name: 'TIR (Siyah Akrep Lojistik)', hp: 1300, len: 7.4, wid: 2.5, h: 4, maxSpeed: 22, accel: 4.2, brake: 12, steerMax: 0.5, wb: 4.6, kind: 'wheeled', truck: true, cam: [16, 6], seats: ['driver', 'front'], model: () => K.models.vehTruck() },
    sedan: { name: 'Sivil araç', hp: 380, len: 4.4, wid: 1.85, h: 1.6, maxSpeed: 20, accel: 7, brake: 18, steerMax: 0.6, wb: 2.7, kind: 'wheeled', cam: [7, 2.6], seats: ['driver', 'front', 'rear', 'rear'], model: (c) => K.models.vehCar('sedan', c) },
    suv: { name: 'Zırhlı SUV', hp: 700, len: 4.8, wid: 2.0, h: 1.9, maxSpeed: 22, accel: 7.5, brake: 18, steerMax: 0.55, wb: 3.1, kind: 'wheeled', cam: [8, 2.9], seats: ['driver', 'front', 'rear', 'rear'], model: (c) => K.models.vehCar('suv', c || 0x121214) },
    van: { name: 'Minibüs', hp: 500, len: 5, wid: 2.0, h: 2.3, maxSpeed: 19, accel: 6, brake: 16, steerMax: 0.55, wb: 3.2, kind: 'wheeled', cam: [8, 3], seats: ['driver', 'front', 'rear', 'rear', 'rear', 'rear'], model: (c) => K.models.vehCar('van', c || 0xd8d8d8) },
    ambulance: { name: 'Ambulans', hp: 600, len: 5, wid: 2.0, h: 2.3, maxSpeed: 20, accel: 6, brake: 16, steerMax: 0.55, wb: 3.2, kind: 'wheeled', cam: [8, 3], seats: ['driver', 'front', 'rear', 'rear'], model: () => K.models.vehCar('ambulance', 0xf0f0f0) },
  };
  K.VEHDEFS = DEFS;

  const _p = new V3(), _push = { hit: false, nx: 0, nz: 0 };
  let VID = 0;

  class Vehicle {
    constructor(type, o = {}) {
      this.id = ++VID; this.type = type; this.def = DEFS[type]; this.team = o.team || 'player';
      this.m = this.def.model(o.color);
      this.root = this.m.root;
      K.game.dyn.add(this.root);
      if (this.m.trailer) K.game.dyn.add(this.m.trailer.root);
      this.pos = new V3(o.x, 0, o.z); this.yaw = o.yaw || 0;
      this.pos.y = o.y != null ? o.y : W().groundAt(o.x, o.z, 50, 0.5);
      this.speed = 0; this.steerA = 0; this.vel = new V3(); this.yawRate = 0;
      this.hp = this.maxHp = o.hp || this.def.hp; this.alive = true;
      this.seats = this.def.seats.map((role) => ({ role, actor: null }));
      this.lightsOn = false; this.pitch = 0; this.roll = 0; this.bob = 0;
      this.input = { t: 0, s: 0, hb: false, up: 0, yaw: 0 };
      this.ai = null; this.name = o.name || this.def.name;
      this.locked = !!o.locked; this.tags = new Set(o.tags || []);
      this.wheelSpin = 0; this.trackOff = [0, 0];
      this.burnT = 0;
      if (this.def.kind === 'heli') { this.rotor = o.rotorOn ? 1 : 0; this.engine = !!o.rotorOn; this.vel.set(0, 0, 0); this.flying = false; this.doorOpen = 1; }
      if (this.def.truck) { this.trailerYaw = this.yaw; this.trailerLen = 9.5; }
      if (this.type === 'tank') { this.turretYaw = 0; this.barrelPitch = 0; this.reloadT = 0; this.mgT = 0; }
      // çarpışma daireleri
      const L = this.def.len, r = this.def.wid / 2;
      this.circles = [];
      for (let z = -L / 2 + r; z <= L / 2 - r + 0.01; z += r * 1.3) this.circles.push(z);
      if (!this.circles.length) this.circles.push(0);
      this.cr = r;
      this.sync(0);
    }
    get driver() { return this.seats[0].actor; }
    get occupants() { return this.seats.filter((s) => s.actor).map((s) => s.actor); }
    freeSeats() { return this.seats.filter((s) => !s.actor).length; }
    fwd() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
    worldPoint(lx, ly, lz, out) {
      const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
      out = out || new V3();
      return out.set(this.pos.x + lx * c + lz * s, this.pos.y + ly, this.pos.z - lx * s + lz * c);
    }
    toLocal(x, z) { const dx = x - this.pos.x, dz = z - this.pos.z, c = Math.cos(this.yaw), s = Math.sin(this.yaw); return { x: dx * c - dz * s, z: dx * s + dz * c }; }
    doorPoint() { const side = this.def.wid / 2 + 1.0; return this.worldPoint(side, 0, this.def.kind === 'heli' ? 0 : 0.3); }
    nearDoor(actor, r = 3.2) {
      const l = this.toLocal(actor.pos.x, actor.pos.z);
      return Math.abs(l.x) < this.def.wid / 2 + r && Math.abs(l.z) < this.def.len / 2 + r * 0.6 && Math.abs(actor.pos.y - this.pos.y) < 3;
    }
    enter(actor, prefer) {
      if (!this.alive) return -1;
      let idx = -1;
      if (prefer === 'driver' && !this.seats[0].actor) idx = 0;
      if (idx < 0) for (let i = prefer === 'driver' ? 0 : 1; i < this.seats.length; i++) if (!this.seats[i].actor) { idx = i; break; }
      if (idx < 0 && prefer !== 'driver' && !this.seats[0].actor && actor.team !== 'player') idx = -1;
      if (idx < 0) return -1;
      this.seats[idx].actor = actor; actor.vehicle = this; actor.seat = idx;
      actor.vel.set(0, 0, 0);
      K.bus.emit('vehicleEnter', { v: this, actor, seat: idx });
      return idx;
    }
    exit(actor, i = 0) {
      const s = this.seats[actor.seat];
      if (s && s.actor === actor) s.actor = null;
      actor.vehicle = null; actor.seat = -1;
      // boş bir iniş noktası bul
      const side = this.def.wid / 2 + 0.9 + (i % 3) * 0.9;
      const cand = [[side, 0.5 - Math.floor(i / 3) * 1.4], [-side, 0.5 - Math.floor(i / 3) * 1.4], [0, -this.def.len / 2 - 1.2 - i * 0.9], [side, 2], [-side, 2]];
      for (const [lx, lz] of cand) {
        const p = this.worldPoint(lx, 0, lz);
        const g = W().groundAt(p.x, p.z, this.pos.y + 3, 0.3);
        _p.set(p.x, g, p.z);
        const before = _p.x + _p.z;
        W().pushCircle(_p, 0.4, g + 0.45, g + 1.8, _push);
        if (!_push.hit || Math.abs(_p.x + _p.z - before) < 0.4) { actor.pos.set(_p.x, g, _p.z); break; }
      }
      actor.yaw = this.yaw; actor.vy = 0;
      actor.layer = 0;
      K.bus.emit('vehicleExit', { v: this, actor });
    }
    ejectAll() { let i = 0; for (const s of this.seats) if (s.actor) this.exit(s.actor, i++); }
    setLights(v) { this.lightsOn = v; if (this.m.lightMat) this.m.lightMat.color.setScalar(v ? 1.6 : 0.35); if (this.m.trailer) this.m.trailer.lightMat.color.setScalar(v ? 1.6 : 0.4); }
    damage(n, src, o = {}) {
      if (!this.alive || this.invuln) return;
      this.hp -= n; this.lastHitBy = src;
      if (this.onDamaged) this.onDamaged(n, src);
      if (this.hp <= 0) { this.hp = 0; this.destroy(src); }
    }
    destroy(src) {
      if (!this.alive) return;
      this.alive = false; this.speed = 0;
      K.combat.explode(this.pos.x, this.pos.y + 1.2, this.pos.z, 7, 120, src, { size: 1.4 });
      for (const s of this.seats) if (s.actor) { const a = s.actor; this.exit(a); a.damage(60, src); }
      const burnt = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 1 });
      this.root.traverse((x) => { if (x.isMesh) x.material = burnt; });
      if (this.m.trailer) this.m.trailer.root.traverse((x) => { if (x.isMesh) x.material = burnt; });
      if (this.def.kind === 'heli') { this.flying = false; this.engine = false; }
      K.bus.emit('vehicleDestroyed', { v: this, src });
    }
    // ── Oyuncudan girdi
    control(I, dt, look) {
      const mv = I.moveVec();
      this.input.t = mv.y; this.input.s = -mv.x; this.input.hb = I.down('jump');
      if (this.def.kind === 'heli') {
        this.input.up = (I.down('up') ? 1 : 0) - (I.down('down') ? 1 : 0);
        this.input.yaw = -mv.x; this.input.fwd = mv.y;
      }
    }
    // ── Kare güncellemesi
    update(dt) {
      if (this.def.kind === 'heli') this.updateHeli(dt);
      else this.updateGround(dt);
      this.sync(dt);
    }
    updateGround(dt) {
      const D = this.def;
      if (this.ai && this.alive && !this.playerDriven()) this.aiDrive(dt);
      let t = this.alive ? this.input.t : 0, s = this.input.s;
      if (!this.driver && !this.ai) { t = 0; s = 0; }
      const maxS = D.maxSpeed * (this.hp < this.maxHp * 0.25 ? 0.6 : 1) * (this.speedMul || 1);
      if (t > 0.05) {
        if (this.speed < -0.5) this.speed += D.brake * dt;
        else this.speed += D.accel * t * dt * Math.max(0, 1 - this.speed / maxS);
      } else if (t < -0.05) {
        if (this.speed > 0.5) this.speed -= D.brake * dt * (-t);
        else this.speed -= D.accel * 0.6 * (-t) * dt * Math.max(0, 1 + this.speed / (maxS * 0.35));
      } else {
        this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), (D.kind === 'tracked' ? 4 : 1.6) * dt);
      }
      if (this.input.hb) this.speed *= Math.exp(-3 * dt);
      if (D.kind === 'tracked') {
        const tr = s * D.turn * (this.speed < -0.5 ? -1 : 1);
        this.yawRate = U.damp(this.yawRate, tr, 4, dt);
      } else {
        const target = s * D.steerMax * (1 - 0.55 * Math.min(1, Math.abs(this.speed) / D.maxSpeed));
        this.steerA = U.damp(this.steerA, target, 7, dt);
        this.yawRate = this.speed * Math.tan(this.steerA) / D.wb;
      }
      this.yaw += this.yawRate * dt;
      const f = this.fwd();
      this.pos.x += f.x * this.speed * dt; this.pos.z += f.z * this.speed * dt;
      this.collide(dt);
      // zemin takibi
      const L = D.len * 0.42, Wd = D.wid * 0.42, c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
      const gy = (lx, lz) => W().groundAt(this.pos.x + lx * c + lz * sn, this.pos.z - lx * sn + lz * c, this.pos.y + 0.7, 0.2);
      const hf = gy(0, L), hb = gy(0, -L), hl = gy(Wd, 0), hr = gy(-Wd, 0);
      const ty = Math.max((hf + hb) / 2, (hl + hr) / 2);
      if (ty > this.pos.y) this.pos.y = U.damp(this.pos.y, ty, 18, dt);
      else { this.vy = (this.vy || 0) - 20 * dt; this.pos.y = Math.max(ty, this.pos.y + this.vy * dt); if (this.pos.y <= ty) this.vy = 0; }
      const acc = (this.speed - (this.lastSpeed || 0)) / Math.max(dt, 1e-4); this.lastSpeed = this.speed;
      this.pitch = U.damp(this.pitch, Math.atan2(hb - hf, L * 2) - U.clamp(acc * 0.004, -0.05, 0.05), 8, dt);
      this.roll = U.damp(this.roll, Math.atan2(hr - hl, Wd * 2) + U.clamp(this.yawRate * this.speed * 0.012, -0.08, 0.08), 8, dt);
      if (this.def.truck) this.updateTrailer(dt);
      // ezme
      if (Math.abs(this.speed) > 6) {
        for (const a of K.game.actors) {
          if (!a.alive || a.vehicle || a.downed) continue;
          const l = this.toLocal(a.pos.x, a.pos.z);
          if (Math.abs(l.x) < D.wid / 2 + 0.3 && Math.abs(l.z) < D.len / 2 + 0.4 && Math.abs(a.pos.y - this.pos.y) < 2) {
            a.damage(Math.abs(this.speed) * 9, this.driver || this, { runover: true });
            a.vel.set(f.x * this.speed * 0.6, 0, f.z * this.speed * 0.6);
          }
        }
      }
      // ses
      if (this.playerInside()) { K.audio.setLoop('engine', this.alive ? 0.32 : 0, 0.15 + Math.abs(this.speed) / D.maxSpeed * 0.85); }
    }
    updateTrailer(dt) {
      const hit = this.worldPoint(0, 0, -2.6);
      this.trailerYaw += (this.speed / this.trailerLen) * Math.sin(this.yaw - this.trailerYaw) * dt;
      this.hitch = hit;
      // dorse çarpışması
      const s = Math.sin(this.trailerYaw), c = Math.cos(this.trailerYaw);
      for (let z = -1.5; z >= -11.5; z -= 2.5) {
        _p.set(hit.x + s * z, this.pos.y, hit.z + c * z);
        const bx = _p.x, bz = _p.z;
        W().pushCircle(_p, 1.25, this.pos.y + 0.6, this.pos.y + 3.5, _push);
        if (_push.hit) { this.pos.x += (_p.x - bx) * 0.6; this.pos.z += (_p.z - bz) * 0.6; this.trailerYaw += U.clamp(((_p.x - bx) * c - (_p.z - bz) * s) * 0.02, -0.02, 0.02); this.speed *= 0.92; }
      }
    }
    collide(dt) {
      const f = this.fwd(), D = this.def;
      let hitAny = false, hx = 0, hz = 0;
      for (const oz of this.circles) {
        _p.set(this.pos.x + f.x * oz, this.pos.y, this.pos.z + f.z * oz);
        const bx = _p.x, bz = _p.z;
        W().pushCircle(_p, this.cr, this.pos.y + 0.55, this.pos.y + D.h, _push);
        if (_push.hit) { hitAny = true; hx += _p.x - bx; hz += _p.z - bz; this.pos.x += _p.x - bx; this.pos.z += _p.z - bz; }
      }
      // araç-araç
      for (const o of K.game.vehicles) {
        if (o === this || o.def.kind === 'heli' && o.flying) continue;
        if (Math.abs(o.pos.x - this.pos.x) > 14 || Math.abs(o.pos.z - this.pos.z) > 14) continue;
        const of = o.fwd();
        for (const a of this.circles) for (const b of o.circles) {
          const ax = this.pos.x + f.x * a, az = this.pos.z + f.z * a, bx = o.pos.x + of.x * b, bz = o.pos.z + of.z * b;
          const dx = ax - bx, dz = az - bz, d = Math.hypot(dx, dz), rr = this.cr + o.cr;
          if (d < rr && d > 1e-4) {
            const pen = (rr - d) / d * 0.5;
            this.pos.x += dx * pen; this.pos.z += dz * pen;
            if (!o.parked) { o.pos.x -= dx * pen; o.pos.z -= dz * pen; }
            hitAny = true;
            if (Math.abs(this.speed) > 5) { o.damage(Math.abs(this.speed) * 3, this.driver); o.speed = this.speed * 0.4; }
          }
        }
      }
      if (hitAny) {
        const sp = Math.abs(this.speed);
        if (sp > 7 && (this._crashT || 0) < K.game.time) { this.damage(sp * (D.kind === 'tracked' ? 0.5 : 4), null); K.audio.impact(this.pos, 'metal'); K.audio.explosion(this.pos, 0.15); this._crashT = K.game.time + 0.6; if (this.playerInside()) K.cam.shake(0.4); }
        const n = Math.hypot(hx, hz);
        if (n > 1e-4) {
          const dot = (f.x * hx + f.z * hz) / n;
          if (dot * Math.sign(this.speed) < -0.3) this.speed *= D.kind === 'tracked' ? 0.3 : -0.25;
        } else this.speed *= 0.6;
      }
    }
    playerDriven() { return this.driver && this.driver.team === 'player'; }
    playerInside() { const p = K.game.player; return p && p.vehicle === this; }
    // ── Yapay zekâ sürüş (trafik, konvoy)
    aiDrive(dt) {
      const ai = this.ai;
      if (!ai.path || !ai.path.length) { this.input.t = 0; this.input.s = 0; this.input.hb = true; return; }
      const tgt = ai.path[ai.idx];
      const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < (ai.reach || 7)) {
        ai.idx++;
        if (ai.idx >= ai.path.length) { if (ai.loop) ai.idx = 0; else { ai.idx = ai.path.length - 1; ai.done = true; ai.onEnd && ai.onEnd(this); ai.onEnd = null; this.input.t = 0; this.input.hb = true; return; } }
      }
      if (ai.done) { this.input.t = 0; this.input.hb = true; return; }
      const want = Math.atan2(dx, dz), err = U.angDiff(this.yaw, want);
      this.input.s = U.clamp(err * 2.2, -1, 1);
      let target = (ai.speed || 9) * (1 - Math.min(0.6, Math.abs(err)));
      // önde engel var mı?
      const f = this.fwd();
      let block = 99;
      const look = 6 + Math.abs(this.speed) * 1.2;
      for (const a of K.game.actors) {
        if (!a.alive || a.vehicle) continue;
        const l = this.toLocal(a.pos.x, a.pos.z);
        if (l.z > 0 && l.z < this.def.len / 2 + look && Math.abs(l.x) < this.def.wid / 2 + 0.8) block = Math.min(block, l.z);
      }
      for (const o of K.game.vehicles) {
        if (o === this) continue;
        const l = this.toLocal(o.pos.x, o.pos.z);
        if (l.z > 0 && l.z < this.def.len / 2 + look + o.def.len / 2 && Math.abs(l.x) < this.def.wid / 2 + 1.0) block = Math.min(block, l.z - o.def.len / 2);
      }
      if (ai.ignoreBlock) block = 99;
      if (block < this.def.len / 2 + 2.5) target = 0;
      else if (block < 99) target = Math.min(target, (block - this.def.len / 2) * 0.8);
      this.input.t = this.speed < target ? 1 : (this.speed > target + 1 ? -0.6 : 0);
      this.input.hb = target === 0 && this.speed < 1;
      if (ai.waitT > 0) { ai.waitT -= dt; this.input.t = 0; this.input.hb = true; }
    }
    // ── Helikopter
    updateHeli(dt) {
      const D = this.def;
      const powered = this.alive && (this.engine || this.driver || this.ai);
      this.rotor = U.clamp(this.rotor + (powered ? dt / 3.5 : -dt / 6), 0, 1);
      const g = W().groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 1.4);
      let ax = 0, ay = 0, az = 0, yawIn = 0;
      if (this.ai && this.alive && !this.playerDriven()) {
        const r = this.heliAI(dt, g); ax = r.ax; ay = r.ay; az = r.az; yawIn = r.yaw;
      } else if (this.driver && this.alive) {
        const f = this.fwd();
        const lift = this.rotor > 0.85;
        if (lift) {
          ax = f.x * this.input.fwd * 16; az = f.z * this.input.fwd * 16;
          ay = this.input.up * 9;
          yawIn = this.input.yaw * 1.3 + (this.mouseYaw || 0);
        }
      }
      const liftOK = this.rotor > 0.85 && this.alive;
      if (!liftOK) ay -= 14;
      else if (this.pos.y > g + 0.3 && !this.ai && !this.driver) ay -= 3;
      this.vel.x += ax * dt; this.vel.y += ay * dt; this.vel.z += az * dt;
      this.vel.x *= Math.exp(-0.7 * dt); this.vel.z *= Math.exp(-0.7 * dt); this.vel.y *= Math.exp(-1.8 * dt);
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (hs > D.maxSpeed) { this.vel.x *= D.maxSpeed / hs; this.vel.z *= D.maxSpeed / hs; }
      this.yawRate = U.damp(this.yawRate, yawIn, 4, dt);
      this.yaw += this.yawRate * dt;
      this.pos.addScaledVector(this.vel, dt);
      // tavan
      if (this.pos.y > 160) { this.pos.y = 160; this.vel.y = Math.min(0, this.vel.y); }
      // gövde & rotor çarpışması
      _p.set(this.pos.x, this.pos.y, this.pos.z);
      W().pushCircle(_p, 2.2, this.pos.y + 0.8, this.pos.y + 3.2, _push);
      if (_push.hit) { this.pos.x = _p.x; this.pos.z = _p.z; if (hs > 8) { this.damage(hs * 6); K.cam.shake(0.6); } this.vel.x *= -0.3; this.vel.z *= -0.3; }
      _p.set(this.pos.x, this.pos.y, this.pos.z);
      W().pushCircle(_p, 7.0, this.pos.y + 3.6, this.pos.y + 4.2, _push);
      if (_push.hit && this.rotor > 0.5 && this.flying) { this.damage(150 * dt * 10); this.pos.x = _p.x; this.pos.z = _p.z; this.vel.x *= -0.5; this.vel.z *= -0.5; K.audio.impact(this.pos, 'metal'); }
      const g2 = W().groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 1.4);
      if (this.pos.y <= g2) {
        if (this.vel.y < -9 || (this.flying && hs > 14)) this.damage(Math.abs(this.vel.y) * 60 + hs * 20);
        this.pos.y = g2; this.vel.y = Math.max(0, this.vel.y); this.vel.x *= Math.exp(-6 * dt); this.vel.z *= Math.exp(-6 * dt);
        this.flying = false;
      } else if (this.pos.y > g2 + 0.6) this.flying = true;
      const f = this.fwd();
      const fwdV = this.vel.x * f.x + this.vel.z * f.z, latV = this.vel.x * f.z - this.vel.z * f.x;
      this.pitch = U.damp(this.pitch, this.flying ? -fwdV * 0.012 - (ax * f.x + az * f.z) * 0.012 : 0, 3, dt);
      this.roll = U.damp(this.roll, this.flying ? latV * 0.015 - this.yawRate * 0.12 : 0, 3, dt);
      this.speed = hs;
      // aşağı akış tozu
      if (this.rotor > 0.6 && this.pos.y - g2 < 14 && Math.random() < 0.6) {
        const a = Math.random() * 6.28, r = 3 + Math.random() * 6;
        K.fx.dust(this.pos.x + Math.cos(a) * r, g2, this.pos.z + Math.sin(a) * r, 1, 0.55, 0.52, 0.45, 1.6);
      }
      // ses (yakınsa)
      const pl = K.game.player;
      if (pl) {
        const d = this.playerInside() ? 0 : Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
        K.game._rotorVol = Math.max(K.game._rotorVol || 0, this.rotor * Math.max(0, 1 - d / 220) * (this.playerInside() ? 0.55 : 0.75));
        K.game._rotorRate = this.rotor;
      }
    }
    heliAI(dt, g) {
      const ai = this.ai, f = this.fwd();
      if (ai.mode === 'idle' || !ai.path) { return { ax: 0, ay: this.flying ? -2 : 0, az: 0, yaw: 0 }; }
      const tgt = ai.path[ai.idx];
      const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, d = Math.hypot(dx, dz);
      const last = ai.idx === ai.path.length - 1;
      const groundT = W().groundAt(tgt.x, tgt.z, 200, 1.4);
      const alt = last && ai.land ? groundT : Math.max(groundT, W().terrainH(this.pos.x, this.pos.z)) + (tgt.alt || ai.alt || 40);
      let ay = 0, ax = 0, az = 0, yaw = 0;
      if (this.rotor < 0.9) return { ax: 0, ay: 0, az: 0, yaw: 0 };
      const want = Math.atan2(dx, dz), err = U.angDiff(this.yaw, want);
      yaw = d > 6 ? U.clamp(err * 1.4, -0.9, 0.9) : 0;
      let spd = (ai.speed || 30) * U.clamp(d / 45, 0.25, 1) * (1 - Math.min(0.7, Math.abs(err)));
      if (last && ai.land) spd = Math.min(spd, d * 0.9 + 0.5);
      const fv = this.vel.x * f.x + this.vel.z * f.z;
      const acc = U.clamp((spd - fv) * 1.2, -12, 12);
      ax = f.x * acc; az = f.z * acc;
      // yanal sürtünme
      const lat = this.vel.x * f.z - this.vel.z * f.x;
      ax -= f.z * lat * 1.5; az += f.x * lat * 1.5;
      let targetY = alt;
      if (last && ai.land && d > 22) targetY = Math.max(alt + 12, this.pos.y - 0.1);
      ay = U.clamp((targetY - this.pos.y) * 1.5 - this.vel.y * 1.0, -11, 10);
      if (d < (last ? 2.5 : 22)) {
        if (!last) ai.idx++;
        else if (ai.land) { if (this.pos.y - groundT < 0.4) { if (!ai.arrived) { ai.arrived = true; ai.onArrive && ai.onArrive(this); } } }
        else if (!ai.arrived) { ai.arrived = true; ai.onArrive && ai.onArrive(this); }
      }
      return { ax, ay, az, yaw };
    }
    flyTo(path, o = {}) { this.ai = Object.assign({ mode: 'fly', path, idx: 0, land: !!o.land, speed: o.speed || 30, alt: o.alt || 40, onArrive: o.onArrive, arrived: false }, o); this.engine = true; }
    // ── Görsel eşitleme
    sync(dt) {
      const r = this.root;
      r.position.copy(this.pos); r.rotation.set(0, this.yaw, 0);
      this.m.body.rotation.set(this.pitch, 0, this.roll);
      const D = this.def;
      if (D.kind === 'heli') {
        if (this.m.rotor) { this.m.rotor.rotation.y += this.rotor * 28 * dt; this.m.rotorBlur.material.opacity = this.rotor > 0.6 ? 0.25 * this.rotor : 0; }
        if (this.m.tailRotor) this.m.tailRotor.rotation.x += this.rotor * 50 * dt;
        if (this.m.door) { const target = this.flying && !this.ai ? 0 : this.doorOpen; this.m.door.position.z = U.damp(this.m.door.position.z, -1.6 * target, 3, dt); }
      } else {
        this.wheelSpin += this.speed * dt;
        for (const w of this.m.wheels) {
          w.spin.rotation.x = this.wheelSpin / w.r;
          if (w.steer) w.g.rotation.y = this.steerA * 1.1;
          w.g.position.y = w.baseY + Math.sin(this.wheelSpin * 1.7 + w.x * 3 + w.z) * 0.012 * Math.min(1, Math.abs(this.speed) / 5);
        }
        if (this.m.tracks) {
          const half = D.wid / 2;
          for (let i = 0; i < 2; i++) { const sv = this.speed + (i === 0 ? -1 : 1) * this.yawRate * half; this.trackOff[i] += sv * dt * 0.25; this.m.tracks[i].tex.offset.y = -this.trackOff[i]; }
        }
        if (this.m.trailer) {
          const tr = this.m.trailer.root, h = this.hitch || this.worldPoint(0, 0, -2.6);
          tr.position.set(h.x, this.pos.y, h.z); tr.rotation.set(0, this.trailerYaw, 0);
          for (const w of this.m.trailer.wheels) w.spin.rotation.x = this.wheelSpin / w.r;
        }
        if (this.type === 'tank') {
          this.m.turret.rotation.y = this.turretYaw;
          this.m.barrel.rotation.x = -this.barrelPitch;
          this.m.hatch.rotation.x = this.hatchOpen ? -1.6 : U.damp(this.m.hatch.rotation.x, 0, 4, dt);
        }
        if (this.m.ramp) this.m.ramp.rotation.x = U.damp(this.m.ramp.rotation.x, this.rampOpen ? 1.35 : 0, 3, dt);
        if (this.alive && Math.abs(this.speed) > 8 && !W().inCity(this.pos.x, this.pos.z) && Math.random() < 0.4) K.fx.dust(this.pos.x - Math.sin(this.yaw) * D.len / 2, this.pos.y, this.pos.z - Math.cos(this.yaw) * D.len / 2, 1);
      }
      if (!this.alive || this.hp < this.maxHp * 0.3) {
        this.burnT -= dt;
        if (this.burnT <= 0) { this.burnT = this.alive ? 0.12 : 0.05; if (this.alive) K.fx.smoke.spawn(this.pos.x, this.pos.y + D.h, this.pos.z, 0, 2, 0, 2.5, 1, 4, 0.15, 0.15, 0.15, 0.5, 0.3, -0.4); else K.fx.fireSmoke(this.pos.x, this.pos.y + D.h * 0.6, this.pos.z); }
      }
    }
    // OBB ışın testi
    rayHit(ox, oy, oz, dx, dy, dz, maxD) {
      const t1 = this.obbRay(ox, oy, oz, dx, dy, dz, this.pos, this.yaw, this.def.wid / 2, this.def.h, this.def.len / 2, 0, maxD);
      if (this.def.truck && this.hitch) {
        const s = Math.sin(this.trailerYaw), c = Math.cos(this.trailerYaw);
        const cen = { x: this.hitch.x - s * 6.2, y: this.pos.y, z: this.hitch.z - c * 6.2 };
        const t2 = this.obbRay(ox, oy, oz, dx, dy, dz, cen, this.trailerYaw, 1.3, 4.1, 6.2, 0, maxD);
        if (t2 > 0 && (t1 < 0 || t2 < t1)) return t2;
      }
      return t1;
    }
    obbRay(ox, oy, oz, dx, dy, dz, cen, yaw, hx, h, hz, y0, maxD) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const rx = ox - cen.x, rz = oz - cen.z;
      const lox = rx * c - rz * s, loz = rx * s + rz * c, loy = oy - cen.y;
      const ldx = dx * c - dz * s, ldz = dx * s + dz * c;
      let tmin = 0, tmax = maxD;
      const ax = [[lox, ldx, -hx, hx], [loy, dy, 0.2, h], [loz, ldz, -hz, hz]];
      for (const [o, d, lo, hi] of ax) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; }
        let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const t = a; a = b; b = t; }
        tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); if (tmin > tmax) return -1;
      }
      return tmin > 0 ? tmin : -1;
    }
    pushActor(a) {
      if (Math.abs(a.pos.y - this.pos.y) > this.def.h || (this.def.kind === 'heli' && this.flying)) return;
      this._pushBox(a, this.pos, this.yaw, this.def.wid / 2, this.def.len / 2);
      if (this.def.truck && this.hitch) {
        const s = Math.sin(this.trailerYaw), c = Math.cos(this.trailerYaw);
        this._pushBox(a, { x: this.hitch.x - s * 6.2, z: this.hitch.z - c * 6.2 }, this.trailerYaw, 1.3, 6.2);
      }
    }
    _pushBox(a, cen, yaw, hx, hz) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const dx = a.pos.x - cen.x, dz = a.pos.z - cen.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c, r = a.radius;
      if (Math.abs(lx) > hx + r || Math.abs(lz) > hz + r) return;
      const px = hx + r - Math.abs(lx), pz = hz + r - Math.abs(lz);
      let nlx = lx, nlz = lz;
      if (px < pz) nlx = Math.sign(lx || 1) * (hx + r); else nlz = Math.sign(lz || 1) * (hz + r);
      a.pos.x = cen.x + nlx * c + nlz * s; a.pos.z = cen.z - nlx * s + nlz * c;
    }
    remove() { K.game.dyn.remove(this.root); if (this.m.trailer) K.game.dyn.remove(this.m.trailer.root); this.removed = true; }
  }
  K.Vehicle = Vehicle;
})();
