import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, FlatList, Alert, Dimensions, Image, RefreshControl, Switch, Animated, Modal, Linking, Share } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

const { width } = Dimensions.get('window');
const API_KEY = "AIzaSyCcvq9VkMugDZTq3fOPypJIy0ATiGmPxrk";
const DB_URL = "https://usta-mugla-default-rtdb.europe-west1.firebasedatabase.app";

const BOLGELER = ['Menteşe (Merkez)', 'Bodrum', 'Dalaman', 'Datça', 'Fethiye', 'Kavaklıdere', 'Köyceğiz', 'Marmaris', 'Milas', 'Ortaca', 'Seydikemer', 'Ula', 'Yatağan'];
const BRANSLAR = ['Tesisat (Sucu)', 'Elektrik', 'Boyacı', 'Klimacı', 'Nakliyat', 'Temizlik', 'Diğer'];
const KATEGORILER = ['Tümü', 'Tesisat (Sucu)', 'Klimacı', 'Boyacı', 'Elektrik', 'Temizlik', 'Nakliyat', 'Diğer'];
const YENI_ILAN_KATEGORILER = ['Temizlik', 'Boya/Badana', 'Tesisat (Sucu)', 'Elektrik', 'Klima', 'Nakliyat', 'Diğer'];
const IS_TARIHI_SECENEKLER = ['Bugün', 'Yarın', 'Bu Hafta', 'İleri Bir Tarih'];

const referansKoduOlustur = () => {
  const karakterler = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let kod = '';
  for (let i = 0; i < 7; i++) {
    kod += karakterler.charAt(Math.floor(Math.random() * karakterler.length));
  }
  return kod;
};
async function pushTokenAl() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return ''; // İzin vermezse boş dönsün, kayıt işlemine engel olmasın
    }
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.log("Token alınamadı:", error);
    return '';
  }
}
async function haberUcur(hedefUid, baslik, mesaj) {
  try {
    // 1. Önce hedef kullanıcının token'ını bulalım
    const usRes = await fetch(`${DB_URL}/kullanicilar/${hedefUid}.json`);
    const hedefData = await usRes.json();

    // 2. Bildirimi Firebase'e (Geçmişe) kaydedelim
    const yeniBildirim = {
      baslik,
      mesaj,
      tarih: Date.now(),
      okundu: false
    };
    await fetch(`${DB_URL}/bildirimler/${hedefUid}.json`, {
      method: 'POST',
      body: JSON.stringify(yeniBildirim)
    });

    // 3. Eğer telefon token'ı varsa Push Bildirim atalım
    if (hedefData?.pushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: hedefData.pushToken,
          sound: 'default',
          title: baslik,
          body: mesaj
        }),
      });
    }
  } catch (e) { console.log("Haber uçurulamadı:", e); }
}

export default function App() {
  const [bildirimler, setBildirimler] = useState([]);
  const [bildirimYukleniyor, setBildirimYukleniyor] = useState(false);
  const [splash, setSplash] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [ekran, setEkran] = useState('karsilama');
  const [rol, setRol] = useState('');
  const [mod, setMod] = useState('kayit');
  const [menuAcik, setMenuAcik] = useState(false);
  const [kullanici, setKullanici] = useState(null);
  const [anlasmaSaglandi, setAnlasmaSaglandi] = useState(false);
  const [ilcelerAcik, setIlcelerAcik] = useState(false);
  const [acikIlce, setAcikIlce] = useState(null);
  const [seciliKategori, setSeciliKategori] = useState('Tümü');
  const [filtreAcik, setFiltreAcik] = useState(false);
  const [odemeAdim, setOdemeAdim] = useState('secim');
  const [kuponKod, setKuponKod] = useState('');
  const [sistemIst, setSistemIst] = useState({ usta: 0, musteri: 0, bolgeUsta: {} });

  // Form state
  const [ad, setAd] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [kayitBolge, setKayitBolge] = useState('');
  const [kayitBrans, setKayitBrans] = useState('');
  const [profilTel, setProfilTel] = useState('');
  const [ilanKategori, setIlanKategori] = useState('Temizlik');
  const [ilanBaslik, setIlanBaslik] = useState('');
  const [ilanDetay, setIlanDetay] = useState('');
  const [ilanIlce, setIlanIlce] = useState('');
  const [ilanMahalle, setIlanMahalle] = useState('');
  const [ilanTarihi, setIlanTarihi] = useState('');
  const [ilanTarihiOzel, setIlanTarihiOzel] = useState('');
  const [secilenIlan, setSecilenIlan] = useState(null);
  const [teklifFiyat, setTeklifFiyat] = useState('');
  const [teklifNot, setTeklifNot] = useState('');
  const [aktifSohbetTeklif, setAktifSohbetTeklif] = useState(null);
  const [ilanlar, setIlanlar] = useState([]);
  const [token, setToken] = useState(null);
  const [bildirimAcik, setBildirimAcik] = useState(true);
  const [karanlikMod, setKaranlikMod] = useState(false);
  const [isTarihiTip, setIsTarihiTip] = useState('Bugün'); 
const [ozelTarih, setOzelTarih] = useState('');
const [takvimAcik, setTakvimAcik] = useState(false);
const [ilceDuzenleAcik, setIlceDuzenleAcik] = useState(false);
const [takvimDegeri, setTakvimDegeri] = useState(new Date());

  // Tur 1 state
  const [kvkkKabul, setKvkkKabul] = useState(false);
  const [sozlesmeKabul, setSozlesmeKabul] = useState(false);
  const [sifremiUnuttumEmail, setSifremiUnuttumEmail] = useState('');
  const [iletisimKonu, setIletisimKonu] = useState('');
  const [iletisimMesaj, setIletisimMesaj] = useState('');

  // Tur 2 state
  const [puanModalAcik, setPuanModalAcik] = useState(false);
  const [puanSeçilen, setPuanSeçilen] = useState(0);
  const [puanYorum, setPuanYorum] = useState('');
  const [puanlananIlan, setPuanlananIlan] = useState(null);
  const [ilanAcil, setIlanAcil] = useState(false);
  const [davetKodu, setDavetKodu] = useState('');
  const [sikayetMesaj, setSikayetMesaj] = useState('');
  const [sikayetModalAcik, setSikayetModalAcik] = useState(false);
  const [sikayetHedef, setSikayetHedef] = useState('');

  const donmeAnimasyon = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(splashOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(donmeAnimasyon, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
    setTimeout(() => {
      Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setSplash(false));
    }, 2500);
  }, []);

  useEffect(() => {
    if (kullanici) { veriYukle(); zamanBekcisi(); }
  }, [kullanici]);

  const zamanBekcisi = async () => {
    if (!kullanici || !token) return;
    let guncellemeVar = false; let yeniVeriler = {};
    const suAn = Date.now(); const OTUZ_GUN = 2592000000;
    if (kullanici.abonelik && kullanici.abonelikBitis && suAn > kullanici.abonelikBitis) {
      yeniVeriler.abonelik = false; yeniVeriler.abonelikBitis = null; guncellemeVar = true;
    }
    if (kullanici.yeniKullaniciHakki > 0 && kullanici.kayitTarihi && (suAn - kullanici.kayitTarihi > OTUZ_GUN)) {
      yeniVeriler.yeniKullaniciHakki = 0; guncellemeVar = true;
    }
    if (guncellemeVar) {
      try {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniVeriler) });
        setKullanici(prev => ({ ...prev, ...yeniVeriler }));
      } catch (e) { console.log('Zaman bekçisi hatası'); }
    }
  };

  const veriYukle = async () => {
    try {
      const [ilanRes, kulRes] = await Promise.all([fetch(`${DB_URL}/ilanlar.json`), fetch(`${DB_URL}/kullanicilar.json`)]);
      const ilanData = await ilanRes.json();
      if (ilanData) {
        const liste = Object.keys(ilanData).map(key => {
          const ilan = ilanData[key];
          const tekliflerDizisi = ilan.teklifler ? Object.keys(ilan.teklifler).map(tKey => ({ id: tKey, ...ilan.teklifler[tKey] })) : [];
          return { id: key, ...ilan, teklifler: tekliflerDizisi };
        });
        // Acil ilanlar üste
        const sirali = liste.sort((a, b) => {
          if (a.acil && !b.acil) return -1;
          if (!a.acil && b.acil) return 1;
          return b.tarih - a.tarih;
        });
        setIlanlar(sirali);
      } else { setIlanlar([]); }
      const kulData = await kulRes.json();
if (kulData) {
  Object.keys(kulData).forEach(async (uid) => {
    if (kulData[uid].yeniKullaniciHakki === undefined) {
      // Eğer bu kullanıcının hak alanı boşsa 3 hak tanımla
      await fetch(`${DB_URL}/kullanicilar/${uid}.json`, {
        method: 'PATCH',
        body: JSON.stringify({ yeniKullaniciHakki: 3 })
      });
    }
  });
}
      if (kulData) {
        let ustaSayisi = 0; let musteriSayisi = 0; let bolgeDagilimi = {};
        Object.values(kulData).forEach(k => {
          if (k.rol === 'usta') {
            ustaSayisi++;
            const b = k.bolge || 'Belirtilmemiş'; const meslek = k.meslek || 'Diğer';
            if (!bolgeDagilimi[b]) { bolgeDagilimi[b] = { toplam: 0, detay: {} }; }
            bolgeDagilimi[b].toplam += 1; bolgeDagilimi[b].detay[meslek] = (bolgeDagilimi[b].detay[meslek] || 0) + 1;
          } else if (k.rol === 'musteri') { musteriSayisi++; }
        });
        setSistemIst({ usta: ustaSayisi, musteri: musteriSayisi, bolgeUsta: bolgeDagilimi });
      }
    } catch (e) { console.log('Veriler yüklenemedi:', e); }
  };

  const onYenile = async () => { setYenileniyor(true); await veriYukle(); setYenileniyor(false); };

  const islemiTamamla = async () => {
    if (!email || !sifre || (mod === 'kayit' && !ad)) return Alert.alert("Hata", "Eksik bilgi!");
    if (mod === 'kayit' && !kayitBolge) return Alert.alert("Hata", "İlçe seçin!");
    if (mod === 'kayit' && rol === 'usta' && !kayitBrans) return Alert.alert("Hata", "Branş seçin!");
    if (mod === 'kayit' && !kvkkKabul) return Alert.alert("Hata", "KVKK metnini onaylamanız gerekiyor!");
    if (mod === 'kayit' && !sozlesmeKabul) return Alert.alert("Hata", "Üyelik sözleşmesini onaylamanız gerekiyor!");
    try {
      if (mod === 'kayit') {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: sifre, returnSecureToken: true })
        });
        const data = await res.json();
        if (data.error) return Alert.alert("Hata", data.error.message);
        setToken(data.idToken);
        const cihazToken = await pushTokenAl();
        const refKod = referansKoduOlustur();
        const yeniKul = { ad, email, rol, bolge: kayitBolge, telefon: '', meslek: rol === 'usta' ? kayitBrans : null, hak: 0, abonelik: false, yeniKullaniciHakki: 3, kayitTarihi: Date.now(), referansKodu: refKod, pushToken: cihazToken || '' };
        await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniKul) });

        // Davet kodu kullanıldıysa hak ekle
        if (davetKodu.trim()) {
          try {
            const tumKulRes = await fetch(`${DB_URL}/kullanicilar.json`);
            const tumKul = await tumKulRes.json();
            if (tumKul) {
              const davetEdenEntry = Object.entries(tumKul).find(([, k]) => k.referansKodu === davetKodu.toUpperCase().trim());
              if (davetEdenEntry) {
                const [davetEdenUid, davetEdenKul] = davetEdenEntry;
                const davetEdenYeniHak = (davetEdenKul.hak || 0) + 1;
                await fetch(`${DB_URL}/kullanicilar/${davetEdenUid}.json?auth=${data.idToken}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hak: davetEdenYeniHak }) });
                // Yeni kullanıcıya da +1 hak
                const yeniKulHak = (yeniKul.hak || 0) + 1;
                await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hak: yeniKulHak }) });
                yeniKul.hak = yeniKulHak;
                Alert.alert("Davet Bonusu! 🎁", "Davet kodunu kullandın, sana ve arkadaşına birer hak eklendi!");
              }
            }
          } catch (e) { console.log('Davet kodu hatası:', e); }
        }
        setKullanici({ ...yeniKul, uid: data.localId });
      } else {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: sifre, returnSecureToken: true })
        });
        const data = await res.json();
        if (data.error) return Alert.alert("Hata", "E-posta veya şifre hatalı!");
        setToken(data.idToken);
        const kulRes = await fetch(`${DB_URL}/kullanicilar/${data.localId}.json`);
        const kulData = await kulRes.json();
        if (kulData) {
          setKullanici({ ...kulData, uid: data.localId, hak: kulData.hak || 0, abonelik: kulData.abonelik || false, yeniKullaniciHakki: kulData.yeniKullaniciHakki || 0, abonelikBitis: kulData.abonelikBitis || null, kayitTarihi: kulData.kayitTarihi || Date.now(), referansKodu: kulData.referansKodu || referansKoduOlustur(data.localId) });
        }
      }
      setEkran('anasayfa');
    } catch (e) { Alert.alert("Hata", "Bağlantı hatası!"); }
  };

  const sifremiUnuttum = async () => {
    if (!sifremiUnuttumEmail) return Alert.alert("Hata", "E-posta adresinizi girin!");
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: sifremiUnuttumEmail })
      });
      const data = await res.json();
      if (data.error) return Alert.alert("Hata", "Bu e-posta kayıtlı değil!");
      Alert.alert("Başarılı ✅", "Şifre sıfırlama bağlantısı e-postanıza gönderildi!");
      setEkran('auth');
    } catch (e) { Alert.alert("Hata", "Bağlantı hatası!"); }
  };

  const iletisimGonder = async () => {
    if (!iletisimKonu || !iletisimMesaj) return Alert.alert("Hata", "Konu ve mesaj alanlarını doldurun!");
    try {
      await fetch(`${DB_URL}/iletisim.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ konu: iletisimKonu, mesaj: iletisimMesaj, gonderen: kullanici?.email || 'Anonim', tarih: Date.now() }) });
      Alert.alert("Teşekkürler! 💙", "Mesajınız iletildi!"); setIletisimKonu(''); setIletisimMesaj(''); setEkran('anasayfa');
    } catch (e) { Alert.alert("Hata", "Mesaj gönderilemedi!"); }
  };

  const kuponUygula = async () => {
    if (kuponKod.toUpperCase() === 'BAYRAM2026') {
      const haziranBirTarihi = 1748908800000;
      setKullanici({ ...kullanici, abonelik: true, abonelikBitis: haziranBirTarihi });
      if (token) { await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ abonelik: true, abonelikBitis: haziranBirTarihi }) }); }
      Alert.alert("Bayram Hediyesi! 🎉", "1 Haziran'a kadar sınırsız kullanım tanımlandı!"); setEkran('anasayfa');
    } else { Alert.alert("Hata", "Geçersiz kod veya kampanya bitmiş."); }
  };

  const ustaTeklifTiklandi = (ilan) => {
    if (kullanici?.abonelik || kullanici?.yeniKullaniciHakki > 0 || kullanici?.hak > 0) { setSecilenIlan(ilan); setEkran('teklifver'); }
    else { setOdemeAdim('secim'); setEkran('odeme'); }
  };

  const teklifGonder = async (ilanId) => {
    if (!teklifFiyat) { Alert.alert("Hata", "Fiyat girmelisiniz!"); return; }
    if (!kullanici.abonelik) {
      let gYH = kullanici.yeniKullaniciHakki; let gH = kullanici.hak;
      if (gYH > 0) { gYH -= 1; } else { gH -= 1; }
      setKullanici({ ...kullanici, yeniKullaniciHakki: gYH, hak: gH });
      if (token) { await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH }) }); }
    }
    const yeniTeklif = { ustaId: kullanici.email, ustaAd: kullanici.ad, fiyat: teklifFiyat + ' TL', not: teklifNot, telefon: kullanici.telefon || 'Numara Yok', tarih: Date.now() };
    try {
      await fetch(`${DB_URL}/ilanlar/${ilanId}/teklifler.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniTeklif) });
      await veriYukle(); setTeklifFiyat(''); setTeklifNot('');
haberUcur(secilenIlan.sahipUid || secilenIlan.uid, "💰 Yeni Teklif!", `${kullanici.ad} usta ilanınıza teklif verdi!`);
      Alert.alert("Başarılı! ✅", "Teklifiniz müşteriye iletildi!"); setEkran('anasayfa');
    } catch (e) { Alert.alert("Hata", "Teklif gönderilemedi!"); }
  };

  const anlasmaYap = async (ilanId, teklif) => {
    Alert.alert("Anlaşmayı Onayla", `${teklif.ustaAd} ile ${teklif.fiyat} üzerinden anlaşıyor musunuz?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Evet, Anlaş!", onPress: async () => {
        try {
          await fetch(`${DB_URL}/ilanlar/${ilanId}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anlasmaVar: true, anlasilanUsta: teklif }) });
          await veriYukle(); setAktifSohbetTeklif(teklif); setAnlasmaSaglandi(true); setSecilenIlan(ilanlar.find(i => i.id === ilanId)); setEkran('sohbet');
          haberUcur(teklif.ustaUid || teklif.uid, "🤝 Anlaşma Sağlandı!", "Müşteri teklifinizi kabul etti, iş sizde!");
        } catch (e) { Alert.alert("Hata", "Anlaşma kaydedilemedi!"); }
      }}
    ]);
  };

  const puanGonder = async () => {
    if (puanSeçilen === 0) { Alert.alert("Hata", "Lütfen puan seçin!"); return; }
    try {
      const puanVerisi = { puan: puanSeçilen, yorum: puanYorum, musteriAd: kullanici.ad, tarih: Date.now() };
      if (puanlananIlan?.anlasilanUsta?.ustaId) {
        await fetch(`${DB_URL}/puanlar/${puanlananIlan.anlasilanUsta.ustaId}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(puanVerisi) });
      }
      await fetch(`${DB_URL}/ilanlar/${puanlananIlan.id}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ puanlandi: true }) });
      setPuanModalAcik(false); setPuanSeçilen(0); setPuanYorum('');
      Alert.alert("Teşekkürler! ⭐", "Değerlendirmeniz kaydedildi!"); setEkran('anasayfa');
    } catch (e) { Alert.alert("Hata", "Puan gönderilemedi!"); }
  };

  const sikayetGonder = async () => {
    if (!sikayetMesaj.trim()) { Alert.alert("Hata", "Şikayet mesajı boş olamaz!"); return; }
    try {
      await fetch(`${DB_URL}/sikayetler.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hedef: sikayetHedef, mesaj: sikayetMesaj, sikayetEden: kullanici?.email, tarih: Date.now() }) });
      setSikayetModalAcik(false); setSikayetMesaj('');
      Alert.alert("Şikayetiniz Alındı ✅", "İncelenip gerekli işlem yapılacaktır.");
    } catch (e) { Alert.alert("Hata", "Şikayet gönderilemedi!"); }
  };

  const anasayfaIlanlari = ilanlar.filter(ilan => {
    const bolgeUygun = ilan.bolge === kullanici?.bolge;
    const kategoriUygun = rol === 'usta' ? (seciliKategori === 'Tümü' ? ilan.kategori === kullanici?.meslek : ilan.kategori === seciliKategori) : (seciliKategori === 'Tümü' || ilan.kategori === seciliKategori);
    return bolgeUygun && kategoriUygun;
  });

  const donmeDegeri = donmeAnimasyon.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // PUAN MODALİ
  const PuanModali = () => (
    <Modal visible={puanModalAcik} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 30 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1B4965', textAlign: 'center', marginBottom: 5 }}>Ustayı Değerlendir</Text>
          <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 20 }}>{puanlananIlan?.anlasilanUsta?.ustaAd}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map(yildiz => (
              <TouchableOpacity key={yildiz} onPress={() => setPuanSeçilen(yildiz)} style={{ marginHorizontal: 8 }}>
                <Text style={{ fontSize: 40, opacity: puanSeçilen >= yildiz ? 1 : 0.3 }}>⭐</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[s.inp, { height: 80, textAlignVertical: 'top' }]} placeholder="Yorumunuzu yazın (isteğe bağlı)..." value={puanYorum} onChangeText={setPuanYorum} multiline />
          <TouchableOpacity style={s.girisBtn} onPress={puanGonder}><Text style={s.anaBtnY}>DEĞERLENDİRMEYİ GÖNDER</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPuanModalAcik(false)} style={{ marginTop: 15, alignItems: 'center' }}>
            <Text style={{ color: '#FF4444' }}>Şimdi Değil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ŞİKAYET MODALİ
  const SikayetModali = () => (
    <Modal visible={sikayetModalAcik} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 30 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF4444', textAlign: 'center', marginBottom: 5 }}>⚠️ Şikayet Et</Text>
          <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 20 }}>{sikayetHedef}</Text>
          <TextInput style={[s.inp, { height: 100, textAlignVertical: 'top' }]} placeholder="Şikayetinizi detaylı açıklayın..." value={sikayetMesaj} onChangeText={setSikayetMesaj} multiline />
          <TouchableOpacity style={[s.girisBtn, { backgroundColor: '#FF4444' }]} onPress={sikayetGonder}><Text style={s.anaBtnY}>ŞİKAYETİ GÖNDER</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setSikayetModalAcik(false)} style={{ marginTop: 15, alignItems: 'center' }}>
            <Text style={{ color: '#526E7F' }}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const SolMenu = () => (
    <View style={s.drawerContainer}>
      <View style={s.drawerIc}>
        <TouchableOpacity style={s.drawerKapat} onPress={() => setMenuAcik(false)}><Text style={{ color: '#FFF', fontSize: 22 }}>✕</Text></TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.profilTiklanabilir} onPress={() => { setMenuAcik(false); setProfilTel(kullanici?.telefon || ''); setEkran('profil'); }}>
            <View style={s.profilAvatar}><Text style={s.avatarHarf}>{kullanici?.ad[0]}</Text></View>
            <Text style={s.profilAd}>{kullanici?.ad}</Text>
            <Text style={s.profilDuzenleText}>{kullanici?.abonelik ? '👑 VIP ABONE' : `Hak: ${kullanici?.hak} | Yeni: ${kullanici?.yeniKullaniciHakki}`}</Text>
          </TouchableOpacity>
          <View style={s.ayrac} />
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}><Text style={s.menuText}>🏠 Anasayfa</Text></TouchableOpacity>
          {rol === 'usta' ? (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}><Text style={s.menuText}>🛠️ İşlere Teklif Ver</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanver'); }}><Text style={s.menuText}>➕ İlan Ver</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanlarim'); }}><Text style={s.menuText}>📋 {rol === 'usta' ? 'Tekliflerim' : 'İlanlarım'}</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setOdemeAdim('secim'); setEkran('odeme'); }}><Text style={s.menuText}>🎫 Paket & Kupon</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('davet'); }}><Text style={s.menuText}>🎁 Davet Et, Kazan</Text></TouchableOpacity>
          <View style={s.ayrac} />
          <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }} onPress={() => setIlcelerAcik(!ilcelerAcik)}>
            <Text style={[s.menuBaslik, { marginTop: 0, marginBottom: 0, fontSize: 13, fontWeight: 'bold' }]}>MUĞLA USTA RAPORU</Text>
            <Text style={{ color: '#FFF', opacity: 0.6, fontSize: 12 }}>{ilcelerAcik ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {ilcelerAcik && BOLGELER.map((bolgeAd) => {
            const bolgeVeri = sistemIst.bolgeUsta[bolgeAd] || { toplam: 0, detay: {} };
            return (
              <View key={bolgeAd}>
                <TouchableOpacity style={s.ilceItem} onPress={() => setAcikIlce(acikIlce === bolgeAd ? null : bolgeAd)}>
                  <Text style={s.ilceAd}>{bolgeAd}</Text>
                  <Text style={s.ilceAltBilgi}>{bolgeVeri.toplam} Kayıtlı Usta</Text>
                </TouchableOpacity>
                {acikIlce === bolgeAd && Object.keys(bolgeVeri.detay).length > 0 && (
                  <View style={s.ilceDetayAlan}>{Object.entries(bolgeVeri.detay).map(([meslek, sayi], i) => (<Text key={i} style={s.detaySatir}>- {meslek}: {sayi} Usta</Text>))}</View>
                )}
              </View>
            );
          })}
          <View style={s.ayrac} />
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('iletisim'); }}><Text style={s.menuText}>✉️ İletişim</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('hakkimizda'); }}><Text style={s.menuText}>ℹ️ Hakkımızda</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('hizmet_kosullari'); }}><Text style={s.menuText}>📄 Hizmet Koşulları</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ayarlar'); }}><Text style={s.menuText}>⚙️ Ayarlar</Text></TouchableOpacity>
          <View style={s.ayrac} />
          <TouchableOpacity style={s.menuItem} onPress={() => { setKullanici(null); setToken(null); setEkran('karsilama'); setMenuAcik(false); }}><Text style={s.cikisY}>ÇIKIŞ YAP</Text></TouchableOpacity>
          <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 20, marginBottom: 10 }}>© 2026 GAYIT Tüm Hakları Saklıdır.</Text>
        </ScrollView>
      </View>
    </View>
  );

  // SPLASH
  if (splash) {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center', opacity: splashOpacity }}>
        <View style={s.splashLogoContainer}>
          <Animated.View style={[s.splashDonenCember, { transform: [{ rotate: donmeDegeri }] }]} />
          <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={s.splashLogoMerkez} resizeMode="contain" />
        </View>
        <Text style={s.splashBaslik}>GAYIT</Text>
        <Text style={s.splashAlt}>Muğla'nın bütün işi gaydı artık burada</Text>
      </Animated.View>
    );
  }

  // KARŞILAMA
  if (ekran === 'karsilama') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.ic}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: -30 }}>
              <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 180, height: 180 }} resizeMode="contain" />
              <Text style={{ fontSize: 36, fontWeight: '600', color: '#1B4965', letterSpacing: 4, marginLeft: -45, marginTop: 35, fontFamily: 'serif' }}>AYIT</Text>
            </View>
            <Text style={{ color: '#8B7355', fontSize: 14, fontStyle: 'italic', marginTop: -30 }}>Muğla'nın bütün işi gaydı artık burada</Text>
          </View>
          <View style={s.btnAlan}>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965' }]} onPress={() => { setRol('usta'); setMod('kayit'); setEkran('auth'); }}><Text style={s.anaBtnY}>Usta Girişi / Kayıt</Text></TouchableOpacity>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#588157' }]} onPress={() => { setRol('musteri'); setMod('kayit'); setEkran('auth'); }}><Text style={s.anaBtnY}>Müşteri Girişi / Kayıt</Text></TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // KVKK
  if (ekran === 'kvkk') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('auth')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>KVKK Aydınlatma</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15, textAlign: 'center' }}>GAYIT KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>1. Veri Sorumlusu</Text>
          <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>6698 sayılı KVKK uyarınca, GAYIT Platformu olarak kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında işlemekteyiz.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>2. İşlenen Kişisel Verileriniz</Text>
          <Text style={{ color: '#526E7F', marginBottom: 3, lineHeight: 22 }}>• Kimlik Verisi: Ad, soyad.</Text>
          <Text style={{ color: '#526E7F', marginBottom: 3, lineHeight: 22 }}>• İletişim Verisi: E-posta, telefon numarası.</Text>
          <Text style={{ color: '#526E7F', marginBottom: 3, lineHeight: 22 }}>• Konum Verisi: İlçe ve mahalle bilgisi.</Text>
          <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>• Mesleki Veri: (Ustalar için) Branş, teklifler, ilan detayları, puanlamalar.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>3. İşlenme Amacı</Text>
          <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>Müşteri ile Usta arasındaki iletişimin sağlanması, üyelik işlemlerinin yapılması, sistem güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>4. Veri Aktarımı</Text>
          <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>Telefon numaranız yalnızca "ANLAŞMA SAĞLANDI" butonuna basıldığında karşı tarafa gösterilir. Verileriniz üçüncü şahıslara veya reklam şirketlerine satılmaz.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>5. Kullanıcı Hakları</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>Verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini isteme ve "Hesabı Sil" özelliğini kullanarak tamamen silinmesini talep etme haklarına sahipsiniz.</Text>
          <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 20 }}>
            <Text style={{ color: '#588157', fontWeight: 'bold', textAlign: 'center' }}>Kayıt olarak bu metni onaylıyorsunuz.</Text>
          </View>
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => { setKvkkKabul(true); setEkran('auth'); }}>
            <Text style={s.anaBtnY}>✅ OKUDUM VE ONAYLIYORUM</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ŞİFREMİ UNUTTUM
  if (ekran === 'sifremi_unuttum') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('auth')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Şifremi Unuttum</Text><View style={{ width: 24 }} /></View>
        <ScrollView contentContainerStyle={s.authIc}>
          <Text style={{ textAlign: 'center', fontSize: 48, marginBottom: 10 }}>🔑</Text>
          <Text style={[s.bas, { textAlign: 'center', marginBottom: 10 }]}>Şifre Sıfırlama</Text>
          <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 20 }}>Kayıtlı e-posta adresinizi girin. Şifre sıfırlama bağlantısı göndereceğiz.</Text>
          <TextInput style={s.inp} placeholder="E-posta adresiniz" value={sifremiUnuttumEmail} onChangeText={setSifremiUnuttumEmail} autoCapitalize="none" keyboardType="email-address" />
          <TouchableOpacity style={[s.girisBtn, { marginTop: 10 }]} onPress={sifremiUnuttum}><Text style={s.anaBtnY}>SIFIRLAMA BAĞLANTISI GÖNDER</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEkran('auth')}><Text style={{ textAlign: 'center', marginTop: 15, color: '#1B4965' }}>← Giriş Sayfasına Dön</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // GİRİŞ / KAYIT
  if (ekran === 'auth') {
    return (
      <SafeAreaView style={s.con}>
        <ScrollView contentContainerStyle={s.authIc}>
          <View style={{ alignItems: 'center', marginBottom: 25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 90, height: 90 }} resizeMode="contain" />
              <Text style={{ fontSize: 28, fontWeight: '600', color: '#1B4965', letterSpacing: 3, marginLeft: -20, marginTop: 12, fontFamily: 'serif' }}>AYIT</Text>
            </View>
          </View>
          <Text style={[s.bas, { textAlign: 'center' }]}>{rol === 'usta' ? 'Usta' : 'Müşteri'} Paneli</Text>
          <View style={s.tabBar}>
            <TouchableOpacity style={[s.tab, mod === 'kayit' && s.tabAktif]} onPress={() => setMod('kayit')}><Text style={[s.tabY, mod === 'kayit' && s.tabYA]}>Kayıt Ol</Text></TouchableOpacity>
            <TouchableOpacity style={[s.tab, mod === 'giris' && s.tabAktif]} onPress={() => setMod('giris')}><Text style={[s.tabY, mod === 'giris' && s.tabYA]}>Giriş Yap</Text></TouchableOpacity>
          </View>
          {mod === 'kayit' && <TextInput style={s.inp} placeholder="Ad Soyad" onChangeText={setAd} />}
          <TextInput style={s.inp} placeholder="E-posta" onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.inp} placeholder="Şifre" onChangeText={setSifre} secureTextEntry />
          {mod === 'giris' && (
            <TouchableOpacity onPress={() => setEkran('sifremi_unuttum')} style={{ alignSelf: 'flex-end', marginBottom: 10, marginTop: -5 }}>
              <Text style={{ color: '#1B4965', fontSize: 13 }}>Şifremi Unuttum</Text>
            </TouchableOpacity>
          )}
          {mod === 'kayit' && (
            <>
              <Text style={s.inputBaslik}>Bulunduğunuz İlçe</Text>
              <View style={s.chipAlan}>
                {BOLGELER.map(b => (<TouchableOpacity key={b} style={[s.chip, kayitBolge === b && s.chipAktif]} onPress={() => setKayitBolge(b)}><Text style={[s.chipY, kayitBolge === b && s.chipYAktif]}>{b}</Text></TouchableOpacity>))}
              </View>
              {rol === 'usta' && (
                <>
                  <Text style={s.inputBaslik}>Branşınız</Text>
                  <View style={s.chipAlan}>
                    {BRANSLAR.map(b => (<TouchableOpacity key={b} style={[s.chip, kayitBrans === b && s.chipAktif]} onPress={() => setKayitBrans(b)}><Text style={[s.chipY, kayitBrans === b && s.chipYAktif]}>{b}</Text></TouchableOpacity>))}
                  </View>
                </>
              )}
              <Text style={s.inputBaslik}>Davet Kodu (İsteğe Bağlı)</Text>
              <TextInput style={s.inp} placeholder="GAYIT-XXXX" value={davetKodu} onChangeText={setDavetKodu} autoCapitalize="characters" />
              <View style={s.onayKutu}>
                <Switch value={kvkkKabul} onValueChange={setKvkkKabul} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <TouchableOpacity onPress={() => setEkran('kvkk')}>
                    <Text style={{ color: '#1B4965', fontSize: 13 }}><Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>KVKK Aydınlatma Metni</Text>'ni okudum, onaylıyorum.</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.onayKutu}>
                <Switch value={sozlesmeKabul} onValueChange={setSozlesmeKabul} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <TouchableOpacity onPress={() => setEkran('hizmet_kosullari')}>
                    <Text style={{ color: '#1B4965', fontSize: 13 }}><Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>Üyelik Sözleşmesi</Text>'ni okudum, onaylıyorum.</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
          <TouchableOpacity style={s.girisBtn} onPress={islemiTamamla}><Text style={s.anaBtnY}>DEVAM ET</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEkran('karsilama')}><Text style={{ textAlign: 'center', marginTop: 15, color: '#1B4965' }}>← Geri</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // İLETİŞİM
  if (ekran === 'iletisim') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>İletişim</Text><View style={{ width: 24 }} /></View>
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
          <TextInput style={[s.inp, { height: 120, textAlignVertical: 'top' }]} placeholder="Mesajınızı buraya yazın..." value={iletisimMesaj} onChangeText={setIletisimMesaj} multiline />
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={iletisimGonder}><Text style={s.anaBtnY}>MESAJ GÖNDER</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // DAVET ET KAZAN
  if (ekran === 'davet') {
    const refKod = kullanici?.referansKodu || referansKoduOlustur(kullanici?.uid);
    const paylasimMetni = `GAYIT uygulamasını kullanıyorum! Muğla'nın en iyi usta platformu. Davet kodumla kayıt ol, ikimiz de hak kazanalım!\n\nDavet Kodum: ${refKod}\n\nİndirmek için: gayit.com.tr`;
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Davet Et, Kazan</Text><View style={{ width: 24 }} /></View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ backgroundColor: '#1B4965', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 25 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>Senin Davet Kodun</Text>
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 15 }}>{refKod}</Text>
            <TouchableOpacity style={{ backgroundColor: '#588157', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }} onPress={() => Alert.alert("Kopyalandı! ✅", `${refKod} kodun kopyalandı!`)}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>📋 Kodu Kopyala</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15 }}>Nasıl Çalışır? 🎁</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>1️⃣</Text>
              <Text style={{ color: '#526E7F', flex: 1 }}>Arkadaşını GAYIT'a davet et</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>2️⃣</Text>
              <Text style={{ color: '#526E7F', flex: 1 }}>O, kayıt olurken senin kodunu girsin</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>3️⃣</Text>
              <Text style={{ color: '#526E7F', flex: 1 }}>İkiniz de +1 hak kazanırsınız!</Text>
            </View>
          </View>
          <TouchableOpacity style={[s.girisBtn, { backgroundColor: '#25D366', marginBottom: 15 }]} onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(paylasimMetni)}`)}>
            <Text style={s.anaBtnY}>📱 WhatsApp'ta Paylaş</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.girisBtn} onPress={() => Share.share({ message: paylasimMetni })}>
            <Text style={s.anaBtnY}>🔗 Diğer Uygulamalarla Paylaş</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // İLAN VER
  if (ekran === 'ilanver') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Yeni İlan Ver</Text><View style={{ width: 24 }} /></View>
        <ScrollView contentContainerStyle={s.authIc}>
          <Text style={s.inputBaslik}>İlan Kategorisi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
            {YENI_ILAN_KATEGORILER.map(k => (<TouchableOpacity key={k} onPress={() => setIlanKategori(k)} style={[s.chip, ilanKategori === k && s.chipAktif, { marginRight: 8 }]}><Text style={[s.chipY, ilanKategori === k && s.chipYAktif]}>{k}</Text></TouchableOpacity>))}
          </ScrollView>
          <Text style={s.inputBaslik}>İlan Başlığı</Text>
          <TextInput style={s.inp} placeholder="Örn: Banyo Tesisat Yenileme" onChangeText={setIlanBaslik} />
          <Text style={s.inputBaslik}>Açıklama</Text>
          <TextInput style={[s.inp, { height: 100, textAlignVertical: 'top' }]} placeholder="İşin detaylarını buraya yazın..." onChangeText={setIlanDetay} multiline maxLength={500} />
          <Text style={s.inputBaslik}>İlçe</Text>
          <View style={s.chipAlan}>
            {BOLGELER.map(b => (<TouchableOpacity key={b} style={[s.chip, ilanIlce === b && s.chipAktif]} onPress={() => setIlanIlce(b)}><Text style={[s.chipY, ilanIlce === b && s.chipYAktif]}>{b}</Text></TouchableOpacity>))}
          </View>
          <Text style={s.inputBaslik}>Mahalle</Text>
          <TextInput style={s.inp} placeholder="Örn: Güneş Mahallesi" onChangeText={setIlanMahalle} />
         <Text style={s.inputBaslik}>İşin Yapılacağı Tarih</Text>
          <View style={s.chipAlan}>
            <TouchableOpacity style={[s.chip, isTarihiTip === 'Bugün' && s.chipAktif]} onPress={() => setIsTarihiTip('Bugün')}>
              <Text style={[s.chipY, isTarihiTip === 'Bugün' && s.chipYAktif]}>Bugün</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[s.chip, isTarihiTip === 'Yarın' && s.chipAktif]} onPress={() => setIsTarihiTip('Yarın')}>
              <Text style={[s.chipY, isTarihiTip === 'Yarın' && s.chipYAktif]}>Yarın</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[s.chip, isTarihiTip === 'İleri' && s.chipAktif]} onPress={() => { setIsTarihiTip('İleri'); setTakvimAcik(true); }}>
              <Text style={[s.chipY, isTarihiTip === 'İleri' && s.chipYAktif]}>
                {isTarihiTip === 'İleri' && ozelTarih ? ozelTarih : 'İleri Bir Tarih 📅'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAKVİM BİLEŞENİ GİZLİCE BURADA BEKLİYOR GARİ */}
          {takvimAcik && (
            <DateTimePicker
              value={takvimDegeri}
              mode="date"
              minimumDate={new Date()} // Geçmiş günleri seçmesini engeller
              onChange={(event, date) => {
                setTakvimAcik(false); // Takvimi kapat
                if (date) {
                  setTakvimDegeri(date);
                  setOzelTarih(date.toLocaleDateString('tr-TR')); // Tarihi "15.05.2026" yapar
                } else {
                  setIsTarihiTip('Bugün'); // Adam iptale basarsa "Bugün"e dönsün
                }
              }}
            />
          )}

          {/* ACİL İLAN */}
          <View style={[s.onayKutu, { backgroundColor: ilanAcil ? '#FFEBEE' : '#FFF', borderColor: ilanAcil ? '#FF4444' : '#D1D9E0' }]}>
            <Switch value={ilanAcil} onValueChange={setIlanAcil} trackColor={{ false: '#D1D9E0', true: '#FF4444' }} thumbColor="#FFF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: ilanAcil ? '#FF4444' : '#526E7F', fontWeight: 'bold', fontSize: 14 }}>🚨 Bu İlan Acil mi?</Text>
              <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 2 }}>Acil ilanlar üstte gösterilir (+50 TL)</Text>
            </View>
          </View>

          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={async () => {
            if (!ilanBaslik || !ilanDetay || !ilanIlce || !ilanMahalle) { Alert.alert("Eksik Bilgi", "Lütfen tüm alanları doldurun!"); return; }
            if (!ilanTarihi) { Alert.alert("Eksik Bilgi", "İşin yapılacağı tarihi seçin!"); return; }
            const aktifAyniKategoriIlan = ilanlar.find(i => i.sahip === kullanici.email && i.kategori === ilanKategori && !i.anlasmaVar);
            if (aktifAyniKategoriIlan) { Alert.alert("Hata", "Bu kategoride zaten aktif bir ilanınız var!"); return; }
            const hakVar = kullanici?.abonelik || kullanici?.yeniKullaniciHakki > 0 || kullanici?.hak > 0;
            if (!hakVar && !ilanAcil) { setEkran('odeme'); return; }
            if (ilanAcil && !kullanici?.abonelik) { Alert.alert("Acil İlan", "Acil ilan ücreti 50 TL'dir. Ödeme ekranına yönlendiriliyorsunuz."); setEkran('odeme'); return; }
            if (!kullanici.abonelik) {
              let gYH = kullanici.yeniKullaniciHakki; let gH = kullanici.hak;
              if (gYH > 0) { gYH -= 1; } else { gH -= 1; }
              setKullanici({ ...kullanici, yeniKullaniciHakki: gYH, hak: gH });
              if (token) { await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH }) }); }
            }
            const isTarihiFinal = ilanTarihi === 'İleri Bir Tarih' ? ilanTarihiOzel : ilanTarihi;
            const kaydedilecekTarih = isTarihiTip === 'İleri' ? ozelTarih : isTarihiTip;
            const yeniIlan = { baslik: ilanBaslik, kategori: ilanKategori, bolge: ilanIlce, mahalle: ilanMahalle, detay: ilanDetay, isTarihi: isTarihiFinal, acil: ilanAcil, sure: 'Şimdi', sahip: kullanici.email, anlasmaVar: false, teklifler: [], tarih: Date.now() };
            try {
              await fetch(`${DB_URL}/ilanlar.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniIlan) });
              await veriYukle(); Alert.alert("Başarılı! 🎉", `İlanınız ${ilanAcil ? 'ACİL olarak ' : ''}yayınlandı!`);
              // İlan başarıyla yayınlandı, hakkı eksiltiyoruz gari
if (!kullanici.abonelik && (kullanici.yeniKullaniciHakki > 0 || kullanici.hak > 0)) {
  let gYH = kullanici.yeniKullaniciHakki || 0;
  let gH = kullanici.hak || 0;
  if (gYH > 0) gYH -= 1; else gH -= 1;
  setKullanici({ ...kullanici, yeniKullaniciHakki: gYH, hak: gH });
  await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
    method: 'PATCH',
    body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH })
  });
}
              setIlanBaslik(''); setIlanDetay(''); setIlanIlce(''); setIlanMahalle(''); setIlanTarihi(''); setIlanTarihiOzel(''); setIlanAcil(false); setEkran('anasayfa');
            } catch (e) { Alert.alert("Hata", "İlan kaydedilemedi!"); }
          }}><Text style={s.anaBtnY}>İLAN OLUŞTUR VE YAYINLA</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // TEKLİF VER
  if (ekran === 'teklifver' && secilenIlan) {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Teklif Ver</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={s.scroll}>
          <View style={[s.kart, secilenIlan.acil && { borderWidth: 2, borderColor: '#FF4444' }]}>
            {secilenIlan.acil && <View style={s.acilRozet}><Text style={s.acilRozetYazi}>🚨 ACİL</Text></View>}
            <Text style={s.kategoriBadge}>{secilenIlan.kategori}</Text>
            <Text style={s.kartBaslik}>{secilenIlan.baslik}</Text>
            <Text style={s.kartAlt}>📍 {secilenIlan.mahalle} - {secilenIlan.bolge}</Text>
            {secilenIlan.isTarihi && <Text style={s.kartAlt}>📅 {secilenIlan.isTarihi}</Text>}
            <View style={s.kartIstatistikler}><Text style={s.kartIstatistikMetin}>{secilenIlan.teklifler?.length || 0} teklif var</Text></View>
          </View>
          <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginBottom: 15 }}>
            <Text style={{ color: '#1B4965', fontSize: 13 }}>💡 Fiyatınız sadece müşteri tarafından görülecek.</Text>
          </View>
          <Text style={s.inputBaslik}>Fiyat Teklifiniz (TL)</Text>
          <TextInput style={s.inp} placeholder="Örn: 500" onChangeText={setTeklifFiyat} keyboardType="numeric" />
          <Text style={s.inputBaslik}>Kısa Not (İsteğe Bağlı)</Text>
          <TextInput style={[s.inp, { height: 80, textAlignVertical: 'top' }]} placeholder="Örn: Aynı gün gelebilirim..." onChangeText={setTeklifNot} multiline />
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => teklifGonder(secilenIlan.id)}><Text style={s.anaBtnY}>TEKLİFİ GÖNDER</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // TEKLİFLER
  if (ekran === 'teklifler' && secilenIlan) {
    const ilan = ilanlar.find(i => i.id === secilenIlan.id);
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Teklifler ({ilan?.teklifler?.length || 0})</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={s.scroll}>
          <View style={[s.kart, { marginBottom: 20 }]}>
            <Text style={s.kartBaslik}>{ilan?.baslik}</Text>
            {ilan?.isTarihi && <Text style={s.kartAlt}>📅 {ilan.isTarihi}</Text>}
            <Text style={s.kartAlt}>{ilan?.anlasmaVar ? '✅ ANLAŞMA SAĞLANDI' : '🟢 Aktif İlan'}</Text>
          </View>
          {ilan?.anlasmaVar && <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 15 }}><Text style={{ color: '#588157', fontWeight: 'bold' }}>✅ Anlaşma sağlandı! Diğer ustalar bilgilendirildi.</Text></View>}
          {(!ilan?.teklifler || ilan?.teklifler.length === 0) ? (
            <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz teklif gelmedi.</Text>
          ) : (
            ilan?.teklifler.map(teklif => (
              <View key={teklif.id} style={[s.kart, ilan.anlasilanUsta?.id === teklif.id && { borderWidth: 2, borderColor: '#588157' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965' }}>{teklif.ustaAd}</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#588157' }}>{teklif.fiyat}</Text>
                </View>
                {teklif.not ? <Text style={{ color: '#526E7F', marginTop: 5 }}>{teklif.not}</Text> : null}
                <TouchableOpacity onPress={() => { setSikayetHedef(teklif.ustaAd); setSikayetModalAcik(true); }} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#FF4444', fontSize: 12 }}>⚠️ Şikayet Et</Text>
                </TouchableOpacity>
                {ilan.anlasilanUsta?.id === teklif.id ? (
                  <View style={[s.girisBtn, { backgroundColor: '#588157', marginTop: 10 }]}><Text style={s.anaBtnY}>✅ ANLAŞILDI - {teklif.telefon}</Text></View>
                ) : !ilan.anlasmaVar ? (
                  <TouchableOpacity style={[s.girisBtn, { marginTop: 10 }]} onPress={() => anlasmaYap(ilan.id, teklif)}><Text style={s.anaBtnY}>🤝 BU USTAYLA ANLAŞ</Text></TouchableOpacity>
                ) : (
                  <View style={[s.girisBtn, { backgroundColor: '#ccc', marginTop: 10 }]}><Text style={s.anaBtnY}>Başka Ustayla Anlaşıldı</Text></View>
                )}
              </View>
            ))
          )}
          {ilan?.anlasmaVar && !ilan?.puanlandi && ilan?.sahip === kullanici?.email && (
            <TouchableOpacity style={[s.girisBtn, { backgroundColor: '#F39C12', marginTop: 10, marginBottom: 30 }]} onPress={() => { setPuanlananIlan(ilan); setPuanModalAcik(true); }}>
              <Text style={s.anaBtnY}>⭐ İŞ BİTTİ, USTAYI PUANLA</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <PuanModali />
        <SikayetModali />
      </SafeAreaView>
    );
  }

  // İLANLARIM
  if (ekran === 'ilanlarim') {
    const benimIlanlarim = rol === 'usta' ? ilanlar.filter(ilan => ilan.teklifler && ilan.teklifler.some(t => t.ustaId === kullanici?.email)) : ilanlar.filter(ilan => ilan.sahip === kullanici?.email);
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>{rol === 'usta' ? 'Tekliflerim' : 'İlanlarım'}</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={s.scroll}>
          {benimIlanlarim.length === 0 ? <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz kayıt yok.</Text> : (
            benimIlanlarim.map(item => (
              <TouchableOpacity key={item.id} style={[s.kart, item.acil && { borderWidth: 2, borderColor: '#FF4444' }]} onPress={() => { setSecilenIlan(item); rol === 'musteri' ? setEkran('teklifler') : ustaTeklifTiklandi(item); }}>
                {item.acil && <View style={s.acilRozet}><Text style={s.acilRozetYazi}>🚨 ACİL</Text></View>}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.kategoriBadge}>{item.kategori}</Text>
                  <Text style={{ color: '#A3B1B9', fontSize: 12 }}>{item.sure}</Text>
                </View>
                <Text style={s.kartBaslik}>{item.baslik}</Text>
                <Text style={s.kartAlt}>📍 {item.mahalle} - {item.bolge}</Text>
                {item.isTarihi && <Text style={s.kartAlt}>📅 {item.isTarihi}</Text>}
                <View style={s.kartIstatistikler}>
                  <Text style={s.kartIstatistikMetin}>{item.teklifler?.length || 0} Teklif</Text>
                  {item.anlasmaVar && <Text style={{ color: '#588157', fontWeight: 'bold' }}>✅ ANLAŞMA SAĞLANDI</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // PROFİL
  if (ekran === 'profil') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Profilim</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={s.scroll}>
          <TouchableOpacity style={s.profilResimSec} onPress={() => Alert.alert("Galeri", "Profil fotoğrafı yakında!")}><Text style={{ fontSize: 40 }}>📷</Text><Text style={{ color: '#1B4965', fontWeight: 'bold', marginTop: 5, fontSize: 12 }}>Fotoğraf Yükle</Text></TouchableOpacity>
          <View style={{ alignItems: 'center', marginTop: -10, marginBottom: 20 }}>
            <View style={{ backgroundColor: kullanici?.abonelik ? '#FFF8E1' : '#E1E6EB', borderColor: kullanici?.abonelik ? '#F39C12' : '#A3B1B9', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: kullanici?.abonelik ? '#F39C12' : '#526E7F', fontWeight: 'bold', fontSize: 12 }}>{kullanici?.abonelik ? '👑 VIP (Sınırsız) Abonelik' : '📦 Standart Üyelik'}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center' }}>
            <Text style={{ color: '#526E7F', fontSize: 12, marginBottom: 5 }}>Senin Davet Kodun</Text>
            <Text style={{ color: '#1B4965', fontSize: 20, fontWeight: '900', letterSpacing: 3 }}>{kullanici?.referansKodu || referansKoduOlustur(kullanici?.uid)}</Text>
          </View>
{/* ONAY BAŞVURU ALANI */}
{rol === 'usta' && kullanici?.onayDurumu !== 'onayli' && (
  <View style={{ padding: 15, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#00a2ed', borderStyle: 'dashed' }}>
    <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>Onaylı Usta Rozeti Al </Text>
    <Text style={{ fontSize: 11, color: '#526E7F', marginTop: 4 }}>Belgelerinizi gönderin, mavi tiki profilinizde gösterelim.</Text>
    
    {kullanici?.onayDurumu === 'beklemede' ? (
      <View style={{ marginTop: 10, padding: 8, backgroundColor: '#FDF2F2', borderRadius: 8 }}>
        <Text style={{ color: '#E53E3E', fontSize: 12, textAlign: 'center', fontWeight: 'bold' }}>⌛ Belgeleriniz İncelemede...</Text>
      </View>
    ) : (
      <TouchableOpacity 
        style={{ backgroundColor: '#00a2ed', padding: 10, borderRadius: 8, marginTop: 10 }}
        onPress={() => {
          Alert.alert("Evrak Gönderimi", `Belgelerinizi info@gayit.com.tr adresine iletin`);
          setKullanici({...kullanici, onayDurumu: 'beklemede'});
          if (token) {
            fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
              method: 'PATCH',
              body: JSON.stringify({ onayDurumu: 'beklemede' })
            });
          }
        }}
      >
        <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>BELGE GÖNDER VE BAŞVUR</Text>
      </TouchableOpacity>
    )}
  </View>
)}
          <Text style={s.inputBaslik}>Ad Soyad</Text>
          <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={kullanici?.ad} editable={false} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  <Text style={s.inputBaslik}>Ad Soyad</Text>
  {/* Eğer usta onaylıysa etiketin yanında tik çıkar */}
  {kullanici?.onayDurumu === 'onayli' && (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: '#00a2ed', fontSize: 12, fontWeight: 'bold', marginRight: 4 }}>ONAYLI USTA</Text>
      <Text style={{ fontSize: 16 }}>✅</Text>
    </View>
  )}
</View>
          <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={kullanici?.email} editable={false} />
          <Text style={s.inputBaslik}>Telefon Numarası</Text>
          <TextInput style={s.inp} placeholder="Örn: 0532 XXX XX XX" value={profilTel} onChangeText={setProfilTel} keyboardType="phone-pad" />
          {/* İLÇE DEĞİŞTİRME BÖLÜMÜ */}
          <View style={{ marginTop: 20, alignItems: 'center', width: '100%' }}>
            <Text style={{ fontSize: 16, color: '#1B4965', fontWeight: 'bold' }}>
              📍 Kayıtlı İlçe: {kullanici.ilce || 'Belirtilmemiş'}
            </Text>  
            <TouchableOpacity 
              style={{ marginTop: 10, backgroundColor: '#8B7355', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }}
              onPress={() => setIlceDuzenleAcik(!ilceDuzenleAcik)}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>İlçemi Değiştir</Text>
            </TouchableOpacity>
            {ilceDuzenleAcik && (
              <View style={[s.chipAlan, { marginTop: 15, justifyContent: 'center' }]}>
                {BOLGELER.map((b) => (
                  <TouchableOpacity 
                    key={b} 
                    style={[s.chip, kullanici.ilce === b && s.chipAktif]} 
                    onPress={async () => {
                      try {
                        // 1. Firebase'i güncelle
                        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ilce: b })
                        });
                        
                        // 2. Ekrandaki yazıyı anında güncelle ve menüyü kapat
                        setKullanici({ ...kullanici, ilce: b });
                        setIlceDuzenleAcik(false);
                        Alert.alert("Başarılı", `İlçen başarıyla ${b} olarak güncellendi!`);
                      } catch (e) {
                        Alert.alert("Hata", "İlçe güncellenemedi, internetini kontrol et.");
                      }
                    }}
                  >
                    <Text style={[s.chipY, kullanici.ilce === b && s.chipYAktif]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={{ marginBottom: 15, alignSelf: 'flex-start' }} onPress={() => { setSikayetHedef('Genel Şikayet'); setSikayetModalAcik(true); }}>
            <Text style={{ color: '#FF4444', fontSize: 13 }}>⚠️ Şikayet Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={async () => {
            const up = { telefon: profilTel }; setKullanici({ ...kullanici, ...up });
            if (token) { await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(up) }); }
            Alert.alert("Başarılı ✅", "Profil bilgilerin kaydedildi!");
          }}><Text style={s.anaBtnY}>BİLGİLERİ KAYDET</Text></TouchableOpacity>
        </ScrollView>
        <SikayetModali />
      </SafeAreaView>
    );
  }

  // ÖDEME
  if (ekran === 'odeme') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Paket & Kupon</Text><View style={{ width: 24 }} /></View>
        <View style={s.authIc}>
          {odemeAdim === 'secim' && (
            <>
              <TouchableOpacity style={[s.anaBtn, { marginBottom: 15 }]} onPress={() => setOdemeAdim('kupon')}><Text style={s.anaBtnY}>🎫 Kupon Kodu Kullan</Text></TouchableOpacity>
              <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965' }]} onPress={() => setOdemeAdim('paket')}><Text style={s.anaBtnY}>💳 Ödeme Yap</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setEkran('anasayfa')}><Text style={s.vazgec}>Vazgeç</Text></TouchableOpacity>
            </>
          )}
          {odemeAdim === 'kupon' && (
            <>
              <Text style={s.alt}> Kupon Kodunu Girin</Text>
              <View style={s.kuponBolumu}>
                <TextInput style={s.kuponInp} placeholder="Kupon kodu..." onChangeText={setKuponKod} autoCapitalize="characters" />
                <TouchableOpacity style={s.kuponBtn} onPress={kuponUygula}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>UYGULA</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setOdemeAdim('secim')}><Text style={s.vazgec}>Geri Dön</Text></TouchableOpacity>
            </>
          )}
        {odemeAdim === 'paket' && (
  <>
    {/* ÜSTTEKİ DİNAMİK BUTON (3 TEKLİF VEYA 1 İLAN) */}
    <TouchableOpacity 
      style={[s.anaBtn, { backgroundColor: '#588157', marginTop: 15 }]} 
      onPress={async () => {
        let yeniVeri = {};
        if (rol === 'usta') {
          // Ustaya 3 teklif hakkı veriyoruz
          const yeniHak = (kullanici?.teklifHakki || 0) + 3;
          yeniVeri = { teklifHakki: yeniHak };
          setKullanici({ ...kullanici, teklifHakki: yeniHak });
        } else {
          // Müşteriye 1 ilan hakkı veriyoruz
          const yeniHak = (kullanici?.hak || 0) + 1;
          yeniVeri = { hak: yeniHak };
          setKullanici({ ...kullanici, hak: yeniHak });
        }
        
        if (token) { 
          await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { 
            method: 'PATCH', 
            body: JSON.stringify(yeniVeri) 
          }); 
        }
        Alert.alert('Başarılı! ✅', rol === 'usta' ? '3 adet teklif verme hakkı tanımlandı!' : '1 adet ilan verme hakkı tanımlandı!'); 
        setEkran('anasayfa');
      }}
    >
      <Text style={s.anaBtnY}>
        {rol === 'usta' ? '3 Teklif Verme Hakkı (50 TL)' : '1 Adet İlan Hakkı (50 TL)'}
      </Text>
    </TouchableOpacity>

    {/* AYLIK SINIRSIZ (HERKES İÇİN AYNI) */}
    <TouchableOpacity 
      style={[s.anaBtn, { backgroundColor: '#1B4965', marginTop: 15 }]} 
      onPress={async () => {
        const otuzGunSonra = Date.now() + 2592000000;
        setKullanici({ ...kullanici, abonelik: true, abonelikBitis: otuzGunSonra });
        if (token) { 
          await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { 
            method: 'PATCH', 
            body: JSON.stringify({ abonelik: true, abonelikBitis: otuzGunSonra }) 
          }); 
        }
        Alert.alert('Başarılı! 🎉', 'Aylık sınırsız abonelik aktifleştirildi!'); 
        setEkran('anasayfa');
      }}
    >
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
  // SOHBET
  if (ekran === 'sohbet') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Pazarlık & İletişim</Text>
          <TouchableOpacity onPress={() => { setSikayetHedef(aktifSohbetTeklif?.ustaAd || 'Kullanıcı'); setSikayetModalAcik(true); }}>
            <Text style={{ color: '#FF4444', fontSize: 12 }}>⚠️</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 15 }}>
          {anlasmaSaglandi ? (
            <View style={s.numaraKutu}>
              <Text style={{ color: '#FFF', fontSize: 12, marginBottom: 5 }}>ANLAŞMA SAĞLANDI</Text>
              <Text style={s.numaraText}>📞 {aktifSohbetTeklif?.telefon}</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#FFF8E1', padding: 15, borderRadius: 12, marginBottom: 10 }}>
              <Text style={{ color: '#F39C12' }}>⏳ Müşterinin onayı bekleniyor...</Text>
            </View>
          )}
        </ScrollView>
        {rol === 'musteri' && anlasmaSaglandi && !secilenIlan?.puanlandi && (
          <TouchableOpacity style={[s.anlasBtnSohbet, { backgroundColor: '#588157' }]} onPress={() => { setPuanlananIlan(secilenIlan); setPuanModalAcik(true); }}>
            <Text style={s.anlasBtnY}>⭐ İŞ BİTTİ, PUANLA</Text>
          </TouchableOpacity>
        )}
        <PuanModali />
        <SikayetModali />
      </SafeAreaView>
    );
  }

  // HAKKIMIZDA
  if (ekran === 'hakkimizda') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Hakkımızda</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 80, height: 80 }} resizeMode="contain" />
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#1B4965', letterSpacing: 2, marginTop: 10 }}>GAYIT</Text>
            <Text style={{ color: '#8B7355', fontSize: 12, fontStyle: 'italic' }}>Muğla'nın bütün işi gaydı artık burada</Text>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Biz Kimiz?</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>GAYIT, Muğla ve ilçelerindeki yerel hizmet ağını dijitalleştirmek amacıyla kurulmuş yerli bir platformdur.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Logomuzdaki Bacanın Sırrı</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>G harfimize gizlenmiş o meşhur Muğla bacası; sıcaklığımızı, tüten ocaklarımızın bereketini ve ustalarımızın sağlamlığını temsil eder.</Text>
          <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 40, alignItems: 'center' }}>
            <Text style={{ color: '#588157', fontWeight: 'bold' }}>Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz.</Text>
            <Text style={{ color: '#588157', fontSize: 12, marginTop: 5 }}>© 2026 GAYIT - Tüm Hakları Saklıdır.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // HİZMET KOŞULLARI
  if (ekran === 'hizmet_kosullari') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran(kullanici ? 'anasayfa' : 'auth')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Hizmet Koşulları</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>1. Hizmetin Tanımı</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>GAYIT, Muğla ilindeki hizmet alanlar ile hizmet verenleri bir araya getiren dijital bir pazar yeridir.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>2. Üyelik ve Abonelik</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>Uygulamaya kayıt olan her kullanıcı verdiği bilgilerin doğruluğundan sorumludur.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>3. Sorumluluk Sınırları</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>Usta tarafından sunulan hizmetin kalitesi tamamen Usta'nın sorumluluğundadır.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>4. İlan ve Teklif Kuralları</Text>
          <Text style={{ color: '#526E7F', marginBottom: 40, lineHeight: 22 }}>Yanıltıcı veya yasal olmayan ilanlar silinir. Sistem üzerinden paylaşılan kişisel veriler yalnızca ilgili işin çözümü için kullanılmalıdır.</Text>
          {!kullanici && (
            <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => { setSozlesmeKabul(true); setEkran('auth'); }}>
              <Text style={s.anaBtnY}>✅ OKUDUM VE ONAYLIYORUM</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // AYARLAR
  if (ekran === 'ayarlar') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Ayarlar</Text><View style={{ width: 24 }} /></View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 10 }}>Bildirim Ayarları</Text>
          <View style={{ backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 25, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#526E7F', fontSize: 15 }}>Yeni İş / Teklif Bildirimleri</Text>
              <Switch value={bildirimAcik} onValueChange={setBildirimAcik} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
            </View>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 10 }}>Görünüm</Text>
          <View style={{ backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 25, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#526E7F', fontSize: 15 }}>Karanlık Mod 🌙</Text>
              <Switch value={karanlikMod} onValueChange={(val) => { setKaranlikMod(val); if (val) Alert.alert("Bilgi", "Karanlık mod yakında aktif olacak!"); }} trackColor={{ false: '#D1D9E0', true: '#1B4965' }} thumbColor="#FFF" />
            </View>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 10 }}>Hesap Güvenliği</Text>
          <View style={{ backgroundColor: '#FFF', borderRadius: 15, padding: 5, marginBottom: 25, elevation: 2 }}>
            <TouchableOpacity style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' }} onPress={() => setEkran('sifre_degistir')}><Text style={{ color: '#1B4965', fontSize: 15, fontWeight: '500' }}>🔑 Şifre Değiştir</Text></TouchableOpacity>
            <TouchableOpacity style={{ padding: 15 }} onPress={() => Alert.alert('Emin misin?', 'Tüm verilerin silinecek!', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Hesabı Sil', style: 'destructive' }])}><Text style={{ color: '#FF4444', fontSize: 15, fontWeight: 'bold' }}>🗑️ Hesabı Sil</Text></TouchableOpacity>
          </View>
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginBottom: 40, fontSize: 12 }}>GAYIT App v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ŞİFRE DEĞİŞTİR
  if (ekran === 'sifre_degistir') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}><TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('ayarlar')}><Text style={s.menuSimge}>←</Text></TouchableOpacity><Text style={s.headerBaslik}>Şifre Değiştir</Text><View style={{ width: 24 }} /></View>
        <ScrollView contentContainerStyle={s.authIc}>
          <TextInput style={s.inp} placeholder="Mevcut Şifre" secureTextEntry />
          <TextInput style={s.inp} placeholder="Yeni Şifre" secureTextEntry />
          <TextInput style={s.inp} placeholder="Yeni Şifre (Tekrar)" secureTextEntry />
          <TouchableOpacity style={[s.girisBtn, { marginTop: 20 }]} onPress={() => { Alert.alert("Başarılı ✅", "Şifreniz güncellendi!"); setEkran('ayarlar'); }}><Text style={s.anaBtnY}>GÜNCELLE</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

 // ANA SAYFA
  if (ekran === 'anasayfa') {
    return (
      <SafeAreaView style={s.con}>
        {menuAcik && <SolMenu />}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setMenuAcik(true)}>
            <Text style={s.menuSimge}>☰</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 70, height: 70 }} resizeMode="contain" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1B4965', letterSpacing: 2, marginLeft: -15, marginTop: 15 }}>AYIT</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setFiltreAcik(!filtreAcik)} style={{ marginRight: 20 }}>
              <Text style={{ fontSize: 20 }}>🔽</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={async () => {
                setEkran('bildirimler');
                try {
                  const bRes = await fetch(`${DB_URL}/bildirimler/${kullanici.uid}.json`);
                  const bData = await bRes.json();
                  if(bData) setBildirimler(Object.values(bData).reverse());
                } catch (e) { console.log("Hata:", e); }
            }}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {filtreAcik && (
          <View style={s.filtreDropdown}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {KATEGORILER.map(k => (
                <TouchableOpacity key={k} onPress={() => { setSeciliKategori(k); setFiltreAcik(false); }} style={[s.filtreItem, seciliKategori === k && s.filtreItemAktif]}>
                  <Text style={{ color: seciliKategori === k ? '#FFF' : '#1B4965', fontWeight: 'bold' }}>{k}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView stickyHeaderIndices={[0]} refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={onYenile} colors={['#1B4965']} />}>
          <View style={s.istatistikPanel}>
            <View style={s.istatistikKutu}><Text style={s.istatistikBaslik}>Kayıtlı Usta</Text><Text style={s.istatistikSayi}>{sistemIst.usta}</Text></View>
            <View style={s.istatistikCizgi} />
            <View style={s.istatistikKutu}><Text style={s.istatistikBaslik}>Toplam Üye</Text><Text style={[s.istatistikSayi, { color: '#588157' }]}>{sistemIst.usta + sistemIst.musteri}</Text></View>
          </View>

          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={s.bas}>{kullanici?.bolge} İlanları</Text>
              <Text style={{ color: '#526E7F', fontWeight: 'bold' }}>{rol === 'usta' && seciliKategori === 'Tümü' ? kullanici?.meslek : seciliKategori}</Text>
            </View>

   {rol === 'musteri' && (
              <TouchableOpacity 
                style={s.girisBtn} 
                onPress={() => { 
                  // Hak kontrolü burada yapılıyor gari
                  const ucretsizHak = (kullanici?.yeniKullaniciHakki || 0) > 0;
                  const satinAlinanHak = (kullanici?.hak || 0) > 0;
                  const abonelikVar = kullanici?.abonelik === true;

                  if (ucretsizHak || satinAlinanHak || abonelikVar) { 
                    setEkran('ilanver'); 
                  } else { 
                    setEkran('odeme'); 
                  } 
                }}
              >
                <Text style={s.anaBtnY}>➕ YENİ İLAN YAYINLA</Text>
              </TouchableOpacity>
            )}
            {anasayfaIlanlari.length === 0 ? (
              <Text style={{ textAlign: 'center', marginTop: 30, color: '#A3B1B9' }}>Bölgene uygun açık iş yok.</Text>
            ) : (
              <FlatList data={anasayfaIlanlari} keyExtractor={item => item.id} scrollEnabled={false} style={{ marginTop: 15 }} renderItem={({ item }) => (
                <View style={[s.kart, item.anlasmaVar && { opacity: 0.6 }, item.acil && { borderWidth: 2, borderColor: '#FF4444' }]}>
                  {item.acil && <View style={s.acilRozet}><Text style={s.acilRozetYazi}>🚨 ACİL</Text></View>}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.kategoriBadge}>{item.kategori}</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 12 }}>{item.sure}</Text>
                  </View>
                  <Text style={s.kartBaslik}>{item.baslik}</Text>
                  <Text style={s.kartAlt}>📍 {item.mahalle} - {item.bolge}</Text>
                  {item.isTarihi && <Text style={[s.kartAlt, { color: '#1B4965', fontWeight: '600' }]}>📅 {item.isTarihi}</Text>}
                  {item.anlasmaVar ? (
                    <Text style={{ color: '#588157', fontWeight: 'bold', marginTop: 8 }}>✅ ANLAŞMA SAĞLANDI</Text>
                  ) : (
                    <View style={s.kartIstatistikler}>
                      <Text style={s.kartIstatistikMetin}>💬 {item.teklifler?.length || 0} Teklif</Text>
                    </View>
                  )}
                  {rol === 'usta' && !item.anlasmaVar && (
                    <TouchableOpacity style={s.ustaTeklifBtn} onPress={() => ustaTeklifTiklandi(item)}>
                      <Text style={s.ustaTeklifBtnYazi}>HEMEN TEKLİF VER</Text>
                    </TouchableOpacity>
                  )}
                  {rol === 'musteri' && item.sahip === kullanici?.email && item.teklifler?.length > 0 && !item.anlasmaVar && (
                    <TouchableOpacity style={[s.ustaTeklifBtn, { backgroundColor: '#1B4965' }]} onPress={() => { setSecilenIlan(item); setEkran('teklifler'); }}>
                      <Text style={s.ustaTeklifBtnYazi}>📨 {item.teklifler.length} TEKLİF GELDİ - İNCELE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (ekran === 'bildirimler') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setEkran('anasayfa')}>
            <Text style={s.headerGeriBtn}>← Geri</Text>
          </TouchableOpacity>
          <Text style={s.headerBaslik}>Bildirimler</Text>
          <View style={{ width: 40 }} />
        </View>
        <FlatList
          data={bildirimler}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{item.baslik}</Text>
              <Text style={{ color: '#526E7F', marginTop: 5 }}>{item.mesaj}</Text>
              <Text style={{ fontSize: 10, color: '#A3B1B9', marginTop: 10 }}>{new Date(item.tarih).toLocaleString('tr-TR')}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#A3B1B9' }}>Henüz bildirim yok!</Text>}
        />
      </SafeAreaView>
    );
  }

}
const s = StyleSheet.create({
  con: { flex: 1, backgroundColor: '#F2F4F7' },
  ic: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 40 },
  btnAlan: { width: '100%', padding: 20, gap: 15 },
  anaBtn: { padding: 20, borderRadius: 20, backgroundColor: '#588157', alignItems: 'center', elevation: 5 },
  anaBtnY: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  authIc: { padding: 30, gap: 15, flexGrow: 1, justifyContent: 'center' },
  bas: { fontSize: 22, fontWeight: 'bold', color: '#1B4965' },
  alt: { textAlign: 'center', color: '#526E7F', marginBottom: 10 },
  tabBar: { flexDirection: 'row', backgroundColor: '#E1E6EB', borderRadius: 12, padding: 4, marginBottom: 10 },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10 },
  tabAktif: { backgroundColor: '#1B4965' },
  tabY: { color: '#526E7F', fontWeight: 'bold' },
  tabYA: { color: '#FFF' },
  inputBaslik: { color: '#526E7F', fontWeight: 'bold', marginBottom: 5, marginLeft: 5, fontSize: 13 },
  inp: { backgroundColor: '#FFF', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#D1D9E0', color: '#1B4965', marginBottom: 10 },
  chipAlan: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  chip: { backgroundColor: '#E1E6EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipAktif: { backgroundColor: '#1B4965' },
  chipY: { color: '#526E7F', fontSize: 13, fontWeight: 'bold' },
  chipYAktif: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  girisBtn: { backgroundColor: '#1B4965', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  onayKutu: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#D1D9E0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: '#FFF', zIndex: 10 },
  headerGeriBtn: { padding: 10, marginLeft: -10, justifyContent: 'center' },
  menuSimge: { fontSize: 28, color: '#1B4965' },
  headerBaslik: { fontSize: 20, fontWeight: '900', color: '#1B4965', letterSpacing: 2 },
  filtreDropdown: { backgroundColor: '#FFF', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', zIndex: 5 },
  filtreItem: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#F2F4F7', borderRadius: 20, marginRight: 10 },
  filtreItemAktif: { backgroundColor: '#588157' },
  drawerContainer: { position: 'absolute', zIndex: 999, top: 0, left: 0, bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerIc: { width: width * 0.75, height: '100%', backgroundColor: '#1B4965', padding: 20, paddingTop: 60 },
  drawerKapat: { position: 'absolute', right: 20, top: 40 },
  profilTiklanabilir: { alignItems: 'center', marginBottom: 20 },
  profilAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#588157', justifyContent: 'center', alignItems: 'center' },
  avatarHarf: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  profilAd: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginTop: 8 },
  profilDuzenleText: { color: '#A3B1B9', fontSize: 10 },
  ayrac: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 },
  menuText: { color: '#FFF', fontSize: 16, marginVertical: 12 },
  menuItem: { paddingVertical: 2 },
  menuBaslik: { color: '#FFF', opacity: 0.6, fontSize: 12, marginBottom: 10, marginTop: 10 },
  ilceItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  ilceAd: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  ilceAltBilgi: { color: '#588157', fontSize: 10 },
  ilceDetayAlan: { paddingLeft: 10, paddingBottom: 10 },
  detaySatir: { color: '#A3B1B9', fontSize: 11, marginBottom: 4 },
  cikisY: { color: '#FF4444', fontWeight: 'bold', marginTop: 20 },
  istatistikPanel: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, elevation: 5 },
  istatistikKutu: { flex: 1, alignItems: 'center' },
  istatistikBaslik: { fontSize: 12, color: '#A3B1B9', fontWeight: 'bold' },
  istatistikSayi: { fontSize: 20, fontWeight: '900', color: '#1B4965' },
  istatistikCizgi: { width: 1, backgroundColor: '#EEE' },
  kart: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 3 },
  kategoriBadge: { backgroundColor: '#E1F2FE', color: '#1B4965', padding: 5, borderRadius: 8, alignSelf: 'flex-start', fontSize: 10, fontWeight: 'bold' },
  kartBaslik: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  kartAlt: { color: '#526E7F', fontSize: 13, marginTop: 5 },
  kartIstatistikler: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F2F4F7' },
  kartIstatistikMetin: { color: '#A3B1B9', fontSize: 12, fontWeight: 'bold' },
  ustaTeklifBtn: { backgroundColor: '#588157', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  ustaTeklifBtnYazi: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  acilRozet: { backgroundColor: '#FF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  acilRozetYazi: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  scroll: { padding: 20 },
 splashLogoContainer: { 
    width: 200, 
    height: 200, 
    position: 'relative', // İçindekileri hizada tutması için şart usta
    justifyContent: 'center', 
    alignItems: 'center',
    alignSelf: 'center' // Ekranın da tam ortasına mühürler
  },
  splashDonenCember: { 
    position: 'absolute', 
    top: 15, 
    left: 15, 
    width: 170, 
    height: 170, 
    borderRadius: 85, 
    borderWidth: 4, 
    borderColor: '#8B7355', 
    borderTopColor: 'transparent', 
    zIndex: 1 
  },
  splashLogoMerkez: { 
    position: 'absolute', 
    top: 30, 
    left: 25, 
    width: 130, 
    height: 130, 
    zIndex: 2 
  },
  splashBaslik: { fontSize: 42, fontWeight: '900', color: '#1B4965', letterSpacing: 6, marginTop: 20 },
  splashAlt: { fontSize: 14, color: '#8B7355', fontStyle: 'italic', marginTop: 8 },
  kuponBolumu: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 15 },
  kuponInp: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D1D9E0' },
  kuponBtn: { backgroundColor: '#1B4965', padding: 12, borderRadius: 10, justifyContent: 'center' },
  vazgec: { textAlign: 'center', marginTop: 15, color: '#FF4444' },
  profilResimSec: { alignSelf: 'center', backgroundColor: '#E1E6EB', width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#A3B1B9', borderStyle: 'dashed' },
  numaraKutu: { backgroundColor: '#588157', padding: 15, borderRadius: 15, marginTop: 10, alignItems: 'center' },
  numaraText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  anlasBtnSohbet: { backgroundColor: '#1B4965', padding: 20, alignItems: 'center' },
  anlasBtnY: { color: '#FFF', fontWeight: 'bold' },
  fabButon: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1B4965', justifyContent: 'center', alignItems: 'center', elevation: 8 },
});
