// ============================================================
// IletisimEkrani.js
// Kullanıcı ↔ yönetim mesajlaşma ekranı
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert,
} from 'react-native';
import { DB_URL } from './constants';

export function IletisimEkrani({ kullanici, setEkran, s }) {
  const [iletisimKonu, setIletisimKonu] = useState('');
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [gecmisMesajlar, setGecmisMesajlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => { mesajlariYukle(); }, []);

  const mesajlariYukle = async () => {
    if (!kullanici?.email) return;
    try {
      const res = await fetch(`${DB_URL}/iletisim.json`);
      const data = await res.json();
      if (!data) { setGecmisMesajlar([]); setYukleniyor(false); return; }

      const benimMesajlar = Object.entries(data)
        .filter(([, m]) => m.gonderen === kullanici.email)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => a.tarih - b.tarih);

      const mesajlarVeYanitlar = await Promise.all(
        benimMesajlar.map(async (m) => {
          try {
            const yanitRes = await fetch(`${DB_URL}/iletisim/${m.id}/yan%C4%B1tlar.json`);
            const yanitData = await yanitRes.json();
            const yanitlar = yanitData
              ? Object.entries(yanitData).map(([yid, y]) => ({ id: yid, ...y })).sort((a, b) => a.tarih - b.tarih)
              : [];
            return { ...m, yanitlar };
          } catch { return { ...m, yanitlar: [] }; }
        })
      );
      setGecmisMesajlar(mesajlarVeYanitlar);
    } catch (e) {
      console.log('Mesajlar yüklenemedi:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  const mesajGonder = async () => {
    if (!iletisimKonu.trim() || !yeniMesaj.trim()) {
      Alert.alert('Eksik Bilgi', 'Konu ve mesaj alanlarını boş bırakma!');
      return;
    }
    try {
      await fetch(`${DB_URL}/iletisim.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ konu: iletisimKonu, mesaj: yeniMesaj, gonderen: kullanici?.email || 'Anonim', tarih: Date.now() }),
      });
      Alert.alert('Teşekkürler! 💙', 'Mesajın yönetime iletildi!');
      setIletisimKonu('');
      setYeniMesaj('');
      mesajlariYukle();
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi!');
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>İletişim</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {yukleniyor ? (
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 20 }}>Yükleniyor...</Text>
        ) : gecmisMesajlar.length > 0 ? (
          gecmisMesajlar.map((m) => (
            <View key={m.id} style={{ marginBottom: 20 }}>
              <View style={{ alignSelf: 'flex-end', backgroundColor: '#1B4965', borderRadius: 12, padding: 12, maxWidth: '80%', marginBottom: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 }}>{m.konu}</Text>
                <Text style={{ color: '#FFF' }}>{m.mesaj}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                  {new Date(m.tarih).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              {m.yanitlar.map((y) => (
                <View key={y.id} style={{ alignSelf: 'flex-start', backgroundColor: '#E1F2FE', borderRadius: 12, padding: 12, maxWidth: '80%', marginBottom: 8 }}>
                  <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 11, marginBottom: 3 }}>🛡️ GAYİT Yönetimi</Text>
                  <Text style={{ color: '#1B4965' }}>{y.metin}</Text>
                  <Text style={{ color: '#A3B1B9', fontSize: 10, marginTop: 4 }}>
                    {new Date(y.tarih).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              ))}
            </View>
          ))
        ) : null}

        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 15, elevation: 2, marginTop: 10 }}>
          <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 10 }}>✉️ Yeni Mesaj</Text>
          <Text style={s.inputBaslik}>Konu</Text>
          <TextInput style={s.inp} placeholder="Mesajınızın konusu" value={iletisimKonu} onChangeText={setIletisimKonu} />
          <Text style={s.inputBaslik}>Mesajınız</Text>
          <TextInput
            style={[s.inp, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Mesajınızı buraya yazın..."
            value={yeniMesaj}
            onChangeText={setYeniMesaj}
            multiline
          />
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 10 }]} onPress={mesajGonder}>
            <Text style={s.anaBtnY}>MESAJ GÖNDER</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
