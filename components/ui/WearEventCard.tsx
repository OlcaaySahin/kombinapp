import { Ionicons } from '@expo/vector-icons';
import { Image, Text, View } from 'react-native';

import type { WearEventData } from '@/lib/hooks/useOutfits';

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(dateStr)
  );
}

export function WearEventCard({ wear }: { wear: WearEventData }) {
  return (
    <View className="mb-4 overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      {wear.photoUrl ? (
        <Image source={{ uri: wear.photoUrl }} className="aspect-[4/5] w-full" resizeMode="cover" />
      ) : (
        <View className="aspect-[4/5] w-full items-center justify-center bg-gray-50 dark:bg-gray-800">
          <Ionicons name="image-outline" size={32} color="#9BA1A6" />
        </View>
      )}

      <View className="p-4">
        <Text className="font-body text-xs text-gray-500 dark:text-gray-400">{formatDate(wear.wornDate)}</Text>
        {wear.note ? (
          <Text className="mt-1 font-body-medium text-sm text-gray-900 dark:text-gray-100">{wear.note}</Text>
        ) : null}

        <View className="mt-3 flex-row flex-wrap gap-2">
          {wear.items.map((item) => (
            <View
              key={item.id}
              className="h-12 w-12 overflow-hidden rounded-xl"
              style={{ backgroundColor: item.color ?? '#8E8E93' }}>
              {item.image_url && <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
