# Sketchfab varlık hattı

Oyunun çalışması için gerekmez; harita, araç ve sivil modellerini Sketchfab'dan yeniden indirmek ve küçültmek içindir.

1. `api.sketchfab.com` için Sketchfab API anahtarı ortamın ağ sırlarına kayıtlı olmalı
   (başlık `Authorization`, önek `Token`). İndirme dosyaları `sketchfab-prod-media.s3.amazonaws.com`
   sunucusundan gelir; önizlemeler `media.sketchfab.com`.
2. `npm install`
3. `python3 download.py` → `raw/*.glb` ve `meta.json` (başlık, yazar, lisans, kaynak)
4. `./process.sh` → `opt/*.glb` (WebP dokular: bina/araç/sivil 1024 px, eşya 512 px; nicemlenmiş ağlar;
   siviller için %20 LOD)
5. `node inspect.mjs opt/x.glb 3` → düğüm ağacı, boyutlar (tekerlek/taret/bina parçası adları için)

`list.json`: oyunda kullanılan modellerin Sketchfab kimlikleri (yalnızca CC BY 4.0).
`search.py "sorgu" "license=by&max_face_count=50000"` ve `thumbs.py çıktı.jpg uid…` model seçmek için.
