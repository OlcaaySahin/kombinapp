import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarRating } from '@/components/ui/StarRating';
import { useWornOutfits, type WearEventData } from '@/lib/hooks/useOutfits';

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(dateStr)
  );
}

/**
 * Galeri sekmesi: SADECE fotoğraflı "Giydim" kayıtlarının foto grid'i (kombin albümü).
 * Fotoğrafsız giyme kayıtları burada görünmez — onların yeri Kombinlerim > Geçmiş.
 * Karta dokununca detay: büyük foto + parçalar + tarih + not + puan.
 */
export default function GaleriScreen() {
  const worn = useWornOutfits();
  const [selected, setSelected] = useState<WearEventData | null>(null);

  const photos: WearEventData[] = (worn.data ?? []).filter((wear: WearEventData) => Boolean(wear.photoUrl));

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="px-5 pb-4 pt-2">
        <View className="h-11 justify-center">
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Galeri</Text>
        </View>
      </View>

      {worn.isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3461FD" />
        </View>
      )}

      {!worn.isLoading && photos.length === 0 && (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="images-outline" size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            Henüz fotoğraflı bir kombin anın yok
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            Bir kombini "Giydim" olarak işaretlerken fotoğraf eklersen burada birikir — kendi stil
            albümün.
          </Text>
        </View>
      )}

      {!worn.isLoading && photos.length > 0 && (
        <FlatList
          data={photos}
          keyExtractor={(wear) => wear.id}
          numColumns={3}
          columnWrapperStyle={{ gap: 4 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 4 }}
          renderItem={({ item: wear }) => (
            <Pressable onPress={() => setSelected(wear)} className="flex-1 overflow-hidden rounded-xl" style={{ maxWidth: '33%' }}>
              <Image source={{ uri: wear.photoUrl! }} className="aspect-square w-full" resizeMode="cover" />
            </Pressable>
          )}
        />
      )}

      {/* Detay görünümü */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="mt-14 flex-1 rounded-t-3xl bg-white dark:bg-gray-900">
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {selected?.photoUrl && (
                <Image
                  source={{ uri: selected.photoUrl }}
                  className="aspect-[4/5] w-full rounded-t-3xl"
                  resizeMode="cover"
                />
              )}
              <View className="p-5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-heading text-base text-gray-900 dark:text-white">
                    {selected ? formatDate(selected.wornDate) : ''}
                  </Text>
                  {selected?.rating != null && <StarRating value={selected.rating} size={16} />}
                </View>
                {selected?.note ? (
                  <View className="mt-2 flex-row items-start gap-2">
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color="#3461FD" />
                    <Text className="flex-1 font-body text-sm text-gray-700 dark:text-gray-300">
                      {selected.note}
                    </Text>
                  </View>
                ) : null}

                {(selected?.items.length ?? 0) > 0 && (
                  <>
                    <Text className="mb-2 mt-4 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
                      Kombindeki parçalar
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {selected?.items.map((item) => (
                        <View key={item.id} className="w-[30%]">
                          <View
                            className="aspect-square w-full overflow-hidden rounded-xl"
                            style={{ backgroundColor: item.color ?? '#8E8E93' }}>
                            {item.image_url && (
                              <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                            )}
                          </View>
                          <Text
                            numberOfLines={1}
                            className="mt-1 font-body text-xs text-gray-700 dark:text-gray-300">
                            {item.name ?? 'İsimsiz'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
            <Pressable
              onPress={() => setSelected(null)}
              className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/50">
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
