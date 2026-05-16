// ============================================================
// HakkimizdaEkrani.js
// Hakkımızda ekranı
// ============================================================

import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

export function HakkimizdaEkrani({ setEkran, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Hakkımızda</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 }}>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Biz Kimiz?</Text>
          <Text style={{ color: '#526E7F', lineHeight: 22, marginBottom: 15, textAlign: 'justify' }}>
            GAYIT, dışarıdan bir girişim değil; Muğla'nın toprağında doğmuş, bu coğrafyanın insanını, esnafını ve ihtiyaçlarını yakından tanıyan yerel bir platformdur.
          </Text>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Amacımız</Text>
          <Text style={{ color: '#526E7F', lineHeight: 22, marginBottom: 15, textAlign: 'justify' }}>
            Kendi memleketimizde iş yaptırmanın zorluklarını biliyoruz. Usta ararken eşe dosta sorma devrini geride bırakıp; teknoloji sayesinde en yakın, en güvenilir ve işinin eri ustayı tek tıkla bulmanızı sağlıyoruz.
          </Text>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Neden GAYIT?</Text>
          <Text style={{ color: '#526E7F', lineHeight: 22, marginBottom: 20, textAlign: 'justify' }}>
            Çünkü biz buralıyız! Sizinle aynı sokaklarda yürüyor, aynı sorunları yaşıyoruz. GAYIT, "Muğla'nın bütün işi gaydı artık burada" sloganıyla yola çıktı.
          </Text>

          <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#E67E22', textAlign: 'center', fontStyle: 'italic', marginTop: 10 }}>
            Gullanın Gari!!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
