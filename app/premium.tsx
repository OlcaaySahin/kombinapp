import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useProfile } from '@/lib/hooks/useProfile';
import { showAlert } from '@/lib/alert';
import { isPremiumActive } from '@/lib/premium';
import { loadPlanPrices, purchasePremium, restorePurchases, type PremiumPlan } from '@/lib/purchases';
import { captureException } from '@/lib/sentry';
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

// Mağaza fiyatı alınamazsa (eski build, ağ hatası) gösterilen yedek fiyatlar.
const FALLBACK_PRICES: Record<PremiumPlan, string> = { monthly: '₺49', yearly: '₺399' };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PremiumScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.userId);
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const { data: profile, refetch } = useProfile(userId);
  const isPremium = isPremiumActive(profile);
  const [plan, setPlan] = useState<PremiumPlan>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<PremiumPlan, string>>>({});

  useEffect(() => {
    // Anonim kullanıcı satın alamaz; RevenueCat'e tanıtılmadan fiyat sorgusu da anlamsız.
    if (isAnonymous) return;
    let cancelled = false;
    loadPlanPrices().then((loaded) => {
      if (!cancelled) setPrices(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [isAnonymous, userId]);

  /**
   * Premium, RevenueCat webhook'u üzerinden ASENKRON olarak profiles'a yazılır; satın alma
   * tamamlandıktan sonra birkaç saniye profili yenileyip yansımasını bekliyoruz.
   */
  async function waitForPremiumSync(): Promise<boolean> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await refetch();
      if (isPremiumActive(result.data)) return true;
      await sleep(2000);
    }
    return false;
  }

  async function handlePurchase() {
    if (isAnonymous) {
      router.push('/sign-in');
      return;
    }
    setPurchasing(true);
    try {
      const result = await purchasePremium(plan);
      if (result === 'cancelled') return;
      if (result === 'unavailable') {
        showAlert(
          'Satın alma şu an kullanılamıyor',
          'Bu sürümde veya şu an satın alma yapılamıyor. Uygulamayı güncelleyip tekrar dene.'
        );
        return;
      }
      const synced = await waitForPremiumSync();
      showAlert(
        synced ? 'Premium aktif' : 'Satın alma alındı',
        synced
          ? 'Teşekkürler! Tüm Premium özellikler açıldı.'
          : "Ödemen alındı. Premium'un hesabına yansıması birkaç dakika sürebilir; uygulamayı kapatıp açabilirsin."
      );
    } catch (error) {
      console.error('Satın alma hatası', error);
      captureException(error);
      showAlert('Satın alma tamamlanamadı', 'Bir sorun oluştu, ücret alınmadıysa tekrar deneyebilirsin.');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      if (result === 'unavailable') {
        showAlert('Geri yükleme kullanılamıyor', 'Bu sürümde satın almalar geri yüklenemiyor.');
      } else if (result === 'nothing') {
        showAlert('Satın alma bulunamadı', 'Bu Google hesabına bağlı aktif bir Premium aboneliği bulunamadı.');
      } else {
        const synced = await waitForPremiumSync();
        showAlert(
          'Satın alma geri yüklendi',
          synced ? 'Premium üyeliğin tekrar aktif.' : 'Hesabına yansıması birkaç dakika sürebilir.'
        );
      }
    } catch (error) {
      console.error('Geri yükleme hatası', error);
      captureException(error);
      showAlert('Geri yükleme tamamlanamadı', 'Bir sorun oluştu, daha sonra tekrar dene.');
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
            <Pressable
              onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}
              className="mt-1 py-1">
              <Text className="font-body-medium text-sm text-primary">Aboneliği Yönet</Text>
            </Pressable>
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
                <Text className="mt-1 font-heading-bold text-xl text-gray-900 dark:text-white">
                  {prices.monthly ?? FALLBACK_PRICES.monthly}
                </Text>
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
                <Text className="mt-1 font-heading-bold text-xl text-gray-900 dark:text-white">
                  {prices.yearly ?? FALLBACK_PRICES.yearly}
                </Text>
              </Pressable>
            </View>

            {isAnonymous && (
              <Text className="mb-3 text-center font-body text-xs text-gray-500 dark:text-gray-400">
                Premium hesabına bağlanır. Satın almadan önce Google veya e-posta ile giriş yapman gerekiyor.
              </Text>
            )}
            <PrimaryButton
              label={
                purchasing
                  ? 'İşleniyor...'
                  : isAnonymous
                    ? 'Giriş Yap ve Abone Ol'
                    : `${plan === 'monthly' ? 'Aylık' : 'Yıllık'} Abone Ol`
              }
              disabled={purchasing}
              onPress={handlePurchase}
            />
            {!isAnonymous && (
              <Pressable onPress={handleRestore} disabled={purchasing} className="mt-3 items-center py-2">
                <Text className="font-body-medium text-sm text-primary">Satın Almaları Geri Yükle</Text>
              </Pressable>
            )}
            <Text className="mt-2 text-center font-body text-[11px] leading-4 text-gray-400 dark:text-gray-500">
              Abonelik, dönem sonunda seçtiğin planla otomatik yenilenir. Google Play &gt; Abonelikler bölümünden
              istediğin zaman iptal edebilirsin.
            </Text>
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
              {/* Premium kullanıcıda karşılaştırmaya gerek yok (zaten hepsine sahip) — sadece
                  tek bir onay tiki sütunu, "Ücretsiz" sütunu ve X işaretleri gösterilmiyor. */}
              {!isPremium && (
                <View className="w-14 items-center">
                  <Ionicons
                    name={feature.free ? 'checkmark-circle' : 'close-circle-outline'}
                    size={18}
                    color={feature.free ? '#16A34A' : '#D1D5DB'}
                  />
                </View>
              )}
              <View className="w-14 items-center">
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              </View>
            </View>
          ))}
          <View className="flex-row px-4 pb-3 pt-1">
            <Text className="flex-1" />
            {!isPremium && (
              <Text className="w-14 text-center font-body-medium text-[10px] text-gray-400">Ücretsiz</Text>
            )}
            <Text className="w-14 text-center font-body-medium text-[10px]" style={{ color: '#B8860B' }}>
              Premium
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
