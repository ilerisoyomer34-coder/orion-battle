/* KOMUTA — arayüz: HUD, komut tekeri, harita, diyalog, tuş takımı, rapor, terfi, operasyon merkezi, brifing, ayarlar, dokunmatik */
'use strict';
(function () {
  const U = K.U, $ = U.$, h = U.h, V3 = THREE.Vector3;
  const _v = new V3();
  const EVIDENCE_NAMES = {
    m01_note: 'Yapışkan not (arşiv kodu)', m01_agenda: 'Müdürün ajandası', m01_testimony: 'Bora\'nın ifadesi', m01_file: 'PROJE KARANLIK dosyası',
    m02_bandage: 'Kanlı bandaj', m02_phone: 'Kırık telefon', m03_doc1: 'Sevk irsaliyesi', m03_doc2: 'Gümrük formu', m03_doc3: 'Ödeme defteri', m03_logs: 'Sevkiyat kayıtları',
    m06_ledger: 'Kara para defteri', m06_extra1: 'Gizli kasa makbuzları', m06_extra2: 'Baron dosyası', m06_footage: 'Güvenlik kamerası kayıtları', m09_cargo: 'TIR yükü (kaçak sevkiyat)',
    m09_crate1: 'Kanıt sandığı A', m09_crate2: 'Kanıt sandığı B', m09_crate3: 'Kanıt sandığı C', p1_doc1: 'Sevk fişi', p1_doc2: 'Yükleme listesi', p1_doc3: 'Şoför notu', p4_receipt: 'Taksi fişi', p4_cctv: 'Kamera kaydı notu', p4_usb: 'USB bellek',
  };
  const UI = K.ui = {
    wheelOpen: false, mapOpen: false, journalOpen: false, dialogOpen: false, keypadOpen: false, modal: null,
    toastsEl: null, lastSquadHash: '', hudCache: {},
    init() {
      this.toastsEl = $('toasts');
      this.buildTouch();
      this.bindMenus();
      this.mm = $('minimap'); this.mmc = this.mm.getContext('2d');
      this.mapC = $('mapCanvas'); this.mapX = this.mapC.getContext('2d');
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('keydown', (e) => this.onKey(e));
      this.resize();
    },
    resize() { if (this.mapOpen) this.drawMap(); },
    show(id) { const e = $(id); if (e) e.classList.remove('hidden'); },
    hide(id) { const e = $(id); if (e) e.classList.add('hidden'); },
    screen(id) {
      for (const s of ['menu', 'hq', 'brief', 'report', 'promo', 'pause', 'settingsScr', 'helpScr']) this.hide(s);
      if (id) this.show(id);
      const inGame = id == null && K.game.state === 'playing';
      $('hud').classList.toggle('hidden', !inGame);
      this.updateTouchVisibility();
    },
    // ─────────── Bildirimler
    toast(text, type = '') {
      if (!this.toastsEl) return;
      if (type === 'big' || type === 'big-bad') { const b = $('bigmsg'); b.textContent = text; b.className = type; b.classList.add('show'); clearTimeout(this._bigT); this._bigT = setTimeout(() => b.classList.remove('show'), 2400); return; }
      const t = h('div', { class: 'toast ' + type }, text);
      this.toastsEl.prepend(t);
      while (this.toastsEl.children.length > 5) this.toastsEl.lastChild.remove();
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, type === 'evidence' ? 5200 : 3600);
    },
    radio(who, text) {
      const r = $('radio');
      const line = h('div', { class: 'rline' }, h('b', null, who + ': '), text);
      r.appendChild(line); K.audio.radio();
      while (r.children.length > 4) r.firstChild.remove();
      setTimeout(() => { line.classList.add('out'); setTimeout(() => line.remove(), 600); }, 7000);
    },
    hint(text) {
      const e = $('hint'); e.innerHTML = '<b>İPUCU</b> ' + U.esc(text) + '<span class="x">✕</span>';
      e.classList.add('show'); clearTimeout(this._hintT);
      e.onclick = () => e.classList.remove('show');
      this._hintT = setTimeout(() => e.classList.remove('show'), 14000);
    },
    cmdFeedback(m, text, type) {
      m.feedback = { text, type, t: 3 };
      if (type === 'bad') K.audio.ui('bad');
      this.lastSquadHash = '';
    },
    hitMarker(head) { const e = $('hitmark'); e.className = head ? 'show head' : 'show'; clearTimeout(this._hmT); this._hmT = setTimeout(() => (e.className = ''), 140); },
    damageFlash(d) { const e = $('dmg'); e.style.opacity = Math.min(0.85, 0.25 + d * 0.02); clearTimeout(this._dmT); this._dmT = setTimeout(() => (e.style.opacity = 0), 220); },
    marker(x, y, z, type) {
      const g = K.game;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 24), new THREE.MeshBasicMaterial({ color: type === 'guard' ? 0x40a0ff : 0x60ff90, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, K.world.groundAt(x, z, y + 1.5) + 0.06, z);
      g.dyn.add(ring);
      g.fxMarkers.push({ m: ring, t: 2.5 });
    },
    objectivesChanged() { this._objDirty = true; },
    squadChanged() { this.lastSquadHash = ''; },
    // ─────────── HUD
    updateHUD(dt) {
      const G = K.game, P = G.player, M = K.mission;
      if (!P) return;
      const c = this.hudCache;
      const set = (id, v, prop = 'textContent') => { if (c[id] !== v) { c[id] = v; const e = $(id); if (e) e[prop] = v; } };
      const bar = (id, f) => { const v = Math.round(U.clamp(f, 0, 1) * 1000) / 10 + '%'; if (c[id] !== v) { c[id] = v; $(id).style.width = v; } };
      // sol üst
      bar('hpFill', P.hp / P.maxHp); bar('arFill', P.maxArmor ? P.armor / P.maxArmor : 0); bar('stFill', P.stamina / P.maxStamina);
      set('hpNum', Math.ceil(P.hp)); set('arNum', Math.ceil(P.armor));
      const rk = K.prog.rankDef(); set('rankName', rk.name);
      const nx = K.prog.nextRank(); bar('xpFill', nx ? (K.save.data.xp - rk.xp) / (nx.xp - rk.xp) : 1);
      set('xpTxt', nx ? `${K.save.data.xp} / ${nx.xp} XP` : `${K.save.data.xp} XP`);
      $('vitals').classList.toggle('low', P.hp < P.maxHp * 0.3);
      // orta üst: ana hedef
      if (this._objDirty || (this._objT = (this._objT || 0) - dt) <= 0) {
        this._objDirty = false; this._objT = 0.25;
        const main = M.objs.filter((o) => o.main && o.state === 'active');
        $('objMain').innerHTML = main.length ? main.map((o) => '<div>◆ ' + U.esc(M.objText(o)) + '</div>').join('') : (M.state === 'done' ? '<div>Görev tamamlandı</div>' : '');
        set('objTime', (M.def && M.def.timeLimit ? '⏱ ' + U.fmtTime(M.def.timeLimit - M.time) + ' · ' : '') + U.fmtTime(M.time));
        if (this.journalOpen) this.renderJournal();
      }
      // gizlilik durumu
      let maxS = 0, alarmed = M.alarm;
      for (const e of G.enemies) if (e.threat) { if (e.state === 'combat') alarmed = true; maxS = Math.max(maxS, e.susp); }
      const stl = alarmed ? 'ALARM' : maxS > 60 ? 'ARANIYOR' : maxS > 25 ? 'ŞÜPHE' : 'GİZLİ';
      set('stealthTxt', stl); $('stealth').className = 'st-' + (alarmed ? 'alarm' : maxS > 60 ? 'search' : maxS > 25 ? 'susp' : 'hidden');
      bar('stealthFill', alarmed ? 1 : maxS / 100);
      K.audio.setLoop('music', 0.35, alarmed ? 1 : maxS / 100);
      K.audio.setLoop('pulse', alarmed ? 0.6 : 0);
      // sağ alt: silah
      const v = P.vehicle;
      $('weapon').classList.toggle('hidden', !!v);
      $('vehHud').classList.toggle('hidden', !v);
      if (!v) {
        const w = P.w;
        set('wName', w ? w.def.name : '—'); set('wSub', w ? (P.holstered ? 'KILIFTA (H)' : w.def.sub) : '');
        set('ammoBig', w ? (P.reloadT >= 0 ? '···' : String(w.ammo)) : '-'); set('ammoRes', w ? '/ ' + w.reserve : '');
        set('stance', P.crouched ? 'ÇÖMELMİŞ' : P.sprinting ? 'KOŞU' : 'AYAKTA');
        const gd = P.gadget; set('gadget', gd ? `[G] ${gd.def.name}${gd.id === 'nvg' ? (P.nvg ? ' (AÇIK)' : '') : ' ×' + gd.count}` : '');
      } else {
        set('vName', v.name); set('vSpeed', Math.round(Math.abs(v.speed) * 3.6) + ' km/s');
        bar('vHpFill', v.hp / v.maxHp); set('vHp', Math.round(v.hp / v.maxHp * 100) + '%');
        set('vSeats', `Koltuk ${v.seats.filter((s) => s.actor).length}/${v.seats.length}`);
        let help = v.seats[0].actor === P ? (v.def.kind === 'heli' ? 'W/S ileri-geri · A/D dönüş · Boşluk/C yüksel-alçal · E in' : v.type === 'tank' ? 'WASD sür · Fare taret · Sol tık top · Sağ tık nişan · E in' : 'WASD sür · Boşluk el freni · L far · V kamera · E in') : 'Yolcu · V kamera · E in';
        if (v.type === 'tank') help += v.reloadT > 0 ? ` · Top dolduruluyor ${v.reloadT.toFixed(1)} sn` : ' · TOP HAZIR';
        if (v.def.kind === 'heli') help += ` · İrtifa ${Math.max(0, Math.round(v.pos.y - K.world.terrainH(v.pos.x, v.pos.z)))} m`;
        set('vHelp', help);
      }
      // nişangâh
      const xh = $('xhair');
      const showX = !v && P.armed && !P.zoomed && K.cam.mode === 'foot' || (v && v.type === 'tank');
      xh.style.display = showX ? 'block' : 'none';
      if (showX && P.wdef) { const sp = (P.aiming ? P.wdef.aimSpread : P.wdef.spread) * 900 + P.spreadBloom * 14 + 6; xh.style.setProperty('--sp', Math.min(60, sp) + 'px'); }
      $('scope').classList.toggle('show', !!P.zoomed);
      $('dot').style.display = !v && !P.armed && K.cam.mode === 'foot' ? 'block' : 'none';
      // etkileşim istemi
      const it = G.interaction;
      const pr = $('prompt');
      if (it && !this.dialogOpen) {
        set('promptTxt', (K.save.data.settings.touch === 'on' || this.touchActive ? '' : '[E] ') + it.label + (it.hold ? ' (basılı tut)' : ''));
        pr.classList.add('show');
        const f = G.holdProg || 0;
        $('promptRing').style.background = f > 0 ? `conic-gradient(#d4874a ${f * 360}deg, rgba(255,255,255,0.12) 0)` : 'rgba(255,255,255,0.12)';
      } else pr.classList.remove('show');
      // ekip paneli
      this.renderSquad();
      // NVG
      const nv = P.nvg; if (this._nv !== nv) { this._nv = nv; K.renderer.domElement.style.filter = nv ? 'brightness(2.6) contrast(1.2) sepia(1) hue-rotate(60deg) saturate(2.5)' : ''; $('nvg').classList.toggle('show', nv); }
      // ekran işaretçileri
      this.updateMarkers();
      this.drawMinimap();
      if (this.wheelOpen) this.updateWheel();
      if (K.save.data.settings.showFps) set('fps', Math.round(G.fps) + ' FPS');
    },
    renderSquad() {
      const G = K.game, sq = G.squad;
      const hash = sq.map((m) => `${m.selected}${m.alive}${m.downed}${Math.round(m.hp / 10)}${m.status}${m.teamTag}${m.feedback ? m.feedback.text : ''}${m.fireMode}`).join('|') + K.squad.formation;
      if (hash === this.lastSquadHash) return;
      this.lastSquadHash = hash;
      const el = $('squad');
      el.innerHTML = '';
      if (!sq.length) { el.appendChild(h('div', { class: 'sq-empty' }, K.save.data.rank === 0 ? 'Tek ajan — komuta menüsü Teğmen rütbesinde açılır' : '')); return; }
      el.appendChild(h('div', { class: 'sq-head' }, `EKİP · ${({ free: 'Serbest', tight: 'Kısa aralık', wide: 'Geniş aralık' })[K.squad.formation]} · 0: tümü`));
      sq.forEach((m, i) => {
        const card = h('div', { class: 'sq' + (m.selected ? ' sel' : '') + (!m.alive ? ' dead' : m.downed ? ' down' : '') },
          h('span', { class: 'sq-k' }, String(i + 1)),
          h('div', { class: 'sq-b' },
            h('div', { class: 'sq-n' }, m.name, m.teamTag ? h('span', { class: 'tag tag' + m.teamTag }, m.teamTag) : null, m.fireMode === 'hold' ? h('span', { class: 'tag hold' }, 'ATEŞ KES') : null),
            h('div', { class: 'sq-u' }, m.unit.name + ' · ' + (m.feedback ? m.feedback.text : (m.alive ? m.status : 'Kayıp'))),
            h('div', { class: 'sq-hp' }, h('i', { style: { width: Math.max(0, m.hp / m.maxHp * 100) + '%' } }))));
        if (m.feedback) card.classList.add(m.feedback.type === 'bad' ? 'fb-bad' : 'fb-ok');
        card.onclick = (e) => { K.squad.select(i, e.shiftKey); };
        el.appendChild(card);
      });
    },
    updateMarkers() {
      const G = K.game, cam = K.cam.camera, M = K.mission, P = G.player;
      const box = $('markers'); const W = window.innerWidth, H = window.innerHeight;
      const pool = this._mkPool = this._mkPool || [];
      let n = 0;
      const get = () => { let e = pool[n]; if (!e) { e = h('div', { class: 'mk' }); box.appendChild(e); pool[n] = e; } n++; e.style.display = 'block'; return e; };
      const proj = (x, y, z) => { _v.set(x, y, z).project(cam); const behind = _v.z > 1; return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, behind }; };
      // hedef işaretçisi
      const objs = M.objs.filter((o) => o.main && o.state === 'active');
      for (const o of objs.slice(0, 2)) {
        const w = M.where(o); if (!w) continue;
        const y = w.y != null ? w.y : K.world.groundAt(w.x, w.z, (P.pos.y || 0) + 4) + 2.2;
        let p = proj(w.x, y, w.z);
        const d = Math.hypot(w.x - P.pos.x, w.z - P.pos.z);
        if (p.behind) { p.x = W - p.x; p.y = H - 30; }
        p.x = U.clamp(p.x, 40, W - 40); p.y = U.clamp(p.y, 60, H - 60);
        const e = get(); e.className = 'mk obj'; e.innerHTML = `<i>◆</i><span>${Math.round(d)} m</span>`;
        e.style.transform = `translate(${p.x}px,${p.y}px)`;
      }
      // düşman şüphe göstergeleri
      const skill = K.prog.skillVal('stealth');
      for (const e of G.enemies) {
        if (!e.threat || e.layer !== P.layer) continue;
        const show = e.susp > 8 || e.state === 'combat' || (e.marked && e.marked > G.time);
        if (!show) continue;
        const d = e.dist(P.pos); if (d > 70) continue;
        let p = proj(e.pos.x, e.pos.y + 2.25, e.pos.z);
        const off = p.behind || p.x < 0 || p.x > W || p.y < 0 || p.y > H;
        if (off && skill < 1 && !(e.marked > G.time)) continue;
        if (off) { const a = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z) - K.cam.yaw; p = { x: W / 2 - Math.sin(a) * Math.min(W, H) * 0.32, y: H / 2 - Math.cos(a) * Math.min(W, H) * 0.32 }; }
        const el = get();
        const st = e.state === 'combat' ? 'alert' : e.susp > 60 ? 'search' : e.susp > 25 ? 'susp' : 'low';
        el.className = 'mk en ' + st + (off ? ' off' : '');
        el.innerHTML = e.state === 'combat' ? '<b>!</b>' : `<b>${e.susp > 60 ? '!' : '?'}</b><u style="width:${Math.round(e.susp)}%"></u>`;
        el.style.transform = `translate(${p.x}px,${p.y}px)`;
      }
      // ekip etiketleri (seçiliyse veya yaralıysa)
      for (const m of G.squad) {
        if (!m.alive || m.vehicle) continue;
        if (!m.selected && !m.downed && !m.feedback) continue;
        const p = proj(m.pos.x, m.pos.y + 2.1, m.pos.z); if (p.behind) continue;
        const el = get(); el.className = 'mk sq ' + (m.downed ? 'down' : m.selected ? 'sel' : '');
        el.innerHTML = `<span>${U.esc(m.name.split(' ').pop())}${m.feedback ? ' · ' + U.esc(m.feedback.text) : m.downed ? ' · YARALI' : ''}</span>`;
        el.style.transform = `translate(${p.x}px,${p.y}px)`;
      }
      // VIP / takip edenler
      for (const c of G.civs) {
        if (!c.alive || c.vehicle) continue;
        if (c.team !== 'vip' && c.state !== 'follow') continue;
        if (c.hideMarker) continue;
        const p = proj(c.pos.x, c.pos.y + 2.1, c.pos.z); if (p.behind) continue;
        const el = get(); el.className = 'mk vip'; el.innerHTML = `<span>${c.team === 'vip' ? '★ ' : ''}${U.esc(c.name || 'Sivil')}${c.downed ? ' · YARALI (E)' : ''}</span>`;
        el.style.transform = `translate(${p.x}px,${p.y}px)`;
      }
      for (let i = n; i < pool.length; i++) pool[i].style.display = 'none';
      // geri bildirim süreleri
      for (const m of G.squad) if (m.feedback) { m.feedback.t -= 1 / 60; if (m.feedback.t <= 0) { m.feedback = null; this.lastSquadHash = ''; } }
    },
    // ─────────── Harita (önceden çizilmiş)
    buildMapImage() {
      const S = 2, x0 = -300, z0 = -330, Wd = 600, Hd = 630;
      const c = document.createElement('canvas'); c.width = Wd * S; c.height = Hd * S;
      const g = c.getContext('2d');
      g.fillStyle = '#2a3226'; g.fillRect(0, 0, c.width, c.height);
      const Cc = K.world.CITY;
      g.fillStyle = '#3b3f43'; g.fillRect((Cc.x0 - x0) * S, (Cc.z0 - z0) * S, (Cc.x1 - Cc.x0) * S, (Cc.z1 - Cc.z0) * S);
      g.fillStyle = '#16304a'; g.fillRect((266 - x0) * S, (96 - z0) * S, 40 * S, (300 - 96) * S);
      g.fillStyle = '#25282c';
      for (const [z, a, b] of K.world.roadsH) g.fillRect((a - x0) * S, (z - 6 - z0) * S, (b - a) * S, 12 * S);
      for (const [x, a, b] of K.world.roadsV) g.fillRect((x - 6 - x0) * S, (a - z0) * S, 12 * S, (b - a) * S);
      for (const col of K.world.colliders) {
        if (col.door || col.max.y < 2.2 || col.min.y > 1) continue;
        const w = (col.max.x - col.min.x), d = (col.max.z - col.min.z);
        if (w * d < 0.8) continue;
        g.fillStyle = col.surf === 'metal' ? '#7a8088' : '#8d8a84';
        g.fillRect((col.min.x - x0) * S, (col.min.z - z0) * S, Math.max(1, w * S), Math.max(1, d * S));
      }
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      for (let i = -300; i <= 300; i += 50) { g.beginPath(); g.moveTo((i - x0) * S, 0); g.lineTo((i - x0) * S, c.height); g.stroke(); g.beginPath(); g.moveTo(0, (i - z0) * S); g.lineTo(c.width, (i - z0) * S); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = `bold ${10 * S}px Arial`;
      const lab = [['MERKEZ ÜS', -170, 190], ['ESKİ ŞEHİR', -170, -60], ['KIRMIZI BÖLGE', -170, 55], ['VERTEX PLAZA', 0, -65], ['KULE PLAZA', 150, -160], ['TESİS', 0, 55], ['DEPO', 135, 55], ['LİMAN', 160, 200], ['DAĞ ÜSSÜ', -40, -262], ['HASTANE', -30, 150], ['TIR GARAJI', 235, 52]];
      g.textAlign = 'center';
      for (const [t, x, z] of lab) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(t, (x - x0) * S + 1, (z - z0) * S + 1); g.fillStyle = '#e8c08a'; g.fillText(t, (x - x0) * S, (z - z0) * S); }
      this.mapImg = c; this.mapS = S; this.mapX0 = x0; this.mapZ0 = z0;
    },
    drawMinimap() {
      const g = this.mmc, Wc = this.mm.width, Hc = this.mm.height, G = K.game, P = G.player;
      if (!this.mapImg || !P) return;
      const pp = P.vehicle ? P.vehicle.pos : P.pos;
      const zoom = P.vehicle ? 1.0 : 1.6;
      g.save(); g.clearRect(0, 0, Wc, Hc);
      g.beginPath(); g.arc(Wc / 2, Hc / 2, Wc / 2 - 2, 0, 7); g.clip();
      g.fillStyle = '#1c221c'; g.fillRect(0, 0, Wc, Hc);
      g.translate(Wc / 2, Hc / 2); g.rotate(K.cam.yaw + Math.PI); g.scale(zoom, zoom);
      const S = this.mapS;
      g.drawImage(this.mapImg, -(pp.x - this.mapX0) * S / S * 1, -(pp.z - this.mapZ0) * S / S * 1, this.mapImg.width / S, this.mapImg.height / S);
      const dot = (x, z, col, r = 2.5) => { g.fillStyle = col; g.beginPath(); g.arc(x - pp.x, z - pp.z, r / zoom * 1.6, 0, 7); g.fill(); };
      // bölgeler
      const M = K.mission;
      for (const o of M.objs) if (o.state === 'active' && o.spec.zone && o.spec.zone.r) { g.strokeStyle = 'rgba(232,192,90,0.8)'; g.lineWidth = 1.2 / zoom; g.beginPath(); g.arc(o.spec.zone.x - pp.x, o.spec.zone.z - pp.z, o.spec.zone.r, 0, 7); g.stroke(); }
      for (const v of G.vehicles) { if (!v.alive) continue; g.fillStyle = v.team === 'player' ? '#5ad1ff' : v.team === 'mafia' ? '#ff6a5a' : '#bbbbbb'; g.save(); g.translate(v.pos.x - pp.x, v.pos.z - pp.z); g.rotate(-v.yaw); g.fillRect(-v.def.wid / 2, -v.def.len / 2, v.def.wid, v.def.len); g.restore(); }
      for (const c of G.civs) if (c.alive && !c.hideMarker && Math.abs(c.pos.x - pp.x) < 90 && Math.abs(c.pos.z - pp.z) < 90) dot(c.pos.x, c.pos.z, c.team === 'vip' ? '#ffd24a' : c.state === 'follow' ? '#ffffff' : 'rgba(220,220,220,0.6)', c.team === 'vip' ? 3.5 : 2);
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const known = (e.marked && e.marked > G.time) || e.state === 'combat' || (e.susp > 25 && e.dist(pp) < 40);
        if (!known) continue;
        dot(e.pos.x, e.pos.z, e.threat ? '#ff4a3a' : '#7a5a5a', 3);
      }
      G.squad.forEach((m) => { if (m.alive && !m.vehicle) dot(m.pos.x, m.pos.z, m.downed ? '#ffa020' : m.selected ? '#a0ffb0' : '#4ad06a', 3); });
      g.restore();
      // oyuncu oku
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(Wc / 2, Hc / 2 - 7); g.lineTo(Wc / 2 - 5, Hc / 2 + 5); g.lineTo(Wc / 2 + 5, Hc / 2 + 5); g.closePath(); g.fill();
      // hedef yönü
      const objs = M.objs.filter((o) => o.main && o.state === 'active');
      for (const o of objs.slice(0, 1)) {
        const w = M.where(o); if (!w) continue;
        const a = Math.atan2(w.x - pp.x, w.z - pp.z) - K.cam.yaw;
        const d = Math.hypot(w.x - pp.x, w.z - pp.z) * zoom;
        const r = Math.min(Wc / 2 - 10, d);
        const x = Wc / 2 - Math.sin(a) * r, y = Hc / 2 - Math.cos(a) * r;
        g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(212,135,74,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(Wc / 2, Hc / 2, Wc / 2 - 2, 0, 7); g.stroke();
      g.fillStyle = '#d4874a'; g.font = 'bold 11px Arial'; g.textAlign = 'center';
      const na = Math.PI - K.cam.yaw; g.fillText('K', Wc / 2 - Math.sin(na) * (Wc / 2 - 12), Hc / 2 - Math.cos(na) * (Wc / 2 - 12) + 4);
    },
    openMap() {
      if (this.mapOpen) return;
      this.mapOpen = true; this.show('mapScr'); document.exitPointerLock && document.exitPointerLock();
      const P = K.game.player, pp = P.vehicle ? P.vehicle.pos : P.pos;
      this.mapView = { cx: pp.x, cz: pp.z, zoom: 2.2 };
      this.drawMap();
      const c = this.mapC;
      c.onwheel = (e) => { this.mapView.zoom = U.clamp(this.mapView.zoom * (e.deltaY > 0 ? 0.85 : 1.18), 0.6, 8); this.drawMap(); e.preventDefault(); };
      let drag = null;
      c.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, cx: this.mapView.cx, cz: this.mapView.cz, moved: false, b: e.button }; };
      c.onpointermove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true; if (drag.moved) { this.mapView.cx = drag.cx - dx / this.mapView.zoom; this.mapView.cz = drag.cz - dy / this.mapView.zoom; this.drawMap(); } };
      c.onpointerup = (e) => {
        if (drag && !drag.moved) {
          const r = c.getBoundingClientRect();
          const wx = this.mapView.cx + (e.clientX - r.left - r.width / 2) / this.mapView.zoom, wz = this.mapView.cz + (e.clientY - r.top - r.height / 2) / this.mapView.zoom;
          if (K.game.squad.length) { K.squad.command(drag.b === 2 ? 'guard' : 'move', { point: { x: wx, z: wz } }); this.drawMap(); }
          else K.ui.toast('Haritadan emir vermek için ekip gerekli', 'bad');
        }
        drag = null;
      };
      c.oncontextmenu = (e) => e.preventDefault();
    },
    closeMap() { this.mapOpen = false; this.hide('mapScr'); },
    drawMap() {
      const c = this.mapC, g = this.mapX;
      c.width = c.clientWidth * (window.devicePixelRatio > 1 ? 1.5 : 1); c.height = c.clientHeight * (window.devicePixelRatio > 1 ? 1.5 : 1);
      const k = c.width / c.clientWidth;
      const v = this.mapView, z = v.zoom * k, S = this.mapS;
      g.fillStyle = '#121812'; g.fillRect(0, 0, c.width, c.height);
      g.save(); g.translate(c.width / 2, c.height / 2); g.scale(z, z); g.translate(-v.cx, -v.cz);
      g.drawImage(this.mapImg, this.mapX0, this.mapZ0, this.mapImg.width / S, this.mapImg.height / S);
      const G = K.game, M = K.mission;
      for (const o of M.objs) {
        if (o.state !== 'active') continue;
        const zn = o.spec.zone; if (zn) { g.strokeStyle = o.main ? '#e8b04a' : '#7ac0ff'; g.lineWidth = 2 / z; if (zn.r) { g.beginPath(); g.arc(zn.x, zn.z, zn.r, 0, 7); g.stroke(); } else g.strokeRect(zn.x0, zn.z0, zn.x1 - zn.x0, zn.z1 - zn.z0); }
        const w = M.where(o); if (w) { g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(w.x, w.z - 5); g.lineTo(w.x + 4, w.z); g.lineTo(w.x, w.z + 5); g.lineTo(w.x - 4, w.z); g.fill(); }
        if (o.spec.zones) for (const zz of o.spec.zones) { g.strokeStyle = '#e8b04a'; g.setLineDash([3 / z, 3 / z]); g.beginPath(); g.arc(zz.x, zz.z, zz.r, 0, 7); g.stroke(); g.setLineDash([]); }
      }
      const sz = M.safeZone(); if (sz) { g.fillStyle = 'rgba(80,200,120,0.25)'; g.beginPath(); g.arc(sz.x, sz.z, sz.r, 0, 7); g.fill(); }
      for (const vv of G.vehicles) { if (!vv.alive) continue; g.fillStyle = vv.team === 'player' ? '#5ad1ff' : vv.team === 'mafia' ? '#ff6a5a' : '#aaaaaa'; g.save(); g.translate(vv.pos.x, vv.pos.z); g.rotate(-vv.yaw); g.fillRect(-vv.def.wid / 2, -vv.def.len / 2, vv.def.wid, vv.def.len); g.restore(); }
      const dot = (x, zz, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(x, zz, r / z * 3, 0, 7); g.fill(); };
      for (const e of G.enemies) if (e.alive && ((e.marked && e.marked > G.time) || e.state === 'combat')) dot(e.pos.x, e.pos.z, e.threat ? '#ff4a3a' : '#886', 1.6);
      for (const cc of G.civs) if (cc.alive && !cc.hideMarker && (cc.team === 'vip' || cc.escortable)) dot(cc.pos.x, cc.pos.z, cc.team === 'vip' ? '#ffd24a' : '#eeeeee', 1.2);
      G.squad.forEach((m, i) => { if (!m.alive) return; const p = m.vehicle ? m.vehicle.pos : m.pos; dot(p.x, p.z, m.downed ? '#ffa020' : m.selected ? '#b0ffc0' : '#4ad06a', 1.7); g.fillStyle = '#fff'; g.font = `${10 / z}px Arial`; g.fillText(String(i + 1), p.x + 3 / z, p.z - 3 / z); if (m.order && (m.order.type === 'move' || m.order.type === 'guard') && m.order.x != null) { g.strokeStyle = 'rgba(160,255,180,0.5)'; g.lineWidth = 1 / z; g.beginPath(); g.moveTo(p.x, p.z); g.lineTo(m.order.x, m.order.z); g.stroke(); } });
      const P = G.player, pp = P.vehicle ? P.vehicle.pos : P.pos;
      g.save(); g.translate(pp.x, pp.z); g.rotate(-K.cam.yaw); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 6 / z * 2); g.lineTo(4 / z * 2, -4 / z * 2); g.lineTo(-4 / z * 2, -4 / z * 2); g.closePath(); g.fill(); g.restore();
      g.restore();
    },
    // ─────────── Komut tekeri
    WHEEL: [
      { id: 'follow', t: 'Beni takip et', k: 'F' }, { id: 'hold', t: 'Burada bekle', k: 'B' }, { id: 'move', t: 'Konuma ilerle', k: 'T' }, { id: 'guard', t: 'Bölgeyi koru' },
      { id: 'revive', t: 'Yaralıya yardım' }, { id: 'escort', t: 'Sivili tahliye et' }, { id: 'vehicle', t: 'Araca bin / in' }, { id: 'interact', t: 'Etkileşim' },
    ],
    WHEEL2: [{ id: 'fire', t: 'Ateş serbest / kes' }, { id: 'formation', t: 'Düzen değiştir' }, { id: 'barrier', t: 'Bariyer kur' }, { id: 'teamA', t: 'A timi ata' }, { id: 'teamB', t: 'B timi ata' }, { id: 'selA', t: 'A timini seç' }, { id: 'selB', t: 'B timini seç' }, { id: 'regroup', t: 'Komutana dön' }],
    openWheel() {
      if (this.wheelOpen) return;
      if (!K.game.squad.length) { this.toast(K.save.data.rank === 0 ? 'Komuta menüsü bu görevden sonra (Teğmen) açılır' : 'Bu görevde ekip yok', 'bad'); return; }
      this.wheelOpen = true; this.wv = { x: 0, y: 0 }; this.wheelHover = null;
      const ap = K.cam.aimPoint(200);
      this.wheelPoint = { x: ap.x, y: ap.y, z: ap.z };
      const W = $('wheel'); W.innerHTML = '';
      W.appendChild(h('div', { class: 'wh-center' }, h('div', { id: 'whTitle' }, 'KOMUT'), h('div', { id: 'whSel' }, '')));
      const R = 150;
      this.WHEEL.forEach((it, i) => {
        const a = -Math.PI / 2 + i * Math.PI * 2 / this.WHEEL.length;
        const e = h('div', { class: 'wh-it', 'data-id': it.id }, h('b', null, it.t), it.k ? h('small', null, it.k) : null);
        e.style.left = `calc(50% + ${Math.cos(a) * R}px)`; e.style.top = `calc(50% + ${Math.sin(a) * R}px)`;
        it._x = Math.cos(a) * R; it._y = Math.sin(a) * R; it.el = e;
        e.onclick = () => this.wheelExec(it.id);
        W.appendChild(e);
      });
      const row = h('div', { class: 'wh-row' });
      this.WHEEL2.forEach((it, i) => { const e = h('div', { class: 'wh-sm', 'data-id': it.id }, it.t); it.el = e; e.onclick = () => this.wheelExec(it.id); row.appendChild(e); });
      W.appendChild(row);
      W.appendChild(h('div', { class: 'wh-help' }, 'Fareyle seç · Q bırak veya tıkla · 1-8 asker, 0 tümü · Oyun yavaşladı'));
      W.appendChild(h('div', { id: 'whCursor' }));
      this.show('wheel');
      requestAnimationFrame(() => { for (const it of this.WHEEL2) { const r = it.el.getBoundingClientRect(), wr = W.getBoundingClientRect(); it._x = r.left + r.width / 2 - (wr.left + wr.width / 2); it._y = r.top + r.height / 2 - (wr.top + wr.height / 2); } });
      this.updateWheel();
    },
    updateWheel() {
      const I = K.input;
      this.wv.x = U.clamp(this.wv.x + I.mdx * 0.9, -260, 260); this.wv.y = U.clamp(this.wv.y + I.mdy * 0.9, -240, 280);
      let best = null, bd = 85;
      for (const it of this.WHEEL.concat(this.WHEEL2)) { if (it._x == null) continue; const d = Math.hypot(it._x - this.wv.x, it._y - this.wv.y); if (d < bd) { bd = d; best = it; } }
      if (Math.hypot(this.wv.x, this.wv.y) < 40) best = null;
      if (best !== this.wheelHover) { if (this.wheelHover) this.wheelHover.el.classList.remove('hov'); this.wheelHover = best; if (best) { best.el.classList.add('hov'); K.audio.ui(); } }
      const c = $('whCursor'); if (c) c.style.transform = `translate(${this.wv.x}px,${this.wv.y}px)`;
      const sel = K.squad.selected();
      const s = $('whSel'); if (s) s.textContent = sel.length ? sel.map((m) => m.name.split(' ').pop()).join(', ') : 'Tüm ekip';
      const t = $('whTitle'); if (t) t.textContent = best ? best.t : 'KOMUT';
      if (I.mbHit[0] && best) this.wheelExec(best.id);
    },
    wheelExec(id) {
      const G = K.game, P = G.player, pt = this.wheelPoint;
      this.closeWheel();
      switch (id) {
        case 'move': case 'guard': case 'barrier': K.squad.command(id, { point: pt }); break;
        case 'vehicle': { const anyIn = K.squad.targets().some((m) => m.vehicle); if (anyIn && !P.vehicle) K.squad.command('exitVehicle'); else if (P.vehicle && K.squad.targets().every((m) => m.vehicle || !m.alive)) K.squad.command('exitVehicle'); else K.squad.command('vehicle', { point: P.vehicle ? P.vehicle.pos : pt, vehicle: P.vehicle || null }); break; }
        case 'interact': { const it = G.interactNear(pt); K.squad.command('interact', { it }); break; }
        case 'selA': K.squad.selectTeam('A'); break;
        case 'selB': K.squad.selectTeam('B'); break;
        default: K.squad.command(id, { point: pt });
      }
    },
    closeWheel() { this.wheelOpen = false; this.hide('wheel'); },
    // ─────────── Görev günlüğü (Tab)
    toggleJournal() { this.journalOpen = !this.journalOpen; $('journal').classList.toggle('hidden', !this.journalOpen); if (this.journalOpen) this.renderJournal(); },
    renderJournal() {
      const M = K.mission, G = K.game, def = M.def; if (!def) return;
      const st = (o) => o.state === 'done' ? '✔' : o.state === 'failed' ? '✖' : o.state === 'active' ? '◆' : '·';
      const objs = M.objs.map((o) => `<div class="jo ${o.state}${o.side ? ' side' : ''}"><i>${st(o)}</i>${U.esc(o.state === 'inactive' ? (o.side ? o.text : '???') : M.objText(o))}</div>`).join('');
      const sq = G.squad.map((m, i) => `<div class="js"><b>${i + 1}</b> ${U.esc(m.name)} <span>${U.esc(m.unit.name)}</span> <em>${m.alive ? Math.ceil(m.hp) + ' SP · ' + U.esc(m.status) : 'Kayıp'}</em></div>`).join('') || '<div class="js">Ekip yok</div>';
      const s = G.stats;
      $('journal').innerHTML = `<h2>${def.no} · ${U.esc(def.title)} <small>${U.esc(def.place)}</small></h2>
        <div class="jcols"><div><h3>HEDEFLER</h3>${objs}</div><div><h3>EKİP</h3>${sq}<h3>İSTATİSTİK</h3>
        <div class="jstat">Süre ${U.fmtTime(M.time)} · Delil ${M.evidence.length} · Gözaltı ${s.arrests} · Etkisiz ${s.kills + s.takedowns} · Kurtarılan sivil ${s.civSaved} · Alarm ${M.alarm ? 'VAR' : 'yok'}</div></div></div>
        <div class="jhint">Tab: kapat · M: taktik harita · Q: komut tekeri</div>`;
    },
    // ─────────── Diyalog
    dialogue(npc, tree, M, onEnd) {
      this.dialogOpen = true; this.dlg = { npc, tree, M, onEnd, node: tree.start };
      if (npc && npc.talkTo !== undefined) npc.talkTo = K.game.player;
      document.exitPointerLock && document.exitPointerLock();
      this.show('dialog'); this.renderDialog();
    },
    renderDialog() {
      const d = this.dlg, n = d.tree.nodes[d.node];
      if (!n) { this.closeDialog(); return; }
      $('dlgWho').textContent = n.who || (d.npc && d.npc.name) || '';
      const tx = $('dlgText'); tx.textContent = '';
      let i = 0; const full = n.text; clearInterval(this._tw);
      this._tw = setInterval(() => { i += 3; tx.textContent = full.slice(0, i); if (i >= full.length) clearInterval(this._tw); }, 16);
      const ch = $('dlgChoices'); ch.innerHTML = '';
      const choices = (n.choices || [{ t: 'Devam', next: null }]).filter((c) => !c.if || c.if(d.M));
      d.choices = choices;
      choices.forEach((c, k) => { const b = h('button', { class: 'dch' }, h('b', null, String(k + 1)), c.t); b.onclick = () => this.choose(k); ch.appendChild(b); });
    },
    choose(k) {
      const d = this.dlg; if (!d) return;
      const c = d.choices[k]; if (!c) return;
      K.audio.ui();
      if (c.do) c.do(d.M);
      if (c.next && d.tree.nodes[c.next]) { d.node = c.next; this.renderDialog(); }
      else this.closeDialog();
    },
    closeDialog() {
      clearInterval(this._tw);
      const d = this.dlg; this.dlg = null; this.dialogOpen = false; this.hide('dialog');
      if (d && d.npc && d.npc.talkTo !== undefined) d.npc.talkTo = null;
      d && d.onEnd && d.onEnd();
      K.game.relock();
    },
    // ─────────── Tuş takımı
    keypad(door) {
      this.keypadOpen = true; this.kp = { door, val: '' };
      document.exitPointerLock && document.exitPointerLock();
      $('kpTitle').textContent = door.name;
      const g = $('kpKeys'); g.innerHTML = '';
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'SİL', '0', 'OK']) { const b = h('button', null, k); b.onclick = () => this.kpPress(k); g.appendChild(b); }
      this.kpRender(); this.show('keypad');
    },
    kpPress(k) {
      const kp = this.kp; if (!kp) return;
      K.audio.keypad();
      if (k === 'SİL') kp.val = kp.val.slice(0, -1);
      else if (k === 'OK' || k === 'Enter') {
        if (kp.val === kp.door.code) { kp.door.locked = false; kp.door.setOpen(true); K.audio.ui('ok'); this.toast('Şifre doğru — kapı açıldı', 'ok'); K.bus.emit('unlock', kp.door); this.closeKeypad(); return; }
        K.audio.ui('bad'); $('kpDisp').classList.add('err'); setTimeout(() => $('kpDisp').classList.remove('err'), 400); kp.val = '';
        K.bus.emit('wrongCode', kp.door);
      } else if (kp.val.length < 4) kp.val += k;
      this.kpRender();
    },
    kpRender() { $('kpDisp').textContent = (this.kp.val + '____').slice(0, 4).split('').join(' '); },
    closeKeypad() { this.keypadOpen = false; this.kp = null; this.hide('keypad'); K.game.relock(); },
    // ─────────── Asansör
    elevator(cur, n, cb) {
      this.modal = 'elev';
      document.exitPointerLock && document.exitPointerLock();
      const box = $('elevList'); box.innerHTML = '';
      const names = ['Lobi', '1. kat — Muhasebe', '2. kat — Güvenlik', '3. kat — Yönetim'];
      for (let f = n - 1; f >= 0; f--) { const b = h('button', { class: f === cur ? 'cur' : '' }, names[f] || f + '. kat'); b.onclick = () => { this.hide('elevator'); this.modal = null; if (f !== cur) cb(f); K.game.relock(); }; box.appendChild(b); }
      const c = h('button', { class: 'ghost' }, 'Vazgeç'); c.onclick = () => { this.hide('elevator'); this.modal = null; K.game.relock(); }; box.appendChild(c);
      this.show('elevator');
    },
    // ─────────── Klavye (menüler)
    onKey(e) {
      if (this.dialogOpen) { const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) { this.choose(n - 1); e.preventDefault(); } return; }
      if (this.keypadOpen) { if (/^[0-9]$/.test(e.key)) this.kpPress(e.key); else if (e.key === 'Backspace') this.kpPress('SİL'); else if (e.key === 'Enter') this.kpPress('OK'); else if (e.key === 'Escape') this.closeKeypad(); e.preventDefault(); return; }
      if (this.modal === 'elev' && e.key === 'Escape') { this.hide('elevator'); this.modal = null; }
    },
    // ─────────── Sinematik
    letterbox(on, title, sub) {
      $('letterbox').classList.toggle('show', on);
      const t = $('titleCard');
      if (title) { t.innerHTML = `<div class="tc-no">${U.esc(title)}</div><div class="tc-sub">${U.esc(sub || '')}</div>`; t.classList.add('show'); clearTimeout(this._tcT); this._tcT = setTimeout(() => t.classList.remove('show'), 4200); }
    },
    // ─────────── Rapor
    report(rep, aw, def) {
      this.screen('report');
      const r = $('report');
      const ok = rep.success;
      const lines = rep.lines.map((l) => `<tr><td>${U.esc(l.label)}</td><td class="${l.v < 0 ? 'neg' : ''}">${l.v > 0 ? '+' : ''}${l.v}</td></tr>`).join('');
      const objs = rep.objs.map((o) => `<li class="${o.state}">${o.state === 'done' ? '✔' : o.state === 'failed' ? '✖' : '–'} ${o.side ? '<em>Yan:</em> ' : ''}${U.esc(o.text)}</li>`).join('');
      const nx = K.prog.nextRank();
      r.innerHTML = `<div class="rep-card">
        <div class="rep-head ${ok ? 'ok' : 'bad'}"><div><small>BÖLÜM SONU RAPORU · ${def.no}</small><h1>${U.esc(def.title)}</h1><div class="rep-st">${ok ? 'GÖREV BAŞARILI' : 'GÖREV BAŞARISIZ — ' + U.esc(rep.reason)}</div></div><div class="grade g${rep.grade}">${rep.grade}</div></div>
        ${rep.ending ? `<div class="ending"><h3>${U.esc(rep.ending.title)}</h3><p>${U.esc(rep.ending.text)}</p></div>` : ''}
        <div class="rep-cols"><div><h3>HEDEFLER</h3><ul class="robj">${objs}</ul><h3>ÖZET</h3><div class="rsum">Süre ${U.fmtTime(rep.time)} · Delil ${rep.evidence.length} · Gözaltı ${rep.arrests} · Kurtarılan sivil ${rep.civSaved} · Sivil kayıp ${rep.civLost}</div></div>
        <div><h3>PUAN</h3><table class="rtab">${lines}<tr class="tot"><td>TOPLAM</td><td>${rep.score}</td></tr></table>
        <div class="xpbox"><div>+${aw.xp} XP ${aw.first ? '(ilk tamamlama)' : ok ? '(tekrar: yalnızca gelişim puanı)' : ''}</div><div class="xpbar"><i style="width:${nx ? Math.min(100, (K.save.data.xp - K.prog.rankDef().xp) / (nx.xp - K.prog.rankDef().xp) * 100) : 100}%"></i></div><small>${nx ? `Sonraki rütbe: ${nx.name} — ${K.save.data.xp}/${nx.xp} XP${nx.req ? ' · Gerekli görevler: ' + nx.req.map((m) => (K.prog.missionDone(m) ? '✔' : '✖') + m.toUpperCase()).join(' ') : ''}` : 'En yüksek rütbe'}</small>
        ${aw.bonusPts ? '<div class="bonus">İlk S notu: +1 yetenek puanı!</div>' : ''}${aw.newCos.length ? '<div class="bonus">Yeni kozmetik: ' + aw.newCos.map((c) => K.COSMETICS[c].name).join(', ') + '</div>' : ''}</div></div></div>
        <div class="rep-btns"><button id="repRetry" class="ghost">Yeniden oyna</button><button id="repCont">${aw.ranks.length ? 'TERFİ TÖRENİ ›' : 'Operasyon merkezine dön ›'}</button></div></div>`;
      $('repRetry').onclick = () => { K.audio.ui(); K.game.openBriefing(def.id); };
      $('repCont').onclick = () => { K.audio.ui(); if (aw.ranks.length) this.promotion(aw.ranks); else K.game.toHQ(); };
    },
    promotion(ranks) {
      this.screen('promo');
      const r = ranks[ranks.length - 1], rk = K.RANKS[r];
      $('promo').innerHTML = `<div class="promo-card"><small>KOMUTA KARARGÂHI · TERFİ TÖRENİ</small><div class="ins">${this.insignia(r)}</div><h1>${U.esc(rk.name)}</h1>
        <p>Operasyon başarınız ve sahadaki sorumluluğunuz takdirle karşılandı.</p><div class="unl"><b>Yeni yetkiler</b><br>${ranks.map((x) => U.esc(K.RANKS[x].unlock)).join('<br>')}</div>
        <div class="unl">Ekip kapasitesi: ${K.prog.squadMax()} asker · +${ranks.length} yetenek puanı</div><button id="promoOk">EMREDERSİNİZ ›</button></div>`;
      K.audio.ui('rank');
      $('promoOk').onclick = () => { K.audio.ui(); K.game.toHQ(); };
    },
    insignia(r) {
      const rk = K.RANKS[r]; const s = rk.insignia;
      if (s === 'o') return '<span class="ins-bar"></span>';
      if (s.startsWith('G')) return '<span class="ins-g">✦</span>' + '<span class="ins-star">★</span>'.repeat(s.length - 1);
      if (s.startsWith('S')) return '<span class="ins-sun">☀</span>' + '<span class="ins-star">★</span>'.repeat(s.length - 1);
      return '<span class="ins-star">★</span>'.repeat(s.length);
    },
    // ─────────── Operasyon merkezi
    hq(tab = 'missions') {
      this.screen('hq'); this.hqTab = tab;
      const d = K.save.data, rk = K.prog.rankDef(), nx = K.prog.nextRank();
      $('hqRank').innerHTML = `<div class="hq-ins">${this.insignia(d.rank)}</div><div><b>${U.esc(rk.name)}</b><div class="hq-xp"><i style="width:${nx ? Math.min(100, (d.xp - rk.xp) / (nx.xp - rk.xp) * 100) : 100}%"></i></div><small>${d.xp} XP${nx ? ' · sonraki: ' + nx.name + ' (' + nx.xp + ')' : ''} · Yetenek puanı: ${d.skillPts}</small></div>`;
      document.querySelectorAll('#hqTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
      const body = $('hqBody'); body.innerHTML = '';
      if (tab === 'missions') this.hqMissions(body);
      else if (tab === 'personnel') this.hqPersonnel(body);
      else if (tab === 'skills') this.hqSkills(body);
      else if (tab === 'ranks') this.hqRanks(body);
      else if (tab === 'archive') this.hqArchive(body);
    },
    hqMissions(body) {
      const d = K.save.data;
      const sec = (title, list) => {
        body.appendChild(h('h3', { class: 'hq-sec' }, title));
        const grid = h('div', { class: 'mgrid' });
        for (const m of list) {
          const un = K.prog.missionUnlocked(m), rec = d.missions[m.id];
          const req = [];
          if (d.rank < (m.rank || 0)) req.push('Rütbe: ' + K.RANKS[m.rank].name);
          if (m.needs) for (const n of m.needs) if (!K.prog.missionDone(n)) req.push('Önce ' + (K.MISSIONS.find((x) => x.id === n) || {}).no);
          const card = h('div', { class: 'mcard' + (un ? '' : ' locked') + (rec && rec.done ? ' done' : '') },
            h('div', { class: 'mc-no' }, m.no), h('div', { class: 'mc-b' }, h('b', null, m.title), h('div', null, m.place), h('small', null, m.type + ' · ' + ({ day: 'Gündüz', dusk: 'Akşam', night: 'Gece' })[m.time] + (m.weather === 'rain' ? ', yağmurlu' : m.weather === 'fog' ? ', sisli' : ''))),
            rec && rec.done ? h('div', { class: 'mc-g g' + rec.grade }, rec.grade) : null,
            !un ? h('div', { class: 'mc-lock' }, '🔒 ' + req.join(' · ')) : null);
          if (un) card.onclick = () => { K.audio.ui(); K.game.openBriefing(m.id); };
          grid.appendChild(card);
        }
        body.appendChild(grid);
      };
      sec('ANA KAMPANYA', K.MISSIONS.filter((m) => !m.pack));
      sec('GÖREV ÇEŞİTLİLİĞİ PAKETLERİ', K.MISSIONS.filter((m) => m.pack));
      if (d.campaignDone) body.appendChild(h('div', { class: 'hq-note' }, 'Kampanya tamamlandı. Görevleri tekrar oynayarak daha iyi not ve kozmetik ödüller kazanabilirsin.'));
    },
    hqPersonnel(body) {
      body.appendChild(h('h3', { class: 'hq-sec' }, `KADRO · Ekip kapasitesi: ${K.prog.squadMax()} asker`));
      const grid = h('div', { class: 'pgrid' });
      for (const r of K.ROSTER) {
        const u = K.UNITS[r.unit], un = K.prog.unitUnlocked(r.unit);
        grid.appendChild(h('div', { class: 'pcard' + (un ? '' : ' locked') }, h('b', null, r.name), h('div', { class: 'pu' }, u.name), h('small', null, u.desc),
          h('div', { class: 'pstat' }, `SP ${u.hp} · Zırh ${u.armor} · İsabet %${Math.round(u.acc * 100)} · ${K.WEAPONS[u.weapon].name}`), !un ? h('div', { class: 'mc-lock' }, '🔒 ' + K.RANKS[u.rank].name) : null));
      }
      body.appendChild(grid);
    },
    hqSkills(body) {
      const d = K.save.data;
      body.appendChild(h('h3', { class: 'hq-sec' }, `KARAKTER YETENEK AĞACI · Kullanılabilir puan: ${d.skillPts}`));
      const cols = h('div', { class: 'scols' });
      for (const br of ['Fiziksel', 'Saha ve etkileşim', 'Komuta']) {
        const col = h('div', { class: 'scol' }, h('h4', null, br));
        for (const s of K.SKILLS.filter((x) => x.branch === br)) {
          const lv = K.prog.skillVal(s.id);
          const pips = h('div', { class: 'pips' }); for (let i = 0; i < s.max; i++) pips.appendChild(h('i', { class: i < lv ? 'on' : '' }));
          const b = h('button', { class: 'sbtn', disabled: K.prog.canUpgrade(s.id) ? null : 'disabled' }, lv >= s.max ? 'Tam' : '+');
          if (!K.prog.canUpgrade(s.id)) b.setAttribute('disabled', 'disabled'); else b.removeAttribute('disabled');
          b.onclick = () => { if (K.prog.upgrade(s.id)) { K.audio.ui('ok'); this.hq('skills'); } };
          col.appendChild(h('div', { class: 'skill' }, h('div', null, h('b', null, s.name), h('small', null, s.desc + (s.rank && d.rank < s.rank ? ` (${K.RANKS[s.rank].name} gerekli)` : ''))), pips, b));
        }
        cols.appendChild(col);
      }
      body.appendChild(cols);
      body.appendChild(h('div', { class: 'hq-note' }, 'Denge kuralı: güçlü destekler (tank/helikopter) ilk görevlerin çözümünü bozmaz; hasar azaltma %21 ile sınırlıdır.'));
    },
    hqRanks(body) {
      const d = K.save.data;
      body.appendChild(h('h3', { class: 'hq-sec' }, 'RÜTBE VE YETKİ AÇILMASI — terfi yalnızca XP ile değil, hikâye başarısı ile gerçekleşir'));
      const t = h('div', { class: 'rlist' });
      K.RANKS.forEach((r, i) => {
        t.appendChild(h('div', { class: 'rrow' + (i === d.rank ? ' cur' : i < d.rank ? ' past' : '') }, h('div', { class: 'rins' }, h('span', { html: this.insignia(i) })), h('div', null, h('b', null, r.name), h('div', null, r.unlock)),
          h('div', { class: 'rreq' }, `${r.xp} XP` + (r.req ? ' · ' + r.req.map((m) => (K.prog.missionDone(m) ? '✔ ' : '✖ ') + (K.MISSIONS.find((x) => x.id === m) || {}).title).join(', ') : ''), h('br'), `Ekip: ${r.squad} asker`)));
      });
      body.appendChild(t);
    },
    hqArchive(body) {
      const d = K.save.data;
      body.appendChild(h('h3', { class: 'hq-sec' }, `DELİL ARŞİVİ (${d.evidence.length})`));
      body.appendChild(h('div', { class: 'ev' }, d.evidence.length ? d.evidence.map((e) => h('span', null, EVIDENCE_NAMES[e] || e)) : h('em', null, 'Henüz delil yok')));
      body.appendChild(h('h3', { class: 'hq-sec' }, 'KURTARILANLAR & KARARLAR'));
      const dec = Object.entries(d.decisions).map(([k, v]) => `${k}: ${v}`).join(' · ');
      body.appendChild(h('div', { class: 'hq-note' }, (d.rescued.length ? 'Kurtarılan: ' + d.rescued.map((r) => ({ leyla: 'Ajan Leyla', kerem: 'Yzb. Kerem' })[r] || r).join(', ') : 'Kurtarılan kişi yok') + (dec ? ' · Kararlar: ' + dec : '')));
      body.appendChild(h('h3', { class: 'hq-sec' }, 'İSTATİSTİKLER'));
      const s = d.stats;
      body.appendChild(h('div', { class: 'hq-note' }, `Tamamlanan görev ${s.missionsDone} · Etkisiz ${s.kills} · Gözaltı ${s.arrests} · Sessiz etkisizleştirme ${s.takedowns} · Kurtarılan sivil ${s.civSaved} · Sivil kayıp ${s.civLost} · Oyun süresi ${U.fmtTime(s.playTime)}`));
      body.appendChild(h('h3', { class: 'hq-sec' }, 'KOZMETİK (üniforma kamuflajı)'));
      const cg = h('div', { class: 'cos' });
      for (const k in K.COSMETICS) {
        const c = K.COSMETICS[k], has = d.cosmetics.includes(k);
        const b = h('button', { class: (d.cosmetic === k ? 'on ' : '') + (has ? '' : 'locked') }, h('i', { style: { background: '#' + c.tint.toString(16).padStart(6, '0') } }), c.name, !has ? h('small', null, c.how) : null);
        if (has) b.onclick = () => { d.cosmetic = k; K.save.write(); this.hq('archive'); };
        cg.appendChild(b);
      }
      body.appendChild(cg);
      body.appendChild(h('div', { class: 'hq-note small' }, 'Kurgu notu: şehir, teşkilat, Siyah Akrep örgütü, birlik ve kişi adları kurgusaldır. Bu oyun, "KOMUTA: Gizli Operasyon" tasarım belgesinin tarayıcıda çalışan dikey dilim uyarlamasıdır; modeller prosedürel olarak üretilmiştir.'));
    },
    // ─────────── Brifing + hazırlık
    briefing(def) {
      this.screen('brief');
      const d = K.save.data, lo = d.loadout;
      const tw = ({ day: 'Gündüz', dusk: 'Akşam', night: 'Gece' })[def.time] + (def.weather === 'rain' ? ' · yağmur' : def.weather === 'fog' ? ' · sis' : ' · açık');
      const objs = def.objectives.map((o) => `<li>${U.esc(o.text)}</li>`).join('');
      const side = (def.side || []).map((o) => `<li>${U.esc(o.text)}</li>`).join('');
      const risks = (def.risks || []).map((r) => `<li>${U.esc(r)}</li>`).join('');
      const maxSq = Math.min(def.squadMax || 0, K.prog.squadMax());
      const forced = def.forceOutfit;
      const outfit = forced || (K.prog.outfitUnlocked(lo.outfit) ? lo.outfit : 'tactical');
      const sel = { outfit, primary: K.prog.weaponUnlocked(lo.primary) ? lo.primary : 'rifle', secondary: 'pistol_s', gadget: K.prog.gadgetUnlocked(lo.gadget) ? lo.gadget : 'medkit', squad: (lo.squad || []).filter((id) => K.ROSTER.find((r) => r.id === id && K.prog.unitUnlocked(r.unit))).slice(0, maxSq) };
      if (sel.squad.length < maxSq) for (const r of K.prog.rosterAvailable()) { if (sel.squad.length >= maxSq) break; if (!sel.squad.includes(r.id)) sel.squad.push(r.id); }
      this.briefSel = sel;
      const b = $('brief');
      b.innerHTML = `<div class="br-wrap"><div class="br-file">
          <small class="kicker">KOMUTA / GİZLİ OPERASYON · GÖREV DOSYASI · ${def.no}</small><h1>${U.esc(def.title)}</h1>
          <div class="br-meta">${U.esc(def.place)} · ${U.esc(def.type)} · ${tw}${def.timeLimit ? ' · Süre: ' + U.fmtTime(def.timeLimit) : ''}</div>
          <p class="br-text">${U.esc(def.brief)}</p>
          <div class="br-cols"><div><h3>ANA HEDEFLER</h3><ol>${objs}</ol><h3>YAN HEDEFLER</h3><ul>${side}</ul></div><div><h3>RİSKLER</h3><ul class="risk">${risks}</ul><h3>ÖNERİLEN EKİP</h3><p>${U.esc(def.recommend || '')}</p><h3>AÇILAN ÖZELLİK</h3><p>${U.esc(def.unlockText || '')}</p></div></div>
        </div><div class="br-load"><h2>HAZIRLIK</h2><div id="loadForm"></div>
        <div class="br-btns"><button class="ghost" id="brBack">‹ Merkez</button><button id="brStart">OPERASYONU BAŞLAT ›</button></div></div></div>`;
      const form = $('loadForm');
      const group = (title, items, key, disabledAll) => {
        const g = h('div', { class: 'lg' }, h('h4', null, title));
        const row = h('div', { class: 'lrow' });
        for (const it of items) {
          const un = it.un && !disabledAll;
          const btn = h('button', { class: 'lopt' + (sel[key] === it.id ? ' on' : '') + (un ? '' : ' locked'), title: it.desc || '' }, h('b', null, it.name), h('small', null, un ? (it.sub || '') : (it.lock || 'Kilitli')));
          if (un) btn.onclick = () => { sel[key] = it.id; K.audio.ui(); row.querySelectorAll('.lopt').forEach((x) => x.classList.remove('on')); btn.classList.add('on'); };
          row.appendChild(btn);
        }
        g.appendChild(row); form.appendChild(g);
      };
      group('Üniforma' + (forced ? ' (görev gereği sabit)' : ''), Object.values(K.OUTFITS).map((o) => ({ id: o.id, name: o.name, sub: `Zırh ${o.armor}`, desc: o.desc, un: (forced ? o.id === forced : K.prog.outfitUnlocked(o.id)), lock: forced ? 'Görev gereği' : K.RANKS[o.rank || 0].name })), 'outfit');
      group('Ana silah', Object.values(K.WEAPONS).filter((w) => w.slot === 'primary').map((w) => ({ id: w.id, name: w.name, sub: w.sub, un: K.prog.weaponUnlocked(w.id), lock: K.RANKS[w.rank || 0].name })), 'primary', forced === 'civil' || def.noWeapons);
      group('Ekipman', Object.values(K.GADGETS).map((g) => ({ id: g.id, name: g.name, sub: g.desc.slice(0, 38) + '…', desc: g.desc, un: K.prog.gadgetUnlocked(g.id), lock: K.RANKS[g.rank || 0].name })), 'gadget');
      // ekip
      const sg = h('div', { class: 'lg' }, h('h4', null, `Ekip (${maxSq ? 'en fazla ' + maxSq : 'bu görev tek kişilik'})`));
      const srow = h('div', { class: 'lrow sqsel' });
      const refresh = () => srow.querySelectorAll('.lopt').forEach((x) => x.classList.toggle('on', sel.squad.includes(x.dataset.id)));
      if (maxSq) for (const r of K.ROSTER) {
        const u = K.UNITS[r.unit], un = K.prog.unitUnlocked(r.unit);
        const btn = h('button', { class: 'lopt' + (un ? '' : ' locked'), 'data-id': r.id }, h('b', null, r.name), h('small', null, un ? u.name : '🔒 ' + K.RANKS[u.rank].name));
        if (un) btn.onclick = () => { const i = sel.squad.indexOf(r.id); if (i >= 0) sel.squad.splice(i, 1); else if (sel.squad.length < maxSq) sel.squad.push(r.id); else { K.ui.toast(`En fazla ${maxSq} asker`, 'bad'); return; } K.audio.ui(); refresh(); };
        srow.appendChild(btn);
      }
      sg.appendChild(srow); form.appendChild(sg); refresh();
      $('brBack').onclick = () => { K.audio.ui(); K.game.toHQ(); };
      $('brStart').onclick = () => { K.audio.ui('ok'); d.loadout = Object.assign(d.loadout, { outfit: forced ? d.loadout.outfit : sel.outfit, primary: sel.primary, gadget: sel.gadget, squad: sel.squad.slice() }); K.save.write(); K.game.startMission(def.id, Object.assign({}, sel, { outfit: forced || sel.outfit })); };
    },
    // ─────────── Ayarlar
    settings(back) {
      this.screen('settingsScr'); this.settingsBack = back;
      const s = K.save.data.settings, box = $('settingsBody'); box.innerHTML = '';
      const row = (label, el) => box.appendChild(h('div', { class: 'srow' }, h('label', null, label), el));
      const sel = (key, opts, after) => { const e = h('select'); for (const [v, t] of opts) { const o = h('option', { value: v }, t); if (String(s[key]) === String(v)) o.selected = true; e.appendChild(o); } e.onchange = () => { s[key] = e.value === 'true' ? true : e.value === 'false' ? false : e.value; K.save.write(); after && after(); }; return e; };
      const rng = (key, min, max, step, after) => { const e = h('input', { type: 'range', min, max, step, value: s[key] }); const out = h('span', { class: 'rv' }, String(s[key])); e.oninput = () => { s[key] = parseFloat(e.value); out.textContent = e.value; K.save.write(); after && after(); }; return h('div', { class: 'rngw' }, e, out); };
      row('Grafik kalitesi', sel('quality', [['auto', 'Otomatik'], ['low', 'Düşük (mobil)'], ['med', 'Orta'], ['high', 'Yüksek']], () => K.game.applyQuality()));
      row('Fare / dokunmatik hassasiyeti', rng('sens', 0.3, 3, 0.1));
      row('Dikey ekseni ters çevir', sel('invertY', [['false', 'Hayır'], ['true', 'Evet']]));
      row('Görüş alanı (FOV)', rng('fov', 55, 95, 1));
      row('Ana ses', rng('vol', 0, 1, 0.05, () => K.audio.applyVolumes()));
      row('Efekt sesi', rng('sfxVol', 0, 1, 0.05, () => K.audio.applyVolumes()));
      row('Müzik', rng('musVol', 0, 1, 0.05, () => K.audio.applyVolumes()));
      row('Telsiz konuşmaları (sesli)', sel('voice', [['false', 'Kapalı'], ['true', 'Açık (tarayıcı sesi)']]));
      row('Dokunmatik kontroller', sel('touch', [['auto', 'Otomatik'], ['on', 'Açık'], ['off', 'Kapalı']], () => this.updateTouchVisibility()));
      row('Şehir trafiği', sel('traffic', [['true', 'Açık'], ['false', 'Kapalı']]));
      row('FPS göster', sel('showFps', [['false', 'Hayır'], ['true', 'Evet']], () => { $('fps').classList.toggle('hidden', !s.showFps); }));
      $('settingsBack').onclick = () => { K.audio.ui(); if (this.settingsBack === 'pause') this.screen('pause'); else if (this.settingsBack === 'hq') K.game.toHQ(); else this.screen('menu'); };
    },
    help(back) {
      this.screen('helpScr'); this.helpBack = back;
      $('helpBack').onclick = () => { K.audio.ui(); if (this.helpBack === 'pause') this.screen('pause'); else this.screen('menu'); };
    },
    bindMenus() {
      $('btnContinue').onclick = () => { K.audio.init(); K.audio.ui('ok'); K.game.toHQ(); };
      $('btnNew').onclick = () => { K.audio.init(); if (K.save.hasProgress() && !confirm('Mevcut kampanya ilerlemesi silinsin mi?')) return; K.save.reset(); K.audio.ui('ok'); K.game.openBriefing('m01'); };
      $('btnSettings').onclick = () => { K.audio.init(); this.settings('menu'); };
      $('btnHelp').onclick = () => { K.audio.init(); this.help('menu'); };
      $('btnFull').onclick = () => { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d); };
      document.querySelectorAll('#hqTabs button').forEach((b) => (b.onclick = () => { K.audio.ui(); if (b.dataset.tab === 'settings') this.settings('hq'); else if (b.dataset.tab === 'menu') { K.game.toMenu(); } else this.hq(b.dataset.tab); }));
      $('pResume').onclick = () => K.game.resume();
      $('pRestart').onclick = () => { K.game.resume(); K.game.restartMission(); };
      $('pSettings').onclick = () => this.settings('pause');
      $('pHelp').onclick = () => this.help('pause');
      $('pQuit').onclick = () => { if (confirm('Görevi terk edip merkeze dönülsün mü? (ilerleme kaydedilmez)')) K.game.abortMission(); };
      $('mapClose').onclick = () => { this.closeMap(); K.game.relock(); };
    },
    updateMenu() {
      const has = K.save.hasProgress();
      $('btnContinue').classList.toggle('hidden', !has);
      $('btnNew').textContent = has ? 'Yeni kampanya' : 'KAMPANYAYA BAŞLA';
      $('btnNew').classList.toggle('primary', !has);
      const d = K.save.data;
      $('menuRank').textContent = has ? `${K.prog.rankDef().name} · ${d.xp} XP · ${Object.values(d.missions).filter((m) => m.done).length} görev tamamlandı` : '';
    },
    // ─────────── Dokunmatik kontroller
    get touchActive() { const t = K.save.data.settings.touch; return t === 'on' || (t === 'auto' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia('(pointer: coarse)').matches); },
    updateTouchVisibility() { const on = this.touchActive && K.game.state === 'playing' && !$('hud').classList.contains('hidden'); $('touch').classList.toggle('hidden', !on); K.input.touch.enabled = this.touchActive; document.body.classList.toggle('touchmode', this.touchActive); },
    buildTouch() {
      const T = $('touch'), I = K.input;
      const joy = $('tjoy'), knob = $('tknob');
      let jid = null, jc = null;
      const R = () => joy.clientWidth / 2;
      joy.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; jid = t.identifier; const r = joy.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; move(t); e.preventDefault(); }, { passive: false });
      const move = (t) => { let dx = t.clientX - jc.x, dy = t.clientY - jc.y; const l = Math.hypot(dx, dy), r = R(); if (l > r) { dx *= r / l; dy *= r / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; I.touch.mx = dx / r; I.touch.my = -dy / r; if (Math.hypot(dx, dy) / r > 0.92) I.vpress('T_sprint'); else if (I.keys.has('T_sprint')) I.vrelease('T_sprint'); };
      window.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === jid) move(t); if (t.identifier === lid) { I.touch.lookDX += t.clientX - lp.x; I.touch.lookDY += t.clientY - lp.y; lp = { x: t.clientX, y: t.clientY }; if (UI.wheelOpen) { I.mdx += (t.clientX - lp0.x) * 0; } } } }, { passive: false });
      const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === jid) { jid = null; knob.style.transform = ''; I.touch.mx = 0; I.touch.my = 0; I.vrelease('T_sprint'); } if (t.identifier === lid) lid = null; } };
      window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
      const look = $('tlook'); let lid = null, lp = null, lp0 = null;
      look.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lid = t.identifier; lp = { x: t.clientX, y: t.clientY }; lp0 = lp; K.audio.init(); e.preventDefault(); }, { passive: false });
      T.querySelectorAll('[data-k]').forEach((b) => {
        const k = b.dataset.k, toggle = b.dataset.toggle;
        b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); K.audio.init(); if (toggle) { if (I.keys.has(k)) I.vrelease(k); else I.vpress(k); b.classList.toggle('on', I.keys.has(k)); } else { I.vpress(k); b.classList.add('on'); } if (k === 'T_fire' || k === 'T_aim') { lid = e.changedTouches[0].identifier; lp = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }; } }, { passive: false });
        b.addEventListener('touchend', (e) => { e.preventDefault(); if (!toggle) { I.vrelease(k); b.classList.remove('on'); } if (lid === e.changedTouches[0].identifier) lid = null; }, { passive: false });
      });
    },
  };
})();
