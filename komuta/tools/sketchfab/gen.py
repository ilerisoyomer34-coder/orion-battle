import json, shutil, math, os
meta = json.load(open('meta.json'))
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..') + '/'
PI = math.pi
files = {}
def use(key, sub='world'):
    dst = f'assets/{sub}/{key}.glb'
    shutil.copy(f'opt/{key}.glb', G + dst)
    files[key] = dst
    return key
# ── binalar
S = {
 'glass': ['Downtown_ModernOffice_1', 'Downtown_ModernOffice_1_B', 'Downtown_ModernOffice_4', 'Downtown_ModernOffice_5', 'Downtown_ModernOffice_5_B', 'Downtown_ClassicOffice_1', 'Downtown_ArtDeco_1'],
 'office': ['Downtown_BrownstoneOffice_1', 'Downtown_Mall_1', 'Downtown_PublicBuilding_1', 'Downtown_Brutal_1', 'Downtown_ModernOffice_2', 'Downtown_ModernOffice_3', 'Downtown_Residential_2', 'MidCity_Commercial_8', 'MidCity_Commercial_14'],
 'apt': ['Downtown_Residential_3', 'Downtown_Residential_4', 'Brownstone_FlatFacade_1', 'Brownstone_FlatFacade_2', 'Brownstone_FlatFacade_3', 'Brownstone_FlatFacade_4', 'Brownstone_FlatFacade_5', 'Brownstone_FlatFacade_6', 'Brownstone_FlatFacade_7', 'Brownstone_FlatFacade_8', 'Brownstone_FlatFacade_9', 'Brownstone_FlatFacade_12', 'Brownstone_FlatFacadeComplex_1', 'Brownstone_FlatFacadeComplex_2', 'Brownstone_Harlem_1_B', 'Brownstone_Lowrise_1_B'],
 'old': ['Brownstone_Classic_1', 'Brownstone_Commercial_1', 'Brownstone_Commercial_1_C', 'Brownstone_ClassicComplex_1', 'Brownstone_ClassicComplex_2', 'Brownstone_FlatFacade_6_B', 'Brownstone_FlatFacade_7_B', 'Brownstone_FlatFacade_9_B', 'Brownstone_Harlem_1', 'Brownstone_Lowrise_1', 'Brownstone_Lowrise_1_C', 'MidCity_Commercial_1', 'MidCity_Commercial_2', 'MidCity_Commercial_4', 'MidCity_Commercial_5', 'MidCity_Commercial_5_B', 'MidCity_Commercial_6', 'MidCity_Commercial_7', 'MidCity_Commercial_10', 'MidCity_Commercial_11', 'MidCity_Commercial_12', 'MidCity_Commercial_13', 'MidCity_Commercial_15'],
 'shack': ['Rural_HouseOld_1', 'Rural_UnmobileHome_1', 'Rural_StoreSmall_1', 'Rural_StoreSmall_2', 'Rural_StoreSmall_3', 'Rural_StoreSmall_5', 'Rural_StoreSmall_6', 'Rural_StoreSmall_7', 'Rural_StoreSmall_8', 'Rural_WoodenBuilding_1', 'Rural_WoodenBuilding_2', 'Rural_WoodenBuilding_3', 'Rural_WoodenBuilding_4', 'Rural_WoodenBuilding_5', 'Rural_Diner_1', 'Rural_Diner_2', 'Rural_QuonsetHut_1'],
 'ind': ['Industrial_Building_1', 'Industrial_Building_10', 'Industrial_Duplex_1', 'Industrial_GenericBuilding_3', 'Industrial_GenericBuilding_4', 'Industrial_Hangar_2', 'Industrial_LogisticTerminal_1', 'Industrial_Railroad_Loadbay_Shed_1', 'Industrial_Smth_1', 'Industrial_Smth_2', 'Industrial_Warehouse_1', 'Industrial_Warehouse_3', 'Industrial_Warehouse_4', 'Industrial_Warehouse_5', 'Industrial_WarehouseSmall_4', 'Industrial_FactoryPlant_1', 'Industrial_FactoryPlant_2'],
}
setOf = lambda n: 'b_downtown' if n.startswith('Downtown') else 'b_midcity' if n.startswith('MidCity') else 'b_brownstone' if n.startswith('Brownstone') else 'b_rural' if n.startswith('Rural') else 'b_industrial'
models = {}
for st, names in S.items():
    for n in names:
        f = use(setOf(n))
        mid = 'bld_' + n
        if mid in models: models[mid]['style'].append(st)
        else: models[mid] = {'file': f, 'node': n, 'kind': 'building', 'style': [st]}
# ── eşyalar
use('p_lamp'); models['lamp'] = {'file': 'p_lamp', 'kind': 'lamp', 'rotY': PI / 2}
use('p_city'); models['traffic_light'] = {'file': 'p_city', 'node': 'metal_street_props_low_poly', 'kind': 'trafficLight'}
use('p_trees')
for i, n in enumerate(['Background_Tree_Atlas'] + [f'Background_Tree_Atlas{i:03d}' for i in range(1, 8)]):
    models[f'tree_{i}'] = {'file': 'p_trees', 'node': n, 'kind': 'tree', 'cast': True}
    models[f'pine_{i}'] = {'file': 'p_trees', 'node': n, 'kind': 'pine'}
use('p_bench'); models['bench'] = {'file': 'p_bench', 'kind': 'bench'}
use('p_jersey'); models['jersey'] = {'file': 'p_jersey', 'kind': 'barrier', 'rotY': PI / 2}
use('p_industrial'); models['barrel'] = {'file': 'p_industrial', 'node': 'BarrelOil', 'kind': 'barrel', 'tint': True}
models['container'] = {'file': 'p_industrial', 'node': 'CargoContainer', 'kind': 'container', 'tint': True}
use('p_sandbags'); models['sandbags'] = {'file': 'p_sandbags', 'kind': 'sandbags'}
use('p_tent'); models['tent'] = {'file': 'p_tent', 'kind': 'tent'}
use('p_tower'); models['watchtower'] = {'file': 'p_tower', 'kind': 'watchtower'}
for v in ['v_kiri10', 'v_illinois90', 'v_kiri86', 'v_urban10']:
    use(v + '_lod'); models['car_' + v[2:]] = {'file': v + '_lod', 'kind': 'car', 'rotY': -PI / 2, 'skip': 'interior|steering|suspension|glass_driver|glass_passenger|badges|numberplate', 'shareMats': True}
use('v_shvan_lod'); models['car_shvan'] = {'file': 'v_shvan_lod', 'kind': 'van', 'rotY': -PI / 2, 'skip': 'interior|steering|suspension|glass_driver|glass_passanger|badges|numberplate', 'shareMats': True}
# ── sürülebilir araçlar
for v in ['v_kiri10', 'v_illinois90', 'v_kiri86', 'v_urban10', 'v_shvan', 'v_ambulance', 'v_hmmwv', 'v_btr90', 'v_t80u']: use(v)
DZ = {'rotY': -PI / 2, 'wheels': 'WheelStock'}
vehicles = {
 'sedan': [dict(DZ, file='v_kiri10', len=4.4), dict(DZ, file='v_illinois90', len=4.6), dict(DZ, file='v_kiri86', len=4.4)],
 'suv': dict(DZ, file='v_urban10', len=4.8, tint=True, tintMat='bodymat'),
 'van': dict(DZ, file='v_shvan', len=5.0),
 'ambulance': dict(DZ, file='v_ambulance', len=5.0, siren=0.6),
 'patrol': {'file': 'v_hmmwv', 'rotY': 0, 'len': 5.0},
 'apc': {'file': 'v_btr90', 'rotY': PI, 'len': 7.9},
 'tank': {'file': 'v_t80u', 'rotY': PI / 2, 'len': 11.6, 'turret': 'Turret', 'barrel': 'Barrel', 'trunnion': 0.4},
}
# ── atıflar
WHAT = {'b_downtown': 'Şehir merkezi binaları', 'b_midcity': 'Çarşı / dükkân binaları', 'b_brownstone': 'Eski şehir ve apartman binaları', 'b_industrial': 'Sanayi ve depo binaları', 'b_rural': 'Gecekondu ve kırsal yapılar',
        'p_lamp': 'Sokak lambası', 'p_city': 'Trafik ışığı', 'p_trees': 'Ağaçlar', 'p_bench': 'Park bankı', 'p_jersey': 'Beton bariyer', 'p_industrial': 'Varil ve konteyner', 'p_sandbags': 'Kum torbası siperi', 'p_tent': 'Askerî çadır', 'p_tower': 'Gözetleme kulesi',
        'v_kiri10': 'Sivil otomobil (Kiri \'10)', 'v_illinois90': 'Sivil otomobil (Illinois \'90)', 'v_kiri86': 'Sivil otomobil (Kiri \'86)', 'v_urban10': 'Zırhlı SUV (Urban \'10)', 'v_shvan': 'Minibüs (Shvan \'92)', 'v_ambulance': 'Ambulans', 'v_hmmwv': '4x4 zırhlı devriye (HMMWV)', 'v_btr90': '8x8 personel taşıyıcı (BTR-90)', 'v_t80u': 'Ana muharebe tankı (T-80U)'}
credits = {}
for k, w in WHAT.items():
    m = meta[k]
    credits[k] = {'what': w, 'title': m['title'], 'author': m['author'] + ' (' + m['profile'] + ')', 'license': (m['license'] or '') + ' (' + (m['licenseUrl'] or '') + ')', 'source': m['source']}
credits['v_t80u']['change'] = 'Taret ve namlu ayrı parçalara bölündü, dokular küçültüldü (WebP)'
# ── siviller
CIV = {'c_eric': ('m', 'Eric (takım elbiseli)'), 'c_nathan': ('m', 'Nathan'), 'c_carla': ('f', 'Carla'), 'c_sophia': ('f', 'Sophia'), 'c_claudia': ('f', 'Claudia'),
       'c_man2': ('m', 'Gündelik erkek 2'), 'c_man5': ('m', 'Gündelik erkek 5'), 'c_woman2': ('f', 'Gündelik kadın 2'), 'c_woman3': ('f', 'Gündelik kadın 3'), 'c_bizman': ('m', 'İş adamı')}
chars = {}
for k, (g, label) in CIV.items():
    use(k, 'characters'); lod = None
    if os.path.exists(f'opt/{k}_lod.glb'): use(k + '_lod', 'characters'); lod = f'assets/characters/{k}_lod.glb'
    m = meta[k]
    chars['civ_' + k[2:]] = {'file': f'assets/characters/{k}.glb', 'lod': lod, 'civ': g, 'label': label, 'height': 1.74 if g == 'm' else 1.66, 'armStretch': 1.0, 'tpose': True,
        'special': k in ('c_eric', 'c_bizman'),
        'credit': {'title': m['title'], 'author': m['author'] + ' (' + m['profile'] + ')', 'license': (m['license'] or '') + ' (' + (m['licenseUrl'] or '') + ')', 'source': m['source']}}
world = {'files': {k: v for k, v in files.items() if v.startswith('assets/world/')}, 'models': models, 'vehicles': vehicles, 'credits': credits}
js = "/* KOMUTA — Sketchfab harita/araç/sivil varlık verisi (tools/sketchfab/gen.py ile üretildi) */\n'use strict';\n(function () {\n  const D = K.ASSETDATA;\n  D.world = " + json.dumps(world, ensure_ascii=False, indent=1) + ";\n  Object.assign(D.characters, " + json.dumps(chars, ensure_ascii=False, indent=1) + ");\n})();\n"
open(G + 'js/worlddata.js', 'w').write(js)
print('models', len(models), 'files', len(files))
