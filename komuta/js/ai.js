/* KOMUTA — yapay zekâ: ekip üyeleri (emir durum makinesi), düşmanlar (algı/şüphe/çatışma), siviller, komut sistemi */
'use strict';
(function () {
  const U = K.U, V3 = THREE.Vector3;
  const AI = K.ai = { pathBudget: 4 };

  // ───────── Ortak hareket yardımcıları ─────────
  function requestPath(a, x, z) {
    if (AI.pathBudget <= 0) { a.wantPath = { x, z }; return 'defer'; }
    AI.pathBudget--;
    a.wantPath = null;
    const r = K.nav.path(a.layer, a.pos.x, a.pos.z, x, z);
    a.pathTarget = { x, z };
    if (!r || !r.pts.length) { a.path = null; a.pathOk = false; return 'fail'; }
    a.path = r.pts; a.pi = 0; a.pathOk = r.ok; a.progT = 0; a.progPos = a.pos.clone(); a.stuck = 0;
    return r.ok ? 'ok' : 'partial';
  }
  AI.requestPath = requestPath;
  const _sep = new V3();
  function followPath(a, dt, speed, faceMove = true) {
    if (a.wantPath) { requestPath(a, a.wantPath.x, a.wantPath.z); }
    if (!a.path || a.pi >= a.path.length) { a.vel.x = U.damp(a.vel.x, 0, 10, dt); a.vel.z = U.damp(a.vel.z, 0, 10, dt); return 'arrived'; }
    const t = a.path[a.pi];
    let dx = t.x - a.pos.x, dz = t.z - a.pos.z;
    const d = Math.hypot(dx, dz), last = a.pi === a.path.length - 1;
    if (d < (last ? 0.5 : 0.8)) { a.pi++; if (a.pi >= a.path.length) { a.vel.set(0, a.vel.y, 0); return 'arrived'; } return 'moving'; }
    dx /= d; dz /= d;
    // ayrışma
    _sep.set(0, 0, 0);
    for (const o of K.game.actors) {
      if (o === a || !o.alive || o.vehicle || o.downed) continue;
      const ox = a.pos.x - o.pos.x, oz = a.pos.z - o.pos.z, od = ox * ox + oz * oz;
      if (od < 0.81 && od > 1e-4 && Math.abs(o.pos.y - a.pos.y) < 1.5) { const k = (0.9 - Math.sqrt(od)) * 2.2; _sep.x += ox * k; _sep.z += oz * k; }
    }
    const sp = last ? Math.min(speed, d * 2.5 + 1) : speed;
    a.vel.x = U.damp(a.vel.x, dx * sp + _sep.x, 9, dt);
    a.vel.z = U.damp(a.vel.z, dz * sp + _sep.z, 9, dt);
    if (faceMove) a.yaw = U.dampAng(a.yaw, Math.atan2(dx, dz), 9, dt);
    // kapı aç
    const ahead = K.world.query(a.pos.x + dx * 1.3 - 0.4, a.pos.z + dz * 1.3 - 0.4, a.pos.x + dx * 1.3 + 0.4, a.pos.z + dz * 1.3 + 0.4);
    for (const c of ahead) if (c.door && c.door.setOpen && !c.door.open && !c.door.locked && Math.abs(c.door.y - a.pos.y) < 1.5) c.door.setOpen(true);
    // takılma tespiti
    a.progT += dt;
    if (a.progT > 1.2) {
      const moved = a.pos.distanceTo(a.progPos);
      if (moved < 0.35) { a.stuck++; if (a.stuck >= 4) { a.path = null; return 'stuck'; } if (a.pathTarget) requestPath(a, a.pathTarget.x, a.pathTarget.z); }
      else a.stuck = 0;
      a.progT = 0; a.progPos.copy(a.pos);
    }
    return 'moving';
  }
  AI.followPath = followPath;
  function stop(a, dt) { a.vel.x = U.damp(a.vel.x, 0, 12, dt); a.vel.z = U.damp(a.vel.z, 0, 12, dt); }
  function faceTo(a, x, z, dt, k = 8) { a.yaw = U.dampAng(a.yaw, Math.atan2(x - a.pos.x, z - a.pos.z), k, dt); }
  function canSee(a, t, range, fov) {
    const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d > range || Math.abs(t.pos.y - a.pos.y) > 4) return -1;
    if (d > 2.2) { const f = a.fwd(); if ((dx * f.x + dz * f.z) / d < Math.cos(fov / 2)) return -1; }
    const ty = t.vehicle ? t.vehicle.pos.y + 1.5 : t.chestY;
    if (!K.world.los(a.pos.x, a.eyeY, a.pos.z, t.pos.x, ty, t.pos.z)) return -1;
    return d;
  }
  AI.canSee = canSee;
  function aiShoot(a, t, acc, filter) {
    const w = a.wdef || K.WEAPONS.rifle;
    const tx = t.pos.x, ty = t.vehicle ? t.vehicle.pos.y + 1.4 : t.chestY, tz = t.pos.z;
    const ox = a.pos.x + Math.sin(a.yaw) * 0.4, oy = a.eyeY - 0.15, oz = a.pos.z + Math.cos(a.yaw) * 0.4;
    let dx = tx - ox, dy = ty - oy, dz = tz - oz;
    const d = Math.hypot(dx, dy, dz); dx /= d; dy /= d; dz /= d;
    const tv = Math.hypot(t.vel.x, t.vel.z);
    const err = (1 - acc) * 0.11 + d * 0.0012 + tv * 0.006 + (t.crouched ? 0.01 : 0);
    dx += (Math.random() - 0.5) * 2 * err; dy += (Math.random() - 0.5) * 2 * err * 0.6; dz += (Math.random() - 0.5) * 2 * err;
    const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    const res = K.combat.hitscan(a, ox, oy, oz, dx, dy, dz, w, filter);
    K.fx.tracer(ox, oy, oz, res.x, res.y, res.z, a.team === 'enemy' ? 0xff9a6a : 0xffd28a);
    K.fx.muzzle(ox, oy, oz, w.silenced ? 0.3 : 0.8);
    K.audio.shot(a.team === 'enemy' ? 'enemy' : w.snd, a.pos);
    K.bus.emit('noise', { x: a.pos.x, y: a.pos.y, z: a.pos.z, r: w.noise, src: a, type: 'shot' });
    a.anim.fire = 1;
    return res;
  }

  // ═════════ EKİP ÜYESİ ═════════
  const FORMS = {
    free: [[2.6, -1.6], [-2.8, -2.2], [3.2, -4.4], [-3.4, -5.0], [1.2, -6.4], [-1.6, -7.2], [3.8, -7.8], [-3.9, -8.6], [0, -10]],
    tight: [[-1.1, -1.5], [1.1, -1.5], [-1.1, -3.0], [1.1, -3.0], [-1.1, -4.5], [1.1, -4.5], [-1.1, -6], [1.1, -6], [0, -7.5]],
    wide: [[-3.6, -2.4], [3.6, -2.4], [-6.4, -5.0], [6.4, -5.0], [0, -6.5], [-9, -7.6], [9, -7.6], [-3.6, -9], [3.6, -9]],
  };
  AI.FORMS = FORMS;
  const RADIO = {
    follow: ['Anlaşıldı, takipteyim.', 'Arkandayım komutanım.', 'Takip ediyorum.'],
    hold: ['Pozisyonu tutuyorum.', 'Bekliyorum.', 'Burada kalıyorum.'],
    move: ['İlerliyorum.', 'Konuma gidiyorum.', 'Hareket ediyorum.'],
    arrive: ['Konuma ulaştım.', 'Hedefe vardım.', 'Pozisyondayım.'],
    guard: ['Bölgeyi koruyorum.', 'Alan güvende tutulacak.'],
    fail: ['Konuma ulaşılamıyor!', 'Oraya geçiş yok!'],
    revive: ['Yaralıya gidiyorum!', 'Ona yardım ediyorum.'],
    escort: ['Sivili güvenli bölgeye götürüyorum.', 'Siville ilgileniyorum.'],
    vehicle: ['Araca biniyorum.', 'Bindim.'],
    full: ['Koltuk kalmadı!'],
    contact: ['Temas!', 'Düşman görüldü!', 'Ateş açıyorum!'],
    down: ['Vuruldum!', 'Yaralandım!'],
    barrier: ['Bariyer kuruluyor.', 'Emniyet çemberi hazır.'],
    interact: ['Hallediyorum.', 'Üzerindeyim.'],
  };
  AI.RADIO = RADIO;

  class SquadMember extends K.Actor {
    constructor(o) {
      const U2 = K.UNITS[o.unit] || K.UNITS.standard;
      super(Object.assign({ team: 'squad', look: K.models.LOOKS[U2.look], weapon: U2.weapon, hp: U2.hp, armor: U2.armor, shield: U2.shield }, o));
      this.unit = U2; this.canBeDowned = true; this.bleedMax = 55;
      this.order = { type: 'follow' }; this.pending = null; this.reactT = 0;
      this.slot = o.slot || 0; this.selected = false; this.teamTag = null;
      this.fireMode = 'free'; this.target = null; this.scanT = Math.random() * 0.3; this.burst = 0; this.status = 'Takipte';
      this.repathT = 0; this.lastSlot = null; this.callT = 0; this.ammo = 999; this.rosterId = o.rosterId;
      const mor = K.prog.skillVal('morale');
      this.dmgMul = 1 - 0.1 * mor; this.acc = U2.acc + 0.05 * mor;
      this.speedMul = U2.speed;
    }
    say(kind) {
      const L = RADIO[kind]; if (!L) return;
      if (K.game.time < this.callT && kind !== 'fail' && kind !== 'full' && kind !== 'down') return;
      this.callT = K.game.time + 1.2;
      K.ui.radio(this.name, U.pick(L));
    }
    giveOrder(o) {
      this.pending = o;
      const lvl = K.prog.skillVal('orders');
      this.reactT = (0.55 + Math.random() * 0.35) * (1 - 0.28 * lvl);
      this.status = 'Emir alındı';
    }
    applyOrder(o) {
      this.order = o; this.path = null; this.wantPath = null; o.t0 = K.game.time;
      if (o.type === 'move' || o.type === 'guard' || o.type === 'barrier') {
        const r = requestPath(this, o.x, o.z);
        if (r === 'fail' || !K.nav.reachable(this.layer, this.pos.x, this.pos.z, o.x, o.z)) { this.say('fail'); this.status = 'Ulaşılamıyor'; K.ui.cmdFeedback(this, 'Konum erişilemiyor', 'bad'); this.order = { type: 'hold', x: this.pos.x, z: this.pos.z }; return; }
        if (r === 'partial') { o.partial = true; K.ui.cmdFeedback(this, 'Hedefe tam ulaşılamıyor — en yakın noktaya', 'bad'); }
        this.status = o.type === 'guard' ? 'Koruma noktasına' : 'Rotada'; this.say(o.type === 'guard' ? 'guard' : 'move');
      } else if (o.type === 'follow') { this.status = 'Takipte'; this.say('follow'); }
      else if (o.type === 'hold') { o.x = o.x != null ? o.x : this.pos.x; o.z = o.z != null ? o.z : this.pos.z; this.status = 'Bekliyor'; this.say('hold'); }
      else if (o.type === 'revive') { this.status = 'Yaralıya'; this.say('revive'); }
      else if (o.type === 'escort') { this.status = 'Sivil tahliyesi'; this.say('escort'); }
      else if (o.type === 'vehicle') { this.status = 'Araca'; this.say('vehicle'); }
      else if (o.type === 'interact') { this.status = 'Etkileşim'; this.say('interact'); }
    }
    update(dt) {
      if (!this.alive) return;
      if (this.downed) {
        this.bleed -= dt * (this.beingRevived ? 0 : 1);
        if (this.bleed <= 0) { this.die(this.lastHitBy); this.status = 'Şehit'; }
        else this.status = 'YARALI ' + Math.ceil(this.bleed) + ' sn';
        stop(this, dt); this.physics(dt); this.setAnim(dt); return;
      }
      if (this.vehicle) { this.pos.copy(this.vehicle.pos); this.status = 'Araçta'; if (this.pending && this.pending.type === 'exitVehicle') { this.reactT -= dt; if (this.reactT <= 0) { this.vehicle.exit(this, this.slot); this.pending = null; this.order = { type: 'follow' }; } } return; }
      if (this.pending) { this.reactT -= dt; if (this.reactT <= 0) { const p = this.pending; this.pending = null; this.applyOrder(p); } }
      const P = K.game.player;
      let speed = 3.6 * this.speedMul, moving = false;
      const o = this.order;
      this.crouched = false;
      switch (o.type) {
        case 'follow': {
          const leader = P && P.alive ? P : null;
          if (!leader) { stop(this, dt); break; }
          const lv = leader.vehicle;
          const F = FORMS[K.squad.formation] || FORMS.free;
          const off = F[this.slot % F.length];
          const lp = lv ? lv.pos : leader.pos, ly = lv ? lv.yaw : leader.yaw, c = Math.cos(ly), s = Math.sin(ly);
          const back = lv ? lv.def.len / 2 + 2 : 0, scl = lv ? 1.5 : 1;
          let sx = lp.x + off[0] * scl * c + (off[1] * scl - back) * s, sz = lp.z - off[0] * scl * s + (off[1] * scl - back) * c;
          if (this.layer !== (lv ? 0 : leader.layer)) { stop(this, dt); break; }
          const nf = K.nav.nearestFree(this.layer, sx, sz, 3); if (nf) { sx = nf.x; sz = nf.z; }
          const d = Math.hypot(sx - this.pos.x, sz - this.pos.z);
          this.repathT -= dt;
          if (d > 1.4) {
            if (!this.path || this.repathT <= 0 && (!this.lastSlot || Math.hypot(this.lastSlot.x - sx, this.lastSlot.z - sz) > 1.2)) { requestPath(this, sx, sz); this.lastSlot = { x: sx, z: sz }; this.repathT = lv ? 1.0 : 0.7; }
            const run = d > 6 || leader.sprinting || !!lv;
            const r = followPath(this, dt, (run ? 6.4 : leader.crouched ? 2.2 : 4.1) * this.speedMul, !this.target);
            moving = r === 'moving';
            if (r === 'arrived' || r === 'stuck') this.path = null;
          } else { stop(this, dt); this.path = null; if (!this.target) this.yaw = U.dampAng(this.yaw, ly, 4, dt); }
          this.crouched = !lv && leader.crouched;
          this.status = this.target ? 'Çatışmada' : lv ? 'Aracı izliyor' : 'Takipte';
          break;
        }
        case 'hold': case 'guard': {
          if (o.type === 'guard' && !o.arrived) {
            const r = followPath(this, dt, 5.6 * this.speedMul, !this.target);
            moving = r === 'moving';
            if (r === 'arrived') { o.arrived = true; this.say('arrive'); this.status = 'Bölgeyi koruyor'; K.ui.cmdFeedback(this, 'Koruma noktasında', 'ok'); }
            if (r === 'stuck') { o.arrived = true; this.status = 'Konum erişilemiyor'; K.ui.cmdFeedback(this, 'Konum erişilemiyor', 'bad'); }
            break;
          }
          const d = Math.hypot((o.x || this.pos.x) - this.pos.x, (o.z || this.pos.z) - this.pos.z);
          if (d > 1.6) { if (!this.path) requestPath(this, o.x, o.z); const r = followPath(this, dt, 4 * this.speedMul, !this.target); moving = r === 'moving'; if (r !== 'moving') this.path = null; }
          else { stop(this, dt); if (!this.target && o.type === 'guard') this.yaw += Math.sin(K.game.time * 0.5 + this.id) * dt * 0.6; }
          this.crouched = o.type === 'guard' && !moving;
          if (!this.target) this.status = o.type === 'guard' ? 'Bölgeyi koruyor' : 'Bekliyor';
          break;
        }
        case 'move': case 'barrier': {
          const r = followPath(this, dt, (o.run === false ? 4 : 6.0) * this.speedMul, !this.target);
          moving = r === 'moving';
          if (r === 'arrived') {
            if (o.type === 'barrier') { K.game.placeBarrier(this, o); this.say('barrier'); }
            else if (o.partial) { this.say('fail'); K.ui.cmdFeedback(this, 'Ulaşılamadı — en yakın noktada', 'bad'); }
            else { this.say('arrive'); K.ui.cmdFeedback(this, 'Tamamlandı', 'ok'); }
            this.order = { type: 'hold', x: this.pos.x, z: this.pos.z }; this.status = 'Tamamladı';
            K.bus.emit('squadArrived', { m: this, o });
          } else if (r === 'stuck') { this.say('fail'); K.ui.cmdFeedback(this, 'Konum erişilemiyor', 'bad'); this.order = { type: 'hold', x: this.pos.x, z: this.pos.z }; this.status = 'Ulaşılamıyor'; }
          break;
        }
        case 'revive': {
          const t = o.target;
          if (!t || !t.alive || !t.downed) { this.order = { type: 'follow' }; break; }
          const d = this.dist(t.pos);
          if (d > 1.3) { if (!this.path || this.repathT <= 0) { requestPath(this, t.pos.x, t.pos.z); this.repathT = 2; } this.repathT -= dt; const r = followPath(this, dt, 6.2 * this.speedMul); moving = true; if (r === 'stuck') { this.order = { type: 'follow' }; K.ui.cmdFeedback(this, 'Yaralıya ulaşılamıyor', 'bad'); } }
          else {
            stop(this, dt); faceTo(this, t.pos.x, t.pos.z, dt);
            this.crouched = true; this.anim.pose = 'kneel';
            o.prog = (o.prog || 0) + dt; t.beingRevived = true;
            this.status = 'İlk yardım %' + Math.floor(o.prog / 3.5 * 100);
            if (o.prog >= 3.5) { t.beingRevived = false; t.revive(0.45); K.ui.radio(this.name, t === P ? 'Komutanım, ayağa kalkın!' : `${t.name} ayakta!`); this.order = o.after || { type: 'follow' }; this.anim.pose = 'normal'; }
          }
          break;
        }
        case 'escort': {
          const c = o.civ, z = o.zone;
          if (!c || !c.alive || c.safe) { this.order = { type: 'follow' }; break; }
          if (!o.picked) {
            const d = this.dist(c.pos);
            if (d > 2.2) { if (!this.path || this.repathT <= 0) { requestPath(this, c.pos.x, c.pos.z); this.repathT = 1.5; } this.repathT -= dt; const r = followPath(this, dt, 6 * this.speedMul); moving = true; if (r === 'stuck') { this.order = { type: 'follow' }; } }
            else { o.picked = true; c.setLeader(this); requestPath(this, z.x, z.z); K.ui.radio(c.name || 'Sivil', 'Tamam, sizinle geliyorum!'); }
          } else {
            const r = followPath(this, dt, 4.2 * this.speedMul);
            moving = r === 'moving';
            if (c.state !== 'follow' && !c.safe) { o.picked = false; }
            if (r === 'arrived' || Math.hypot(z.x - this.pos.x, z.z - this.pos.z) < (z.r || 4) * 0.7) { if (c.leader === this) c.setLeader(null, z); this.order = { type: 'follow' }; K.ui.cmdFeedback(this, 'Sivil güvende', 'ok'); }
            if (r === 'stuck') this.order = { type: 'follow' };
          }
          this.status = 'Sivil tahliyesi';
          break;
        }
        case 'vehicle': {
          const v = o.v;
          if (!v || !v.alive) { this.order = { type: 'follow' }; break; }
          if (v.freeSeats() === 0 || (v.freeSeats() === 1 && !v.seats[0].actor && !o.allowDriver)) { this.say('full'); K.ui.cmdFeedback(this, 'Boş koltuk yok', 'bad'); this.order = { type: 'follow' }; break; }
          if (v.nearDoor(this, 1.6)) {
            const idx = v.enter(this, o.allowDriver ? 'driver' : null);
            if (idx < 0) { this.say('full'); K.ui.cmdFeedback(this, 'Boş koltuk yok', 'bad'); this.order = { type: 'follow' }; }
            else { this.order = { type: 'follow' }; K.ui.cmdFeedback(this, 'Araçta', 'ok'); }
            break;
          }
          if (!this.path || this.repathT <= 0) { const dp = v.doorPoint(); requestPath(this, dp.x, dp.z); this.repathT = 1.5; }
          this.repathT -= dt;
          const r = followPath(this, dt, 6.2 * this.speedMul); moving = true;
          if (r === 'stuck' || r === 'arrived' && !v.nearDoor(this, 2.5)) { this.path = null; }
          break;
        }
        case 'interact': {
          const it = o.it;
          if (!it || (it.enabled && !it.enabled())) { this.order = { type: 'hold', x: this.pos.x, z: this.pos.z }; break; }
          const d = Math.hypot(it.x - this.pos.x, it.z - this.pos.z);
          if (d > 1.5) { if (!this.path) { const nf = K.nav.nearestFree(this.layer, it.x, it.z, 3); requestPath(this, nf ? nf.x : it.x, nf ? nf.z : it.z); } const r = followPath(this, dt, 5.5 * this.speedMul); moving = true; if (r === 'stuck' || (r === 'arrived' && d > 2.5)) { this.order = { type: 'hold', x: this.pos.x, z: this.pos.z }; K.ui.cmdFeedback(this, 'Nesneye ulaşılamıyor', 'bad'); } }
          else {
            stop(this, dt); faceTo(this, it.x, it.z, dt); this.anim.pose = 'interact';
            const need = (it.hold || 1) * (this.unit.id === 'agent' || this.unit.id === 'elite' ? 0.6 : 1);
            o.prog = (o.prog || 0) + dt; this.status = 'Etkileşim %' + Math.floor(Math.min(1, o.prog / need) * 100);
            if (o.prog >= need) { this.anim.pose = 'normal'; (it.squadUse || it.use)(this); K.ui.cmdFeedback(this, 'Tamamlandı', 'ok'); this.order = { type: 'hold', x: this.pos.x, z: this.pos.z }; }
          }
          break;
        }
      }
      if (o.type !== 'revive' && o.type !== 'interact' && this.anim.pose !== 'normal' && this.anim.pose !== 'downed') this.anim.pose = 'normal';
      this.combat(dt, moving);
      this.physics(dt);
      this.setAnim(dt);
    }
    combat(dt, moving) {
      this.scanT -= dt; this.fireT -= dt;
      const mission = K.mission;
      if (this.scanT <= 0) {
        this.scanT = 0.3;
        let best = null, bd = 1e9;
        const hitRecently = K.game.time - this.lastHitT < 5;
        const allowed = this.fireMode === 'free' && (mission.alarm || !mission.def.stealth) || hitRecently || (mission.alarm && this.fireMode === 'free');
        if (allowed) {
          for (const e of K.game.enemies) {
            if (!e.alive || e.surrendered || e.arrested || e.knocked) continue;
            if (e.layer !== this.layer) continue;
            if (mission.def.stealth && !mission.alarm && e.state !== 'combat' && !hitRecently) continue;
            const d = canSee(this, e, 48, 4.0);
            if (d >= 0 && d < bd) { bd = d; best = e; }
          }
        }
        if (best && !this.target) this.say('contact');
        this.target = best;
      }
      const t = this.target;
      if (t && t.alive && !t.surrendered && !t.arrested && !t.knocked) {
        const want = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
        if (!moving) this.yaw = U.dampAng(this.yaw, want, 10, dt);
        else this.anim.torsoYaw = U.clamp(U.angDiff(this.yaw, want), -1.2, 1.2);
        const dy = t.chestY - this.eyeY, dh = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
        this.anim.pitch = Math.atan2(dy, dh); this.anim.aim = U.damp(this.anim.aim, 1, 10, dt); this.anim.armed = true;
        if (this.fireT <= 0 && Math.abs(U.angDiff(this.yaw + this.anim.torsoYaw, want)) < 0.4) {
          const w = this.wdef || K.WEAPONS.rifle;
          aiShoot(this, t, this.acc * (moving ? 0.75 : 1), (a) => a.team === 'enemy');
          this.burst++;
          if (this.burst >= (w.auto ? 3 + Math.floor(Math.random() * 3) : 1)) { this.burst = 0; this.fireT = 0.5 + Math.random() * 0.7; }
          else this.fireT = Math.max(w.rof, 0.11);
        }
      } else {
        this.target = null; this.anim.torsoYaw = 0;
        this.anim.aim = U.damp(this.anim.aim, 0, 6, dt);
        this.anim.armed = !(K.mission.def && K.mission.def.stealth && !K.mission.alarm) || this.unit.id !== 'agent';
        this.anim.pitch = 0;
      }
    }
    onDowned() { this.say('down'); K.ui.toast(`${this.name} yaralandı! (Yaralıya yardım emri ver ya da E ile kaldır)`, 'bad'); }
    onDeath() { K.ui.toast(`${this.name} kaybedildi`, 'bad'); }
  }
  K.SquadMember = SquadMember;

  // ═════════ DÜŞMAN ═════════
  class Enemy extends K.Actor {
    constructor(o) {
      super(Object.assign({ team: 'enemy', look: K.models.LOOKS[o.lookId || 'enemy'], weapon: o.weapon === undefined ? 'rifle' : o.weapon, hp: o.hp || 100 }, o));
      this.faction = o.faction || 'mafia';
      this.state = o.state || (o.patrol ? 'patrol' : 'guard');
      this.patrol = o.patrol || null; this.pi = 0; this.waitT = Math.random() * 2;
      this.susp = 0; this.suspFloor = 0; this.lastKnown = null; this.target = null; this.lostT = 0; this.searchT = 0;
      this.fireT = 0.8 + Math.random(); this.burst = 0; this.acc = (o.accuracy || 0.55) * (K.game.diffAcc || 1);
      this.range = o.range || 28; this.fov = o.fov || 1.9;
      this.home = { x: this.pos.x, z: this.pos.z, yaw: this.yaw };
      this.perT = Math.random() * 0.2; this.alertDelay = -1; this.stunT = 0; this.strafeT = 0; this.strafeDir = 1;
      this.surrendered = false; this.arrested = false; this.knocked = false;
      this.leader = !!o.leader; this.noShoot = !!o.noShoot; this.canSurrender = o.canSurrender !== false;
      this.alertedOnce = false; this.seesBody = false; this.dialogue = o.dialogue;
      this.dmgOut = K.game.diffDmg || 0.7;
      this.anim.armed = true;
      if (this.faction === 'security') this.anim.armed = false;
    }
    get threat() { return this.alive && !this.surrendered && !this.arrested && !this.knocked; }
    stun(t) { if (!this.threat) return; this.stunT = t; this.anim.pose = 'cower'; this.vel.set(0, 0, 0); }
    surrender() {
      if (!this.threat) return false;
      this.surrendered = true; this.state = 'surrender'; this.anim.pose = 'surrender'; this.anim.armed = false; this.target = null;
      if (this.rig.gunMesh) this.rig.gunMesh.visible = false;
      K.bus.emit('surrender', { e: this });
      return true;
    }
    arrest() {
      if (!this.alive || this.arrested) return false;
      this.arrested = true; this.surrendered = false; this.knocked = false; this.state = 'arrested'; this.anim.pose = 'cuffed';
      if (this.rig.gunMesh) this.rig.gunMesh.visible = false;
      K.bus.emit('arrest', { e: this });
      return true;
    }
    knockOut() {
      if (!this.threat) return false;
      this.knocked = true; this.state = 'knocked'; this.anim.pose = 'downed'; this.vel.set(0, 0, 0);
      if (this.rig.gunMesh) this.rig.gunMesh.visible = false;
      K.bus.emit('takedown', { e: this });
      return true;
    }
    alert(target, broadcast = true) {
      if (!this.threat) return;
      const was = this.state === 'combat';
      this.state = 'combat'; this.susp = 100; this.alertedOnce = true; this.suspFloor = 40;
      if (target) { this.target = target; this.lastKnown = { x: target.pos.x, z: target.pos.z }; }
      this.anim.armed = this.faction !== 'security';
      if (!was) {
        K.bus.emit('enemyAlert', { e: this, target });
        if (broadcast) for (const o of K.game.enemies) {
          if (o === this || !o.threat || o.state === 'combat' || Math.abs(o.pos.y - this.pos.y) > 3.5) continue;
          const d = this.dist(o.pos);
          if (d < 38) { o.alertDelay = 0.6 + Math.random() * 1.2; o.alertTarget = target; o.lastKnown = this.lastKnown; }
        }
      }
    }
    hear(n) {
      if (!this.threat || n.src === this || (n.src && n.src.team === 'enemy')) return;
      const d = Math.hypot(n.x - this.pos.x, n.z - this.pos.z);
      if (d > n.r || Math.abs(n.y - this.pos.y) > 6) return;
      if (n.type === 'shot' || n.type === 'explosion') {
        if (this.state === 'combat') { this.lastKnown = { x: n.x, z: n.z }; return; }
        if (n.type === 'explosion' || d < n.r * 0.55 || this.susp > 45) { this.alert(n.src && n.src.alive ? n.src : null); this.lastKnown = { x: n.x, z: n.z }; }
        else { this.susp = Math.max(this.susp, 70); this.lastKnown = { x: n.x, z: n.z }; this.state = 'investigate'; this.path = null; }
      } else if (n.type === 'step' || n.type === 'flash') {
        if (this.state === 'combat') return;
        this.susp = Math.min(99, this.susp + (n.type === 'flash' ? 60 : 22)); this.lastKnown = { x: n.x, z: n.z };
        if (this.state === 'patrol' || this.state === 'guard') this.state = 'suspicious';
      }
    }
    perceive(dtp) {
      const G = K.game, P = G.player, M = K.mission;
      let bestT = null, bestGain = 0;
      const night = K.world.env.time === 'night' ? 0.6 : K.world.env.time === 'dusk' ? 0.8 : 1;
      const rain = K.world.env.weather === 'rain' ? 0.8 : K.world.env.weather === 'fog' ? 0.5 : 1;
      const range = this.range * night * rain * (this.state === 'combat' ? 1.6 : 1);
      const cands = [];
      if (P && P.alive) cands.push(P);
      for (const m of G.squad) if (m.alive && !m.vehicle) cands.push(m);
      for (const t of cands) {
        if (t.vehicle) { if (t.vehicle.def.kind === 'heli' && t.vehicle.flying) continue; }
        const d = canSee(this, t.vehicle ? { pos: t.vehicle.pos, chestY: t.vehicle.pos.y + 1.5, vehicle: t.vehicle } : t, range, this.fov);
        if (d < 0) continue;
        let f = 1;
        if (t === P) {
          const civil = P.outfit.id === 'civil';
          if (civil && P.holstered) f = 0.12; else if (civil) f = 2.2;
          else f = 1.0;
          if (!P.holstered && P.aiming) f *= 2.2; else if (!P.holstered) f *= 1.3;
          if (M.restricted && M.restricted(P)) f = Math.max(f, civil && P.holstered ? 0.9 : f * 1.5);
          if (P.vehicle) f = 1.4;
          if (P.downed) f = 0.5;
          f *= 1 - 0.2 * K.prog.skillVal('stealth') * (P.crouched ? 1 : 0.5);
        } else {
          f = t.unit && t.unit.id === 'agent' ? 0.2 : 1.1;
        }
        if (t.crouched) f *= 0.55;
        if (Math.hypot(t.vel.x, t.vel.z) > 5) f *= 1.35;
        const closeness = Math.pow(Math.max(0, 1 - d / range), 0.6) + 0.15;
        const gain = 70 * f * closeness * (M.def.suspMul || 1);
        if (gain > bestGain) { bestGain = gain; bestT = t; }
        if (d < 3.5 && f >= 1.2) bestGain = 999;
      }
      // cesetler / etkisiz arkadaşlar
      if (this.state !== 'combat') {
        for (const o of G.enemies) {
          if (o === this || o.threat || o.bodySeenBy === this.id || (o.bodySeen && o.bodySeen > 2)) continue;
          if (canSee(this, o, 18, this.fov) >= 0) { o.bodySeen = (o.bodySeen || 0) + 1; o.bodySeenBy = this.id; this.susp = Math.max(this.susp, 80); this.lastKnown = { x: o.pos.x, z: o.pos.z }; this.state = 'investigate'; this.path = null; K.ui.toast('Bir muhafız etkisiz arkadaşını buldu!', 'bad'); if (o.alive === false || o.knocked) this.alert(null); }
        }
      }
      if (bestT) {
        this.susp = Math.min(100, this.susp + bestGain * dtp);
        this.lastKnown = { x: bestT.pos.x, z: bestT.pos.z };
        this.seen = bestT; this.seenT = G.time;
      } else {
        this.susp = Math.max(this.suspFloor, this.susp - (this.state === 'combat' ? 3 : 9) * dtp);
        this.seen = null;
      }
      if (this.state === 'combat') { if (bestT) { this.target = bestT; this.lostT = 0; } return; }
      if (this.susp >= 100) { this.alert(bestT); return; }
      if (this.susp >= 60 && (this.state === 'patrol' || this.state === 'guard' || this.state === 'suspicious')) { this.state = 'investigate'; this.path = null; }
      else if (this.susp >= 25 && (this.state === 'patrol' || this.state === 'guard')) { this.state = 'suspicious'; this.suspT = 0; }
    }
    update(dt) {
      if (!this.alive || this.scripted) { return; }
      if (this.knocked || this.arrested || this.surrendered) { stop(this, dt); this.physics(dt); this.setAnim(dt); if (this.surrendered) this.anim.pose = 'surrender'; return; }
      if (this.stunT > 0) { this.stunT -= dt; stop(this, dt); this.physics(dt); this.setAnim(dt); if (this.stunT <= 0) { this.anim.pose = 'normal'; this.susp = Math.max(this.susp, 80); } return; }
      if (this.alertDelay > 0) { this.alertDelay -= dt; if (this.alertDelay <= 0) { this.alertDelay = -1; this.alert(this.alertTarget && this.alertTarget.alive ? this.alertTarget : null, false); } }
      this.perT -= dt;
      if (this.perT <= 0) { const dtp = 0.18 + Math.random() * 0.06; this.perT = dtp; this.perceive(dtp); }
      this.fireT -= dt;
      let moving = false;
      const G = K.game;
      switch (this.state) {
        case 'patrol': {
          if (!this.patrol || !this.patrol.length) { this.state = 'guard'; break; }
          if (this.waitT > 0) { this.waitT -= dt; stop(this, dt); break; }
          const p = this.patrol[this.pi];
          if (!this.path) requestPath(this, p.x, p.z);
          const r = followPath(this, dt, 1.7);
          moving = r === 'moving';
          if (r === 'arrived' || r === 'stuck') { this.path = null; this.pi = (this.pi + 1) % this.patrol.length; this.waitT = p.wait != null ? p.wait : 1.5 + Math.random() * 3; if (p.yaw != null) this.yaw = p.yaw; }
          break;
        }
        case 'guard': {
          const d = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
          if (d > 1.2) { if (!this.path) requestPath(this, this.home.x, this.home.z); const r = followPath(this, dt, 1.8); moving = r === 'moving'; if (r !== 'moving') this.path = null; }
          else { stop(this, dt); this.yaw = U.dampAng(this.yaw, this.home.yaw + Math.sin(G.time * 0.3 + this.id) * 0.6, 2, dt); }
          break;
        }
        case 'suspicious': {
          stop(this, dt);
          if (this.lastKnown) faceTo(this, this.lastKnown.x, this.lastKnown.z, dt, 5);
          this.suspT = (this.suspT || 0) + dt;
          if (this.susp < 15 && this.suspT > 3) this.state = this.patrol ? 'patrol' : 'guard';
          break;
        }
        case 'investigate': {
          if (!this.lastKnown) { this.state = 'suspicious'; break; }
          if (!this.path) requestPath(this, this.lastKnown.x, this.lastKnown.z);
          const r = followPath(this, dt, 2.4);
          moving = r === 'moving';
          if (r !== 'moving') { this.path = null; this.state = 'search'; this.searchT = 6 + Math.random() * 4; }
          break;
        }
        case 'search': {
          this.searchT -= dt;
          if (!this.path || this.pi >= (this.path ? this.path.length : 0)) {
            const c = this.lastKnown || this.home, p = K.nav.randomFreeNear(this.layer, c.x, c.z, 7);
            if (p) requestPath(this, p.x, p.z);
          }
          const r = followPath(this, dt, 2.2); moving = r === 'moving';
          if (r !== 'moving') this.path = null;
          if (this.searchT <= 0) { this.state = this.patrol ? 'patrol' : 'guard'; this.path = null; this.suspFloor = Math.max(this.suspFloor, 15); }
          break;
        }
        case 'combat': {
          const t = this.target;
          const vis = t && t.alive && this.seen === t && G.time - this.seenT < 0.6;
          if (this.faction === 'security') {
            // güvenlik: kaçar ve alarm verir
            if (!this.fleeing) { this.fleeing = true; const p = K.nav.randomFreeNear(this.layer, this.home.x, this.home.z, 6); if (p) requestPath(this, p.x, p.z); }
            const r = followPath(this, dt, 5); moving = r === 'moving';
            if (t) this.anim.pose = moving ? 'normal' : 'radio';
            break;
          }
          if (t && (!t.alive || t.downed && t.team !== 'player')) { this.target = null; break; }
          if (vis) {
            this.lostT = 0;
            const want = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
            this.yaw = U.dampAng(this.yaw, want, 9, dt);
            const d = this.dist(t.pos);
            // konum: yakınsa geri çekil, uzaksa ilerle, arada yana kay
            this.strafeT -= dt;
            if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.crouched = Math.random() < 0.35; }
            let mx = 0, mz = 0;
            const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
            if (d > 32) { mx += fx; mz += fz; } else if (d < 7) { mx -= fx; mz -= fz; }
            mx += -fz * this.strafeDir * 0.6; mz += fx * this.strafeDir * 0.6;
            const sp = this.crouched ? 1.4 : 2.6;
            const nx = this.pos.x + mx, nz = this.pos.z + mz;
            if (K.nav.free(this.layer, nx, nz)) { this.vel.x = U.damp(this.vel.x, mx * sp, 6, dt); this.vel.z = U.damp(this.vel.z, mz * sp, 6, dt); moving = true; }
            else { stop(this, dt); this.strafeDir *= -1; }
            const dy = (t.vehicle ? t.vehicle.pos.y + 1.4 : t.chestY) - this.eyeY;
            this.anim.pitch = Math.atan2(dy, d); this.anim.aim = 1;
            if (this.fireT <= 0 && !this.noShoot && Math.abs(U.angDiff(this.yaw, want)) < 0.35) {
              aiShoot(this, t, this.acc, (a) => a.team !== 'enemy');
              this.burst++;
              const w = this.wdef || K.WEAPONS.rifle;
              if (this.burst >= (w.auto ? 2 + Math.floor(Math.random() * 4) : 1)) { this.burst = 0; this.fireT = (0.8 + Math.random() * 1.1) / (G.diffRate || 1); }
              else this.fireT = Math.max(0.12, w.rof * 1.4);
            }
          } else {
            this.lostT += dt; this.crouched = false; this.anim.aim = U.damp(this.anim.aim, 0.5, 4, dt);
            if (this.lastKnown) {
              if (!this.path || this.repathT <= 0) { requestPath(this, this.lastKnown.x, this.lastKnown.z); this.repathT = 2.5; }
              this.repathT -= dt;
              const r = followPath(this, dt, 3.8); moving = r === 'moving';
              if (r !== 'moving') { this.path = null; if (this.lostT > 4) { this.state = 'search'; this.searchT = 12; } }
            } else stop(this, dt);
            if (this.lostT > 25) { this.state = 'search'; this.searchT = 10; }
          }
          break;
        }
      }
      if (this.state !== 'combat') { this.crouched = false; this.anim.aim = U.damp(this.anim.aim, this.state === 'investigate' || this.state === 'search' ? 0.45 : 0, 4, dt); this.anim.pitch = 0; }
      if (this.anim.pose === 'radio' && this.state !== 'combat') this.anim.pose = 'normal';
      this.physics(dt);
      this.setAnim(dt);
    }
    onDamaged(dmg, src) {
      if (src && src.alive !== undefined && this.threat) { if (this.state !== 'combat') this.alert(src); else if (!this.target || Math.random() < 0.5) this.target = src; }
    }
  }
  K.Enemy = Enemy;

  // ═════════ SİVİL / VIP ═════════
  class Civilian extends K.Actor {
    constructor(o) {
      super(Object.assign({ team: o.team || 'civ', look: o.look || K.models.civLook(), weapon: null }, o));
      this.state = o.state || 'idle'; this.basePose = o.pose || 'normal';
      this.anim.pose = this.basePose; this.anim.armed = false;
      this.route = o.route || null; this.ri = 0; this.waitT = Math.random() * 3;
      this.fear = 0; this.leader = null; this.safe = false; this.escortable = !!o.escortable;
      this.dialogue = o.dialogue || null; this.home = { x: this.pos.x, z: this.pos.z, yaw: this.yaw };
      this.ambient = !!o.ambient; this.repathT = 0; this.speedMul = o.speedMul || 1;
      if (o.team === 'vip') { this.canBeDowned = true; this.bleedMax = o.bleed || 9999; }
      this.panicImmune = !!o.panicImmune;
    }
    setLeader(l, zone) {
      if (l) { this.leader = l; this.state = 'follow'; this.anim.pose = 'normal'; this.path = null; }
      else { this.leader = null; this.state = zone ? 'goto' : 'idle'; if (zone) { this.gotoZone = zone; const p = K.nav.randomFreeNear(this.layer, zone.x, zone.z, (zone.r || 4) * 0.6); if (p) requestPath(this, p.x, p.z); } }
    }
    hear(n) {
      if (!this.alive || this.safe || this.panicImmune || this.state === 'follow') return;
      const d = Math.hypot(n.x - this.pos.x, n.z - this.pos.z);
      if ((n.type === 'shot' && n.r > 20 && d < 40) || (n.type === 'explosion' && d < 80)) this.panic(n.x, n.z);
    }
    panic(x, z) {
      if (this.state === 'panic' || this.state === 'cower' || this.downed) return;
      this.fear = 1; this.state = 'panic'; this.anim.pose = 'normal';
      const dx = this.pos.x - x, dz = this.pos.z - z, l = Math.hypot(dx, dz) || 1;
      const p = K.nav.randomFreeNear(this.layer, this.pos.x + dx / l * 22, this.pos.z + dz / l * 22, 6);
      if (p) requestPath(this, p.x, p.z); else this.state = 'cower';
      K.bus.emit('civPanic', { c: this });
    }
    update(dt) {
      if (!this.alive) return;
      if (this.downed) { if (this.bleedMax < 9999) { this.bleed -= dt; if (this.bleed <= 0) this.die(); } stop(this, dt); this.physics(dt); this.setAnim(dt); return; }
      if (this.vehicle) { this.pos.copy(this.vehicle.pos); return; }
      let moving = false;
      const P = K.game.player;
      // silah doğrultulursa korkar
      if (P && P.alive && P.aiming && !this.safe && this.state !== 'follow' && this.team === 'civ' && !this.panicImmune) {
        const ap = K.game.aimActor;
        if (ap === this && this.dist(P.pos) < 14) { this.anim.pose = 'surrender'; this.scaredT = 1.2; K.bus.emit('civThreatened', { c: this }); }
      }
      if (this.scaredT > 0) { this.scaredT -= dt; stop(this, dt); if (this.scaredT <= 0 && this.anim.pose === 'surrender') this.anim.pose = this.basePose; this.physics(dt); this.setAnim(dt); return; }
      switch (this.state) {
        case 'idle': stop(this, dt); this.yaw = U.dampAng(this.yaw, this.home.yaw, 3, dt); if (this.talkTo) faceTo(this, this.talkTo.pos.x, this.talkTo.pos.z, dt); break;
        case 'wander': {
          if (this.waitT > 0) { this.waitT -= dt; stop(this, dt); break; }
          if (!this.path) {
            let p;
            if (this.route) { const r = this.route, t = this.ri++ % 2 ? 0 : 1; p = { x: U.lerp(r.ax, r.bx, t * 0.9 + 0.05), z: U.lerp(r.az, r.bz, t * 0.9 + 0.05) }; }
            else p = K.nav.randomFreeNear(this.layer, this.home.x, this.home.z, this.wanderR || 10);
            if (p) requestPath(this, p.x, p.z);
          }
          const r = followPath(this, dt, 1.3 * this.speedMul); moving = r === 'moving';
          if (r !== 'moving') { this.path = null; this.waitT = 1 + Math.random() * 4; }
          break;
        }
        case 'panic': {
          const r = followPath(this, dt, 5.2 * this.speedMul); moving = r === 'moving';
          if (r !== 'moving') { this.state = 'cower'; this.anim.pose = 'cower'; this.path = null; }
          break;
        }
        case 'cower': stop(this, dt); this.anim.pose = 'cower'; break;
        case 'follow': {
          const l = this.leader;
          if (!l || !l.alive || (l.downed && l !== P)) { this.state = 'cower'; this.leader = null; break; }
          if (l.vehicle) { stop(this, dt); break; }
          const d = this.dist(l.pos);
          this.repathT -= dt;
          if (d > 2.2) {
            if (!this.path || this.repathT <= 0) { const ly = l.yaw; requestPath(this, l.pos.x - Math.sin(ly) * 1.6, l.pos.z - Math.cos(ly) * 1.6); this.repathT = 0.8; }
            const r = followPath(this, dt, (d > 6 ? 5.4 : 3.6) * this.speedMul * (this.team === 'vip' && this.injured ? 0.7 : 1)); moving = r === 'moving';
            if (r !== 'moving') this.path = null;
          } else { stop(this, dt); faceTo(this, l.pos.x, l.pos.z, dt, 3); }
          this.anim.pose = this.injured && moving ? 'limp' : 'normal';
          break;
        }
        case 'goto': {
          const r = followPath(this, dt, 3.8 * this.speedMul); moving = r === 'moving';
          if (r !== 'moving') { this.path = null; this.state = this.safe ? 'safe' : 'idle'; this.home = { x: this.pos.x, z: this.pos.z, yaw: this.yaw }; }
          break;
        }
        case 'safe': stop(this, dt); this.anim.pose = 'normal'; break;
      }
      this.physics(dt);
      this.setAnim(dt);
    }
  }
  K.Civilian = Civilian;

  // ═════════ KOMUT SİSTEMİ ═════════
  const SQ = K.squad = {
    formation: 'free',
    get members() { return K.game.squad; },
    selected() { const s = this.members.filter((m) => m.selected && m.alive); return s; },
    targets() { const s = this.selected(); return s.length ? s : this.members.filter((m) => m.alive); },
    select(i, additive) {
      const m = this.members[i]; if (!m) return;
      if (!additive) for (const o of this.members) o.selected = false;
      m.selected = additive ? !m.selected : true;
      K.ui.squadChanged(); K.audio.ui();
    },
    selectAll() { const all = this.members.every((m) => m.selected || !m.alive); for (const m of this.members) m.selected = !all && m.alive; K.ui.squadChanged(); K.audio.ui(); },
    selectTeam(tag) { for (const m of this.members) m.selected = m.teamTag === tag && m.alive; K.ui.squadChanged(); },
    who(team) { if (team) return this.members.filter((m) => m.teamTag === team && m.alive); return this.targets(); },
    spreadPoints(x, z, n, layer) {
      const offs = [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [1.5, 1.5], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [3, 0], [-3, 0]];
      const pts = [];
      for (let i = 0; pts.length < n && i < offs.length * 3; i++) {
        const o = offs[i % offs.length], k = 1 + Math.floor(i / offs.length) * 0.7;
        const p = K.nav.nearestFree(layer, x + o[0] * k, z + o[1] * k, 2);
        if (p && !pts.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1.0)) pts.push(p);
      }
      while (pts.length < n) pts.push({ x, z });
      return pts;
    },
    // komut: tür, isteğe bağlı nokta/hedef
    command(cmd, arg = {}) {
      const G = K.game, P = G.player;
      if (!this.members.length) { K.ui.toast('Komuta edilecek ekip yok', 'bad'); return false; }
      let list = arg.team ? this.who(arg.team) : this.targets();
      const downed = list.filter((m) => m.downed);
      if (downed.length && downed.length === list.length) { K.ui.cmdFeedback(downed[0], 'Asker yaralı', 'bad'); K.audio.ui('bad'); return false; }
      list = list.filter((m) => !m.downed);
      if (!list.length) { K.ui.toast('Seçili asker yok', 'bad'); return false; }
      if (downed.length) K.ui.toast(`${downed.map((d) => d.name).join(', ')}: asker yaralı, emir uygulanamıyor`, 'bad');
      K.audio.radio();
      const label = { follow: 'Beni takip et', hold: 'Burada bekle', move: 'Konuma ilerle', guard: 'Bölgeyi koru', revive: 'Yaralıya yardım et', escort: 'Sivili güvenli bölgeye götür', vehicle: 'Araca bin', exitVehicle: 'Araçtan in', regroup: 'Komutana dön', interact: 'Etkileşim', barrier: 'Bariyer kur' }[cmd] || cmd;
      switch (cmd) {
        case 'follow': case 'regroup': for (const m of list) { if (m.vehicle && cmd === 'regroup') { m.pending = { type: 'exitVehicle' }; m.reactT = 0.4; } else m.giveOrder({ type: 'follow' }); } break;
        case 'hold': for (const m of list) m.giveOrder({ type: 'hold' }); break;
        case 'move': case 'guard': {
          const pt = arg.point; if (!pt) return false;
          const layer = P.layer;
          const ref = list.find((m) => m.layer === layer) || list[0];
          if (!K.nav.canReach(ref.layer, ref.pos.x, ref.pos.z, pt.x, pt.z)) { K.ui.cmdFeedback(ref, 'Konum erişilemiyor', 'bad'); K.audio.ui('bad'); ref.say('fail'); K.ui.toast('Konum erişilemiyor (kilitli kapı, duvar veya farklı kat)', 'bad'); return false; }
          const pts = this.spreadPoints(pt.x, pt.z, list.length, layer);
          list.forEach((m, i) => m.giveOrder({ type: cmd, x: pts[i].x, z: pts[i].z }));
          K.ui.marker(pt.x, pt.y != null ? pt.y : P.pos.y, pt.z, cmd === 'guard' ? 'guard' : 'move');
          break;
        }
        case 'revive': {
          const cands = G.actors.filter((a) => a.alive && a.downed && (a.team === 'squad' || a.team === 'player' || a.team === 'vip'));
          if (!cands.length) { K.ui.toast('Yakında yaralı yok', 'bad'); return false; }
          const ref = arg.point || P.pos;
          cands.sort((a, b) => Math.hypot(a.pos.x - ref.x, a.pos.z - ref.z) - Math.hypot(b.pos.x - ref.x, b.pos.z - ref.z));
          const m = list.filter((x) => !x.vehicle).sort((a, b) => a.dist(cands[0].pos) - b.dist(cands[0].pos))[0];
          if (!m) return false;
          m.giveOrder({ type: 'revive', target: cands[0] });
          break;
        }
        case 'escort': {
          const zone = K.mission.safeZone();
          if (!zone) { K.ui.toast('Bu görevde tanımlı güvenli bölge yok', 'bad'); return false; }
          const ref = arg.point || P.pos;
          const civs = G.civs.filter((c) => c.alive && !c.safe && !c.leader && (c.escortable || c.team === 'vip') && !c.downed).sort((a, b) => Math.hypot(a.pos.x - ref.x, a.pos.z - ref.z) - Math.hypot(b.pos.x - ref.x, b.pos.z - ref.z));
          if (!civs.length) { K.ui.toast('Tahliye edilecek sivil yok', 'bad'); return false; }
          list.forEach((m, i) => { if (civs[i]) m.giveOrder({ type: 'escort', civ: civs[i], zone }); });
          break;
        }
        case 'vehicle': {
          const v = arg.vehicle || G.nearestVehicle(arg.point || P.pos, 30, (v) => v.team === 'player' && v.alive);
          if (!v) { K.ui.toast('Yakında binilecek araç yok', 'bad'); return false; }
          const free = v.freeSeats() - (v.seats[0].actor ? 0 : 1);
          if (free <= 0) { K.ui.cmdFeedback(list[0], 'Boş koltuk yok', 'bad'); K.audio.ui('bad'); return false; }
          let n = 0;
          for (const m of list) { if (m.vehicle) continue; if (n >= free) { K.ui.cmdFeedback(m, 'Boş koltuk yok', 'bad'); continue; } m.giveOrder({ type: 'vehicle', v }); n++; }
          break;
        }
        case 'exitVehicle': {
          let i = 0; for (const m of list) if (m.vehicle) { m.pending = { type: 'exitVehicle' }; m.slot = i++; m.reactT = 0.3 + i * 0.35; }
          if (!i) { K.ui.toast('Araçta asker yok'); return false; }
          break;
        }
        case 'interact': {
          const it = arg.it; if (!it) { K.ui.toast('Nişangâhın yakınında etkileşim nesnesi yok', 'bad'); return false; }
          const m = list.sort((a, b) => Math.hypot(a.pos.x - it.x, a.pos.z - it.z) - Math.hypot(b.pos.x - it.x, b.pos.z - it.z))[0];
          m.giveOrder({ type: 'interact', it });
          break;
        }
        case 'barrier': {
          const riot = list.filter((m) => m.unit.abilities.includes('barrier'));
          if (!riot.length) { K.ui.toast('Seçili birlik bariyer kuramaz (Çevik Kuvvet gerekli)', 'bad'); return false; }
          const pt = arg.point; if (!pt) return false;
          riot[0].giveOrder({ type: 'barrier', x: pt.x, z: pt.z });
          break;
        }
        case 'teamA': case 'teamB': {
          const tag = cmd === 'teamA' ? 'A' : 'B';
          if (!K.prog.canTwoTeams()) { K.ui.toast('İki ayrı tim yönetimi Yarbay rütbesinde (veya "İkinci takım" yeteneğiyle) açılır', 'bad'); return false; }
          for (const m of list) m.teamTag = tag;
          K.ui.toast(`${list.map((m) => m.name).join(', ')} → ${tag} timi`, 'ok'); K.ui.squadChanged();
          return true;
        }
        case 'fire': {
          const mode = list.every((m) => m.fireMode === 'free') ? 'hold' : 'free';
          for (const m of list) m.fireMode = mode;
          K.ui.toast(mode === 'free' ? 'Ateş serbest' : 'Ateşi kes — yalnızca karşılık verilecek', 'ok');
          return true;
        }
        case 'formation': {
          const order = ['free', 'tight', 'wide'];
          this.formation = arg.formation || order[(order.indexOf(this.formation) + 1) % 3];
          K.ui.toast('Düzen: ' + { free: 'Serbest takip', tight: 'Kısa aralıklı', wide: 'Geniş aralıklı' }[this.formation], 'ok');
          return true;
        }
      }
      K.ui.toast(`Emir: ${label} → ${list.map((m) => m.name).join(', ')}`);
      K.bus.emit('command', { cmd, list, arg });
      return true;
    },
  };
})();
