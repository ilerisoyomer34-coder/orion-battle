// kullanım: node inspect.mjs model.glb [maxDepth=3]
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [,, inp, md = '3'] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
const tris = (node) => { let t = 0; node.traverse((n) => { const m = n.getMesh(); if (m) for (const p of m.listPrimitives()) { const i = p.getIndices(); t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; } }); return t; };
const f = (v) => v.map((x) => x.toFixed(2)).join(',');
for (const sc of root.listScenes()) {
  const b = getBounds(sc); console.log('SCENE', sc.getName(), 'min', f(b.min), 'max', f(b.max), 'tris', root.listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((c, p) => c + (p.getIndices() ? p.getIndices().getCount() / 3 : 0), 0), 0));
  const walk = (n, d) => {
    if (d > +md) return;
    const kids = n.listChildren();
    const bb = getBounds(n); const sz = bb.max.map((x, i) => x - bb.min[i]);
    console.log('  '.repeat(d) + `${n.getName() || '(adsız)'} | mesh:${n.getMesh() ? n.getMesh().getName() : '-'} | kids ${kids.length} | tris ${tris(n)} | size ${f(sz)} | min ${f(bb.min)}`);
    for (const k of kids) walk(k, d + 1);
  };
  for (const n of sc.listChildren()) walk(n, 0);
}
console.log('materials:', root.listMaterials().map((m) => m.getName()).join(' | '));
console.log('textures:', root.listTextures().map((t) => `${t.getName()} ${t.getMimeType()} ${t.getSize()}`).join(' | '));
