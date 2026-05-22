// ============================================================
// ADIM 11 — AdminScreen.js
// Admin Paneli — sadece rol === 'admin' olan hesaplarda görünür
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, TextInput, Image, Linking,
  Modal, KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { DB_URL, damgaToTarih, zamanFarki } from '../constants';
import { bildirimGonderVeKaydet } from '../notifications';

export function AdminEkrani({ kullanici, token, setEkran, s }) {
  const [aktifSekme, setAktifSekme] = useState('istatistik');
  const [kullanicilar, setKullanicilar] = useState([]);
  const [ilanlar, setIlanlar] = useState([]);
  const [sikayetler, setSikayetler] = useState([]);
  const [mesajlar, setMesajlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [duyuruBaslik, setDuyuruBaslik] = useState('');
  const [duyuruMesaj, setDuyuruMesajState] = useState('');
  const [aramaMetni, setAramaMetni] = useState('');

  // Mesaj yanıt modal state
  const [yanıtModalAcik, setYanitModalAcik] = useState(false);
  const [secilenMesaj, setSecilenMesaj] = useState(null);
  const [adminYanit, setAdminYanit] = useState('');
  const [sohbetMesajlari, setSohbetMesajlari] = useState([]);
  const flatListRef = useRef(null);

  // Kupon state
  const [kuponAd, setKuponAd] = useState('');
  const [kuponHedef, setKuponHedef] = useState('hepsi'); // hepsi | usta | musteri
  const [kuponAdet, setKuponAdet] = useState('');
  const [kuponGun, setKuponGun] = useState('');
  const [kuponIcerik, setKuponIcerik] = useState(''); // ilan veya teklif adedi
  const [kuponyukleniyor, setKuponyukleniyor] = useState(false);
  const [mevcutKuponlar, setMevcutKuponlar] = useState([]);

  useEffect(() => { veriYukle(); }, []);

  const veriYukle = async () => {
    setYukleniyor(true);
    try {
      const [kulRes, ilanRes, sikRes, mesRes, kuponRes] = await Promise.all([
       fetch(`${DB_URL}/kullanicilar.json?auth=${token}`),
       fetch(`${DB_URL}/ilanlar.json?auth=${token}`),
       fetch(`${DB_URL}/sikayetler.json?auth=${token}`),
       fetch(`${DB_URL}/iletisim.json?auth=${token}`),
       fetch(`${DB_URL}/kuponlar.json?auth=${token}`),
      ]);
      const [kulData, ilanData, sikData, mesData, kuponData] = await Promise.all([
        kulRes.json(), ilanRes.json(), sikRes.json(), mesRes.json(), kuponRes.json(),
      ]);

      if (kulData) setKullanicilar(Object.entries(kulData).map(([uid, v]) => ({ uid, ...v })));
      if (ilanData) setIlanlar(Object.entries(ilanData).map(([id, v]) => ({ id, ...v })));
      if (sikData) setSikayetler(Object.entries(sikData).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.tarih - a.tarih));
      if (mesData) setMesajlar(Object.entries(mesData).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.tarih - a.tarih));
      if (kuponData) setMevcutKuponlar(Object.entries(kuponData).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.olusturmaTarihi - a.olusturmaTarihi));
    } catch (e) {
      Alert.alert('Hata', 'Veriler yüklenemedi!');
    } finally {
      setYukleniyor(false);
    }
  };

  const istatistikler = {
    toplamKullanici: kullanicilar.length,
    toplamUsta: kullanicilar.filter(k => k.rol === 'usta').length,
    toplamMusteri: kullanicilar.filter(k => k.rol === 'musteri').length,
    toplamIlan: ilanlar.length,
    aktifIlan: ilanlar.filter(i => !i.anlasmaVar).length,
    tamamlanan: ilanlar.filter(i => i.anlasmaVar).length,
    bekleyenOnay: kullanicilar.filter(k => k.onayDurumu === 'beklemede').length,
    bekleyenSikayet: sikayetler.filter(s => s.durum === 'beklemede').length,
    okunmamisMesaj: mesajlar.filter(m => !m.okundu).length,
    vipUye: kullanicilar.filter(k => k.abonelik).length,
  };

  const kullaniciyiDondur = async (uid, mevcutDurum) => {
    const yeniDurum = !mevcutDurum;
    try {
      await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donduruldu: yeniDurum }),
      });
      setKullanicilar(prev => prev.map(k => k.uid === uid ? { ...k, donduruldu: yeniDurum } : k));
      Alert.alert('Başarılı', yeniDurum ? 'Hesap donduruldu.' : 'Hesap aktifleştirildi.');
    } catch (e) { Alert.alert('Hata', 'İşlem gerçekleştirilemedi!'); }
  };

  const kullaniciyiSil = async (uid) => {
    Alert.alert('Emin misin?', 'Bu kullanıcı kalıcı olarak silinecek!', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, { method: 'DELETE' });
          setKullanicilar(prev => prev.filter(k => k.uid !== uid));
        } catch (e) { Alert.alert('Hata', 'Silinemedi!'); }
      }},
    ]);
  };

  const onayKarari = async (uid, karar) => {
    try {
      await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onayDurumu: karar }),
      });
      setKullanicilar(prev => prev.map(k => k.uid === uid ? { ...k, onayDurumu: karar } : k));
      Alert.alert('Başarılı', karar === 'onayli' ? '✅ Usta onaylandı!' : '❌ Başvuru reddedildi.');
    } catch (e) { Alert.alert('Hata', 'İşlem yapılamadı!'); }
  };

  const ilanSil = async (ilanId) => {
    Alert.alert('Emin misin?', 'Bu ilan kalıcı olarak silinecek!', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${DB_URL}/ilanlar/${ilanId}.json?auth=${token}`, { method: 'DELETE' });
          setIlanlar(prev => prev.filter(i => i.id !== ilanId));
        } catch (e) { Alert.alert('Hata', 'İlan silinemedi!'); }
      }},
    ]);
  };

  const sikayetGuncelle = async (sikayetId, durum) => {
    try {
      await fetch(`${DB_URL}/sikayetler/${sikayetId}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durum }),
      });
      setSikayetler(prev => prev.map(s => s.id === sikayetId ? { ...s, durum } : s));
    } catch (e) { Alert.alert('Hata', 'Güncellenemedi!'); }
  };

  // Mesaj tıklanınca sohbet penceresini aç
  const mesajAc = async (mesaj) => {
    setSecilenMesaj(mesaj);
    setYanitModalAcik(true);

    // Okundu işaretle
    if (!mesaj.okundu) {
      await fetch(`${DB_URL}/iletisim/${mesaj.id}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ okundu: true }),
      }).catch(() => {});
      setMesajlar(prev => prev.map(m => m.id === mesaj.id ? { ...m, okundu: true } : m));
    }

    // Mevcut yanıtları yükle
    try {
      const res = await fetch(`${DB_URL}/iletisim/${mesaj.id}/yanitlar.json?auth=${token}`);
      const data = await res.json();
      if (data) {
        const liste = Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.tarih - b.tarih);
        setSohbetMesajlari(liste);
      } else {
        setSohbetMesajlari([]);
      }
    } catch (e) { setSohbetMesajlari([]); }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
  };

    // Admin yanıt gönder
  const adminYanitGonder = async () => {
    if (!adminYanit.trim() || !secilenMesaj) return;
    
    const yeniYanit = {
      metin: adminYanit.trim(),
      gonderen: 'admin',
      gonderenAd: 'GAYİT Yönetimi',
      tarih: Date.now(),
    };

    try {
      await fetch(`${DB_URL}/iletisim/${secilenMesaj.id}/yanitlar.json?auth=${token}`, {
     method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniYanit),
      });
      
      setSohbetMesajlari(prev => [...prev, { id: Date.now().toString(), ...yeniYanit }]);
      setAdminYanit('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      // Kullanıcıya bildirim gönder
      const gonderen = kullanicilar.find(k => k.email === secilenMesaj?.gonderen);
      if (gonderen?.uid) {
        await bildirimGonderVeKaydet(
          gonderen.uid,
          '📩 GAYİT Destek Yanıtladı',
          adminYanit.trim()
        );
      }
      
    } catch (error) {
      console.error("Yanıt gönderilirken hata oluştu: ", error);
      Alert.alert("Hata", "Yanıt gönderilirken bir sorun oluştu, lütfen tekrar deneyin.");
    }
  }; // Fonksiyonun eksik olan asıl kapanış parantezi


  // Kupon oluştur
  const kuponOlustur = async () => {
    if (!kuponAd.trim() || !kuponAdet || !kuponGun || !kuponIcerik) {
      Alert.alert('Eksik', 'Tüm alanları doldur!');
      return;
    }
    setKuponyukleniyor(true);
    try {
      const yeniKupon = {
        ad: kuponAd.trim().toUpperCase(),
        hedef: kuponHedef,
        adet: parseInt(kuponAdet),
        kullanilanAdet: 0,
        gecerliGun: parseInt(kuponGun),
        icerik: parseInt(kuponIcerik),
        olusturmaTarihi: Date.now(),
        bitisTarihi: Date.now() + parseInt(kuponGun) * 86400000,
        aktif: true,
      };
      await fetch(`${DB_URL}/kuponlar.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniKupon),
      });
      setMevcutKuponlar(prev => [{ id: Date.now().toString(), ...yeniKupon }, ...prev]);
      Alert.alert('✅ Kupon Oluşturuldu!', `"${yeniKupon.ad}" kodu oluşturuldu.`);
      setKuponAd(''); setKuponAdet(''); setKuponGun(''); setKuponIcerik('');
    } catch (e) { Alert.alert('Hata', 'Kupon oluşturulamadı!'); }
    finally { setKuponyukleniyor(false); }
  };

  const kuponSil = async (kuponId) => {
    Alert.alert('Kuponu Sil', 'Bu kupon silinecek!', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await fetch(`${DB_URL}/kuponlar/${kuponId}.json?auth=${token}`, { method: 'DELETE' }).catch(() => {});
        setMevcutKuponlar(prev => prev.filter(k => k.id !== kuponId));
      }},
    ]);
  };

  const duyuruGonder = async () => {
    if (!duyuruBaslik || !duyuruMesaj) { Alert.alert('Eksik', 'Başlık ve mesaj gerekli!'); return; }
    try {
      const pushPromises = kullanicilar.filter(k => k.pushToken).map(k =>
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: k.pushToken, title: duyuruBaslik, body: duyuruMesaj }),
        })
      );
      await Promise.all(pushPromises);
      Alert.alert('Duyuru Gönderildi! 📣', `${pushPromises.length} kullanıcıya bildirim uçuruldu.`);
      setDuyuruBaslik(''); setDuyuruMesajState('');
    } catch (e) { Alert.alert('Hata', 'Duyuru gönderilemedi!'); }
  };

  const filtreliKullanicilar = kullanicilar.filter(k =>
    k.ad?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
    k.email?.toLowerCase().includes(aramaMetni.toLowerCase())
  );

  const SEKMELER = [
    { key: 'istatistik', label: '📊' },
    { key: 'kullanicilar', label: '👥' },
    { key: 'onay', label: '✅' },
    { key: 'ilanlar', label: '📋' },
    { key: 'sikayetler', label: '⚠️' },
    { key: 'mesajlar', label: '✉️' },
    { key: 'kuponlar', label: '🎫' },
    { key: 'duyuru', label: '📣' },
  ];

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>⚙️ Admin Paneli</Text>
        <TouchableOpacity onPress={veriYukle}>
          <Text style={{ color: '#1B4965', fontSize: 20 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#1B4965', maxHeight: 48 }}>
        {SEKMELER.map(sekme => (
          <TouchableOpacity
            key={sekme.key}
            onPress={() => setAktifSekme(sekme.key)}
            style={{ paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: aktifSekme === sekme.key ? 3 : 0, borderBottomColor: '#F39C12' }}
          >
            <Text style={{ color: '#FFF', fontSize: 18 }}>
              {sekme.label}
              {sekme.key === 'onay' && istatistikler.bekleyenOnay > 0 ? ` (${istatistikler.bekleyenOnay})` : ''}
              {sekme.key === 'sikayetler' && istatistikler.bekleyenSikayet > 0 ? ` (${istatistikler.bekleyenSikayet})` : ''}
              {sekme.key === 'mesajlar' && istatistikler.okunmamisMesaj > 0 ? ` (${istatistikler.okunmamisMesaj})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll}>

        {/* ---- İSTATİSTİK ---- */}
        {aktifSekme === 'istatistik' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>Genel Durum</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: 'Toplam Üye', deger: istatistikler.toplamKullanici, renk: '#1B4965' },
                { label: 'Usta', deger: istatistikler.toplamUsta, renk: '#588157' },
                { label: 'Müşteri', deger: istatistikler.toplamMusteri, renk: '#8B7355' },
                { label: 'Toplam İlan', deger: istatistikler.toplamIlan, renk: '#526E7F' },
                { label: 'Aktif İlan', deger: istatistikler.aktifIlan, renk: '#2ECC71' },
                { label: 'Anlaşma', deger: istatistikler.tamamlanan, renk: '#27AE60' },
                { label: 'Onay Bekleyen', deger: istatistikler.bekleyenOnay, renk: '#F39C12' },
                { label: 'Açık Şikayet', deger: istatistikler.bekleyenSikayet, renk: '#E74C3C' },
                { label: 'Okunmamış Mesaj', deger: istatistikler.okunmamisMesaj, renk: '#9B59B6' },
                { label: 'VIP Üye', deger: istatistikler.vipUye, renk: '#F39C12' },
              ].map((stat, i) => (
                <View key={i} style={{ backgroundColor: stat.renk, borderRadius: 12, padding: 15, width: '47%', alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 28, fontWeight: 'bold' }}>{stat.deger}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ---- KULLANICILAR ---- */}
        {aktifSekme === 'kullanicilar' && (
          <View style={{ padding: 15 }}>
            <TextInput style={[s.inp, { marginBottom: 15 }]} placeholder="Ad veya e-posta ara..." value={aramaMetni} onChangeText={setAramaMetni} />
            {filtreliKullanicilar.map(k => (
              <View key={k.uid} style={[s.kart, { marginBottom: 10 }]}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{k.ad}</Text>
                <Text style={{ color: '#526E7F', fontSize: 12 }}>{k.email}</Text>
                <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                  {k.rol === 'usta' ? '🛠️ Usta' : '👤 Müşteri'} • {k.bolge} • Hak: {k.hak || 0}
                  {k.abonelik ? ' • 👑 VIP' : ''}{k.donduruldu ? ' • ❄️ Donduruldu' : ''}
                </Text>
                <Text style={{ color: '#A3B1B9', fontSize: 10 }}>Kayıt: {damgaToTarih(k.kayitTarihi)}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={{ backgroundColor: k.donduruldu ? '#588157' : '#F39C12', padding: 8, borderRadius: 8, flex: 1 }} onPress={() => kullaniciyiDondur(k.uid, k.donduruldu)}>
                    <Text style={{ color: '#FFF', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }}>{k.donduruldu ? '✅ Aktifleştir' : '❄️ Dondur'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#E74C3C', padding: 8, borderRadius: 8, flex: 1 }} onPress={() => kullaniciyiSil(k.uid)}>
                    <Text style={{ color: '#FFF', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }}>🗑️ Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ---- ONAY ---- */}
        {aktifSekme === 'onay' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>Onay Bekleyen Ustalar ({istatistikler.bekleyenOnay})</Text>
            {kullanicilar.filter(k => k.onayDurumu === 'beklemede').length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 20 }}>Bekleyen başvuru yok.</Text>
            ) : (
              kullanicilar.filter(k => k.onayDurumu === 'beklemede').map(k => (
                <View key={k.uid} style={[s.kart, { marginBottom: 10, borderWidth: 2, borderColor: '#F39C12' }]}>
                  <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{k.ad}</Text>
                  <Text style={{ color: '#526E7F', fontSize: 12 }}>{k.email}</Text>
                  <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{k.meslek} • {k.bolge}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={{ backgroundColor: '#588157', padding: 10, borderRadius: 8, flex: 1 }} onPress={() => onayKarari(k.uid, 'onayli')}>
                      <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>✅ Onayla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#E74C3C', padding: 10, borderRadius: 8, flex: 1 }} onPress={() => onayKarari(k.uid, 'reddedildi')}>
                      <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>❌ Reddet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ---- İLANLAR ---- */}
        {aktifSekme === 'ilanlar' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>Tüm İlanlar ({ilanlar.length})</Text>
            {ilanlar.map(ilan => (
              <View key={ilan.id} style={[s.kart, { marginBottom: 10 }]}>
                <Text style={s.kategoriBadge}>{ilan.kategori}</Text>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', marginTop: 5 }}>{ilan.baslik}</Text>
                <Text style={{ color: '#526E7F', fontSize: 12 }}>{ilan.bolge} • {ilan.sahip}</Text>
                <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{zamanFarki(ilan.tarih)} • {ilan.anlasmaVar ? '✅ Anlaşma var' : `${ilan.teklifler?.length || 0} teklif`}</Text>
                <TouchableOpacity style={{ backgroundColor: '#E74C3C', padding: 8, borderRadius: 8, marginTop: 10 }} onPress={() => ilanSil(ilan.id)}>
                  <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 12 }}>🗑️ İlanı Sil</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ---- ŞİKAYETLER ---- */}
        {aktifSekme === 'sikayetler' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>Şikayetler ({sikayetler.length})</Text>
            {sikayetler.length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 20 }}>Şikayet yok.</Text>
            ) : (
              sikayetler.map(sikayet => (
                <View key={sikayet.id} style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: sikayet.durum === 'beklemede' ? '#E74C3C' : sikayet.durum === 'inceleniyor' ? '#F39C12' : '#588157' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{sikayet.tip}</Text>
                    <Text style={{ fontSize: 11, color: '#A3B1B9' }}>{zamanFarki(sikayet.tarih)}</Text>
                  </View>
                  <Text style={{ color: '#E74C3C', fontSize: 12, marginTop: 4 }}>Hedef: {sikayet.hedef}</Text>
                  <Text style={{ color: '#526E7F', fontSize: 12 }}>Şikayet eden: {sikayet.gonderen}</Text>
                  <Text style={{ color: '#526E7F', marginTop: 6, fontStyle: 'italic' }}>{sikayet.mesaj}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {['beklemede', 'inceleniyor', 'cozuldu'].map(durum => (
                      <TouchableOpacity key={durum} style={{ flex: 1, padding: 7, borderRadius: 8, backgroundColor: sikayet.durum === durum ? '#1B4965' : '#F5F5F0' }} onPress={() => sikayetGuncelle(sikayet.id, durum)}>
                        <Text style={{ color: sikayet.durum === durum ? '#FFF' : '#526E7F', fontSize: 10, textAlign: 'center', fontWeight: 'bold' }}>
                          {durum === 'beklemede' ? '⏳' : durum === 'inceleniyor' ? '🔍' : '✅'} {durum}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ---- MESAJLAR ---- */}
        {aktifSekme === 'mesajlar' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>
              İletişim Mesajları ({mesajlar.length})
            </Text>
            {mesajlar.length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 20 }}>Mesaj yok.</Text>
            ) : (
              mesajlar.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={{ backgroundColor: m.okundu ? '#F5F5F0' : '#E1F2FE', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: m.okundu ? '#D1D9E0' : '#1B4965' }}
                  onPress={() => mesajAc(m)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{m.konu}</Text>
                    <Text style={{ fontSize: 11, color: '#A3B1B9' }}>{zamanFarki(m.tarih)}</Text>
                  </View>
                  <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4 }}>{m.gonderen}</Text>
                  <Text style={{ color: '#526E7F', marginTop: 6 }} numberOfLines={2}>{m.mesaj}</Text>
                  <Text style={{ color: '#1B4965', fontSize: 12, marginTop: 6, fontWeight: 'bold' }}>
                    💬 {m.okundu ? 'Yanıtla / Görüntüle' : 'Yeni mesaj — Yanıtla'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ---- KUPONLAR ---- */}
        {aktifSekme === 'kuponlar' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>🎫 Kupon Oluştur</Text>

            <Text style={s.inputBaslik}>Kupon Adı / Kodu</Text>
            <TextInput style={s.inp} placeholder="Örn: BAYRAM2026" value={kuponAd} onChangeText={setKuponAd} autoCapitalize="characters" />

            <Text style={s.inputBaslik}>Hedef Kitle</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
              {[{ key: 'hepsi', label: 'Hepsi' }, { key: 'usta', label: 'Usta' }, { key: 'musteri', label: 'Müşteri' }].map(h => (
                <TouchableOpacity key={h.key} style={[s.chip, kuponHedef === h.key && s.chipAktif]} onPress={() => setKuponHedef(h.key)}>
                  <Text style={[s.chipY, kuponHedef === h.key && s.chipYAktif]}>{h.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputBaslik}>Toplam Kullanım Adedi</Text>
            <TextInput style={s.inp} placeholder="Örn: 50" value={kuponAdet} onChangeText={setKuponAdet} keyboardType="numeric" />

            <Text style={s.inputBaslik}>Geçerlilik Süresi (Gün)</Text>
            <TextInput style={s.inp} placeholder="Örn: 30" value={kuponGun} onChangeText={setKuponGun} keyboardType="numeric" />

            <Text style={s.inputBaslik}>Kupon İçeriği (İlan / Teklif Adedi)</Text>
            <TextInput style={s.inp} placeholder="Örn: 3 (3 ilan/teklif hakkı)" value={kuponIcerik} onChangeText={setKuponIcerik} keyboardType="numeric" />

            <TouchableOpacity
              style={[s.girisBtn, { backgroundColor: '#F39C12', opacity: kuponyukleniyor ? 0.7 : 1, marginBottom: 25 }]}
              onPress={kuponOlustur}
              disabled={kuponyukleniyor}
            >
              <Text style={s.anaBtnY}>{kuponyukleniyor ? 'Oluşturuluyor...' : '🎫 KUPONU OLUŞTUR'}</Text>
            </TouchableOpacity>

            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 15, marginBottom: 10 }}>Mevcut Kuponlar</Text>
            {mevcutKuponlar.length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>Henüz kupon yok.</Text>
            ) : (
              mevcutKuponlar.map(k => (
                <View key={k.id} style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: k.aktif ? '#588157' : '#E74C3C' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, letterSpacing: 2 }}>{k.ad}</Text>
                    <Text style={{ color: k.aktif ? '#588157' : '#E74C3C', fontWeight: 'bold', fontSize: 12 }}>{k.aktif ? '✅ Aktif' : '❌ Pasif'}</Text>
                  </View>
                  <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4 }}>
                    Hedef: {k.hedef === 'hepsi' ? 'Herkes' : k.hedef === 'usta' ? 'Usta' : 'Müşteri'} •
                    Kullanım: {k.kullanilanAdet || 0}/{k.adet} •
                    İçerik: {k.icerik} hak
                  </Text>
                  <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 3 }}>
                    Bitiş: {new Date(k.bitisTarihi).toLocaleDateString('tr-TR')}
                  </Text>
                  <TouchableOpacity style={{ backgroundColor: '#E74C3C', padding: 8, borderRadius: 8, marginTop: 10 }} onPress={() => kuponSil(k.id)}>
                    <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 12 }}>🗑️ Kuponu Sil</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ---- DUYURU ---- */}
        {aktifSekme === 'duyuru' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>Tüm Kullanıcılara Duyuru Gönder</Text>
            <View style={{ backgroundColor: '#FFF8E1', padding: 12, borderRadius: 10, marginBottom: 15 }}>
              <Text style={{ color: '#F39C12', fontSize: 12 }}>📣 Push token'ı olan tüm kullanıcılara gönderilir ({kullanicilar.filter(k => k.pushToken).length} kullanıcı).</Text>
            </View>
            <Text style={s.inputBaslik}>Başlık</Text>
            <TextInput style={s.inp} placeholder="Duyuru başlığı..." value={duyuruBaslik} onChangeText={setDuyuruBaslik} />
            <Text style={s.inputBaslik}>Mesaj</Text>
            <TextInput style={[s.inp, { height: 100, textAlignVertical: 'top' }]} placeholder="Duyuru mesajı..." value={duyuruMesaj} onChangeText={setDuyuruMesajState} multiline />
            <TouchableOpacity style={[s.girisBtn, { backgroundColor: '#F39C12', marginBottom: 40 }]} onPress={duyuruGonder}>
              <Text style={s.anaBtnY}>📣 DUYURUYU GÖNDER</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ---- MESAJ YANIT MODALI ---- */}
      <Modal visible={yanıtModalAcik} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F0' }}>
          <View style={[s.header, { backgroundColor: '#1B4965' }]}>
            <TouchableOpacity style={s.headerGeriBtn} onPress={() => { setYanitModalAcik(false); setSecilenMesaj(null); setAdminYanit(''); setSohbetMesajlari([]); }}>
              <Text style={[s.menuSimge, { color: '#FFF' }]}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.headerBaslik, { color: '#FFF' }]} numberOfLines={1}>{secilenMesaj?.konu}</Text>
              <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{secilenMesaj?.gonderen}</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          {/* Orijinal mesaj */}
          <View style={{ backgroundColor: '#E1F2FE', margin: 15, borderRadius: 12, padding: 15 }}>
            <Text style={{ color: '#1B4965', fontWeight: 'bold', marginBottom: 5 }}>📩 Kullanıcı Mesajı</Text>
            <Text style={{ color: '#526E7F' }}>{secilenMesaj?.mesaj}</Text>
          </View>

          {/* Sohbet alanı */}
          <FlatList
            ref={flatListRef}
            data={sohbetMesajlari}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 10 }}
            ListEmptyComponent={<Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 10 }}>Henüz yanıt yok.</Text>}
            renderItem={({ item }) => (
              <View style={{
                alignSelf: item.gonderen === 'admin' ? 'flex-end' : 'flex-start',
                backgroundColor: item.gonderen === 'admin' ? '#1B4965' : '#FFF',
                borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: '80%',
              }}>
                <Text style={{ color: item.gonderen === 'admin' ? '#FFF' : '#1B4965', fontWeight: 'bold', fontSize: 11, marginBottom: 3 }}>
                  {item.gonderenAd}
                </Text>
                <Text style={{ color: item.gonderen === 'admin' ? '#FFF' : '#526E7F' }}>{item.metin}</Text>
                <Text style={{ color: item.gonderen === 'admin' ? 'rgba(255,255,255,0.5)' : '#A3B1B9', fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                  {new Date(item.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          />

          {/* Yanıt giriş alanı */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <View style={{ flexDirection: 'row', padding: 10, paddingBottom: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'flex-end' }}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#F5F5F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: '#1B4965' }}
                placeholder="Yanıt yaz..."
                value={adminYanit}
                onChangeText={setAdminYanit}
                multiline
              />
              <TouchableOpacity
                onPress={adminYanitGonder}
                style={{ backgroundColor: adminYanit.trim() ? '#1B4965' : '#D1D9E0', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
                disabled={!adminYanit.trim()}
              >
                <Text style={{ color: '#FFF', fontSize: 18 }}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
