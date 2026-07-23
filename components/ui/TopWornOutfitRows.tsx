import { Ionicons } from '@expo/vector-icons';
import { Image, Text, View } from 'react-native';

import type { OutfitItemSummary } from '@/lib/hooks/useOutfits';
import type { WornOutfitStat } from '@/lib/wardrobeInsights';

/**
 * En çok giyilen kombin satırları — Ana Sayfa ve Gardırop Analizi'nde aynı görünüm.
 *
 * `compact`: Yoğun Panel varyantında bu bileşen UnwornItemThumbs ile yarı-genişlikte yan
 * yana kullanılıyor — tam-genişlik varsayımıyla yazılmış satır (4 küpür + isim metni +
 * sayaç rozeti) o dar sütunda taşıp rozetin komşu sütuna görsel olarak taşmasına yol
 * açıyordu (kullanıcı ekran görüntüsüyle bildirdi, 2026-07-23). Compact modda isim metni
 * hiç gösterilmiyor (dar sütunda okunaksız olurdu, "Detaylı gardırop analizi" zaten tam
 * bilgiyi veriyor) ve küpür sayısı/boyutu küçültülüyor.
 */
export function TopWornOutfitRows({ entries, compact = false }: { entries: WornOutfitStat[]; compact?: boolean }) {
  const maxItems = compact ? 3 : 4;
  return (
    <View className="gap-3">
      {entries.map((entry, index) => (
        <View
          key={index}
          className={`flex-row items-center rounded-2xl bg-gray-50 dark:bg-gray-800 ${compact ? 'p-2' : 'p-3'}`}>
          <View className="flex-row">
            {entry.items.slice(0, maxItems).map((item: OutfitItemSummary) => (
              <View
                key={item.id}
                className={`-mr-2 overflow-hidden rounded-lg border border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700 ${
                  compact ? 'h-8 w-8' : 'h-10 w-10'
                }`}>
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
          {!compact && (
            <Text numberOfLines={2} className="ml-4 flex-1 font-body text-xs text-gray-700 dark:text-gray-300">
              {entry.items.map((item: OutfitItemSummary) => item.name).filter(Boolean).join(' · ')}
            </Text>
          )}
          <View className="ml-2 rounded-full bg-primary/10 px-2.5 py-1">
            <Text className="font-body-semibold text-xs text-primary">{entry.count} kez</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
