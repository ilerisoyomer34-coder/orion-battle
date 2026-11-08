#!/bin/bash
# assets/lo/ telefon sürümlerini üret (lotier.mjs). Bina setlerinde yalnız kullanılan parçalar tutulur.
set -e
cd "$(dirname "$0")"; A=../../assets
mkdir -p $A/lo/world $A/lo/characters $A/lo/props $A/lo/weapons
keep() { node -e "global.K={ASSETDATA:{characters:{}}};require('../../js/worlddata.js');const M=K.ASSETDATA.world.models;console.log(Object.values(M).filter(d=>d.file==='$1'&&d.node).map(d=>d.node).join(','))"; }
for b in b_downtown b_midcity b_brownstone b_rural b_industrial; do
  node lotier.mjs opt/$b.glb $A/world/$b.glb 1024 "$(keep $b)" 0
  node lotier.mjs opt/$b.glb $A/lo/world/$b.glb 512 "$(keep $b)" 1
done
for f in $A/world/p_*.glb $A/world/v_*.glb; do node lotier.mjs $f $A/lo/world/$(basename $f) 256; done
for f in $A/characters/*.glb; do node lotier.mjs $f $A/lo/characters/$(basename $f) 512; done
for f in $A/weapons/*.glb; do node lotier.mjs $f $A/lo/weapons/$(basename $f) 256; done
node lotier.mjs $A/props/helicopter.glb $A/lo/props/helicopter.glb 512
