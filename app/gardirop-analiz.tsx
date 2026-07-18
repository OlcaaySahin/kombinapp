import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopWornOutfitRows } from '@/components/ui/TopWornOutfitRows';
import { UnwornItemThumbs } from '@/components/ui/UnwornItemThumbs';
import { getCategory } from '@/constants/categories';
import { closestColorName, namedColorHex } from '@/lib/colorNames';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import { useWornOutfits, type WearEventData } from '@/lib/hooks/useOutfits';
import { topWornOutfits, unwornItems } from '@/lib/wardrobeInsights';

// Renk dağılımı bilinçli olarak DÜZ View'lerle oranlı yatay bar (react-native-svg pasta
// grafiği denendi, kullanıcı bar'ı tercih etti — 2026-07-18). svg paketi build'de duruyor,
// ileride başka bir grafik için kullanılabilir.
type ColorSlice = { name: string; count: number; hex: string };

export default function GardiropAnalizScreen() {
  const { data: items, isLoading: itemsLoading } = useItems();
  const worn = useWornOutfits();

  const itemList: DbItem[] = items ?? [];
  const wornEvents: WearEventData[] = worn.data ?? [];

  // 1) Renk dağılımı
  const colorCounts = new Map<string, number>();
  for (const item of itemList) {
    const colorName = closestColorName(item.color);
    if (colorName) colorCounts.set(colorName, (colorCounts.get(colorName) ?? 0) + 1);
  }
  const colorSlices: ColorSlice[] = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, hex: namedColorHex(name) ?? '#8E8E93' }));

  // 2) Kategori dağılımı (renk bölümündeki gibi sayılarla)
  const slotCounts = new Map<DbItem['slot'], number>();
  for (const item of itemList) {
    slotCounts.set(item.slot, (slotCounts.get(item.slot) ?? 0) + 1);
  }
  const categoryCounts = [...slotCounts.entries()].sort((a, b) => b[1] - a[1]);

  // 3) En çok giyilen kombinler + 4) hiç giyilmemiş ürünler — Ana Sayfa ile paylaşılan hesaplar
  const topWorn = topWornOutfits(wornEvents, 3);
  const neverWorn = unwornItems(itemList, wornEvents);

  const isLoading = itemsLoading || worn.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-1 font-heading-bold text-2xl text-gray-900 dark:text-white">Gardırop Analizi</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Envanterinin renk dağılımı, en çok giydiğin kombinler ve hiç giymediklerin.
        </Text>

        {isLoading && (
          <View className="items-center py-10">
            <ActivityIndicator color="#3461FD" />
          </View>
        )}

        {!isLoading && itemList.length === 0 && (
          <View className="items-center px-6 py-10">
            <Ionicons name="shirt-outline" size={40} color="#9BA1A6" />
            <Text className="mt-3 text-center font-body text-sm text-gray-500 dark:text-gray-400">
              Analiz için önce envanterine ürün eklemelisin.
            </Text>
          </View>
        )}

        {!isLoading && itemList.length > 0 && (
          <>
            <SectionTitle icon="color-palette-outline" title="Renk Dağılımı" />
            <View className="mb-3">
              <ColorBar slices={colorSlices} />
            </View>
            <View className="mb-8 flex-row flex-wrap gap-x-4 gap-y-2">
              {colorSlices.map((slice: ColorSlice) => (
                <View key={slice.name} className="flex-row items-center gap-1.5">
                  <View
                    className="h-3 w-3 rounded-full border border-gray-200 dark:border-gray-700"
                    style={{ backgroundColor: slice.hex }}
                  />
                  <Text className="font-body text-xs text-gray-700 dark:text-gray-300">
                    {slice.name} ({slice.count})
                  </Text>
                </View>
              ))}
            </View>

            <SectionTitle icon="albums-outline" title="Kategori Dağılımı" />
            <View className="mb-8 flex-row flex-wrap gap-2">
              {categoryCounts.map(([slot, count]) => {
                const category = getCategory(slot);
                return (
                  <View
                    key={slot}
                    className="flex-row items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 dark:bg-gray-800">
                    <Ionicons name={category.icon} size={13} color="#3461FD" />
                    <Text className="font-body text-xs text-gray-700 dark:text-gray-300">
                      {category.label} ({count})
                    </Text>
                  </View>
                );
              })}
            </View>

            <SectionTitle icon="trophy-outline" title="En Çok Giydiğin Kombinler" />
            {topWorn.length === 0 ? (
              <Text className="mb-8 font-body text-sm text-gray-500 dark:text-gray-400">
                Henüz "Giydim" olarak işaretlediğin bir kombin yok — giydikçe burada sıralanacak.
              </Text>
            ) : (
              <View className="mb-8">
                <TopWornOutfitRows entries={topWorn} />
              </View>
            )}

            <SectionTitle icon="eye-off-outline" title="Hiç Giymediklerin" />
            {neverWorn.length === 0 ? (
              <Text className="font-body text-sm text-gray-500 dark:text-gray-400">
                Harika — envanterindeki her ürünü en az bir kez giymişsin! 🎉
              </Text>
            ) : (
              <>
                <Text className="mb-3 font-body text-sm text-gray-500 dark:text-gray-400">
                  {neverWorn.length} ürün henüz hiç "Giydim" kaydına girmemiş. Belki bir sonraki kombinde?
                </Text>
                <UnwornItemThumbs items={neverWorn} layout="grid" />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color="#3461FD" />
      <Text className="font-heading text-base text-gray-900 dark:text-white">{title}</Text>
    </View>
  );
}

/** Renk dağılımı: oranlı yatay bar (düz View'ler — her build'de ve web'de çalışır). */
function ColorBar({ slices }: { slices: ColorSlice[] }) {
  if (slices.length === 0) return null;
  return (
    <View className="h-6 w-full flex-row overflow-hidden rounded-full">
      {slices.map((slice: ColorSlice) => (
        <View key={slice.name} style={{ flex: slice.count, backgroundColor: slice.hex }} />
      ))}
    </View>
  );
}
