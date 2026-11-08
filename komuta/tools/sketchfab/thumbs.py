import sys, json, urllib.request, io
from PIL import Image, ImageDraw
uids = sys.argv[2:]; out = sys.argv[1]
tiles = []
for u in uids:
    try:
        d = json.load(urllib.request.urlopen(f'https://api.sketchfab.com/v3/models/{u}', timeout=30))
        imgs = sorted(d['thumbnails']['images'], key=lambda i: abs(i['width'] - 400))
        im = Image.open(io.BytesIO(urllib.request.urlopen(imgs[0]['url'], timeout=30).read())).convert('RGB')
        im.thumbnail((400, 225)); t = Image.new('RGB', (400, 250), (20, 20, 20)); t.paste(im, (0, 0))
        ImageDraw.Draw(t).text((4, 230), (u[:6] + ' ' + d['name'])[:60], fill=(255, 255, 0))
        tiles.append(t)
    except Exception as e:
        print('fail', u, e)
cols = 3; rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (400 * cols, 250 * rows), (0, 0, 0))
for i, t in enumerate(tiles): sheet.paste(t, ((i % cols) * 400, (i // cols) * 250))
sheet.save(out); print('saved', out, len(tiles))
