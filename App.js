// ============================================================
// ADIM 12 — App.js (ANA DOSYA)
// Sadece state yönetimi ve ekran yönlendirme
// Tüm ekranlar ayrı dosyalara taşındı
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Ekranlar
import { KarsilamaEkrani, AuthEkrani, SifremiUnuttumEkrani, KvkkEkrani } from './AuthScreens';
import { AnasayfaEkrani, SolMenu } from './HomeScreen';
import { IlanVerEkrani, IlanlarimEkrani, TeklifVerEkrani, TekliflerEkrani } from './IlanScreens';
import { SohbetEkrani } from './ChatScreen';
import { ProfilEkrani } from './ProfileScreens';
import { OdemeEkrani, DavetEkrani, AyarlarEkrani, IletisimEkrani, HakkimizdaEkrani, HizmetKosullariEkrani } from './PackageScreens';
import { PuanModali, SikayetModali } from './Modals';
import { AdminEkrani } from './AdminScreen';

// Yardımcılar
import { DB_URL } from './constants';
import { pushTokenAl } from './notifications';

// Bildirim ayarı
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  // --- Temel State ---
  const [ekran, setEkran] = useState('karsilama');
  const [kullanici, setKullanici] = useState(null);
  const [token, setToken] = useState(null);
  const [rol, setRol] = useState('musteri');

  // --- İlan State ---
  const [ilanlar, setIlanlar] = useState([]);
  const [secilenIlan, setSecilenIlan] = useState(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  // --- Menü State ---
  const [menuAcik, setMenuAcik] = useState(false);

  // --- Sohbet State ---
  const [aktifSohbetTeklif, setAktifSohbetTeklif] = useState(null);
  const [anlasmaSaglandi, setAnlasmaSaglandi] = useState(false);

  // --- Modal State ---
  const [puanModalAcik, setPuanModalAcik] = useState(false);
  const [puanlananIlan, setPuanlananIlan] = useState(null);
  const [sikayetModalAcik, setSikayetModalAcik] = useState(false);
  const [sikayetHedef, setSikayetHedef] = useState('');

  // --- Sistem İstatistikleri ---
  const [sistemIst, setSistemIst] = useState(null);

  // Bildirim dinleyici
  const bildirimDinleyici = useRef();
  useEffect(() => {
    bildirimDinleyici.current = Notifications.addNotificationResponseReceivedListener(() => {});
    return () => Notifications.removeNotificationSubscription(bildirimDinleyici.current);
  }, []);

  // Kullanıcı girişinde verileri yükle
  useEffect(() => {
    if (kullanici) {
      veriYukle();
      sistemIstatistikleriniGuncelle();
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
      Object.values(data).forEach(kul => {
        if (kul.rol === 'usta' && kul.bolge) {
          if (!bolgeUsta[kul.bolge]) bolgeUsta[kul.bolge] = { toplam: 0, detay: {} };
          bolgeUsta[kul.bolge].toplam += 1;
          if (kul.meslek) {
            bolgeUsta[kul.bolge].detay[kul.meslek] = (bolgeUsta[kul.bolge].detay[kul.meslek] || 0) + 1;
          }
        }
      });
      setSistemIst({ bolgeUsta });
    } catch (e) {
      console.log('Sistem istatistik hatası:', e);
    }
  };

  // --- USTA TEKLİF TIKLANDI ---
  const ustaTeklifTiklandi = (ilan) => {
    setSecilenIlan(ilan);
    setEkran('teklifver');
  };

  // --- ROL GÜNCELLE ---
  useEffect(() => {
    if (kullanici?.rol) setRol(kullanici.rol === 'admin' ? 'musteri' : kullanici.rol);
  }, [kullanici]);

  // ============================================================
  // EKRAN YÖNLENDİRME
  // ============================================================
  const ekraniGoster = () => {
    // Auth ekranları
    if (ekran === 'karsilama') return <KarsilamaEkrani setRol={setRol} setMod={() => {}} setEkran={setEkran} s={st} />;
    if (ekran === 'auth') return <AuthEkrani rol={rol} setRol={setRol} setEkran={setEkran} setKullanici={setKullanici} setToken={setToken} s={st} />;
    if (ekran === 'sifremi_unuttum') return <SifremiUnuttumEkrani setEkran={setEkran} s={st} />;
    if (ekran === 'kvkk') return <KvkkEkrani setEkran={setEkran} s={st} />;

    // Ana ekranlar
    if (ekran === 'anasayfa') return (
      <AnasayfaEkrani
        kullanici={kullanici}
        rol={rol}
        ilanlar={ilanlar}
        yenileniyor={yenileniyor}
        onYenile={veriYukle}
        setEkran={setEkran}
        setMenuAcik={setMenuAcik}
        setSecilenIlan={setSecilenIlan}
        ustaTeklifTiklandi={ustaTeklifTiklandi}
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
        s={st}
      />
    );

    if (ekran === 'ilanlarim') return (
      <IlanlarimEkrani
        kullanici={kullanici}
        rol={rol}
        ilanlar={ilanlar}
        setEkran={setEkran}
        setSecilenIlan={setSecilenIlan}
        ustaTeklifTiklandi={ustaTeklifTiklandi}
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
        onVeriYukle={veriYukle}
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
    if (ekran === 'ayarlar') return <AyarlarEkrani kullanici={kullanici} setKullanici={setKullanici} token={token} setEkran={setEkran} s={st} />;
    if (ekran === 'iletisim') return <IletisimEkrani kullanici={kullanici} setEkran={setEkran} s={st} />;
    if (ekran === 'hakkimizda') return <HakkimizdaEkrani setEkran={setEkran} s={st} />;
    if (ekran === 'hizmet_kosullari') return <HizmetKosullariEkrani setEkran={setEkran} s={st} />;

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
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />

      {/* Ana içerik */}
      {ekraniGoster()}

      {/* Sol Menü — anasayfada ve giriş yapılmışken göster */}
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

      {/* Modaller */}
      <PuanModali
        gorunur={puanModalAcik}
        setGorunur={setPuanModalAcik}
        puanlananIlan={puanlananIlan}
        kullanici={kullanici}
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
// STİLLER
// ============================================================
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F0' },
  con: { flex: 1, backgroundColor: '#F5F5F0' },
  scroll: { flex: 1, padding: 15 },
  ic: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  authIc: { padding: 25, paddingTop: 10 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E0',
    paddingTop: Platform.OS === 'android' ? 40 : 12,
  },
  headerBaslik: { fontSize: 18, fontWeight: '700', color: '#1B4965', flex: 1, textAlign: 'center' },
  headerGeriBtn: { padding: 5 },
  menuBtn: { padding: 5 },
  menuSimge: { fontSize: 22, color: '#1B4965' },

  // Kartlar
  kart: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2,
    shadowColor: '#1B4965', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  kartBaslik: { fontSize: 16, fontWeight: '700', color: '#1B4965', marginTop: 6 },
  kartAlt: { color: '#526E7F', fontSize: 13, marginTop: 4 },
  kartIstatistikler: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  kartIstatistikMetin: { color: '#8B7355', fontSize: 13, fontWeight: '600' },
  kategoriBadge: {
    backgroundColor: '#E1F2FE', color: '#1B4965', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, fontSize: 12, fontWeight: '600',
    alignSelf: 'flex-start',
  },
  acilRozet: {
    position: 'absolute', top: -1, right: -1,
    backgroundColor: '#FF4444', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  acilRozetYazi: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // Butonlar
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
  vazgec: { textAlign: 'center', color: '#A3B1B9', marginTop: 20, fontSize: 14 },

  // Input
  inp: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#E8E8E0',
    fontSize: 15, color: '#1B4965',
  },
  inputBaslik: { color: '#526E7F', fontWeight: '600', marginBottom: 8, fontSize: 13 },

  // Chip
  chipAlan: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  chip: {
    borderWidth: 1.5, borderColor: '#D1D9E0', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FFF',
  },
  chipAktif: { backgroundColor: '#1B4965', borderColor: '#1B4965' },
  chipY: { color: '#526E7F', fontSize: 13, fontWeight: '500' },
  chipYAktif: { color: '#FFF' },

  // Tab
  tabBar: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#E8E8E0' },
  tabAktif: { borderBottomColor: '#1B4965' },
  tabY: { color: '#A3B1B9', fontWeight: '600' },
  tabYA: { color: '#1B4965' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKutu: {
    backgroundColor: '#F5F5F0', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 25, paddingBottom: 40,
  },
  modalBaslik: { fontSize: 20, fontWeight: '700', color: '#1B4965', textAlign: 'center', marginBottom: 15 },

  // Profil
  profilResimSec: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E1F2FE',
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

  // Drawer (Sol Menü)
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

  // Diğer
  bas: { fontSize: 22, fontWeight: '700', color: '#1B4965', marginBottom: 5 },
  alt: { color: '#526E7F', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  onayKutu: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E8E8E0',
  },
  kuponBolumu: { flexDirection: 'row', marginBottom: 15 },
  kuponInp: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E8E8E0', fontSize: 16, fontWeight: 'bold',
    letterSpacing: 2, color: '#1B4965', marginRight: 8,
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
