/* KOMUTA — prosedürel dokular (canvas) */
'use strict';
(function () {
  const U = K.U;
  const T = K.tex = {};

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function toTex(c, { repeat = true, srgb = true, aniso = 8 } = {}) {
    const t = new THREE.CanvasTexture(c);
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    t.needsUpdate = true;
    return t;
  }
  function speckle(g, w, h, n, colA, colB, size = 1) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() < 0.5 ? colA : colB;
      g.globalAlpha = Math.random() * 0.25;
      const s = size * (0.5 + Math.random());
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    g.globalAlpha = 1;
  }
  function rnd(r) { return r(); }

  // Pencere cephesi: tek doku 4x4 pencere hücresi; ikiz emissive doku (gece ışıkları)
  function facade(opts) {
    const { base, frame, glass, cols = 4, rows = 4, winW = 0.62, winH = 0.55, style = 'grid', seed = 1, ledge } = opts;
    const S = 512, [c, g] = cv(S, S), [ce, ge] = cv(S, S);
    const r = U.rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    speckle(g, S, S, 6000, '#000', '#fff', 2);
    ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
    const cw = S / cols, ch = S / rows;
    for (let y = 0; y < rows; y++) {
      if (ledge) { g.fillStyle = ledge; g.fillRect(0, y * ch + ch - 6, S, 6); }
      for (let x = 0; x < cols; x++) {
        const ww = cw * winW, wh = ch * winH;
        const wx = x * cw + (cw - ww) / 2, wy = y * ch + (ch - wh) * 0.42;
        if (style === 'glass') {
          g.fillStyle = glass; g.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 10);
          const grd = g.createLinearGradient(x * cw, y * ch, x * cw + cw, y * ch + ch);
          grd.addColorStop(0, 'rgba(255,255,255,0.10)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.0)'); grd.addColorStop(1, 'rgba(255,255,255,0.06)');
          g.fillStyle = grd; g.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 10);
          g.fillStyle = frame; g.fillRect(x * cw, y * ch, 3, ch); g.fillRect(x * cw, y * ch + ch - 8, cw, 8);
          g.fillRect(x * cw + cw / 2 - 1, y * ch, 2, ch);
        } else {
          g.fillStyle = frame; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
          g.fillStyle = glass; g.fillRect(wx, wy, ww, wh);
          g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(wx, wy, ww * 0.45, wh);
          g.fillStyle = frame; g.fillRect(wx + ww / 2 - 2, wy, 4, wh);
          if (style === 'old') { // panjur
            g.fillStyle = opts.shutter || '#5b4632';
            g.fillRect(wx - ww * 0.32, wy, ww * 0.28, wh); g.fillRect(wx + ww * 1.04, wy, ww * 0.28, wh);
            g.fillStyle = 'rgba(0,0,0,0.25)';
            for (let k = 0; k < 6; k++) { g.fillRect(wx - ww * 0.32, wy + k * wh / 6, ww * 0.28, 2); g.fillRect(wx + ww * 1.04, wy + k * wh / 6, ww * 0.28, 2); }
          }
          if (style === 'apt' && y % 1 === 0) { // balkon
            g.fillStyle = 'rgba(40,40,45,0.9)'; g.fillRect(wx - 8, wy + wh + 2, ww + 16, 5);
            for (let k = 0; k < 8; k++) g.fillRect(wx - 8 + k * (ww + 16) / 7, wy + wh * 0.62, 2, wh * 0.4);
          }
        }
        // gece ışığı
        if (r() < 0.38) {
          const warm = r() < 0.7;
          ge.fillStyle = warm ? `rgba(255,${190 + Math.floor(r() * 40)},${110 + Math.floor(r() * 50)},1)` : 'rgba(170,210,255,1)';
          if (style === 'glass') ge.fillRect(x * cw + 4, y * ch + 4, cw - 8, ch - 14);
          else ge.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
          ge.fillStyle = 'rgba(0,0,0,0.35)';
          if (r() < 0.5) ge.fillRect(wx + ww * r(), wy, ww * 0.2, wh);
        }
      }
    }
    return { map: toTex(c), emissive: toTex(ce) };
  }

  T.build = function () {
    const r = U.rng(42);
    // asfalt
    {
      const S = 512, [c, g] = cv(S, S);
      g.fillStyle = '#2d2f33'; g.fillRect(0, 0, S, S);
      speckle(g, S, S, 30000, '#111', '#6a6a6a', 2);
      g.strokeStyle = 'rgba(15,15,15,0.5)'; g.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(20,20,22,0.35)'; g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 50, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
      T.asphalt = toTex(c);
    }
    // kaldırım
    {
      const S = 256, [c, g] = cv(S, S);
      g.fillStyle = '#8d8a84'; g.fillRect(0, 0, S, S);
      speckle(g, S, S, 6000, '#555', '#bbb', 2);
      g.strokeStyle = 'rgba(40,40,40,0.55)'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, S); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(S, i * 64); g.stroke(); }
      T.sidewalk = toTex(c);
    }
    // beton zemin / meydan taşı
    {
      const S = 256, [c, g] = cv(S, S);
      g.fillStyle = '#7b7a76'; g.fillRect(0, 0, S, S);
      speckle(g, S, S, 9000, '#4a4a48', '#a8a7a2', 2);
      g.strokeStyle = 'rgba(30,30,30,0.35)'; g.lineWidth = 1;
      for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, S); g.stroke(); }
      for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(S, i * 32); g.stroke(); }
      T.paving = toTex(c);
      const [c2, g2] = cv(S, S);
      g2.fillStyle = '#82807a'; g2.fillRect(0, 0, S, S); speckle(g2, S, S, 12000, '#555', '#aaa', 2);
      for (let i = 0; i < 20; i++) { g2.fillStyle = 'rgba(60,55,50,0.15)'; g2.beginPath(); g2.ellipse(r() * S, r() * S, 10 + r() * 30, 8 + r() * 20, 0, 0, 7); g2.fill(); }
      T.concrete = toTex(c2);
    }
    // çim / toprak / kaya (arazi vertex rengiyle karışır)
    {
      const S = 256, [c, g] = cv(S, S);
      g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, S, S);
      speckle(g, S, S, 25000, '#555', '#eee', 2);
      for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '60,60,60' : '230,230,230'},0.25)`; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5); g.stroke(); }
      T.ground = toTex(c);
    }
    // iç mekân: sıva duvar, fayans, halı, ahşap
    {
      const S = 256;
      let [c, g] = cv(S, S);
      g.fillStyle = '#d8d3c8'; g.fillRect(0, 0, S, S); speckle(g, S, S, 5000, '#a9a49a', '#fff', 2);
      g.fillStyle = '#6d665c'; g.fillRect(0, S - 14, S, 14);
      T.plaster = toTex(c);
      [c, g] = cv(S, S);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#c7c3ba' : '#bdb8ae'; g.fillRect(x * 64, y * 64, 64, 64); }
      speckle(g, S, S, 4000, '#888', '#eee', 2);
      g.strokeStyle = 'rgba(80,80,80,0.5)'; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, S); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(S, i * 64); g.stroke(); }
      T.tiles = toTex(c);
      [c, g] = cv(S, S);
      g.fillStyle = '#3d4552'; g.fillRect(0, 0, S, S); speckle(g, S, S, 20000, '#222a33', '#5a6577', 1);
      T.carpet = toTex(c);
      [c, g] = cv(S, S);
      for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${35 + r() * 15}%,${28 + r() * 10}%)`; g.fillRect(0, i * 32, S, 32); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, i * 32, S, 2); }
      for (let i = 0; i < 300; i++) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); const y = r() * S; g.moveTo(0, y); g.bezierCurveTo(80, y + 4, 160, y - 4, S, y + 2); g.stroke(); }
      T.wood = toTex(c);
      // metal levha (depo/endüstri iç duvarı)
      [c, g] = cv(S, S);
      g.fillStyle = '#7c838a'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'; g.fillRect(i * 16, 0, 8, S); }
      speckle(g, S, S, 4000, '#3a3a3a', '#ccc', 2);
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(120,70,30,0.15)'; g.beginPath(); g.ellipse(r() * S, r() * S, 4 + r() * 18, 10 + r() * 40, 0, 0, 7); g.fill(); }
      T.metal = toTex(c);
    }
    // cepheler
    T.facades = {
      glass: facade({ base: '#4a5563', frame: '#2a2f36', glass: '#3c5a74', style: 'glass', seed: 11, cols: 4, rows: 4 }),
      office: facade({ base: '#b9ae9c', frame: '#5d5a54', glass: '#334252', style: 'grid', seed: 12, ledge: '#9c927f' }),
      old: facade({ base: '#c7a987', frame: '#6c5440', glass: '#2b2a2a', style: 'old', seed: 13, winW: 0.42, winH: 0.5, shutter: '#4f6b55' }),
      old2: facade({ base: '#a99a8a', frame: '#56483c', glass: '#2b2a2a', style: 'old', seed: 14, winW: 0.4, winH: 0.5, shutter: '#7a3e2c' }),
      apt: facade({ base: '#d4cbbb', frame: '#77706a', glass: '#33404e', style: 'apt', seed: 15, ledge: '#b8ae9e' }),
      ind: (() => {
        const S = 512, [c, g] = cv(S, S), [ce, ge] = cv(S, S);
        g.fillStyle = '#6f777d'; g.fillRect(0, 0, S, S);
        for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.07)'; g.fillRect(i * 8, 0, 4, S); }
        speckle(g, S, S, 8000, '#333', '#ccc', 2);
        for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(110,60,25,0.18)'; g.fillRect(r() * S, r() * S * 0.3 + S * 0.7, 3 + r() * 8, 20 + r() * 60); }
        g.fillStyle = '#3b4a57'; g.fillRect(0, 60, S, 40); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, 60, S, 6);
        ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S); ge.fillStyle = 'rgba(255,220,160,0.6)'; ge.fillRect(0, 64, S, 32);
        return { map: toTex(c), emissive: toTex(ce) };
      })(),
    };
    // çatı
    {
      const S = 256, [c, g] = cv(S, S);
      g.fillStyle = '#55575a'; g.fillRect(0, 0, S, S); speckle(g, S, S, 12000, '#333', '#888', 2);
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) g.fillRect(r() * S, r() * S, 20 + r() * 30, 20 + r() * 30);
      T.roof = toTex(c);
    }
    // Karakter / araç atlası: 4 bölge
    {
      const S = 512, [c, g] = cv(S, S), h = S / 2;
      // sol üst: kamuflaj (gri tonlu — vertex rengiyle boyanır)
      g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, h, h);
      const camo = ['#8a8a8a', '#e6e6e6', '#5a5a5a', '#a8a8a8'];
      for (let i = 0; i < 180; i++) {
        g.fillStyle = camo[i % 4]; g.beginPath();
        const x = r() * h, y = r() * h; g.moveTo(x, y);
        for (let k = 0; k < 7; k++) g.lineTo(x + (r() - 0.5) * 46, y + (r() - 0.5) * 46);
        g.fill();
      }
      speckle(g, h, h, 3000, '#555', '#fff', 2);
      // sağ üst: kumaş
      g.fillStyle = '#e0e0e0'; g.fillRect(h, 0, h, h);
      for (let i = 0; i < h; i += 3) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(h, i, h, 1); g.fillRect(h + i, 0, 1, h); }
      speckle(g, h, h, 3000, '#999', '#fff', 1);
      // sol alt: düz beyaz
      g.fillStyle = '#ffffff'; g.fillRect(0, h, h, h);
      speckle(g, h, h, 1500, '#ddd', '#fff', 2);
      // sağ alt: metal panel
      g.fillStyle = '#d6d6d6'; g.fillRect(h, h, h, h);
      speckle(g, h, h, 6000, '#999', '#fff', 2);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
      for (let i = 0; i < 4; i++) { g.strokeRect(h + 6 + i * 62, h + 6, 56, 118); g.strokeRect(h + 6 + i * 62, h + 130, 56, 118); }
      g.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(h + 10 + (i % 10) * 25, h + 10 + Math.floor(i / 10) * 64, 2, 0, 7); g.fill(); }
      T.atlas = toTex(c, { repeat: false });
      // UV bölgeleri (three: v=0 alt)
      T.R = {
        CAMO: [0, 0.5, 0.5, 1], FABRIC: [0.5, 0.5, 1, 1], FLAT: [0, 0, 0.5, 0.5], METAL: [0.5, 0, 1, 0.5],
      };
    }
    // tank paleti
    {
      const S = 128, [c, g] = cv(S, S);
      g.fillStyle = '#2b2b2b'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 8; i++) { g.fillStyle = '#4a4a4a'; g.fillRect(0, i * 16 + 2, S, 10); g.fillStyle = '#1a1a1a'; g.fillRect(0, i * 16 + 12, S, 3); g.fillStyle = '#5c5c5c'; g.fillRect(S / 2 - 8, i * 16 + 3, 16, 8); }
      T.track = toTex(c);
    }
    // konteyner (oluklu, gri — instance rengiyle)
    {
      const S = 256, [c, g] = cv(S, S);
      g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)'; g.fillRect(i * 8, 0, 4, S); }
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, S, 8); g.fillRect(0, S - 8, S, 8);
      speckle(g, S, S, 3000, '#666', '#fff', 2);
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(100,50,20,0.25)'; g.fillRect(r() * S, r() * S, 2 + r() * 6, 10 + r() * 30); }
      T.container = toTex(c);
    }
    // ahşap sandık
    {
      const S = 128, [c, g] = cv(S, S);
      g.fillStyle = '#8a6a43'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, i * 22, S, 2); }
      g.strokeStyle = '#5b4429'; g.lineWidth = 10; g.strokeRect(5, 5, S - 10, S - 10);
      g.beginPath(); g.moveTo(8, 8); g.lineTo(S - 8, S - 8); g.stroke();
      T.crate = toTex(c);
    }
    // örgü tel çit (alfa)
    {
      const S = 128, [c, g] = cv(S, S);
      g.clearRect(0, 0, S, S); g.strokeStyle = 'rgba(190,195,200,1)'; g.lineWidth = 2;
      for (let i = -S; i < S * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); g.beginPath(); g.moveTo(i, S); g.lineTo(i + S, 0); g.stroke(); }
      T.fence = toTex(c, { srgb: true });
    }
    // parçacık / parıltı
    {
      const S = 64, [c, g] = cv(S, S);
      const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, S, S);
      T.soft = toTex(c, { repeat: false });
      const [c2, g2] = cv(128, 128);
      const gr2 = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr2.addColorStop(0, 'rgba(255,240,210,1)'); gr2.addColorStop(0.12, 'rgba(255,220,160,0.8)'); gr2.addColorStop(0.4, 'rgba(255,190,110,0.18)'); gr2.addColorStop(1, 'rgba(255,180,90,0)');
      g2.fillStyle = gr2; g2.fillRect(0, 0, 128, 128);
      T.glow = toTex(c2, { repeat: false });
      const [c3, g3] = cv(64, 64);
      const gr3 = g3.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr3.addColorStop(0, 'rgba(255,255,255,0.9)'); gr3.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr3.addColorStop(1, 'rgba(255,255,255,0)');
      g3.fillStyle = gr3; g3.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 30; i++) { g3.fillStyle = 'rgba(0,0,0,0.06)'; g3.beginPath(); g3.arc(16 + r() * 32, 16 + r() * 32, 3 + r() * 8, 0, 7); g3.fill(); }
      T.smoke = toTex(c3, { repeat: false });
    }
    // helikopter pisti
    {
      const S = 256, [c, g] = cv(S, S);
      g.clearRect(0, 0, S, S);
      g.strokeStyle = '#f2f2f2'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
      g.fillStyle = '#f2f2f2'; g.font = 'bold 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 128, 136);
      g.strokeStyle = '#e8c547'; g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.stroke();
      T.helipad = toTex(c, { repeat: false });
    }
    // kurgusal örgüt logosu: SİYAH AKREP LOJİSTİK
    {
      const [c, g] = cv(1024, 256);
      g.fillStyle = '#3d0f14'; g.fillRect(0, 0, 1024, 256);
      const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, 'rgba(255,255,255,0.08)'); grd.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = grd; g.fillRect(0, 0, 1024, 256);
      g.fillStyle = '#d9b46a';
      // akrep sembolü (basit)
      g.save(); g.translate(130, 128);
      g.beginPath(); g.ellipse(0, 10, 26, 40, 0, 0, 7); g.fill();
      for (let i = 0; i < 4; i++) { g.fillRect(-60, -10 + i * 14, 120, 5); }
      g.beginPath(); g.arc(0, -55, 30, Math.PI * 0.2, Math.PI * 1.6); g.lineWidth = 9; g.strokeStyle = '#d9b46a'; g.stroke();
      g.beginPath(); g.moveTo(22, -78); g.lineTo(38, -70); g.lineTo(24, -62); g.fill();
      g.restore();
      g.font = 'bold 96px Arial'; g.textBaseline = 'middle'; g.fillText('SİYAH AKREP', 220, 100);
      g.font = 'bold 46px Arial'; g.fillStyle = '#e7e2d6'; g.fillText('LOJİSTİK  ·  ULUSLARARASI NAKLİYE', 224, 185);
      T.mafiaLogo = toTex(c, { repeat: false });
    }
    // KOMUTA amblemi
    {
      const [c, g] = cv(256, 256);
      g.clearRect(0, 0, 256, 256);
      g.fillStyle = '#1c2a1d'; g.beginPath(); g.moveTo(128, 10); g.lineTo(240, 60); g.lineTo(220, 190); g.lineTo(128, 246); g.lineTo(36, 190); g.lineTo(16, 60); g.closePath(); g.fill();
      g.strokeStyle = '#d4874a'; g.lineWidth = 8; g.stroke();
      g.fillStyle = '#e9e1cf'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 26 : 62; g.lineTo(128 + Math.cos(a) * rr, 118 + Math.sin(a) * rr); }
      g.fill();
      g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillStyle = '#d4874a'; g.fillText('KOMUTA', 128, 215);
      T.emblem = toTex(c, { repeat: false });
    }
    // bayrak
    {
      const [c, g] = cv(256, 170);
      g.fillStyle = '#e30a17'; g.fillRect(0, 0, 256, 170);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(96, 85, 42, 0, 7); g.fill();
      g.fillStyle = '#e30a17'; g.beginPath(); g.arc(107, 85, 34, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + Math.PI / 2, rr = i % 2 ? 8 : 21; g.lineTo(155 + Math.cos(a) * rr, 85 + Math.sin(a) * rr); }
      g.fill();
      T.flag = toTex(c, { repeat: false });
    }
    // belge / ekran
    {
      const [c, g] = cv(128, 128);
      g.fillStyle = '#efe9da'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#9c2b23'; g.fillRect(8, 8, 50, 10);
      g.fillStyle = '#555'; for (let i = 0; i < 9; i++) g.fillRect(8, 28 + i * 10, 70 + (i * 37) % 40, 3);
      g.strokeStyle = '#9c2b23'; g.lineWidth = 3; g.strokeRect(70, 80, 46, 28); g.fillStyle = '#9c2b23'; g.font = 'bold 12px Arial'; g.fillText('GİZLİ', 74, 99);
      T.paper = toTex(c, { repeat: false });
      const [c2, g2] = cv(128, 96);
      g2.fillStyle = '#0b1a24'; g2.fillRect(0, 0, 128, 96);
      g2.fillStyle = '#3fc1d9'; for (let i = 0; i < 8; i++) g2.fillRect(8, 10 + i * 10, 20 + (i * 53) % 90, 3);
      g2.strokeStyle = '#d4874a'; g2.strokeRect(84, 50, 34, 34);
      T.screen = toTex(c2, { repeat: false });
      // harita masası
      const [c3, g3] = cv(512, 512);
      g3.fillStyle = '#081622'; g3.fillRect(0, 0, 512, 512);
      g3.strokeStyle = 'rgba(64,180,220,0.35)'; g3.lineWidth = 1;
      for (let i = 0; i < 32; i++) { g3.beginPath(); g3.moveTo(i * 16, 0); g3.lineTo(i * 16, 512); g3.stroke(); g3.beginPath(); g3.moveTo(0, i * 16); g3.lineTo(512, i * 16); g3.stroke(); }
      g3.fillStyle = 'rgba(64,200,240,0.5)';
      for (let i = 0; i < 70; i++) g3.fillRect(r() * 480, r() * 480, 10 + r() * 30, 10 + r() * 30);
      g3.strokeStyle = '#ff5544'; g3.lineWidth = 3; g3.strokeRect(300, 180, 60, 60);
      T.mapTable = toTex(c3, { repeat: false });
    }
    // tabela
    T.sign = function (text, bg = '#1a2533', fg = '#e8e2d4', w = 512, h = 128) {
      const [c, g] = cv(w, h);
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = fg; g.font = `bold ${Math.floor(h * 0.5)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 2);
      return toTex(c, { repeat: false });
    };
  };
})();
