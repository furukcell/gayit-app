// ============================================================
// ADIM 4 — AuthScreens.js
// Karşılama, Giriş/Kayıt, KVKK, Şifremi Unuttum ekranları
// ============================================================

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, Switch, Linking
} from 'react-native';
import { API_KEY, DB_URL, BOLGELER, KATEGORILER, referansKoduOlustur } from './constants';
import { pushTokenAl } from './notifications';

// ============================================================
// KARŞILAMA EKRANI
// ============================================================
export function KarsilamaEkrani({ setRol, setMod, setEkran, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.ic}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: -30 }}>
            <Image
              source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }}
              style={{ width: 180, height: 180 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 36, fontWeight: '600', color: '#1B4965', letterSpacing: 4, marginLeft: -45, marginTop: 35, fontFamily: 'serif' }}>
              AYIT
            </Text>
          </View>
          <Text style={{ color: '#8B7355', fontSize: 14, fontStyle: 'italic', marginTop: -30 }}>
            Muğla'nın bütün işi gaydı artık burada
          </Text>
        </View>

        <View style={s.btnAlan}>
          <TouchableOpacity
            style={[s.anaBtn, { backgroundColor: '#1B4965' }]}
            onPress={() => { setRol('usta'); setMod('kayit'); setEkran('auth'); }}
          >
            <Text style={s.anaBtnY}>Usta Girişi / Kayıt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.anaBtn, { backgroundColor: '#588157' }]}
            onPress={() => { setRol('musteri'); setMod('kayit'); setEkran('auth'); }}
          >
            <Text style={s.anaBtnY}>Müşteri Girişi / Kayıt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// GİRİŞ / KAYIT EKRANI
// ============================================================
export function AuthEkrani({
  rol, setRol, setEkran, setKullanici, setToken, s
}) {
  const [mod, setMod] = useState('kayit');
  const [ad, setAd] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [kayitBolge, setKayitBolge] = useState('');
  const [kayitBrans, setKayitBrans] = useState('');
  const [davetKodu, setDavetKodu] = useState('');
  const [kvkkKabul, setKvkkKabul] = useState(false);
  const [sozlesmeKabul, setSozlesmeKabul] = useState(false);

  const islemiTamamla = async () => {
    if (!email || !sifre || (mod === 'kayit' && !ad))
      return Alert.alert('Hata', 'Eksik bilgi girdiniz usta!');
    if (mod === 'kayit' && !kayitBolge)
      return Alert.alert('Hata', 'Lütfen bir ilçe seçin gari!');
    if (mod === 'kayit' && rol === 'usta' && !kayitBrans)
      return Alert.alert('Hata', 'Lütfen branş seçin!');
    if (mod === 'kayit' && !kvkkKabul)
      return Alert.alert('Hata', 'KVKK metnini onaylamanız gerekiyor!');
    if (mod === 'kayit' && !sozlesmeKabul)
      return Alert.alert('Hata', 'Üyelik sözleşmesini onaylamanız gerekiyor!');

    try {
      if (mod === 'kayit') {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: sifre, returnSecureToken: true }),
          }
        );
        const data = await res.json();
        if (data.error) return Alert.alert('Kayıt Hatası', data.error.message);

        setToken(data.idToken);
        const cihazToken = await pushTokenAl();
        const refKod = referansKoduOlustur();

        const yeniKul = {
          uid: data.localId,
          ad,
          email,
          rol,
          bolge: kayitBolge,
          telefon: '',
          meslek: rol === 'usta' ? kayitBrans : null,
          hak: 0,
          abonelik: false,
          yeniKullaniciHakki: 3,
          kayitTarihi: Date.now(),
          referansKodu: refKod,
          pushToken: cihazToken || '',
        };

        await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(yeniKul),
        });

        // Davet kodu işlemi
        if (davetKodu.trim()) {
          try {
            const tumKulRes = await fetch(`${DB_URL}/kullanicilar.json`);
            const tumKul = await tumKulRes.json();
            if (tumKul) {
              const davetEdenEntry = Object.entries(tumKul).find(
                ([, k]) => k.referansKodu === davetKodu.toUpperCase().trim()
              );
              if (davetEdenEntry) {
                const [davetEdenUid, davetEdenKul] = davetEdenEntry;
                await fetch(`${DB_URL}/kullanicilar/${davetEdenUid}.json?auth=${data.idToken}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hak: (davetEdenKul.hak || 0) + 1 }),
                });
                yeniKul.hak = 1;
                await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hak: 1 }),
                });
                Alert.alert('Davet Bonusu! 🎁', 'Davet kodunu kullandın, sana ve arkadaşına birer hak eklendi usta!');
              }
            }
          } catch (e) {
            console.log('Davet kodu hatası gari:', e);
          }
        }

        setKullanici({ ...yeniKul, uid: data.localId });
      } else {
        // Giriş modu
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: sifre, returnSecureToken: true }),
          }
        );
        const data = await res.json();
        if (data.error) return Alert.alert('Hata', 'E-posta veya şifre hatalı usta!');

        setToken(data.idToken);
        const kulRes = await fetch(`${DB_URL}/kullanicilar/${data.localId}.json`);
        const kulData = await kulRes.json();

        if (kulData) {
          setKullanici({
            ...kulData,
            uid: data.localId,
            hak: kulData.hak || 0,
            abonelik: kulData.abonelik || false,
            yeniKullaniciHakki: kulData.yeniKullaniciHakki ?? 0,
            abonelikBitis: kulData.abonelikBitis || null,
            kayitTarihi: kulData.kayitTarihi || Date.now(),
            referansKodu: kulData.referansKodu || referansKoduOlustur(),
            bolge: kulData.bolge || 'Belirtilmemiş',
          });
        }
      }
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası gari, internetini bir kontrol et!');
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <ScrollView contentContainerStyle={s.authIc}>
        <View style={{ alignItems: 'center', marginBottom: 25 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Image
              source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }}
              style={{ width: 90, height: 90 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 28, fontWeight: '600', color: '#1B4965', letterSpacing: 3, marginLeft: -20, marginTop: 12, fontFamily: 'serif' }}>
              AYIT
            </Text>
          </View>
        </View>

        <Text style={[s.bas, { textAlign: 'center' }]}>
          {rol === 'usta' ? 'Usta' : 'Müşteri'} Paneli
        </Text>

        <View style={s.tabBar}>
          <TouchableOpacity style={[s.tab, mod === 'kayit' && s.tabAktif]} onPress={() => setMod('kayit')}>
            <Text style={[s.tabY, mod === 'kayit' && s.tabYA]}>Kayıt Ol</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, mod === 'giris' && s.tabAktif]} onPress={() => setMod('giris')}>
            <Text style={[s.tabY, mod === 'giris' && s.tabYA]}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>

        {mod === 'kayit' && (
          <TextInput style={s.inp} placeholder="Ad Soyad" onChangeText={setAd} />
        )}
        <TextInput style={s.inp} placeholder="E-posta" onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={s.inp} placeholder="Şifre" onChangeText={setSifre} secureTextEntry />

        {mod === 'giris' && (
          <TouchableOpacity
            onPress={() => setEkran('sifremi_unuttum')}
            style={{ alignSelf: 'flex-end', marginBottom: 10, marginTop: -5 }}
          >
            <Text style={{ color: '#1B4965', fontSize: 13 }}>Şifremi Unuttum</Text>
          </TouchableOpacity>
        )}

        {mod === 'kayit' && (
          <>
            <Text style={s.inputBaslik}>Bulunduğunuz İlçe</Text>
            <View style={s.chipAlan}>
              {BOLGELER.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[s.chip, kayitBolge === b && s.chipAktif]}
                  onPress={() => setKayitBolge(b)}
                >
                  <Text style={[s.chipY, kayitBolge === b && s.chipYAktif]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {rol === 'usta' && (
              <>
                <Text style={s.inputBaslik}>Branşınız</Text>
                <View style={s.chipAlan}>
                  {KATEGORILER.filter(k => k !== 'Tümü').map(b => (
                    <TouchableOpacity
                      key={b}
                      style={[s.chip, kayitBrans === b && s.chipAktif]}
                      onPress={() => setKayitBrans(b)}
                    >
                      <Text style={[s.chipY, kayitBrans === b && s.chipYAktif]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={s.inputBaslik}>Davet Kodu (İsteğe Bağlı)</Text>
            <TextInput
              style={s.inp}
              placeholder="GAYİT-XXXX"
              value={davetKodu}
              onChangeText={setDavetKodu}
              autoCapitalize="characters"
            />

            <View style={s.onayKutu}>
              <Switch value={kvkkKabul} onValueChange={setKvkkKabul} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <TouchableOpacity onPress={() => setEkran('kvkk')}>
                  <Text style={{ color: '#1B4965', fontSize: 13 }}>
                    <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>KVKK Aydınlatma Metni</Text>'ni okudum, onaylıyorum.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.onayKutu}>
              <Switch value={sozlesmeKabul} onValueChange={setSozlesmeKabul} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <TouchableOpacity onPress={() => setEkran('hizmet_kosullari')}>
                  <Text style={{ color: '#1B4965', fontSize: 13 }}>
                    <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>Üyelik Sözleşmesi</Text>'ni okudum, onaylıyorum.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity style={s.girisBtn} onPress={islemiTamamla}>
          <Text style={s.anaBtnY}>DEVAM ET</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEkran('karsilama')}>
          <Text style={{ textAlign: 'center', marginTop: 15, color: '#1B4965' }}>← Geri</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// ŞİFREMİ UNUTTUM EKRANI
// ============================================================
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

// ============================================================
// KVKK EKRANI
// ============================================================
export function KvkkEkrani({ setEkran, s }) {
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

        <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => setEkran('auth')}>
          <Text style={s.anaBtnY}>✅ OKUDUM VE ONAYLIYORUM</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
