import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, View } from 'react-native';

import type { DbItem } from '@/lib/hooks/useItems';

function ItemThumb({ item, size }: { item: DbItem; size: 'strip' | 'grid' }) {
  return (
    <View className={size === 'strip' ? 'w-20' : 'w-[30%]'}>
      <View className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="shirt-outline" size={22} color="#9BA1A6" />
          </View>
        )}
      </View>
      <Text numberOfLines={1} className="mt-1 text-center font-body text-[11px] text-gray-600 dark:text-gray-400">
        {item.name ?? 'Ürün'}
      </Text>
    </View>
  );
}

/** Hiç giyilmemiş ürün küpürleri — Ana Sayfa'da yatay şerit, Gardırop Analizi'nde grid. */
export function UnwornItemThumbs({ items, layout, maxCount = 12 }: { items: DbItem[]; layout: 'strip' | 'grid'; maxCount?: number }) {
  if (items.length === 0) return null;

  if (layout === 'strip') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {items.slice(0, maxCount).map((item: DbItem) => (
          <ItemThumb key={item.id} item={item} size="strip" />
        ))}
      </ScrollView>
    );
  }

  return (
    <>
      <View className="flex-row flex-wrap gap-3">
        {items.slice(0, maxCount).map((item: DbItem) => (
          <ItemThumb key={item.id} item={item} size="grid" />
        ))}
      </View>
      {items.length > maxCount && (
        <Text className="mt-3 font-body text-xs text-gray-400 dark:text-gray-500">
          + {items.length - maxCount} ürün daha
        </Text>
      )}
    </>
  );
}
