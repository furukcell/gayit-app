const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.database();

const tokenDogrula = async (req) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) throw new Error('Token yok.');
  const token = auth.split('Bearer ')[1];
  return await admin.auth().verifyIdToken(token);
};

exports.kuponUygula = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const decoded = await tokenDogrula(req);
    const uid = decoded.uid;
    const { kuponKod, rol } = req.body.data || {};
    if (!kuponKod) { res.json({ error: { message: 'Kupon kodu bos.' } }); return; }
    const kuponlarSnap = await db.ref('kuponlar').once('value');
    const kuponlar = kuponlarSnap.val();
    if (!kuponlar) { res.json({ error: { message: 'Gecersiz kupon kodu.' } }); return; }
    const kuponEntry = Object.entries(kuponlar).find(([, k]) => k.ad === kuponKod.trim().toUpperCase() && k.aktif);
    if (!kuponEntry) { res.json({ error: { message: 'Gecersiz veya pasif kupon kodu.' } }); return; }
    const [kuponId, kupon] = kuponEntry;
    if (kupon.bitisTarihi && Date.now() > kupon.bitisTarihi) { res.json({ error: { message: 'Bu kuponun suresi dolmus.' } }); return; }
    const kullanilanAdet = kupon.kullanilanAdet || 0;
    if (kupon.adet && kullanilanAdet >= kupon.adet) { res.json({ error: { message: 'Kullanim hakki dolmus.' } }); return; }
    if (kupon.hedef && kupon.hedef !== 'hepsi' && kupon.hedef !== rol) { res.json({ error: { message: 'Bu kupon size uygun degil.' } }); return; }
    if (kupon.kullananlar && kupon.kullananlar[uid]) { res.json({ error: { message: 'Bu kuponu daha once kullandiniz.' } }); return; }
    const kullaniciSnap = await db.ref('kullanicilar/' + uid).once('value');
    const kullanici = kullaniciSnap.val();
    if (kupon.paket === 'vip') {
      if (!kullanici || kullanici.onayDurumu !== 'onayli') {
        res.json({ error: { message: 'Bu kupon sadece onayli ustalar icindir.' } }); return;
      }
    }
    if (kupon.tip === 'hediye_abonelik' || kupon.tip === 'promosyon') {
      const sure = kupon.sure || (kupon.ay * 30 * 24 * 60 * 60 * 1000);
      const bitis = Date.now() + sure;
      const abonelikDegeri = kupon.paket || 'premium';
      let hakGuncelleme = {};
      if (rol === 'usta') {
        hakGuncelleme = abonelikDegeri === 'vip' ? { hak: 9999, acilHak: 0 } : { hak: 30, acilHak: 0 };
      } else {
        hakGuncelleme = abonelikDegeri === 'vip' ? { hak: 999, acilHak: 4 } : { hak: 10, acilHak: 2 };
      }
      await db.ref('kullanicilar/' + uid).update({ abonelik: abonelikDegeri, abonelikBitis: bitis, ...hakGuncelleme });
      await db.ref('kuponlar/' + kuponId).update({ kullanilanAdet: kullanilanAdet + 1, ['kullananlar/' + uid]: true });
      res.json({ result: { tip: 'abonelik', abonelik: abonelikDegeri, mesaj: abonelikDegeri + ' aboneligin aktiflestirildi!' } });
      return;
    }
    const yeniHak = ((kullanici && kullanici.hak) || 0) + (kupon.icerik || 1);
    await db.ref('kullanicilar/' + uid).update({ hak: yeniHak });
    await db.ref('kuponlar/' + kuponId).update({ kullanilanAdet: kullanilanAdet + 1, ['kullananlar/' + uid]: true });
    res.json({ result: { tip: 'hak', hak: yeniHak, mesaj: 'Kupon uygulandi! ' + kupon.icerik + ' hak eklendi.' } });
  } catch (e) { res.json({ error: { message: e.message || 'Bir hata olustu.' } }); }
});

exports.odemeHakVer = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const decoded = await tokenDogrula(req);
    const uid = decoded.uid;
    const { paketTipi, rol } = req.body.data || {};
    const kullaniciSnap = await db.ref('kullanicilar/' + uid).once('value');
    const kullanici = kullaniciSnap.val();
    let yeniHak = (kullanici && kullanici.hak) || 0;
    let yeniAcilHak = (kullanici && kullanici.acilHak) || 0;
    let abonelikDegeri = null;
    let otuzGunSonra = null;
    let mesaj = '';
    if (rol === 'usta') {
      if (paketTipi === 'baslangic') { yeniHak += 3; mesaj = '3 teklif hakki tanimlandi!'; }
      else if (paketTipi === 'premium') { yeniHak += 30; abonelikDegeri = 'premium'; otuzGunSonra = Date.now() + 2592000000; mesaj = 'Premium abonelik aktiflestirildi!'; }
      else if (paketTipi === 'vip') { abonelikDegeri = 'vip'; otuzGunSonra = Date.now() + 2592000000; mesaj = 'VIP abonelik aktiflestirildi!'; }
    } else {
      if (paketTipi === 'tekli') { yeniHak += 1; mesaj = '1 ilan hakki tanimlandi!'; }
      else if (paketTipi === 'acil') { yeniAcilHak += 1; mesaj = '1 acil ilan hakki tanimlandi!'; }
      else if (paketTipi === 'premium') { yeniHak += 10; yeniAcilHak += 2; abonelikDegeri = 'premium'; otuzGunSonra = Date.now() + 2592000000; mesaj = 'Premium paket aktiflestirildi!'; }
      else if (paketTipi === 'vip') { yeniHak += 999; yeniAcilHak += 4; abonelikDegeri = 'vip'; otuzGunSonra = Date.now() + 2592000000; mesaj = 'VIP paket aktiflestirildi!'; }
    }
    const guncelleme = { hak: yeniHak, acilHak: yeniAcilHak };
    if (abonelikDegeri) { guncelleme.abonelik = abonelikDegeri; guncelleme.abonelikBitis = otuzGunSonra; }
    await db.ref('kullanicilar/' + uid).update(guncelleme);
    res.json({ result: { mesaj, hak: yeniHak, acilHak: yeniAcilHak, abonelik: abonelikDegeri } });
  } catch (e) { res.json({ error: { message: e.message || 'Bir hata olustu.' } }); }
});

exports.restoreAbonelik = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const decoded = await tokenDogrula(req);
    const uid = decoded.uid;
    const { abonelikDegeri } = req.body.data || {};
    if (!abonelikDegeri) { res.json({ error: { message: 'Abonelik degeri bos.' } }); return; }
    const otuzGunSonra = Date.now() + 2592000000;
    await db.ref('kullanicilar/' + uid).update({ abonelik: abonelikDegeri, abonelikBitis: otuzGunSonra });
    res.json({ result: { mesaj: 'Abonelik geri yuklendi!', abonelik: abonelikDegeri } });
  } catch (e) { res.json({ error: { message: e.message || 'Bir hata olustu.' } }); }
});

exports.bildirimGonder = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    await tokenDogrula(req);
    const { hedefUid, baslik, mesaj, ekran } = req.body.data || {};
    if (!hedefUid || !baslik || !mesaj) { res.json({ error: { message: 'hedefUid, baslik ve mesaj zorunlu.' } }); return; }
    const hedefSnap = await db.ref('kullanicilar/' + hedefUid).once('value');
    const hedefData = hedefSnap.val();
    if (hedefData && hedefData.pushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: hedefData.pushToken, title: baslik, body: mesaj, data: { ekran: ekran || 'anasayfa' }, sound: 'default' }),
      });
    }
    await db.ref('bildirimler/' + hedefUid).push({ baslik, mesaj, tarih: Date.now(), okundu: false });
    res.json({ result: { ok: true } });
  } catch (e) { res.json({ error: { message: e.message || 'Bir hata olustu.' } }); }
});

exports.abonelikKontrol = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  const simdi = Date.now();
  const snap = await db.ref('kullanicilar').once('value');
  const kullanicilar = snap.val();
  if (!kullanicilar) return null;
  const guncellemeler = {};
  Object.entries(kullanicilar).forEach(([uid, k]) => {
    if (k.abonelik && k.abonelik !== 'standart' && k.abonelikBitis && k.abonelikBitis < simdi) {
      guncellemeler[uid + '/abonelik'] = 'standart';
      guncellemeler[uid + '/abonelikBitis'] = null;
    }
  });
  if (Object.keys(guncellemeler).length > 0) await db.ref('kullanicilar').update(guncellemeler);
  return null;
});
