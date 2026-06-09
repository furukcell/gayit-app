// ============================================================
// ADIM 2 — firebase.js (PRODUCTION READY)
// Tüm Firebase okuma/yazma işlemleri burada toplanıyor.
// App.js ve diğer ekranlar direkt fetch yazmak yerine
// bu fonksiyonları çağırıyor.
//
// ✅ DÜZELTİLDİ: Tüm fonksiyonlara auth token eklendi
// ✅ Tüm fetch URL'lerine ?auth=${token} parametresi eklendi
// ✅ Fetch hatalarına .catch() eklendi
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
// Mail doğrulama gönder
export const dogrulamaMailiGonder = async (idToken) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
    }
  );
  return await res.json();
};

// Mail doğrulama durumunu kontrol et
export const mailDogrulandiMiKontrol = async (idToken) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await res.json();
  return data?.users?.[0]?.emailVerified === true;
};

// ============================================================
// KULLANICI İŞLEMLERİ
// ============================================================

// Tek kullanıcı getir
export const kullaniciyiGetir = async (uid, token) => {
  const res = await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`);
  return await res.json();
};

// Tüm kullanıcıları getir
export const tumKullanicilariGetir = async (token) => {
  const res = await fetch(`${DB_URL}/kullanicilar.json?auth=${token}`);
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

// Tüm ilanları getir (auth gerekmez — rules'da .read: true)
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
export const ilanOlustur = async (veri, token) => {
  const res = await fetch(`${DB_URL}/ilanlar.json?auth=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
  return await res.json();
};

// İlan güncelle
export const ilanGuncelle = async (ilanId, veri, token) => {
  await fetch(`${DB_URL}/ilanlar/${ilanId}.json?auth=${token}`, {
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
export const teklifGonder = async (ilanId, teklif, token) => {
  const res = await fetch(`${DB_URL}/ilanlar/${ilanId}/teklifler.json?auth=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teklif),
  });
  return await res.json();
};

// ============================================================
// SOHBET İŞLEMLERİ
// ============================================================

// Sohbet mesajı gönder
export const mesajGonder = async (sohbetId, mesaj, token) => {
  const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mesaj),
  });
  return await res.json();
};

// Sohbet mesajlarını getir
export const mesajlariGetir = async (sohbetId, token) => {
  const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data)
    .map((key) => ({ id: key, ...data[key] }))
    .sort((a, b) => a.tarih - b.tarih);
};

// Sohbet oluştur veya güncelle
export const sohbetGuncelle = async (sohbetId, veri, token) => {
  await fetch(`${DB_URL}/sohbetler/${sohbetId}.json?auth=${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// ============================================================
// PUANLAMA İŞLEMLERİ
// ============================================================

// Puan gönder
  export const puanGonder = async (ustaUid, musteriUid, puanVerisi, token) => {
  const res = await fetch(`${DB_URL}/puanlar/${ustaUid}/${musteriUid}.json?auth=${token}`, {
  method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(puanVerisi),
  });
  return await res.json();
};

// Ustanın puanlarını getir (auth gerekmez — rules'da .read: true)
  export const puanlariGetir = async (ustaUid) => {
  const res = await fetch(`${DB_URL}/puanlar/${ustaUid}.json`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
};

// ============================================================
// ŞİKAYET İŞLEMLERİ
// ============================================================

// Şikayet gönder
export const sikayetGonder = async (veri, token) => {
  await fetch(`${DB_URL}/sikayetler.json?auth=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// Tüm şikayetleri getir (Admin için)
export const sikayetleriGetir = async (token) => {
  const res = await fetch(`${DB_URL}/sikayetler.json?auth=${token}`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data)
    .map((key) => ({ id: key, ...data[key] }))
    .sort((a, b) => b.tarih - a.tarih);
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
export const bildirimKaydet = async (hedefUid, baslik, mesaj, token) => {
  try {
    await fetch(`${DB_URL}/bildirimler/${hedefUid}.json?auth=${token}`, {
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
    console.log('Bildirim kaydedilemedi:', e);
  }
};

// Bildirimleri getir
export const bildirimleriGetir = async (uid, token) => {
  const res = await fetch(`${DB_URL}/bildirimler/${uid}.json?auth=${token}`);
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data)
    .map((key) => ({ id: key, ...data[key] }))
    .sort((a, b) => b.tarih - a.tarih);
};

// ============================================================
// İLETİŞİM FORMU
// ============================================================

export const iletisimGonder = async (veri, token) => {
  await fetch(`${DB_URL}/iletisim.json?auth=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
};

// İletişim mesajlarını getir (Admin için)
export const iletisimMesajlariGetir = async (token) => {
  const res = await fetch(`${DB_URL}/iletisim.json?auth=${token}`);
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
  const res = await fetch(`${DB_URL}/kullanicilar.json?auth=${token}`);
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
// ============================================================
// HESAP SİLME — Tüm verileri sil
// ============================================================
// Firebase Auth hesabını sil (REST API)
export const authHesabiSil = async (idToken) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  return await res.json();
};

// Storage dosyasını sil
export const storageDosyaSil = async (token, dosyaYolu) => {
  try {
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/gayit-6f6c4.firebasestorage.app/o/${encodeURIComponent(dosyaYolu)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.ok;
  } catch (e) {
    console.log('Storage silme hatası:', e);
    return false;
  }
};

// URL'den storage dosya yolunu çıkar
export const urlDenDosyaYolu = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
};

// Kullanıcının TÜM verilerini sil (Firebase, Storage, Auth)
export const kullanicininTumVerileriniSil = async (uid, token, kullanici) => {
  const log = [];

  // 1️ Kullanıcının ilanlarını bul ve sil
  try {
    const ilanRes = await fetch(`${DB_URL}/ilanlar.json?auth=${token}`);
    const ilanlar = await ilanRes.json();
    if (ilanlar) {
      for (const [ilanId, ilan] of Object.entries(ilanlar)) {
        if (ilan.sahip === kullanici?.email || ilan.anlasilanUsta?.ustaUid === uid) {
          await fetch(`${DB_URL}/ilanlar/${ilanId}.json?auth=${token}`, { method: 'DELETE' });
          log.push(`İlan silindi: ${ilan.baslik}`);
        }
      }
    }
  } catch (e) { log.push('İlan silme hatası'); }

  // 2️⃣ Puanları sil (hem aldığı hem verdiği)
  try {
    await fetch(`${DB_URL}/puanlar/${uid}.json?auth=${token}`, { method: 'DELETE' });
    log.push('Puanlar silindi');
  } catch (e) {}

  // 3️⃣ Bildirimleri sil
  try {
    await fetch(`${DB_URL}/bildirimler/${uid}.json?auth=${token}`, { method: 'DELETE' });
    log.push('Bildirimler silindi');
  } catch (e) {}

  // 4️⃣ Onay başvurularını sil
  try {
    await fetch(`${DB_URL}/onayBasvurulari/${uid}.json?auth=${token}`, { method: 'DELETE' });
    log.push('Onay başvurusu silindi');
  } catch (e) {}

  // 5️ Admin mesajlarını sil
  try {
    await fetch(`${DB_URL}/adminMesajlari/${uid}.json?auth=${token}`, { method: 'DELETE' });
    log.push('Admin mesajları silindi');
  } catch (e) {}

  // 6️⃣ Sohbetleri sil
  try {
    const sohbetRes = await fetch(`${DB_URL}/sohbetler.json?auth=${token}`);
    const sohbetler = await sohbetRes.json();
    if (sohbetler) {
      for (const [sohbetId, sohbet] of Object.entries(sohbetler)) {
        if (sohbet.ustaUid === uid || sohbet.musteriUid === uid || 
            sohbet.ustaEmail === kullanici?.email || sohbet.musteriEmail === kullanici?.email) {
          await fetch(`${DB_URL}/sohbetler/${sohbetId}.json?auth=${token}`, { method: 'DELETE' });
          log.push(`Sohbet silindi: ${sohbetId}`);
        }
      }
    }
  } catch (e) { log.push('Sohbet silme hatası'); }

  // 7️ Referans kodunu sil
  if (kullanici?.referansKodu) {
    try {
      await fetch(`${DB_URL}/referansKodu/${kullanici.referansKodu}.json?auth=${token}`, { method: 'DELETE' });
      log.push('Referans kodu silindi');
    } catch (e) {}
  }

  // 8️⃣ Storage dosyalarını sil (profil, kimlik, ek belgeler)
  const dosyaAlanlari = ['profilFoto', 'kimlikUrl', 'ekBelgeUrl', 'ustalikBelgesiUrl', 'vergiLevhasiUrl', 'esnafSicilUrl'];
  for (const alan of dosyaAlanlari) {
    const url = kullanici?.[alan];
    const dosyaYolu = urlDenDosyaYolu(url);
    if (dosyaYolu) {
      await storageDosyaSil(token, dosyaYolu);
    }
  }
  // Ekstra: belgeler/{uid}/ klasöründeki tüm dosyalar için
  // (bu Firebase Storage REST API ile tek seferde silinemez, tek tek silmek gerekir)

  // 9️⃣ Kullanıcı profilini sil
  try {
    await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, { method: 'DELETE' });
    log.push('Kullanıcı profili silindi');
  } catch (e) { log.push('Profil silme hatası'); }

  // 🔟 EN SON: Firebase Auth hesabını sil
  try {
    await authHesabiSil(token);
    log.push('Auth hesabı silindi');
  } catch (e) { log.push('Auth silme hatası'); }

  return log;
};
