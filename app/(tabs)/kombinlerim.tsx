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
import { usePartnership } from '@/lib/hooks/usePartnership';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAuthStore } from '@/lib/stores/authStore';

type Tab = 'gecmis' | 'begenilen';

/** Profildeki 'Kadın'/'Erkek' metnini OutfitCard'ın rozet ikonu tipine çevirir. */
function toGenderIcon(gender: string | null | undefined): 'kadın' | 'erkek' | null {
  if (gender === 'Kadın') return 'kadın';
  if (gender === 'Erkek') return 'erkek';
  return null;
}

export default function KombinlerimScreen() {
  const [tab, setTab] = useState<Tab>('gecmis');
  const userId = useAuthStore((state) => state.userId);
  const worn = useWornOutfits();
  const liked = useLikedOutfits();
  const rateOutfit = useRateOutfit();
  const { data: profile } = useProfile(userId);
  const { data: partnership } = usePartnership();

  const ownGenderIcon = toGenderIcon(profile?.gender);
  const partnerGenderIcon =
    partnership?.status === 'accepted' ? toGenderIcon(partnership.partnerGender) : null;

  /** Kombinin item'ları kimin envanterindense (kendi/partner) o kişinin cinsiyet rozetini döndürür. */
  function genderIconFor(outfit: OutfitWithItems): 'kadın' | 'erkek' | null {
    const ownerId = outfit.items[0]?.user_id;
    if (!ownerId) return null;
    if (ownerId === userId) return ownGenderIcon;
    if (partnership?.status === 'accepted' && ownerId === partnership.partnerId) return partnerGenderIcon;
    return null;
  }

  const isLoading = tab === 'gecmis' ? worn.isLoading : liked.isLoading;
  const isEmpty = tab === 'gecmis' ? (worn.data ?? []).length === 0 : (liked.data ?? []).length === 0;

  // Kombin çiftleri: partner kombini pair_outfit_id ile ana kombine işaret eder. İkisi de
  // listedeyse tek bir "Kombin Çifti" bloğunda birlikte gösterilir; ana kombin listede yoksa
  // (ör. giyilmiş ve Geçmiş'e düşmüş) partner kombini normal tekil kart olarak kalır.
  const likedList: OutfitWithItems[] = liked.data ?? [];
  const likedIds = new Set(likedList.map((outfit: OutfitWithItems) => outfit.id));
  const partnerByMainId = new Map<string, OutfitWithItems>();
  for (const outfit of likedList) {
    if (outfit.pair_outfit_id && likedIds.has(outfit.pair_outfit_id)) {
      partnerByMainId.set(outfit.pair_outfit_id, outfit);
    }
  }
  const likedRows = likedList.filter(
    (outfit: OutfitWithItems) => !(outfit.pair_outfit_id && likedIds.has(outfit.pair_outfit_id))
  );

  function renderLikedOutfit(outfit: OutfitWithItems) {
    return (
      <>
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
          onRate={(value) => rateOutfit.mutate({ outfitId: outfit.id, rating: value })}
          genderIcon={genderIconFor(outfit)}
        />
        <View className="mt-2 flex-row gap-2">
          <Pressable
            onPress={() => router.push({ pathname: '/mark-worn', params: { outfitId: outfit.id } })}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-3">
            <Ionicons name="checkmark-circle-outline" size={18} color="#3461FD" />
            <Text className="font-heading text-sm text-primary">Giydim olarak işaretle</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/kombin-paylas', params: { outfitId: outfit.id } })}
            className="w-12 items-center justify-center rounded-2xl border border-primary">
            <Ionicons name="share-social-outline" size={18} color="#3461FD" />
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      {/* h-11 içerikli başlık — Envanter başlığıyla aynı yükseklik, switcher iki ekranda aynı hizada. */}
      <View className="px-5 pb-4 pt-2">
        <View className="h-11 justify-center">
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Kombinlerim</Text>
        </View>
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
          {likedRows.map((outfit: OutfitWithItems) => {
            const pairedPartner = partnerByMainId.get(outfit.id);
            if (!pairedPartner) {
              return <View key={outfit.id}>{renderLikedOutfit(outfit)}</View>;
            }
            return (
              <View key={outfit.id} className="rounded-3xl border border-accent-purple/40 p-3">
                <View className="mb-3 flex-row items-center justify-center gap-2">
                  <Ionicons name="people" size={15} color="#8B3FE8" />
                  <Text className="font-heading text-sm text-accent-purple">Kombin Çifti</Text>
                </View>
                {renderLikedOutfit(outfit)}
                <View className="my-3" />
                {renderLikedOutfit(pairedPartner)}
              </View>
            );
          })}
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
