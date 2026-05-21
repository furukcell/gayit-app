// UstaIstatistikModali.js
// Kullanım: TekliflerEkrani.js ve SohbetEkrani.js'e import edilir
// <UstaIstatistikModali ustaId="uid_usta1" visible={true} onClose={() => {}} />

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Animated, ActivityIndicator, Dimensions
} from 'react-native';
import { database } from '../firebase'; 
import { ref, get } from 'firebase/database';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Renk sistemi ────────────────────────────────────────────────
function getRenk(tip, deger) {
  if (tip === 'puan') {
    if (deger >= 4.5) return '#22c55e';
    if (deger >= 3.5) return '#f59e0b';
    return '#ef4444';
  }
  if (tip === 'yanis') { // dakika
    if (deger <= 15) return '#22c55e';
    if (deger <= 60) return '#f59e0b';
    return '#ef4444';
  }
  if (tip === 'tamamlama') { // yüzde
    if (deger >= 90) return '#22c55e';
    if (deger >= 70) return '#f59e0b';
    return '#ef4444';
  }
  if (tip === 'skor') {
    if (deger >= 75) return '#22c55e';
    if (deger >= 50) return '#f59e0b';
    return '#ef4444';
  }
  return '#6b7280';
}

function getRenkAdi(renk) {
  if (renk === '#22c55e') return 'iyi';
  if (renk === '#f59e0b') return 'orta';
  return 'düşük';
}

// ─── Tekliف Skoru Hesaplama ───────────────────────────────────────
function teklifSkoruHesapla(ist, tumUstalar = []) {
  const maxIs = Math.max(...tumUstalar.map(u => u.toplamIs || 1), ist.toplamIs || 1);
  const maxSaat = 10; // referans max tamamlama süresi

  const isAgirligi   = ((ist.toplamIs || 0) / maxIs * 100) * 0.35;
  const puanAgirligi = ((ist.ortalamaPuan || 0) / 5 * 100) * 0.30;
  const yanisAgirligi = Math.max(0, 100 - (ist.ortalamaYanisSuresiDk || 0)) * 0.20;
  const tamamlamaAgirligi = Math.max(0, 100 - ((ist.ortalamaTamamlamaSaati || 0) / maxSaat * 100)) * 0.15;

  return Math.min(100, isAgirligi + puanAgirligi + yanisAgirligi + tamamlamaAgirligi);
}

// ─── Yardımcı: süre formatı ───────────────────────────────────────
function formatSure(dakika) {
  if (!dakika) return '—';
  if (dakika < 60) return `${Math.round(dakika)} dk`;
  return `${(dakika / 60).toFixed(1)} sa`;
}

function formatGun(gun) {
  if (!gun) return '—';
  if (gun < 30) return `${gun} gün`;
  const ay = Math.floor(gun / 30);
  return `${ay} ay`;
}

// ─── Mini Kart (TekliflerEkrani ve SohbetEkrani'nda kullanılır) ───
export function UstaMiniKart({ ustaId, ustaAd, onPress }) {
  const [ist, setIst] = useState(null);

  useEffect(() => {
    const r = ref(database, `istatistikler/${ustaId}`);
    get(r).then(snap => snap.exists() && setIst(snap.val()));
  }, [ustaId]);

  const tamamlamaPct = ist
    ? Math.round(((ist.tamamlanan || 0) / (ist.toplamIs || 1)) * 100)
    : null;

  return (
    <TouchableOpacity style={styles.miniKart} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.miniUstaAd} numberOfLines={1}>{ustaAd || 'Usta'}</Text>
      {ist ? (
        <View style={styles.miniSatir}>
          {/* Puan */}
          <View style={styles.miniChip}>
            <Text style={styles.miniEmoji}>⭐</Text>
            <Text style={[styles.miniDeger, { color: getRenk('puan', ist.ortalamaPuan) }]}>
              {ist.ortalamaPuan?.toFixed(1) || '—'}
            </Text>
          </View>
          {/* İş sayısı */}
          <View style={styles.miniChip}>
            <Text style={styles.miniEmoji}>🔨</Text>
            <Text style={styles.miniDeger}>{ist.tamamlanan || 0} iş</Text>
          </View>
          {/* Tamamlama % */}
          <View style={styles.miniChip}>
            <Text style={styles.miniEmoji}>✅</Text>
            <Text style={[styles.miniDeger, { color: getRenk('tamamlama', tamamlamaPct) }]}>
              %{tamamlamaPct ?? '—'}
            </Text>
          </View>
          {/* Yanıt süresi */}
          <View style={styles.miniChip}>
            <Text style={styles.miniEmoji}>⚡</Text>
            <Text style={[styles.miniDeger, { color: getRenk('yanis', ist.ortalamaYanisSuresiDk) }]}>
              {formatSure(ist.ortalamaYanisSuresiDk)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.miniYukleniyor}>istatistik yükleniyor...</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Ana Modal Bileşeni ───────────────────────────────────────────
export default function UstaIstatistikModali({ ustaId, ustaAd, visible, onClose }) {
  const [ist, setIst]       = useState(null);
  const [yukleniyor, setYuk] = useState(true);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (!visible || !ustaId) return;
    setYuk(true);

    const r = ref(database, `istatistikler/${ustaId}`);
    get(r).then(snap => {
      setIst(snap.exists() ? snap.val() : null);
      setYuk(false);
    }).catch(() => setYuk(false));
  }, [visible, ustaId]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // ─ Hesaplamalar ─
  const tamamlamaPct = ist
    ? Math.round(((ist.tamamlanan || 0) / (ist.toplamIs || 1)) * 100)
    : 0;
  const teklifKabulPct = ist && ist.toplamTeklif > 0
    ? Math.round((ist.tamamlanan / ist.toplamTeklif) * 100)
    : 0;
  const skor = ist ? teklifSkoruHesapla(ist) : 0;

  // En çok kategori
  const enCokKategori = ist?.kategoriler
    ? Object.entries(ist.kategoriler).sort((a, b) => b[1] - a[1])[0]
    : null;

  // Çalışılan ilçeler (sıralı)
  const ilceler = ist?.ilceler
    ? Object.entries(ist.ilceler).sort((a, b) => b[1] - a[1])
    : [];

  // ─ İlçe + kategori sıralaması ─
  const ilceKategoriSira = ist?.skorlar?.ilceKategoriSira || {};
  const muglaKategoriSira = ist?.skorlar?.muglaGenelKategoriSira || {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Başlık */}
            <View style={styles.header}>
              <View>
                <Text style={styles.ustaAd}>{ustaAd || 'Usta'}</Text>
                {ist?.ilceler && (
                  <Text style={styles.ilceTxt}>{ilceler[0]?.[0]} · Muğla</Text>
                )}
              </View>
              {/* Teklif Skoru Rozeti */}
              {ist && (
                <View style={[styles.skorRozet, { borderColor: getRenk('skor', skor) }]}>
                  <Text style={[styles.skorSayi, { color: getRenk('skor', skor) }]}>
                    {skor.toFixed(0)}
                  </Text>
                  <Text style={styles.skorAlt}>skor</Text>
                </View>
              )}
            </View>

            {yukleniyor ? (
              <View style={styles.yukleniyor}>
                <ActivityIndicator color="#6366f1" />
                <Text style={styles.yuklText}>İstatistikler yükleniyor...</Text>
              </View>
            ) : ist ? (
              <ScrollView showsVerticalScrollIndicator={false}>

                {/* ─ Mini özet satırı ─ */}
                <View style={styles.ozetSatir}>
                  <OzetKart baslik="Puan" deger={ist.ortalamaPuan?.toFixed(1) || '—'} renk={getRenk('puan', ist.ortalamaPuan)} ikon="⭐" />
                  <OzetKart baslik="İş" deger={ist.tamamlanan || 0} renk="#6b7280" ikon="🔨" />
                  <OzetKart baslik="Tamamlama" deger={`%${tamamlamaPct}`} renk={getRenk('tamamlama', tamamlamaPct)} ikon="✅" />
                  <OzetKart baslik="Yanıt" deger={formatSure(ist.ortalamaYanisSuresiDk)} renk={getRenk('yanis', ist.ortalamaYanisSuresiDk)} ikon="⚡" />
                </View>

                {/* ─ Detay listesi ─ */}
                <View style={styles.blok}>
                  <Text style={styles.blokBaslik}>Performans</Text>
                  <DetayRow label="Gayit'te süre" deger={formatGun(ist.gayitteGunSayisi)} />
                  <DetayRow
                    label="Teklif / kabul oranı"
                    deger={`${ist.toplamTeklif || 0} teklif → %${teklifKabulPct}`}
                    renk={getRenk('tamamlama', teklifKabulPct)}
                  />
                  <DetayRow
                    label="Ortalama yanıt süresi"
                    deger={formatSure(ist.ortalamaYanisSuresiDk)}
                    renk={getRenk('yanis', ist.ortalamaYanisSuresiDk)}
                  />
                  <DetayRow
                    label="Ortalama tamamlama"
                    deger={ist.ortalamaTamamlamaSaati
                      ? `${ist.ortalamaTamamlamaSaati.toFixed(1)} sa`
                      : '—'}
                  />
                  <DetayRow
                    label="Toplam değerlendirme"
                    deger={`${ist.toplamPuanSayisi || 0} müşteri`}
                  />
                  {enCokKategori && (
                    <DetayRow
                      label="En çok çalıştığı alan"
                      deger={`${enCokKategori[0]} (${enCokKategori[1]} iş)`}
                    />
                  )}
                </View>

                {/* ─ Kategori sıralaması (Muğla geneli) ─ */}
                {Object.keys(muglaKategoriSira).length > 0 && (
                  <View style={styles.blok}>
                    <Text style={styles.blokBaslik}>Muğla Geneli Sıralama</Text>
                    {Object.entries(muglaKategoriSira).map(([kat, sira]) => (
                      <SiraRow
                        key={kat}
                        label={kat}
                        sira={sira}
                        bolgeTxt="Muğla"
                      />
                    ))}
                  </View>
                )}

                {/* ─ İlçe + kategori sıralaması ─ */}
                {Object.keys(ilceKategoriSira).length > 0 && (
                  <View style={styles.blok}>
                    <Text style={styles.blokBaslik}>İlçe Sıralaması</Text>
                    {Object.entries(ilceKategoriSira).map(([key, sira]) => {
                      const [ilce, ...katArr] = key.split('_');
                      const kat = katArr.join(' ');
                      return (
                        <SiraRow
                          key={key}
                          label={kat}
                          sira={sira}
                          bolgeTxt={ilce}
                        />
                      );
                    })}
                  </View>
                )}

                {/* ─ Çalıştığı ilçeler ─ */}
                {ilceler.length > 0 && (
                  <View style={styles.blok}>
                    <Text style={styles.blokBaslik}>Çalıştığı İlçeler</Text>
                    <View style={styles.ilceChipSatir}>
                      {ilceler.map(([ilce, sayi]) => (
                        <View key={ilce} style={styles.ilceChip}>
                          <Text style={styles.ilceChipTxt}>{ilce}</Text>
                          <Text style={styles.ilceChipSayi}>{sayi} iş</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ─ Teklif skoru detayı ─ */}
                <View style={[styles.blok, styles.skorBlok]}>
                  <Text style={styles.blokBaslik}>Teklif Skoru</Text>
                  <View style={styles.skorBar}>
                    <View
                      style={[
                        styles.skorDolum,
                        { width: `${skor}%`, backgroundColor: getRenk('skor', skor) }
                      ]}
                    />
                  </View>
                  <Text style={[styles.skorAciklama, { color: getRenk('skor', skor) }]}>
                    {skor.toFixed(1)} / 100 — {getRenkAdi(getRenk('skor', skor))}
                  </Text>
                  <Text style={styles.skorFormul}>
                    İş sayısı (%35) + Puan (%30) + Yanıt hızı (%20) + Tamamlama hızı (%15)
                  </Text>
                </View>

                <View style={{ height: 32 }} />
              </ScrollView>
            ) : (
              <View style={styles.yukleniyor}>
                <Text style={styles.yuklText}>Henüz istatistik yok</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Alt bileşenler ───────────────────────────────────────────────

function OzetKart({ baslik, deger, renk, ikon }) {
  return (
    <View style={styles.ozetKart}>
      <Text style={styles.ozetIkon}>{ikon}</Text>
      <Text style={[styles.ozetDeger, { color: renk || '#111' }]}>{deger}</Text>
      <Text style={styles.ozetBaslik}>{baslik}</Text>
    </View>
  );
}

function DetayRow({ label, deger, renk }) {
  return (
    <View style={styles.detayRow}>
      <Text style={styles.detayLabel}>{label}</Text>
      <Text style={[styles.detayDeger, renk ? { color: renk } : {}]}>{deger || '—'}</Text>
    </View>
  );
}

function SiraRow({ label, sira, bolgeTxt }) {
  const madalya = sira === 1 ? '🥇' : sira === 2 ? '🥈' : sira === 3 ? '🥉' : `#${sira}`;
  return (
    <View style={styles.detayRow}>
      <Text style={styles.detayLabel}>{bolgeTxt} — {label}</Text>
      <Text style={styles.siraTxt}>{madalya}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Mini kart
  miniKart: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  miniUstaAd: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  miniSatir: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniEmoji: { fontSize: 11 },
  miniDeger: { fontSize: 12, fontWeight: '600', color: '#334155' },
  miniYukleniyor: { fontSize: 11, color: '#94a3b8' },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.88,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ustaAd: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  ilceTxt: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  skorRozet: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  skorSayi: {
    fontSize: 22,
    fontWeight: '800',
  },
  skorAlt: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Özet satırı
  ozetSatir: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  ozetKart: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ozetIkon: { fontSize: 16, marginBottom: 4 },
  ozetDeger: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  ozetBaslik: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },

  // Blok
  blok: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  blokBaslik: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Detay satırı
  detayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detayLabel: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  detayDeger: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'right',
  },
  siraTxt: {
    fontSize: 16,
    fontWeight: '700',
  },

  // İlçe chipları
  ilceChipSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ilceChip: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  ilceChipTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  ilceChipSayi: {
    fontSize: 11,
    color: '#3b82f6',
  },

  // Skor bar
  skorBlok: {},
  skorBar: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  skorDolum: {
    height: '100%',
    borderRadius: 5,
  },
  skorAciklama: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  skorFormul: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },

  // Loading
  yukleniyor: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  yuklText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
