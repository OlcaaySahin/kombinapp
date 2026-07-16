import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { getCategory } from '@/constants/categories';
import { closestColorName } from '@/lib/colorNames';
import type { DbItem } from '@/lib/hooks/useItems';

export function WardrobeStats({ items }: { items: DbItem[] }) {
  if (items.length === 0) return null;

  const colorCounts = new Map<string, number>();
  const slotCounts = new Map<string, number>();
  for (const item of items) {
    const colorName = closestColorName(item.color);
    if (colorName) colorCounts.set(colorName, (colorCounts.get(colorName) ?? 0) + 1);
    slotCounts.set(item.slot, (slotCounts.get(item.slot) ?? 0) + 1);
  }
  const topColor = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topSlotEntry = [...slotCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSlotLabel = topSlotEntry ? getCategory(topSlotEntry[0] as DbItem['slot']).label : null;

  return (
    <View className="mb-6 flex-row gap-3">
      <StatCard icon="shirt-outline" label="Ürün" value={String(items.length)} />
      {topColor && <StatCard icon="color-palette-outline" label="En Çok" value={topColor} />}
      {topSlotLabel && <StatCard icon="albums-outline" label="Kategori" value={topSlotLabel} />}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-gray-50 py-3 dark:bg-gray-800">
      <Ionicons name={icon} size={18} color="#3461FD" />
      <Text numberOfLines={1} className="mt-1 font-heading-bold text-sm text-gray-900 dark:text-white">
        {value}
      </Text>
      <Text className="font-body text-[11px] text-gray-500 dark:text-gray-400">{label}</Text>
    </View>
  );
}
