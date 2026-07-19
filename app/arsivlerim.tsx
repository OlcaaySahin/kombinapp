import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ItemCard } from '@/components/ui/ItemCard';
import { OutfitCard } from '@/components/ui/OutfitCard';
import { showAlert } from '@/lib/alert';
import { useArchiveItem, useItems, type DbItem } from '@/lib/hooks/useItems';
import { useArchivedOutfits, useArchiveOutfit, type OutfitWithItems } from '@/lib/hooks/useOutfits';

/**
 * Arşivlerim (Profil menüsünden açılan modal): arşivlenmiş kombinler + envanter ürünleri.
 * Kombinler Beğenilenler/Geçmiş'ten düşer ve SADECE burada görünür; ürünler ise
 * (kullanıcı kararı) Envanter'de soluk+rozetli kalmaya devam eder, burası ürünler için
 * toplu bir bakış + arşivden çıkarma kısayoludur.
 */
export default function ArsivlerimScreen() {
  const archivedOutfits = useArchivedOutfits();
  const { data: allItems, isLoading: itemsLoading } = useItems();
  const archiveOutfit = useArchiveOutfit();
  const archiveItem = useArchiveItem();

  const archivedItems: DbItem[] = (allItems ?? []).filter((item: DbItem) => item.is_archived);
  const outfits: OutfitWithItems[] = archivedOutfits.data ?? [];
  const isLoading = archivedOutfits.isLoading || itemsLoading;
  const isEmpty = !isLoading && outfits.length === 0 && archivedItems.length === 0;

  const onError = (error: unknown) =>
    showAlert('Olmadı', error instanceof Error ? error.message : String(error));

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-[#151718]"
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {isLoading && (
        <View className="items-center py-16">
          <ActivityIndicator color="#3461FD" />
        </View>
      )}

      {isEmpty && (
        <View className="items-center px-6 py-16">
          <Ionicons name="archive-outline" size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            Arşivin boş
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            Envanterde bir ürüne basılı tutup "Arşivle" diyerek onu önerilerden çıkarabilir,
            Kombinlerim'deki arşiv butonuyla eski kombinlerini buraya kaldırabilirsin.
          </Text>
        </View>
      )}

      {outfits.length > 0 && (
        <View className="mb-6">
          <Text className="mb-3 font-heading text-lg text-gray-900 dark:text-white">
            Arşivlenmiş Kombinler ({outfits.length})
          </Text>
          <View className="gap-4">
            {outfits.map((outfit: OutfitWithItems) => (
              <View key={outfit.id}>
                <OutfitCard
                  outfit={{
                    id: outfit.id,
                    context: outfit.generation_context,
                    items: outfit.items,
                    rating: outfit.rating,
                    userNote: outfit.user_note,
                    reasoning: outfit.reasoning,
                    pairingNotes: outfit.pairing_notes,
                  }}
                />
                <Pressable
                  onPress={() =>
                    archiveOutfit.mutate({ outfitId: outfit.id, archived: false }, { onError })
                  }
                  className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-3">
                  <Ionicons name="arrow-undo-outline" size={16} color="#3461FD" />
                  <Text className="font-heading text-sm text-primary">Arşivden Çıkar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      {archivedItems.length > 0 && (
        <View>
          <Text className="mb-1 font-heading text-lg text-gray-900 dark:text-white">
            Arşivlenmiş Ürünler ({archivedItems.length})
          </Text>
          <Text className="mb-3 font-body text-xs text-gray-500 dark:text-gray-400">
            Bu ürünler Envanter'de görünmeye devam eder ama kombin önerilerine girmez. Arşivden
            çıkarmak için dokun.
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {archivedItems.map((item: DbItem) => (
              <ItemCard
                key={item.id}
                item={item}
                archived
                onPress={() => archiveItem.mutate({ id: item.id, archived: false }, { onError })}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
