// telefon sürümü: normal/ORM/AO dokularını at, kalanları küçült; isteğe bağlı yalnız belirtilen kök düğümleri tut
// kullanım: node lotier.mjs girdi.glb çıktı.glb maxTex [tutulacakDüğüm1,düğüm2,…]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
const [,, inp, out, maxT = '512', keep = '', stripMaps = '1'] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
if (keep) {
  const K = new Set(keep.split(','));
  for (const n of root.listNodes()) {
    const p = n.getParentNode();
    if (p && /^RootNode$/.test(p.getName()) && !K.has(n.getName())) n.dispose();
  }
}
if (stripMaps === '1') for (const m of root.listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); }
await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+maxT, +maxT], quality: 78 }), prune());
await io.write(out, doc);
console.log(out, ((await import('fs')).statSync(out).size / 1e6).toFixed(2), 'MB');
