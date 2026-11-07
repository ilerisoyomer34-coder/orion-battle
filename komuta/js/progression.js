/* KOMUTA — ilerleme: rütbeler, birlikler, kadro, yetenek ağacı, kilit açma, ödüller */
'use strict';
(function () {
  K.RANKS = [
    { name: 'Aday Tim Lideri', xp: 0, squad: 0, unlock: 'Tek ajan, temel komutlar', insignia: 'o' },
    { name: 'Teğmen', xp: 250, squad: 2, unlock: '3 kişilik ekip, telsiz, komut tekeri', req: ['m01'], insignia: '*' },
    { name: 'Üsteğmen', xp: 800, squad: 4, unlock: '5 kişilik ekip, gelişmiş ekipman (HMS-7, keşif dronu, gece görüş)', req: ['m02'], insignia: '**' },
    { name: 'Yüzbaşı', xp: 1600, squad: 4, unlock: 'Çelik Kuvvet timi, ağır zırh, KN-2 ve AM-3', req: ['m03'], insignia: '***' },
    { name: 'Binbaşı', xp: 2600, squad: 5, unlock: 'Çevik Kuvvet, 8x8 personel taşıyıcı, pompalı tüfek', req: ['m04'], insignia: 'S' },
    { name: 'Yarbay', xp: 3800, squad: 6, unlock: 'Özel Harekât, iki ayrı tim (A/B) yönetimi', req: ['m05'], insignia: 'S*' },
    { name: 'Albay', xp: 5000, squad: 6, unlock: 'Seçkin Birlik (Kızıl Bere)', req: ['m06'], insignia: 'S**' },
    { name: 'Tuğgeneral', xp: 6400, squad: 8, unlock: 'Helikopter pilotluğu, tank desteği, çoklu takım', req: ['m07', 'm08'], insignia: 'G*' },
    { name: 'Orgeneral', xp: 8000, squad: 8, unlock: 'Kapsamlı komuta, büyük harita görevleri, final', req: ['m09'], insignia: 'G****' },
  ];

  K.UNITS = {
    agent: { id: 'agent', name: 'Gizli Ajan', look: 'agent', weapon: 'pistol_s', hp: 95, armor: 0, acc: 0.62, speed: 1.0, abilities: ['stealth', 'hack'], rank: 1, desc: 'İpucu, araştırma, takip. Sivil görünüm: şüphe çekmez; terminalleri %40 hızlı çözer.' },
    standard: { id: 'standard', name: 'Standart Tim', look: 'soldier', weapon: 'rifle', hp: 115, armor: 50, acc: 0.64, speed: 1.0, abilities: [], rank: 1, desc: 'Genel saha görevleri. Takip et, bekle, işaretlenen yere git.' },
    steel: { id: 'steel', name: 'Çelik Kuvvet', look: 'steel', weapon: 'lmg', hp: 160, armor: 110, acc: 0.58, speed: 0.88, abilities: ['guard'], rank: 3, desc: 'Koruma ve zor görev desteği. Yüksek dayanıklılık; bölge korurken %30 daha az hasar.' },
    riot: { id: 'riot', name: 'Çevik Kuvvet', look: 'riot', weapon: 'pistol_s', shield: true, hp: 135, armor: 90, acc: 0.52, speed: 0.95, abilities: ['barrier', 'civil'], rank: 4, desc: 'Kalabalık kontrolü ve tahliye. Kalkan, bariyer kurma, sivil yönlendirme.' },
    special: { id: 'special', name: 'Özel Harekât', look: 'special', weapon: 'smg_s', hp: 125, armor: 70, acc: 0.76, speed: 1.1, abilities: ['breach', 'fast'], rank: 5, desc: 'Gelişmiş bina içi görevler. Hızlı takım koordinasyonu, susturuculu silah.' },
    elite: { id: 'elite', name: 'Seçkin Birlik', look: 'elite', weapon: 'rifle', hp: 145, armor: 85, acc: 0.86, speed: 1.08, abilities: ['hack', 'breach', 'guard', 'medic'], rank: 6, desc: 'Geç oyun hikâye operasyonları. Birden fazla uzmanlık, gelişmiş koordinasyon.' },
  };

  K.ROSTER = [
    { id: 'arda', name: 'Çvş. Arda', unit: 'standard' },
    { id: 'mert', name: 'Uzm. Çvş. Mert', unit: 'standard' },
    { id: 'emre', name: 'Uzm. Onb. Emre', unit: 'agent' },
    { id: 'kaan', name: 'Uzm. Onb. Kaan', unit: 'standard' },
    { id: 'baris', name: 'Çvş. Barış', unit: 'steel' },
    { id: 'tolga', name: 'Uzm. Çvş. Tolga', unit: 'steel' },
    { id: 'selim', name: 'Kom. Selim', unit: 'riot' },
    { id: 'cem', name: 'Kom. Yrd. Cem', unit: 'riot' },
    { id: 'yusuf', name: 'Üstçvş. Yusuf', unit: 'special' },
    { id: 'okan', name: 'Uzm. Çvş. Okan', unit: 'special' },
    { id: 'harun', name: 'Kd. Çvş. Harun', unit: 'elite' },
    { id: 'serkan', name: 'Kd. Üstçvş. Serkan', unit: 'elite' },
    { id: 'deniz', name: 'Ast. Deniz', unit: 'agent' },
  ];

  K.SKILLS = [
    { id: 'hp', branch: 'Fiziksel', name: 'Dayanıklılık', max: 3, desc: 'Azami sağlık +%15 / seviye' },
    { id: 'stamina', branch: 'Fiziksel', name: 'Koşu süresi', max: 3, desc: 'Koşu dayanıklılığı +%25 / seviye' },
    { id: 'carry', branch: 'Fiziksel', name: 'Taşıma kapasitesi', max: 2, desc: 'Her silah için +1 yedek şarjör / seviye' },
    { id: 'armor', branch: 'Fiziksel', name: 'Hasar azaltan ekipman', max: 3, desc: 'Alınan hasar −%7 / seviye (denge sınırı: %21)' },
    { id: 'aim', branch: 'Saha ve etkileşim', name: 'Nişan kararlılığı', max: 3, desc: 'Saçılma −%20, geri tepme −%30 / seviye' },
    { id: 'swap', branch: 'Saha ve etkileşim', name: 'Ekipman değiştirme', max: 3, desc: 'Şarjör ve silah değiştirme %15 daha hızlı / seviye' },
    { id: 'evidence', branch: 'Saha ve etkileşim', name: 'Delil uzmanlığı', max: 2, desc: 'Basılı tutulan etkileşimler %25 daha hızlı; deliller daha uzaktan parlar' },
    { id: 'stealth', branch: 'Saha ve etkileşim', name: 'Gizlilik göstergesi', max: 3, desc: 'Sv1: ekran dışı şüphe okları. Her seviye görülme hızını azaltır' },
    { id: 'orders', branch: 'Komuta', name: 'Emir hızı', max: 3, desc: 'Ekip tepki süresi −%28 / seviye' },
    { id: 'morale', branch: 'Komuta', name: 'Ekip morali', max: 3, desc: 'Ekip alınan hasar −%10, isabet +%5 / seviye' },
    { id: 'twoTeams', branch: 'Komuta', name: 'İkinci takım yönetimi', max: 1, desc: 'A/B tim komutlarını Yarbay rütbesinden önce açar', rank: 3 },
    { id: 'support', branch: 'Komuta', name: 'Saha desteği', max: 2, desc: 'Sv1: +1 ekip yuvası. Sv2: her görevde +1 ekipman (dron/ilk yardım/şok bombası)', rank: 2 },
  ];

  K.COSMETICS = {
    std: { name: 'Standart kamuflaj', tint: 0x6b7356 },
    urban: { name: 'Şehir kamuflajı', tint: 0x6a6e72, how: 'Herhangi bir görevi A notuyla bitir' },
    night: { name: 'Gece kamuflajı', tint: 0x2e3440, how: 'Bir gece görevini S notuyla bitir' },
    desert: { name: 'Çöl kamuflajı', tint: 0x9a8a62, how: '5 görevi tamamla' },
    gold: { name: 'Altın amblem', tint: 0x6b7356, how: 'Tüm ana görevlerde en az A notu' },
  };

  const S = () => K.save.data;
  const P = K.prog = {
    rank() { return S().rank; },
    rankDef(i = S().rank) { return K.RANKS[i]; },
    nextRank() { return K.RANKS[S().rank + 1] || null; },
    skillVal(id) { return (S().skills && S().skills[id]) || 0; },
    canUpgrade(id) {
      const sk = K.SKILLS.find((s) => s.id === id); if (!sk) return false;
      return S().skillPts > 0 && P.skillVal(id) < sk.max && (!sk.rank || S().rank >= sk.rank);
    },
    upgrade(id) { if (!P.canUpgrade(id)) return false; S().skills[id] = P.skillVal(id) + 1; S().skillPts--; K.save.write(); return true; },
    squadMax() { return K.RANKS[S().rank].squad + (S().rank >= 1 && P.skillVal('support') >= 1 ? 1 : 0); },
    unitUnlocked(u) { return S().rank >= (K.UNITS[u].rank || 0); },
    rosterAvailable() { return K.ROSTER.filter((r) => P.unitUnlocked(r.unit)); },
    weaponUnlocked(id) { const w = K.WEAPONS[id]; return w && S().rank >= (w.rank || 0); },
    gadgetUnlocked(id) { const g = K.GADGETS[id]; return g && S().rank >= (g.rank || 0); },
    outfitUnlocked(id) { const o = K.OUTFITS[id]; return o && S().rank >= (o.rank || 0); },
    vehicleUnlocked(t) {
      const r = S().rank, m = S().missions;
      if (t === 'patrol') return r >= 3 && !!(m.m04 && m.m04.done);
      if (t === 'apc' || t === 'van') return r >= 4;
      if (t === 'tank' || t === 'heli') return r >= 7;
      return true;
    },
    canTwoTeams() { return S().rank >= 5 || P.skillVal('twoTeams') >= 1; },
    missionDone(id) { return !!(S().missions[id] && S().missions[id].done); },
    missionUnlocked(def) {
      if (S().rank < (def.rank || 0)) return false;
      if (def.needs) for (const n of def.needs) if (!P.missionDone(n)) return false;
      return true;
    },
    eligibleRank() {
      const d = S(); let r = d.rank;
      while (K.RANKS[r + 1]) {
        const nx = K.RANKS[r + 1];
        if (d.xp < nx.xp) break;
        if (nx.req && !nx.req.every((m) => P.missionDone(m))) break;
        r++;
      }
      return r;
    },
    // görev sonucu → XP / rütbe / kozmetik
    award(def, rep) {
      const d = S();
      const prev = d.missions[def.id] || { done: false, best: 0, grade: '-', plays: 0 };
      const first = rep.success && !prev.done;
      let xp = 0;
      if (rep.success) {
        if (first) xp = Math.round(300 + rep.score * 0.5);
        else xp = Math.round(50 + Math.max(0, rep.score - prev.best) * 0.5);
      } else xp = Math.round(Math.min(120, rep.score * 0.08));
      d.xp += xp;
      prev.plays = (prev.plays || 0) + 1;
      if (rep.success) {
        prev.done = true;
        if (rep.score > prev.best) { prev.best = rep.score; prev.grade = rep.grade; }
        else if (prev.grade === '-') prev.grade = rep.grade;
      }
      d.missions[def.id] = prev;
      // delil ve kararlar
      for (const e of rep.evidence || []) if (!d.evidence.includes(e)) d.evidence.push(e);
      for (const r of rep.rescued || []) if (!d.rescued.includes(r)) d.rescued.push(r);
      Object.assign(d.decisions, rep.decisions || {});
      d.stats.kills += rep.kills; d.stats.arrests += rep.arrests; d.stats.takedowns += rep.takedowns;
      d.stats.civSaved += rep.civSaved; d.stats.civLost += rep.civLost; d.stats.playTime += rep.time;
      if (first) d.stats.missionsDone++;
      // yetenek puanı: ilk S notu
      let bonusPts = 0;
      if (rep.success && rep.grade === 'S' && !prev.sAwarded) { prev.sAwarded = true; d.skillPts++; bonusPts++; }
      // kozmetikler
      const newCos = [];
      const give = (c) => { if (!d.cosmetics.includes(c)) { d.cosmetics.push(c); newCos.push(c); } };
      if (rep.success && (rep.grade === 'A' || rep.grade === 'S')) give('urban');
      if (rep.success && rep.grade === 'S' && def.time === 'night') give('night');
      if (Object.values(d.missions).filter((m) => m.done).length >= 5) give('desert');
      const mains = K.MISSIONS.filter((m) => !m.pack);
      if (mains.every((m) => d.missions[m.id] && (d.missions[m.id].grade === 'A' || d.missions[m.id].grade === 'S'))) give('gold');
      // rütbe
      const before = d.rank, after = P.eligibleRank();
      const ranks = [];
      for (let r = before + 1; r <= after; r++) { ranks.push(r); d.skillPts++; }
      d.rank = after;
      if (def.final && rep.success) d.campaignDone = true;
      K.save.write();
      return { xp, first, ranks, newCos, bonusPts };
    },
  };
})();
