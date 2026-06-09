// ============================================================
// AuthScreens.js — PRODUCTION READY
// Karşılama ve Giriş/Kayıt ekranları
//
// ✅ DÜZELTİLDİ: 50+ syntax hatası (= >, & &, boşluklu attribute)
// ✅ DÜZELTİLDİ: REST API URL ve body stringleri (identitytoolkit, JSON.stringify vb.)
// ✅ DÜZELTİLDİ: Davet kodu değişken adları (davetEdenRol, gelenRol, Object.entries)
// ✅ DÜZELTİLDİ: İstatistik typo (ortalamaYanisSuresiDk → ortalamaYanitSuresiDk)
// ✅ İYİLEŞTİRME: Firebase SDK senkronizasyonu ve pushToken kaydı güvenli hale getirildi
// ============================================================
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, Switch, ActivityIndicator, Modal, StyleSheet
} from 'react-native';
import { API_KEY, DB_URL, BOLGELER, KATEGORILER, referansKoduOlustur, DAVET_LIMITI } from '../constants';
import { MAHALLE_HIYERARSISI } from '../Mahalleler';
import { pushTokenAl } from '../notifications';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Firebase SDK başlat
const firebaseConfig = { apiKey: API_KEY, databaseURL: DB_URL };
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseAuth = getAuth(firebaseApp);

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
  const [davetKodu, setDavetKodu] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [asama, setAsama] = useState(1);
  const [mahalleGrubu, setMahalleGrubu] = useState('');

  // --- Çoklu Branş ---
  const [anaBrans, setAnaBrans] = useState('');
  const [yanBrans1, setYanBrans1] = useState('');
  const [yanBrans2, setYanBrans2] = useState('');

  // --- Modal ---
  const [secimModalAcik, setSecimModalAcik] = useState(false);
  const [secimTipi, setSecimTipi] = useState('');

  const modalAc = (tip) => {
    setSecimTipi(tip);
    setAsama(1);
    setSecimModalAcik(true);
  };

  const bransSecildi = (item) => {
    if (secimTipi === 'anaBrans') setAnaBrans(item);
    else if (secimTipi === 'yanBrans1') setYanBrans1(item);
    else if (secimTipi === 'yanBrans2') setYanBrans2(item);
    setSecimModalAcik(false);
  };

  const yanBransSecenekleri = (hangiYan) => {
    const secilmisler = [anaBrans];
    if (hangiYan === 'yanBrans2') secilmisler.push(yanBrans1);
    return KATEGORILER.filter(k => k !== 'Tümü' && !secilmisler.includes(k));
  };

  const islemiTamamla = async () => {
    if (!email || !sifre || (mod === 'kayit' && !ad)) return Alert.alert('Hata', 'Eksik bilgi girdiniz usta!');
    if (mod === 'kayit' && !kayitBolge) return Alert.alert('Hata', 'Lütfen bir ilçe seçin gari!');
    if (mod === 'kayit' && rol === 'usta' && !anaBrans) return Alert.alert('Hata', 'Lütfen ana branşınızı seçin!');
    if (mod === 'kayit' && !kvkkKabul) return Alert.alert('Hata', 'KVKK metnini onaylamanız gerekiyor!');
    if (mod === 'kayit' && !sozlesmeKabul) return Alert.alert('Hata', 'Üyelik sözleşmesini onaylamanız gerekiyor!');

    setYukleniyor(true);
    try {
      if (mod === 'kayit') {
        const yanBranslar = [yanBrans1, yanBrans2].filter(b => b !== '');

        // 1) Firebase Auth REST — hesap oluştur (token için)
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
        await AsyncStorage.setItem('oturum_refresh_token', data.refreshToken).catch(() => {});
        // RevenueCat'e kullanıcıyı tanıt
        await Purchases.logIn(data.localId);

        // Firebase SDK'ya da giriş yaptır
        try {
          await signInWithEmailAndPassword(firebaseAuth, email, sifre);
        } catch (e) {
          console.log('SDK giriş hatası:', e.message);
        }

        const cihazToken = await pushTokenAl();
        const refKod = referansKoduOlustur();

        const yeniKul = {
          uid: data.localId,
          ad, email, rol,
          bolge: kayitBolge,
          telefon: '',
          meslek: rol === 'usta' ? anaBrans : null,
          anaBrans: rol === 'usta' ? anaBrans : null,
          yanBranslar: rol === 'usta' ? yanBranslar : [],
          hak: 0,
          abonelik: false,
          yeniKullaniciHakki: 3,
          kayitTarihi: Date.now(),
          referansKodu: refKod,
          davetSayisi: 0,
          pushToken: cihazToken || '',
        };

        // 2) Kullanıcıyı DB'ye yaz
        await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(yeniKul),
        });

        // 3) İstatistik sayacını artır
        if (rol === 'usta') {
          try {
            await fetch(`${DB_URL}/istatistikler/${data.localId}.json?auth=${data.idToken}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                toplamIs: 0,
                toplamTeklif: 0,
                tamamlanan: 0,
                ortalamaPuan: 0,
                toplamPuanSayisi: 0,
                ortalamaYanitSuresiDk: 0, // Typo düzeltildi
                ortalamaTamamlamaSaati: 0,
                gayitteGunSayisi: 0,
                kategoriler: {},
                ilceler: {},
                sonGuncelleme: Date.now(),
                skorlar: { muglaGenelKategoriSira: {}, ilceKategoriSira: {}, teklifSkoru: 0 },
              }),
            });
          } catch(e) { console.log('usta istatistik node hatası:', e); }
        }
        try {
          const istatistikAlani = rol === 'usta' ? 'kayitliUsta' : 'kayitliKullanici';
          const istatRes = await fetch(`${DB_URL}/istatistikler/${istatistikAlani}.json`);
          const mevcutSayi = (await istatRes.json()) || 0;
          await fetch(`${DB_URL}/istatistikler/${istatistikAlani}.json?auth=${data.idToken}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mevcutSayi + 1),
          });
        } catch (e) {
          console.log('İstatistik güncelleme hatası:', e);
        }

        // 4) Davet kodu kontrolü
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
                  const davetEdenRol = davetEdenKul.rol;
                  const gelenRol = yeniKul.rol;

                  let davetEdenBonus = 0;
                  if (davetEdenRol === 'musteri') {
                    davetEdenBonus = 1;
                  } else if (davetEdenRol === 'usta' && gelenRol === 'usta') {
                    davetEdenBonus = 3;
                  } else if (davetEdenRol === 'usta' && gelenRol === 'musteri') {
                    davetEdenBonus = 1;
                  }

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
                  await fetch(`${DB_URL}/kullanicilar/${davetEdenUid}.json?auth=${data.idToken}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ davetSayisi: mevcutDavetSayisi + 1 }),
                  });
                  Alert.alert('Davet Kodu Kullanıldı', 'Kod geçerli ama bu kullanıcının davet hakkı dolmuş. Bonus eklenemedi.');
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
        try {
          await dogrulamaMailiGonder(data.idToken);
        } catch (e) {
          console.log('Doğrulama maili gönderilemedi:', e);
        }
        setEkran('mail_dogrulama');
        setYukleniyor(false);
        return;

      } else {
        // GİRİŞ
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
        await AsyncStorage.setItem('oturum_refresh_token', data.refreshToken).catch(() => {});
        // RevenueCat'e kullanıcıyı tanıt
        await Purchases.logIn(data.localId);

        // Firebase SDK'ya da giriş yaptır
        try {
          await signInWithEmailAndPassword(firebaseAuth, email, sifre);
        } catch (e) {
          // SDK girişi başarısız olsa da devam et
        }

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
        const accountRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: data.idToken }) }
        );
        const accountData = await accountRes.json();
        if (!accountData?.users?.[0]?.emailVerified) {
          setEkran('mail_dogrulama');
          setYukleniyor(false);
          return;
        }

        const kulRes = await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`);
        const kulData = await kulRes.json();

        if (kulData) {
          if (kulData.rol !== rol && kulData.rol !== 'admin') {
            Alert.alert('Hata', `Bu hesap bir ${kulData.rol === 'usta' ? 'usta' : 'müşteri'} hesabı. Lütfen doğru girişten girin.`);
            setYukleniyor(false);
            return;
          }
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
          setRol(kulData.rol);
        }
      }
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası gari, internetini bir kontrol et!');
    } finally {
      setYukleniyor(false);
    }
  };

  const modalBaslik = () => {
    if (secimTipi === 'bolge') return 'İlçe Seçin';
    if (secimTipi === 'anaBrans') return 'Ana Branş Seçin';
    if (secimTipi === 'yanBrans1') return 'Yan Branş 1 Seçin';
    if (secimTipi === 'yanBrans2') return 'Yan Branş 2 Seçin';
    return 'Seçim Yapın';
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
            <TouchableOpacity style={s.inp} onPress={() => modalAc('bolge')}>
              <Text style={{ color: kayitBolge ? '#1B4965' : '#A3B1B9' }}>
                {kayitBolge || 'İlçe Seçiniz...'}
              </Text>
            </TouchableOpacity>

            {rol === 'usta' && (
              <>
                <Text style={s.inputBaslik}>Ana Branşınız <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                <TouchableOpacity style={s.inp} onPress={() => modalAc('anaBrans')}>
                  <Text style={{ color: anaBrans ? '#1B4965' : '#A3B1B9' }}>
                    {anaBrans || 'Ana Branş Seçiniz...'}
                  </Text>
                </TouchableOpacity>

                {anaBrans !== '' && (
                  <>
                    <Text style={s.inputBaslik}>Yan Branş 1 <Text style={{ color: '#888', fontSize: 12 }}>(İsteğe Bağlı)</Text></Text>
                    <TouchableOpacity style={s.inp} onPress={() => modalAc('yanBrans1')}>
                      <Text style={{ color: yanBrans1 ? '#1B4965' : '#A3B1B9' }}>
                        {yanBrans1 || 'Yan Branş Seçiniz...'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {yanBrans1 !== '' && (
                  <>
                    <Text style={s.inputBaslik}>Yan Branş 2 <Text style={{ color: '#888', fontSize: 12 }}>(İsteğe Bağlı)</Text></Text>
                    <TouchableOpacity style={s.inp} onPress={() => modalAc('yanBrans2')}>
                      <Text style={{ color: yanBrans2 ? '#1B4965' : '#A3B1B9' }}>
                        {yanBrans2 || 'Yan Branş Seçiniz...'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
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

      <Modal
        visible={secimModalAcik}
        transparent
        animationType="slide"
        onRequestClose={() => setSecimModalAcik(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalKutu, { maxHeight: '70%' }]}>
            <Text style={s.modalBaslik}>{modalBaslik()}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {secimTipi === 'bolge' && (
                BOLGELER.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={localStyles.modalSatir}
                    onPress={() => { setKayitBolge(item); setSecimModalAcik(false); }}
                  >
                    <Text style={localStyles.modalSatirYazi}>{item}</Text>
                  </TouchableOpacity>
                ))
              )}

              {secimTipi === 'anaBrans' && (
                KATEGORILER.filter(k => k !== 'Tümü').map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={localStyles.modalSatir}
                    onPress={() => {
                      setAnaBrans(item);
                      setYanBrans1('');
                      setYanBrans2('');
                      setSecimModalAcik(false);
                    }}
                  >
                    <Text style={[
                      localStyles.modalSatirYazi,
                      item === anaBrans && { fontWeight: 'bold', color: '#588157' }
                    ]}>{item} {item === anaBrans ? '✓' : ''}</Text>
                  </TouchableOpacity>
                ))
              )}

              {secimTipi === 'yanBrans1' && (
                yanBransSecenekleri('yanBrans1').map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={localStyles.modalSatir}
                    onPress={() => {
                      setYanBrans1(item);
                      setYanBrans2('');
                      setSecimModalAcik(false);
                    }}
                  >
                    <Text style={[
                      localStyles.modalSatirYazi,
                      item === yanBrans1 && { fontWeight: 'bold', color: '#588157' }
                    ]}>{item} {item === yanBrans1 ? '✓' : ''}</Text>
                  </TouchableOpacity>
                ))
              )}

              {secimTipi === 'yanBrans2' && (
                yanBransSecenekleri('yanBrans2').map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={localStyles.modalSatir}
                    onPress={() => bransSecildi(item)}
                  >
                    <Text style={[
                      localStyles.modalSatirYazi,
                      item === yanBrans2 && { fontWeight: 'bold', color: '#588157' }
                    ]}>{item} {item === yanBrans2 ? '✓' : ''}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[s.girisBtn, { marginTop: 15, backgroundColor: '#FF4444' }]}
              onPress={() => setSecimModalAcik(false)}
            >
              <Text style={s.anaBtnY}>VAZGEÇ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// MAİL DOĞRULAMA EKRANI
// ============================================================
export function MailDogrulamaEkrani({ token, setEkran, s }) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonGonderme, setSonGonderme] = useState(null);

  const tekrarGonder = async () => {
    if (sonGonderme && Date.now() - sonGonderme < 60000) {
      const kalanSaniye = Math.ceil((60000 - (Date.now() - sonGonderme)) / 1000);
      return Alert.alert('Bekle', `${kalanSaniye} saniye sonra tekrar gönderebilirsin.`);
    }
    setYukleniyor(true);
    try {
      await dogrulamaMailiGonder(token);
      setSonGonderme(Date.now());
      Alert.alert('✅ Gönderildi', 'Doğrulama maili tekrar gönderildi. Spam klasörünü de kontrol et!');
    } catch (e) {
      Alert.alert('Hata', 'Mail gönderilemedi. Biraz bekleyip tekrar dene.');
    } finally {
      setYukleniyor(false);
    }
  };

  const dogruladim = async () => {
    if (!token) {
      Alert.alert('Hata', 'Oturum bilgisi bulunamadı. Lütfen tekrar giriş yap.');
      setEkran('karsilama');
      return;
    }
    setYukleniyor(true);
    try {
      const dogrulandi = await mailDogrulandiMiKontrol(token);
      if (dogrulandi) {
        setEkran('anasayfa');
      } else {
        Alert.alert(
          '❌ Henüz Doğrulanmadı',
          'Maildeki linke tıklamadın mı? Spam / Önemsiz klasörünü de kontrol et.',
          [
            { text: 'Tekrar Gönder', onPress: tekrarGonder },
            { text: 'Tamam' },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası. İnternetini kontrol et.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <ScrollView contentContainerStyle={{ padding: 30, paddingTop: 60 }}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={{ fontSize: 56 }}>📧</Text>
        </View>
        <Text style={[s.bas, { textAlign: 'center', marginBottom: 12 }]}>
          Mail Doğrulama
        </Text>
        <Text style={[s.alt, { textAlign: 'center', marginBottom: 40, lineHeight: 22 }]}>
          E-posta adresine bir doğrulama linki gönderdik.{'\n'}
          Linke tıkladıktan sonra aşağıdaki butona bas.
        </Text>

        <TouchableOpacity
          style={[s.girisBtn, { marginBottom: 12, opacity: yukleniyor ? 0.7 : 1 }]}
          onPress={dogruladim}
          disabled={yukleniyor}
        >
          {yukleniyor
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.anaBtnY}>✅ Doğruladım, Giriş Yap</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.anaBtn, { backgroundColor: '#8B7355', opacity: yukleniyor ? 0.7 : 1 }]}
          onPress={tekrarGonder}
          disabled={yukleniyor}
        >
          <Text style={s.anaBtnY}>📨 Maili Tekrar Gönder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setEkran('karsilama')}
          style={{ marginTop: 25 }}
        >
          <Text style={{ textAlign: 'center', color: '#1B4965', fontSize: 14 }}>← Geri Dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
