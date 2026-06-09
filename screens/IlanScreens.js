// ============================================================
// IlanScreens.js — PRODUCTION READY
// İlan Ver, İlanlarım/Tekliflerim, Teklif Ver, Teklifler ekranları
//
// ✅ DÜZELTİLDİ: Puanlama sonrası yeni ilan açılabilme mantığı eklendi
// ✅ DÜZELTİLDİ: Syntax hataları (bod y, te klifler vb.) giderildi
// ============================================================
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Switch, Platform, Modal, FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DB_URL, BOLGELER, YENI_ILAN_KATEGORILER, tarihHesapla } from '../constants';
import { MAHALLE_HIYERARSISI } from '../Mahalleler';
import { bildirimGonderVeKaydet } from '../notifications';
import UstaIstatistikModali, { UstaMiniKart } from './UstaIstatistikModali';

// ============================================================
// İLAN VER EKRANI
// ============================================================
// EKLENDİ: setPuanlananIlan, setPuanModalAcik
export function IlanVerEkrani({ kullanici, token, ilanlar, setEkran, onVeriYukle, setKullanici, s, setPuanlananIlan, setPuanModalAcik }) {
  const [ilanKategori, setIlanKategori] = useState('Tesisat (Sucu)');
  const [ilanBaslik, setIlanBaslik] = useState('');
  const [ilanDetay, setIlanDetay] = useState('');
  const [ilanIlce, setIlanIlce] = useState('');
  const [ilanMahalle, setIlanMahalle] = useState('');
  const [mahalleModalAcik, setMahalleModalAcik] = useState(false);
  const [mahalleGrubu, setMahalleGrubu] = useState('');
  const [asama, setAsama] = useState(1);
  const [ilanAcil, setIlanAcil] = useState(false);
  const [isTarihiTip, setIsTarihiTip] = useState('Bugün');
  const [ozelTarih, setOzelTarih] = useState('');
  const [takvimAcik, setTakvimAcik] = useState(false);
  const [takvimDegeri, setTakvimDegeri] = useState(new Date());

  const handleAcilSwitch = (deger) => {
    if (deger === true) {
      const acilHakVar = kullanici?.abonelik || (kullanici?.acilHak > 0);
      if (!acilHakVar) {
        Alert.alert(
          'Acil İlan Hakkı Yok',
          'İlanınızı ACİL kategorisinde yayınlamak için acil ilan hakkınız bulunmuyor.',
          [
            { text: 'Vazgeç', style: 'cancel', onPress: () => setIlanAcil(false) },
            { text: 'Paket Al', onPress: () => { setIlanAcil(false); setEkran('odeme'); } }
          ]
        );
        return;
      }
    }
    setIlanAcil(deger);
  };

  const ilanOlustur = async () => {
    if (!ilanBaslik || !ilanDetay || !ilanIlce || !ilanMahalle) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldur!');
      return;
    }
    if (isTarihiTip === 'İleri' && !ozelTarih) {
      Alert.alert('Eksik Bilgi', 'İşin yapılacağı tarihi tam olarak seçmedin!');
      return;
    }

    // ---------------------------------------------------------
    // YENİ MANTIK: Aynı kategorideki mevcut ilanı kontrol et
    // ---------------------------------------------------------
    const mevcutIlan = ilanlar.find(
      i => (i.sahip === kullanici.email || i.sahipUid === kullanici.uid) && i.kategori === ilanKategori
    );

    if (mevcutIlan) {
      // 1. Durum: İş tamamlanmış ama henüz PUANLANMAMIŞ
      if (mevcutIlan.isTamamlandi && !mevcutIlan.puanlandi) {
        Alert.alert(
          'Önce Ustayı Puanla!',
          'Bu kategoride işiniz tamamlanmış ancak ustanızı değerlendirmediniz. Lütfen önce puanlama yapın.',
          [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Puanla ⭐',
              onPress: () => {
                setPuanlananIlan(mevcutIlan);
                setPuanModalAcik(true);
              }
            }
          ]
        );
        return;
      }

      // 2. Durum: İş tamamlanmış VE puanlanmış -> YENİ İLAN AÇILABİLİR (Engelleme yok, aşağı iner)
      if (mevcutIlan.isTamamlandi && mevcutIlan.puanlandi) {
        // Devam et
      } 
      // 3. Durum: Hâlâ anlaşma var ama tamamlanmamış
      else if (mevcutIlan.anlasmaVar && !mevcutIlan.isTamamlandi) {
        Alert.alert('Hata', 'Bu kategoride hâlâ devam eden bir işiniz var!');
        return;
      }
      // 4. Durum: Aktif ilan var (beklemede vs.)
      else {
        Alert.alert('Hata', 'Bu kategoride zaten aktif bir ilanınız var!');
        return;
      }
    }
    // ---------------------------------------------------------

    const hakVar = kullanici?.abonelik === 'vip'
    || (kullanici?.abonelik === 'premium' && (kullanici?.hak > 0 || kullanici?.yeniKullaniciHakki > 0))
    || kullanici?.yeniKullaniciHakki > 0
    || kullanici?.hak > 0;
    if (!hakVar && !ilanAcil) { setEkran('odeme'); return; }
    if (ilanAcil && !kullanici?.abonelik && !(kullanici?.acilHak > 0)) { setEkran('odeme'); return; }

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
      await fetch(`${DB_URL}/ilanlar.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniIlan),
      });

      let gYH = kullanici?.yeniKullaniciHakki || 0;
      let gH = kullanici?.hak || 0;
      let gAH = kullanici?.acilHak || 0;

      if (kullanici?.abonelik !== 'vip') {
        if (ilanAcil) { if (gAH > 0) gAH -= 1; }
        else { if (gYH > 0) gYH -= 1; else if (gH > 0) gH -= 1; }

        if (token) {
          await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH, acilHak: gAH }),
          });
        }
        setKullanici({ ...kullanici, yeniKullaniciHakki: gYH, hak: gH, acilHak: gAH });
      }

      setIlanBaslik(''); setIlanDetay(''); setIlanIlce(''); setIlanMahalle('');
      setIsTarihiTip('Bugün'); setOzelTarih(''); setIlanAcil(false);
      Alert.alert('Başarılı! 🎉', `İlanınız ${ilanAcil ? 'ACİL olarak ' : ''}yayınlandı usta!`);
      setEkran('anasayfa');

      onVeriYukle().catch(() => {});

      try {
        const kulRes = await fetch(`${DB_URL}/kullanicilar.json?auth=${token}&orderBy="bolge"&equalTo="${ilanIlce}"`);
        const kulData = await kulRes.json();
        if (kulData) {
          const hedefUstalar = Object.values(kulData).filter(
            k => k.rol === 'usta' && k.meslek === ilanKategori && k.uid !== kullanici.uid
          );
          for (const usta of hedefUstalar) {
            await bildirimGonderVeKaydet(
              usta.uid,
              `🔔 Yeni ${ilanKategori} İlanı!`,
              `${ilanIlce} bölgesinde yeni bir iş ilanı var: ${ilanBaslik}`, token, 'anasayfa'
            );
          }
        }
      } catch (e) { console.log('Usta bildirimi gönderilemedi:', e); }
    } catch (e) {
      Alert.alert('Hata', 'İlan kaydedilemedi!');
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
        <TextInput style={s.inp} placeholder="Örn: Banyo Tesisat Yenileme" value={ilanBaslik} onChangeText={setIlanBaslik} />

        <Text style={s.inputBaslik}>Açıklama</Text>
        <TextInput
          style={[s.inp, { height: 100, textAlignVertical: 'top' }]}
          placeholder="İşin detaylarını buraya yazın..."
          value={ilanDetay} onChangeText={setIlanDetay} multiline maxLength={500}
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
            if (!ilanIlce) { Alert.alert('Önce İlçe Seçin', 'Mahalle seçmeden önce ilçe seçmelisiniz.'); return; }
            setMahalleModalAcik(true);
          }}
        >
          <Text style={{ color: ilanMahalle ? s.inp.color : '#A3B1B9', fontSize: 15 }}>
            {ilanMahalle || 'Mahalle seçin...'}
          </Text>
          <Text style={{ color: '#A3B1B9' }}>▼</Text>
        </TouchableOpacity>

        <Modal visible={mahalleModalAcik} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965' }}>{ilanIlce} Mahalleleri</Text>
                <TouchableOpacity onPress={() => setMahalleModalAcik(false)}>
                  <Text style={{ color: '#FF4444', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
              {asama === 1 ? (
                <ScrollView>
                  {Object.keys(MAHALLE_HIYERARSISI[ilanIlce] || {}).map((grup, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{ padding: 20, backgroundColor: '#F0F4F8', marginVertical: 5, borderRadius: 10, alignItems: 'center' }}
                      onPress={() => { setMahalleGrubu(grup); setAsama(2); }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B4965' }}>{grup} ❯</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <FlatList
                  data={MAHALLE_HIYERARSISI[ilanIlce][mahalleGrubu] || []}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F8', backgroundColor: ilanMahalle === item ? '#F3F2FE' : '#FFF' }}
                      onPress={() => { setIlanMahalle(item); setMahalleModalAcik(false); setAsama(1); }}
                    >
                      <Text style={{ color: ilanMahalle === item ? '#1B4965' : '#526E7F', fontWeight: ilanMahalle === item ? 'bold' : 'normal' }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  ListHeaderComponent={() => (
                    <TouchableOpacity onPress={() => setAsama(1)} style={{ padding: 10 }}>
                      <Text style={{ color: '#E67E22', fontWeight: 'bold' }}> Geri Dön</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        <Text style={s.inputBaslik}>İşin Yapılacağı Tarih</Text>
        <View style={s.chipAlan}>
          <TouchableOpacity style={[s.chip, isTarihiTip === 'Bugün' && s.chipAktif]} onPress={() => { setIsTarihiTip('Bugün'); setOzelTarih(''); }}>
            <Text style={[s.chipY, isTarihiTip === 'Bugün' && s.chipYAktif]}>Bugün</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.chip, isTarihiTip === 'Yarın' && s.chipAktif]} onPress={() => { setIsTarihiTip('Yarın'); setOzelTarih(''); }}>
            <Text style={[s.chipY, isTarihiTip === 'Yarın' && s.chipYAktif]}>Yarın</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.chip, isTarihiTip === 'İleri' && s.chipAktif]} onPress={() => { setIsTarihiTip('İleri'); setTakvimAcik(true); }}>
            <Text style={[s.chipY, isTarihiTip === 'İleri' && s.chipYAktif]}>
              {isTarihiTip === 'İleri' && ozelTarih ? ozelTarih : 'İleri Bir Tarih 📅'}
            </Text>
          </TouchableOpacity>
        </View>

        {takvimAcik && (
          Platform.OS === 'web' ? (
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#526E7F', fontSize: 13, marginBottom: 6 }}>Tarih Seçin</Text>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #E8E8E0', fontSize: 15, color: '#1B4965', backgroundColor: '#FFF' }}
                onChange={(e) => {
                  if (e.target.value) {
                    const parcalar = e.target.value.split('-');
                    setOzelTarih(`${parcalar[2]}.${parcalar[1]}.${parcalar[0]}`);
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
                if (date) { setTakvimDegeri(date); setOzelTarih(date.toLocaleDateString('tr-TR')); }
              }}
            />
          )
        )}

        <View style={[s.onayKutu, { backgroundColor: ilanAcil ? '#FFEBEE' : '#FFF', borderColor: ilanAcil ? '#FF4444' : '#D1D9E0' }]}>
          <Switch value={ilanAcil} onValueChange={handleAcilSwitch} trackColor={{ false: '#D1D9E0', true: '#FF4444' }} thumbColor="#FFF" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: ilanAcil ? '#FF4444' : '#526E7F', fontWeight: 'bold', fontSize: 14 }}>
              🚨 İlanınız Acil Kategorisinde Yayınlansın mı?
            </Text>
            <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 2 }}>Acil ilanlar en üstte gösterilir (100 TL)</Text>
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
export function IlanlarimEkrani({ kullanici, token, rol, ilanlar, setEkran, setSecilenIlan, ustaTeklifTiklandi, onVeriYukle, setKullanici, s }) {
  const [istatistikModalUsta, setIstatistikModalUsta] = useState(null);
  
  const benimIlanlarim = rol === 'usta'
    ? ilanlar.filter(ilan => ilan.teklifler && ilan.teklifler.some(t => t.ustaId === kullanici?.email || t.ustaUid === kullanici?.uid))
    : ilanlar.filter(ilan => ilan.sahip === kullanici?.email || ilan.sahipUid === kullanici?.uid);

  const ilanSil = (ilan) => {
    if (ilan.anlasmaVar) {
      if (Platform.OS === 'web') window.alert('Anlaşma sağlanmış ilanı silemezsin usta.');
      else Alert.alert('Silinemez', 'Anlaşma sağlanmış ilanı silemezsin usta.');
      return;
    }
    const silmeIslemi = async () => {
      try {
        await fetch(`${DB_URL}/ilanlar/${ilan.id}.json?auth=${token}`, { method: 'DELETE' });
        await onVeriYukle();
        const teklifler = ilan.teklifler;
        const teklifSayisi = Array.isArray(teklifler)
            ? teklifler.length
            : (teklifler ? Object.keys(teklifler).length : 0);
        if (teklifSayisi === 0) {
          const gYH = kullanici?.yeniKullaniciHakki || 0;
          const gH = kullanici?.hak || 0;
          const yeniHak = gYH > 0 ? { yeniKullaniciHakki: gYH + 1 } : { hak: gH + 1 };
          const res = await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yeniHak),
          });
          if (res.ok) {
            setKullanici({ ...kullanici, ...yeniHak });
            Alert.alert('Silindi', 'İlanın silindi, hakkın iade edildi! 🎁');
          } else {
            Alert.alert('Silindi', 'İlanın silindi.');
          }
        } else {
          Alert.alert('Silindi', 'İlanın silindi.');
        }
      } catch (e) {
        Alert.alert('Hata', 'İlan silinemedi!');
      }
    };
    if (Platform.OS === 'web') {
      const onay = window.confirm(`"${ilan.baslik}" ilanını silmek istediğine emin misin? Bu işlem geri alınamaz.`);
      if (onay) silmeIslemi();
    } else {
      Alert.alert(
        'İlanı Sil',
        `"${ilan.baslik}" ilanını silmek istediğine emin misin? Bu işlem geri alınamaz.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Evet, Sil', style: 'destructive', onPress: silmeIslemi },
        ]
      );
    }
  };

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
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz kayıt yok usta.</Text>
        ) : (
          benimIlanlarim.map(item => (
            <View
              key={item.id}
              style={[s.kart, item.acil && { borderWidth: 2, borderColor: '#FF4444' }]}
            >
              {item.acil && (
                <View style={s.acilRozet}>
                  <Text style={s.acilRozetYazi}>🚨 ACİL</Text>
                </View>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setSecilenIlan(item);
                  rol === 'musteri' ? setEkran('teklifler') : ustaTeklifTiklandi(item);
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.kategoriBadge}>{item.kategori}</Text>
                  {item.anlasmaVar && (
                    <View style={{ backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#588157', fontSize: 11, fontWeight: 'bold' }}>✅ Anlaşma Var</Text>
                    </View>
                  )}
                </View>
                <Text style={s.kartBaslik}>{item.baslik}</Text>
                <Text style={s.kartAlt}> {item.mahalle} - {item.bolge}</Text>
                {item.isTarihi && <Text style={s.kartAlt}> {item.isTarihi}</Text>}
                <View style={s.kartIstatistikler}>
                  <Text style={s.kartIstatistikMetin}>{item.teklifler?.length || 0} Teklif</Text>
                  {rol === 'musteri' && item.goruntuleyen && (
                    <Text style={{ color: '#A3B1B9', fontSize: 12, marginLeft: 10 }}>
                      👁️ {Object.keys(item.goruntuleyen).length} usta gördü
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {rol === 'musteri' && !item.anlasmaVar && (
                <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => ilanSil(item)}
                  >
                    <Text style={{ color: '#FF4444', fontSize: 22 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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

  const mevcutTeklif = secilenIlan?.teklifler?.find(
    t => t.ustaId === kullanici?.email || t.ustaUid === kullanici?.uid
  );
  const revizeModu = !!mevcutTeklif && !secilenIlan?.anlasmaVar;

  useEffect(() => {
    if (mevcutTeklif) {
      setTeklifFiyat(mevcutTeklif.fiyat?.replace(' TL', '') || '');
      setTeklifNot(mevcutTeklif.not || '');
    }
  }, [secilenIlan?.id]);

  useEffect(() => {
    if (secilenIlan?.id && kullanici?.uid && token) {
      fetch(`${DB_URL}/ilanlar/${secilenIlan.id}/goruntuleyen/${kullanici.uid}.json?auth=${token}`)
        .then(r => r.json())
        .then(data => {
          if (!data) {
            fetch(`${DB_URL}/ilanlar/${secilenIlan.id}/goruntuleyen/${kullanici.uid}.json?auth=${token}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(true),
            });
          }
        }).catch(() => {});
    }
  }, [secilenIlan?.id, token]);

  const teklifGonder = async () => {
    if (!teklifFiyat || teklifFiyat.trim() === '') {
      Alert.alert('Hata', 'Usta, bir fiyat girmelisin gari!');
      return;
    }
    const girilenFiyatSayi = parseFloat(teklifFiyat.replace(',', '.')).toString();
    const eskiFiyatSayi = mevcutTeklif?.fiyat
      ? parseFloat(mevcutTeklif.fiyat.replace(' TL', '').replace(',', '.')).toString()
      : null;

    if (mevcutTeklif && girilenFiyatSayi === eskiFiyatSayi) {
      Alert.alert('Aynı Fiyat!', 'Zaten bu fiyatı (' + mevcutTeklif.fiyat + ') verdin usta! Farklı bir fiyat girerek teklifini güncelle.');
      return;
    }

    if (!revizeModu && kullanici?.abonelik !== 'vip') {
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
        await fetch(`${DB_URL}/ilanlar/${secilenIlan.id}/teklifler/${mevcutTeklif.id}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fiyat: teklifFiyat + ' TL', not: teklifNot, revizeTarihi: Date.now() }),
        });
        await bildirimGonderVeKaydet(secilenIlan?.sahipUid, '🔄 Teklif Revize Edildi!', `${kullanici.ad} usta teklifini güncelledi: ${teklifFiyat} TL`, token, 'teklifler');
      } else {
        await fetch(`${DB_URL}/ilanlar/${secilenIlan.id}/teklifler.json?auth=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ustaId: kullanici.email, ustaUid: kullanici.uid, ustaAd: kullanici.ad, kurucuUsta: kullanici?.kurucuUsta || false,
            fiyat: teklifFiyat + ' TL', not: teklifNot,
            telefon: kullanici.telefon || 'Numara Yok', tarih: Date.now(),
          }),
        });
        await bildirimGonderVeKaydet(secilenIlan?.sahipUid, ' Yeni Teklif!', `${kullanici.ad} usta ilanına teklif verdi!`, token, 'teklifler');

        try {
          const ilanTarihi = secilenIlan?.tarih || Date.now();
          const yanitSuresiMs = Date.now() - ilanTarihi;
          const istSnap = await fetch(`${DB_URL}/istatistikler/${kullanici.uid}.json?auth=${token}`).then(r => r.json()) || {};
          const eskiToplam = (istSnap.ortalamaYanitSuresiDk || 0) * (istSnap.toplamTeklif || 0);
          const yeniTeklif = (istSnap.toplamTeklif || 0) + 1;
          await fetch(`${DB_URL}/istatistikler/${kullanici.uid}.json?auth=${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toplamTeklif: yeniTeklif,
              ortalamaYanitSuresiDk: (eskiToplam + (yanitSuresiMs / 60000)) / yeniTeklif,
              sonGuncelleme: Date.now(),
            }),
          });
        } catch (e) { console.log('istatistik hatası:', e); }
      }
      await onVeriYukle();
      setGonderildi(true);
      setTimeout(() => { setGonderildi(false); setEkran('anasayfa'); }, 1500);
    } catch (e) {
      Alert.alert('Hata', 'Teklif gönderilemedi!');
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
          {secilenIlan?.acil && <View style={s.acilRozet}> <Text style={s.acilRozetYazi}>🚨 ACİL</Text> </View>}
          <Text style={s.kategoriBadge}>{secilenIlan?.kategori}</Text>
          <Text style={s.kartBaslik}>{secilenIlan?.baslik}</Text>
          <View style={{ backgroundColor: '#F0F4F8', padding: 12, borderRadius: 10, marginVertical: 10, borderLeftWidth: 4, borderLeftColor: '#1B4965' }}>
            <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>İŞİN DETAYI:</Text>
            <Text style={{ color: '#526E7F', fontSize: 14, lineHeight: 20 }}>{secilenIlan?.detay || 'Detay belirtilmemiş.'}</Text>
          </View>
          <Text style={s.kartAlt}>📍 {secilenIlan?.mahalle} - {secilenIlan?.bolge}</Text>
          {secilenIlan?.isTarihi && <Text style={s.kartAlt}> {secilenIlan.isTarihi}</Text>}
          <Text style={s.kartAlt}>{secilenIlan?.teklifler?.length || 0} teklif var</Text>
          {secilenIlan?.goruntuleyen && (
            <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 4 }}>
              👁️ {Object.keys(secilenIlan.goruntuleyen).length} usta gördü
            </Text>
          )}
        </View>

        {revizeModu && (
          <View style={{ backgroundColor: '#FFF8E1', padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#F39C12' }}>
            <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 13 }}>🔄 Revize Modu</Text>
            <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4 }}>Mevcut teklifin: {mevcutTeklif?.fiyat}. Değiştirip tekrar gönderebilirsin. Hak düşmez.</Text>
          </View>
        )}

        {!revizeModu && (
          <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginBottom: 15 }}>
            <Text style={{ color: '#1B4965', fontSize: 13 }}>💡 Fiyatınız sadece müşteri tarafından görülecek.</Text>
          </View>
        )}

        <Text style={s.inputBaslik}>Fiyat Teklifiniz (TL)</Text>
        <TextInput style={s.inp} placeholder="Örn: 500" value={teklifFiyat} onChangeText={setTeklifFiyat} keyboardType="numeric" />

        <Text style={s.inputBaslik}>Kısa Not (İsteğe Bağlı)</Text>
        <TextInput
          style={[s.inp, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Örn: Aynı gün gelebilirim..."
          value={teklifNot} onChangeText={setTeklifNot} multiline
        />

        {gonderildi && (
          <View style={{ backgroundColor: '#588157', borderRadius: 12, padding: 12, marginBottom: 10, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
              {revizeModu ? ' Teklif revize edildi!' : '✅ Teklifin müşteriye uçuruldu!'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.girisBtn, { marginBottom: 40, backgroundColor: revizeModu ? '#F39C12' : '#1B4965' }]}
          onPress={teklifGonder}
        >
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
  kullanici, secilenIlan, ilanlar, token, setEkran,
  setSikayetHedef, setSikayetModalAcik,
  setPuanlananIlan, setPuanModalAcik,
  onVeriYukle, setAktifSohbetTeklif, setAnlasmaSaglandi, setSecilenIlan,
  s
}) {
  const ilan = ilanlar.find(i => i.id === secilenIlan?.id);
  const [istatistikModalUsta, setIstatistikModalUsta] = useState(null);
  const [ustaProfil, setUstaProfil] = useState(null);
  const [ustaProfilModalAcik, setUstaProfilModalAcik] = useState(false);
  const [ustaProfilYukleniyor, setUstaProfilYukleniyor] = useState(false);

  if (!ilan || (ilan.sahip !== kullanici?.email && ilan.sahipUid !== kullanici?.uid)) {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
            <Text style={s.menuSimge}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerBaslik}>Teklifler</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}></Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B4965', textAlign: 'center', marginBottom: 8 }}>
            Bu İlana Erişim Yok
          </Text>
          <Text style={{ color: '#A3B1B9', textAlign: 'center', fontSize: 14 }}>
            Teklifleri sadece ilan sahibi görebilir.
          </Text>
          <TouchableOpacity style={[s.girisBtn, { marginTop: 24 }]} onPress={() => setEkran('anasayfa')}>
            <Text style={s.anaBtnY}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ustaProfilGoster = async (ustaUid, ustaAd) => {
    setUstaProfilYukleniyor(true);
    setUstaProfilModalAcik(true);
    try {
      const res = await fetch(`${DB_URL}/kullanicilar/${ustaUid}.json?auth=${token}`);
      const data = await res.json();
      if (data) {
        setUstaProfil({ ...data, ad: ustaAd });
      } else {
        setUstaProfil({ ad: ustaAd, meslek: '—', bolge: '—', puan: null, puanSayisi: 0 });
      }
    } catch (e) {
      setUstaProfil({ ad: ustaAd, meslek: '—', bolge: '—', puan: null, puanSayisi: 0 });
    } finally {
      setUstaProfilYukleniyor(false);
    }
  };

  const sohbetiBaslat = async (teklif, anlasmaDurumu) => {
    const ustaUid = teklif.ustaUid || teklif.ustaId;
    if (!ustaUid) return;
    const sohbetId = `${ilan.id}_${ustaUid.replace(/[.@]/g, '_')}`;
    try {
      await fetch(`${DB_URL}/sohbetler/${sohbetId}/katilimcilar.json?auth=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musteriUid: ilan.sahipUid,
          ustaUid: ustaUid,
        }),
      });
      const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}&orderBy="tarih"&limitToLast=1`);
      const mevcutData = await res.json();

      if (!mevcutData || Object.keys(mevcutData).length === 0) {
        await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metin: '💬 Sohbet başlatıldı.',
            gonderen: kullanici.uid,
            gonderenAd: kullanici.ad,
            tarih: Date.now(),
            durum: 'iletildi',
            tip: 'sistem',
          }),
        });

        await bildirimGonderVeKaydet(
          ustaUid,
          ` ${kullanici.ad} sohbet başlattı!`,
          `${ilan.baslik} ilanı için mesajlaşmak istiyor.`, token, 'sohbetlerim'
        );
      }
    } catch (e) {
      console.log('Sohbet node oluşturulamadı:', e);
      Alert.alert('Hata', 'Sohbet başlatılamadı: ' + e.message);
    }

    setAktifSohbetTeklif(teklif);
    setAnlasmaSaglandi(anlasmaDurumu);
    setSecilenIlan(ilan);
    setEkran('sohbet');
  };

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
              const kapanmaTarihi = Date.now() + 24 * 60 * 60 * 1000;
              await fetch(`${DB_URL}/ilanlar/${ilanId}.json?auth=${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  anlasmaVar: true,
                  anlasilanUsta: { ...teklif, id: teklif.id },
                  kapanmaTarihi,
                }),
              });
              await onVeriYukle();
              await sohbetiBaslat(teklif, true);
              try {
                const ustaUid = teklif.ustaUid || teklif.ustaId;
                const istSnap = await fetch(`${DB_URL}/istatistikler/${ustaUid}.json?auth=${token}`).then(r => r.json()) || {};
                await fetch(`${DB_URL}/istatistikler/${ustaUid}.json?auth=${token}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    toplamIs: (istSnap.toplamIs || 0) + 1,
                    sonGuncelleme: Date.now(),
                  }),
                });
              } catch (e) { console.log('istatistik hatası:', e); }

              await bildirimGonderVeKaydet(
                teklif.ustaUid,
                ' Anlaşma Sağlandı!',
                'Müşteri teklifini kabul etti, iş sende usta!', token, 'sohbetlerim');
            } catch (e) {
              Alert.alert('Hata', 'Anlaşma kaydedilemedi!');
            }
          },
        },
      ]
    );
  };

  const anlasilanUstaMi = (teklif) => {
    if (!ilan.anlasilanUsta) return false;
    const anlasilanUid = ilan.anlasilanUsta.ustaUid || ilan.anlasilanUsta.ustaId;
    const teklifUid = teklif.ustaUid || teklif.ustaId;
    return ilan.anlasilanUsta.id === teklif.id || anlasilanUid === teklifUid;
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
          <View style={{ backgroundColor: '#F0F9F0', padding: 12, borderRadius: 10, marginVertical: 10, borderLeftWidth: 4, borderLeftColor: '#588157' }}>
            <Text style={{ color: '#588157', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>İLAN AÇIKLAMANIZ:</Text>
            <Text style={{ color: '#526E7F', fontSize: 14, lineHeight: 20 }}>{ilan?.detay || 'Açıklama belirtilmemiş.'}</Text>
          </View>
          {ilan?.isTarihi && <Text style={s.kartAlt}>📅 {ilan.isTarihi}</Text>}
          <Text style={s.kartAlt}>{ilan?.anlasmaVar ? '✅ ANLAŞMA SAĞLANDI' : '🟢 Aktif İlan'}</Text>
          {ilan?.goruntuleyen && (
            <Text style={{ color: '#A3B1B9', fontSize: 12, marginTop: 4 }}>
              👁️ {Object.keys(ilan.goruntuleyen).length} usta gördü
            </Text>
          )}
        </View>

        {ilan?.anlasmaVar && (
          <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 15 }}>
            <Text style={{ color: '#588157', fontWeight: 'bold' }}>✅ Anlaşma sağlandı! Sohbet ekranından iletişime geçebilirsin.</Text>
          </View>
        )}

        {(!ilan?.teklifler || ilan?.teklifler.length === 0) ? (
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz teklif gelmedi gari.</Text>
        ) : (
          ilan?.teklifler.map(teklif => (
            <View
              key={teklif.id}
              style={[s.kart,
                anlasilanUstaMi(teklif) && { borderWidth: 2, borderColor: '#588157' },
                ilan.anlasmaVar && !anlasilanUstaMi(teklif) && { opacity: 0.5 }
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => ustaProfilGoster(teklif.ustaUid, teklif.ustaAd)}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', textDecorationLine: 'underline' }}>
                    {teklif.ustaAd} 👤
                      {teklif.kurucuUsta ? ' 🏅' : ''}
                  </Text>
                </TouchableOpacity>
                <UstaMiniKart
                  ustaId={teklif.ustaUid}
                  ustaAd={teklif.ustaAd}
                  abonelikTipi={kullanici?.abonelik}
                  onPress={() => setIstatistikModalUsta({ id: teklif.ustaUid, ad: teklif.ustaAd })}
                />
                <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#588157' }}>{teklif.fiyat}</Text>
              </View>

              {teklif.not ? (
                <View style={{ backgroundColor: '#F5F5F0', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <Text style={{ color: '#526E7F', fontSize: 13 }}>💬 {teklif.not}</Text>
                </View>
              ) : null}

              {teklif.revizeTarihi ? <Text style={{ color: '#F39C12', fontSize: 11, marginTop: 4 }}>🔄 Revize edildi</Text> : null}

              <TouchableOpacity onPress={() => { setSikayetHedef(teklif.ustaAd); setSikayetModalAcik(true); }} style={{ marginTop: 8 }}>
                <Text style={{ color: '#FF4444', fontSize: 12 }}>⚠️ Şikayet Et</Text>
              </TouchableOpacity>

              {anlasilanUstaMi(teklif) ? (
                <TouchableOpacity
                  style={[s.girisBtn, { backgroundColor: '#588157', marginTop: 10 }]}
                  onPress={() => sohbetiBaslat(teklif, true)}
                >
                  <Text style={s.anaBtnY}>💬 SOHBETE GİT</Text>
                </TouchableOpacity>
              ) : !ilan.anlasmaVar ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[s.girisBtn, { flex: 1, backgroundColor: '#526E7F' }]}
                    onPress={() => sohbetiBaslat(teklif, false)}
                  >
                    <Text style={s.anaBtnY}>💬 Sohbet Et</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.girisBtn, { flex: 1 }]}
                    onPress={() => anlasmaYap(ilan.id, teklif)}
                  >
                    <Text style={s.anaBtnY}>🤝 Anlaş</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[s.girisBtn, { backgroundColor: '#ccc', marginTop: 10 }]}>
                  <Text style={s.anaBtnY}>Başka Ustayla Anlaşıldı</Text>
                </View>
              )}
            </View>
          ))
        )}

        {ilan?.anlasmaVar && !ilan?.puanlandi && ilan?.sahip === kullanici?.email && (
          <>
            <TouchableOpacity
              style={{ ...s.girisBtn, backgroundColor: '#FF8A57', marginTop: 10, marginBottom: 30 }}
              onPress={() => { setPuanlananIlan(ilan); setPuanModalAcik(true); }}
            >
              <Text style={s.anaBtnY}>⭐ İŞ BİTTİ, USTAYI PUANLA</Text>
            </TouchableOpacity>
            <UstaIstatistikModali
              ustaId={istatistikModalUsta?.id}
              ustaAd={istatistikModalUsta?.ad}
              visible={istatistikModalUsta !== null}
              onClose={() => setIstatistikModalUsta(null)}
            />
          </>
        )}
      </ScrollView>

      <Modal visible={ustaProfilModalAcik} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 30 }}>
            <TouchableOpacity
              onPress={() => { setUstaProfilModalAcik(false); setUstaProfil(null); }}
              style={{ position: 'absolute', top: 15, right: 20 }}
            >
              <Text style={{ color: '#A3B1B9', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>

            {ustaProfilYukleniyor ? (
              <Text style={{ textAlign: 'center', color: '#A3B1B9', marginVertical: 30 }}>Yükleniyor...</Text>
            ) : ustaProfil ? (
              <>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#1B4965', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: '#FFF', fontSize: 28, fontWeight: 'bold' }}>
                      {ustaProfil.ad?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1B4965' }}>{ustaProfil.ad}</Text>
                  {ustaProfil.abonelik === 'vip' && <Text style={{ color: '#F39C12', fontWeight: 'bold' }}>👑 VIP Usta</Text>}
                  {ustaProfil.abonelik === 'premium' && <Text style={{ color: '#F39C12' }}>⭐ Premium Usta</Text>}
                </View>

                <View style={{ backgroundColor: '#F5F5F0', borderRadius: 16, padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}> Ana Branş</Text>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>
                      {ustaProfil.anaBrans || ustaProfil.meslek || '—'}
                    </Text>
                  </View>
                  {ustaProfil.yanBranslar?.length > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#A3B1B9', fontSize: 13 }}>🔧 Yan Branş</Text>
                      <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13, flex: 1, textAlign: 'right' }}>
                        {ustaProfil.yanBranslar.join(', ')}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}> Bölge</Text>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>{ustaProfil.bolge || '—'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}>⭐ Puan</Text>
                    <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 13 }}>
                      {ustaProfil.puan
                        ? `${Number(ustaProfil.puan).toFixed(1)} / 5 (${ustaProfil.puanSayisi || 0} değerlendirme)`
                        : 'Henüz değerlendirilmedi'}
                    </Text>
                  </View>
                  {ustaProfil.hakkinda && (
                    <View>
                      <Text style={{ color: '#A3B1B9', fontSize: 13, marginBottom: 4 }}>💬 Hakkında</Text>
                      <Text style={{ color: '#526E7F', fontSize: 13 }}>{ustaProfil.hakkinda}</Text>
                    </View>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
