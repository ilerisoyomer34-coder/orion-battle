import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f), root = doc.getRoot();
  const skins = root.listSkins();
  const joints = skins.length ? skins[0].listJoints().map((j) => j.getName()) : [];
  const b = getBounds(root.listScenes()[0]);
  let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices() ? p.getIndices().getCount() : 0) / 3;
  console.log(f.split('/').pop(), 'skins', skins.length, 'joints', joints.length, 'tris', tris, 'size', b.max.map((x, i) => (x - b.min[i]).toFixed(2)).join(','), 'anims', root.listAnimations().length);
  console.log('  ', joints.slice(0, +(process.env.N || 30)).join(' '));
}
