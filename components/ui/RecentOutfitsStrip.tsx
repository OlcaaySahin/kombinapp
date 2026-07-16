import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import type { OutfitWithItems } from '@/lib/hooks/useOutfits';

export function RecentOutfitsStrip({ outfits }: { outfits: OutfitWithItems[] }) {
  if (outfits.length === 0) return null;

  return (
    <View className="mb-6">
      <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Son Kombinlerin</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {outfits.slice(0, 8).map((outfit) => (
          <Pressable
            key={outfit.id}
            onPress={() => router.push('/(tabs)/kombinlerim')}
            className="h-24 w-24 flex-row flex-wrap overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800">
            {outfit.items.slice(0, 4).map((item) => (
              <View
                key={item.id}
                className="h-12 w-12 overflow-hidden"
                style={{ backgroundColor: item.color ?? '#8E8E93' }}>
                {item.image_url && <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />}
              </View>
            ))}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
