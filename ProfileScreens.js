// ============================================================
// ADIM 8 — ProfileScreens.js
// Profil, Değerlendirmeler, Geçmiş İşler, Belge Yükleme, Rozet
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image
} from 'react-native';
import { DB_URL, BOLGELER, damgaToTarih } from './constants';

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
  const [kaydedildi, setKaydedildi] = useState(false); // 'profil' | 'degerlendirmeler' | 'gecmis'

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

  const onayBasvur = async () => {
    Alert.alert(
      'Evrak Gönderimi',
      'Belgelerini (Kimlik, Ustalık Belgesi) info@gayit.com.tr adresine yolla gari.'
    );
    setKullanici({ ...kullanici, onayDurumu: 'beklemede' });
    if (token && kullanici?.uid) {
      try {
        await fetch(`${DB_URL}/kullanicilar/${kullanici.uid}.json?auth=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onayDurumu: 'beklemede' }),
        });
      } catch (e) {
        console.log('Onay başvurusu iletilemedi:', e);
      }
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
              <View style={{
                backgroundColor: kullanici?.abonelik ? '#FFF8E1' : '#E1E6EB',
                borderColor: kullanici?.abonelik ? '#F39C12' : '#A3B1B9',
                borderWidth: 1,
                paddingHorizontal: 15,
                paddingVertical: 6,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{ color: kullanici?.abonelik ? '#F39C12' : '#526E7F', fontWeight: 'bold', fontSize: 12 }}>
                  {kullanici?.abonelik ? '👑 VIP (Sınırsız) Abonelik' : '📦 Standart Üyelik'}
                </Text>
                {/* Onaylı usta rozeti */}
                {kullanici?.onayDurumu === 'onayli' && (
                  <Text style={{ color: '#00a2ed', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>✅ Onaylı Usta</Text>
                )}
              </View>
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
                <Text style={{ fontSize: 11, color: '#526E7F', marginTop: 4 }}>
                  Belgelerini gönder, profilinde mavi tik gösterelim gari.
                </Text>
                {kullanici?.onayDurumu === 'beklemede' ? (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ padding: 8, backgroundColor: '#FFF8E1', borderRadius: 8, marginBottom: 8 }}>
                      <Text style={{ color: '#F39C12', fontSize: 12, textAlign: 'center', fontWeight: 'bold' }}>
                        ⌛ Belgeler İncelemede...
                      </Text>
                      <Text style={{ color: '#A3B1B9', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                        Belgelerini info@gayit.com.tr adresine gönderdin mi? Gönderemediysen aşağıdaki butona bas.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#A3B1B9', padding: 10, borderRadius: 8 }}
                      onPress={() => Alert.alert('Belge Gönderimi', 'Kimlik ve Ustalık belgenizi info@gayit.com.tr adresine gönderiniz. İncelendikten sonra rozetiniz aktif edilecektir.')}
                    >
                      <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>📧 Belge Gönderme Bilgisi</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{ backgroundColor: '#00a2ed', padding: 10, borderRadius: 8, marginTop: 10 }}
                    onPress={onayBasvur}
                  >
                    <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>
                      BAŞVUR (Belgeleri e-posta ile gönder)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Ad Soyad */}
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

            {rol === 'usta' && kullanici?.meslek && (
              <>
                <Text style={s.inputBaslik}>Meslek / Branş</Text>
                <TextInput
                  style={[s.inp, { backgroundColor: '#F2F4F7', color: '#A3B1B9' }]}
                  value={kullanici.meslek}
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

            {/* İlçe değiştirme */}
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
                {/* Özet */}
                <View style={{ backgroundColor: '#FFF8E1', borderRadius: 16, padding: 20, margin: 15, alignItems: 'center' }}>
                  <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#F39C12' }}>{ortalamaPuan}</Text>
                  <View style={{ flexDirection: 'row', marginVertical: 8 }}>
                    {[1, 2, 3, 4, 5].map(y => (
                      <Text key={y} style={{ fontSize: 24, opacity: parseFloat(ortalamaPuan) >= y ? 1 : 0.3 }}>⭐</Text>
                    ))}
                  </View>
                  <Text style={{ color: '#A3B1B9' }}>{puanlar.length} değerlendirme</Text>
                </View>

                {/* Yorum listesi */}
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
                    <Text style={s.kartAlt}>
                      👤 Müşteri: {ilan.sahip}
                    </Text>
                  ) : (
                    <Text style={s.kartAlt}>
                      🛠️ Usta: {ilan.anlasilanUsta?.ustaAd || '-'} — {ilan.anlasilanUsta?.fiyat || '-'}
                    </Text>
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
