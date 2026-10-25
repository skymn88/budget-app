# Bütçem

Telefonda kullanmak için tasarlanmış, aylık gelir-gider ve bakiye takip uygulaması. Tek bir HTML dosyasından oluşur, sunucu veya hesap gerektirmez; veriler cihazda saklanır.

## Özellikler

- **Beklenen ve gerçek değer:** Her kalem için beklenen tutar girilir, ay içinde gerçekleşen tutar ayrıca yazılır. Gerçek değer girilmeyen kalemler beklenen tutarla hesaplanır.
- **Düzenli kalemler:** Maaş, kira, fatura gibi kalemler her ay otomatik eklenir. İsteğe bağlı bitiş ayı vardır, istenirse sonradan kaldırılabilir.
- **Sıklık seçimi:** Her ay, 2, 3, 4, 6 ayda bir veya yılda bir. Çift maaş, yıllık sigorta gibi kalemler için kullanışlıdır.
- **Öngörü:** Önümüzdeki 6 ayın geliri, gideri ve ay sonu bakiyesi.
- **Tek seferlik kayıtlar:** Düzenli olmayan gelir ve giderler tarihiyle eklenir.
- **Yedekleme:** JSON olarak indirme, panoya kopyalama ve geri yükleme.
- Açık ve koyu tema (telefon ayarına uyar), internetsiz çalışma.

## Kurulum

### Android ve iPhone: ana ekrana ekleme (PWA)

Her iki platformda da en kolay yol budur. Mağaza gerekmez.

1. Bu depoyu GitHub'da yayınla: **Settings → Pages → Build and deployment → Deploy from a branch** ve `main` / `(root)` seç.
2. Birkaç dakika sonra verilen adresi telefonda aç (`https://KULLANICI.github.io/DEPO/`).
3. Ekle:
   - **iPhone (Safari):** Paylaş → *Ana Ekrana Ekle*
   - **Android (Chrome):** Menü → *Uygulamayı yükle* veya *Ana ekrana ekle*

### Android: APK

APK dosyası `Releases` sayfasından indirilir.

1. Telefonda **Releases** sayfasından en son sürümdeki `butcem.apk` dosyasını indir.
2. Dosyaya dokun. Tarayıcıya veya dosya yöneticisine "bilinmeyen kaynaklardan yükleme" izni vermen istenebilir.
3. Yüklemeyi onayla. Uygulama "Bütçem" adıyla açılır.

> APK debug anahtarıyla imzalanır, Google Play'e yüklenmek için değildir. Play Protect uyarı gösterirse "yine de yükle" seçilebilir.

### iPhone: APK mümkün değil

APK yalnızca Android içindir, iPhone'a yüklenemez. iPhone için seçenekler:

| Yol | Gereksinim | Not |
|---|---|---|
| **PWA (önerilen)** | Yalnızca Safari | Yukarıdaki "ana ekrana ekleme". Ücretsiz, güncellemeler otomatik gelir. |
| Yerel uygulama | Mac, Xcode, Apple hesabı | `npx cap add ios` ile aynı kod iOS projesine dönüştürülebilir. Ücretsiz hesapla yüklenen uygulamalar yaklaşık 7 günde süresi dolar. Kalıcı dağıtım için ücretli Apple Developer üyeliği gerekir. |

Apple'ın kuralları değişebilir, güncel durumu Apple'ın kendi belgelerinden kontrol et.

## APK'yı kendin derleme

APK'yı bilgisayarına bir şey kurmadan GitHub üzerinde derlersin. `.github/workflows/android-apk.yml` bunu otomatik yapar.

**Yöntem 1: manuel çalıştırma**
1. Depoda **Actions → Android APK → Run workflow** seç.
2. İş bitince çalıştırmanın sayfasındaki **Artifacts** bölümünden `butcem-apk` dosyasını indir (zip içinden `butcem.apk` çıkar).

**Yöntem 2: etiketle Release oluşturma**
```bash
git tag v1.1.0
git push origin v1.1.0
```
İş bitince `butcem.apk` dosyası **Releases** sayfasına otomatik eklenir.

Derleme Capacitor 6 ile yapılır; `index.html` ve yanındaki dosyalar uygulamanın içine gömülür.

## Veriler ve yedekleme

- Veriler tarayıcının `localStorage` alanında tutulur, hiçbir yere gönderilmez.
- **PWA ve APK sürümlerinin verileri birbirinden ayrıdır.** Birinden diğerine geçerken *Ayarlar → Yedeği indir* ile dışa aktarıp diğerinde *Yedekten yükle* kullan.
- Tarayıcı verisi silinirse veya telefon değiştirilirse kayıtlar gider. Düzenli yedek almanı öneririm.

## Yerelde çalıştırma

```bash
python3 -m http.server 8000
```
Ardından `http://localhost:8000` adresini aç. Servis çalışanı (çevrimdışı mod) `file://` ile değil, `http://` ile çalışır.

## Proje yapısı

```
index.html              Uygulamanın tamamı (arayüz + mantık)
manifest.webmanifest    PWA tanımı
sw.js                   Çevrimdışı çalışma için servis çalışanı
icon-*.png              Uygulama ikonları
package.json            Capacitor bağımlılıkları (yalnızca APK için)
capacitor.config.json   APK ayarları
.github/workflows/      APK derleme iş akışı
```

## Nasıl hesaplanır?

- Bir ayın tahmini sonucu = gelirler − giderler. Düzenli kalemde gerçek değer girildiyse o, girilmediyse beklenen tutar kullanılır.
- Ay sonu bakiye = *Ayarlar*'daki başlangıç bakiyesi + başlangıç ayından o aya kadar tüm ayların neti.
- Sıklığı N ay olan bir kalem, başlangıç ayından itibaren her N ayda bir görünür.
