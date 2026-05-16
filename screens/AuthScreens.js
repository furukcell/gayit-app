// ============================================================
// AuthScreens.js
// Karşılama ve Giriş/Kayıt ekranları
// ============================================================

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, Switch, ActivityIndicator, Modal, StyleSheet
} from 'react-native';
import { API_KEY, DB_URL, BÖLGELER, KATEGORİLER, referansKoduOlustur, DAVET_LIMITI } from '../constants';
import { MAHALLE_HIYERARSISI } from '../Mahalleler';
import { pushTokenAl } from '../notifications';

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
export function AuthEkrani({ rol, setRol, setEkran, setKullanici, setToken, kvkkKabul, setKvkkKabul, sozlesmeKabul, setSozlesmeKabul, s }) {
  const [mod, setMod] = useState('kayit');
  const [ad, setAd] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [kayitBolge, setKayitBolge] = useState('');
  const [kayitBrans, setKayitBrans] = useState('');
  const [davetKodu, setDavetKodu] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [secimModalAcik, setSecimModalAcik] = useState(false);
  const [kayitMahalle, setKayitMahalle] = useState('');
  const [mahalleGrubu, setMahalleGrubu] = useState('');
  const [asama, setAsama] = useState(1);
  const [secimTipi, setSecimTipi] = useState('');

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

    setYukleniyor(true);
    try {
      if (mod === 'kayit') {
        // --------------------------------------------------
        // 1) Firebase Auth — hesap oluştur
        // --------------------------------------------------
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
          ad, email, rol,
          bolge: kayitBolge,
          telefon: '',
          meslek: rol === 'usta' ? kayitBrans : null,
          hak: rol === 'usta' ? 3 : 1,
          abonelik: false,
          yeniKullaniciHakki: 3,
          kayitTarihi: Date.now(),
          referansKodu: refKod,
          davetSayisi: 0,
          pushToken: cihazToken || '',
        };

        // --------------------------------------------------
        // 2) Kullanıcıyı DB'ye yaz
        // --------------------------------------------------
        await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(yeniKul),
        });

        // --------------------------------------------------
        // 3) Davet kodu kontrolü
        //    - davetSayisi < DAVET_LIMITI → rol bazlı bonus her iki tarafa
        //    - davetSayisi >= DAVET_LIMITI → hak verme, sadece davetSayisi artır
        // --------------------------------------------------
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
                const mevcutDavetSayisi = davetEdenKul.davetSayisi || 0;

                if (mevcutDavetSayisi < DAVET_LIMITI) {
                  // ✅ Limit dolmamış — rol bazlı bonus hesapla
                  const davetEdenRol = davetEdenKul.rol;
                  const gelenRol = yeniKul.rol;

                  // Davet edene verilecek bonus
                  let davetEdenBonus = 0;
                  if (davetEdenRol === 'musteri') {
                    davetEdenBonus = 1; // müşteri her zaman +1 ilan
                  } else if (davetEdenRol === 'usta' && gelenRol === 'usta') {
                    davetEdenBonus = 3; // usta → usta +3 teklif
                  } else if (davetEdenRol === 'usta' && gelenRol === 'musteri') {
                    davetEdenBonus = 1; // usta → müşteri +1 teklif
                  }

                  // Gelene verilecek bonus (role göre base paket kadar)
                  const gelenBonus = gelenRol === 'usta' ? 3 : 1;

                  await fetch(`${DB_URL}/kullanicilar/${davetEdenUid}.json?auth=${data.idToken}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      hak: (davetEdenKul.hak || 0) + davetEdenBonus,
                      davetSayisi: mevcutDavetSayisi + 1,
                    }),
                  });

                  yeniKul.hak = yeniKul.hak + gelenBonus;
                  await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hak: yeniKul.hak }),
                  });

                  const bonusMesaj = gelenRol === 'usta'
                    ? 'Sana 3 teklif hakkı eklendi!'
                    : 'Sana 1 ilan hakkı eklendi!';
                  Alert.alert('Davet Bonusu! 🎁', bonusMesaj);
                } else {
                  // ❌ Limit dolmuş — hak verme, sadece davetSayisi artır
                  await fetch(`${DB_URL}/kullanicilar/${davetEdenUid}.json?auth=${data.idToken}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      davetSayisi: mevcutDavetSayisi + 1,
                    }),
                  });

                  Alert.alert(
                    'Davet Kodu Kullanıldı',
                    'Kod geçerli ama bu kullanıcının davet hakkı dolmuş. Bonus eklenemedi.'
                  );
                }
              } else {
                Alert.alert('Geçersiz Kod', 'Böyle bir davet kodu bulunamadı gari!');
              }
            }
          } catch (e) {
            console.log('Davet kodu hatası gari:', e);
          }
        }

        setKullanici({ ...yeniKul, uid: data.localId });

      } else {
        // --------------------------------------------------
        // GİRİŞ
        // --------------------------------------------------
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

        try {
          const cihazToken = await pushTokenAl();
          if (cihazToken) {
            await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pushToken: cihazToken }),
            });
          }
        } catch (e) {}

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
            davetSayisi: kulData.davetSayisi || 0,
            bolge: kulData.bolge || 'Belirtilmemiş',
          });
        }
      }
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası gari, internetini bir kontrol et!');
    } finally {
      setYukleniyor(false);
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
            <TouchableOpacity
              style={s.inp}
              onPress={() => { setSecimTipi('bolge'); setSecimModalAcik(true); }}
            >
              <Text style={{ color: kayitBolge ? '#1B4965' : '#A3B1B9' }}>
                {kayitBolge || 'İlçe Seçiniz...'}
              </Text>
            </TouchableOpacity>

            {rol === 'usta' && (
              <>
                <Text style={s.inputBaslik}>Branşınız</Text>
                <TouchableOpacity
                  style={s.inp}
                  onPress={() => { setSecimTipi('brans'); setSecimModalAcik(true); }}
                >
                  <Text style={{ color: kayitBrans ? '#1B4965' : '#A3B1B9' }}>
                    {kayitBrans || 'Branş Seçiniz...'}
                  </Text>
                </TouchableOpacity>
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

        <TouchableOpacity style={[s.girisBtn, { opacity: yukleniyor ? 0.7 : 1 }]} onPress={islemiTamamla} disabled={yukleniyor}>
          {yukleniyor ? <ActivityIndicator color="#FFF" /> : <Text style={s.anaBtnY}>DEVAM ET</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEkran('karsilama')}>
          <Text style={{ textAlign: 'center', marginTop: 15, color: '#1B4965' }}>← Geri</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={secimModalAcik} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalKutu, { maxHeight: '70%' }]}>
            <Text style={s.modalBaslik}>
              {secimTipi === 'bolge' ? 'İlçe Seçin' : secimTipi === 'brans' ? 'Branş Seçin' : (asama === 1 ? 'Seçim Yapın' : 'Mahalle Seçin')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {secimTipi === 'bolge' ? (
                BOLGELER.map((item, index) => (
                  <TouchableOpacity key={index} style={localStyles.modalSatir} onPress={() => { setKayitBolge(item); setSecimModalAcik(false); }}>
                    <Text style={localStyles.modalSatirYazi}>{item}</Text>
                  </TouchableOpacity>
                ))
              ) : secimTipi === 'brans' ? (
                KATEGORILER.filter(k => k !== 'Tümü').map((item, index) => (
                  <TouchableOpacity key={index} style={localStyles.modalSatir} onPress={() => { setKayitBrans(item); setSecimModalAcik(false); }}>
                    <Text style={localStyles.modalSatirYazi}>{item}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                asama === 1 ? (
                  Object.keys(MAHALLE_HIYERARSISI[kayitBolge] || {}).map((grup, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[localStyles.modalSatir, { backgroundColor: '#F0F4F8', marginVertical: 5, borderRadius: 10 }]}
                      onPress={() => { setMahalleGrubu(grup); setAsama(2); }}
                    >
                      <Text style={[localStyles.modalSatirYazi, { fontWeight: 'bold', color: '#1B4965' }]}>{grup} ❯</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setAsama(1)} style={{ padding: 10 }}>
                      <Text style={{ color: '#E67E22', fontWeight: 'bold' }}>❮ Geri Dön</Text>
                    </TouchableOpacity>
                    {MAHALLE_HIYERARSISI[kayitBolge][mahalleGrubu].map((mahalle, index) => (
                      <TouchableOpacity
                        key={index}
                        style={localStyles.modalSatir}
                        onPress={() => { setKayitMahalle(mahalle); setSecimModalAcik(false); }}
                      >
                        <Text style={localStyles.modalSatirYazi}>{mahalle}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )
              )}
            </ScrollView>
            <TouchableOpacity style={[s.girisBtn, { marginTop: 15, backgroundColor: '#FF4444' }]} onPress={() => setSecimModalAcik(false)}>
              <Text style={s.anaBtnY}>VAZGEÇ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// Modal satır stilleri
// ============================================================
const localStyles = StyleSheet.create({
  modalSatir: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalSatirYazi: {
    fontSize: 15,
    color: '#1B4965',
  },
});
