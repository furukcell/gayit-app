// ============================================================
// ChatScreen.js
// Bildirim ve sohbet açılma sorunları giderildi
// YENİ: Usta müşterinin numarasını, müşteri ustanın numarasını görür
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  FlatList, KeyboardAvoidingView, Platform, Alert, Linking, RefreshControl
} from 'react-native';
import * as Location from 'expo-location';
import { DB_URL } from './constants';
import { bildirimGonderVeKaydet } from './notifications';

function MesajTik({ durum }) {
  if (durum === 'okundu') return <Text style={{ fontSize: 11, color: '#4FC3F7' }}>✓✓</Text>;
  if (durum === 'iletildi') return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>✓✓</Text>;
  return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>✓</Text>;
}

export function SohbetEkrani({
  kullanici, rol, secilenIlan, aktifSohbetTeklif,
  anlasmaSaglandi, setEkran,
  setSikayetHedef, setSikayetModalAcik,
  onVeriYukle, s
}) {
  const [mesajlar, setMesajlar] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [musteriTelefon, setMusteriTelefon] = useState(null); // usta için müşteri numarası
  const flatListRef = useRef(null);

  const sohbetId = (secilenIlan?.id && aktifSohbetTeklif?.ustaUid)
    ? `${secilenIlan.id}_${aktifSohbetTeklif.ustaUid.replace(/[.@]/g, '_')}`
    : (secilenIlan?.id && aktifSohbetTeklif?.ustaId)
    ? `${secilenIlan.id}_${aktifSohbetTeklif.ustaId.replace(/[.@]/g, '_')}`
    : null;

  // ============================================================
  // Usta görüntülüyorsa müşterinin numarasını Firebase'den çek
  // ============================================================
  useEffect(() => {
    if (rol === 'usta' && secilenIlan?.sahipUid) {
      fetch(`${DB_URL}/kullanicilar/${secilenIlan.sahipUid}.json`)
        .then(r => r.json())
        .then(data => {
          if (data?.telefon) setMusteriTelefon(data.telefon);
        })
        .catch(() => {});
    }
  }, [secilenIlan?.sahipUid]);

  const mesajlariYukle = async () => {
    if (!sohbetId || !secilenIlan?.id) return;
    try {
      const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json`);
      const data = await res.json();
      if (data) {
        const liste = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
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
          const guncellenmisListe = liste.map(m =>
            okunacaklar.find(o => o.id === m.id) ? { ...m, durum: 'okundu' } : m
          );
          setMesajlar(guncellenmisListe);
        } else {
          setMesajlar(liste);
        }
      } else {
        setMesajlar([]);
      }
    } catch (e) {
      console.log('Mesajlar yüklenemedi:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    mesajlariYukle();
  }, [sohbetId]);

  const mesajGonder = async () => {
    if (!yeniMesaj.trim() || !sohbetId) return;

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

      await mesajlariYukle();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi gari!');
    }
  };

  const konumGonder = async () => {
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
              let hedefUid = null;
              if (rol === 'musteri') {
                hedefUid = aktifSohbetTeklif?.ustaUid || null;
              } else {
                hedefUid = secilenIlan?.sahipUid || null;
              }
              if (hedefUid) {
                await bildirimGonderVeKaydet(hedefUid, `📍 ${kullanici.ad}`, 'Konumunu paylaştı');
              }
              await mesajlariYukle();
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
              Alert.alert('Tebrikler! 🎉', 'İş tamamlandı olarak işaretlendi.');
              setEkran('anasayfa');
            } catch (e) {
              Alert.alert('Hata', 'İşlem kaydedilemedi!');
            }
          },
        },
      ]
    );
  };

  const benimMesajim = (mesaj) => mesaj.gonderen === kullanici?.uid;

  // ============================================================
  // Numarayı arama uygulamasıyla aç
  // ============================================================
  const numaraAra = (numara) => {
    if (!numara || numara === 'Numara Yok') return;
    Linking.openURL(`tel:${numara}`);
  };

  // ============================================================
  // Role göre gösterilecek numara ve isim
  // ============================================================
  const gosterilecekNumara = rol === 'musteri'
    ? aktifSohbetTeklif?.telefon
    : musteriTelefon;

  const gosterilecekIsim = rol === 'musteri'
    ? (aktifSohbetTeklif?.ustaAd || 'Usta')
    : (secilenIlan?.sahip || 'Müşteri');

  const numaraEtiketi = rol === 'musteri' ? '📞 Usta Telefonu' : '📞 Müşteri Telefonu';

  return (
    <SafeAreaView style={s.con}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerBaslik} numberOfLines={1}>
            💬 {gosterilecekIsim}
          </Text>
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

        {/* NUMARA — tıklanınca arama yapar */}
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
      </View>

      {/* MESAJLAR */}
      <FlatList
        ref={flatListRef}
        data={mesajlar}
        keyExtractor={item => item.id}
        refreshControl={
  <RefreshControl
    refreshing={yukleniyor}
    onRefresh={mesajlariYukle}
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

      {/* İŞ TAMAMLANDI BUTONU */}
      {anlasmaSaglandi && (
        <TouchableOpacity
          style={{ backgroundColor: '#588157', margin: 10, padding: 12, borderRadius: 12, alignItems: 'center' }}
          onPress={anlasmayiTamamla}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✅ İŞ TAMAMLANDI</Text>
        </TouchableOpacity>
      )}

      {/* MESAJ YAZMA ALANI */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={{
          flexDirection: 'row', padding: 10, paddingBottom: 20,
          backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'flex-end',
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
    </SafeAreaView>
  );
}
