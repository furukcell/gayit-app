// ============================================================
// EvimEkrani.js
// Ev eşyası takip sistemi
// 200 TL (premium) → Manuel takip
// 400 TL (vip)     → AI Analiz (Çok Yakında)
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Modal, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DB_URL } from '../constants';

// ============================================================
// SABİT KATEGORİLER
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
// ANA EKRAN
// ============================================================
export function EvimEkrani({ kullanici, token, setEkran, s }) {
  const [esyalar, setEsyalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ekleModalAcik, setEkleModalAcik] = useState(false);
  const [detayModalAcik, setDetayModalAcik] = useState(false);
  const [secilenEsya, setSecilenEsya] = useState(null);
  const [secilenKategori, setSecilenKategori] = useState('Tümü');
  const [raporModalAcik, setRaporModalAcik] = useState(false);
  const [gecmisRaporlar, setGecmisRaporlar] = useState([]);
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);

  // Abonelik kontrolü — hem usta hem müşteri için çalışır
  const abonelik = kullanici?.abonelik || kullanici?.paket || '';
  const isVip = abonelik === 'vip';
  const isPremium = abonelik === 'premium' || isVip;

  useEffect(() => {
  if (token) {
    esyalariYukle();
    if (isVip) gecmisRaporlariYukle();
  }
}, [token]);

  const esyalariYukle = async () => {
    setYukleniyor(true);
    try {
      const res = await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}.json?auth=${token}`);
      const data = await res.json();
      if (data) {
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

  const gecmisRaporlariYukle = async () => {
    setRaporYukleniyor(true);
    try {
      const res = await fetch(`${DB_URL}/evRaporlari/${kullanici.uid}.json?auth=${token}`);
      const data = await res.json();
      if (data) {
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

  const filtrelenmis = secilenKategori === 'Tümü'
    ? esyalar
    : esyalar.filter(e => e.kategori === secilenKategori);

  const esyaSil = (esya) => {
    const silmeIslemi = async () => {
      try {
        await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}.json?auth=${token}`, {
          method: 'DELETE',
        });
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

  return (
    <SafeAreaView style={s.con}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>🏡 Evim</Text>
        <TouchableOpacity
          onPress={() => setEkleModalAcik(true)}
          style={{ padding: 5 }}
        >
          <Text style={{ fontSize: 26, color: '#1B4965' }}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* AI BANNER — PREMIUM VE VIP İÇİN YAKINDA */}
      {isPremium ? (
        <TouchableOpacity
          style={{
            margin: 15, marginBottom: 5,
            backgroundColor: isVip ? '#1B4965' : '#526E7F',
            borderRadius: 14, padding: 15,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}
          onPress={() => {
            setRaporModalAcik(true);
            if (isVip) gecmisRaporlariYukle();
          }}
        >
          <Text style={{ fontSize: 28 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
              AI Ev Analizi — Çok Yakında!
           </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
              {isVip ? 'Muğla şivesiyle kişisel ev yorumun geliyor 😄' : '400 TL VIP pakette aktif olacak'}
            </Text>
          </View>
          <View style={{ backgroundColor: '#F39C12', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>YAKINDA</Text>
          </View>
        </TouchableOpacity>
      ) : (
  <TouchableOpacity
    style={{ margin: 15, marginBottom: 5, backgroundColor: '#E1F2FE', borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}
    onPress={() => setEkran('odeme')}
  >
    <Text style={{ fontSize: 28 }}>🤖</Text>
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14 }}>AI Ev Analizi — Premium</Text>
      <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 2 }}>200 TL pakette aktif olur 🔒</Text>
    </View>
    <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>Paket Al →</Text>
  </TouchableOpacity>
)}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 50, marginTop: 10 }}
        contentContainerStyle={{ paddingHorizontal: 15, alignItems: 'center', gap: 8 }}
      >
        <TouchableOpacity
          style={[s.chip, secilenKategori === 'Tümü' && s.chipAktif]}
          onPress={() => setSecilenKategori('Tümü')}
        >
          <Text style={[s.chipY, secilenKategori === 'Tümü' && s.chipYAktif]}>Tümü</Text>
        </TouchableOpacity>
        {ESYA_KATEGORILER.map(k => (
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

      {/* ÖZET KUTU */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 15, marginTop: 12, marginBottom: 5,
        backgroundColor: '#E1F2FE', borderRadius: 12, padding: 12, gap: 10,
      }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1B4965' }}>{esyalar.length}</Text>
          <Text style={{ color: '#526E7F', fontSize: 11 }}>Kayıtlı Eşya</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#B0D4E8' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#F39C12' }}>
            {esyalar.filter(e => {
              const g = garantiDurumu(e.alisTarihi, e.garantiYil);
              return g?.durum === 'yaklasıyor';
            }).length}
          </Text>
          <Text style={{ color: '#526E7F', fontSize: 11 }}>Garanti Yaklaşıyor</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#B0D4E8' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FF4444' }}>
            {esyalar.filter(e => {
              const g = garantiDurumu(e.alisTarihi, e.garantiYil);
              return g?.durum === 'bitti';
            }).length}
          </Text>
          <Text style={{ color: '#526E7F', fontSize: 11 }}>Garanti Bitti</Text>
        </View>
      </View>

      {/* EŞYA LİSTESİ */}
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 30 }}>
        {yukleniyor ? (
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 40 }}>
            Yükleniyor...
          </Text>
        ) : filtrelenmis.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏡</Text>
            <Text style={{ color: '#A3B1B9', textAlign: 'center', fontSize: 14 }}>
              Henüz eşya eklemediniz.{'\n'}Sağ üstteki + butonuna basın!
            </Text>
          </View>
        ) : (
          filtrelenmis.map(esya => {
            const garanti = garantiDurumu(esya.alisTarihi, esya.garantiYil);
            const yas = esyaYasi(esya.alisTarihi);
            const kategoriIkon = ESYA_KATEGORILER.find(k => k.label === esya.kategori)?.ikon || '📦';

            return (
              <TouchableOpacity
                key={esya.id}
                style={[s.kart, {
                  borderLeftWidth: 4,
                  borderLeftColor: garanti?.renk || '#D1D9E0',
                }]}
                onPress={() => { setSecilenEsya(esya); setDetayModalAcik(true); }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 18 }}>{kategoriIkon}</Text>
                      <Text style={[s.kategoriBadge]}>{esya.kategori}</Text>
                    </View>
                    <Text style={s.kartBaslik}>{esya.isim}</Text>
                    {esya.marka ? (
                      <Text style={s.kartAlt}>🏷️ {esya.marka}</Text>
                    ) : null}
                    {yas ? (
                      <Text style={s.kartAlt}>📅 {yas}</Text>
                    ) : null}
                  </View>
                  {garanti ? (
                    <View style={{
                      backgroundColor: garanti.renk + '22',
                      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
                      alignItems: 'center',
                    }}>
                      <Text style={{ color: garanti.renk, fontSize: 10, fontWeight: 'bold' }}>GARANTİ</Text>
                      <Text style={{ color: garanti.renk, fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>
                        {garanti.durum === 'bitti' ? '❌ Bitti' : `✅ ${garanti.metin}`}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Notlar özeti */}
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
        )}
      </ScrollView>

      {/* EŞYA EKLEME MODALİ */}
      <EsyaEkleModal
        gorunur={ekleModalAcik}
        setGorunur={setEkleModalAcik}
        kullanici={kullanici}
        token={token}
        onKaydet={esyalariYukle}
        s={s}
      />

      {/* DETAY MODALİ */}
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

      {/* RAPOR MODALİ */}
      <RaporModal
        gorunur={raporModalAcik}
        setGorunur={setRaporModalAcik}
        raporlar={gecmisRaporlar}
        yukleniyor={raporYukleniyor}
        isVip={isVip}
        s={s}
      />

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
          {/* Başlık */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B4965' }}>
              🤖 AI Ev Analizi
            </Text>
            <TouchableOpacity onPress={() => setGorunur(false)}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Yakında Banner */}
          <View style={{
            backgroundColor: '#FFF8E7',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#F39C12',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🚀</Text>
            <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 15, textAlign: 'center', marginBottom: 6 }}>
              Çok Yakında Geliyor!
            </Text>
            <Text style={{ color: '#526E7F', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Evinizin tüm eşyalarını analiz edip bakım zamanlarını, garanti durumlarını ve önerilerini size özel rapor halinde sunacağız.
            </Text>
            {!isVip ? (
              <View style={{ marginTop: 12, backgroundColor: '#1B4965', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, textAlign: 'center' }}>
                  🚀 400 TL VIP pakete geçerek bu özelliği kullan
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 12, backgroundColor: '#F39C12', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>
                  📦 Eşyalarınızı şimdiden kaydedin, hazır olsun!
                </Text>
              </View>
            )}
          </View>

          {/* Geçmiş Raporlar — sadece VIP */}
          {isVip ? (
            <>
              <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>
                📋 Geçmiş Raporlar
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {yukleniyor ? (
                  <Text style={{ color: '#A3B1B9', textAlign: 'center', marginVertical: 20 }}>
                    Yükleniyor...
                  </Text>
                ) : raporlar.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 13, textAlign: 'center' }}>
                      Henüz rapor bulunmuyor.{'\n'}Özellik aktif olduğunda raporlarınız burada görünecek.
                    </Text>
                  </View>
                ) : (
                  raporlar.map(rapor => (
                    <View
                      key={rapor.id}
                      style={{
                        backgroundColor: '#F0F4F8',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 10,
                        borderLeftWidth: 3,
                        borderLeftColor: '#1B4965',
                      }}
                    >
                      <Text style={{ color: '#A3B1B9', fontSize: 11, marginBottom: 6 }}>
                        📅 {new Date(rapor.tarih).toLocaleDateString('tr-TR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </Text>
                      <Text style={{ color: '#1B4965', fontSize: 13, lineHeight: 20 }}>
                        {rapor.rapor}
                      </Text>
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
  const [takvimAcik, setTakvimAcik] = useState(false);
  const [takvimDegeri, setTakvimDegeri] = useState(new Date());
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const temizle = () => {
    setIsim(''); setMarka(''); setKategori('Beyaz Eşya');
    setGarantiYil(''); setAlisTarihi('');
  };

  const kaydet = async () => {
    if (!isim.trim()) {
      Alert.alert('Eksik', 'Eşya adını girin!');
      return;
    }
    setKaydediliyor(true);
    try {
      await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isim: isim.trim(),
          marka: marka.trim(),
          kategori,
          garantiYil: garantiYil ? parseInt(garantiYil) : null,
          alisTarihi: alisTarihi || null,
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
            <Text style={s.modalBaslik}>Eşya Ekle</Text>
            <TouchableOpacity onPress={() => { temizle(); setGorunur(false); }}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputBaslik}>Eşya Adı *</Text>
            <TextInput
              style={s.inp}
              placeholder="Örn: Buzdolabı, Çatı, Lavabo, Kombi..."
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
            {Platform.OS === 'web' ? (
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%', padding: 14, borderRadius: 12,
                  border: '1px solid #E8E8E0', fontSize: 15,
                  color: '#1B4965', backgroundColor: '#FFF', marginBottom: 12,
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setAlisTarihi(e.target.value)}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={[s.inp, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  onPress={() => setTakvimAcik(true)}
                >
                  <Text style={{ color: alisTarihi ? '#1B4965' : '#A3B1B9', fontSize: 15 }}>
                    {alisTarihi || 'Tarih seçin...'}
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
                        setAlisTarihi(date.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
              </>
            )}

            <Text style={s.inputBaslik}>Garanti Süresi (Yıl)</Text>
            <TextInput
              style={s.inp}
              placeholder="Örn: 2"
              value={garantiYil}
              onChangeText={setGarantiYil}
              keyboardType="numeric"
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
function EsyaDetayModal({ gorunur, setGorunur, esya, setSecilenEsya, kullanici, token, onGuncelle, onSil, s }) {
  const [yeniNot, setYeniNot] = useState('');
  const [notEkleniyor, setNotEkleniyor] = useState(false);
  const [duzenlenecekNot, setDuzenlenecekNot] = useState(null);

  const garanti = garantiDurumu(esya.alisTarihi, esya.garantiYil);
  const yas = esyaYasi(esya.alisTarihi);
  const kategoriIkon = ESYA_KATEGORILER.find(k => k.label === esya.kategori)?.ikon || '📦';

  const notlar = esya.notlar
    ? Object.keys(esya.notlar)
        .map(key => ({ id: key, ...esya.notlar[key] }))
        .sort((a, b) => b.tarih - a.tarih)
    : [];

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
    await onGuncelle();
    const res = await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}.json?auth=${token}`);
    const data = await res.json();
    if (data) setSecilenEsya({ id: esya.id, ...data });
  } catch (e) {
    Alert.alert('Hata', 'İşlem başarısız!');
  } finally {
    setNotEkleniyor(false);
  }
};

  const notSil = async (notId) => {
    try {
      await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}/notlar/${notId}.json?auth=${token}`, {
        method: 'DELETE',
      });
      await onGuncelle();
      const res = await fetch(`${DB_URL}/evEsyalari/${kullanici.uid}/${esya.id}.json?auth=${token}`);
      const data = await res.json();
      if (data) setSecilenEsya({ id: esya.id, ...data });
    } catch (e) {
      Alert.alert('Hata', 'Not silinemedi!');
   }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalKutu, { maxHeight: '90%' }]}>
          {/* Başlık */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B4965' }}>
              {kategoriIkon} {esya.isim}
            </Text>
            <TouchableOpacity onPress={() => setGorunur(false)}>
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Bilgi Kartı */}
            <View style={{ backgroundColor: '#F0F4F8', borderRadius: 14, padding: 14, marginBottom: 16 }}>
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

            {/* Notlar */}
            <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>
              📝 Notlar & Tamir Geçmişi
            </Text>

            {/* Not Ekle */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                style={[s.inp, { flex: 1, marginBottom: 0 }]}
                placeholder="Not ekle... (tamir, değişiklik, bakım...)"
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
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                  {notEkleniyor ? '...' : '➤'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Not Listesi */}
            {notlar.length === 0 ? (
              <Text style={{ color: '#A3B1B9', fontSize: 13, textAlign: 'center', marginVertical: 10 }}>
                Henüz not yok.
              </Text>
            ) : (
             notlar.map(not => (
  <TouchableOpacity
    key={not.id}
    style={{
      backgroundColor: '#FFF',
      borderRadius: 10, padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3, borderLeftColor: '#1B4965',
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    }}
    onLongPress={() => {
      Alert.alert('Not', not.metin, [
        { text: 'Düzenle ✏️', onPress: () => { setDuzenlenecekNot(not); setYeniNot(not.metin); }},
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
              ))
            )}

            {/* Sil Butonu */}
            <TouchableOpacity
              style={{ marginTop: 20, marginBottom: 30, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FF4444', alignItems: 'center' }}
              onPress={() => onSil(esya)}
            >
              <Text style={{ color: '#FF4444', fontWeight: 'bold' }}>🗑️ Eşyayı Sil</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

}
