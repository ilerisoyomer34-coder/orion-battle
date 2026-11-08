// kullanım: node comps.mjs model.glb meshAdı  → bağlı bileşenlerin kutuları (dünya koordinatı)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [,, inp, meshName] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
for (const node of root.listNodes()) {
  const mesh = node.getMesh(); if (!mesh || (meshName && mesh.getName() !== meshName)) continue;
  const W = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
    const n = pos.getCount(), tmp = [0, 0, 0];
    const P = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) { pos.getElement(i, tmp); const [x, y, z] = tmp; P[i*3] = W[0]*x + W[4]*y + W[8]*z + W[12]; P[i*3+1] = W[1]*x + W[5]*y + W[9]*z + W[13]; P[i*3+2] = W[2]*x + W[6]*y + W[10]*z + W[14]; }
    // konuma göre kaynak
    const key = new Map(), par = new Int32Array(n);
    for (let i = 0; i < n; i++) { const k = `${Math.round(P[i*3]*1000)},${Math.round(P[i*3+1]*1000)},${Math.round(P[i*3+2]*1000)}`; if (key.has(k)) par[i] = key.get(k); else { key.set(k, i); par[i] = i; } }
    const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const u = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
    const tc = idx.getCount() / 3;
    for (let t = 0; t < tc; t++) { const a = idx.getScalar(t*3), b = idx.getScalar(t*3+1), c = idx.getScalar(t*3+2); u(a, b); u(b, c); }
    const comps = new Map();
    for (let t = 0; t < tc; t++) {
      const a = idx.getScalar(t*3), r = f(a);
      let c = comps.get(r); if (!c) { c = { tris: 0, min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] }; comps.set(r, c); }
      c.tris++;
      for (const v of [a, idx.getScalar(t*3+1), idx.getScalar(t*3+2)]) for (let k = 0; k < 3; k++) { c.min[k] = Math.min(c.min[k], P[v*3+k]); c.max[k] = Math.max(c.max[k], P[v*3+k]); }
    }
    console.log(node.getName(), mesh.getName(), 'components', comps.size);
    const L = [...comps.values()].sort((a, b) => b.tris - a.tris);
    for (const c of L.slice(0, +(process.argv[4] || 40))) console.log(c.tris, 'min', c.min.map((x) => x.toFixed(2)).join(','), 'size', c.max.map((x, i) => (x - c.min[i]).toFixed(2)).join(','));
  }
}
