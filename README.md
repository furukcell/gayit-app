 Gayit App
 
Müşteri ile ustayı buluşturan mobil platform. Müşteriler iş ilanı açar, ustalar teklif verir, uygulama üzerinden iletişim kurulur.
 
**Stack:** React Native · Expo · Firebase (Firestore + Auth + Storage) · Expo Notifications
 
---
 
## Özellikler
 
- Kullanıcı kaydı ve girişi (Firebase Auth)
- İlan oluşturma, listeleme, detay görüntüleme
- Usta teklif verme ve teklif güncelleme (revision sistemi)
- Müşteri-usta anlık mesajlaşma (chat)
- Mesaj okundu bilgisi (tekli / çift / mavi tik)
- Anlık push bildirimleri (Expo Notifications)
- Admin paneli
- Paket / üyelik ekranları
- İstanbul mahalle bazlı ilan filtreleme
---
 
## Kurulum
 
### Gereksinimler
 
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Firebase projesi (Firestore, Auth, Storage aktif)
### Adımlar
 
```bash
# 1. Repoyu klonla
git clone https://github.com/furukcell/gayit-app.git
cd gayit-app
 
# 2. Bağımlılıkları yükle
npm install
 
# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını aç, Firebase bilgilerini gir
 
# 4. Uygulamayı başlat
npx expo start
```
 
---
 
## Ortam Değişkenleri
 
`.env.example` dosyasını `.env` olarak kopyala ve Firebase Console'dan aldığın bilgileri gir:
 
```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```
 
Firebase bilgilerini almak için:
Firebase Console → Project Settings → General → "Your apps" → Web app config
 
---
 
## Firebase Kurulumu
 
Firestore, Authentication ve Storage servislerini Firebase Console'dan aktif etmen gerekiyor.
 
**Authentication:** Email/Password provider'ı aç.
 
**Firestore koleksiyon yapısı:**
 
```
users/
  {userId}/
    displayName, email, role (musteri | usta), isAdmin, pushToken, createdAt
 
ilanlar/
  {ilanId}/
    userId, baslik, aciklama, kategori, mahalle, durum, createdAt
 
teklifler/
  {teklifId}/
    ilanId, ustaId, musteriId, fiyat, aciklama, durum, revizyon, createdAt, updatedAt
 
chats/
  {chatId}/
    participants: [userId1, userId2]
    messages/
      {messageId}/
        senderId, text, createdAt, readBy: []
```
 
**Firestore Security Rules:**
`firestore.rules` dosyasını Firebase Console → Firestore → Rules bölümüne yapıştır ve yayınla.
 
---
 
## Build
 
### Geliştirme (Expo Go)
 
```bash
npx expo start
```
 
### Production build (EAS)
 
```bash
# Android
eas build --platform android --profile production
 
# iOS
eas build --platform ios --profile production
```
 
EAS ortam değişkenlerini Codemagic veya EAS Dashboard üzerinden tanımla — `.env` dosyası build ortamına gitmez.
 
---
 
## Proje Yapısı
 
```
gayit-app/
├── App.js                 # Navigation ve auth state
├── firebase.js            # Firebase init
├── notifications.js       # Push token kayıt / bildirim yönetimi
├── constants.js           # Sabit değerler (kategoriler vb.)
├── Mahalleler.js          # İstanbul mahalle listesi
├── HomeScreen.js          # Ana ekran, ilan listesi
├── IlanScreens.js         # İlan oluşturma ve detay
├── ChatScreen.js          # Mesajlaşma ekranı
├── AuthScreens.js         # Giriş / kayıt ekranları
├── ProfileScreens.js      # Kullanıcı profili
├── AdminScreen.js         # Admin paneli
├── PackageScreens.js      # Paket / üyelik
├── Modals.js              # Ortak modal bileşenleri
└── .github/workflows/     # CI/CD
```
 
---
 
## Bilinen Teknik Borçlar
 
- [ ] Firebase config `.env`'e taşınacak (şu an `firebase.js` içinde)
- [ ] Firestore Security Rules sıkılaştırılacak
- [ ] `onSnapshot` listener'lar için cleanup fonksiyonları eklenecek
- [ ] İlan listesi için pagination eklenecek
- [ ] Error handling standartlaştırılacak
---
 
## Geliştirici
 
**Faruk** — [github.com/furukcell](https://github.com/furukcell)
 
