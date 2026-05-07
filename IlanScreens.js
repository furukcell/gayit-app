// ============================================================
// ADIM 6 — IlanScreens.js
// İlan Ver, İlanlarım/Tekliflerim, Teklif Ver, Teklifler ekranları
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Switch, Platform, Modal, FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DB_URL, BOLGELER, YENI_ILAN_KATEGORILER, tarihHesapla, ILCE_MAHALLELER } from './constants';
import { bildirimGonderVeKaydet } from './notifications';

// ============================================================
// İLAN VER EKRANI
// ============================================================
export function IlanVerEkrani({ kullanici, token, ilanlar, setEkran, onVeriYukle, s }) {
  const [ilanKategori, setIlanKategori] = useState('Tesisat (Sucu)');
  const [ilanBaslik, setIlanBaslik] = useState('');
  const [ilanDetay, setIlanDetay] = useState('');
  const [ilanIlce, setIlanIlce] = useState('');
  const [ilanMahalle, setIlanMahalle] = useState('');
  const [mahalleModalAcik, setMahalleModalAcik] = useState(false);
  const [ilanAcil, setIlanAcil] = useState(false);
  const [isTarihiTip, setIsTarihiTip] = useState('Bugün');
  const [ozelTarih, setOzelTarih] = useState('');
  const [takvimAcik, setTakvimAcik] = useState(false);
  const [takvimDegeri, setTakvimDegeri] = useState(new Date());

  const ilanOlustur = async () => {
    if (!ilanBaslik || !ilanDetay || !ilanIlce || !ilanMahalle) {
      Alert.alert('Eksik Bilgi', 'Usta, lütfen tüm alanları doldur gari!');
      return;
    }
    if (isTarihiTip === 'İleri' && !ozelTarih) {
      Alert.alert('Eksik Bilgi', 'İşin yapılacağı tarihi tam olarak seçmedin usta!');
      return;
    }

    const aktifAyniKategoriIlan = ilanlar.find(
      i => i.sahip === kullanici.email && i.kategori === ilanKategori && !i.anlasmaVar
    );
    if (aktifAyniKategoriIlan) {
      Alert.alert('Hata', 'Bu kategoride zaten aktif bir ilanınız var gari!');
      return;
    }

    const hakVar = kullanici?.abonelik || kullanici?.yeniKullaniciHakki > 0 || kullanici?.hak > 0;
    if (!hakVar && !ilanAcil) {
      setEkran('odeme');
      return;
    }
    if (ilanAcil && !kullanici?.abonelik) {
      Alert.alert('Acil İlan', 'Acil ilan ücreti 50 TL\'dir. Ödeme ekranına yönlendiriliyorsun usta.');
      setEkran('odeme');
      return;
    }

    // tarihHesapla ile tarih sorununu çözdük
    const kaydedilecekTarih = tarihHesapla(isTarihiTip, ozelTarih);

    const yeniIlan = {
      baslik: ilanBaslik,
      kategori: ilanKategori,
      bolge: ilanIlce,
      mahalle: ilanMahalle,
      detay: ilanDetay,
      isTarihi: kaydedilecekTarih,
      acil: ilanAcil,
      sahip: kullanici.email,
      sahipUid: kullanici.uid,
      anlasmaVar: false,
      teklifler: [],
      tarih: Date.now(),
    };

    try {
      await fetch(`${DB_URL}/ilanlar.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniIlan),
      });

      // Hak eksilt
      if (!kullanici?.abonelik) {
        let gYH = kullanici?.yeniKullaniciHakki || 0;
        let gH = kullanici?.hak || 0;
        if (gYH > 0) gYH -= 1;
        else if (gH > 0) gH -= 1;

        if (token) {
          await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH }),
          });
        }
      }

      await onVeriYukle();
      Alert.alert('Başarılı! 🎉', `İlanınız ${ilanAcil ? 'ACİL olarak ' : ''}yayınlandı usta!`);

      // Aynı kategoride aynı bölgedeki ustalara bildirim gönder
      try {
        const kulRes = await fetch(`${DB_URL}/kullanicilar.json`);
        const kulData = await kulRes.json();
        if (kulData) {
          const hedefUstalar = Object.values(kulData).filter(
            k => k.rol === 'usta' && k.bolge === ilanIlce && k.meslek === ilanKategori && k.uid !== kullanici.uid
          );
          for (const usta of hedefUstalar) {
            await bildirimGonderVeKaydet(
              usta.uid,
              `🔔 Yeni ${ilanKategori} İlanı!`,
              `${ilanIlce} bölgesinde yeni bir iş ilanı var: ${ilanBaslik}`
            );
          }
        }
      } catch (e) {
        console.log('Usta bildirimi gönderilemedi:', e);
      }
      setIlanBaslik('');
      setIlanDetay('');
      setIlanIlce('');
      setIlanMahalle('');
      setIsTarihiTip('Bugün');
      setOzelTarih('');
      setIlanAcil(false);
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'İlan kaydedilemedi gari!');
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Yeni İlan Ver</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.authIc}>

        <Text style={s.inputBaslik}>İlan Kategorisi</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
          {YENI_ILAN_KATEGORILER.map(k => (
            <TouchableOpacity
              key={k}
              onPress={() => setIlanKategori(k)}
              style={[s.chip, ilanKategori === k && s.chipAktif, { marginRight: 8 }]}
            >
              <Text style={[s.chipY, ilanKategori === k && s.chipYAktif]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.inputBaslik}>İlan Başlığı</Text>
        <TextInput
          style={s.inp}
          placeholder="Örn: Banyo Tesisat Yenileme"
          value={ilanBaslik}
          onChangeText={setIlanBaslik}
        />

        <Text style={s.inputBaslik}>Açıklama</Text>
        <TextInput
          style={[s.inp, { height: 100, textAlignVertical: 'top' }]}
          placeholder="İşin detaylarını buraya yazın..."
          value={ilanDetay}
          onChangeText={setIlanDetay}
          multiline
          maxLength={500}
        />

        <Text style={s.inputBaslik}>İlçe</Text>
        <View style={s.chipAlan}>
          {BOLGELER.map(b => (
            <TouchableOpacity
              key={b}
              style={[s.chip, ilanIlce === b && s.chipAktif]}
              onPress={() => { setIlanIlce(b); setIlanMahalle(''); }}
            >
              <Text style={[s.chipY, ilanIlce === b && s.chipYAktif]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.inputBaslik}>Mahalle</Text>
        <TouchableOpacity
          style={[s.inp, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
          onPress={() => {
            if (!ilanIlce) {
              Alert.alert('Önce İlçe Seçin', 'Mahalle seçmeden önce ilçe seçmelisiniz.');
              return;
            }
            setMahalleModalAcik(true);
          }}
        >
          <Text style={{ color: ilanMahalle ? s.inp.color : '#A3B1B9', fontSize: 15 }}>
            {ilanMahalle || 'Mahalle seçin...'}
          </Text>
          <Text style={{ color: '#A3B1B9' }}>▼</Text>
        </TouchableOpacity>

        {/* Mahalle Seçici Modal */}
        <Modal visible={mahalleModalAcik} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965' }}>{ilanIlce} Mahalleleri</Text>
                <TouchableOpacity onPress={() => setMahalleModalAcik(false)}>
                  <Text style={{ color: '#FF4444', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={ILCE_MAHALLELER[ilanIlce] || []}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F0',
                      backgroundColor: ilanMahalle === item ? '#E1F2FE' : '#FFF'
                    }}
                    onPress={() => { setIlanMahalle(item); setMahalleModalAcik(false); }}
                  >
                    <Text style={{ color: ilanMahalle === item ? '#1B4965' : '#526E7F', fontWeight: ilanMahalle === item ? 'bold' : 'normal' }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Text style={s.inputBaslik}>İşin Yapılacağı Tarih</Text>
        <View style={s.chipAlan}>
          <TouchableOpacity
            style={[s.chip, isTarihiTip === 'Bugün' && s.chipAktif]}
            onPress={() => { setIsTarihiTip('Bugün'); setOzelTarih(''); }}
          >
            <Text style={[s.chipY, isTarihiTip === 'Bugün' && s.chipYAktif]}>Bugün</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.chip, isTarihiTip === 'Yarın' && s.chipAktif]}
            onPress={() => { setIsTarihiTip('Yarın'); setOzelTarih(''); }}
          >
            <Text style={[s.chipY, isTarihiTip === 'Yarın' && s.chipYAktif]}>Yarın</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.chip, isTarihiTip === 'İleri' && s.chipAktif]}
            onPress={() => { setIsTarihiTip('İleri'); setTakvimAcik(true); }}
          >
            <Text style={[s.chipY, isTarihiTip === 'İleri' && s.chipYAktif]}>
              {isTarihiTip === 'İleri' && ozelTarih ? ozelTarih : 'İleri Bir Tarih 📅'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAKVİM — Web'de native input, mobilde DateTimePicker */}
        {takvimAcik && (
          Platform.OS === 'web' ? (
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 6 }}>Tarih Seçin</Text>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%', padding: 14, borderRadius: 12,
                  border: '1px solid #E8E8E0', fontSize: 15,
                  color: '#1B4965', backgroundColor: '#FFF',
                }}
                onChange={(e) => {
                  if (e.target.value) {
                    const parcalar = e.target.value.split('-');
                    const trTarih = `${parcalar[2]}.${parcalar[1]}.${parcalar[0]}`;
                    setOzelTarih(trTarih);
                    setTakvimAcik(false);
                  }
                }}
              />
            </View>
          ) : (
            <DateTimePicker
              value={takvimDegeri}
              mode="date"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setTakvimAcik(false);
                if (date) {
                  setTakvimDegeri(date);
                  setOzelTarih(date.toLocaleDateString('tr-TR'));
                }
              }}
            />
          )
        )}

        {/* ACİL İLAN */}
        <View style={[s.onayKutu, { backgroundColor: ilanAcil ? '#FFEBEE' : '#FFF', borderColor: ilanAcil ? '#FF4444' : '#D1D9E0' }]}>
          <Switch
            value={ilanAcil}
            onValueChange={setIlanAcil}
            trackColor={{ false: '#D1D9E0', true: '#FF4444' }}
            thumbColor="#FFF"
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: ilanAcil ? '#FF4444' : '#526E7F', fontWeight: 'bold', fontSize: 14 }}>
              🚨 Bu İlan Acil mi?
            </Text>
            <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 2 }}>
              Acil ilanlar üstte gösterilir (+50 TL)
            </Text>
          </View>
        </View>

        <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={ilanOlustur}>
          <Text style={s.anaBtnY}>İLAN OLUŞTUR VE YAYINLA</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// İLANLARIM / TEKLİFLERİM EKRANI
// ============================================================
export function IlanlarimEkrani({ kullanici, rol, ilanlar, setEkran, setSecilenIlan, ustaTeklifTiklandi, s }) {
  const benimIlanlarim = rol === 'usta'
    ? ilanlar.filter(ilan => ilan.teklifler && ilan.teklifler.some(t => t.ustaId === kullanici?.email))
    : ilanlar.filter(ilan => ilan.sahip === kullanici?.email);

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>{rol === 'usta' ? 'Tekliflerim' : 'İlanlarım'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={s.scroll}>
        {benimIlanlarim.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>
            Henüz kayıt yok usta.
          </Text>
        ) : (
          benimIlanlarim.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[s.kart, item.acil && { borderWidth: 2, borderColor: '#FF4444' }]}
              onPress={() => {
                setSecilenIlan(item);
                rol === 'musteri' ? setEkran('teklifler') : ustaTeklifTiklandi(item);
              }}
            >
              {item.acil && (
                <View style={s.acilRozet}>
                  <Text style={s.acilRozetYazi}>🚨 ACİL</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.kategoriBadge}>{item.kategori}</Text>
              </View>
              <Text style={s.kartBaslik}>{item.baslik}</Text>
              <Text style={s.kartAlt}>📍 {item.mahalle} - {item.bolge}</Text>
              {item.isTarihi && <Text style={s.kartAlt}>📅 {item.isTarihi}</Text>}
              <View style={s.kartIstatistikler}>
                <Text style={s.kartIstatistikMetin}>{item.teklifler?.length || 0} Teklif</Text>
                {item.anlasmaVar && (
                  <Text style={{ color: '#588157', fontWeight: 'bold', marginLeft: 10 }}>✅ ANLAŞMA SAĞLANDI</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// TEKLİF VER EKRANI (USTA)
// ============================================================
export function TeklifVerEkrani({ kullanici, token, secilenIlan, setEkran, onVeriYukle, setKullanici, s }) {
  const [teklifFiyat, setTeklifFiyat] = useState('');
  const [teklifNot, setTeklifNot] = useState('');
  const [gonderildi, setGonderildi] = useState(false);

  // Daha önce teklif verilmiş mi kontrol et
  const mevcutTeklif = secilenIlan?.teklifler?.find(t => t.ustaId === kullanici?.email);
  const revizeModu = !!mevcutTeklif && !secilenIlan?.anlasmaVar;

  // Revize modunda eski fiyatı doldur
  useEffect(() => {
    if (mevcutTeklif) {
      setTeklifFiyat(mevcutTeklif.fiyat?.replace(' TL', '') || '');
      setTeklifNot(mevcutTeklif.not || '');
    }
  }, [secilenIlan?.id]);

  // Usta ilana girince görüntülenme sayacını artır
  useEffect(() => {
    if (secilenIlan?.id && kullanici?.rol === 'usta') {
      fetch(`${DB_URL}/ilanlar/${secilenIlan.id}.json`)
        .then(r => r.json())
        .then(data => {
          const mevcutGoruntur = data?.goruntuleme || 0;
          fetch(`${DB_URL}/ilanlar/${secilenIlan.id}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goruntuleme: mevcutGoruntur + 1 }),
          });
        })
        .catch(() => {});
    }
  }, [secilenIlan?.id]);

  const teklifGonder = async () => {
    if (!teklifFiyat) {
      Alert.alert('Hata', 'Usta, bir fiyat girmelisin gari!');
      return;
    }

    // Aynı fiyatta revize kontrolü
    if (revizeModu && mevcutTeklif?.fiyat === teklifFiyat + ' TL') {
      Alert.alert('Aynı Fiyat', 'Zaten bu fiyatı verdin usta! Değiştirmek istiyorsan farklı bir fiyat gir.');
      return;
    }

    // Hak kontrolü — sadece ilk teklif için hak düş, revizede düşme
    if (!revizeModu && !kullanici?.abonelik) {
      let gYH = kullanici?.yeniKullaniciHakki ?? 0;
      let gH = kullanici?.hak ?? 0;

      if (gYH > 0) gYH -= 1;
      else if (gH > 0) gH -= 1;
      else return Alert.alert('Hata', 'Teklif hakkın kalmamış usta, dükkana uğra gari!');

      setKullanici({ ...kullanici, yeniKullaniciHakki: gYH, hak: gH });

      if (token) {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH }),
        });
      }
    }

    try {
      if (revizeModu) {
        // Mevcut teklifi güncelle (PATCH)
        await fetch(`${DB_URL}/ilanlar/${secilenIlan.id}/teklifler/${mevcutTeklif.id}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fiyat: teklifFiyat + ' TL',
            not: teklifNot,
            revizeTarihi: Date.now(),
          }),
        });

        await bildirimGonderVeKaydet(
          secilenIlan?.sahipUid,
          '🔄 Teklif Revize Edildi!',
          `${kullanici.ad} usta teklifini güncelledi: ${teklifFiyat} TL`
        );
      } else {
        // Yeni teklif (POST)
        await fetch(`${DB_URL}/ilanlar/${secilenIlan.id}/teklifler.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ustaId: kullanici.email,
            ustaUid: kullanici.uid,
            ustaAd: kullanici.ad,
            fiyat: teklifFiyat + ' TL',
            not: teklifNot,
            telefon: kullanici.telefon || 'Numara Yok',
            tarih: Date.now(),
          }),
        });

        await bildirimGonderVeKaydet(
          secilenIlan?.sahipUid,
          '💰 Yeni Teklif!',
          `${kullanici.ad} usta ilanına teklif verdi!`
        );
      }

      await onVeriYukle();
      setGonderildi(true);
      setTimeout(() => { setGonderildi(false); setEkran('anasayfa'); }, 1500);
    } catch (e) {
      Alert.alert('Hata', 'Teklif gönderilemedi gari!');
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>{revizeModu ? '🔄 Teklifi Revize Et' : 'Teklif Ver'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={s.scroll}>
        <View style={[s.kart, secilenIlan?.acil && { borderWidth: 2, borderColor: '#FF4444' }]}>
          {secilenIlan?.acil && (
            <View style={s.acilRozet}>
              <Text style={s.acilRozetYazi}>🚨 ACİL</Text>
            </View>
          )}
          <Text style={s.kategoriBadge}>{secilenIlan?.kategori}</Text>
          <Text style={s.kartBaslik}>{secilenIlan?.baslik}</Text>
          <Text style={s.kartAlt}>📍 {secilenIlan?.mahalle} - {secilenIlan?.bolge}</Text>
          {secilenIlan?.isTarihi && <Text style={s.kartAlt}>📅 {secilenIlan.isTarihi}</Text>}
          <Text style={s.kartAlt}>{secilenIlan?.teklifler?.length || 0} teklif var</Text>
          {secilenIlan?.goruntuleme > 0 && (
            <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 4 }}>
              👁️ {secilenIlan.goruntuleme} usta gördü
            </Text>
          )}
        </View>

        {revizeModu && (
          <View style={{ backgroundColor: '#FFF8E1', padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#F39C12' }}>
            <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 13 }}>
              🔄 Revize Modu
            </Text>
            <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4 }}>
              Mevcut teklifin: {mevcutTeklif?.fiyat}. Değiştirip tekrar gönderebilirsin. Hak düşmez.
            </Text>
          </View>
        )}

        {!revizeModu && (
          <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginBottom: 15 }}>
            <Text style={{ color: '#1B4965', fontSize: 13 }}>
              💡 Fiyatınız sadece müşteri tarafından görülecek.
            </Text>
          </View>
        )}

        <Text style={s.inputBaslik}>Fiyat Teklifiniz (TL)</Text>
        <TextInput
          style={s.inp}
          placeholder="Örn: 500"
          value={teklifFiyat}
          onChangeText={setTeklifFiyat}
          keyboardType="numeric"
        />

        <Text style={s.inputBaslik}>Kısa Not (İsteğe Bağlı)</Text>
        <TextInput
          style={[s.inp, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Örn: Aynı gün gelebilirim..."
          value={teklifNot}
          onChangeText={setTeklifNot}
          multiline
        />

        {gonderildi && (
          <View style={{ backgroundColor: '#588157', borderRadius: 12, padding: 12, marginBottom: 10, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
              {revizeModu ? '🔄 Teklif revize edildi!' : '✅ Teklifin müşteriye uçuruldu!'}
            </Text>
          </View>
        )}

        <TouchableOpacity style={[s.girisBtn, { marginBottom: 40, backgroundColor: revizeModu ? '#F39C12' : '#1B4965' }]} onPress={teklifGonder}>
          <Text style={s.anaBtnY}>{revizeModu ? 'TEKLİFİ REVİZE ET' : 'TEKLİFİ GÖNDER'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// TEKLİFLER EKRANI (MÜŞTERİ)
// ============================================================
export function TekliflerEkrani({
  kullanici, secilenIlan, ilanlar, setEkran,
  setSikayetHedef, setSikayetModalAcik,
  setPuanlananIlan, setPuanModalAcik,
  onVeriYukle, setAktifSohbetTeklif, setAnlasmaSaglandi, setSecilenIlan,
  s
}) {
  const ilan = ilanlar.find(i => i.id === secilenIlan?.id);

  const anlasmaYap = async (ilanId, teklif) => {
    Alert.alert(
      'Anlaşmayı Onayla',
      `${teklif.ustaAd} usta ile ${teklif.fiyat} üzerinden anlaşıyor musun gari?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Anlaş!',
          onPress: async () => {
            try {
              await fetch(`${DB_URL}/ilanlar/${ilanId}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anlasmaVar: true, anlasilanUsta: teklif }),
              });
              await onVeriYukle();
              setAktifSohbetTeklif(teklif);
              setAnlasmaSaglandi(true);
              setSecilenIlan(ilanlar.find(i => i.id === ilanId));

              // Sohbet ekranına geç — artık sohbet üzerinden pazarlık yapılacak
              setEkran('sohbet');

              await bildirimGonderVeKaydet(
                teklif.ustaUid,
                '🤝 Anlaşma Sağlandı!',
                'Müşteri teklifini kabul etti, iş sende usta!'
              );
            } catch (e) {
              Alert.alert('Hata', 'Anlaşma kaydedilemedi!');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Teklifler ({ilan?.teklifler?.length || 0})</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={s.scroll}>
        <View style={[s.kart, { marginBottom: 20 }]}>
          <Text style={s.kartBaslik}>{ilan?.baslik}</Text>
          {ilan?.isTarihi && <Text style={s.kartAlt}>📅 {ilan.isTarihi}</Text>}
          <Text style={s.kartAlt}>{ilan?.anlasmaVar ? '✅ ANLAŞMA SAĞLANDI' : '🟢 Aktif İlan'}</Text>
        </View>

        {ilan?.anlasmaVar && (
          <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 15 }}>
            <Text style={{ color: '#588157', fontWeight: 'bold' }}>
              ✅ Anlaşma sağlandı! Sohbet ekranından iletişime geçebilirsin.
            </Text>
          </View>
        )}

        {(!ilan?.teklifler || ilan?.teklifler.length === 0) ? (
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>
            Henüz teklif gelmedi gari.
          </Text>
        ) : (
          ilan?.teklifler.map(teklif => (
            <View
              key={teklif.id}
              style={[s.kart, ilan.anlasilanUsta?.id === teklif.id && { borderWidth: 2, borderColor: '#588157' }]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965' }}>{teklif.ustaAd}</Text>
                <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#588157' }}>{teklif.fiyat}</Text>
              </View>
              {teklif.not ? <Text style={{ color: '#526E7F', marginTop: 5 }}>{teklif.not}</Text> : null}

              <TouchableOpacity
                onPress={() => { setSikayetHedef(teklif.ustaAd); setSikayetModalAcik(true); }}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: '#FF4444', fontSize: 12 }}>⚠️ Şikayet Et</Text>
              </TouchableOpacity>

              {ilan.anlasilanUsta?.id === teklif.id ? (
                <TouchableOpacity
                  style={[s.girisBtn, { backgroundColor: '#588157', marginTop: 10 }]}
                  onPress={() => {
                    setAktifSohbetTeklif(teklif);
                    setAnlasmaSaglandi(true);
                    setSecilenIlan(ilan);
                    setEkran('sohbet');
                  }}
                >
                  <Text style={s.anaBtnY}>💬 SOHBETE GİT</Text>
                </TouchableOpacity>
              ) : !ilan.anlasmaVar ? (
                <TouchableOpacity
                  style={[s.girisBtn, { marginTop: 10 }]}
                  onPress={() => anlasmaYap(ilan.id, teklif)}
                >
                  <Text style={s.anaBtnY}>🤝 BU USTAYLA ANLAŞ</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.girisBtn, { backgroundColor: '#ccc', marginTop: 10 }]}>
                  <Text style={s.anaBtnY}>Başka Ustayla Anlaşıldı</Text>
                </View>
              )}
            </View>
          ))
        )}

        {ilan?.anlasmaVar && !ilan?.puanlandi && ilan?.sahip === kullanici?.email && (
          <TouchableOpacity
            style={[s.girisBtn, { backgroundColor: '#F39C12', marginTop: 10, marginBottom: 30 }]}
            onPress={() => { setPuanlananIlan(ilan); setPuanModalAcik(true); }}
          >
            <Text style={s.anaBtnY}>⭐ İŞ BİTTİ, USTAYI PUANLA</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
