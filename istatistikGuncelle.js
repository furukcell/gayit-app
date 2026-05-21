// istatistikGuncelle.js
// İlanlar tamamlandığında veya teklif verildiğinde çağrılır.
// Hem usta istatistiklerini hem sıralama skorlarını günceller.

import { database } from '../firebaseConfig';
import { ref, get, set, update, runTransaction } from 'firebase/database';

// ─── İş tamamlandığında çağrılır ─────────────────────────────────
// ilanId tamamlandı → puanId oluştu → bu fonksiyon çağrılır
export async function islemTamamlandiGuncelle({ ustaId, ilanId, puanId }) {
  const [ilanSnap, puanSnap, mevcut] = await Promise.all([
    get(ref(database, `ilanlar/${ilanId}`)),
    get(ref(database, `puanlar/${puanId}`)),
    get(ref(database, `istatistikler/${ustaId}`)),
  ]);

  if (!ilanSnap.exists()) return;

  const ilan    = ilanSnap.val();
  const puan    = puanSnap.exists() ? puanSnap.val() : null;
  const ist     = mevcut.exists() ? mevcut.val() : baslangicIstatistik();
  const simdi   = Date.now();

  // Tamamlama süresi (saat)
  let tamamlamaSaati = null;
  if (ilan.olusturmaTarihi && ilan.tamamlanmaTarihi) {
    tamamlamaSaati = (ilan.tamamlanmaTarihi - ilan.olusturmaTarihi) / 3600000;
  }

  // Ortalama puan güncelle
  const yeniPuanSayisi = (ist.toplamPuanSayisi || 0) + (puan ? 1 : 0);
  const eskiPuanToplam  = (ist.ortalamaPuan || 0) * (ist.toplamPuanSayisi || 0);
  const yeniPuan = puan
    ? (eskiPuanToplam + puan.puan) / yeniPuanSayisi
    : ist.ortalamaPuan;

  // Ortalama tamamlama süresi güncelle
  const eskiToplam = (ist.ortalamaTamamlamaSaati || 0) * (ist.tamamlanan || 0);
  const yeniTamamlanan = (ist.tamamlanan || 0) + 1;
  const yeniTamamlamaSaati = tamamlamaSaati !== null
    ? (eskiToplam + tamamlamaSaati) / yeniTamamlanan
    : ist.ortalamaTamamlamaSaati;

  // Kategori sayacı
  const kategoriler = { ...(ist.kategoriler || {}) };
  if (ilan.kategori) {
    kategoriler[ilan.kategori] = (kategoriler[ilan.kategori] || 0) + 1;
  }

  // İlçe sayacı
  const ilceler = { ...(ist.ilceler || {}) };
  if (ilan.ilce) {
    ilceler[ilan.ilce] = (ilceler[ilan.ilce] || 0) + 1;
  }

  const guncelleme = {
    tamamlanan:              yeniTamamlanan,
    toplamIs:                (ist.toplamIs || 0) + 1,
    ortalamaPuan:            yeniPuan,
    toplamPuanSayisi:        yeniPuanSayisi,
    ortalamaTamamlamaSaati:  yeniTamamlamaSaati,
    kategoriler,
    ilceler,
    sonGuncelleme:           simdi,
  };

  await update(ref(database, `istatistikler/${ustaId}`), guncelleme);

  // Sıralama hesapla (asenkron, beklemeye gerek yok)
  siralamaGuncelle(ustaId).catch(console.error);
}

// ─── Teklif verildiğinde çağrılır ────────────────────────────────
export async function teklifVerildiGuncelle({ ustaId, yanısSuresiMs }) {
  const ist = await get(ref(database, `istatistikler/${ustaId}`));
  const mevcut = ist.exists() ? ist.val() : baslangicIstatistik();

  const yanısDk = yanısSuresiMs / 60000;
  const eskiToplam = (mevcut.ortalamaYanisSuresiDk || 0) * (mevcut.toplamTeklif || 0);
  const yeniTeklif = (mevcut.toplamTeklif || 0) + 1;
  const yeniYanis = (eskiToplam + yanısDk) / yeniTeklif;

  await update(ref(database, `istatistikler/${ustaId}`), {
    toplamTeklif:           yeniTeklif,
    ortalamaYanisSuresiDk:  yeniYanis,
    sonGuncelleme:          Date.now(),
  });
}

// ─── Gayit tarihi güncellemesi ────────────────────────────────────
export async function gayitSuresiniGuncelle(ustaId, kayitTarihi) {
  const gunSayisi = Math.floor((Date.now() - kayitTarihi) / 86400000);
  await update(ref(database, `istatistikler/${ustaId}`), {
    gayitteGunSayisi: gunSayisi,
    sonGuncelleme: Date.now(),
  });
}

// ─── Sıralama hesaplama ───────────────────────────────────────────
// Tüm ustalar arasında Muğla geneli ve ilçe bazlı sıralama
export async function siralamaGuncelle(hedefUstaId) {
  const tumIstSnap = await get(ref(database, 'istatistikler'));
  if (!tumIstSnap.exists()) return;

  const tumIst = tumIstSnap.val();

  // Tüm kategorileri topla
  const kategoriUstalar = {}; // { "elektrik": [{ustaId, skor}] }
  const ilceKategoriUstalar = {}; // { "Bodrum_elektrik": [{ustaId, skor}] }

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

  await update(ref(database, `istatistikler/${hedefUstaId}/skorlar`), {
    muglaGenelKategoriSira,
    ilceKategoriSira,
    teklifSkoru,
  });
}

// ─── Raw skor (tüm ustalar karşılaştırmasında kullanılır) ─────────
function teklifSkoruHesaplaRaw(ist, maxIs = 100) {
  const maxSaat = 10;
  return Math.min(100,
    ((ist.toplamIs || 0) / maxIs * 100) * 0.35
    + ((ist.ortalamaPuan || 0) / 5 * 100) * 0.30
    + Math.max(0, 100 - (ist.ortalamaYanisSuresiDk || 0)) * 0.20
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
    ortalamaYanisSuresiDk: 0,
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
