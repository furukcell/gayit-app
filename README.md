# Gayıt

**Gayıt**, Muğla ve ilçelerine özel geliştirilen yerel hizmet pazaryeri mobil uygulamasıdır.

Müşteriler ihtiyaç duydukları iş için ilan oluşturur. Ustalar kendi branşlarına ve çalışma bölgelerine uygun ilanlara teklif verir. Taraflar anlaşma sağladığında sohbet, bildirim, konum paylaşımı, Google Maps yönlendirmesi ve iş takibi uygulama içinde ilerler.

Gayıt'ın amacı; Muğla'da temizlikçi, tesisatçı, elektrikçi, klimacı, boyacı, nakliyeci ve benzeri hizmetlerde müşterilerle gerçek ustaları daha kontrollü, daha yerel ve daha güvenli bir sistemde buluşturmaktır.

---

## Güncel Durum

- Android uygulama sürümü: **1.4.0**
- Android `versionCode`: **26**
- Paket adı: **com.gayit.android**
- Expo SDK: **53**
- React Native: **0.79.6**
- React: **19.0.0**
- Hedef SDK: **35**
- `newArchEnabled`: **false**
- Deep link scheme: **gayit**
- Google Play üretim sürecine uygun yeni sürüm hazırlığı yapılmaktadır.
- Uygulama, Muğla merkezli kontrollü lansman ve gerçek saha testi için MVP seviyesine getirilmiştir.

### Son Teknik Güncellemeler

- Expo SDK 51'den SDK 53'e yükseltme yapıldı.
- Android target SDK 35 uyumluluğu sağlandı.
- React Native 0.79.6 ve React 19 uyumlu paket yapısına geçildi.
- Açılışta crash üreten RevenueCat listener yapısı `App()` içine alındı.
- Firebase başlatma işlemleri merkezi `firebaseClient.js` dosyasına taşındı.
- Sohbet ekranı, Firebase Realtime Database bağlantısını merkezi client üzerinden kullanacak şekilde güncellendi.
- Realtime sohbet için Firebase SDK giriş senkronizasyonu eklendi.
- Teklif ekranındaki usta istatistik mini kartının taşma / yarım görünme sorunu düzeltildi.
- `scheme: "gayit"` eklenerek standalone uygulama yönlendirme / deep link altyapısı güçlendirildi.
- Package lock temizliği ve SDK 53 paket uyumluluğu sonrası üretim build süreci toparlandı.

> Gayıt şu an geniş ölçekli ulusal bir pazar yeri olmaktan önce, Muğla merkezli gerçek saha kullanımıyla doğrulanacak yerel bir hizmet pazaryeri olarak konumlandırılmıştır.

---

## Projenin Temel Mantığı

Gayıt, genel hizmet pazaryerlerinden farklı olarak daha yerel, daha kontrollü ve güven odaklı bir işleyiş hedefler.

- Muğla ve ilçelerine özel kullanım
- Müşteri ve usta için ayrı rol yapısı
- Aynı kategoride tek aktif ilan kuralı
- Anlaşma olmadan telefon ve doğrudan iletişim açılmaması
- İlan hakkı, teklif hakkı, acil ilan hakkı, kupon ve abonelik sistemi
- Puanlama, şikâyet ve admin kontrol mekanizmaları
- Usta onayı, profil doğrulama ve belge yükleme yapısı
- Realtime sohbet, konum paylaşımı ve Google Maps yönlendirme desteği
- Bildirim geçmişi ve push bildirim yönlendirme sistemi
- Sınırlı lansmanda gerçek usta / müşteri davranışına göre geliştirme yaklaşımı

---

## Kullanılan Teknolojiler

- React Native 0.79.6
- React 19.0.0
- Expo SDK 53
- Firebase Authentication
- Firebase Realtime Database
- Firebase Storage
- Firebase Cloud Functions
- Expo Notifications
- Expo Location
- Expo Updates
- Expo Background Fetch / Task Manager
- Expo Navigation Bar
- RevenueCat / Google Play Billing
- AsyncStorage
- EAS / Codemagic Android build süreci

---

## Ana Özellikler

### Kullanıcı ve Giriş Sistemi

- Müşteri / usta rol seçimi
- E-posta ve şifre ile kayıt / giriş
- Firebase REST Authentication akışı
- Firebase SDK auth senkronizasyonu
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
- Son 50 mesajı dinleyen realtime sohbet sistemi
- Okundu / iletildi bilgisi
- Konum paylaşımı
- Google Maps bağlantısı
- Merkezi Firebase client üzerinden Realtime Database bağlantısı

### Bildirim Sistemi

- Expo Push Notifications entegrasyonu
- Push token Firebase'e kaydedilir
- Bildirim geçmişi `bildirimler/` node'u altında tutulur
- Bildirim gönderimi Cloud Function üzerinden yapılır: `bildirimGonder`
- Bildirim data alanında ekran yönlendirme bilgisi taşınır
- Uygulama arka plandayken bildirime tıklayarak ilgili ekrana yönlendirme yapılır
- `scheme: gayit` ile standalone uygulama yönlendirme altyapısı desteklenir

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
- Onaylı usta başvurusu için profilde telefon numarası zorunluluğu
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
- Admin istatistik modülü

### Kurucu Usta Sistemi

- İlk 200 onaylı ustaya özel Kurucu Usta rozeti
- Rozet profil ekranında abonelik rozetinin altında gösterilir
- Teklif kartlarında usta adının yanında rozet simgesi görünür
- Firebase'de `kullanicilar/{uid}/kurucuUsta: true` field'ı ile yönetilir
- Manuel atama — 200 kişi dolduktan sonra otomatik olarak kapanır, kod değişikliği gerekmez

---

## Proje Yapısı

```text
gayit-app/
├── App.js
├── app.json
├── package.json
├── constants.js
├── firebase.js
├── firebaseClient.js
├── notifications.js
├── Mahalleler.js
├── Logo.png
├── icon.png
├── database.rules.json
├── storage.rules
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

- Node.js 20+
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

### SDK / Paket Kontrolü

```bash
npx expo-doctor
npx expo install --check
npx expo start -c
```

### Android Production Build

```bash
eas build --platform android --profile production
```

### Cloud Functions Deploy

```bash
cd functions
firebase deploy --only functions
```

---

## Android Yapılandırması

```json
{
  "version": "1.4.0",
  "android": {
    "package": "com.gayit.android",
    "targetSdkVersion": 35,
    "versionCode": 26,
    "newArchEnabled": false
  },
  "scheme": "gayit"
}
```

---

## Firebase Yapısı

Uygulama Firebase Authentication, Firebase Realtime Database, Firebase Storage ve Firebase Cloud Functions kullanır.

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

1. Android yeni üretim sürümü oluşturma
2. Muğla / Milas-Bodrum odaklı sınırlı usta kaydı
3. Kurucu Usta doğrulama ve belge kontrol süreci
4. Müşteri lansmanı
5. Gerçek ilan / teklif / anlaşma verisine göre iyileştirme
6. Performans, güvenlik ve operasyon tarafının canlı veriye göre güçlendirilmesi

---

## Üretim Öncesi / Üretim Sonrası Kontrol Listesi

### Kritik Güvenlik ve Backend İşleri

- [ ] İlan oluşturma, teklif verme, hak düşürme ve anlaşma işlemleri mümkün olduğunca Cloud Functions / transaction yapısına taşınmalı
- [ ] Oturum token ve refresh token için AsyncStorage yerine SecureStore değerlendirilmeli
- [ ] RevenueCat webhook / sunucu tarafı satın alma doğrulaması ilerleyen sürümlerde güçlendirilmeli

### Performans ve Ölçeklenebilirlik

- [ ] Ana veri yüklemede tüm ilanları çekmek yerine kategori / ilçe / tarih bazlı sorgular kullanılmalı
- [ ] Tamamlanmış ve eski ilanlar arşiv mantığıyla ayrılmalı

### Ürün ve Operasyon

- [ ] Usta onay süreci saha kullanımına göre netleştirilmeli
- [x] Kurucu Usta kampanyası için rozet sistemi eklendi
- [x] SDK 53 / target SDK 35 üretim geçişi tamamlandı
- [x] Açılış crash ve Firebase init sorunları giderildi
- [x] Realtime sohbet bağlantısı merkezi Firebase client üzerinden toparlandı
- [x] Teklif ekranındaki usta istatistik kartı görünüm sorunu düzeltildi
- [ ] İlk kullanıcı / ilk usta kazanımı için bölgesel lansman akışı takip edilmeli
- [ ] Teklif gelmeyen ilanlarda hak iadesi kuralı netleştirilmeli
- [ ] Uygulama içi şikâyet ve destek süreçleri gerçek kullanıcılarla test edilmeli

---

## Bilinen Teknik Borçlar

- Bazı kritik iş akışları zamanla daha fazla Cloud Functions / transaction yapısına taşınmalı
- Büyük veri kullanımında ilan, kullanıcı ve admin listeleri için filtreleme / limitleme güçlendirilmeli
- Abonelik yaşam döngüsü: `abonelikKontrol` Cloud Function ile her gece süresi dolan abonelikler otomatik düşürülmektedir. Webhook ve sunucu tarafı RevenueCat doğrulaması ilerleyen aşamada güçlendirilebilir.
- Push token testlerinde Expo Go'dan kalma eski tokenların temizlenmesi gerekebilir.
- SDK 53 geçişinde `newArchEnabled` şimdilik kapalı tutulmuştur; yeni mimari ileride ayrıca test edilmelidir.

---

## Üretim Değerlendirmesi

Gayıt, çalışan bir MVP seviyesindedir.

Android tarafında SDK 53 ve target SDK 35 uyumluluğu sağlanmış; uygulama sınırlı bölgesel lansman, ilk usta kayıtları ve gerçek kullanıcı davranışını ölçmek için hazır hale getirilmiştir. Geniş kitleye açılmadan önce güvenlik kuralları, ödeme doğrulama, veri çekme optimizasyonu ve hak düşürme mantığı üretim seviyesine kademeli olarak yaklaştırılmalıdır.

Son eklenen önemli işler: SDK 53 geçişi, açılış crash düzeltmeleri, merkezi Firebase client, Firebase SDK auth senkronizasyonu, realtime sohbet stabilizasyonu, usta istatistik mini kart görünüm düzeltmesi, deep link scheme eklenmesi, Admin istatistik modülü, Kurucu Usta rozet sistemi, onaylı usta başvurusunda telefon zorunluluğu, abonelik süresi otomatik düşürme.

Projenin mevcut aşaması yalnızca teknik geliştirme değil, aynı zamanda saha operasyonu, usta doğrulama, müşteri güveni ve yerel büyüme sürecidir.

---

## Geliştirici

**Faruk Kurtuluş**  
GitHub: [github.com/furukcell](https://github.com/furukcell)
