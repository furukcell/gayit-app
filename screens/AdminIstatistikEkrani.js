// ============================================================
// AdminIstatistikEkrani.js
// GAYİT Admin İstatistik & Rapor Ekranı — TAM SÜRÜM
//
// ✅ Tarih filtresi (Bugün / Dün / 7 gün / 30 gün / Bu Ay / Geçen Ay / 3 Ay / Tümü)
// ✅ Özet kartlar + dönüşüm oranları
// ✅ Bugün özeti (abonelik + kupon dahil)
// ✅ Dönüşüm hunisi + otomatik yorum + anlaşma sonrası etkileşim
// ✅ Kullanıcı istatistikleri (branş, profil, belge, onay oranları)
// ✅ İlan istatistikleri (ücretli / kupon / abonelik hakkı / iptal / pasif)
// ✅ Teklif istatistikleri (aktif usta, en çok teklif verenler, kabul/red/bekleyen)
// ✅ Puanlama detayı (yıldız dağılımı, yorumlu/yorumsuz, en yüksek puanlı ustalar)
// ✅ Abonelik & Gelir bölümü (VIP/Premium dağılımı, kupon detayı)
// ✅ İlçe bazlı performans (onaylı usta + en aktif kategori dahil)
// ✅ Kategori bazlı performans (usta sayısı + en güçlü ilçe dahil)
// ✅ Aylık karşılaştırma (son 6 ay, büyüme oranı, bar chart)
// ✅ Uyarı & alarm sistemi (kupon limiti uyarısı dahil)
// ✅ 10 KPI + GAYİT Sağlık Skoru
// ✅ CSV export
// ✅ useMemo ile performans optimizasyonu
//
// 🔥 Firebase Kota Optimizasyonu:
//    - ilanlar: sadece son 35 gün çekilir (orderBy tarih + startAt)
//    - aylikRaporlar: geçmiş aylar Firebase'de saklanır, eksik ay varsa hesaplanıp yazılır
//    - kullanicilar: tam çekilir (profil verileri canlı olmalı, küçük node)
//
// 🐛 Bug Düzeltmeleri (ChatGPT analizi):
//    - Teklif kabul/red/bekleyen artık seçili dönemi baz alıyor
//    - İlan sekmesinde acil ilan sayısı filtreli geliyor
//    - Aktif ilan hesabında anlasmaVar olanlar dışlandı
//    - Tarihler Number() ile normalize ediliyor
//    - fetch HTTP hata kontrolü eklendi
//    - useEffect dependency düzeltildi
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
  Share,
} from 'react-native';
import { DB_URL } from '../constants';

// ── Muğla ilçeleri ───────────────────────────────────────────
const ILCELER = [
  'Menteşe (Merkez)', 'Bodrum', 'Dalaman', 'Datça', 'Fethiye',
  'Kavaklıdere', 'Köyceğiz', 'Marmaris', 'Milas', 'Ortaca',
  'Seydikemer', 'Ula', 'Yatağan'
];

// ── Kategoriler ──────────────────────────────────────────────
const KATEGORILER = [
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
];

// ── Tarih filtre seçenekleri ─────────────────────────────────
const FILTRELER = [
  { key: 'bugun',    label: 'Bugün' },
  { key: 'dun',      label: 'Dün' },
  { key: '7gun',     label: '7 Gün' },
  { key: '30gun',    label: '30 Gün' },
  { key: 'buay',     label: 'Bu Ay' },
  { key: 'gecenay',  label: 'Geçen Ay' },
  { key: '3ay',      label: '3 Ay' },
  { key: 'tumzaman', label: 'Tümü' },
];

// ── Türkçe ay adları ─────────────────────────────────────────
const AY_ADLARI     = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const AY_ADLARI_TAM = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

// ── Yardımcı fonksiyonlar ─────────────────────────────────────
function aralikHesapla(filtre) {
  const simdi = Date.now();
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  switch (filtre) {
    case 'bugun':   return { baslangic: bugun.getTime(), bitis: simdi };
    case 'dun': {
      const dunBasi  = new Date(bugun); dunBasi.setDate(dunBasi.getDate() - 1);
      const dunBitis = new Date(bugun); dunBitis.setMilliseconds(-1);
      return { baslangic: dunBasi.getTime(), bitis: dunBitis.getTime() };
    }
    case '7gun':    return { baslangic: simdi - 7  * 86400000, bitis: simdi };
    case '30gun':   return { baslangic: simdi - 30 * 86400000, bitis: simdi };
    case 'buay': {
      const ayBasi = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
      return { baslangic: ayBasi.getTime(), bitis: simdi };
    }
    case 'gecenay': {
      const gAyBasi  = new Date(bugun.getFullYear(), bugun.getMonth() - 1, 1);
      const gAyBitis = new Date(bugun.getFullYear(), bugun.getMonth(), 1) - 1;
      return { baslangic: gAyBasi.getTime(), bitis: gAyBitis };
    }
    case '3ay':     return { baslangic: simdi - 90 * 86400000, bitis: simdi };
    default:        return { baslangic: 0, bitis: simdi };
  }
}

function yuzde(pay, payda) {
  if (!payda || payda === 0) return 0;
  return Math.round((pay / payda) * 100);
}

function kisalt(sayi) {
  if (typeof sayi !== 'number') return String(sayi);
  if (sayi >= 1000) return (sayi / 1000).toFixed(1) + 'K';
  return String(sayi);
}

function buyumeOrani(simdi, gecen) {
  if (!gecen || gecen === 0) return simdi > 0 ? '+100%' : '—';
  const oran = Math.round(((simdi - gecen) / gecen) * 100);
  return oran >= 0 ? `+${oran}%` : `${oran}%`;
}

function buyumeRengi(simdi, gecen) {
  if (!gecen || gecen === 0) return simdi > 0 ? '#27AE60' : '#A3B1B9';
  return simdi >= gecen ? '#27AE60' : '#E74C3C';
}

function sonAylariHesapla(ayAdedi = 6) {
  const aylar = [];
  const simdi  = new Date();
  for (let i = ayAdedi - 1; i >= 0; i--) {
    const d     = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1);
    const bitis = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1;
    aylar.push({
      yil: d.getFullYear(), ay: d.getMonth(),
      label:    `${AY_ADLARI[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      labelTam: `${AY_ADLARI_TAM[d.getMonth()]} ${d.getFullYear()}`,
      baslangic: d.getTime(),
      bitis:     Math.min(bitis, Date.now()),
    });
  }
  return aylar;
}

// ============================================================
// ANA BİLEŞEN
// ============================================================
export function AdminIstatistikEkrani({ kullanici, token, setEkran, s }) {
  const [aktifFiltre,  setAktifFiltre]  = useState('30gun');
  const [aktifSekme,   setAktifSekme]   = useState('ozet');
  const [yukleniyor,   setYukleniyor]   = useState(false);
  const [yenileniyor,  setYenileniyor]  = useState(false);
  const [aylikMetrik,  setAylikMetrik]  = useState('kayit');

  // Ham veriler
  const [kullanicilar,    setKullanicilar]    = useState([]);
  const [ilanlar,         setIlanlar]         = useState([]);
  const [teklifler,       setTeklifler]       = useState([]);
  const [puanlamalar,     setPuanlamalar]     = useState([]);
  const [kuponlar,        setKuponlar]        = useState([]);
  const [onayBasvurulari, setOnayBasvurulari] = useState([]);
  const [aylikRaporlar,   setAylikRaporlar]   = useState({}); // { '2026-05': { kayit, ilan, ... } }

  // ── Aylık rapor anahtarı ─────────────────────────────────
  // Örnek: 2026-05
  function ayAnahtari(yil, ay) {
    return `${yil}-${String(ay + 1).padStart(2, '0')}`;
  }

  // ── Veri yükleme ─────────────────────────────────────────
  const veriYukle = useCallback(async (gosterYukleniyor = true) => {
    if (gosterYukleniyor) setYukleniyor(true);
    else setYenileniyor(true);
    try {
      // ilanlar: sadece son 35 gün (30 gün filtre + 5 gün buffer)
      const otuzBesBasi = Date.now() - 35 * 86400000;
      const ilanUrl = `${DB_URL}/ilanlar.json?auth=${token}&orderBy="tarih"&startAt=${otuzBesBasi}`;

      const [kulRes, ilanRes, puanRes, kuponRes, onayRes, aylikRes] = await Promise.all([
        fetch(`${DB_URL}/kullanicilar.json?auth=${token}`),
        fetch(ilanUrl),
        fetch(`${DB_URL}/puanlamalar.json?auth=${token}&orderBy="tarih"&startAt=${otuzBesBasi}`),
        fetch(`${DB_URL}/kuponlar.json?auth=${token}`),
        fetch(`${DB_URL}/onayBasvurulari.json?auth=${token}`),
        fetch(`${DB_URL}/aylikRaporlar.json?auth=${token}`),
      ]);

      // HTTP hata kontrolü
      if ([kulRes, ilanRes, puanRes, kuponRes, onayRes].some(r => !r.ok)) {
        throw new Error('Firebase veri çekme hatası');
      }

      const [kulData, ilanData, puanData, kuponData, onayData, aylikData] = await Promise.all([
        kulRes.json(), ilanRes.json(), puanRes.json(), kuponRes.json(), onayRes.json(), aylikRes.json(),
      ]);

      // Firebase hata objesi kontrolü
      if (kulData?.error || ilanData?.error) {
        throw new Error(kulData?.error || ilanData?.error);
      }

      const kulListe = kulData
        ? Object.entries(kulData).map(([uid, v]) => ({ uid, ...v }))
        : [];

      const ilanListe = ilanData
        ? Object.entries(ilanData).map(([id, v]) => ({
            id, ...v,
            tarih: Number(v.tarih) || 0,
            teklifSayisi: v.teklifler ? Object.keys(v.teklifler).length : 0,
          }))
        : [];

      const puanListe = puanData
        ? Object.entries(puanData).map(([id, v]) => ({ id, ...v, tarih: Number(v.tarih) || 0 }))
        : [];

      const kuponListe = kuponData
        ? Object.entries(kuponData).map(([id, v]) => ({ id, ...v }))
        : [];

      const onayListe = onayData
        ? Object.entries(onayData).map(([uid, v]) => ({ uid, ...v })).filter(b => b.onayDurumu === 'beklemede')
        : [];

      // Teklifleri ilanlardan topla
      const teklifListe = [];
      ilanListe.forEach(ilan => {
        if (ilan.teklifler && typeof ilan.teklifler === 'object') {
          Object.entries(ilan.teklifler).forEach(([tid, t]) => {
            teklifListe.push({ id: tid, ilanId: ilan.id, bolge: ilan.bolge, kategori: ilan.kategori, ...t, tarih: Number(t.tarih) || 0 });
          });
        }
      });

      const mevcutAylikRaporlar = (aylikData && !aylikData.error) ? aylikData : {};

      setKullanicilar(kulListe);
      setIlanlar(ilanListe);
      setTeklifler(teklifListe);
      setPuanlamalar(puanListe);
      setKuponlar(kuponListe);
      setOnayBasvurulari(onayListe);
      setAylikRaporlar(mevcutAylikRaporlar);

      // Geçmiş ayların raporlarını kontrol et ve eksikleri yaz
      await aylikRaporKontrol(mevcutAylikRaporlar, kulListe, ilanListe, teklifListe, puanListe);

    } catch (e) {
      Alert.alert('Hata', e.message || 'İstatistik verileri yüklenemedi.');
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aylık rapor kontrol & yaz ────────────────────────────
  // Geçmiş 5 ay için rapor yoksa hesaplayıp Firebase'e yazar.
  // Güncel ay hiçbir zaman yazılmaz (ay bitmeden veri sabitlenmez).
  const aylikRaporKontrol = useCallback(async (mevcutRaporlar, kulListe, ilanListe, teklifListe, puanListe) => {
    const simdi     = new Date();
    const guncelAy  = simdi.getMonth();
    const guncelYil = simdi.getFullYear();
    const yazilacaklar = {};

    for (let i = 1; i <= 5; i++) {
      const d   = new Date(guncelYil, guncelAy - i, 1);
      const key = ayAnahtari(d.getFullYear(), d.getMonth());
      if (mevcutRaporlar[key]) continue; // zaten var, atla

      const ayBasi  = d.getTime();
      const ayBitis = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1;

      const filtreleAy = (liste, tarihAlani = 'tarih') =>
        liste.filter(item => {
          const t = Number(item[tarihAlani] || item.kayitTarihi || 0);
          return t >= ayBasi && t <= ayBitis;
        });

      const ayKul    = filtreleAy(kulListe, 'kayitTarihi');
      const ayIlan   = filtreleAy(ilanListe);
      const ayTeklif = filtreleAy(teklifListe);
      const ayAnl    = ayIlan.filter(x => x.anlasmaVar);
      const ayPuan   = filtreleAy(puanListe);
      const ayAktifAbone = kulListe.filter(k =>
        k.abonelik &&
        (!k.abonelikBitis || Number(k.abonelikBitis) >= ayBasi) &&
        (!k.abonelikBaslangic || Number(k.abonelikBaslangic) <= ayBitis)
      );

      yazilacaklar[key] = {
        kayit:   ayKul.length,
        usta:    ayKul.filter(k => k.rol === 'usta').length,
        musteri: ayKul.filter(k => k.rol === 'musteri').length,
        ilan:    ayIlan.length,
        teklif:  ayTeklif.length,
        anlasma: ayAnl.length,
        puan:    ayPuan.length,
        abone:   ayAktifAbone.length,
        donusum: yuzde(ayAnl.length, ayTeklif.length),
      };
    }

    if (Object.keys(yazilacaklar).length === 0) return;

    try {
      await fetch(`${DB_URL}/aylikRaporlar.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yazilacaklar),
      });
      setAylikRaporlar(prev => ({ ...prev, ...yazilacaklar }));
    } catch (_) {
      // Yazma başarısız olursa sessizce geç, bir sonraki açılışta tekrar dener
    }
  }, [token]);

  useEffect(() => {
    if (token) veriYukle();
  }, [token, veriYukle]);

  // ── useMemo: Filtre aralığı ──────────────────────────────
  const aralik = useMemo(() => aralikHesapla(aktifFiltre), [aktifFiltre]);

  const filtrele = useCallback((liste, tarihAlani = 'tarih') =>
    liste.filter(item => {
      const t = Number(item[tarihAlani] || item.kayitTarihi || item.olusturmaTarihi || 0);
      return t >= aralik.baslangic && t <= aralik.bitis;
    }), [aralik]);

  // ── useMemo: Temel hesaplamalar ──────────────────────────
  const hesaplamalar = useMemo(() => {
    const yeniKullanicilar     = filtrele(kullanicilar, 'kayitTarihi');
    const yeniUstalar          = yeniKullanicilar.filter(k => k.rol === 'usta');
    const yeniMusteriler       = yeniKullanicilar.filter(k => k.rol === 'musteri');
    const yeniIlanlar          = filtrele(ilanlar);
    const acilIlanlar          = yeniIlanlar.filter(i => i.acil);
    const yeniTeklifler        = filtrele(teklifler);
    const anlasmalar           = yeniIlanlar.filter(i => i.anlasmaVar);
    const tamamlananlar        = yeniIlanlar.filter(i => i.tamamlandi);
    const yeniPuanlamalar      = filtrele(puanlamalar);
    const teklifAlmayanIlanlar = yeniIlanlar.filter(i => i.teklifSayisi === 0);
    const aktifAbone           = kullanicilar.filter(k =>
      k.abonelik && (!k.abonelikBitis || k.abonelikBitis > Date.now())
    );

    const toplamUsta    = kullanicilar.filter(k => k.rol === 'usta').length;
    const toplamMusteri = kullanicilar.filter(k => k.rol === 'musteri').length;
    const onayliUsta    = kullanicilar.filter(k => k.onayDurumu === 'onayli').length;

    const puanOrtalama = puanlamalar.length
      ? (puanlamalar.reduce((acc, p) => acc + (p.puan || 0), 0) / puanlamalar.length).toFixed(1)
      : '—';

    return {
      yeniKullanicilar, yeniUstalar, yeniMusteriler,
      yeniIlanlar, acilIlanlar, yeniTeklifler,
      anlasmalar, tamamlananlar, yeniPuanlamalar,
      teklifAlmayanIlanlar, aktifAbone,
      toplamUsta, toplamMusteri, onayliUsta, puanOrtalama,
    };
  }, [filtrele, kullanicilar, ilanlar, teklifler, puanlamalar]);

  const {
    yeniKullanicilar, yeniUstalar, yeniMusteriler,
    yeniIlanlar, acilIlanlar, yeniTeklifler,
    anlasmalar, tamamlananlar, yeniPuanlamalar,
    teklifAlmayanIlanlar, aktifAbone,
    toplamUsta, toplamMusteri, onayliUsta, puanOrtalama,
  } = hesaplamalar;

  // ── useMemo: Bugün ───────────────────────────────────────
  const bugun = useMemo(() => {
    const ar = aralikHesapla('bugun');
    const bugunKul  = kullanicilar.filter(k => (k.kayitTarihi || 0) >= ar.baslangic);
    const bugunIlan = ilanlar.filter(i => (i.tarih || 0) >= ar.baslangic);
    const bugunTek  = teklifler.filter(t => (t.tarih || 0) >= ar.baslangic);
    const bugunAnl  = ilanlar.filter(i => i.anlasmaVar && (i.anlasmaTarihi || i.tarih || 0) >= ar.baslangic);
    const bugunPuan = puanlamalar.filter(p => (p.tarih || 0) >= ar.baslangic);
    const bugunAbone = kullanicilar.filter(k => k.abonelikBaslangic && k.abonelikBaslangic >= ar.baslangic);
    const bugunKupon = kuponlar.filter(ku => (ku.kullanimTarihi || ku.tarih || 0) >= ar.baslangic);
    return { kul: bugunKul, ilan: bugunIlan, teklif: bugunTek, anlasma: bugunAnl, puan: bugunPuan, abone: bugunAbone, kupon: bugunKupon };
  }, [kullanicilar, ilanlar, teklifler, puanlamalar, kuponlar]);

  // ── useMemo: Kullanıcı istatistikleri ───────────────────
  const kullaniciIstatistik = useMemo(() => {
    const tumUstalar = kullanicilar.filter(k => k.rol === 'usta');
    const profilTamamlayan  = tumUstalar.filter(k => k.ad && k.telefon && k.bolge);
    const bransSec           = tumUstalar.filter(k => k.anaBrans || k.yanBranslar?.length > 0);
    const tamBrans           = tumUstalar.filter(k => k.anaBrans && k.yanBranslar?.length >= 2);
    const belgeYukleyen      = tumUstalar.filter(k => k.belgeler && Object.keys(k.belgeler).length > 0);
    const onayaGonden        = kullanicilar.filter(k => k.rol === 'usta' && k.onayDurumu && k.onayDurumu !== 'yok');
    const onaylananUsta      = kullanicilar.filter(k => k.onayDurumu === 'onayli');
    const reddedilenUsta     = kullanicilar.filter(k => k.onayDurumu === 'reddedildi');

    // Müşteri tarafı
    const tumMusteriler = kullanicilar.filter(k => k.rol === 'musteri');
    const ilanAcanMus   = tumMusteriler.filter(m => ilanlar.some(i => i.musteriId === m.uid || i.kullaniciId === m.uid));

    return {
      tumUstaSayisi: tumUstalar.length,
      profilTamamlayanUsta: profilTamamlayan.length,
      bransSec: bransSec.length,
      tamBrans: tamBrans.length,
      belgeYukleyen: belgeYukleyen.length,
      onayaGonden: onayaGonden.length,
      onaylanan: onaylananUsta.length,
      reddedilen: reddedilenUsta.length,
      bekleyen: onayBasvurulari.length,
      tumMusteriSayisi: tumMusteriler.length,
      ilanAcanMusteri: ilanAcanMus.length,
    };
  }, [kullanicilar, ilanlar, onayBasvurulari]);

  // ── useMemo: İlan istatistikleri ────────────────────────
  const ilanIstatistik = useMemo(() => {
    const ucretliIlan   = ilanlar.filter(i => i.odemeYontemi === 'odeme' || i.ucretli === true);
    const kuponluIlan   = ilanlar.filter(i => i.odemeYontemi === 'kupon' || i.kuponKodu);
    const abonelikIlan  = ilanlar.filter(i => i.odemeYontemi === 'abonelik' || i.abonelikHakki === true);
    const iptalIlan     = ilanlar.filter(i => i.durum === 'iptal' || i.iptalEdildi === true);
    const pasifIlan     = ilanlar.filter(i => i.durum === 'pasif' || i.aktif === false);
    const aktifIlan     = ilanlar.filter(i => !i.tamamlandi && !i.iptalEdildi && !i.anlasmaVar && i.aktif !== false && i.durum !== 'iptal' && i.durum !== 'pasif');
    const tamamlananIlan = ilanlar.filter(i => i.tamamlandi);
    const puanlanmisIlan = ilanlar.filter(i => i.puanlandi || puanlamalar.some(p => p.ilanId === i.id));
    return { ucretliIlan, kuponluIlan, abonelikIlan, iptalIlan, pasifIlan, aktifIlan, tamamlananIlan, puanlanmisIlan };
  }, [ilanlar, puanlamalar]);

  // ── useMemo: Teklif istatistikleri ──────────────────────
  const teklifIstatistik = useMemo(() => {
    // kabul/red/bekleyen: seçili döneme göre (yeniTeklifler)
    const kabul      = yeniTeklifler.filter(t => t.durum === 'kabul' || t.kabul === true);
    const reddedilen = yeniTeklifler.filter(t => t.durum === 'red'   || t.reddedildi === true);
    const bekleyen   = yeniTeklifler.filter(t => !t.kabul && !t.reddedildi && t.durum !== 'kabul' && t.durum !== 'red');

    // Aktif teklif veren ustalar (tüm zamanlar — usta aktivitesi için)
    const teklifVerenUstaIdler = [...new Set(teklifler.map(t => t.ustaId).filter(Boolean))];
    const teklifVermeyenUsta   = kullanicilar.filter(k => k.rol === 'usta' && !teklifVerenUstaIdler.includes(k.uid));

    // En çok teklif veren ustalar — seçili döneme göre
    const ustaTeklist = {};
    yeniTeklifler.forEach(t => {
      if (t.ustaId) ustaTeklist[t.ustaId] = (ustaTeklist[t.ustaId] || 0) + 1;
    });
    const enCokTeklifVeren = Object.entries(ustaTeklist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid, adet]) => {
        const usta = kullanicilar.find(k => k.uid === uid);
        return { uid, ad: usta?.ad || usta?.isim || uid.slice(0, 8), adet };
      });

    const ilanBasinaOrt = yeniIlanlar.length > 0
      ? (yeniTeklifler.length / yeniIlanlar.length).toFixed(1)
      : '—';

    return { kabul, reddedilen, bekleyen, teklifVerenUstaIdler, teklifVermeyenUsta, enCokTeklifVeren, ilanBasinaOrt };
  }, [teklifler, yeniTeklifler, kullanicilar, yeniIlanlar]);

  // ── useMemo: Anlaşma sonrası etkileşim metrikleri ────────
  const anlasmaDetay = useMemo(() => {
    const anlasmaOlanIlanlar = ilanlar.filter(i => i.anlasmaVar);
    const sohbetAcilan   = anlasmaOlanIlanlar.filter(i => i.sohbetAcildi === true);
    const telefonAcilan  = anlasmaOlanIlanlar.filter(i => i.telefonAcildi === true);
    const konumPaylasan  = anlasmaOlanIlanlar.filter(i => i.konumPaylasimi === true);
    const iptalEdilen    = anlasmaOlanIlanlar.filter(i => i.anlasmaIptal === true || i.durum === 'iptal');
    return {
      toplamAnlasma: anlasmaOlanIlanlar.length,
      sohbetAcilan:  sohbetAcilan.length,
      telefonAcilan: telefonAcilan.length,
      konumPaylasan: konumPaylasan.length,
      iptalEdilen:   iptalEdilen.length,
    };
  }, [ilanlar]);

  // ── useMemo: Puanlama detayı ─────────────────────────────
  const puanlamaDetay = useMemo(() => {
    const bes  = puanlamalar.filter(p => (p.puan || 0) === 5);
    const dort = puanlamalar.filter(p => (p.puan || 0) === 4);
    const uc   = puanlamalar.filter(p => (p.puan || 0) === 3);
    const dusuk = puanlamalar.filter(p => (p.puan || 0) <= 2);
    const yorumlu   = puanlamalar.filter(p => p.yorum && p.yorum.trim().length > 0);
    const yorumsuz  = puanlamalar.filter(p => !p.yorum || p.yorum.trim().length === 0);

    // En yüksek puanlı ustalar
    const ustaPuanMap = {};
    puanlamalar.forEach(p => {
      if (!p.ustaId) return;
      if (!ustaPuanMap[p.ustaId]) ustaPuanMap[p.ustaId] = { toplam: 0, adet: 0 };
      ustaPuanMap[p.ustaId].toplam += (p.puan || 0);
      ustaPuanMap[p.ustaId].adet  += 1;
    });
    const enYuksekPuanliUstalar = Object.entries(ustaPuanMap)
      .map(([uid, d]) => ({ uid, ort: (d.toplam / d.adet).toFixed(1), adet: d.adet }))
      .sort((a, b) => b.ort - a.ort || b.adet - a.adet)
      .slice(0, 5)
      .map(item => {
        const usta = kullanicilar.find(k => k.uid === item.uid);
        return { ...item, ad: usta?.ad || usta?.isim || item.uid.slice(0, 8) };
      });

    return { bes, dort, uc, dusuk, yorumlu, yorumsuz, enYuksekPuanliUstalar };
  }, [puanlamalar, kullanicilar]);

  // ── useMemo: Abonelik & Gelir ───────────────────────────
  const abonelikGelir = useMemo(() => {
    const simdi = Date.now();
    const vipAbone     = kullanicilar.filter(k => k.abonelik === 'vip'     && (!k.abonelikBitis || k.abonelikBitis > simdi));
    const premiumAbone = kullanicilar.filter(k => k.abonelik === 'premium' && (!k.abonelikBitis || k.abonelikBitis > simdi));
    const toplamAktif  = [...vipAbone, ...premiumAbone];
    const bitmekUzere  = kullanicilar.filter(k =>
      k.abonelikBitis && k.abonelikBitis > simdi && (k.abonelikBitis - simdi) < 3 * 86400000
    );

    // Kupon analizi
    const toplamKupon  = kuponlar.length;
    const kuponKodMap  = {};
    kuponlar.forEach(k => {
      const kod = k.kuponKodu || k.kod || 'Bilinmeyen';
      kuponKodMap[kod] = (kuponKodMap[kod] || 0) + 1;
    });
    const kuponDetay = Object.entries(kuponKodMap)
      .sort((a, b) => b[1] - a[1])
      .map(([kod, adet]) => ({ kod, adet }));

    return { vipAbone, premiumAbone, toplamAktif, bitmekUzere, toplamKupon, kuponDetay };
  }, [kullanicilar, kuponlar]);

  // ── useMemo: İlçe istatistikleri ────────────────────────
  const ilceIstatistik = useMemo(() =>
    ILCELER.map(ilce => {
      const ilceKul    = kullanicilar.filter(k => k.bolge === ilce);
      const ilceUstalar = ilceKul.filter(k => k.rol === 'usta');
      const onayliIlce = ilceUstalar.filter(k => k.onayDurumu === 'onayli').length;
      const ilceIlan   = ilanlar.filter(i => i.bolge === ilce);
      const ilceTek    = teklifler.filter(t => t.bolge === ilce).length;

      // En aktif kategori
      const katMap = {};
      ilceIlan.forEach(i => { if (i.kategori) katMap[i.kategori] = (katMap[i.kategori] || 0) + 1; });
      const enAktifKat = Object.entries(katMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

      return {
        ilce,
        usta:     ilceUstalar.length,
        onayliUsta: onayliIlce,
        musteri:  ilceKul.filter(k => k.rol === 'musteri').length,
        ilan:     ilceIlan.length,
        teklif:   ilceTek,
        anlasma:  ilceIlan.filter(i => i.anlasmaVar).length,
        enAktifKat,
      };
    }).filter(x => x.ilan > 0 || x.usta > 0).sort((a, b) => b.ilan - a.ilan),
  [kullanicilar, ilanlar, teklifler]);

  // ── useMemo: Kategori istatistikleri ────────────────────
  const kategoriIstatistik = useMemo(() =>
    KATEGORILER.map(kat => {
      const katIlan  = ilanlar.filter(i => i.kategori === kat);
      const katUsta  = kullanicilar.filter(k => k.rol === 'usta' && (k.anaBrans === kat || k.yanBranslar?.includes(kat)));
      const katOnayliUsta = katUsta.filter(k => k.onayDurumu === 'onayli').length;
      const katTeklif = teklifler.filter(t => t.kategori === kat).length;

      // En güçlü ilçe (en çok ilan)
      const ilceMap = {};
      katIlan.forEach(i => { if (i.bolge) ilceMap[i.bolge] = (ilceMap[i.bolge] || 0) + 1; });
      const ilceSorted = Object.entries(ilceMap).sort((a, b) => b[1] - a[1]);
      const enGucluIlce = ilceSorted[0]?.[0] || '—';
      const enZayifIlce = ilceSorted[ilceSorted.length - 1]?.[0] || '—';

      return {
        kat,
        usta:       katUsta.length,
        onayliUsta: katOnayliUsta,
        ilan:       katIlan.length,
        teklif:     katTeklif,
        anlasma:    katIlan.filter(i => i.anlasmaVar).length,
        teksiz:     katIlan.filter(i => i.teklifSayisi === 0).length,
        enGucluIlce,
        enZayifIlce,
      };
    }).filter(x => x.ilan > 0 || x.usta > 0).sort((a, b) => b.ilan - a.ilan),
  [ilanlar, teklifler, kullanicilar]);

  // ── useMemo: Aylık karşılaştırma ────────────────────────
  // Geçmiş aylar: Firebase'deki aylikRaporlar'dan okunur (kota tasarrufu)
  // Güncel ay: canlı veriden hesaplanır
  const aylikVeri = useMemo(() => {
    const aylar   = sonAylariHesapla(6);
    const simdi   = new Date();
    const guncelAyKey = ayAnahtari(simdi.getFullYear(), simdi.getMonth());

    return aylar.map(ay => {
      const key = ayAnahtari(ay.yil, ay.ay);

      // Güncel ay veya raporda yoksa canlı veriden hesapla
      if (key === guncelAyKey || !aylikRaporlar[key]) {
        const filtreleAy = (liste, tarihAlani = 'tarih') =>
          liste.filter(item => {
            const t = Number(item[tarihAlani] || item.kayitTarihi || 0);
            return t >= ay.baslangic && t <= ay.bitis;
          });
        const ayKul    = filtreleAy(kullanicilar, 'kayitTarihi');
        const ayIlan   = filtreleAy(ilanlar);
        const ayTeklif = filtreleAy(teklifler);
        const ayAnl    = ayIlan.filter(i => i.anlasmaVar);
        const ayPuan   = filtreleAy(puanlamalar);
        const ayAktifAbone = kullanicilar.filter(k =>
          k.abonelik &&
          (!k.abonelikBitis || Number(k.abonelikBitis) >= ay.baslangic) &&
          (!k.abonelikBaslangic || Number(k.abonelikBaslangic) <= ay.bitis)
        );
        const ayMusteri = ayKul.filter(k => k.rol === 'musteri').length;
        return {
          ...ay,
          kayit:   ayKul.length,
          usta:    ayKul.filter(k => k.rol === 'usta').length,
          musteri: ayMusteri,
          ilan:    ayIlan.length,
          teklif:  ayTeklif.length,
          anlasma: ayAnl.length,
          puan:    ayPuan.length,
          abone:   ayAktifAbone.length,
          donusum: yuzde(ayAnl.length, ayTeklif.length),
          musteriIlanOrani: yuzde(ayIlan.length, ayMusteri),
          kaynakCanlı: true,
        };
      }

      // Geçmiş ay: Firebase'den okunan raporu kullan
      const r = aylikRaporlar[key];
      return {
        ...ay,
        kayit:    r.kayit   || 0,
        usta:     r.usta    || 0,
        musteri:  r.musteri || 0,
        ilan:     r.ilan    || 0,
        teklif:   r.teklif  || 0,
        anlasma:  r.anlasma || 0,
        puan:     r.puan    || 0,
        abone:    r.abone   || 0,
        donusum:  r.donusum || 0,
        musteriIlanOrani: yuzde(r.ilan || 0, r.musteri || 0),
        kaynakCanlı: false,
      };
    });
  }, [kullanicilar, ilanlar, teklifler, puanlamalar, aylikRaporlar]);

  // ── useMemo: Uyarılar ────────────────────────────────────
  const uyarilar = useMemo(() => {
    const liste = [];
    if (teklifAlmayanIlanlar.length > 0)
      liste.push({ tip: '🔴', mesaj: `${teklifAlmayanIlanlar.length} ilan teklif alamadı`, detay: 'Usta eksik olabilir' });
    const acilTeklif0 = ilanlar.filter(i => i.acil && i.teklifSayisi === 0 && (Date.now() - (i.tarih || 0)) > 7200000);
    if (acilTeklif0.length > 0)
      liste.push({ tip: '🔴', mesaj: `${acilTeklif0.length} acil ilan 2 saattir teklif alamadı`, detay: 'Acil müdahale gerekebilir' });
    if (onayBasvurulari.length > 0)
      liste.push({ tip: '🟠', mesaj: `${onayBasvurulari.length} usta onay bekliyor`, detay: 'Belge incelemesi gerekli' });
    const dusukPuan = puanlamalar.filter(p => (p.puan || 5) <= 3);
    if (dusukPuan.length > 0)
      liste.push({ tip: '🟠', mesaj: `${dusukPuan.length} düşük puanlı değerlendirme var`, detay: '3 yıldız ve altı' });
    const abonelikBitmekUzere = kullanicilar.filter(k =>
      k.abonelikBitis && k.abonelikBitis > Date.now() && (k.abonelikBitis - Date.now()) < 3 * 86400000
    );
    if (abonelikBitmekUzere.length > 0)
      liste.push({ tip: '🟡', mesaj: `${abonelikBitmekUzere.length} abonelik 3 gün içinde bitiyor`, detay: 'Yenileme hatırlatması yapılabilir' });
    // Kupon limiti uyarısı (100 kullanım eşiği örnek)
    const kuponKodMap = {};
    kuponlar.forEach(k => {
      const kod = k.kuponKodu || k.kod || '';
      if (kod) kuponKodMap[kod] = (kuponKodMap[kod] || 0) + 1;
    });
    Object.entries(kuponKodMap).forEach(([kod, adet]) => {
      if (adet >= 90)
        liste.push({ tip: '🟡', mesaj: `${kod} kodu ${adet} kullanıma ulaştı`, detay: 'Limit yaklaşıyor olabilir' });
    });
    return liste;
  }, [teklifAlmayanIlanlar, onayBasvurulari, puanlamalar, ilanlar, kullanicilar, kuponlar]);

  // ── CSV Export ───────────────────────────────────────────
  const csvExport = useCallback(() => {
    try {
      const satirlar = [
        'Metrik,Değer',
        `Toplam Usta,${toplamUsta}`,
        `Toplam Müşteri,${toplamMusteri}`,
        `Onaylı Usta,${onayliUsta}`,
        `Yeni Kayıt (${FILTRELER.find(f=>f.key===aktifFiltre)?.label}),${yeniKullanicilar.length}`,
        `Yeni İlan,${yeniIlanlar.length}`,
        `Yeni Teklif,${yeniTeklifler.length}`,
        `Anlaşma,${anlasmalar.length}`,
        `Teklif Almayan İlan,${teklifAlmayanIlanlar.length}`,
        `Aktif Abonelik,${aktifAbone.length}`,
        `Ort. Puan,${puanOrtalama}`,
        '',
        'Aylık Karşılaştırma',
        'Ay,Kayıt,İlan,Teklif,Anlaşma,Puan',
        ...aylikVeri.map(a => `${a.labelTam},${a.kayit},${a.ilan},${a.teklif},${a.anlasma},${a.puan}`),
      ];
      Share.share({ message: satirlar.join('\n'), title: 'GAYİT İstatistik Raporu' });
    } catch (e) {
      Alert.alert('Hata', 'CSV oluşturulamadı.');
    }
  }, [toplamUsta, toplamMusteri, onayliUsta, yeniKullanicilar, yeniIlanlar, yeniTeklifler, anlasmalar, teklifAlmayanIlanlar, aktifAbone, puanOrtalama, aylikVeri, aktifFiltre]);

  // ── Sekmeler ─────────────────────────────────────────────
  const SEKMELER = useMemo(() => [
    { key: 'ozet',     label: '📊 Özet' },
    { key: 'bugun',    label: '☀️ Bugün' },
    { key: 'kullanici',label: '👤 Kullanıcı' },
    { key: 'ilan',     label: '📋 İlan' },
    { key: 'teklif',   label: '💬 Teklif' },
    { key: 'puanlama', label: '⭐ Puan' },
    { key: 'abonelik', label: '💎 Abonelik' },
    { key: 'aylik',    label: '📅 Aylık' },
    { key: 'huni',     label: '🔀 Huni' },
    { key: 'ilce',     label: '📍 İlçe' },
    { key: 'kategori', label: '🔧 Kategori' },
    { key: 'uyari',    label: `⚠️ Uyarı${uyarilar.length > 0 ? ` (${uyarilar.length})` : ''}` },
    { key: 'kpi',      label: '🎯 KPI' },
  ], [uyarilar.length]);

  // ── Yardımcı bileşenler ──────────────────────────────────
  const StatKart = ({ label, deger, renk, alt }) => (
    <View style={{ backgroundColor: renk || '#1B4965', borderRadius: 14, padding: 14, width: '47%', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: '#FFF', fontSize: 26, fontWeight: 'bold' }}>{kisalt(deger)}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3, textAlign: 'center' }}>{label}</Text>
      {alt ? <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 }}>{alt}</Text> : null}
    </View>
  );

  const OranCubugu = ({ label, pay, payda, renk }) => {
    const oran = yuzde(pay, payda);
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#526E7F', fontSize: 12 }}>{label}</Text>
          <Text style={{ color: '#1B4965', fontSize: 12, fontWeight: 'bold' }}>%{oran} ({pay}/{payda})</Text>
        </View>
        <View style={{ backgroundColor: '#E8ECF0', borderRadius: 6, height: 10 }}>
          <View style={{ backgroundColor: renk || '#1B4965', borderRadius: 6, height: 10, width: `${Math.min(oran, 100)}%` }} />
        </View>
      </View>
    );
  };

  const BarSatir = ({ label, deger, maksimum, renk }) => {
    const genislik = maksimum > 0 ? Math.max((deger / maksimum) * 100, 2) : 2;
    return (
      <View style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ color: '#526E7F', fontSize: 12, flex: 1 }} numberOfLines={1}>{label}</Text>
          <Text style={{ color: '#1B4965', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>{deger}</Text>
        </View>
        <View style={{ backgroundColor: '#E8ECF0', borderRadius: 5, height: 8 }}>
          <View style={{ backgroundColor: renk || '#1B4965', borderRadius: 5, height: 8, width: `${genislik}%` }} />
        </View>
      </View>
    );
  };

  const HuniAdim = ({ label, sayi, onceki, renk, son }) => {
    const oran = onceki > 0 ? yuzde(sayi, onceki) : 100;
    const genislikFaktor = onceki > 0 ? Math.max(sayi / onceki, 0.2) : 1;
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ backgroundColor: renk, borderRadius: 10, paddingVertical: 12, width: `${Math.min(100, Math.max(40, genislikFaktor * 100))}%`, alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 20 }}>{kisalt(sayi)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{label}</Text>
        </View>
        {!son && (
          <View style={{ alignItems: 'center', marginVertical: 4 }}>
            <Text style={{ color: '#A3B1B9', fontSize: 16 }}>▼</Text>
            <Text style={{ color: '#526E7F', fontSize: 11 }}>%{oran} dönüşüm</Text>
          </View>
        )}
      </View>
    );
  };

  const BolumBaslik = ({ baslik, alt }) => (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16 }}>{baslik}</Text>
      {alt ? <Text style={{ color: '#A3B1B9', fontSize: 12, marginTop: 2 }}>{alt}</Text> : null}
    </View>
  );

  // ── Loading ───────────────────────────────────────────────
  if (yukleniyor) {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('admin')}>
            <Text style={s.menuSimge}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerBaslik}>📊 İstatistikler</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1B4965" />
          <Text style={{ color: '#A3B1B9', marginTop: 12 }}>Veriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── RENDER ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.con}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('admin')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>📊 İstatistikler</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={csvExport}>
            <Text style={{ color: '#588157', fontSize: 18 }}>⬇️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => veriYukle(false)}>
            <Text style={{ color: '#1B4965', fontSize: 18 }}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tarih Filtresi */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: '#F5F5F0', maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#E8ECF0' }}
        contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'center' }}>
        {FILTRELER.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setAktifFiltre(f.key)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: aktifFiltre === f.key ? '#1B4965' : '#E8ECF0' }}>
            <Text style={{ color: aktifFiltre === f.key ? '#FFF' : '#526E7F', fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sekme Navigasyonu */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: '#1B4965', maxHeight: 44 }}>
        {SEKMELER.map(sekme => (
          <TouchableOpacity key={sekme.key} onPress={() => setAktifSekme(sekme.key)}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: aktifSekme === sekme.key ? 3 : 0, borderBottomColor: '#F39C12' }}>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: aktifSekme === sekme.key ? 'bold' : 'normal' }}>{sekme.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* İçerik */}
      <ScrollView style={s.scroll}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => veriYukle(false)} tintColor="#1B4965" />}>

        {/* ══════════════ ÖZET ══════════════ */}
        {aktifSekme === 'ozet' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="Genel Durum"
              alt={`${FILTRELER.find(f=>f.key===aktifFiltre)?.label} — ${new Date(aralik.baslangic).toLocaleDateString('tr-TR')} - ${new Date(aralik.bitis).toLocaleDateString('tr-TR')}`} />

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>KULLANICILAR</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
              <StatKart label="Yeni Kayıt"     deger={yeniKullanicilar.length} renk="#1B4965" />
              <StatKart label="Yeni Usta"      deger={yeniUstalar.length}      renk="#588157" />
              <StatKart label="Yeni Müşteri"   deger={yeniMusteriler.length}   renk="#8B7355" />
              <StatKart label="Toplam Usta"    deger={toplamUsta}              renk="#526E7F" alt={`${onayliUsta} onaylı`} />
              <StatKart label="Toplam Müşteri" deger={toplamMusteri}           renk="#526E7F" />
              <StatKart label="Onay Bekleyen"  deger={onayBasvurulari.length}  renk="#F39C12" />
            </View>

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>İLANLAR</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
              <StatKart label="Yeni İlan"         deger={yeniIlanlar.length}          renk="#2E86AB" />
              <StatKart label="Acil İlan"         deger={acilIlanlar.length}          renk="#E74C3C" />
              <StatKart label="Teklif Almayan"    deger={teklifAlmayanIlanlar.length} renk="#C0392B" alt={`%${yuzde(teklifAlmayanIlanlar.length, yeniIlanlar.length)} oran`} />
              <StatKart label="Anlaşma"           deger={anlasmalar.length}           renk="#27AE60" />
            </View>

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>TEKLİF & PUAN</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
              <StatKart label="Yeni Teklif"    deger={yeniTeklifler.length}   renk="#9B59B6" />
              <StatKart label="Puanlama"       deger={yeniPuanlamalar.length} renk="#3498DB" alt={`Ort: ${puanOrtalama}⭐`} />
              <StatKart label="Aktif Abonelik" deger={aktifAbone.length}      renk="#F39C12" />
            </View>

            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, marginBottom: 10, elevation: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>📈 Dönüşüm Oranları</Text>
              <OranCubugu label="Müşteri kayıt → ilan"           pay={yeniIlanlar.length} payda={yeniMusteriler.length} renk="#2E86AB" />
              <OranCubugu label="İlan → teklif alma"             pay={yeniIlanlar.length - teklifAlmayanIlanlar.length} payda={yeniIlanlar.length} renk="#9B59B6" />
              <OranCubugu label="Teklif → anlaşma"               pay={anlasmalar.length} payda={yeniTeklifler.length} renk="#27AE60" />
              <OranCubugu label="Anlaşma → puanlama"             pay={yeniPuanlamalar.length} payda={anlasmalar.length} renk="#F39C12" />
              <OranCubugu label="Usta kayıt → onay"              pay={onayliUsta} payda={toplamUsta} renk="#588157" />
            </View>

            <View style={{ backgroundColor: '#E8F5E9', borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#588157' }}>
              <Text style={{ color: '#588157', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>📊 Temel Metrikler</Text>
              <Text style={{ color: '#1B4965', fontSize: 13, marginBottom: 4 }}>
                İlan başına ort. teklif:{' '}
                <Text style={{ fontWeight: 'bold' }}>{yeniIlanlar.length > 0 ? (yeniTeklifler.length / yeniIlanlar.length).toFixed(1) : '—'}</Text>
              </Text>
              <Text style={{ color: '#1B4965', fontSize: 13, marginBottom: 4 }}>
                Teklif → anlaşma oranı:{' '}
                <Text style={{ fontWeight: 'bold' }}>%{yuzde(anlasmalar.length, yeniTeklifler.length)}</Text>
              </Text>
              <Text style={{ color: '#1B4965', fontSize: 13 }}>
                Ortalama usta puanı:{' '}
                <Text style={{ fontWeight: 'bold' }}>{puanOrtalama} ⭐</Text>
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════ BUGÜN ══════════════ */}
        {aktifSekme === 'bugun' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="☀️ Bugün Ne Oldu?"
              alt={new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />

            <View style={{ backgroundColor: '#1B4965', borderRadius: 16, padding: 18, marginBottom: 15 }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>📋 Günlük Nabız</Text>
              {[
                { emoji: '👤', label: 'Yeni kayıt',    deger: bugun.kul.length,    alt: `${bugun.kul.filter(k=>k.rol==='usta').length} usta, ${bugun.kul.filter(k=>k.rol==='musteri').length} müşteri` },
                { emoji: '📋', label: 'Yeni ilan',     deger: bugun.ilan.length,   alt: `${bugun.ilan.filter(i=>i.acil).length} acil` },
                { emoji: '💬', label: 'Yeni teklif',   deger: bugun.teklif.length, alt: '' },
                { emoji: '🤝', label: 'Yeni anlaşma',  deger: bugun.anlasma.length,alt: '' },
                { emoji: '⭐', label: 'Yeni puanlama', deger: bugun.puan.length,   alt: '' },
                { emoji: '💎', label: 'Yeni abonelik', deger: bugun.abone.length,  alt: '' },
                { emoji: '🎟️', label: 'Kupon kullanımı',deger: bugun.kupon.length, alt: '' },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{item.emoji} {item.label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>{item.deger}</Text>
                    {item.alt ? <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{item.alt}</Text> : null}
                  </View>
                </View>
              ))}
            </View>

            {bugun.ilan.length > 0 && (
              <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1 }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 10 }}>📋 Bugün Açılan İlanlar</Text>
                {bugun.ilan.slice(0, 5).map((ilan, i) => (
                  <View key={ilan.id} style={{ paddingVertical: 8, borderBottomWidth: i < Math.min(bugun.ilan.length, 5) - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#1B4965', fontWeight: '600', fontSize: 13, flex: 1 }} numberOfLines={1}>{ilan.kategori}</Text>
                      {ilan.acil && <Text style={{ color: '#E74C3C', fontSize: 11, fontWeight: 'bold' }}>ACİL</Text>}
                    </View>
                    <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{ilan.bolge} • {ilan.teklifSayisi} teklif</Text>
                  </View>
                ))}
                {bugun.ilan.length > 5 && (
                  <Text style={{ color: '#A3B1B9', fontSize: 12, marginTop: 8, textAlign: 'center' }}>+{bugun.ilan.length - 5} ilan daha</Text>
                )}
              </View>
            )}

            {bugun.kul.length === 0 && bugun.ilan.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🌙</Text>
                <Text style={{ color: '#A3B1B9', fontSize: 15 }}>Bugün henüz hareket yok</Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════ KULLANICI İSTATİSTİKLERİ ══════════════ */}
        {aktifSekme === 'kullanici' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="👤 Kullanıcı İstatistikleri" alt="Usta ve müşteri analizi" />

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>USTA TARAFLARI</Text>
            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              {[
                { label: 'Toplam Usta',                deger: kullaniciIstatistik.tumUstaSayisi,   renk: '#1B4965' },
                { label: 'Profil Tamamlayan Usta',     deger: kullaniciIstatistik.profilTamamlayanUsta, renk: '#588157' },
                { label: 'Branş Seçen Usta',           deger: kullaniciIstatistik.bransSec,        renk: '#8B7355' },
                { label: '1 Ana + 2 Yan Branş Tam.',   deger: kullaniciIstatistik.tamBrans,        renk: '#9B59B6' },
                { label: 'Belge Yükleyen Usta',        deger: kullaniciIstatistik.belgeYukleyen,   renk: '#2E86AB' },
                { label: 'Onaya Başvuran Usta',        deger: kullaniciIstatistik.onayaGonden,     renk: '#F39C12' },
                { label: 'Onaylanan Usta',             deger: kullaniciIstatistik.onaylanan,       renk: '#27AE60' },
                { label: 'Reddedilen Usta',            deger: kullaniciIstatistik.reddedilen,      renk: '#E74C3C' },
                { label: 'Bekleyen Başvuru',           deger: kullaniciIstatistik.bekleyen,        renk: '#F39C12' },
              ].map((item, i, arr) => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                  <Text style={{ color: '#526E7F', fontSize: 13 }}>{item.label}</Text>
                  <View style={{ backgroundColor: item.renk, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{item.deger}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>USTA DÖNÜŞÜM ORANLARI</Text>
            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              <OranCubugu label="Kayıt → Profil tamamlama"      pay={kullaniciIstatistik.profilTamamlayanUsta} payda={kullaniciIstatistik.tumUstaSayisi} renk="#588157" />
              <OranCubugu label="Profil → Belge yükleme"        pay={kullaniciIstatistik.belgeYukleyen}        payda={kullaniciIstatistik.profilTamamlayanUsta} renk="#2E86AB" />
              <OranCubugu label="Belge yükleme → Onay başvurusu" pay={kullaniciIstatistik.onayaGonden}        payda={kullaniciIstatistik.belgeYukleyen}  renk="#F39C12" />
              <OranCubugu label="Onay başvurusu → Onaylanan"    pay={kullaniciIstatistik.onaylanan}            payda={kullaniciIstatistik.onayaGonden}    renk="#27AE60" />
              <OranCubugu label="Kayıt → Tam branş seçimi"      pay={kullaniciIstatistik.tamBrans}             payda={kullaniciIstatistik.tumUstaSayisi}  renk="#9B59B6" />
            </View>

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>MÜŞTERİ TARAFI</Text>
            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              {[
                { label: 'Toplam Müşteri',            deger: kullaniciIstatistik.tumMusteriSayisi, renk: '#8B7355' },
                { label: 'İlan Açan Müşteri',         deger: kullaniciIstatistik.ilanAcanMusteri,  renk: '#2E86AB' },
              ].map((item, i, arr) => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                  <Text style={{ color: '#526E7F', fontSize: 13 }}>{item.label}</Text>
                  <View style={{ backgroundColor: item.renk, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{item.deger}</Text>
                  </View>
                </View>
              ))}
              <View style={{ marginTop: 12 }}>
                <OranCubugu label="Müşteri kayıt → ilan açma" pay={kullaniciIstatistik.ilanAcanMusteri} payda={kullaniciIstatistik.tumMusteriSayisi} renk="#8B7355" />
              </View>
            </View>
          </View>
        )}

        {/* ══════════════ İLAN İSTATİSTİKLERİ ══════════════ */}
        {aktifSekme === 'ilan' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="📋 İlan İstatistikleri" alt="Tüm zamanlar — ilan detay analizi" />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
              <StatKart label="Toplam İlan"        deger={ilanlar.length}                      renk="#1B4965" />
              <StatKart label="Aktif İlan"         deger={ilanIstatistik.aktifIlan.length}     renk="#27AE60" />
              <StatKart label="Acil İlan"          deger={acilIlanlar.length}                  renk="#E74C3C" />
              <StatKart label="Tamamlanan"         deger={ilanIstatistik.tamamlananIlan.length}renk="#588157" />
              <StatKart label="Pasif İlan"         deger={ilanIstatistik.pasifIlan.length}     renk="#A3B1B9" />
              <StatKart label="İptal Edilen"       deger={ilanIstatistik.iptalIlan.length}     renk="#95A5A6" />
              <StatKart label="Puanlanmış"         deger={ilanIstatistik.puanlanmisIlan.length}renk="#F39C12" />
            </View>

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>AÇILIŞ YÖNTEMİ</Text>
            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              {[
                { label: 'Ücretli İlan',              deger: ilanIstatistik.ucretliIlan.length,  renk: '#27AE60' },
                { label: 'Kupon Kullanılan İlan',      deger: ilanIstatistik.kuponluIlan.length,  renk: '#9B59B6' },
                { label: 'Abonelik Hakkıyla Açılan',  deger: ilanIstatistik.abonelikIlan.length, renk: '#F39C12' },
              ].map((item, i, arr) => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                  <Text style={{ color: '#526E7F', fontSize: 13 }}>{item.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 12 }}>%{yuzde(item.deger, ilanlar.length)}</Text>
                    <View style={{ backgroundColor: item.renk, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{item.deger}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>KRİTİK METRİK</Text>
            <View style={{ backgroundColor: '#FFF3CD', borderRadius: 14, padding: 15, elevation: 1, borderWidth: 1, borderColor: '#F39C12' }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 10 }}>Teklif Alma Durumu</Text>
              <OranCubugu label="Teklif Alan İlan"    pay={yeniIlanlar.length - teklifAlmayanIlanlar.length} payda={yeniIlanlar.length} renk="#27AE60" />
              <OranCubugu label="Teklif Almayan İlan" pay={teklifAlmayanIlanlar.length} payda={yeniIlanlar.length} renk="#E74C3C" />
              <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 5 }}>
                Teklif almayan {teklifAlmayanIlanlar.length} ilan — müşteri memnuniyeti riski!
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════ TEKLİF İSTATİSTİKLERİ ══════════════ */}
        {aktifSekme === 'teklif' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="💬 Teklif İstatistikleri" alt="Usta aktivitesi analizi" />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
              <StatKart label="Toplam Teklif"    deger={yeniTeklifler.length}                    renk="#9B59B6" />
              <StatKart label="Kabul Edilen"     deger={teklifIstatistik.kabul.length}            renk="#27AE60" />
              <StatKart label="Reddedilen"       deger={teklifIstatistik.reddedilen.length}       renk="#E74C3C" />
              <StatKart label="Bekleyen"         deger={teklifIstatistik.bekleyen.length}          renk="#F39C12" />
              <StatKart label="Aktif Usta"       deger={teklifIstatistik.teklifVerenUstaIdler.length} renk="#2E86AB" alt={`%${yuzde(teklifIstatistik.teklifVerenUstaIdler.length, toplamUsta)}'i aktif`} />
              <StatKart label="Teklif Vermeyen"  deger={teklifIstatistik.teklifVermeyenUsta.length}  renk="#95A5A6" />
            </View>

            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>📊 Teklif Oranları</Text>
              <OranCubugu label="Kabul edilen teklif"   pay={teklifIstatistik.kabul.length}     payda={yeniTeklifler.length}  renk="#27AE60" />
              <OranCubugu label="Reddedilen teklif"     pay={teklifIstatistik.reddedilen.length} payda={yeniTeklifler.length}  renk="#E74C3C" />
              <OranCubugu label="Bekleyen teklif"       pay={teklifIstatistik.bekleyen.length}   payda={yeniTeklifler.length}  renk="#F39C12" />
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E8ECF0' }}>
                <Text style={{ color: '#1B4965', fontSize: 13 }}>
                  İlan başına ort. teklif:{' '}
                  <Text style={{ fontWeight: 'bold' }}>{teklifIstatistik.ilanBasinaOrt}</Text>
                </Text>
              </View>
            </View>

            {teklifIstatistik.enCokTeklifVeren.length > 0 && (
              <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>🏆 En Çok Teklif Veren Ustalar</Text>
                {teklifIstatistik.enCokTeklifVeren.map((item, i) => (
                  <View key={item.uid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < teklifIstatistik.enCokTeklifVeren.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: i === 0 ? '#F39C12' : '#E8ECF0', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: i === 0 ? '#FFF' : '#526E7F', fontSize: 12, fontWeight: 'bold' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ color: '#1B4965', fontSize: 13 }}>{item.ad}</Text>
                    </View>
                    <Text style={{ color: '#9B59B6', fontWeight: 'bold', fontSize: 14 }}>{item.adet} teklif</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ══════════════ PUANLAMA DETAYI ══════════════ */}
        {aktifSekme === 'puanlama' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="⭐ Puanlama & Güven" alt="Değerlendirme analizi" />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
              <StatKart label="Toplam Puanlama"  deger={puanlamalar.length}              renk="#F39C12" />
              <StatKart label="Ortalama Puan"    deger={puanOrtalama}                    renk="#E67E22" />
              <StatKart label="Yorumlu"          deger={puanlamaDetay.yorumlu.length}    renk="#2E86AB" />
              <StatKart label="Yorumsuz"         deger={puanlamaDetay.yorumsuz.length}   renk="#95A5A6" />
            </View>

            <Text style={{ color: '#A3B1B9', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>YILDIZ DAĞILIMI</Text>
            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              {[
                { yildiz: '⭐⭐⭐⭐⭐', adet: puanlamaDetay.bes.length,  renk: '#27AE60' },
                { yildiz: '⭐⭐⭐⭐',   adet: puanlamaDetay.dort.length, renk: '#2E86AB' },
                { yildiz: '⭐⭐⭐',     adet: puanlamaDetay.uc.length,   renk: '#F39C12' },
                { yildiz: '⭐⭐ ve altı', adet: puanlamaDetay.dusuk.length, renk: '#E74C3C' },
              ].map((item, i) => (
                <View key={i} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#526E7F', fontSize: 13 }}>{item.yildiz}</Text>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>
                      {item.adet} (%{yuzde(item.adet, puanlamalar.length)})
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#E8ECF0', borderRadius: 5, height: 10 }}>
                    <View style={{ backgroundColor: item.renk, borderRadius: 5, height: 10, width: `${Math.min(yuzde(item.adet, puanlamalar.length), 100)}%` }} />
                  </View>
                </View>
              ))}
            </View>

            {puanlamaDetay.enYuksekPuanliUstalar.length > 0 && (
              <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1 }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>🏆 En Yüksek Puanlı Ustalar</Text>
                {puanlamaDetay.enYuksekPuanliUstalar.map((item, i) => (
                  <View key={item.uid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < puanlamaDetay.enYuksekPuanliUstalar.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: i === 0 ? '#F39C12' : '#E8ECF0', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: i === 0 ? '#FFF' : '#526E7F', fontSize: 12, fontWeight: 'bold' }}>{i + 1}</Text>
                      </View>
                      <View>
                        <Text style={{ color: '#1B4965', fontSize: 13 }}>{item.ad}</Text>
                        <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{item.adet} değerlendirme</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 16 }}>{item.ort} ⭐</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ══════════════ ABONELİK & GELİR ══════════════ */}
        {aktifSekme === 'abonelik' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="💎 Abonelik & Gelir" alt="Paket ve kupon analizi" />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
              <StatKart label="Toplam Aktif Abone" deger={abonelikGelir.toplamAktif.length}  renk="#F39C12" />
              <StatKart label="VIP Abone"          deger={abonelikGelir.vipAbone.length}     renk="#E74C3C" />
              <StatKart label="Premium Abone"      deger={abonelikGelir.premiumAbone.length} renk="#9B59B6" />
              <StatKart label="Bitiyor (3 Gün)"   deger={abonelikGelir.bitmekUzere.length}  renk="#F39C12" />
              <StatKart label="Toplam Kupon"       deger={abonelikGelir.toplamKupon}         renk="#2E86AB" />
            </View>

            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>📊 Paket Dağılımı</Text>
              <OranCubugu label="VIP"     pay={abonelikGelir.vipAbone.length}     payda={abonelikGelir.toplamAktif.length} renk="#E74C3C" />
              <OranCubugu label="Premium" pay={abonelikGelir.premiumAbone.length} payda={abonelikGelir.toplamAktif.length} renk="#9B59B6" />
            </View>

            {abonelikGelir.kuponDetay.length > 0 && (
              <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>🎟️ Kupon Kullanımları</Text>
                {abonelikGelir.kuponDetay.map((item, i) => (
                  <View key={item.kod} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < abonelikGelir.kuponDetay.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                    <Text style={{ color: '#1B4965', fontSize: 13, fontWeight: '600' }}>{item.kod}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {item.adet >= 90 && <Text style={{ color: '#E74C3C', fontSize: 11 }}>⚠️ Limit yakın</Text>}
                      <View style={{ backgroundColor: '#2E86AB', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>{item.adet} kullanım</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {abonelikGelir.bitmekUzere.length > 0 && (
              <View style={{ backgroundColor: '#FFF3CD', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: '#F39C12' }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 8 }}>⏰ 3 Günde Biten Abonelikler</Text>
                {abonelikGelir.bitmekUzere.slice(0, 5).map((k, i) => (
                  <View key={k.uid} style={{ paddingVertical: 6, borderBottomWidth: i < Math.min(abonelikGelir.bitmekUzere.length, 5) - 1 ? 1 : 0, borderBottomColor: '#F0E0A0' }}>
                    <Text style={{ color: '#526E7F', fontSize: 13 }}>
                      {k.ad || k.isim || k.uid?.slice(0, 8)} — {k.abonelik?.toUpperCase()}
                    </Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                      Bitiş: {k.abonelikBitis ? new Date(k.abonelikBitis).toLocaleDateString('tr-TR') : '—'}
                    </Text>
                  </View>
                ))}
                {abonelikGelir.bitmekUzere.length > 5 && (
                  <Text style={{ color: '#A3B1B9', fontSize: 12, marginTop: 6, textAlign: 'center' }}>+{abonelikGelir.bitmekUzere.length - 5} kişi daha</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ══════════════ AYLIK KARŞILAŞTIRMA ══════════════ */}
        {aktifSekme === 'aylik' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="📅 Aylık Karşılaştırma" alt="Son 6 ay — geçmiş aylar Firebase raporundan, güncel ay canlı veriden" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 15 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {[
                { key: 'kayit',   label: '👤 Kayıt',   renk: '#1B4965' },
                { key: 'ilan',    label: '📋 İlan',    renk: '#2E86AB' },
                { key: 'teklif',  label: '💬 Teklif',  renk: '#9B59B6' },
                { key: 'anlasma', label: '🤝 Anlaşma', renk: '#27AE60' },
                { key: 'puan',    label: '⭐ Puan',    renk: '#F39C12' },
                { key: 'abone',   label: '💎 Abone',   renk: '#E74C3C' },
                { key: 'donusum', label: '% Dönüşüm',  renk: '#8B7355' },
              ].map(m => (
                <TouchableOpacity key={m.key} onPress={() => setAylikMetrik(m.key)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: aylikMetrik === m.key ? m.renk : '#E8ECF0' }}>
                  <Text style={{ color: aylikMetrik === m.key ? '#FFF' : '#526E7F', fontSize: 13, fontWeight: '600' }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {(() => {
              const maksimum = Math.max(...aylikVeri.map(a => a[aylikMetrik] || 0), 1);
              const metrikRenk = { kayit: '#1B4965', ilan: '#2E86AB', teklif: '#9B59B6', anlasma: '#27AE60', puan: '#F39C12', abone: '#E74C3C', donusum: '#8B7355' }[aylikMetrik];
              return (
                <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
                  <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 15 }}>
                    {aylikMetrik === 'donusum' ? 'Teklif → Anlaşma Dönüşüm Oranı (%)' : `Aylık ${aylikMetrik.charAt(0).toUpperCase() + aylikMetrik.slice(1)} Sayısı`}
                  </Text>
                  {aylikVeri.map((ay, i) => {
                    const deger = ay[aylikMetrik] || 0;
                    const oncekiAy = i > 0 ? aylikVeri[i - 1][aylikMetrik] || 0 : null;
                    const oran = buyumeOrani(deger, oncekiAy);
                    const renkDeger = oncekiAy !== null ? buyumeRengi(deger, oncekiAy) : '#A3B1B9';
                    return (
                      <View key={ay.label} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, width: 68 }}>
                            <Text style={{ color: '#526E7F', fontSize: 13, fontWeight: '600' }}>{ay.label}</Text>
                            <Text style={{ fontSize: 8, color: ay.kaynakCanlı ? '#E74C3C' : '#A3B1B9' }}>{ay.kaynakCanlı ? '🔴' : '📦'}</Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: '#E8ECF0', borderRadius: 5, height: 22, marginHorizontal: 8 }}>
                            <View style={{ backgroundColor: metrikRenk, borderRadius: 5, height: 22, width: `${Math.max((deger / maksimum) * 100, deger > 0 ? 3 : 0)}%`, justifyContent: 'center', paddingLeft: 6 }}>
                              {deger > 0 && <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>{aylikMetrik === 'donusum' ? `%${deger}` : deger}</Text>}
                            </View>
                          </View>
                          <Text style={{ color: renkDeger, fontSize: 12, fontWeight: 'bold', width: 45, textAlign: 'right' }}>
                            {oncekiAy !== null ? oran : '—'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5, gap: 12 }}>
                    <Text style={{ color: '#27AE60', fontSize: 11 }}>▲ Artış</Text>
                    <Text style={{ color: '#E74C3C', fontSize: 11 }}>▼ Düşüş</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 11 }}>📦 Rapor  🔴 Canlı</Text>
                  </View>
                </View>
              );
            })()}

            <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 10 }}>📋 Aylık Özet Tablo</Text>
              <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E8ECF0' }}>
                <Text style={{ flex: 2, color: '#A3B1B9', fontSize: 10, fontWeight: '600' }}>AY</Text>
                <Text style={{ flex: 1, color: '#A3B1B9', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>KAYIT</Text>
                <Text style={{ flex: 1, color: '#A3B1B9', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>İLAN</Text>
                <Text style={{ flex: 1, color: '#A3B1B9', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>ANLAŞMA</Text>
                <Text style={{ flex: 1, color: '#A3B1B9', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>PUAN</Text>
              </View>
              {aylikVeri.map((ay, i) => {
                const onceki = i > 0 ? aylikVeri[i - 1] : null;
                return (
                  <View key={ay.label} style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: i < aylikVeri.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0', alignItems: 'center' }}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ color: '#1B4965', fontSize: 12, fontWeight: '600' }}>{ay.label}</Text>
                      {onceki && <Text style={{ color: buyumeRengi(ay.kayit, onceki.kayit), fontSize: 10 }}>{buyumeOrani(ay.kayit, onceki.kayit)}</Text>}
                    </View>
                    <Text style={{ flex: 1, color: '#526E7F', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>{ay.kayit}</Text>
                    <Text style={{ flex: 1, color: '#526E7F', fontSize: 13, textAlign: 'center' }}>{ay.ilan}</Text>
                    <Text style={{ flex: 1, color: ay.anlasma > 0 ? '#27AE60' : '#A3B1B9', fontSize: 13, textAlign: 'center', fontWeight: ay.anlasma > 0 ? 'bold' : 'normal' }}>{ay.anlasma}</Text>
                    <Text style={{ flex: 1, color: '#526E7F', fontSize: 13, textAlign: 'center' }}>{ay.puan}</Text>
                  </View>
                );
              })}
            </View>

            {aylikVeri.length >= 2 && (() => {
              const son    = aylikVeri[aylikVeri.length - 1];
              const onceki = aylikVeri[aylikVeri.length - 2];
              const kayitBuyume = son.kayit - onceki.kayit;
              const ilanBuyume  = son.ilan  - onceki.ilan;
              return (
                <View style={{ backgroundColor: '#E1F2FE', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: '#2E86AB' }}>
                  <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>📈 Bu Ay vs Geçen Ay</Text>
                  <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 4 }}>
                    Kayıt: {kayitBuyume >= 0 ? '▲' : '▼'}{' '}
                    <Text style={{ color: kayitBuyume >= 0 ? '#27AE60' : '#E74C3C', fontWeight: 'bold' }}>
                      {Math.abs(kayitBuyume)} kişi ({buyumeOrani(son.kayit, onceki.kayit)})
                    </Text>
                  </Text>
                  <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 4 }}>
                    İlan: {ilanBuyume >= 0 ? '▲' : '▼'}{' '}
                    <Text style={{ color: ilanBuyume >= 0 ? '#27AE60' : '#E74C3C', fontWeight: 'bold' }}>
                      {Math.abs(ilanBuyume)} ilan ({buyumeOrani(son.ilan, onceki.ilan)})
                    </Text>
                  </Text>
                  {son.kayit === 0 && son.ilan === 0 && (
                    <Text style={{ color: '#F39C12', fontSize: 12, marginTop: 4 }}>ℹ️ Bu ay henüz veri yok — ay başındaysanız normaldir.</Text>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* ══════════════ HUNİ ══════════════ */}
        {aktifSekme === 'huni' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="🔀 Dönüşüm Hunisi" alt="Kayıt'tan puanlamaya zincir" />
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 1, marginBottom: 15 }}>
              <HuniAdim label="Kayıt"     sayi={yeniKullanicilar.length} onceki={0}                     renk="#1B4965" />
              <HuniAdim label="İlan"      sayi={yeniIlanlar.length}      onceki={toplamMusteri}          renk="#2E86AB" />
              <HuniAdim label="Teklif"    sayi={yeniTeklifler.length}    onceki={yeniIlanlar.length}     renk="#9B59B6" />
              <HuniAdim label="Anlaşma"   sayi={anlasmalar.length}       onceki={yeniTeklifler.length}   renk="#27AE60" />
              <HuniAdim label="Tamamlama" sayi={tamamlananlar.length}    onceki={anlasmalar.length}      renk="#F39C12" />
              <HuniAdim label="Puanlama"  sayi={yeniPuanlamalar.length}  onceki={tamamlananlar.length}   renk="#E67E22" son />
            </View>
            {/* Anlaşma Sonrası Etkileşim */}
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 1, marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 14 }}>🤝 Anlaşma Sonrası Etkileşim</Text>
              {anlasmaDetay.toplamAnlasma === 0 ? (
                <Text style={{ color: '#A3B1B9', fontSize: 13, textAlign: 'center' }}>Henüz anlaşma verisi yok.</Text>
              ) : (
                <>
                  {[
                    { emoji: '💬', label: 'Sohbet Açıldı',      deger: anlasmaDetay.sohbetAcilan,  renk: '#2E86AB' },
                    { emoji: '📞', label: 'Telefon Açıldı',     deger: anlasmaDetay.telefonAcilan, renk: '#27AE60' },
                    { emoji: '📍', label: 'Konum Paylaşıldı',   deger: anlasmaDetay.konumPaylasan, renk: '#9B59B6' },
                    { emoji: '❌', label: 'Anlaşma İptal',      deger: anlasmaDetay.iptalEdilen,   renk: '#E74C3C' },
                  ].map((item, i, arr) => (
                    <View key={item.label} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: '#526E7F', fontSize: 13 }}>{item.emoji} {item.label}</Text>
                        <Text style={{ color: '#1B4965', fontSize: 13, fontWeight: 'bold' }}>
                          {item.deger} <Text style={{ color: '#A3B1B9', fontWeight: 'normal', fontSize: 11 }}>(%{yuzde(item.deger, anlasmaDetay.toplamAnlasma)})</Text>
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#E8ECF0', borderRadius: 5, height: 8 }}>
                        <View style={{ backgroundColor: item.renk, borderRadius: 5, height: 8, width: `${Math.min(yuzde(item.deger, anlasmaDetay.toplamAnlasma), 100)}%` }} />
                      </View>
                    </View>
                  ))}
                  <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                    Toplam {anlasmaDetay.toplamAnlasma} anlaşma üzerinden
                  </Text>
                </>
              )}
            </View>

            <View style={{ backgroundColor: '#E1F2FE', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: '#2E86AB' }}>
              <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>🔍 Otomatik Yorum</Text>
              {yeniIlanlar.length === 0 && <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 4 }}>• Müşteriler ilan açmıyor — ilan açma sürecini gözden geçir.</Text>}
              {teklifAlmayanIlanlar.length > yeniIlanlar.length * 0.3 && <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 4 }}>• İlanların %{yuzde(teklifAlmayanIlanlar.length, yeniIlanlar.length)}'i teklif alamıyor — usta eksik olabilir.</Text>}
              {yuzde(anlasmalar.length, yeniTeklifler.length) < 20 && yeniTeklifler.length > 0 && <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 4 }}>• Teklif → anlaşma oranı düşük (%{yuzde(anlasmalar.length, yeniTeklifler.length)}) — fiyat veya güven sorunu olabilir.</Text>}
              {yuzde(yeniPuanlamalar.length, anlasmalar.length) < 40 && anlasmalar.length > 0 && <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 4 }}>• Anlaşmaların çoğu puanlanmıyor — iş sonrası hatırlatma eksik olabilir.</Text>}
              {yeniIlanlar.length > 0 && teklifAlmayanIlanlar.length <= yeniIlanlar.length * 0.1 && anlasmalar.length > 0 && <Text style={{ color: '#27AE60', fontSize: 13, fontWeight: '600' }}>✅ Huni sağlıklı görünüyor!</Text>}
            </View>
          </View>
        )}

        {/* ══════════════ İLÇE ══════════════ */}
        {aktifSekme === 'ilce' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="📍 İlçe Bazlı Performans" alt="Muğla ilçeleri" />
            {ilceIstatistik.length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 30 }}>Henüz veri yok.</Text>
            ) : (
              <>
                <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
                  <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>İlan Dağılımı</Text>
                  {ilceIstatistik.map(item => (
                    <BarSatir key={item.ilce} label={item.ilce} deger={item.ilan}
                      maksimum={Math.max(...ilceIstatistik.map(x => x.ilan))} renk="#2E86AB" />
                  ))}
                </View>
                <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
                  <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 10 }}>Detay Tablo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E8ECF0' }}>
                        {['İLÇE','USTA','ONAYLI','MÜŞTERİ','İLAN','TEKLİF','ANLAŞMA','EN AKTİF KAT.'].map((col, i) => (
                          <Text key={col} style={{ width: i === 0 ? 90 : i === 7 ? 110 : 65, color: '#A3B1B9', fontSize: 10, fontWeight: '600', textAlign: i > 0 ? 'center' : 'left' }}>{col}</Text>
                        ))}
                      </View>
                      {ilceIstatistik.map((item, i) => (
                        <View key={item.ilce} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: i < ilceIstatistik.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0', alignItems: 'center' }}>
                          <Text style={{ width: 90, color: '#1B4965', fontSize: 12, fontWeight: '600' }}>{item.ilce}</Text>
                          <Text style={{ width: 65, color: '#526E7F', fontSize: 12, textAlign: 'center' }}>{item.usta}</Text>
                          <Text style={{ width: 65, color: item.onayliUsta > 0 ? '#27AE60' : '#A3B1B9', fontSize: 12, textAlign: 'center', fontWeight: item.onayliUsta > 0 ? 'bold' : 'normal' }}>{item.onayliUsta}</Text>
                          <Text style={{ width: 65, color: '#526E7F', fontSize: 12, textAlign: 'center' }}>{item.musteri}</Text>
                          <Text style={{ width: 65, color: '#526E7F', fontSize: 12, textAlign: 'center' }}>{item.ilan}</Text>
                          <Text style={{ width: 65, color: '#526E7F', fontSize: 12, textAlign: 'center' }}>{item.teklif}</Text>
                          <Text style={{ width: 65, color: item.anlasma > 0 ? '#27AE60' : '#A3B1B9', fontSize: 12, textAlign: 'center', fontWeight: item.anlasma > 0 ? 'bold' : 'normal' }}>{item.anlasma}</Text>
                          <Text style={{ width: 110, color: '#8B7355', fontSize: 11, textAlign: 'center' }} numberOfLines={1}>{item.enAktifKat}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                {ilceIstatistik.some(x => x.ilan > 5 && x.usta < 3) && (
                  <View style={{ backgroundColor: '#FFF3CD', borderRadius: 14, padding: 15, marginTop: 5, borderWidth: 1, borderColor: '#F39C12' }}>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', marginBottom: 6 }}>🚨 Dikkat Gerektiren İlçeler</Text>
                    {ilceIstatistik.filter(x => x.ilan > 5 && x.usta < 3).map(x => (
                      <Text key={x.ilce} style={{ color: '#526E7F', fontSize: 12, marginBottom: 3 }}>
                        • {x.ilce}: {x.ilan} ilan var ama sadece {x.usta} usta
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ══════════════ KATEGORİ ══════════════ */}
        {aktifSekme === 'kategori' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="🔧 Kategori Bazlı Performans" alt="20 hizmet kategorisi" />
            {kategoriIstatistik.length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 30 }}>Henüz ilan verisi yok.</Text>
            ) : (
              <>
                <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1, marginBottom: 15 }}>
                  <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 12 }}>İlan Dağılımı (Top 10)</Text>
                  {kategoriIstatistik.slice(0, 10).map(item => (
                    <BarSatir key={item.kat} label={item.kat} deger={item.ilan}
                      maksimum={Math.max(...kategoriIstatistik.map(x => x.ilan))} renk="#9B59B6" />
                  ))}
                </View>
                <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, elevation: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14, marginBottom: 10 }}>Detay Tablo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E8ECF0' }}>
                        {['KATEGORİ','USTA','ONAYLI','İLAN','TEKLİF','ANLAŞMA','TEKSİZ','EN GÜÇLÜ İLÇE'].map((col, i) => (
                          <Text key={col} style={{ width: i === 0 ? 100 : i === 7 ? 100 : 60, color: '#A3B1B9', fontSize: 10, fontWeight: '600', textAlign: i > 0 ? 'center' : 'left' }}>{col}</Text>
                        ))}
                      </View>
                      {kategoriIstatistik.map((item, i) => (
                        <View key={item.kat} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: i < kategoriIstatistik.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0', alignItems: 'center' }}>
                          <Text style={{ width: 100, color: '#1B4965', fontSize: 12 }} numberOfLines={1}>{item.kat}</Text>
                          <Text style={{ width: 60, color: '#526E7F', fontSize: 12, textAlign: 'center' }}>{item.usta}</Text>
                          <Text style={{ width: 60, color: item.onayliUsta > 0 ? '#27AE60' : '#A3B1B9', fontSize: 12, textAlign: 'center', fontWeight: item.onayliUsta > 0 ? 'bold' : 'normal' }}>{item.onayliUsta}</Text>
                          <Text style={{ width: 60, color: '#526E7F', fontSize: 12, textAlign: 'center' }}>{item.ilan}</Text>
                          <Text style={{ width: 60, color: '#526E7F', fontSize: 12, textAlign: 'center' }}>{item.teklif}</Text>
                          <Text style={{ width: 60, color: item.anlasma > 0 ? '#27AE60' : '#A3B1B9', fontSize: 12, textAlign: 'center', fontWeight: item.anlasma > 0 ? 'bold' : 'normal' }}>{item.anlasma}</Text>
                          <Text style={{ width: 60, color: item.teksiz > 0 ? '#E74C3C' : '#A3B1B9', fontSize: 12, textAlign: 'center', fontWeight: item.teksiz > 0 ? 'bold' : 'normal' }}>{item.teksiz}</Text>
                          <Text style={{ width: 100, color: '#8B7355', fontSize: 11, textAlign: 'center' }} numberOfLines={1}>{item.enGucluIlce}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        )}

        {/* ══════════════ UYARI ══════════════ */}
        {aktifSekme === 'uyari' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="⚠️ Uyarı & Alarm Sistemi" alt="Dikkat gerektiren durumlar" />
            {uyarilar.length === 0 ? (
              <View style={{ backgroundColor: '#E8F5E9', borderRadius: 16, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#588157' }}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>✅</Text>
                <Text style={{ color: '#588157', fontWeight: 'bold', fontSize: 16 }}>Her şey yolunda!</Text>
                <Text style={{ color: '#526E7F', fontSize: 13, marginTop: 5, textAlign: 'center' }}>Şu an dikkat gerektiren bir durum yok.</Text>
              </View>
            ) : (
              uyarilar.map((u, i) => (
                <View key={i} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, marginBottom: 10, elevation: 1, borderLeftWidth: 5, borderLeftColor: u.tip === '🔴' ? '#E74C3C' : u.tip === '🟠' ? '#F39C12' : '#F1C40F' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{u.tip}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14 }}>{u.mesaj}</Text>
                      <Text style={{ color: '#A3B1B9', fontSize: 12, marginTop: 2 }}>{u.detay}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
            <View style={{ backgroundColor: '#F5F5F0', borderRadius: 14, padding: 15, marginTop: 10 }}>
              <Text style={{ color: '#526E7F', fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>Uyarı Seviyeleri</Text>
              {[
                { tip: '🔴', label: 'Kırmızı — Acil müdahale gerekli' },
                { tip: '🟠', label: 'Turuncu — Yakın takip gerekli' },
                { tip: '🟡', label: 'Sarı — Bilgi amaçlı' },
              ].map((item, i) => (
                <Text key={i} style={{ color: '#A3B1B9', fontSize: 12, marginBottom: 4 }}>{item.tip} {item.label}</Text>
              ))}
            </View>
          </View>
        )}

        {/* ══════════════ KPI ══════════════ */}
        {aktifSekme === 'kpi' && (
          <View style={{ paddingVertical: 5 }}>
            <BolumBaslik baslik="🎯 En Önemli 10 KPI" alt="Her hafta düzenli bakılması gereken metrikler" />
            {[
              { sira: 1,  label: 'Yeni Kayıt Sayısı',           deger: `${yeniKullanicilar.length} kişi`,       yorum: yeniKullanicilar.length > 10 ? '✅ İyi' : '⚠️ Düşük',                          renk: yeniKullanicilar.length > 10 ? '#27AE60' : '#F39C12' },
              { sira: 2,  label: 'Usta / Müşteri Dengesi',       deger: `${yeniUstalar.length} / ${yeniMusteriler.length}`, yorum: yeniUstalar.length > 0 && yeniMusteriler.length > 0 ? '✅ Dengeli' : '⚠️ Dengesiz', renk: '#2E86AB' },
              { sira: 3,  label: 'Onaylı Usta Oranı',           deger: `${onayliUsta} / ${toplamUsta}`,         yorum: `%${yuzde(onayliUsta, toplamUsta)} onanmış`,                                     renk: '#588157' },
              { sira: 4,  label: 'Açılan İlan Sayısı',          deger: `${yeniIlanlar.length} ilan`,            yorum: acilIlanlar.length > 0 ? `${acilIlanlar.length} acil` : 'Normal',                renk: '#1B4965' },
              { sira: 5,  label: 'İlan Başına Ort. Teklif',     deger: yeniIlanlar.length > 0 ? `${(yeniTeklifler.length / yeniIlanlar.length).toFixed(1)}` : '—', yorum: yeniIlanlar.length > 0 && yeniTeklifler.length / yeniIlanlar.length >= 2 ? '✅ İyi' : '⚠️ Düşük', renk: '#9B59B6' },
              { sira: 6,  label: 'Teklif Veren Aktif Usta',     deger: `${teklifIstatistik.teklifVerenUstaIdler.length} usta`, yorum: `%${yuzde(teklifIstatistik.teklifVerenUstaIdler.length, toplamUsta)}'i aktif`, renk: '#8B7355' },
              { sira: 7,  label: 'Anlaşma Sayısı',              deger: `${anlasmalar.length} anlaşma`,          yorum: `%${yuzde(anlasmalar.length, yeniIlanlar.length)} ilan → anlaşma`,              renk: '#27AE60' },
              { sira: 8,  label: 'Puanlama Sayısı',             deger: `${yeniPuanlamalar.length} puan`,        yorum: `Ort: ${puanOrtalama} ⭐`,                                                       renk: '#F39C12' },
              { sira: 9,  label: 'Teklif Almayan İlan Oranı',   deger: `%${yuzde(teklifAlmayanIlanlar.length, yeniIlanlar.length)}`, yorum: yuzde(teklifAlmayanIlanlar.length, yeniIlanlar.length) < 20 ? '✅ İyi' : '🔴 Kritik', renk: yuzde(teklifAlmayanIlanlar.length, yeniIlanlar.length) < 20 ? '#27AE60' : '#E74C3C' },
              { sira: 10, label: 'Aktif Abonelik',              deger: `${aktifAbone.length} abonelik`,         yorum: `${abonelikGelir.vipAbone.length} VIP, ${abonelikGelir.premiumAbone.length} Premium`, renk: '#F39C12' },
            ].map((kpi, i) => (
              <View key={i} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 15, marginBottom: 10, elevation: 1, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: kpi.renk, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{kpi.sira}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#526E7F', fontSize: 12 }}>{kpi.label}</Text>
                  <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 16 }}>{kpi.deger}</Text>
                  <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 1 }}>{kpi.yorum}</Text>
                </View>
              </View>
            ))}

            {/* GAYİT Sağlık Skoru */}
            <View style={{ backgroundColor: '#1B4965', borderRadius: 16, padding: 18, marginTop: 5, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>GAYİT Sağlık Skoru</Text>
              {(() => {
                let skor = 0;
                if (yeniKullanicilar.length > 5) skor += 10;
                if (yeniUstalar.length > 0 && yeniMusteriler.length > 0) skor += 10;
                if (yuzde(onayliUsta, toplamUsta) > 50) skor += 10;
                if (yeniIlanlar.length > 0) skor += 10;
                if (yeniIlanlar.length > 0 && yeniTeklifler.length / yeniIlanlar.length >= 1) skor += 20;
                if (anlasmalar.length > 0) skor += 20;
                if (yeniPuanlamalar.length > 0) skor += 10;
                if (yuzde(teklifAlmayanIlanlar.length, yeniIlanlar.length) < 30) skor += 10;
                const emoji = skor >= 80 ? '🟢' : skor >= 50 ? '🟡' : '🔴';
                const yorum = skor >= 80 ? "GAYİT'in tekeri dönüyor!" : skor >= 50 ? 'Gelişme var, devam et' : 'İyileştirme gerekli';
                return (
                  <>
                    <Text style={{ color: '#FFF', fontSize: 48, fontWeight: 'bold' }}>{emoji} {skor}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 }}>{yorum}</Text>
                  </>
                );
              })()}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
