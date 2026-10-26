# SKY

Telefonda kullanmak için kişisel araçlar koleksiyonu. Ana ekranda eklenen araçlar listelenir, birini seçince o aracın ekranına geçilir. Sunucu veya hesap gerekmez; veriler cihazda saklanır.

| Araç | Ne yapar |
|---|---|
| 💸 **Bütçe** | Maaş ve giderleri girip aylık hesap yapar. Beklenen ve gerçek değerler, düzenli kalemler, sıklık seçimi, 6 aylık öngörü. |
| ⏱️ **Mesai** | Giriş-çıkış, mola ve öğle arası takibi; kesintilere göre net mesai hesabı; günlük, haftalık veya aylık hedef; geçmiş günleri düzeltme. |

## Kurulum

### Android ve iPhone: ana ekrana ekleme (PWA)

Her iki platformda da en kolay yol budur. Mağaza gerekmez.

1. Bu depoyu GitHub'da yayınla: **Settings → Pages → Build and deployment → Deploy from a branch**, `main` / `(root)`.
2. Birkaç dakika sonra verilen adresi telefonda aç (`https://KULLANICI.github.io/DEPO/`).
3. Ekle:
   - **iPhone (Safari):** Paylaş → *Ana Ekrana Ekle*
   - **Android (Chrome):** Menü → *Uygulamayı yükle* veya *Ana ekrana ekle*

### Android: APK

APK her güncellemede otomatik derlenir ve **Releases** sayfasındaki "Son APK" sürümüne `sky.apk` olarak eklenir. Sabit indirme adresi:

```
https://github.com/KULLANICI/DEPO/releases/latest/download/sky.apk
```

Aynı bağlantı, github.io üzerinden açılan uygulamanın **SKY → Ayarlar** ekranında da bir indirme düğmesi olarak bulunur.

1. Telefonda adresi aç veya Ayarlar'daki düğmeye bas.
2. İndirilen dosyaya dokun. "Bilinmeyen kaynaklardan yükleme" izni istenebilir.
3. Yüklemeyi onayla. Uygulama **SKY** adıyla açılır.

APK debug anahtarıyla imzalanır, Google Play için değildir. Play Protect uyarı gösterirse "yine de yükle" seçilebilir.

**Güncelleme bildirimi:** APK açıldığında GitHub'daki "Son APK" sürümünün derleme numarasına bakar; kendisinden yeniyse üstte "Yeni sürüm mevcut" uyarısı çıkar. **İndir** sürüm sayfasını açar, **Sonra** o sürüm için uyarıyı kapatır. Yalnızca APK içinde ve internet varken çalışır.

### iPhone: APK mümkün değil

APK yalnızca Android içindir. iPhone için seçenekler:

| Yol | Gereksinim | Not |
|---|---|---|
| **PWA (önerilen)** | Yalnızca Safari | Yukarıdaki "ana ekrana ekleme". Ücretsiz, güncellemeler otomatik gelir. |
| Yerel uygulama | Mac, Xcode, Apple hesabı | `npx cap add ios` ile aynı kod iOS projesine dönüştürülebilir. Ücretsiz hesapla yüklenen uygulamaların süresi yaklaşık 7 günde dolar; kalıcı dağıtım için ücretli Apple Developer üyeliği gerekir. |

Apple'ın kuralları değişebilir, güncel durumu Apple'ın kendi belgelerinden kontrol et.

## APK'yı GitHub üzerinde derleme

`.github/workflows/android-apk.yml` APK'yı otomatik üretir; bilgisayarına bir şey kurmana gerek yoktur.

- **Otomatik:** `main` dalına her commit'te derlenir ve "Son APK" sürümü güncellenir (5-10 dakika). Sadece `README.md` ve `.gitignore` değişiklikleri derlemeyi tetiklemez.
- **Manuel:** **Actions → Android APK → Run workflow**. Çalıştırmanın sayfasındaki **Artifacts** bölümünden `sky-apk` dosyası da indirilebilir.

Derleme Capacitor 6 ile yapılır; `index.html`, `shared/` ve `tools/` uygulamanın içine gömülür.

### Güncellemelerin üstüne kurulması (sabit imza)

Android, bir APK'nın eskisinin üstüne güncelleme olarak kurulması için aynı anahtarla imzalanmasını ister. Varsayılan olarak GitHub her derlemede yeni bir geçici anahtar üretir; bu durumda güncelleme kurulmaz ve önce eskisini silmen gerekir (veriler de gider).

Bunu önlemek için sabit bir anahtar tanımla:

1. `debug.keystore` anahtarını base64 metnine çevir (`base64 -w0 debug.keystore`). Anahtarın alias'ı `androiddebugkey`, şifreleri `android` olmalıdır.
2. Depoda **Settings → Secrets and variables → Actions → New repository secret** bölümüne git.
3. Adı `DEBUG_KEYSTORE_BASE64`, değeri bu metin olsun.

Secret tanımlıysa iş akışı onunla imzalar, tanımlı değilse geçici anahtara döner. Derleme numarası her seferinde otomatik artırılır.

### Güvenlik notları

- Veriler depoya hiçbir şekilde gönderilmez; depoda yalnızca uygulamanın kodu bulunur.
- `DEBUG_KEYSTORE_BASE64` secret'ı şifreli saklanır, depo herkese açık olsa da görünmez ve iş akışı günlüklerinde maskelenir. Anahtar dosyasını veya base64 metnini **asla depoya yükleme**.
- İş akışı yalnızca `main`'e yapılan push ve manuel çalıştırmayla tetiklenir; yazma yetkisi olmayan kişiler bunu tetikleyemez.
- Commit'lerde e-postanın görünmemesi için GitHub'da **Settings → Emails → Keep my email addresses private** seçeneğini aç.

## Veriler ve yedekleme

- Veriler tarayıcının `localStorage` alanında tutulur. Her araç kendi anahtarını kullanır (`butce.v1`, `mesai.v1`), bu yüzden birbirine karışmaz.
- **SKY → Ayarlar** ekranından tüm araçların verisi tek JSON dosyasında yedeklenip geri yüklenebilir. Eski, yalnızca bütçe yedekleri de yüklenebilir.
- **PWA ve APK sürümlerinin verileri birbirinden ayrıdır.** Birinden diğerine geçerken yedek alıp diğerinde yükle.
- Tarayıcı verisi silinirse veya telefon değiştirilirse kayıtlar gider. Düzenli yedek almanı öneririm.
- Web verisi sitenin alan adına (`KULLANICI.github.io`) bağlıdır, depo adına değil. Aynı hesaptaki diğer GitHub Pages siteleri aynı depolama alanını paylaşır; başka bir projede aynı anahtarları kullanma.

## Yerelde çalıştırma

```bash
python3 -m http.server 8000
```

Ardından `http://localhost:8000` adresini aç. Servis çalışanı (çevrimdışı mod) `file://` ile değil, `http://` ile çalışır.

## Proje yapısı

```
index.html              SKY ana ekranı (araç listesi, ayarlar, yedek, APK bağlantısı)
shared/
  theme.css             Ortak renkler ve bileşenler
  common.js             Ortak kodlar: onay penceresi, bildirim, güncelleme kontrolü, APK adresi
  tools.js              Araç listesi (yeni araç buraya eklenir)
tools/
  budget/               Bütçe aracı (index.html, app.js)
  mesai/                Mesai aracı (index.html, app.js, app.css)
manifest.webmanifest    PWA tanımı
sw.js                   Çevrimdışı çalışma için servis çalışanı
icon-*.png              Uygulama ikonları
package.json            Capacitor bağımlılıkları (yalnızca APK için)
capacitor.config.json   APK ayarları (uygulama adı: SKY)
.github/workflows/      APK derleme iş akışı
```

## Yeni araç ekleme

1. `tools/<araç-adı>/` klasörü oluştur ve içine `index.html` ile `app.js` koy. Mevcut bir aracın `index.html` dosyası şablon olarak kullanılabilir: `../../shared/theme.css` ve `../../shared/common.js` yüklenir, geri düğmesi `../../index.html` adresine gider.
2. Aracın verisi için benzersiz bir `localStorage` anahtarı seç (ör. `yeni.v1`).
3. `shared/tools.js` içindeki `TOOLS` listesine bir satır ekle. Ana ekran, yedek, silme ve çevrimdışı önbellek bu listeden otomatik yararlanır.
4. Commit'le. APK da otomatik yenilenir.

## Nasıl hesaplanır?

### Bütçe
- **Özet sekmesindeki bakiye yalnızca o ayın kendisidir:** o ayın geliri − gideri. Önceki ayların toplamı eklenmez. Düzenli kalemde gerçek değer girildiyse o, girilmediyse beklenen tutar kullanılır.
- **Öngörü sekmesi** her ayın kendi bakiyesini, altında birikmiş toplamı gösterir. Birikmiş toplam = *Ayarlar*'daki başlangıç bakiyesi + başlangıç ayından o aya kadar tüm ayların neti.
- Sıklığı N ay olan bir kalem, başlangıç ayından itibaren her N ayda bir görünür.

### Mesai

**Net mesai = brüt süre − otomatik kesinti − mola cezaları − öğle arası cezası**

- **Brüt süre:** giriş ile çıkış arası.
- **Otomatik kesinti** (brüt süreye göre, sınırlar dahil): 0:00–4:00 → 15 dk · 4:01–7:30 → 30 dk · 7:31–11:00 → 1 saat · 11:01 ve üstü → 1,5 saat.
- **Normal mola:** süresinin tamamı mesaiden düşer (ör. 15:00–15:31 → 31 dk).
- **Öğle arası:** 11:30–14:30 aralığında 1 saat (Cuma 1,5 saat) ücretsizdir; fazlası ve aralık dışında kalan kısım düşer (ör. 11:30–12:31 → 1 dk). Günde yalnızca 1 öğle arası sayılır. Süreler ve aralık Ayarlar'dan değiştirilebilir.
- **Molaya çık / dön:** Dönerken "Moladan gel" (normal mola) veya "Öğle arasından gel" (öğle arası) seçilir. Tür sonradan Mola sekmesindeki listeden de değiştirilebilir.
- **Hedef:** Günlük → günlük süre (8 saat) · Haftalık → çalışma günü × günlük süre (5 × 8 = 40 saat) · Aylık → o ayın çalışma günü × günlük süre. İzinli/tatil işaretlenen günlerin hedefi 0 olur.
- **Düzeltme:** Düzeltme sekmesinden giriş-çıkış saatleri, molalar değiştirilebilir ya da net mesai doğrudan elle yazılabilir (ör. 7:00 yerine 7:02).
