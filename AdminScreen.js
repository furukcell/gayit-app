// ============================================================
// ADIM 11 — AdminScreen.js
// Admin Paneli — sadece rol === 'admin' olan hesaplarda görünür
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, TextInput, FlatList, Image, Linking
} from 'react-native';
import { DB_URL, damgaToTarih, zamanFarki } from './constants';

// ============================================================
// ADMIN EKRANI
// ============================================================
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

  useEffect(() => {
    veriYukle();
  }, []);

  const veriYukle = async () => {
    setYukleniyor(true);
    try {
      const [kulRes, ilanRes, sikRes, mesRes] = await Promise.all([
        fetch(`${DB_URL}/kullanicilar.json`),
        fetch(`${DB_URL}/ilanlar.json`),
        fetch(`${DB_URL}/sikayetler.json`),
        fetch(`${DB_URL}/iletisim.json`),
      ]);

      const [kulData, ilanData, sikData, mesData] = await Promise.all([
        kulRes.json(), ilanRes.json(), sikRes.json(), mesRes.json(),
      ]);

      if (kulData) {
        setKullanicilar(Object.entries(kulData).map(([uid, v]) => ({ uid, ...v })));
      }
      if (ilanData) {
        setIlanlar(Object.entries(ilanData).map(([id, v]) => ({ id, ...v })));
      }
      if (sikData) {
        setSikayetler(Object.entries(sikData).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.tarih - a.tarih));
      }
      if (mesData) {
        setMesajlar(Object.entries(mesData).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.tarih - a.tarih));
      }
    } catch (e) {
      Alert.alert('Hata', 'Veriler yüklenemedi!');
    } finally {
      setYukleniyor(false);
    }
  };

  // İstatistikler
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

  // Kullanıcı dondur / aktifleştir
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
    } catch (e) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi!');
    }
  };

  // Kullanıcı sil
  const kullaniciyiSil = async (uid) => {
    Alert.alert('Emin misin?', 'Bu kullanıcı kalıcı olarak silinecek!', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, { method: 'DELETE' });
            setKullanicilar(prev => prev.filter(k => k.uid !== uid));
          } catch (e) {
            Alert.alert('Hata', 'Silinemedi!');
          }
        },
      },
    ]);
  };

  // Onay ver / reddet
  const onayKarari = async (uid, karar) => {
    try {
      await fetch(`${DB_URL}/kullanicilar/${uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onayDurumu: karar }),
      });
      setKullanicilar(prev => prev.map(k => k.uid === uid ? { ...k, onayDurumu: karar } : k));
      Alert.alert('Başarılı', karar === 'onayli' ? '✅ Usta onaylandı!' : '❌ Başvuru reddedildi.');
    } catch (e) {
      Alert.alert('Hata', 'İşlem yapılamadı!');
    }
  };

  // İlan sil
  const ilanSil = async (ilanId) => {
    Alert.alert('Emin misin?', 'Bu ilan kalıcı olarak silinecek!', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${DB_URL}/ilanlar/${ilanId}.json?auth=${token}`, { method: 'DELETE' });
            setIlanlar(prev => prev.filter(i => i.id !== ilanId));
          } catch (e) {
            Alert.alert('Hata', 'İlan silinemedi!');
          }
        },
      },
    ]);
  };

  // Şikayet güncelle
  const sikayetGuncelle = async (sikayetId, durum) => {
    try {
      await fetch(`${DB_URL}/sikayetler/${sikayetId}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durum }),
      });
      setSikayetler(prev => prev.map(s => s.id === sikayetId ? { ...s, durum } : s));
    } catch (e) {
      Alert.alert('Hata', 'Güncellenemedi!');
    }
  };

  // İletişim mesajı okundu işaretle
  const mesajOkundu = async (mesajId) => {
    try {
      await fetch(`${DB_URL}/iletisim/${mesajId}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ okundu: true }),
      });
      setMesajlar(prev => prev.map(m => m.id === mesajId ? { ...m, okundu: true } : m));
    } catch (e) {
      console.log('Okundu işareti yapılamadı:', e);
    }
  };

  // Duyuru gönder
  const duyuruGonder = async () => {
    if (!duyuruBaslik || !duyuruMesaj) {
      Alert.alert('Eksik', 'Başlık ve mesaj gerekli!');
      return;
    }
    try {
      const pushPromises = kullanicilar
        .filter(k => k.pushToken)
        .map(k =>
          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: k.pushToken,
              title: duyuruBaslik,
              body: duyuruMesaj,
            }),
          })
        );
      await Promise.all(pushPromises);
      Alert.alert('Duyuru Gönderildi! 📣', `${pushPromises.length} kullanıcıya bildirim uçuruldu.`);
      setDuyuruBaslik('');
      setDuyuruMesajState('');
    } catch (e) {
      Alert.alert('Hata', 'Duyuru gönderilemedi!');
    }
  };

  // Filtrelenmiş kullanıcılar
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

      {/* Sekme Barı */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#1B4965', maxHeight: 48 }}>
        {SEKMELER.map(sekme => (
          <TouchableOpacity
            key={sekme.key}
            onPress={() => setAktifSekme(sekme.key)}
            style={{
              paddingHorizontal: 18, paddingVertical: 12,
              borderBottomWidth: aktifSekme === sekme.key ? 3 : 0,
              borderBottomColor: '#F39C12',
            }}
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
                <View key={i} style={{
                  backgroundColor: stat.renk, borderRadius: 12, padding: 15,
                  width: '47%', alignItems: 'center',
                }}>
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
            <TextInput
              style={[s.inp, { marginBottom: 15 }]}
              placeholder="Ad veya e-posta ara..."
              value={aramaMetni}
              onChangeText={setAramaMetni}
            />
            {filtreliKullanicilar.map(k => (
              <View key={k.uid} style={[s.kart, { marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{k.ad}</Text>
                    <Text style={{ color: '#526E7F', fontSize: 12 }}>{k.email}</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                      {k.rol === 'usta' ? '🛠️ Usta' : '👤 Müşteri'} • {k.bolge} • Hak: {k.hak || 0}
                      {k.abonelik ? ' • 👑 VIP' : ''}
                      {k.onayDurumu === 'onayli' ? ' • ✅ Onaylı' : ''}
                      {k.donduruldu ? ' • ❄️ Donduruldu' : ''}
                    </Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 10 }}>Kayıt: {damgaToTarih(k.kayitTarihi)}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: k.donduruldu ? '#588157' : '#F39C12', padding: 8, borderRadius: 8, flex: 1 }}
                    onPress={() => kullaniciyiDondur(k.uid, k.donduruldu)}
                  >
                    <Text style={{ color: '#FFF', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }}>
                      {k.donduruldu ? '✅ Aktifleştir' : '❄️ Dondur'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#E74C3C', padding: 8, borderRadius: 8, flex: 1 }}
                    onPress={() => kullaniciyiSil(k.uid)}
                  >
                    <Text style={{ color: '#FFF', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }}>🗑️ Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ---- ONAY BEKLEYENLERx ---- */}
        {aktifSekme === 'onay' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>
              Onay Bekleyen Ustalar ({istatistikler.bekleyenOnay})
            </Text>
            {kullanicilar.filter(k => k.onayDurumu === 'beklemede').length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 20 }}>Bekleyen başvuru yok.</Text>
            ) : (
              kullanicilar.filter(k => k.onayDurumu === 'beklemede').map(k => (
                <View key={k.uid} style={[s.kart, { marginBottom: 10, borderWidth: 2, borderColor: '#F39C12' }]}>
                  <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{k.ad}</Text>
                  <Text style={{ color: '#526E7F', fontSize: 12 }}>{k.email}</Text>
                  <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{k.meslek} • {k.bolge}</Text>
                  <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                    Başvuru: {damgaToTarih(k.basvuruTarihi)}
                  </Text>

                  {/* Belge görüntüleme */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 }}>
                    {k.kimlikUrl ? (
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => Linking.openURL(k.kimlikUrl)}
                      >
                        <Image
                          source={{ uri: k.kimlikUrl }}
                          style={{ width: '100%', height: 100, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                        <Text style={{ color: '#1B4965', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                          🪪 Kimlik (Aç →)
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flex: 1, backgroundColor: '#F5F5F0', height: 100, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#A3B1B9', fontSize: 12 }}>Kimlik yüklenmedi</Text>
                      </View>
                    )}

                    {k.ustaBelgeUrl ? (
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => Linking.openURL(k.ustaBelgeUrl)}
                      >
                        <Image
                          source={{ uri: k.ustaBelgeUrl }}
                          style={{ width: '100%', height: 100, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                        <Text style={{ color: '#1B4965', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                          📄 Ustalık (Aç →)
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flex: 1, backgroundColor: '#F5F5F0', height: 100, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#A3B1B9', fontSize: 12 }}>Belge yüklenmedi</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#588157', padding: 10, borderRadius: 8, flex: 1 }}
                      onPress={() => onayKarari(k.uid, 'onayli')}
                    >
                      <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>✅ Onayla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#E74C3C', padding: 10, borderRadius: 8, flex: 1 }}
                      onPress={() => onayKarari(k.uid, 'reddedildi')}
                    >
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
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>
              Tüm İlanlar ({ilanlar.length})
            </Text>
            {ilanlar.map(ilan => (
              <View key={ilan.id} style={[s.kart, { marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.kategoriBadge}>{ilan.kategori}</Text>
                  {ilan.acil && <Text style={{ color: '#FF4444', fontWeight: 'bold', fontSize: 12 }}>🚨 ACİL</Text>}
                </View>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', marginTop: 5 }}>{ilan.baslik}</Text>
                <Text style={{ color: '#526E7F', fontSize: 12 }}>{ilan.bolge} • {ilan.sahip}</Text>
                <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{zamanFarki(ilan.tarih)}</Text>
                <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                  {ilan.anlasmaVar ? '✅ Anlaşma var' : `${ilan.teklifler?.length || 0} teklif`}
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#E74C3C', padding: 8, borderRadius: 8, marginTop: 10 }}
                  onPress={() => ilanSil(ilan.id)}
                >
                  <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 12 }}>🗑️ İlanı Sil</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ---- ŞİKAYETLER ---- */}
        {aktifSekme === 'sikayetler' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>
              Şikayetler ({sikayetler.length})
            </Text>
            {sikayetler.length === 0 ? (
              <Text style={{ color: '#A3B1B9', textAlign: 'center', marginTop: 20 }}>Şikayet yok.</Text>
            ) : (
              sikayetler.map(s => (
                <View key={s.id} style={[{
                  ...s,
                  backgroundColor: '#FFF', borderRadius: 12, padding: 15,
                  marginBottom: 10, elevation: 2,
                  borderLeftWidth: 4,
                  borderLeftColor: s.durum === 'beklemede' ? '#E74C3C' : s.durum === 'inceleniyor' ? '#F39C12' : '#588157',
                }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{s.tip}</Text>
                    <Text style={{ fontSize: 11, color: '#A3B1B9' }}>{zamanFarki(s.tarih)}</Text>
                  </View>
                  <Text style={{ color: '#E74C3C', fontSize: 12, marginTop: 4 }}>Hedef: {s.hedef}</Text>
                  <Text style={{ color: '#526E7F', fontSize: 12 }}>Şikayet eden: {s.gonderen}</Text>
                  <Text style={{ color: '#526E7F', marginTop: 6, fontStyle: 'italic' }}>{s.mesaj}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {['beklemede', 'inceleniyor', 'cozuldu'].map(durum => (
                      <TouchableOpacity
                        key={durum}
                        style={{
                          flex: 1, padding: 7, borderRadius: 8,
                          backgroundColor: s.durum === durum ? '#1B4965' : '#F5F5F0',
                        }}
                        onPress={() => sikayetGuncelle(s.id, durum)}
                      >
                        <Text style={{
                          color: s.durum === durum ? '#FFF' : '#526E7F',
                          fontSize: 10, textAlign: 'center', fontWeight: 'bold',
                        }}>
                          {durum === 'beklemede' ? '⏳' : durum === 'inceleniyor' ? '🔍' : '✅'}
                          {' '}{durum}
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
                  style={{
                    backgroundColor: m.okundu ? '#F5F5F0' : '#E1F2FE',
                    borderRadius: 12, padding: 15, marginBottom: 10,
                    borderLeftWidth: 4, borderLeftColor: m.okundu ? '#D1D9E0' : '#1B4965',
                  }}
                  onPress={() => mesajOkundu(m.id)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{m.konu}</Text>
                    <Text style={{ fontSize: 11, color: '#A3B1B9' }}>{zamanFarki(m.tarih)}</Text>
                  </View>
                  <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 4 }}>{m.gonderen}</Text>
                  <Text style={{ color: '#526E7F', marginTop: 6 }}>{m.mesaj}</Text>
                  {!m.okundu && (
                    <Text style={{ color: '#1B4965', fontSize: 11, marginTop: 6, fontWeight: 'bold' }}>
                      👆 Okundu olarak işaretle
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ---- DUYURU ---- */}
        {aktifSekme === 'duyuru' && (
          <View style={{ padding: 15 }}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 16, marginBottom: 15 }}>
              Tüm Kullanıcılara Duyuru Gönder
            </Text>
            <View style={{ backgroundColor: '#FFF8E1', padding: 12, borderRadius: 10, marginBottom: 15 }}>
              <Text style={{ color: '#F39C12', fontSize: 12 }}>
                📣 Bu duyuru push token'ı olan tüm kullanıcılara gönderilir ({kullanicilar.filter(k => k.pushToken).length} kullanıcı).
              </Text>
            </View>
            <Text style={s.inputBaslik}>Başlık</Text>
            <TextInput
              style={s.inp}
              placeholder="Duyuru başlığı..."
              value={duyuruBaslik}
              onChangeText={setDuyuruBaslik}
            />
            <Text style={s.inputBaslik}>Mesaj</Text>
            <TextInput
              style={[s.inp, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Duyuru mesajı..."
              value={duyuruMesaj}
              onChangeText={setDuyuruMesajState}
              multiline
            />
            <TouchableOpacity
              style={[s.girisBtn, { backgroundColor: '#F39C12', marginBottom: 40 }]}
              onPress={duyuruGonder}
            >
              <Text style={s.anaBtnY}>📣 DUYURUYU GÖNDER</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
