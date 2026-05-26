// ==========================================
// revenueCat.js
// revenuecat konfigürasyonu ve başlatma

import Purchases, { LOG_LEVEL } from 'react-native-purchases';

export const REVENUECAT_API_KEY = 'goog_yzCnxGIpNwIcSRAtNVJTZvRxgfr';

// revenuecat offering ID -> Yerel paket tipi eşleşmesi
export const PAKET_ID_MAP = {
  'musteri_ilan_teksefer': 'tekli',
  'musteri_acil_ilan': 'acil',
  'musteri_premium_aylik': 'premium',
  'musteri_vip_aylik': 'vip',
  'usta_teklif_3': 'baslangic',
  'usta_premium_aylik': 'premium',
  'usta_vip_aylik': 'vip',
};

// App.js veya index.js'te uygulama açılırken bir kere çağır:
// import { revenueCatBaslat } from './screens/revenueCat';
// revenueCatBaslat();
export const revenueCatBaslat = () => {
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
};
