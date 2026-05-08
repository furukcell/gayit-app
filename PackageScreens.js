// ============================================================
// ADIM 9 — PackageScreens.js
// Ödeme, Paket, Kupon, Davet, Ayarlar, Hakkımızda,
// Hizmet Koşulları, İletişim, Bildirim ekranları
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Switch, Linking, Share, Clipboard, Modal, StyleSheet
} from 'react-native';
import { DB_URL, API_KEY, referansKoduOlustur, zamanFarki } from './constants';

// ============================================================
// ÖDEME & PAKET EKRANI
// ============================================================
export function OdemeEkrani({ kullanici, setKullanici, token, rol, setEkran, s }) {
  const [odemeAdim, setOdemeAdim] = useState('secim');
  const [kuponKod, setKuponKod] = useState('');
  const [kuponMesaj, setKuponMesaj] = useState(null);
  const [iptalModalAcik, setIptalModalAcik] = useState(false);
  const [iptalSifre, setIptalSifre] = useState('');
  const [iptalYukleniyor, setIptalYukleniyor] = useState(false);

  const kuponUygula = async () => {
    if (!kuponKod.trim()) return;
    try {
      const res = await fetch(`${DB_URL}/kuponlar.json`);
      const data = await res.json();

      if (!data) {
        setKuponMesaj({ tip: 'hata', metin: '❌ Geçersiz kupon kodu.' });
        setTimeout(() => setKuponMesaj(null), 2500);
        return;
      }

      const kuponEntry = Object.entries(data).find(
        ([, k]) => k.ad === kuponKod.trim().toUpperCase() && k.aktif
      );

      if (!kuponEntry) {
        setKuponMesaj({ tip: 'hata', metin: '❌ Geçersiz veya pasif kupon kodu.' });
        setTimeout(() => setKuponMesaj(null), 2500);
        return;
      }

      const [kuponId, kupon] = kuponEntry;

      if (kupon.bitisTarihi && Date.now() > kupon.bitisTarihi) {
        setKuponMesaj({ tip: 'hata', metin: '❌ Bu kuponun süresi dolmuş.' });
        setTimeout(() => setKuponMesaj(null), 2500);
        return;
      }

      if (kupon.kullanilanAdet >= kupon.adet) {
        setKuponMesaj({ tip: 'hata', metin: '❌ Bu kuponun kullanım hakkı dolmuş.' });
        setTimeout(() => setKuponMesaj(null), 2500);
        return;
      }

      if (kupon.hedef !== 'hepsi' && kupon.hedef !== rol) {
        setKuponMesaj({ tip: 'hata', metin: `❌ Bu kupon sadece ${kupon.hedef === 'usta' ? 'ustalar' : 'müşteriler'} için geçerli.` });
        setTimeout(() => setKuponMesaj(null), 2500);
        return;
      }

      const yeniHak = (kullanici?.hak || 0) + (kupon.icerik || 1);
      setKullanici({ ...kullanici, hak: yeniHak });

      if (token && kullanici?.uid) {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hak: yeniHak }),
        });
      }

      await fetch(`${DB_URL}/kuponlar/${kuponId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kullanilanAdet: (kupon.kullanilanAdet || 0) + 1 }),
      });

      setKuponMesaj({ tip: 'basarili', metin: `🎉 Kupon uygulandı! ${kupon.icerik} hak eklendi.` });
      setTimeout(() => setEkran('anasayfa'), 2000);

    } catch (e) {
      setKuponMesaj({ tip: 'hata', metin: '❌ Bağlantı hatası, tekrar dene.' });
      setTimeout(() => setKuponMesaj(null), 2500);
    }
  };

  // Yeni paket satın alma fonksiyonu (Müşteri ve Usta için)
  const paketSatinAl = async (paketTipi) => {
    let yeniHak = kullanici?.hak || 0;
    let abonelikAyarla = false;
    let otuzGunSonra = null;
    let mesaj = '';

    if (rol === 'usta') {
      if (paketTipi === 'baslangic') {
        yeniHak += 3;
        mesaj = '3 adet teklif verme hakkı tanımlandı!';
      } else if (paketTipi === 'premium') {
        yeniHak += 30;
        abonelikAyarla = true;
        otuzGunSonra = Date.now() + 2592000000;
        mesaj = 'Aylık 30 teklif hakkı ve reklamsız aboneliğiniz aktifleştirildi!';
      } else if (paketTipi === 'vip') {
        abonelikAyarla = true;
        otuzGunSonra = Date.now() + 2592000000;
        mesaj = 'Aylık VIP (Sınırsız Teklif) aboneliğiniz aktifleştirildi!';
      }
    } else {
      // Müşteri
      if (paketTipi === 'tekli') {
        yeniHak += 1;
        mesaj = '1 adet ilan verme hakkı tanımlandı!';
      } else if (paketTipi === 'acil') {
         // Acil ilan mantığını mevcut veritabanınıza göre uyarlamalısınız.
         // Şimdilik sadece bildirim gösteriyoruz.
         mesaj = 'Acil ilan hakkınız tanımlandı!';
      } else if (paketTipi === 'premium') {
        yeniHak += 10;
        abonelikAyarla = true;
        otuzGunSonra = Date.now() + 2592000000;
        mesaj = 'Aylık Premium (10 Normal + 2 Acil) aboneliğiniz aktifleştirildi!';
      } else if (paketTipi === 'vip') {
        abonelikAyarla = true;
        otuzGunSonra = Date.now() + 2592000000;
        mesaj = 'Aylık VIP (Sınırsız İlan + 4 Acil) aboneliğiniz aktifleştirildi!';
      }
    }

    setKullanici({ ...kullanici, hak: yeniHak, ...(abonelikAyarla && { abonelik: true, abonelikBitis: otuzGunSonra }) });

    if (token && kullanici?.uid) {
      let guncellenecekVeri = { hak: yeniHak };
      if (abonelikAyarla) {
        guncellenecekVeri.abonelik = true;
        guncellenecekVeri.abonelikBitis = otuzGunSonra;
      }

      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guncellenecekVeri),
      });
    }

    Alert.alert('Başarılı! ✅', mesaj);
    setEkran('anasayfa');
  };

  const abonelikIptalEt = async () => {
    if (!iptalSifre.trim()) {
      Alert.alert('Hata', 'Şifreni gir gari!');
      return;
    }
    setIptalYukleniyor(true);
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: kullanici.email, password: iptalSifre, returnSecureToken: false }),
        }
      );
      const data = await res.json();
      if (data.error) {
        Alert.alert('Hata', 'Şifre yanlış usta!');
        return;
      }
      setKullanici({ ...kullanici, abonelik: false, abonelikBitis: null });
      if (token && kullanici?.uid) {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ abonelik: false, abonelikBitis: null }),
        });
      }
      setIptalModalAcik(false);
      setIptalSifre('');
      Alert.alert('İptal Edildi', 'Aboneliğin iptal edildi usta.');
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası!');
    } finally {
      setIptalYukleniyor(false);
    }
  };

  if (kullanici?.abonelik) {
    const bitisStr = kullanici?.abonelikBitis
      ? new Date(kullanici.abonelikBitis).toLocaleDateString('tr-TR')
      : '—';
    return (
      <SafeAreaView style={s.con}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
            <Text style={s.menuSimge}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerBaslik}>Aboneliğim</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ backgroundColor: '#1B4965', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 25 }}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>👑</Text>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 5 }}>VIP / Premium Abone</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Abonelik bitiş: {bitisStr}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              Aboneliğin avantajlarını kullanıyorsun usta!
            </Text>
          </View>

          <TouchableOpacity
            style={[s.girisBtn, { backgroundColor: '#FF4444' }]}
            onPress={() => setIptalModalAcik(true)}
          >
            <Text style={s.anaBtnY}>🚫 ABONELİĞİ İPTAL ET</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={iptalModalAcik} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 30 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF4444', textAlign: 'center', marginBottom: 5 }}>
                🚫 Aboneliği İptal Et
              </Text>
              <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 20 }}>
                Onaylamak için hesap şifreni gir.
              </Text>
              <TextInput
                style={s.inp}
                placeholder="Şifreniz"
                value={iptalSifre}
                onChangeText={setIptalSifre}
                secureTextEntry
              />
              <TouchableOpacity
                style={[s.girisBtn, { backgroundColor: '#FF4444', opacity: iptalYukleniyor ? 0.7 : 1 }]}
                onPress={abonelikIptalEt}
                disabled={iptalYukleniyor}
              >
                <Text style={s.anaBtnY}>{iptalYukleniyor ? 'İşleniyor...' : 'ONAYLA, İPTAL ET'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIptalModalAcik(false); setIptalSifre(''); }} style={{ marginTop: 15, alignItems: 'center' }}>
                <Text style={{ color: '#526E7F' }}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Paket & Kupon</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {odemeAdim === 'secim' && (
          <>
            <TouchableOpacity style={[s.anaBtn, { marginBottom: 15 }]} onPress={() => setOdemeAdim('kupon')}>
              <Text style={s.anaBtnY}>🎫 Kupon Kodu Kullan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.anaBtn, { backgroundColor: '#1B4965' }]} onPress={() => setOdemeAdim('paket')}>
              <Text style={s.anaBtnY}>💳 Fiyatlar ve Paketler</Text>
            </TouchableOpacity>
          </>
        )}

        {odemeAdim === 'kupon' && (
          <>
            <Text style={[s.bas, { marginBottom: 10, textAlign: 'center' }]}>Kupon Kodunu Girin</Text>
            {kuponMesaj && (
              <View style={{
                backgroundColor: kuponMesaj.tip === 'basarili' ? '#588157' : '#E74C3C',
                borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center'
              }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{kuponMesaj.metin}</Text>
              </View>
            )}
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
            <TouchableOpacity onPress={() => setOdemeAdim('secim')} style={{ marginTop: 20 }}>
              <Text style={[s.vazgec, { textAlign: 'center' }]}>Geri Dön</Text>
            </TouchableOpacity>
          </>
        )}

        {odemeAdim === 'paket' && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1B4965', marginBottom: 20, textAlign: 'center' }}>
              İhtiyacınıza Uygun Paketi Seçin
            </Text>

            {/* MÜŞTERİ PAKETLERİ */}
            {rol !== 'usta' && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Tekli İlan</Text>
                  <Text style={styles.cardPrice}>50 TL</Text>
                  <Text style={styles.cardDesc}>Sadece tek seferlik normal ilan ücreti.</Text>
                  <TouchableOpacity style={styles.cardBtn} onPress={() => paketSatinAl('tekli')}>
                    <Text style={styles.cardBtnText}>Satın Al</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Acil İlan</Text>
                  <Text style={styles.cardPrice}>100 TL</Text>
                  <Text style={styles.cardDesc}>İlanınız 'Acil İlan' kategorisinde listelensin ve en üstte yer alsın.</Text>
                  <TouchableOpacity style={styles.cardBtn} onPress={() => paketSatinAl('acil')}>
                    <Text style={styles.cardBtnText}>Satın Al</Text>
                  </TouchableOpacity>
                </View>

                {/* PREMIUM - POPÜLER */}
                <View style={[styles.card, styles.premiumCard]}>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>🌟 EN ÇOK TERCİH EDİLEN</Text>
                  </View>
                  <Text style={styles.cardTitle}>Premium Abonelik</Text>
                  <Text style={styles.cardPrice}>200 TL <Text style={{fontSize: 16, color: '#666'}}>/Ay</Text></Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• Ayda 10 normal ilan hakkı</Text>
                    <Text style={styles.listItem}>• Ayda 2 acil ilan hakkı</Text>
                    <Text style={styles.listItem}>• Reklamsız erişim</Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <TouchableOpacity style={[styles.cardBtn, {backgroundColor: '#588157'}]} onPress={() => paketSatinAl('premium')}>
                    <Text style={styles.cardBtnText}>Abone Ol</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>VIP Abonelik</Text>
                  <Text style={styles.cardPrice}>400 TL <Text style={{fontSize: 16, color: '#666'}}>/Ay</Text></Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• Sınırsız ilan hakkı</Text>
                    <Text style={styles.listItem}>• 4 acil ilan hakkı</Text>
                    <Text style={styles.listItem}>• Reklamsız erişim</Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <TouchableOpacity style={styles.cardBtn} onPress={() => paketSatinAl('vip')}>
                    <Text style={styles.cardBtnText}>Abone Ol</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* USTA PAKETLERİ */}
            {rol === 'usta' && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Başlangıç Paketi</Text>
                  <Text style={styles.cardPrice}>50 TL</Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• 3 Adet Teklif Verme Hakkı</Text>
                    <Text style={styles.listItem}>• Sistemi denemek ve ilk işlerini kapmak isteyen ustalar için ideal.</Text>
                  </View>
                  <TouchableOpacity style={styles.cardBtn} onPress={() => paketSatinAl('baslangic')}>
                    <Text style={styles.cardBtnText}>Satın Al</Text>
                  </TouchableOpacity>
                </View>

                {/* PREMIUM - POPÜLER */}
                <View style={[styles.card, styles.premiumCard]}>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>🌟 EN ÇOK TERCİH EDİLEN</Text>
                  </View>
                  <Text style={styles.cardTitle}>Premium Usta</Text>
                  <Text style={styles.cardPrice}>200 TL <Text style={{fontSize: 16, color: '#666'}}>/Ay</Text></Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• 30 Adet Teklif Verme Hakkı</Text>
                    <Text style={styles.listItem}>• Reklamsız kullanım</Text>
                    <Text style={styles.listItem}>• İşlerini büyütmek isteyen profesyonel ustalar için (Teklif başı maliyet sadece ~6.6 TL!)</Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <TouchableOpacity style={[styles.cardBtn, {backgroundColor: '#588157'}]} onPress={() => paketSatinAl('premium')}>
                    <Text style={styles.cardBtnText}>Abone Ol</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>VIP Usta</Text>
                  <Text style={styles.cardPrice}>400 TL <Text style={{fontSize: 16, color: '#666'}}>/Ay</Text></Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• Sınırsız Teklif Verme Hakkı</Text>
                    <Text style={styles.listItem}>• Reklamsız kullanım</Text>
                    <Text style={styles.listItem}>• Muğla piyasasını domine et, hiçbir işi kaçırma!</Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <TouchableOpacity style={styles.cardBtn} onPress={() => paketSatinAl('vip')}>
                    <Text style={styles.cardBtnText}>Abone Ol</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity onPress={() => setOdemeAdim('secim')} style={{ marginTop: 20, marginBottom: 40 }}>
              <Text style={[s.vazgec, { textAlign: 'center', fontSize: 16 }]}>← Geri Dön</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  premiumCard: {
    borderColor: '#588157',
    borderWidth: 2,
    position: 'relative',
    marginTop: 15,
  },
  popularBadge: {
    position: 'absolute',
    top: -15,
    alignSelf: 'center',
    backgroundColor: '#FF9F1C',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 1,
  },
  popularBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B4965',
    marginBottom: 5,
    textAlign: 'center'
  },
  cardPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1B4965',
    marginBottom: 15,
    textAlign: 'center'
  },
  cardDesc: {
    color: '#526E7F',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
  },
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    color: '#526E7F',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  listItemItalic: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
  },
  cardBtn: {
    backgroundColor: '#1B4965',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cardBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

// ============================================================
// DAVET ET KAZAN EKRANI
// ============================================================
export function DavetEkrani({ kullanici, setEkran, s }) {
  const refKod = kullanici?.referansKodu || referansKoduOlustur();
  const paylasimMetni = `GAYİT uygulamasını kullanıyorum! Muğla'nın en iyi usta platformu. Davet kodumla kayıt ol, ikimiz de hak kazanalım!\n\nDavet Kodum: ${refKod}\n\nİndirmek için: gayit.com.tr`;
  const [kopyalandi, setKopyalandi] = useState(false);

  const kopyala = () => {
    Clipboard.setString(refKod);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  };

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
          {kopyalandi && (
            <View style={{ backgroundColor: '#588157', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>✅ Kopyalandı!</Text>
            </View>
          )}
          <TouchableOpacity
            style={{ backgroundColor: '#588157', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
            onPress={kopyala}
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
export function AyarlarEkrani({ kullanici, setKullanici, token, setEkran, karanlikMod, setKaranlikMod, s }) {
  const [bildirimAcik, setBildirimAcik] = useState(true);

  const hesabiSil = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabını silmek istediğinden emin misin? Bu işlem geri alınamaz!',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (token && kullanici?.uid) {
                await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, { method: 'DELETE' });
              }
              setKullanici(null);
              setEkran('karsilama');
            } catch (e) {
              Alert.alert('Hata', 'Hesap silinemedi!');
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
      Alert.alert('Teşekkürler! 💙', 'Mesajın yönetime iletildi!');
      setIletisimKonu('');
      setIletisimMesajState('');
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi!');
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
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Biz Kimiz?</Text>
          <Text style={{ color: '#526E7F', lineHeight: 22, marginBottom: 15 }}>
            GAYIT, dışarıdan bir girişim değil; Muğla'nın toprağında doğmuş, bu coğrafyanın insanını, esnafını ve ihtiyaçlarını yakından tanıyan yerel bir platformdur.
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1B4965', marginBottom: 10 }}>Amacımız</Text>
          <Text style={{ color: '#526E7F', lineHeight: 22, marginBottom: 15 }}>
            Kendi memleketimizde iş yaptırmanın zorluklarını biliyoruz. En yakın, en güvenilir ustayı tek tıkla bulmanızı sağlıyoruz.
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#e67e22', textAlign: 'center', fontStyle: 'italic' }}>
            Gullanın Gari!!
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
export function HizmetKosullariEkrani({ setEkran, setSozlesmeKabul, kayittan, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran(kayittan ? 'auth' : 'anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Hizmet Koşulları</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 15, textAlign: 'center' }}>
          GAYIT KULLANIM VE HİZMET KOŞULLARI
        </Text>
        {[
          { baslik: '1. Hizmetin Kapsamı', icerik: 'GAYIT, Muğla ve ilçelerinde hizmet veren ustalar ile hizmet almak isteyen kullanıcıları buluşturan bir dijital platformdur.' },
          { baslik: '2. Üyelik ve Güvenlik', icerik: 'Sisteme kayıt olurken beyan edilen bilgilerin doğruluğundan kullanıcı sorumludur.' },
          { baslik: '3. Teklif ve Anlaşma Süreci', icerik: 'Verilen teklifler bağlayıcıdır. Anlaşma sağlandığında tarafların iletişim bilgileri karşılıklı açılır.' },
          { baslik: '4. Ödeme ve İade Politikası', icerik: 'Satın alınan dijital içerikler iade edilemez.' },
          { baslik: '5. Sorumluluk Sınırları', icerik: 'GAYIT, platform kullanıcılarının davranışlarından hukuki olarak sorumlu değildir.' },
          { baslik: '6. Kişisel Verilerin Korunması', icerik: 'Telefon numaranız, "Anlaşma" butonuna basana kadar üçüncü taraflarla paylaşılmaz.' },
          { baslik: '7. Değişiklik Hakkı', icerik: 'GAYIT yönetimi, hizmet bedellerini ve koşulları güncelleme hakkını saklı tutar.' },
        ].map((madde, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#1B4965', marginBottom: 5 }}>{madde.baslik}</Text>
            <Text style={{ color: '#526E7F', lineHeight: 22 }}>{madde.icerik}</Text>
          </View>
        ))}
        {kayittan && (
          <TouchableOpacity style={[s.girisBtn, { marginBottom: 40 }]} onPress={() => {
            if (setSozlesmeKabul) setSozlesmeKabul(true);
            setEkran('auth');
          }}>
            <Text style={s.anaBtnY}>✅ OKUDUM, ANLADIM</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// BİLDİRİM EKRANI
// ============================================================
export function BildirimEkrani({ kullanici, setEkran, s }) {
  const [bildirimler, setBildirimler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => { bildirimYukle(); }, []);

  const bildirimYukle = async () => {
    if (!kullanici?.uid) return;
    try {
      const res = await fetch(`${DB_URL}/bildirimler/${kullanici.uid}.json`);
      const data = await res.json();
      if (data) {
        const liste = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => b.tarih - a.tarih);
        setBildirimler(liste);
        const okunmamislar = liste.filter(b => !b.okundu);
        for (const b of okunmamislar) {
          await fetch(`${DB_URL}/bildirimler/${kullanici.uid}/${b.id}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ okundu: true }),
          });
        }
      }
    } catch (e) {
      console.log('Bildirimler yüklenemedi:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>🔔 Bildirimler</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={s.scroll}>
        {yukleniyor ? (
          <Text style={{ textAlign: 'center', color: '#A3B1B9', marginTop: 40 }}>Yükleniyor...</Text>
        ) : bildirimler.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>🔔</Text>
            <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>Henüz bildirim yok gari.</Text>
          </View>
        ) : (
          bildirimler.map(b => (
            <View key={b.id} style={{
              backgroundColor: b.okundu ? '#FFF' : '#E1F2FE',
              borderRadius: 12, padding: 15, marginBottom: 10,
              borderLeftWidth: 4, borderLeftColor: b.okundu ? '#D1D9E0' : '#1B4965',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965', flex: 1 }}>{b.baslik}</Text>
                <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{zamanFarki(b.tarih)}</Text>
              </View>
              <Text style={{ color: '#526E7F', marginTop: 4 }}>{b.mesaj}</Text>
              {!b.okundu && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1B4965', position: 'absolute', top: 15, right: 15 }} />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
