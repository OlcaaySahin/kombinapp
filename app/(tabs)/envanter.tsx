import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheetModal } from '@/components/ui/ActionSheetModal';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { ItemCard } from '@/components/ui/ItemCard';
import { showAlert, showConfirm } from '@/lib/alert';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import {
  useArchiveItem,
  useArchiveItems,
  useDeleteItem,
  useDeleteItems,
  useItems,
  type DbItem,
} from '@/lib/hooks/useItems';
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: allItems, isLoading: itemsLoading, isError: itemsError, refetch: refetchItems, isRefetching: itemsRefetching } = useItems();
  const deleteItem = useDeleteItem();
  const archiveItem = useArchiveItem();
  const archiveItems = useArchiveItems();
  const deleteItems = useDeleteItems();
  const {
    data: wishlistItems,
    isLoading: wishlistLoading,
    isError: wishlistError,
    refetch: refetchWishlist,
    isRefetching: wishlistRefetching,
  } = useWishlistItems();
  const deleteWishlistItem = useDeleteWishlistItem();
  const markPurchased = useMarkWishlistItemPurchased();

  const isLoading = tab === 'envanter' ? itemsLoading : wishlistLoading;
  const isError = tab === 'envanter' ? itemsError : wishlistError;
  const isRefetching = tab === 'envanter' ? itemsRefetching : wishlistRefetching;
  const handleRefresh = tab === 'envanter' ? refetchItems : refetchWishlist;

  function handleEnvanterLongPress(item: DbItem) {
    setEnvanterSheetItem(item);
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => !current);
    setSelectedIds(new Set());
  }

  function toggleItemSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkArchive(archived: boolean) {
    if (selectedIds.size === 0) return;
    archiveItems.mutate(
      { ids: Array.from(selectedIds), archived },
      {
        onSuccess: () => {
          setSelectionMode(false);
          setSelectedIds(new Set());
        },
        onError: (error) => showAlert('Olmadı', error instanceof Error ? error.message : String(error)),
      }
    );
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    showConfirm(
      'Ürünleri Sil',
      `${selectedIds.size} ürünü kalıcı olarak silmek istediğine emin misin?`,
      () => {
        deleteItems.mutate(Array.from(selectedIds), {
          onSuccess: () => {
            setSelectionMode(false);
            setSelectedIds(new Set());
          },
          onError: (error) => showAlert('Olmadı', error instanceof Error ? error.message : String(error)),
        });
      }
    );
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
      {/* Başlık satırı Kombinlerim ile birebir aynı yükseklikte (h-11 içerik) — ikili switcher
          iki ekranda da aynı hizada dursun diye alt yazı buradan kategori şeridinin altına taşındı. */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-2">
        <View className="h-11 flex-1 justify-center pr-3">
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Envanter</Text>
        </View>
        {tab === 'envanter' && items.length > 0 && (
          <Pressable onPress={toggleSelectionMode} className="h-11 items-center justify-center px-2">
            <Text className="font-body-medium text-sm text-primary">{selectionMode ? 'Vazgeç' : 'Seç'}</Text>
          </Pressable>
        )}
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

      <Text className="mb-2 px-5 font-body text-xs text-gray-500 dark:text-gray-400">
        {tab === 'envanter'
          ? allItems
            ? `${allItems.length} ürün · düzenlemek için dokun, seçenekler için basılı tut`
            : ' '
          : wishlistItems
            ? `${wishlistItems.length} ürün · düzenlemek için dokun, satın aldıysan ya da silmek istiyorsan basılı tut`
            : ' '}
      </Text>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3461FD" />
        </View>
      )}

      {isError && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}>
          <Text className="text-center font-body text-gray-500 dark:text-gray-400">
            {tab === 'envanter' ? 'Envanter yüklenirken bir sorun oluştu.' : 'İstek listesi yüklenirken bir sorun oluştu.'}
          </Text>
          <Text className="mt-1 text-center font-body text-xs text-gray-400 dark:text-gray-500">
            Yenilemek için aşağı çek.
          </Text>
        </ScrollView>
      )}

      {!isLoading && !isError && visibleList.length === 0 && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}>
          <Ionicons name={tab === 'envanter' ? 'shirt-outline' : 'heart-outline'} size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            {tab === 'envanter' ? 'Dolabın henüz boş' : 'İstek listen henüz boş'}
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            {tab === 'envanter'
              ? 'Sağ üstteki + butonuyla ilk ürününü ekle.'
              : 'Almak istediğin ürünleri ekle, Ana Sayfa\'dan onlarla kombin denemesi yapabilirsin.'}
          </Text>
        </ScrollView>
      )}

      {!isLoading && !isError && tab === 'envanter' && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: selectionMode ? 100 : 32,
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              archived={item.is_archived}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onPress={() =>
                selectionMode
                  ? toggleItemSelection(item.id)
                  : router.push({ pathname: '/add-item', params: { itemId: item.id } })
              }
              onLongPress={() => !selectionMode && handleEnvanterLongPress(item)}
            />
          )}
        />
      )}

      {selectionMode && (
        <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-2 border-t border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#1C1E1F]">
          <Text className="mr-1 font-body-medium text-xs text-gray-500 dark:text-gray-400">
            {selectedIds.size} seçili
          </Text>
          <Pressable
            onPress={() => handleBulkArchive(true)}
            disabled={selectedIds.size === 0}
            className={`flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-gray-100 py-2.5 dark:bg-gray-800 ${
              selectedIds.size === 0 ? 'opacity-40' : ''
            }`}>
            <Ionicons name="archive-outline" size={15} color="#374151" />
            <Text className="font-body-medium text-xs text-gray-700 dark:text-gray-300">Arşivle</Text>
          </Pressable>
          <Pressable
            onPress={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className={`flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-red-50 py-2.5 dark:bg-red-950 ${
              selectedIds.size === 0 ? 'opacity-40' : ''
            }`}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
            <Text className="font-body-medium text-xs text-red-500">Sil</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && tab === 'istek_listesi' && wishlist.length > 0 && (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}
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
            label: envanterSheetItem?.is_archived ? 'Arşivden Çıkar' : 'Arşivle / Önerme',
            icon: envanterSheetItem?.is_archived ? 'archive' : 'archive-outline',
            onPress: () => {
              if (!envanterSheetItem) return;
              archiveItem.mutate(
                { id: envanterSheetItem.id, archived: !envanterSheetItem.is_archived },
                {
                  onError: (error) =>
                    showAlert('Olmadı', error instanceof Error ? error.message : String(error)),
                }
              );
            },
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
