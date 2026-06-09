// ============================================================
// DavetEkrani.js
// Davet et, kazan ekranı
// ============================================================
import Clipboard from '@react-native-clipboard/clipboard';
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Linking, Share,
} from 'react-native';
import { referansKoduOlustur } from '../constants';

export function DavetEkrani({ kullanici, setEkran, s }) {
  const refKod = kullanici?.referansKodu || referansKoduOlustur();
  const paylasimMetni = 'GAYIT uygulamasını kullanıyorum! Muğla\'nın en iyi usta platformu. Davet kodumla kayıt ol, ikimiz de kazanalım! Kodum: ' + refKod + '\n\nHemen İndir: https://play.google.com/store/apps/details?id=com.gayit.android';
  const [kopyalandi, setKopyalandi] = useState(false);
  const kopyala = () => {
    Clipboard.setString(refKod);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  };

  const adimlar = kullanici?.rol === 'usta'
    ? [
        { num: '1️⃣', text: "Arkadaşını GAYİT'a davet et" },
        { num: '2️⃣', text: 'O, kayıt olurken senin kodunu girsin' },
        { num: '3️⃣', text: 'Usta davet ettiysen +3 teklif, müşteri davet ettiysen +1 teklif hakkı kazanırsın! (Max 5 davet)' },
      ]
    : [
        { num: '1️⃣', text: "Arkadaşını GAYİT'a davet et" },
        { num: '2️⃣', text: 'O, kayıt olurken senin kodunu girsin' },
        { num: '3️⃣', text: 'İkiniz de +1 ilan hakkı kazanırsınız! (Max 5 davet)' },
      ];

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Davet Et, Kazan</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* Kod kartı */}
        <View style={{ backgroundColor: '#1B4965', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 25 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>Senin Davet Kodun</Text>
          <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 15 }}>{refKod}</Text>
          {kopyalandi && (
            <View style={{ backgroundColor: '#588157', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>✅ Kopyalandı!</Text>
            </View>
          )}
          <TouchableOpacity style={{ backgroundColor: '#588157', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }} onPress={kopyala}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>📋 Kodu Kopyala</Text>
          </TouchableOpacity>
        </View>

        {/* Davet sayacı */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 5 }}>Davet Durumu</Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#1B4965' }}>
            {kullanici?.davetSayisi || 0}<Text style={{ fontSize: 18, color: '#526E7F' }}>/5</Text>
          </Text>
          <Text style={{ color: '#526E7F', fontSize: 13, marginTop: 4 }}>
            {(kullanici?.davetSayisi || 0) >= 5
              ? '⚠️ Davet limitine ulaştın, artık hak verilmiyor'
              : `${5 - (kullanici?.davetSayisi || 0)} davet hakkın daha var`}
          </Text>
        </View>

        {/* Nasıl çalışır */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15 }}>Nasıl Çalışır? 🎁</Text>
          {adimlar.map((adim, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{adim.num}</Text>
              <Text style={{ color: '#526E7F', flex: 1 }}>{adim.text}</Text>
            </View>
          ))}
        </View>

        {/* Paylaş butonları */}
        <TouchableOpacity
          style={[s.girisBtn, { backgroundColor: '#25D366', marginBottom: 15 }]}
          onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(paylasimMetni)}`)}
        >
          <Text style={s.anaBtnY}>📱 WhatsApp'ta Paylaş</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.girisBtn} onPress={() => Share.share({ message: paylasimMetni })}>
          <Text style={s.anaBtnY}>🔗 Diğer Uygulamalarla Paylaş</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
