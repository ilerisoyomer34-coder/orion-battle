/* KOMUTA — araç modelleri (4x4, 8x8, tank, helikopter, TIR+dorse, siviller) ve sahne eşyaları */
'use strict';
(function () {
  const M = K.models, Parts = M.Parts, TAU = Math.PI * 2;

  const wheelCache = {};
  function wheel(r, w, hub = 0x4a4d44) {
    const key = r + '_' + w + '_' + hub;
    if (!wheelCache[key]) {
      const P = new Parts();
      P.cyl(r, r, w, 18, 0x161616, 'FLAT', 0, 0, 0, 0, 0, Math.PI / 2);
      P.cyl(r * 0.56, r * 0.56, w + 0.02, 10, hub, 'METAL', 0, 0, 0, 0, 0, Math.PI / 2);
      P.cyl(r * 0.18, r * 0.18, w + 0.05, 6, 0x222222, 'METAL', 0, 0, 0, 0, 0, Math.PI / 2);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; P.box(w * 0.96, 0.05, r * 0.22, 0x0e0e0e, 'FLAT', 0, Math.cos(a) * r, Math.sin(a) * r, a); }
      wheelCache[key] = P.build();
    }
    const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
    const m = new THREE.Mesh(wheelCache[key], M.matVeh); m.castShadow = true; spin.add(m);
    g.userData.spin = spin;
    return g;
  }
  function finish(o) {
    o.root.traverse((x) => { if (x.isMesh && x.material !== M.matLight && !x.userData.noShadow) { x.castShadow = true; x.receiveShadow = true; } });
    return o;
  }
  function lightMesh(LP, parent) {
    const mat = M.matLight.clone();
    const m = new THREE.Mesh(LP.build(), mat); m.userData.noShadow = true; m.castShadow = false;
    parent.add(m);
    return { mesh: m, mat };
  }
  function addWheels(root, list, r, w, hub) {
    const out = [];
    for (const [x, z, steer] of list) {
      const g = wheel(r, w, hub); g.position.set(x, r, z); root.add(g);
      out.push({ g, spin: g.userData.spin, steer, r, baseY: r, x, z });
    }
    return out;
  }

  // ───────── 4x4 zırhlı devriye ─────────
  M.veh4x4 = function (C = 0x5f644b) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const P = new Parts(), D = 0x2a2c2a, G = 0x16202a;
    P.box(2.2, 0.7, 5.0, C, 'CAMO', 0, 0.98, 0);
    P.box(1.4, 0.35, 4.2, D, 'METAL', 0, 0.55, 0);
    P.box(2.2, 1.0, 3.2, C, 'CAMO', 0, 1.82, -0.42);
    P.box(2.1, 0.5, 1.55, C, 'CAMO', 0, 1.5, 1.86, 0.1);
    P.box(1.95, 0.62, 0.06, G, 'METAL', 0, 1.98, 1.17, -0.35);
    for (const sx of [1, -1]) {
      P.box(0.05, 0.42, 0.75, G, 'METAL', sx * 1.11, 1.98, 0.55); P.box(0.05, 0.42, 0.75, G, 'METAL', sx * 1.11, 1.98, -0.45); P.box(0.05, 0.42, 0.55, G, 'METAL', sx * 1.11, 1.98, -1.4);
      for (const sz of [1.75, -1.75]) P.box(0.5, 0.12, 1.35, C, 'CAMO', sx * 0.98, 1.38, sz);
      P.box(0.25, 0.08, 2.0, D, 'METAL', sx * 1.16, 0.72, -0.2);
      P.box(0.04, 0.6, 0.04, D, 'METAL', sx * 1.13, 1.82, 0.12); // kapı kolu hattı
    }
    P.box(2.32, 0.3, 0.26, D, 'METAL', 0, 0.86, 2.62); P.box(2.3, 0.3, 0.2, D, 'METAL', 0, 0.86, -2.56);
    P.box(1.4, 0.36, 0.05, 0x111111, 'METAL', 0, 1.27, 2.63);
    for (let i = 0; i < 6; i++) P.box(0.04, 0.3, 0.06, 0x2a2a2a, 'METAL', -0.55 + i * 0.22, 1.27, 2.65);
    P.cyl(0.5, 0.5, 0.34, 14, 0x141414, 'FLAT', 0, 1.62, -2.18, Math.PI / 2);
    P.cyl(0.55, 0.6, 0.24, 12, D, 'METAL', 0, 2.44, -0.6);
    P.box(0.95, 0.5, 0.06, C, 'CAMO', 0, 2.78, -0.2);
    P.box(0.14, 0.18, 0.55, 0x1d1d1d, 'METAL', 0, 2.68, -0.32);
    P.cyl(0.03, 0.03, 0.95, 6, 0x111111, 'METAL', 0, 2.68, 0.3, Math.PI / 2);
    P.cyl(0.012, 0.012, 2.2, 4, 0x111111, 'FLAT', 0.95, 3.4, -1.85); P.cyl(0.012, 0.012, 1.8, 4, 0x111111, 'FLAT', -0.95, 3.2, -1.85);
    P.box(0.6, 0.12, 0.6, D, 'METAL', 0, 2.36, 0.8);
    body.add(P.mesh(M.matVeh));
    const em = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ map: K.tex.emblem, transparent: true, roughness: 0.7 }));
    em.position.set(1.115, 1.6, -0.4); em.rotation.y = Math.PI / 2; body.add(em);
    const em2 = em.clone(); em2.position.x = -1.115; em2.rotation.y = -Math.PI / 2; body.add(em2);
    const LP = new Parts();
    LP.box(0.32, 0.16, 0.05, 0xfff4da, 'FLAT', 0.76, 1.32, 2.66); LP.box(0.32, 0.16, 0.05, 0xfff4da, 'FLAT', -0.76, 1.32, 2.66);
    LP.box(0.22, 0.12, 0.05, 0xff2a20, 'FLAT', 0.95, 1.1, -2.68); LP.box(0.22, 0.12, 0.05, 0xff2a20, 'FLAT', -0.95, 1.1, -2.68);
    const L = lightMesh(LP, body);
    const wheels = addWheels(root, [[1.0, 1.75, true], [-1.0, 1.75, true], [1.0, -1.75, false], [-1.0, -1.75, false]], 0.55, 0.42);
    return finish({ root, body, wheels, lights: L.mesh, lightMat: L.mat, headPos: [[0.76, 1.32, 2.7], [-0.76, 1.32, 2.7]] });
  };

  // ───────── 8x8 zırhlı personel taşıyıcı ─────────
  M.vehAPC = function (C = 0x5b6047) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const P = new Parts(), D = 0x2b2d2a, G = 0x16202a;
    P.box(2.8, 1.3, 7.0, C, 'CAMO', 0, 1.55, -0.2);
    P.box(2.7, 0.9, 1.6, C, 'CAMO', 0, 1.35, 3.6, -0.5);
    P.box(2.0, 0.5, 6.2, D, 'METAL', 0, 0.75, 0);
    P.box(2.6, 0.5, 1.3, C, 'CAMO', 0, 2.3, 2.3, 0.15);
    P.box(1.0, 0.25, 0.04, G, 'METAL', 0.6, 2.42, 2.98, -0.6);
    for (const sx of [1, -1]) {
      P.box(0.15, 0.25, 6.4, D, 'METAL', sx * 1.45, 1.05, -0.1);
      P.box(0.06, 0.25, 0.5, G, 'METAL', sx * 1.41, 1.95, 1.4); P.box(0.06, 0.25, 0.5, G, 'METAL', sx * 1.41, 1.95, -0.6);
      for (let i = 0; i < 6; i++) P.box(0.08, 0.08, 0.3, D, 'METAL', sx * 1.42, 2.15, 1.8 - i * 0.9);
    }
    // taret
    P.cyl(0.9, 1.0, 0.45, 14, C, 'CAMO', 0, 2.42, -0.4);
    P.box(1.4, 0.55, 1.6, C, 'CAMO', 0, 2.85, -0.4);
    P.cyl(0.07, 0.07, 2.4, 8, 0x151515, 'METAL', 0.2, 2.9, 1.6, Math.PI / 2);
    P.box(0.3, 0.3, 0.4, D, 'METAL', 0.2, 2.9, 0.45);
    P.box(0.3, 0.25, 0.3, 0x111111, 'METAL', -0.5, 3.2, -0.1);
    for (let i = 0; i < 3; i++) P.cyl(0.06, 0.06, 0.3, 6, D, 'METAL', 0.75, 2.9, -0.8 + i * 0.18, 0.6, 0, 0);
    P.cyl(0.012, 0.012, 2.4, 4, 0x111111, 'FLAT', 1.2, 3.4, -3.2); P.cyl(0.012, 0.012, 2.0, 4, 0x111111, 'FLAT', -1.2, 3.2, -3.2);
    body.add(P.mesh(M.matVeh));
    // arka rampa
    const ramp = new THREE.Group(); ramp.position.set(0, 0.95, -3.7); body.add(ramp);
    const RP = new Parts(); RP.box(2.3, 1.6, 0.12, C, 'CAMO', 0, 0.8, 0); RP.box(0.6, 0.4, 0.03, G, 'METAL', 0, 1.2, -0.07);
    ramp.add(RP.mesh(M.matVeh));
    const LP = new Parts();
    LP.box(0.3, 0.14, 0.05, 0xfff4da, 'FLAT', 1.0, 1.75, 4.05); LP.box(0.3, 0.14, 0.05, 0xfff4da, 'FLAT', -1.0, 1.75, 4.05);
    LP.box(0.2, 0.12, 0.05, 0xff2a20, 'FLAT', 1.2, 1.4, -3.72); LP.box(0.2, 0.12, 0.05, 0xff2a20, 'FLAT', -1.2, 1.4, -3.72);
    const L = lightMesh(LP, body);
    const ws = [];
    for (const z of [2.7, 1.3, -1.3, -2.7]) { ws.push([1.32, z, z > 0]); ws.push([-1.32, z, z > 0]); }
    const wheels = addWheels(root, ws, 0.62, 0.45);
    return finish({ root, body, wheels, ramp, lights: L.mesh, lightMat: L.mat, headPos: [[1.0, 1.75, 4.1], [-1.0, 1.75, 4.1]] });
  };

  // ───────── Ana muharebe tankı ─────────
  M.vehTank = function (C = 0x5a5e44) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const P = new Parts(), D = 0x2c2d28;
    P.box(3.0, 0.9, 6.8, C, 'CAMO', 0, 1.15, 0);
    P.box(3.0, 0.7, 1.4, C, 'CAMO', 0, 1.25, 3.55, -0.55);
    P.box(3.0, 0.6, 0.8, C, 'CAMO', 0, 1.2, -3.55, 0.3);
    for (const sx of [1, -1]) {
      P.box(0.75, 0.12, 7.4, C, 'CAMO', sx * 1.68, 1.55, 0);
      P.box(0.06, 0.55, 7.0, C, 'CAMO', sx * 2.04, 1.3, 0);
      for (let i = 0; i < 7; i++) P.cyl(0.38, 0.38, 0.5, 12, D, 'METAL', sx * 1.68, 0.5, -2.85 + i * 0.95, 0, 0, Math.PI / 2);
      P.cyl(0.32, 0.32, 0.5, 10, D, 'METAL', sx * 1.68, 0.95, 3.45, 0, 0, Math.PI / 2);
      P.cyl(0.32, 0.32, 0.5, 10, D, 'METAL', sx * 1.68, 0.95, -3.45, 0, 0, Math.PI / 2);
      for (let i = 0; i < 4; i++) P.box(0.3, 0.12, 0.6, D, 'METAL', sx * 1.0, 1.66, -1.5 + i * 0.9);
    }
    P.box(1.2, 0.3, 0.8, D, 'METAL', 0, 1.7, -2.9);
    body.add(P.mesh(M.matVeh));
    // paletler
    const tracks = [];
    for (const sx of [1, -1]) {
      const tex = K.tex.track.clone(); tex.needsUpdate = true; tex.repeat.set(1, 7);
      const mat = M.matTrack.clone(); mat.map = tex;
      const tm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 7.4), mat);
      tm.position.set(sx * 1.68, 0.55, 0); tm.castShadow = true; body.add(tm);
      tracks.push({ mesh: tm, tex });
    }
    // taret
    const turret = new THREE.Group(); turret.position.set(0, 1.62, -0.3); body.add(turret);
    const TP = new Parts();
    TP.box(2.5, 0.75, 3.2, C, 'CAMO', 0, 0.42, 0);
    TP.box(2.2, 0.6, 0.8, C, 'CAMO', 0, 0.38, 1.85, -0.35);
    TP.box(2.6, 0.55, 1.2, C, 'CAMO', 0, 0.42, -2.0);
    TP.box(0.7, 0.6, 0.6, D, 'METAL', 0, 0.45, 1.9);
    TP.cyl(0.35, 0.38, 0.2, 10, D, 'METAL', 0.6, 0.9, -0.4);
    TP.box(0.4, 0.3, 0.5, 0x1d1d1d, 'METAL', -0.65, 0.95, 0.2);
    TP.cyl(0.02, 0.02, 0.9, 6, 0x111111, 'METAL', -0.65, 1.0, 0.75, Math.PI / 2);
    for (let i = 0; i < 4; i++) TP.cyl(0.07, 0.07, 0.3, 6, D, 'METAL', 1.25, 0.7, 0.8 - i * 0.2, 0.7, 0, -0.4);
    for (let i = 0; i < 4; i++) TP.cyl(0.07, 0.07, 0.3, 6, D, 'METAL', -1.25, 0.7, 0.8 - i * 0.2, 0.7, 0, 0.4);
    TP.cyl(0.012, 0.012, 2.2, 4, 0x111111, 'FLAT', 0.9, 1.9, -2.2); TP.cyl(0.012, 0.012, 2.6, 4, 0x111111, 'FLAT', -0.9, 2.1, -2.2);
    turret.add(TP.mesh(M.matVeh));
    const hatch = new THREE.Group(); hatch.position.set(0.6, 1.0, -0.4); turret.add(hatch);
    const HP = new Parts(); HP.cyl(0.36, 0.36, 0.06, 10, C, 'CAMO', 0, 0, 0.36); hatch.add(HP.mesh(M.matVeh));
    const barrel = new THREE.Group(); barrel.position.set(0, 0.45, 2.1); turret.add(barrel);
    const BP = new Parts();
    BP.cyl(0.11, 0.13, 5.2, 12, C, 'CAMO', 0, 0, 2.6, Math.PI / 2);
    BP.cyl(0.17, 0.17, 0.9, 12, D, 'METAL', 0, 0, 2.0, Math.PI / 2);
    BP.cyl(0.14, 0.14, 0.3, 10, D, 'METAL', 0, 0, 5.15, Math.PI / 2);
    barrel.add(BP.mesh(M.matVeh));
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, 5.35); barrel.add(muzzle);
    const LP = new Parts();
    LP.box(0.25, 0.14, 0.05, 0xfff4da, 'FLAT', 1.1, 1.45, 3.9); LP.box(0.25, 0.14, 0.05, 0xfff4da, 'FLAT', -1.1, 1.45, 3.9);
    LP.box(0.2, 0.1, 0.05, 0xff2a20, 'FLAT', 1.2, 1.4, -3.96); LP.box(0.2, 0.1, 0.05, 0xff2a20, 'FLAT', -1.2, 1.4, -3.96);
    const L = lightMesh(LP, body);
    return finish({ root, body, wheels: [], tracks, turret, barrel, hatch, muzzle, lights: L.mesh, lightMat: L.mat, headPos: [[1.1, 1.45, 4.0], [-1.1, 1.45, 4.0]] });
  };

  // ───────── Nakliye helikopteri ─────────
  M.vehHeli = function (C = 0x4c5340) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const P = new Parts(), D = 0x262825, G = 0x18242c;
    P.box(2.3, 1.9, 4.6, C, 'CAMO', 0, 1.75, 0);
    P.sph(1.15, C, 'CAMO', 0, 1.65, 2.3, 1.0, 0.85, 1.25, 12, 8, 0, TAU, 0, Math.PI);
    P.sph(1.0, G, 'METAL', 0, 1.95, 2.6, 0.98, 0.62, 1.05, 12, 8, 0, TAU, 0, Math.PI * 0.5);
    P.box(2.0, 0.9, 1.6, C, 'CAMO', 0, 3.0, -0.2);
    P.cyl(0.55, 0.55, 1.4, 10, D, 'METAL', 0.55, 2.95, 0.4, Math.PI / 2); P.cyl(0.55, 0.55, 1.4, 10, D, 'METAL', -0.55, 2.95, 0.4, Math.PI / 2);
    P.cyl(0.2, 0.2, 0.5, 8, D, 'METAL', 0, 3.6, -0.1);
    P.cyl(0.38, 0.6, 6.4, 10, C, 'CAMO', 0, 2.3, -5.4, Math.PI / 2);
    P.box(0.18, 1.8, 1.1, C, 'CAMO', 0, 3.1, -8.4, 0.35);
    P.box(2.6, 0.08, 0.7, C, 'CAMO', 0, 2.3, -7.8);
    P.box(0.5, 0.5, 2.0, D, 'METAL', 1.4, 1.45, -0.2); P.box(0.5, 0.5, 2.0, D, 'METAL', -1.4, 1.45, -0.2);
    P.box(0.12, 0.2, 2.6, D, 'METAL', 1.25, 0.2, 0.2); P.box(0.12, 0.2, 2.6, D, 'METAL', -1.25, 0.2, 0.2);
    for (const z of [1.0, -0.8]) for (const sx of [1, -1]) P.box(0.08, 0.7, 0.08, D, 'METAL', sx * 1.15, 0.55, z, 0, 0, sx * 0.3);
    for (const sx of [1, -1]) { P.box(0.05, 0.6, 0.6, G, 'METAL', sx * 1.16, 2.2, 1.3); P.box(0.05, 0.5, 0.5, G, 'METAL', sx * 1.16, 2.2, -1.4); }
    // iç oturaklar
    P.box(1.8, 0.1, 0.5, 0x3a3d33, 'FABRIC', 0, 1.25, -1.6); P.box(1.8, 0.6, 0.1, 0x3a3d33, 'FABRIC', 0, 1.55, -1.85);
    P.box(0.5, 0.1, 2.4, 0x3a3d33, 'FABRIC', 0.75, 1.25, 0.1); P.box(0.5, 0.1, 2.4, 0x3a3d33, 'FABRIC', -0.75, 1.25, 0.1);
    body.add(P.mesh(M.matVeh));
    // sürgülü kapı (sol)
    const door = new THREE.Group(); door.position.set(1.17, 1.8, 0.0); body.add(door);
    const DP = new Parts(); DP.box(0.06, 1.5, 1.7, C, 'CAMO', 0, 0, 0); DP.box(0.07, 0.5, 0.6, G, 'METAL', 0, 0.3, 0.2);
    door.add(DP.mesh(M.matVeh));
    // ana rotor
    const rotor = new THREE.Group(); rotor.position.set(0, 3.9, -0.1); body.add(rotor);
    const RP = new Parts();
    RP.cyl(0.3, 0.3, 0.25, 10, D, 'METAL', 0, 0, 0);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; RP.box(0.42, 0.05, 7.6, 0x1c1d1b, 'FLAT', Math.sin(a) * 3.9, 0, Math.cos(a) * 3.9, 0, a, 0); }
    rotor.add(RP.mesh(M.matVeh));
    const blur = new THREE.Mesh(new THREE.CircleGeometry(7.8, 32), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
    blur.rotation.x = -Math.PI / 2; blur.position.y = 0.02; rotor.add(blur);
    const tail = new THREE.Group(); tail.position.set(0.25, 3.3, -8.6); body.add(tail);
    const TRP = new Parts(); TRP.cyl(0.1, 0.1, 0.2, 6, D, 'METAL', 0, 0, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 2; i++) TRP.box(0.04, 1.6, 0.18, 0x1c1d1b, 'FLAT', 0.05, 0, 0, i * Math.PI / 2 + 0.4, 0, 0);
    tail.add(TRP.mesh(M.matVeh));
    const LP = new Parts();
    LP.box(0.1, 0.1, 0.1, 0xff2020, 'FLAT', 1.4, 1.45, 0.9); LP.box(0.1, 0.1, 0.1, 0x20ff40, 'FLAT', -1.4, 1.45, 0.9);
    LP.box(0.1, 0.1, 0.1, 0xffffff, 'FLAT', 0, 4.0, -8.9); LP.box(0.25, 0.12, 0.1, 0xfff0d0, 'FLAT', 0, 0.85, 2.9);
    const L = lightMesh(LP, body);
    return finish({ root, body, wheels: [], rotor, rotorBlur: blur, tailRotor: tail, door, lights: L.mesh, lightMat: L.mat, headPos: [[0, 0.8, 3.0]] });
  };

  // ───────── TIR çekici + dorse (kurgusal Siyah Akrep Lojistik) ─────────
  M.vehTruck = function (C = 0x5a1219) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const P = new Parts(), D = 0x1d1d1f, CH = 0xb8bcc0, G = 0x101820;
    P.box(2.0, 0.4, 7.0, D, 'METAL', 0, 0.85, -0.6);
    P.box(2.2, 1.3, 2.4, C, 'FLAT', 0, 1.75, 2.3);
    P.box(1.9, 0.25, 2.3, C, 'FLAT', 0, 2.42, 2.35, 0.08);
    P.box(1.4, 1.1, 0.08, CH, 'METAL', 0, 1.65, 3.52);
    for (let i = 0; i < 9; i++) P.box(1.3, 0.04, 0.09, 0x222222, 'METAL', 0, 1.2 + i * 0.11, 3.56);
    for (const sx of [1, -1]) {
      P.box(0.5, 0.6, 1.6, C, 'FLAT', sx * 1.0, 1.15, 2.6);
      P.cyl(0.11, 0.11, 2.6, 8, CH, 'METAL', sx * 1.15, 3.5, -0.15);
      P.cyl(0.32, 0.32, 1.2, 10, CH, 'METAL', sx * 1.05, 0.95, -0.1, Math.PI / 2);
      P.box(0.06, 0.55, 0.5, G, 'METAL', sx * 1.26, 2.75, 0.55);
      P.box(0.08, 0.25, 0.2, CH, 'METAL', sx * 1.32, 2.6, 1.2);
    }
    P.box(2.5, 2.2, 2.2, C, 'FLAT', 0, 2.75, 0.4);
    P.box(2.3, 0.8, 0.06, G, 'METAL', 0, 3.2, 1.52, -0.12);
    P.box(2.4, 1.2, 1.4, C, 'FLAT', 0, 3.4, -1.2);
    P.box(2.4, 0.32, 0.25, CH, 'METAL', 0, 0.85, 3.6);
    P.box(1.2, 0.15, 1.2, 0x333333, 'METAL', 0, 1.1, -3.2);
    for (let i = 0; i < 5; i++) P.box(0.12, 0.08, 0.06, 0xffb030, 'FLAT', -0.5 + i * 0.25, 3.92, 1.45);
    body.add(P.mesh(M.matVeh));
    const LP = new Parts();
    LP.box(0.35, 0.18, 0.05, 0xfff4da, 'FLAT', 0.85, 1.25, 3.6); LP.box(0.35, 0.18, 0.05, 0xfff4da, 'FLAT', -0.85, 1.25, 3.6);
    for (let i = 0; i < 5; i++) LP.box(0.1, 0.06, 0.05, 0xffa020, 'FLAT', -0.5 + i * 0.25, 3.92, 1.5);
    const L = lightMesh(LP, body);
    const wheels = addWheels(root, [[1.05, 2.4, true], [-1.05, 2.4, true], [1.05, -2.2, false], [-1.05, -2.2, false], [1.05, -3.5, false], [-1.05, -3.5, false]], 0.55, 0.45, 0x9a9da0);
    // dorse
    const tr = new THREE.Group(), tbody = new THREE.Group(); tr.add(tbody);
    const TP = new Parts();
    TP.box(2.6, 3.0, 12.4, 0x2a0a0e, 'FLAT', 0, 2.6, -6.2);
    TP.box(2.62, 0.2, 12.42, 0x1a1a1a, 'METAL', 0, 1.05, -6.2);
    TP.box(1.8, 0.3, 11, D, 'METAL', 0, 0.85, -6.5);
    for (const sx of [1, -1]) TP.box(0.1, 0.9, 0.1, D, 'METAL', sx * 0.8, 0.5, -2.5);
    TP.box(2.62, 2.9, 0.06, 0x3a1a1e, 'METAL', 0, 2.6, -12.42);
    tbody.add(TP.mesh(M.matVeh));
    const logoMat = new THREE.MeshStandardMaterial({ map: K.tex.mafiaLogo, roughness: 0.6, metalness: 0.2 });
    for (const sx of [1, -1]) {
      const lg = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), logoMat);
      lg.position.set(sx * 1.31, 2.7, -6.2); lg.rotation.y = sx * Math.PI / 2; tbody.add(lg);
    }
    const TLP = new Parts(); TLP.box(0.25, 0.12, 0.05, 0xff2a20, 'FLAT', 1.0, 1.2, -12.46); TLP.box(0.25, 0.12, 0.05, 0xff2a20, 'FLAT', -1.0, 1.2, -12.46);
    const TL = lightMesh(TLP, tbody);
    const twheels = addWheels(tr, [[1.05, -9.8, false], [-1.05, -9.8, false], [1.05, -11.1, false], [-1.05, -11.1, false]], 0.55, 0.45, 0x9a9da0);
    finish({ root: tr });
    return finish({ root, body, wheels, lights: L.mesh, lightMat: L.mat, trailer: { root: tr, body: tbody, wheels: twheels, lightMat: TL.mat }, headPos: [[0.85, 1.25, 3.7], [-0.85, 1.25, 3.7]] });
  };

  // ───────── Sivil araçlar ─────────
  M.vehCar = function (kind = 'sedan', C = 0x8a8f96) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const P = new Parts(), G = 0x141c24, D = 0x1a1a1a;
    let wl, len, wr = 0.34, head;
    if (kind === 'van' || kind === 'ambulance') {
      P.box(2.0, 1.9, 5.0, C, 'FLAT', 0, 1.35, 0);
      P.box(1.9, 0.7, 0.06, G, 'METAL', 0, 1.85, 2.5, -0.2);
      for (const sx of [1, -1]) P.box(0.05, 0.6, 1.0, G, 'METAL', sx * 1.01, 1.85, 1.6);
      P.box(2.05, 0.25, 0.2, D, 'METAL', 0, 0.55, 2.55); P.box(2.05, 0.25, 0.2, D, 'METAL', 0, 0.55, -2.55);
      if (kind === 'ambulance') { for (const sx of [1, -1]) P.box(0.02, 0.3, 4.6, 0xc8202a, 'FLAT', sx * 1.01, 1.2, 0); P.box(0.02, 0.6, 0.6, 0xc8202a, 'FLAT', 1.01, 1.7, -1.0); P.box(0.02, 0.6, 0.6, 0xc8202a, 'FLAT', -1.01, 1.7, -1.0); }
      wl = [[0.9, 1.6, true], [-0.9, 1.6, true], [0.9, -1.6, false], [-0.9, -1.6, false]]; len = 5; head = [0.7, 0.9, 2.52];
    } else if (kind === 'suv') {
      P.box(2.0, 0.85, 4.8, C, 'METAL', 0, 0.9, 0);
      P.box(1.9, 0.75, 3.0, C, 'METAL', 0, 1.7, -0.4);
      P.box(1.8, 0.6, 0.05, G, 'METAL', 0, 1.7, 1.15, -0.4);
      for (const sx of [1, -1]) P.box(0.05, 0.5, 2.6, G, 'METAL', sx * 0.96, 1.72, -0.4);
      P.box(2.05, 0.25, 0.2, D, 'METAL', 0, 0.6, 2.42); P.box(2.05, 0.25, 0.2, D, 'METAL', 0, 0.6, -2.42);
      wl = [[0.9, 1.55, true], [-0.9, 1.55, true], [0.9, -1.55, false], [-0.9, -1.55, false]]; len = 4.8; wr = 0.4; head = [0.7, 0.95, 2.42];
    } else {
      P.box(1.8, 0.62, 4.4, C, 'METAL', 0, 0.68, 0);
      P.box(1.62, 0.55, 2.2, C, 'METAL', 0, 1.25, -0.25);
      P.box(1.55, 0.5, 0.05, G, 'METAL', 0, 1.25, 0.9, -0.55);
      P.box(1.55, 0.45, 0.05, G, 'METAL', 0, 1.25, -1.38, 0.5);
      for (const sx of [1, -1]) P.box(0.05, 0.38, 1.9, G, 'METAL', sx * 0.82, 1.27, -0.25);
      P.box(1.85, 0.2, 0.15, D, 'METAL', 0, 0.45, 2.2); P.box(1.85, 0.2, 0.15, D, 'METAL', 0, 0.45, -2.2);
      wl = [[0.82, 1.35, true], [-0.82, 1.35, true], [0.82, -1.35, false], [-0.82, -1.35, false]]; len = 4.4; head = [0.6, 0.75, 2.21];
    }
    body.add(P.mesh(M.matVeh));
    const LP = new Parts();
    LP.box(0.3, 0.12, 0.04, 0xfff4da, 'FLAT', head[0], head[1], head[2]); LP.box(0.3, 0.12, 0.04, 0xfff4da, 'FLAT', -head[0], head[1], head[2]);
    LP.box(0.28, 0.12, 0.04, 0xff2a20, 'FLAT', head[0], head[1], -head[2]); LP.box(0.28, 0.12, 0.04, 0xff2a20, 'FLAT', -head[0], head[1], -head[2]);
    if (kind === 'ambulance') { LP.box(0.5, 0.15, 0.3, 0x3060ff, 'FLAT', 0.4, 2.35, 1.8); LP.box(0.5, 0.15, 0.3, 0xff2020, 'FLAT', -0.4, 2.35, 1.8); }
    const L = lightMesh(LP, body);
    const wheels = addWheels(root, wl, wr, 0.28, 0xb0b4b8);
    return finish({ root, body, wheels, lights: L.mesh, lightMat: L.mat, len, headPos: [[head[0], head[1], head[2] + 0.1], [-head[0], head[1], head[2] + 0.1]] });
  };

  // ───────── Statik araç (sahne süsü, birleşik geometri) ─────────
  M.addStaticCar = function (P, x, z, ry, kind, color) {
    P.pushT(x, 0, z, ry);
    const G = 0x141c24, D = 0x1a1a1a;
    if (kind === 'van') {
      P.box(2.0, 1.9, 5.0, color, 'FLAT', 0, 1.35, 0); P.box(1.9, 0.7, 0.06, G, 'METAL', 0, 1.85, 2.5, -0.2);
    } else {
      P.box(1.8, 0.62, 4.4, color, 'METAL', 0, 0.68, 0); P.box(1.62, 0.55, 2.2, color, 'METAL', 0, 1.25, -0.25);
      P.box(1.55, 0.5, 0.05, G, 'METAL', 0, 1.25, 0.9, -0.55); P.box(1.55, 0.45, 0.05, G, 'METAL', 0, 1.25, -1.38, 0.5);
      P.box(1.66, 0.38, 1.9, G, 'METAL', 0, 1.27, -0.25);
    }
    for (const [wx, wz] of [[0.85, 1.4], [-0.85, 1.4], [0.85, -1.4], [-0.85, -1.4]]) P.cyl(0.34, 0.34, 0.26, 12, D, 'FLAT', wx, 0.34, wz, 0, 0, Math.PI / 2);
    P.pop();
  };

  // ───────── Sahne eşyaları (Parts'a yerel konumda ekler) ─────────
  const Pr = M.props = {
    desk(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(1.6, 0.05, 0.8, 0x8a6a48, 'FABRIC', 0, 0.74, 0); P.box(0.05, 0.72, 0.75, 0x444444, 'METAL', 0.75, 0.36, 0); P.box(0.05, 0.72, 0.75, 0x444444, 'METAL', -0.75, 0.36, 0); P.box(0.5, 0.5, 0.7, 0x6a5038, 'FABRIC', 0.45, 0.45, 0); P.pop(); },
    monitor(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(0.55, 0.34, 0.04, 0x1a1a1a, 'METAL', 0, 0.3, 0); P.box(0.5, 0.29, 0.01, 0x5fa8c8, 'FLAT', 0, 0.3, 0.022); P.box(0.06, 0.15, 0.06, 0x222222, 'METAL', 0, 0.07, -0.02); P.box(0.25, 0.02, 0.18, 0x222222, 'METAL', 0, 0.01, 0); P.box(0.45, 0.02, 0.15, 0x2a2a2a, 'METAL', 0, 0.01, 0.25); P.pop(); },
    chair(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(0.48, 0.08, 0.48, 0x2a2d33, 'FABRIC', 0, 0.48, 0); P.box(0.46, 0.55, 0.07, 0x2a2d33, 'FABRIC', 0, 0.8, -0.22); P.cyl(0.03, 0.03, 0.42, 6, 0x444444, 'METAL', 0, 0.24, 0); P.box(0.55, 0.04, 0.08, 0x333333, 'METAL', 0, 0.03, 0); P.box(0.08, 0.04, 0.55, 0x333333, 'METAL', 0, 0.03, 0); P.pop(); },
    cabinet(P, x, y, z, ry, c = 0x7a7f86) { P.pushT(x, y, z, ry); P.box(0.5, 1.35, 0.6, c, 'METAL', 0, 0.675, 0); for (let i = 0; i < 4; i++) { P.box(0.46, 0.02, 0.01, 0x333333, 'FLAT', 0, 0.3 + i * 0.32, 0.305); P.box(0.12, 0.03, 0.03, 0xcccccc, 'METAL', 0, 0.2 + i * 0.32, 0.31); } P.pop(); },
    shelf(P, x, y, z, ry, w = 2, h = 2.2, d = 0.6, loaded = true) {
      P.pushT(x, y, z, ry);
      for (const sx of [1, -1]) for (const sz of [1, -1]) P.box(0.06, h, 0.06, 0x2c4a7a, 'METAL', sx * w / 2, h / 2, sz * d / 2);
      for (let i = 0; i < 4; i++) {
        const yy = 0.15 + i * (h - 0.2) / 3;
        P.box(w, 0.04, d, 0xa06a2a, 'METAL', 0, yy, 0);
        if (loaded && i < 3) for (let j = 0; j < 3; j++) if ((i + j) % 3 !== 2) P.box(w / 3.4, 0.35 + ((i * 7 + j * 3) % 3) * 0.08, d * 0.85, [0x9a7a4a, 0x7a5a3a, 0x5a6a7a][j], 'FABRIC', -w / 3 + j * w / 3, yy + 0.22, 0);
      }
      P.pop();
    },
    plant(P, x, y, z) { P.pushT(x, y, z); P.cyl(0.18, 0.14, 0.4, 8, 0x5a4030, 'FLAT', 0, 0.2, 0); P.sph(0.32, 0x3d6b32, 'FABRIC', 0, 0.65, 0, 1, 1.3, 1); P.pop(); },
    sofa(P, x, y, z, ry, c = 0x4a3a32) { P.pushT(x, y, z, ry); P.box(2.0, 0.42, 0.85, c, 'FABRIC', 0, 0.21, 0); P.box(2.0, 0.5, 0.2, c, 'FABRIC', 0, 0.6, -0.33); P.box(0.2, 0.3, 0.85, c, 'FABRIC', 0.9, 0.55, 0); P.box(0.2, 0.3, 0.85, c, 'FABRIC', -0.9, 0.55, 0); P.pop(); },
    table(P, x, y, z, ry, w = 1.6, d = 0.9, c = 0x6a4a30) { P.pushT(x, y, z, ry); P.box(w, 0.05, d, c, 'FABRIC', 0, 0.74, 0); for (const sx of [1, -1]) for (const sz of [1, -1]) P.box(0.06, 0.72, 0.06, 0x333333, 'METAL', sx * (w / 2 - 0.08), 0.36, sz * (d / 2 - 0.08)); P.pop(); },
    copier(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(0.8, 1.0, 0.6, 0xd8d8d0, 'FLAT', 0, 0.5, 0); P.box(0.7, 0.08, 0.5, 0x333333, 'METAL', 0, 1.04, 0); P.box(0.2, 0.08, 0.1, 0x5fa8c8, 'FLAT', 0.25, 0.95, 0.3); P.pop(); },
    server(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(0.7, 2.0, 0.9, 0x1d1f22, 'METAL', 0, 1.0, 0); for (let i = 0; i < 10; i++) { P.box(0.6, 0.04, 0.01, i % 3 ? 0x2a8a3a : 0x3a6aca, 'FLAT', 0, 0.2 + i * 0.17, 0.455); } P.pop(); },
    counter(P, x, y, z, ry, w = 3.2) { P.pushT(x, y, z, ry); P.box(w, 1.1, 0.7, 0x3a3f48, 'FABRIC', 0, 0.55, 0); P.box(w + 0.1, 0.05, 0.85, 0xd8d2c4, 'FLAT', 0, 1.12, 0.05); P.box(w * 0.9, 0.04, 0.02, 0xd4874a, 'FLAT', 0, 0.9, 0.36); P.pop(); },
    vending(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(0.9, 1.9, 0.75, 0xa01a1a, 'METAL', 0, 0.95, 0); P.box(0.55, 1.2, 0.02, 0x9ac0d0, 'METAL', -0.12, 1.15, 0.38); P.pop(); },
    whiteboard(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(1.8, 1.0, 0.04, 0xf0f0f0, 'FLAT', 0, 1.5, 0); P.box(1.86, 0.06, 0.08, 0x888888, 'METAL', 0, 0.98, 0.02); for (let i = 0; i < 5; i++) P.box(0.4 + (i * 13 % 7) * 0.1, 0.02, 0.01, i % 2 ? 0x1a3aaa : 0xaa2a2a, 'FLAT', -0.4 + (i % 2) * 0.3, 1.3 + i * 0.12, 0.025); P.pop(); },
    bench(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(1.8, 0.06, 0.45, 0x7a5a3a, 'FABRIC', 0, 0.45, 0); P.box(1.8, 0.4, 0.06, 0x7a5a3a, 'FABRIC', 0, 0.72, -0.22); for (const sx of [1, -1]) P.box(0.06, 0.45, 0.45, 0x222222, 'METAL', sx * 0.8, 0.22, 0); P.pop(); },
    lampPost(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.cyl(0.09, 0.12, 6.5, 8, 0x2b2e33, 'METAL', 0, 3.25, 0); P.box(0.1, 0.1, 1.4, 0x2b2e33, 'METAL', 0, 6.4, 0.65); P.box(0.4, 0.15, 0.6, 0x2b2e33, 'METAL', 0, 6.35, 1.3); P.box(0.3, 0.02, 0.5, 0xfff2d0, 'FLAT', 0, 6.27, 1.3); P.pop(); },
    trafficLight(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.cyl(0.08, 0.1, 4.5, 8, 0x2b2e33, 'METAL', 0, 2.25, 0); P.box(0.35, 1.0, 0.3, 0x1a1a1a, 'METAL', 0, 4.2, 0.1); P.sph(0.1, 0xc02020, 'FLAT', 0, 4.5, 0.27); P.sph(0.1, 0x806010, 'FLAT', 0, 4.2, 0.27); P.sph(0.1, 0x206030, 'FLAT', 0, 3.9, 0.27); P.pop(); },
    tree(P, x, y, z, s = 1, c = 0x3e6a33) { P.pushT(x, y, z, 0, 0, 0, s); P.cyl(0.14, 0.22, 2.4, 7, 0x5a4030, 'FABRIC', 0, 1.2, 0); P.sph(1.5, c, 'CAMO', 0, 3.4, 0, 1, 1.15, 1, 8, 6); P.sph(1.1, c, 'CAMO', 0.6, 4.2, 0.3, 1, 1, 1, 7, 5); P.pop(); },
    pine(P, x, y, z, s = 1) { P.pushT(x, y, z, 0, 0, 0, s); P.cyl(0.15, 0.25, 2, 6, 0x4a3524, 'FABRIC', 0, 1, 0); P.cyl(0, 1.8, 3.2, 7, 0x2b4a2a, 'CAMO', 0, 3.2, 0); P.cyl(0, 1.4, 2.6, 7, 0x2f5230, 'CAMO', 0, 4.6, 0); P.cyl(0, 0.9, 1.8, 7, 0x335a33, 'CAMO', 0, 5.8, 0); P.pop(); },
    stall(P, x, y, z, ry, c = 0xb03a2a) { P.pushT(x, y, z, ry); P.box(2.6, 0.9, 1.2, 0x6a4a30, 'FABRIC', 0, 0.45, 0); for (const sx of [1, -1]) for (const sz of [1, -1]) P.box(0.06, 2.4, 0.06, 0x444444, 'METAL', sx * 1.25, 1.2, sz * 0.6); P.box(2.9, 0.06, 1.7, c, 'FABRIC', 0, 2.4, 0.1, -0.15); for (let i = 0; i < 6; i++) P.sph(0.14, [0xd04020, 0xe0a020, 0x60a030][i % 3], 'FLAT', -1 + i * 0.4, 0.98, 0.1); P.pop(); },
    barrier(P, x, y, z, ry, c = 0xd8d4cc) { P.pushT(x, y, z, ry); P.box(2.0, 0.3, 0.6, c, 'FLAT', 0, 0.15, 0); P.box(2.0, 0.55, 0.32, c, 'FLAT', 0, 0.55, 0); P.box(2.0, 0.08, 0.34, 0xc8202a, 'FLAT', 0, 0.75, 0); P.pop(); },
    sandbags(P, x, y, z, ry, w = 2.4) { P.pushT(x, y, z, ry); for (let r = 0; r < 3; r++) for (let i = 0; i < Math.round(w / 0.6); i++) P.box(0.58, 0.24, 0.42, 0x8a7a58, 'FABRIC', -w / 2 + 0.3 + i * 0.6 + (r % 2) * 0.15, 0.12 + r * 0.24, 0); P.pop(); },
    generator(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(3.2, 2.2, 2.0, 0x3a5a3a, 'METAL', 0, 1.1, 0); P.box(3.3, 0.2, 2.1, 0x2a2a2a, 'METAL', 0, 0.1, 0); P.cyl(0.18, 0.18, 1.2, 8, 0x333333, 'METAL', 1.0, 2.7, 0.4); P.box(0.8, 0.6, 0.05, 0xd8c040, 'FLAT', -0.8, 1.4, 1.01); P.pop(); },
    transformer(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(2.2, 2.6, 1.6, 0x7a8088, 'METAL', 0, 1.3, 0); for (let i = 0; i < 3; i++) P.cyl(0.12, 0.16, 1.0, 8, 0x8a5a2a, 'FLAT', -0.6 + i * 0.6, 3.1, 0); for (let i = 0; i < 8; i++) P.box(0.05, 2.0, 1.7, 0x5a6068, 'METAL', -1.0 + i * 0.28, 1.2, 0); P.pop(); },
    barrel(P, x, y, z, c = 0x2a5a8a) { P.pushT(x, y, z); P.cyl(0.3, 0.3, 0.9, 10, c, 'METAL', 0, 0.45, 0); P.cyl(0.31, 0.31, 0.04, 10, 0x222222, 'METAL', 0, 0.3, 0); P.cyl(0.31, 0.31, 0.04, 10, 0x222222, 'METAL', 0, 0.62, 0); P.pop(); },
    pallet(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(1.2, 0.12, 1.0, 0x9a7a4a, 'FABRIC', 0, 0.06, 0); P.box(1.1, 0.9, 0.9, 0x8a6a3a, 'FABRIC', 0, 0.57, 0); P.box(1.12, 0.92, 0.04, 0xc8c0a0, 'FABRIC', 0, 0.57, 0.46); P.pop(); },
    forklift(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(1.2, 1.0, 2.2, 0xe0a020, 'METAL', 0, 0.8, 0); P.box(1.1, 0.06, 1.2, 0x222222, 'METAL', 0, 2.3, -0.2); for (const sx of [1, -1]) { P.box(0.06, 2.0, 0.06, 0x222222, 'METAL', sx * 0.5, 1.5, 0.3); P.box(0.08, 2.4, 0.1, 0x333333, 'METAL', sx * 0.35, 1.2, 1.15); P.box(0.12, 0.05, 1.1, 0x333333, 'METAL', sx * 0.3, 0.1, 1.7); } for (const [wx, wz] of [[0.55, 0.7], [-0.55, 0.7], [0.55, -0.7], [-0.55, -0.7]]) P.cyl(0.3, 0.3, 0.25, 10, 0x111111, 'FLAT', wx, 0.3, wz, 0, 0, Math.PI / 2); P.pop(); },
    tent(P, x, y, z, ry, c = 0x5a5e44) { P.pushT(x, y, z, ry); P.box(3.6, 0.08, 4.2, c, 'CAMO', 0, 2.0, 0.0, 0, 0, 0); P.box(1.95, 0.06, 4.2, c, 'CAMO', 0.9, 1.3, 0, 0, 0, -0.75); P.box(1.95, 0.06, 4.2, c, 'CAMO', -0.9, 1.3, 0, 0, 0, 0.75); P.pop(); },
    well(P, x, y, z) { P.pushT(x, y, z); P.cyl(0.9, 0.95, 0.8, 12, 0x8a7a6a, 'FABRIC', 0, 0.4, 0); P.cyl(0.7, 0.7, 0.82, 12, 0x1a1a1a, 'FLAT', 0, 0.42, 0); for (const sx of [1, -1]) P.box(0.12, 1.8, 0.12, 0x5a4030, 'FABRIC', sx * 0.85, 1.3, 0); P.box(1.9, 0.12, 0.2, 0x5a4030, 'FABRIC', 0, 2.2, 0); P.pop(); },
    fountain(P, x, y, z) { P.pushT(x, y, z); P.cyl(4.2, 4.4, 0.6, 24, 0xa8a49a, 'FABRIC', 0, 0.3, 0); P.cyl(3.9, 3.9, 0.62, 24, 0x2a4a5a, 'METAL', 0, 0.32, 0); P.cyl(0.5, 0.7, 1.6, 12, 0xa8a49a, 'FABRIC', 0, 1.1, 0); P.cyl(1.4, 1.2, 0.25, 16, 0xa8a49a, 'FABRIC', 0, 1.9, 0); P.pop(); },
    crane(P, x, y, z, ry) {
      P.pushT(x, y, z, ry);
      for (const sx of [1, -1]) for (const sz of [1, -1]) P.box(0.6, 26, 0.6, 0xc87a20, 'METAL', sx * 4, 13, sz * 5);
      P.box(9, 1.2, 1.2, 0xc87a20, 'METAL', 0, 26, 5); P.box(9, 1.2, 1.2, 0xc87a20, 'METAL', 0, 26, -5);
      P.box(1.4, 1.4, 44, 0xc87a20, 'METAL', 0, 27.5, 10); P.box(4, 3, 4, 0x8a8a8a, 'METAL', 0, 29, -6);
      for (let i = 0; i < 8; i++) P.box(0.3, 0.3, 10.5, 0xc87a20, 'METAL', i % 2 ? 4 : -4, 4 + i * 3, 0, 0.3 * (i % 2 ? 1 : -1));
      P.box(2.5, 2, 2.5, 0x2a2a2a, 'METAL', 0, 24, 18);
      P.pop();
    },
    flagpole(P, x, y, z) { P.pushT(x, y, z); P.cyl(0.06, 0.08, 10, 6, 0xcccccc, 'METAL', 0, 5, 0); P.sph(0.12, 0xd4af37, 'METAL', 0, 10.05, 0); P.box(1.2, 0.3, 1.2, 0x888888, 'FABRIC', 0, 0.15, 0); P.pop(); },
    turnstile(P, x, y, z, ry) { P.pushT(x, y, z, ry); for (const sx of [1.2, -1.2]) P.box(0.3, 1.0, 0.8, 0x9aa0a8, 'METAL', sx, 0.5, 0); P.box(0.1, 0.06, 0.06, 0x30d050, 'FLAT', 1.2, 1.02, 0.3); P.pop(); },
    bunk(P, x, y, z, ry) { P.pushT(x, y, z, ry); P.box(0.9, 0.1, 2.0, 0x4a5a3a, 'FABRIC', 0, 0.5, 0); P.box(0.9, 0.15, 2.0, 0x5a6248, 'FABRIC', 0, 0.62, 0); for (const sx of [1, -1]) for (const sz of [1, -1]) P.box(0.05, 0.5, 0.05, 0x333333, 'METAL', sx * 0.42, 0.25, sz * 0.95); P.pop(); },
    wreck(P, x, y, z, ry) { P.pushT(x, y, z, ry, 0.05, 0.08); P.box(1.8, 0.6, 4.3, 0x2a2420, 'METAL', 0, 0.55, 0); P.box(1.6, 0.5, 2.0, 0x1a1612, 'METAL', 0, 1.1, -0.3, 0.1); P.pop(); },
    container(P, x, y, z, ry, c) { P.pushT(x, y, z, ry); P.box(2.44, 2.6, 6.06, c, 'METAL', 0, 1.3, 0); P.box(2.46, 0.1, 6.08, 0x2a2a2a, 'METAL', 0, 0.05, 0); P.box(2.3, 2.4, 0.04, c, 'METAL', 0, 1.3, 3.04); for (let i = 0; i < 4; i++) P.box(0.04, 2.4, 0.04, 0x333333, 'METAL', -0.9 + i * 0.6, 1.3, 3.07); P.pop(); },
  };
})();
