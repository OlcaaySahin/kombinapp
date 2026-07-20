import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { markOnboardingSeen } from '@/lib/onboarding';

type Step = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: 'sparkles-outline',
    title: "Kombin App'e Hoş Geldin",
    description:
      'Dolabındaki kıyafetlerle akıllı kombin önerileri alacaksın. Nasıl çalıştığını birkaç kartla gösterelim.',
  },
  {
    icon: 'shirt-outline',
    title: 'Önce Envanterini Oluştur',
    description:
      'Envanter sekmesinden kıyafetlerinin fotoğrafını çek — yapay zeka türünü, rengini ve desenini otomatik etiketler. Ne kadar çok ürün eklersen öneriler o kadar iyi olur.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Bağlamı Anlat, Kombini Al',
    description:
      'Ana Sayfa\'da "Kombin Oluştur"a bas; mevsim, hava durumu, mekan, saat ve konsept sorularını yanıtla — istersen "iş görüşmesi" gibi özel bir not da ekle. Yapay zeka sana uygun bir kombin önersin.',
  },
  {
    icon: 'shuffle-outline',
    title: 'Aceleci misin? Zar At',
    description: 'Sorularla uğraşmak istemiyorsan Zar At butonuyla envanterinden anında uyumlu bir kombin çıkar.',
  },
  {
    icon: 'refresh-outline',
    title: 'Beğenmediysen Karıştır',
    description: 'Kombindeki bir parçayı sevmedin mi? Üzerine basılı tut, beliren Karıştır butonuyla sadece o parçayı değiştir.',
  },
  {
    icon: 'heart-outline',
    title: 'İstek Listeni Ekle',
    description:
      'Almak istediğin ürünleri İstek Listesi\'ne ekle — ürün linkini yapıştırırsan "Linkten Doldur" bilgileri senin yerine getirir. Kombin oluştururken dahil edip satın almadan önce dene.',
  },
  {
    icon: 'star-outline',
    title: 'Kaydet, Puanla, Giy',
    description:
      'Beğendiğin kombini kaydet ve yıldızla puanla — yüksek puanladığın tarzlar sonraki önerileri kişiselleştirir. Giydiğin gün "Giydim" işaretleyip fotoğrafla arşivle.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Seyahat İçin Bavul Hazırla',
    description:
      'Ana Sayfa\'daki bavul kartından gün sayısı ve konsept gir — envanterinden minimum parçayla, birbiriyle uyumlu bir kapsül gardırop ve gün gün giyim planı çıkaralım.',
  },
  {
    icon: 'images-outline',
    title: 'Galeri: Kombin Albümün',
    description:
      'Bir kombini "Giydim" olarak işaretlerken eklediğin fotoğraflar Galeri sekmesinde birikir — kendi stil günlüğün gibi, dokununca o günün parçalarını ve notunu görürsün.',
  },
  {
    icon: 'share-social-outline',
    title: 'Kombinini Paylaş',
    description:
      'Beğendiğin bir kombinin yanındaki paylaş ikonuna dokun, beğendiğin tasarım şablonunu seç (15 farklı stil var) ve Instagram Story\'de veya istediğin uygulamada paylaş.',
  },
  {
    icon: 'archive-outline',
    title: 'Arşiv: Öneriler Sana Kalsın',
    description:
      'Artık kullanmadığın bir ürünü ya da eski bir kombini silmek yerine arşivleyebilirsin — envanterde soluk görünmeye devam eder ama önerilerde çıkmaz, Profil > Arşivlerim\'den istediğin an geri getirirsin.',
  },
  {
    icon: 'people-outline',
    title: 'Partnerinle Eşleş',
    description:
      'Profil\'den partnerinin e-postasıyla eşleş. Kombinini oluşturduktan sonra tek dokunuşla, partnerinin kendi gardırobundan senin kombinine uyumlu bir kombin önerelim.',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  async function finish() {
    await markOnboardingSeen();
    // router.back() yerine replace: Ana Sayfa'yı YENİDEN mount ettirir, böylece oradaki
    // "onboarding görüldü mü" effect'i tekrar çalışıp ardından ana sayfa tasarımı
    // seçicisinin ilk-açılış kontrolünü de sırayla yapabilir (aksi halde aynı instance
    // gizliden gösterilir, effect tekrar tetiklenmez).
    router.replace('/');
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setStep((value) => value + 1);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]">
      <Pressable onPress={finish} className="items-end px-5 pt-2">
        <Text className="font-body-medium text-sm text-gray-400 dark:text-gray-500">Geç</Text>
      </Pressable>

      <Pressable onPress={next} className="flex-1 items-center justify-center px-8">
        <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Ionicons name={current.icon} size={44} color="#3461FD" />
        </View>
        <Text className="mb-3 text-center font-heading-bold text-2xl text-gray-900 dark:text-white">
          {current.title}
        </Text>
        <Text className="text-center font-body text-base leading-6 text-gray-600 dark:text-gray-300">
          {current.description}
        </Text>
      </Pressable>

      <View className="flex-row items-center justify-center gap-2 pb-4">
        {STEPS.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full ${index === step ? 'w-6 bg-primary' : 'w-2 bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
      </View>

      <View className="px-8 pb-8">
        <PrimaryButton label={isLast ? 'Başla' : 'İleri'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}
