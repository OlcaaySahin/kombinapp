import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { getCategory, type CategorySlot } from '@/constants/categories';
import { StarRating } from '@/components/ui/StarRating';
import { buildOutfitPreviewUrl } from '@/lib/outfitPreview';

export type OutfitCardData = {
  id: string;
  context: { mevsim: string; mekan: string; saat: string; konsept: string };
  items: {
    id: string;
    name: string | null;
    slot: CategorySlot;
    color: string | null;
    image_url?: string | null;
    fromWishlist?: boolean;
  }[];
  rating?: number | null;
  reasoning?: string | null;
  userNote?: string | null;
};

export function OutfitCard({
  outfit,
  onRate,
  onReplaceItem,
}: {
  outfit: OutfitCardData;
  onRate?: (rating: number) => void;
  onReplaceItem?: (itemId: string) => void;
}) {
  const contextChips = Object.values(outfit.context);
  const [previewState, setPreviewState] = useState<'hidden' | 'loading' | 'shown' | 'error'>('hidden');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  function togglePreview() {
    setPreviewState((current) => (current === 'hidden' || current === 'error' ? 'loading' : 'hidden'));
  }

  return (
    <View className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1 flex-row flex-wrap gap-2">
          {contextChips.map((value) => (
            <View key={value} className="rounded-full bg-primary/10 px-3 py-1">
              <Text className="font-body-medium text-xs text-primary">{value}</Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={togglePreview}
          className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-primary/10"
          accessibilityLabel="Önizlemeyi Göster">
          <Ionicons name="body-outline" size={18} color="#3461FD" />
        </Pressable>
      </View>

      {outfit.userNote && (
        <View className="mb-3 flex-row gap-2 rounded-2xl bg-primary/5 p-3">
          <Ionicons name="chatbox-ellipses-outline" size={16} color="#3461FD" style={{ marginTop: 1 }} />
          <Text className="flex-1 font-body text-xs italic text-gray-600 dark:text-gray-300">
            &quot;{outfit.userNote}&quot;
          </Text>
        </View>
      )}

      {outfit.reasoning && (
        <View className="mb-4 flex-row gap-2 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
          <Ionicons name="bulb-outline" size={16} color="#3461FD" style={{ marginTop: 1 }} />
          <Text className="flex-1 font-body text-xs text-gray-600 dark:text-gray-300">{outfit.reasoning}</Text>
        </View>
      )}

      {previewState !== 'hidden' && (
        <View className="mb-4 aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800">
          {previewState === 'error' ? (
            <Text className="px-6 text-center font-body text-xs text-gray-500 dark:text-gray-400">
              Önizleme oluşturulamadı, tekrar dene.
            </Text>
          ) : (
            <>
              <Image
                source={{ uri: buildOutfitPreviewUrl(outfit.items) }}
                className="h-full w-full"
                resizeMode="cover"
                onLoad={() => setPreviewState('shown')}
                onError={() => setPreviewState('error')}
              />
              {previewState === 'loading' && (
                <View className="absolute inset-0 items-center justify-center">
                  <ActivityIndicator color="#3461FD" />
                  <Text className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
                    Önizleme oluşturuluyor...
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {(onRate || outfit.rating) && (
        <View className="mb-4">
          <StarRating value={outfit.rating ?? null} onChange={onRate} size={20} />
        </View>
      )}

      <View className="flex-row flex-wrap justify-between">
        {outfit.items.map((item) => {
          const category = getCategory(item.slot);
          const color = item.color ?? '#8E8E93';
          return (
            <View key={item.id} className="mb-4 w-[47%]">
              <Pressable
                onLongPress={() => onReplaceItem && setActiveItemId((current) => (current === item.id ? null : item.id))}
                className="aspect-square w-full overflow-hidden rounded-2xl"
                style={{ backgroundColor: color }}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name={category.icon} size={28} color="#FFFFFF" />
                  </View>
                )}
                {item.fromWishlist && (
                  <View className="absolute left-1.5 top-1.5 flex-row items-center gap-1 rounded-full bg-black/60 px-2 py-1">
                    <Ionicons name="heart" size={10} color="#FFFFFF" />
                    <Text className="font-body-semibold text-[10px] text-white">İstek Listesi</Text>
                  </View>
                )}
                {onReplaceItem && activeItemId === item.id && (
                  <View className="absolute inset-0 items-center justify-center bg-black/50">
                    <Pressable
                      onPress={() => {
                        onReplaceItem(item.id);
                        setActiveItemId(null);
                      }}
                      className="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-2">
                      <Ionicons name="shuffle" size={14} color="#3461FD" />
                      <Text className="font-body-semibold text-xs text-primary">Karıştır</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
              <Text
                numberOfLines={1}
                className="mt-1.5 font-body-medium text-xs text-gray-900 dark:text-gray-100">
                {item.name ?? 'İsimsiz ürün'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
