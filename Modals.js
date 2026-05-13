// ============================================================
// ADIM 10 — Modals.js
// PuanModali ve SikayetModali
// ============================================================

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, Alert, ScrollView
} from 'react-native';
import { DB_URL } from './constants';
import { bildirimGonderVeKaydet } from './notifications';

// Firebase key olarak email kullanılırken nokta ve @ yasak
const emaildenKey = (email) =>
  email.replace(/\./g, '_').replace(/@/g, '_at_');

// ============================================================
// PUAN MODALİ
// ============================================================
export function PuanModali({ gorunur, setGorunur, puanlananIlan, kullanici, ilanlar, setIlanlar, s }) {
  const [secilenPuan, setSecilenPuan] = useState(0);
  const [puanYorum, setPuanYorum] = useState('');

  const puanGonder = async () => {
    if (secilenPuan === 0) {
      Alert.alert('Hata', 'Lütfen bir puan seç!');
      return;
    }

    const ustaEmail = puanlananIlan?.anlasilanUsta?.ustaId;
    const ustaUid = puanlananIlan?.anlasilanUsta?.ustaUid;

    if (!ustaEmail) {
      Alert.alert('Hata', 'Usta bilgisi bulunamadı!');
      return;
    }

    try {
      // 1. Puanı puanlar koleksiyonuna kaydet
      await fetch(`${DB_URL}/puanlar/${emaildenKey(ustaEmail)}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puan: secilenPuan,
          yorum: puanYorum,
          musteriAd: kullanici?.ad || 'Anonim',
          musteriEmail: kullanici?.email,
          ilanBaslik: puanlananIlan?.baslik,
          tarih: Date.now(),
        }),
      });

      // 2. Ustanın mevcut puanlarını çek, ortalama hesapla, kullanicilar tablosunu güncelle
      if (ustaUid) {
        try {
          const puanRes = await fetch(`${DB_URL}/puanlar/${emaildenKey(ustaEmail)}.json`);
          const puanData = await puanRes.json();
          if (puanData) {
            const tumPuanlar = Object.values(puanData);
            const puanSayisi = tumPuanlar.length;
            const ortalama = (tumPuanlar.reduce((t, p) => t + p.puan, 0) / puanSayisi).toFixed(1);
            await fetch(`${DB_URL}/kullanicilar/${ustaUid}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                puan: parseFloat(ortalama),
                puanSayisi,
              }),
            });
          }
        } catch (e) {
          console.log('Kullanıcı puan güncellenemedi:', e);
        }
      }

      // 3. İlanı puanlandı olarak işaretle
      await fetch(`${DB_URL}/ilanlar/${puanlananIlan?.id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puanlandi: true }),
      });

      // 4. Ustaya bildirim gönder
      if (ustaUid) {
        await bildirimGonderVeKaydet(
          ustaUid,
          '⭐ Yeni Değerlendirme!',
          `${kullanici?.ad} sana ${secilenPuan} yıldız verdi!`
        );
      }

      // 5. Local state güncelle
      if (setIlanlar) {
        setIlanlar(prev => prev.map(i =>
          i.id === puanlananIlan?.id ? { ...i, puanlandi: true } : i
        ));
      }

      Alert.alert('Teşekkürler! ⭐', 'Değerlendirmen kaydedildi!');
      setSecilenPuan(0);
      setPuanYorum('');
      setGorunur(false);
    } catch (e) {
      Alert.alert('Hata', 'Puan gönderilemedi!');
    }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={s.modalKutu}>
          <Text style={s.modalBaslik}>⭐ Ustayı Değerlendir</Text>
          <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 15 }}>
            {puanlananIlan?.anlasilanUsta?.ustaAd} ile çalışman nasıldı?
          </Text>

          {/* Yıldız seçimi */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map(y => (
              <TouchableOpacity key={y} onPress={() => setSecilenPuan(y)} style={{ marginHorizontal: 6 }}>
                <Text style={{ fontSize: 36, opacity: secilenPuan >= y ? 1 : 0.25 }}>⭐</Text>
              </TouchableOpacity>
            ))}
          </View>

          {secilenPuan > 0 && (
            <Text style={{ textAlign: 'center', color: '#F39C12', fontWeight: 'bold', marginBottom: 10 }}>
              {['', 'Çok Kötü 😞', 'Kötü 😐', 'İdare Eder 🙂', 'İyi 😊', 'Mükemmel 🤩'][secilenPuan]}
            </Text>
          )}

          <TextInput
            style={[s.inp, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Yorum ekle (isteğe bağlı)..."
            value={puanYorum}
            onChangeText={setPuanYorum}
            multiline
          />

          <TouchableOpacity
            style={[s.girisBtn, { backgroundColor: '#F39C12', marginBottom: 10 }]}
            onPress={puanGonder}
          >
            <Text style={s.anaBtnY}>DEĞERLENDİRMEYİ GÖNDER</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setGorunur(false)}>
            <Text style={{ textAlign: 'center', color: '#A3B1B9' }}>Daha Sonra</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// ŞİKAYET MODALİ
// ============================================================
export function SikayetModali({ gorunur, setGorunur, sikayetHedef, kullanici, s }) {
  const [sikayetMesaj, setSikayetMesaj] = useState('');
  const [sikayetTip, setSikayetTip] = useState('');

  const SIKAYET_TIPLERI = [
    'Sahte İlan',
    'Hakaret / Küfür',
    'Dolandırıcılık',
    'Kalitesiz Hizmet',
    'İletişim Problemi',
    'Diğer',
  ];

  const sikayetGonder = async () => {
    if (!sikayetTip || !sikayetMesaj) {
      Alert.alert('Eksik Bilgi', 'Şikayet türü ve açıklama zorunludur.');
      return;
    }

    try {
      await fetch(`${DB_URL}/sikayetler.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hedef: sikayetHedef,
          tip: sikayetTip,
          mesaj: sikayetMesaj,
          gonderen: kullanici?.email || 'Anonim',
          tarih: Date.now(),
          durum: 'beklemede',
        }),
      });

      Alert.alert('Şikayetin Alındı ✅', 'Yönetim en kısa sürede inceleyecek.');
      setSikayetMesaj('');
      setSikayetTip('');
      setGorunur(false);
    } catch (e) {
      Alert.alert('Hata', 'Şikayet gönderilemedi gari!');
    }
  };

  return (
    <Modal visible={gorunur} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={s.modalKutu}>
          <Text style={s.modalBaslik}>⚠️ Şikayet Et</Text>
          <Text style={{ color: '#526E7F', textAlign: 'center', marginBottom: 15 }}>
            Şikayet ettiğin: <Text style={{ fontWeight: 'bold', color: '#1B4965' }}>{sikayetHedef}</Text>
          </Text>

          {/* Şikayet tipi seçimi */}
          <Text style={[s.inputBaslik, { marginBottom: 8 }]}>Şikayet Türü</Text>
          <View style={s.chipAlan}>
            {SIKAYET_TIPLERI.map(tip => (
              <TouchableOpacity
                key={tip}
                style={[s.chip, sikayetTip === tip && { ...s.chipAktif, borderColor: '#FF4444', backgroundColor: '#FF4444' }]}
                onPress={() => setSikayetTip(tip)}
              >
                <Text style={[s.chipY, sikayetTip === tip && s.chipYAktif]}>{tip}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.inputBaslik, { marginTop: 10, marginBottom: 8 }]}>Açıklama</Text>
          <TextInput
            style={[s.inp, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Yaşadığın sorunu kısaca anlat usta..."
            value={sikayetMesaj}
            onChangeText={setSikayetMesaj}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[s.girisBtn, { backgroundColor: '#FF4444', marginBottom: 10 }]}
            onPress={sikayetGonder}
          >
            <Text style={s.anaBtnY}>ŞİKAYETİ GÖNDER</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setSikayetMesaj(''); setSikayetTip(''); setGorunur(false); }}>
            <Text style={{ textAlign: 'center', color: '#A3B1B9' }}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
