// ============================================================
// notifications.js
// Push token alma, bildirim gönderme, bildirim geçmişi
//
// ✅ GÜNCELLENDİ: bildirimGonderVeKaydet artık Cloud Function
//    üzerinden çalışıyor — token expire sorunu ortadan kalktı
// ============================================================
import * as Notifications from 'expo-notifications';
import { DB_URL } from './constants';

// Cloud Function URL — kendi projenin URL'ini buraya yaz
const FUNCTIONS_URL = 'https://us-central1-usta-mugla.cloudfunctions.net';

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

// --- Bildirimleri Getir ---
export async function bildirimleriGetir(uid, token) {
  try {
    const res = await fetch(`${DB_URL}/bildirimler/${uid}.json?auth=${token}`);
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

// --- Hem Gönder Hem Kaydet — Cloud Function üzerinden ---
// Token expire sorunu yok, sunucu taraflı çalışır
export async function bildirimGonderVeKaydet(hedefUid, baslik, mesaj, token, ekran = 'anasayfa') {
  try {
    await fetch(`${FUNCTIONS_URL}/bildirimGonder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: { hedefUid, baslik, mesaj, ekran },
      }),
    });
  } catch (e) {
    console.log('Bildirim gönderilemedi:', e);
  }
}

// --- Eski fonksiyonlar — geriye dönük uyumluluk için bırakıldı ---
// Artık bildirimGonderVeKaydet kullan, bunları doğrudan çağırma
export async function haberUcur(hedefUid, baslik, mesaj, ekran = 'anasayfa', token) {
  return bildirimGonderVeKaydet(hedefUid, baslik, mesaj, token, ekran);
}

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
