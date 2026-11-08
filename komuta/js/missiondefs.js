/* KOMUTA — görev içerikleri: 10 ana görev + 4 ek paket (kurgusal şehir, kurgusal örgüt: Siyah Akrep) */
'use strict';
(function () {
  const U = K.U;
  const C = (x, z, r, layer) => ({ x, z, r, layer });
  const R = (x0, z0, x1, z1, layer) => ({ x0, z0, x1, z1, layer });
  const W = () => K.world, G = () => K.game, MM = () => K.mission;
  const L = (id) => K.models.LOOKS[id];
  const snap = (x, z, layer = 0) => { const p = K.nav.nearestFree(layer, x, z, 8); return p || { x, z }; };
  const npts = (list, layer = 0) => list.map(([x, z, w]) => { const p = snap(x, z, layer); return { x: p.x, z: p.z, wait: w }; });
  const wave = (M, pts, o = {}) => pts.map(([x, z], i) => {
    const p = snap(x, z);
    const e = M.enemy(Object.assign({ x: p.x, z: p.z, lookId: i % 3 === 2 ? 'enemyHeavy' : 'enemy', accuracy: 0.5, tags: ['wave'] }, o));
    e.alert(o.target || G().player, false);
    if (o.goal) { e.lastKnown = { x: o.goal.x, z: o.goal.z }; e.target = null; e.seen = null; }
    return e;
  });
  const nearestItem = (M, tag) => { const P = G().player; let best = null, bd = 1e9; for (const it of M.items) { if (it.taken || it.o.tag !== tag) continue; const d = Math.hypot(it.o.x - P.pos.x, it.o.z - P.pos.z); if (d < bd) { bd = d; best = it; } } return best ? { x: best.o.x, z: best.o.z, y: best.mesh ? best.mesh.position.y + 0.6 : null } : null; };
  const civGroup = (M, n, cx, cz, r, o = {}) => { const out = []; for (let i = 0; i < n; i++) { const p = K.nav.randomFreeNear(0, cx, cz, r) || { x: cx, z: cz }; out.push(M.civ(Object.assign({ x: p.x, z: p.z, yaw: Math.random() * 6, state: 'cower', pose: 'cower', escortable: true, tags: ['evac'], name: 'Sivil' }, o))); } return out; };

  const LIST = K.MISSIONS = [];

  // ════════════════════════════════════════════════ ÇATIŞMA GÖREVLERİ (doğrudan aksiyon)
  // Silahlı başlar, konuşma/bulmaca yok: bölgeyi temizle, savun, kurtar, tahliye noktasına git.
  const foe = (M, x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.42, range: 32, yaw: Math.random() * 6.28 }, o)); };
  const ring = (cx, cz, r, n) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 6.283) * r * (0.6 + 0.4 * ((i * 7) % 3) / 2), cz + Math.sin(i / n * 6.283) * r * (0.6 + 0.4 * ((i * 5) % 3) / 2)]);
  const combatBase = { pack: true, combat: true, rank: 0, stealth: false, squadMax: 4, outfit: 'tactical', recommend: 'Taarruz tüfeği veya hafif makineli; 2–4 kişilik ekip.' };

  LIST.push(Object.assign({}, combatBase, {
    id: 'c1', no: 'Ç-1', title: 'ESKİ ŞEHİR ÇATIŞMASI', place: 'Eski şehir — çarşı ve avlu', type: 'Bölge temizleme', time: 'day', weather: 'clear', par: 420,
    brief: 'Siyah Akrep militanları eski şehir çarşısını ele geçirdi. Çarşı meydanını temizle, ardından avludaki ikinci grubu etkisiz hâle getir ve tahliye noktasına dön.',
    risks: ['Dar sokaklarda yakın mesafe çatışması.', 'Çatı ve köşe arkalarında saklanan militanlar.'],
    unlockText: 'Hızlı aksiyon görevi',
    insertion: { type: 'walk', x: -76, z: -88, yaw: -Math.PI / 2 },
    objectives: [
      { id: 'o1', text: 'Çarşı meydanını temizle', type: 'eliminate', group: 'market', at: { x: -150, z: -100 } },
      { id: 'o2', text: 'Avludaki militanları etkisiz hâle getir', type: 'eliminate', group: 'yard', after: 'o1', at: { x: -130, z: -150 } },
      { id: 'o3', text: 'Tahliye noktasına dön', type: 'reach', who: 'player', zone: C(-76, -88, 7), after: 'o2' },
    ],
    side: [
      { id: 's1', text: 'Sivil kayıp olmasın', type: 'noCivLoss' },
      { id: 's2', text: '6 dakikanın altında tamamla', type: 'time', t: 360 },
      { id: 's3', text: 'Ekip hayatta kalsın', type: 'teamAlive' },
    ],
    setup(M) {
      for (const [x, z] of ring(-150, -100, 13, 6)) foe(M, x, z, { tags: ['market'] });
      foe(M, -118, -96, { patrol: npts([[-118, -96, 2], [-140, -86, 2]]), tags: ['market'] });
      for (const [x, z] of ring(-130, -150, 10, 5)) foe(M, x, z, { tags: ['yard'] });
      foe(M, -132, -152, { lookId: 'enemyHeavy', hp: 180, tags: ['yard'], accuracy: 0.5 });
      civGroup(M, 3, -100, -98, 6, { escortable: false, tags: ['bystander'] });
      M.hint('c1', 'Çatışma görevi: hedef işaretlerini takip et, siper alarak ilerle. Ekibine G/T/B ile takip-git-bekle emri verebilirsin.');
    },
  }));

  LIST.push(Object.assign({}, combatBase, {
    id: 'c2', no: 'Ç-2', title: 'LİMAN BASKINI', place: 'Liman — giriş kapısı ve konteyner sahası', type: 'Baskın ve savunma', time: 'dusk', weather: 'clear', par: 540,
    brief: 'Limandaki silah sevkiyatını durdur. Giriş kapısındaki nöbetçileri etkisiz hâle getir, konteyner sahasını temizle ve kurtarma ekibi gelene kadar sahayı savun.',
    risks: ['Konteyner aralarında pusu.', 'Savunma sırasında iki yönden takviye gelir.'],
    unlockText: 'Hızlı aksiyon görevi',
    insertion: { type: 'walk', x: 200, z: 100, yaw: 0 },
    objectives: [
      { id: 'o1', text: 'Liman kapısını al', type: 'eliminate', group: 'gate', at: { x: 200, z: 128 } },
      { id: 'o2', text: 'Konteyner sahasını temizle', type: 'eliminate', group: 'yard', after: 'o1', at: { x: 134, z: 177 } },
      { id: 'o3', text: 'Sahayı savun (kurtarma ekibi geliyor)', type: 'defend', zone: C(134, 177, 16), duration: 60, after: 'o2', failText: 'Saha düştü' },
      { id: 'o4', text: 'Tahliye noktasına git', type: 'reach', who: 'player', zone: C(200, 100, 8), after: 'o3' },
    ],
    side: [
      { id: 's1', text: '9 dakikanın altında tamamla', type: 'time', t: 540 },
      { id: 's2', text: 'Ekip hayatta kalsın', type: 'teamAlive' },
      { id: 's3', text: 'Ekip sağlığı %50 üzerinde', type: 'teamHealth', frac: 0.5 },
    ],
    setup(M) {
      for (const [x, z] of [[194, 126], [206, 126], [200, 134], [190, 136]]) foe(M, x, z, { tags: ['gate'] });
      foe(M, 212, 140, { patrol: npts([[212, 140, 2], [186, 140, 2]]), tags: ['gate'] });
      for (const [x, z] of ring(134, 177, 15, 7)) foe(M, x, z, { tags: ['yard'] });
      foe(M, 140, 172, { lookId: 'enemyHeavy', hp: 200, weapon: 'lmg', tags: ['yard'] });
      M.wave = 0; M.waveT = 4;
    },
    update(M, dt) {
      const o = M.obj('o3');
      if (o.state === 'active' && M.wave < 3) {
        M.waveT -= dt || 1 / 30;
        if (M.waveT <= 0) {
          M.wave++; M.waveT = 18;
          M.radio('Komuta', M.wave === 1 ? 'Takviye geliyor — batıdan!' : M.wave === 2 ? 'İkinci dalga kuzeyden!' : 'Son dalga! Dayanın!');
          const pts = M.wave === 2 ? [[150, 222], [158, 226], [142, 228]] : [[96, 182], [100, 192], [92, 172]];
          for (const [x, z] of pts) { const e = foe(M, x, z, { accuracy: 0.4 }); e.alert(K.game.player, false); }
        }
      }
    },
  }));

  LIST.push(Object.assign({}, combatBase, {
    id: 'c3', no: 'Ç-3', title: 'SANAYİ ÇATIŞMASI', place: 'Sanayi bölgesi — depo', type: 'Baskın, hedef etkisizleştirme', time: 'day', weather: 'clear', par: 480,
    brief: 'Siyah Akrep\'in bölge komutanı sanayi deposunda saklanıyor. Kapıdaki nöbetçileri geç, depoyu temizle ve komutanı etkisiz hâle getir.',
    risks: ['Ağır zırhlı korumalar.', 'Depo içinde dar koridorlar.'],
    unlockText: 'Hızlı aksiyon görevi',
    insertion: { type: 'walk', x: 134, z: 114, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'Depo kapısındaki nöbetçileri etkisiz hâle getir', type: 'eliminate', group: 'gate', at: { x: 134, z: 100 } },
      { id: 'o2', text: 'Depoyu temizle', type: 'eliminate', group: 'inside', after: 'o1', at: { x: 135, z: 55 } },
      { id: 'o3', text: 'Bölge komutanını etkisiz hâle getir', type: 'eliminate', group: 'boss', after: 'o1', at: { x: 153, z: 36 } },
      { id: 'o4', text: 'Tahliye noktasına git', type: 'reach', who: 'player', zone: C(134, 114, 8), after: ['o2', 'o3'] },
    ],
    side: [
      { id: 's1', text: '8 dakikanın altında tamamla', type: 'time', t: 480 },
      { id: 's2', text: 'Ekip hayatta kalsın', type: 'teamAlive' },
      { id: 's3', text: 'Ekip sağlığı %50 üzerinde', type: 'teamHealth', frac: 0.5 },
    ],
    setup(M) {
      for (const [x, z] of [[128, 98], [140, 98], [134, 92]]) foe(M, x, z, { tags: ['gate'] });
      for (const [x, z] of ring(135, 58, 12, 7)) foe(M, x, z, { tags: ['inside'] });
      foe(M, 120, 50, { patrol: npts([[120, 50, 2], [150, 50, 2]]), tags: ['inside'] });
      foe(M, 153, 36, { lookId: 'enemyHeavy', hp: 320, weapon: 'ak74', accuracy: 0.55, name: 'Bölge Komutanı', tags: ['boss'] });
      foe(M, 149, 39, { lookId: 'enemyHeavy', hp: 180, tags: ['boss'] });
    },
  }));

  LIST.push(Object.assign({}, combatBase, {
    id: 'c4', no: 'Ç-4', title: 'REHİNE KURTARMA', place: 'Batı mahalleleri — gecekondu', type: 'Temizleme ve kurtarma', time: 'dusk', weather: 'clear', par: 600, civMax: 3,
    brief: 'Militanlar batı mahallelerinde üç sivili rehin tuttu. Sokakları temizle, rehinelerin olduğu meydana ulaş, korumaları etkisiz hâle getir ve rehineleri güvenli bölgeye götür.',
    risks: ['Rehineler çapraz ateşte kalabilir.', 'Dar sokaklarda keskin nişancı olabilir.'],
    unlockText: 'Hızlı aksiyon görevi',
    insertion: { type: 'walk', x: -80, z: 58, yaw: -Math.PI / 2 },
    safeZone: C(-80, 52, 7),
    objectives: [
      { id: 'o1', text: 'Sokakları temizle', type: 'eliminate', group: 'street', at: { x: -150, z: 50 } },
      { id: 'o2', text: 'Rehine korumalarını etkisiz hâle getir', type: 'eliminate', group: 'guards', after: 'o1', at: { x: -200, z: 40 } },
      { id: 'o3', text: 'Rehineleri güvenli bölgeye götür (E ile yanına çağır)', type: 'escort', group: 'hostage', zone: C(-80, 52, 7), count: 3, after: 'o2' },
    ],
    side: [
      { id: 's1', text: 'Rehinelerin hepsi hayatta', type: 'noCivLoss' },
      { id: 's2', text: '10 dakikanın altında tamamla', type: 'time', t: 600 },
      { id: 's3', text: 'Ekip hayatta kalsın', type: 'teamAlive' },
    ],
    setup(M) {
      for (const [x, z] of [[-112, 52], [-126, 62], [-140, 44], [-156, 56], [-168, 46], [-150, 30]]) foe(M, x, z, { tags: ['street'] });
      for (const [x, z] of ring(-200, 40, 8, 4)) foe(M, x, z, { tags: ['guards'], accuracy: 0.46 });
      civGroup(M, 3, -202, 42, 3, { tags: ['hostage'], name: 'Rehine' });
    },
  }));

  // ════════════════════════════════════════════════ 01 · İLK EMİR
  LIST.push({
    id: 'm01', no: '01', title: 'İLK EMİR', place: 'Vertex Plaza — ofis binası', type: 'Gizli araştırma', rank: 0,
    time: 'day', weather: 'clear', stealth: true, squadMax: 0, par: 480, evidenceMax: 4,
    brief: 'Komuta, Vertex Plaza\'daki bir şirketin kurgusal suç örgütü SİYAH AKREP\'e kara para aktardığından şüpheleniyor. Sivil kıyafetle binaya gir, konuşmalardan ipucu topla ve arşivdeki "PROJE KARANLIK" dosyasını dikkat çekmeden ele geçir.',
    risks: ['Alarm verilirse güvenlik ve mafya korumaları müdahale eder.', 'Silah çekmek çalışanlar ve güvenlik tarafından fark edilir.', 'Yetkisiz alanlarda (arşiv, müdür odası) şüphe çok hızlı yükselir.'],
    recommend: 'Sivil görünüm gizlilik için kolaylık sağlar; operasyon üniformasıyla da girilebilir.',
    unlockText: 'Komuta menüsü, ilk görev puanı, Teğmen rütbesine yol',
    insertion: { type: 'walk', x: 0, z: -14, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'Resepsiyonla konuş ve giriş izni al', type: 'flag', flag: 'access', at: { x: 0, z: -46.5 } },
      { id: 'o2', text: 'İpuçlarını topla', type: 'collect', tag: 'clue', count: 3, after: 'o1', where: (M) => M.nextClue() },
      { id: 'o3', text: 'Arşivdeki kayıp dosyayı bul', type: 'flag', flag: 'fileFound', after: 'o2', at: { x: 22, z: -66 } },
      { id: 'o4', text: 'Dikkat çekmeden binadan çık', type: 'reach', who: 'player', zone: C(0, -29, 6), alt: C(21, -95, 5), after: 'o3' },
    ],
    side: [
      { id: 's1', text: 'Alarm verilmeden tamamla', type: 'noAlarm' },
      { id: 's2', text: 'Silahını hiç çekme', type: 'noWeapon' },
      { id: 's3', text: 'Dosyayı iz bırakmadan kopyala', type: 'flag', flag: 'copied' },
    ],
    restricted(M, a) {
      const z = W().zones;
      if (K.inZone(z.officeRestricted, a.pos)) return true;
      if (K.inZone({ x0: 0, z0: -74, x1: 14, z1: -58 }, a.pos)) return true;
      if (!M.flags.access && K.inZone(z.officeSecure, a.pos)) return true;
      return false;
    },
    setup(M) {
      const w = W(), D = w.officeDoors;
      const code = M.code4(); D.archive.code = code; M.flags.code = code;
      const shelf = Math.floor(Math.random() * 3); M.flags.shelf = shelf;
      const rec = M.civ({ x: 0, z: -48.3, yaw: 0, name: 'Resepsiyonist Ayşe', look: Object.assign(K.models.civLook(Math.random, 'f'), { uniform: 0x2a3550, jacket: true }), state: 'idle' });
      const emp = M.civ({ x: -25.5, z: -46.5, yaw: Math.PI / 2, name: 'Çalışan Bora', state: 'idle', pose: 'talk' });
      const sec = M.civ({ x: 21, z: -46.85, yaw: 0, name: 'Sekreter Selin', state: 'idle', pose: 'sit', look: Object.assign(K.models.civLook(Math.random, 'f'), { uniform: 0x6a2a3a }) });
      M.sec = sec; M.secPlan = { phase: 'desk', t: 30 };
      for (const i of [0, 2, 5, 7, 9, 10, 13, 15]) { const d = w.officeDesks[i]; M.civ({ x: d.x, z: d.z + 0.82, yaw: Math.PI, state: 'idle', pose: 'sit', name: 'Çalışan' }); }
      M.enemy({ x: 3.4, z: -51.3, yaw: 0, lookId: 'guard', faction: 'security', weapon: null, range: 15, name: 'Güvenlik Necati' });
      M.enemy({ x: -24, z: -55.5, lookId: 'guard', faction: 'security', weapon: null, range: 13, name: 'Güvenlik Kemal', patrol: M.pts([[-24, -55.5, 3], [24, -55.5, 3]]) });
      M.enemy({ x: -15, z: -62, lookId: 'guard', faction: 'security', weapon: null, range: 12, name: 'Güvenlik Fikret', patrol: M.pts([[-15, -61.5, 2], [-3, -66, 2], [-3, -84, 3], [-27, -83.5, 2], [-27, -62, 2]]) });
      const dA = w.officeDesks[6];
      M.item({ id: 'm01_note', tag: 'clue', name: 'Yapışkan not', desc: `"Arşiv: ${code[0]}${code[1]}··" — son iki hane başka birinde.`, x: dA.x + 0.45, y: 0.8, z: dA.z + 0.05 });
      M.item({ id: 'm01_agenda', tag: 'clue', name: 'Müdürün ajandası', desc: `"PROJE KARANLIK → Arşiv, ${shelf + 1}. raf"`, x: 7.4, y: 0.8, z: -67.9, onPick: (M) => M.setFlag('shelfKnown') });
      M.secNear = () => sec.alive && Math.hypot(sec.pos.x - 21, sec.pos.z + 46.85) < 4.5;
      M.interact({ id: 'm01_drawer', x: 21.4, y: 0.9, z: -45.6, r: 1.7, hold: 1.5, enabled: () => !G().hasItem('key_manager'),
        label: () => (M.secNear() ? 'Sekreterin çekmecesi (sekreter masada — ÇOK RİSKLİ)' : 'Sekreterin çekmecesini karıştır'),
        use: () => { if (M.secNear()) { M.radio('Sekreter Selin', 'Ne yapıyorsunuz?! Güvenlik!'); M.raiseAlarm('Sekreter seni çekmecede yakaladı'); return; } G().giveItem('key_manager'); K.ui.toast('Müdür odası anahtarı alındı', 'evidence'); M.decisions.m01_key = 'drawer'; } });
      for (let r = 0; r < 3; r++) {
        M.interact({ id: 'm01_shelf' + r, x: 22, y: 1.1, z: -70.2 + r * 3.2, r: 2.4, hold: 2.0, enabled: () => !M.flags.fileFound && !M.flags.needCopy && !D.archive.locked,
          label: () => (M.flags.shelfKnown && r === shelf ? '★ ' : '') + `${r + 1}. rafı ara`,
          use: () => {
            if (r !== shelf) { K.ui.toast('Bu rafta değil.'); M.flags.wrong = (M.flags.wrong || 0) + 1; return; }
            M.talk({ name: 'PROJE KARANLIK' }, { start: 'a', nodes: { a: { text: 'Dosyayı buldun: sahte nakliye faturaları ve Siyah Akrep Lojistik\'e yapılan yüklü ödemeler. Ne yapacaksın?', choices: [
              { t: 'Dosyayı al ve hemen çık (hızlı — yokluğu ~40 sn içinde fark edilir)', do: (M) => {
                M.setFlag('fileFound'); M.evidence.push('m01_file'); M.decisions.m01_file = 'take';
                M.after(40, () => { if (M.state !== 'active' || M.obj('o4').state === 'done') return; K.ui.toast('Dosyanın yokluğu fark edildi! Güvenlik şüpheleniyor — hemen çık!', 'bad'); const P = G().player; for (const e of G().enemies) if (e.threat && e.state !== 'combat') { e.susp = Math.max(e.susp, 62); e.lastKnown = { x: P.pos.x, z: P.pos.z }; e.state = 'investigate'; e.path = null; e.range *= 1.3; } });
              } },
              { t: 'Fotokopi makinesinde kopyala (10 sn — hiçbir iz bırakmaz)', do: (M) => { M.setFlag('needCopy'); K.ui.toast('Arşivdeki fotokopi makinesine git ve E\'yi basılı tut'); } },
            ] } } });
          } });
      }
      M.interact({ id: 'm01_copy', x: 15.5, y: 1.0, z: -60, r: 1.8, hold: 10, enabled: () => M.flags.needCopy && !M.flags.fileFound, label: () => 'Dosyayı fotokopiyle kopyala',
        use: () => { M.setFlag('fileFound'); M.setFlag('copied'); M.evidence.push('m01_file'); M.decisions.m01_file = 'copy'; K.ui.toast('Dosya kopyalandı — iz bırakılmadı', 'evidence'); } });
      M.grantAccess = (kind) => { if (M.flags.access) return; M.setFlag('access', kind); M.decisions.m01_access = kind; D.turnstile.locked = false; D.turnstile.setOpen(true); };
      rec.dialogue = () => M.talk(rec, { start: 'a', nodes: {
        a: { text: 'Hoş geldiniz, Vertex Plaza. Size nasıl yardımcı olabilirim?', choices: [
          { t: 'Bilgi işlemden geliyorum, sunucu bakımı için çağrıldım.', if: (M) => !M.flags.access, next: 'tech', do: (M) => M.grantAccess('tech') },
          { t: 'Denetçiyim. Bay Kaya ile randevum vardı.', if: (M) => !M.flags.access, next: 'aud', do: (M) => M.grantAccess('auditor') },
          { t: 'Kenara çekil, içeri giriyorum.', if: (M) => !M.flags.access, next: 'rude', do: (M) => { for (const e of G().enemies) if (e.dist(rec.pos) < 12) e.susp = Math.max(e.susp, 45); } },
          { t: 'Turnike açık mı?', if: (M) => !!M.flags.access, next: 'ok' },
          { t: 'Teşekkürler, iyi günler.', next: null },
        ] },
        tech: { text: 'Bakım listesinde görünüyorsunuz. Turnikeyi açıyorum; sunucu odası arşivin arkasında.', choices: [{ t: 'Teşekkürler.', next: null }] },
        aud: { text: 'Bay Kaya bugün toplantıda, ama sekreteri Selin Hanım yardımcı olur. Buyurun, ziyaretçi kartınız.', choices: [{ t: 'Teşekkürler.', next: null }] },
        rude: { text: 'Efendim? Lütfen sakin olun... Kimliğinizi görebilir miyim?', choices: [
          { t: 'Özür dilerim, uzun bir gün oldu. Bilgi işlemdenim.', next: 'tech', do: (M) => { M.grantAccess('tech'); M.decisions.m01_rude = true; } },
          { t: 'Boş ver.', next: null, do: (M) => { for (const e of G().enemies) if (e.dist(rec.pos) < 14) e.susp = Math.max(e.susp, 70); } },
        ] },
        ok: { text: 'Evet, geçebilirsiniz. İyi çalışmalar.', choices: [{ t: 'Sağ olun.', next: null }] },
      } });
      emp.dialogue = () => M.talk(emp, { start: 'a', nodes: {
        a: { text: 'Selam! Yenisin galiba? Ben Bora, muhasebeden.', choices: [
          { t: 'Arşivde bir dosya arıyorum ama kapı kodunu unuttum.', if: (M) => !M.flags.clueB, next: 'code', do: (M) => { M.flags.clueB = true; M.addCount('clue', 'm01_testimony', 'Bora\'nın ifadesi', `Arşiv kodunun son iki hanesi: ${code[2]}${code[3]}`); } },
          { t: 'Bay Kaya nerede?', next: 'kaya' },
          { t: 'Hiç, iyi çalışmalar.', next: null },
        ] },
        code: { text: `Herkes unutuyor zaten. Son iki hane ${code[2]}${code[3]}. Ama benden duymadın, tamam mı?`, choices: [{ t: 'Sağ ol Bora.', next: null }] },
        kaya: { text: 'Toplantıda. Ajandası odasında; oda anahtarını Selin\'in çekmecesinde tutarlar. Selin kahve molasına çıkınca masası boş kalır.', choices: [{ t: 'Anladım.', next: 'a' }] },
      } });
      sec.dialogue = () => M.talk(sec, { start: 'a', nodes: {
        a: { text: 'Evet? Bay Kaya bugün burada değil.', choices: [
          { t: 'Bay Kaya\'nın odasına denetim evrakı bırakmam gerek.', if: (M) => M.flags.access === 'auditor' && !G().hasItem('key_manager'), next: 'key', do: (M) => { G().giveItem('key_manager'); M.decisions.m01_key = 'asked'; K.ui.toast('Müdür odası anahtarı alındı', 'evidence'); } },
          { t: 'Bay Kaya\'nın odasına girmem gerek.', if: (M) => M.flags.access !== 'auditor' && !G().hasItem('key_manager'), next: 'no' },
          { t: 'Kahve molası ne zaman?', next: 'coffee' },
          { t: 'Yok bir şey, kolay gelsin.', next: null },
        ] },
        key: { text: 'Denetçi siz misiniz? Buyurun anahtar. İşiniz bitince geri getirin lütfen.', choices: [{ t: 'Tabii.', next: null }] },
        no: { text: 'Maalesef, yetkiniz olmadan veremem.', choices: [{ t: 'Anlıyorum.', next: null }] },
        coffee: { text: 'Az sonra... Dinlenme odasında biraz soluklanırım. Neden sordunuz?', choices: [{ t: 'Ben de bir kahve içeyim diye.', next: null }] },
      } });
      M.nextClue = () => { const n = nearestItem(M, 'clue'); if (!M.flags.clueB) { const P = G().player; const de = Math.hypot(P.pos.x + 25, P.pos.z + 46.5); if (!n || de < Math.hypot(P.pos.x - n.x, P.pos.z - n.z)) return { x: -25.5, z: -46.5 }; } return n; };
      M.on('civThreatened', () => M.raiseAlarm('Bir çalışana silah doğrulttun'));
      M.hint('m01', 'Sivil görünümdesin: silahın gizli. Resepsiyonla konuşmak için yaklaş ve E\'ye bas. Yetkisiz alanlarda (kırmızı bölge) şüphe hızlı yükselir.');
    },
    onWeaponDrawn(M) {
      const P = G().player;
      for (const a of G().actors) if ((a.team === 'civ' || a.team === 'enemy') && a.alive && a.dist(P.pos) < 22 && K.world.los(a.pos.x, a.eyeY, a.pos.z, P.pos.x, P.chestY, P.pos.z)) { M.raiseAlarm(`${a.name || 'Bir çalışan'} silahını gördü`); return; }
      K.ui.toast('Silahını çektin — kimse görmedi. Hemen kılıfına koy (H)!', 'bad');
    },
    update(M, dt) {
      const s = M.sec, p = M.secPlan;
      if (!s || !s.alive || s.state === 'panic' || s.state === 'cower') return;
      p.t -= dt;
      if (p.phase === 'desk' && p.t <= 0) { p.phase = 'going'; s.basePose = 'normal'; s.anim.pose = 'normal'; s.state = 'goto'; K.ai.requestPath(s, -22, -45.5); K.ui.toast('Sekreter kahve molasına çıktı'); }
      else if (p.phase === 'going' && s.state !== 'goto') { p.phase = 'break'; p.t = 28; }
      else if (p.phase === 'break' && p.t <= 0) { p.phase = 'return'; s.state = 'goto'; K.ai.requestPath(s, 21, -46.85); }
      else if (p.phase === 'return' && s.state !== 'goto') { p.phase = 'desk'; p.t = 75; s.basePose = 'sit'; s.anim.pose = 'sit'; s.home = { x: 21, z: -46.85, yaw: 0 }; s.yaw = 0; }
    },
  });

  // ════════════════════════════════════════════════ 02 · KAYIP AJAN
  LIST.push({
    id: 'm02', no: '02', title: 'KAYIP AJAN', place: 'Eski şehir — çarşı ve dar sokaklar', type: 'Araştırma ve tahliye', rank: 1, needs: ['m01'],
    time: 'dusk', weather: 'clear', stealth: false, squadMax: 2, par: 660, evidenceMax: 2,
    brief: 'Siyah Akrep\'i izleyen Ajan Leyla iki gündür kayıp. Son sinyali eski şehirde alındı. Çarşıdaki muhbirle konuş, arama bölgelerini ekibinle tara, ajanı bul, ilk yardım uygula ve güvenli şekilde tahliye et.',
    risks: ['Dar sokaklarda ekip üst üste yığılmamalı; konuma ilerle komutunu kullan.', 'Örgüt üyeleri güvenli evin çevresinde nöbet tutuyor.', 'Ajan kurtarıldığında takviye düşman gelecek.'],
    recommend: 'Standart Tim ×2. Arama bölgelerine ekibi "Konuma ilerle" ile gönder.',
    unlockText: '3 kişilik tim, haritadan hedef işaretleme',
    insertion: { type: 'walk', x: -85, z: -52, yaw: -Math.PI / 2 },
    objectives: [
      { id: 'o1', text: 'Çarşıdaki muhbir Hasan ile konuş', type: 'flag', flag: 'informant', at: { x: -150, z: -99.5 } },
      { id: 'o2', text: 'Arama bölgelerini tara (sen veya ekibin)', type: 'search', zones: [C(-210, -60, 7), C(-118, -182, 7), C(-130, -152, 8)], after: 'o1',
        onZone: (M, i) => { if (i === 2) M.radio('Yaşlı kadın', 'Yaralı kızı batıdaki mavi kapılı eve taşıdılar! Silahlı adamlar var...'); if (i === 1) M.radio('Komuta', 'Kırık bir telefon bulundu. Son mesaj: "Güvenli ev — kuyulu avlunun batısı".'); } },
      { id: 'o3', text: 'Güvenli evde ajanı bul', type: 'reach', who: 'any', zone: C(-188.5, -146.5, 2.8), after: 'o2', onDone: (M) => { M.leyla.hideMarker = false; M.radio('Ekip', 'Ajanı bulduk! Yaralı, ilk yardım gerekiyor.'); } },
      { id: 'o4', text: 'Ajana ilk yardım uygula (E basılı)', type: 'flag', flag: 'vipUp', after: 'o3', target: () => MM().leyla },
      { id: 'o5', text: 'Ajanı tahliye noktasına götür', type: 'reach', who: 'vip', vip: () => MM().leyla, zone: C(-84, -28, 7), after: 'o4' },
    ],
    side: [
      { id: 's1', text: 'Ekipten kimse yaralanmasın', type: 'teamSafe' },
      { id: 's2', text: 'Sivil kayıp olmasın', type: 'noCivLoss' },
      { id: 's3', text: 'Muhbiri tehdit etmeden bilgi al', type: 'check', fn: (M) => M.flags.informant && !M.flags.threat },
    ],
    setup(M) {
      const leyla = M.leyla = M.vip({ x: -189.2, z: -147.2, yaw: Math.PI / 2, name: 'Ajan Leyla', look: Object.assign({}, L('agent'), { uniform: 0x7a2a2a, hair: 0x3a2214, glb: K.models.civGLB('f', () => 0.4) || undefined }) });
      leyla.downed = true; leyla.hp = 1; leyla.anim.pose = 'downed'; leyla.injured = true; leyla.followAfterRevive = true; leyla.hideMarker = true;
      const hasan = M.civ({ x: -150, z: -97.0, yaw: Math.PI, name: 'Seyyar Hasan', state: 'idle', panicImmune: true });
      hasan.dialogue = () => M.talk(hasan, { start: M.flags.informant ? 'done' : 'a', nodes: {
        a: { text: 'Buyrun abi, taze incir var, çay var... Ne bakmıştınız?', choices: [{ t: 'Bir arkadaşımı arıyorum. Kırmızı montlu bir kadın, iki gün önce buradaydı.', next: 'b' }, { t: 'Hiç, sağ ol.', next: null }] },
        b: { text: '...Burası tehlikeli abi. Ben bir şey görmedim, duymadım.', choices: [
          { t: 'Para ver (cebinden birkaç banknot)', next: 'c', do: (M) => { M.decisions.m02_informant = 'pay'; } },
          { t: 'Devlet için çalışıyoruz. Onu bulamazsak bu sokaklar daha da kararır.', next: 'c', do: (M) => { M.decisions.m02_informant = 'persuade'; } },
          { t: 'Konuşmazsan seni de götürürüz! (tehdit)', next: 'd', do: (M) => { M.decisions.m02_informant = 'threat'; M.flags.threat = true; M.failObj('s3'); for (const c of G().civs) if (c !== hasan && c.dist(hasan.pos) < 25) c.panic(hasan.pos.x, hasan.pos.z); } },
        ] },
        c: { text: 'Peki... Yaralı bir kadını üç yerde gördüler: hurdalık avlusunda, arka sokaktaki depoda ve kuyulu avluda. Akrep\'in adamları her yerde, dikkat edin.', choices: [{ t: 'Sağ ol Hasan.', next: null, do: (M) => M.setFlag('informant') }] },
        d: { text: 'Tamam tamam! Hurdalık avlusu, arka depo, kuyulu avlu! Vurmayın!', choices: [{ t: 'Akıllıca.', next: null, do: (M) => M.setFlag('informant') }] },
        done: { text: 'Hurdalık avlusu, arka depo, kuyulu avlu dedim ya abi. Allah yardımcınız olsun.', choices: [{ t: 'Tamam.', next: null }] },
      } });
      for (let i = 0; i < 14; i++) { const p = snap(-230 + Math.random() * 130, -100 + (Math.random() - 0.5) * 3); M.civ({ x: p.x, z: p.z, state: 'wander', route: { ax: -232, az: -100 + (Math.random() - 0.5) * 2, bx: -98, bz: -100 + (Math.random() - 0.5) * 2 }, ambient: true }); }
      for (let i = 0; i < 6; i++) { const p = K.nav.randomFreeNear(0, -150, -60, 40); if (p) { const c = M.civ({ x: p.x, z: p.z, state: 'wander', ambient: true }); c.wanderR = 14; } }
      M.item({ id: 'm02_bandage', name: 'Kanlı bandaj', desc: 'Ajan yaralı ve hareket ettirilmiş.', x: -211.5, z: -57.5, mesh: 'bag' });
      M.item({ id: 'm02_phone', name: 'Kırık telefon', desc: 'Son mesaj: "Güvenli ev — kuyulu avlunun batısı".', x: -116.5, z: -184, mesh: 'bag' });
      M.civ({ x: -127.5, z: -150, yaw: -Math.PI / 2, name: 'Yaşlı kadın', state: 'idle', pose: 'talk', look: Object.assign(K.models.civLook(Math.random, 'f'), { hair: 0x9a9a9a, uniform: 0x3a3048 }) });
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.45, range: 24 }, o)); };
      g(-186, -135.6, { yaw: 0 }); g(-181, -135.6, { yaw: 0.3 });
      g(-178.5, -144.5, { yaw: Math.PI / 2 });
      g(-196, -133, { patrol: npts([[-196, -133, 2], [-170, -133, 2], [-170, -157, 2], [-196, -157, 2]]) });
      g(-160, -120, { patrol: npts([[-160, -120, 3], [-110, -122, 3]]) });
      g(-228, -140, { patrol: npts([[-228, -140, 3], [-226, -82, 3]]) });
      g(-140, -60, { patrol: npts([[-140, -62, 2], [-196, -64, 2]]) });
      M.on('revived', (e) => {
        if (e.actor !== leyla || M.flags.vipUp) return;
        M.setFlag('vipUp'); leyla.setLeader(G().player); M.rescued.push('leyla');
        M.radio('Ajan Leyla', 'Sonunda... Beni buradan çıkarın, peşimdeler!', true);
        M.after(9, () => { M.radio('Komuta', 'Batıdan takviye düşman yaklaşıyor!'); wave(M, [[-238, -112], [-236, -116], [-240, -108], [-234, -120]], { accuracy: 0.45 }); });
        M.after(42, () => { M.radio('Komuta', 'Güneyden ikinci grup geliyor, hızlanın!'); wave(M, [[-150, -16], [-146, -18], [-154, -14], [-150, -20]], { accuracy: 0.45 }); });
      });
      M.hint('m02', 'Ekibine emir vermek için Q\'yu basılı tut (komut tekeri). 1-2 tuşlarıyla asker seç; T ile nişangâhtaki noktaya gönder; F takip, B bekle.');
    },
  });

  // ════════════════════════════════════════════════ 03 · GECE OPERASYONU
  LIST.push({
    id: 'm03', no: '03', title: 'GECE OPERASYONU', place: 'Sanayi bölgesi — Siyah Akrep deposu', type: 'Gizli sızma, çoklu hedef', rank: 2, needs: ['m02'],
    time: 'night', weather: 'rain', stealth: true, squadMax: 4, par: 780, evidenceMax: 4,
    brief: 'Siyah Akrep Lojistik\'in sanayi deposu, şehirdeki kaçak sevkiyatların merkezi. Güvenli giriş yolunu seç, üç sevkiyat belgesini topla, ofisteki terminalden kayıtları indir ve tüm ekibi sağ salim tahliye noktasına getir.',
    risks: ['Ana kapıda iki nöbetçi var; kilidi kırmak gürültü çıkarır.', 'Doğu çiti tel makasıyla sessizce kesilebilir.', 'Depo müdürü canlı yakalanırsa ek delil sağlar.'],
    recommend: 'Gizli Ajan + Standart Tim. "Ateşi kes" modunda ilerle; terminal için ajana etkileşim emri ver.',
    unlockText: 'HMS-7, keşif dronu, gece görüş ve 5 kişilik tim',
    insertion: { type: 'walk', x: 116, z: 107, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'Giriş yolunu seç ve depo sahasına sız', type: 'reach', who: 'player', zone: R(101, 23, 169, 94), where: () => ({ x: 134, z: 96 }) },
      { id: 'o2', text: 'Sevkiyat belgelerini topla', type: 'collect', tag: 'doc', count: 3, after: 'o1', where: (M) => nearestItem(M, 'doc') },
      { id: 'o3', text: 'Ofis terminalinden sevkiyat kayıtlarını indir', type: 'flag', flag: 'download', after: 'o2', at: { x: 153.5, z: 36.5 } },
      { id: 'o4', text: 'Tüm ekibi tahliye noktasına götür', type: 'reach', who: 'allTeam', zone: C(116, 107, 8), after: 'o3' },
    ],
    side: [
      { id: 's1', text: 'Belgeler toplanana kadar alarm verme', type: 'noAlarm', until: 'o2' },
      { id: 's2', text: 'Ekip sağlığını %50\'nin üzerinde tut', type: 'teamHealth', frac: 0.5 },
      { id: 's3', text: 'Depo müdürünü canlı gözaltına al', type: 'arrest', target: () => MM().boss },
    ],
    setup(M) {
      const w = W();
      M.interact({ id: 'm03_gate', x: 134, y: 1.2, z: 96.2, r: 2.4, hold: 4, enabled: () => w.depotGate.locked, label: () => 'Ana kapının kilidini kır (gürültülü)',
        use: (a) => { w.depotGate.locked = false; w.depotGate.setOpen(true); M.decisions.m03_entry = 'gate'; K.bus.emit('noise', { x: 134, y: 0, z: 95, r: 16, src: a, type: 'step' }); K.ui.toast('Kapı açıldı — gürültü çıktı!', 'bad'); } });
      M.interact({ id: 'm03_fence', x: 171.3, y: 1.2, z: 61, r: 2.2, hold: 5, enabled: () => !w.depotFence.cut, label: () => 'Çiti tel makasıyla kes (sessiz)',
        use: () => { w.depotFence.cut = true; w.depotFence.mesh.visible = false; w.depotFence.col.door.locked = false; K.world.removeC(w.depotFence.col); M.decisions.m03_entry = 'fence'; K.ui.toast('Çit kesildi — sessiz giriş açık', 'ok'); } });
      M.item({ id: 'm03_doc1', tag: 'doc', name: 'Sevk irsaliyesi', desc: '"Karanlık Sevkiyat — Liman, 3. rıhtım"', x: 154.4, y: 0.86, z: 35.7 });
      M.item({ id: 'm03_doc2', tag: 'doc', name: 'Gümrük formu', desc: 'Sahte mühürlü gümrük beyannamesi', x: 125.2, y: 1.55, z: 61.3 });
      M.item({ id: 'm03_doc3', tag: 'doc', name: 'Ödeme defteri', desc: 'Kurgusal paravan şirketlere ödemeler', x: 151, y: 1.1, z: 59.6 });
      const lap = K.models.laptop(); lap.position.set(153.5, 0.84, 36.4); G().dyn.add(lap); M.laptop = lap;
      M.interact({ id: 'm03_term', x: 153.5, y: 1.0, z: 36.4, r: 1.8, hold: 10, enabled: () => M.obj('o3').state === 'active', label: () => 'Terminal: sevkiyat kayıtlarını indir',
        use: () => { M.setFlag('download'); M.evidence.push('m03_logs'); K.ui.toast('Sevkiyat kayıtları indirildi', 'evidence'); } });
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.5, range: 26 }, o)); };
      g(131, 92.5, { yaw: 0, name: 'Nöbetçi' }); g(137.5, 92.5, { yaw: 0.2, name: 'Nöbetçi' });
      g(104, 90, { patrol: npts([[104, 90, 2], [104, 26, 2], [166, 26, 2], [166, 90, 2]]) });
      g(166, 30, { patrol: npts([[166, 30, 2], [166, 90, 2], [104, 90, 2], [104, 26, 2]]) });
      g(162, 70, { patrol: npts([[163, 85, 3], [163, 47, 3]]) });
      g(114, 36, { patrol: npts([[114, 34, 2], [114, 76, 2], [144, 76, 2], [144, 46, 2]]) });
      g(121.5, 42, { patrol: npts([[121.5, 40, 2], [121.5, 70, 2]]) });
      g(135.5, 70, { patrol: npts([[135.5, 70, 2], [135.5, 40, 2]]) });
      g(148, 47, { yaw: Math.PI });
      M.boss = g(155.5, 37.5, { lookId: 'boss', weapon: 'pistol_s', name: 'Depo müdürü Rıza', yaw: Math.PI, accuracy: 0.4, leader: true });
      M.hint('m03', 'Gizli görevde ekip varsayılan olarak ateş açmaz. Alarm verilirse otomatik karşılık verirler. Terminali indirmek için ekipten birine "Etkileşim" emri verebilirsin (ajan daha hızlıdır).');
    },
  });

  // ════════════════════════════════════════════════ 04 · ÇELİK KUVVET
  LIST.push({
    id: 'm04', no: '04', title: 'ÇELİK KUVVET', place: 'Enerji tesisi', type: 'Koruma ve ekip desteği', rank: 3, needs: ['m03'],
    time: 'day', weather: 'clear', stealth: false, squadMax: 4, par: 420, civMax: 4,
    brief: 'Siyah Akrep, enerji tesisine baskın düzenleyip jeneratör bahçesine patlayıcı yerleştirdi. Ekibini ikiye böl: bir grup kontrol binasını 120 saniye savunurken diğer grup patlayıcıyı süre dolmadan etkisiz hâle getirsin.',
    risks: ['Patlayıcının süresi sınırlı.', 'Saldırı dalgaları batı ve doğu çit boşluklarından gelecek.', 'Kontrol binasında tesis personeli var.'],
    recommend: 'Çelik Kuvvet ×2 savunmaya ("Bölgeyi koru"), diğerleri seninle jeneratöre.',
    unlockText: 'İlk zırhlı araç: 4x4 devriye',
    insertion: { type: 'walk', x: 0, z: 108, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'Tesise gir', type: 'reach', who: 'player', zone: C(0, 88, 10) },
      { id: 'o2', text: 'Kontrol binasını savun', type: 'defend', zone: R(-32, 26, -6, 48), duration: 120, after: 'o1', failText: 'Kontrol binası düştü' },
      { id: 'o3', text: 'Jeneratör bahçesindeki patlayıcıyı etkisiz hâle getir', type: 'flag', flag: 'defused', after: 'o1', at: { x: 27, z: 69 }, timer: 240, timerFail: 'Patlayıcı infilak etti' },
    ],
    side: [
      { id: 's1', text: 'Tesis personelini koru', type: 'noCivLoss' },
      { id: 's2', text: 'Tüm ekip hayatta kalsın', type: 'teamAlive' },
      { id: 's3', text: 'Saldırı liderini canlı gözaltına al', type: 'arrest', target: () => MM().leader },
    ],
    setup(M) {
      for (const [x, z] of [[-25, 30.5], [-20.5, 30.5], [-16, 30.5], [-11.5, 30.5]]) M.civ({ x, z, yaw: Math.PI, state: 'idle', pose: 'sit', name: 'Tesis personeli', look: Object.assign(K.models.civLook(), { uniform: 0x2a4a7a }) });
      const P = new K.models.Parts(); P.box(0.6, 0.45, 0.4, 0x3a3a2a, 'METAL', 0, 0.22, 0); P.box(0.3, 0.12, 0.2, 0x111111, 'METAL', 0, 0.5, 0); P.cyl(0.02, 0.02, 0.4, 4, 0xc02020, 'FLAT', 0.15, 0.6, 0);
      const bomb = P.mesh(K.models.matProp); bomb.position.set(27, 0.05, 66.5); G().dyn.add(bomb);
      const blink = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.tex.glow, color: 0xff2020, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
      blink.position.set(27, 0.75, 66.5); blink.scale.setScalar(0.7); G().dyn.add(blink); M.blink = blink; M.bomb = bomb;
      M.interact({ id: 'm04_bomb', x: 27, y: 0.6, z: 66.5, r: 1.8, hold: 8, enabled: () => !M.flags.defused && M.obj('o3').state === 'active', label: () => 'Patlayıcıyı etkisiz hâle getir',
        use: () => { M.setFlag('defused'); M.blink.visible = false; K.ui.toast('Patlayıcı etkisiz hâle getirildi', 'ok'); } });
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.5, range: 30 }, o)); };
      g(24, 72, { yaw: 0 }); g(32, 58, { yaw: 2 }); g(18, 80, { patrol: npts([[18, 80, 2], [36, 80, 2]]) });
      M.waveT = -1;
    },
    update(M, dt) {
      if (M.blink && M.blink.visible) M.blink.material.opacity = (Math.sin(M.time * 8) > 0) ? 1 : 0.2;
      const o2 = M.obj('o2');
      if (o2.state === 'active' && M.waveT < 0) { M.waveT = 0; M.radio('Komuta', 'Saldırı başlıyor! Kontrol binasını tutun.', true); }
      if (M.waveT >= 0 && o2.state === 'active') {
        const prev = M.waveT; M.waveT += dt;
        const goal = { x: -19, z: 37 };
        const at = (t) => prev < t && M.waveT >= t;
        if (at(4)) wave(M, [[-62, 42], [-64, 45], [-63, 39], [-66, 43]], { goal });
        if (at(34)) wave(M, [[62, 62], [64, 65], [63, 59], [66, 63], [65, 61]], { goal });
        if (at(64)) { wave(M, [[-62, 42], [-64, 45], [0, 106], [3, 108]], { goal }); const p = snap(-66, 44); M.leader = M.enemy({ x: p.x, z: p.z, lookId: 'enemyHeavy', hp: 170, name: 'Saldırı lideri', leader: true, accuracy: 0.55 }); M.leader.alert(G().player, false); M.leader.lastKnown = goal; M.radio('Komuta', 'Saldırı lideri sahada! Onu canlı istiyoruz.'); }
        if (at(94)) wave(M, [[62, 62], [64, 65], [63, 59], [-62, 42]], { goal });
      }
      if (M.obj('o3').state === 'active' && !M.flags.defused) {
        const left = 240 - (M.time - M.obj('o3').t0);
        if (left < 0.1 && !M.flags.boom) { M.flags.boom = true; K.combat.explode(27, 0.5, 66.5, 14, 300, null, { size: 2 }); }
      }
    },
  });

  // ════════════════════════════════════════════════ 05 · ŞEHİRDE KRİZ
  LIST.push({
    id: 'm05', no: '05', title: 'ŞEHİRDE KRİZ', place: 'Kent merkezi — meydan', type: 'Sivil tahliyesi, emniyet çemberi', rank: 4, needs: ['m04'],
    time: 'day', weather: 'clear', stealth: false, squadMax: 5, par: 400, timeLimit: 480, civMax: 12, failOnCivKill: true, civKillLimit: 2,
    brief: 'Siyah Akrep\'in kiraladığı silahlı grup meydanda kaos çıkardı. Zırhlı araçla bölgeye ulaş, Çevik Kuvvet ile üç noktaya bariyer kurarak emniyet çemberi oluştur, sivilleri güvenli noktaya tahliye et ve ambulansın yolunu aç.',
    risks: ['8 dakikalık süre sınırı var.', 'Saldırganlar sivillerin arasında; dikkatli ateş et.', 'Ana caddede yanmış araç enkazı ambulansın yolunu kesiyor.'],
    recommend: 'Çevik Kuvvet ×2 (bariyer), Standart Tim. Sivilleri "Beni takip edin" (E) ile de götürebilirsin.',
    unlockText: 'Çevik Kuvvet, 8x8 taşıyıcı',
    insertion: { type: 'vehicle', vehicle: 'patrol', x: -150, z: 3, yaw: Math.PI / 2 },
    safeZone: C(-50, -22, 7),
    objectives: [
      { id: 'o1', text: 'Zırhlı araçla kriz bölgesine ulaş', type: 'reach', who: 'player', zone: C(-30, -6, 16) },
      { id: 'o2', text: 'Emniyet çemberi kur: bariyer noktaları', type: 'collect', tag: 'barrier', count: 3, after: 'o1', where: (M) => M.nextBarrier() },
      { id: 'o3', text: 'Sivilleri güvenli noktaya tahliye et', type: 'escort', group: 'evac', zone: C(-50, -22, 7), count: 10, after: 'o1' },
      { id: 'o4', text: 'Ambulans yolunu aç (enkazı temizle)', type: 'flag', flag: 'ambulance', after: 'o1', at: { x: -36, z: 0 } },
    ],
    side: [
      { id: 's1', text: 'Tüm sivilleri (12) kurtar', type: 'check', fn: (M) => G().civs.filter((c) => c.tags.has('evac') && c.safe).length >= 12 },
      { id: 's2', text: 'Sivil kayıp olmasın', type: 'noCivLoss' },
      { id: 's3', text: 'Saldırganların tümünü etkisiz hâle getir', type: 'check', fn: (M) => G().enemies.filter((e) => e.tags.has('riot')).every((e) => !e.threat) },
    ],
    setup(M) {
      civGroup(M, 12, 0, -24, 18);
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.38, range: 32, tags: ['riot'], name: 'Saldırgan' }, o)); };
      g(-20, -33); g(18, -31); g(6, -37, { lookId: 'enemyHeavy' }); g(-8, -14); g(26, -17); g(-32, -24);
      M.barrierPts = [{ x: -42, z: -30, done: false }, { x: 42, z: -30, done: false }, { x: 0, z: -12.5, done: false }];
      M.barrierPts.forEach((b, i) => {
        M.interact({ id: 'm05_bar' + i, x: b.x, y: 0.8, z: b.z, r: 2.5, hold: 3, enabled: () => !b.done && M.obj('o2').state === 'active', label: () => 'Bariyer kur', use: () => M.buildBarrier(b) });
      });
      M.buildBarrier = (b) => {
        if (b.done) return; b.done = true;
        const ob = M.obstacle({ build: (P) => { K.models.props.barrier(P, b.x - 1.05, 0.05, b.z, 0, 0x2a3a6a); K.models.props.barrier(P, b.x + 1.05, 0.05, b.z, 0, 0x2a3a6a); }, boxes: [] });
        M.addCount('barrier', null, 'Bariyer kuruldu', `${M.count('barrier') + 1}/3`);
      };
      M.nextBarrier = () => { const b = M.barrierPts.find((x) => !x.done); return b ? { x: b.x, z: b.z } : null; };
      M.on('barrierPlaced', (e) => { const b = M.barrierPts.filter((x) => !x.done).sort((p, q) => Math.hypot(p.x - e.x, p.z - e.z) - Math.hypot(q.x - e.x, q.z - e.z))[0]; if (b && Math.hypot(b.x - e.x, b.z - e.z) < 8) M.buildBarrier(b); else K.ui.toast('Bariyer bu noktada çembere katkı sağlamaz', 'bad'); });
      M.debris = M.obstacle({ build: (P) => { K.models.props.wreck(P, -36, 0.03, 0, Math.PI / 2 + 0.3); for (let i = 0; i < 4; i++) K.models.props.barrel(P, -33 + i * 0.7, 0.03, -3 + (i % 2), 0x5a3a1a); }, boxes: [[-38.5, 0, -2.2, -33.5, 1.4, 2.2], [-33.4, 0, -3.4, -30.6, 0.9, -1.6]] });
      M.fire = { x: -36, z: 0 };
      M.interact({ id: 'm05_debris', x: -33, y: 0.8, z: 2.5, r: 2.6, hold: 6, enabled: () => M.debris.alive && M.obj('o4').state === 'active', label: () => 'Enkazı temizle (ambulans yolu)',
        use: () => { M.debris.remove(); K.ui.toast('Yol açıldı — ambulans geliyor', 'ok'); M.amb.ai = { path: [{ x: -60, z: 3 }, { x: -46, z: 3 }], idx: 0, speed: 10, onEnd: () => { M.setFlag('ambulance'); M.radio('Ambulans', 'Meydana ulaştık, yaralılara müdahale ediyoruz.'); } }; } });
      M.amb = M.veh('ambulance', { x: -105, z: 3, yaw: Math.PI / 2, team: 'civ' }); M.amb.setLights(true); M.amb.invuln = true;
      M.hint('m05', 'Sivilin yanına gidip E ile "Beni takip edin" diyebilirsin (aynı anda 4 sivil). Çevik Kuvvet askerine "Bariyer kur" emri ver ya da işaretli noktada E\'yi basılı tut.');
    },
    update(M) { if (M.debris && M.debris.alive && Math.random() < 0.5) K.fx.fireSmoke(-36 + (Math.random() - 0.5) * 2, 1.2, (Math.random() - 0.5) * 2); },
  });

  // ════════════════════════════════════════════════ 06 · MAFYA BİNASI
  LIST.push({
    id: 'm06', no: '06', title: 'MAFYA BİNASI', place: 'Kule Plaza — çok katlı iş merkezi', type: 'Bina baskını, gözaltı', rank: 5, needs: ['m05'],
    time: 'night', weather: 'clear', stealth: true, squadMax: 6, par: 840, evidenceMax: 5, civMax: 3,
    brief: 'Siyah Akrep\'in lideri "Akrep" Kule Plaza\'nın en üst katında. Lobiyi güvenceye al, muhasebe katında defteri bul, güvenlik katındaki kameraları kapat ve lideri CANLI gözaltına al. Katlar arası asansör veya merdivenle geçilir; takip eden ekip üyeleri seninle gelir.',
    risks: ['Lider ölürse kanıt zinciri kopar — görev başarısız.', 'Kameralar açıkken üst katlar alarma geçebilir.', 'Muhasebe katında masum çalışanlar var.'],
    recommend: 'Özel Harekât ×2, Standart Tim. A timini lobide bırak, B timi seninle yukarı.',
    unlockText: 'Seçkin Birlik (Albay) yolu',
    insertion: { type: 'walk', x: 150, z: -127, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'Lobiyi güvenlik altına al', type: 'eliminate', group: 'lobby' },
      { id: 'o2', text: 'Kat 1: Muhasebe defterini bul', type: 'collect', tag: 'ledger', count: 1, after: 'o1', at: { x: 142, z: -172, y: 6 } },
      { id: 'o3', text: 'Kat 2: Güvenlik odasında kameraları kapat', type: 'flag', flag: 'cams', after: 'o2', at: { x: 161, z: -176, y: 10.5 } },
      { id: 'o4', text: 'Kat 3: Örgüt lideri Akrep\'i canlı gözaltına al', type: 'arrest', target: () => MM().akrep, after: 'o3', failText: 'Akrep öldü — kanıt zinciri koptu' },
      { id: 'o5', text: 'Akrep\'i bina önündeki tahliye noktasına götür', type: 'reach', who: 'vip', vip: () => MM().akrep, zone: C(150, -128, 7), after: 'o4' },
    ],
    side: [
      { id: 's1', text: 'Kameralar kapanana kadar alarm verme', type: 'noAlarm', until: 'o3' },
      { id: 's2', text: 'Ek delilleri topla (2)', type: 'collect', tag: 'extra', count: 2 },
      { id: 's3', text: 'Çalışanlara zarar gelmesin', type: 'noCivLoss' },
    ],
    setup(M) {
      const FH = 4.5;
      const g = (x, z, layer, o = {}) => M.enemy(Object.assign({ x, z, layer, accuracy: 0.55, range: 24 }, o));
      g(146, -149, 0, { tags: ['lobby'], yaw: 0 }); g(155, -146, 0, { tags: ['lobby'], yaw: 0.4 });
      g(138, -170, 0, { tags: ['lobby'], patrol: M.pts([[138, -170, 2], [162, -172, 2], [162, -148, 2], [138, -148, 2]]) });
      g(140, -152, 2, { patrol: M.pts([[136, -146, 2], [166, -146, 2]]) }); g(164, -170, 2, { patrol: M.pts([[164, -176, 2], [164, -152, 2]]) });
      g(144, -171, 2, { yaw: 0 }); g(156, -156, 2, { yaw: Math.PI });
      for (const [x, z] of [[136, -150.8], [148, -144.8], [164, -150.8]]) M.civ({ x, z, layer: 2, yaw: 0, state: 'idle', pose: 'sit', name: 'Muhasebeci' });
      M.item({ id: 'm06_ledger', tag: 'ledger', name: 'Kara para defteri', desc: 'Örgütün kurgusal hesap kayıtları', x: 142.3, y: FH + 0.8, z: -171.9, layer: 2 });
      M.item({ id: 'm06_extra1', tag: 'extra', name: 'Gizli kasa makbuzları', desc: 'Liman bağlantısı', x: 131.4, y: FH + 1.3, z: -175, layer: 2 });
      g(156, -172, 3, { yaw: Math.PI, lookId: 'enemyHeavy' }); g(140, -150, 3, { patrol: M.pts([[136, -150, 2], [146, -170, 2]]) });
      g(166, -150, 3, { yaw: Math.PI / 2 }); g(152, -172, 3, { yaw: 0, name: 'Güvenlik şefi' });
      M.interact({ id: 'm06_cams', x: 161, y: FH * 2 + 1.0, z: -175.2, r: 2, hold: 6, layer: 3, enabled: () => !M.flags.cams && M.obj('o3').state === 'active', label: () => 'Güvenlik kameralarını kapat',
        use: () => { M.setFlag('cams'); K.ui.toast('Kameralar kapatıldı — üst kat kör', 'ok'); M.evidence.push('m06_footage'); } });
      M.akrep = g(150.8, -175.4, 4, { lookId: 'boss', weapon: 'pistol_s', name: 'Akrep', leader: true, hp: 150, accuracy: 0.45, yaw: 0 });
      for (const [x, z] of [[146, -171], [156, -171], [150, -170]]) g(x, z, 4, { lookId: 'special', yaw: 0, name: 'Koruma', accuracy: 0.6 });
      M.akrepTalked = false;
      M.on('surrender', (e) => {
        if (e.e !== M.akrep || M.akrepTalked) return;
        M.akrepTalked = true;
        M.talk(M.akrep, { start: 'a', nodes: {
          a: { text: 'Dur! Ateş etme... Konuşalım. Liman yolunu, büyük sevkiyatı, her şeyi biliyorum. Beni bırakırsan Baron\'u sana veririm.', choices: [
            { t: 'Anlat. Ama gözaltındasın.', next: 'b', do: (M) => { M.decisions.m06_deal = 'listen'; M.item({ id: 'm06_extra2', tag: 'extra', name: 'Baron dosyası', desc: 'Liman ve TIR filosunun planı', x: 131.4, y: FH * 3 + 1.3, z: -175, layer: 4 }); } },
            { t: 'Pazarlık yok. Kelepçele.', next: null, do: (M) => { M.decisions.m06_deal = 'refuse'; } },
          ] },
          b: { text: 'Kasadaki dosyaya bak... raflarda. Baron limandaki TIR filosuyla kaçacak. Ben sadece bir piyonum.', choices: [{ t: 'Göreceğiz.', next: null }] },
        } });
      });
      M.on('arrest', (e) => { if (e.e === M.akrep) { const a = M.akrep; a.team = 'vip'; M.akrepFollow = true; a.scripted = true; a.escortFollow = true; a.anim.pose = 'normal'; M.radio('Komuta', 'Akrep gözaltında. Onu bina önündeki araca getirin.'); } });
      M.hint('m06', 'Asansör ve merdivenler E ile kullanılır; seni takip eden ekip üyeleri ve gözaltındaki şüpheli seninle gelir. Teslim olan düşmanın yanına gidip E ile kelepçele.');
    },
    update(M, dt) {
      const a = M.akrep;
      if (M.akrepFollow && a && a.alive) {
        // gözaltındaki lider oyuncuyu izler (Enemy sınıfı: elle yönlendirme)
        const P = G().player;
        if (a.layer !== P.layer) return;
        const d = a.dist(P.pos);
        a.anim.pose = 'normal'; a.state = 'arrested';
        if (d > 2.4) { if (!a.path || (a._rp = (a._rp || 0) - dt) <= 0) { K.ai.requestPath(a, P.pos.x, P.pos.z); a._rp = 0.8; } K.ai.followPath(a, dt, d > 6 ? 4.6 : 3.2); }
        else { a.vel.x *= 0.8; a.vel.z *= 0.8; }
        a.physics(dt); a.setAnim(dt); a.anim.pose = 'normal';
      }
    },
  });

  // ════════════════════════════════════════════════ 07 · KIRMIZI BÖLGE
  LIST.push({
    id: 'm07', no: '07', title: 'KIRMIZI BÖLGE', place: 'Batı mahalleleri — birbirine bağlı sokaklar', type: 'İki tim, bölge kontrolü, konvoy', rank: 6, needs: ['m06'],
    time: 'dusk', weather: 'clear', stealth: false, squadMax: 6, par: 540, civMax: 6,
    brief: 'Siyah Akrep batı mahallelerini kontrol altına aldı. A timini kuzey meydanına gönderip bölgeyi temizle; B timiyle güney meydanında mahsur kalan sivilleri zırhlı taşıyıcıya tahliye et. Sonra birlikleri araçta birleştir ve konvoyla bölgeden çık.',
    risks: ['Dar sokaklar pusuya elverişli.', 'İki meydan birbirinden uzak; ekibini akıllıca böl.', 'Çıkış yolunda pusu olabilir.'],
    recommend: 'A timi: Seçkin/Özel Harekât; B timi: Çevik Kuvvet. 8x8 taşıyıcı tüm ekibi alır.',
    unlockText: 'Tuğgeneral yolu (07 + 08)',
    insertion: { type: 'walk', x: -80, z: 58, yaw: -Math.PI / 2 },
    safeZone: C(-76, 52, 7),
    objectives: [
      { id: 'o1', text: 'Kuzey meydanını (A) temizle', type: 'eliminate', group: 'zoneA', at: { x: -200, z: 40 } },
      { id: 'o2', text: 'Güney meydanındaki (B) sivilleri taşıyıcıya tahliye et', type: 'escort', group: 'evac', zone: C(-76, 52, 7), count: 6 },
      { id: 'o3', text: 'Birlikleri yeniden birleştir: herkes taşıyıcıya', type: 'board', vehicle: () => MM().apc, after: ['o1', 'o2'] },
      { id: 'o4', text: 'Konvoyla bölgeden çık', type: 'reach', who: 'vehicle', vehicle: () => MM().apc, zone: C(-70, -40, 12), after: 'o3' },
    ],
    side: [
      { id: 's1', text: 'Sivil kayıp olmasın', type: 'noCivLoss' },
      { id: 's2', text: 'Tüm ekip hayatta kalsın', type: 'teamAlive' },
      { id: 's3', text: '9 dakikanın altında tamamla', type: 'time', t: 540 },
    ],
    setup(M) {
      M.apc = M.veh('apc', { x: -70, z: 50, yaw: Math.PI }); M.apc.rampOpen = true;
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.52, range: 30 }, o)); };
      for (const [x, z] of [[-200, 36], [-206, 44], [-194, 46], [-198, 30], [-208, 32]]) g(x, z, { tags: ['zoneA'], yaw: Math.random() * 6 });
      g(-150, 50, { patrol: npts([[-150, 50, 2], [-150, 20, 2]]) }); g(-110, 30, { patrol: npts([[-110, 30, 2], [-160, 30, 2]]) });
      g(-125, 80, { yaw: 0 }); g(-115, 64, { yaw: 2 });
      civGroup(M, 6, -120, 70, 6);
      M.ambushed = false;
      M.hint('m07', 'A/B tim: askerleri seçip komut tekerinden "A timi"/"B timi" ata. Sonra takım seçimiyle (komut tekeri) emir ver. Taşıyıcıya "Araca bin" emriyle binerler.');
    },
    update(M) {
      if (M.obj('o4').state === 'active' && !M.ambushed && M.apc.pos.z < 30) {
        M.ambushed = true; M.radio('Komuta', 'Pusu! Çıkış yolunda düşman var!');
        const g = (x, z) => { const p = snap(x, z); const e = M.enemy({ x: p.x, z: p.z, accuracy: 0.45 }); e.alert(G().player, false); };
        g(-58, 10); g(-60, 14); g(-82, 6);
      }
    },
  });

  // ════════════════════════════════════════════════ 08 · SEÇKİN BİRLİK
  LIST.push({
    id: 'm08', no: '08', title: 'SEÇKİN BİRLİK', place: 'Dağlık bölge — gece', type: 'Arama-kurtarma, helikopter intikali', rank: 6, needs: ['m06'],
    time: 'night', weather: 'fog', stealth: true, squadMax: 6, par: 780,
    brief: 'Örgütü izleyen keşif helikopteri dağlık bölgede düştü; pilot Yzb. Kerem bir kampta rehin tutuluyor. Seçkin ekiple helikopterle intikal et, kampın yerini doğrula, yaklaşımına karar ver, rehineyi kurtar ve iniş bölgesinden helikopterle çık.',
    risks: ['Sis ve karanlık görüşü kısıtlar — gece görüşü kullan.', 'Ormanda devriyeler var.', 'Hava desteği alarm verir ama kamp savunmasını kırar.'],
    recommend: 'Seçkin Birlik, keşif dronu, gece görüş.',
    unlockText: 'Tuğgeneral yolu (07 + 08)',
    insertion: { type: 'heli', from: { x: -150, z: 205 }, lz: { x: -40, z: -262 } },
    objectives: [
      { id: 'o1', text: 'Kampın yerini doğrula (yaklaş ya da dronla gözetle)', type: 'flag', flag: 'campFound', at: { x: -150, z: -300 } },
      { id: 'o2', text: 'Rehineyi kurtar (kulübe)', type: 'flag', flag: 'freed', after: 'o1', where: () => ({ x: W().poi.cabin.x, z: W().poi.cabin.z }) },
      { id: 'o3', text: 'Rehineyi iniş bölgesine götür', type: 'reach', who: 'vip', vip: () => MM().kerem, zone: C(-40, -262, 12), after: 'o2' },
      { id: 'o4', text: 'Helikoptere bin', type: 'board', vehicle: () => MM().heli, vip: () => MM().kerem, after: 'o3' },
    ],
    side: [
      { id: 's1', text: 'Rehine kurtarılana kadar alarm verme', type: 'noAlarm', until: 'o2' },
      { id: 's2', text: 'Tüm ekip hayatta kalsın', type: 'teamAlive' },
      { id: 's3', text: 'Rehinenin sağlığını %50 üzerinde tut', type: 'vipHealth', vip: () => MM().kerem, frac: 0.5 },
    ],
    setup(M) {
      const c = W().poi.camp, cab = W().poi.cabin;
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.55, range: 26, tags: ['camp'] }, o)); };
      for (const [dx, dz] of [[-4, -8], [6, -2], [-8, 4], [3, 10], [10, 6], [14, -3], [-2, -14]]) g(c.x + dx, c.z + dz, { yaw: Math.random() * 6 });
      g(cab.x - 4, cab.z + 3.8, { yaw: 0 });
      for (const [a, b] of [[[-100, -270], [-120, -300]], [[-90, -300], [-60, -295]], [[-160, -260], [-130, -250]]]) { const p = snap(a[0], a[1]); M.enemy({ x: p.x, z: p.z, accuracy: 0.5, range: 24, patrol: npts([[a[0], a[1], 3], [b[0], b[1], 3]]) }); }
      M.kerem = M.vip({ x: cab.x + 1.5, z: cab.z - 1, y: cab.y + 0.05, yaw: 0, name: 'Yzb. Kerem', look: L('pilot'), pose: 'cuffed', state: 'idle' });
      M.kerem.anim.pose = 'cuffed'; M.kerem.basePose = 'cuffed'; M.kerem.hideMarker = true;
      M.interact({ id: 'm08_free', x: cab.x + 1.5, y: cab.y + 0.8, z: cab.z - 1, r: 1.8, hold: 3, enabled: () => !M.flags.freed && M.flags.campFound, label: () => 'Rehinenin iplerini çöz',
        use: () => { M.setFlag('freed'); M.kerem.basePose = 'normal'; M.kerem.anim.pose = 'normal'; M.kerem.setLeader(G().player); M.rescued.push('kerem'); M.radio('Yzb. Kerem', 'Tanrım, sonunda! Arkanızdayım.', true); } });
      M.on('marked', (e) => { if (e.tags.has('camp') && !M.flags.campFound) M.campFound('dron'); });
      M.campFound = (how) => {
        M.setFlag('campFound'); M.decisions.m08_found = how; M.kerem.hideMarker = false;
        M.talk({ name: 'Komuta (telsiz)' }, { start: 'a', nodes: { a: { text: 'Kamp doğrulandı. Yaklaşım kararı senin: sessiz sızma mı, yoksa helikopterden hava desteği mi? Hava desteği alarmı tetikler ama savunmayı kırar.', choices: [
          { t: 'Sessiz sızma (gizlilik bonusu)', next: null, do: (M) => { M.decisions.m08_approach = 'stealth'; } },
          { t: 'Hava desteği iste', next: null, do: (M) => { M.decisions.m08_approach = 'air'; M.radio('Pilot', 'Destek geliyor, başınızı eğin!', true); M.after(6, () => { const camp = G().enemies.filter((e) => e.tags.has('camp') && e.threat); camp.slice(0, Math.ceil(camp.length / 2)).forEach((e, i) => setTimeout(() => e.alive && K.combat.explode(e.pos.x, e.pos.y, e.pos.z, 5, 200, G().player, { size: 1 }), i * 400)); M.raiseAlarm('Hava desteği kampı vurdu'); }); } },
        ] } } });
      };
      M.heliWaiting = false;
    },
    update(M) {
      const P = G().player, c = W().poi.camp;
      if (!M.flags.campFound && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 55) M.campFound('yaklaşma');
      if (M.obj('o3').state === 'done' && !M.heliWaiting) {
        M.heliWaiting = true; M.radio('Pilot', 'İniş bölgesine geliyorum, hazır olun!');
        const h = M.heli = M.veh('heli', { x: -40, z: -200, y: 60, yaw: Math.PI, rotorOn: true });
        h.flyTo([{ x: -40, z: -262 }], { land: true, speed: 18, alt: 25, onArrive: () => { M.radio('Pilot', 'Yerdeyim, binin!'); } });
        h.invuln = true;
      }
      if (M.heli && M.kerem && M.kerem.alive && !M.kerem.vehicle && M.heli.ai && M.heli.ai.arrived && M.kerem.dist(M.heli.pos) < 7) M.heli.enter(M.kerem);
    },
    onEnd(M, ok) { if (ok && M.heli) { M.heli.flyTo([{ x: -40, z: -150 }, { x: -150, z: 205 }], { land: false, speed: 30, alt: 50 }); } },
  });

  // ════════════════════════════════════════════════ 09 · BÜYÜK OPERASYON
  LIST.push({
    id: 'm09', no: '09', title: 'BÜYÜK OPERASYON', place: 'Liman ve şehir çevresi', type: 'Çok aşamalı: tank, TIR, helikopter', rank: 7, needs: ['m07', 'm08'],
    time: 'day', weather: 'clear', stealth: false, squadMax: 8, par: 720, evidenceMax: 3, civMax: 0,
    brief: 'Baron\'un liman ağını çökertme zamanı. Tankla liman kapısındaki barikatı ve zırhlı kamyonu yok et, konteyner sahasını ekibinle temizle, kaçmaya çalışan Siyah Akrep TIR\'ını durdur ve kanıt sandıklarını helikopterle tahliye et.',
    risks: ['TIR\'ı tankla vurursan yük (kanıt) zarar görür.', 'Konteyner sahasında çok sayıda silahlı var.', 'Liman işçileri çatışma alanında.'],
    recommend: 'Tank (sen), Seçkin + Çelik Kuvvet. TIR\'ı tüfek ateşiyle durdur.',
    unlockText: 'Orgeneral yolu ve final',
    insertion: { type: 'vehicle', vehicle: 'tank', x: 200, z: 52, yaw: 0, squadWalk: true },
    objectives: [
      { id: 'o1', text: 'Tankla liman kapısındaki barikatı ve zırhlı kamyonu yok et', type: 'flag', flag: 'gate', at: { x: 200, z: 128 } },
      { id: 'o2', text: 'Konteyner sahasını temizle', type: 'eliminate', group: 'yard', after: 'o1', at: { x: 134, z: 177 } },
      { id: 'o3', text: 'Kaçan Siyah Akrep TIR\'ını durdur', type: 'flag', flag: 'tirStopped', after: 'o1', vehicle: () => MM().tir },
      { id: 'o4', text: 'Kanıt sandıklarını helikoptere işaretle', type: 'collect', tag: 'crate', count: 3, after: ['o2', 'o3'], where: (M) => nearestItem(M, 'crate') },
      { id: 'o5', text: 'Helikoptere bin', type: 'board', vehicle: () => MM().heli, after: 'o4' },
    ],
    side: [
      { id: 's1', text: 'Liman işçilerine zarar gelmesin', type: 'noCivLoss' },
      { id: 's2', text: 'TIR\'ın yükünü sağlam ele geçir (tank kullanmadan)', type: 'check', fn: (M) => M.flags.tirStopped && !M.flags.tirTankHit },
      { id: 's3', text: '12 dakikanın altında tamamla', type: 'time', t: 720 },
    ],
    setup(M) {
      M.barricade = M.obstacle({ build: (P) => { for (let i = -2; i <= 2; i++) K.models.props.barrier(P, 200 + i * 2.1, 0.03, 128, 0, 0x9a9a92); K.models.props.sandbags(P, 196, 0.03, 130, 0, 3.6); }, boxes: [[194.8, 0, 127.6, 205.2, 0.9, 128.4], [194, 0, 129.6, 198, 0.8, 130.4]] });
      M.armTruck = M.veh('apc', { x: 200, z: 135, yaw: Math.PI, team: 'mafia', hp: 900 }); M.armTruck.parked = true;
      M.on('explosion', (e) => { if (M.barricade.alive && Math.hypot(e.x - 200, e.z - 128) < 7) { M.barricade.remove(); K.ui.toast('Barikat yıkıldı', 'ok'); } });
      M.on('vehicleDestroyed', (e) => { if (e.v === M.armTruck) K.ui.toast('Zırhlı kamyon imha edildi', 'ok'); });
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.52, range: 34 }, o)); };
      for (const [x, z] of [[196, 140], [205, 142], [192, 146]]) g(x, z, { yaw: Math.PI });
      for (const [x, z] of [[134, 170], [128, 182], [142, 186], [120, 172], [150, 168], [138, 194], [110, 186], [156, 180]]) g(x, z, { tags: ['yard'], lookId: Math.random() < 0.3 ? 'enemyHeavy' : 'enemy', yaw: Math.random() * 6 });
      for (const [x, z] of [[230, 210], [226, 160], [180, 236], [100, 236]]) M.civ({ x, z, name: 'Liman işçisi', state: 'wander', look: Object.assign(K.models.civLook(Math.random, 'm'), { uniform: 0xd87a20, cap: 0xe8c020 }) });
      M.tir = M.veh('truck', { x: 230, z: 40, yaw: 0, team: 'mafia' });
      M.tir.onDamaged = (n, src) => { if (src && src.vehicle && src.vehicle.type === 'tank') M.flags.tirTankHit = true; if (M.tir.hp < M.tir.maxHp * 0.42 && !M.flags.tirStopped) { M.tir.hp = Math.max(M.tir.hp, 1); M.tir.invuln = true; M.tir.ai = null; M.tir.input.t = 0; M.tir.input.hb = true; M.setFlag('tirStopped'); K.ui.toast('TIR durduruldu — motor devre dışı', 'ok'); M.evidence.push('m09_cargo'); } };
      M.tirStarted = false;
      M.crateSpawned = false;
    },
    update(M) {
      if (!M.flags.gate && !M.barricade.alive && (!M.armTruck.alive)) { M.setFlag('gate'); }
      if (M.obj('o3').state === 'active' && !M.tirStarted) {
        M.tirStarted = true; M.radio('Komuta', 'Siyah Akrep TIR\'ı garajdan kaçıyor! Durdurun — yükü sağlam istiyoruz!', true);
        M.tir.ai = { path: [{ x: 235, z: 90 }, { x: 204, z: 104 }, { x: 203, z: 6 }, { x: 150, z: 3 }, { x: 70, z: 3 }, { x: -60, z: 3 }, { x: -200, z: 3 }], idx: 0, speed: 13, reach: 9, ignoreBlock: false, onEnd: () => { if (!M.flags.tirStopped) M.fail('TIR şehirden kaçtı'); } };
        M.tir.setLights(true);
      }
      if (M.obj('o4').state === 'active' && !M.crateSpawned) {
        M.crateSpawned = true;
        for (const [x, z, i] of [[132, 175, 1], [136, 178, 2], [130, 180, 3]]) M.item({ id: 'm09_crate' + i, tag: 'crate', name: 'Kanıt sandığı', desc: 'Helikopter için işaretlendi', x, z, mesh: 'crate', hold: 2, label: 'Kanıt sandığını helikopter için işaretle' });
        const h = M.heli = M.veh('heli', { x: 140, z: 260, y: 50, yaw: Math.PI, rotorOn: true }); h.invuln = true;
        h.flyTo([{ x: 140, z: 210 }, { x: 134, z: 177 }], { land: true, speed: 20, alt: 30, onArrive: () => M.radio('Pilot', 'Konteyner sahasındayım. Sandıklar yükleniyor, binin!') });
      }
    },
  });

  // ════════════════════════════════════════════════ 10 · SON EMİR
  LIST.push({
    id: 'm10', no: '10', title: 'SON EMİR', place: 'Şehir merkezi → liman', type: 'Final: çok aşamalı, anlatı kararları', rank: 8, needs: ['m09'], final: true,
    time: 'night', weather: 'rain', stealth: false, squadMax: 8, par: 900, civMax: 0,
    brief: 'Baron şehri terk etmek üzere. Önceki görevlerde topladığın deliller ve kurtardığın kişiler bu gecenin sonucunu belirleyecek. Meydanı güvenceye al, tanığı koru, Baron\'un konvoyunu limana kadar takip et ve onu canlı gözaltına al.',
    risks: ['Baron\'u kaybedersen (150 m+) görev başarısız.', 'Meydanda ağır silahlı korumalar var.', 'Final tek bir çatışma değildir: birden çok aşama ve karar var.'],
    recommend: 'Geniş ekip. Takip için 4x4 devriye meydanda hazır.',
    unlockText: 'Kampanya sonu',
    insertion: { type: 'walk', x: -48, z: -14, yaw: Math.PI / 2 },
    objectives: [
      { id: 'o1', text: 'Meydanı güvenlik altına al', type: 'eliminate', group: 'plaza', at: { x: 0, z: -24 } },
      { id: 'o2', text: 'Tanığı (Ajan Leyla) zırhlı araca götür', type: 'reach', who: 'vip', vip: () => MM().leyla, zone: C(-46, 3, 7), after: 'o1' },
      { id: 'o3', text: 'Baron\'un konvoyunu limana kadar takip et', type: 'follow', target: () => MM().baronCar, minD: 0, maxD: 150, loseT: 15, after: 'o1', done: (M) => M.baronCar && M.baronCar.ai && M.baronCar.ai.done },
      { id: 'o4', text: 'Konteyner sahasında Baron\'u canlı gözaltına al', type: 'arrest', target: () => MM().baron, after: 'o3', failText: 'Baron öldü' },
    ],
    side: [
      { id: 's1', text: 'Sivil kayıp olmasın', type: 'noCivLoss' },
      { id: 's2', text: 'Tüm ekip hayatta kalsın', type: 'teamAlive' },
      { id: 's3', text: 'Kampanya delil dosyası (8+ delil)', type: 'check', fn: () => (K.save.data.evidence.length + MM().evidence.length) >= 8 },
    ],
    setup(M) {
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.56, range: 34 }, o)); };
      for (const [x, z] of [[-10, -30], [10, -32], [20, -20], [-22, -18], [0, -36], [30, -30], [-30, -32], [6, -14]]) g(x, z, { tags: ['plaza'], lookId: Math.random() < 0.4 ? 'enemyHeavy' : 'enemy', yaw: Math.random() * 6 });
      const witness = K.save.data.rescued.includes('leyla');
      M.witness = witness;
      if (witness) {
        M.leyla = M.vip({ x: -2, z: -46, name: 'Ajan Leyla', look: Object.assign({}, L('agent'), { uniform: 0x7a2a2a, hair: 0x3a2214, glb: K.models.civGLB('f', () => 0.4) || undefined }), state: 'idle', panicImmune: true });
        M.leyla.dialogue = () => M.talk(M.leyla, { start: 'a', nodes: { a: { text: 'Komutanım! Baron\'a karşı ifade vermeye hazırım. Beni araca götürün.', choices: [{ t: 'Arkamdan gel.', next: null, do: () => M.leyla.setLeader(G().player) }] } } });
      } else {
        M.after(1, () => { M.complete('o2'); M.radio('Komuta', 'Kurtarılmış tanık yok — dava delillere dayanacak.'); });
      }
      M.patrol = M.veh('patrol', { x: -46, z: 3, yaw: Math.PI / 2 });
      M.baronCar = M.veh('suv', { x: 150, z: -116, yaw: Math.PI / 2, team: 'mafia' }); M.baronCar.invuln = true; M.baronCar.setLights(true);
      M.baronStarted = false;
    },
    update(M) {
      if (M.obj('o3').state === 'active' && !M.baronStarted) {
        M.baronStarted = true; M.radio('Komuta', 'Baron Kule Plaza\'dan çıktı! Siyah SUV — takip edin, kaybetmeyin!', true);
        M.baronCar.ai = { path: [{ x: 120, z: -113 }, { x: 73, z: -107 }, { x: 73, z: -3 }, { x: 150, z: 3 }, { x: 197, z: 3 }, { x: 197, z: 110 }, { x: 200, z: 150 }, { x: 170, z: 160 }, { x: 140, z: 175 }], idx: 0, speed: 11, reach: 8,
          onEnd: () => { M.radio('Komuta', 'Baron konteyner sahasında araçtan indi!'); M.spawnFinal(); } };
      }
      M.spawnFinal = M.spawnFinal || (() => {
        if (M.baron) return;
        const c = M.baronCar.pos;
        M.baron = M.enemy({ x: c.x + 2, z: c.z + 2, lookId: 'boss', name: 'Baron', weapon: 'pistol_s', hp: 200, accuracy: 0.4, leader: true });
        const g = (x, z) => { const p = snap(x, z); const e = M.enemy({ x: p.x, z: p.z, accuracy: 0.58, lookId: 'special', name: 'Baron koruması' }); e.alert(G().player, false); };
        g(c.x - 4, c.z); g(c.x + 4, c.z + 3); g(c.x, c.z - 5); g(c.x + 6, c.z - 4); g(c.x - 6, c.z + 5); g(c.x + 2, c.z + 8);
      });
    },
    ending(M) {
      const ev = K.save.data.evidence.length + M.evidence.length;
      const arrested = M.baron && M.baron.arrested;
      if (arrested && ev >= 8 && M.witness) return { title: 'TAM ZAFER', text: 'Baron gözaltında, delil dosyası eksiksiz ve Ajan Leyla tanık kürsüsünde. Siyah Akrep örgütü tamamen çöktü. Şehir, KOMUTA\'nın sabrı ve titizliği sayesinde nefes alıyor.' };
      if (arrested && ev >= 8) return { title: 'DELİLLE GELEN ZAFER', text: 'Baron gözaltında. Tanık olmasa da topladığın deliller davayı taşıyacak kadar güçlü. Örgütün kalıntıları dağılıyor.' };
      if (arrested) return { title: 'KISMİ ZAFER', text: 'Baron gözaltında, ancak dava zayıf. Avukatları boşlukları zorlayacak. Yine de Siyah Akrep\'in başı kesildi.' };
      return { title: 'BEDELLİ ZAFER', text: 'Baron etkisiz hâle getirildi ama sorgulanamadı. Örgütün bağlantıları karanlıkta kaldı. Şehir güvende, fakat sorular cevapsız.' };
    },
  });

  // ════════════════════════════════════════════════ EK-1 · KARANLIK SEVKİYAT
  LIST.push({
    id: 'p1', no: 'EK-1', pack: true, title: 'KARANLIK SEVKİYAT', place: 'TIR garajı → liman', type: 'Araştırma, takip, araç ele geçirme', rank: 2, needs: ['m03'],
    time: 'night', weather: 'clear', stealth: true, squadMax: 2, par: 600, evidenceMax: 3,
    brief: 'İhbara göre Siyah Akrep bu gece TIR garajından bir "karanlık sevkiyat" çıkaracak. Belgeleri inceleyip doğru dorseyi belirle, konvoyu dikkat çekmeden takip et ve limanda TIR\'ı ele geçirip merkeze teslim et.',
    risks: ['Yanlış araç seçimi zaman kaybettirir.', 'Çok yakın takip edersen fark edilirsin (20 m altı).', 'Limanda sürücü ve korumalar var.'],
    recommend: 'Gizli Ajan. Takip için sivil araç garajın önünde.',
    unlockText: 'Ek puan ve delil',
    insertion: { type: 'walk', x: 212, z: 102, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'TIR garajında sevk belgelerini incele', type: 'collect', tag: 'pdoc', count: 3, where: (M) => nearestItem(M, 'pdoc') },
      { id: 'o2', text: 'Doğru dorseyi belirle', type: 'flag', flag: 'rightTruck', after: 'o1', at: { x: 235, z: 50 } },
      { id: 'o3', text: 'Konvoyu dikkat çekmeden takip et (20–110 m)', type: 'follow', target: () => MM().tir, minD: 20, maxD: 110, loseT: 12, nearT: 6, after: 'o2', done: (M) => M.tir && M.tir.ai && M.tir.ai.done },
      { id: 'o4', text: 'Limanda sürücüyü ve korumaları etkisiz hâle getir', type: 'eliminate', group: 'port', after: 'o3' },
      { id: 'o5', text: 'TIR\'ı merkez kapısına teslim et', type: 'reach', who: 'vehicle', vehicle: () => MM().tir, zone: C(-150, 114, 12), after: 'o4' },
    ],
    side: [
      { id: 's1', text: 'Sivil kayıp olmasın', type: 'noCivLoss' },
      { id: 's2', text: 'Sürücüyü canlı gözaltına al', type: 'arrest', target: () => MM().driver },
      { id: 's3', text: 'İlk denemede doğru dorseyi bul', type: 'check', fn: (M) => !M.flags.wrongTruck },
    ],
    setup(M) {
      const plates = ['34 SA 1907', '34 SA 1453', '34 SA 2071'];
      M.item({ id: 'p1_doc1', tag: 'pdoc', name: 'Sevk fişi', desc: 'Plaka "...14.." ile başlıyor', x: 250, y: 1.1, z: 33 });
      M.item({ id: 'p1_doc2', tag: 'pdoc', name: 'Yükleme listesi', desc: 'Dorse "34 SA" serisi, son iki hane 53', x: 218, z: 30 });
      M.item({ id: 'p1_doc3', tag: 'pdoc', name: 'Şoför notu', desc: '"Ortadaki dorse değil, kırmızı lambalı olan"', x: 240, z: 78 });
      const trucks = [];
      for (let i = 0; i < 3; i++) {
        const v = M.veh('truck', { x: 222 + i * 12, z: 60, yaw: Math.PI, team: 'mafia' }); v.parked = true; v.locked = true; trucks.push(v);
        M.interact({ id: 'p1_plate' + i, x: 222 + i * 12, y: 1.4, z: 64.8, r: 2.6, enabled: () => !M.flags.rightTruck && M.obj('o2').state === 'active', label: () => `Plakayı incele: ${plates[i]}`,
          use: () => {
            if (i === 1) { M.setFlag('rightTruck'); K.ui.toast('Doğru araç: ' + plates[i], 'ok'); M.startConvoy(v); }
            else { M.flags.wrongTruck = true; K.ui.toast('Bu araç değil — zaman kaybı!', 'bad'); for (const e of G().enemies) if (e.threat && e.dist(G().player.pos) < 25) e.susp = Math.max(e.susp, 55); }
          } });
      }
      trucks[1].setLights(true);
      M.car = M.veh('sedan', { x: 214, z: 96, yaw: Math.PI, color: 0x2a2a2e });
      const g = (x, z, o = {}) => { const p = snap(x, z); return M.enemy(Object.assign({ x: p.x, z: p.z, accuracy: 0.5, range: 22 }, o)); };
      g(232, 30, { patrol: npts([[232, 30, 3], [232, 80, 3]]) }); g(250, 70, { yaw: Math.PI });
      M.startConvoy = (v) => {
        M.tir = v; v.parked = false; v.locked = false;
        M.radio('Komuta', 'Doğru araç hareket ediyor. Mesafeyi koru, 20 metreden fazla yaklaşma!', true);
        M.after(4, () => { v.ai = { path: [{ x: 234, z: 92 }, { x: 204, z: 100 }, { x: 203, z: 124 }, { x: 196, z: 150 }, { x: 175, z: 152 }], idx: 0, speed: 8, reach: 8, ignoreBlock: true, onEnd: () => { M.portAmbush(v); } }; v.setLights(true); });
      };
      M.portAmbush = (v) => {
        const c = v.pos;
        M.driver = M.enemy({ x: c.x + 2.5, z: c.z, name: 'TIR şoförü', weapon: 'pistol_s', accuracy: 0.35, tags: ['port'] });
        for (const [dx, dz] of [[-4, 4], [5, 5], [0, 8]]) { const p = snap(c.x + dx, c.z + dz); M.enemy({ x: p.x, z: p.z, tags: ['port'], accuracy: 0.5 }); }
        M.radio('Komuta', 'TIR durdu. Sürücü ve korumalar dışarıda — müdahale et!');
      };
    },
  });

  // ════════════════════════════════════════════════ EK-2 · HAVA KÖPRÜSÜ
  LIST.push({
    id: 'p2', no: 'EK-2', pack: true, title: 'HAVA KÖPRÜSÜ', place: 'Şehir geneli', type: 'Helikopter pilotluğu, yaralı tahliyesi', rank: 7,
    time: 'day', weather: 'clear', stealth: false, squadMax: 0, par: 420, civMax: 6,
    brief: 'Şehrin üç noktasında yaralılar havadan tahliye bekliyor. Helikopteri sen uçuracaksın: üç iniş bölgesine in, yaralıları al ve hastane çatısındaki pide in.',
    risks: ['Sert iniş helikoptere zarar verir.', 'Rotorlar binalara çarpabilir.', 'Süre önemlidir.'],
    recommend: 'W/S ileri-geri, A/D dönüş, Boşluk yüksel, Ctrl/C alçal. Fare ile kamera.',
    unlockText: 'Ek puan',
    insertion: { type: 'walk', x: -156, z: 205, yaw: Math.PI / 2 },
    objectives: [
      { id: 'o1', text: 'Helikoptere pilot olarak bin ve kalkış yap', type: 'flag', flag: 'takeoff', at: { x: -150, z: 205 } },
      { id: 'o2', text: 'İniş bölgelerinden yaralıları al', type: 'collect', tag: 'lz', count: 3, after: 'o1', where: (M) => M.nextLZ() },
      { id: 'o3', text: 'Hastane çatısındaki pide in', type: 'flag', flag: 'hospital', after: 'o2', at: { x: -30, z: 150, y: 22 } },
    ],
    side: [
      { id: 's1', text: '7 dakikanın altında tamamla', type: 'time', t: 420 },
      { id: 's2', text: 'Helikopteri %70 üzerinde koru', type: 'vehHealth', vehicle: () => MM().heli, frac: 0.7 },
      { id: 's3', text: 'Yaralı kaybı olmasın', type: 'noCivLoss' },
    ],
    setup(M) {
      M.heli = M.veh('heli', { x: -150, z: 205, yaw: Math.PI / 2 });
      M.lzs = [{ x: 0, z: -24, name: 'Meydan' }, { x: -200, z: 40, name: 'Kırmızı bölge' }, { x: -40, z: -262, name: 'Dağ üssü' }].map((l) => Object.assign(l, { done: false, t: 0 }));
      for (const l of M.lzs) { l.civs = civGroup(M, 2, l.x + 9, l.z, 2, { state: 'idle', pose: 'downed', tags: ['wounded'], name: 'Yaralı', escortable: false, panicImmune: true }); for (const c of l.civs) { c.anim.pose = 'downed'; c.basePose = 'downed'; } }
      M.nextLZ = () => { const l = M.lzs.find((x) => !x.done); return l ? { x: l.x, z: l.z } : null; };
    },
    update(M, dt) {
      const P = G().player, h = M.heli;
      if (!M.flags.takeoff && P.vehicle === h && h.seats[0].actor === P && h.flying) M.setFlag('takeoff');
      if (M.obj('o2').state === 'active' && P.vehicle === h && !h.flying) {
        for (const l of M.lzs) {
          if (l.done) continue;
          if (Math.hypot(h.pos.x - l.x, h.pos.z - l.z) < 14) {
            l.t += dt;
            if (l.t > 0.2 && l.t - dt <= 0.2) K.ui.toast(`${l.name}: yaralılar biniyor...`);
            if (l.t >= 4) { l.done = true; for (const c of l.civs) { c.safe = true; c.visible = false; c.root.visible = false; } G().stats.civSaved += 2; M.addCount('lz', null, `${l.name} tahliye edildi`, '2 yaralı helikopterde'); }
          } else l.t = 0;
        }
      }
      if (M.obj('o3').state === 'active' && P.vehicle === h && !h.flying && Math.hypot(h.pos.x + 30, h.pos.z - 150) < 9 && h.pos.y > 18) M.setFlag('hospital');
    },
  });

  // ════════════════════════════════════════════════ EK-3 · ÇELİK HAT
  LIST.push({
    id: 'p3', no: 'EK-3', pack: true, title: 'ÇELİK HAT', place: 'Ana caddeler', type: 'Zırhlı konvoy, savunma', rank: 4,
    time: 'dusk', weather: 'clear', stealth: false, squadMax: 5, par: 360,
    brief: 'Delil arşivini taşıyan 8x8 personel taşıyıcıyı ana caddeler boyunca dört kontrol noktasından geçir. Yolda pusular olacak: dur, ekibi indir ve savun, ya da hızla geç.',
    risks: ['Araç imha olursa görev başarısız.', 'Pusular 2. ve 3. kontrol noktalarında.', 'Araçtan inen ekibi geri bindirmeyi unutma.'],
    recommend: 'Çelik Kuvvet. "Araçtan in" ve "Araca bin" komutlarını kullan.',
    unlockText: 'Ek puan',
    insertion: { type: 'vehicle', vehicle: 'apc', x: -150, z: 124, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'Kontrol noktalarından geç', type: 'collect', tag: 'cp', count: 4, where: (M) => M.nextCP() },
      { id: 'o2', text: 'Taşıyıcıyı hedefe ulaştır', type: 'reach', who: 'vehicle', vehicle: () => MM().apc, zone: C(200, -3, 10), after: 'o1' },
    ],
    side: [
      { id: 's1', text: 'Taşıyıcıyı %70 üzerinde koru', type: 'vehHealth', vehicle: () => MM().apc, frac: 0.7 },
      { id: 's2', text: 'Tüm ekip hayatta kalsın', type: 'teamAlive' },
      { id: 's3', text: '6 dakikanın altında tamamla', type: 'time', t: 360 },
    ],
    setup(M) {
      M.cps = [{ x: -70, z: 105 }, { x: -67, z: 3 }, { x: 70, z: 3 }, { x: 130, z: 3 }].map((c, i) => Object.assign(c, { i, done: false }));
      M.nextCP = () => { const c = M.cps.find((x) => !x.done); return c ? { x: c.x, z: c.z } : null; };
    },
    onActiveVehicle: true,
    update(M) {
      M.apc = M.apc || G().vehicles.find((v) => v.type === 'apc');
      const v = M.apc; if (!v) return;
      if (!v.alive && M.state === 'active') { M.fail('Taşıyıcı imha edildi'); return; }
      const c = M.cps.find((x) => !x.done);
      if (c && Math.hypot(v.pos.x - c.x, v.pos.z - c.z) < 12) {
        c.done = true; M.addCount('cp', null, `Kontrol noktası ${c.i + 1}`, 'geçildi');
        if (c.i === 0) { M.radio('Komuta', 'Ana caddede pusu bildirildi. Dikkat!'); wave(M, [[-74, 30], [-62, 34], [-76, 20], [-60, 24], [-58, 40]], { accuracy: 0.42 }); }
        if (c.i === 1) { wave(M, [[30, 8], [36, -8], [44, 8], [50, -6], [40, 12]], { accuracy: 0.45 }); }
      }
    },
  });

  // ════════════════════════════════════════════════ EK-4 · KAYBOLAN KANIT
  LIST.push({
    id: 'p4', no: 'EK-4', pack: true, title: 'KAYBOLAN KANIT', place: 'Eski şehir — kafe terası', type: 'Diyalog ve bulmaca (ateşsiz)', rank: 1, needs: ['m01'],
    time: 'day', weather: 'clear', stealth: false, squadMax: 0, par: 300, forceOutfit: 'civil', noWeapons: true, evidenceMax: 3,
    brief: 'Siyah Akrep\'e ait bir USB bellek kafe terasında el değiştirdi. Üç tanıkla konuş, fiziksel ipuçlarını incele ve kanıtı kimin sakladığını belirle. Silah kullanılmayacak; çözüm diyalog ve dikkatle gelir.',
    risks: ['Yanlış suçlama kanıtı kaybettirir (görev başarısız).', 'Tanıklardan biri yalan söylüyor.'],
    recommend: 'Sivil görünüm. Her ifadeyi fiziksel ipuçlarıyla karşılaştır.',
    unlockText: 'Ek puan ve delil',
    insertion: { type: 'walk', x: -112, z: -44, yaw: Math.PI },
    objectives: [
      { id: 'o1', text: 'Tanıklarla konuş', type: 'collect', tag: 'witness', count: 3, where: (M) => M.nextWitness() },
      { id: 'o2', text: 'Fiziksel ipuçlarını incele', type: 'collect', tag: 'pclue', count: 2, where: (M) => nearestItem(M, 'pclue') },
      { id: 'o3', text: 'Kanıtı saklayanı belirle (deftere not al)', type: 'flag', flag: 'solved', after: ['o1', 'o2'], at: { x: -110, z: -56 } },
      { id: 'o4', text: 'USB belleği teslim al', type: 'flag', flag: 'usb', after: 'o3', where: (M) => M.culprit ? { x: M.culprit.pos.x, z: M.culprit.pos.z } : null },
    ],
    side: [
      { id: 's1', text: 'Silah çekme', type: 'noWeapon' },
      { id: 's2', text: '5 dakikanın altında çöz', type: 'time', t: 300 },
      { id: 's3', text: 'Tüm tanıkları dinlemeden suçlama yapma', type: 'check', fn: (M) => !M.flags.rushed },
    ],
    setup(M) {
      const w1 = M.civ({ x: -127.1, z: -62, yaw: Math.PI / 2, name: 'Garson Murat', state: 'idle', pose: 'talk', look: Object.assign(K.models.civLook(Math.random, 'm'), { uniform: 0xe8e4dc, pants: 0x1a1a1a }) });
      const w2 = M.civ({ x: -118.9, z: -53, yaw: -Math.PI / 2, name: 'Seyyar satıcı Cemil', state: 'idle', pose: 'sit' });
      const w3 = M.civ({ x: -109.1, z: -62, yaw: -Math.PI / 2, name: 'Taksici Oğuz', state: 'idle', pose: 'sit' });
      M.ws = [w1, w2, w3];
      M.culprit = w3;
      const said = (M, k) => { if (!M.flags['w_' + k]) { M.flags['w_' + k] = true; M.addCount('witness', null, 'İfade kaydedildi', ''); } };
      w1.dialogue = () => M.talk(w1, { start: 'a', nodes: {
        a: { text: 'Hoş geldiniz... Ah, polis misiniz? Ben her şeyi gördüm ama hızlı oldu.', choices: [{ t: 'Saat kaçtı ve ne gördün?', next: 'b' }] },
        b: { text: 'Saat tam 14:20\'ydi. Takım elbiseli biri, köşedeki masaya küçük bir paket bıraktı. Sonra taksici o masaya oturdu.', choices: [{ t: 'Teşekkürler Murat.', next: null, do: (M) => said(M, 1) }] },
      } });
      w2.dialogue = () => M.talk(w2, { start: 'a', nodes: {
        a: { text: 'Ben simit satıyorum abi, kimseye karışmam.', choices: [{ t: 'Köşedeki masaya kim oturdu?', next: 'b' }] },
        b: { text: 'Taksici. Sonra telefonla konuşup bir şeyi cebine koydu. Ben o sırada sırtım dönük tezgâhı topluyordum ama.', choices: [{ t: 'Anladım.', next: null, do: (M) => said(M, 2) }] },
      } });
      w3.dialogue = () => M.talk(w3, { start: M.flags.solved ? 'z' : 'a', nodes: {
        a: { text: 'Ben mi? Ben 15:00\'ten önce buraya gelmedim ki. Sabahtan beri havalimanı seferindeydim.', choices: [{ t: 'Peki.', next: null, do: (M) => said(M, 3) }] },
        z: { text: '...Tamam, tamam! Bana para verdiler, sadece bir gün saklayacaktım. Al şu belleği.', choices: [{ t: 'Akıllıca bir karar.', next: null, do: (M) => { M.setFlag('usb'); M.evidence.push('p4_usb'); K.ui.toast('USB bellek teslim alındı', 'evidence'); } }] },
      } });
      M.item({ id: 'p4_receipt', tag: 'pclue', name: 'Taksi fişi', desc: 'Kafe önü — saat 14:12 (taksicinin ifadesiyle çelişiyor!)', x: -110, y: 0.8, z: -61.6 });
      M.item({ id: 'p4_cctv', tag: 'pclue', name: 'Dükkân kamera kaydı notu', desc: '14:18 — sarı taksi kafe önüne park etti', x: -126, y: 0.8, z: -45.5 });
      M.interact({ id: 'p4_note', x: -110, y: 1.0, z: -56, r: 2, enabled: () => !M.flags.solved && M.state === 'active', label: () => 'Deftere sonuç yaz (suçlama)',
        use: () => {
          if (M.count('witness') < 3) M.flags.rushed = true;
          M.talk({ name: 'Saha defteri' }, { start: 'a', nodes: { a: { text: 'İfadeleri ve ipuçlarını karşılaştır. Kanıtı kim saklıyor?', choices: [
            { t: 'Garson Murat', next: null, do: (M) => M.fail('Yanlış suçlama — kanıt kayboldu') },
            { t: 'Seyyar satıcı Cemil', next: null, do: (M) => M.fail('Yanlış suçlama — kanıt kayboldu') },
            { t: 'Taksici Oğuz (fiş ve kamera ifadesiyle çelişiyor)', next: null, do: (M) => { M.setFlag('solved'); K.ui.toast('Doğru: Taksici yalan söyledi. Şimdi onunla konuş.', 'ok'); } },
          ] } } });
        } });
      M.nextWitness = () => { const w = M.ws.find((x, i) => !M.flags['w_' + (i + 1)]); return w ? { x: w.pos.x, z: w.pos.z } : null; };
      for (let i = 0; i < 6; i++) { const p = K.nav.randomFreeNear(0, -119, -56, 14); if (p) M.civ({ x: p.x, z: p.z, state: 'wander', ambient: true }); }
      M.hint('p4', 'Bu görevde silah kullanılamaz. Tanıklarla konuş (E), ipuçlarını topla ve ifadeleri karşılaştırarak defterde suçlamayı yap.');
    },
  });
})();
