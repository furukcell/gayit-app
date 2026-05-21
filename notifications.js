// ============================================================
// ADIM 3 — notifications.js
// Push token alma, bildirim gönderme, bildirim geçmişi
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
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.log('Token alınamadı:', error);
    return '';
  }
}

// --- Push Bildirimi Gönder (Expo Push API) ---
export async function haberUcur(hedefUid, baslik, mesaj, ekran = 'anasayfa') {
  try {
    // pushToken okumak için auth gerektirmez (public okuma varsa)
    const usRes = await fetch(`${DB_URL}/kullanicilar/${hedefUid}.json`);
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
// DÜZELTİLDİ: token parametresi eklendi
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

// --- Hem Gönder Hem Kaydet (Kısa yol) ---
// DÜZELTİLDİ: token parametresi eklendi
// YENİ:
export async function bildirimGonderVeKaydet(hedefUid, baslik, mesaj, token, ekran = 'anasayfa') {
  await haberUcur(hedefUid, baslik, mesaj, ekran);
  await bildirimKaydet(hedefUid, baslik, mesaj, token);
}
