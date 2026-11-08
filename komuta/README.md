# KOMUTA: Gizli Operasyon

Üçüncü şahıs taktiksel aksiyon, ekip komutası ve rütbe ilerlemesi oyunu. Oyun, *KOMUTA — Gizli Operasyon* tasarım belgesine göre sıfırdan yazıldı ve tarayıcıda çalışıyor.

Oyuncu tek bir ajanla sahaya çıkar. Görev başarısıyla rütbe atladıkça daha büyük timleri, zırhlı araçları, tankı ve helikopteri yönetir. Çatışma tek çözüm değildir: gizlilik, delil toplama, tahliye ve ekibin güvenliği de puanı belirler.

> **Kurgu notu:** Şehir, teşkilat, Siyah Akrep örgütü, birlik ve kişi adları kurgusaldır.

---

## Çalıştırma

Kurulum ya da derleme gerekmez. Three.js `lib/` klasöründe hazır olduğu için oyun internet olmadan da çalışır.

```bash
# depo kökünden
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000/komuta/
```

GitHub Pages açıksa oyun `https://<kullanıcı>.github.io/orion-battle/komuta/` adresinden oynanır. Oyun bir PWA'dır: telefonda "Ana ekrana ekle" ile tam ekran ve çevrimdışı çalışır.


### Telefona uygulama olarak kurma (PWA)

Oyun bir PWA'dır: ana ekrana eklenince tam ekran, yatay ve tarayıcı çubuğu olmadan açılır. Açılışta yüklenen modeller cihazda saklanır; sonraki açılışlar hızlıdır ve internet olmadan da oynanır.

- **Android (Chrome):** Oyunu https adresinden aç → ana menüde **⤓ Ana ekrana ekle** düğmesi (veya Chrome menüsü → Uygulamayı yükle).
- **iPhone / iPad (Safari):** Ana menüde **⤓ Ana ekrana ekle** → Paylaş → Ana Ekrana Ekle.
- Kurulu uygulama ilk açılışta silah modellerini de arka planda indirir; menüde "✓ Çevrimdışı oynanabilir" yazınca internet gerekmez.
- Telefonda grafik kalitesi otomatik olarak **Düşük** seçilir: gölge yok, dokular 512 piksele küçültülür, uzaktaki eşyalar daha erken gizlenir.
- Görev başlarken telefon tam ekrana ve yatay kilide geçer, ekran kararmaz; isabet alınca ve ağır silahlarda titreşim olur (Ayarlar'dan kapatılabilir). Telefon dikey tutulursa "yatay çevirin" uyarısı çıkar.
- PWA kurulumu için oyunun **https** ile (ör. GitHub Pages) sunulması gerekir; claude.ai yayın sayfası gibi gömülü sayfalarda kurulum ve çevrimdışı önbellek çalışmaz.

## Kontroller

| Bilgisayar | Eylem | Komuta | Eylem |
|---|---|---|---|
| WASD | Hareket | **Q (basılı)** | Komut tekeri (oyun yavaşlar) |
| Fare | Kamera | 1–8 | Asker seç (Shift: listeye ekle) |
| Shift | Koş | 0 / ` | Tümünü seç |
| C / Ctrl | Eğil | F / B | Takip et / Bekle |
| Boşluk | Zıpla (helikopterde yüksel) | T / orta tık | Nişangâhtaki noktaya ilerle |
| E | Etkileşim (uzun işlemde basılı tut) | Tab | Ekip ve görev günlüğü |
| Sağ / sol fare | Nişan / ateş | M | Taktik harita (tıklayarak emir verilir) |
| R · X · H | Şarjör · silah değiştir · kılıf | G · N | Ekipman · gece görüş |
| V · L | Kamera · araç farları | Esc / P | Duraklat |

**Gizlilik:** Düşmanın arkasından E ile sessizce etkisiz hâle getirilir. Nişan alıp E'ye basınca "Teslim ol!" çağrısı yapılır. Teslim olan ya da bayılan şüpheli E ile kelepçelenir ve gözaltı bonusu kazanılır.

**Dokunmatik:** Sol joystick hareket ettirir (sona itince koşar), sağ alan kamerayı çevirir. Ateş, nişan, E, komut, takip/bekle/git, harita ve ekip için ayrı düğmeler vardır. Ayarlardan kapatılıp açılabilir.

---

## Sürüm raporu

Tasarım belgesinin 25. sayfası her sürümde bu başlıkların raporlanmasını istiyor.

### 1. Çalışan ve test edilen özellikler

| Sistem | Durum | Nasıl doğrulandı |
|---|---|---|
| TPS karakter: yürüme, koşu (dayanıklılık), eğilme, zıplama, kamera çarpışması | ✅ | Gerçek tuş girdisiyle canlı döngü testi |
| IK'lı prosedürel animasyon: 8 yönlü bacak, silah tutuşu, şarjör, selam, telsiz, teslim, kelepçe, yaralı | ✅ | Ekran görüntüleri |
| Silahlar (6 tür), saçılma, geri tepme, kafa vuruşu, susturucu gürültüsü | ✅ | İsabet testi |
| Ekip komutası: tekli/grup seçim, komut tekeri, A/B tim, haritadan emir | ✅ | **K2 kalite kapısı: 10 denemenin 10'unda hedefe ulaştı** |
| Asker durum makinesi (Boşta → Emir alındı → Rota → Hareket → Etkileşim → Tamamladı) ve "Konum erişilemiyor", "Asker yaralı", "Boş koltuk yok" geri bildirimleri | ✅ | Senaryolu test |
| A* navigasyon (0,5 m ızgara, kilitli kapı, çok katlı bina katmanları) | ✅ | Yol testleri |
| Gizlilik: görüş konisi, görüş hattı, ses, şüphe ölçeği, ceset/bayılmış arkadaş fark etme | ✅ | Şüphe 22 → 45 → 70 → 100 → alarm |
| Sessiz etkisizleştirme, teslim alma, gözaltı | ✅ | Senaryolu test |
| Siviller: dolaşma, panik, "Beni takip edin", güvenli bölgeye tahliye | ✅ | Senaryolu test |
| 4x4 ve 8x8 araç: sürüş, süspansiyon, koltuk, ekip bin/in | ✅ | **Kabul testi:** yaklaş → bin → kamera → sür → in |
| Tank: palet animasyonu, kamerayı izleyen taret, top, hasar | ✅ | Sürüş ve atış testi |
| Helikopter: rotor, pilotluk, otomatik intikal sineması, iniş, ekip bindirme | ✅ | Kalkış, uçuş ve iniş testi |
| TIR + dorse eklem fiziği, konvoy takibi, ele geçirme | ✅ | Görev testi |
| Kapılar, şifreli tuş takımı, anahtar, asansör ve merdivenle kat değişimi | ✅ | Görev 01 ve 06 testleri |
| 10 ana görev + 4 ek paket | ✅ | **14 görevin hepsi otomatik testte baştan sona tamamlandı** |
| Rapor ekranı, puan, not (S/A/B/C), XP, 9 rütbe, terfi töreni | ✅ | Görev 01 sonrası Teğmen'e terfi |
| Sürümlü kayıt sistemi (rütbe, görev, delil, karar, ayar) | ✅ | Sayfa yenilenince kayıt korunuyor |
| Hava ve zaman: gündüz, akşam, gece, yağmur (çatı altında durur), sis | ✅ | Ekran görüntüleri |
| HUD (PDF yerleşimi), mini harita, taktik harita, görev günlüğü, ipuçları | ✅ | Ekran görüntüleri |
| Dokunmatik kontroller (telefon/tablet yatay) | ✅ | iPhone 13 öykünmesi |

### 2. Model listesi

Oyundaki 3D modellerin büyük kısmı **Sketchfab**'dan alınmıştır (yalnızca CC BY 4.0 lisanslı modeller). Hepsi `tools/sketchfab/` betikleriyle indirildi, dokuları WebP'ye küçültüldü, ağları nicemlendi ve gerekirse sadeleştirildi.

- **Harita:** Şehrin dolgu binaları (şehir merkezi kuleleri, apartmanlar, eski şehir sıra evleri, çarşı dükkânları, sanayi depoları, gecekondu ve kırsal yapılar) Sketchfab bina setlerinden yerleştirilir. Her bina, prosedürel yerleşimin tabanına göre seçilir, kat yüksekliği korunarak ölçeklenir ve cephesi en yakın sokağa çevrilir. Çarpışma kutuları, yollar ve görev binalarının iç mekânları (ofis, kule, depo, tesis, merkez) prosedürel kalır.
- **Sokak:** Lambalar, trafik ışıkları, ağaçlar, banklar, beton bariyerler, kum torbaları, konteynerler, varil, çadır ve gözetleme kulesi.
- **Araçlar:** Sivil otomobiller, zırhlı SUV, minibüs, ambulans, HMMWV devriye, BTR-90 personel taşıyıcı ve T-80U tank. Tekerlekler döner; tankın tareti ve namlusu ayrı parçalara bölündüğü için hareket eder. Park hâlindeki arabalar sadeleştirilmiş sürümlerdir.
- **İnsanlar:** Tim askerleri "3 soldier low poly" (buh); düşmanlar call-of-duty projesinin asker modeli; siviller Renderpeople ve razvansavescu karakterleri. Tüm karakterler oyunun prosedürel animasyon iskeletine kemik eşleme ve kol IK'sı ile bağlanır.
- **Silahlar ve helikopter:** call-of-duty projesindeki 23 silah modeli ve nakliye helikopteri.
- **Prosedürel kalanlar:** TIR ve dorsesi, görev binaları ve iç eşyaları, yollar, arazi.

Kendi modelleri (call-of-duty projesi): MAR-556, MG-43, MR-82, D-50 ve M134. Düşman askeri bir Adobe Mixamo karakteridir (Vanguard); Mixamo koşullarına göre oyun içinde kullanılabilir, ham dosya olarak ayrıca dağıtılamaz.

| Kullanım | Model | Yazar | Lisans |
|---|---|---|---|
| Şehir merkezi binaları | [Downtown Buildings Set - Low Poly model](https://sketchfab.com/3d-models/downtown-buildings-set-low-poly-model-7378e7fb9c914c39880d9913a6f4e1d6) | Daniel Zhabotinsky | CC Attribution |
| Çarşı / dükkân binaları | [Midcity Buildings Set - Low Poly model](https://sketchfab.com/3d-models/midcity-buildings-set-low-poly-model-d5cbc471d20c4c9da31c3df656648916) | Daniel Zhabotinsky | CC Attribution |
| Eski şehir ve apartman binaları | [Brownstone Building Set - Low poly model](https://sketchfab.com/3d-models/brownstone-building-set-low-poly-model-b15e6344acd844eabc823e1cc8332574) | Daniel Zhabotinsky | CC Attribution |
| Sanayi ve depo binaları | [Industrial Buildings Set - Low poly models](https://sketchfab.com/3d-models/industrial-buildings-set-low-poly-models-e0b0d0342be24e6c923319991a2a4d3d) | Daniel Zhabotinsky | CC Attribution |
| Gecekondu ve kırsal yapılar | [Rural Buildings Set - Low Poly models](https://sketchfab.com/3d-models/rural-buildings-set-low-poly-models-51ab7e74bac347a89725f1d22b928edf) | Daniel Zhabotinsky | CC Attribution |
| Sokak lambası | [Street Lamp](https://sketchfab.com/3d-models/street-lamp-6881aa1e84b047d79860fa9297e05e22) | bez_glaza | CC Attribution |
| Trafik ışığı | [Street and City Props Dumpster Traffic Light](https://sketchfab.com/3d-models/street-and-city-props-dumpster-traffic-light-27a6775c51e44bfda8e1ac8725eb3e9e) | Spookyghostboo | CC Attribution |
| Ağaçlar | [Low Poly Forest Tree Pack](https://sketchfab.com/3d-models/low-poly-forest-tree-pack-5ff5a51e74324845a4e4905f182dfb2b) | 99.Miles | CC Attribution |
| Park bankı | [Park Bench](https://sketchfab.com/3d-models/park-bench-2ee2bc87756d4bf0932d83ab860ddb8f) | RBG_illustrations | CC Attribution |
| Beton bariyer | [Jersey Barrier](https://sketchfab.com/3d-models/jersey-barrier-0c5443577a07489694fa295d01478388) | bilgehan.korkmaz | CC Attribution |
| Varil ve konteyner | [PSX Industrial Pack](https://sketchfab.com/3d-models/psx-industrial-pack-12cb749961974f94a4063e67dafb2d76) | Tomitos | CC Attribution |
| Kum torbası siperi | [Sandbag Barrier (Ready for Unreal Engine)](https://sketchfab.com/3d-models/sandbag-barrier-ready-for-unreal-engine-593800671c8e45eca93b8b7c765c0f77) | G4AGamingLabs | CC Attribution |
| Askerî çadır | [Tent_Military](https://sketchfab.com/3d-models/tent-military-e06d68ead08a4c44bfd5f826ecca4987) | Mehdi Shahsavan | CC Attribution |
| Gözetleme kulesi | [Watchtower](https://sketchfab.com/3d-models/watchtower-bda39e79dbfa4976b1791b6b1f58259c) | Mehdi Shahsavan | CC Attribution |
| Sivil otomobil (Kiri '10) | [Kiri '10 - Low poly model](https://sketchfab.com/3d-models/kiri-10-low-poly-model-7fd6e15785fa4aa9bfd6e31eb7c97ba6) | Daniel Zhabotinsky | CC Attribution |
| Sivil otomobil (Illinois '90) | [Illinois '90 - Low poly model](https://sketchfab.com/3d-models/illinois-90-low-poly-model-d604871eee5b4181bb298163b0b675b7) | Daniel Zhabotinsky | CC Attribution |
| Sivil otomobil (Kiri '86) | [Kiri '86 - Low poly model](https://sketchfab.com/3d-models/kiri-86-low-poly-model-5c17c582ef9549798f694b660feea42a) | Daniel Zhabotinsky | CC Attribution |
| Zırhlı SUV (Urban '10) | [Urban '10 - Low poly model](https://sketchfab.com/3d-models/urban-10-low-poly-model-2866efdfa943484391ef8313768e074d) | Daniel Zhabotinsky | CC Attribution |
| Minibüs (Shvan '92) | [Shvan '92 - Low poly model](https://sketchfab.com/3d-models/shvan-92-low-poly-model-09d718c9cf72401b8534d265a06a803f) | Daniel Zhabotinsky | CC Attribution |
| Ambulans | [Shvan '92 Ambulance - Low Poly model](https://sketchfab.com/3d-models/shvan-92-ambulance-low-poly-model-2856dd3c61f940909dced9a5c0379484) | Daniel Zhabotinsky | CC Attribution |
| 4x4 zırhlı devriye (HMMWV) | [HMMWV M998A1 (soft top)](https://sketchfab.com/3d-models/hmmwv-m998a1-soft-top-ffbc4b053628413fb84acf5b89595d96) | 42manako | CC Attribution |
| 8x8 personel taşıyıcı (BTR-90) | [BTR-90 Rostok](https://sketchfab.com/3d-models/btr-90-rostok-f4568f2e30f3473f8ef6e9c7172d2c14) | 42manako | CC Attribution |
| Ana muharebe tankı (T-80U) | [T-80U](https://sketchfab.com/3d-models/t-80u-af0fe83d1539422ebfa9cef861876a4f) | 42manako | CC Attribution |
| Tim askeri (squad_forest) | [3 soldier low poly (outdated)](https://sketchfab.com/3d-models/3-soldier-low-poly-outdated-9b5bd75966764a87ae09c8b77e21f4c2) | buh | CC-BY-4.0 |
| Tim askeri (squad_desert) | [3 soldier low poly (outdated)](https://sketchfab.com/3d-models/3-soldier-low-poly-outdated-9b5bd75966764a87ae09c8b77e21f4c2) | buh | CC-BY-4.0 |
| Tim askeri (squad_woodland) | [3 soldier low poly (outdated)](https://sketchfab.com/3d-models/3-soldier-low-poly-outdated-9b5bd75966764a87ae09c8b77e21f4c2) | buh | CC-BY-4.0 |
| Sivil: Eric (takım elbiseli) | [Eric Rigged 001 - Rigged 3D Business Man](https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f) | Renderpeople | CC Attribution |
| Sivil: Nathan | [Nathan Animated 003 - Walking 3D Man](https://sketchfab.com/3d-models/nathan-animated-003-walking-3d-man-143a2b1ea5eb4385ae90a73657aca3bc) | Renderpeople | CC Attribution |
| Sivil: Carla | [Carla Rigged 001 - Rigged 3D Business Women](https://sketchfab.com/3d-models/carla-rigged-001-rigged-3d-business-women-acf520f450d14dd799f98a6fede3edf5) | Renderpeople | CC Attribution |
| Sivil: Sophia | [Sophia Animated 003 - Animated 3D Woman](https://sketchfab.com/3d-models/sophia-animated-003-animated-3d-woman-dc448c3be0e74f96a55fb475a13433cf) | Renderpeople | CC Attribution |
| Sivil: Claudia | [Claudia Rigged 002 - 3D Rigged Business Women](https://sketchfab.com/3d-models/claudia-rigged-002-3d-rigged-business-women-c659bd0accab47c6bbe390cf822a2b92) | Renderpeople | CC Attribution |
| Sivil: Gündelik erkek 2 | [Low-poly Man Casual Clothes 2](https://sketchfab.com/3d-models/low-poly-man-casual-clothes-2-4a834adf1e33405c979e94555e7955c6) | Razvan Savescu | CC Attribution |
| Sivil: Gündelik erkek 5 | [Low-poly Man Casual Clothes 5](https://sketchfab.com/3d-models/low-poly-man-casual-clothes-5-2cb8c4b198e64a92b4bc9d32a0f2973d) | Razvan Savescu | CC Attribution |
| Sivil: Gündelik kadın 2 | [Low-poly Woman Casual 2](https://sketchfab.com/3d-models/low-poly-woman-casual-2-7b127f7a90e645eca0a3a48f056fc928) | Razvan Savescu | CC Attribution |
| Sivil: Gündelik kadın 3 | [Low-poly Woman Casual 3](https://sketchfab.com/3d-models/low-poly-woman-casual-3-b71bf9a6065c4836b291258f1d8587b9) | Razvan Savescu | CC Attribution |
| Sivil: İş adamı | [Business Man - Low Polygon game character](https://sketchfab.com/3d-models/business-man-low-polygon-game-character-b6f6740f883b4749abac47af0045a9dd) | manoeldarochadeoliveira | CC Attribution |
| Silah (k8) | [low-poly C8 IUR](https://sketchfab.com/3d-models/low-poly-c8-iur-0204eaad7005420cb0694d4af81f1485) | D_U | CC-BY-4.0 |
| Silah (kr4) | [low-poly Colt M4A1](https://sketchfab.com/3d-models/low-poly-colt-m4a1-c0313e9f6c164de8903615c4297a2485) | D_U | CC-BY-4.0 |
| Silah (kt9) | [Gun](https://sketchfab.com/3d-models/gun-a66b52ede9af472a9a9e0946154d603c) | Dries Deryckere | CC-BY-4.0 |
| Silah (mk4) | [m4 Carbine Rifle](https://sketchfab.com/3d-models/m4-carbine-rifle-37cafb82ae144484a26e9ab71a0f8f0e) | Pieter Ferreira | CC-BY-4.0 |
| Silah (knife) | [Knife](https://sketchfab.com/3d-models/knife-8374ea78a11c4be5a2f145448c17c90e) | CG Lab34 | CC-BY-4.0 |
| Silah (ak74) | [low-poly AK-74M Zenitco](https://sketchfab.com/3d-models/low-poly-ak-74m-zenitco-35ad8e37a513453cbbbd04064fa5fb79) | D_U | CC-BY-4.0 |
| Silah (bren2) | [low-poly CZ Bren 2](https://sketchfab.com/3d-models/low-poly-cz-bren-2-90b2de2d55e9458f9c7d8ffeac9003af) | D_U | CC-BY-4.0 |
| Silah (awm) | [Sniper](https://sketchfab.com/3d-models/sniper-cdefd833b4b5407ba32c53c9e7f50cae) | DJMaesen | CC-BY-4.0 |
| Silah (bazooka) | [Bazooka M20](https://sketchfab.com/3d-models/bazooka-m20-a53d6716c9c24302a6fdd71ff70a7d63) | Melvin Stubbe | CC-BY-4.0 |
| Silah (ak47) | [AK-47  - Game Ready Assault Rifle Weapon](https://sketchfab.com/3d-models/ak-47-game-ready-assault-rifle-weapon-dc58144409534abbb60970638d171f9f) | Billy Jackman | CC-BY-4.0 |
| Silah (adar215) | [low-poly ADAR 2-15](https://sketchfab.com/3d-models/low-poly-adar-2-15-fb58636c7cf74912b86f0dab6fe63099) | D_U | CC-BY-4.0 |
| Silah (g95) | [low-poly G95 A1](https://sketchfab.com/3d-models/low-poly-g95-a1-6e66f2cb28234868b06940669c7d388a) | D_U | CC-BY-4.0 |
| Silah (mp7) | [low-poly HK MP7 A1](https://sketchfab.com/3d-models/low-poly-hk-mp7-a1-4715a09c0d054bdba7c0fbf0929a9878) | D_U | CC-BY-4.0 |
| Silah (stm556) | [low-poly STM-556](https://sketchfab.com/3d-models/low-poly-stm-556-bd1b7c5385724474b6efff71b0b0bb1a) | D_U | CC-BY-4.0 |
| Silah (m4super90) | [M4 Super 90 (JW2) Brand-Friendly version](https://sketchfab.com/3d-models/m4-super-90-jw2-brand-friendly-version-7e472e24152246708cac8b6f1613c7a8) | 8sianDude | CC-BY-4.0 |
| Silah (ar10t) | [Armalite AR-10(T) Battle Rifle](https://sketchfab.com/3d-models/armalite-ar-10t-battle-rifle-415a20e0f50c4e1a9c2da542857c4737) | 8sianDude | CC-BY-4.0 |
| Silah (ithaca37) | [Ithaca Model 37 "Riot" Shotgun](https://sketchfab.com/3d-models/ithaca-model-37-riot-shotgun-8caca0af16a74184bb63758f7b58c22a) | 8sianDude | CC-BY-4.0 |
| Silah (uar10) | [low-poly UAR-10](https://sketchfab.com/3d-models/low-poly-uar-10-759c7788575c468d908a59c7a7405c05) | D_U | CC-BY-4.0 |
| Nakliye helikopteri | [HELICOPTER](https://sketchfab.com/3d-models/helicopter-c33f1be4708b422e8750d9b1db9894bf) | pranav27 | CC-BY-4.0 |

| Kullanılan dış kütüphane | Sürüm | Lisans |
|---|---|---|
| three.js (GLTFLoader, SkeletonUtils dahil) | r160 | MIT (`lib/THREE_LICENSE.txt`) |

### 3. Teknik durum

- **Motor:** three.js r160, WebGL2, ACES ton eşleme, PCF yumuşak gölge, ortam yansıması (PMREM)
- **Yapı:** Derleme adımı yoktur; sıralı yüklenen 16 JavaScript dosyası (aşağıda)
- **Ses:** WebAudio ile tamamen prosedürel üretiliyor; ses dosyası yok. Telsiz konuşmaları isteğe bağlı olarak tarayıcının konuşma sentezini kullanır.

| Dosya | Sorumluluk |
|---|---|
| `js/core.js` | Yardımcılar, olay yolu, girdi, ses motoru, sürümlü kayıt |
| `js/textures.js` | Prosedürel canvas dokuları (cepheler, gece pencereleri, atlas, logolar) |
| `js/models.js` | Parça birleştirici, karakter iskeleti, silahlar, 2 kemikli IK animasyon |
| `js/vehmodels.js` | Araç modelleri ve sahne eşyaları |
| `js/world.js` | Şehir, girilebilir binalar, kapılar, çarpışma, ışın testi, hava/zaman |
| `js/nav.js` | A* navigasyon ızgarası, bağlantı bileşenleri, kat katmanları |
| `js/combat.js` | Silah tanımları, aktör temeli, isabet, patlama, parçacıklar |
| `js/vehicles.js` | Tekerli/paletli sürüş, helikopter uçuşu, dorse, yapay zekâ sürüş |
| `js/player.js` | Oyuncu, kamera, dron |
| `js/ai.js` | Ekip, düşman ve sivil yapay zekâsı, komut sistemi |
| `js/progression.js` | Rütbeler, birlikler, kadro, yetenek ağacı, ödüller |
| `js/missions.js` | Görev yöneticisi: hedefler, olaylar, puanlama |
| `js/missiondefs.js` | 14 görevin içeriği, diyaloglar, karar noktaları |
| `js/ui.js` | HUD, komut tekeri, haritalar, diyalog, merkez, brifing, rapor |
| `js/main.js` | Açılış, döngü, durumlar, intikal, etkileşim |

### 4. Performans

- Statik şehir 90 m'lik parçalara bölündü. Böylece görüş dışı ayıklama ve gölge kamerası verimli çalışır. Orta kalitede tipik sahne yaklaşık 190 çizim çağrısı ve 100 bin üçgen.
- Kalite seviyeleri:
  - **Yüksek:** 2048 gölge haritası, 6 sokak lambası ışığı
  - **Orta:** 1024 gölge haritası, 4 ışık
  - **Düşük (mobil):** gölge yok, 2 ışık, piksel oranı 1
- Uzaktaki karakterlerin gölgesi kapanır, çok uzaktakilerin animasyonu atlanır, yol bulma istekleri her kareye bütçelenir.
- Testler GPU'suz (yazılımsal SwiftShader) bir ortamda yapıldığı için **gerçek cihaz FPS ölçümü yapılamadı**. Hedef cihazda ayarlardan "FPS göster" açılarak ölçülmeli.

### 5. Açık sorunlar ve sınırlar

- **Motor:** Tasarım belgesi Unreal Engine 5 ve Sketchfab istiyor. Bu ortamda UE5 çalıştırılamadığı için oyun aynı tasarımın tarayıcıda oynanabilir dikey dilimi olarak yazıldı; UE5 projesi değildir.
- **Görsel:** Sketchfab modelleri düşük poligonludur; bazı binalar tabana uydurmak için hafifçe esnetilir. Görev binaları prosedürel görünümdedir.
- **Boyut:** Model dosyaları toplam yaklaşık 70 MB'tır; ilk açılış yavaş bağlantıda uzun sürebilir.
- **Mobil:** Telefonda tam şehir ve gölgeler zorlayabilir; düşük kalite önerilir.
- **Helikopter:** Uçuş modeli bilinçli olarak basitleştirilmiş (arcade) tutuldu.
- **Kapsam:** Kalabalık ve trafik yoğunluğu performans için sınırlı tutuldu.

### 6. Sonraki adım

1. Gerçek cihazda FPS ve bellek ölçümü yapıp kalite ayarlarını ince ayarlamak.
2. Görev binalarının dış cephelerini de Sketchfab modelleriyle değiştirmek; TIR için dorseli bir model bulmak.
3. Örtü alma (cover) davranışı ve düşman ekip taktikleri eklemek.
4. Rütbe 4–9 için ek görev türleri ve operasyon merkezi güncellemeleri yapmak.

---

## Görevler

| No | Görev | Bölge | Öne çıkan mekanik |
|---|---|---|---|
| 01 | İLK EMİR | Vertex Plaza ofis binası | Sivil kılık, diyalog, ipuçları, tuş takımı, "al ya da kopyala" kararı |
| 02 | KAYIP AJAN | Eski şehir | Muhbir (para/ikna/tehdit), arama bölgeleri, ilk yardım, tahliye |
| 03 | GECE OPERASYONU | Sanayi deposu (gece, yağmur) | Giriş seçimi (kapı ya da çit), belgeler, terminal, gözaltı |
| 04 | ÇELİK KUVVET | Enerji tesisi | Ekibi ikiye bölme: savunma ve süreli bomba imhası |
| 05 | ŞEHİRDE KRİZ | Kent meydanı | Zırhlı araçla intikal, bariyer kurma, sivil tahliyesi, ambulans yolu |
| 06 | MAFYA BİNASI | 3 katlı Kule Plaza | Asansör/merdiven, kat hedefleri, liderin canlı gözaltısı |
| 07 | KIRMIZI BÖLGE | Batı mahalleleri | A/B timleri, birleşme, taşıyıcıyla konvoy, pusu |
| 08 | SEÇKİN BİRLİK | Dağlık bölge (gece, sis) | Helikopter intikali, dron keşfi, hava desteği kararı, rehine kurtarma |
| 09 | BÜYÜK OPERASYON | Liman | Tank, kaçan TIR, konteyner sahası, helikopterle tahliye |
| 10 | SON EMİR | Şehir → liman | Tanık, konvoy takibi, final; 4 farklı son (delil ve kararlara göre) |
| EK-1 | KARANLIK SEVKİYAT | TIR garajı → liman | Doğru dorseyi bulma, mesafeli takip, TIR'ı ele geçirme |
| EK-2 | HAVA KÖPRÜSÜ | Şehir geneli | Helikopter pilotluğu, 3 iniş bölgesi, hastane çatısı |
| EK-3 | ÇELİK HAT | Ana caddeler | Zırhlı konvoy, kontrol noktaları, pusu savunması |
| EK-4 | KAYBOLAN KANIT | Kafe terası | Ateşsiz diyalog bulmacası, çelişkili ifadeler |
