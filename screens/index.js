// ============================================================
// screens/index.js
// Tüm ekranları tek noktadan export et
// App.js'te şöyle kullan:
//   import { OdemeEkrani, DavetEkrani, ... } from './screens';
// ============================================================

export { revenueCatBaslat, REVENUECAT_API_KEY, PAKET_ID_MAP } from './revenueCat';
export { OdemeEkrani }         from './OdemeEkrani';
export { DavetEkrani }         from './DavetEkrani';
export { AyarlarEkrani }       from './AyarlarEkrani';
export { IletisimEkrani }      from './IletisimEkrani';
export { HakkimizdaEkrani }    from './HakkimizdaEkrani';
export { HizmetKosullariEkrani } from './HizmetKosullariEkrani';
export { BildirimEkrani }      from './BildirimEkrani';
