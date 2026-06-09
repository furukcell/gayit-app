// istatistikGuncelle.js
// İlanlar tamamlandığında veya teklif verildiğinde çağrılır.
// Hem usta istatistiklerini hem sıralama skorlarını günceller.
// REST API (fetch) kullanır — Firebase SDK gerektirmez.

import { DB_URL } from './constants';

// ─── Yardımcı: Firebase'den veri oku ─────────────────────────────
async function fbGet(yol, token) {
  const url = token ? `${DB_URL}/${yol}.json?auth=${token}` : `${DB_URL}/${yol}.json`;
  const res = await fetch(url);
  return await res.json();
}

// ─── Yardımcı: Firebase'e veri yaz (PATCH) ───────────────────────
async function fbPatch(yol, veri, token) {
  const url = token ? `${DB_URL}/${yol}.json?auth=${token}` : `${DB_URL}/${yol}.json`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri),
  });
}

// ─── İş tamamlandığında çağrılır ─────────────────────────────────
// ilanId tamamlandı → puanId oluştu → bu fonksiyon çağrılır
export async function islemTamamlandiGuncelle({ ustaId, ilanId, puanId, token }) {
  const [ilan, puanVerisi, ist] = await Promise.all([
    fbGet(`ilanlar/${ilanId}`, token),
    fbGet(`puanlar/${puanId}`, token),
    fbGet(`istatistikler/${ustaId}`, token),
  ]);

  if (!ilan) return;

  const mevcut = ist || baslangicIstatistik();
  const simdi  = Date.now();

  // Tamamlama süresi (saat)
  let tamamlamaSaati = null;
  if (ilan.olusturmaTarihi && ilan.tamamlanmaTarihi) {
    tamamlamaSaati = (ilan.tamamlanmaTarihi - ilan.olusturmaTarihi) / 3600000;
  }

  // Ortalama puan güncelle
  const yeniPuanSayisi = (mevcut.toplamPuanSayisi || 0) + (puanVerisi ? 1 : 0);
  const eskiPuanToplam = (mevcut.ortalamaPuan || 0) * (mevcut.toplamPuanSayisi || 0);
  const yeniPuan = puanVerisi
    ? (eskiPuanToplam + puanVerisi.puan) / yeniPuanSayisi
    : mevcut.ortalamaPuan;

  // Ortalama tamamlama süresi güncelle
  const eskiToplam     = (mevcut.ortalamaTamamlamaSaati || 0) * (mevcut.tamamlanan || 0);
  const yeniTamamlanan = (mevcut.tamamlanan || 0) + 1;
  const yeniTamamlamaSaati = tamamlamaSaati !== null
    ? (eskiToplam + tamamlamaSaati) / yeniTamamlanan
    : mevcut.ortalamaTamamlamaSaati;

  // Kategori sayacı
  const kategoriler = { ...(mevcut.kategoriler || {}) };
  if (ilan.kategori) {
    kategoriler[ilan.kategori] = (kategoriler[ilan.kategori] || 0) + 1;
  }

  // İlçe sayacı
  const ilceler = { ...(mevcut.ilceler || {}) };
  if (ilan.bolge) {
    ilceler[ilan.bolge] = (ilceler[ilan.bolge] || 0) + 1;
  }

  const guncelleme = {
    tamamlanan:             yeniTamamlanan,
    toplamIs:               (mevcut.toplamIs || 0) + 1,
    ortalamaPuan:           yeniPuan,
    toplamPuanSayisi:       yeniPuanSayisi,
    ortalamaTamamlamaSaati: yeniTamamlamaSaati,
    kategoriler,
    ilceler,
    sonGuncelleme:          simdi,
  };

  await fbPatch(`istatistikler/${ustaId}`, guncelleme, token);

  // Sıralama hesapla (asenkron, beklemeye gerek yok)
  siralamaGuncelle(ustaId, token).catch(console.error);
}

// ─── Teklif verildiğinde çağrılır ────────────────────────────────
export async function teklifVerildiGuncelle({ ustaId, yanısSuresiMs, token }) {
  const mevcut = (await fbGet(`istatistikler/${ustaId}`, token)) || baslangicIstatistik();

  const yanıtDk    = yanısSuresiMs / 60000;
  const eskiToplam = (mevcut.ortalamaYanitSuresiDk || 0) * (mevcut.toplamTeklif || 0);
  const yeniTeklif = (mevcut.toplamTeklif || 0) + 1;
  const yeniYanit  = (eskiToplam + yanıtDk) / yeniTeklif;

  await fbPatch(`istatistikler/${ustaId}`, {
    toplamTeklif:          yeniTeklif,
    ortalamaYanitSuresiDk: yeniYanit,
    sonGuncelleme:         Date.now(),
  }, token);
}

// ─── Gayit tarihi güncellemesi ────────────────────────────────────
export async function gayitSuresiniGuncelle(ustaId, kayitTarihi, token) {
  const gunSayisi = Math.floor((Date.now() - kayitTarihi) / 86400000);
  await fbPatch(`istatistikler/${ustaId}`, {
    gayitteGunSayisi: gunSayisi,
    sonGuncelleme:    Date.now(),
  }, token);
}

// ─── Sıralama hesaplama ───────────────────────────────────────────
// Tüm ustalar arasında Muğla geneli ve ilçe bazlı sıralama
export async function siralamaGuncelle(hedefUstaId, token) {
  const tumIst = await fbGet('istatistikler', token);
  if (!tumIst) return;

  const kategoriUstalar     = {};
  const ilceKategoriUstalar = {};

  const tumIstDizi = Object.entries(tumIst).map(([uid, ist]) => ({ uid, ist }));
  const maxIs = Math.max(...tumIstDizi.map(u => u.ist.toplamIs || 0), 1);

  for (const { uid, ist } of tumIstDizi) {
    const skor = teklifSkoruHesaplaRaw(ist, maxIs);

    // Muğla geneli kategori
    for (const kat of Object.keys(ist.kategoriler || {})) {
      if (!kategoriUstalar[kat]) kategoriUstalar[kat] = [];
      kategoriUstalar[kat].push({ uid, skor });
    }

    // İlçe + kategori
    for (const ilce of Object.keys(ist.ilceler || {})) {
      for (const kat of Object.keys(ist.kategoriler || {})) {
        const key = `${ilce}_${kat}`;
        if (!ilceKategoriUstalar[key]) ilceKategoriUstalar[key] = [];
        ilceKategoriUstalar[key].push({ uid, skor });
      }
    }
  }

  // Sıraları hesapla ve hedef usta için yaz
  const muglaGenelKategoriSira = {};
  for (const [kat, ustalar] of Object.entries(kategoriUstalar)) {
    ustalar.sort((a, b) => b.skor - a.skor);
    const sira = ustalar.findIndex(u => u.uid === hedefUstaId) + 1;
    if (sira > 0) muglaGenelKategoriSira[kat] = sira;
  }

  const ilceKategoriSira = {};
  for (const [key, ustalar] of Object.entries(ilceKategoriUstalar)) {
    ustalar.sort((a, b) => b.skor - a.skor);
    const sira = ustalar.findIndex(u => u.uid === hedefUstaId) + 1;
    if (sira > 0) ilceKategoriSira[key] = sira;
  }

  const teklifSkoru = teklifSkoruHesaplaRaw(tumIst[hedefUstaId], maxIs);

  await fbPatch(`istatistikler/${hedefUstaId}/skorlar`, {
    muglaGenelKategoriSira,
    ilceKategoriSira,
    teklifSkoru,
  }, token);
}

// ─── Raw skor (tüm ustalar karşılaştırmasında kullanılır) ─────────
function teklifSkoruHesaplaRaw(ist, maxIs = 100) {
  const maxSaat = 10;
  return Math.min(100,
    ((ist.toplamIs || 0) / maxIs * 100) * 0.35
    + ((ist.ortalamaPuan || 0) / 5 * 100) * 0.30
    + Math.max(0, 100 - (ist.ortalamaYanitSuresiDk || 0)) * 0.20
    + Math.max(0, 100 - ((ist.ortalamaTamamlamaSaati || 0) / maxSaat * 100)) * 0.15
  );
}

// ─── Boş istatistik şablonu ───────────────────────────────────────
function baslangicIstatistik() {
  return {
    toplamIs: 0,
    toplamTeklif: 0,
    tamamlanan: 0,
    iptal: 0,
    ortalamaPuan: 0,
    toplamPuanSayisi: 0,
    ortalamaYanitSuresiDk: 0,
    ortalamaTamamlamaSaati: 0,
    gayitteGunSayisi: 0,
    kategoriler: {},
    ilceler: {},
    sonGuncelleme: Date.now(),
    skorlar: {
      muglaGenelKategoriSira: {},
      ilceKategoriSira: {},
      teklifSkoru: 0,
    },
  };
}
