#!/bin/bash
# her ham modeli kategorisine göre iyileştir: b_ (bina) 1024, v_ (araç) 1024, p_ (eşya) 512, c_ (sivil) 1024 + LOD
cd "$(dirname "$0")"
NPM=.
for f in raw/*.glb; do
  k=$(basename "$f" .glb); out=opt/$k.glb
  [ -f "$out" ] && continue
  case $k in
    b_*) tex=1024; simp=0 ;;
    v_*) tex=1024; simp=0 ;;
    p_*) tex=512; simp=0 ;;
    c_*) tex=1024; simp=0 ;;
    *) tex=1024; simp=0 ;;
  esac
  node opt.mjs "$f" "$out" $tex $simp 2>&1 | grep -v "^prune\|^dedup\|^weld\|^textureCompress\|^quantize\|^unpartition\|^debug" | tail -1
  if [[ $k == c_* ]]; then node opt.mjs "$f" "opt/${k}_lod.glb" 256 0.2 2>&1 | tail -1; fi
done
