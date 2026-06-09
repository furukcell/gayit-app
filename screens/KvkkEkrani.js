// ============================================================
// KvkkEkrani.js
// ============================================================

import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

const KVKK_MADDELER = [
  {
    baslik: '1. Veri Sorumlusu',
    icerik: '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, GAYIT Platformu veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında işlemektedir.\n\nİletişim: destek.fkdigital@gmail.com',
  },
  {
    baslik: '2. İşlenen Kişisel Veriler',
    icerik: 'a) Kayıt ve Kimlik Bilgileri\n• Ad ve soyad\n• E-posta adresi\n• Telefon numarası (onaylı usta başvurusunda zorunlu)\n• Şifre (şifrelenmiş olarak saklanır, düz metin tutulmaz)\n• Kullanıcı rolü (müşteri / usta)\n\nb) Profil Bilgileri (Usta)\n• Branş ve yan branşlar\n• Çalışma bölgeleri (ilçe/mahalle)\n• Tecrübe yılı ve "Hakkımda" açıklaması\n• Profil fotoğrafı\n• Ortalama puan ve iş istatistikleri\n\nc) Kimlik ve Belge Bilgileri (Onaylı Usta Başvurusu)\n• Kimlik fotoğrafı\n• Ustalık belgesi, vergi levhası, esnaf sicil kaydı veya benzeri mesleki belgeler\n\nd) İlan ve İşlem Bilgileri\n• Oluşturulan ilanlar (kategori, bölge, tarih, açıklama)\n• Verilen teklifler\n• Anlaşma ve iş tamamlama kayıtları\n• Puanlama ve yorumlar\n\ne) Konum Bilgisi\n• İlan oluşturulurken seçilen ilçe/mahalle bilgisi\n• Sohbet içinde kullanıcı tarafından paylaşılan anlık konum (isteğe bağlı)\n\nf) Cihaz ve Teknik Bilgiler\n• Expo push token (bildirim gönderimi için)\n• Uygulama içi oturum tokeni (Firebase Authentication)',
  },
  {
    baslik: '3. Kişisel Verilerin İşlenme Amaçları',
    icerik: 'Toplanan veriler aşağıdaki amaçlarla işlenmektedir:\n\n• Kullanıcı hesabının oluşturulması ve kimlik doğrulama\n• Müşteri-usta eşleştirme hizmetinin sunulması\n• İlan, teklif ve anlaşma süreçlerinin yürütülmesi\n• Onaylı Usta başvurusunun değerlendirilmesi\n• Uygulama içi bildirim gönderimi\n• Şikâyet ve destek süreçlerinin yönetimi\n• Güvenlik, sahtekârlık önleme ve platform bütünlüğünün korunması\n• Yasal yükümlülüklerin yerine getirilmesi',
  },
  {
    baslik: '4. Kişisel Verilerin Aktarımı',
    icerik: 'Kişisel verileriniz aşağıdaki üçüncü taraf hizmet sağlayıcılarla paylaşılmaktadır:\n\n• Google Firebase: Kimlik doğrulama, veri tabanı, depolama, bildirim altyapısı\n• RevenueCat: Abonelik ve ödeme yönetimi\n• Google Play Billing: Uygulama içi satın alma\n• Expo / Expo Notifications: Push bildirim altyapısı\n\nBu aktarımlar, söz konusu hizmetlerin sunulabilmesi için zorunludur. Telefon numaranız yalnızca "Anlaşma Sağlandı" işlemi gerçekleştiğinde karşı tarafa gösterilir. Kişisel verileriniz; yasal zorunluluk olmadıkça ya da açık rızanız alınmadıkça başka üçüncü taraflarla paylaşılmaz, satılmaz veya kiralanmaz.',
  },
  {
    baslik: '5. Kişisel Verilerin Saklanma Süresi',
    icerik: '• Aktif hesap sahiplerinin verileri hesap aktif olduğu sürece saklanır.\n• Hesabın silinmesi halinde veriler, yasal saklama yükümlülükleri saklı kalmak kaydıyla 30 gün içinde silinir veya anonim hale getirilir.\n• Onay başvurularına yönelik kimlik ve belge bilgileri, başvurunun sonuçlanmasından itibaren en geç 1 yıl içinde silinir.',
  },
  {
    baslik: '6. Kişisel Veri Güvenliği',
    icerik: '• Tüm veriler Firebase güvenlik kuralları ile korunmaktadır.\n• Kullanıcılar yalnızca kendi verilerine erişebilir; başka kullanıcıların özel verilerine erişemez.\n• Admin rolü dışındaki kullanıcılar hak, abonelik ve onayDurumu gibi kritik alanları doğrudan değiştiremez.\n• Yüklenen belgeler ve fotoğraflar Firebase Storage üzerinde saklanır.',
  },
  {
    baslik: '7. İlgili Kişinin Hakları (KVKK Madde 11)',
    icerik: 'KVKK kapsamında aşağıdaki haklara sahipsiniz:\n\n• Kişisel verilerinizin işlenip işlenmediğini öğrenme\n• İşlenmişse buna ilişkin bilgi talep etme\n• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme\n• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme\n• Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme\n• KVKK\'nın 7. maddesi çerçevesinde silinmesini isteme\n• Otomatik sistemler vasıtasıyla aleyhinize bir sonucun ortaya çıkmasına itiraz etme\n• Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme\n\nBaşvuru: destek.fkdigital@gmail.com adresine yazılı olarak başvurabilirsiniz.',
  },
  {
    baslik: '8. Çerezler',
    icerik: 'GAYIT bir mobil uygulamadır; tarayıcı çerezi kullanmaz. Oturum bilgileri cihazınızdaki AsyncStorage üzerinde yerel olarak tutulur ve yalnızca uygulamanın çalışması için kullanılır.',
  },
  {
    baslik: '9. Değişiklikler',
    icerik: 'Bu metin zaman zaman güncellenebilir. Önemli değişikliklerde kullanıcılar uygulama içi bildirim ile bilgilendirilir. Güncel metin her zaman uygulama içinde erişilebilir olacaktır.',
  },
];

export function KvkkEkrani({ setEkran, setKvkkKabul, s }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerGeriBtn} onPress={() => setEkran('auth')}>
          <Text style={s.menuSimge}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerBaslik}>KVKK Aydınlatma</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1B4965', marginBottom: 4, textAlign: 'center' }}>
          GAYIT KİŞİSEL VERİLERİN KORUNMASI
        </Text>
        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 6, textAlign: 'center' }}>
          AYDINLATMA METNİ
        </Text>
        <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
          Son güncelleme: Haziran 2026
        </Text>

        {KVKK_MADDELER.map((madde, i) => (
          <View key={i} style={{ marginBottom: 22 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B4965', marginBottom: 6 }}>
              {madde.baslik}
            </Text>
            <Text style={{ color: '#526E7F', lineHeight: 23, fontSize: 13 }}>
              {madde.icerik}
            </Text>
          </View>
        ))}

        <View style={{ backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 20 }}>
          <Text style={{ color: '#588157', fontWeight: 'bold', textAlign: 'center', lineHeight: 22 }}>
            Kayıt olarak bu aydınlatma metnini okuduğunuzu ve anladığınızı onaylıyorsunuz.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.girisBtn, { marginBottom: 40 }]}
          onPress={() => {
            if (setKvkkKabul) setKvkkKabul(true);
            setEkran('auth');
          }}
        >
          <Text style={s.anaBtnY}>✅ OKUDUM VE ONAYLIYORUM</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
