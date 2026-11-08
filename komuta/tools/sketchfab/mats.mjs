import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import crypto from 'crypto';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const out = doc.getRoot().listMaterials().map((m) => { const t = m.getBaseColorTexture(); return m.getName() + ':' + (t ? crypto.createHash('md5').update(t.getImage()).digest('hex').slice(0, 6) : '-'); });
  console.log(f.split('/').pop(), out.join(' '));
}
