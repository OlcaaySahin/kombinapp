import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/ui/CategoryChip';
import { ItemCard } from '@/components/ui/ItemCard';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import { MOCK_ITEMS } from '@/lib/mockData';

export default function EnvanterScreen() {
  const [selected, setSelected] = useState<CategorySlot | null>(null);

  const items = useMemo(
    () => (selected ? MOCK_ITEMS.filter((item) => item.slot === selected) : MOCK_ITEMS),
    [selected]
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="px-5 pb-4 pt-2">
        <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Envanter</Text>
        <Text className="mt-1 font-body text-gray-500 dark:text-gray-400">{MOCK_ITEMS.length} ürün</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        className="mb-2">
        <CategoryChip icon="grid-outline" label="Tümü" selected={selected === null} onPress={() => setSelected(null)} />
        {CATEGORIES.map((category) => (
          <CategoryChip
            key={category.slot}
            icon={category.icon}
            label={category.label}
            selected={selected === category.slot}
            onPress={() => setSelected(category.slot)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
        renderItem={({ item }) => <ItemCard item={item} />}
      />
    </SafeAreaView>
  );
}
