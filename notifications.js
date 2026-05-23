// ============================================================
// ADIM 3 — notifications.js
// Push token alma, bildirim gönderme, bildirim geçmişi
//
// ✅ DÜZELTİLDİ: haberUcur fonksiyonuna token parametresi eklendi
// ✅ DÜZELTİLDİ: bildirimGonderVeKaydet içinde ekran parametresi doğru iletiliyor
// ✅ İYİLEŞTİRME: Tüm asenkron işlemler için güvenli try/catch blokları
// ============================================================
import * as Notifications from 'expo-notifications';
import { DB_URL } from './constants';

// --- Push Token Al ---
export async function pushTokenAl() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return '';
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'bedf51a1-744f-4b74-a9ac-1c5dfc366127'
    });
    return tokenData.data;
  } catch (error) {
    console.log('Token alınamadı:', error);
    return '';
  }
}

// --- Push Bildirimi Gönder (Expo Push API) ---
// ✅ DÜZELTİLDİ: Token parametresi eklendi, Firebase Rules ile uyumlu
export async function haberUcur(hedefUid, baslik, mesaj, ekran = 'anasayfa', token) {
  try {
    // Token varsa auth ile güvenli sorgu, yoksa public okuma (eski uyumluluk)
    const url = token
      ? `${DB_URL}/kullanicilar/${hedefUid}.json?auth=${token}`
      : `${DB_URL}/kullanicilar/${hedefUid}.json`;
      
    const usRes = await fetch(url);
    const hedefData = await usRes.json();
    
    if (hedefData?.pushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: hedefData.pushToken,
          title: baslik,
          body: mesaj,
          data: { ekran },
        }),
      });
    }
  } catch (e) {
    console.log('Haber uçurulamadı:', e);
  }
}

// --- Bildirimi Firebase Geçmişine Kaydet ---
export async function bildirimKaydet(hedefUid, baslik, mesaj, token) {
  try {
    const url = token
      ? `${DB_URL}/bildirimler/${hedefUid}.json?auth=${token}`
      : `${DB_URL}/bildirimler/${hedefUid}.json`;
      
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baslik,
        mesaj,
        tarih: Date.now(),
        okundu: false,
      }),
    });
  } catch (e) {
    console.log('Bildirim geçmişe kaydedilemedi:', e);
  }
}

// --- Bildirimleri Getir ---
export async function bildirimleriGetir(uid, token) {
  try {
    const url = token
      ? `${DB_URL}/bildirimler/${uid}.json?auth=${token}`
      : `${DB_URL}/bildirimler/${uid}.json`;
      
    const res = await fetch(url);
    const data = await res.json();
    if (!data) return [];
    
    return Object.keys(data)
      .map((key) => ({ id: key, ...data[key] }))
      .sort((a, b) => b.tarih - a.tarih);
  } catch (e) {
    console.log('Bildirimler getirilemedi:', e);
    return [];
  }
}

// --- Hem Gönder Hem Kaydet (Kısa yol) ---
export async function bildirimGonderVeKaydet(hedefUid, baslik, mesaj, token, ekran = 'anasayfa') {
  try {
    // 1. Önce push bildirimi gönder
    await haberUcur(hedefUid, baslik, mesaj, ekran, token);
    
    // 2. Sonra geçmişe kaydet
    await bildirimKaydet(hedefUid, baslik, mesaj, token);
  } catch (e) {
    console.log('Bildirim gönderme/kaydetme hatası:', e);
  }
}