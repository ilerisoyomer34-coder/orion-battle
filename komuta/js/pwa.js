/* KOMUTA — PWA ve telefon uyarlaması
   Ana ekrana ekleme (Android istemi, iOS yönergesi), servis çalışanı ve çevrimdışı durum,
   telefonda tam ekran + yatay kilit, dikey ekran uyarısı, oyun sırasında ekranı uyanık tutma, titreşim. */
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const PW = K.pwa = {
    deferred: null, lock: null, swReady: false,
    isMobile() { return ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia('(pointer: coarse)').matches; },
    isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; },
    isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },

    init() {
      // servis çalışanı (yalnız http(s) ve destekleyen tarayıcılarda; gömülü sayfalarda sessizce atlanır)
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').then((reg) => {
          this.swReady = true;
          reg.addEventListener('updatefound', () => {
            const w = reg.installing; if (!w) return;
            w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) this.notice('Yeni sürüm hazır — yeniden başlatınca yüklenecek'); });
          });
        }).catch(() => {});
      }
      window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.deferred = e; this.updateButtons(); });
      window.addEventListener('appinstalled', () => { this.deferred = null; this.updateButtons(); this.notice('KOMUTA ana ekrana eklendi'); });
      // dikey ekran uyarısı
      const mq = window.matchMedia('(orientation: portrait)');
      const upd = () => document.body.classList.toggle('portrait', mq.matches && this.isMobile());
      if (mq.addEventListener) mq.addEventListener('change', upd); else if (mq.addListener) mq.addListener(upd);
      window.addEventListener('resize', upd); upd();
      // arka plana geçince duraklat, dönünce ekran kilidini yenile
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (K.game && K.game.state === 'playing' && !K.game.paused) K.game.pause(); }
        else this.wake();
      });
      document.body.classList.toggle('standalone', this.isStandalone());
      const ib = $('btnInstall'); if (ib) ib.onclick = () => this.install();
      const ic = $('iosClose'); if (ic) ic.onclick = () => $('iosHint').classList.add('hidden');
      this.updateButtons();
    },
    updateButtons() {
      const b = $('btnInstall'); if (!b) return;
      b.classList.toggle('hidden', this.isStandalone() || !(this.deferred || this.isIOS()));
    },
    async install() {
      K.audio && K.audio.ui && K.audio.ui();
      if (this.deferred) {
        const d = this.deferred; this.deferred = null;
        try { d.prompt(); await d.userChoice; } catch (e) { /* kullanıcı vazgeçti */ }
        this.updateButtons();
      } else if (this.isIOS()) $('iosHint').classList.remove('hidden');
    },
    notice(t) { if (K.ui && K.ui.toast) K.ui.toast(t, 'ok'); },

    // görev başlarken (kullanıcı tıklamasının içinde çağrılır): tam ekran, yatay kilit, uyanık ekran
    enterPlay() {
      if (this.isMobile() && K.save.data.settings.autoFull !== false) {
        const d = document.documentElement;
        try {
          if (!document.fullscreenElement && !this.isStandalone() && d.requestFullscreen) {
            const p = d.requestFullscreen({ navigationUI: 'hide' });
            if (p && p.then) p.then(() => this.lockLandscape()).catch(() => {});
          } else this.lockLandscape();
        } catch (e) { /* desteklenmiyor */ }
      }
      this.wake();
    },
    lockLandscape() { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) { /* yok */ } },
    async wake() {
      if (!('wakeLock' in navigator) || !K.game || K.game.state !== 'playing' || document.hidden) return;
      if (this.lock) return;
      try { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } catch (e) { this.lock = null; }
    },
    releaseWake() { if (this.lock) { try { this.lock.release(); } catch (e) { /* zaten bırakıldı */ } this.lock = null; } },
    buzz(ms) {
      if (!this.isMobile() || K.save.data.settings.vibrate === false || !navigator.vibrate) return;
      try { navigator.vibrate(ms); } catch (e) { /* izin yok */ }
    },

    // çevrimdışı hazır mı: açılışta yüklenen bütün model dosyaları önbellekte mi
    async offlineStatus() {
      if (!('caches' in window) || !this.swReady && !navigator.serviceWorker?.controller) return null;
      const D = K.ASSETDATA, urls = [];
      for (const id in D.characters) { urls.push(D.characters[id].file); if (D.characters[id].lod) urls.push(D.characters[id].lod); }
      if (D.world) for (const k in D.world.files) urls.push(D.world.files[k]);
      for (const id in D.weapons) urls.push(D.weapons[id].file);
      let have = 0;
      for (const u of urls) { try { if (await caches.match(new URL(u, location.href).href)) have++; } catch (e) { /* önbellek erişilemedi */ } }
      return { have, total: urls.length };
    },
    // kurulu uygulamada tüm silah modellerini arka planda indir (çevrimdışı oyun için)
    precacheAll() {
      if (!this.isStandalone()) return;
      const ids = Object.keys(K.WEAPONS);
      let i = 0;
      const next = () => { if (i >= ids.length) return; K.assets.preloadWeapons([ids[i++]]); setTimeout(next, 400); };
      setTimeout(next, 4000);
    },
  };
})();
