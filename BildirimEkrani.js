// ============================================================
// BildirimEkrani.js — PRODUCTION READY
// Kullanıcı bildirimleri ekranı
//
// ✅ DÜZELTİLDİ: Tüm syntax hataları (= >, & &) giderildi
// ✅ DÜZELTİLDİ: Okundu işaretleme fetch'ine ?auth=${token} eklendi
// ✅ DÜZELTİLDİ: useEffect dependency array'e kullanıcı ve token eklendi
// ✅ İYİLEŞTİRME: Okundu state'i anında güncelleniyor (UI donmuyor)
// ============================================================
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { DB_URL, zamanFarki } from '../constants';
import { bildirimleriGetir } from '../notifications';

export function BildirimEkrani({ kullanici, token, setEkran, s }) {
  const [bildirimler, setBildirimler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // DÜZELTİLDİ: Dependency array'e kullanıcı ve token eklendi
  useEffect(() => {
    bildirimYukle();
  }, [kullanici?.uid, token]);

  const bildirimYukle = async () => {
    if (!kullanici?.uid || !token) return;
    setYukleniyor(true);
    try {
      const liste = await bildirimleriGetir(kullanici.uid, token);
      setBildirimler(liste);

      // Okunmamışları okundu yap
      const okunmamislar = liste.filter((b) => !b.okundu);
      for (const b of okunmamislar) {
        // ✅ DÜZELTİLDİ: ?auth=${token} eklendi
        await fetch(`${DB_URL}/bildirimler/${kullanici.uid}/${b.id}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ okundu: true }),
        });
      }
      // ✅ İYİLEŞTİRME: UI'ı anında güncelle, reload bekleme
      setBildirimler((prev) => prev.map(b => ({ ...b, okundu: true })));
    } catch (e) {
      console.log('Bildirimler yüklenemedi:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>🔔 Bildirimler</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={s.scroll}>
        {yukleniyor ? (
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 40 }}>Yükleniyor...</Text>
        ) : bildirimler.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>🔔</Text>
            <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>Henüz bildirim yok gari.</Text>
          </View>
        ) : (
          bildirimler.map((b) => (
            <View
              key={b.id}
              style={{
                backgroundColor: b.okundu ? '#FFF' : '#E1F2FE',
                borderRadius: 12, padding: 15, marginBottom: 10,
                borderLeftWidth: 4, borderLeftColor: b.okundu ? '#D1D9E0' : '#1B4965',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', flex: 1 }}>{b.baslik}</Text>
                <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{zamanFarki(b.tarih)}</Text>
              </View>
              <Text style={{ color: '#526E7F', marginTop: 4 }}>{b.mesaj}</Text>
              {/* ✅ DÜZELTİLDİ: & & → && */}
              {!b.okundu && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1B4965', position: 'absolute', top: 15, right: 15 }} />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}