// ChatScreen.js - OPTİMİZE EDİLMİŞ VERSİYON
// Orijinal temel alındı + çift tıklama koruması + Firebase hata fallback eklendi
// Telefon fetch mantığı ORIJINAL'den korundu (Qwen hatası düzeltildi)

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  FlatList, KeyboardAvoidingView, Platform, Alert, Linking,
  RefreshControl, Modal
} from 'react-native';
import * as Location from 'expo-location';
import { DB_URL } from '../constants';
import { bildirimGonderVeKaydet } from '../notifications';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { getFirebaseDB } from '../firebaseClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UstaIstatistikModali from './UstaIstatistikModali';

const db = getFirebaseDB();

function MesajTik({ durum }) {
  if (durum === 'okundu') return <Text style={{ fontSize: 11, color: '#4FC3F7' }}>✓✓</Text>;
  if (durum === 'iletildi') return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>✓✓</Text>;
  return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>✓</Text>;
}

export function SohbetEkrani({
  kullanici, token, rol, secilenIlan, aktifSohbetTeklif,
  anlasmaSaglandi, setEkran,
  setSikayetHedef, setSikayetModalAcik,
  setPuanlananIlan, setPuanModalAcik,
  onVeriYukle, s
}) {
  const insets = useSafeAreaInsets();

  // --- State tanımları ---
  const [mesajlar, setMesajlar] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [musteriTelefon, setMusteriTelefon] = useState(null);
  const [ustaTelefon, setUstaTelefon] = useState(null);
  const [musteriAd, setMusteriAd] = useState(null);
  const [ustaProfilModalAcik, setUstaProfilModalAcik] = useState(false);
  const [ustaProfil, setUstaProfil] = useState(null);
  const [ustaProfilYukleniyor, setUstaProfilYukleniyor] = useState(false);
  const [istatistikModalAcik, setIstatistikModalAcik] = useState(false);

  // Çift tıklama koruması
  const [mesajGonderiliyor, setMesajGonderiliyor] = useState(false);
  const [konumGonderiliyor, setKonumGonderiliyor] = useState(false);
  const [isTamamlaniyor, setIsTamamlaniyor] = useState(false);

  const flatListRef = useRef(null);

  // --- Sabitler ---
  const ustaUid = aktifSohbetTeklif?.ustaUid || aktifSohbetTeklif?.ustaId || null;
  const sohbetId = (secilenIlan?.id && ustaUid)
    ? `${secilenIlan.id}_${ustaUid.replace(/[.@]/g, '_')}`
    : null;
  const sohbetKilitli = secilenIlan?.puanlandi === true;

  // --- REST Fallback: Firebase çalışmadığında veya ilk yüklemede kullanılır ---
  const mesajlariResttenYukle = async () => {
    if (!sohbetId || !token) return;
    try {
      const res = await fetch(
        `${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}&orderBy="tarih"&limitToLast=50`
      );
      const data = await res.json();
      if (data && !data.error) {
        const liste = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(m => m.tip !== 'sistem')
          .sort((a, b) => a.tarih - b.tarih);
        setMesajlar(liste);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setMesajlar([]);
      }
    } catch (e) {
      console.log('REST mesaj yükleme hatası:', e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  // --- Telefon numaraları (ORIJINAL mantık korundu) ---
  // Usta → müşterinin telefonunu çeker
  // Müşteri → ustanın telefonunu çeker
  useEffect(() => {
    if (rol === 'usta' && secilenIlan?.sahipUid) {
      fetch(`${DB_URL}/kullanicilar/${secilenIlan.sahipUid}.json?auth=${token}`)
        .then(r => r.json())
        .then(data => {
          if (data?.telefon) setMusteriTelefon(data.telefon);
          if (data?.ad) setMusteriAd(data.ad);
        })
        .catch(() => {});
    }
    if (rol === 'musteri' && ustaUid) {
      fetch(`${DB_URL}/kullanicilar/${ustaUid}.json?auth=${token}`)
        .then(r => r.json())
        .then(data => {
          if (data?.telefon) setUstaTelefon(data.telefon);
        })
        .catch(() => {});
    }
  }, [secilenIlan?.sahipUid, ustaUid, token, rol]);

  // --- Mesaj dinleyici ---
  useEffect(() => {
    if (!sohbetId) {
      setYukleniyor(false);
      return;
    }
    setYukleniyor(true);

    // Katılımcıları kaydet
    fetch(`${DB_URL}/sohbetler/${sohbetId}/katilimcilar.json?auth=${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musteriUid: secilenIlan?.sahipUid,
        ustaUid: ustaUid,
      }),
    }).catch(() => {});

    // Firebase SDK hazır değilse REST ile yükle ve dur
    if (!db) {
      console.log('Firebase DB hazır değil, REST ile yükleniyor...');
      mesajlariResttenYukle();
      return;
    }

    // Firebase hazırsa: önce REST ile hızlı yükle (boş ekran görünmesin),
    // sonra real-time listener kur
    mesajlariResttenYukle();

    const mesajRef = query(
      ref(db, `sohbetler/${sohbetId}/mesajlar`),
      limitToLast(50)
    );

    const unsubscribe = onValue(
      mesajRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            const liste = Object.keys(data)
              .map(key => ({ id: key, ...data[key] }))
              .filter(m => m.tip !== 'sistem')
              .sort((a, b) => a.tarih - b.tarih);

            setMesajlar(liste);

            // Okunmamış mesajları toplu okundu yap
            const okunacaklar = liste.filter(
              m => m.gonderen !== kullanici.uid && m.durum !== 'okundu'
            );
            if (okunacaklar.length > 0 && token) {
              const topluGuncelleme = {};
              okunacaklar.forEach(m => {
                topluGuncelleme[`sohbetler/${sohbetId}/mesajlar/${m.id}/durum`] = 'okundu';
              });
              fetch(`${DB_URL}/.json?auth=${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(topluGuncelleme),
              }).catch(() => {});
            }
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          } else {
            setMesajlar([]);
          }
          setYukleniyor(false);
        } catch (err) {
          console.error('Sohbet dinleme hatası:', err);
          setYukleniyor(false);
        }
      },
      (error) => {
        // Firebase okuma hatası → REST fallback devreye girer
        console.log('Firebase okuma hatası:', error.message);
        mesajlariResttenYukle();
      }
    );

    return () => unsubscribe();
  }, [sohbetId, token, kullanici?.uid]);

  // --- Mesaj Gönder ---
  const mesajGonder = async () => {
    if (!yeniMesaj.trim() || !sohbetId || sohbetKilitli || mesajGonderiliyor) return;

    setMesajGonderiliyor(true);
    const mesajMetni = yeniMesaj.trim();
    setYeniMesaj('');

    // Katılımcıları güncelle
    fetch(`${DB_URL}/sohbetler/${sohbetId}/katilimcilar.json?auth=${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musteriUid: secilenIlan?.sahipUid,
        ustaUid: ustaUid,
      }),
    }).catch(() => {});

    const mesaj = {
      metin: mesajMetni,
      gonderen: kullanici.uid,
      gonderenAd: kullanici.ad,
      tarih: Date.now(),
      durum: 'gonderildi',
    };
      setMesajlar(onceki => [...onceki, { id: `temp_${Date.now()}`, ...mesaj }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mesaj),
      });
      const data = await res.json();

      // Durumu "iletildi" olarak güncelle
      if (data?.name) {
        fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar/${data.name}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durum: 'iletildi' }),
        }).catch(() => {});
      }

      // Bildirim gönder
      const hedefUid = rol === 'musteri' ? ustaUid : (secilenIlan?.sahipUid || null);
      if (hedefUid) {
        bildirimGonderVeKaydet(
          hedefUid,
          kullanici?.rol === 'admin' ? '🛡️ GAYİT Destek' : `💬 ${kullanici.ad}`,
          mesajMetni,
          token,
          'sohbetlerim'
        ).catch(() => {});
      }
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi, internet bağlantınızı kontrol edin.');
      // Hata durumunda metni geri koy
      setYeniMesaj(mesajMetni);
    } finally {
      setMesajGonderiliyor(false);
    }
  };

  // --- Konum Gönder ---
  const konumGonder = async () => {
    if (sohbetKilitli || konumGonderiliyor) return;

    Alert.alert(
      '📍 Konum Paylaş',
      'Anlık konumunuzu karşı tarafa göndermek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            setKonumGonderiliyor(true);
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Konum paylaşmak için izin vermelisiniz.');
                return;
              }
              const konum = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
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
              setMesajlar(onceki => [...onceki, { id: `temp_${Date.now()}`, ...mesaj }]);
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
              await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mesaj),
              }).catch(() => {});

              const hedefUid = rol === 'musteri' ? ustaUid : (secilenIlan?.sahipUid || null);
              if (hedefUid) {
                bildirimGonderVeKaydet(
                  hedefUid,
                  `📍 ${kullanici.ad}`,
                  'Konumunu paylaştı',
                  token,
                  'sohbetlerim'
                ).catch(() => {});
              }
            } catch (e) {
              Alert.alert('Hata', 'Konum alınamadı gari!');
            } finally {
              setKonumGonderiliyor(false);
            }
          },
        },
      ]
    );
  };

  // --- Anlaşmayı Tamamla ---
  const anlasmayiTamamla = async () => {
    if (isTamamlaniyor) return;

    Alert.alert(
      '✅ Anlaşma Tamamlandı',
      'İşi tamamladınız mı? Bu işlemi geri alamazsınız.',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, Tamamlandı',
          onPress: async () => {
            setIsTamamlaniyor(true);
            try {
              await fetch(`${DB_URL}/ilanlar/${secilenIlan.id}.json?auth=${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isTamamlandi: true }),
              });
              await onVeriYukle();

              // İstatistik güncelle
              try {
                const uid = aktifSohbetTeklif?.ustaUid || aktifSohbetTeklif?.ustaId;
                const istSnap = await fetch(`${DB_URL}/istatistikler/${uid}.json?auth=${token}`)
                  .then(r => r.json())
                  .catch(() => ({}));
                const eskiToplam = (istSnap?.ortalamaTamamlamaSaati || 0) * (istSnap?.tamamlanan || 0);
                const yeniTamamlanan = (istSnap?.tamamlanan || 0) + 1;
                const tamamlamaSaati = (Date.now() - (secilenIlan?.tarih || Date.now())) / 3600000;
                fetch(`${DB_URL}/istatistikler/${uid}.json?auth=${token}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ortalamaTamamlamaSaati: (eskiToplam + tamamlamaSaati) / yeniTamamlanan,
                    sonGuncelleme: Date.now(),
                  }),
                }).catch(() => {});
              } catch (e) {
                console.log('İstatistik güncelleme hatası:', e);
              }

              Alert.alert('Tebrikler! 🎉', 'İş tamamlandı! Şimdi ustayı puanlayabilirsin.', [
                {
                  text: 'Ustayı Puanla ⭐',
                  onPress: () => {
                    setPuanlananIlan(secilenIlan);
                    setPuanModalAcik(true);
                    setEkran('anasayfa');
                  },
                },
                { text: 'Daha Sonra', onPress: () => setEkran('anasayfa') },
              ]);
            } catch (e) {
              Alert.alert('Hata', 'İşlem kaydedilemedi!');
            } finally {
              setIsTamamlaniyor(false);
            }
          },
        },
      ]
    );
  };

  // --- Usta Profil ---
  const ustaProfilGoster = async () => {
    if (rol !== 'musteri') return;
    setUstaProfilYukleniyor(true);
    setUstaProfilModalAcik(true);
    try {
      const res = await fetch(`${DB_URL}/kullanicilar/${ustaUid}.json?auth=${token}`);
      const data = await res.json();
      if (data) setUstaProfil({ ...data });
    } catch (e) {
      console.log('Usta profil hatası:', e);
    } finally {
      setUstaProfilYukleniyor(false);
    }
  };

  // --- Yardımcılar ---
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
  const ilkIsim = hamIsim.split(/[\s.]/)[0];
  const gosterilecekIsim = ilkIsim.charAt(0).toUpperCase() + ilkIsim.slice(1);
  const numaraEtiketi = rol === 'musteri' ? '📞 Usta Telefonu' : '📞 Müşteri Telefonu';

  // --- Sohbet ID yoksa hata ekranı ---
  if (!sohbetId) {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
            <Text style={s.menuSimge}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerBaslik}>Sohbet</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <Text style={{ fontSize: 40, marginBottom: 15 }}>⚠️</Text>
          <Text style={{ color: '#1B4965', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
            Sohbet yüklenemedi
          </Text>
          <Text style={{ color: '#A3B1B9', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            Lütfen geri dönüp tekrar deneyin.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: '#1B4965', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => setEkran('anasayfa')}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>← Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Ana Ekran ---
  return (
    <SafeAreaView style={[s.con, { flex: 1 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
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
          {rol === 'musteri' && (
            <TouchableOpacity onPress={() => setIstatistikModalAcik(true)} style={{ marginRight: 8 }}>
              <Text style={{ fontSize: 18 }}>📊</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => {
            setSikayetHedef(gosterilecekIsim);
            setSikayetModalAcik(true);
          }}>
            <Text style={{ color: '#FF4444', fontSize: 13 }}>⚠️</Text>
          </TouchableOpacity>
        </View>

        {/* Fiyat & Telefon Kutusu */}
        <View style={s.numaraKutu}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 }}>
            🤝 ANLAŞILAN FİYAT
          </Text>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>
            {aktifSohbetTeklif?.fiyat || '-'}
          </Text>

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
                  ? '#7FE8A2' : 'rgba(255,255,255,0.4)',
                fontSize: 14,
                fontWeight: 'bold',
                textDecorationLine: gosterilecekNumara && gosterilecekNumara !== 'Numara Yok'
                  ? 'underline' : 'none',
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

        {/* Mesaj Listesi */}
        <FlatList
          ref={flatListRef}
          data={mesajlar}
          keyExtractor={item => item.id}
          extraData={mesajlar}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={mesajlariResttenYukle}
              colors={['#1B4965']}
            />
          }
          contentContainerStyle={{ padding: 15, paddingBottom: 10 }}
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
                      fontSize: 12,
                      textDecorationLine: 'underline',
                      marginTop: 3,
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

        {/* İş Tamamlandı Butonu */}
        {anlasmaSaglandi && !sohbetKilitli && rol === 'musteri' && (
          <TouchableOpacity
            style={{
              backgroundColor: isTamamlaniyor ? '#A3B1B9' : '#588157',
              margin: 10,
              padding: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={anlasmayiTamamla}
            disabled={isTamamlaniyor}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
              {isTamamlaniyor ? 'İşleniyor...' : '✅ İŞ TAMAMLANDI'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Mesaj Input Alanı */}
        {sohbetKilitli ? (
          <View style={{
            padding: 16,
            backgroundColor: '#F5F5F0',
            borderTopWidth: 1,
            borderTopColor: '#EEE',
            alignItems: 'center',
            paddingBottom: insets.bottom + 16,
          }}>
            <Text style={{ color: '#A3B1B9', fontSize: 13 }}>
              🔒 Puanlama tamamlandı, bu sohbet kapatıldı.
            </Text>
          </View>
        ) : (
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
              disabled={konumGonderiliyor}
              style={{
                backgroundColor: konumGonderiliyor ? '#D1D9E0' : '#E1F2FE',
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 20 }}>📍</Text>
            </TouchableOpacity>

            <TextInput
              style={{
                flex: 1,
                backgroundColor: '#F5F5F0',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 15,
                maxHeight: 100,
                color: '#1B4965',
              }}
              placeholder="Mesajınızı yazın..."
              value={yeniMesaj}
              onChangeText={setYeniMesaj}
              multiline
              editable={!mesajGonderiliyor}
            />

            <TouchableOpacity
              onPress={mesajGonder}
              disabled={!yeniMesaj.trim() || mesajGonderiliyor}
              style={{
                backgroundColor: yeniMesaj.trim() && !mesajGonderiliyor ? '#1B4965' : '#D1D9E0',
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 8,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 18 }}>➤</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Usta Profil Modalı */}
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

        {/* İstatistik Modalı */}
        <UstaIstatistikModali
          ustaId={ustaUid}
          ustaAd={aktifSohbetTeklif?.ustaAd}
          visible={istatistikModalAcik}
          onClose={() => setIstatistikModalAcik(false)}
        />

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
