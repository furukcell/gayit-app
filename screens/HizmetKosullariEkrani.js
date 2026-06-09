// ============================================================
// HizmetKosullariEkrani.js
// Hizmet koşulları ekranı
// ============================================================

import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

const MADDELER = [
  {
    baslik: '1. Kabul',
    icerik: 'GAYIT uygulamasını indirerek, kaydolarak veya kullanarak bu Kullanım Koşullarını okuduğunuzu ve kabul ettiğinizi beyan etmiş olursunuz. Kabul etmiyorsanız uygulamayı kullanmayınız.',
  },
  {
    baslik: '2. Hizmetin Tanımı',
    icerik: 'GAYIT; Muğla ili ve ilçelerinde  müşteriler ile hizmet ustaları arasında bağlantı kuran bir dijital pazaryeri platformudur.\n\nGAYIT bir aracı platformdur. Uygulama, müşteri ve usta arasındaki hizmet ilişkisinin tarafı değildir. Ustalar bağımsız bireysel hizmet sağlayıcılardır; GAYIT çalışanı veya temsilcisi değildir.',
  },
  {
    baslik: '3. Kullanıcı Rolleri',
    icerik: '• Müşteri: Hizmet ilanı oluşturan, teklif değerlendiren ve usta ile anlaşan kişi.\n• Usta: Kendi branşına ve bölgesine uygun ilanlara teklif veren, hizmet sunan kişi.\n• Admin: Platforma ait yönetim yetkisine sahip olan taraf.\n\nHer kullanıcı yalnızca bir role sahip olabilir. Rol değişikliği mümkün değildir.',
  },
  {
    baslik: '4. Kayıt ve Hesap Güvenliği',
    icerik: '• Kayıt için gerçek ve güncel bilgi vermeniz zorunludur.\n• Hesap bilgilerinizin gizliliğinden siz sorumlusunuz.\n• Başkasının adına hesap açmak yasaktır.\n• Şüpheli aktivite tespit etmeniz halinde derhal destek.fkdigital@gmail.com adresine bildirmeniz gerekmektedir.\n• 18 yaşından küçük bireyler uygulamayı kullanamaz.',
  },
  {
    baslik: '5. İlan ve Teklif Kuralları',
    icerik: 'Müşteri için:\n• Aynı kategoride yalnızca bir aktif ilan oluşturulabilir.\n• İlan bilgileri gerçek ve eksiksiz olmalıdır.\n• Teklif geldiğinde dürüst değerlendirme beklenmektedir.\n• Hizmet gerçekleşmeden "İş Tamamlandı" işareti yapılmamalıdır.\n\nUsta için:\n• Yalnızca kendi branşı ve çalışma bölgesiyle ilgili ilanlara teklif verilebilir.\n• Teklif miktarı gerçekçi ve nihai olmak zorundadır.\n• Anlaşma sağlandıktan sonra hizmetin yerine getirilmesi zorunludur.\n• Haklı sebep olmaksızın anlaşmadan vazgeçmek hesap puanını olumsuz etkiler.',
  },
  {
    baslik: '6. Onaylı Usta Sistemi',
    icerik: '• Onaylı Usta statüsü; kimlik fotoğrafı ve en az bir mesleki belge (ustalık belgesi, vergi levhası, esnaf sicil vb.) yüklenerek başvurulur.\n• Profilde telefon numarası bulunması zorunludur.\n• Admin incelemesi sonucunda onay verilir veya reddedilir.\n• Onaylı statü platforma güven amacıyla verilir; hizmet kalitesinin garantisi değildir.\n• VIP abonelik ve kuponlara erişim yalnızca Onaylı Usta statüsündeki kullanıcılara açıktır.',
  },
  {
    baslik: '7. İletişim ve Gizlilik',
    icerik: '• Telefon numarası paylaşımı yalnızca uygulama içi anlaşma sağlandıktan sonra mümkündür.\n• Anlaşma olmaksızın başka kullanıcıların iletişim bilgilerine erişilemez.\n• Uygulama dışına taşınan tüm iletişim ve işlemler GAYIT\'in sorumluluğu dışındadır.',
  },
  {
    baslik: '8. Ödeme ve Haklar',
    icerik: '• Uygulama içi satın almalar Google Play Billing ve RevenueCat üzerinden gerçekleştirilir.\n• İlan hakkı, teklif hakkı ve abonelikler satın alma veya kupon kullanımıyla tanımlanır.\n• Kullanılan haklar iade edilmez.\n• Abonelikler belirtilen süre dolduğunda otomatik olarak standart pakete düşer.\n• Kupon kodları yalnızca belirtilen koşulları sağlayan kullanıcılar tarafından kullanılabilir.',
  },
  {
    baslik: '9. Yasaklı Kullanımlar',
    icerik: 'Aşağıdaki davranışlar kesinlikle yasaktır:\n\n• Sahte, yanıltıcı veya iftira niteliğinde içerik paylaşmak\n• Başka kullanıcıları taciz etmek, tehdit etmek veya kötü niyetle derecelendirmek\n• Sistemi manipüle etmek amacıyla sahte ilan veya teklif oluşturmak\n• Rakip platforma yönlendirme yapmak\n• Uygulama altyapısına zarar verecek teknik müdahalelerde bulunmak\n• Uygulamayı Muğla hizmet bölgesi dışında kullanmak amacıyla istismar etmek',
  },
  {
    baslik: '10. İçerik Sorumluluğu',
    icerik: '• Kullanıcılar paylaştıkları içerikten (ilan, teklif, mesaj, fotoğraf) bizzat sorumludur.\n• GAYIT, kullanıcı içeriklerini önceden denetlemez; ancak şikâyet üzerine veya proaktif olarak içerikleri kaldırma, kullanıcıyı askıya alma veya silme hakkını saklı tutar.\n• Admin, uygun gördüğünde herhangi bir ilanı veya hesabı gerekçe göstermeksizin kaldırabilir.',
  },
  {
    baslik: '11. Puanlama ve Şikâyet',
    icerik: '• Puanlama yalnızca gerçekleşmiş hizmetler için yapılabilir.\n• Gerçek dışı veya kötü niyetli puanlama şikâyete konu olabilir ve silinebilir.\n• Şikâyetler admin tarafından incelenir; sonuç hakkında bilgilendirme yapılabilir.',
  },
  {
    baslik: '12. Sorumluluk Sınırı',
    icerik: 'GAYIT bir aracı platformdur. Aşağıdaki durumlardan sorumlu tutulamaz:\n\n• Hizmet sırasında oluşan maddi / manevi zararlar\n• Usta ile müşteri arasındaki anlaşmazlıklar\n• Hizmetin yapılmaması veya eksik yapılması\n• Kullanıcıların paylaştığı konum bilgilerinin kötüye kullanılması\n• Üçüncü taraf ödeme veya bildirim altyapısından kaynaklanan sorunlar',
  },
  {
    baslik: '13. Fesih',
    icerik: '• Kullanıcı istediği zaman hesabını silebilir.\n• GAYIT, koşulları ihlal eden kullanıcıların hesabını önceden bildirmeksizin askıya alabilir veya silebilir.',
  },
  {
    baslik: '14. Değişiklikler',
    icerik: 'Bu koşullar zaman zaman güncellenebilir. Güncel versiyon her zaman uygulama içinde erişilebilir olacaktır. Önemli değişikliklerde uygulama içi bildirim yapılır.',
  },
  {
    baslik: '15. Uygulanacak Hukuk',
    icerik: 'Bu sözleşme Türkiye Cumhuriyeti hukukuna tabidir. Anlaşmazlıklarda Muğla mahkemeleri yetkilidir.',
  },
];

export function HizmetKosullariEkrani({ setEkran, setSozlesmeKabul, kayittan, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran(kayittan ? 'auth' : 'anasayfa')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>Hizmet Koşulları</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 4, textAlign: 'center' }}>
          GAYIT KULLANIM VE HİZMET KOŞULLARI
        </Text>
        <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
          Son güncelleme: Haziran 2026
        </Text>

        {MADDELER.map((madde, i) => (
          <View key={i} style={{ marginBottom: 22 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 6 }}>
              {madde.baslik}
            </Text>
            <Text style={{ color: '#526E7F', lineHeight: 23, fontSize: 13 }}>
              {madde.icerik}
            </Text>
          </View>
        ))}

        {kayittan && (
          <TouchableOpacity
            style={[s.girisBtn, { marginBottom: 40 }]}
            onPress={() => {
              if (setSozlesmeKabul) setSozlesmeKabul(true);
              setEkran('auth');
            }}
          >
            <Text style={s.anaBtnY}>✅ OKUDUM, ANLADIM</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
