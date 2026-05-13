// ============================================================
// KvkkEkrani.js
// ============================================================

import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

export function KvkkEkrani({ setEkran, setKvkkKabul, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('auth')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>KVKK Aydınlatma</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{ padding: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15, textAlign: 'center' }}>
          GAYİT KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ
        </Text>
        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>1. Veri Sorumlusu</Text>
        <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>
          6698 sayılı KVKK uyarınca, GAYİT Platformu olarak kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında işlemekteyiz.
        </Text>
        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>2. İşlenen Kişisel Verileriniz</Text>
        <Text style={{ color: '#526E7F', marginBottom: 3, lineHeight: 22 }}>• Kimlik Verisi: Ad, soyad.</Text>
        <Text style={{ color: '#526E7F', marginBottom: 3, lineHeight: 22 }}>• İletişim Verisi: E-posta, telefon numarası.</Text>
        <Text style={{ color: '#526E7F', marginBottom: 3, lineHeight: 22 }}>• Konum Verisi: İlçe ve mahalle bilgisi.</Text>
        <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>• Mesleki Veri: (Ustalar için) Branş, teklifler, ilan detayları, puanlamalar.</Text>
        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>3. İşlenme Amacı</Text>
        <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>
          Müşteri ile Usta arasındaki iletişimin sağlanması, üyelik işlemlerinin yapılması, sistem güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi.
        </Text>
        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>4. Veri Aktarımı</Text>
        <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>
          Telefon numaranız yalnızca "ANLAŞMA SAĞLANDI" butonuna basıldığında karşı tarafa gösterilir. Verileriniz üçüncü şahıslara veya reklam şirketlerine satılmaz.
        </Text>
        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>5. Kullanıcı Hakları</Text>
        <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>
          Verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini isteme ve "Hesabı Sil" özelliğini kullanarak tamamen silinmesini talep etme haklarına sahipsiniz.
        </Text>
        <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 20 }}>
          <Text style={{ color: '#588157', fontWeight: 'bold', textAlign: 'center' }}>Kayıt olarak bu metni onaylıyorsunuz.</Text>
        </View>
        <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => {
          if (setKvkkKabul) setKvkkKabul(true);
          setEkran('auth');
        }}>
          <Text style={s.anaBtnY}>✅ OKUDUM VE ONAYLIYORUM</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
