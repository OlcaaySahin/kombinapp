import { Ionicons } from '@expo/vector-icons';
import { Component, type ReactNode } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { closestColorName, namedColorHex } from '@/lib/colorNames';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import { useWornOutfits, type OutfitItemSummary, type WearEventData } from '@/lib/hooks/useOutfits';

// react-native-svg NATIVE modül: pasta grafiği için kullanılıyor ama modülü içermeyen eski
// dev-client build'de require/render patlayabilir. lib/notifications.ts'teki desenle lazy
// require + hata sınırı: svg yoksa/patlarsa aynı veriyi düz View'lerle (yatay bar) çizeriz.
type SvgModule = typeof import('react-native-svg');

let cachedSvg: SvgModule | null | undefined;

function loadSvg(): SvgModule | null {
  if (cachedSvg !== undefined) return cachedSvg;
  try {
    cachedSvg = require('react-native-svg') as SvgModule;
  } catch {
    cachedSvg = null;
  }
  return cachedSvg;
}

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

  // 2) En çok giyilen kombinler (outfit_wears'tan sayılır)
  const wearsByOutfit = new Map<string, { count: number; items: OutfitItemSummary[] }>();
  for (const wear of wornEvents) {
    if (!wear.outfitId) continue;
    const existing = wearsByOutfit.get(wear.outfitId);
    if (existing) {
      existing.count += 1;
    } else {
      wearsByOutfit.set(wear.outfitId, { count: 1, items: wear.items });
    }
  }
  const topWorn = [...wearsByOutfit.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  // 3) Hiç giyilmemiş ürünler: hiçbir "giydim" kaydının kombinine girmemiş envanter ürünleri
  const wornItemIds = new Set<string>();
  for (const wear of wornEvents) {
    for (const item of wear.items) wornItemIds.add(item.id);
  }
  const unwornItems = itemList.filter((item: DbItem) => !wornItemIds.has(item.id));

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
            <View className="mb-2 items-center">
              <PieFallbackBoundary fallback={<ColorBar slices={colorSlices} />}>
                <ColorPie slices={colorSlices} />
              </PieFallbackBoundary>
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

            <SectionTitle icon="trophy-outline" title="En Çok Giydiğin Kombinler" />
            {topWorn.length === 0 ? (
              <Text className="mb-8 font-body text-sm text-gray-500 dark:text-gray-400">
                Henüz "Giydim" olarak işaretlediğin bir kombin yok — giydikçe burada sıralanacak.
              </Text>
            ) : (
              <View className="mb-8 gap-3">
                {topWorn.map((entry, index) => (
                  <View
                    key={index}
                    className="flex-row items-center rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
                    <View className="flex-row">
                      {entry.items.slice(0, 4).map((item: OutfitItemSummary) => (
                        <View
                          key={item.id}
                          className="-mr-2 h-10 w-10 overflow-hidden rounded-lg border border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700">
                          {item.image_url ? (
                            <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <View className="h-full w-full items-center justify-center">
                              <Ionicons name="shirt-outline" size={14} color="#9BA1A6" />
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                    <Text
                      numberOfLines={2}
                      className="ml-4 flex-1 font-body text-xs text-gray-700 dark:text-gray-300">
                      {entry.items.map((item: OutfitItemSummary) => item.name).filter(Boolean).join(' · ')}
                    </Text>
                    <View className="ml-2 rounded-full bg-primary/10 px-2.5 py-1">
                      <Text className="font-body-semibold text-xs text-primary">{entry.count} kez</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <SectionTitle icon="eye-off-outline" title="Hiç Giymediklerin" />
            {unwornItems.length === 0 ? (
              <Text className="font-body text-sm text-gray-500 dark:text-gray-400">
                Harika — envanterindeki her ürünü en az bir kez giymişsin! 🎉
              </Text>
            ) : (
              <>
                <Text className="mb-3 font-body text-sm text-gray-500 dark:text-gray-400">
                  {unwornItems.length} ürün henüz hiç "Giydim" kaydına girmemiş. Belki bir sonraki kombinde?
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {unwornItems.slice(0, 12).map((item: DbItem) => (
                    <View key={item.id} className="w-[30%]">
                      <View className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Ionicons name="shirt-outline" size={22} color="#9BA1A6" />
                          </View>
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-center font-body text-[11px] text-gray-600 dark:text-gray-400">
                        {item.name ?? 'Ürün'}
                      </Text>
                    </View>
                  ))}
                </View>
                {unwornItems.length > 12 && (
                  <Text className="mt-3 font-body text-xs text-gray-400 dark:text-gray-500">
                    + {unwornItems.length - 12} ürün daha
                  </Text>
                )}
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

/** Pasta grafiği (react-native-svg). Modül yoksa null döner, boundary bar'a düşürür. */
function ColorPie({ slices }: { slices: ColorSlice[] }) {
  const svg = loadSvg();
  if (!svg || slices.length === 0) return <ColorBar slices={slices} />;
  const { Svg, Path, Circle } = svg;

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  // Tek renk (%100) — arc başlangıç/bitişi çakışıp hiç çizilmez, tam daire çiz.
  if (slices.length === 1) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill={slices[0].hex} />
      </Svg>
    );
  }

  let angle = -Math.PI / 2;
  const paths = slices.map((slice) => {
    const sweep = (slice.count / total) * Math.PI * 2;
    const x0 = cx + r * Math.cos(angle);
    const y0 = cy + r * Math.sin(angle);
    const x1 = cx + r * Math.cos(angle + sweep);
    const y1 = cy + r * Math.sin(angle + sweep);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
    angle += sweep;
    return { d, hex: slice.hex, name: slice.name };
  });

  return (
    <Svg width={size} height={size}>
      {paths.map((path) => (
        <Path key={path.name} d={path.d} fill={path.hex} />
      ))}
    </Svg>
  );
}

/** SVG'siz yedek: aynı dağılımı oranlı yatay bar olarak çizer (eski build / hata durumu). */
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

/** react-native-svg eski build'de render sırasında patlarsa bar'a düş — ekran asla çökmesin. */
class PieFallbackBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
