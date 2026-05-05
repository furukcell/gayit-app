// ============================================================
// ADIM 5 — HomeScreen.js
// Anasayfa, Sol Menü (Drawer), İlan Kartları, Filtreleme
// ============================================================

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, FlatList,
  ScrollView, RefreshControl, Alert
} from 'react-native';
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
        {/* Onaylı usta rozeti ilan kartında da görünsün */}
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
      <View style={s.drawerIc}>
        <TouchableOpacity style={s.drawerKapat} onPress={() => setMenuAcik(false)}>
          <Text style={{ color: '#FFF', fontSize: 22 }}>✕</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={s.profilTiklanabilir}
            onPress={() => { setMenuAcik(false); setProfilTel(kullanici?.telefon || ''); setEkran('profil'); }}
          >
            <View style={s.profilAvatar}>
              <Text style={s.avatarHarf}>{kullanici?.ad?.[0] || '?'}</Text>
            </View>
            <Text style={s.profilAd}>{kullanici?.ad || 'Usta'}</Text>
            <Text style={s.profilDuzenleText}>
              {kullanici?.abonelik
                ? '👑 VIP ABONE'
                : `Hak: ${kullanici?.hak ?? 0} | Yeni: ${kullanici?.yeniKullaniciHakki ?? 0}`}
            </Text>
          </TouchableOpacity>

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

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setOdemeAdim('secim'); setEkran('odeme'); }}>
            <Text style={s.menuText}>🎫 Paket & Kupon</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('davet'); }}>
            <Text style={s.menuText}>🎁 Davet Et, Kazan</Text>
          </TouchableOpacity>

          {/* Admin Paneli — sadece admin rolündeyse görünür */}
          {kullanici?.rol === 'admin' && (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAcik(false); setEkran('admin'); }}>
              <Text style={[s.menuText, { color: '#F39C12' }]}>⚙️ Admin Paneli</Text>
            </TouchableOpacity>
          )}

          <View style={s.ayrac} />

          {/* Muğla Usta Raporu */}
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
  kullanici, rol, ilanlar, yenileniyor, onYenile,
  setEkran, setMenuAcik, setSecilenIlan,
  ustaTeklifTiklandi, setBildirimEkrani, s
}) {
  const [seciliKategori, setSeciliKategori] = useState('Tümü');
  const [filtreAcik, setFiltreAcik] = useState(false);

  // Anasayfa ilan filtresi
  const anasayfaIlanlari = ilanlar.filter(ilan => {
    const bolgeUygun = ilan.bolge === kullanici?.bolge;
    const kategoriUygun = rol === 'usta'
      ? (seciliKategori === 'Tümü' ? ilan.kategori === kullanici?.meslek : ilan.kategori === seciliKategori)
      : (seciliKategori === 'Tümü' || ilan.kategori === seciliKategori);
    return bolgeUygun && kategoriUygun;
  });

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
        <Text style={s.headerBaslik}>
          {rol === 'usta' ? '🛠️ Açık İşler' : '📋 İlanlar'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={setBildirimEkrani}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFiltreAcik(!filtreAcik)}>
            <Text style={{ fontSize: 22, color: '#1B4965' }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Kategori Filtresi */}
      {filtreAcik && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: '#F5F5F0', maxHeight: 52 }}
          contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 8, alignItems: 'center' }}
        >
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
        data={anasayfaIlanlari}
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
                ? 'Bölgende henüz iş ilanı yok gari.\nBirazdan gelir!'
                : 'Bölgende henüz ilan yok.\nİlk ilanı sen ver!'}
            </Text>
          </View>
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
