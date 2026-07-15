import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/ui/CategoryChip';
import { ItemCard } from '@/components/ui/ItemCard';
import { showConfirm } from '@/lib/alert';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import { useDeleteItem, useItems, type DbItem } from '@/lib/hooks/useItems';

export default function EnvanterScreen() {
  const [selected, setSelected] = useState<CategorySlot | null>(null);
  const { data: allItems, isLoading, isError } = useItems();
  const deleteItem = useDeleteItem();

  function confirmDelete(item: DbItem) {
    showConfirm('Ürünü sil', `"${item.name ?? 'Bu ürün'}" envanterden silinsin mi?`, () =>
      deleteItem.mutate(item.id)
    );
  }

  const items = useMemo(() => {
    const list: DbItem[] = allItems ?? [];
    return selected ? list.filter((item: DbItem) => item.slot === selected) : list;
  }, [allItems, selected]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="flex-row items-start justify-between px-5 pb-4 pt-2">
        <View>
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Envanter</Text>
          <Text className="mt-1 font-body text-gray-500 dark:text-gray-400">
            {allItems ? `${allItems.length} ürün · düzenlemek için dokun, silmek için basılı tut` : ' '}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/add-item')}
          className="h-11 w-11 items-center justify-center rounded-full bg-primary">
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
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

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3461FD" />
        </View>
      )}

      {isError && (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center font-body text-gray-500 dark:text-gray-400">
            Envanter yüklenirken bir sorun oluştu.
          </Text>
        </View>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="shirt-outline" size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            Dolabın henüz boş
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            Sağ üstteki + butonuyla ilk ürününü ekle.
          </Text>
        </View>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push({ pathname: '/add-item', params: { itemId: item.id } })}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
