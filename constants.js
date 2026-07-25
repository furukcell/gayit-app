// ============================================================
// ADIM 1 — constants.js
// Sabit listeler, yardımcı fonksiyonlar
// ============================================================

// --- Firebase Bilgileri ---
export const API_KEY = "AIzaSyCcvq9VkMugDZTq3fOPypJIy0ATiGmPxrk";
export const DB_URL = "https://usta-mugla-default-rtdb.europe-west1.firebasedatabase.app";
export const STORAGE_BUCKET = "usta-mugla.firebasestorage.app";
export const FIREBASE_API_KEY = "AIzaSyCcvq9VkMugDZTq3fOPypJIy0ATiGmPxrk";
// --- Sabit Listeler ---
export const BOLGELER = [
  'Menteşe (Merkez)', 'Bodrum', 'Dalaman', 'Datça', 'Fethiye',
  'Kavaklıdere', 'Köyceğiz', 'Marmaris', 'Milas', 'Ortaca',
  'Seydikemer', 'Ula', 'Yatağan'
];

export const KATEGORILER = [
  'Tümü',
  'Tesisat (Sucu)',
  'Klimacı',
  'Boyacı',
  'Elektrik',
  'Temizlik',
  'Nakliyat',
  'Marangoz',
  'İnşaat',
  'Bahçe/Peyzaj',
  'Dijital Hizmetler',
  // --- YENİ KATEGORİLER ---
  'Cam, Alüminyum & PVC',
  'Fayans & Seramik',
  'Televizyon & Beyaz Eşya',
  'Parti & Organizasyon',
  'Çilingir',
  'Halı & Koltuk Yıkama',
  'Çatı & Su Yalıtımı',
  'Fotoğrafçı & Kameraman',
  'Güneş Enerji Sistemi',
  'Özel Ders & Eğitim',
  // ------------------------
  'Diğer',
];

export const YENI_ILAN_KATEGORILER = [
  'Tesisat (Sucu)',
  'Klimacı',
  'Boyacı',
  'Elektrik',
  'Temizlik',
  'Nakliyat',
  'Marangoz',
  'İnşaat',
  'Bahçe/Peyzaj',
  'Dijital Hizmetler',
  // --- YENİ KATEGORİLER ---
  'Cam, Alüminyum & PVC',
  'Fayans & Seramik',
  'Televizyon & Beyaz Eşya',
  'Parti & Organizasyon',
  'Çilingir',
  'Halı & Koltuk Yıkama',
  'Çatı & Su Yalıtımı',
  'Fotoğrafçı & Kameraman',
  'Saç kaynak',
  'İlaçlama',
  'Perde',
  'Ev yemekleri',
  'Hasta/Çocuk bakıcısı',
  'Güneş Enerji Sistemi',
  'Özel Ders & Eğitim',
  // ------------------------
  'Diğer',
];

// Davet limiti
export const DAVET_LIMITI = 5;

// Referans kodu üretici - GAYIT- prefix'li
export const referansKoduOlustur = () => {
  const karakterler = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kod = 'GAYIT-';
  for (let i = 0; i < 6; i++) {
    kod += karakterler.charAt(Math.floor(Math.random() * karakterler.length));
  }
  return kod; // Örnek: GAYIT-AB3X9K
};

// Tarih düzeltmesi — seçilen tarihi doğru formatta döndürür
export const tarihHesapla = (isTarihiTip, ozelTarih) => {
  if (isTarihiTip === 'Bugün') {
    return new Date().toLocaleDateString('tr-TR');
  }
  if (isTarihiTip === 'Yarın') {
    const yarin = new Date();
    yarin.setDate(yarin.getDate() + 1);
    return yarin.toLocaleDateString('tr-TR');
  }
  if (isTarihiTip === 'İleri' && ozelTarih) {
    return ozelTarih;
  }
  return new Date().toLocaleDateString('tr-TR');
};

// Zaman damgasını okunabilir tarihe çevirir
export const damgaToTarih = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('tr-TR');
};

// Zaman damgasını "X dakika önce / X saat önce" formatına çevirir
export const zamanFarki = (timestamp) => {
  if (!timestamp) return '';
  const fark = Date.now() - timestamp;
  const dakika = Math.floor(fark / 60000);
  const saat = Math.floor(fark / 3600000);
  const gun = Math.floor(fark / 86400000);

  if (dakika < 1) return 'Az önce';
  if (dakika < 60) return `${dakika} dk önce`;
  if (saat < 24) return `${saat} saat önce`;
  return `${gun} gün önce`;
};
