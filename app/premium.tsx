import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useProfile } from '@/lib/hooks/useProfile';
import { isPremiumActive } from '@/lib/premium';
import { purchasePremium, type PremiumPlan } from '@/lib/purchases';
import { useAuthStore } from '@/lib/stores/authStore';

const FEATURES: { label: string; free: boolean; premium: boolean }[] = [
  { label: 'Envanter ekleme', free: false, premium: true },
  { label: 'Zar At', free: true, premium: true },
  { label: 'AI Kombin Önerisi', free: false, premium: true },
  { label: 'Detaylı Gardırop Analizi', free: false, premium: true },
  { label: '"Partnerim için Uyumlu Kombin Öner"', free: false, premium: true },
  { label: 'Bavul Hazırla (Seyahat Modu)', free: false, premium: true },
  { label: 'Kombin Paylaşım Kartları', free: true, premium: true },
];

const FEATURE_NOTES: Record<string, string> = {
  'Envanter ekleme': '50 ürüne kadar ücretsiz, Premium ile sınırsız',
  'AI Kombin Önerisi': 'Günde 5 ücretsiz, Premium ile sınırsız',
};

export default function PremiumScreen() {
  const userId = useAuthStore((state) => state.userId);
  const { data: profile } = useProfile(userId);
  const isPremium = isPremiumActive(profile);
  const [plan, setPlan] = useState<PremiumPlan>('yearly');
  const [purchasing, setPurchasing] = useState(false);

  async function handlePurchase() {
    setPurchasing(true);
    try {
      await purchasePremium(plan);
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="mb-6 items-center">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-amber-400/15">
            <Ionicons name="star" size={30} color="#B8860B" />
          </View>
          <Text className="font-heading-bold text-2xl text-gray-900 dark:text-white">Look Premium</Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            Sınırsız AI kombin, gelişmiş analiz ve daha fazlası
          </Text>
        </View>

        {isPremium ? (
          <View className="mb-6 items-center gap-2 rounded-2xl bg-amber-400/10 p-5">
            <PremiumBadge />
            <Text className="mt-1 text-center font-body text-sm text-gray-700 dark:text-gray-300">
              {profile?.subscription_expires_at
                ? `Üyeliğin ${new Date(profile.subscription_expires_at).toLocaleDateString('tr-TR')} tarihine kadar aktif.`
                : 'Premium üyeliğin aktif.'}
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-5 flex-row gap-3">
              <Pressable
                onPress={() => setPlan('monthly')}
                className={`flex-1 items-center rounded-2xl border-2 p-4 ${
                  plan === 'monthly' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'
                }`}>
                <Text className="font-body-medium text-sm text-gray-600 dark:text-gray-400">Aylık</Text>
                <Text className="mt-1 font-heading-bold text-xl text-gray-900 dark:text-white">₺49</Text>
              </Pressable>
              <Pressable
                onPress={() => setPlan('yearly')}
                className={`flex-1 items-center rounded-2xl border-2 p-4 ${
                  plan === 'yearly' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'
                }`}>
                <View className="absolute -top-2 rounded-full bg-primary px-2 py-0.5">
                  <Text className="font-body-semibold text-[10px] text-white">%32 Tasarruf</Text>
                </View>
                <Text className="mt-1 font-body-medium text-sm text-gray-600 dark:text-gray-400">Yıllık</Text>
                <Text className="mt-1 font-heading-bold text-xl text-gray-900 dark:text-white">₺399</Text>
              </Pressable>
            </View>

            <PrimaryButton
              label={purchasing ? 'İşleniyor...' : `${plan === 'monthly' ? 'Aylık' : 'Yıllık'} Abone Ol`}
              disabled={purchasing}
              onPress={handlePurchase}
            />
          </>
        )}

        <View className="mt-8 rounded-2xl border border-gray-100 dark:border-gray-800">
          {FEATURES.map((feature, index) => (
            <View
              key={feature.label}
              className={`flex-row items-center px-4 py-3 ${
                index !== FEATURES.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
              }`}>
              <View className="flex-1">
                <Text className="font-body text-sm text-gray-800 dark:text-gray-200">{feature.label}</Text>
                {FEATURE_NOTES[feature.label] && (
                  <Text className="mt-0.5 font-body text-xs text-gray-400 dark:text-gray-500">
                    {FEATURE_NOTES[feature.label]}
                  </Text>
                )}
              </View>
              <View className="w-14 items-center">
                <Ionicons
                  name={feature.free ? 'checkmark-circle' : 'close-circle-outline'}
                  size={18}
                  color={feature.free ? '#16A34A' : '#D1D5DB'}
                />
              </View>
              <View className="w-14 items-center">
                <Ionicons
                  name={feature.premium ? 'checkmark-circle' : 'close-circle-outline'}
                  size={18}
                  color={feature.premium ? '#B8860B' : '#D1D5DB'}
                />
              </View>
            </View>
          ))}
          <View className="flex-row px-4 pb-3 pt-1">
            <Text className="flex-1" />
            <Text className="w-14 text-center font-body-medium text-[10px] text-gray-400">Ücretsiz</Text>
            <Text className="w-14 text-center font-body-medium text-[10px]" style={{ color: '#B8860B' }}>
              Premium
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
