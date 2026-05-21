import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, FlatList, Alert, Dimensions,
  Image, RefreshControl, Switch, Animated, Modal, Linking, Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

const { width } = Dimensions.get('window');

// ── Firebase Bilgileri ──────────────────────────────────────
const API_KEY = "AIzaSyCcvq9VkMugDZTq3fOPypJIy0ATiGmPxrk";
const DB_URL  = "https://usta-mugla-default-rtdb.europe-west1.firebasedatabase.app";

// ── Sabit Listeler ──────────────────────────────────────────
const BOLGELER = [
  'Menteşe (Merkez)','Bodrum','Dalaman','Datça','Fethiye',
  'Kavaklıdere','Köyceğiz','Marmaris','Milas','Ortaca',
  'Seydikemer','Ula','Yatağan'
];
const KATEGORILER = [
  'Tümü','Tesisat (Sucu)','Klimacı','Boyacı','Elektrik',
  'Temizlik','Nakliyat','Diğer'
];
const YENI_ILAN_KATEGORILER = [
  'Tesisat (Sucu)','Klimacı','Boyacı','Elektrik',
  'Temizlik','Nakliyat','Diğer'
];

// ── Yardımcı Fonksiyonlar ───────────────────────────────────
const referansKoduOlustur = () => {
  const k = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kod = '';
  for (let i = 0; i < 7; i++) kod += k[Math.floor(Math.random() * k.length)];
  return kod;
};

async function pushTokenAl() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return '';
    const t = await Notifications.getExpoPushTokenAsync();
    return t.data;
  } catch (e) { return ''; }
}

async function haberUcur(hedefUid, baslik, mesaj) {
  try {
    const r = await fetch(`${DB_URL}/kullanicilar/${hedefUid}.json`);
    const d = await r.json();
    if (d?.pushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: d.pushToken, title: baslik, body: mesaj, data: { data: 'bildirim' } }),
      });
    }
  } catch (e) {}
}

async function bildirimKaydet(hedefUid, baslik, mesaj) {
  try {
    await fetch(`${DB_URL}/bildirimler/${hedefUid}.json`, {
      method: 'POST',
      body: JSON.stringify({ baslik, mesaj, tarih: Date.now(), okundu: false }),
    });
  } catch (e) {}
}

// ── Ana Bileşen ─────────────────────────────────────────────
export default function App() {

  // Splash
  const [splash, setSplash]               = useState(true);
  const donmeAnimasyon                     = useRef(new Animated.Value(0)).current;
  const splashOpacity                      = useRef(new Animated.Value(0)).current;

  // Navigasyon
  const [ekran, setEkran]                 = useState('karsilama');

  // Kullanıcı & Auth
  const [kullanici, setKullanici]         = useState(null);
  const [rol, setRol]                     = useState('');
  const [mod, setMod]                     = useState('kayit');
  const [token, setToken]                 = useState(null);
  const [refreshToken, setRefreshToken]   = useState(null); // ← YENİ

  // Formlar
  const [ad, setAd]                       = useState('');
  const [email, setEmail]                 = useState('');
  const [sifre, setSifre]                 = useState('');
  const [profilTel, setProfilTel]         = useState('');
  const [kayitBolge, setKayitBolge]       = useState('');
  const [kayitBrans, setKayitBrans]       = useState('');
  const [davetKodu, setDavetKodu]         = useState('');
  const [sifremiUnuttumEmail, setSifremiUnuttumEmail] = useState('');

  // İlan
  const [ilanlar, setIlanlar]             = useState([]);
  const [secilenIlan, setSecilenIlan]     = useState(null);
  const [ilanKategori, setIlanKategori]   = useState('Tesisat (Sucu)');
  const [ilanBaslik, setIlanBaslik]       = useState('');
  const [ilanDetay, setIlanDetay]         = useState('');
  const [ilanIlce, setIlanIlce]           = useState('');
  const [ilanMahalle, setIlanMahalle]     = useState('');
  const [ilanAcil, setIlanAcil]           = useState(false);
  const [isTarihiTip, setIsTarihiTip]     = useState('Bugün');
  const [ozelTarih, setOzelTarih]         = useState('');
  const [takvimAcik, setTakvimAcik]       = useState(false);
  const [takvimDegeri, setTakvimDegeri]   = useState(new Date());

  // Teklif / Sohbet
  const [teklifFiyat, setTeklifFiyat]     = useState('');
  const [teklifNot, setTeklifNot]         = useState('');
  const [aktifSohbetTeklif, setAktifSohbetTeklif] = useState(null);
  const [anlasmaSaglandi, setAnlasmaSaglandi]     = useState(false);

  // UI
  const [yenileniyor, setYenileniyor]     = useState(false);
  const [menuAcik, setMenuAcik]           = useState(false);
  const [seciliKategori, setSeciliKategori] = useState('Tümü');
  const [ilcelerAcik, setIlcelerAcik]     = useState(false);
  const [acikIlce, setAcikIlce]           = useState(null);
  const [filtreAcik, setFiltreAcik]       = useState(false);
  const [ilceDuzenleAcik, setIlceDuzenleAcik] = useState(false);
  const [karanlikMod, setKaranlikMod]     = useState(false);
  const [bildirimAcik, setBildirimAcik]   = useState(true);

  // Sözleşme
  const [kvkkKabul, setKvkkKabul]         = useState(false);
  const [sozlesmeKabul, setSozlesmeKabul] = useState(false);

  // Modal / Şikayet / Puanlama
  const [puanModalAcik, setPuanModalAcik]       = useState(false);
  const [puanSecilen, setPuanSecilen]           = useState(0);
  const [puanYorum, setPuanYorum]               = useState('');
  const [puanlananIlan, setPuanlananIlan]       = useState(null);
  const [sikayetModalAcik, setSikayetModalAcik] = useState(false);
  const [sikayetMesaj, setSikayetMesaj]         = useState('');
  const [sikayetHedef, setSikayetHedef]         = useState('');

  // Ödeme
  const [odemeAdim, setOdemeAdim]         = useState('secim');
  const [kuponKod, setKuponKod]           = useState('');

  // İletişim
  const [iletisimKonu, setIletisimKonu]   = useState('');
  const [iletisimMesaj, setIletisimMesaj] = useState('');

  // Sistem
  const [sistemIst, setSistemIst]         = useState({ usta: 0, musteri: 0, bolgeUsta: {} });
  const [bildirimler, setBildirimler]     = useState([]);

  // ── Stil ──────────────────────────────────────────────────
  const s = stilOlustur(karanlikMod);
  const donmeDegeri = donmeAnimasyon.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ══════════════════════════════════════════════════════════
  // TOKEN YENİLEME FONKSİYONU
  // ══════════════════════════════════════════════════════════
  const tokenYenile = async (mevcutRefreshToken) => {
    try {
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${mevcutRefreshToken}`,
        }
      );
      const data = await res.json();
      if (data.id_token) {
        setToken(data.id_token);
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token);
          await AsyncStorage.setItem('refreshToken', data.refresh_token);
        }
        return data.id_token;
      }
    } catch (e) {
      console.log('Token yenileme hatası:', e);
    }
    return null;
  };

  // ── useEffect 1: Splash animasyonu ─────────────────────────
  useEffect(() => {
    Animated.timing(splashOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(donmeAnimasyon, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
  }, []);

  // ── useEffect 2: Otomatik giriş (AsyncStorage'dan refreshToken) ─
  useEffect(() => {
    const otomatikGiris = async () => {
      try {
        const kayitliRT = await AsyncStorage.getItem('refreshToken');
        if (!kayitliRT) {
          // RefreshToken yoksa splash'i kapat
          setTimeout(() => {
            Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
              .start(() => setSplash(false));
          }, 2000);
          return;
        }

        // Token yenile
        const yeniToken = await tokenYenile(kayitliRT);
        if (!yeniToken) {
          setTimeout(() => {
            Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
              .start(() => setSplash(false));
          }, 2000);
          return;
        }

        // Kullanıcı bilgilerini çek
        const lookupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: yeniToken }),
          }
        );
        const lookupData = await lookupRes.json();
        const localId = lookupData.users?.[0]?.localId;

        if (localId) {
          const kulRes  = await fetch(`${DB_URL}/kullanicilar/${localId}.json?auth=${yeniToken}`);
          const kulData = await kulRes.json();
          if (kulData) {
            setKullanici({
              ...kulData,
              uid: localId,
              hak: kulData.hak || 0,
              abonelik: kulData.abonelik || false,
              yeniKullaniciHakki: kulData.yeniKullaniciHakki ?? 0,
              abonelikBitis: kulData.abonelikBitis || null,
              kayitTarihi: kulData.kayitTarihi || Date.now(),
              referansKodu: kulData.referansKodu || referansKoduOlustur(),
              bolge: kulData.bolge || 'Belirtilmemiş',
            });
            setEkran('anasayfa');
          }
        }
      } catch (e) {
        console.log('Otomatik giriş hatası:', e);
      } finally {
        setTimeout(() => {
          Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
            .start(() => setSplash(false));
        }, 1500);
      }
    };
    otomatikGiris();
  }, []);

  // ── useEffect 3: Kullanıcı gelince veri yükle ──────────────
  useEffect(() => {
    if (kullanici && token) {
      veriYukle();
      zamanBekcisi();
    }
  }, [kullanici?.uid, token]);

  // ── useEffect 4: Her 50 dakikada token yenile ──────────────
  useEffect(() => {
    if (!refreshToken) return;
    const interval = setInterval(() => {
      tokenYenile(refreshToken);
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  // ── useEffect 5: Ekranı kaydet ─────────────────────────────
  useEffect(() => {
    if (ekran && ekran !== 'karsilama') {
      AsyncStorage.setItem('sonEkran', ekran).catch(() => {});
    }
  }, [ekran]);

  // ══════════════════════════════════════════════════════════
  // ZAMAN BEKÇİSİ
  // ══════════════════════════════════════════════════════════
  const zamanBekcisi = async () => {
    if (!kullanici?.uid || !token) return;
    const suAn = Date.now();
    const OTUZ_GUN = 2592000000;
    let guncellemeVar = false;
    let yeniVeriler = {};

    if (kullanici.abonelik && kullanici.abonelikBitis && suAn > kullanici.abonelikBitis) {
      yeniVeriler.abonelik = false;
      yeniVeriler.abonelikBitis = null;
      guncellemeVar = true;
    }
    if (kullanici.yeniKullaniciHakki > 0 && kullanici.kayitTarihi && (suAn - kullanici.kayitTarihi > OTUZ_GUN)) {
      yeniVeriler.yeniKullaniciHakki = 0;
      guncellemeVar = true;
    }
    if (guncellemeVar) {
      try {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(yeniVeriler),
        });
        setKullanici(prev => ({ ...prev, ...yeniVeriler }));
      } catch (e) {}
    }
  };

  // ══════════════════════════════════════════════════════════
  // VERİ YÜKLEME
  // ══════════════════════════════════════════════════════════
  const veriYukle = async () => {
    try {
      const [ilanRes, kulRes] = await Promise.all([
        fetch(`${DB_URL}/ilanlar.json`),
        fetch(`${DB_URL}/kullanicilar.json`),
      ]);
      const ilanData = await ilanRes.json();
      if (ilanData) {
        const liste = Object.keys(ilanData).map(key => {
          const ilan = ilanData[key];
          const tekliflerDizisi = ilan.teklifler
            ? Object.keys(ilan.teklifler).map(tKey => ({ id: tKey, ...ilan.teklifler[tKey] }))
            : [];
          return { id: key, ...ilan, teklifler: tekliflerDizisi };
        });
        setIlanlar(liste.sort((a, b) => {
          if (a.acil && !b.acil) return -1;
          if (!a.acil && b.acil) return 1;
          return b.tarih - a.tarih;
        }));
      } else {
        setIlanlar([]);
      }

      const kulData = await kulRes.json();
      if (kulData) {
        if (kullanici?.uid && kulData[kullanici.uid]) {
          setKullanici(prev => ({ ...prev, ...kulData[kullanici.uid] }));
        }
        let ustaSayisi = 0, musteriSayisi = 0, bolgeDagilimi = {};
        Object.keys(kulData).forEach(uid => {
          const k = kulData[uid];
          if (k.rol === 'usta') {
            ustaSayisi++;
            const b = k.bolge || 'Belirtilmemiş';
            const m = k.meslek || 'Diğer';
            if (!bolgeDagilimi[b]) bolgeDagilimi[b] = { toplam: 0, detay: {} };
            bolgeDagilimi[b].toplam += 1;
            bolgeDagilimi[b].detay[m] = (bolgeDagilimi[b].detay[m] || 0) + 1;
          } else if (k.rol === 'musteri') {
            musteriSayisi++;
          }
        });
        setSistemIst({ usta: ustaSayisi, musteri: musteriSayisi, bolgeUsta: bolgeDagilimi });
      }
    } catch (e) {
      console.log('Veri yükleme hatası:', e);
    }
  };

  const onYenile = async () => {
    setYenileniyor(true);
    await veriYukle();
    setYenileniyor(false);
  };

  // ══════════════════════════════════════════════════════════
  // GİRİŞ / KAYIT
  // ══════════════════════════════════════════════════════════
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

        // ── Token kaydet ──
        setToken(data.idToken);
        setRefreshToken(data.refreshToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);

        const cihazToken = await pushTokenAl();
        const refKod = referansKoduOlustur();
        const yeniKul = {
          uid: data.localId, ad, email, rol,
          bolge: kayitBolge, telefon: '',
          meslek: rol === 'usta' ? kayitBrans : null,
          hak: 0, abonelik: false,
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

        // Davet kodu
        if (davetKodu.trim()) {
          try {
            const tumKulRes = await fetch(`${DB_URL}/kullanicilar.json`);
            const tumKul = await tumKulRes.json();
            if (tumKul) {
              const entry = Object.entries(tumKul).find(([, k]) => k.referansKodu === davetKodu.toUpperCase().trim());
              if (entry) {
                const [davetEdenUid, davetEdenKul] = entry;
                const yeniHakDE = (davetEdenKul.hak || 0) + 1;
                const yeniHakYK = (yeniKul.hak || 0) + 1;
                await fetch(`${DB_URL}/kullanicilar/${davetEdenUid}.json?auth=${data.idToken}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hak: yeniHakDE }),
                });
                await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hak: yeniHakYK }),
                });
                yeniKul.hak = yeniHakYK;
                Alert.alert('Davet Bonusu! 🎁', 'Davet kodunu kullandın, ikimize de birer hak eklendi usta!');
              }
            }
          } catch (e) {}
        }

        setKullanici({ ...yeniKul, uid: data.localId });

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

        // ── Token kaydet ──
        setToken(data.idToken);
        setRefreshToken(data.refreshToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);

        try {
          const ct = await pushTokenAl();
          if (ct) {
            await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pushToken: ct }),
            });
          }
        } catch (e) {}

        const kulRes  = await fetch(`${DB_URL}/kullanicilar/${data.localId}.json?auth=${data.idToken}`);
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

  // ── Şifremi Unuttum ─────────────────────────────────────────
  const sifremiUnuttum = async () => {
    if (!sifremiUnuttumEmail) return Alert.alert('Eksik Bilgi', 'E-posta adresini giriver!');
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

  // ── İletişim ────────────────────────────────────────────────
  const iletisimGonder = async () => {
    if (!iletisimKonu || !iletisimMesaj) return Alert.alert('Eksik Bilgi', 'Konu ve mesaj alanlarını boş bırakma!');
    try {
      await fetch(`${DB_URL}/iletisim.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ konu: iletisimKonu, mesaj: iletisimMesaj, gonderen: kullanici?.email || 'Anonim', tarih: Date.now() }),
      });
      Alert.alert('Teşekkürler! 💙', 'Mesajın yönetime iletildi usta!');
      setIletisimKonu(''); setIletisimMesaj(''); setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi!');
    }
  };

  // ── Kupon ───────────────────────────────────────────────────
  const kuponUygula = async () => {
    if (kuponKod.toUpperCase() === 'BAYRAM2026') {
      const bitis = 1748908800000;
      setKullanici({ ...kullanici, abonelik: true, abonelikBitis: bitis });
      if (token) {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ abonelik: true, abonelikBitis: bitis }),
        });
      }
      Alert.alert('Bayram Hediyesi! 🎉', '1 Haziran\'a kadar sınırsız kullanım tanımlandı usta!');
      setEkran('anasayfa');
    } else {
      Alert.alert('Hata', 'Geçersiz kod girdin veya kampanya bitmiş gari.');
    }
  };

  // ── Teklif ──────────────────────────────────────────────────
  const ustaTeklifTiklandi = (ilan) => {
    const yH = kullanici?.yeniKullaniciHakki ?? 0;
    const gH = kullanici?.hak ?? 0;
    if (kullanici?.abonelik || yH > 0 || gH > 0) {
      setSecilenIlan(ilan); setEkran('teklifver');
    } else {
      setOdemeAdim('secim'); setEkran('odeme');
    }
  };

  const teklifGonder = async (ilanId) => {
    if (!teklifFiyat) { Alert.alert('Hata', 'Usta, bir fiyat girmelisin gari!'); return; }
    if (!kullanici?.abonelik) {
      let gYH = kullanici?.yeniKullaniciHakki ?? 0;
      let gH  = kullanici?.hak ?? 0;
      if (gYH > 0) gYH -= 1;
      else if (gH > 0) gH -= 1;
      else return Alert.alert('Hata', 'Teklif hakkın kalmamış usta!');
      setKullanici({ ...kullanici, yeniKullaniciHakki: gYH, hak: gH });
      if (token) {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH }),
        });
      }
    }
    const yeniTeklif = {
      ustaId: kullanici.email,
      ustaAd: kullanici.ad,
      fiyat: teklifFiyat + ' TL',
      not: teklifNot,
      telefon: kullanici.telefon || 'Numara Yok',
      tarih: Date.now(),
    };
    try {
      await fetch(`${DB_URL}/ilanlar/${ilanId}/teklifler.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniTeklif),
      });
      await veriYukle();
      setTeklifFiyat(''); setTeklifNot('');
      bildirimKaydet(secilenIlan?.sahipUid, '💰 Yeni Teklif!', `${kullanici.ad} usta ilanına teklif verdi!`);
      haberUcur(secilenIlan?.sahipUid, '💰 Yeni Teklif!', `${kullanici.ad} usta ilanına teklif verdi!`);
      Alert.alert('Başarılı! ✅', 'Teklifin müşteriye uçuruldu usta!');
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Teklif gönderilemedi gari!');
    }
  };

  // ── Anlaşma ─────────────────────────────────────────────────
  const anlasmaYap = async (ilanId, teklif) => {
    Alert.alert('Anlaşmayı Onayla', `${teklif.ustaAd} usta ile ${teklif.fiyat} üzerinden el sıkışıyor musun?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Anlaş!',
        onPress: async () => {
          try {
            await fetch(`${DB_URL}/ilanlar/${ilanId}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ anlasmaVar: true, anlasilanUsta: teklif }),
            });
            await veriYukle();
            setAktifSohbetTeklif(teklif);
            setAnlasmaSaglandi(true);
            setSecilenIlan(ilanlar.find(i => i.id === ilanId));
            setEkran('sohbet');
            bildirimKaydet(teklif.ustaUid || teklif.uid, '🤝 Anlaşma Sağlandı!', 'Müşteri teklifini kabul etti!');
            haberUcur(teklif.ustaUid || teklif.uid, '🤝 Anlaşma Sağlandı!', 'Müşteri teklifini kabul etti!');
          } catch (e) {
            Alert.alert('Hata', 'Anlaşma kaydedilemedi!');
          }
        },
      },
    ]);
  };

  // ── Puanlama ────────────────────────────────────────────────
  const puanGonder = async () => {
    if (puanSecilen === 0) { Alert.alert('Hata', 'Usta, lütfen bir puan seç gari!'); return; }
    try {
      const puanVerisi = { puan: puanSecilen, yorum: puanYorum, musteriAd: kullanici?.ad || 'Müşteri', tarih: Date.now() };
      if (puanlananIlan?.anlasilanUsta?.ustaId) {
        await fetch(`${DB_URL}/puanlar/${puanlananIlan.anlasilanUsta.ustaId}.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(puanVerisi),
        });
      }
      await fetch(`${DB_URL}/ilanlar/${puanlananIlan.id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puanlandi: true }),
      });
      setPuanModalAcik(false); setPuanSecilen(0); setPuanYorum('');
      Alert.alert('Teşekkürler! ⭐', 'Değerlendirmen kaydedildi usta!');
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Puan gönderilemedi!');
    }
  };

  // ── Şikayet ─────────────────────────────────────────────────
  const sikayetGonder = async () => {
    if (!sikayetMesaj.trim()) { Alert.alert('Hata', 'Şikayet mesajını boş bırakma gari!'); return; }
    try {
      await fetch(`${DB_URL}/sikayetler.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hedef: sikayetHedef, mesaj: sikayetMesaj, sikayetEden: kullanici?.email, tarih: Date.now() }),
      });
      setSikayetModalAcik(false); setSikayetMesaj('');
      Alert.alert('Şikayet Alındı ✅', 'Durum incelenip gereken yapılacak usta.');
    } catch (e) {
      Alert.alert('Hata', 'Şikayet gönderilemedi!');
    }
  };

  // ── Anasayfa filtresi ────────────────────────────────────────
  const anasayfaIlanlari = ilanlar.filter(ilan => {
    const bolgeUygun = ilan.bolge === kullanici?.bolge;
    const kategoriUygun = rol === 'usta'
      ? (seciliKategori === 'Tümü' ? ilan.kategori === kullanici?.meslek : ilan.kategori === seciliKategori)
      : (seciliKategori === 'Tümü' || ilan.kategori === seciliKategori);
    return bolgeUygun && kategoriUygun;
  });

  // ══════════════════════════════════════════════════════════
  // MODALLER
  // ══════════════════════════════════════════════════════════
  const PuanModali = () => (
    <Modal visible={puanModalAcik} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 30 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1B4965', textAlign: 'center', marginBottom: 5 }}>Ustayı Değerlendir</Text>
          <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 20 }}>{puanlananIlan?.anlasilanUsta?.ustaAd}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
            {[1,2,3,4,5].map(y => (
              <TouchableOpacity key={y} onPress={() => setPuanSecilen(y)} style={{ marginHorizontal: 8 }}>
                <Text style={{ fontSize: 40, opacity: puanSecilen >= y ? 1 : 0.3 }}>⭐</Text>
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

  // ══════════════════════════════════════════════════════════
  // SOL MENÜ
  // ══════════════════════════════════════════════════════════
  const SolMenu = () => (
    <View style={s.drawerContainer}>
      <View style={s.drawerIc}>
        <TouchableOpacity style={s.drawerKapat} onPress={() => setMenuAcik(false)}>
          <Text style={{ color: '#FFF', fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.profilTiklanabilir} onPress={() => { setMenuAcik(false); setProfilTel(kullanici?.telefon || ''); setEkran('profil'); }}>
            <View style={s.profilAvatar}><Text style={s.avatarHarf}>{kullanici?.ad?.[0] || '?'}</Text></View>
            <Text style={s.profilAd}>{kullanici?.ad || 'Usta'}</Text>
            <Text style={s.profilDuzenleText}>
              {kullanici?.abonelik ? '👑 VIP ABONE' : `Hak: ${kullanici?.hak ?? 0} | Yeni: ${kullanici?.yeniKullaniciHakki ?? 0}`}
            </Text>
          </TouchableOpacity>

          <View style={s.ayrac} />

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}><Text style={s.menuText}>🏠 Anasayfa</Text></TouchableOpacity>
          {rol === 'usta'
            ? <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}><Text style={s.menuText}>🛠️ İşlere Teklif Ver</Text></TouchableOpacity>
            : <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanver'); }}><Text style={s.menuText}>➕ İlan Ver</Text></TouchableOpacity>
          }
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanlarim'); }}>
            <Text style={s.menuText}>📋 {rol === 'usta' ? 'Tekliflerim' : 'İlanlarım'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setOdemeAdim('secim'); setEkran('odeme'); }}><Text style={s.menuText}>🎫 Paket & Kupon</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('davet'); }}><Text style={s.menuText}>🎁 Davet Et, Kazan</Text></TouchableOpacity>

          <View style={s.ayrac} />

          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}
            onPress={() => setIlcelerAcik(!ilcelerAcik)}
          >
            <Text style={[s.menuBaslik, { marginTop: 0, marginBottom: 0, fontSize: 13, fontWeight: 'bold' }]}>MUĞLA USTA RAPORU</Text>
            <Text style={{ color: '#FFF', opacity: 0.6, fontSize: 12 }}>{ilcelerAcik ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {ilcelerAcik && sistemIst?.bolgeUsta && BOLGELER.map(bolgeAd => {
            const v = sistemIst.bolgeUsta[bolgeAd] || { toplam: 0, detay: {} };
            return (
              <View key={bolgeAd}>
                <TouchableOpacity style={s.ilceItem} onPress={() => setAcikIlce(acikIlce === bolgeAd ? null : bolgeAd)}>
                  <Text style={s.ilceAd}>{bolgeAd}</Text>
                  <Text style={s.ilceAltBilgi}>{v.toplam} Kayıtlı Usta</Text>
                </TouchableOpacity>
                {acikIlce === bolgeAd && Object.keys(v.detay).length > 0 && (
                  <View style={s.ilceDetayAlan}>
                    {Object.entries(v.detay).map(([m, sayi], i) => (
                      <Text key={i} style={s.detaySatir}>- {m}: {sayi} Usta</Text>
                    ))}
                  </View>
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

          <TouchableOpacity
            style={s.menuItem}
            onPress={async () => {
              // ── Çıkışta refreshToken temizle ──
              await AsyncStorage.removeItem('refreshToken').catch(() => {});
              setRefreshToken(null);
              setKullanici(null);
              setToken(null);
              setEkran('karsilama');
              setMenuAcik(false);
            }}
          >
            <Text style={s.cikisY}>ÇIKIŞ YAP</Text>
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 20, marginBottom: 10 }}>
            © 2026 GAYİT Tüm Hakları Saklıdır.
          </Text>
        </ScrollView>
      </View>
    </View>
  );

  // ══════════════════════════════════════════════════════════
  // SPLASH
  // ══════════════════════════════════════════════════════════
  if (splash) {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center', opacity: splashOpacity }}>
        <View style={s.splashLogoContainer}>
          <Animated.View style={[s.splashDonenCember, { transform: [{ rotate: donmeDegeri }] }]} />
          <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={s.splashLogoMerkez} resizeMode="contain" />
        </View>
        <Text style={s.splashBaslik}>GAYİT</Text>
        <Text style={s.splashAlt}>Muğla'nın bütün işi gaydı artık burada</Text>
      </Animated.View>
    );
  }

  // ══════════════════════════════════════════════════════════
  // EKRANLAR
  // ══════════════════════════════════════════════════════════

  // 1. KARŞILAMA
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
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965' }]} onPress={() => { setRol('usta'); setMod('kayit'); setEkran('auth'); }}>
              <Text style={s.anaBtnY}>Usta Girişi / Kayıt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#588157' }]} onPress={() => { setRol('musteri'); setMod('kayit'); setEkran('auth'); }}>
              <Text style={s.anaBtnY}>Müşteri Girişi / Kayıt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. KVKK
  if (ekran === 'kvkk') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('auth')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>KVKK Aydınlatma</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15, textAlign: 'center' }}>GAYİT KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ</Text>
          {[
            ['1. Veri Sorumlusu', '6698 sayılı KVKK uyarınca, GAYİT Platformu olarak kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında işlemekteyiz.'],
            ['2. İşlenen Kişisel Verileriniz', '• Kimlik: Ad, soyad.\n• İletişim: E-posta, telefon.\n• Konum: İlçe ve mahalle bilgisi.\n• Mesleki: (Ustalar için) Branş, teklifler, puanlamalar.'],
            ['3. İşlenme Amacı', 'Müşteri ile Usta arasındaki iletişimin sağlanması, üyelik işlemlerinin yapılması, sistem güvenliğinin sağlanması.'],
            ['4. Veri Aktarımı', 'Telefon numaranız yalnızca "ANLAŞMA SAĞLANDI" butonuna basıldığında karşı tarafa gösterilir. Verileriniz üçüncü şahıslara satılmaz.'],
            ['5. Kullanıcı Hakları', 'Verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini isteme ve "Hesabı Sil" özelliğini kullanarak tamamen silinmesini talep etme haklarına sahipsiniz.'],
          ].map(([baslik, icerik]) => (
            <View key={baslik}>
              <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 5 }}>{baslik}</Text>
              <Text style={{ color: '#526E7F', marginBottom: 15, lineHeight: 22 }}>{icerik}</Text>
            </View>
          ))}
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

  // 3. ŞİFREMİ UNUTTUM
  if (ekran === 'sifremi_unuttum') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('auth')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Şifremi Unuttum</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={s.authIc}>
          <Text style={{ textAlign: 'center', fontSize: 48, marginBottom: 10 }}>🔑</Text>
          <Text style={[s.bas, { textAlign: 'center', marginBottom: 10 }]}>Şifre Sıfırlama</Text>
          <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 20 }}>Kayıtlı e-posta adresinizi girin. Şifre sıfırlama bağlantısı göndereceğiz usta.</Text>
          <TextInput style={s.inp} placeholder="E-posta adresiniz" value={sifremiUnuttumEmail} onChangeText={setSifremiUnuttumEmail} autoCapitalize="none" keyboardType="email-address" />
          <TouchableOpacity style={[s.girisBtn, { marginTop: 10 }]} onPress={sifremiUnuttum}><Text style={s.anaBtnY}>SIFIRLAMA BAĞLANTISI GÖNDER</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEkran('auth')}><Text style={{ textAlign: 'center', marginTop: 15, color: '#1B4965' }}>← Giriş Sayfasına Dön</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 4. AUTH (GİRİŞ / KAYIT)
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
                {BOLGELER.map(b => (
                  <TouchableOpacity key={b} style={[s.chip, kayitBolge === b && s.chipAktif]} onPress={() => setKayitBolge(b)}>
                    <Text style={[s.chipY, kayitBolge === b && s.chipYAktif]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {rol === 'usta' && (
                <>
                  <Text style={s.inputBaslik}>Branşınız</Text>
                  <View style={s.chipAlan}>
                    {KATEGORILER.filter(k => k !== 'Tümü').map(b => (
                      <TouchableOpacity key={b} style={[s.chip, kayitBrans === b && s.chipAktif]} onPress={() => setKayitBrans(b)}>
                        <Text style={[s.chipY, kayitBrans === b && s.chipYAktif]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={s.inputBaslik}>Davet Kodu (İsteğe Bağlı)</Text>
              <TextInput style={s.inp} placeholder="GAYİT-XXXX" value={davetKodu} onChangeText={setDavetKodu} autoCapitalize="characters" />
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

  // 5. İLETİŞİM
  if (ekran === 'iletisim') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
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
          <TextInput style={[s.inp, { height: 120, textAlignVertical: 'top' }]} placeholder="Mesajınızı buraya yazın usta..." value={iletisimMesaj} onChangeText={setIletisimMesaj} multiline />
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={iletisimGonder}><Text style={s.anaBtnY}>MESAJ GÖNDER</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 6. DAVET ET KAZAN
  if (ekran === 'davet') {
    const refKod = kullanici?.referansKodu || referansKoduOlustur();
    const paylasimMetni = `GAYİT uygulamasını kullanıyorum! Muğla'nın en iyi usta platformu. Davet kodumla kayıt ol, ikimiz de hak kazanalım!\n\nDavet Kodum: ${refKod}\n\nİndirmek için: gayit.com.tr`;
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Davet Et, Kazan</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ backgroundColor: '#1B4965', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 25 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>Senin Davet Kodun</Text>
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 15 }}>{refKod}</Text>
            <TouchableOpacity style={{ backgroundColor: '#588157', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }} onPress={() => Alert.alert('Kopyalandı! ✅', `${refKod} kodun kopyalandı usta!`)}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>📋 Kodu Kopyala</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15 }}>Nasıl Çalışır? 🎁</Text>
            {['Arkadaşını GAYİT\'a davet et', 'O, kayıt olurken senin kodunu girsin', 'İkiniz de +1 hak kazanırsınız!'].map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>{['1️⃣','2️⃣','3️⃣'][i]}</Text>
                <Text style={{ color: '#526E7F', flex: 1 }}>{m}</Text>
              </View>
            ))}
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

  // 7. İLAN VER
  if (ekran === 'ilanver') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Yeni İlan Ver</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={s.authIc}>
          <Text style={s.inputBaslik}>İlan Kategorisi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
            {YENI_ILAN_KATEGORILER.map(k => (
              <TouchableOpacity key={k} onPress={() => setIlanKategori(k)} style={[s.chip, ilanKategori === k && s.chipAktif, { marginRight: 8 }]}>
                <Text style={[s.chipY, ilanKategori === k && s.chipYAktif]}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={s.inputBaslik}>İlan Başlığı</Text>
          <TextInput style={s.inp} placeholder="Örn: Banyo Tesisat Yenileme" value={ilanBaslik} onChangeText={setIlanBaslik} />
          <Text style={s.inputBaslik}>Açıklama</Text>
          <TextInput style={[s.inp, { height: 100, textAlignVertical: 'top' }]} placeholder="İşin detaylarını buraya yazın..." value={ilanDetay} onChangeText={setIlanDetay} multiline maxLength={500} />
          <Text style={s.inputBaslik}>İlçe</Text>
          <View style={s.chipAlan}>
            {BOLGELER.map(b => (
              <TouchableOpacity key={b} style={[s.chip, ilanIlce === b && s.chipAktif]} onPress={() => setIlanIlce(b)}>
                <Text style={[s.chipY, ilanIlce === b && s.chipYAktif]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.inputBaslik}>Mahalle</Text>
          <TextInput style={s.inp} placeholder="Örn: Güneş Mahallesi" value={ilanMahalle} onChangeText={setIlanMahalle} />
          <Text style={s.inputBaslik}>İşin Yapılacağı Tarih</Text>
          <View style={s.chipAlan}>
            {['Bugün', 'Yarın'].map(t => (
              <TouchableOpacity key={t} style={[s.chip, isTarihiTip === t && s.chipAktif]} onPress={() => { setIsTarihiTip(t); setOzelTarih(''); }}>
                <Text style={[s.chipY, isTarihiTip === t && s.chipYAktif]}>{t}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.chip, isTarihiTip === 'İleri' && s.chipAktif]} onPress={() => { setIsTarihiTip('İleri'); setTakvimAcik(true); }}>
              <Text style={[s.chipY, isTarihiTip === 'İleri' && s.chipYAktif]}>
                {isTarihiTip === 'İleri' && ozelTarih ? ozelTarih : 'İleri Bir Tarih 📅'}
              </Text>
            </TouchableOpacity>
          </View>
          {takvimAcik && (
            <DateTimePicker value={takvimDegeri} mode="date" minimumDate={new Date()} onChange={(event, date) => {
              setTakvimAcik(false);
              if (date) { setTakvimDegeri(date); setOzelTarih(date.toLocaleDateString('tr-TR')); }
              else setIsTarihiTip('Bugün');
            }} />
          )}
          <View style={[s.onayKutu, { backgroundColor: ilanAcil ? '#FFEBEE' : '#FFF', borderColor: ilanAcil ? '#FF4444' : '#D1D9E0' }]}>
            <Switch value={ilanAcil} onValueChange={setIlanAcil} trackColor={{ false: '#D1D9E0', true: '#FF4444' }} thumbColor="#FFF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: ilanAcil ? '#FF4444' : '#526E7F', fontWeight: 'bold', fontSize: 14 }}>🚨 Bu İlan Acil mi?</Text>
              <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 2 }}>Acil ilanlar üstte gösterilir (+50 TL)</Text>
            </View>
          </View>
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={async () => {
            if (!ilanBaslik || !ilanDetay || !ilanIlce || !ilanMahalle) return Alert.alert('Eksik Bilgi', 'Usta, lütfen tüm alanları doldur gari!');
            if (!isTarihiTip || (isTarihiTip === 'İleri' && !ozelTarih)) return Alert.alert('Eksik Bilgi', 'İşin yapılacağı tarihi seçmedin usta!');
            const aktifAyni = ilanlar.find(i => i.sahip === kullanici.email && i.kategori === ilanKategori && !i.anlasmaVar);
            if (aktifAyni) return Alert.alert('Hata', 'Bu kategoride zaten aktif bir ilanınız var gari!');
            const hakVar = kullanici?.abonelik || kullanici?.yeniKullaniciHakki > 0 || kullanici?.hak > 0;
            if (!hakVar && !ilanAcil) { setEkran('odeme'); return; }
            if (ilanAcil && !kullanici?.abonelik) { Alert.alert('Acil İlan', 'Acil ilan ücreti 50 TL\'dir.'); setEkran('odeme'); return; }
            const kaydedilecekTarih = isTarihiTip === 'İleri' ? ozelTarih : isTarihiTip;
            const yeniIlan = {
              baslik: ilanBaslik, kategori: ilanKategori, bolge: ilanIlce,
              mahalle: ilanMahalle, detay: ilanDetay, isTarihi: kaydedilecekTarih,
              acil: ilanAcil, sahip: kullanici.email, sahipUid: kullanici.uid,
              anlasmaVar: false, teklifler: [], tarih: Date.now(),
            };
            try {
              await fetch(`${DB_URL}/ilanlar.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniIlan) });
              if (!kullanici?.abonelik) {
                let gYH = kullanici?.yeniKullaniciHakki || 0;
                let gH  = kullanici?.hak || 0;
                if (gYH > 0) gYH -= 1; else if (gH > 0) gH -= 1;
                setKullanici({ ...kullanici, yeniKullaniciHakki: gYH, hak: gH });
                if (token) {
                  await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ yeniKullaniciHakki: gYH, hak: gH }),
                  });
                }
              }
              await veriYukle();
              Alert.alert('Başarılı! 🎉', `İlanınız ${ilanAcil ? 'ACİL olarak ' : ''}yayınlandı usta!`);
              setIlanBaslik(''); setIlanDetay(''); setIlanIlce(''); setIlanMahalle('');
              setIsTarihiTip('Bugün'); setOzelTarih(''); setIlanAcil(false);
              setEkran('anasayfa');
            } catch (e) {
              Alert.alert('Hata', 'İlan kaydedilemedi gari!');
            }
          }}>
            <Text style={s.anaBtnY}>İLAN OLUŞTUR VE YAYINLA</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 8. TEKLİF VER
  if (ekran === 'teklifver' && secilenIlan) {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Teklif Ver</Text>
          <View style={{ width: 24 }} />
        </View>
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
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => teklifGonder(secilenIlan.id)}>
            <Text style={s.anaBtnY}>TEKLİFİ GÖNDER</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 9. TEKLİFLER
  if (ekran === 'teklifler' && secilenIlan) {
    const ilan = ilanlar.find(i => i.id === secilenIlan.id);
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Teklifler ({ilan?.teklifler?.length || 0})</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          <View style={[s.kart, { marginBottom: 20 }]}>
            <Text style={s.kartBaslik}>{ilan?.baslik}</Text>
            {ilan?.isTarihi && <Text style={s.kartAlt}>📅 {ilan.isTarihi}</Text>}
            <Text style={s.kartAlt}>{ilan?.anlasmaVar ? '✅ ANLAŞMA SAĞLANDI' : '🟢 Aktif İlan'}</Text>
          </View>
          {ilan?.anlasmaVar && (
            <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 15 }}>
              <Text style={{ color: '#588157', fontWeight: 'bold' }}>✅ Anlaşma sağlandı!</Text>
            </View>
          )}
          {(!ilan?.teklifler || ilan.teklifler.length === 0)
            ? <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz teklif gelmedi gari.</Text>
            : ilan.teklifler.map(teklif => (
              <View key={teklif.id} style={[s.kart, ilan.anlasilanUsta?.id === teklif.id && { borderWidth: 2, borderColor: '#588157' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965' }}>{teklif.ustaAd}</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#588157' }}>{teklif.fiyat}</Text>
                </View>
                {teklif.not ? <Text style={{ color: '#526E7F', marginTop: 5 }}>{teklif.not}</Text> : null}
                <TouchableOpacity onPress={() => { setSikayetHedef(teklif.ustaAd); setSikayetModalAcik(true); }} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#FF4444', fontSize: 12 }}>⚠️ Şikayet Et</Text>
                </TouchableOpacity>
                {ilan.anlasilanUsta?.id === teklif.id
                  ? <View style={[s.girisBtn, { backgroundColor: '#588157', marginTop: 10 }]}><Text style={s.anaBtnY}>✅ ANLAŞILDI - {teklif.telefon}</Text></View>
                  : !ilan.anlasmaVar
                    ? <TouchableOpacity style={[s.girisBtn, { marginTop: 10 }]} onPress={() => anlasmaYap(ilan.id, teklif)}><Text style={s.anaBtnY}>🤝 BU USTAYLA ANLAŞ</Text></TouchableOpacity>
                    : <View style={[s.girisBtn, { backgroundColor: '#ccc', marginTop: 10 }]}><Text style={s.anaBtnY}>Başka Ustayla Anlaşıldı</Text></View>
                }
              </View>
            ))
          }
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

  // 10. İLANLARIM
  if (ekran === 'ilanlarim') {
    const benimIlanlarim = rol === 'usta'
      ? ilanlar.filter(i => i.teklifler && i.teklifler.some(t => t.ustaId === kullanici?.email))
      : ilanlar.filter(i => i.sahip === kullanici?.email);
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>{rol === 'usta' ? 'Tekliflerim' : 'İlanlarım'}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          {benimIlanlarim.length === 0
            ? <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz kayıt yok usta.</Text>
            : benimIlanlarim.map(item => (
              <TouchableOpacity key={item.id} style={[s.kart, item.acil && { borderWidth: 2, borderColor: '#FF4444' }]}
                onPress={() => { setSecilenIlan(item); rol === 'musteri' ? setEkran('teklifler') : ustaTeklifTiklandi(item); }}>
                {item.acil && <View style={s.acilRozet}><Text style={s.acilRozetYazi}>🚨 ACİL</Text></View>}
                <Text style={s.kategoriBadge}>{item.kategori}</Text>
                <Text style={s.kartBaslik}>{item.baslik}</Text>
                <Text style={s.kartAlt}>📍 {item.mahalle} - {item.bolge}</Text>
                {item.isTarihi && <Text style={s.kartAlt}>📅 {item.isTarihi}</Text>}
                <View style={s.kartIstatistikler}>
                  <Text style={s.kartIstatistikMetin}>{item.teklifler?.length || 0} Teklif</Text>
                  {item.anlasmaVar && <Text style={{ color: '#588157', fontWeight: 'bold', marginLeft: 10 }}>✅ ANLAŞMA SAĞLANDI</Text>}
                </View>
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 11. PROFİL
  if (ekran === 'profil') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Profilim</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          <TouchableOpacity style={s.profilResimSec} onPress={() => Alert.alert('Galeri', 'Profil fotoğrafı yükleme özelliği yakında gelecek usta!')}>
            <Text style={{ fontSize: 40 }}>📷</Text>
            <Text style={{ color: '#1B4965', fontWeight: 'bold', marginTop: 5, fontSize: 12 }}>Fotoğraf Yükle</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginTop: -10, marginBottom: 20 }}>
            <View style={{ backgroundColor: kullanici?.abonelik ? '#FFF8E1' : '#E1E6EB', borderColor: kullanici?.abonelik ? '#F39C12' : '#A3B1B9', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: kullanici?.abonelik ? '#F39C12' : '#526E7F', fontWeight: 'bold', fontSize: 12 }}>
                {kullanici?.abonelik ? '👑 VIP (Sınırsız) Abonelik' : '📦 Standart Üyelik'}
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center' }}>
            <Text style={{ color: '#526E7F', fontSize: 12, marginBottom: 5 }}>Senin Davet Kodun</Text>
            <Text style={{ color: '#1B4965', fontSize: 20, fontWeight: '900', letterSpacing: 3 }}>{kullanici?.referansKodu || referansKoduOlustur()}</Text>
          </View>
          {rol === 'usta' && kullanici?.onayDurumu !== 'onayli' && (
            <View style={{ padding: 15, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#00a2ed', borderStyle: 'dashed' }}>
              <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>Onaylı Usta Rozeti Al</Text>
              <Text style={{ fontSize: 11, color: '#526E7F', marginTop: 4 }}>Belgelerini gönder, profilinde mavi tik gösterelim gari.</Text>
              {kullanici?.onayDurumu === 'beklemede'
                ? <View style={{ marginTop: 10, padding: 8, backgroundColor: '#FDF2F2', borderRadius: 8 }}><Text style={{ color: '#E53E3E', fontSize: 12, textAlign: 'center', fontWeight: 'bold' }}>⌛ Belgelerin İncelemede...</Text></View>
                : (
                  <TouchableOpacity style={{ backgroundColor: '#00a2ed', padding: 10, borderRadius: 8, marginTop: 10 }} onPress={async () => {
                    Alert.alert('Evrak Gönderimi', 'Belgelerini info@gayit.com.tr adresine yolla gari.');
                    setKullanici({ ...kullanici, onayDurumu: 'beklemede' });
                    if (token && kullanici?.uid) {
                      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ onayDurumu: 'beklemede' }),
                      });
                    }
                  }}>
                    <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>BELGE GÖNDER VE BAŞVUR</Text>
                  </TouchableOpacity>
                )
              }
            </View>
          )}
          <Text style={s.inputBaslik}>Ad Soyad</Text>
          <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={kullanici?.ad} editable={false} />
          <Text style={s.inputBaslik}>E-Posta</Text>
          <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={kullanici?.email} editable={false} />
          <Text style={s.inputBaslik}>Telefon Numarası</Text>
          <TextInput style={s.inp} placeholder="Örn: 0532 XXX XX XX" value={profilTel} onChangeText={setProfilTel} keyboardType="phone-pad" />
          <View style={{ marginTop: 20, alignItems: 'center', width: '100%' }}>
            <Text style={{ fontSize: 16, color: '#1B4965', fontWeight: 'bold' }}>📍 Kayıtlı Bölge: {kullanici?.bolge || 'Belirtilmemiş'}</Text>
            <TouchableOpacity style={{ marginTop: 10, backgroundColor: '#8B7355', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }} onPress={() => setIlceDuzenleAcik(!ilceDuzenleAcik)}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>İlçemi Değiştir</Text>
            </TouchableOpacity>
            {ilceDuzenleAcik && (
              <View style={[s.chipAlan, { marginTop: 15, justifyContent: 'center' }]}>
                {BOLGELER.map(b => (
                  <TouchableOpacity key={b} style={[s.chip, kullanici?.bolge === b && s.chipAktif]} onPress={async () => {
                    if (token && kullanici?.uid) {
                      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bolge: b, ilce: b }),
                      });
                    }
                    setKullanici({ ...kullanici, bolge: b, ilce: b });
                    setIlceDuzenleAcik(false);
                    Alert.alert('Başarılı', `Bölgen ${b} olarak güncellendi usta!`);
                  }}>
                    <Text style={[s.chipY, kullanici?.bolge === b && s.chipYAktif]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={{ marginBottom: 15, alignSelf: 'flex-start', marginTop: 15 }} onPress={() => { setSikayetHedef('Genel Şikayet'); setSikayetModalAcik(true); }}>
            <Text style={{ color: '#FF4444', fontSize: 13 }}>⚠️ Şikayet Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={async () => {
            const up = { telefon: profilTel };
            setKullanici({ ...kullanici, ...up });
            if (token && kullanici?.uid) {
              await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(up),
              });
            }
            Alert.alert('Başarılı ✅', 'Profil bilgilerin kaydedildi usta!');
          }}>
            <Text style={s.anaBtnY}>BİLGİLERİ KAYDET</Text>
          </TouchableOpacity>
        </ScrollView>
        <SikayetModali />
      </SafeAreaView>
    );
  }

  // 12. ÖDEME
  if (ekran === 'odeme') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Paket & Kupon</Text>
          <View style={{ width: 24 }} />
        </View>
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
              <Text style={s.alt}>Kupon Kodunu Girin</Text>
              <View style={s.kuponBolumu}>
                <TextInput style={s.kuponInp} placeholder="Kupon kodu..." onChangeText={setKuponKod} autoCapitalize="characters" />
                <TouchableOpacity style={s.kuponBtn} onPress={kuponUygula}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>UYGULA</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setOdemeAdim('secim')}><Text style={s.vazgec}>Geri Dön</Text></TouchableOpacity>
            </>
          )}
          {odemeAdim === 'paket' && (
            <>
              <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#588157', marginTop: 15 }]} onPress={async () => {
                const eklenecek = rol === 'usta' ? 3 : 1;
                const yeniHak = (kullanici?.hak || 0) + eklenecek;
                setKullanici({ ...kullanici, hak: yeniHak });
                if (token && kullanici?.uid) {
                  await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hak: yeniHak }),
                  });
                }
                Alert.alert('Başarılı! ✅', rol === 'usta' ? '3 adet teklif verme hakkı tanımlandı usta!' : '1 adet ilan hakkı tanımlandı!');
                setEkran('anasayfa');
              }}>
                <Text style={s.anaBtnY}>{rol === 'usta' ? '3 Teklif Verme Hakkı (50 TL)' : '1 Adet İlan Hakkı (50 TL)'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965', marginTop: 15 }]} onPress={async () => {
                const bitis = Date.now() + 2592000000;
                setKullanici({ ...kullanici, abonelik: true, abonelikBitis: bitis });
                if (token && kullanici?.uid) {
                  await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ abonelik: true, abonelikBitis: bitis }),
                  });
                }
                Alert.alert('Başarılı! 🎉', 'Aylık sınırsız abonelik aktifleştirildi gari!');
                setEkran('anasayfa');
              }}>
                <Text style={s.anaBtnY}>Aylık Sınırsız Abonelik (100 TL)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOdemeAdim('secim')}><Text style={s.vazgec}>Geri Dön</Text></TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 13. HİZMET KOŞULLARI
  if (ekran === 'hizmet_kosullari') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran(kullanici ? 'anasayfa' : 'auth')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Hizmet Koşulları</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15, textAlign: 'center' }}>GAYİT KULLANIM KOŞULLARI</Text>
          <Text style={{ color: '#526E7F', lineHeight: 22, marginBottom: 20 }}>
            GAYİT platformunu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.{'\n\n'}
            <Text style={{ fontWeight: 'bold' }}>1. Platform Kullanımı</Text>{'\n'}
            GAYİT, Muğla ilindeki müşteriler ile ustalar arasında iletişim köprüsü kuran bir platformdur. Platform üzerinden gerçekleştirilen işlemlerden GAYİT sorumlu tutulamaz.{'\n\n'}
            <Text style={{ fontWeight: 'bold' }}>2. Kullanıcı Sorumlulukları</Text>{'\n'}
            Kullanıcılar gerçek ve doğru bilgi vermekle yükümlüdür. Yanıltıcı ilan veya teklif veren kullanıcıların hesabı askıya alınabilir.{'\n\n'}
            <Text style={{ fontWeight: 'bold' }}>3. Ödeme ve İadeler</Text>{'\n'}
            Platform üzerinden satın alınan haklar ve abonelikler iade edilmez. Dijital ürün satışına dair yasal düzenlemeler geçerlidir.{'\n\n'}
            <Text style={{ fontWeight: 'bold' }}>4. Gizlilik</Text>{'\n'}
            Kullanıcı verileri KVKK kapsamında işlenir. Telefon numarası yalnızca anlaşma sağlandığında karşı tarafa gösterilir.
          </Text>
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => { setSozlesmeKabul(true); setEkran(kullanici ? 'anasayfa' : 'auth'); }}>
            <Text style={s.anaBtnY}>✅ OKUDUM VE ONAYLIYORUM</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 14. HAKKIMIZDA
  if (ekran === 'hakkimizda') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Hakkımızda</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 120, height: 120, marginBottom: 20 }} resizeMode="contain" />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1B4965', marginBottom: 10 }}>GAYİT</Text>
          <Text style={{ color: '#8B7355', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' }}>Muğla'nın bütün işi gaydı artık burada</Text>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '100%', elevation: 2 }}>
            <Text style={{ color: '#526E7F', lineHeight: 24, textAlign: 'center' }}>
              GAYİT, Muğla'daki müşteriler ile yerel ustaları buluşturan bir platformdur.{'\n\n'}
              Amacımız; tesisat, elektrik, boya, temizlik gibi ev ve işyeri hizmetlerinde güvenilir ustaya hızlıca ulaşmayı sağlamaktır.{'\n\n'}
              Muğla'nın gaydı artık burada! 🤝
            </Text>
          </View>
          <View style={{ marginTop: 20, backgroundColor: '#1B4965', padding: 20, borderRadius: 16, width: '100%', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>İletişim</Text>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginTop: 5 }}>info@gayit.com.tr</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 15. AYARLAR
  if (ekran === 'ayarlar') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Ayarlar</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          <View style={s.kart}>
            <Text style={{ fontWeight: 'bold', color: '#1B4965', marginBottom: 15 }}>Uygulama Ayarları</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ color: '#526E7F' }}>🌙 Karanlık Mod</Text>
              <Switch value={karanlikMod} onValueChange={setKaranlikMod} trackColor={{ false: '#D1D9E0', true: '#1B4965' }} thumbColor="#FFF" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#526E7F' }}>🔔 Bildirimler</Text>
              <Switch value={bildirimAcik} onValueChange={setBildirimAcik} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
            </View>
          </View>
          <TouchableOpacity style={[s.kart, { borderColor: '#FF4444', borderWidth: 1 }]} onPress={() => Alert.alert('Hesabı Sil', 'Bu işlem geri alınamaz. Emin misiniz?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: async () => {
              if (token && kullanici?.uid) {
                await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { method: 'DELETE' });
              }
              await AsyncStorage.removeItem('refreshToken').catch(() => {});
              setRefreshToken(null);
              setKullanici(null); setToken(null); setEkran('karsilama');
            }},
          ])}>
            <Text style={{ color: '#FF4444', fontWeight: 'bold', textAlign: 'center' }}>🗑️ Hesabımı Sil</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 16. ANASAYFA
  return (
    <SafeAreaView style={s.con}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setMenuAcik(true)}>
          <Text style={s.menuSimge}>☰</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>
          {rol === 'usta' ? '🛠️ İşler' : '🏠 İlanlar'} — {kullanici?.bolge || 'Bölge'}
        </Text>
        <TouchableOpacity onPress={onYenile} style={{ padding: 5 }}>
          <Text style={{ color: '#1B4965', fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Kategori filtresi */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, paddingHorizontal: 10 }}>
        {KATEGORILER.map(k => (
          <TouchableOpacity key={k} onPress={() => setSeciliKategori(k)} style={[s.chip, seciliKategori === k && s.chipAktif, { marginRight: 8, marginVertical: 8 }]}>
            <Text style={[s.chipY, seciliKategori === k && s.chipYAktif]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* İlan listesi */}
      <FlatList
        data={anasayfaIlanlari}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={onYenile} colors={['#1B4965']} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>🔍</Text>
            <Text style={{ color: '#A3B1B9', textAlign: 'center', fontSize: 15 }}>
              {rol === 'usta' ? 'Bölgende şu an iş yok usta.\nYeni ilanlar gelince haber geliyor!' : 'Henüz ilan yok gari.\nYeni bir ilan ver!'}
            </Text>
            {rol === 'musteri' && (
              <TouchableOpacity style={[s.girisBtn, { marginTop: 20, paddingHorizontal: 30 }]} onPress={() => setEkran('ilanver')}>
                <Text style={s.anaBtnY}>+ İlan Ver</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.kart, item.acil && { borderWidth: 2, borderColor: '#FF4444' }]}
            onPress={() => {
              setSecilenIlan(item);
              if (rol === 'usta') ustaTeklifTiklandi(item);
              else setEkran('teklifler');
            }}
          >
            {item.acil && <View style={s.acilRozet}><Text style={s.acilRozetYazi}>🚨 ACİL</Text></View>}
            <Text style={s.kategoriBadge}>{item.kategori}</Text>
            <Text style={s.kartBaslik}>{item.baslik}</Text>
            <Text style={s.kartAlt}>📍 {item.mahalle} - {item.bolge}</Text>
            {item.isTarihi && <Text style={s.kartAlt}>📅 {item.isTarihi}</Text>}
            <View style={s.kartIstatistikler}>
              <Text style={s.kartIstatistikMetin}>{item.teklifler?.length || 0} Teklif</Text>
              {item.anlasmaVar && <Text style={{ color: '#588157', fontWeight: 'bold', marginLeft: 10, fontSize: 12 }}>✅ Anlaşma var</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Müşteri için ilan ver butonu */}
      {rol === 'musteri' && (
        <TouchableOpacity
          style={{ position: 'absolute', bottom: 30, right: 20, backgroundColor: '#588157', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 }}
          onPress={() => setEkran('ilanver')}
        >
          <Text style={{ color: '#FFF', fontSize: 28, lineHeight: 32 }}>+</Text>
        </TouchableOpacity>
      )}

      {menuAcik && <SolMenu />}
      <PuanModali />
      <SikayetModali />
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// STİLLER
// ══════════════════════════════════════════════════════════
function stilOlustur(karanlik) {
  const r = {
    bg: karanlik ? '#121212' : '#F5F5F0',
    bgKart: karanlik ? '#1E1E1E' : '#FFF',
    bgInput: karanlik ? '#2A2A2A' : '#FFF',
    bgChip: karanlik ? '#2A2A2A' : '#FFF',
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
      paddingTop: 40,
    },
    headerBaslik: { fontSize: 18, fontWeight: '700', color: r.yaziBas, flex: 1, textAlign: 'center' },
    headerGeriBtn: { padding: 5 },
    menuBtn: { padding: 5 },
    menuSimge: { fontSize: 22, color: r.anaRenk },
    kart: {
      backgroundColor: r.bgKart, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2,
      shadowColor: '#1B4965', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
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
      backgroundColor: '#FF4444', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    acilRozetYazi: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    anaBtn: {
      backgroundColor: '#588157', borderRadius: 14, paddingVertical: 16,
      paddingHorizontal: 24, alignItems: 'center', width: '100%', marginBottom: 12,
    },
    anaBtnY: { color: '#FFF', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
    girisBtn: { backgroundColor: '#1B4965', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    btnAlan: { width: '100%', gap: 12 },
    vazgec: { textAlign: 'center', color: r.yaziSoluk, marginTop: 20, fontSize: 14 },
    inp: {
      backgroundColor: r.bgInput, borderRadius: 12, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: r.sinir, fontSize: 15, color: r.yaziBas,
    },
    inputBaslik: { color: r.yaziAlt, fontWeight: '600', marginBottom: 8, fontSize: 13 },
    chipAlan: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    chip: { borderWidth: 1.5, borderColor: r.chipSinir, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: r.bgChip },
    chipAktif: { backgroundColor: '#1B4965', borderColor: '#1B4965' },
    chipY: { color: r.chipYazi, fontSize: 13, fontWeight: '500' },
    chipYAktif: { color: '#FFF' },
    tabBar: { flexDirection: 'row', marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: r.sinir },
    tabAktif: { borderBottomColor: '#1B4965' },
    tabY: { color: r.yaziSoluk, fontWeight: '600' },
    tabYA: { color: r.yaziBas },
    onayKutu: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: r.bgInput,
      borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: r.sinir,
    },
    kuponBolumu: { flexDirection: 'row', marginBottom: 15 },
    kuponInp: {
      flex: 1, backgroundColor: r.bgInput, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: r.sinir, fontSize: 16, fontWeight: 'bold',
      letterSpacing: 2, color: r.yaziBas, marginRight: 8,
    },
    kuponBtn: { backgroundColor: '#1B4965', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
    numaraKutu: { backgroundColor: '#1B4965', margin: 15, borderRadius: 16, padding: 15, alignItems: 'center' },
    profilResimSec: {
      width: 100, height: 100, borderRadius: 50, backgroundColor: karanlik ? '#1B3A52' : '#E1F2FE',
      alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
      marginVertical: 15, borderWidth: 3, borderColor: '#1B4965',
    },
    profilTiklanabilir: { alignItems: 'center', paddingVertical: 20 },
    profilAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1B4965', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarHarf: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
    profilAd: { color: '#FFF', fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
    profilDuzenleText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    drawerContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 },
    drawerIc: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '80%', backgroundColor: '#1B4965', paddingTop: 45, paddingHorizontal: 20 },
    drawerKapat: { position: 'absolute', top: 40, right: 15, padding: 5 },
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
    splashLogoContainer: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    splashDonenCember: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: '#2E86AB', borderTopColor: '#588157', borderRightColor: '#588157', borderBottomColor: 'transparent' },
    splashLogoMerkez: { width: 100, height: 100 },
    splashBaslik: { fontSize: 32, fontWeight: '900', color: '#1B4965', letterSpacing: 6, marginBottom: 8 },
    splashAlt: { color: '#8B7355', fontSize: 13, fontStyle: 'italic' },
  });
}
