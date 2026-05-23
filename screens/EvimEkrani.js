// ============================================================
// EvimEkrani.js
// Ev eşyası & hizmet takip sistemi
// 200 TL (premium) → Manuel takip (eşya, hizmet, bakım, not)
// 400 TL (vip)     → + AI Analizi (Çok Yakında — ayda 2 yorum)
// ============================================================
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Modal, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DB_URL } from '../constants';

// ============================================================
// SABİT KATEGORİLER — EŞYALAR
// ============================================================
const ESYA_KATEGORILER = [
  { label: 'Beyaz Eşya', ikon: '🧺' },
  { label: 'Isıtma/Soğutma', ikon: '🌡️' },
  { label: 'Tesisat', ikon: '🔧' },
  { label: 'Elektrik', ikon: '⚡' },
  { label: 'Yapı/İnşaat', ikon: '🏗️' },
  { label: 'Mobilya/Diğer', ikon: '🪑' },
];

// ============================================================
// SABİT KATEGORİLER — HİZMETLER (eşyasız)
// ============================================================
const HIZMET_KATEGORILER = [
  { label: 'Su Tesisatı', ikon: '🚿' },
  { label: 'Elektrik Tesisatı', ikon: '🔌' },
  { label: 'Doğalgaz Tesisatı', ikon: '🔥' },
  { label: 'Boya/Badana', ikon: '🖌️' },
  { label: 'Çatı/Yalıtım', ikon: '🏠' },
  { label: 'Zemin/Döşeme', ikon: '🪵' },
  { label: 'Kapı/Pencere', ikon: '🚪' },
  { label: 'Genel Bakım', ikon: '🛠️' },
];

// ============================================================
// SABİT: BAKIM TİPLERİ
// ============================================================
const BAKIM_TIPLERI = [
  { label: 'Servis', ikon: '🔧' },
  { label: 'Tamir', ikon: '🛠️' },
  { label: 'Bakım', ikon: '✅' },
  { label: 'Parça Değişimi', ikon: '🔩' },
  { label: 'Muayene', ikon: '🔍' },
  { label: 'Temizlik', ikon: '🧹' },
  { label: 'Diğer', ikon: '📌' },
];

// ============================================================
// YARDIMCI: Garanti durumu
// ============================================================
function garantiDurumu(alisTarihi, garantiYil) {
  if (!alisTarihi || !garantiYil) return null;
  const alis = new Date(alisTarihi);
  const bitis = new Date(alis);
  bitis.setFullYear(bitis.getFullYear() + parseInt(garantiYil));
  const bugun = new Date();
  const kalanMs = bitis - bugun;
  const kalanGun = Math.floor(kalanMs / (1000 * 60 * 60 * 24));
  if (kalanMs < 0) return { durum: 'bitti', metin: 'Garanti Bitti', renk: '#FF4444' };
  if (kalanGun < 90) return { durum: 'yaklasıyor', metin: `${kalanGun} gün kaldı`, renk: '#F39C12' };
  return { durum: 'gecerli', metin: `${kalanGun} gün kaldı`, renk: '#588157' };
}

// ============================================================
// YARDIMCI: Yaş hesapla
// ============================================================
function esyaYasi(alisTarihi) {
  if (!alisTarihi) return null;
  const alis = new Date(alisTarihi);
  const bugun = new Date();
  const yil = bugun.getFullYear() - alis.getFullYear();
  const ay = bugun.getMonth() - alis.getMonth();
  const toplamAy = yil * 12 + ay;
  if (toplamAy < 12) return `${toplamAy} aylık`;
  return `${yil} yaşında`;
}

// ============================================================
// YARDIMCI: Son bakım özeti
// ============================================================
function sonBakimMetni(bakimlar) {
  if (!bakimlar) return null;
  const liste = Object.values(bakimlar).sort((a, b) => b.tarih - a.tarih);
  if (liste.length === 0) return null;
  const son = liste[0];
  const tarihStr = new Date(son.tarih).toLocaleDateString('tr-TR');
  return `${son.tip} — ${tarihStr}`;
}

// ============================================================
// YARDIMCI: Tarih input (web/native)
// ============================================================
function TarihInput({ value, onChange, placeholder, s }) {
  const [takvimAcik, setTakvimAcik] = useState(false);
  const [takvimDegeri, setTakvimDegeri] = useState(value ? new Date(value) : new Date());

  // DÜZELTME: Dışarıdan gelen value değişince state'i senkronize et
  useEffect(() => {
    if (value) setTakvimDegeri(new Date(value));
  }, [value]);

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        max={new Date().toISOString().split('T')[0]}
        value={value}
        style={{
          width: '100%', padding: 14, borderRadius: 12,
          border: '1px solid #E8E8E0', fontSize: 15,
          color: value ? '#1B4965' : '#A3B1B9',
          backgroundColor: '#FFF', marginBottom: 12,
          boxSizing: 'border-box',
        }}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <>
      <TouchableOpacity
        style={[s.inp, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={() => setTakvimAcik(true)}
      >
        <Text style={{ color: value ? '#1B4965' : '#A3B1B9', fontSize: 15 }}>
          {value || placeholder || 'Tarih seçin...'}
        </Text>
        <Text style={{ color: '#A3B1B9' }}>📅</Text>
      </TouchableOpacity>
      {takvimAcik && (
        <DateTimePicker
          value={takvimDegeri}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, date) => {
            setTakvimAcik(false);
            if (date) {
              setTakvimDegeri(date);
              onChange(date.toISOString().split('T')[0]);
            }
          }}
        />
      )}
    </>
  );
}

// ============================================================
// ANA EKRAN
// ============================================================
export function EvimEkrani({ kullanici, token, setEkran, s }) {
  const [esyalar, setEsyalar] = useState([]);
  const [hizmetler, setHizmetler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Modaller
  const [ekleModalAcik, setEkleModalAcik] = useState(false);
  const [hizmetEkleModalAcik, setHizmetEkleModalAcik] = useState(false);
  const [detayModalAcik, setDetayModalAcik] = useState(false);
  const [hizmetDetayModalAcik, setHizmetDetayModalAcik] = useState(false);
  const [duzenleModalAcik, setDuzenleModalAcik] = useState(false);
  const [hizmetDuzenleModalAcik, setHizmetDuzenleModalAcik] = useState(false);
  const [raporModalAcik, setRaporModalAcik] = useState(false);

  const [secilenEsya, setSecilenEsya] = useState(null);
  const [secilenHizmet, setSecilenHizmet] = useState(null);
  const [duzenlenecekEsya, setDuzenlenecekEsya] = useState(null);
  const [duzenlenecekHizmet, setDuzenlenecekHizmet] = useState(null);

  // Filtre
  const [aktifTab, setAktifTab] = useState('esyalar'); // 'esyalar' | 'hizmetler'
  const [secilenKategori, setSecilenKategori] = useState('Tümü');

  // Raporlar
  const [gecmisRaporlar, setGecmisRaporlar] = useState([]);
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);

  const abonelik = kullanici?.abonelik || kullanici?.paket || '';
  const isVip = abonelik === 'vip';
  const isPremium = abonelik === 'premium' || isVip;

  // DÜZELTME: kullanici?.uid bağımlılık dizisine eklendi
  useEffect(() => {
    if (token) {
      esyalariYukle();
      hizmetleriYukle();
      if (isVip) gecmisRaporlariYukle();
    }
  }, [token, kullanici?.uid]);

  // Tab değişince kategori sıfırla
  useEffect(() => {
    setSecilenKategori('Tümü');
  }, [aktifTab]);

  const esyalariYukle = async () => {
    setYukleniyor(true);
    try {
      const res = await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}.json?auth=${token}`);
      const data = await res.json();
      // DÜZELTME: Güvenli tip kontrolü
      if (data && typeof data === 'object') {
        const liste = Object.keys(data).map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => b.tarih - a.tarih);
        setEsyalar(liste);
      } else {
        setEsyalar([]);
      }
    } catch (e) {
      console.log('Eşyalar yüklenemedi:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  const hizmetleriYukle = async () => {
    try {
      const res = await fetch(`${DB_URL}/evHizmetleri/${kullanici.uid}.json?auth=${token}`);
      const data = await res.json();
      // DÜZELTME: Güvenli tip kontrolü
      if (data && typeof data === 'object') {
        const liste = Object.keys(data).map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => b.tarih - a.tarih);
        setHizmetler(liste);
      } else {
        setHizmetler([]);
      }
    } catch (e) {
      console.log('Hizmetler yüklenemedi:', e);
    }
  };

  const gecmisRaporlariYukle = async () => {
    setRaporYukleniyor(true);
    try {
      const res = await fetch(`${DB_URL}/evRaporlari/${kullanici.uid}.json?auth=${token}`);
      const data = await res.json();
      // DÜZELTME: Güvenli tip kontrolü
      if (data && typeof data === 'object') {
        const liste = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => b.tarih - a.tarih);
        setGecmisRaporlar(liste);
      } else {
        setGecmisRaporlar([]);
      }
    } catch (e) {
      console.log('Raporlar yüklenemedi:', e);
    } finally {
      setRaporYukleniyor(false);
    }
  };

  const aktifKategoriler = aktifTab === 'esyalar' ? ESYA_KATEGORILER : HIZMET_KATEGORILER;
  const aktifListe = aktifTab === 'esyalar' ? esyalar : hizmetler;
  const filtrelenmis = secilenKategori === 'Tümü'
    ? aktifListe
    : aktifListe.filter(e => e.kategori === secilenKategori);

  const esyaSil = (esya) => {
    const silmeIslemi = async () => {
      try {
        await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}.json?auth=${token}`, { method: 'DELETE' });
        setSecilenEsya(null);
        setDetayModalAcik(false);
        await esyalariYukle();
      } catch (e) {
        Alert.alert('Hata', 'Eşya silinemedi!');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`"${esya.isim}" silinsin mi?`)) silmeIslemi();
    } else {
      Alert.alert('Eşyayı Sil', `"${esya.isim}" silinsin mi?`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: silmeIslemi },
      ]);
    }
  };

  const hizmetSil = (hizmet) => {
    const silmeIslemi = async () => {
      try {
        await fetch(`${DB_URL}/evHizmetleri/${kullanici.uid}/${hizmet.id}.json?auth=${token}`, { method: 'DELETE' });
        setSecilenHizmet(null);
        setHizmetDetayModalAcik(false);
        await hizmetleriYukle();
      } catch (e) {
        Alert.alert('Hata', 'Hizmet silinemedi!');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`"${hizmet.isim}" silinsin mi?`)) silmeIslemi();
    } else {
      Alert.alert('Hizmet Sil', `"${hizmet.isim}" silinsin mi?`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: silmeIslemi },
      ]);
    }
  };

  // Özet istatistikleri
  const garantiYaklasanSayisi = esyalar.filter(e => garantiDurumu(e.alisTarihi, e.garantiYil)?.durum === 'yaklasıyor').length;
  const garantiBitenSayisi = esyalar.filter(e => garantiDurumu(e.alisTarihi, e.garantiYil)?.durum === 'bitti').length;

  return (
    <SafeAreaView style={s.con}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>🏡 Evim</Text>
        <TouchableOpacity
          onPress={() => {
            if (!isPremium) return; // Standart üye ekleme yapamaz
            aktifTab === 'esyalar' ? setEkleModalAcik(true) : setHizmetEkleModalAcik(true);
          }}
          style={{ padding: 5 }}
        >
          <Text style={{ fontSize: 26, color: isPremium ? '#1B4965' : '#D1D9E0' }}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* STANDART ÜYE — tüm içerik kilitli */}
      {!isPremium ? (
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <View style={{
            backgroundColor: '#FFF3CD', borderRadius: 16, padding: 20,
            alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F39C12',
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>🔒</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B4965', textAlign: 'center', marginBottom: 8 }}>
              Aboneliklere Özel
            </Text>
            <Text style={{ color: '#526E7F', textAlign: 'center', fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
              Evim özelliği (eşya takibi, hizmet geçmişi, garanti yönetimi) Premium ve VIP üyelere özeldir.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#1B4965', borderRadius: 12, paddingHorizontal: 30, paddingVertical: 14, marginBottom: 10, width: '100%', alignItems: 'center' }}
              onPress={() => setEkran('odeme')}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>⭐ Premium Al — 200 TL/Ay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#F39C12', borderRadius: 12, paddingHorizontal: 30, paddingVertical: 14, width: '100%', alignItems: 'center' }}
              onPress={() => setEkran('odeme')}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>👑 VIP Al — 400 TL/Ay</Text>
            </TouchableOpacity>
          </View>

          {/* Özellik önizleme */}
          <View style={{ backgroundColor: '#F5F5F0', borderRadius: 16, padding: 18, width: '100%' }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 12, fontSize: 15 }}>✨ Neler kazanırsın?</Text>
            {[
              { ikon: '🧺', baslik: 'Eşya Takibi', aciklama: 'Beyaz eşya, ısıtma, elektrik — garanti ve yaşlarını takip et', paket: 'Premium' },
              { ikon: '🔧', baslik: 'Hizmet Geçmişi', aciklama: 'Evinde yapılan tüm tamirat ve bakımları kaydet', paket: 'Premium' },
              { ikon: '🤖', baslik: 'AI Ev Yorumlama', aciklama: 'Muğla şivesiyle evinin ihtiyaçlarını yapay zeka analiz eder', paket: 'VIP' },
            ].map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 14, gap: 12 }}>
                <Text style={{ fontSize: 24 }}>{f.ikon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 13 }}>{f.baslik}</Text>
                    <View style={{ backgroundColor: f.paket === 'VIP' ? '#F39C12' : '#588157', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{f.paket}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 2 }}>{f.aciklama}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          {/* AI BANNER — Premium veya VIP */}
          <TouchableOpacity
            activeOpacity={isVip ? 0.8 : 1}
            style={{
              margin: 15, marginBottom: 5,
              backgroundColor: isVip ? '#1B4965' : '#3A5060',
              borderRadius: 14, padding: 15,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              opacity: isVip ? 1 : 0.85,
            }}
            onPress={() => {
              if (isVip) {
                setRaporModalAcik(true);
                gecmisRaporlariYukle();
              }
              // Premium kullanıcı tıklarsa hiçbir şey olmaz
            }}
          >
            <Text style={{ fontSize: 28 }}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                {isVip ? 'AI Ev Analizi — VIP Üyelere Özel' : 'AI Ev Yorumlama — Sadece VIP'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 3 }}>
                {isVip
                  ? 'Muğla şivesiyle kişisel ev yorumun geliyor 😄 · Ayda 2 hak'
                  : 'Çok Yakında · VIP paket (400 TL) ile aktif olacak'}
              </Text>
            </View>
            <View style={{
              backgroundColor: isVip ? '#F39C12' : 'rgba(255,255,255,0.15)',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
            }}>
              <Text style={{ color: isVip ? '#FFF' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold' }}>
                {isVip ? 'YAKINDA' : 'YAKINDA'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* EŞYA / HİZMET TAB */}
          <View style={{ flexDirection: 'row', marginHorizontal: 15, marginTop: 12, marginBottom: 4, backgroundColor: '#E1F2FE', borderRadius: 12, padding: 4 }}>
            <TouchableOpacity
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
                backgroundColor: aktifTab === 'esyalar' ? '#1B4965' : 'transparent',
              }}
              onPress={() => setAktifTab('esyalar')}
            >
              <Text style={{ color: aktifTab === 'esyalar' ? '#FFF' : '#526E7F', fontWeight: 'bold', fontSize: 13 }}>
                🧺 Eşyalar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
                backgroundColor: aktifTab === 'hizmetler' ? '#1B4965' : 'transparent',
              }}
              onPress={() => setAktifTab('hizmetler')}
            >
              <Text style={{ color: aktifTab === 'hizmetler' ? '#FFF' : '#526E7F', fontWeight: 'bold', fontSize: 13 }}>
                🔌 Hizmetler
              </Text>
            </TouchableOpacity>
          </View>

          {/* ÖZET KUTU — sadece eşyalarda */}
          {aktifTab === 'esyalar' && (
            <View style={{
              flexDirection: 'row', marginHorizontal: 15, marginTop: 8, marginBottom: 5,
              backgroundColor: '#E1F2FE', borderRadius: 12, padding: 12, gap: 10,
            }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1B4965' }}>{esyalar.length}</Text>
                <Text style={{ color: '#526E7F', fontSize: 11 }}>Kayıtlı Eşya</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#B0D4E8' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#F39C12' }}>{garantiYaklasanSayisi}</Text>
                <Text style={{ color: '#526E7F', fontSize: 11 }}>Garanti Yaklaşıyor</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#B0D4E8' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FF4444' }}>{garantiBitenSayisi}</Text>
                <Text style={{ color: '#526E7F', fontSize: 11 }}>Garanti Bitti</Text>
              </View>
            </View>
          )}

          {/* ÖZET KUTU — hizmetlerde */}
          {aktifTab === 'hizmetler' && (
            <View style={{
              flexDirection: 'row', marginHorizontal: 15, marginTop: 8, marginBottom: 5,
              backgroundColor: '#E1F2FE', borderRadius: 12, padding: 12, gap: 10,
            }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1B4965' }}>{hizmetler.length}</Text>
                <Text style={{ color: '#526E7F', fontSize: 11 }}>Kayıtlı Hizmet</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#B0D4E8' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1B4965' }}>
                  {hizmetler.filter(h => h.bakimlar && Object.keys(h.bakimlar).length > 0).length}
                </Text>
                <Text style={{ color: '#526E7F', fontSize: 11 }}>Bakım Kaydı Olan</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#B0D4E8' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#526E7F' }}>
                  {hizmetler.reduce((sum, h) => sum + (h.bakimlar ? Object.keys(h.bakimlar).length : 0), 0)}
                </Text>
                <Text style={{ color: '#526E7F', fontSize: 11 }}>Toplam İşlem</Text>
              </View>
            </View>
          )}

          {/* KATEGORİ FİLTRE */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 50, marginTop: 4 }}
            contentContainerStyle={{ paddingHorizontal: 15, alignItems: 'center', gap: 8 }}
          >
            <TouchableOpacity
              style={[s.chip, secilenKategori === 'Tümü' && s.chipAktif]}
              onPress={() => setSecilenKategori('Tümü')}
            >
              <Text style={[s.chipY, secilenKategori === 'Tümü' && s.chipYAktif]}>Tümü</Text>
            </TouchableOpacity>
            {aktifKategoriler.map(k => (
              <TouchableOpacity
                key={k.label}
                style={[s.chip, secilenKategori === k.label && s.chipAktif]}
                onPress={() => setSecilenKategori(k.label)}
              >
                <Text style={[s.chipY, secilenKategori === k.label && s.chipYAktif]}>
                  {k.ikon} {k.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* LİSTE */}
          <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 30 }}>
            {yukleniyor ? (
              <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 40 }}>Yükleniyor...</Text>
            ) : filtrelenmis.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>{aktifTab === 'esyalar' ? '🏡' : '🔧'}</Text>
                <Text style={{ color: '#A3B1B9', textAlign: 'center', fontSize: 14 }}>
                  {aktifTab === 'esyalar'
                    ? 'Henüz eşya eklemediniz.\nSağ üstteki + butonuna basın!'
                    : 'Henüz hizmet eklemediniz.\nSağ üstteki + butonuna basın!'}
                </Text>
              </View>
            ) : aktifTab === 'esyalar' ? (
              filtrelenmis.map(esya => {
                const garanti = garantiDurumu(esya.alisTarihi, esya.garantiYil);
                const yas = esyaYasi(esya.alisTarihi);
                const kategoriIkon = ESYA_KATEGORILER.find(k => k.label === esya.kategori)?.ikon || '📦';
                const sonBakim = sonBakimMetni(esya.bakimlar);

                return (
                  <TouchableOpacity
                    key={esya.id}
                    style={[s.kart, { borderLeftWidth: 4, borderLeftColor: garanti?.renk || '#D1D9E0' }]}
                    onPress={() => { setSecilenEsya(esya); setDetayModalAcik(true); }}
                    onLongPress={() => {
                      Alert.alert(esya.isim, 'Ne yapmak istiyorsunuz?', [
                        { text: 'Düzenle ✏️', onPress: () => { setDuzenlenecekEsya(esya); setDuzenleModalAcik(true); } },
                        { text: 'Sil 🗑️', style: 'destructive', onPress: () => esyaSil(esya) },
                        { text: 'Vazgeç', style: 'cancel' },
                      ]);
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Text style={{ fontSize: 18 }}>{kategoriIkon}</Text>
                          <Text style={s.kategoriBadge}>{esya.kategori}</Text>
                        </View>
                        <Text style={s.kartBaslik}>{esya.isim}</Text>
                        {esya.marka ? <Text style={s.kartAlt}>🏷️ {esya.marka}</Text> : null}
                        {yas ? <Text style={s.kartAlt}>📅 {yas}</Text> : null}
                        {sonBakim ? (
                          <Text style={[s.kartAlt, { color: '#588157' }]}>🔧 Son: {sonBakim}</Text>
                        ) : null}
                      </View>
                      {garanti ? (
                        <View style={{
                          backgroundColor: garanti.renk + '22',
                          borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
                        }}>
                          <Text style={{ color: garanti.renk, fontSize: 10, fontWeight: 'bold' }}>GARANTİ</Text>
                          <Text style={{ color: garanti.renk, fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>
                            {garanti.durum === 'bitti' ? '❌ Bitti' : `✅ ${garanti.metin}`}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {/* Son not özeti */}
                    {esya.notlar && Object.keys(esya.notlar).length > 0 ? (
                      <View style={{ marginTop: 8, backgroundColor: '#F5F5F0', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#526E7F', fontSize: 12 }} numberOfLines={1}>
                          📝 {Object.values(esya.notlar).sort((a, b) => b.tarih - a.tarih)[0]?.metin}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            ) : (
              // HİZMET kartları
              filtrelenmis.map(hizmet => {
                const kategoriIkon = HIZMET_KATEGORILER.find(k => k.label === hizmet.kategori)?.ikon || '🔧';
                const sonBakim = sonBakimMetni(hizmet.bakimlar);
                const bakimSayisi = hizmet.bakimlar ? Object.keys(hizmet.bakimlar).length : 0;

                return (
                  <TouchableOpacity
                    key={hizmet.id}
                    style={[s.kart, { borderLeftWidth: 4, borderLeftColor: '#1B4965' }]}
                    onPress={() => { setSecilenHizmet(hizmet); setHizmetDetayModalAcik(true); }}
                    onLongPress={() => {
                      Alert.alert(hizmet.isim, 'Ne yapmak istiyorsunuz?', [
                        { text: 'Düzenle ✏️', onPress: () => { setDuzenlenecekHizmet(hizmet); setHizmetDuzenleModalAcik(true); } },
                        { text: 'Sil 🗑️', style: 'destructive', onPress: () => hizmetSil(hizmet) },
                        { text: 'Vazgeç', style: 'cancel' },
                      ]);
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Text style={{ fontSize: 18 }}>{kategoriIkon}</Text>
                          <Text style={s.kategoriBadge}>{hizmet.kategori}</Text>
                        </View>
                        <Text style={s.kartBaslik}>{hizmet.isim}</Text>
                        {hizmet.aciklama ? <Text style={s.kartAlt}>📋 {hizmet.aciklama}</Text> : null}
                        {sonBakim ? (
                          <Text style={[s.kartAlt, { color: '#588157' }]}>🔧 Son: {sonBakim}</Text>
                        ) : (
                          <Text style={[s.kartAlt, { color: '#A3B1B9' }]}>Henüz işlem kaydı yok</Text>
                        )}
                      </View>
                      {bakimSayisi > 0 ? (
                        <View style={{
                          backgroundColor: '#1B496522', borderRadius: 10,
                          paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
                        }}>
                          <Text style={{ color: '#1B4965', fontSize: 10, fontWeight: 'bold' }}>İŞLEM</Text>
                          <Text style={{ color: '#1B4965', fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>{bakimSayisi}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* MODALLAR — EŞYALAR */}
          <EsyaEkleModal
            gorunur={ekleModalAcik}
            setGorunur={setEkleModalAcik}
            kullanici={kullanici}
            token={token}
            onKaydet={esyalariYukle}
            s={s}
          />

          {secilenEsya && (
            <EsyaDetayModal
              gorunur={detayModalAcik}
              setGorunur={setDetayModalAcik}
              esya={secilenEsya}
              setSecilenEsya={setSecilenEsya}
              kullanici={kullanici}
              token={token}
              onGuncelle={esyalariYukle}
              onSil={esyaSil}
              s={s}
            />
          )}

          {duzenlenecekEsya && (
            <EsyaDuzenleModal
              gorunur={duzenleModalAcik}
              setGorunur={setDuzenleModalAcik}
              esya={duzenlenecekEsya}
              kullanici={kullanici}
              token={token}
              onKaydet={esyalariYukle}
              s={s}
            />
          )}

          {/* MODALLAR — HİZMETLER */}
          <HizmetEkleModal
            gorunur={hizmetEkleModalAcik}
            setGorunur={setHizmetEkleModalAcik}
            kullanici={kullanici}
            token={token}
            onKaydet={hizmetleriYukle}
            s={s}
          />

          {secilenHizmet && (
            <HizmetDetayModal
              gorunur={hizmetDetayModalAcik}
              setGorunur={setHizmetDetayModalAcik}
              hizmet={secilenHizmet}
              setSecilenHizmet={setSecilenHizmet}
              kullanici={kullanici}
              token={token}
              onGuncelle={hizmetleriYukle}
              onSil={hizmetSil}
              s={s}
            />
          )}

          {duzenlenecekHizmet && (
            <HizmetDuzenleModal
              gorunur={hizmetDuzenleModalAcik}
              setGorunur={setHizmetDuzenleModalAcik}
              hizmet={duzenlenecekHizmet}
              kullanici={kullanici}
              token={token}
              onKaydet={hizmetleriYukle}
              s={s}
            />
          )}

          {/* RAPOR MODALİ */}
          <RaporModal
            gorunur={raporModalAcik}
            setGorunur={setRaporModalAcik}
            raporlar={gecmisRaporlar}
            yukleniyor={raporYukleniyor}
            isVip={isVip}
            s={s}
          />
        </> 
      )}
    </SafeAreaView>
  );
}

// ============================================================
// RAPOR MODALİ
// ============================================================
function RaporModal({ gorunur, setGorunur, raporlar, yukleniyor, isVip, s }) {
  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B4965' }}>🤖 AI Ev Analizi</Text>
            <TouchableOpacity onPress={() => setGorunur(false)}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Yakında Banner */}
          <View style={{
            backgroundColor: '#FFF8E7', borderRadius: 14, padding: 16, marginBottom: 20,
            borderWidth: 1, borderColor: '#F39C12', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🚀</Text>
            <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 15, textAlign: 'center', marginBottom: 6 }}>
              Çok Yakında Geliyor!
            </Text>
            <Text style={{ color: '#526E7F', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Evinizin tüm eşyalarını ve hizmet geçmişini analiz edip bakım zamanlarını, garanti durumlarını ve önerilerini kişisel rapor halinde sunacağız.
            </Text>
            {isVip ? (
              <View style={{ marginTop: 12, backgroundColor: '#F39C12', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>
                  📦 Ayda 2 AI yorumu hakkınız olacak — Eşyalarınızı şimdiden kaydedin!
                </Text>
              </View>
            ) : null}
          </View>

          {/* Geçmiş Raporlar — sadece VIP */}
          {isVip ? (
            <>
              <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>
                📋 Geçmiş Raporlar
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {yukleniyor ? (
                  <Text style={{ color: '#A3B1B9', textAlign: 'center', marginVertical: 20 }}>Yükleniyor...</Text>
                ) : raporlar.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 13, textAlign: 'center' }}>
                      Henüz rapor bulunmuyor.{'\n'}Özellik aktif olduğunda raporlarınız burada görünecek.
                    </Text>
                  </View>
                ) : (
                  raporlar.map(rapor => (
                    <View key={rapor.id} style={{
                      backgroundColor: '#F0F4F8', borderRadius: 12, padding: 14,
                      marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#1B4965',
                    }}>
                      <Text style={{ color: '#A3B1B9', fontSize: 11, marginBottom: 6 }}>
                        📅 {new Date(rapor.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                      <Text style={{ color: '#1B4965', fontSize: 13, lineHeight: 20 }}>{rapor.rapor}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// EŞYA EKLEME MODALİ
// ============================================================
function EsyaEkleModal({ gorunur, setGorunur, kullanici, token, onKaydet, s }) {
  const [isim, setIsim] = useState('');
  const [marka, setMarka] = useState('');
  const [kategori, setKategori] = useState('Beyaz Eşya');
  const [garantiYil, setGarantiYil] = useState('');
  const [alisTarihi, setAlisTarihi] = useState('');
  const [ilkNot, setIlkNot] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const temizle = () => {
    setIsim(''); setMarka(''); setKategori('Beyaz Eşya');
    setGarantiYil(''); setAlisTarihi(''); setIlkNot('');
  };

  const kaydet = async () => {
    if (!isim.trim()) { Alert.alert('Eksik', 'Eşya adını girin!'); return; }
    setKaydediliyor(true);
    try {
      const body = {
        isim: isim.trim(),
        marka: marka.trim(),
        kategori,
        garantiYil: garantiYil ? parseInt(garantiYil) : null,
        alisTarihi: alisTarihi || null,
        tarih: Date.now(),
      };
      const res = await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const yeniId = data.name;

      // İlk not varsa kaydet
      if (ilkNot.trim() && yeniId) {
        await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${yeniId}/notlar.json?auth=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metin: ilkNot.trim(), tarih: Date.now() }),
        });
      }

      temizle();
      setGorunur(false);
      await onKaydet();
    } catch (e) {
      Alert.alert('Hata', 'Kaydedilemedi!');
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={s.modalBaslik}>Eşya Ekle</Text>
            <TouchableOpacity onPress={() => { temizle(); setGorunur(false); }}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputBaslik}>Eşya Adı *</Text>
            <TextInput
              style={s.inp}
              placeholder="Örn: Buzdolabı, Kombi, Lavabo..."
              value={isim}
              onChangeText={setIsim}
            />

            <Text style={s.inputBaslik}>Marka</Text>
            <TextInput
              style={s.inp}
              placeholder="İsteğe bağlı — Arçelik, Bosch, Vaillant..."
              value={marka}
              onChangeText={setMarka}
            />

            <Text style={s.inputBaslik}>Kategori</Text>
            <View style={s.chipAlan}>
              {ESYA_KATEGORILER.map(k => (
                <TouchableOpacity
                  key={k.label}
                  style={[s.chip, kategori === k.label && s.chipAktif]}
                  onPress={() => setKategori(k.label)}
                >
                  <Text style={[s.chipY, kategori === k.label && s.chipYAktif]}>
                    {k.ikon} {k.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputBaslik}>Alış Tarihi</Text>
            <TarihInput value={alisTarihi} onChange={setAlisTarihi} s={s} />

            <Text style={s.inputBaslik}>Garanti Süresi (Yıl)</Text>
            <TextInput
              style={s.inp}
              placeholder="Örn: 2"
              value={garantiYil}
              onChangeText={setGarantiYil}
              keyboardType="numeric"
            />

            <Text style={s.inputBaslik}>Not (İsteğe Bağlı)</Text>
            <TextInput
              style={[s.inp, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="Başlangıç notu, fatura bilgisi, satın alma yeri..."
              value={ilkNot}
              onChangeText={setIlkNot}
              multiline
            />

            <TouchableOpacity
              style={[s.girisBtn, { marginTop: 10, marginBottom: 20, opacity: kaydediliyor ? 0.6 : 1 }]}
              onPress={kaydet}
              disabled={kaydediliyor}
            >
              <Text style={s.anaBtnY}>{kaydediliyor ? 'Kaydediliyor...' : '💾 KAYDET'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// EŞYA DETAY MODALİ — 3 Sekme: Bilgi | Bakım Geçmişi | Notlar
// ============================================================
function EsyaDetayModal({ gorunur, setGorunur, esya, setSecilenEsya, kullanici, token, onGuncelle, onSil, s }) {
  const [aktifSekme, setAktifSekme] = useState('bilgi'); // 'bilgi' | 'bakim' | 'notlar'
  const [yeniNot, setYeniNot] = useState('');
  const [notEkleniyor, setNotEkleniyor] = useState(false);
  const [duzenlenecekNot, setDuzenlenecekNot] = useState(null);

  // Bakım ekleme state
  const [bakimEkleAcik, setBakimEkleAcik] = useState(false);
  const [bakimTip, setBakimTip] = useState('Bakım');
  const [bakimTarih, setBakimTarih] = useState('');
  const [bakimUsta, setBakimUsta] = useState('');
  const [bakimTutar, setBakimTutar] = useState('');
  const [bakimNot, setBakimNot] = useState('');
  const [bakimEkleniyor, setBakimEkleniyor] = useState(false);

  const garanti = garantiDurumu(esya.alisTarihi, esya.garantiYil);
  const yas = esyaYasi(esya.alisTarihi);
  const kategoriIkon = ESYA_KATEGORILER.find(k => k.label === esya.kategori)?.ikon || '📦';

  const notlar = esya.notlar
    ? Object.keys(esya.notlar).map(key => ({ id: key, ...esya.notlar[key] })).sort((a, b) => b.tarih - a.tarih)
    : [];
  const bakimlar = esya.bakimlar
    ? Object.keys(esya.bakimlar).map(key => ({ id: key, ...esya.bakimlar[key] })).sort((a, b) => b.tarih - a.tarih)
    : [];

  const yenile = async () => {
    await onGuncelle();
    const res = await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}.json?auth=${token}`);
    const data = await res.json();
    if (data) setSecilenEsya({ id: esya.id, ...data });
  };

  const notKaydet = async () => {
    if (!yeniNot.trim()) return;
    setNotEkleniyor(true);
    try {
      if (duzenlenecekNot) {
        await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}/notlar/${duzenlenecekNot.id}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metin: yeniNot.trim() }),
        });
        setDuzenlenecekNot(null);
      } else {
        await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}/notlar.json?auth=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metin: yeniNot.trim(), tarih: Date.now() }),
        });
      }
      setYeniNot('');
      await yenile();
    } catch (e) {
      Alert.alert('Hata', 'İşlem başarısız!');
    } finally {
      setNotEkleniyor(false);
    }
  };

  const notSil = async (notId) => {
    try {
      await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}/notlar/${notId}.json?auth=${token}`, { method: 'DELETE' });
      await yenile();
    } catch (e) {
      Alert.alert('Hata', 'Not silinemedi!');
    }
  };

  const bakimKaydet = async () => {
    if (!bakimTarih) { Alert.alert('Eksik', 'Bakım tarihini girin!'); return; }
    setBakimEkleniyor(true);
    try {
      await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}/bakimlar.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tip: bakimTip,
          tarih: new Date(bakimTarih).getTime(),
          tarihStr: bakimTarih,
          usta: bakimUsta.trim(),
          tutar: bakimTutar.trim(),
          not: bakimNot.trim(),
        }),
      });
      setBakimTip('Bakım'); setBakimTarih(''); setBakimUsta('');
      setBakimTutar(''); setBakimNot('');
      setBakimEkleAcik(false);
      await yenile();
    } catch (e) {
      Alert.alert('Hata', 'Bakım kaydedilemedi!');
    } finally {
      setBakimEkleniyor(false);
    }
  };

  const bakimSil = async (bakimId) => {
    try {
      await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}/bakimlar/${bakimId}.json?auth=${token}`, { method: 'DELETE' });
      await yenile();
    } catch (e) {
      Alert.alert('Hata', 'Bakım kaydı silinemedi!');
    }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '92%' }]}>
          {/* Başlık */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1B4965', flex: 1 }} numberOfLines={1}>
              {kategoriIkon} {esya.isim}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => onSil(esya)}>
                <Text style={{ color: '#FF4444', fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGorunur(false)}>
                <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sekmeler */}
          <View style={{ flexDirection: 'row', backgroundColor: '#E1F2FE', borderRadius: 10, padding: 3, marginBottom: 14 }}>
            {[['bilgi', 'ℹ️ Bilgi'], ['bakim', `🔧 Bakım (${bakimlar.length})`], ['notlar', `📝 Notlar (${notlar.length})`]].map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={{
                  flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
                  backgroundColor: aktifSekme === key ? '#1B4965' : 'transparent',
                }}
                onPress={() => setAktifSekme(key)}
              >
                <Text style={{ color: aktifSekme === key ? '#FFF' : '#526E7F', fontSize: 11, fontWeight: 'bold' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* BİLGİ SEKMESİ */}
            {aktifSekme === 'bilgi' && (
              <View style={{ backgroundColor: '#F0F4F8', borderRadius: 14, padding: 14 }}>
                {esya.marka ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}>🏷️ Marka</Text>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>{esya.marka}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#A3B1B9', fontSize: 13 }}>📦 Kategori</Text>
                  <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>{esya.kategori}</Text>
                </View>
                {yas ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}>📅 Yaş</Text>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>{yas}</Text>
                  </View>
                ) : null}
                {esya.alisTarihi ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}>🛒 Alış Tarihi</Text>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>
                      {new Date(esya.alisTarihi).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                ) : null}
                {garanti ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}>🛡️ Garanti</Text>
                    <Text style={{ color: garanti.renk, fontWeight: 'bold', fontSize: 13 }}>
                      {garanti.durum === 'bitti' ? '❌ Bitti' : `✅ ${garanti.metin}`}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* BAKIM GEÇMİŞİ SEKMESİ */}
            {aktifSekme === 'bakim' && (
              <View>
                {/* Bakım Ekle Butonu / Formu */}
                {!bakimEkleAcik ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#1B4965', borderRadius: 12, padding: 12,
                      alignItems: 'center', marginBottom: 14,
                    }}
                    onPress={() => setBakimEkleAcik(true)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>＋ Bakım / Servis Kaydı Ekle</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: '#F0F4F8', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>
                      Yeni Kayıt
                    </Text>

                    <Text style={s.inputBaslik}>İşlem Tipi</Text>
                    <View style={s.chipAlan}>
                      {BAKIM_TIPLERI.map(t => (
                        <TouchableOpacity
                          key={t.label}
                          style={[s.chip, bakimTip === t.label && s.chipAktif]}
                          onPress={() => setBakimTip(t.label)}
                        >
                          <Text style={[s.chipY, bakimTip === t.label && s.chipYAktif]}>
                            {t.ikon} {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={s.inputBaslik}>Tarih *</Text>
                    <TarihInput value={bakimTarih} onChange={setBakimTarih} s={s} />

                    <Text style={s.inputBaslik}>Usta / Firma</Text>
                    <TextInput
                      style={s.inp}
                      placeholder="Örn: Arçelik Servisi, Usta Ahmet..."
                      value={bakimUsta}
                      onChangeText={setBakimUsta}
                    />

                    <Text style={s.inputBaslik}>Tutar (₺)</Text>
                    <TextInput
                      style={s.inp}
                      placeholder="Örn: 850"
                      value={bakimTutar}
                      onChangeText={setBakimTutar}
                      keyboardType="numeric"
                    />

                    <Text style={s.inputBaslik}>Not</Text>
                    <TextInput
                      style={[s.inp, { minHeight: 60, textAlignVertical: 'top' }]}
                      placeholder="Yapılan işlem detayı..."
                      value={bakimNot}
                      onChangeText={setBakimNot}
                      multiline
                    />

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#D1D9E0', alignItems: 'center' }}
                        onPress={() => setBakimEkleAcik(false)}
                      >
                        <Text style={{ color: '#526E7F', fontWeight: 'bold' }}>Vazgeç</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#1B4965', alignItems: 'center', opacity: bakimEkleniyor ? 0.6 : 1 }}
                        onPress={bakimKaydet}
                        disabled={bakimEkleniyor}
                      >
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{bakimEkleniyor ? 'Kaydediliyor...' : '💾 Kaydet'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Bakım listesi */}
                {bakimlar.length === 0 ? (
                  <Text style={{ color: '#A3B1B9', fontSize: 13, textAlign: 'center', marginVertical: 20 }}>
                    Henüz bakım kaydı yok.
                  </Text>
                ) : (
                  bakimlar.map(bakim => {
                    const tipObj = BAKIM_TIPLERI.find(t => t.label === bakim.tip);
                    return (
                      <TouchableOpacity
                        key={bakim.id}
                        style={{
                          backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8,
                          borderLeftWidth: 3, borderLeftColor: '#588157',
                        }}
                        onLongPress={() => {
                          Alert.alert('Bakım Kaydı', bakim.not || bakim.tip, [
                            { text: 'Sil 🗑️', style: 'destructive', onPress: () => bakimSil(bakim.id) },
                            { text: 'Vazgeç', style: 'cancel' },
                          ]);
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>
                            {tipObj?.ikon} {bakim.tip}
                          </Text>
                          <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                            {new Date(bakim.tarih).toLocaleDateString('tr-TR')}
                          </Text>
                        </View>
                        {bakim.usta ? <Text style={{ color: '#526E7F', fontSize: 12 }}>👷 {bakim.usta}</Text> : null}
                        {bakim.tutar ? <Text style={{ color: '#526E7F', fontSize: 12 }}>💰 {bakim.tutar} ₺</Text> : null}
                        {bakim.not ? <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4 }}>{bakim.not}</Text> : null}
                        <Text style={{ color: '#C0CCD4', fontSize: 10, marginTop: 4 }}>Silmek için uzun bas</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* NOTLAR SEKMESİ */}
            {aktifSekme === 'notlar' && (
              <View>
                <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>
                  📝 Genel Notlar
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TextInput
                    style={[s.inp, { flex: 1, marginBottom: 0 }]}
                    placeholder="Not ekle..."
                    value={yeniNot}
                    onChangeText={setYeniNot}
                    multiline
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: yeniNot.trim() ? '#1B4965' : '#D1D9E0',
                      borderRadius: 12, paddingHorizontal: 14,
                      justifyContent: 'center', alignItems: 'center',
                    }}
                    onPress={notKaydet}
                    disabled={!yeniNot.trim() || notEkleniyor}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{notEkleniyor ? '...' : '➤'}</Text>
                  </TouchableOpacity>
                </View>
                {notlar.length === 0 ? (
                  <Text style={{ color: '#A3B1B9', fontSize: 13, textAlign: 'center', marginVertical: 10 }}>
                    Henüz not yok.
                  </Text>
                ) : (
                  notlar.map(not => (
                    <TouchableOpacity
                      key={not.id}
                      style={{
                        backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8,
                        borderLeftWidth: 3, borderLeftColor: '#1B4965',
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
                      }}
                      onLongPress={() => {
                        Alert.alert('Not', not.metin, [
                          { text: 'Düzenle ✏️', onPress: () => { setDuzenlenecekNot(not); setYeniNot(not.metin); } },
                          { text: 'Sil 🗑️', style: 'destructive', onPress: () => notSil(not.id) },
                          { text: 'Vazgeç', style: 'cancel' },
                        ]);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#1B4965', fontSize: 13 }}>{not.metin}</Text>
                        <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 4 }}>
                          {new Date(not.tarih).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// EŞYA DÜZENLEME MODALİ
// ============================================================
function EsyaDuzenleModal({ gorunur, setGorunur, esya, kullanici, token, onKaydet, s }) {
  const [isim, setIsim] = useState(esya.isim || '');
  const [marka, setMarka] = useState(esya.marka || '');
  const [kategori, setKategori] = useState(esya.kategori || 'Beyaz Eşya');
  const [garantiYil, setGarantiYil] = useState(esya.garantiYil ? String(esya.garantiYil) : '');
  const [alisTarihi, setAlisTarihi] = useState(esya.alisTarihi || '');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kaydet = async () => {
    if (!isim.trim()) { Alert.alert('Eksik', 'Eşya adını girin!'); return; }
    setKaydediliyor(true);
    try {
      await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isim: isim.trim(), marka: marka.trim(), kategori,
          garantiYil: garantiYil ? parseInt(garantiYil) : null,
          alisTarihi: alisTarihi || null,
        }),
      });
      setGorunur(false);
      await onKaydet();
    } catch (e) {
      Alert.alert('Hata', 'Güncellenemedi!');
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={s.modalBaslik}>Eşyayı Düzenle ✏️</Text>
            <TouchableOpacity onPress={() => setGorunur(false)}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputBaslik}>Eşya Adı *</Text>
            <TextInput style={s.inp} value={isim} onChangeText={setIsim} placeholder="Eşya adı..." />

            <Text style={s.inputBaslik}>Marka</Text>
            <TextInput style={s.inp} value={marka} onChangeText={setMarka} placeholder="Marka..." />

            <Text style={s.inputBaslik}>Kategori</Text>
            <View style={s.chipAlan}>
              {ESYA_KATEGORILER.map(k => (
                <TouchableOpacity key={k.label} style={[s.chip, kategori === k.label && s.chipAktif]} onPress={() => setKategori(k.label)}>
                  <Text style={[s.chipY, kategori === k.label && s.chipYAktif]}>{k.ikon} {k.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputBaslik}>Alış Tarihi</Text>
            <TarihInput value={alisTarihi} onChange={setAlisTarihi} s={s} />

            <Text style={s.inputBaslik}>Garanti Süresi (Yıl)</Text>
            <TextInput style={s.inp} value={garantiYil} onChangeText={setGarantiYil} keyboardType="numeric" placeholder="Örn: 2" />

            <TouchableOpacity
              style={[s.girisBtn, { marginTop: 10, marginBottom: 20, opacity: kaydediliyor ? 0.6 : 1 }]}
              onPress={kaydet} disabled={kaydediliyor}
            >
              <Text style={s.anaBtnY}>{kaydediliyor ? 'Kaydediliyor...' : '💾 GÜNCELLE'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// HİZMET EKLEME MODALİ
// ============================================================
function HizmetEkleModal({ gorunur, setGorunur, kullanici, token, onKaydet, s }) {
  const [isim, setIsim] = useState('');
  const [kategori, setKategori] = useState('Su Tesisatı');
  const [aciklama, setAciklama] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const temizle = () => { setIsim(''); setKategori('Su Tesisatı'); setAciklama(''); };

  const kaydet = async () => {
    if (!isim.trim()) { Alert.alert('Eksik', 'Hizmet adını girin!'); return; }
    setKaydediliyor(true);
    try {
      await fetch(`${DB_URL}/evHizmetleri/${kullanici.uid}.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isim: isim.trim(), kategori,
          aciklama: aciklama.trim(),
          tarih: Date.now(),
        }),
      });
      temizle();
      setGorunur(false);
      await onKaydet();
    } catch (e) {
      Alert.alert('Hata', 'Kaydedilemedi!');
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={s.modalBaslik}>Hizmet Ekle 🔧</Text>
            <TouchableOpacity onPress={() => { temizle(); setGorunur(false); }}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputBaslik}>Hizmet Adı *</Text>
            <TextInput
              style={s.inp}
              placeholder="Örn: Daire Su Tesisatı, Ana Elektrik Panosu..."
              value={isim}
              onChangeText={setIsim}
            />

            <Text style={s.inputBaslik}>Kategori</Text>
            <View style={s.chipAlan}>
              {HIZMET_KATEGORILER.map(k => (
                <TouchableOpacity
                  key={k.label}
                  style={[s.chip, kategori === k.label && s.chipAktif]}
                  onPress={() => setKategori(k.label)}
                >
                  <Text style={[s.chipY, kategori === k.label && s.chipYAktif]}>
                    {k.ikon} {k.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputBaslik}>Açıklama (İsteğe Bağlı)</Text>
            <TextInput
              style={[s.inp, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="Hangi bölüm, ne tür sistem, genel notlar..."
              value={aciklama}
              onChangeText={setAciklama}
              multiline
            />

            <TouchableOpacity
              style={[s.girisBtn, { marginTop: 10, marginBottom: 20, opacity: kaydediliyor ? 0.6 : 1 }]}
              onPress={kaydet} disabled={kaydediliyor}
            >
              <Text style={s.anaBtnY}>{kaydediliyor ? 'Kaydediliyor...' : '💾 KAYDET'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// HİZMET DETAY MODALİ — 2 Sekme: Bilgi | Bakım Geçmişi
// ============================================================
function HizmetDetayModal({ gorunur, setGorunur, hizmet, setSecilenHizmet, kullanici, token, onGuncelle, onSil, s }) {
  const [aktifSekme, setAktifSekme] = useState('bilgi');

  // Bakım ekleme state
  const [bakimEkleAcik, setBakimEkleAcik] = useState(false);
  const [bakimTip, setBakimTip] = useState('Bakım');
  const [bakimTarih, setBakimTarih] = useState('');
  const [bakimUsta, setBakimUsta] = useState('');
  const [bakimTutar, setBakimTutar] = useState('');
  const [bakimNot, setBakimNot] = useState('');
  const [bakimEkleniyor, setBakimEkleniyor] = useState(false);

  const kategoriIkon = HIZMET_KATEGORILER.find(k => k.label === hizmet.kategori)?.ikon || '🔧';
  const bakimlar = hizmet.bakimlar
    ? Object.keys(hizmet.bakimlar).map(key => ({ id: key, ...hizmet.bakimlar[key] })).sort((a, b) => b.tarih - a.tarih)
    : [];

  const yenile = async () => {
    await onGuncelle();
    const res = await fetch(`${DB_URL}/evHizmetleri/${kullanici.uid}/${hizmet.id}.json?auth=${token}`);
    const data = await res.json();
    if (data) setSecilenHizmet({ id: hizmet.id, ...data });
  };

  const bakimKaydet = async () => {
    if (!bakimTarih) { Alert.alert('Eksik', 'Tarih girin!'); return; }
    setBakimEkleniyor(true);
    try {
      await fetch(`${DB_URL}/evHizmetleri/${kullanici.uid}/${hizmet.id}/bakimlar.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tip: bakimTip,
          tarih: new Date(bakimTarih).getTime(),
          tarihStr: bakimTarih,
          usta: bakimUsta.trim(),
          tutar: bakimTutar.trim(),
          not: bakimNot.trim(),
        }),
      });
      setBakimTip('Bakım'); setBakimTarih(''); setBakimUsta('');
      setBakimTutar(''); setBakimNot('');
      setBakimEkleAcik(false);
      await yenile();
    } catch (e) {
      Alert.alert('Hata', 'Bakım kaydedilemedi!');
    } finally {
      setBakimEkleniyor(false);
    }
  };

  const bakimSil = async (bakimId) => {
    try {
      await fetch(`${DB_URL}/evHizmetleri/${kullanici.uid}/${hizmet.id}/bakimlar/${bakimId}.json?auth=${token}`, { method: 'DELETE' });
      await yenile();
    } catch (e) {
      Alert.alert('Hata', 'Bakım kaydı silinemedi!');
    }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '92%' }]}>
          {/* Başlık */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1B4965', flex: 1 }} numberOfLines={1}>
              {kategoriIkon} {hizmet.isim}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => onSil(hizmet)}>
                <Text style={{ color: '#FF4444', fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGorunur(false)}>
                <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sekmeler */}
          <View style={{ flexDirection: 'row', backgroundColor: '#E1F2FE', borderRadius: 10, padding: 3, marginBottom: 14 }}>
            {[['bilgi', 'ℹ️ Bilgi'], ['bakim', `🔧 İşlem Geçmişi (${bakimlar.length})`]].map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={{
                  flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
                  backgroundColor: aktifSekme === key ? '#1B4965' : 'transparent',
                }}
                onPress={() => setAktifSekme(key)}
              >
                <Text style={{ color: aktifSekme === key ? '#FFF' : '#526E7F', fontSize: 11, fontWeight: 'bold' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* BİLGİ SEKMESİ */}
            {aktifSekme === 'bilgi' && (
              <View style={{ backgroundColor: '#F0F4F8', borderRadius: 14, padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#A3B1B9', fontSize: 13 }}>📦 Kategori</Text>
                  <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>{hizmet.kategori}</Text>
                </View>
                {hizmet.aciklama ? (
                  <View>
                    <Text style={{ color: '#A3B1B9', fontSize: 13, marginBottom: 4 }}>📋 Açıklama</Text>
                    <Text style={{ color: '#1B4965', fontSize: 13, lineHeight: 20 }}>{hizmet.aciklama}</Text>
                  </View>
                ) : null}
                {bakimlar.length > 0 ? (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#E8E8E0' }}>
                  <Text style={{ color: '#A3B1B9', fontSize: 12, marginBottom: 6 }}>Son İşlem</Text>
                  {bakimlar.slice(0, 1).map(b => (
                    <View key={b.id}>
                      <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>
                        {b.tip} — {b.tarihStr || new Date(b.tarih).toLocaleDateString('tr-TR')}
                      </Text>
                      {b.usta ? <Text style={{ color: '#526E7F', fontSize: 12 }}>👤 {b.usta}</Text> : null}
                      {b.tutar ? <Text style={{ color: '#526E7F', fontSize: 12 }}>💰 {b.tutar}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : null}
              </View>
            )}

            {/* BAKIM GEÇMİŞİ SEKMESİ */}
            {aktifSekme === 'bakim' && (
              <View>
                <TouchableOpacity
                  style={{ backgroundColor: '#1B4965', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 14 }}
                  onPress={() => setBakimEkleAcik(!bakimEkleAcik)}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>➕ Yeni İşlem Ekle</Text>
                </TouchableOpacity>

                {bakimEkleAcik && (
                  <View style={{ backgroundColor: '#F0F4F8', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <Text style={s.inputBaslik}>İşlem Tipi</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {['Bakım', 'Tamir', 'Kontrol', 'Değişim'].map(tip => (
                        <TouchableOpacity
                          key={tip}
                          style={{ borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: bakimTip === tip ? '#1B4965' : '#E1F2FE' }}
                          onPress={() => setBakimTip(tip)}
                        >
                          <Text style={{ color: bakimTip === tip ? '#FFF' : '#1B4965', fontSize: 13 }}>{tip}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={s.inputBaslik}>Tarih *</Text>
                    <TextInput style={s.inp} value={bakimTarih} onChangeText={setBakimTarih} placeholder="YYYY-AA-GG" />
                    <Text style={s.inputBaslik}>Usta / Firma</Text>
                    <TextInput style={s.inp} value={bakimUsta} onChangeText={setBakimUsta} placeholder="Usta adı..." />
                    <Text style={s.inputBaslik}>Tutar</Text>
                    <TextInput style={s.inp} value={bakimTutar} onChangeText={setBakimTutar} placeholder="500 TL..." keyboardType="numeric" />
                    <Text style={s.inputBaslik}>Not</Text>
                    <TextInput style={[s.inp, { minHeight: 60, textAlignVertical: 'top' }]} value={bakimNot} onChangeText={setBakimNot} placeholder="Notlar..." multiline />
                    <TouchableOpacity
                      style={[s.girisBtn, { marginTop: 8, opacity: bakimEkleniyor ? 0.6 : 1 }]}
                      onPress={bakimKaydet} disabled={bakimEkleniyor}
                    >
                      <Text style={s.anaBtnY}>{bakimEkleniyor ? 'Kaydediliyor...' : '💾 KAYDET'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {bakimlar.length === 0 ? (
                  <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 20 }}>Henüz işlem kaydı yok.</Text>
                ) : (
                  bakimlar.map(b => (
                    <View key={b.id} style={{ backgroundColor: '#F0F4F8', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 14 }}>{b.tip}</Text>
                        <TouchableOpacity onPress={() => bakimSil(b.id)}>
                          <Text style={{ color: '#FF4444', fontSize: 16 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4 }}>
                        📅 {b.tarihStr || new Date(b.tarih).toLocaleDateString('tr-TR')}
                      </Text>
                      {b.usta ? <Text style={{ color: '#526E7F', fontSize: 12 }}>👤 {b.usta}</Text> : null}
                      {b.tutar ? <Text style={{ color: '#526E7F', fontSize: 12 }}>💰 {b.tutar}</Text> : null}
                      {b.not ? <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>"{b.not}"</Text> : null}
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// HİZMET DÜZENLEME MODALİ
// ============================================================
function HizmetDuzenleModal({ gorunur, setGorunur, hizmet, kullanici, token, onKaydet, s }) {
  const [isim, setIsim] = useState(hizmet.isim || '');
  const [kategori, setKategori] = useState(hizmet.kategori || 'Su Tesisatı');
  const [aciklama, setAciklama] = useState(hizmet.aciklama || '');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const kaydet = async () => {
    if (!isim.trim()) { Alert.alert('Eksik', 'Hizmet adını girin!'); return; }
    setKaydediliyor(true);
    try {
      await fetch(`${DB_URL}/evHizmetleri/${kullanici.uid}/${hizmet.id}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isim: isim.trim(), kategori, aciklama: aciklama.trim() }),
      });
      setGorunur(false);
      await onKaydet();
    } catch (e) {
      Alert.alert('Hata', 'Güncellenemedi!');
    } finally {
      setKaydediliyor(false);
    }
  };
  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={s.modalBaslik}>Hizmeti Düzenle ✏️</Text>
            <TouchableOpacity onPress={() => setGorunur(false)}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputBaslik}>Hizmet Adı *</Text>
            <TextInput style={s.inp} value={isim} onChangeText={setIsim} placeholder="Hizmet adı..." />
            <Text style={s.inputBaslik}>Kategori</Text>
            <View style={s.chipAlan}>
              {HIZMET_KATEGORILER.map(k => (
                <TouchableOpacity key={k.label} style={[s.chip, kategori === k.label && s.chipAktif]} onPress={() => setKategori(k.label)}>
                  <Text style={[s.chipY, kategori === k.label && s.chipYAktif]}>{k.ikon} {k.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.inputBaslik}>Açıklama</Text>
            <TextInput
              style={[s.inp, { minHeight: 70, textAlignVertical: 'top' }]}
              value={aciklama}
              onChangeText={setAciklama}
              placeholder="Açıklama..."
              multiline
            />
            <TouchableOpacity
              style={[s.girisBtn, { marginTop: 10, marginBottom: 20, opacity: kaydediliyor ? 0.6 : 1 }]}
              onPress={kaydet} disabled={kaydediliyor}
            >
              <Text style={s.anaBtnY}>{kaydediliyor ? 'Kaydediliyor...' : '💾 GÜNCELLE'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
