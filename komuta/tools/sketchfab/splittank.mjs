// T-80U: birleşik ağları bağlı bileşenlere göre gövde / taret / namlu olarak ayır
// kullanım: node splittank.mjs girdi.glb çıktı.glb cx cz R yMin barrelZ barrelYmin barrelYmax barrelMaxX
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [,, inp, out, ...a] = process.argv;
const [CX, CZ, R, YMIN, BZ, BY0, BY1, BMAXX] = a.map(Number);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
const groups = {};
let parentOf = null;
for (const node of root.listNodes().slice()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const W = node.getWorldMatrix(), parent = node.getParentNode();
  parentOf = parent;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(), n = pos.getCount(), tmp = [0, 0, 0], P = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) { pos.getElement(i, tmp); const [x, y, z] = tmp; P[i*3] = W[0]*x + W[4]*y + W[8]*z + W[12]; P[i*3+1] = W[1]*x + W[5]*y + W[9]*z + W[13]; P[i*3+2] = W[2]*x + W[6]*y + W[10]*z + W[14]; }
    const key = new Map(), par = new Int32Array(n);
    for (let i = 0; i < n; i++) { const k = `${Math.round(P[i*3]*1000)},${Math.round(P[i*3+1]*1000)},${Math.round(P[i*3+2]*1000)}`; if (key.has(k)) par[i] = key.get(k); else { key.set(k, i); par[i] = i; } }
    const f = (q) => { while (par[q] !== q) { par[q] = par[par[q]]; q = par[q]; } return q; };
    const tc = idx.getCount() / 3, T = [];
    for (let t = 0; t < tc; t++) { const v = [idx.getScalar(t*3), idx.getScalar(t*3+1), idx.getScalar(t*3+2)]; T.push(v); const r0 = f(v[0]); for (const w of v) { const r = f(w); if (r !== r0) par[r] = r0; } }
    const box = new Map();
    for (const v of T) { const r = f(v[0]); let b = box.get(r); if (!b) { b = { min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] }; box.set(r, b); } for (const w of v) for (let k = 0; k < 3; k++) { b.min[k] = Math.min(b.min[k], P[w*3+k]); b.max[k] = Math.max(b.max[k], P[w*3+k]); } }
    const cls = new Map();
    for (const [r, b] of box) {
      const c = b.min.map((x, k) => (x + b.max[k]) / 2);
      let k = 'hull';
      if (Math.abs(c[2] - BZ) < 0.8 && c[1] > BY0 && c[1] < BY1 && b.max[0] < BMAXX && (b.max[2] - b.min[2]) < 1.3) k = 'barrel';
      else if (b.min[1] >= YMIN && Math.hypot(c[0] - CX, c[2] - CZ) < R) k = 'turret';
      cls.set(r, k);
    }
    const lists = { hull: [], turret: [], barrel: [] };
    for (const v of T) lists[cls.get(f(v[0]))].push(...v);
    console.log(node.getName(), 'hull', lists.hull.length / 3, 'turret', lists.turret.length / 3, 'barrel', lists.barrel.length / 3);
    const mk = (arr) => doc.createAccessor().setType('SCALAR').setArray(n > 65535 ? new Uint32Array(arr) : new Uint16Array(arr)).setBuffer(idx.getBuffer());
    for (const k of ['turret', 'barrel']) {
      if (!lists[k].length) continue;
      const p2 = prim.clone().setIndices(mk(lists[k]));
      const m2 = doc.createMesh(k + '_' + mesh.getName()).addPrimitive(p2);
      const n2 = doc.createNode(k + '_' + node.getName()).setMesh(m2).setMatrix(node.getMatrix());
      if (!groups[k]) { groups[k] = doc.createNode(k === 'turret' ? 'Turret' : 'Barrel'); parent.addChild(groups[k]); }
      groups[k].addChild(n2);
    }
    prim.setIndices(mk(lists.hull));
  }
}
await io.write(out, doc);
console.log('yazıldı', out);
