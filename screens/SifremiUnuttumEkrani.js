// ============================================================
// SifremiUnuttumEkrani.js
// ============================================================

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { API_KEY } from '../constants';

export function SifremiUnuttumEkrani({ setEkran, s }) {
  const [sifremiUnuttumEmail, setSifremiUnuttumEmail] = useState('');

  const sifreSifirla = async () => {
    if (!sifremiUnuttumEmail)
      return Alert.alert('Eksik Bilgi', 'E-posta adresini giriver!');
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: sifremiUnuttumEmail }),
        }
      );
      const data = await res.json();
      if (data.error) return Alert.alert('Hata', 'Bu e-posta dükkanda kayıtlı değil!');
      Alert.alert('Başarılı ✅', 'Şifre sıfırlama bağlantısı e-postana uçuruldu!');
      setEkran('auth');
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası gari!');
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('auth')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Şifremi Unuttum</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.authIc}>
        <Text style={{ textAlign: 'center', fontSize: 48, marginBottom: 10 }}>🔑</Text>
        <Text style={[s.bas, { textAlign: 'center', marginBottom: 10 }]}>Şifre Sıfırlama</Text>
        <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 20 }}>
          Kayıtlı e-posta adresinizi girin. Şifre sıfırlama bağlantısı göndereceğiz usta.
        </Text>
        <TextInput
          style={s.inp}
          placeholder="E-posta adresiniz"
          value={sifremiUnuttumEmail}
          onChangeText={setSifremiUnuttumEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={[s.girisBtn, { marginTop: 10 }]} onPress={sifreSifirla}>
          <Text style={s.anaBtnY}>SIFIRLAMA BAĞLANTISI GÖNDER</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEkran('auth')}>
          <Text style={{ textAlign: 'center', marginTop: 15, color: '#1B4965' }}>← Giriş Sayfasına Dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
