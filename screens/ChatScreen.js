// ============================================================
// ChatScreen.js
// DEĞİŞİKLİK: ilan.puanlandi === true ise mesaj alanı kilitli
// Sistem mesajları (tip: 'sistem') gizli gösteriliyor
// FIX: Firebase auth eklendi (mesajlar yüklenmiyor sorunu)
// FIX: useSafeAreaInsets eklendi (navigation bar sorunu)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  FlatList, KeyboardAvoidingView, Platform, Alert, Linking, RefreshControl, Modal
} from 'react-native';
import * as Location from 'expo-location';
import { DB_URL, API_KEY } from '../constants';
import { bildirimGonderVeKaydet } from '../notifications';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase SDK başlat — daha önce başlatılmışsa tekrar başlatma
const firebaseConfig = { apiKey: API_KEY, databaseURL: DB_URL };
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

function MesajTik({ durum }) {
  if (durum === 'okundu') return <Text style={{ fontSize: 11, color: '#4FC3F7' }}>✓✓</Text>;
  if (durum === 'iletildi') return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>✓✓</Text>;
  return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>✓</Text>;
}

export function SohbetEkrani({
  kullanici, rol, secilenIlan, aktifSohbetTeklif,
  anlasmaSaglandi, setEkran,
  setSikayetHedef, setSikayetModalAcik,
  setPuanlananIlan, setPuanModalAcik,
  onVeriYukle, s
}) {
  const insets = useSafeAreaInsets();
  const [mesajlar, setMesajlar] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [firebaseHazir, setFirebaseHazir] = useState(false);
  const [musteriTelefon, setMusteriTelefon] = useState(null);
  const [ustaTelefon, setUstaTelefon] = useState(null);
  const [musteriAd, setMusteriAd] = useState(null);
  const [ustaProfilModalAcik, setUstaProfilModalAcik] = useState(false);
  const [ustaProfil, setUstaProfil] = useState(null);
  const [ustaProfilYukleniyor, setUstaProfilYukleniyor] = useState(false);
  const flatListRef = useRef(null);

  const sohbetId = (secilenIlan?.id && aktifSohbetTeklif?.ustaUid)
    ? `${secilenIlan.id}_${aktifSohbetTeklif.ustaUid.replace(/[.@]/g, '_')}`
    : (secilenIlan?.id && aktifSohbetTeklif?.ustaId)
    ? `${secilenIlan.id}_${aktifSohbetTeklif.ustaId.replace(/[.@]/g, '_')}`
    : null;

  // DEĞİŞİKLİK: Puanlama yapıldıysa sohbet kilitli
  const sohbetKilitli = secilenIlan?.puanlandi === true;

  // FIX: Firebase Auth — anonim giriş yap, SDK auth olmadan rule reddeder
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseHazir(true);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          // Anonim giriş başarısız olsa da devam et
          setFirebaseHazir(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (rol === 'usta' && secilenIlan?.sahipUid) {
      fetch(`${DB_URL}/kullanicilar/${secilenIlan.sahipUid}.json`)
        .then(r => r.json())
        .then(data => {
          if (data?.telefon) setMusteriTelefon(data.telefon);
          if (data?.ad) setMusteriAd(data.ad);
        })
        .catch(() => {});
    }
    if (rol === 'musteri' && aktifSohbetTeklif?.ustaUid) {
      fetch(`${DB_URL}/kullanicilar/${aktifSohbetTeklif.ustaUid}.json`)
        .then(r => r.json())
        .then(data => { if (data?.telefon) setUstaTelefon(data.telefon); })
        .catch(() => {});
    }
  }, [secilenIlan?.sahipUid, aktifSohbetTeklif?.ustaUid]);

  // FIX: firebaseHazir olunca mesajları dinle
  useEffect(() => {
    if (!sohbetId || !firebaseHazir) return;
    setYukleniyor(true);
    const mesajRef = ref(db, `sohbetler/${sohbetId}/mesajlar`);
    const unsubscribe = onValue(mesajRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liste = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(m => m.tip !== 'sistem')
          .sort((a, b) => a.tarih - b.tarih);
        const okunacaklar = liste.filter(m => m.gonderen !== kullanici?.uid && m.durum !== 'okundu');
        if (okunacaklar.length > 0) {
          await Promise.all(okunacaklar.map(m =>
            fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar/${m.id}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ durum: 'okundu' }),
            }).catch(() => {})
          ));
          setMesajlar(liste.map(m =>
            okunacaklar.find(o => o.id === m.id) ? { ...m, durum: 'okundu' } : m
          ));
        } else {
          setMesajlar(liste);
        }
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setMesajlar([]);
      }
      setYukleniyor(false);
    }, (error) => {
      // Rule hatası veya bağlantı sorunu
      console.log('Firebase okuma hatası:', error.message);
      setYukleniyor(false);
    });
    return () => unsubscribe();
  }, [sohbetId, firebaseHazir]);

  const mesajGonder = async () => {
    if (!yeniMesaj.trim() || !sohbetId || sohbetKilitli) return;
    await fetch(`${DB_URL}/sohbetler/${sohbetId}/katilimcilar.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musteriUid: secilenIlan.sahipUid,
        ustaUid: aktifSohbetTeklif.ustaUid,
      }),
    }).catch(() => {});
    const mesajMetni = yeniMesaj.trim();
    const mesaj = {
      metin: mesajMetni,
      gonderen: kullanici.uid,
      gonderenAd: kullanici.ad,
      tarih: Date.now(),
      durum: 'gonderildi',
    };

    setYeniMesaj('');

    try {
      const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mesaj),
      });
      const data = await res.json();

      if (data?.name) {
        await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar/${data.name}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durum: 'iletildi' }),
        }).catch(() => {});
      }

      let hedefUid = null;
      if (rol === 'musteri') {
        hedefUid = aktifSohbetTeklif?.ustaUid || null;
      } else {
        hedefUid = secilenIlan?.sahipUid || null;
      }

      if (hedefUid) {
        await bildirimGonderVeKaydet(hedefUid, kullanici?.rol === 'admin' ? '🛡️ GAYİT Destek' : `💬 ${kullanici.ad}`, mesajMetni);
      }

    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi gari!');
    }
  };

  const konumGonder = async () => {
    if (sohbetKilitli) return;
    Alert.alert(
      '📍 Konum Paylaş',
      'Anlık konumunuzu karşı tarafa göndermek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Konum paylaşmak için izin vermelisiniz.');
                return;
              }
              const konum = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
              const { latitude, longitude } = konum.coords;
              const haritaLinki = `https://maps.google.com/?q=${latitude},${longitude}`;
              const mesaj = {
                metin: '📍 Konumunu paylaştı',
                gonderen: kullanici.uid,
                gonderenAd: kullanici.ad,
                tarih: Date.now(),
                durum: 'gonderildi',
                tip: 'konum',
                haritaLinki,
              };
              await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mesaj),
              });
              let hedefUid = rol === 'musteri'
                ? aktifSohbetTeklif?.ustaUid || null
                : secilenIlan?.sahipUid || null;
              if (hedefUid) {
                await bildirimGonderVeKaydet(hedefUid, `📍 ${kullanici.ad}`, 'Konumunu paylaştı');
              }
            } catch (e) {
              Alert.alert('Hata', 'Konum alınamadı gari!');
            }
          }
        }
      ]
    );
  };

  const anlasmayiTamamla = async () => {
    Alert.alert(
      '✅ Anlaşma Tamamlandı',
      'İşi tamamladınız mı? Bu işlemi geri alamazsınız.',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, Tamamlandı',
          onPress: async () => {
            try {
              await fetch(`${DB_URL}/ilanlar/${secilenIlan.id}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isTamamlandi: true }),
              });
              await onVeriYukle();
              Alert.alert('Tebrikler! 🎉', 'İş tamamlandı! Şimdi ustayı puanlayabilirsin.', [
                {
                  text: 'Ustayı Puanla ⭐',
                  onPress: () => {
                    setPuanlananIlan(secilenIlan);
                    setPuanModalAcik(true);
                    setEkran('anasayfa');
                  }
                },
                { text: 'Daha Sonra', onPress: () => setEkran('anasayfa') }
              ]);
            } catch (e) {
              Alert.alert('Hata', 'İşlem kaydedilemedi!');
            }
          },
        },
      ]
    );
  };

  const ustaProfilGoster = async () => {
    if (rol !== 'musteri') return;
    setUstaProfilYukleniyor(true);
    setUstaProfilModalAcik(true);
    try {
      const res = await fetch(`${DB_URL}/kullanicilar/${aktifSohbetTeklif.ustaUid}.json`);
      const data = await res.json();
      setUstaProfil(data ? { ...data, ad: aktifSohbetTeklif.ustaAd } : { ad: aktifSohbetTeklif.ustaAd });
    } catch (e) {
      setUstaProfil({ ad: aktifSohbetTeklif.ustaAd });
    } finally {
      setUstaProfilYukleniyor(false);
    }
  };

  const benimMesajim = (mesaj) => mesaj.gonderen === kullanici?.uid;

  const numaraAra = (numara) => {
    if (!numara || numara === 'Numara Yok') return;
    Linking.openURL(`tel:${numara}`);
  };

  const gosterilecekNumara = rol === 'musteri' ? ustaTelefon : musteriTelefon;

  let hamIsim = rol === 'musteri'
    ? (aktifSohbetTeklif?.ustaAd || 'Usta')
    : (musteriAd || secilenIlan?.sahip || 'Müşteri');

  if (hamIsim.includes('@')) hamIsim = hamIsim.split('@')[0];
  let ilkIsim = hamIsim.split(/[\s.]/)[0];
  const gosterilecekIsim = ilkIsim.charAt(0).toUpperCase() + ilkIsim.slice(1);
  const numaraEtiketi = rol === 'musteri' ? '📞 Usta Telefonu' : '📞 Müşteri Telefonu';

  return (
    <SafeAreaView style={s.con}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={ustaProfilGoster} disabled={rol !== 'musteri'}>
            <Text style={s.headerBaslik} numberOfLines={1}>
              💬 {gosterilecekIsim} {rol === 'musteri' ? '👤' : ''}
            </Text>
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', color: '#526E7F', fontSize: 11 }}>
            {secilenIlan?.baslik}
          </Text>
        </View>
        <TouchableOpacity onPress={() => {
          setSikayetHedef(gosterilecekIsim);
          setSikayetModalAcik(true);
        }}>
          <Text style={{ color: '#FF4444', fontSize: 13 }}>⚠️</Text>
        </TouchableOpacity>
      </View>

      {/* ANLAŞMA BİLGİ KUTUSU */}
      <View style={s.numaraKutu}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 }}>
          🤝 ANLAŞILAN FİYAT
        </Text>
        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>
          {aktifSohbetTeklif?.fiyat || '-'}
        </Text>

        {/* DEĞİŞİKLİK: Sohbet kilitliyse bant göster */}
        {sohbetKilitli && (
          <View style={{ marginTop: 6, backgroundColor: 'rgba(255,68,68,0.3)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 }}>
            <Text style={{ color: '#FFB3B3', fontSize: 11, textAlign: 'center' }}>
              🔒 İş tamamlandı, sohbet kapatıldı
            </Text>
          </View>
        )}

        {!sohbetKilitli && anlasmaSaglandi ? (
          <TouchableOpacity
            onPress={() => numaraAra(gosterilecekNumara)}
            style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            disabled={!gosterilecekNumara || gosterilecekNumara === 'Numara Yok'}
          >
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
              {numaraEtiketi}:
            </Text>
            <Text style={{
              color: gosterilecekNumara && gosterilecekNumara !== 'Numara Yok'
                ? '#7FE8A2'
                : 'rgba(255,255,255,0.4)',
              fontSize: 14,
              fontWeight: 'bold',
              textDecorationLine: gosterilecekNumara && gosterilecekNumara !== 'Numara Yok'
                ? 'underline'
                : 'none',
            }}>
              {gosterilecekNumara && gosterilecekNumara !== 'Numara Yok'
                ? gosterilecekNumara
                : 'Numara bulunamadı'}
            </Text>
          </TouchableOpacity>
        ) : !sohbetKilitli && (
          <View style={{ marginTop: 6, backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
              🔒 Numara anlaşma sağlandıktan sonra görünür
            </Text>
          </View>
        )}
      </View>

      {/* MESAJLAR */}
      <FlatList
        ref={flatListRef}
        data={mesajlar}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            colors={['#1B4965']}
          />
        }
        contentContainerStyle={{ padding: 15, paddingBottom: 10 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          !yukleniyor ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
              <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>
                Henüz mesaj yok.{'\n'}Pazarlığa başla usta!
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{
            alignSelf: benimMesajim(item) ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
            marginBottom: 10,
          }}>
            {!benimMesajim(item) && (
              <Text style={{ fontSize: 11, color: '#A3B1B9', marginBottom: 2, marginLeft: 4 }}>
                {item.gonderenAd}
              </Text>
            )}
            <View style={{
              backgroundColor: benimMesajim(item) ? '#1B4965' : '#FFF',
              borderRadius: 16,
              borderBottomRightRadius: benimMesajim(item) ? 4 : 16,
              borderBottomLeftRadius: benimMesajim(item) ? 16 : 4,
              padding: 12,
              elevation: 1,
            }}>
              {item.tip === 'konum' ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.haritaLinki)}>
                  <Text style={{ color: benimMesajim(item) ? '#FFF' : '#1B4965', fontSize: 15 }}>
                    📍 Konumu Görüntüle
                  </Text>
                  <Text style={{
                    color: benimMesajim(item) ? 'rgba(255,255,255,0.7)' : '#1B4965',
                    fontSize: 12, textDecorationLine: 'underline', marginTop: 3
                  }}>
                    Google Maps'te Aç →
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: benimMesajim(item) ? '#FFF' : '#1B4965', fontSize: 15 }}>
                  {item.metin}
                </Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 }}>
                <Text style={{ color: benimMesajim(item) ? 'rgba(255,255,255,0.5)' : '#A3B1B9', fontSize: 10 }}>
                  {new Date(item.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {benimMesajim(item) && <MesajTik durum={item.durum} />}
              </View>
            </View>
          </View>
        )}
      />

      {/* İŞ TAMAMLANDI BUTONU — sadece anlaşma varsa ve kilitli değilse */}
      {anlasmaSaglandi && !sohbetKilitli && (
        <TouchableOpacity
          style={{ backgroundColor: '#588157', margin: 10, padding: 12, borderRadius: 12, alignItems: 'center' }}
          onPress={anlasmayiTamamla}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✅ İŞ TAMAMLANDI</Text>
        </TouchableOpacity>
      )}

      {/* MESAJ YAZMA ALANI */}
      {sohbetKilitli ? (
        <View style={{
          padding: 16, backgroundColor: '#F5F5F0',
          borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'center',
          paddingBottom: insets.bottom + 16,
        }}>
          <Text style={{ color: '#A3B1B9', fontSize: 13 }}>
            🔒 Puanlama tamamlandı, bu sohbet kapatıldı.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={{
            flexDirection: 'row',
            padding: 10,
            paddingBottom: insets.bottom + 8,
            backgroundColor: '#FFF',
            borderTopWidth: 1,
            borderTopColor: '#EEE',
            alignItems: 'flex-end',
          }}>
            <TouchableOpacity
              onPress={konumGonder}
              style={{ backgroundColor: '#E1F2FE', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}
            >
              <Text style={{ fontSize: 20 }}>📍</Text>
            </TouchableOpacity>

            <TextInput
              style={{ flex: 1, backgroundColor: '#F5F5F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: '#1B4965' }}
              placeholder="Mesajınızı yazın..."
              value={yeniMesaj}
              onChangeText={setYeniMesaj}
              multiline
            />
            <TouchableOpacity
              onPress={mesajGonder}
              style={{ backgroundColor: yeniMesaj.trim() ? '#1B4965' : '#D1D9E0', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
              disabled={!yeniMesaj.trim()}
            >
              <Text style={{ color: '#FFF', fontSize: 18 }}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* USTA PROFİL MODALI */}
      <Modal visible={ustaProfilModalAcik} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 30, paddingBottom: insets.bottom + 30 }}>
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
                  {ustaProfil.onayDurumu === 'onayli' && <Text style={{ color: '#00a2ed', fontWeight: 'bold' }}>✅ Onaylı Usta</Text>}
                </View>

                <View style={{ backgroundColor: '#F5F5F0', borderRadius: 16, padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}>🔨 Branş</Text>
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
                    <Text style={{ color: '#A3B1B9', fontSize: 13 }}>📍 Bölge</Text>
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
