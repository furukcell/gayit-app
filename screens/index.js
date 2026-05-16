// ============================================================
// screens/index.js
// Tüm ekranları tek noktadan export et
// App.js'te şöyle kullan:
//   import { OdemeEkrani, DavetEkrani, ... } from './screens';
// ============================================================

export { revenueCatBaslat, REVENUECAT_API_KEY, PAKET_ID_MAP } from './revenueCat';
export { OdemeEkrani }           from './OdemeEkrani';
export { DavetEkrani }           from './DavetEkrani';
export { AyarlarEkrani }         from './AyarlarEkrani';
export { IletisimEkrani }        from './IletisimEkrani';
export { HakkimizdaEkrani }      from './HakkimizdaEkrani';
export { HizmetKosullariEkrani } from './HizmetKosullariEkrani';
export { BildirimEkrani }        from './BildirimEkrani';
export { AdminScreen }           from './AdminScreen';
export { AuthScreens }           from './AuthScreens';
export { ChatScreen }            from './ChatScreen';
export { HomeScreen }            from './HomeScreen';
export { IlanScreens }           from './IlanScreens';
export { KvkkEkrani }            from './KvkkEkrani';
export { Modals }                from './Modals';
export { ProfileScreens }        from './ProfileScreens';
export { SifremiUnuttumEkrani }   from './SifremiUnuttumEkrani';
