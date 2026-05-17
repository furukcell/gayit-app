// ============================================================
// ADIM 12 — App.js (ANA DOSYA)
// Sadece state yönetimi ve ekran yönlendirme
// Tüm ekranlar ayrı dosyalara taşındı
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Platform, BackHandler, Alert, ScrollView, SafeAreaView, Animated, Easing, Image } from 'react-native';
import * as Notifications from 'expo-notifications';

// Ekranlar
import { KarsilamaEkrani, AuthEkrani } from './screens/AuthScreens';
import { SifremiUnuttumEkrani } from './screens/SifremiUnuttumEkrani';
import { KvkkEkrani } from './screens/KvkkEkrani';
import { AnasayfaEkrani, SolMenu, SohbetlerimEkrani } from './screens/HomeScreen';
import { IlanVerEkrani, IlanlarimEkrani, TeklifVerEkrani, TekliflerEkrani } from './screens/IlanScreens';
import { SohbetEkrani } from './screens/ChatScreen';
import { ProfilEkrani } from './screens/ProfileScreens';
import { OdemeEkrani, DavetEkrani, AyarlarEkrani, IletisimEkrani, HakkimizdaEkrani, HizmetKosullariEkrani, BildirimEkrani, revenueCatBaslat } from './screens';
import { PuanModali, SikayetModali } from './screens/Modals';
import { AdminEkrani } from './screens/AdminScreen';

// Yardımcılar
import { DB_URL } from './constants';
import { pushTokenAl } from './notifications';
import * as Updates from 'expo-updates';

// Bildirim ayarı
revenueCatBaslat();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  // --- SPLASH SCREEN ---
  const [isLoading, setIsLoading] = useState(true);
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // --- GÜNCELLEME KONTROLÜ ---
  useEffect(() => {
    async function checkUpdate() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert('🚀 Güncelleme', 'Yeni sürüm indirildi, uygulansın mı?', [
            { text: 'Hayır' },
            { text: 'Evet', onPress: () => Updates.reloadAsync() }
          ]);
        }
      } catch (e) { console.log(e); }
    }
    checkUpdate();
  }, []);

  const [ekran, setEkran] = useState('karsilama');
  const [kullanici, setKullanici] = useState(null);
  const [token, setToken] = useState(null);
  const [rol, setRol] = useState('musteri');

  // --- İlan State ---
  const [ilanlar, setIlanlar] = useState([]);
  const [adminMesajlari, setAdminMesajlari] = useState([]);
  const [secilenIlan, setSecilenIlan] = useState(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  // --- Menü State ---
  const [menuAcik, setMenuAcik] = useState(false);

  // --- Auth Onay State ---
  const [kvkkKabul, setKvkkKabul] = useState(false);
  const [sozlesmeKabul, setSozlesmeKabul] = useState(false);

  // --- Sohbet State ---
  const [aktifSohbetTeklif, setAktifSohbetTeklif] = useState(null);
  const [anlasmaSaglandi, setAnlasmaSaglandi] = useState(false);

  // --- Modal State ---
  const [puanModalAcik, setPuanModalAcik] = useState(false);
  const [puanlananIlan, setPuanlananIlan] = useState(null);
  const [sikayetModalAcik, setSikayetModalAcik] = useState(false);
  const [sikayetHedef, setSikayetHedef] = useState('');

  // --- Karanlık Mod ---
  const [karanlikMod, setKaranlikMod] = useState(false);
  const st = stilOlustur(karanlikMod);

  // --- Sistem İstatistikleri ---
  const [sistemIst, setSistemIst] = useState(null);
  const bildirimDinleyici = useRef();

  useEffect(() => {
    bildirimDinleyici.current = Notifications.addNotificationResponseReceivedListener((response) => {
      if (kullanici) {
        setEkran('bildirimler');
      }
    });
    return () => Notifications.removeNotificationSubscription(bildirimDinleyici.current);
  }, [kullanici]);

  useEffect(() => {
    if (kullanici) {
      veriYukle();
      sistemIstatistikleriniGuncelle();
      pushTokenAl().then(pToken => {
        if (pToken && kullanici.uid && token) {
          fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pushToken: pToken }),
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [kullanici]);

  // --- VERİ YÜKLEME ---
  const veriYukle = async () => {
    setYenileniyor(true);
    try {
      const res = await fetch(`${DB_URL}/ilanlar.json`);
      const data = await res.json();
      if (!data) { setIlanlar([]); return; }

      const liste = Object.keys(data).map(key => {
        const ilan = data[key];
        const tekliflerDizisi = ilan.teklifler
          ? Object.keys(ilan.teklifler).map(tKey => ({ id: tKey, ...ilan.teklifler[tKey] }))
          : [];
        return { id: key, ...ilan, teklifler: tekliflerDizisi };
      });

      setIlanlar(
        liste.sort((a, b) => {
          if (a.acil && !b.acil) return -1;
          if (!a.acil && b.acil) return 1;
          return b.tarih - a.tarih;
        })
      );

      if (kullanici?.uid) {
        fetch(`${DB_URL}/adminMesajlari/${kullanici.uid}.json`)
          .then(r => r.json())
          .then(adData => {
            if (adData) setAdminMesajlari(Object.keys(adData).map(k => ({ id: k, ...adData[k] })));
          })
          .catch(() => {});
      }
    } catch (e) {
      console.log('Veri yükleme hatası:', e);
    } finally {
      setYenileniyor(false);
    }
  };

  // --- SİSTEM İSTATİSTİKLERİ ---
  const sistemIstatistikleriniGuncelle = async () => {
    try {
      const res = await fetch(`${DB_URL}/kullanicilar.json`);
      const data = await res.json();
      if (!data) return;

      const bolgeUsta = {};
      let ustaSayisi = 0;
      let musteriSayisi = 0;
      Object.values(data).forEach(kul => {
        if (kul.rol === 'usta') {
          ustaSayisi++;
          if (kul.bolge) {
            if (!bolgeUsta[kul.bolge]) bolgeUsta[kul.bolge] = { toplam: 0, detay: {} };
            bolgeUsta[kul.bolge].toplam += 1;
            if (kul.meslek) {
              bolgeUsta[kul.bolge].detay[kul.meslek] = (bolgeUsta[kul.bolge].detay[kul.meslek] || 0) + 1;
            }
          }
        } else if (kul.rol === 'musteri') {
          musteriSayisi++;
        }
      });
      setSistemIst({ bolgeUsta, usta: ustaSayisi, musteri: musteriSayisi });
    } catch (e) {
      console.log('Sistem istatistik hatası:', e);
    }
  };

  const ustaTeklifTiklandi = (ilan) => {
    setSecilenIlan(ilan);
    setEkran('teklifver');
  };

  useEffect(() => {
    if (kullanici?.rol) setRol(kullanici.rol === 'admin' ? 'musteri' : kullanici.rol);
  }, [kullanici]);

  useEffect(() => {
    const geriHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuAcik) { setMenuAcik(false); return true; }
      if (ekran === 'anasayfa') {
        Alert.alert('Çıkış', 'Uygulamadan çıkmak istiyor musunuz?', [
          { text: 'Hayır', style: 'cancel' },
          { text: 'Evet', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      }
      if (['kvkk', 'sifremi_unuttum'].includes(ekran)) {
        setEkran('auth');
        return true;
      }
      if (ekran === 'auth') {
        setEkran('karsilama');
        return true;
      }
      if (ekran === 'hizmet_kosullari') {
        setEkran(kullanici ? 'anasayfa' : 'auth');
        return true;
      }
      if (ekran !== 'karsilama' && ekran !== 'auth') {
        setEkran('anasayfa');
        return true;
      }
      return false;
    });
    return () => geriHandler.remove();
  }, [ekran, menuAcik, kullanici]);

  // ============================================================
  // SPLASH SCREEN
  // ============================================================
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#F5F5F0',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Animated.View style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: 90,
          borderWidth: 4,
          borderColor: '#2E86AB',
          borderTopColor: '#588157',
          borderRightColor: '#588157',
          borderBottomColor: 'transparent',
          transform: [{ rotate: spin }],
        }} />
        <Image
          source={require('./Logo.png')}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // ============================================================
  // EKRAN YÖNLENDİRME
  // ============================================================
  const ekraniGoster = () => {
    if (ekran === 'karsilama') return <KarsilamaEkrani setRol={setRol} setMod={() => {}} setEkran={setEkran} s={st} />;
    if (ekran === 'auth') return <AuthEkrani rol={rol} setRol={setRol} setEkran={setEkran} setKullanici={setKullanici} setToken={setToken} kvkkKabul={kvkkKabul} setKvkkKabul={setKvkkKabul} sozlesmeKabul={sozlesmeKabul} setSozlesmeKabul={setSozlesmeKabul} s={st} />;
    if (ekran === 'sifremi_unuttum') return <SifremiUnuttumEkrani setEkran={setEkran} s={st} />;
    if (ekran === 'kvkk') return <KvkkEkrani setEkran={setEkran} setKvkkKabul={setKvkkKabul} s={st} />;

    if (ekran === 'anasayfa') return (
      <AnasayfaEkrani
        kullanici={kullanici}
        rol={rol}
        ilanlar={ilanlar}
        sistemIst={sistemIst}
        yenileniyor={yenileniyor}
        onYenile={veriYukle}
        setEkran={setEkran}
        setMenuAcik={setMenuAcik}
        setSecilenIlan={setSecilenIlan}
        ustaTeklifTiklandi={ustaTeklifTiklandi}
        setBildirimEkrani={() => setEkran('bildirimler')}
        s={st}
      />
    );

    if (ekran === 'ilanver') return (
      <IlanVerEkrani
        kullanici={kullanici}
        token={token}
        ilanlar={ilanlar}
        setEkran={setEkran}
        onVeriYukle={veriYukle}
        setKullanici={setKullanici}
        s={st}
      />
    );

    if (ekran === 'ilanlarim') return (
      <IlanlarimEkrani
        kullanici={kullanici}
        token={token}
        rol={rol}
        ilanlar={ilanlar}
        setEkran={setEkran}
        setSecilenIlan={setSecilenIlan}
        ustaTeklifTiklandi={ustaTeklifTiklandi}
        onVeriYukle={veriYukle}
        s={st}
      />
    );

    if (ekran === 'teklifver') return (
      <TeklifVerEkrani
        kullanici={kullanici}
        token={token}
        secilenIlan={secilenIlan}
        setEkran={setEkran}
        onVeriYukle={veriYukle}
        setKullanici={setKullanici}
        s={st}
      />
    );

    if (ekran === 'teklifler') return (
      <TekliflerEkrani
        kullanici={kullanici}
        token={token}
        secilenIlan={secilenIlan}
        ilanlar={ilanlar}
        setEkran={setEkran}
        setSikayetHedef={setSikayetHedef}
        setSikayetModalAcik={setSikayetModalAcik}
        setPuanlananIlan={setPuanlananIlan}
        setPuanModalAcik={setPuanModalAcik}
        onVeriYukle={veriYukle}
        setAktifSohbetTeklif={setAktifSohbetTeklif}
        setAnlasmaSaglandi={setAnlasmaSaglandi}
        setSecilenIlan={setSecilenIlan}
        s={st}
      />
    );

    if (ekran === 'sohbet') return (
      <SohbetEkrani
        kullanici={kullanici}
        rol={rol}
        secilenIlan={secilenIlan}
        aktifSohbetTeklif={aktifSohbetTeklif}
        anlasmaSaglandi={anlasmaSaglandi}
        setEkran={setEkran}
        setSikayetHedef={setSikayetHedef}
        setSikayetModalAcik={setSikayetModalAcik}
        setPuanlananIlan={setPuanlananIlan}
        setPuanModalAcik={setPuanModalAcik}
        onVeriYukle={veriYukle}
        s={st}
      />
    );

    // ✅ SohbetlerimEkrani — son mesaj gösterimi ile
    if (ekran === 'sohbetlerim') return (
      <SohbetlerimEkrani
        kullanici={kullanici}
        ilanlar={ilanlar}
        adminMesajlari={adminMesajlari}
        setEkran={setEkran}
        setSecilenIlan={setSecilenIlan}
        setAktifSohbetTeklif={setAktifSohbetTeklif}
        setAnlasmaSaglandi={setAnlasmaSaglandi}
        s={st}
      />
    );

    if (ekran === 'profil') return (
      <ProfilEkrani
        kullanici={kullanici}
        setKullanici={setKullanici}
        token={token}
        rol={rol}
        setEkran={setEkran}
        setSikayetHedef={setSikayetHedef}
        setSikayetModalAcik={setSikayetModalAcik}
        s={st}
      />
    );

    if (ekran === 'odeme') return (
      <OdemeEkrani
        kullanici={kullanici}
        setKullanici={setKullanici}
        token={token}
        rol={rol}
        setEkran={setEkran}
        s={st}
      />
    );

    if (ekran === 'davet') return <DavetEkrani kullanici={kullanici} setEkran={setEkran} s={st} />;
    if (ekran === 'ayarlar') return <AyarlarEkrani kullanici={kullanici} setKullanici={setKullanici} token={token} setEkran={setEkran} karanlikMod={karanlikMod} setKaranlikMod={setKaranlikMod} s={st} />;
    if (ekran === 'iletisim') return <IletisimEkrani kullanici={kullanici} setEkran={setEkran} s={st} />;
    if (ekran === 'hakkimizda') return <HakkimizdaEkrani setEkran={setEkran} s={st} />;
    if (ekran === 'hizmet_kosullari') return <HizmetKosullariEkrani setEkran={setEkran} setSozlesmeKabul={setSozlesmeKabul} kayittan={!kullanici} s={st} />;
    if (ekran === 'bildirimler') return <BildirimEkrani kullanici={kullanici} setEkran={setEkran} s={st} />;

    if (ekran === 'admin') return (
      <AdminEkrani
        kullanici={kullanici}
        token={token}
        setEkran={setEkran}
        s={st}
      />
    );

    return null;
  };

  return (
    <View style={st.root}>
      <StatusBar
        barStyle={karanlikMod ? 'light-content' : 'dark-content'}
        backgroundColor={karanlikMod ? '#121212' : '#F5F5F0'}
      />

      {ekraniGoster()}

      {menuAcik && kullanici && (
        <SolMenu
          kullanici={kullanici}
          rol={rol}
          sistemIst={sistemIst}
          setEkran={setEkran}
          setMenuAcik={setMenuAcik}
          setProfilTel={() => {}}
          setOdemeAdim={() => {}}
          setKullanici={setKullanici}
          setToken={setToken}
          s={st}
        />
      )}

      <PuanModali
        gorunur={puanModalAcik}
        setGorunur={setPuanModalAcik}
        puanlananIlan={puanlananIlan}
        kullanici={kullanici}
        token={token}
        ilanlar={ilanlar}
        setIlanlar={setIlanlar}
        s={st}
      />
      <SikayetModali
        gorunur={sikayetModalAcik}
        setGorunur={setSikayetModalAcik}
        sikayetHedef={sikayetHedef}
        kullanici={kullanici}
        s={st}
      />
    </View>
  );
}

// ============================================================
// STİLLER — Karanlık mod destekli
// ============================================================
function stilOlustur(karanlik) {
  const r = {
    bg: karanlik ? '#121212' : '#F5F5F0',
    bgKart: karanlik ? '#1E1E1E' : '#FFF',
    bgInput: karanlik ? '#2A2A2A' : '#FFF',
    bgChip: karanlik ? '#2A2A2A' : '#FFF',
    bgModal: karanlik ? '#1E1E1E' : '#F5F5F0',
    bgOnay: karanlik ? '#2A2A2A' : '#FFF',
    anaRenk: '#1B4965',
    yaziBas: karanlik ? '#E0E0E0' : '#1B4965',
    yaziAlt: karanlik ? '#A0A0A0' : '#526E7F',
    yaziSoluk: karanlik ? '#666' : '#A3B1B9',
    sinir: karanlik ? '#333' : '#E8E8E0',
    chipSinir: karanlik ? '#444' : '#D1D9E0',
    chipYazi: karanlik ? '#A0A0A0' : '#526E7F',
  };

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: r.bg },
    con: { flex: 1, backgroundColor: r.bg },
    scroll: { flex: 1, padding: 15 },
    ic: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    authIc: { padding: 25, paddingTop: 10 },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 15, paddingVertical: 12,
      backgroundColor: r.bgKart, borderBottomWidth: 1, borderBottomColor: r.sinir,
      paddingTop: Platform.OS === 'android' ? 40 : 12,
    },
    headerBaslik: { fontSize: 18, fontWeight: '700', color: r.yaziBas, flex: 1, textAlign: 'center' },
    headerGeriBtn: { padding: 5 },
    menuBtn: { padding: 5 },
    menuSimge: { fontSize: 22, color: r.anaRenk },

    kart: {
      backgroundColor: r.bgKart, borderRadius: 16, padding: 16,
      marginBottom: 12, elevation: 2,
      shadowColor: '#1B4965', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08, shadowRadius: 8,
    },
    kartBaslik: { fontSize: 16, fontWeight: '700', color: r.yaziBas, marginTop: 6 },
    kartAlt: { color: r.yaziAlt, fontSize: 13, marginTop: 4 },
    kartIstatistikler: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    kartIstatistikMetin: { color: '#8B7355', fontSize: 13, fontWeight: '600' },
    kategoriBadge: {
      backgroundColor: karanlik ? '#1B3A52' : '#E1F2FE',
      color: karanlik ? '#7EC8E3' : '#1B4965',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
      fontSize: 12, fontWeight: '600', alignSelf: 'flex-start',
    },
    acilRozet: {
      position: 'absolute', top: -1, right: -1,
      backgroundColor: '#FF4444', borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    acilRozetYazi: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    anaBtn: {
      backgroundColor: '#588157', borderRadius: 14, paddingVertical: 16,
      paddingHorizontal: 24, alignItems: 'center', width: '100%', marginBottom: 12,
    },
    anaBtnY: { color: '#FFF', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
    girisBtn: {
      backgroundColor: '#1B4965', borderRadius: 14, paddingVertical: 16,
      alignItems: 'center',
    },
    btnAlan: { width: '100%', gap: 12 },
    vazgec: { textAlign: 'center', color: r.yaziSoluk, marginTop: 20, fontSize: 14 },

    inp: {
      backgroundColor: r.bgInput, borderRadius: 12, padding: 14,
      marginBottom: 12, borderWidth: 1, borderColor: r.sinir,
      fontSize: 15, color: r.yaziBas,
    },
    inputBaslik: { color: r.yaziAlt, fontWeight: '600', marginBottom: 8, fontSize: 13 },

    chipAlan: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    chip: {
      borderWidth: 1.5, borderColor: r.chipSinir, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 7, backgroundColor: r.bgChip,
    },
    chipAktif: { backgroundColor: '#1B4965', borderColor: '#1B4965' },
    chipY: { color: r.chipYazi, fontSize: 13, fontWeight: '500' },
    chipYAktif: { color: '#FFF' },

    tabBar: { flexDirection: 'row', marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: r.sinir },
    tabAktif: { borderBottomColor: '#1B4965' },
    tabY: { color: r.yaziSoluk, fontWeight: '600' },
    tabYA: { color: r.yaziBas },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalKutu: {
      backgroundColor: r.bgModal, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 25, paddingBottom: 40,
    },
    modalBaslik: { fontSize: 20, fontWeight: '700', color: r.yaziBas, textAlign: 'center', marginBottom: 15 },

    profilResimSec: {
      width: 100, height: 100, borderRadius: 50, backgroundColor: karanlik ? '#1B3A52' : '#E1F2FE',
      alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
      marginVertical: 15, borderWidth: 3, borderColor: '#1B4965',
    },
    profilTiklanabilir: { alignItems: 'center', paddingVertical: 20 },
    profilAvatar: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#1B4965',
      justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    avatarHarf: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
    profilAd: { color: '#FFF', fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
    profilDuzenleText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

    drawerContainer: {
      position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999,
    },
    drawerIc: {
      position: 'absolute', top: 0, bottom: 0, left: 0, width: '80%',
      backgroundColor: '#1B4965', paddingTop: Platform.OS === 'android' ? 45 : 55,
      paddingHorizontal: 20,
    },
    drawerKapat: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 50, right: 15, padding: 5 },
    menuItem: { paddingVertical: 12 },
    menuText: { color: '#FFF', fontSize: 15 },
    menuBaslik: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 15, marginBottom: 8 },
    ayrac: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10 },
    cikisY: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 14 },
    ilceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    ilceAd: { color: '#FFF', fontSize: 13 },
    ilceAltBilgi: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
    ilceDetayAlan: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, marginBottom: 5 },
    detaySatir: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 3 },

    bas: { fontSize: 22, fontWeight: '700', color: r.yaziBas, marginBottom: 5 },
    alt: { color: r.yaziAlt, fontSize: 14, marginBottom: 20, textAlign: 'center' },
    onayKutu: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: r.bgOnay,
      borderRadius: 12, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: r.sinir,
    },
    kuponBolumu: { flexDirection: 'row', marginBottom: 15 },
    kuponInp: {
      flex: 1, backgroundColor: r.bgInput, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: r.sinir, fontSize: 16, fontWeight: 'bold',
      letterSpacing: 2, color: r.yaziBas, marginRight: 8,
    },
    kuponBtn: {
      backgroundColor: '#1B4965', borderRadius: 12, paddingHorizontal: 16,
      justifyContent: 'center', alignItems: 'center',
    },
    numaraKutu: {
      backgroundColor: '#1B4965', margin: 15, borderRadius: 16,
      padding: 15, alignItems: 'center',
    },
  });
}
