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
  // Farklı iskelet adlandırmalarını (Mixamo önekli, UE/Renderpeople, Blender .L/.R) Mixamo adlarına çevir
  const ALIAS = {
    pelvis: 'Hips', hips: 'Hips', hip: 'Hips', spine: 'Spine', spine01: 'Spine', spine1: 'Spine1', spine02: 'Spine1', spine2: 'Spine2', spine03: 'Spine2', upperchest: 'Spine2',
    neck: 'Neck', neck01: 'Neck', head: 'Head',
    claviclel: 'LeftShoulder', shoulderl: 'LeftShoulder', leftshoulder: 'LeftShoulder', upperarml: 'LeftArm', leftarm: 'LeftArm', lowerarml: 'LeftForeArm', forearml: 'LeftForeArm', leftforearm: 'LeftForeArm', handl: 'LeftHand', lefthand: 'LeftHand',
    clavicler: 'RightShoulder', shoulderr: 'RightShoulder', rightshoulder: 'RightShoulder', upperarmr: 'RightArm', rightarm: 'RightArm', lowerarmr: 'RightForeArm', forearmr: 'RightForeArm', rightforearm: 'RightForeArm', handr: 'RightHand', righthand: 'RightHand',
    thighl: 'LeftUpLeg', upperlegl: 'LeftUpLeg', leftupleg: 'LeftUpLeg', calfl: 'LeftLeg', lowerlegl: 'LeftLeg', shinl: 'LeftLeg', leftleg: 'LeftLeg', footl: 'LeftFoot', leftfoot: 'LeftFoot', balll: 'LeftToeBase', toel: 'LeftToeBase', toesl: 'LeftToeBase', lefttoebase: 'LeftToeBase',
    thighr: 'RightUpLeg', upperlegr: 'RightUpLeg', rightupleg: 'RightUpLeg', calfr: 'RightLeg', lowerlegr: 'RightLeg', shinr: 'RightLeg', rightleg: 'RightLeg', footr: 'RightFoot', rightfoot: 'RightFoot', ballr: 'RightToeBase', toer: 'RightToeBase', toesr: 'RightToeBase', righttoebase: 'RightToeBase',
  };
  const FING = { index: 'Index', middle: 'Middle', ring: 'Ring', pinky: 'Pinky', little: 'Pinky', thumb: 'Thumb' };
  function canonName(n) {
    const s0 = n.replace(/^mixamorig\d*[:_]?/i, '').replace(/^(rp_[a-z0-9]+_[a-z0-9]+_\d+_(?:walking_|idling_|running_|dancing_|standing_|posed_)?|bip0?1[_ ]?|def[-_]|character\d*[:_])/i, '');
    // önce glTF dışa aktarımlarının eklediği sıra numarasını at (Hips_01, upperarm_l_024, spine_02_04)
    const s1 = s0.replace(/_\d+$/, '');
    return (s1 !== s0 && canonCore(s1)) || canonCore(s0);
  }
  function canonCore(s) {
    if (ORDER.includes(s) || /^(Left|Right)Hand(Index|Middle|Ring|Pinky|Thumb)\d$/.test(s)) return s;
    const k = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ALIAS[k]) return ALIAS[k];
    // parmaklar: index_01_l, Index1.L, finger_index_1_r …
    const m = s.toLowerCase().match(/(index|middle|ring|pinky|little|thumb)[^0-9]*0?(\d)[^a-z]*(l|r|left|right)\b/) || s.toLowerCase().match(/(l|r|left|right)[^a-z]+(index|middle|ring|pinky|little|thumb)[^0-9]*0?(\d)/);
    if (m) {
      const side = /^(l|left)$/.test(m[3] || m[1]) ? 'Left' : 'Right', f = FING[m[1]] || FING[m[2]], i = m[2] && /\d/.test(m[2]) ? m[2] : m[3];
      if (f && i) return side + 'Hand' + f + i;
    }
    return null;
  }
  function canonicalize(root) {
    const seen = new Set(), bones = [];
    root.traverse((o) => { if (o.isBone) bones.push(o); });
    const hasUpper = bones.some((o) => /upper_?chest/i.test(o.name));
    for (const o of bones) {
      let c = canonName(o.name);
      if (!c && /(^|_)chest(_\d+)?$/i.test(o.name)) c = hasUpper ? 'Spine1' : 'Spine2';
      if (c === 'Spine2' && /(^|_)chest(_\d+)?$/i.test(o.name) && hasUpper) c = 'Spine1';
      if (c && !seen.has(c)) { seen.add(c); o.name = c; }
    }
  }
  // A pozunda bağlanmış modelleri T pozuna getir (kol yatay, bacak dik)
  function toTPose(B, scene) {
    const la = B.LeftArm.getWorldPosition(new V3()), ra = B.RightArm.getWorldPosition(new V3());
    const outL = new V3(la.x - ra.x, 0, la.z - ra.z).normalize(), down = new V3(0, -1, 0);
    const fix = (bone, child, want) => {
      if (!bone || !child) return;
      const p0 = bone.getWorldPosition(new V3()), p1 = child.getWorldPosition(new V3());
      const cur = p1.sub(p0); if (cur.lengthSq() < 1e-8) return; cur.normalize();
      if (cur.angleTo(want) < 0.14) return;
      const q = new Q().setFromUnitVectors(cur, want);
      const wq = bone.getWorldQuaternion(new Q()), pq = bone.parent.getWorldQuaternion(new Q());
      bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
      scene.updateMatrixWorld(true);
    };
    for (const [s, out] of [['Left', outL], ['Right', outL.clone().negate()]]) {
      fix(B[s + 'Arm'], B[s + 'ForeArm'], out);
      fix(B[s + 'ForeArm'], B[s + 'Hand'], out);
      fix(B[s + 'Hand'], B[s + 'HandMiddle1'], out);
      fix(B[s + 'UpLeg'], B[s + 'Leg'], down);
      fix(B[s + 'Leg'], B[s + 'Foot'], down);
    }
  }

  GC.prepare = function (entry) {
    const D = entry.data || {};
    const stretch = D.armStretch !== undefined ? D.armStretch : ARM_STRETCH;
    const prepOne = (scene) => {
      if (D.height) {
        // boyu metreye ölçekle (cm birimli veya farklı boyutlu modeller)
        scene.scale.setScalar(1); scene.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(scene), h = bb.max.y - bb.min.y;
        if (h > 0.01) scene.scale.setScalar(D.height / h);
      }
      canonicalize(scene);
      scene.updateMatrixWorld(true);
      const B = collectBones(scene);
      if (!B.Hips || !B.LeftArm || !B.LeftUpLeg) throw new Error('Beklenen kemikler yok');
      if (D.tpose) toTPose(B, scene);
      // kolları uzat (şablonda: klonlar devralır)
      if (stretch !== 1) for (const s of ['Left', 'Right']) { B[s + 'ForeArm'].position.multiplyScalar(stretch); B[s + 'Hand'].position.multiplyScalar(stretch); }
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

  // ── Birinci şahıs: modelden yalnız kol/el üçgenlerini tutan kopya (ağırlığı en çok kol kemiklerine düşen köşeler)
  const ARM_RE = /^(Left|Right)(Arm|ForeArm|Hand)/;
  function armsTemplate(e) {
    if (e.armsT) return e.armsT;
    const c = THREE.SkeletonUtils.clone(e.scene);
    c.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.isSkinnedMesh) { o.visible = false; return; }
      const g = o.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = o.skeleton.bones;
      if (!si || !sw) { o.visible = false; return; }
      const n = si.count, keep = new Uint8Array(n);
      for (let v = 0; v < n; v++) {
        const ws = [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)], is = [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)];
        let arm = 0, all = 0;
        for (let k = 0; k < 4; k++) { all += ws[k]; const b = bones[is[k]]; if (b && ARM_RE.test(b.name)) arm += ws[k]; }
        keep[v] = all > 0 && arm / all > 0.5 ? 1 : 0;
      }
      const I = g.index, cnt = I ? I.count : n, out = [];
      for (let t = 0; t < cnt; t += 3) {
        const a = I ? I.getX(t) : t, b = I ? I.getX(t + 1) : t + 1, d = I ? I.getX(t + 2) : t + 2;
        if (keep[a] && keep[b] && keep[d]) out.push(a, b, d);
      }
      const ng = new THREE.BufferGeometry();
      for (const k in g.attributes) ng.setAttribute(k, g.attributes[k]);
      ng.setIndex(out); ng.groups = []; ng.boundingSphere = g.boundingSphere; ng.boundingBox = g.boundingBox;
      o.geometry = ng;
    });
    e.armsT = c;
    return c;
  }
  GC.addArms = function (actor) {
    const g = actor.glb; if (!g || g.arms) return;
    try {
      g.arms = makeInstance(armsTemplate(g.e), g.prep, null);
      g.arms.wrap.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    } catch (err) { console.warn('Birinci şahıs kolları kurulamadı', err); g.arms = null; }
  };

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
    {
      let want = g.full;
      if (actor.fp && g.arms) want = g.arms;
      else if (g.lod && cam) {
        const lodD = GC.lodDist || (GC.lodDist = K.game && K.game.qualityLevel && K.game.qualityLevel() === 'low' ? 18 : 34);
        if (cam.position.distanceToSquared(actor.pos) > lodD * lodD) want = g.lod;
      }
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
      let parentW = n === 'Hips' ? _pw : I.W[b.parent.name];
      if (!parentW) { b.parent.updateWorldMatrix(true, false); parentW = b.parent.getWorldQuaternion(_tw); }
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
    const fpArms = actor.fp && R.fpOn && R.fpR;
    for (const [side, el] of [['Left', R.elL], ['Right', R.elR]]) {
      if (fpArms) {
        // birinci şahıs: avuç doğrudan kabzaya / el kundağına; dirsek aşağı ve dışa
        R.gun.parent.localToWorld(_T.copy(side === 'Left' ? R.fpL : R.fpR));
        R.root.getWorldQuaternion(_q3);
        _v3.set(side === 'Left' ? 0.35 : -0.35, -0.45, -0.05).applyQuaternion(_q3).add(_T);
        ikArm(I, side, _T, _v3);
        continue;
      }
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
