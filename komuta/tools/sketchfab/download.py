import sys, json, urllib.request, urllib.error, os, time

def get(url, tries=10):
    for i in range(tries):
        try:
            return json.load(urllib.request.urlopen(url, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code != 429 or i == tries - 1: raise
            w = int(e.headers.get('Retry-After') or 0) or 30 * (i + 1)
            print('  429, bekle', w, 's', flush=True); time.sleep(min(w, 300))

L = json.load(open('list.json')); only = sys.argv[1:]
meta = json.load(open('meta.json')) if os.path.exists('meta.json') else {}
for key, uid in L.items():
    if only and key not in only: continue
    out = f'raw/{key}.glb'
    if os.path.exists(out) and key in meta: print('skip', key); continue
    m = get(f'https://api.sketchfab.com/v3/models/{uid}')
    lic = m.get('license') or {}
    meta[key] = {'uid': uid, 'title': m['name'], 'author': m['user']['displayName'], 'username': m['user']['username'], 'profile': m['user']['profileUrl'], 'license': lic.get('label'), 'licenseUrl': lic.get('url'), 'source': m['viewerUrl']}
    d = get(f'https://api.sketchfab.com/v3/models/{uid}/download')
    fmt = 'glb' if 'glb' in d else 'gltf'
    url = d[fmt]['url']; print(key, fmt, round(d[fmt]['size']/1e6,1), 'MB', url.split('/')[2])
    dst = out if fmt == 'glb' else f'raw/{key}.zip'
    t0 = time.time(); urllib.request.urlretrieve(url, dst); print('  ok', round(time.time()-t0,1), 's', flush=True)
    json.dump(meta, open('meta.json', 'w'), indent=1)
    time.sleep(6)
