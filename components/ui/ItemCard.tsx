import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { getCategory, type CategorySlot } from '@/constants/categories';

export type ItemCardData = {
  id: string;
  name: string | null;
  slot: CategorySlot;
  color: string | null;
};

function isLightColor(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function ItemCard({ item }: { item: ItemCardData }) {
  const category = getCategory(item.slot);
  const color = item.color ?? '#8E8E93';
  const iconColor = isLightColor(color) ? '#1C1C1E' : '#FFFFFF';

  return (
    <View className="mb-4 w-[47%]">
      <View
        className="aspect-square w-full items-center justify-center rounded-2xl"
        style={{ backgroundColor: color }}>
        <Ionicons name={category.icon} size={32} color={iconColor} />
      </View>
      <Text numberOfLines={1} className="mt-2 font-body-medium text-sm text-gray-900 dark:text-gray-100">
        {item.name ?? 'İsimsiz ürün'}
      </Text>
      <Text className="font-body text-xs text-gray-500 dark:text-gray-400">{category.label}</Text>
    </View>
  );
}
