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

Sketchfab modelleri bu ortamdan indirilemediği için **tüm modeller kod içinde prosedürel olarak üretildi**; dışarıdan hiçbir 3D dosya kullanılmadı ve lisans riski yoktur. Bunlar asker ve sivil iskeletleri, 6 silah, 4x4, 8x8, tank, helikopter, TIR ve dorse, sivil araçlar, binalar, iç mekânlar ve sahne eşyalarıdır.

Belgedeki Sketchfab kataloğu (Modern Tank, UH-60, SISU GTP, Logistics Semi-Truck, Soldier Tactical Gear vb.) ileride gerçek modellerle değiştirmek için aday olarak duruyor. Modellerin hepsi `js/models.js` ve `js/vehmodels.js` dosyalarında tek fonksiyonlarla kurulduğu için bir glTF yükleyiciyle değiştirilebilirler.

| Kullanılan dış kütüphane | Sürüm | Lisans |
|---|---|---|
| three.js | r160 | MIT (`lib/THREE_LICENSE.txt`) |

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
- **Görsel:** Modeller prosedürel ve köşelidir; sinematik UE5 kalitesinde değildir.
- **Mobil:** Telefonda tam şehir ve gölgeler zorlayabilir; düşük kalite önerilir.
- **Helikopter:** Uçuş modeli bilinçli olarak basitleştirilmiş (arcade) tutuldu.
- **Kapsam:** Kalabalık ve trafik yoğunluğu performans için sınırlı tutuldu.

### 6. Sonraki adım

1. Gerçek cihazda FPS ve bellek ölçümü yapıp kalite ayarlarını ince ayarlamak.
2. Sketchfab kataloğundaki CC BY modelleri glTF olarak `models.js` ve `vehmodels.js` yerine bağlamak.
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
