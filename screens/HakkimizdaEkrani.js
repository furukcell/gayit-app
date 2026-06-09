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

        {/* BİZ KİMİZ */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Biz Kimiz?</Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, marginBottom: 15, textAlign: 'justify' }}>
            GAYIT, dışarıdan bir girişim değil; Muğla'nın toprağında doğmuş, bu coğrafyanın insanını, esnafını ve ihtiyaçlarını yakından tanıyan yerel bir platformdur.
          </Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, textAlign: 'justify' }}>
            Bodrum'dan Milas'a, Dalaman'dan Fethiye, Yatağan'dan  Muğla merkezine kadar tüm ilçelerde; temizlikçi, tesisatçı, elektrikçi, klimacı, boyacı, nakliyeci ve daha pek çok hizmet dalında müşterilerle gerçek ustaları buluşturuyoruz.
          </Text>
        </View>

        {/* AMACIMIZ */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Amacımız</Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, marginBottom: 12, textAlign: 'justify' }}>
            Kendi memleketimizde iş yaptırmanın zorluklarını biliyoruz. Usta ararken eşe dosta sorma devrini geride bırakıp; teknoloji sayesinde en yakın, en güvenilir ve işinin eri ustayı tek tıkla bulmanızı sağlıyoruz.
          </Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, textAlign: 'justify' }}>
            Müşteriler ihtiyaç duydukları iş için ilan oluşturur. Ustalar kendi branşlarına ve bölgelerine uygun ilanlara teklif verir. Taraflar anlaştığında sohbet, iletişim, konum paylaşımı ve iş takibi tamamen uygulama içinde ilerler.
          </Text>
        </View>

        {/* NASIL ÇALIŞIR */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 14 }}>Nasıl Çalışır?</Text>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 3 }}>İlan Oluştur</Text>
              <Text style={{ color: '#526E7F', lineHeight: 22 }}>Müşteri, ihtiyacını ve bölgesini belirterek ilan açar.</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>🔨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 3 }}>Teklif Al</Text>
              <Text style={{ color: '#526E7F', lineHeight: 22 }}>Bölgedeki ustalar ilana teklif verir.</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>🤝</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 3 }}>Anlaş</Text>
              <Text style={{ color: '#526E7F', lineHeight: 22 }}>Beğendiğin ustayla anlaşma sağla, iletişim bilgileri açılır.</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 3 }}>Puanla</Text>
              <Text style={{ color: '#526E7F', lineHeight: 22 }}>İş tamamlandıktan sonra ustayı puanla, topluluğa katkı sağla.</Text>
            </View>
          </View>
        </View>

        {/* NEDEN GAYIT */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Neden GAYIT?</Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, marginBottom: 10, textAlign: 'justify' }}>
            Çünkü biz buralıyız! Sizinle aynı sokaklarda yürüyor, aynı sorunları yaşıyoruz.
          </Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, marginBottom: 4 }}>• Anlaşma olmadan telefon numarası paylaşılmaz</Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, marginBottom: 4 }}>• Onaylı Usta sistemiyle güvenilir hizmet</Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, marginBottom: 4 }}>• Muğla'ya özel, yerel ve kontrollü bir platform</Text>
          <Text style={{ color: '#526E7F', lineHeight: 23, marginBottom: 4 }}>• Puanlama ve şikâyet mekanizmasıyla hesap verebilirlik</Text>
          <Text style={{ color: '#526E7F', lineHeight: 23 }}>• Konum paylaşımı ve Google Maps entegrasyonu</Text>
        </View>

        {/* SÜRÜM BİLGİSİ */}
        <View style={{ backgroundColor: '#F0F4F8', borderRadius: 16, padding: 16, marginBottom: 15 }}>
          <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 8, fontSize: 14 }}>Uygulama Bilgisi</Text>
          <Text style={{ color: '#526E7F', fontSize: 13, lineHeight: 22 }}>Sürüm: 1.1.2</Text>
          <Text style={{ color: '#526E7F', fontSize: 13, lineHeight: 22 }}>Paket: com.gayit.android</Text>
          <Text style={{ color: '#526E7F', fontSize: 13, lineHeight: 22 }}>Geliştirici: Faruk Kurtuluş</Text>
          <Text style={{ color: '#526E7F', fontSize: 13, lineHeight: 22 }}>İletişim: destek.fkdigital@gmail.com</Text>
        </View>

        {/* SLOGAN */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, alignItems: 'center' }}>
          <Text style={{ color: '#526E7F', fontSize: 13, textAlign: 'center', marginBottom: 8, fontStyle: 'italic' }}>
            "Muğla'nın bütün işi gaydı artık burada"
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 24, color: '#E67E22', textAlign: 'center', fontStyle: 'italic' }}>
            Gullanın Gari!! 🧡
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
