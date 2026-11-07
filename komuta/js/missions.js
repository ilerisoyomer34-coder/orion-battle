/* KOMUTA — görev yöneticisi (hedefler, olaylar, puanlama) */
'use strict';
(function () {
  const U = K.U, V3 = THREE.Vector3;
  const inZone = (z, p, layer) => {
    if (!z) return false;
    if (z.layer != null && (layer || 0) !== z.layer) return false;
    if (z.r != null) return Math.hypot(p.x - z.x, p.z - z.z) <= z.r;
    return p.x >= z.x0 && p.x <= z.x1 && p.z >= z.z0 && p.z <= z.z1;
  };
  const zc = (z) => (z.r != null ? { x: z.x, z: z.z } : { x: (z.x0 + z.x1) / 2, z: (z.z0 + z.z1) / 2 });
  K.inZone = inZone; K.zoneCenter = zc;
  let MD_CORE = null;

  const MD = K.mission = {
    def: null, state: 'none', time: 0, objs: [], flags: {}, alarm: false, decisions: {}, evidence: [], rescued: [], counts: {},
    timers: [], handlers: [], interacts: [], items: [], markers: [], obstacles: [], tutorial: [],
    reset() {
      for (const k of Object.keys(this)) if (!MD_CORE.has(k)) delete this[k];
      for (const h of this.handlers) K.bus.off(h[0], h[1]);
      for (const it of this.interacts) { const i = K.world.interactables.indexOf(it); if (i >= 0) K.world.interactables.splice(i, 1); }
      for (const o of this.obstacles) o.remove();
      Object.assign(this, { def: null, state: 'none', time: 0, objs: [], flags: {}, alarm: false, decisions: {}, evidence: [], rescued: [], counts: {}, timers: [], handlers: [], interacts: [], items: [], markers: [], obstacles: [], endT: 0, failReason: '', stats0: null, defend: {}, followState: {}, vipDowns: 0 });
    },
    begin(def) {
      this.def = def; this.state = 'active'; this.time = 0;
      // olay dinleyicileri
      this.on('death', (e) => this.onDeath(e));
      this.on('downed', (e) => { if (e.actor.team === 'squad') { this.sideFail('teamSafe'); K.game.stats.downed++; } if (e.actor.team === 'vip') { this.vipDowns++; this.sideFail('vipHealth'); } });
      this.on('enemyAlert', (e) => { if (!e.e.noAlarm) this.raiseAlarm(e.e.faction === 'security' ? 'Güvenlik görevlisi alarm verdi' : 'Düşman alarm verdi'); });
      this.on('weaponDrawn', () => { this.sideFail('noWeapon'); def.onWeaponDrawn && def.onWeaponDrawn(this); });
      this.on('arrest', (e) => { K.game.stats.arrests++; K.ui.toast(`${e.e.name || 'Şüpheli'} gözaltına alındı`, 'ok'); });
      this.on('takedown', () => { K.game.stats.takedowns++; });
      this.on('surrender', (e) => { K.ui.toast(`${e.e.name || 'Şüpheli'} teslim oldu — yaklaşıp kelepçele (E)`, 'ok'); });
      this.on('noise', (n) => { for (const e of K.game.enemies) e.hear(n); for (const c of K.game.civs) c.hear(n); });
      // hedefler
      const mk = (o, side) => ({ id: o.id, text: o.text, spec: o, side: !!side, main: !side, state: 'inactive', prog: 0, max: o.count || 1, t: 0 });
      this.objs = (def.objectives || []).map((o) => mk(o, false)).concat((def.side || []).map((o) => mk(o, true)));
      def.setup && def.setup(this);
      for (const o of this.objs) if (!o.spec.after) this.activate(o, true);
      K.ui.objectivesChanged();
    },
    on(t, fn) { K.bus.on(t, fn); this.handlers.push([t, fn]); },
    after(s, fn) { this.timers.push({ t: this.time + s, fn }); },
    every(s, fn) { const tm = { t: this.time + s, fn, every: s }; this.timers.push(tm); return tm; },
    obj(id) { return this.objs.find((o) => o.id === id); },
    activate(o, silent) {
      if (o.state !== 'inactive') return;
      o.state = 'active'; o.t0 = this.time;
      if (o.spec.onActive) o.spec.onActive(this, o);
      if (!silent && !o.side) { K.ui.toast('Yeni hedef: ' + this.objText(o), 'obj'); K.audio.ui('obj'); }
      K.ui.objectivesChanged();
    },
    complete(id) {
      const o = typeof id === 'string' ? this.obj(id) : id;
      if (!o || o.state === 'done' || o.state === 'failed') return;
      if (o.state === 'inactive') o.state = 'active';
      o.state = 'done'; o.prog = o.max;
      if (o.spec.onDone) o.spec.onDone(this, o);
      K.ui.toast((o.side ? 'Yan hedef tamamlandı: ' : 'Hedef tamamlandı: ') + o.text, 'ok'); K.audio.ui('obj');
      // bağımlıları etkinleştir
      for (const x of this.objs) {
        if (x.state !== 'inactive' || !x.spec.after) continue;
        const req = Array.isArray(x.spec.after) ? x.spec.after : [x.spec.after];
        if (req.every((r) => { const y = this.obj(r); return y && y.state === 'done'; })) this.activate(x);
      }
      K.ui.objectivesChanged();
      if (this.objs.filter((x) => x.main).every((x) => x.state === 'done')) this.succeed();
    },
    failObj(id, reason) {
      const o = typeof id === 'string' ? this.obj(id) : id;
      if (!o || o.state === 'done' || o.state === 'failed') return;
      o.state = 'failed';
      if (o.main) { this.fail(reason || ('Hedef başarısız: ' + o.text)); return; }
      K.ui.toast('Yan hedef başarısız: ' + o.text, 'bad'); K.audio.ui('bad');
      K.ui.objectivesChanged();
    },
    sideFail(type) { for (const o of this.objs) if (o.side && o.spec.type === type && (o.state === 'active' || o.state === 'inactive')) { if (o.spec.until && this.obj(o.spec.until) && this.obj(o.spec.until).state === 'done') continue; this.failObj(o); } },
    setFlag(k, v = true) { this.flags[k] = v; },
    flag(k) { return this.flags[k]; },
    count(tag) { return this.counts[tag] || 0; },
    addCount(tag, evId, name, desc) {
      this.counts[tag] = (this.counts[tag] || 0) + 1;
      if (evId && !this.evidence.includes(evId)) this.evidence.push(evId);
      if (name) K.ui.toast(`${name}${desc ? ' — ' + desc : ''}`, 'evidence');
      K.game.stats.evidence++;
      K.ui.objectivesChanged();
    },
    raiseAlarm(reason) {
      if (this.alarm || this.state !== 'active') return;
      this.alarm = true;
      K.audio.alarm(); K.ui.toast('ALARM! ' + (reason || ''), 'bad');
      K.ui.radio('Komuta', this.def.stealth ? 'Alarm verildi! Gizlilik bozuldu.' : 'Düşman alarmda, dikkatli olun!');
      this.sideFail('noAlarm');
      K.game.stats.alarms++;
      for (const m of K.game.squad) m.fireMode = 'free';
      K.ui.squadChanged();
      if (this.def.failOnAlarm) this.after(2.2, () => this.fail(reason ? `${reason} — kimliğin açığa çıktı` : 'Kimliğin açığa çıktı'));
      this.def.onAlarm && this.def.onAlarm(this);
    },
    onDeath(e) {
      const a = e.actor, src = e.src;
      const byUs = src && (src.team === 'player' || src.team === 'squad' || (src.driver && src.driver.team === 'player'));
      if (a.team === 'civ') {
        K.game.stats.civLost++; this.sideFail('noCivLoss');
        if (byUs && this.def.failOnCivKill !== false) { K.ui.toast('Sivil kayıp! Operasyon kurallarını ihlal ettin.', 'bad'); if ((K.game.stats.civKilledByUs = (K.game.stats.civKilledByUs || 0) + 1) >= (this.def.civKillLimit || 1)) this.after(1.5, () => this.fail('Saha ekibi sivil kayba neden oldu')); }
      }
      if (a.team === 'enemy') { if (byUs) { K.game.stats.kills++; this.sideFail('noKill'); } }
      if (a.team === 'squad') { K.game.stats.kia++; this.sideFail('teamAlive'); this.sideFail('teamSafe'); if (K.game.squad.length && K.game.squad.every((m) => !m.alive)) this.after(2, () => this.fail('Tüm ekip kaybedildi')); }
      if (a.team === 'vip') this.fail(`${a.name} hayatını kaybetti`);
      if (a.team === 'player') this.after(1.6, () => this.fail('Saha lideri etkisiz hâle geldi'));
      for (const o of this.objs) {
        if (o.state !== 'active' && o.state !== 'inactive') continue;
        if (o.spec.type === 'arrest' && o.spec.target && o.spec.target() === a) this.failObj(o, o.spec.failText || `${a.name} öldü — kanıt zinciri koptu`);
      }
      this.def.onDeath && this.def.onDeath(this, a, src);
    },
    succeed() {
      if (this.state !== 'active') return;
      this.state = 'done'; this.endT = this.time;
      for (const o of this.objs) if (o.side && o.state !== 'failed' && o.state !== 'done') { if (this.sideEndCheck(o)) { o.state = 'done'; } else o.state = 'failed'; }
      K.audio.ui('rank');
      K.ui.toast('GÖREV TAMAMLANDI', 'big');
      this.def.onEnd && this.def.onEnd(this, true);
      setTimeout(() => K.game.missionFinished(true), 2600);
    },
    fail(reason) {
      if (this.state !== 'active') return;
      this.state = 'failed'; this.failReason = reason || 'Görev başarısız'; this.endT = this.time;
      for (const o of this.objs) if (o.state === 'active' || o.state === 'inactive') o.state = o.side ? 'failed' : o.state;
      K.audio.ui('fail'); K.ui.toast('GÖREV BAŞARISIZ — ' + this.failReason, 'big-bad');
      this.def.onEnd && this.def.onEnd(this, false);
      setTimeout(() => K.game.missionFinished(false), 2600);
    },
    sideEndCheck(o) {
      const s = o.spec, G = K.game;
      switch (s.type) {
        case 'noAlarm': case 'noCivLoss': case 'teamSafe': case 'teamAlive': case 'noKill': case 'noWeapon': return true;
        case 'time': return this.time <= s.t;
        case 'vipHealth': { const v = s.vip && s.vip(); return v && v.alive && this.vipDowns === 0 && v.hp >= v.maxHp * (s.frac || 0.5); }
        case 'vehHealth': { const v = s.vehicle && s.vehicle(); return v && v.alive && v.hp >= v.maxHp * (s.frac || 0.5); }
        case 'teamHealth': { const sq = G.squad; if (!sq.length) return true; const avg = sq.reduce((a, m) => a + (m.alive ? m.hp / m.maxHp : 0), 0) / sq.length; return avg >= (s.frac || 0.5) && sq.every((m) => m.alive); }
        case 'check': return !!(s.fn && s.fn(this));
        default: return false;
      }
    },
    safeZone() { return this.def.safeZone ? (typeof this.def.safeZone === 'function' ? this.def.safeZone(this) : this.def.safeZone) : null; },
    restricted(a) { return this.def.restricted ? this.def.restricted(this, a) : false; },
    objText(o) {
      let t = o.text;
      const s = o.spec;
      if (o.max > 1 && s.type !== 'defend') t += ` (${Math.min(o.prog, o.max)}/${o.max})`;
      if (s.type === 'defend' && o.state === 'active') t += ` — ${Math.ceil(Math.max(0, s.duration - (this.defend[o.id] || 0)))} sn`;
      if (s.timer && o.state === 'active') t += ` — ${U.fmtTime(s.timer - (this.time - o.t0))}`;
      if (s.type === 'follow' && o.state === 'active' && this.followState[o.id]) t += ` — mesafe ${Math.round(this.followState[o.id].d)} m`;
      return t;
    },
    // ── Hedef konumu (HUD işaretçisi)
    where(o) {
      const s = o.spec;
      if (s.where) return s.where(this, o);
      if (s.zone) { const c = zc(s.zone); return { x: c.x, z: c.z, y: s.zone.y != null ? s.zone.y : null }; }
      if (s.zones) { const v = this.flags['_srch_' + o.id] || {}; for (let i = 0; i < s.zones.length; i++) if (!v[i]) return { x: s.zones[i].x, z: s.zones[i].z }; }
      if (s.target) { const t = s.target(); if (t && t.pos) return { x: t.pos.x, z: t.pos.z, y: t.pos.y + 2 }; }
      if (s.vehicle) { const v = s.vehicle(); if (v) return { x: v.pos.x, z: v.pos.z, y: v.pos.y + 3 }; }
      if (s.at) return s.at;
      return null;
    },
    // ── Kare güncellemesi
    update(dt) {
      if (this.state !== 'active') return;
      this.time += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        if (this.time >= tm.t) { if (tm.every) tm.t += tm.every; else this.timers.splice(i, 1); tm.fn(this); if (this.state !== 'active') return; }
      }
      const G = K.game, P = G.player;
      if (this.def.timeLimit && this.time > this.def.timeLimit) { this.fail('Süre doldu'); return; }
      for (const o of this.objs) {
        if (o.state !== 'active') continue;
        const s = o.spec;
        if (s.timer && this.time - o.t0 > s.timer) { this.failObj(o, s.timerFail || 'Süre doldu'); continue; }
        switch (s.type) {
          case 'reach': if (this.whoIn(s.who || 'player', s.zone, s) || (s.alt && this.whoIn(s.who || 'player', s.alt, s))) this.complete(o); break;
          case 'search': {
            const v = this.flags['_srch_' + o.id] = this.flags['_srch_' + o.id] || {};
            s.zones.forEach((z, i) => { if (!v[i] && this.whoIn('any', z)) { v[i] = true; K.ui.toast(`Arama bölgesi ${i + 1} tarandı`, 'ok'); s.onZone && s.onZone(this, i); } });
            o.prog = Object.keys(v).length; o.max = s.zones.length;
            if (o.prog >= o.max) this.complete(o);
            break;
          }
          case 'collect': o.prog = this.count(s.tag); if (o.prog >= o.max) this.complete(o); break;
          case 'flag': if (this.flags[s.flag]) this.complete(o); break;
          case 'escort': {
            for (const c of G.civs) if (c.tags.has(s.group) && c.alive && !c.safe && inZone(s.zone, c.pos)) { c.safe = true; c.setLeader(null); c.state = 'safe'; G.stats.civSaved++; K.ui.toast('Sivil güvenli bölgede', 'ok'); }
            o.prog = G.civs.filter((c) => c.tags.has(s.group) && c.safe && c.alive).length;
            if (o.prog >= o.max) this.complete(o);
            break;
          }
          case 'eliminate': {
            const grp = G.enemies.filter((e) => e.tags.has(s.group));
            o.max = s.count || grp.length;
            o.prog = grp.filter((e) => !e.threat).length;
            if (o.prog >= o.max) this.complete(o);
            break;
          }
          case 'arrest': { const t = s.target(); if (t && t.arrested && t.alive) this.complete(o); break; }
          case 'board': {
            const v = s.vehicle(); if (!v) break;
            const team = [P, ...G.squad.filter((m) => m.alive)];
            if (s.vip) { const vp = s.vip(); if (vp && vp.alive) team.push(vp); }
            o.max = team.length; o.prog = team.filter((a) => a.vehicle === v).length;
            if (o.prog >= o.max && v.alive) this.complete(o);
            break;
          }
          case 'defend': this.updDefend(o, dt); break;
          case 'follow': this.updFollow(o, dt); break;
        }
      }
      this.def.update && this.def.update(this, dt);
    },
    whoIn(who, zone, s = {}) {
      const G = K.game, P = G.player;
      const posOf = (a) => (a.vehicle ? a.vehicle.pos : a.pos);
      const layerOf = (a) => (a.vehicle ? 0 : a.layer);
      if (who === 'player') return P && P.alive && inZone(zone, posOf(P), layerOf(P));
      if (who === 'any') return (P && P.alive && inZone(zone, posOf(P), layerOf(P))) || G.squad.some((m) => m.alive && !m.downed && inZone(zone, posOf(m), layerOf(m)));
      if (who === 'allTeam') return P && P.alive && inZone(zone, posOf(P), layerOf(P)) && G.squad.every((m) => !m.alive || inZone(zone, posOf(m), layerOf(m)));
      if (who === 'vip') { const v = s.vip(); return v && v.alive && !v.downed && inZone(zone, posOf(v), layerOf(v)); }
      if (who === 'vehicle') { const v = s.vehicle(); return v && v.alive && inZone(zone, v.pos); }
      return false;
    },
    updDefend(o, dt) {
      const s = o.spec, G = K.game;
      const friendlies = [G.player, ...G.squad].filter((a) => a && a.alive && !a.downed && !a.vehicle && inZone(s.zone, a.pos, a.layer));
      const enemies = G.enemies.filter((e) => e.threat && inZone(s.zone, e.pos, e.layer));
      if (friendlies.length) this.defend[o.id] = (this.defend[o.id] || 0) + dt * (enemies.length > friendlies.length * 2 ? 0.3 : 1);
      if (!friendlies.length && enemies.length) { this.defend[o.id + '_lost'] = (this.defend[o.id + '_lost'] || 0) + dt; if (this.defend[o.id + '_lost'] > 15) this.failObj(o, s.failText || 'Savunma hattı düştü'); }
      o.prog = 0; o.max = 1;
      if ((this.defend[o.id] || 0) >= s.duration) this.complete(o);
      this._defWarn = (this._defWarn || 0) - dt;
      if (!friendlies.length && this._defWarn <= 0) { this._defWarn = 12; K.ui.toast('Savunma bölgesinde kimse yok! Bölgeyi koru emri ver.', 'bad'); }
    },
    updFollow(o, dt) {
      const s = o.spec, P = K.game.player, v = s.target();
      if (!v || !v.alive) { this.failObj(o, 'Takip edilen hedef kayboldu'); return; }
      const pp = P.vehicle ? P.vehicle.pos : P.pos;
      const d = Math.hypot(pp.x - v.pos.x, pp.z - v.pos.z);
      const st = this.followState[o.id] = this.followState[o.id] || { far: 0, near: 0, d };
      st.d = d;
      if (d > s.maxD) { st.far += dt; if (st.far > (s.loseT || 12)) { this.failObj(o, 'Hedefi kaybettin'); return; } if (st.far > 2 && (st.wf || 0) < this.time) { st.wf = this.time + 4; K.ui.toast('Hedef uzaklaşıyor! Mesafeyi kapat.', 'bad'); } }
      else st.far = Math.max(0, st.far - dt * 2);
      if (s.minD && d < s.minD) { st.near += dt; if (st.near > (s.nearT || 8)) { this.failObj(o, 'Fark edildin — çok yakın takip ettin'); return; } if (st.near > 1.5 && (st.wn || 0) < this.time) { st.wn = this.time + 4; K.ui.toast('Çok yakınsın! Fark edileceksin.', 'bad'); } }
      else st.near = Math.max(0, st.near - dt);
      if (s.done && s.done(this)) this.complete(o);
    },
    // ── Puanlama ve rapor
    report(success) {
      const G = K.game, st = G.stats, def = this.def;
      const lines = [];
      let score = 0;
      const add = (label, v) => { lines.push({ label, v }); score += v; };
      const sides = this.objs.filter((o) => o.side);
      if (success) add('Ana görev tamamlandı', 1000);
      const sd = sides.filter((o) => o.state === 'done').length;
      if (sd) add(`Yan hedefler (${sd}/${sides.length})`, sd * 350);
      if (this.evidence.length) add(`Toplanan delil (${this.evidence.length})`, this.evidence.length * 120);
      if (st.arrests) add(`Gözaltı (${st.arrests})`, st.arrests * 90);
      if (st.takedowns) add(`Sessiz etkisizleştirme (${st.takedowns})`, st.takedowns * 50);
      if (st.kills) add(`Etkisiz düşman (${st.kills})`, st.kills * 15);
      if (st.civSaved) add(`Kurtarılan sivil (${st.civSaved})`, st.civSaved * 60);
      if (st.civLost) add(`Sivil kayıp (${st.civLost})`, -st.civLost * 300);
      if (st.downed) add(`Yaralanan ekip üyesi (${st.downed})`, -st.downed * 80);
      if (st.kia) add(`Kaybedilen ekip üyesi (${st.kia})`, -st.kia * 400);
      if (success && def.stealth && !this.alarm) add('Gizlilik bonusu (alarm yok)', 400);
      if (success && def.par && this.endT < def.par) add('Zaman bonusu', Math.round((1 - this.endT / def.par) * 400));
      if (st.shots >= 10) add(`İsabet (%${Math.round(st.hits / st.shots * 100)})`, Math.round(st.hits / st.shots * 200));
      score = Math.max(0, Math.round(score));
      const maxS = 1000 + sides.length * 350 + (def.evidenceMax || 0) * 120 + (def.stealth ? 400 : 0) + (def.par ? 250 : 0) + 140 + (def.civMax || 0) * 60;
      const pct = score / maxS;
      const grade = !success ? 'F' : pct >= 0.82 ? 'S' : pct >= 0.66 ? 'A' : pct >= 0.48 ? 'B' : 'C';
      return {
        success, score, grade, lines, time: this.endT || this.time, reason: this.failReason,
        objs: this.objs.map((o) => ({ text: o.text, side: o.side, state: o.state })),
        kills: st.kills, arrests: st.arrests, takedowns: st.takedowns, civSaved: st.civSaved, civLost: st.civLost,
        evidence: success ? this.evidence.slice() : [], rescued: success ? this.rescued.slice() : [], decisions: success ? Object.assign({}, this.decisions) : {},
        ending: success && def.ending ? def.ending(this) : null,
      };
    },
    // ── Varlık oluşturucular
    pts(list) { return list.map(([x, z, w, yaw]) => ({ x, z, wait: w, yaw })); },
    enemy(o) { return K.game.spawnEnemy(o); },
    civ(o) { return K.game.spawnCiv(o); },
    vip(o) { const v = K.game.spawnCiv(Object.assign({ team: 'vip', escortable: true }, o)); return v; },
    veh(type, o) { return K.game.spawnVehicle(type, o); },
    interact(it) { K.world.interactables.push(it); this.interacts.push(it); return it; },
    item(o) {
      const G = K.game;
      let mesh = null;
      if (o.mesh !== 'none') {
        mesh = o.mesh === 'bag' ? K.models.evidenceBag() : o.mesh === 'laptop' ? K.models.laptop() : o.mesh === 'crate' ? (() => { const P = new K.models.Parts(); P.box(0.9, 0.7, 0.6, 0x5a6a3a, 'FABRIC', 0, 0.35, 0); P.box(0.92, 0.08, 0.62, 0x2a2a2a, 'FLAT', 0, 0.55, 0); return P.mesh(K.models.matProp); })() : K.models.documentMesh();
        mesh.position.set(o.x, o.y != null ? o.y : K.world.groundAt(o.x, o.z, (o.layer ? K.nav.layers[o.layer].y : 0) + 1.2) + 0.02, o.z);
        mesh.rotation.y = o.ry || Math.random() * 6;
        G.dyn.add(mesh);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.tex.glow, color: o.evidence === false ? 0x9fd0ff : 0xffc060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7, toneMapped: false }));
        glow.scale.setScalar(0.9 + K.prog.skillVal('evidence') * 0.3); glow.position.y = 0.25; mesh.add(glow); mesh.userData.glow = glow;
      }
      const item = { o, mesh, taken: false };
      const it = this.interact({
        id: 'item_' + (o.id || Math.random()), x: o.x, y: mesh ? mesh.position.y + 0.2 : o.y || 1, z: o.z, r: 1.8, layer: o.layer || 0,
        enabled: () => !item.taken && (!o.enabled || o.enabled(this)),
        hold: o.hold || 0,
        label: () => o.label || `Delili al: ${o.name}`,
        use: (actor) => {
          if (item.taken) return;
          item.taken = true; if (mesh) G.dyn.remove(mesh);
          K.audio.pickup();
          if (o.tag) this.addCount(o.tag, o.evidence === false ? null : (o.id || null), o.name, o.desc);
          else if (o.evidence !== false && o.id) { this.evidence.push(o.id); K.ui.toast(`${o.name}${o.desc ? ' — ' + o.desc : ''}`, 'evidence'); }
          if (o.give) G.giveItem(o.give);
          o.onPick && o.onPick(this, actor);
        },
        squadUse: (m) => it.use(m),
      });
      item.it = it;
      this.items.push(item);
      return item;
    },
    obstacle(o) {
      // geçici çarpıştırıcı + ağ (barikat, enkaz)
      const P = new K.models.Parts();
      o.build(P);
      const mesh = P.mesh(K.models.matProp); K.game.dyn.add(mesh);
      const cols = (o.boxes || []).map((b) => K.world.addC(b[0], b[1], b[2], b[3], b[4], b[5], { surf: 'metal', nav: false }));
      const ob = { mesh, cols, alive: true, remove() { if (!this.alive) return; this.alive = false; K.game.dyn.remove(mesh); for (const c of cols) K.world.removeC(c); } };
      this.obstacles.push(ob);
      return ob;
    },
    talk(npc, tree, onEnd) { K.ui.dialogue(npc, tree, this, onEnd); },
    radio(who, text, say) { K.ui.radio(who, text); if (say) K.audio.say(text); },
    code4() { let s = ''; for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 10); return s; },
    hint(key, text) { if (K.save.data.tutorial[key]) return; K.save.data.tutorial[key] = 1; K.save.write(); K.ui.hint(text); },
  };
  MD_CORE = new Set(Object.keys(MD).concat(['endT', 'failReason', 'stats0', 'defend', 'followState', 'vipDowns', '_defWarn']));
})();
