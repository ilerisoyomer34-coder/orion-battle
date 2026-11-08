// kullanım: node opt.mjs girdi.glb çıktı.glb [maxTex=1024] [simplifyRatio=0]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, resample, textureCompress, quantize, simplify, flatten, join, instance, unpartition } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [,, inp, out, maxT = '1024', simp = '0'] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
// gereksiz uzantılar / animasyonlar
for (const a of root.listAnimations()) a.dispose();
await doc.transform(dedup(), prune(), weld());
if (+simp > 0) { await MeshoptSimplifier.ready; await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: +simp, error: 0.002 })); }
const M = +maxT;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [M, M], quality: 82 }));
await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), prune(), unpartition());
await io.write(out, doc);
const st = (await import('fs')).statSync(out).size;
console.log(out, (st / 1e6).toFixed(2) + ' MB', 'meshes', root.listMeshes().length, 'mats', root.listMaterials().length, 'tex', root.listTextures().length);
