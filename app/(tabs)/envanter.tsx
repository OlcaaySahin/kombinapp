import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheetModal } from '@/components/ui/ActionSheetModal';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { ItemCard } from '@/components/ui/ItemCard';
import { showAlert } from '@/lib/alert';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import { useDeleteItem, useItems, type DbItem } from '@/lib/hooks/useItems';
import {
  useDeleteWishlistItem,
  useMarkWishlistItemPurchased,
  useWishlistItems,
  type DbWishlistItem,
} from '@/lib/hooks/useWishlist';

type Tab = 'envanter' | 'istek_listesi';

export default function EnvanterScreen() {
  const [tab, setTab] = useState<Tab>('envanter');
  const [selected, setSelected] = useState<CategorySlot | null>(null);
  const [sheetItem, setSheetItem] = useState<DbWishlistItem | null>(null);
  const [envanterSheetItem, setEnvanterSheetItem] = useState<DbItem | null>(null);

  const { data: allItems, isLoading: itemsLoading, isError: itemsError } = useItems();
  const deleteItem = useDeleteItem();
  const { data: wishlistItems, isLoading: wishlistLoading, isError: wishlistError } = useWishlistItems();
  const deleteWishlistItem = useDeleteWishlistItem();
  const markPurchased = useMarkWishlistItemPurchased();

  const isLoading = tab === 'envanter' ? itemsLoading : wishlistLoading;
  const isError = tab === 'envanter' ? itemsError : wishlistError;

  function handleEnvanterLongPress(item: DbItem) {
    setEnvanterSheetItem(item);
  }

  function handleWishlistLongPress(item: DbWishlistItem) {
    setSheetItem(item);
  }

  const items = useMemo(() => {
    const list: DbItem[] = allItems ?? [];
    return selected ? list.filter((item: DbItem) => item.slot === selected) : list;
  }, [allItems, selected]);

  const wishlist = useMemo(() => {
    const list: DbWishlistItem[] = wishlistItems ?? [];
    return selected ? list.filter((item: DbWishlistItem) => item.slot === selected) : list;
  }, [wishlistItems, selected]);

  const visibleList = tab === 'envanter' ? items : wishlist;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="flex-row items-start justify-between px-5 pb-4 pt-2">
        {/* flex-1 olmazsa uzun alt yazı + butonunu ekran dışına itiyor (canlıda görüldü) */}
        <View className="flex-1 pr-3">
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Envanter</Text>
          <Text className="mt-1 font-body text-gray-500 dark:text-gray-400">
            {tab === 'envanter'
              ? allItems
                ? `${allItems.length} ürün · düzenlemek için dokun, seçenekler için basılı tut`
                : ' '
              : wishlistItems
                ? `${wishlistItems.length} ürün · düzenlemek için dokun, satın aldıysan ya da silmek istiyorsan basılı tut`
                : ' '}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(tab === 'envanter' ? '/add-item' : '/add-wishlist-item')}
          className="h-11 w-11 items-center justify-center rounded-full bg-primary">
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View className="mx-5 mb-4 flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
        <TabButton label="Envanterim" active={tab === 'envanter'} onPress={() => setTab('envanter')} />
        <TabButton label="İstek Listem" active={tab === 'istek_listesi'} onPress={() => setTab('istek_listesi')} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // flexShrink: 0 şart — kalabalık envanterde alttaki FlatList alan için sıkıştırınca
        // bu şerit daralıp ikon altı yazıları kırpıyordu (istek listesinde 1 ürünle görünmüyordu).
        style={{ flexGrow: 0, flexShrink: 0 }}
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
            {tab === 'envanter' ? 'Envanter yüklenirken bir sorun oluştu.' : 'İstek listesi yüklenirken bir sorun oluştu.'}
          </Text>
        </View>
      )}

      {!isLoading && !isError && visibleList.length === 0 && (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name={tab === 'envanter' ? 'shirt-outline' : 'heart-outline'} size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            {tab === 'envanter' ? 'Dolabın henüz boş' : 'İstek listen henüz boş'}
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            {tab === 'envanter'
              ? 'Sağ üstteki + butonuyla ilk ürününü ekle.'
              : 'Almak istediğin ürünleri ekle, Ana Sayfa\'dan onlarla kombin denemesi yapabilirsin.'}
          </Text>
        </View>
      )}

      {!isLoading && !isError && tab === 'envanter' && items.length > 0 && (
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
              onLongPress={() => handleEnvanterLongPress(item)}
            />
          )}
        />
      )}

      {!isLoading && !isError && tab === 'istek_listesi' && wishlist.length > 0 && (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push({ pathname: '/add-wishlist-item', params: { itemId: item.id } })}
              onLongPress={() => handleWishlistLongPress(item)}
            />
          )}
        />
      )}

      <ActionSheetModal
        visible={envanterSheetItem !== null}
        title={envanterSheetItem?.name ?? 'Envanter'}
        message="Bu ürün için ne yapmak istersin?"
        onClose={() => setEnvanterSheetItem(null)}
        options={[
          {
            label: 'Gizle / Önerme',
            icon: 'eye-off-outline',
            onPress: () =>
              showAlert('Yakında', 'Bu ürünü kombin önerilerinden gizleme özelliği yakında eklenecek.'),
          },
          {
            label: 'Ürünü Sil',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              if (envanterSheetItem) deleteItem.mutate(envanterSheetItem.id);
            },
          },
        ]}
      />

      <ActionSheetModal
        visible={sheetItem !== null}
        title={sheetItem?.name ?? 'İstek listesi'}
        message="Bu ürün için ne yapmak istersin?"
        onClose={() => setSheetItem(null)}
        options={[
          {
            label: 'Ürünü Satın Aldım',
            icon: 'bag-check-outline',
            onPress: () => {
              if (!sheetItem) return;
              markPurchased.mutate(sheetItem, {
                onError: (error) =>
                  showAlert('Taşınamadı', error instanceof Error ? error.message : String(error)),
              });
            },
          },
          {
            label: 'Ürünü Sil',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              if (sheetItem) deleteWishlistItem.mutate(sheetItem.id);
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 rounded-xl py-2.5 ${active ? 'bg-white dark:bg-gray-900' : ''}`}>
      <Text
        className={`text-center font-body-semibold text-sm ${
          active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}
