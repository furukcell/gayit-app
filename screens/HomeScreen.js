// ============================================================
// HomeScreen.js
// TEMİZLENDİ: 60+ syntax hatası, sohbetleriYukle fonksiyonu,
// Firebase auth eksikleri, URL boşlukları giderildi.
// ============================================================
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, FlatList,
  ScrollView, RefreshControl, Alert, Image
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BOLGELER, KATEGORILER, DB_URL } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// YARDIMCI: "3 saat önce", "2 gün önce" formatı
// ============================================================
function zamanOncesi(tarih) {
  if (!tarih) return '';
  const fark = Date.now() - tarih;
  const dakika = Math.floor(fark / 60000);
  const saat = Math.floor(fark / 3600000);
  const gun = Math.floor(fark / 86400000);
  if (dakika < 1) return 'Az önce';
  if (dakika < 60) return `${dakika} dk önce`;
  if (saat < 24) return `${saat} saat önce`;
  return `${gun} gün önce`;
}

// ============================================================
// İLAN KARTI BİLEŞENİ
// ============================================================
function IlanKarti({ item, rol, kullanici, onTeklifTikla, onTekliflerTikla, s }) {
  return (
    <TouchableOpacity
      style={[s.kart, item.acil && { borderWidth: 2, borderColor: '#FF4444' }]}
      onPress={() => rol === 'usta' ? onTeklifTikla(item) : onTekliflerTikla(item)}
    >
      {item.acil && (
        <View style={s.acilRozet}>
          <Text style={s.acilRozetYazi}>🚨 ACİL</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.kategoriBadge}>{item.kategori}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {item.tarih && (
            <Text style={{ color: '#A3B1B9', fontSize: 11 }}>🕐 {zamanOncesi(item.tarih)}</Text>
          )}
          {item.ustaOnayli && (
            <Text style={{ color: '#00a2ed', fontSize: 11, fontWeight: 'bold' }}>✅ Onaylı</Text>
          )}
        </View>
      </View>

      <Text style={s.kartBaslik}>{item.baslik}</Text>
      <Text style={s.kartAlt}>📍 {item.mahalle} - {item.bolge}</Text>
      {item.isTarihi && <Text style={s.kartAlt}>📅 {item.isTarihi}</Text>}

      <View style={s.kartIstatistikler}>
        <Text style={s.kartIstatistikMetin}>{item.teklifler?.length || 0} Teklif</Text>
        {item.anlasmaVar && (
          <Text style={{ color: '#588157', fontWeight: 'bold', marginLeft: 10 }}>✅ ANLAŞMA SAĞLANDI</Text>
        )}
      </View>

      {rol === 'usta' && !item.anlasmaVar && (
        <View style={[s.girisBtn, { marginTop: 10, backgroundColor: '#1B4965' }]}>
          <Text style={s.anaBtnY}>TEKLİF VER</Text>
        </View>
      )}

      {rol === 'musteri' && item.sahip === kullanici?.email && (
        <TouchableOpacity
          style={[s.girisBtn, { marginTop: 10, backgroundColor: '#588157' }]}
          onPress={() => onTekliflerTikla(item)}
        >
          <Text style={s.anaBtnY}>TEKLİFLERİ GÖR ({item.teklifler?.length || 0})</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ============================================================
// SOL MENÜ (DRAWER)
// ============================================================
export function SolMenu({
  kullanici, rol, sistemIst, setEkran, setMenuAcik,
  setProfilTel, setOdemeAdim, setKullanici, setToken, s
}) {
  const [ilcelerAcik, setIlcelerAcik] = useState(false);
  const [acikIlce, setAcikIlce] = useState(null);

  return (
    <View style={s.drawerContainer}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={() => setMenuAcik(false)}
        activeOpacity={1}
      />
      <View style={s.drawerIc}>
        <TouchableOpacity
          onPress={() => setMenuAcik(false)}
          style={{
            position: 'absolute', top: 45, right: 15, zIndex: 999,
            backgroundColor: 'rgba(255,255,255,0.15)', width: 36, height: 36,
            borderRadius: 18, justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={s.profilTiklanabilir}
            onPress={() => { setMenuAcik(false); setProfilTel(kullanici?.telefon || ''); setEkran('profil'); }}
          >
            <View style={[
              s.profilAvatar,
              kullanici?.abonelik === 'vip'
                ? { borderWidth: 3, borderColor: '#F39C12', backgroundColor: '#F39C12' }
                : kullanici?.abonelik === 'premium'
                  ? { borderWidth: 3, borderColor: '#F39C12', backgroundColor: 'transparent' }
                  : { borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }
            ]}>
              <Text style={s.avatarHarf}>{kullanici?.ad?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={s.profilAd}>{kullanici?.ad || 'Kullanıcı'}</Text>
            <Text style={s.profilDuzenleText}>
              {kullanici?.abonelik === 'vip'
                ? '👑 VIP ABONE'
                : kullanici?.abonelik === 'premium'
                  ? '⭐ PREMİUM ÜYE'
                  : `Hak: ${kullanici?.hak ?? 0} | Yeni: ${kullanici?.yeniKullaniciHakki ?? 0}`}
            </Text>
          </TouchableOpacity>

          {(() => {
            const abonelik = kullanici?.abonelik;
            const hak = kullanici?.hak ?? 0;
            const acilHak = kullanici?.acilHak ?? 0;
            const yeniHak = kullanici?.yeniKullaniciHakki ?? 0;
            const isPremium = abonelik === 'premium';
            const isVip = abonelik === 'vip';
            const ekstraHakVar = hak > 0;
            const yeniHakVar = yeniHak > 0;

            if (!isPremium && !isVip && !ekstraHakVar && !yeniHakVar) return null;

            return (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                {(isPremium || isVip) && (
                  <>
                    <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>
                      {isVip ? '👑 VIP Hakları' : '⭐ Premium Hakları'}
                    </Text>
                    {rol === 'usta' ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🔨 Teklif Hakkı</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{isVip ? '∞' : hak}</Text>
                      </View>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>📋 İlan Hakkı</Text>
                          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{isVip ? '∞' : hak}</Text>
                        </View>
                        {acilHak > 0 && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🚨 Acil İlan Hakkı</Text>
                            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{acilHak}</Text>
                          </View>
                        )}
                      </>
                    )}
                    {ekstraHakVar && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🎫 Ekstra Hak</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{hak}</Text>
                      </View>
                    )}
                    {yeniHakVar && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🎁 Hoşgeldin Hakkı</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{yeniHak}</Text>
                      </View>
                    )}
                  </>
                )}
                {!isPremium && !isVip && (
                  <>
                    <Text style={{ color: '#F39C12', fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>📦 Mevcut Haklar</Text>
                    {yeniHakVar && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🎁 Hoşgeldin Hakkı</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{yeniHak}</Text>
                      </View>
                    )}
                    {ekstraHakVar && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🎫 Kullanılabilir Hak</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{hak}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })()}

          <View style={s.ayrac} />

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}>
            <Text style={s.menuText}>🏠 Anasayfa</Text>
          </TouchableOpacity>

          {rol === 'usta' ? (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('anasayfa'); }}>
              <Text style={s.menuText}>🛠️ İşlere Teklif Ver</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanver'); }}>
              <Text style={s.menuText}>➕ İlan Ver</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ilanlarim'); }}>
            <Text style={s.menuText}>📋 {rol === 'usta' ? 'Tekliflerim' : 'İlanlarım'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('sohbetlerim'); }}>
            <Text style={s.menuText}>💬 Sohbetlerim</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('evim'); }}>
            <Text style={s.menuText}>🏡 Evim</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setOdemeAdim('secim'); setEkran('odeme'); }}>
            <Text style={s.menuText}>🎫 Paket & Kupon</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('davet'); }}>
            <Text style={s.menuText}>🎁 Davet Et, Kazan</Text>
          </TouchableOpacity>

          {kullanici?.rol === 'admin' && (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('admin'); }}>
              <Text style={[s.menuText, { color: '#F39C12' }]}>⚙️ Admin Paneli</Text>
            </TouchableOpacity>
          )}

          <View style={s.ayrac} />

          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}
            onPress={() => setIlcelerAcik(!ilcelerAcik)}
          >
            <Text style={[s.menuBaslik, { marginTop: 0, marginBottom: 0, fontSize: 13, fontWeight: 'bold' }]}>
              MUĞLA USTA RAPORU
            </Text>
            <Text style={{ color: '#FFF', opacity: 0.6, fontSize: 12 }}>{ilcelerAcik ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {ilcelerAcik && sistemIst?.bolgeUsta && BOLGELER.map((bolgeAd) => {
            const bolgeVeri = sistemIst.bolgeUsta[bolgeAd] || { toplam: 0, detay: {} };
            return (
              <View key={bolgeAd}>
                <TouchableOpacity
                  style={s.ilceItem}
                  onPress={() => setAcikIlce(acikIlce === bolgeAd ? null : bolgeAd)}
                >
                  <Text style={s.ilceAd}>{bolgeAd}</Text>
                  <Text style={s.ilceAltBilgi}>{bolgeVeri.toplam} Kayıtlı Usta</Text>
                </TouchableOpacity>
                {acikIlce === bolgeAd && Object.keys(bolgeVeri.detay).length > 0 && (
                  <View style={s.ilceDetayAlan}>
                    {Object.entries(bolgeVeri.detay).map(([meslek, sayi], i) => (
                      <Text key={i} style={s.detaySatir}>- {meslek}: {sayi} Usta</Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <View style={s.ayrac} />

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('iletisim'); }}>
            <Text style={s.menuText}>✉️ İletişim</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('hakkimizda'); }}>
            <Text style={s.menuText}>ℹ️ Hakkımızda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('hizmet_kosullari'); }}>
            <Text style={s.menuText}>📄 Hizmet Koşulları</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.menuItem}
            onPress={() => {
              setMenuAcik(false);
              WebBrowser.openBrowserAsync('https://furukcell.github.io/gayit-gizlilik');
            }}
          >
            <Text style={s.menuText}>🔒 Gizlilik Politikası</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('ayarlar'); }}>
            <Text style={s.menuText}>⚙️ Ayarlar</Text>
          </TouchableOpacity>

          <View style={s.ayrac} />

          <TouchableOpacity
            style={s.menuItem}
            onPress={async () => {
              await AsyncStorage.removeItem('oturum_token');
              await AsyncStorage.removeItem('oturum_kullanici');
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
}

// ============================================================
// ANASAYFA EKRANI
// ============================================================
export function AnasayfaEkrani({
  kullanici, rol, ilanlar, sistemIst, yenileniyor, onYenile,
  setEkran, setMenuAcik, setSecilenIlan,
  ustaTeklifTiklandi, setBildirimEkrani, s
}) {
  const [seciliKategori, setSeciliKategori] = useState('Tümü');
  const [seciliIlce, setSeciliIlce] = useState('Tümü');
  const [filtreAcik, setFiltreAcik] = useState(false);
  const [gosterilen, setGosterilen] = useState(10);

  const filtrelenmis = ilanlar.filter(ilan => {
    if (ilan.anlasmaVar && ilan.kapanmaTarihi && Date.now() > ilan.kapanmaTarihi) return false;
    if (ilan.anlasmaVar && !ilan.kapanmaTarihi) return false;
    const kategoriUygun = rol === 'usta'
      ? [kullanici?.meslek, kullanici?.anaBrans, ...(kullanici?.yanBranslar || [])].filter(Boolean).includes(ilan.kategori)
      : (seciliKategori === 'Tümü' || ilan.kategori === seciliKategori);
    const ilceUygun = seciliIlce === 'Tümü' || ilan.bolge === seciliIlce;
    return kategoriUygun && ilceUygun;
  });

  const aktifIlanSayisi = ilanlar.filter(i => !i.anlasmaVar).length;
  const toplamIlanSayisi = ilanlar.length;
  const gosterilenIlanlar = filtrelenmis.slice(0, gosterilen);

  const onTekliflerTikla = (ilan) => {
    setSecilenIlan(ilan);
    setEkran('teklifler');
  };

 return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setMenuAcik(true)}>
          <Text style={s.menuSimge}>☰</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -15 }}>
            <Image
              source={require('../Logo.png')}
              style={{ width: 80, height: 80, marginRight: -15, marginTop: -16 }}
              resizeMode="contain"
            />
            <Text style={{
              fontSize: 28, fontWeight: '800', color: '#1B4965',
              letterSpacing: 1, fontFamily: 'serif',
              textShadowColor: 'rgba(27,73,101,0.15)',
              textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
            }}>
              AYIT
            </Text>
          </View>
          <View style={{
            borderBottomWidth: 2, borderBottomColor: '#1B4965',
            paddingBottom: 2, marginTop: -3, paddingHorizontal: 12, marginLeft: 25
          }}>
            <Text style={{ fontSize: 12, color: '#1B4965', letterSpacing: 4, fontWeight: '700' }}>
              İLANLAR
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={setBildirimEkrani}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFiltreAcik(!filtreAcik)}>
            <Text style={{ fontSize: 22, color: '#1B4965' }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: '#1B4965', paddingHorizontal: 15, paddingVertical: 8, justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{sistemIst?.usta || 0}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Kayıtlı Usta</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{sistemIst?.musteri || 0}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Kayıtlı Kullanıcı</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
            {aktifIlanSayisi}
            <Text style={{ fontSize: 11, fontWeight: 'normal' }}> / {toplamIlanSayisi}</Text>
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Aktif / Toplam İlan</Text>
        </View>
      </View>

      {filtreAcik && (
        <View style={{ backgroundColor: '#F5F5F0', padding: 10 }}>
          <Text style={{ color: '#526E7F', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>KATEGORİ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ alignItems: 'center' }}>
            {KATEGORILER.map(k => (
              <TouchableOpacity
                key={k}
                style={[s.chip, seciliKategori === k && s.chipAktif, { marginRight: 8 }]}
                onPress={() => setSeciliKategori(k)}
              >
                <Text style={[s.chipY, seciliKategori === k && s.chipYAktif]}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ color: '#526E7F', fontSize: 11, fontWeight: 'bold', marginBottom: 6, marginTop: 8 }}>İLÇE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ alignItems: 'center' }}>
            {['Tümü', ...BOLGELER].map(b => (
              <TouchableOpacity
                key={b}
                style={[s.chip, seciliIlce === b && s.chipAktif, { marginRight: 8 }]}
                onPress={() => setSeciliIlce(b)}
              >
                <Text style={[s.chipY, seciliIlce === b && s.chipYAktif]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {rol === 'musteri' && (
        <TouchableOpacity
          style={[s.girisBtn, { margin: 15, marginBottom: 5 }]}
          onPress={() => setEkran('ilanver')}
        >
          <Text style={s.anaBtnY}>➕ Yeni İlan Ver</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={gosterilenIlanlar}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={onYenile} colors={['#1B4965']} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>🔍</Text>
            <Text style={{ color: '#A3B1B9', textAlign: 'center' }}>
              {rol === 'usta'
                ? 'Henüz iş ilanı yok gari.\nBirazdan gelir!'
                : 'Henüz ilan yok.\nİlk ilanı sen ver!'}
            </Text>
          </View>
        }
        ListFooterComponent={
          filtrelenmis.length > gosterilen ? (
            <TouchableOpacity
              style={{ backgroundColor: '#E1F2FE', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20 }}
              onPress={() => setGosterilen(prev => prev + 10)}
            >
              <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>
                Daha Fazla Yükle ({filtrelenmis.length - gosterilen} ilan daha)
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <IlanKarti
            item={item}
            rol={rol}
            kullanici={kullanici}
            onTeklifTikla={ustaTeklifTiklandi}
            onTekliflerTikla={onTekliflerTikla}
            s={s}
          />
        )}
      />
    </SafeAreaView>
  );
}

// ============================================================
// SOHBETLERİM EKRANI
// DÜZELTİLDİ:
//   1. sohbetleriYukle fonksiyonu tanımlandı (eksiği vardı — crash yapıyordu)
//   2. useEffect dependency'e token, kullanici?.uid, onVeriYukle eklendi
//   3. Firebase istatistik fetch'ine auth token eklendi
//   4. URL'deki boşluklar temizlendi (orderBy="tarih")
//   5. Tüm syntax hataları giderildi
// ============================================================
export function SohbetlerimEkrani({
  kullanici, ilanlar, adminMesajlari, token,
  setEkran, setSecilenIlan, setAktifSohbetTeklif, setAnlasmaSaglandi,
  onVeriYukle,
  s
}) {
  const [aktifSohbetler, setAktifSohbetler] = useState([]);
  const [sonMesajlar, setSonMesajlar] = useState({});
  const [yukleniyor, setYukleniyor] = useState(true);

  // Sohbetlerimden direkt anlaşma yapabilme
  const anlasmaYap = async (ilan, teklif) => {
    Alert.alert(
      'Anlaşmayı Onayla',
      `${teklif.ustaAd} usta ile ${teklif.fiyat} üzerinden anlaşıyor musun gari?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Anlaş!',
          onPress: async () => {
            try {
              const kapanmaTarihi = Date.now() + 24 * 60 * 60 * 1000;
              await fetch(`${DB_URL}/ilanlar/${ilan.id}.json?auth=${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  anlasmaVar: true,
                  anlasilanUsta: teklif,
                  kapanmaTarihi,
                }),
              });
              if (onVeriYukle) await onVeriYukle();
              const ustaUid = teklif.ustaUid || teklif.ustaId;
              try {
                // DÜZELTİLDİ: auth token eklendi
                const istSnap = await fetch(`${DB_URL}/istatistikler/${ustaUid}.json?auth=${token}`)
                  .then(r => r.json())
                  .catch(() => ({}));
                await fetch(`${DB_URL}/istatistikler/${ustaUid}.json?auth=${token}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tamamlanan: ((istSnap?.tamamlanan) || 0) + 1,
                    toplamIs: ((istSnap?.toplamIs) || 0) + 1,
                    sonGuncelleme: Date.now(),
                  }),
                });
              } catch (e) { console.log('istatistik hatası:', e); }
              Alert.alert('🤝 Anlaşma Sağlandı!', 'Tebrikler! Usta ile anlaştınız.');
            } catch (e) {
              Alert.alert('Hata', 'Anlaşma kaydedilemedi!');
            }
          },
        },
      ]
    );
  };

  // DÜZELTİLDİ: fonksiyon tanımlandı (önceden sadece gövdesi vardı, crash yapıyordu)
  const sohbetleriYukle = async () => {
    setYukleniyor(true);
    try {
      const adayIlanlar = (ilanlar || []).filter(ilan => {
        if (kullanici?.rol === 'usta') {
          return ilan.teklifler?.some(t => (t.ustaUid || t.ustaId) === kullanici?.uid);
        } else {
          return (ilan.sahipUid === kullanici?.uid || ilan.sahip === kullanici?.email) && (ilan.teklifler?.length > 0);
        }
      });

      const bulunanSohbetler = [];
      const yeniSonMesajlar = {};

      for (const ilan of adayIlanlar) {
        const ilgiliTeklifler = kullanici?.rol === 'usta'
          ? ilan.teklifler?.filter(t => (t.ustaUid || t.ustaId) === kullanici?.uid) || []
          : ilan.teklifler || [];

        for (const teklif of ilgiliTeklifler) {
          const ustaUid = teklif.ustaUid || teklif.ustaId;
          if (!ustaUid) continue;

          const sohbetId = `${ilan.id}_${ustaUid.replace(/[.@]/g, '_')}`;

          try {
            // DÜZELTİLDİ: URL'deki boşluklar temizlendi
            const res = await fetch(
              `${DB_URL}/sohbetler/${sohbetId}/mesajlar.json?auth=${token}&orderBy="tarih"&limitToLast=1`
            );
            const data = await res.json();

            if (data && Object.keys(data).length > 0) {
              const mesajlar = Object.values(data);
              yeniSonMesajlar[`${ilan.id}_${ustaUid}`] = mesajlar[0];

              const zatenVar = bulunanSohbetler.find(
                x => x.ilan.id === ilan.id && (x.teklif.ustaUid || x.teklif.ustaId) === ustaUid
              );
              if (!zatenVar) {
                bulunanSohbetler.push({ ilan, teklif });
              }
            } else if (ilan.anlasmaVar && ilan.anlasilanUsta?.ustaUid === ustaUid) {
              const zatenVar = bulunanSohbetler.find(
                x => x.ilan.id === ilan.id && (x.teklif.ustaUid || x.teklif.ustaId) === ustaUid
              );
              if (!zatenVar) {
                bulunanSohbetler.push({ ilan, teklif });
              }
            }
          } catch (e) {}
        }
      }

      bulunanSohbetler.sort((a, b) => {
        const aUid = a.teklif.ustaUid || a.teklif.ustaId;
        const bUid = b.teklif.ustaUid || b.teklif.ustaId;
        const aMesaj = yeniSonMesajlar[`${a.ilan.id}_${aUid}`];
        const bMesaj = yeniSonMesajlar[`${b.ilan.id}_${bUid}`];
        return (bMesaj?.tarih || 0) - (aMesaj?.tarih || 0);
      });

      setAktifSohbetler(bulunanSohbetler);
      setSonMesajlar(yeniSonMesajlar);
    } catch (e) {
      console.log('Sohbetler yüklenemedi:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  // DÜZELTİLDİ: dependency array'e onVeriYukle ve kullanici?.uid eklendi
  useEffect(() => {
    if (token) {
      sohbetleriYukle();
    }
  }, [ilanlar, token, kullanici?.uid]);

  const zamanFormat = (tarih) => {
    if (!tarih) return '';
    const fark = Date.now() - tarih;
    const dakika = Math.floor(fark / 60000);
    const saat = Math.floor(fark / 3600000);
    const gun = Math.floor(fark / 86400000);
    if (dakika < 1) return 'Az önce';
    if (dakika < 60) return `${dakika} dk`;
    if (saat < 24) return `${saat} sa`;
    return `${gun} gün`;
  };

  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Sohbetlerim</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.scroll}>
        {(adminMesajlari || []).length > 0 && (
          <TouchableOpacity
            style={[s.kart, { borderLeftWidth: 5, borderLeftColor: '#E67E22', backgroundColor: '#FFF9F2' }]}
            onPress={() => setEkran('iletisim')}
          >
            <Text style={{ fontWeight: 'bold', color: '#E67E22' }}>🛡️ GAYİT Destek Yanıtı</Text>
            <Text style={s.kartAlt}>Yönetimden yeni bir mesajınız var.</Text>
          </TouchableOpacity>
        )}

        {yukleniyor ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: '#A3B1B9' }}>Sohbetler yükleniyor...</Text>
          </View>
        ) : aktifSohbetler.length === 0 && (adminMesajlari || []).length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>💬</Text>
            <Text style={{ textAlign: 'center', color: '#A3B1B9' }}>
              Henüz aktif bir sohbet yok.{'\n'}
              {kullanici?.rol === 'usta'
                ? 'Teklif ver, müşteri yazdıkça burada görünür!'
                : 'İlanına teklif gelince sohbet başlatabilirsin.'}
            </Text>
          </View>
        ) : (
          aktifSohbetler.map(({ ilan, teklif }) => {
            const ustaUid = teklif.ustaUid || teklif.ustaId;
            const sonMesaj = sonMesajlar[`${ilan.id}_${ustaUid}`];
            const benimMesajim = sonMesaj?.gonderen === kullanici?.uid;

            const karsiAd = kullanici?.rol === 'usta'
              ? (ilan.sahip?.split('@')[0] || 'Müşteri')
              : (teklif.ustaAd || 'Usta');

            return (
              <TouchableOpacity
                key={`${ilan.id}_${ustaUid}`}
                style={[s.kart, {
                  borderLeftWidth: 4,
                  borderLeftColor: ilan.anlasmaVar ? '#588157' : '#1B4965',
                  paddingVertical: 14,
                }]}
                onPress={() => {
                  const guncellenmisT = { ...teklif, ustaUid: ustaUid };
                  setSecilenIlan(ilan);
                  setAktifSohbetTeklif(guncellenmisT);
                  setAnlasmaSaglandi(ilan.anlasmaVar || false);
                  setEkran('sohbet');
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={s.kategoriBadge}>{ilan.kategori}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {ilan.anlasmaVar && (
                      <Text style={{ color: '#588157', fontSize: 11, fontWeight: 'bold' }}>✅ Anlaşma</Text>
                    )}
                    {sonMesaj?.tarih && (
                      <Text style={{ color: '#A3B1B9', fontSize: 11 }}>
                        {zamanFormat(sonMesaj.tarih)}
                      </Text>
                    )}
                  </View>
                </View>

                <Text style={[s.kartBaslik, { fontSize: 14, marginTop: 0 }]} numberOfLines={1}>
                  {ilan.baslik}
                </Text>

                <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 2 }}>
                  👤 {karsiAd}
                </Text>

                <Text style={{ color: '#526E7F', fontSize: 12, marginTop: 1 }}>
                  💰 {teklif.fiyat}
                </Text>

                {sonMesaj ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                    {benimMesajim && (
                      <Text style={{ fontSize: 11, color: sonMesaj.durum === 'okundu' ? '#4FC3F7' : '#A3B1B9' }}>
                        {sonMesaj.durum === 'okundu' ? '✓✓' : sonMesaj.durum === 'iletildi' ? '✓✓' : '✓'}
                      </Text>
                    )}
                    <Text
                      numberOfLines={1}
                      style={{
                        color: '#A3B1B9',
                        fontSize: 13,
                        flex: 1,
                        fontStyle: sonMesaj.tip === 'konum' ? 'italic' : 'normal',
                      }}
                    >
                      {benimMesajim ? 'Sen: ' : ''}
                      {sonMesaj.tip === 'konum' ? '📍 Konum paylaşıldı' : sonMesaj.metin}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#A3B1B9', fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
                    Henüz mesaj yok
                  </Text>
                )}

                {/* ANLAŞ BUTONU */}
                {!ilan.anlasmaVar && kullanici?.rol === 'musteri' && (
                  <TouchableOpacity
                    style={{
                      marginTop: 10,
                      backgroundColor: '#1B4965',
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: 'center',
                    }}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      anlasmaYap(ilan, { ...teklif, ustaUid: ustaUid });
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>🤝 Anlaş</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
