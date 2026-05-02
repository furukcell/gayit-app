import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, FlatList, Alert, Dimensions, Image, RefreshControl, Switch } from 'react-native';

const { width } = Dimensions.get('window');

const BOLGELER = [
  { ad: 'Menteşe (Merkez)', toplam: 120, musait: 45, detay: [{ kat: 'Klimacı', top: 30, mus: 12 }, { kat: 'Temizlik', top: 40, mus: 15 }] },
  { ad: 'Bodrum', toplam: 85, musait: 22, detay: [{ kat: 'Klimacı', top: 20, mus: 10 }, { kat: 'Temizlik', top: 30, mus: 8 }] },
  { ad: 'Dalaman', toplam: 25, musait: 8, detay: [{ kat: 'Tesisat', top: 10, mus: 3 }] },
  { ad: 'Datça', toplam: 20, musait: 5, detay: [{ kat: 'Boyacı', top: 8, mus: 2 }] },
  { ad: 'Fethiye', toplam: 60, musait: 18, detay: [{ kat: 'Boyacı', top: 15, mus: 7 }] },
  { ad: 'Kavaklıdere', toplam: 10, musait: 2, detay: [{ kat: 'Tesisat', top: 5, mus: 1 }] },
  { ad: 'Köyceğiz', toplam: 30, musait: 9, detay: [{ kat: 'Elektrik', top: 12, mus: 4 }] },
  { ad: 'Marmaris', toplam: 75, musait: 20, detay: [{ kat: 'Klimacı', top: 25, mus: 8 }] },
  { ad: 'Milas', toplam: 50, musait: 15, detay: [{ kat: 'Temizlik', top: 10, mus: 5 }, { kat: 'Tesisat', top: 15, mus: 4 }] },
  { ad: 'Ortaca', toplam: 35, musait: 11, detay: [{ kat: 'Elektrik', top: 15, mus: 5 }] },
  { ad: 'Seydikemer', toplam: 15, musait: 4, detay: [{ kat: 'Boyacı', top: 6, mus: 2 }] },
  { ad: 'Ula', toplam: 18, musait: 6, detay: [{ kat: 'Tesisat', top: 8, mus: 3 }] },
  { ad: 'Yatağan', toplam: 40, musait: 11, detay: [{ kat: 'Tesisat', top: 12, mus: 5 }] }
];

const BRANSLAR = ['Tesisat (sucu)', 'Elektrik', 'Boyacı', 'Klimacı', 'Nakliyat', 'Temizlik', 'Diger'];
const KATEGORILER = ['Tümü', 'Tesisat (sucu)', 'Klimacı', 'Boyacı', 'Elektrik', 'Temizlik', 'Nakliyat', 'Diger'];
const YENI_ILAN_KATEGORILER = ['Temizlik', 'Boya/Badana', 'Tesisat(sucu)', 'Elektrik', 'Klima', 'Nakliyat', 'Diger'];

export default function App() {
  const [splash, setSplash] = useState(true);
  
  // YENİLEME İÇİN GEREKLİ KODLAR BURADA GARİ
  const [yenileniyor, setYenileniyor] = useState(false);
  const onYenile = () => {
    setYenileniyor(true);
    setTimeout(() => {
      setYenileniyor(false); 
    }, 1200); 
  };

  const [ekran, setEkran] = useState('karsilama');
  const [rol, setRol] = useState('');
  const [mod, setMod] = useState('kayit');
  const [menuAcik, setMenuAcik] = useState(false);
  const [kullanici, setKullanici] = useState(null);
  const [anlasmaSaglandi, setAnlasmaSaglandi] = useState(false);
  const [acikIlce, setAcikIlce] = useState(null);
  const [ilcelerAcik, setIlcelerAcik] = useState(false);
  const [bildirimAcik, setBildirimAcik] = useState(true);
  const [mesajBildirimAcik, setMesajBildirimAcik] = useState(true);
  const [bildirimSesi, setBildirimSesi] = useState(true);
  const [karanlikMod, setKaranlikMod] = useState(false);
  const [seciliKategori, setSeciliKategori] = useState('Tümü');
  const [filtreAcik, setFiltreAcik] = useState(false);
  const [bildirimler, setBildirimler] = useState([
    { id: 'b1', mesaj: 'Faruk Usta "Mutfak Musluk Tamiri" ilanina 450 TL teklif verdi!', okundu: false, sure: '5 dk once' },
    { id: 'b2', mesaj: 'Ilaniniz bugün 14 usta tarafindan incelendi.', okundu: true, sure: '2 saat once' }
  ]);
  const [odemeAdim, setOdemeAdim] = useState('secim');
  const [toplamKullanim, setToplamKullanim] = useState(124);
  const KOD_LIMITI = 1000;
  const [kuponKod, setKuponKod] = useState('');
  const [ad, setAd] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [kayitBolge, setKayitBolge] = useState('');
  const [kayitBrans, setKayitBrans] = useState('');
  const [sohbetMesaj, setSohbetMesaj] = useState('');
  const [profilTel, setProfilTel] = useState('');
  const [profilBolge, setProfilBolge] = useState('');
  const [profilMeslek, setProfilMeslek] = useState('Tesisat');
  const [puan, setPuan] = useState('');
  const [yorum, setYorum] = useState('');
  const [gecmisIsler, setGecmisIsler] = useState([
    { id: 'g1', baslik: 'Banyo Fayans Yenileme', kisi: 'Ahmet Usta', durum: 'Puan Bekliyor', puan: null },
    { id: 'g2', baslik: 'Kombi Bakimi', kisi: 'Veli Usta', durum: 'Tamamlandi', puan: 9 }
  ]);
  const [ilanKategori, setIlanKategori] = useState('Temizlik');
  const [ilanBaslik, setIlanBaslik] = useState('');
  const [ilanDetay, setIlanDetay] = useState('');
  const [ilanIlce, setIlanIlce] = useState('');
  const [ilanMahalle, setIlanMahalle] = useState('');
  const [isTarihi, setIsTarihi] = useState('');
  const [secilenIlan, setSecilenIlan] = useState(null);
  const [teklifFiyat, setTeklifFiyat] = useState('');
  const [teklifNot, setTeklifNot] = useState('');
  const [aktifSohbetTeklif, setAktifSohbetTeklif] = useState(null);
  const [ilanlar, setIlanlar] = useState([
    { id: '1', baslik: 'Mutfak Musluk Tamiri', kategori: 'Tesisat', bolge: 'Milas', mahalle: 'Haciapti', sure: '10 dk once', isTarihi: 'Hemen', kalanGun: 1, ustaGoruntulenme: 14, sahip: 'baskasi@mail.com', anlasmaVar: false, teklifler: [{ id: 't1', ustaId: 'usta1', ustaAd: 'Faruk Usta', telefon: '0532 123 45 67', fiyat: '450 TL', not: 'Ayni gun gelebilirim' }] },
    { id: '2', baslik: 'Klima Gazi Basilacak', kategori: 'Klimacı', bolge: 'Milas', mahalle: 'Günes', sure: '1 saat once', isTarihi: 'Bu Hafta Sonu', kalanGun: 4, ustaGoruntulenme: 28, sahip: 'baskasi@mail.com', anlasmaVar: false, teklifler: [] },
    { id: '3', baslik: 'Dis Cephe Boyasi', kategori: 'Boyacı', bolge: 'Menteşe (Merkez)', mahalle: 'Kötekli', sure: '2 gün once', isTarihi: '15 Mayis', kalanGun: 10, ustaGoruntulenme: 41, sahip: 'baskasi@mail.com', anlasmaVar: false, teklifler: [] },
    { id: '4', baslik: 'Bahce Duvari Örümü', kategori: 'Tesisat', bolge: 'Yatağan', mahalle: 'Turgutlar', sure: '3 saat once', isTarihi: 'Yarin', kalanGun: 2, ustaGoruntulenme: 5, sahip: 'baskasi@mail.com', anlasmaVar: false, teklifler: [] }
  ]);

  useEffect(() => {
    setTimeout(() => setSplash(false), 2500);
  }, []);

  const islemiTamamla = () => {
    if (!email || !sifre || (mod === 'kayit' && !ad)) return Alert.alert("Hata", "Eksik bilgi!");
    if (mod === 'kayit' && !kayitBolge) return Alert.alert("Hata", "Ilce secin!");
    if (mod === 'kayit' && rol === 'usta' && !kayitBrans) return Alert.alert("Hata", "Brans secin!");
    setKullanici({
      ad: ad || email.split('@')[0], email, rol,
      bolge: mod === 'kayit' ? kayitBolge : 'Milas',
      telefon: '',
      meslek: rol === 'usta' ? (mod === 'kayit' ? kayitBrans : 'Tesisat') : null,
      puanOrtalamasi: rol === 'usta' ? 4.8 : null,
      hak: 0, abonelik: false, yeniKullaniciHakki: 3
    });
    setIlanIlce(mod === 'kayit' ? kayitBolge : 'Milas');
    setProfilBolge(mod === 'kayit' ? kayitBolge : 'Milas');
    setProfilMeslek(rol === 'usta' ? (mod === 'kayit' ? kayitBrans : 'Tesisat') : '');
    setEkran('anasayfa');
  };

  const kuponUygula = () => {
    if (kuponKod.toUpperCase() === 'BAYRAM2026' && toplamKullanim < KOD_LIMITI) {
      setToplamKullanim(prev => prev + 1);
      setKullanici({ ...kullanici, abonelik: true });
      Alert.alert("Bayram Hediyesi!", "1 Haziran'a kadar sinırsız kullanim tanımlandi!");
      setEkran('anasayfa');
    } else {
      Alert.alert("Hata", "Gecersiz kod veya limit dolmus.");
    }
  };

  const ustaTeklifTiklandi = (ilan) => {
    if (kullanici?.abonelik) {
      setSecilenIlan(ilan); setEkran('teklifver');
    } else if (kullanici?.yeniKullaniciHakki > 0) {
      setKullanici({ ...kullanici, yeniKullaniciHakki: kullanici.yeniKullaniciHakki - 1 });
      setSecilenIlan(ilan); setEkran('teklifver');
    } else if (kullanici?.hak > 0) {
      setKullanici({ ...kullanici, hak: kullanici.hak - 1 });
      setSecilenIlan(ilan); setEkran('teklifver');
    } else {
      setOdemeAdim('secim'); setEkran('odeme');
    }
  };

  const teklifGonder = (ilanId) => {
    if (!teklifFiyat) { Alert.alert("Hata", "Fiyat girmelisiniz!"); return; }
    setIlanlar(ilanlar.map(ilan => {
      if (ilan.id !== ilanId) return ilan;
      const zatenVerdi = ilan.teklifler.find(t => t.ustaId === kullanici.email);
      if (zatenVerdi) { Alert.alert("Uyari", "Bu ilana zaten teklif verdiniz!"); return ilan; }
      return { ...ilan, teklifler: [...ilan.teklifler, { id: 't' + Date.now(), ustaId: kullanici.email, ustaAd: kullanici.ad, fiyat: teklifFiyat + ' TL', not: teklifNot, telefon: kullanici.telefon || '0500 000 00 00' }] };
    }));
    setTeklifFiyat(''); setTeklifNot('');
    Alert.alert("Basarili!", "Teklifiniz gönderildi! Musteri onaylarsa iletisim bilgileriniz paylasılacak.");
    setEkran('anasayfa');
  };

  const anlasmaYap = (ilanId, teklif) => {
    Alert.alert("Anlasmayı Onayla", `${teklif.ustaAd} ile ${teklif.fiyat} üzerinden anlasıyor musunuz?`, [
      { text: "Vazgec", style: "cancel" },
      { text: "Evet, Anlas!", onPress: () => {
        setIlanlar(ilanlar.map(ilan => ilan.id === ilanId ? { ...ilan, anlasmaVar: true, anlasilanUsta: teklif } : ilan));
        setAktifSohbetTeklif(teklif); setAnlasmaSaglandi(true); setEkran('sohbet');
      }}
    ]);
  };

  const anasayfaIlanlari = ilanlar.filter(ilan => {
    const bolgeUygun = ilan.bolge === kullanici?.bolge;
    const kategoriUygun = rol === 'usta'
      ? (seciliKategori === 'Tümü' ? ilan.kategori === kullanici?.meslek : ilan.kategori === seciliKategori)
      : (seciliKategori === 'Tümü' || ilan.kategori === seciliKategori);
    return bolgeUygun && kategoriUygun;
  });

  const getTarihStil = (gun) => {
    if (gun <= 2) return { bg: '#FFEBEE', text: '#FF4444' };
    if (gun <= 7) return { bg: '#FFF8E1', text: '#F39C12' };
    return { bg: '#E8F5E9', text: '#588157' };
  };

  const SolMenu = () => (
    <View style={s.drawerContainer}>
      <View style={s.drawerIc}>
        <TouchableOpacity style={s.drawerKapat} onPress={() => setMenuAcik(false)}><Text style={{ color: '#FFF', fontSize: 22 }}>X</Text></TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.profilTiklanabilir} onPress={() => { setMenuAcik(false); setProfilTel(kullanici?.telefon || ''); setProfilBolge(kullanici?.bolge || ''); setProfilMeslek(kullanici?.meslek || 'Tesisat'); setEkran('profil'); }}>
            <View style={s.profilAvatar}><Text style={s.avatarHarf}>{kullanici?.ad[0]}</Text></View>
            <Text style={s.profilAd}>{kullanici?.ad}</Text>
            <Text style={s.profilDuzenleText}>{kullanici?.abonelik ? 'ABONE' : `Hak: ${kullanici?.hak}`}</Text>
          </TouchableOpacity>
          <View style={s.ayrac} />
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}><Text style={s.menuText}>Anasayfa</Text></TouchableOpacity>
          {rol === 'usta' ? (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}><Text style={s.menuText}>Islere Teklif Ver</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanver'); }}><Text style={s.menuText}>Ilan Ver</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanlarim'); }}><Text style={s.menuText}>{rol === 'usta' ? 'Tekliflerim' : 'İlanlarim'}</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setOdemeAdim('secim'); setEkran('odeme'); }}><Text style={s.menuText}>Paket ve Kupon</Text></TouchableOpacity>
          
          <View style={s.ayrac} />
          
      
          <TouchableOpacity 
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }} 
            onPress={() => setIlcelerAcik(!ilcelerAcik)}
          >
            <Text style={[s.menuBaslik, { marginTop: 0, marginBottom: 0, fontSize: 13, fontWeight: 'bold' }]}>MUĞLA USTA RAPORU</Text>
            <Text style={{ color: '#FFF', opacity: 0.6, fontSize: 12 }}>{ilcelerAcik ? '▲' : '▼'}</Text>
          </TouchableOpacity>

        
          {ilcelerAcik && BOLGELER.map((b) => (
            <View key={b.ad}>
              <TouchableOpacity style={s.ilceItem} onPress={() => setAcikIlce(acikIlce === b.ad ? null : b.ad)}>
                <Text style={s.ilceAd}>{b.ad}</Text>
                <Text style={s.ilceAltBilgi}>{b.musait} Müsait</Text>
              </TouchableOpacity>
              {acikIlce === b.ad && (
                <View style={s.ilceDetayAlan}>
                  {b.detay.map((d, i) => (<Text key={i} style={s.detaySatir}>- {d.kat}: {d.top} ({d.mus} Müs)</Text>))}
                </View>
              )}
            </View>
          ))}
          {/* AÇILIR KAPANIR LİSTE BİTTİ */}

          <View style={s.ayrac} />
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('hizmet_kosullari'); }}><Text style={s.menuText}>Hizmet Koşulları</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('hakkimizda'); }}><Text style={s.menuText}>Hakkımızda</Text></TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ayarlar'); }}><Text style={s.menuText}>Ayarlar</Text></TouchableOpacity>
          
          <View style={s.ayrac} />
          <TouchableOpacity style={s.menuItem} onPress={() => { setKullanici(null); setEkran('karsilama'); setMenuAcik(false); }}><Text style={s.cikisY}>CIKIS YAP</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
if (splash) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center' }}>
        <Image 
          source={{ uri: 'https://i.ibb.co/35njqV6C/MG-20260501-221828.png' }} 
          style={{ 
            width: '100%', 
            height: '90%', 
          }} 
          resizeMode="contain" 
        />
      </SafeAreaView>
    );
  }

  if (ekran === 'karsilama') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.ic}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: -30 }}>
              <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 180, height: 180 }} resizeMode="contain" />
              <Text style={{ fontSize: 36, fontWeight: '600', color: '#1B4965', letterSpacing: 4, marginLeft: -45, marginTop: 35, fontFamily: 'Palatino' }}>AYIT</Text>
            </View>
            <Text style={{ color: '#8B7355', fontSize: 14, fontStyle: 'italic', marginTop: -30 }}>Muğla'nın bütün işi gaydı artık burada</Text>
          </View>
          <View style={s.btnAlan}>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965' }]} onPress={() => { setRol('usta'); setMod('kayit'); setEkran('auth'); }}>
              <Text style={s.anaBtnY}>Usta Girisi / Kayit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#588157' }]} onPress={() => { setRol('musteri'); setMod('kayit'); setEkran('auth'); }}>
              <Text style={s.anaBtnY}>Musteri Girisi / Kayit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (ekran === 'auth') {
    return (
      <SafeAreaView style={s.con}>
        <ScrollView contentContainerStyle={s.authIc}>
          <View style={{ alignItems: 'center', marginBottom: 25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 90, height: 90 }} resizeMode="contain" />
              <Text style={{ fontSize: 28, fontWeight: '600', color: '#1B4965', letterSpacing: 3, marginLeft: -20, marginTop: 12, fontFamily: 'serif' }}>AYIT</Text>
            </View>
            <Text style={{ color: '#8B7355', fontSize: 13, fontStyle: 'italic', marginTop: 5 }}>Muğla'nın bütün işi gaydı artık burada</Text>
          </View>
          <Text style={[s.bas, { textAlign: 'center' }]}>{rol === 'usta' ? 'Usta' : 'Musteri'} Paneli</Text>
          <View style={s.tabBar}>
            <TouchableOpacity style={[s.tab, mod === 'kayit' && s.tabAktif]} onPress={() => setMod('kayit')}><Text style={[s.tabY, mod === 'kayit' && s.tabYA]}>Kayit</Text></TouchableOpacity>
            <TouchableOpacity style={[s.tab, mod === 'giris' && s.tabAktif]} onPress={() => setMod('giris')}><Text style={[s.tabY, mod === 'giris' && s.tabYA]}>Giris</Text></TouchableOpacity>
          </View>
          {mod === 'kayit' && <TextInput style={s.inp} placeholder="Ad Soyad" value={ad} onChangeText={setAd} />}
          <TextInput style={s.inp} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.inp} placeholder="Sifre" value={sifre} onChangeText={setSifre} secureTextEntry />
          {mod === 'kayit' && (
            <>
              <Text style={s.inputBaslik}>Bulundugunuz Ilce</Text>
              <View style={s.chipAlan}>
                {BOLGELER.map(b => (
                  <TouchableOpacity key={b.ad} style={[s.chip, kayitBolge === b.ad && s.chipAktif]} onPress={() => setKayitBolge(b.ad)}>
                    <Text style={[s.chipY, kayitBolge === b.ad && s.chipYAktif]}>{b.ad}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {rol === 'usta' && (
                <>
                  <Text style={s.inputBaslik}>Bransiniz</Text>
                  <View style={s.chipAlan}>
                    {BRANSLAR.map(b => (
                      <TouchableOpacity key={b} style={[s.chip, kayitBrans === b && s.chipAktif]} onPress={() => setKayitBrans(b)}>
                        <Text style={[s.chipY, kayitBrans === b && s.chipYAktif]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
          <TouchableOpacity style={s.girisBtn} onPress={islemiTamamla}><Text style={s.anaBtnY}>DEVAM ET</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEkran('karsilama')}><Text style={{ textAlign: 'center', marginTop: 15, color: '#1B4965' }}>Geri</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (ekran === 'teklifver' && secilenIlan) {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Teklif Ver</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          <View style={s.kart}>
            <Text style={s.kategoriBadge}>{secilenIlan.kategori}</Text>
            <Text style={s.kartBaslik}>{secilenIlan.baslik}</Text>
            <Text style={s.kartAlt}>{secilenIlan.mahalle} - {secilenIlan.bolge}</Text>
            <Text style={s.kartAlt}>Is Tarihi: {secilenIlan.isTarihi}</Text>
            <View style={s.kartIstatistikler}>
              <Text style={s.kartIstatistikMetin}>Su an {secilenIlan.teklifler.length} teklif var</Text>
            </View>
          </View>
          <Text style={s.inputBaslik}>Fiyat Teklifiniz (TL)</Text>
          <TextInput style={s.inp} placeholder="Örn: 500" value={teklifFiyat} onChangeText={setTeklifFiyat} keyboardType="numeric" />
          <Text style={s.inputBaslik}>Kisa Not (Istege Bagli)</Text>
          <TextInput style={[s.inp, { height: 80, textAlignVertical: 'top' }]} placeholder="Örn: Ayni gün gelebilirim..." value={teklifNot} onChangeText={setTeklifNot} multiline />
          <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginVertical: 10 }}>
            <Text style={{ color: '#1B4965', fontSize: 13 }}>Fiyatiniz sadece musteri tarafindan görülecek. Musteri anlasirsa iletisim bilgileriniz paylasılacak.</Text>
          </View>
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => teklifGonder(secilenIlan.id)}>
            <Text style={s.anaBtnY}>TEKLIFI GÖNDER</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (ekran === 'teklifler' && secilenIlan) {
    const ilan = ilanlar.find(i => i.id === secilenIlan.id);
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Teklifler ({ilan?.teklifler.length})</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          <View style={[s.kart, { marginBottom: 20 }]}>
            <Text style={s.kartBaslik}>{ilan?.baslik}</Text>
            <Text style={s.kartAlt}>{ilan?.anlasmaVar ? 'ANLASMA SAGLANDI' : 'Aktif Ilan'}</Text>
          </View>
          {ilan?.anlasmaVar && (
            <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 15 }}>
              <Text style={{ color: '#588157', fontWeight: 'bold' }}>Anlasma saglandi! Diger ustalar bilgilendirildi.</Text>
            </View>
          )}
          {ilan?.teklifler.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz teklif gelmedi.</Text>
          ) : (
            ilan?.teklifler.map(teklif => (
              <View key={teklif.id} style={[s.kart, ilan.anlasilanUsta?.id === teklif.id && { borderWidth: 2, borderColor: '#588157' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965' }}>{teklif.ustaAd}</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#588157' }}>{teklif.fiyat}</Text>
                </View>
                {teklif.not ? <Text style={{ color: '#526E7F', marginTop: 5 }}>{teklif.not}</Text> : null}
                {ilan.anlasilanUsta?.id === teklif.id ? (
                  <View style={[s.girisBtn, { backgroundColor: '#588157', marginTop: 10 }]}>
                    <Text style={s.anaBtnY}>ANLASILDI - {teklif.telefon}</Text>
                  </View>
                ) : !ilan.anlasmaVar ? (
                  <TouchableOpacity style={[s.girisBtn, { marginTop: 10 }]} onPress={() => anlasmaYap(ilan.id, teklif)}>
                    <Text style={s.anaBtnY}>BU USTAYLA ANLAS</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[s.girisBtn, { backgroundColor: '#ccc', marginTop: 10 }]}>
                    <Text style={s.anaBtnY}>Baska Ustayla Anlasildi</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (ekran === 'ilanlarim') {
    const benimIlanlarim = rol === 'usta' ? ilanlar.filter(ilan => ilan.teklifler.some(t => t.ustaId === kullanici?.email)) : ilanlar.filter(ilan => ilan.sahip === kullanici?.email);
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>{rol === 'usta' ? 'Tekliflerim' : 'Ilanlarim'}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          {benimIlanlarim.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 30 }}>Henüz kayit yok.</Text>
          ) : (
            benimIlanlarim.map(item => {
              const tarihStil = getTarihStil(item.kalanGun);
              return (
                <TouchableOpacity key={item.id} style={s.kart} onPress={() => { setSecilenIlan(item); rol === 'musteri' ? setEkran('teklifler') : ustaTeklifTiklandi(item); }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={s.kategoriBadge}>{item.kategori}</Text>
                      <View style={[s.tarihBadge, { backgroundColor: tarihStil.bg }]}><Text style={{ color: tarihStil.text, fontSize: 10, fontWeight: 'bold' }}>{item.isTarihi}</Text></View>
                    </View>
                    <Text style={{ color: '#A3B1B9', fontSize: 12 }}>{item.sure}</Text>
                  </View>
                  <Text style={s.kartBaslik}>{item.baslik}</Text>
                  <Text style={s.kartAlt}>{item.mahalle} - {item.bolge}</Text>
                  {item.anlasmaVar && <Text style={{ color: '#588157', fontWeight: 'bold', marginTop: 5 }}>ANLASMA SAGLANDI</Text>}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (ekran === 'profil') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Profilim</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={s.scroll}>
          <TouchableOpacity style={s.profilResimSec} onPress={() => Alert.alert("Galeri", "Profil fotografı secme ekrani acildi.")}>
            <Text style={{ fontSize: 40 }}> 📷 </Text>
            <Text style={{ color: '#1B4965', fontWeight: 'bold', marginTop: 5, fontSize: 12 }}>Fotograf Yükle</Text>
          </TouchableOpacity>

          {/* İŞTE ABONELİK ROZETİ BURAYA GELDİ GARİ */}
          <View style={{ alignItems: 'center', marginTop: -10, marginBottom: 25 }}>
            <View style={{ 
              backgroundColor: kullanici?.abonelik ? '#FFF8E1' : '#E1E6EB', 
              borderColor: kullanici?.abonelik ? '#F39C12' : '#A3B1B9',
              borderWidth: 1,
              paddingHorizontal: 15, 
              paddingVertical: 6, 
              borderRadius: 20 
            }}>
              <Text style={{ 
                color: kullanici?.abonelik ? '#F39C12' : '#526E7F', 
                fontWeight: 'bold', 
                fontSize: 12 
              }}>
                {kullanici?.abonelik ? '👑 VIP (Sınırsız) Abonelik' : '📦 Standart Abonelik'}
              </Text>
            </View>
          </View>
          {/* ABONELİK ROZETİ BİTTİ */}

          {rol === 'usta' && (
            <>
              <Text style={s.inputBaslik}>Musteri Puan Ortalamaniz</Text>
              <View style={[s.inp, { backgroundColor: '#FFF8E1', borderColor: '#F39C12' }]}>
                <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 16 }}> ⭐  {kullanici?.puanOrtalamasi} / 5.0</Text>
              </View>
              <Text style={s.inputBaslik}>Hizmet Verilen Kategori (Meslek)</Text>
              <TextInput style={s.inp} placeholder="Örn: Tesisat, Boyaci" value={profilMeslek} onChangeText={setProfilMeslek} />
            </>
          )}
          <Text style={s.inputBaslik}>Ad Soyad</Text>
          <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={kullanici?.ad} editable={false} />
          <Text style={s.inputBaslik}>Email Adresi</Text>
          <TextInput style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]} value={kullanici?.email} editable={false} />
          <Text style={s.inputBaslik}>Telefon Numarasi</Text>
          <TextInput style={s.inp} placeholder="Örn: 0532 XXX XX XX" value={profilTel} onChangeText={setProfilTel} keyboardType="phone-pad" />
          <Text style={s.inputBaslik}>Bulundugu Konum (Ilce)</Text>
          <TextInput style={s.inp} placeholder="Örn: Milas, Yatagan..." value={profilBolge} onChangeText={setProfilBolge} />
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 10 }]} onPress={() => { setKullanici({ ...kullanici, telefon: profilTel, bolge: profilBolge, meslek: profilMeslek });
            Alert.alert("Basarili", "Profil bilgilerin kaydedildi!"); }}>
            <Text style={s.anaBtnY}>BILGILERI KAYDET</Text>
          </TouchableOpacity>
          <View style={s.ayracKoyu} />
          <Text style={s.baslikKucuk}>Is Gecmisi ve Degerlendirmeler</Text>
          {gecmisIsler.map(is => (
            <View key={is.id} style={s.gecmisKart}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 15, marginBottom: 3 }}>{is.baslik}</Text>
                <Text style={{ color: '#526E7F', fontSize: 12 }}>{is.kisi} - {is.durum}</Text>
              </View>
              {is.durum === 'Puan Bekliyor' && rol === 'musteri' ? (
                <TouchableOpacity style={s.puanlaBtnAcil} onPress={() => setEkran('puanla')}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>PUANLA</Text></TouchableOpacity>
              ) : (is.puan && <View style={s.puanBadge}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}> ⭐  {is.puan}</Text></View>)}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (ekran === 'bildirimler') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Bildirimler</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ padding: 20 }}>
          {bildirimler.map(b => (
            <TouchableOpacity key={b.id} style={[s.bildirimKart, !b.okundu && s.bildirimOkunmadi]} onPress={() => setBildirimler(bildirimler.map(item => item.id === b.id ? { ...item, okundu: true } : item))}>
              <Text style={s.bildirimMesaj}>{b.mesaj}</Text>
              <Text style={s.bildirimSure}>{b.sure}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (ekran === 'odeme') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.authIc}>
          <Text style={s.bas}>{rol === 'usta' ? 'Teklif Islemleri' : 'Ilan Islemleri'}</Text>
          {odemeAdim === 'secim' && (
            <>
              {kullanici?.yeniKullaniciHakki > 0 && (
                <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#f39c12', marginBottom: 15 }]} onPress={() => {
                  setKullanici({ ...kullanici, yeniKullaniciHakki: kullanici.yeniKullaniciHakki - 1, hak: kullanici.hak + (rol === 'usta' ? 3 : 1) });
                  Alert.alert("Hediye!", `Hak eklendi. Kalan: ${kullanici.yeniKullaniciHakki - 1}`); setEkran('anasayfa');
                }}>
                  <Text style={s.anaBtnY}>Yeni Kullanici Hediyesi (Kalan: {kullanici.yeniKullaniciHakki})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.anaBtn, { marginBottom: 15 }]} onPress={() => setOdemeAdim('kupon')}><Text style={s.anaBtnY}>Kupon Kodu Kullan</Text></TouchableOpacity>
              <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965' }]} onPress={() => setOdemeAdim('paket')}><Text style={s.anaBtnY}>Odeme Yap</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setEkran('anasayfa')}><Text style={s.vazgec}>Vazgec</Text></TouchableOpacity>
            </>
          )}
          {odemeAdim === 'kupon' && (
            <>
              <Text style={s.alt}>BAYRAM2026 Kontenjani: {KOD_LIMITI - toplamKullanim}</Text>
              <View style={s.kuponBolumu}>
                <TextInput style={s.kuponInp} placeholder="Kupon kodu..." value={kuponKod} onChangeText={setKuponKod} autoCapitalize="characters" />
                <TouchableOpacity style={s.kuponBtn} onPress={kuponUygula}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>UYGULA</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setOdemeAdim('secim')}><Text style={s.vazgec}>Geri Dön</Text></TouchableOpacity>
            </>
          )}
          {odemeAdim === 'paket' && (
            <>
              <TouchableOpacity style={s.anaBtn} onPress={() => setOdemeAdim('yontem')}><Text style={s.anaBtnY}>{rol === 'usta' ? '3 Teklif Hakki (50 TL)' : '1 Ilan Hakki (50 TL)'}</Text></TouchableOpacity>
              <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965', marginTop: 15 }]} onPress={() => {
                setKullanici({ ...kullanici, abonelik: true }); Alert.alert('Basarili', 'Aylik sinırsız aktif!');
                setEkran('anasayfa');
              }}>
                <Text style={s.anaBtnY}>Aylik Sinırsiz (100 TL)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOdemeAdim('secim')}><Text style={s.vazgec}>Geri Dön</Text></TouchableOpacity>
            </>
          )}
          {odemeAdim === 'yontem' && (
            <>
              <TouchableOpacity style={s.anaBtn} onPress={() => {
                setKullanici({ ...kullanici, hak: kullanici.hak + (rol === 'usta' ? 3 : 1) });
                Alert.alert('Basarili', 'Mobil odeme tamam.'); setEkran('anasayfa');
              }}><Text style={s.anaBtnY}>Mobil Odeme ile Al</Text></TouchableOpacity>
              <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965', marginTop: 15 }]} onPress={() => {
                setKullanici({ ...kullanici, hak: kullanici.hak + (rol === 'usta' ? 3 : 1) });
                Alert.alert('Basarili', 'Kart ile odeme tamam.'); setEkran('anasayfa');
              }}><Text style={s.anaBtnY}>Kredi / Banka Karti ile Al</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setOdemeAdim('paket')}><Text style={s.vazgec}>Geri Dön</Text></TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (ekran === 'sohbet') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Detay ve Pazarlik</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ flex: 1, padding: 15 }}>
          <View style={s.mesajSol}><Text style={s.mesajText}>Ilan detaylari burada yer alacak.</Text></View>
          {anlasmaSaglandi && <View style={s.numaraKutu}><Text style={s.numaraText}>ANLASILDI: {aktifSohbetTeklif?.telefon}</Text></View>}
        </ScrollView>
        <View style={s.mesajInputAlan}>
          <TouchableOpacity style={s.fotoBtnMesaj} onPress={() => Alert.alert("Galeri", "Foto acildi.")}><Text style={{ fontSize: 22 }}> 📷 </Text></TouchableOpacity>
          <TextInput style={s.mesajInp} placeholder="Mesaj yaz..." value={sohbetMesaj} onChangeText={setSohbetMesaj} />
          <TouchableOpacity style={s.gonderBtn} onPress={() => setSohbetMesaj('')}><Text style={{ color: '#FFF' }}>GÖNDER</Text></TouchableOpacity>
        </View>
        {!anlasmaSaglandi ? (
          rol === 'musteri' && (
            <TouchableOpacity style={s.anlasBtnSohbet} onPress={() => aktifSohbetTeklif && anlasmaYap(secilenIlan?.id, aktifSohbetTeklif)}>
              <Text style={s.anlasBtnY}>ANLAS VE NUMARAYI GÖR</Text>
            </TouchableOpacity>
          )
        ) : (
          rol === 'musteri' ? (
            <TouchableOpacity style={[s.anlasBtnSohbet, { backgroundColor: '#588157' }]} onPress={() => setEkran('puanla')}>
              <Text style={s.anlasBtnY}>IS BITTI,PUANLA</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.anlasBtnSohbet, { backgroundColor: '#588157' }]}>
              <Text style={s.anlasBtnY}>MUSTERI SIZINLE ANLASTI</Text>
            </View>
          )
        )}
      </SafeAreaView>
    );
  }

  if (ekran === 'puanla') {
    return (
      <SafeAreaView style={s.con}>
        <ScrollView contentContainerStyle={s.authIc}>
          <Text style={s.bas}>Puanla ve Yorumla</Text>
          <TextInput style={s.inp} placeholder="Puan (1-10)" value={puan} onChangeText={setPuan} keyboardType="numeric" />
          <TextInput style={[s.inp, { height: 80 }]} placeholder="Yorumunuz..." value={yorum} onChangeText={setYorum} multiline />
          <TouchableOpacity style={s.girisBtn} onPress={() => {
            setAnlasmaSaglandi(false);
            setGecmisIsler(gecmisIsler.map(is => is.durum === 'Puan Bekliyor' ? { ...is, durum: 'Tamamlandi', puan: puan || 10 } : is)); setEkran('anasayfa');
          }}>
            <Text style={s.anaBtnY}>GÖNDER</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- BURADAN BAŞLAYARAK YAPIŞTIR GARİ ---

  if (ekran === 'hakkimizda') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Hakkımızda</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 80, height: 80 }} resizeMode="contain" />
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#1B4965', letterSpacing: 2, fontFamily: 'serif', marginTop: 10 }}>GAYIT</Text>
            <Text style={{ color: '#8B7355', fontSize: 12, fontStyle: 'italic' }}>Muğla'nın bütün işi gaydı artık burada</Text>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Biz Kimiz?</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>GAYIT, Muğla ve ilçelerindeki yerel hizmet ağını dijitalleştirmek amacıyla kurulmuş yerli bir platformdur. Amacımız, işini layıkıyla yapan bölge ustalarımızı hemşehrilerimizle en şeffaf şekilde buluşturmaktır.</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Logomuzdaki Bacanın Sırrı</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>"G" harfimize gizlenmiş o meşhur Muğla bacası; sıcaklığımızı, tüten ocaklarımızın bereketini ve ustalarımızın sağlamlığını temsil eder. O bacanın tüttüğü her haneye güvenilir hizmet ulaştırmak için buradayız.</Text>
          <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 40, alignItems: 'center' }}>
            <Text style={{ color: '#588157', fontWeight: 'bold', fontSize: 14 }}>Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz.</Text>
            <Text style={{ color: '#588157', fontSize: 12, marginTop: 5 }}>© 2026 GAYIT Tüm Hakları Saklıdır.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

 if (ekran === 'hizmet_kosullari') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
            <Text style={s.menuSimge}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerBaslik}>Hizmet Koşulları</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ padding: 20 }}>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>1. Hizmetin Tanımı</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>
            GAYIT, Muğla ilindeki hizmet alanlar (Müşteri) ile hizmet verenleri (Usta) bir araya getiren dijital bir pazar yeridir. GAYIT, taraflar arasında sadece bir köprüdür; verilen hizmetin bizzat tarafı veya garantörü değildir.
          </Text>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>2. Üyelik ve Abonelik</Text>
          <Text style={{ color: '#526E7F', marginBottom: 5, lineHeight: 22 }}>• Uygulamaya kayıt olan her kullanıcı verdiği bilgilerin doğruluğundan sorumludur.</Text>
          <Text style={{ color: '#526E7F', marginBottom: 5, lineHeight: 22 }}>• <Text style={{fontWeight: 'bold'}}>Standart Üyelik:</Text> Kullanıcılara sınırlı ilan verme veya teklif sunma hakkı tanır.</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>• <Text style={{fontWeight: 'bold'}}>VIP (Sınırsız) Abonelik:</Text> Ücret karşılığında veya kampanya kodlarıyla tanımlanır ve kullanıcıya belirlenen süre boyunca sınırsız işlem hakkı verir.</Text>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>3. Sorumluluk Sınırları</Text>
          <Text style={{ color: '#526E7F', marginBottom: 5, lineHeight: 22 }}>• Usta tarafından sunulan hizmetin kalitesi, süresi ve güvenliği tamamen Usta’nın sorumluluğundadır. GAYIT, işçilik kusurlarından veya uyuşmazlıklardan sorumlu tutulamaz gari.</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>• Müşteri ve Usta arasındaki pazarlık ve ödeme süreci tamamen tarafların kendi aralarındaki anlaşmaya bağlıdır.</Text>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>4. İlan ve Teklif Kuralları</Text>
          <Text style={{ color: '#526E7F', marginBottom: 5, lineHeight: 22 }}>• Yanıltıcı, yasal olmayan veya genel ahlaka aykırı ilanlar silinir.</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>• Sistem üzerinden paylaşılan telefon numaraları ve kişisel veriler, sadece ilgili işin çözümü için kullanılmalıdır.</Text>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>5. Cayma ve İade</Text>
          <Text style={{ color: '#526E7F', marginBottom: 20, lineHeight: 22 }}>
            Dijital olarak tanımlanan "İş Hakkı" veya "VIP Abonelik" işlemleri, kullanıma başlandığı anda iade kapsamı dışındadır.
          </Text>

          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 5 }}>6. Değişiklik Hakları</Text>
          <Text style={{ color: '#526E7F', marginBottom: 40, lineHeight: 22 }}>
            GAYIT, uygulama içindeki ücretlendirme, hak sistemi ve kullanım koşullarında önceden haber vermeksizin değişiklik yapma hakkını saklı tutar.
          </Text>

        </ScrollView>
      </SafeAreaView>
    );
  }
  if (ekran === 'ayarlar') {
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}><Text style={s.menuSimge}>←</Text></TouchableOpacity>
          <Text style={s.headerBaslik}>Ayarlar</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ padding: 20 }}>
          
          {/* 1. BİLDİRİM AYARLARI */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 10, marginLeft: 5 }}>Bildirim Ayarları</Text>
          <View style={{ backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 25, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ color: '#526E7F', fontSize: 15, fontWeight: '500' }}>Yeni İş / Teklif Bildirimleri</Text>
              <Switch value={bildirimAcik} onValueChange={setBildirimAcik} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
            </View>
            <View style={{ height: 1, backgroundColor: '#F2F4F7', marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#526E7F', fontSize: 15, fontWeight: '500' }}>Sohbet & Mesaj Bildirimleri</Text>
              <Switch value={mesajBildirimAcik} onValueChange={setMesajBildirimAcik} trackColor={{ false: '#D1D9E0', true: '#588157' }} thumbColor="#FFF" />
            </View>
          </View>

          {/* 2. GÖRÜNÜM AYARLARI */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 10, marginLeft: 5 }}>Görünüm</Text>
          <View style={{ backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 25, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#526E7F', fontSize: 15, fontWeight: '500' }}>Karanlık Mod 🌙</Text>
              <Switch value={karanlikMod} onValueChange={(val) => { 
                setKaranlikMod(val); 
                if(val) Alert.alert("Bilgi", "Karanlık mod tasarımı yakında aktif olacak gari!"); 
              }} trackColor={{ false: '#D1D9E0', true: '#1B4965' }} thumbColor="#FFF" />
            </View>
          </View>

          {/* 3. HESAP İŞLEMLERİ */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 10, marginLeft: 5 }}>Hesap Güvenliği</Text>
          <View style={{ backgroundColor: '#FFF', borderRadius: 15, padding: 5, marginBottom: 25, elevation: 2 }}>
            <TouchableOpacity style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' }} onPress={() => Alert.alert('Şifre', 'Şifre sıfırlama bağlantısı e-postanıza gönderilecek.')}>
              <Text style={{ color: '#1B4965', fontSize: 15, fontWeight: '500' }}>Şifre Değiştir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 15 }} onPress={() => Alert.alert('Emin misin?', 'Hesabını silersen tüm geçmiş işlerin ve tekliflerin silinir gari. Yine de silinsin mi?', [{text: 'Vazgeç', style: 'cancel'}, {text: 'Hesabı Sil', style: 'destructive'}])}>
              <Text style={{ color: '#FF4444', fontSize: 15, fontWeight: 'bold' }}>Hesabı Sil</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 10, marginBottom: 40, fontSize: 12 }}>GAYIT App v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.con}>
      {menuAcik && <SolMenu />}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setMenuAcik(true)}><Text style={s.menuSimge}> ☰ </Text></TouchableOpacity>

        { /* Anasayfa Şov: G + AYIT */ }
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={{ uri: 'https://i.ibb.co/2RcsY8P/lv-0-20260502100751.png' }} style={{ width: 70, height: 70 }} resizeMode="contain" />
          <Text style={{
            fontSize: 15,
            fontWeight: '700',
            color: '#1B4965',
            letterSpacing: 2,
            marginLeft: -15,
            marginTop: 15,
            fontFamily: 'serif'
          }}>AYIT</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setFiltreAcik(!filtreAcik)} style={{ marginRight: 20 }}>
            <Text style={{ fontSize: 20 }}> 🔽 </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEkran('bildirimler')} style={{ position: 'relative' }}>
            <Text style={s.zilSimge}> 🔔 </Text>
            {bildirimler.some(b => !b.okundu) && <View style={s.bildirimNokta} />}
          </TouchableOpacity>
        </View>
      </View>
      {filtreAcik && (
        <View style={s.filtreDropdown}>
          <Text style={s.filtreBaslik}>Kategori Sec</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {KATEGORILER.map(k => (
              <TouchableOpacity key={k} onPress={() => { setSeciliKategori(k); setFiltreAcik(false); }} style={[s.filtreItem, seciliKategori === k && s.filtreItemAktif]}>
                <Text style={{ color: seciliKategori === k ? '#FFF' : '#1B4965', fontWeight: 'bold' }}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* İŞTE O EFSANE YENİLEME KONTROLÜ (RefreshControl) BURADA GARİ */}
      <ScrollView 
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl 
            refreshing={yenileniyor} 
            onRefresh={onYenile} 
            colors={['#1B4965']} 
          />
        }
      >
        <View style={s.istatistikPanel}>
          <View style={s.istatistikKutu}><Text style={s.istatistikBaslik}>Toplam iş</Text><Text style={s.istatistikSayi}>12.450</Text></View>
          <View style={s.istatistikCizgi} />
          <View style={s.istatistikKutu}><Text style={s.istatistikBaslik}>Günlük iş</Text><Text style={[s.istatistikSayi, { color: '#588157' }]}>142</Text></View>
        </View>
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={s.bas}>{kullanici?.bolge} Ilanlari</Text>
            <Text style={{ color: '#526E7F', fontWeight: 'bold' }}>{rol === 'usta' && seciliKategori === 'Tümü' ? kullanici?.meslek : seciliKategori}</Text>
          </View>
          {rol === 'musteri' && (
            <TouchableOpacity style={s.girisBtn} onPress={() => {
              if (kullanici?.hak > 0 || kullanici?.abonelik || kullanici?.yeniKullaniciHakki > 0) { setEkran('ilanver'); } else { setOdemeAdim('secim'); setEkran('odeme'); }
            }}>
              <Text style={s.anaBtnY}>YENI ILAN YAYINLA</Text>
            </TouchableOpacity>
          )}

          {anasayfaIlanlari.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 30, color: '#A3B1B9' }}>Bölgene uygun acik is yok.</Text>
          ) : (
            <FlatList data={anasayfaIlanlari} keyExtractor={item => item.id} scrollEnabled={false} style={{ marginTop: rol === 'müşteri' ?
            20 : 0 }} renderItem={({ item }) => {
              const tarihStil = getTarihStil(item.kalanGun);
              return (
                <View style={[s.kart, item.anlasmaVar && { opacity: 0.6 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={s.kategoriBadge}>{item.kategori}</Text>
                      <View style={[s.tarihBadge, { backgroundColor: tarihStil.bg }]}><Text style={{ color: tarihStil.text, fontSize: 10, fontWeight: 'bold' }}>{item.isTarihi}</Text></View>
                    </View>
                    <Text style={{ color: '#A3B1B9', fontSize: 12 }}>{item.sure}</Text>
                  </View>
                  <Text style={s.kartBaslik}>{item.baslik}</Text>
                  <Text style={s.kartAlt}> 📍  {item.mahalle} Mah. - {item.bolge}</Text>
                  {item.anlasmaVar ? (
                    <Text style={{ color: '#588157', fontWeight: 'bold', marginTop: 8 }}>ANLASMA SAGLANDI</Text>
                  ) : (
                    <View style={s.kartIstatistikler}>
                      <Text style={s.kartIstatistikMetin}>{item.teklifler?.length || 0}Teklif</Text>
                      <Text style={s.kartIstatistikMetin}>{item.ustaGoruntulenme || 0}Usta Inceledi</Text>
                    </View>
                  )}
                  {rol === 'usta' && !item.anlasmaVar && (
                    <TouchableOpacity style={s.ustaTeklifBtn} onPress={() => ustaTeklifTiklandi(item)}>
                      <Text style={s.ustaTeklifBtnYazi}>HEMEN TEKLIF VER</Text>
                    </TouchableOpacity>
                  )}
                  {rol === 'musteri' && item.sahip === kullanici?.email && item.teklifler.length > 0 && !item.anlasmaVar && (
                    <TouchableOpacity style={[s.ustaTeklifBtn, { backgroundColor: '#1B4965' }]} onPress={() => { setSecilenIlan(item); setEkran('teklifler'); }}>
                      <Text style={s.ustaTeklifBtnYazi}>{item.teklifler.length} TEKLIF GELDI - INCELE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  con: { flex: 1, backgroundColor: '#F2F4F7' },
  ic: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 40 },
  logoText: { fontSize: 42, fontWeight: '900', color: '#1B4965', letterSpacing: 4 },
  btnAlan: { width: '100%', padding: 20, gap: 15 },
  anaBtn: { padding: 20, borderRadius: 20, backgroundColor: '#588157', alignItems: 'center', elevation: 5 },
  anaBtnY: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  authIc: { padding: 30, gap: 15, flexGrow: 1, justifyContent: 'center' },
  bas: { fontSize: 22, fontWeight: 'bold', color: '#1B4965' },
  baslikKucuk: { fontSize: 16, fontWeight: 'bold', color: '#1B4965', marginBottom: 15 },
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: '#FFF', zIndex: 10 },
  headerGeriBtn: { padding: 10, marginLeft: -10, justifyContent: 'center' },
  headerLogo: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1B6B6B', justifyContent: 'center', alignItems: 'center' },
  headerLogoHarf: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  menuSimge: { fontSize: 28, color: '#1B4965' },
  headerBaslik: { fontSize: 20, fontWeight: '900', color: '#1B4965', letterSpacing: 2 },
  zilSimge: { fontSize: 24 },
  bildirimNokta: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4444', borderWidth: 1, borderColor: '#FFF' },
  bildirimKart: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  bildirimOkunmadi: { backgroundColor: '#E1F2FE', borderColor: '#1B4965' },
  bildirimMesaj: { color: '#1B4965', fontSize: 14, fontWeight: '500' },
  bildirimSure: { color: '#A3B1B9', fontSize: 11, marginTop: 5, textAlign: 'right' },
  filtreDropdown: { backgroundColor: '#FFF', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', zIndex: 5 },
  filtreBaslik: { fontSize: 12, color: '#A3B1B9', fontWeight: 'bold', marginBottom: 10 },
  filtreItem: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#F2F4F7', borderRadius: 20, marginRight: 10 },
  filtreItemAktif: { backgroundColor: '#588157' },
  fotoEkleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E1E6EB', padding: 15, borderRadius: 12, marginBottom: 15, borderStyle: 'dashed', borderWidth: 2, borderColor: '#A3B1B9' },
  profilResimSec: { alignSelf: 'center', backgroundColor: '#E1E6EB', width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#A3B1B9', borderStyle: 'dashed' },
  gecmisKart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  puanlaBtnAcil: { backgroundColor: '#FF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  puanBadge: { backgroundColor: '#588157', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  ayracKoyu: { height: 1, backgroundColor: '#D1D9E0', marginVertical: 20 },
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
  kuponBolumu: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 15 },
  kuponInp: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D1D9E0' },
  kuponBtn: { backgroundColor: '#1B4965', padding: 12, borderRadius: 10, justifyContent: 'center' },
  vazgec: { textAlign: 'center', marginTop: 15, color: '#FF4444' },
  mesajSol: { backgroundColor: '#E1E6EB', padding: 15, borderRadius: 15, alignSelf: 'flex-start', maxWidth: '85%', marginBottom: 10 },
  mesajText: { color: '#1B4965' },
  mesajInputAlan: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  mesajInp: { flex: 1, backgroundColor: '#F2F4F7', padding: 12, borderRadius: 20, marginRight: 10, color: '#1B4965' },
  fotoBtnMesaj: { justifyContent: 'center', paddingHorizontal: 10 },
  gonderBtn: { backgroundColor: '#1B4965', paddingHorizontal: 15, borderRadius: 20, justifyContent: 'center' },
  anlasBtnSohbet: { backgroundColor: '#1B4965', padding: 20, alignItems: 'center' },
  anlasBtnY: { color: '#FFF', fontWeight: 'bold' },
  numaraKutu: { backgroundColor: '#588157', padding: 15, borderRadius: 15, marginTop: 10, alignItems: 'center' },
  numaraText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  kart: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 3 },
  kategoriBadge: { backgroundColor: '#E1F2FE', color: '#1B4965', padding: 5, borderRadius: 8, alignSelf: 'flex-start', fontSize: 10, fontWeight: 'bold' },
  tarihBadge: { padding: 5, borderRadius: 8, alignSelf: 'flex-start' },
  kartBaslik: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  kartAlt: { color: '#526E7F', fontSize: 13, marginTop: 5 },
  kartIstatistikler: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F2F4F7' },
  kartIstatistikMetin: { color: '#A3B1B9', fontSize: 12, fontWeight: 'bold' },
  ustaTeklifBtn: { backgroundColor: '#588157', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  ustaTeklifBtnYazi: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  scroll: { padding: 20 },
  menuItem: { paddingVertical: 2 },
  karsilamaLogo: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1B6B6B', justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 8 },
  karsilamaGHarf: { color: '#FFF', fontSize: 52, fontWeight: '900' },
  splashLogo: { marginBottom: 20 },
  splashG: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1B6B6B', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  splashGHarf: { color: '#F5F5F0', fontSize: 72, fontWeight: '900' },
  splashEv: { position: 'absolute', top: 8, right: 20 },
  splashCati: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#F5F5F0' },
  splashDuvar: { width: 14, height: 10, backgroundColor: '#F5F5F0', alignSelf: 'center' },
  splashDuman1: { position: 'absolute', top: 2, right: 24, width: 3, height: 10, backgroundColor: 'rgba(245,245,240,0.5)', borderRadius: 2 },
  splashDuman2: { position: 'absolute', top: 0, right: 28, width: 3, height: 8, backgroundColor: 'rgba(245,245,240,0.3)', borderRadius: 2 },
  splashBaslik: { fontSize: 52, fontWeight: '900', color: '#1B4965', letterSpacing: 6, marginBottom: 8 },
  splashAlt: { fontSize: 14, color: '#8B7355', fontStyle: 'italic', marginBottom: 30 },
  splashAraçlar: { flexDirection: 'row', marginTop: 10 },
});


