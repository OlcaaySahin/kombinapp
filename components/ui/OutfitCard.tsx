import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { getCategory } from '@/constants/categories';
import type { GeneratedOutfit } from '@/lib/mockData';

export function OutfitCard({ outfit }: { outfit: GeneratedOutfit }) {
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

      <View className="flex-row flex-wrap justify-between">
        {outfit.items.map((item) => {
          const category = getCategory(item.slot);
          return (
            <View key={item.id} className="mb-4 w-[47%]">
              <View
                className="aspect-square w-full items-center justify-center rounded-2xl"
                style={{ backgroundColor: item.color }}>
                <Ionicons name={category.icon} size={28} color="#FFFFFF" />
              </View>
              <Text
                numberOfLines={1}
                className="mt-1.5 font-body-medium text-xs text-gray-900 dark:text-gray-100">
                {item.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
