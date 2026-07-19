import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  getHomeLayoutPreference,
  HOME_LAYOUT_VARIANTS,
  setHomeLayoutPreference,
  type HomeLayoutVariant,
} from '@/lib/homeLayout';

/** Her varyant için küçük, gerçek bir ekran görüntüsü olmadan fikir veren mini wireframe. */
function VariantPreview({ variant }: { variant: HomeLayoutVariant }) {
  const box = 'rounded-md bg-gray-200 dark:bg-gray-700';
  if (variant === 'kart-odakli') {
    return (
      <View className="gap-1.5 p-3">
        {[0, 1, 2].map((i) => (
          <View key={i} className="rounded-lg border border-gray-300 p-2 dark:border-gray-600">
            <View className={`h-2 w-10 ${box}`} />
          </View>
        ))}
      </View>
    );
  }
  if (variant === 'hero-butonlu') {
    return (
      <View className="gap-1.5 p-3">
        <View className="flex-row gap-1.5">
          <View className="h-10 flex-1 rounded-lg bg-primary/40" />
          <View className="h-10 flex-1 rounded-lg border-2 border-primary/40" />
        </View>
        <View className={`h-2 w-full ${box}`} />
        <View className={`h-2 w-2/3 ${box}`} />
      </View>
    );
  }
  if (variant === 'yogun-panel') {
    return (
      <View className="gap-1.5 p-3">
        <View className="flex-row gap-1.5">
          <View className="h-5 flex-1 rounded bg-primary/40" />
          <View className="h-5 flex-1 rounded border border-primary/40" />
        </View>
        <View className="flex-row gap-1.5">
          <View className="h-6 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
          <View className="h-6 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
        </View>
        <View className="flex-row gap-1.5">
          <View className={`h-8 flex-1 ${box}`} />
          <View className={`h-8 flex-1 ${box}`} />
        </View>
      </View>
    );
  }
  if (variant === 'minimal') {
    return (
      <View className="gap-2 p-3">
        <View className="h-2 w-1/2 rounded bg-primary/50" />
        <View className="h-px w-full bg-gray-200 dark:bg-gray-700" />
        <View className="h-2 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
        <View className="h-px w-full bg-gray-200 dark:bg-gray-700" />
        <View className="h-2 w-2/5 rounded bg-gray-300 dark:bg-gray-600" />
      </View>
    );
  }
  // sade
  return (
    <View className="gap-1.5 p-3">
      <View className="h-6 w-full rounded-lg bg-primary/50" />
      <View className="h-6 w-full rounded-lg border border-primary/40" />
      <View className={`mt-1 h-2 w-2/3 ${box}`} />
      <View className={`h-2 w-1/2 ${box}`} />
    </View>
  );
}

/**
 * Ana sayfa tasarımı seçici — hem ilk açılışta (kayıtlı tercih yoksa index.tsx'ten
 * pushlanır) hem Profil > "Ana Sayfa Tasarımı" menüsünden istenildiği zaman açılır.
 * firstRun param'ı varsa "Devam Et" ile kapanır, yoksa seçince direkt geri döner.
 */
export default function AnaSayfaTasarimiScreen() {
  const { firstRun } = useLocalSearchParams<{ firstRun?: string }>();
  const isFirstRun = firstRun === '1';
  const [selected, setSelected] = useState<HomeLayoutVariant>('sade');

  useEffect(() => {
    getHomeLayoutPreference().then(setSelected);
  }, []);

  async function handleSelect(variant: HomeLayoutVariant) {
    setSelected(variant);
    await setHomeLayoutPreference(variant);
    if (!isFirstRun) router.back();
  }

  async function handleContinue() {
    await setHomeLayoutPreference(selected);
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="px-5 pb-2 pt-2">
        <Text className="font-heading-bold text-2xl text-gray-900 dark:text-white">
          {isFirstRun ? 'Ana Sayfanı Seç' : 'Ana Sayfa Tasarımı'}
        </Text>
        <Text className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">
          {isFirstRun
            ? 'Aynı bilgiler, farklı bir yerleşimle. İstediğin zaman Profil\'den değiştirebilirsin.'
            : 'Ana sayfandaki blokların yerleşimini değiştir — istediğin zaman tekrar gel.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}>
        {HOME_LAYOUT_VARIANTS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => handleSelect(option.id)}
              className={`flex-row items-center gap-3 rounded-3xl border-2 p-3 ${
                isSelected ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-800'
              }`}>
              <View className="w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <VariantPreview variant={option.id} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-heading text-base text-gray-900 dark:text-white">{option.label}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color="#3461FD" />}
                </View>
                <Text className="mt-0.5 font-body text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {isFirstRun && (
        <View className="px-5 pb-8">
          <PrimaryButton label="Devam Et" onPress={handleContinue} />
        </View>
      )}
    </SafeAreaView>
  );
}
