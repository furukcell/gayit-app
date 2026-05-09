import { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, FlatList,
  ScrollView, RefreshControl, Alert, Image
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BOLGELER, KATEGORILER } from './constants';

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
        {item.ustaOnayli && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#00a2ed', fontSize: 11, fontWeight: 'bold' }}>✅ Onaylı</Text>
          </View>
        )}
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
        <View style={[s.girisBtn, { marginTop: 10, backgroundColor: '#588157' }]}>
          <Text style={s.anaBtnY}>TEKLİFLERİ GÖR ({item.teklifler?.length || 0})</Text>
        </View>
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
            {/* AVATAR — aboneliğe göre çerçeve rengi */}
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
            <Text style={s.profilAd}>{kullanici?.ad || 'Usta'}</Text>
            {/* ABONE YAZISI — vip / premium / standart */}
            <Text style={s.profilDuzenleText}>
              {kullanici?.abonelik === 'vip'
                ? '👑 VIP ABONE'
                : kullanici?.abonelik === 'premium'
                  ? '⭐ PREMİUM ÜYE'
                  : `Hak: ${kullanici?.hak ?? 0} | Yeni: ${kullanici?.yeniKullaniciHakki ?? 0}`}
            </Text>
          </TouchableOpacity>

          {/* HAK ÖZETİ */}
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
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🎫 Kupon / Davet Hakkı</Text>
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
          {rol === 'usta' && (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('sohbetlerim'); }}>
              <Text style={s.menuText}>💬 Sohbetlerim</Text>
            </TouchableOpacity>
          )}

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
            onPress={() => { setKullanici(null); setToken(null); setEkran('karsilama'); setMenuAcik(false); }}
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
  const [gosterilen, setGosterilen] = useState(20);

  const filtrelenmis = ilanlar.filter(ilan => {
    if (ilan.anlasmaVar) return false;
    const kategoriUygun = rol === 'usta'
      ? ilan.kategori === kullanici?.meslek
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setMenuAcik(true)}>
          <Text style={s.menuSimge}>☰</Text>
        </TouchableOpacity>

       {/* Orta: Logo + AYIT + İLANLAR */}
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            
            {/* Logo + AYIT yan yana */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
              <Image
                source={require('./Logo.png')}
                style={{ width: 75, height: 75 }}
                resizeMode="contain"
              />
              <Text style={{
                fontSize: 28,  
                fontWeight: '800',
                color: '#1B4965',
                letterSpacing: 4,
                marginLeft: 3,
                fontFamily: 'serif',
                textShadowColor: 'rgba(27,73,101,0.15)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
                AYIT
              </Text>
            </View>

            {/* Alt çizgili İLANLAR */}
            <View style={{
              borderBottomWidth: 3,
              borderBottomColor: '#1B4965',
              paddingBottom: 2,
              marginTop: 5,
              marginLeft: 15 // Logonun kaymasına uyumlu olması için ortalandı
            }}>
              <Text style={{
                fontSize: 9,
                color: '#1B4965',
                letterSpacing: 2,
                fontWeight: '700',
              }}>
                İ L A N L A R
              </Text>
            </View>
          </View>

          {/* Sağ İkonlar: Zil ve Ayarlar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={setBildirimEkrani}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltreAcik(!filtreAcik)}>
              <Text style={{ fontSize: 22, color: '#1B4965' }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

      {/* Sayaç Bandı */}
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

      {/* Filtre Paneli */}
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

      {/* Müşteri için ilan ver butonu */}
      {rol === 'musteri' && (
        <TouchableOpacity
          style={[s.girisBtn, { margin: 15, marginBottom: 5 }]}
          onPress={() => setEkran('ilanver')}
        >
          <Text style={s.anaBtnY}>➕ Yeni İlan Ver</Text>
        </TouchableOpacity>
      )}

      {/* İlan Listesi */}
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
              onPress={() => setGosterilen(prev => prev + 20)}
            >
              <Text style={{ color: '#1B4965', fontWeight: 'bold' }}>Daha Fazla Yükle ({filtrelenmis.length - gosterilen} ilan daha)</Text>
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
