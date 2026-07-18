import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { useOutfit, type OutfitContext, type OutfitItemSummary } from '@/lib/hooks/useOutfits';

// react-native-view-shot ve expo-sharing NATIVE modüller — eski build'de yoklar.
// Statik import Expo Router yüzünden app'i açılışta çökertirdi; lazy require + no-op
// (gardirop-analiz'deki react-native-svg ile aynı desen). Web'de paylaşım desteklenmiyor.
type ViewShotModule = typeof import('react-native-view-shot');
type SharingModule = typeof import('expo-sharing');

let cachedViewShot: ViewShotModule | null | undefined;
let cachedSharing: SharingModule | null | undefined;

function loadViewShot(): ViewShotModule | null {
  if (cachedViewShot !== undefined) return cachedViewShot;
  try {
    cachedViewShot = require('react-native-view-shot') as ViewShotModule;
  } catch {
    cachedViewShot = null;
  }
  return cachedViewShot;
}

function loadSharing(): SharingModule | null {
  if (cachedSharing !== undefined) return cachedSharing;
  try {
    cachedSharing = require('expo-sharing') as SharingModule;
  } catch {
    cachedSharing = null;
  }
  return cachedSharing;
}

export default function KombinPaylasScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId?: string }>();
  const { data: outfit, isLoading } = useOutfit(outfitId ?? null);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    const viewShot = loadViewShot();
    const sharingModule = loadSharing();
    if (Platform.OS === 'web' || !viewShot || !sharingModule) {
      showAlert(
        'Bu cihazda paylaşılamıyor',
        Platform.OS === 'web'
          ? 'Paylaşım kartı telefondan paylaşılabilir.'
          : 'Paylaşım için uygulamanın güncel sürümü gerekiyor.'
      );
      return;
    }
    setSharing(true);
    try {
      // Çıktı 1080x1919 px'e ölçeklenir — Instagram Story çözünürlüğü.
      const uri = await viewShot.captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1919 });
      if (!(await sharingModule.isAvailableAsync())) {
        showAlert('Paylaşım kullanılamıyor', 'Bu cihazda sistem paylaşım menüsü açılamadı.');
        return;
      }
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      await sharingModule.shareAsync(fileUri, { mimeType: 'image/png', dialogTitle: 'Kombinini paylaş' });
    } catch (error) {
      console.error('Kombin kartı paylaşılamadı:', error);
      showAlert('Paylaşılamadı', error instanceof Error ? error.message : String(error));
    } finally {
      setSharing(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#151718]">
        <ActivityIndicator color="#3461FD" />
      </SafeAreaView>
    );
  }

  if (!outfit) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-10 dark:bg-[#151718]">
        <Text className="text-center font-body text-gray-500 dark:text-gray-400">Kombin bulunamadı.</Text>
      </SafeAreaView>
    );
  }

  const contextChips = Object.values(outfit.generation_context as OutfitContext).filter(Boolean);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-1 font-heading-bold text-2xl text-gray-900 dark:text-white">Kombinini Paylaş</Text>
        <Text className="mb-5 font-body text-sm text-gray-500 dark:text-gray-400">
          Aşağıdaki kart görsel olarak paylaşılır — Instagram Story için 9:16 formatında.
        </Text>

        {/* Yakalanan kart: sabit 9:16 oran, tema ne olursa olsun marka renkli sabit tasarım
            (collapsable=false şart — Android'de View düzleştirilirse captureRef başarısız olur). */}
        <View className="items-center">
          <View
            ref={cardRef}
            collapsable={false}
            style={{ width: 300, height: 533, backgroundColor: '#1B2A5E' }}
            className="overflow-hidden rounded-3xl">
            {/* Dekoratif marka blob'ları */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: -50, right: -50, width: 170, height: 170, borderRadius: 100, backgroundColor: '#3461FD', opacity: 0.45 }}
            />
            <View
              pointerEvents="none"
              style={{ position: 'absolute', bottom: -60, left: -40, width: 190, height: 190, borderRadius: 100, backgroundColor: '#8B3FE8', opacity: 0.35 }}
            />

            <View className="flex-1 p-5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sparkles" size={16} color="#E8B923" />
                <Text className="font-heading-bold text-base text-white">Kombin App</Text>
              </View>
              <Text className="mt-0.5 font-body text-[11px] text-white/70">Bugünün kombini</Text>

              <View className="mt-4 flex-row flex-wrap gap-1.5">
                {contextChips.map((chip) => (
                  <View key={chip} className="rounded-full bg-white/15 px-2.5 py-1">
                    <Text className="font-body-medium text-[10px] text-white">{chip}</Text>
                  </View>
                ))}
              </View>

              {/* Parça sayısına göre dinamik yerleşim: 1 parça büyük tek kare, 2+ parça hep 2 sütun
                  (5-6 parçada 2+2+2 — kullanıcı tercihi: 3 sütun küçük kalıyordu, isimler sığmıyordu).
                  Kart yüksekliği ne olursa olsun dikeyde ortalanır. */}
              <View className="mt-3 flex-1 justify-center">
                {(() => {
                  const shown = outfit.items.slice(0, 6);
                  const columns = shown.length <= 1 ? 1 : 2;
                  const rows: OutfitItemSummary[][] = [];
                  for (let i = 0; i < shown.length; i += columns) rows.push(shown.slice(i, i + columns));
                  // 3 satırda (5-6 parça) görseller hafif küçülür + satır arası daralır ki 9:16 karta sığsın.
                  const width = columns === 1 ? '62%' : rows.length >= 3 ? '36%' : '45%';
                  const rowMargin = rows.length >= 3 ? 'mb-2' : 'mb-3';
                  return rows.map((row, rowIndex) => (
                    <View key={rowIndex} className={`${rowMargin} flex-row justify-center gap-3`}>
                      {row.map((item: OutfitItemSummary) => (
                        <View key={item.id} style={{ width }}>
                          <View className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                            {item.image_url ? (
                              <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                            ) : (
                              <View className="h-full w-full items-center justify-center">
                                <Ionicons name="shirt-outline" size={28} color="rgba(255,255,255,0.5)" />
                              </View>
                            )}
                          </View>
                          <View className="mt-1 self-center rounded-full bg-white/10 px-2 py-0.5">
                            <Text numberOfLines={1} className="text-center font-body text-[9px] text-white/90">
                              {item.name ?? ''}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ));
                })()}
                {outfit.items.length > 6 && (
                  <Text className="text-center font-body text-[10px] text-white/60">
                    + {outfit.items.length - 6} parça daha
                  </Text>
                )}
              </View>

              <View className="items-center pb-1">
                <Text className="font-body text-[10px] text-white/60">
                  Dolabından akıllı kombinler · Kombin App
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <PrimaryButton label={sharing ? 'Hazırlanıyor...' : 'Paylaş'} disabled={sharing} onPress={handleShare} />
          <Text className="mt-2 text-center font-body text-xs text-gray-400 dark:text-gray-500">
            Sistem paylaşım menüsü açılır — Instagram, WhatsApp veya istediğin uygulamayı seç.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
