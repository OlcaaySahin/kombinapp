import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutfitCard } from '@/components/ui/OutfitCard';
import { WearEventCard } from '@/components/ui/WearEventCard';
import {
  useLikedOutfits,
  useRateOutfit,
  useWornOutfits,
  type OutfitWithItems,
  type WearEventData,
} from '@/lib/hooks/useOutfits';

type Tab = 'gecmis' | 'begenilen';

export default function KombinlerimScreen() {
  const [tab, setTab] = useState<Tab>('gecmis');
  const worn = useWornOutfits();
  const liked = useLikedOutfits();
  const rateOutfit = useRateOutfit();

  const isLoading = tab === 'gecmis' ? worn.isLoading : liked.isLoading;
  const isEmpty = tab === 'gecmis' ? (worn.data ?? []).length === 0 : (liked.data ?? []).length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="px-5 pb-4 pt-2">
        <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Kombinlerim</Text>
      </View>

      <View className="mx-5 mb-4 flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
        <TabButton label="Geçmiş" active={tab === 'gecmis'} onPress={() => setTab('gecmis')} />
        <TabButton label="Beğenilenler" active={tab === 'begenilen'} onPress={() => setTab('begenilen')} />
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3461FD" />
        </View>
      )}

      {!isLoading && isEmpty && (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="heart-outline" size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            {tab === 'gecmis' ? 'Henüz giydiğin bir kombin yok' : 'Henüz beğendiğin bir kombin yok'}
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            {tab === 'gecmis'
              ? 'Beğendiğin bir kombini "Giydim" olarak işaretlediğinde burada görünecek.'
              : "Ana Sayfa'dan bir kombin oluştur."}
          </Text>
        </View>
      )}

      {!isLoading && !isEmpty && tab === 'gecmis' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          {(worn.data ?? []).map((wear: WearEventData) => (
            <WearEventCard
              key={wear.id}
              wear={wear}
              onRate={wear.outfitId ? (value) => rateOutfit.mutate({ outfitId: wear.outfitId!, rating: value }) : undefined}
            />
          ))}
        </ScrollView>
      )}

      {!isLoading && !isEmpty && tab === 'begenilen' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}>
          {(liked.data ?? []).map((outfit: OutfitWithItems) => (
            <View key={outfit.id}>
              <OutfitCard
                outfit={{
                  id: outfit.id,
                  context: outfit.generation_context,
                  items: outfit.items,
                  rating: outfit.rating,
                  userNote: outfit.user_note,
                }}
                onRate={(value) => rateOutfit.mutate({ outfitId: outfit.id, rating: value })}
              />
              <Pressable
                onPress={() => router.push({ pathname: '/mark-worn', params: { outfitId: outfit.id } })}
                className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-3">
                <Ionicons name="checkmark-circle-outline" size={18} color="#3461FD" />
                <Text className="font-heading text-sm text-primary">Giydim olarak işaretle</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
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
