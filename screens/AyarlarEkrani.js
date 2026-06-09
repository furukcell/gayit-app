// ============================================================
// AyarlarEkrani.js — PRODUCTION READY
// ============================================================
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Switch, Linking,
} from 'react-native';
import { DB_URL, API_KEY } from '../constants';
import { kullanicininTumVerileriniSil } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function AyarlarEkrani({ kullanici, setKullanici, token, setEkran, karanlikMod, setKaranlikMod, s }) {
  const [bildirimAcik, setBildirimAcik] = useState(true);
  const [sifreyukleniyor, setSifreYukleniyor] = useState(false);

  const sifreDegistir = async () => {
    Alert.alert(
      'Şifre Değiştir',
      `${kullanici.email} adresine şifre sıfırlama linki gönderilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            try {
              setSifreYukleniyor(true);
              const res = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    requestType: 'PASSWORD_RESET',
                    email: kullanici.email,
                  }),
                }
              );
              if (res.ok) {
                Alert.alert('Mail Gönderildi ✅', `${kullanici.email} adresine şifre sıfırlama linki gönderildi. Mailinizi kontrol edin.`);
              } else {
                const hata = await res.json();
                Alert.alert('Hata', hata?.error?.message || 'Bir sorun oluştu, tekrar dene.');
              }
            } catch (e) {
              console.log('Şifre sıfırlama hatası:', e);
              Alert.alert('Hata', 'İnternet bağlantınızı kontrol edin.');
            } finally {
              setSifreYukleniyor(false);
            }
          },
        },
      ]
    );
  };

  const hesabiSil = () => {
    Alert.alert(
      'Hesabı Sil',
      '⚠️ DİKKAT!\n\nHesabın ve TÜM verilerin KALICI olarak silinecek:\n• İlanların\n• Belgelerin\n• Puanların\n• Sohbetlerin\n\nBu işlem geri alınamaz!',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Hepsini Sil',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Son Uyarı',
              'Hesabını ve tüm verilerini SİLMEK istediğinden emin misin?',
              [
                { text: 'Hayır', style: 'cancel' },
                {
                  text: 'Evet, Kesinlikle Sil',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      Alert.alert('İşleniyor...', 'Verilerin siliniyor, lütfen bekle.');
                      await kullanicininTumVerileriniSil(kullanici.uid, token, kullanici);
                      await AsyncStorage.multiRemove([
                        'oturum_token',
                        'oturum_refresh_token',
                        'oturum_kullanici',
                      ]);
                      setKullanici(null);
                      setEkran('karsilama');
                      Alert.alert('Hesap Silindi ✅', 'Tüm verilerin başarıyla silindi.');
                    } catch (e) {
                      console.log('Hesap silme hatası:', e);
                      Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu.');
                    }
                  },
                },
              ]
            );
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
        <Text style={s.headerBaslik}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={s.scroll}>

        {/* HESAP */}
        <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', marginHorizontal: 15, marginTop: 10, marginBottom: 6, letterSpacing: 1 }}>
          HESAP
        </Text>
        <View style={[s.kart, { marginBottom: 4 }]}>
          <Text style={{ color: '#526E7F', fontSize: 13 }}>Giriş yapılan hesap</Text>
          <Text style={{ color: '#1B4965', fontWeight: 'bold', marginTop: 2 }}>{kullanici?.email}</Text>
        </View>
        <TouchableOpacity
          style={[s.kart, { marginBottom: 10 }]}
          onPress={sifreDegistir}
          disabled={sifreyukleniyor}
        >
          <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>
            🔑 {sifreyukleniyor ? 'Gönderiliyor...' : 'Şifre Değiştir'}
          </Text>
          <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 3 }}>
            E-postanıza sıfırlama linki gönderilir
          </Text>
        </TouchableOpacity>

        {/* TERCİHLER */}
        <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', marginHorizontal: 15, marginTop: 10, marginBottom: 6, letterSpacing: 1 }}>
          TERCİHLER
        </Text>
        <View style={[s.kart, { marginBottom: 4 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>🔔 Bildirimler</Text>
            <Switch
              value={bildirimAcik}
              onValueChange={setBildirimAcik}
              trackColor={{ false: '#D1D9E0', true: '#588157' }}
              thumbColor="#FFF"
            />
          </View>
        </View>
        <View style={[s.kart, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>🌙 Karanlık Mod</Text>
            <Switch
              value={karanlikMod}
              onValueChange={setKaranlikMod}
              trackColor={{ false: '#D1D9E0', true: '#1B4965' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

       {/* UYGULAMA */}
        <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', marginHorizontal: 15, marginTop: 10, marginBottom: 6, letterSpacing: 1 }}>
          UYGULAMA
        </Text>
        <TouchableOpacity
          style={[s.kart, { marginBottom: 10 }]}
          onPress={() => Linking.openURL('mailto:destek.fkdigital@gmail.com')}
        >
          <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>✉️ Destek: destek.fkdigital@gmail.com</Text>
        </TouchableOpacity>
        <View style={[s.kart, { marginBottom: 20 }]}>
          <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>Sürüm 1.1.2 — com.gayit.android</Text>
        </View>
       {/* HESABI SİL */}
        <TouchableOpacity
          style={[s.girisBtn, { backgroundColor: '#FF4444', marginHorizontal: 15, marginBottom: 40 }]}
          onPress={hesabiSil}
        >
          <Text style={s.anaBtnY}>🗑️ HESABI SİL</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
