// ============================================================
// HizmetKosullariEkrani.js
// Hizmet koşulları ekranı
// ============================================================

import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

const MADDELER = [
  { baslik: '1. Hizmetin Kapsamı', icerik: 'GAYIT, Muğla ve ilçelerinde hizmet veren ustalar ile hizmet almak isteyen kullanıcıları buluşturan bir dijital platformdur.' },
  { baslik: '2. Üyelik ve Güvenlik', icerik: 'Sisteme kayıt olurken beyan edilen bilgilerin doğruluğundan kullanıcı sorumludur.' },
  { baslik: '3. Teklif ve Anlaşma Süreci', icerik: 'Verilen teklifler bağlayıcıdır. Anlaşma sağlandığında tarafların iletişim bilgileri karşılıklı açılır.' },
  { baslik: '4. Ödeme ve İade Politikası', icerik: 'Satın alınan dijital içerikler iade edilemez.' },
  { baslik: '5. Sorumluluk Sınırları', icerik: 'GAYIT, platform kullanıcılarının davranışlarından hukuki olarak sorumlu değildir.' },
  { baslik: '6. Kişisel Verilerin Korunması', icerik: 'Telefon numaranız, "Anlaşma" butonuna basana kadar üçüncü taraflarla paylaşılmaz.' },
  { baslik: '7. Değişiklik Hakkı', icerik: 'GAYIT yönetimi, hizmet bedellerini ve koşulları güncelleme hakkını saklı tutar.' },
];

export function HizmetKosullariEkrani({ setEkran, setSozlesmeKabul, kayittan, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran(kayittan ? 'auth' : 'anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Hizmet Koşulları</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15, textAlign: 'center' }}>
          GAYIT KULLANIM VE HİZMET KOŞULLARI
        </Text>
        {MADDELER.map((madde, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#1B4965', marginBottom: 5 }}>{madde.baslik}</Text>
            <Text style={{ color: '#526E7F', lineHeight: 22 }}>{madde.icerik}</Text>
          </View>
        ))}
        {kayittan && (
          <TouchableOpacity
            style={[s.girisBtn, { marginBottom: 40 }]}
            onPress={() => { if (setSozlesmeKabul) setSozlesmeKabul(true); setEkran('auth'); }}
          >
            <Text style={s.anaBtnY}>✅ OKUDUM, ANLADIM</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
