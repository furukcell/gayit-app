// ============================================================
// ADIM 1 — constants.js
// Sabit listeler, yardımcı fonksiyonlar
// ============================================================

// --- Firebase Bilgileri ---
export const API_KEY = "AIzaSyCcvq9VkMugDZTq3fOPypJIy0ATiGmPxrk";
export const DB_URL = "https://usta-mugla-default-rtdb.europe-west1.firebasedatabase.app";
export const STORAGE_BUCKET = "usta-mugla.appspot.com";

// --- Sabit Listeler ---
export const BOLGELER = [
  'Menteşe (Merkez)', 'Bodrum', 'Dalaman', 'Datça', 'Fethiye',
  'Kavaklıdere', 'Köyceğiz', 'Marmaris', 'Milas', 'Ortaca',
  'Seydikemer', 'Ula', 'Yatağan'
];

export const KATEGORILER = [
  'Tümü', 'Tesisat (Sucu)', 'Klimacı', 'Boyacı',
  'Elektrik', 'Temizlik', 'Nakliyat',
  'Marangoz', 'İnşaat', 'Bahçe/Peyzaj', 'Dijital Hizmetler', 'Diğer'
];

export const YENI_ILAN_KATEGORILER = [
  'Tesisat (Sucu)', 'Klimacı', 'Boyacı',
  'Elektrik', 'Temizlik', 'Nakliyat',
  'Marangoz', 'İnşaat', 'Bahçe/Peyzaj', 'Dijital Hizmetler', 'Diğer'
];

export const MAHALLE_HIYERARSISI = {
  "Milas": {
    "Merkez Mahalleler": ["Hacı İlyas", "Hisarbaşı", "Gümüşlük", "İsmet Paşa", "Burgaz", "Aydınlıkevler", "Emek", "Güneş"],
    "Köyler / Beldeler": ["Güllük", "Ören", "Selimiye", "Bafa", "Kıyıkışlacık", "Beçin", "Dörttepe", "Meşelik"]
  },
  "Menteşe": {
    "Merkez Mahalleler": ["Emirbeyazıt", "Muslihittin", "Orhaniye", "Karameğmet", "Şeyh", "Kiramettin"],
    "Köyler / Beldeler": ["Yenice", "Yerkesik", "Bayır", "Kafaca", "Yeşilyurt", "Akçaova", "Düğerek"]
  },
  "Bodrum": {
    "Merkez Mahalleler": ["Çarşı", "Kumbahçe", "Umurça", "Tepecik", "Eskiçeşme"],
    "Köyler / Beldeler": ["Turgutreis", "Yalıkavak", "Gümüşlük", "Bitez", "Ortakent", "Mumcular", "Gündoğan", "Konacık"]
  },
  "Fethiye": {
    "Merkez Mahalleler": ["Cumhuriyet", "Akarca", "Babataşı", "Foça", "Tuzla"],
    "Köyler / Beldeler": ["Ölüdeniz", "Göcek", "Karaçulha", "Çiftlik", "Yanıklar"]
  },
  "Marmaris": {
    "Merkez Mahalleler": ["Tepe", "Hatipirimi", "Kemeraltı", "Sarıana", "Armutalan"],
    "Köyler / Beldeler": ["İçmeler", "Bozburun", "Turunç", "Selimiye", "Hisarönü"]
  },
  "Yatağan": {
    "Merkez Mahalleler": ["Konak", "Yeni Mahalle", "Cumhuriyet"],
    "Köyler / Beldeler": ["Bencik", "Bozüyük", "Turgut", "Yeşilbağcılar", "Madenler"]
  },
  "Ortaca": {
    "Merkez Mahalleler": ["Beşköprü", "Cumhuriyet", "Terzialiler"],
    "Köyler / Beldeler": ["Dalyan", "Ekşiliyurt", "Güzelyurt", "Yeşilyurt"]
  },
  "Dalaman": {
    "Merkez Mahalleler": ["Atakent", "Karaçalı", "Merkez"],
    "Köyler / Beldeler": ["Sarsala", "Kille", "Gürleyik", "Narlı"]
  },
  "Köyceğiz": {
    "Merkez Mahalleler": ["Gülpınar", "Uluerpınar", "Gelişim"],
    "Köyler / Beldeler": ["Beyobası", "Toparlar", "Zeytinalanı", "Pınar"]
  },
  "Datça": {
    "Merkez Mahalleler": ["İskele", "Reşadiye", "Eski Datça"],
    "Köyler / Beldeler": ["Knidos", "Palamutbükü", "Mesudiye", "Hızırşah"]
  },
  "Ula": {
    "Merkez Mahalleler": ["Ayazma", "Köprübaşı", "Alparslan"],
    "Köyler / Beldeler": ["Akyaka", "Gökova", "Akçapınar", "Kızılağaç"]
  },
  "Seydikemer": {
    "Merkez Mahalleler": ["Cumhuriyet", "Gerişburnu", "Menekşe"],
    "Köyler / Beldeler": ["Seki", "Eşen", "Karamuar", "Kadıköy"]
  },
  "Kavaklıdere": {
    "Merkez Mahalleler": ["Cumhuriyet", "Yeni Mahalle"],
    "Köyler / Beldeler": ["Çayboyu", "Menteşe (Kavaklıdere)", "Salkım"]
  }
};

// Referans kodu üretici
export const referansKoduOlustur = () => {
  const karakterler = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kod = '';
  for (let i = 0; i < 7; i++) {
    kod += karakterler.charAt(Math.floor(Math.random() * karakterler.length));
  }
  return kod;
};

// Tarih düzeltmesi — seçilen tarihi doğru formatta döndürür
// Orijinal kodda isTarihiTip 'İleri' olarak set edilmeden ilan
// oluşturulunca "Bugün" yazıyordu. Bu fonksiyon bunu önler.
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
  // Fallback — her ihtimale karşı bugünü döndür
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
