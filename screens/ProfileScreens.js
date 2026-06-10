// ============================================================
// ProfileScreens.js — PRODUCTION READY
// Profil, Değerlendirmeler, Geçmiş İşler, Belge Yükleme
// ============================================================
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, ActivityIndicator, RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { DB_URL, BOLGELER, STORAGE_BUCKET, API_KEY, damgaToTarih } from '../constants';

const emaildenKey = (email) => email.replace(/\./g, '_').replace(/@/g, 'at');

// React Native'de atob yoktur, bu yardımcı base64'ü Uint8Array'e çevirir
function base64ToUint8Array(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const clean = base64.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor(clean.length * 0.75));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    const d = lookup[clean.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

// ============================================================
// ABONELİK ROZETİ
// ============================================================
function AbonelikRozeti({ kullanici, rol }) {
  const abonelik = kullanici?.abonelik;
  if (abonelik === 'vip') {
    return (
      <View style={{ backgroundColor: '#F39C12', borderColor: '#F39C12', borderWidth: 2, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>👑 VIP Üye</Text>
        {kullanici?.onayDurumu === 'onayli' && (
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>✅ Onaylı Usta</Text>
        )}
      </View>
    );
  }
  if (abonelik === 'premium') {
    return (
      <View style={{ backgroundColor: '#FFF8E1', borderColor: '#F39C12', borderWidth: 2, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 12 }}>⭐ Premium Üye</Text>
        {kullanici?.onayDurumu === 'onayli' && (
          <Text style={{ color: '#00a2ed', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>✅ Onaylı Usta</Text>
        )}
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: '#E1E6EB', borderColor: '#A3B1B9', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: '#526E7F', fontWeight: 'bold', fontSize: 12 }}>📦 Standart Üyelik</Text>
      {kullanici?.onayDurumu === 'onayli' && (
        <Text style={{ color: '#00a2ed', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>✅ Onaylı Usta</Text>
      )}
    </View>
  );
}

// ============================================================// PROFİL EKRANI
// ============================================================
export function ProfilEkrani({ kullanici, setKullanici, token, rol, setEkran, setSikayetHedef, setSikayetModalAcik, s = {} }) {
  const [profilTel, setProfilTel] = useState(kullanici?.telefon || '');
  const [ilceDuzenleAcik, setIlceDuzenleAcik] = useState(false);
  const [puanlar, setPuanlar] = useState([]);
  const [gecmisIsler, setGecmisIsler] = useState([]);
  const [aktifSekme, setAktifSekme] = useState('profil');
  const [kaydedildi, setKaydedildi] = useState(false);
  const [belgeYukleniyor, setBelgeYukleniyor] = useState(false);
  const [kimlikUrl, setKimlikUrl] = useState(kullanici?.kimlikUrl || null);
  const [profilFoto, setProfilFoto] = useState(kullanici?.profilFoto || null);
  const [hakkimda, setHakkimda] = useState(kullanici?.hakkimda || '');
  const [tecrube, setTecrube] = useState(kullanici?.tecrube || '');
  const [yenileniyor, setYenileniyor] = useState(false);
  const [ekBelgeUrl, setEkBelgeUrl] = useState(kullanici?.ekBelgeUrl || null);
  const [ekBelgeTip, setEkBelgeTip] = useState(kullanici?.ekBelgeTip || null);
  const [onayDurumu, setOnayDurumu] = useState(kullanici?.onayDurumu || null);
  const [onayBildirimiGosterildi, setOnayBildirimiGosterildi] = useState(kullanici?.onayDurumu === 'onayli');
  const [kaydetLoading, setKaydetLoading] = useState(false);
  const [basvurLoading, setBasvurLoading] = useState(false);
  const [iptalLoading, setIptalLoading] = useState(false);
  const [sekmeLoading, setSekmeLoading] = useState(null);

  const EK_BELGE_SECENEKLERI = [
    { key: 'ustalıkBelgesi', label: 'Ustalık Belgesi', ikon: '🔧' },
    { key: 'vergiLevhasi', label: 'Vergi Levhası', ikon: '📊' },
    { key: 'esnafSicil', label: 'Esnaf Sicil Belgesi', ikon: '🏪' },
  ];

  const fetchOnayDurumu = async () => {
    if (!kullanici?.uid || !token) return;
    try {
      const res = await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`);
      const data = await res.json();
      if (data) {
        setKullanici(prev => ({ ...prev, ...data }));
        setOnayDurumu(data.onayDurumu || null);
        if (data.onayDurumu === 'onayli' && !onayBildirimiGosterildi) {
          setOnayBildirimiGosterildi(true);
          Alert.alert('🎉 Tebrikler!', 'Ustalığın onaylandı!');
        }
      }
    } catch (e) {
      console.log('Onay durumu kontrol hatası:', e);
    }
  };

  const puanlariYukle = async () => {
  try {
    let res = await fetch(`${DB_URL}/puanlar/${kullanici.uid}.json?auth=${token}`);
    let data = await res.json();
    if (!data) {
      res = await fetch(`${DB_URL}/puanlar/${emaildenKey(kullanici.email)}.json?auth=${token}`);
      data = await res.json();
    }
    if (data) {
      const liste = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => b.tarih - a.tarih);
      setPuanlar(liste);
    }
  } catch (e) { console.log('Puanlar yüklenemedi:', e); }
};

  const gecmisIsleriYukle = async () => {
    try {
      const res = await fetch(`${DB_URL}/ilanlar.json`);
      const data = await res.json();
      if (!data) return;
      const liste = Object.keys(data)
        .map(key => ({ id: key, ...data[key] }))
        .filter(ilan => {
          if (rol === 'usta') {
            return ilan.anlasmaVar && (ilan.anlasilanUsta?.ustaId === kullanici?.email || ilan.anlasilanUsta?.ustaUid === kullanici?.uid);
          } else {
            return ilan.anlasmaVar && ilan.sahip === kullanici?.email;
          }
        })
        .sort((a, b) => b.tarih - a.tarih);
      setGecmisIsler(liste);
    } catch (e) { console.log('Geçmiş işler yüklenemedi:', e); }
  };

  const sayfayiYenile = async () => {
    setYenileniyor(true);
    await Promise.all([
      fetchOnayDurumu(),
      rol === 'usta' && kullanici?.email ? puanlariYukle() : Promise.resolve(),
      gecmisIsleriYukle(),
    ]);
    setYenileniyor(false);
  };

  useEffect(() => {
    if (rol === 'usta' && kullanici?.email) puanlariYukle();
    gecmisIsleriYukle();
    fetchOnayDurumu();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullanici?.onayDurumu]);

  const ortalamaPuan = puanlar.length > 0
    ? (puanlar.reduce((t, p) => t + (Number(p.puan) || 0), 0) / puanlar.length).toFixed(1)
    : null;

  const bilgileriKaydet = async () => {
    if (kaydetLoading) return;
    setKaydetLoading(true);
    const up = { telefon: profilTel, ...(rol === 'usta' && { hakkimda, tecrube }) };
    setKullanici(prev => ({ ...prev, ...up }));
    if (token && kullanici?.uid) {
      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(up),
      }).catch(() => { setKaydetLoading(false); });
    }
    setKaydetLoading(false);
    setKaydedildi(true);
    setTimeout(() => setKaydedildi(false), 3000);
  };

  const belgeYukle = async (tip) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermelisiniz.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;

      setBelgeYukleniyor(true);
      const base64 = result.assets[0].base64;
      const mimeType = 'image/jpeg';
      const dosyaAdi = `belgeler/${kullanici.uid}/${tip}_${Date.now()}.jpg`;
      const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(dosyaAdi)}?uploadType=media`;

      const uploadRes = await fetch(storageUrl, {
        method: 'POST',
        headers: { 'Content-Type': mimeType, Authorization: `Bearer ${token}` },
        body: base64ToUint8Array(base64),
      });

      if (!uploadRes.ok) {
        throw new Error(`Storage yükleme hatası: ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.downloadTokens) {
        throw new Error('Download token alınamadı. Token süresi dolmuş olabilir.');
      }

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(dosyaAdi)}?alt=media&token=${uploadData.downloadTokens}`;

      let guncelVeri;
      let belgeAdi;
      if (tip === 'kimlik') {
        guncelVeri = { kimlikUrl: downloadUrl };
        setKimlikUrl(downloadUrl);
        belgeAdi = 'Kimlik fotoğrafı';
      } else if (tip === 'profil') {
        guncelVeri = { profilFoto: downloadUrl };
        setProfilFoto(downloadUrl);
        belgeAdi = 'Profil fotoğrafı';
      } else {
        guncelVeri = { ekBelgeUrl: downloadUrl, ekBelgeTip: ekBelgeTip };
        setEkBelgeUrl(downloadUrl);
        belgeAdi = EK_BELGE_SECENEKLERI.find(b => b.key === ekBelgeTip)?.label || 'Belge';
      }

      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guncelVeri),
      });

      setKullanici(prev => ({ ...prev, ...guncelVeri }));

      Alert.alert('Yüklendi! ✅', `${belgeAdi} yüklendi.`);
    } catch (e) {
      console.log('Belge yükleme hatası:', e);
      Alert.alert('Hata', 'Belge yüklenemedi gari!');
    } finally {
      setBelgeYukleniyor(false);
    }
  };

  const onayBasvur = async () => {
  if (basvurLoading) return;
  setBasvurLoading(true); 
  if (!profilTel || profilTel.trim().length < 10) {
  Alert.alert('Telefon Gerekli', 'Başvuru yapabilmek için telefon numaranı kaydetmen gerekiyor!');
  return;
}
  if (!kimlikUrl || !ekBelgeUrl) {
  Alert.alert('Eksik Belge', 'Başvuru yapmadan önce hem kimlik hem de seçtiğiniz ek belgeyi yüklemelisiniz!');
  return;
}
  
  try {
    // 1️⃣ Kullanıcı profiline URL'leri, belge tipini ve tarihi yaz
    await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        kimlikUrl, 
        ekBelgeUrl,      // Düzeltildi
        ekBelgeTip,      // Eklendi (Admin hangi belge olduğunu bilmeli)
        basvuruTarihi: Date.now() 
      }),
    });

    // 2️⃣ Admin paneline düşmesi için onayBasvurulari node'una yaz
    await fetch(`${DB_URL}/onayBasvurulari/${kullanici.uid}.json?auth=${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onayDurumu: 'beklemede',
        kimlikUrl,
        ekBelgeUrl,      // Düzeltildi
        ekBelgeTip,      // Eklendi
        basvuruTarihi: Date.now(),
        uid: kullanici.uid,
        ad: kullanici.ad,
        email: kullanici.email,
        meslek: kullanici.meslek || kullanici.anaBrans || '',
        bolge: kullanici.bolge || '',
      }),
    });

    setKullanici(prev => ({ ...prev, onayDurumu: 'beklemede', kimlikUrl, ekBelgeUrl, ekBelgeTip }));
    Alert.alert('Başvuru Alındı! ✅', 'Belgeler admin paneline iletildi. En kısa sürede incelenecek.');
    setBasvurLoading(false);
  } catch (e) {
    setBasvurLoading(false);
    console.log('Başvuru hatası:', e);
    Alert.alert('Hata', 'Başvuru gönderilemedi!');
  }
};
  const basvuruyuIptalEt = async () => {
    setIptalLoading(true);
  Alert.alert(
    'Başvuruyu İptal Et',
    'Başvurunuzu iptal etmek istediğinize emin misiniz? Belgelerinizi düzenleyip tekrar gönderebileceksiniz.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            // 1. Kullanıcı profilindeki durumu sıfırla
            await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ onayDurumu: null }),
            });
            
            // 2. Admin panelindeki bekleyen başvuruyu sil
            await fetch(`${DB_URL}/onayBasvurulari/${kullanici.uid}.json?auth=${token}`, {
              method: 'DELETE',
            });

            // 3. Ekranı ve state'i güncelle
            setKullanici(prev => ({ ...prev, onayDurumu: null }));
            Alert.alert('İptal Edildi', 'Başvurunuz iptal edildi. Belgelerinizi düzenleyebilirsiniz.');
            setIptalLoading(false);
          } catch (e) {
            setIptalLoading(false);
            console.log('İptal hatası:', e);
            Alert.alert('Hata', 'İptal işlemi sırasında bir sorun oluştu.');
          }
        }
      }
    ]
  );
};
  // Guard: s veya kullanici yoksa crash etmesin
  if (!kullanici || !s || !s.con) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F0' }}>
        <Text style={{ color: '#A3B1B9' }}>Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Profilim</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: '#F5F5F0', paddingHorizontal: 15, paddingVertical: 8 }}>
        {['profil', 'degerlendirmeler', 'gecmis'].map(sekme => (
          <TouchableOpacity
            key={sekme}
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: aktifSekme === sekme ? 2 : 0, borderBottomColor: '#1B4965' }}
            onPress={() => {
           if (sekmeLoading) return;
           setSekmeLoading(sekme);
           setAktifSekme(sekme);
           setTimeout(() => setSekmeLoading(null), 500);
         }}
          >
            <Text style={{ color: aktifSekme === sekme ? '#1B4965' : '#A3B1B9', fontWeight: 'bold', fontSize: 12 }}>
              {sekme === 'profil' ? '👤 Profil' : sekme === 'degerlendirmeler' ? '⭐ Puanlar' : '📋 Geçmiş'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

     <ScrollView 
  style={s.scroll}
  refreshControl={
    <RefreshControl 
      refreshing={yenileniyor} 
      onRefresh={sayfayiYenile}
      colors={['#00a2ed']}
      tintColor="#00a2ed"
    />
  }
>
  {aktifSekme === 'profil' && (
    <>
          <TouchableOpacity onPress={() => belgeYukle('profil')} style={{ alignItems: 'center', marginVertical: 15 }}>
       <View style={{
         width: 100, height: 100, borderRadius: 50,
         borderWidth: 3, borderColor: '#1B4965',
         backgroundColor: '#E1F2FE',
         overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center'
  }}>
       {profilFoto ? (
       <Image
        source={{ uri: profilFoto }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    ) : (
      <Text style={{ fontSize: 40 }}>📷</Text>
    )}
  </View>
        <Text style={{ color: '#1B4965', fontWeight: 'bold', marginTop: 8, fontSize: 12 }}>Fotoğraf Yükle</Text>
   </TouchableOpacity>

            <View style={{ alignItems: 'center', marginTop: -10, marginBottom: 15 }}>
              <AbonelikRozeti kullanici={kullanici} rol={rol} />
            </View>
         {kullanici?.kurucuUsta && (
         <View style={{ alignItems: 'center', marginBottom: 15 }}>
         <View style={{ backgroundColor: '#1B4965', borderColor: '#F39C12', borderWidth: 2, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
         <Text style={{ fontSize: 16, marginRight: 6 }}>🏅</Text>
         <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 12 }}>Kurucu Usta</Text>
      </View>
     </View>
   )}
    {rol === 'usta' && onayDurumu === 'onayli' && (
     <View style={{ 
       flexDirection: 'row', 
       alignItems: 'center', 
       justifyContent: 'center',
       backgroundColor: '#E8F5E9', 
       borderRadius: 12, 
       padding: 14, 
       marginHorizontal: 15, 
       marginBottom: 15, 
       borderWidth: 2, 
      borderColor: '#588157' 
     }}>
       <Text style={{ fontSize: 28, marginRight: 10 }}>✅</Text>
       <View>
         <Text style={{ color: '#588157', fontWeight: 'bold', fontSize: 15 }}>ONAYLI USTA</Text>
         <Text style={{ color: '#588157', fontSize: 11 }}>Profilin doğrulanmış ve güvenilir</Text>
       </View>
     </View>
   )}
             {rol === 'usta' && ortalamaPuan && (
              <View style={{ backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginHorizontal: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 28 }}>⭐</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F39C12', marginLeft: 8 }}>{ortalamaPuan}</Text>
                <Text style={{ color: '#A3B1B9', marginLeft: 8 }}>({puanlar.length} değerlendirme)</Text>
              </View>
            )}

            <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center' }}>
              <Text style={{ color: '#526E7F', fontSize: 12, marginBottom: 5 }}>Senin Davet Kodun</Text>
              <Text style={{ color: '#1B4965', fontSize: 20, fontWeight: '900', letterSpacing: 3 }}>{String(kullanici?.referansKodu || '')}</Text>
            </View>

           {rol === 'usta' && onayDurumu !== 'onayli' && (
              <View style={{ padding: 15, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#00a2ed', borderStyle: 'dashed' }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 15 }}>Onaylı Usta Rozeti Al</Text>
                <Text style={{ fontSize: 11, color: '#526E7F', marginTop: 4, marginBottom: 12 }}>
                  Kimliğini ve aşağıdaki belgelerden birini yükle, admin onaylasın.
                </Text>
             {(!profilTel || profilTel.trim().length < 10) && (
              <View style={{ backgroundColor: '#FFF3CD', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F39C12', flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>📵</Text>
              <Text style={{ flex: 1, color: '#856404', fontSize: 12 }}>
              Başvuru yapabilmek için telefon numaranı kaydetmen gerekiyor. Aşağıdaki alana gir ve <Text style={{ fontWeight: 'bold' }}>Bilgileri Kaydet</Text>'e bas.
          </Text>
        </View>
      )}

                {/* KİMLİK FOTOĞRAFI */}
                <TouchableOpacity
                  style={{ backgroundColor: kimlikUrl ? '#E8F5E9' : '#F5F5F0', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: kimlikUrl ? '#588157' : '#D1D9E0', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => belgeYukle('kimlik')}
                  disabled={belgeYukleniyor}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{kimlikUrl ? '✅' : '🪪'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 13 }}>Kimlik Fotoğrafı</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{kimlikUrl ? 'Yüklendi ✓' : 'Zorunlu — fotoğraf seç'}</Text>
                  </View>
                  {belgeYukleniyor && <ActivityIndicator size="small" color="#1B4965" />}
                </TouchableOpacity>

                {/* EK BELGE TİPİ SEÇ */}
                <Text style={{ fontSize: 12, color: '#526E7F', marginBottom: 8, fontWeight: 'bold' }}>
                  Ek Belge Seç (birini seçmen yeterli):
                </Text>
                {EK_BELGE_SECENEKLERI.map(secenek => (
                  <TouchableOpacity
                    key={secenek.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      padding: 10,
                      backgroundColor: ekBelgeTip === secenek.key ? '#E1F2FE' : '#F5F5F0',
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: ekBelgeTip === secenek.key ? '#00a2ed' : '#D1D9E0',
                    }}
                    onPress={() => {
                      setEkBelgeTip(secenek.key);
                      setEkBelgeUrl(null);
                    }}
                  >
                    <Text style={{ fontSize: 18, marginRight: 10 }}>{secenek.ikon}</Text>
                    <Text style={{ color: '#1B4965', fontSize: 13, fontWeight: ekBelgeTip === secenek.key ? 'bold' : 'normal' }}>
                      {secenek.label}
                    </Text>
                    {ekBelgeTip === secenek.key && (
                      <Text style={{ marginLeft: 'auto', color: '#00a2ed', fontWeight: 'bold' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}

                {/* SEÇİLEN BELGEYİ YÜKLE */}
                {ekBelgeTip && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: ekBelgeUrl ? '#E8F5E9' : '#F5F5F0',
                      borderRadius: 10,
                      padding: 12,
                      marginTop: 6,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: ekBelgeUrl ? '#588157' : '#D1D9E0',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => belgeYukle('ekBelge')}
                    disabled={belgeYukleniyor}
                  >
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{ekBelgeUrl ? '✅' : '📄'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 13 }}>
                        {EK_BELGE_SECENEKLERI.find(b => b.key === ekBelgeTip)?.label} Yükle
                      </Text>
                      <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                        {ekBelgeUrl ? 'Yüklendi ✓' : 'Fotoğraf seç'}
                      </Text>
                    </View>
                    {belgeYukleniyor && <ActivityIndicator size="small" color="#1B4965" />}
                  </TouchableOpacity>
                )}

              {/* DURUM / GÖNDER */}
{onayDurumu === 'beklemede' ? (
  <View style={{ padding: 15, backgroundColor: '#FFF8E1', borderRadius: 8, borderWidth: 1, borderColor: '#F39C12', marginTop: 8 }}>
    <Text style={{ color: '#F39C12', fontSize: 13, textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>⌛ Belgeleriniz İncelemede...</Text>
    <Text style={{ color: '#A3B1B9', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>
      Yukarıdan belgelerinizi güncelleyip yeniden gönderebilirsiniz.
    </Text>
    <TouchableOpacity
      style={{ backgroundColor: (profilTel && profilTel.trim().length >= 10 && kimlikUrl && ekBelgeUrl) ? '#F39C12' : '#D1D9E0', padding: 12, borderRadius: 8, marginBottom: 8 }}
      onPress={onayBasvur}
      disabled={!profilTel || profilTel.trim().length < 10 || !kimlikUrl || !ekBelgeUrl || basvurLoading}
    >
      {basvurLoading ? 'Gönderiliyor...' : '🛡 Belgeleri Güncelle ve Yeniden Gönder'}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
  style={{ backgroundColor: '#E53935', padding: 10, borderRadius: 6,
    opacity: iptalLoading ? 0.6 : 1 }}
  onPress={basvuruyuIptalEt}
  disabled={iptalLoading}
>
  <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 12 }}>
    {iptalLoading ? 'İptal ediliyor...' : '❌ Başvuruyu İptal Et'}
  </Text>
</TouchableOpacity>
  </View>
  ) : onayDurumu === 'reddedildi' ? (
       <View style={{ padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8, marginBottom: 10 }}>
       <Text style={{ color: '#E53935', fontSize: 12, textAlign: 'center', fontWeight: 'bold' }}> Başvuru Reddedildi — Belgelerini tekrar yükleyebilirsin.</Text>
   </View>
    ) : null}

        {onayDurumu !== 'beklemede' && (
       <TouchableOpacity
          style={{ backgroundColor: (profilTel && profilTel.trim().length >= 10 && kimlikUrl && ekBelgeUrl) ? '#00a2ed' : '#D1D9E0', padding: 12, borderRadius: 8, marginTop: 4 }}
           onPress={onayBasvur}
           disabled={!profilTel || profilTel.trim().length < 10 || !kimlikUrl || !ekBelgeUrl}
      >
           <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>
           {(!profilTel || profilTel.trim().length < 10) ? '📵 Önce telefon numarasını kaydet' : (kimlikUrl && ekBelgeUrl) ? '📤 BAŞVURUYU GÖNDER' : 'Önce belgeleri yükle'}
      </Text>
            </TouchableOpacity>
         )}
         </View>
           )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -10 }}>
              <Text style={s.inputBaslik}>Ad Soyad</Text>
            </View>
            <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={String(kullanici?.ad || '')} editable={false} />

            <Text style={s.inputBaslik}>E-Posta</Text>
            <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={String(kullanici?.email || '')} editable={false} />

            {rol === 'usta' && (
              <>
                <Text style={s.inputBaslik}>Meslek / Branş</Text>
                <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#526E7F' }]} value={String(kullanici?.meslek || kullanici?.anaBrans || 'Belirtilmemiş')} editable={false} />
              </>
            )}
            {rol === 'usta' && (
              <>
                <Text style={s.inputBaslik}>Hakkımda</Text>
                <TextInput
                  style={[s.inp, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Kendinizi tanıtın..."
                  value={hakkimda}
                  onChangeText={(text) => text.length <= 500 && setHakkimda(text)}
                  multiline
                  maxLength={500}
                />
                <Text style={{ color: '#A3B1B9', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                  {hakkimda.length}/500
                </Text>
                <Text style={s.inputBaslik}>Tecrübe (Yıl)</Text>
                <TextInput
                  style={s.inp}
                  placeholder="Örn: 5"
                  value={tecrube}
                  onChangeText={setTecrube}
                  keyboardType="numeric"
                />
              </>
            )}
            <Text style={s.inputBaslik}>Telefon Numarası</Text>
            <TextInput style={s.inp} placeholder="Örn: 0532 XXX XX XX" value={profilTel} onChangeText={setProfilTel} keyboardType="phone-pad" />

            <View style={{ marginTop: 15, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: '#1B4965', fontWeight: 'bold' }}>📍 Kayıtlı Bölge: {kullanici?.bolge || 'Belirtilmemiş'}</Text>
              <TouchableOpacity style={{ marginTop: 10, backgroundColor: '#8B7355', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }} onPress={() => setIlceDuzenleAcik(!ilceDuzenleAcik)}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>İlçemi Değiştir</Text>
              </TouchableOpacity>

              {ilceDuzenleAcik && (
                <View style={[s.chipAlan, { marginTop: 15, justifyContent: 'center' }]}>
                  {BOLGELER.map(b => (
                    <TouchableOpacity key={b} style={[s.chip, kullanici?.bolge === b && s.chipAktif]} onPress={async () => {
                      try {
                        if (token && kullanici?.uid) {
                          await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bolge: b, ilce: b }),
                          });
                        }
                        setKullanici(prev => ({ ...prev, bolge: b, ilce: b }));
                        setIlceDuzenleAcik(false);
                        Alert.alert('Başarılı', `Bölgen ${b} olarak güncellendi usta!`);
                      } catch (e) { Alert.alert('Hata', 'İlçe güncellenemedi gari.'); }
                    }}>
                      <Text style={[s.chipY, kullanici?.bolge === b && s.chipYAktif]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={{ marginTop: 15, marginBottom: 5, alignSelf: 'flex-start' }} onPress={() => { setSikayetHedef('Genel Şikayet'); setSikayetModalAcik(true); }}>
              <Text style={{ color: '#FF4444', fontSize: 13 }}>⚠️ Şikayet Et</Text>
            </TouchableOpacity>

            {kaydedildi && (
              <View style={{ backgroundColor: '#588157', borderRadius: 12, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✅ Bilgiler kaydedildi!</Text>
              </View>
            )}

            <TouchableOpacity
  style={[s.girisBtn, { marginBottom: 40, marginTop: 15 },
    kaydetLoading && { opacity: 0.6 }]}
  onPress={bilgileriKaydet}
  disabled={kaydetLoading}
>
  <Text style={s.anaBtnY}>
    {kaydetLoading ? 'Kaydediliyor...' : 'BİLGİLERİ KAYDET'}
  </Text>
</TouchableOpacity>
          </>
        )}

        {aktifSekme === 'degerlendirmeler' && (
          <>
            {rol !== 'usta' ? (
              <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 15 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>⭐</Text>
                <Text style={{ color: '#1B4965', fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>Verdiğin Puanlar</Text>
                {gecmisIsler.filter(i => i.puanlandi).length === 0 ? (
                  <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>
                    Henüz bir ustayı puanlamadın.{'\n'}İşini tamamladıktan sonra puan verebilirsin!
                  </Text>
                ) : (
                  gecmisIsler.filter(i => i.puanlandi).map(ilan => (
                    <View key={ilan.id} style={[s.kart, { marginBottom: 10, width: '100%' }]}>
                      <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>
                        🛠️ {ilan.anlasilanUsta?.ustaAd || 'Usta'}
                      </Text>
                      <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 2 }}>{ilan.baslik}</Text>
                      <Text style={{ color: '#F39C12', marginTop: 4 }}>⭐ Puanlandı</Text>
                      <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 4 }}>{damgaToTarih(ilan.tarih)}</Text>
                    </View>
                  ))
                )}
              </View>
            ) : puanlar.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>⭐</Text>
                <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>Henüz değerlendirme yok gari.{'\n'}İlk işini tamamla!</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#FFF8E1', borderRadius: 16, padding: 20, margin: 15, alignItems: 'center' }}>
                  <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#F39C12' }}>{ortalamaPuan}</Text>
                  <View style={{ flexDirection: 'row', marginVertical: 8 }}>
                    {[1, 2, 3, 4, 5].map(y => (
                      <Text key={y} style={{ fontSize: 24, opacity: parseFloat(ortalamaPuan) >= y ? 1 : 0.3 }}>⭐</Text>
                    ))}
                  </View>
                  <Text style={{ color: '#A3B1B9' }}>{puanlar.length} değerlendirme</Text>
                </View>
                {puanlar.map(p => (
                  <View key={p.id} style={[s.kart, { marginHorizontal: 15, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{p.musteriAd}</Text>
                      <View style={{ flexDirection: 'row' }}>
                        {[1, 2, 3, 4, 5].map(y => (
                          <Text key={y} style={{ fontSize: 14, opacity: p.puan >= y ? 1 : 0.3 }}>⭐</Text>
                        ))}
                      </View>
                    </View>
                    {p.yorum ? <Text style={{ color: '#526E7F', marginTop: 8, fontStyle: 'italic' }}>"{p.yorum}"</Text> : null}
                    <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 6 }}>{damgaToTarih(p.tarih)}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {aktifSekme === 'gecmis' && (
          <>
            {gecmisIsler.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>📋</Text>
                <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>Henüz tamamlanmış iş yok gari.</Text>
              </View>
            ) : (
              gecmisIsler.map(ilan => (
                <View key={ilan.id} style={[s.kart, { marginHorizontal: 15, marginBottom: 10 }]}>
                  <Text style={s.kategoriBadge}>{ilan.kategori}</Text>
                  <Text style={s.kartBaslik}>{ilan.baslik}</Text>
                  <Text style={s.kartAlt}>📍 {ilan.mahalle} - {ilan.bolge}</Text>
                  {rol === 'usta' ? (
                    <Text style={s.kartAlt}>👤 Müşteri: {ilan.sahip}</Text>
                  ) : (
                    <Text style={s.kartAlt}>🛠️ Usta: {ilan.anlasilanUsta?.ustaAd || '-'} — {ilan.anlasilanUsta?.fiyat || '-'}</Text>
                  )}
                  <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 6 }}>{damgaToTarih(ilan.tarih)}</Text>
                  {ilan.puanlandi && <Text style={{ color: '#F39C12', fontSize: 12, marginTop: 4 }}>⭐ Puanlandı</Text>}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
