import sys, json, urllib.request, urllib.parse
q = sys.argv[1]; extra = sys.argv[2] if len(sys.argv) > 2 else ''
params = {'type':'models','q':q,'downloadable':'true','count':'24','sort_by':'-likeCount'}
for kv in extra.split('&'):
    if '=' in kv: k,v = kv.split('=',1); params[k]=v
url = 'https://api.sketchfab.com/v3/search?' + urllib.parse.urlencode(params)
d = json.load(urllib.request.urlopen(url, timeout=30))
for r in d['results']:
    lic = (r.get('license') or {}).get('label') or (r.get('license') or {}).get('slug')
    arch = r.get('archives') or {}
    glb = (arch.get('glb') or {}).get('size'); gltf = (arch.get('gltf') or {}).get('size')
    fc = r.get('faceCount'); 
    print(f"{r['uid']} | {r['name'][:60]} | {r['user']['username']} | {lic} | faces {fc} | glb {round((glb or 0)/1e6,1)}MB gltf {round((gltf or 0)/1e6,1)}MB | likes {r['likeCount']} anim {r.get('animationCount')}")
