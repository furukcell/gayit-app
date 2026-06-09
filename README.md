# Gayıt

**Gayıt**, Muğla ve ilçelerine özel geliştirilen yerel hizmet pazaryeri mobil uygulamasıdır.

Müşteriler ihtiyaç duydukları iş için ilan oluşturur. Ustalar kendi branşlarına ve çalışma bölgelerine uygun ilanlara teklif verir. Taraflar anlaşma sağladığında sohbet, iletişim, konum paylaşımı ve iş takibi uygulama içinde ilerler.

Gayıt'ın amacı; Muğla'da temizlikçi, tesisatçı, elektrikçi, klimacı, boyacı, nakliyeci ve benzeri hizmetlerde müşterilerle gerçek ustaları daha kontrollü, daha yerel ve daha güvenli bir sistemde buluşturmaktır.

---

## Güncel Durum

- Android uygulama sürümü: **1.1.2**
- Android `versionCode`: **22**
- Paket adı: **com.gayit.android**
- Hedef SDK: **35**
- Google Play üretim başvurusu yapılmıştır.
- Uygulama, sınırlı bölgesel lansman ve kontrollü ilk kullanım için MVP seviyesine getirilmiştir.
- Admin istatistik modülü (`AdminIstatistikEkrani`) eklendi ve admin paneline entegre edildi.
- Kurucu Usta rozeti sistemi eklendi (profil ekranı + teklif kartları).
- Profil ekranında puanlama sistemi token hatası düzeltildi.

> Gayıt şu an geniş ölçekli ulusal bir pazar yeri olmaktan önce, Muğla merkezli gerçek saha kullanımıyla doğrulanacak yerel bir hizmet pazaryeri olarak konumlandırılmıştır.

---

## Projenin Temel Mantığı

Gayıt, genel hizmet pazaryerlerinden farklı olarak daha yerel, daha kontrollü ve güven odaklı bir işleyiş hedefler.

- Muğla ve ilçelerine özel kullanım
- Müşteri ve usta için ayrı rol yapısı
- Aynı kategoride tek aktif ilan kuralı
- Anlaşma olmadan telefon ve doğrudan iletişim açılmaması
- İlan hakkı, teklif hakkı, kupon ve abonelik sistemi
- Puanlama, şikâyet ve admin kontrol mekanizmaları
- Usta onayı, profil doğrulama ve belge yükleme yapısı
- Konum paylaşımı ve Google Maps yönlendirme desteği
- Sınırlı lansmanda gerçek usta / müşteri davranışına göre geliştirme yaklaşımı

---

## Kullanılan Teknolojiler

- React Native
- Expo SDK 51
- React Native 0.74
- Firebase Authentication
- Firebase Realtime Database
- Firebase Storage
- Firebase Cloud Functions
- Expo Notifications
- Expo Location
- Expo Updates
- Expo Background Fetch / Task Manager
- RevenueCat / Google Play Billing
- AsyncStorage

---

## Ana Özellikler

### Kullanıcı ve Giriş Sistemi

- Müşteri / usta rol seçimi
- E-posta ve şifre ile kayıt / giriş
- Firebase Authentication entegrasyonu
- E-posta doğrulama akışı
- Şifremi unuttum ekranı
- Otomatik giriş
- Firebase token yenileme akışı
- KVKK ve üyelik sözleşmesi onayı

### Müşteri Tarafı

- Yeni ilan oluşturma
- İlçe ve mahalle seçimi
- Kategori seçimi
- İş tarihi seçimi
- Acil ilan seçeneği
- Aynı kategoride tek aktif ilan kontrolü
- Gelen teklifleri görüntüleme
- Usta profili ve istatistiklerini inceleme
- Anlaşma başlatma
- İş tamamlandıktan sonra ustayı puanlama

### Usta Tarafı

- Ana branş ve yan branş seçimi
- Çalışma bölgesi seçimi
- Uygun ilanları listeleme
- İlçe ve kategori filtreleme
- Teklif verme
- Teklif revize etme
- Teklif hakkı ve abonelik kontrolü
- İlanı görüntüleyen usta kaydı
- Ortalama yanıt süresi ve iş istatistikleri
- Hakkımda ve tecrübe yılı profil alanları
- Belge yükleme ve Onaylı Usta başvurusu
- Kimlik + ek belge yükleme
- Ustalık belgesi / vergi levhası / esnaf sicil gibi ek belge tipleri
- Belge incelemede iken yeniden yükleme ve güncelleme

### İlan, Teklif ve Sohbet

- İlan oluşturma
- Acil ilan desteği
- Teklif gönderme
- Teklif revizyon sistemi
- Anlaşma durumu takibi
- İş tamamlandı / puanlandı mantığı
- Son 50 mesajı dinleyen sohbet sistemi
- Okundu / iletildi bilgisi
- Konum paylaşımı
- Google Maps bağlantısı

### Bildirim Sistemi

- Expo Push Notifications entegrasyonu
- Push token Firebase'e kaydedilir
- Bildirim geçmişi `bildirimler/` node'u altında tutulur
- Bildirim gönderimi Cloud Function üzerinden yapılır: `bildirimGonder`
- Sunucu taraflı bildirim gönderimi ile token erişim sorunları azaltılır
- Bildirim ekranında okundu işaretleme desteği vardır
- Uygulama arka plandayken bildirime tıklayarak ilgili ekrana yönlendirme yapılır

### Ödeme, Paket ve Kupon

- RevenueCat entegrasyonu
- Google Play Billing paketleri
- Müşteri paketleri
- Usta paketleri
- VIP / Premium abonelik yapısı
- Satın alma geri yükleme
- Kupon / promosyon kodu kullanımı
- VIP kuponların sadece Onaylı Usta statüsündeki kullanıcılara açılması
- Cloud Functions üzerinden ödeme sonrası hak tanımlama

### Onaylı Usta Sistemi

- Kimlik fotoğrafı + ek belge yükleme zorunluluğu
- **Onaylı usta başvurusu için profilde telefon numarası zorunluluğu**
- Belge tipi seçimi: ustalık belgesi, vergi levhası, esnaf sicil vb.
- Admin panelinden belge inceleme ve onay / red
- Onay durumu: `beklemede`, `onayli`, `reddedildi`
- Onay bildirimi kullanıcıya sadece bir kez gösterilir
- Beklemede iken yeniden belge yükleyip güncelleme yapılabilir
- Onaylı usta rozeti profilde ve ilan kartlarında görünür

### Admin Panel

- Kullanıcı listesi
- İlan listesi
- Şikâyet listesi
- İletişim mesajları
- Kullanıcı dondurma
- Kullanıcı silme
- İlan silme
- Usta onay durumu yönetimi
- Belge görüntüleme
- Kupon / promosyon kodu yönetimi
- Admin mesajları

### Admin İstatistik Modülü (`AdminIstatistikEkrani`)

Admin paneli istatistik sekmesinden açılan detaylı analiz ekranı.

- Tarih filtresi: Bugün / Dün / 7 Gün / 30 Gün / Bu Ay / Geçen Ay / 3 Ay / Tümü
- Özet kartlar ve dönüşüm oranları
- Bugün özeti (abonelik + kupon dahil)
- Dönüşüm hunisi (kayıt → ilan → teklif → anlaşma → puanlama)
- Kullanıcı istatistikleri (branş, profil, belge, onay oranları)
- İlan istatistikleri (ücretli / kupon / abonelik hakkı / iptal / pasif)
- Teklif istatistikleri (aktif usta, en çok teklif verenler, kabul/red/bekleyen)
- Puanlama detayı (yıldız dağılımı, yorumlu/yorumsuz, en yüksek puanlı ustalar)
- Abonelik & Gelir bölümü (VIP/Premium dağılımı, kupon detayı)
- İlçe bazlı performans (onaylı usta + en aktif kategori)
- Kategori bazlı performans (usta sayısı + en güçlü ilçe)
- Aylık karşılaştırma (son 6 ay, büyüme oranı, bar chart)
- Uyarı & alarm sistemi
- 10 KPI + GAYİT Sağlık Skoru
- CSV export

### Kurucu Usta Sistemi

- İlk 200 onaylı ustaya özel 🏅 Kurucu Usta rozeti
- Rozet profil ekranında abonelik rozetinin altında gösterilir
- Teklif kartlarında usta adının yanında 🏅 simgesi görünür
- Firebase'de `kullanicilar/{uid}/kurucuUsta: true` field'ı ile yönetilir
- Manuel atama — 200 kişi dolduktan sonra otomatik olarak kapanır, kod değişikliği gerekmez

### Ek Modül: Evim

Evim Modülü, Gayıt'ın ana hizmet pazaryeri yapısını destekleyen ek bir modül olarak planlanmıştır.

- Ev eşyası takibi
- Hizmet ve bakım geçmişi
- Garanti süresi takibi
- Servis, bakım, tamir ve parça değişimi kayıtları
- Premium / VIP kullanım yapısı
- VIP kullanıcılar için AI yorum / rapor altyapısı

---

## Proje Yapısı

```text
gayit-app/
├── App.js
├── app.json
├── package.json
├── constants.js
├── firebase.js
├── notifications.js
├── Mahalleler.js
├── Logo.png
├── icon.png
├── functions/
│   └── index.js
└── screens/
    ├── AuthScreens.js
    ├── SifremiUnuttumEkrani.js
    ├── KvkkEkrani.js
    ├── HomeScreen.js
    ├── IlanScreens.js
    ├── ChatScreen.js
    ├── ProfileScreens.js
    ├── OdemeEkrani.js
    ├── revenueCat.js
    ├── AdminScreen.js
    ├── AdminIstatistikEkrani.js
    ├── EvimEkrani.js
    ├── UstaIstatistikModali.js
    ├── Modals.js
    ├── DavetEkrani.js
    ├── AyarlarEkrani.js
    ├── IletisimEkrani.js
    ├── HakkimizdaEkrani.js
    ├── HizmetKosullariEkrani.js
    ├── BildirimEkrani.js
    └── index.js
```

---

## Cloud Functions

Firebase Cloud Functions (`functions/index.js`) üzerinden çalışan endpointler:

| Fonksiyon | Açıklama |
|---|---|
| `kuponUygula` | Kupon / promosyon kodu doğrulama ve hak tanımlama |
| `odemeHakVer` | Ödeme sonrası paket ve hak tanımlama |
| `restoreAbonelik` | Abonelik geri yükleme |
| `bildirimGonder` | Push bildirimi gönderme ve geçmişe kaydetme |
| `abonelikKontrol` | Her gece çalışır, süresi dolan abonelikleri standart'a düşürür |

Cloud Functions tarafında istekler Firebase ID token ile doğrulanır. Kupon, ödeme sonrası hak tanımlama, abonelik geri yükleme ve bildirim gönderme işlemleri uygulama dışından sunucu taraflı kontrol edilecek şekilde kurgulanmıştır.

---

## Kurulum

### Gereksinimler

- Node.js 18+
- Expo CLI
- EAS CLI
- Firebase projesi
- RevenueCat hesabı
- Google Play Console hesabı

### Geliştirme Ortamında Çalıştırma

```bash
git clone https://github.com/furukcell/gayit-app.git
cd gayit-app
npm install
npx expo start
```

### Android Production Build

```bash
eas build --platform android --profile production
```

### Cloud Functions Deploy

```bash
cd gayit-functions/functions
firebase deploy --only functions
```

---

## Android Yapılandırması

`app.json` içinde Android paket adı:

```json
"package": "com.gayit.android"
```

Uygulama adı:

```json
"name": "Gayıt"
```

Güncel Android bilgileri:

```json
"version": "1.1.2",
"versionCode": 22,
"targetSdkVersion": 35
```

---

## Firebase Yapısı

Uygulama Firebase Authentication ve Firebase Realtime Database kullanır.

Başlıca Realtime Database alanları:

```text
kullanicilar/
ilanlar/
sohbetler/
bildirimler/
puanlar/
sikayetler/
iletisim/
istatistikler/
adminMesajlari/
kuponlar/
onayBasvurulari/
evEsyalari/
evHizmetleri/
```

Örnek ilan yapısı:

```text
ilanlar/{ilanId}/
  baslik
  kategori
  bolge
  mahalle
  detay
  isTarihi
  acil
  sahip
  sahipUid
  anlasmaVar
  anlasilanUsta
  isTamamlandi
  puanlandi
  tarih
  teklifler/
  goruntuleyen/
```

Örnek sohbet yapısı:

```text
sohbetler/{sohbetId}/
  katilimcilar/
    musteriUid
    ustaUid
  mesajlar/
    {mesajId}/
      metin
      gonderen
      gonderenAd
      tarih
      durum
      tip
      haritaLinki
```

---

## RevenueCat / Google Play Billing

Uygulamada paket ve abonelik yönetimi RevenueCat üzerinden yapılır.

Paket eşleşmeleri `screens/revenueCat.js` içinde tutulur:

```text
musteri_ilan_teksefer
musteri_acil_ilan
musteri_premium_aylik
musteri_vip_aylik
usta_teklif_3
usta_premium_aylik
usta_vip_aylik
```

Ödeme sonrası hak tanımlama, kupon uygulama ve abonelik geri yükleme için Cloud Functions endpointleri kullanılır:

```text
odemeHakVer
kuponUygula
restoreAbonelik
```

---

## Üretim ve Lansman Planı

Gayıt'ın ilk canlı kullanım modeli kontrollü ve bölgesel ilerleyecek şekilde planlanmıştır.

1. Android üretim başvurusu
2. Muğla / Milas-Bodrum odaklı sınırlı usta kaydı
3. Kurucu Usta doğrulama ve belge kontrol süreci
4. Müşteri lansmanı
5. Gerçek ilan / teklif / anlaşma verisine göre iyileştirme
6. Performans, güvenlik ve operasyon tarafının canlı veriye göre güçlendirilmesi

---

## Üretim Öncesi / Üretim Sonrası Kontrol Listesi

### Kritik Güvenlik ve Backend İşleri

- [ ] İlan oluşturma, teklif verme, hak düşürme ve anlaşma işlemleri mümkün olduğunca Cloud Functions / transaction yapısına taşınmalı
- [ ] Oturum token ve refresh token için AsyncStorage yerine SecureStore değerlendirilmelidir

### Performans ve Ölçeklenebilirlik

- [ ] Ana veri yüklemede tüm ilanları çekmek yerine kategori / ilçe / tarih bazlı sorgular kullanılmalı
- [ ] Tamamlanmış ve eski ilanlar arşiv mantığıyla ayrılmalı

### Ürün ve Operasyon

- [ ] Usta onay süreci saha kullanımına göre netleştirilmeli
- [x] Kurucu Usta kampanyası için rozet sistemi eklendi (profil + teklif kartı)
- [ ] İlk kullanıcı / ilk usta kazanımı için bölgesel lansman akışı takip edilmeli
- [ ] Teklif gelmeyen ilanlarda hak iadesi kuralı netleştirilmeli
- [ ] Uygulama içi şikâyet ve destek süreçleri gerçek kullanıcılarla test edilmeli

---

## Bilinen Teknik Borçlar

- Bazı kritik iş akışları zamanla daha fazla Cloud Functions / transaction yapısına taşınmalı
- Büyük veri kullanımında ilan, kullanıcı ve admin listeleri için filtreleme / limitleme güçlendirilmeli
- Abonelik yaşam döngüsü: `abonelikKontrol` Cloud Function ile her gece süresi dolan abonelikler otomatik düşürülmektedir. Webhook ve sunucu tarafı RevenueCat doğrulaması ilerleyen aşamada güçlendirilebilir.

---

## Üretim Değerlendirmesi

Gayıt, çalışan bir MVP seviyesindedir.

Android tarafında üretim başvurusu yapılmış; uygulama sınırlı bölgesel lansman, ilk usta kayıtları ve gerçek kullanıcı davranışını ölçmek için hazır hale getirilmiştir. Geniş kitleye açılmadan önce güvenlik kuralları, ödeme doğrulama, veri çekme optimizasyonu ve hak düşürme mantığı üretim seviyesine kademeli olarak yaklaştırılmalıdır.

Son eklenen özellikler: Admin istatistik modülü, Kurucu Usta rozet sistemi, profil puanlama token düzeltmesi, onaylı usta başvurusunda telefon zorunluluğu, abonelik süresi otomatik düşürme (Cloud Function).

Projenin mevcut aşaması yalnızca teknik geliştirme değil, aynı zamanda saha operasyonu, usta doğrulama, müşteri güveni ve yerel büyüme sürecidir.

---

## Geliştirici

**Faruk Kurtuluş**  
GitHub: [github.com/furukcell](https://github.com/furukcell)
