import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Kombin önerileri nasıl oluşuyor?',
    answer:
      'Ana Sayfa\'da bağlamsal soruları (mevsim/mekan/saat/konsept) yanıtladığında, yapay zeka envanterindeki ürünlerden bağlama en uygun ve renk/stil olarak tutarlı kombini seçer. Zar At butonu ise yapay zekaya hiç gitmez, envanterinden anında rastgele-uyumlu bir seçim yapar.',
  },
  {
    question: 'Bir parçayı beğenmedim, ne yapabilirim?',
    answer:
      'Kombin sonucunda değiştirmek istediğin parçaya basılı tut — beliren "Karıştır" butonuyla sadece o parça, aynı kategoriden başka bir ürünle değiştirilir.',
  },
  {
    question: 'İstek Listesi ne işe yarıyor?',
    answer:
      'Almak istediğin ama henüz sahip olmadığın ürünleri Envanter > İstek Listem\'e ekleyebilirsin. Kombin oluştururken "İstek listemi de dahil et" seçeneğini açarsan, mevcut kıyafetlerinle bu ürünleri birlikte nasıl kombinleyebileceğini görürsün.',
  },
  {
    question: 'Ürün eklerken fotoğraf zorunlu mu?',
    answer:
      'Hayır, fotoğrafsız da ürün ekleyebilirsin. Fotoğraf eklersen yapay zeka otomatik olarak tür/renk/deseni tahmin edip formu doldurur, sen de kaydetmeden önce düzeltebilirsin.',
  },
  {
    question: 'Verilerim güvende mi?',
    answer:
      'Envanterin ve kombinlerin sadece sana ait — hesabın anonim başlar, istersen Profil\'den e-posta ile kalıcı bir hesaba yükseltebilirsin, veri kaybı olmaz.',
  },
];

export default function YardimScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-2 font-heading-bold text-2xl text-gray-900 dark:text-white">Yardım</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Sık sorulan sorular ve uygulamayı kullanma ipuçları.
        </Text>

        <Pressable
          onPress={() => router.push('/onboarding')}
          className="mb-6 flex-row items-center rounded-2xl bg-primary/10 p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
            <Ionicons name="play-outline" size={20} color="#FFFFFF" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-body-semibold text-sm text-primary">Tanıtımı Tekrar İzle</Text>
            <Text className="mt-0.5 font-body text-xs text-gray-600 dark:text-gray-300">
              Uygulamanın nasıl çalıştığını gösteren kısa tanıtımı tekrar aç
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#3461FD" />
        </Pressable>

        {FAQ_ITEMS.map((item) => (
          <FaqCard key={item.question} question={item.question} answer={item.answer} />
        ))}

        <View className="mt-2 items-center">
          <Text className="font-body text-xs text-gray-400 dark:text-gray-500">
            Başka bir sorunun mu var? Geliştiriciyle iletişime geç.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  const icon: ComponentProps<typeof Ionicons>['name'] = 'help-circle-outline';
  return (
    <View className="mb-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
      <View className="mb-1.5 flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="#687076" />
        <Text className="flex-1 font-body-semibold text-sm text-gray-900 dark:text-gray-100">{question}</Text>
      </View>
      <Text className="font-body text-sm leading-5 text-gray-600 dark:text-gray-300">{answer}</Text>
    </View>
  );
}
