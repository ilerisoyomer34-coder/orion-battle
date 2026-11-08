/* KOMUTA — GLB asker modellerini prosedürel animasyon iskeletine bağlama (yeniden hedefleme + IK)
   Görünmez prosedürel iskelet (models.js) her karede pozu hesaplar; GLB askerin kemikleri:
   1) eşlenen eklemlerin dünya dönüşleri T pozundaki farkla aktarılır,
   2) kalça yüksekliği ayakları yere değdirecek şekilde düzeltilir,
   3) kollar GLB kemik uzunluklarıyla IK çözülerek elleri prosedürel iskeletin el noktasına (silah kabzası/kundak) oturtur,
   4) parmaklar silah tutarken kavrama pozuna bükülür. */
'use strict';
(function () {
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const GC = K.glbChar = {};
  const ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
  const MAP = { Hips: 'hips', Spine: 'spineMix', Spine2: 'torso', Head: 'neck', LeftArm: 'shL', LeftForeArm: 'elL', LeftHand: 'elL', RightArm: 'shR', RightForeArm: 'elR', RightHand: 'elR', LeftUpLeg: 'thL', LeftLeg: 'knL', LeftFoot: 'knL', RightUpLeg: 'thR', RightLeg: 'knR', RightFoot: 'knR' };
  const FINGER_KEYS = ['Index', 'Middle', 'Ring', 'Pinky'];
  const ARM_STRETCH = 1.24;     // düşük poligonlu modelin kolları iskelete göre kısa: dirsek ve bileği uzat
  const PALM = 0.055;           // bilekten avuç merkezine
  const LYING = new Set(['dead', 'downed']);
  const _q = new Q(), _q2 = new Q(), _q3 = new Q(), _v = new V3(), _v2 = new V3(), _v3 = new V3(), _S = new V3(), _E0 = new V3(), _H0 = new V3(), _T = new V3(), _P = new V3(), _dir = new V3(), _ax = new V3(), _u = new V3();
  const _qa = new Q();

  // Prosedürel iskeletin T pozu (kök çerçevesinde)
  function myTPose() {
    const R = K.models.character(K.models.LOOKS.soldier);
    R.body.rotation.set(0, 0, 0); R.body.position.set(0, 0, 0);
    R.hips.position.y = 0.95; R.torso.position.y = 0.95; R.hips.rotation.set(0, 0, 0); R.torso.rotation.set(0, 0, 0);
    for (const k of ['thL', 'knL', 'thR', 'knR', 'neck', 'elL', 'elR']) R[k].rotation.set(0, 0, 0);
    R.shL.rotation.set(0, 0, Math.PI / 2); R.shR.rotation.set(0, 0, -Math.PI / 2);
    R.root.updateMatrixWorld(true);
    const out = {};
    for (const k of ['hips', 'torso', 'neck', 'shL', 'elL', 'shR', 'elR', 'thL', 'knL', 'thR', 'knR']) out[k] = R[k].getWorldQuaternion(new Q());
    out.spineMix = out.hips.clone().slerp(out.torso, 0.5);
    out.hipsPos = R.hips.getWorldPosition(new V3());
    return out;
  }

  function collectBones(root) {
    const B = {};
    root.traverse((o) => { if (o.isBone || o.type === 'Bone' || ORDER.includes(o.name) || /Hand(Index|Middle|Ring|Pinky|Thumb)\d/.test(o.name)) if (!B[o.name]) B[o.name] = o; });
    return B;
  }

  GC.prepare = function (entry) {
    const prepOne = (scene) => {
      scene.updateMatrixWorld(true);
      const B = collectBones(scene);
      if (!B.Hips || !B.LeftArm || !B.LeftUpLeg) throw new Error('Beklenen kemikler yok');
      // kolları uzat (şablonda: klonlar devralır)
      for (const s of ['Left', 'Right']) { B[s + 'ForeArm'].position.multiplyScalar(ARM_STRETCH); B[s + 'Hand'].position.multiplyScalar(ARM_STRETCH); }
      scene.updateMatrixWorld(true);
      return B;
    };
    const B = prepOne(entry.scene);
    if (entry.lod) { try { prepOne(entry.lod); } catch (e) { entry.lod = null; } }
    // model -z'ye bakıyorsa (sol kol -x tarafında) 180° çevir
    const la = B.LeftArm.getWorldPosition(new V3()), ra = B.RightArm.getWorldPosition(new V3());
    const wrapQ = new Q();
    if (la.x < ra.x) wrapQ.setFromAxisAngle(new V3(0, 1, 0), Math.PI);
    const T = myTPose();
    const bindR = {}, bindLocal = {}, offset = {};
    for (const n of ORDER) {
      const b = B[n]; if (!b) continue;
      bindLocal[n] = b.quaternion.clone();
      bindR[n] = wrapQ.clone().multiply(b.getWorldQuaternion(new Q()));
      if (MAP[n]) offset[n] = T[MAP[n]].clone().invert().multiply(bindR[n]);
    }
    const hipsW = B.Hips.getWorldPosition(new V3()).applyQuaternion(wrapQ);
    const hipOff = new V3(hipsW.x - T.hipsPos.x, hipsW.y - T.hipsPos.y, hipsW.z - T.hipsPos.z);
    const footH = (B.LeftFoot.getWorldPosition(new V3()).y + B.RightFoot.getWorldPosition(new V3()).y) / 2;
    // parmak bükme eksenleri (model çerçevesinde avuç aşağı, parmaklar kol yönünde)
    const fingers = { Left: [], Right: [] };
    for (const side of ['Left', 'Right']) {
      for (const f of FINGER_KEYS) {
        for (let i = 1; i <= 3; i++) {
          const b = B[side + 'Hand' + f + i]; if (!b) continue;
          const nb = B[side + 'Hand' + f + (i + 1)] || null;
          const p0 = b.getWorldPosition(new V3());
          let dir;
          if (nb) dir = nb.getWorldPosition(new V3()).sub(p0).normalize();
          else { const pb = B[side + 'Hand' + f + (i - 1)] || B[side + 'Hand']; dir = p0.clone().sub(pb.getWorldPosition(new V3())).normalize(); }
          const axisW = new V3().crossVectors(dir, new V3(0, -1, 0)).normalize();
          const axisL = axisW.applyQuaternion(b.getWorldQuaternion(new Q()).invert()).normalize();
          fingers[side].push({ name: b.name, axis: axisL, bind: b.quaternion.clone(), k: i === 1 ? 0.8 : 1 });
        }
      }
    }
    entry.prep = { wrapQ, offset, bindLocal, hipOff, footH, fingers };
  };

  const tintCache = new Map();
  function tinted(mat, color) {
    const key = mat.uuid + '_' + color;
    if (!tintCache.has(key)) { const m = mat.clone(); m.color.multiply(new THREE.Color(color)); tintCache.set(key, m); }
    return tintCache.get(key);
  }
  function makeInstance(scene, prep, tint) {
    const c = THREE.SkeletonUtils.clone(scene);
    const wrap = new THREE.Group(); wrap.quaternion.copy(prep.wrapQ); wrap.add(c);
    c.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      if (tint) o.material = Array.isArray(o.material) ? o.material.map((m) => tinted(m, tint)) : tinted(o.material, tint);
    });
    const B = collectBones(c);
    const w = {};
    for (const n of ORDER) if (B[n]) w[n] = new Q();
    return { wrap, B, hipsParent: B.Hips.parent, W: w, fingers: prep.fingers };
  }

  // Aktöre GLB model bağla; prosedürel gövde ağları gizlenir, silah ve kalkan görünür kalır
  GC.attach = function (actor, id, opts = {}) {
    const e = K.assets.chars[id]; if (!e || !e.prep) return false;
    const R = actor.rig;
    const gunSet = new Set(); R.gun.traverse((o) => gunSet.add(o)); if (R.shield) R.shield.traverse((o) => gunSet.add(o));
    R.root.traverse((o) => { if (o.isMesh && !gunSet.has(o)) { o.visible = false; o.userData.procHidden = true; } });
    const full = makeInstance(e.scene, e.prep, opts.tint);
    const lod = e.lod ? makeInstance(e.lod, e.prep, opts.tint) : null;
    R.root.add(full.wrap);
    actor.glb = { id, e, full, lod, cur: full, prep: e.prep };
    return true;
  };

  function ikArm(I, side, target, pole) {
    const up = I.B[side + 'Arm'], lo = I.B[side + 'ForeArm'], ha = I.B[side + 'Hand'];
    up.getWorldPosition(_S); lo.getWorldPosition(_E0); ha.getWorldPosition(_H0);
    const a = _S.distanceTo(_E0), b = _E0.distanceTo(_H0) + PALM;
    _dir.subVectors(target, _S);
    let d = _dir.length(); if (d < 1e-4) return;
    _dir.divideScalar(d);
    d = Math.min(Math.max(d, 0.06), a + b - 0.002);
    const cosA = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)));
    const A = Math.acos(cosA);
    _ax.subVectors(pole, _S).cross(_dir).negate();          // dir × (pole - S)
    if (_ax.lengthSq() < 1e-8) _ax.set(0, 1, 0).cross(_dir);
    _ax.normalize();
    _u.copy(_dir).applyAxisAngle(_ax, A);
    // üst kol
    _v.subVectors(_E0, _S).normalize();
    _q.setFromUnitVectors(_v, _u);
    up.getWorldQuaternion(_q2); _q.multiply(_q2);
    up.parent.getWorldQuaternion(_q3); up.quaternion.copy(_q3.invert().multiply(_q));
    up.updateMatrixWorld(true);
    // ön kol
    lo.getWorldPosition(_E0); ha.getWorldPosition(_H0);
    _v.subVectors(_H0, _E0).normalize(); _v2.subVectors(target, _E0).normalize();
    _q.setFromUnitVectors(_v, _v2);
    lo.getWorldQuaternion(_q2); _q.multiply(_q2);
    up.getWorldQuaternion(_q3); lo.quaternion.copy(_q3.invert().multiply(_q));
    lo.updateMatrixWorld(true);
  }

  const _myQ = { hips: new Q(), torso: new Q(), neck: new Q(), shL: new Q(), elL: new Q(), shR: new Q(), elR: new Q(), thL: new Q(), knL: new Q(), thR: new Q(), knR: new Q(), spineMix: new Q() };
  const _pw = new Q(), _tw = new Q();
  GC.sync = function (actor) {
    const g = actor.glb, R = actor.rig, P = g.prep;
    // uzak model (LOD)
    const cam = K.cam && K.cam.camera;
    if (g.lod && cam) {
      const far = cam.position.distanceToSquared(actor.pos) > 34 * 34;
      const want = far ? g.lod : g.full;
      if (want !== g.cur) { R.root.remove(g.cur.wrap); R.root.add(want.wrap); g.cur = want; }
    }
    const I = g.cur, B = I.B;
    R.root.updateMatrixWorld(true);
    for (const k in _myQ) if (k !== 'spineMix') R[k].getWorldQuaternion(_myQ[k]);
    _myQ.spineMix.copy(_myQ.hips).slerp(_myQ.torso, 0.5);
    I.hipsParent.getWorldQuaternion(_pw);
    // 1) dönüşleri aktar
    for (const n of ORDER) {
      const b = B[n]; if (!b) continue;
      const parentW = n === 'Hips' ? _pw : I.W[b.parent.name];
      const tw = I.W[n];
      if (MAP[n]) tw.copy(_myQ[MAP[n]]).multiply(P.offset[n]);
      else tw.copy(parentW).multiply(P.bindLocal[n]);
      b.quaternion.copy(parentW).invert().multiply(tw);
    }
    // 2) kalça konumu + ayakları yere bas
    const pose = actor.anim.pose;
    R.hips.localToWorld(_v.copy(P.hipOff));
    I.hipsParent.worldToLocal(_P.copy(_v)); B.Hips.position.copy(_P);
    B.Hips.updateMatrixWorld(true);
    if (!LYING.has(pose) && actor.onGround !== false && !actor.vehicle) {
      const fl = B.LeftFoot.getWorldPosition(_v2).y, fr = B.RightFoot.getWorldPosition(_v3).y;
      const sole = Math.min(fl, fr) - P.footH;
      const delta = Math.max(-0.35, Math.min(0.35, actor.pos.y - sole));
      if (Math.abs(delta) > 0.002) { _v.y += delta; I.hipsParent.worldToLocal(_P.copy(_v)); B.Hips.position.copy(_P); B.Hips.updateMatrixWorld(true); }
    }
    // 3) kollar: prosedürel iskeletin el noktasına IK
    const FA = R.FA || K.models.ARM.FA;
    for (const [side, el] of [['Left', R.elL], ['Right', R.elR]]) {
      el.localToWorld(_T.set(0, -FA, 0));
      el.getWorldPosition(_v3);
      // dirsek yönü için kutup: prosedürel dirsek biraz dışa/aşağı uzatılmış
      ikArm(I, side, _T, _v3);
    }
    // 4) parmaklar
    const armed = actor.anim.armed && R.weapon && R.gunMesh && R.gunMesh.visible;
    const curlR = armed ? 1.15 : (pose === 'surrender' ? 0.1 : 0.35), curlL = armed ? 0.9 : (pose === 'surrender' ? 0.1 : 0.35);
    for (const f of I.fingers.Left) { const b = B[f.name]; if (b) b.quaternion.copy(f.bind).multiply(_qa.setFromAxisAngle(f.axis, curlL * f.k)); }
    for (const f of I.fingers.Right) { const b = B[f.name]; if (b) b.quaternion.copy(f.bind).multiply(_qa.setFromAxisAngle(f.axis, curlR * f.k)); }
  };

  // Görünüm → GLB model kimliği
  GC.forLook = function (look) {
    if (!look || !look.glb || !K.assets.chars[look.glb]) return null;
    return look.glb;
  };
})();
