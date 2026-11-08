import sys, json, urllib.request, os, time
L = json.load(open('list.json')); only = sys.argv[1:]
meta = json.load(open('meta.json')) if os.path.exists('meta.json') else {}
for key, uid in L.items():
    if only and key not in only: continue
    out = f'raw/{key}.glb'
    if os.path.exists(out) and key in meta: print('skip', key); continue
    m = json.load(urllib.request.urlopen(f'https://api.sketchfab.com/v3/models/{uid}', timeout=60))
    lic = m.get('license') or {}
    meta[key] = {'uid': uid, 'title': m['name'], 'author': m['user']['displayName'], 'username': m['user']['username'], 'profile': m['user']['profileUrl'], 'license': lic.get('label'), 'licenseUrl': lic.get('url'), 'source': m['viewerUrl']}
    req = urllib.request.Request(f'https://api.sketchfab.com/v3/models/{uid}/download')
    d = json.load(urllib.request.urlopen(req, timeout=60))
    fmt = 'glb' if 'glb' in d else 'gltf'
    url = d[fmt]['url']; print(key, fmt, round(d[fmt]['size']/1e6,1), 'MB', url.split('/')[2])
    dst = out if fmt == 'glb' else f'raw/{key}.zip'
    t0 = time.time(); os.makedirs('raw', exist_ok=True); urllib.request.urlretrieve(url, dst); print('  ok', round(time.time()-t0,1), 's')
    json.dump(meta, open('meta.json', 'w'), indent=1)
