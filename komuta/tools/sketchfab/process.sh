#!/bin/bash
# raw/*.glb → opt/*.glb (oyunda kullanılan ayarlar). Önce: npm install && python3 download.py
set -e
cd "$(dirname "$0")"; mkdir -p opt
O() { node opt.mjs "raw/$1.glb" "opt/$2.glb" "$3" "${4:-0}" "${5:-0.002}" | tail -1; }
for b in b_downtown b_midcity b_brownstone b_industrial b_rural; do O $b $b 1024; done
node splittank.mjs raw/v_t80u.glb raw/v_t80u_split.glb -1117.8 -2163.0 6.4 6.55 -2163.0 7.2 9.2 -1124.5 && O v_t80u_split v_t80u 1024
for v in v_kiri10 v_illinois90 v_kiri86 v_urban10 v_shvan v_ambulance; do O $v $v 512; done
for v in v_kiri10 v_illinois90 v_kiri86 v_urban10 v_shvan; do O $v ${v}_lod 256 0.1 0.06; done
O v_hmmwv v_hmmwv 1024; O v_btr90 v_btr90 1024
O p_lamp p_lamp 256 0.04 0.05; O p_trees p_trees 1024; O p_city p_city 512 0.3 0.01; O p_sandbags p_sandbags 512 0.08 0.02
O p_jersey p_jersey 512; O p_tent p_tent 1024 0.12 0.02; O p_tower p_tower 512; O p_industrial p_industrial 512; O p_bench p_bench 512 0.5
for c in c_eric c_nathan c_carla c_sophia c_claudia; do O $c $c 1024; O $c ${c}_lod 256 0.2; done
for c in c_man2 c_man5 c_woman2 c_woman3 c_bizman; do O $c $c 512; done
python3 gen.py   # assets/world, assets/characters ve js/worlddata.js
# telefon sürümleri (assets/lo): kullanılmayan bina parçaları atılır, normal/ORM dokuları kaldırılır
./lotier.sh
