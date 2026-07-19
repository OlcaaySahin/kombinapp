import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';

import { getCategory, type CategorySlot } from '@/constants/categories';

export type ItemCardData = {
  id: string;
  name: string | null;
  slot: CategorySlot;
  color: string | null;
  image_url?: string | null;
};

function isLightColor(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function ItemCard({
  item,
  onPress,
  onLongPress,
  archived = false,
}: {
  item: ItemCardData;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Arşivlenmiş ürün: kart soluk + "Arşiv" rozeti (kullanıcı kararı: gizlenmez, görünür kalır). */
  archived?: boolean;
}) {
  const category = getCategory(item.slot);
  const color = item.color ?? '#8E8E93';
  const iconColor = isLightColor(color) ? '#1C1C1E' : '#FFFFFF';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} className="mb-4 w-[47%] shadow-sm dark:shadow-none">
      <View
        className={`aspect-square w-full overflow-hidden rounded-2xl ${archived ? 'opacity-40' : ''}`}
        style={{ backgroundColor: color }}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name={category.icon} size={32} color={iconColor} />
          </View>
        )}
      </View>
      {archived && (
        <View className="absolute left-2 top-2 flex-row items-center gap-1 rounded-full bg-black/60 px-2 py-1">
          <Ionicons name="archive-outline" size={11} color="#FFFFFF" />
          <Text className="font-body-semibold text-[10px] text-white">Arşiv</Text>
        </View>
      )}
      <Text numberOfLines={1} className="mt-2 font-body-medium text-sm text-gray-900 dark:text-gray-100">
        {item.name ?? 'İsimsiz ürün'}
      </Text>
      <Text className="font-body text-xs text-gray-500 dark:text-gray-400">{category.label}</Text>
    </Pressable>
  );
}
