// ============================================================
// ADIM 9 — PackageScreens.js
// Ödeme, Paket, Kupon, Davet, Ayarlar, Hakkımızda,
// Hizmet Koşulları, İletişim ekranları
// ============================================================

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Switch, Linking, Share
} from 'react-native';
import { DB_URL, referansKoduOlustur } from './constants';

// ============================================================
// ÖDEME & PAKET EKRANI
// ============================================================
export function OdemeEkrani({ kullanici, setKullanici, token, rol, setEkran, s }) {
  const [odemeAdim, setOdemeAdim] = useState('secim');
  const [kuponKod, setKuponKod] = useState('');

  const kuponUygula = async () => {
    if (kuponKod.toUpperCase() === 'BAYRAM2026') {
      const haziranBirTarihi = 1748908800000;
      setKullanici({ ...kullanici, abonelik: true, abonelikBitis: haziranBirTarihi });
      if (token) {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ abonelik: true, abonelikBitis: haziranBirTarihi }),
        });
      }
      Alert.alert('Bayram Hediyesi! 🎉', '1 Haziran\'a kadar sınırsız kullanım tanımlandı usta!');
      setEkran('anasayfa');
    } else {
      Alert.alert('Hata', 'Geçersiz kod girdin veya kampanya bitmiş gari.');
    }
  };

  const hakSatin = async () => {
    const eklenecekHak = rol === 'usta' ? 3 : 1;
    const yeniHak = (kullanici?.hak || 0) + eklenecekHak;
    setKullanici({ ...kullanici, hak: yeniHak });
    if (token && kullanici?.uid) {
      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hak: yeniHak }),
      });
    }
    Alert.alert(
      'Başarılı! ✅',
      rol === 'usta' ? '3 adet teklif verme hakkı tanımlandı usta!' : '1 adet ilan verme hakkı tanımlandı!'
    );
    setEkran('anasayfa');
  };

  const abonelikAl = async () => {
    const otuzGunSonra = Date.now() + 2592000000;
    setKullanici({ ...kullanici, abonelik: true, abonelikBitis: otuzGunSonra });
    if (token && kullanici?.uid) {
      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abonelik: true, abonelikBitis: otuzGunSonra }),
      });
    }
    Alert.alert('Başarılı! 🎉', 'Aylık sınırsız abonelik aktifleştirildi gari!');
    setEkran('anasayfa');
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Paket & Kupon</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={s.authIc}>
        {odemeAdim === 'secim' && (
          <>
            <TouchableOpacity style={[s.anaBtn, { marginBottom: 15 }]} onPress={() => setOdemeAdim('kupon')}>
              <Text style={s.anaBtnY}>🎫 Kupon Kodu Kullan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965' }]} onPress={() => setOdemeAdim('paket')}>
              <Text style={s.anaBtnY}>💳 Ödeme Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEkran('anasayfa')}>
              <Text style={s.vazgec}>Vazgeç</Text>
            </TouchableOpacity>
          </>
        )}

        {odemeAdim === 'kupon' && (
          <>
            <Text style={s.alt}>Kupon Kodunu Girin</Text>
            <View style={s.kuponBolumu}>
              <TextInput
                style={s.kuponInp}
                placeholder="Kupon kodu..."
                onChangeText={setKuponKod}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={s.kuponBtn} onPress={kuponUygula}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>UYGULA</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setOdemeAdim('secim')}>
              <Text style={s.vazgec}>Geri Dön</Text>
            </TouchableOpacity>
          </>
        )}

        {odemeAdim === 'paket' && (
          <>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#588157', marginTop: 15 }]} onPress={hakSatin}>
              <Text style={s.anaBtnY}>
                {rol === 'usta' ? '3 Teklif Verme Hakkı (50 TL)' : '1 Adet İlan Hakkı (50 TL)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965', marginTop: 15 }]} onPress={abonelikAl}>
              <Text style={s.anaBtnY}>Aylık Sınırsız Abonelik (100 TL)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOdemeAdim('secim')}>
              <Text style={s.vazgec}>Geri Dön</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// DAVET ET KAZAN EKRANI
// ============================================================
export function DavetEkrani({ kullanici, setEkran, s }) {
  const refKod = kullanici?.referansKodu || referansKoduOlustur();
  const paylasimMetni = `GAYİT uygulamasını kullanıyorum! Muğla'nın en iyi usta platformu. Davet kodumla kayıt ol, ikimiz de hak kazanalım!\n\nDavet Kodum: ${refKod}\n\nİndirmek için: gayit.com.tr`;

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
        <View style={{ backgroundColor: '#1B4965', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 25 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>Senin Davet Kodun</Text>
          <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 15 }}>{refKod}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#588157', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
            onPress={() => Alert.alert('Kopyalandı! ✅', `${refKod} kodun kopyalandı usta!`)}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>📋 Kodu Kopyala</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15 }}>Nasıl Çalışır? 🎁</Text>
          {[
            { num: '1️⃣', text: 'Arkadaşını GAYİT\'a davet et' },
            { num: '2️⃣', text: 'O, kayıt olurken senin kodunu girsin' },
            { num: '3️⃣', text: 'İkiniz de +1 hak kazanırsınız!' },
          ].map((adim, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{adim.num}</Text>
              <Text style={{ color: '#526E7F', flex: 1 }}>{adim.text}</Text>
            </View>
          ))}
        </View>

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

// ============================================================
// AYARLAR EKRANI
// ============================================================
export function AyarlarEkrani({ kullanici, setKullanici, token, setEkran, s }) {
  const [bildirimAcik, setBildirimAcik] = useState(true);
  const [karanlikMod, setKaranlikMod] = useState(false);

  const hesabiSil = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabını silmek istediğinden emin misin? Bu işlem geri alınamaz usta!',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (token && kullanici?.uid) {
                await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                  method: 'DELETE',
                });
              }
              setKullanici(null);
              setEkran('karsilama');
            } catch (e) {
              Alert.alert('Hata', 'Hesap silinemedi gari!');
            }
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
        <View style={[s.kart, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>🔔 Bildirimler</Text>
            <Switch value={bildirimAcik} onValueChange={setBildirimAcik} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
          </View>
        </View>

        <View style={[s.kart, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>🌙 Karanlık Mod</Text>
            <Switch value={karanlikMod} onValueChange={setKaranlikMod} trackColor={{ false: '#D1D9E0', true: '#1B4965' }} thumbColor="#FFF" />
          </View>
          <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 4 }}>Yakında aktif olacak</Text>
        </View>

        <TouchableOpacity style={[s.kart, { marginBottom: 10 }]} onPress={() => Linking.openURL('mailto:info@gayit.com.tr')}>
          <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>✉️ Destek: info@gayit.com.tr</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.girisBtn, { backgroundColor: '#FF4444', marginTop: 20, marginHorizontal: 15, marginBottom: 40 }]}
          onPress={hesabiSil}
        >
          <Text style={s.anaBtnY}>🗑️ HESABI SİL</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// İLETİŞİM EKRANI
// ============================================================
export function IletisimEkrani({ kullanici, setEkran, s }) {
  const [iletisimKonu, setIletisimKonu] = useState('');
  const [iletisimMesaj, setIletisimMesajState] = useState('');

  const iletisimGonder = async () => {
    if (!iletisimKonu || !iletisimMesaj) {
      Alert.alert('Eksik Bilgi', 'Konu ve mesaj alanlarını boş bırakma!');
      return;
    }
    try {
      await fetch(`${DB_URL}/iletisim.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          konu: iletisimKonu,
          mesaj: iletisimMesaj,
          gonderen: kullanici?.email || 'Anonim',
          tarih: Date.now(),
        }),
      });
      Alert.alert('Teşekkürler! 💙', 'Mesajın yönetime iletildi usta!');
      setIletisimKonu('');
      setIletisimMesajState('');
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi gari!');
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
      <ScrollView contentContainerStyle={s.authIc}>
        <View style={{ backgroundColor: '#E1F2FE', padding: 20, borderRadius: 16, marginBottom: 25, alignItems: 'center' }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>✉️</Text>
          <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 16 }}>info@gayit.com.tr</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:info@gayit.com.tr')} style={{ marginTop: 8 }}>
            <Text style={{ color: '#588157', fontSize: 13, textDecorationLine: 'underline' }}>E-posta Gönder</Text>
          </TouchableOpacity>
        </View>
        <Text style={[s.bas, { marginBottom: 15 }]}>Bize Yazın</Text>
        <Text style={s.inputBaslik}>Konu</Text>
        <TextInput style={s.inp} placeholder="Mesajınızın konusu" value={iletisimKonu} onChangeText={setIletisimKonu} />
        <Text style={s.inputBaslik}>Mesajınız</Text>
        <TextInput
          style={[s.inp, { height: 120, textAlignVertical: 'top' }]}
          placeholder="Mesajınızı buraya yazın usta..."
          value={iletisimMesaj}
          onChangeText={setIletisimMesajState}
          multiline
        />
        <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={iletisimGonder}>
          <Text style={s.anaBtnY}>MESAJ GÖNDER</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// HAKKIMIZDA EKRANI
// ============================================================
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
        <View style={{ alignItems: 'center', marginBottom: 25 }}>
          <Text style={{ fontSize: 60 }}>🔧</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1B4965', marginTop: 10 }}>GAYİT</Text>
          <Text style={{ color: '#8B7355', fontStyle: 'italic', marginTop: 5 }}>Muğla'nın bütün işi gaydı artık burada</Text>
        </View>
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 10 }}>Biz Kimiz?</Text>
          <Text style={{ color: '#526E7F', lineHeight: 22 }}>
            GAYİT, Muğla'daki usta ve müşterileri bir araya getiren yerel bir platformdur. Tesisat, elektrik, boyacı, temizlik ve daha birçok alanda ihtiyaç sahiplerini güvenilir ustalarla buluşturuyoruz.
          </Text>
        </View>
        <View style={{ backgroundColor: '#E8F5E9', borderRadius: 16, padding: 20, marginBottom: 30 }}>
          <Text style={{ color: '#588157', fontWeight: 'bold', textAlign: 'center' }}>📧 info@gayit.com.tr</Text>
          <Text style={{ color: '#588157', textAlign: 'center', marginTop: 5 }}>🌐 gayit.com.tr</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// HİZMET KOŞULLARI EKRANI
// ============================================================
export function HizmetKosullariEkrani({ setEkran, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Hizmet Koşulları</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15, textAlign: 'center' }}>
          GAYİT KULLANIM KOŞULLARI
        </Text>
        {[
          { baslik: '1. Genel Hükümler', icerik: 'GAYİT platformunu kullanarak bu koşulları kabul etmiş sayılırsınız. Platform, usta ile müşteri arasında aracılık hizmeti sunar.' },
          { baslik: '2. Kullanıcı Sorumlulukları', icerik: 'Kayıt olurken doğru bilgi verme yükümlülüğünüz bulunmaktadır. Yanıltıcı ilan veya teklif vermek hesabınızın kapatılmasına neden olabilir.' },
          { baslik: '3. Ödeme ve Haklar', icerik: 'Satın alınan haklar ve abonelikler iade edilemez.' },
          { baslik: '4. Gizlilik', icerik: 'Telefon numaranız yalnızca anlaşma sağlandığında karşı tarafa iletilir. Verileriniz üçüncü kişilerle paylaşılmaz.' },
          { baslik: '5. Değişiklik Hakkı', icerik: 'GAYİT, bu koşulları önceden bildirmeksizin güncelleme hakkını saklı tutar.' },
        ].map((madde, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#1B4965', marginBottom: 5 }}>{madde.baslik}</Text>
            <Text style={{ color: '#526E7F', lineHeight: 22 }}>{madde.icerik}</Text>
          </View>
        ))}
        <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => setEkran('auth')}>
          <Text style={s.anaBtnY}>✅ OKUDUM, ANLADIM</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
