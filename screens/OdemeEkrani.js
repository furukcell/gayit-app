// ============================================================
// OdemeEkrani.js — PRODUCTION READY
// RevenueCat + Google Play Billing ile ödeme & paket ekranı
//
// ✅ Hediye kodu oluşturma KALDIRILDI (güvenlik riski)
// ✅ Promosyon kodları sadece AdminPanel'den üretilir
// ✅ Tüm syntax hataları giderildi
// ============================================================
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Linking, Modal, ActivityIndicator, StyleSheet,
} from 'react-native';
import { DB_URL, API_KEY } from '../constants';
import Purchases from 'react-native-purchases';
import { PAKET_ID_MAP } from './revenueCat';

export function OdemeEkrani({ kullanici, setKullanici, token, rol, setEkran, s }) {
  const [odemeAdim, setOdemeAdim] = useState('secim');
  const [kuponKod, setKuponKod] = useState('');
  const [kuponMesaj, setKuponMesaj] = useState(null);
  const [iptalModalAcik, setIptalModalAcik] = useState(false);
  const [iptalSifre, setIptalSifre] = useState('');
  const [iptalYukleniyor, setIptalYukleniyor] = useState(false);
  const [odemeYukleniyor, setOdemeYukleniyor] = useState(false);
  const [yukleniyorPaket, setYukleniyorPaket] = useState(null);

  // ── Güvenli kullanıcı güncelleme ──────────────────────────
  const guncelKullaniciKaydet = async (guncellemeler) => {
    setKullanici(prev => ({ ...prev, ...guncellemeler }));
    if (token && kullanici?.uid) {
      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(guncellemeler),
      }).catch(e => console.log('Kullanıcı güncelleme hatası:', e));
    }
  };

  // ── Satın alma (RevenueCat) ───────────────────────────────
  const odemeBaslat = async (urunId) => {
    setYukleniyorPaket(urunId);
    setOdemeYukleniyor(true);
    try {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        Alert.alert('Hata', 'Şu an paketler yüklenemedi. İnternet bağlantını kontrol et.');
        return;
      }
      const hedefPaket = offerings.current.availablePackages.find(
        (p) => p.identifier === urunId
      );
      if (!hedefPaket) {
        Alert.alert(
          'Paket Bulunamadı',
          `"${urunId}" ürünü RevenueCat panelinde tanımlı değil.`
        );
        return;
      }
      const { customerInfo } = await Purchases.purchasePackage(hedefPaket);
      const paketTipi = PAKET_ID_MAP[urunId];
      if (paketTipi) await paketSatinAl(paketTipi, customerInfo);
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Ödeme Hatası', e.message || 'Bir sorun oluştu. Tekrar dene.');
      }
    } finally {
      setOdemeYukleniyor(false);
      setYukleniyorPaket(null);
    }
  };

  // ── Restore ───────────────────────────────────────────────
  const satinAlmalariGeriYukle = async () => {
    try {
      setOdemeYukleniyor(true);
      const customerInfo = await Purchases.restorePurchases();
      const aktifAbonelikler = customerInfo.activeSubscriptions || [];
      if (aktifAbonelikler.length === 0) {
        Alert.alert('Bilgi', 'Geri yüklenecek aktif abonelik bulunamadı.');
        return;
      }
      let abonelikDegeri = null;
      if (aktifAbonelikler.includes('musteri_vip_aylik') || aktifAbonelikler.includes('usta_vip_aylik')) {
        abonelikDegeri = 'vip';
      } else if (aktifAbonelikler.includes('musteri_premium_aylik') || aktifAbonelikler.includes('usta_premium_aylik')) {
        abonelikDegeri = 'premium';
      }
      if (abonelikDegeri) {
        const res = await fetch(`https://us-central1-usta-mugla.cloudfunctions.net/restoreAbonelik`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ data: { abonelikDegeri } }),
        });
        const json = await res.json();
        if (!json.error) {
          setKullanici(prev => ({ ...prev, abonelik: abonelikDegeri }));
          Alert.alert('Başarılı ✅', 'Aboneliğin geri yüklendi!');
          setEkran('anasayfa');
        }
      }
    } catch (e) {
      Alert.alert('Hata', 'Geri yükleme başarısız: ' + (e.message || 'Bilinmeyen hata'));
    } finally {
      setOdemeYukleniyor(false);
    }
  };

  // ── Kupon / Promosyon Kodu Uygula ─────────────────────────
  const kuponUygula = async () => {
    if (!kuponKod.trim()) return;
    try {
      const res = await fetch(`https://us-central1-usta-mugla.cloudfunctions.net/kuponUygula`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ data: { kuponKod, rol } }),
      });
      const json = await res.json();
      if (json.error) {
        setKuponMesaj({ tip: 'hata', metin: `❌ ${json.error.message || 'Geçersiz kupon kodu.'}` });
        setTimeout(() => setKuponMesaj(null), 2500);
        return;
      }
      const { tip, mesaj, hak, abonelik } = json.result;
      if (tip === 'abonelik') {
      setKullanici(prev => ({ ...prev, abonelik, abonelikBitis: Date.now() + 2592000000 }));
      } else {
        setKullanici(prev => ({ ...prev, hak }));
      }
      setKuponMesaj({ tip: 'basarili', metin: `🎉 ${mesaj}` });
      setTimeout(() => setEkran('anasayfa'), 2000);
    } catch (e) {
      setKuponMesaj({ tip: 'hata', metin: '❌ Bağlantı hatası, tekrar dene.' });
      setTimeout(() => setKuponMesaj(null), 2500);
    }
  };

  // ── Paket satın al (RevenueCat onayı sonrası) ─────────────
  const paketSatinAl = async (paketTipi, customerInfo) => {
    try {
      const res = await fetch(`https://us-central1-usta-mugla.cloudfunctions.net/odemeHakVer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ data: { paketTipi, rol } }),
      });
      const json = await res.json();
      if (json.error) {
        Alert.alert('Hata', json.error.message || 'Bir sorun oluştu.');
        return;
      }
      const { mesaj, hak, acilHak, abonelik } = json.result;
      setKullanici(prev => ({ ...prev, hak, acilHak, ...(abonelik && { abonelik, abonelikBitis: Date.now() + 2592000000 }) }));
      Alert.alert('Başarılı! ✅', mesaj);
      setEkran('anasayfa');
    } catch (e) {
      Alert.alert('Hata', e.message || 'Bir sorun oluştu.');
    }
  };

  // ── Abonelik iptal ────────────────────────────────────────
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
          body: JSON.stringify({
            email: kullanici.email,
            password: iptalSifre,
            returnSecureToken: false,
          }),
        }
      );
      const data = await res.json();
      if (data.error) {
        Alert.alert('Hata', 'Şifre yanlış usta!');
        return;
      }
      Alert.alert(
        'Abonelik İptali',
        'Google Play üzerinden aboneliğini iptal etmek için yönlendirileceksin.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: "Google Play'e Git",
            onPress: () => Linking.openURL('https://play.google.com/store/account/subscriptions'),
          },
        ]
      );
      await guncelKullaniciKaydet({ abonelik: null, abonelikBitis: null });
      setIptalModalAcik(false);
      setIptalSifre('');
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası!');
    } finally {
      setIptalYukleniyor(false);
    }
  };

  // ── Paket butonu ──────────────────────────────────────────
  const PaketButon = ({ urunId, label, style }) => {
    const yukleniyor = yukleniyorPaket === urunId;
    return (
      <TouchableOpacity
        style={[styles.cardBtn, style, yukleniyor && { opacity: 0.7 }]}
        onPress={() => odemeBaslat(urunId)}
        disabled={odemeYukleniyor}
      >
        {yukleniyor
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.cardBtnText}>{label}</Text>
        }
      </TouchableOpacity>
    );
  };

  // ── Aktif abonelik ekranı ─────────────────────────────────
  if (kullanici?.abonelik === 'premium' || kullanici?.abonelik === 'vip') {
    const bitisStr = kullanici?.abonelikBitis
      ? new Date(kullanici.abonelikBitis).toLocaleDateString('tr-TR')
      : '—';
    const abonelikEtiketi = kullanici?.abonelik === 'vip' ? '👑 VIP Abone' : '⭐ Premium Üye';

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
          <View style={{
            backgroundColor: '#1B4965', borderRadius: 20, padding: 25,
            alignItems: 'center', marginBottom: 25,
          }}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>
              {kullanici?.abonelik === 'vip' ? '👑' : '⭐'}
            </Text>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 5 }}>
              {abonelikEtiketi}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Abonelik bitiş: {bitisStr}
            </Text>
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
            <View style={{
              backgroundColor: '#FFF', borderTopLeftRadius: 24,
              borderTopRightRadius: 24, padding: 30,
            }}>
              <Text style={{
                fontSize: 18, fontWeight: 'bold', color: '#FF4444',
                textAlign: 'center', marginBottom: 5,
              }}>
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
                <Text style={s.anaBtnY}>
                  {iptalYukleniyor ? 'İşleniyor...' : 'ONAYLA, İPTAL ET'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setIptalModalAcik(false); setIptalSifre(''); }}
                style={{ marginTop: 15, alignItems: 'center' }}
              >
                <Text style={{ color: '#526E7F' }}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Ana ödeme ekranı ──────────────────────────────────────
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
            <TouchableOpacity
              style={[s.anaBtn, { marginBottom: 15 }]}
              onPress={() => setOdemeAdim('kupon')}
            >
              <Text style={s.anaBtnY}>🎫 Kupon / Promosyon Kodu Kullan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.anaBtn, { backgroundColor: '#1B4965', marginBottom: 15 }]}
              onPress={() => setOdemeAdim('paket')}
            >
              <Text style={s.anaBtnY}>💳 Fiyatlar ve Paketler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 20, alignItems: 'center' }}
              onPress={satinAlmalariGeriYukle}
              disabled={odemeYukleniyor}
            >
              <Text style={{ color: '#526E7F', textDecorationLine: 'underline', fontSize: 13 }}>
                🔄 Önceki satın almalarımı geri yükle
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── KUPON / PROMOSYON KODU EKRANI ─────────────────── */}
        {odemeAdim === 'kupon' && (
          <>
            <Text style={[s.bas, { marginBottom: 10, textAlign: 'center' }]}>
              Kupon / Promosyon Kodunu Girin
            </Text>
            <Text style={{ color: '#526E7F', textAlign: 'center', fontSize: 13, marginBottom: 16 }}>
              Yönetim tarafından size verilen özel kodu buraya girin.
            </Text>
            {kuponMesaj && (
              <View style={{
                backgroundColor: kuponMesaj.tip === 'basarili' ? '#588157' : '#E74C3C',
                borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center',
              }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>
                  {kuponMesaj.metin}
                </Text>
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

        {/* ── PAKET SEÇİM EKRANI ────────────────────────────── */}
        {odemeAdim === 'paket' && (
          <View>
            <Text style={{
              fontSize: 20, fontWeight: 'bold', color: '#1B4965',
              marginBottom: 20, textAlign: 'center',
            }}>
              İhtiyacınıza Uygun Paketi Seçin
            </Text>

            {/* MÜŞTERİ PAKETLERİ */}
            {rol !== 'usta' && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Tekli İlan</Text>
                  <Text style={styles.cardPrice}>50 TL</Text>
                  <Text style={styles.cardDesc}>Sadece tek seferlik normal ilan ücreti.</Text>
                  <PaketButon urunId="musteri_ilan_teksefer" label="Satın Al" />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Acil İlan</Text>
                  <Text style={styles.cardPrice}>100 TL</Text>
                  <Text style={styles.cardDesc}>
                    İlanınız 'Acil İlan' kategorisinde listelensin ve en üstte yer alsın.
                  </Text>
                  <PaketButon urunId="musteri_acil_ilan" label="Satın Al" />
                </View>
                <View style={[styles.card, styles.premiumCard]}>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>🌟 EN ÇOK TERCİH EDİLEN</Text>
                  </View>
                  <Text style={styles.cardTitle}>Premium Abonelik</Text>
                  <Text style={styles.cardPrice}>
                    200 TL <Text style={{ fontSize: 16, color: '#666' }}>/Ay</Text>
                  </Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• Ayda 10 normal ilan hakkı</Text>
                    <Text style={styles.listItem}>• Ayda 2 acil ilan hakkı</Text>
                    <Text style={styles.listItem}>• 🏡 Evim — eşya & hizmet takibi</Text>
                    <Text style={styles.listItem}>• Reklamsız erişim</Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <PaketButon
                    urunId="musteri_premium_aylik"
                    label="Abone Ol"
                    style={{ backgroundColor: '#588157' }}
                  />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>VIP Abonelik</Text>
                  <Text style={styles.cardPrice}>
                    400 TL <Text style={{ fontSize: 16, color: '#666' }}>/Ay</Text>
                  </Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• Sınırsız ilan hakkı</Text>
                    <Text style={styles.listItem}>• 4 acil ilan hakkı</Text>
                    <Text style={styles.listItem}>• 🏡 Evim — eşya & hizmet takibi</Text>
                    <Text style={styles.listItem}>• 🤖 AI ile ev ihtiyaç takibi & yorumlama</Text>
                    <Text style={styles.listItem}>• Reklamsız erişim</Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <PaketButon urunId="musteri_vip_aylik" label="Abone Ol" />
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
                    <Text style={styles.listItem}>
                      • Sistemi denemek ve ilk işlerini kapmak isteyen ustalar için ideal.
                    </Text>
                  </View>
                  <PaketButon urunId="usta_teklif_3" label="Satın Al" />
                </View>
                <View style={[styles.card, styles.premiumCard]}>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>🌟 EN ÇOK TERCİH EDİLEN</Text>
                  </View>
                  <Text style={styles.cardTitle}>Premium Usta</Text>
                  <Text style={styles.cardPrice}>
                    200 TL <Text style={{ fontSize: 16, color: '#666' }}>/Ay</Text>
                  </Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• 30 Adet Teklif Verme Hakkı</Text>
                    <Text style={styles.listItem}>• 📊 Usta istatistiklerini görme</Text>
                    <Text style={styles.listItem}>• 🏡 Evim — eşya & hizmet takibi</Text>
                    <Text style={styles.listItem}>• Reklamsız kullanım</Text>
                    <Text style={styles.listItem}>
                      • İşlerini büyütmek isteyen profesyonel ustalar için
                    </Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <PaketButon
                    urunId="usta_premium_aylik"
                    label="Abone Ol"
                    style={{ backgroundColor: '#588157' }}
                  />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>VIP Usta</Text>
                  <Text style={styles.cardPrice}>
                    400 TL <Text style={{ fontSize: 16, color: '#666' }}>/Ay</Text>
                  </Text>
                  <View style={styles.listContainer}>
                    <Text style={styles.listItem}>• Sınırsız Teklif Verme Hakkı</Text>
                    <Text style={styles.listItem}>• 📊 Usta istatistiklerini görme</Text>
                    <Text style={styles.listItem}>• 🏡 Evim — eşya & hizmet takibi</Text>
                    <Text style={styles.listItem}>• 🤖 AI ile ev ihtiyaç takibi & yorumlama</Text>
                    <Text style={styles.listItem}>• Reklamsız kullanım</Text>
                    <Text style={styles.listItem}>
                      • Muğla piyasasını domine et, hiçbir işi kaçırma!
                    </Text>
                    <Text style={styles.listItemItalic}>* İptal edilmediği sürece her ay yenilenir.</Text>
                  </View>
                  <PaketButon urunId="usta_vip_aylik" label="Abone Ol" />
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={() => setOdemeAdim('secim')}
              style={{ marginTop: 20, marginBottom: 40 }}
            >
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
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#F0F0F0',
  },
  premiumCard: {
    borderColor: '#588157', borderWidth: 2, position: 'relative', marginTop: 15,
  },
  popularBadge: {
    position: 'absolute', top: -15, alignSelf: 'center',
    backgroundColor: '#FF9F1C', paddingHorizontal: 15, paddingVertical: 5,
    borderRadius: 20, zIndex: 1,
  },
  popularBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B4965', marginBottom: 5, textAlign: 'center' },
  cardPrice: { fontSize: 32, fontWeight: '900', color: '#1B4965', marginBottom: 15, textAlign: 'center' },
  cardDesc: { color: '#526E7F', textAlign: 'center', marginBottom: 20, fontSize: 15, lineHeight: 22 },
  listContainer: { marginBottom: 20 },
  listItem: { color: '#526E7F', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  listItemItalic: { color: '#888', fontSize: 12, fontStyle: 'italic', marginTop: 5 },
  cardBtn: { backgroundColor: '#1B4965', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  cardBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
