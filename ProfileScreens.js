// ============================================================
// ADIM 8 — ProfileScreens.js
// Profil, Değerlendirmeler, Geçmiş İşler, Belge Yükleme, Rozet
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { DB_URL, BOLGELER, STORAGE_BUCKET, API_KEY, damgaToTarih } from './constants';

// ============================================================
// ABONELİK ROZETİ YARDIMCI FONKSİYONU
// abonelik değerleri: null/undefined = standart, 'premium' = premium, 'vip' = vip
// ============================================================
function AbonelikRozeti({ kullanici, rol }) {
  const abonelik = kullanici?.abonelik;

  // VIP
  if (abonelik === 'vip') {
    return (
      <View style={{
        backgroundColor: '#F39C12',
        borderColor: '#F39C12',
        borderWidth: 2,
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>
          👑 VIP Üye
        </Text>
        {kullanici?.onayDurumu === 'onayli' && (
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>✅ Onaylı Usta</Text>
        )}
      </View>
    );
  }

  // PREMIUM
  if (abonelik === 'premium') {
    return (
      <View style={{
        backgroundColor: '#FFF8E1',
        borderColor: '#F39C12',
        borderWidth: 2,
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 12 }}>
          ⭐ Premium Üye
        </Text>
        {kullanici?.onayDurumu === 'onayli' && (
          <Text style={{ color: '#00a2ed', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>✅ Onaylı Usta</Text>
        )}
      </View>
    );
  }

  // STANDART (default)
  return (
    <View style={{
      backgroundColor: '#E1E6EB',
      borderColor: '#A3B1B9',
      borderWidth: 1,
      paddingHorizontal: 15,
      paddingVertical: 6,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Text style={{ color: '#526E7F', fontWeight: 'bold', fontSize: 12 }}>
        📦 Standart Üyelik
      </Text>
      {kullanici?.onayDurumu === 'onayli' && (
        <Text style={{ color: '#00a2ed', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>✅ Onaylı Usta</Text>
      )}
    </View>
  );
}

// ============================================================
// PROFİL EKRANI
// ============================================================
export function ProfilEkrani({
  kullanici, setKullanici, token, rol, setEkran,
  setSikayetHedef, setSikayetModalAcik, s
}) {
  const [profilTel, setProfilTel] = useState(kullanici?.telefon || '');
  const [ilceDuzenleAcik, setIlceDuzenleAcik] = useState(false);
  const [puanlar, setPuanlar] = useState([]);
  const [gecmisIsler, setGecmisIsler] = useState([]);
  const [aktifSekme, setAktifSekme] = useState('profil');
  const [kaydedildi, setKaydedildi] = useState(false);
  const [belgeYukleniyor, setBelgeYukleniyor] = useState(false);
  const [kimlikUrl, setKimlikUrl] = useState(kullanici?.kimlikUrl || null);
  const [ustaBelgeUrl, setUstaBelgeUrl] = useState(kullanici?.ustaBelgeUrl || null);

  useEffect(() => {
    if (rol === 'usta' && kullanici?.email) {
      puanlariYukle();
    }
    gecmisIsleriYukle();
  }, []);

  const puanlariYukle = async () => {
    try {
      const res = await fetch(`${DB_URL}/puanlar/${kullanici.email}.json`);
      const data = await res.json();
      if (data) {
        const liste = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => b.tarih - a.tarih);
        setPuanlar(liste);
      }
    } catch (e) {
      console.log('Puanlar yüklenemedi:', e);
    }
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
            return ilan.anlasmaVar && ilan.anlasilanUsta?.ustaId === kullanici?.email;
          } else {
            return ilan.anlasmaVar && ilan.sahip === kullanici?.email;
          }
        })
        .sort((a, b) => b.tarih - a.tarih);

      setGecmisIsler(liste);
    } catch (e) {
      console.log('Geçmiş işler yüklenemedi:', e);
    }
  };

  const ortalamaPuan = puanlar.length > 0
    ? (puanlar.reduce((t, p) => t + p.puan, 0) / puanlar.length).toFixed(1)
    : null;

  const bilgileriKaydet = async () => {
    const up = { telefon: profilTel };
    setKullanici({ ...kullanici, ...up });
    if (token && kullanici?.uid) {
      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(up),
      });
    }
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
        headers: {
          'Content-Type': mimeType,
          'Authorization': `Bearer ${token}`,
        },
        body: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
      });

      const uploadData = await uploadRes.json();
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(dosyaAdi)}?alt=media&token=${uploadData.downloadTokens}`;

      const guncelVeri = tip === 'kimlik'
        ? { kimlikUrl: downloadUrl }
        : { ustaBelgeUrl: downloadUrl };

      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guncelVeri),
      });

      if (tip === 'kimlik') setKimlikUrl(downloadUrl);
      else setUstaBelgeUrl(downloadUrl);

      setKullanici({ ...kullanici, ...guncelVeri });
      Alert.alert('Yüklendi! ✅', `${tip === 'kimlik' ? 'Kimlik' : 'Ustalık belgesi'} yüklendi.`);
    } catch (e) {
      console.log('Belge yükleme hatası:', e);
      Alert.alert('Hata', 'Belge yüklenemedi gari!');
    } finally {
      setBelgeYukleniyor(false);
    }
  };

  const onayBasvur = async () => {
    if (!kimlikUrl || !ustaBelgeUrl) {
      Alert.alert('Eksik Belge', 'Başvuru yapmadan önce hem kimlik hem ustalık belgeni yüklemelisin usta!');
      return;
    }
    try {
      await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onayDurumu: 'beklemede',
          kimlikUrl,
          ustaBelgeUrl,
          basvuruTarihi: Date.now(),
        }),
      });
      setKullanici({ ...kullanici, onayDurumu: 'beklemede', kimlikUrl, ustaBelgeUrl });
      Alert.alert('Başvuru Alındı! ✅', 'Belgeler admin paneline iletildi. En kısa sürede incelenecek usta!');
    } catch (e) {
      Alert.alert('Hata', 'Başvuru gönderilemedi!');
    }
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Profilim</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sekme Butonları */}
      <View style={{ flexDirection: 'row', backgroundColor: '#F5F5F0', paddingHorizontal: 15, paddingVertical: 8 }}>
        {['profil', 'degerlendirmeler', 'gecmis'].map(sekme => (
          <TouchableOpacity
            key={sekme}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              borderBottomWidth: aktifSekme === sekme ? 2 : 0,
              borderBottomColor: '#1B4965',
            }}
            onPress={() => setAktifSekme(sekme)}
          >
            <Text style={{ color: aktifSekme === sekme ? '#1B4965' : '#A3B1B9', fontWeight: 'bold', fontSize: 12 }}>
              {sekme === 'profil' ? '👤 Profil' : sekme === 'degerlendirmeler' ? '⭐ Puanlar' : '📋 Geçmiş'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll}>

        {/* ---- PROFİL SEKMESİ ---- */}
        {aktifSekme === 'profil' && (
          <>
            {/* Avatar */}
            <TouchableOpacity
              style={s.profilResimSec}
              onPress={() => Alert.alert('Galeri', 'Profil fotoğrafı yükleme özelliği yakında gelecek usta!')}
            >
              <Text style={{ fontSize: 40 }}>📷</Text>
              <Text style={{ color: '#1B4965', fontWeight: 'bold', marginTop: 5, fontSize: 12 }}>Fotoğraf Yükle</Text>
            </TouchableOpacity>

            {/* Abonelik rozeti */}
            <View style={{ alignItems: 'center', marginTop: -10, marginBottom: 15 }}>
              <AbonelikRozeti kullanici={kullanici} rol={rol} />
            </View>

            {/* Ortalama puan (sadece usta) */}
            {rol === 'usta' && ortalamaPuan && (
              <View style={{ backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginHorizontal: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 28 }}>⭐</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F39C12', marginLeft: 8 }}>{ortalamaPuan}</Text>
                <Text style={{ color: '#A3B1B9', marginLeft: 8 }}>({puanlar.length} değerlendirme)</Text>
              </View>
            )}

            {/* Davet kodu */}
            <View style={{ backgroundColor: '#E1F2FE', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center' }}>
              <Text style={{ color: '#526E7F', fontSize: 12, marginBottom: 5 }}>Senin Davet Kodun</Text>
              <Text style={{ color: '#1B4965', fontSize: 20, fontWeight: '900', letterSpacing: 3 }}>
                {kullanici?.referansKodu || ''}
              </Text>
            </View>

            {/* Onaylı usta başvuru alanı */}
            {rol === 'usta' && kullanici?.onayDurumu !== 'onayli' && (
              <View style={{
                padding: 15, backgroundColor: '#FFF', borderRadius: 12,
                marginBottom: 15, borderWidth: 1, borderColor: '#00a2ed', borderStyle: 'dashed'
              }}>
                <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>Onaylı Usta Rozeti Al</Text>
                <Text style={{ fontSize: 11, color: '#526E7F', marginTop: 4, marginBottom: 12 }}>
                  Kimlik ve ustalık belgesini yükle, admin onaylasın.
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: kimlikUrl ? '#E8F5E9' : '#F5F5F0',
                    borderRadius: 10, padding: 12, marginBottom: 10,
                    borderWidth: 1, borderColor: kimlikUrl ? '#588157' : '#D1D9E0',
                    flexDirection: 'row', alignItems: 'center',
                  }}
                  onPress={() => belgeYukle('kimlik')}
                  disabled={belgeYukleniyor}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{kimlikUrl ? '✅' : '📷'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 13 }}>Kimlik Fotoğrafı</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{kimlikUrl ? 'Yüklendi ✓' : 'Fotoğraf seç'}</Text>
                  </View>
                  {belgeYukleniyor && <ActivityIndicator size="small" color="#1B4965" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: ustaBelgeUrl ? '#E8F5E9' : '#F5F5F0',
                    borderRadius: 10, padding: 12, marginBottom: 12,
                    borderWidth: 1, borderColor: ustaBelgeUrl ? '#588157' : '#D1D9E0',
                    flexDirection: 'row', alignItems: 'center',
                  }}
                  onPress={() => belgeYukle('ustaBelge')}
                  disabled={belgeYukleniyor}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{ustaBelgeUrl ? '✅' : '📄'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1B4965', fontSize: 13 }}>Ustalık Belgesi</Text>
                    <Text style={{ color: '#A3B1B9', fontSize: 11 }}>{ustaBelgeUrl ? 'Yüklendi ✓' : 'Fotoğraf seç'}</Text>
                  </View>
                  {belgeYukleniyor && <ActivityIndicator size="small" color="#1B4965" />}
                </TouchableOpacity>

                {kullanici?.onayDurumu === 'beklemede' ? (
                  <View style={{ padding: 10, backgroundColor: '#FFF8E1', borderRadius: 8 }}>
                    <Text style={{ color: '#F39C12', fontSize: 12, textAlign: 'center', fontWeight: 'bold' }}>
                      ⌛ Belgeler İncelemede...
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{
                      backgroundColor: (kimlikUrl && ustaBelgeUrl) ? '#00a2ed' : '#D1D9E0',
                      padding: 12, borderRadius: 8,
                    }}
                    onPress={onayBasvur}
                    disabled={!kimlikUrl || !ustaBelgeUrl}
                  >
                    <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>
                      {(kimlikUrl && ustaBelgeUrl) ? '📤 BAŞVURUYU GÖNDER' : 'Önce belgeleri yükle'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -10 }}>
              <Text style={s.inputBaslik}>Ad Soyad</Text>
            </View>
            <TextInput
              style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]}
              value={kullanici?.ad}
              editable={false}
            />

            <Text style={s.inputBaslik}>E-Posta</Text>
            <TextInput
              style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]}
              value={kullanici?.email}
              editable={false}
            />

            {rol === 'usta' && (
              <>
                <Text style={s.inputBaslik}>Meslek / Branş</Text>
                <TextInput
                  style={[s.inp, { backgroundColor: '#F2F4F7', color: '#526E7F' }]}
                  value={kullanici?.meslek || kullanici?.brans || 'Belirtilmemiş'}
                  editable={false}
                />
              </>
            )}

            <Text style={s.inputBaslik}>Telefon Numarası</Text>
            <TextInput
              style={s.inp}
              placeholder="Örn: 0532 XXX XX XX"
              value={profilTel}
              onChangeText={setProfilTel}
              keyboardType="phone-pad"
            />

            <View style={{ marginTop: 15, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: '#1B4965', fontWeight: 'bold' }}>
                📍 Kayıtlı Bölge: {kullanici?.bolge || 'Belirtilmemiş'}
              </Text>
              <TouchableOpacity
                style={{ marginTop: 10, backgroundColor: '#8B7355', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }}
                onPress={() => setIlceDuzenleAcik(!ilceDuzenleAcik)}
              >
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>İlçemi Değiştir</Text>
              </TouchableOpacity>

              {ilceDuzenleAcik && (
                <View style={[s.chipAlan, { marginTop: 15, justifyContent: 'center' }]}>
                  {BOLGELER.map(b => (
                    <TouchableOpacity
                      key={b}
                      style={[s.chip, kullanici?.bolge === b && s.chipAktif]}
                      onPress={async () => {
                        try {
                          if (token && kullanici?.uid) {
                            await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ bolge: b, ilce: b }),
                            });
                          }
                          setKullanici({ ...kullanici, bolge: b, ilce: b });
                          setIlceDuzenleAcik(false);
                          Alert.alert('Başarılı', `Bölgen ${b} olarak güncellendi usta!`);
                        } catch (e) {
                          Alert.alert('Hata', 'İlçe güncellenemedi gari.');
                        }
                      }}
                    >
                      <Text style={[s.chipY, kullanici?.bolge === b && s.chipYAktif]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={{ marginTop: 15, marginBottom: 5, alignSelf: 'flex-start' }}
              onPress={() => { setSikayetHedef('Genel Şikayet'); setSikayetModalAcik(true); }}
            >
              <Text style={{ color: '#FF4444', fontSize: 13 }}>⚠️ Şikayet Et</Text>
            </TouchableOpacity>

            {kaydedildi && (
              <View style={{ backgroundColor: '#588157', borderRadius: 12, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✅ Bilgiler kaydedildi!</Text>
              </View>
            )}

            <TouchableOpacity style={[s.girisBtn, { marginBottom: 40, marginTop: 15 }]} onPress={bilgileriKaydet}>
              <Text style={s.anaBtnY}>BİLGİLERİ KAYDET</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ---- DEĞERLENDİRMELER SEKMESİ ---- */}
        {aktifSekme === 'degerlendirmeler' && (
          <>
            {rol !== 'usta' ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: '#A3B1B9' }}>Değerlendirmeler sadece ustalar için görünür.</Text>
              </View>
            ) : puanlar.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>⭐</Text>
                <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>
                  Henüz değerlendirme yok gari.{'\n'}İlk işini tamamla!
                </Text>
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
                    {p.yorum ? (
                      <Text style={{ color: '#526E7F', marginTop: 8, fontStyle: 'italic' }}>"{p.yorum}"</Text>
                    ) : null}
                    <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 6 }}>{damgaToTarih(p.tarih)}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ---- GEÇMİŞ İŞLER SEKMESİ ---- */}
        {aktifSekme === 'gecmis' && (
          <>
            {gecmisIsler.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>📋</Text>
                <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>
                  Henüz tamamlanmış iş yok gari.
                </Text>
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
                  <Text style={{ color: '#A3B1B9', fontSize: 11, marginTop: 6 }}>
                    {damgaToTarih(ilan.tarih)}
                  </Text>
                  {ilan.puanlandi && (
                    <Text style={{ color: '#F39C12', fontSize: 12, marginTop: 4 }}>⭐ Puanlandı</Text>
                  )}
                </View>
              ))
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
