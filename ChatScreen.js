// ============================================================
// ADIM 7 — ChatScreen.js
// Sohbet & Pazarlık Ekranı (YENİ)
// Teklif kabul edildikten sonra açılır, mesajlaşma + anlaşma buradan
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  FlatList, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { DB_URL } from './constants';
import { bildirimGonderVeKaydet } from './notifications';

// Tik bileşeni — tek tik / çift tik / mavi tik
function MesajTik({ durum }) {
  if (durum === 'okundu') return <Text style={{ fontSize: 11, color: '#4FC3F7' }}>✓✓</Text>;
  if (durum === 'iletildi') return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>✓✓</Text>;
  return <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>✓</Text>;
}

// ============================================================
// SOHBET EKRANI
// ============================================================
export function SohbetEkrani({
  kullanici, rol, secilenIlan, aktifSohbetTeklif,
  anlasmaSaglandi, setEkran,
  setSikayetHedef, setSikayetModalAcik,
  onVeriYukle, s
}) {
  const [mesajlar, setMesajlar] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const flatListRef = useRef(null);

  // Sohbet ID'si — ilan ID + usta email birleşimi
  const sohbetId = secilenIlan?.id
    ? `${secilenIlan.id}_${(aktifSohbetTeklif?.ustaId || '').replace(/[.@]/g, '_')}`
    : null;

  // Mesajları yükle ve okundu işaretle
  const mesajlariYukle = async () => {
    if (!sohbetId) return;
    try {
      const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json`);
      const data = await res.json();
      if (data) {
        const liste = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => a.tarih - b.tarih);
        setMesajlar(liste);

        // Karşı tarafın mesajlarını "iletildi" → "okundu" yap
        const okunacaklar = liste.filter(
          m => m.gonderen !== kullanici?.uid && m.durum !== 'okundu'
        );
        for (const m of okunacaklar) {
          fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar/${m.id}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ durum: 'okundu' }),
          }).catch(() => {});
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

  // İlk açılışta yükle, sonra 3 sn'de bir yenile (tik güncellemesi için 5'ten 3'e indirdik)
  useEffect(() => {
    mesajlariYukle();
    const interval = setInterval(mesajlariYukle, 3000);
    return () => clearInterval(interval);
  }, [sohbetId]);

  // Mesaj gönder
  const mesajGonder = async () => {
    if (!yeniMesaj.trim() || !sohbetId) return;

    const mesaj = {
      metin: yeniMesaj.trim(),
      gonderen: kullanici.uid,
      gonderenAd: kullanici.ad,
      tarih: Date.now(),
      durum: 'gonderildi', // başlangıçta tek tik
    };

    setYeniMesaj('');

    try {
      const res = await fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mesaj),
      });
      const data = await res.json();

      // Gönderildi → iletildi (Firebase'e yazıldı demek)
      if (data?.name) {
        fetch(`${DB_URL}/sohbetler/${sohbetId}/mesajlar/${data.name}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durum: 'iletildi' }),
        }).catch(() => {});
      }

      // Karşı tarafa bildirim gönder
      const hedefUid = rol === 'musteri'
        ? aktifSohbetTeklif?.ustaUid
        : secilenIlan?.sahipUid;

      if (hedefUid) {
        await bildirimGonderVeKaydet(
          hedefUid,
          `💬 ${kullanici.ad}`,
          yeniMesaj.trim()
        );
      }

      await mesajlariYukle();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi gari!');
    }
  };

  // Anlaşma tamamlandı butonu
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

  return (
    <SafeAreaView style={s.con}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerBaslik} numberOfLines={1}>
            💬 {aktifSohbetTeklif?.ustaAd || 'Sohbet'}
          </Text>
          <Text style={{ textAlign: 'center', color: '#526E7F', fontSize: 11 }}>
            {secilenIlan?.baslik}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setSikayetHedef(aktifSohbetTeklif?.ustaAd || 'Kullanıcı');
            setSikayetModalAcik(true);
          }}
        >
          <Text style={{ color: '#FF4444', fontSize: 13 }}>⚠️</Text>
        </TouchableOpacity>
      </View>

      {/* Anlaşma bilgi kartı */}
      <View style={s.numaraKutu}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 }}>
          🤝 ANLAŞILAN FİYAT
        </Text>
        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>
          {aktifSohbetTeklif?.fiyat || '-'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 3 }}>
          📞 {aktifSohbetTeklif?.telefon || 'Numara paylaşılmadı'}
        </Text>
      </View>

      {/* Mesaj Listesi */}
      <FlatList
        ref={flatListRef}
        data={mesajlar}
        keyExtractor={item => item.id}
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
              <Text style={{ color: benimMesajim(item) ? '#FFF' : '#1B4965', fontSize: 15 }}>
                {item.metin}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 }}>
                <Text style={{
                  color: benimMesajim(item) ? 'rgba(255,255,255,0.5)' : '#A3B1B9',
                  fontSize: 10,
                }}>
                  {new Date(item.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {/* Tik sadece kendi mesajlarında görünsün */}
                {benimMesajim(item) && <MesajTik durum={item.durum} />}
              </View>
            </View>
          </View>
        )}
      />

      {/* İş Tamamlandı butonu */}
      {anlasmaSaglandi && (
        <TouchableOpacity
          style={{ backgroundColor: '#588157', margin: 10, padding: 12, borderRadius: 12, alignItems: 'center' }}
          onPress={anlasmayiTamamla}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✅ İŞ TAMAMLANDI</Text>
        </TouchableOpacity>
      )}

      {/* Mesaj Giriş Alanı */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={{
          flexDirection: 'row',
          padding: 10,
          paddingBottom: 20,
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#EEE',
          alignItems: 'flex-end',
        }}>
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
          />
          <TouchableOpacity
            onPress={mesajGonder}
            style={{
              backgroundColor: yeniMesaj.trim() ? '#1B4965' : '#D1D9E0',
              width: 44,
              height: 44,
              borderRadius: 22,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 8,
            }}
            disabled={!yeniMesaj.trim()}
          >
            <Text style={{ color: '#FFF', fontSize: 18 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
