import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = { title: string; body: string };

const SECTIONS: Section[] = [
  {
    title: '1. Hangi Verileri Topluyoruz',
    body:
      'Hesabın (anonim veya e-posta/Google ile bağlanmış), envanterine eklediğin ürün fotoğrafları ve etiketleri (tür, renk, desen, marka), oluşturduğun/kaydettiğin kombinler ve verdiğin puanlar, giydim kayıtların (fotoğraf ve not opsiyonel), istek listeni, profilinde doldurduğun bilgiler (isim, cinsiyet, yaş, boy, kilo, günlük stil tercihin — hepsi opsiyonel) ve varsa partnerinle eşleşme bilgin.',
  },
  {
    title: '2. Verilerini Ne İçin Kullanıyoruz',
    body:
      'Sana kombin önerisi üretmek (yapay zeka veya yerel rastgele seçim), ürün fotoğraflarını otomatik etiketlemek, geçmiş tercihlerine göre önerileri kişiselleştirmek (yüksek puanladığın/beğenmediğin renk ve markalar) ve uygulamanın temel işlevlerini (envanter, kombin geçmişi, bildirim tercihleri) çalıştırmak için kullanıyoruz. Verilerin reklam amacıyla satılmaz veya üçüncü taraflarla paylaşılmaz.',
  },
  {
    title: '3. Yapay Zeka İşlemesi',
    body:
      'Kombin önerisi ve ürün fotoğrafı etiketleme, Anthropic (Claude) API\'sine gönderilerek üretilir. Bu işlem sırasında envanterindeki ürün bilgileri (isim, renk, kategori) ve gönderdiğin fotoğraflar Anthropic\'in API\'sine iletilir; bu veri sağlayıcı tarafından modelin eğitiminde kullanılmaz (Anthropic\'in ticari API kullanım politikası bu yöndedir).',
  },
  {
    title: '4. Verilerin Saklandığı Yer',
    body:
      'Tüm verilerin Supabase (Postgres veritabanı + dosya depolama) üzerinde, her kullanıcının sadece kendi verisine erişebildiği satır seviyesi güvenlik (RLS) politikalarıyla saklanır. Fotoğrafların Supabase Storage\'da, herkese açık ama tahmin edilemez (rastgele) URL\'lerle barındırılır.',
  },
  {
    title: '5. Üçüncü Taraf Servisler',
    body:
      'Kimlik doğrulama ve veritabanı için Supabase, kombin/etiketleme önerileri için Anthropic (Claude API), Google ile giriş tercih edersen Google Sign-In, bildirimler için Expo Notifications altyapısı kullanılır. Her biri kendi gizlilik politikasına tabidir.',
  },
  {
    title: '6. Haklarınız (KVKK Kapsamında)',
    body:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca; verilerinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, düzeltilmesini isteme ve KVKK\'nın öngördüğü şartlarda silinmesini isteme hakkına sahipsin. Profil > Hesabımı Sil ile tüm verilerini istediğin an kalıcı olarak silebilirsin — bu işlem geri alınamaz.',
  },
  {
    title: '7. Veri Saklama Süresi',
    body:
      'Verilerin, hesabını silene kadar saklanır. Hesabını sildiğinde envanterin, kombinlerin, istek listen, bavul planların ve partnerlik bağın kalıcı olarak ve geri dönüşü olmayacak şekilde silinir.',
  },
  {
    title: '8. İletişim',
    body: 'Verilerinle ilgili sorular için: kombinapp67@gmail.com',
  },
];

export default function GizlilikPolitikasiScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-2 font-heading-bold text-2xl text-gray-900 dark:text-white">
          Gizlilik Politikası
        </Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Look olarak verilerini nasıl topladığımızı, kullandığımızı ve koruduğumuzu buradan öğrenebilirsin.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} className="mb-5">
            <Text className="mb-1.5 font-body-semibold text-sm text-gray-900 dark:text-gray-100">
              {section.title}
            </Text>
            <Text className="font-body text-sm leading-5 text-gray-600 dark:text-gray-300">{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
