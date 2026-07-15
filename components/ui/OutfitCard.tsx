import { Ionicons } from '@expo/vector-icons';
import { Image, Text, View } from 'react-native';

import { getCategory, type CategorySlot } from '@/constants/categories';
import { StarRating } from '@/components/ui/StarRating';

export type OutfitCardData = {
  id: string;
  context: { mevsim: string; mekan: string; saat: string; konsept: string };
  items: { id: string; name: string | null; slot: CategorySlot; color: string | null; image_url?: string | null }[];
  rating?: number | null;
};

export function OutfitCard({
  outfit,
  onRate,
}: {
  outfit: OutfitCardData;
  onRate?: (rating: number) => void;
}) {
  const contextChips = Object.values(outfit.context);

  return (
    <View className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <View className="mb-4 flex-row flex-wrap gap-2">
        {contextChips.map((value) => (
          <View key={value} className="rounded-full bg-primary/10 px-3 py-1">
            <Text className="font-body-medium text-xs text-primary">{value}</Text>
          </View>
        ))}
      </View>

      {(onRate || outfit.rating) && (
        <View className="mb-4">
          <StarRating value={outfit.rating ?? null} onChange={onRate} size={20} />
        </View>
      )}

      <View className="flex-row flex-wrap justify-between">
        {outfit.items.map((item) => {
          const category = getCategory(item.slot);
          const color = item.color ?? '#8E8E93';
          return (
            <View key={item.id} className="mb-4 w-[47%]">
              <View className="aspect-square w-full overflow-hidden rounded-2xl" style={{ backgroundColor: color }}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name={category.icon} size={28} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                className="mt-1.5 font-body-medium text-xs text-gray-900 dark:text-gray-100">
                {item.name ?? 'İsimsiz ürün'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
