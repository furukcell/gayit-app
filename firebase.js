// ============================================================
// ADIM 2 — firebase.js
// Tüm Firebase okuma/yazma işlemleri burada toplanıyor.
// App.js ve diğer ekranlar direkt fetch yazmak yerine
// bu fonksiyonları çağırıyor.
// ============================================================

import { API_KEY, DB_URL, referansKoduOlustur } from './constants';

// ============================================================
// KİMLİK DOĞRULAMA (AUTH)
// ============================================================

// Yeni kullanıcı kaydı
export const kayitOl = async (email, sifre) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: sifre, returnSecureToken: true }),
    }
  );
  return await res.json();
};

// Giriş yap
export const girisYap = async (email, sifre) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: sifre, returnSecureToken: true }),
    }
  );
  return await res.json();
};

// Şifre sıfırlama maili gönder
export const sifreSifirla = async (email) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    }
  );
  return await res.json();
};

// ============================================================
// KULLANICI İŞLEMLERİ
// ============================================================

// Tek kullanıcı getir
export const kullaniciyiGetir = async (uid) => {
  const res = await fetch(`${DB_URL}/kullanicilar/${uid}.json`);
  return await res.json();
};

// Tüm kullanıcıları getir
export const tumKullanicilariGetir = async () => {
  const res = await fetch(`${DB_URL}/kullanicilar.json`);
  return await res.json();
};

// Kullanıcı oluştur (kayıt sonrası)
export const kullaniciOlustur = async (uid, token, veri) => {
  await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// Kullanıcı güncelle (PATCH — sadece gönderilen alanları günceller)
export const kullaniciGuncelle = async (uid, token, veri) => {
  await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// Kullanıcı sil (Admin için)
export const kullaniciSil = async (uid, token) => {
  await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, {
    method: 'DELETE',
  });
};

// ============================================================
// İLAN İŞLEMLERİ
// ============================================================

// Tüm ilanları getir
export const ilanlariGetir = async () => {
  const res = await fetch(`${DB_URL}/ilanlar.json`);
  const data = await res.json();
  if (!data) return [];

  const liste = Object.keys(data).map((key) => {
    const ilan = data[key];
    const tekliflerDizisi = ilan.teklifler
      ? Object.keys(ilan.teklifler).map((tKey) => ({
          id: tKey,
          ...ilan.teklifler[tKey],
        }))
      : [];
    return { id: key, ...ilan, teklifler: tekliflerDizisi };
  });

  // Acil ilanlar üste, sonra tarihe göre sırala
  return liste.sort((a, b) => {
    if (a.acil && !b.acil) return -1;
    if (!a.acil && b.acil) return 1;
    return b.tarih - a.tarih;
  });
};

// Yeni ilan oluştur
export const ilanOlustur = async (veri) => {
  const res = await fetch(`${DB_URL}/ilanlar.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
  return await res.json();
};

// İlan güncelle
export const ilanGuncelle = async (ilanId, veri) => {
  await fetch(`${DB_URL}/ilanlar/${ilanId}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// İlan sil (Admin için)
export const ilanSil = async (ilanId, token) => {
  await fetch(`${DB_URL}/ilanlar/${ilanId}.json?auth=${token}`, {
    method: 'DELETE',
  });
};

// ============================================================
// TEKLİF İŞLEMLERİ
// ============================================================

// Teklif gönder
export const teklifGonder = async (ilanId, teklif) => {
  const res = await fetch(`${DB_URL}/ilanlar/${ilanId}/teklifler.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teklif),
  });
  return await res.json();
};

// ============================================================
// SOHBET İŞLEMLERİ (YENİ)
// ============================================================

// Sohbet mesajı gönder
export const mesajGonder = async (sohbetId, mesaj) => {
  const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mesaj),
  });
  return await res.json();
};

// Sohbet mesajlarını getir
export const mesajlariGetir = async (sohbetId) => {
  const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data)
    .map((key) => ({ id: key, ...data[key] }))
    .sort((a, b) => a.tarih - b.tarih);
};

// Sohbet oluştur veya güncelle
export const sohbetGuncelle = async (sohbetId, veri) => {
  await fetch(`${DB_URL}/sohbetler/${sohbetId}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// ============================================================
// PUANLAMA İŞLEMLERİ
// ============================================================

// Puan gönder
export const puanGonder = async (ustaEmail, puanVerisi) => {
  const res = await fetch(`${DB_URL}/puanlar/${ustaEmail}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(puanVerisi),
  });
  return await res.json();
};

// Ustanın puanlarını getir
export const puanlariGetir = async (ustaEmail) => {
  const res = await fetch(`${DB_URL}/puanlar/${ustaEmail}.json`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
};

// ============================================================
// ŞİKAYET İŞLEMLERİ
// ============================================================

// Şikayet gönder
export const sikayetGonder = async (veri) => {
  await fetch(`${DB_URL}/sikayetler.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// Tüm şikayetleri getir (Admin için)
export const sikayetleriGetir = async () => {
  const res = await fetch(`${DB_URL}/sikayetler.json`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
};

// Şikayet güncelle (Admin için — okundu/çözüldü işaretleme)
export const sikayetGuncelle = async (sikayetId, token, veri) => {
  await fetch(`${DB_URL}/sikayetler/${sikayetId}.json?auth=${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// ============================================================
// BİLDİRİM İŞLEMLERİ
// ============================================================

// Bildirimi Firebase'e kaydet
export const bildirimKaydet = async (hedefUid, baslik, mesaj) => {
  try {
    await fetch(`${DB_URL}/bildirimler/${hedefUid}.json`, {
      method: 'POST',
      body: JSON.stringify({
        baslik,
        mesaj,
        tarih: Date.now(),
        okundu: false,
      }),
    });
  } catch (e) {
    console.log('Bildirim kaydedilemedi:', e);
  }
};

// Bildirimleri getir
export const bildirimleriGetir = async (uid) => {
  const res = await fetch(`${DB_URL}/bildirimler/${uid}.json`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data)
    .map((key) => ({ id: key, ...data[key] }))
    .sort((a, b) => b.tarih - a.tarih);
};

// ============================================================
// İLETİŞİM FORMU
// ============================================================

export const iletisimGonder = async (veri) => {
  await fetch(`${DB_URL}/iletisim.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// İletişim mesajlarını getir (Admin için)
export const iletisimMesajlariGetir = async () => {
  const res = await fetch(`${DB_URL}/iletisim.json`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data)
    .map((key) => ({ id: key, ...data[key] }))
    .sort((a, b) => b.tarih - a.tarih);
};

// ============================================================
// DAVET KODU İŞLEMLERİ
// ============================================================

// Davet kodu ile kullanıcı bul ve hak ekle
export const davetKoduIsle = async (davetKodu, yeniUid, token) => {
  const res = await fetch(`${DB_URL}/kullanicilar.json`);
  const tumKul = await res.json();
  if (!tumKul) return;

  const davetEdenEntry = Object.entries(tumKul).find(
    ([, k]) => k.referansKodu === davetKodu.toUpperCase().trim()
  );

  if (!davetEdenEntry) return;

  const [davetEdenUid, davetEdenKul] = davetEdenEntry;

  // Davet edene +1 hak
  await kullaniciGuncelle(davetEdenUid, token, {
    hak: (davetEdenKul.hak || 0) + 1,
  });

  // Yeni kullanıcıya +1 hak
  await kullaniciGuncelle(yeniUid, token, {
    hak: 1,
  });

  return true;
};
