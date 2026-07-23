import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheetModal } from '@/components/ui/ActionSheetModal';
import { OutfitCard } from '@/components/ui/OutfitCard';
import { StarRating } from '@/components/ui/StarRating';
import { WearEventCard } from '@/components/ui/WearEventCard';
import { showAlert, showConfirm } from '@/lib/alert';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import {
  useArchiveOutfit,
  useDeleteWearEvent,
  useLikedOutfits,
  useMarkWorn,
  useRateOutfit,
  useWornOutfits,
  type OutfitWithItems,
  type WearEventData,
} from '@/lib/hooks/useOutfits';
import { useDeletePackingList, usePackingLists, type DbPackingList } from '@/lib/hooks/usePackingLists';
import { usePartnership } from '@/lib/hooks/usePartnership';
import { useProfile } from '@/lib/hooks/useProfile';
import { isPremiumActive } from '@/lib/premium';
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
  const packingLists = usePackingLists();
  const deletePackingList = useDeletePackingList();
  const deleteWearEvent = useDeleteWearEvent();
  const archiveOutfit = useArchiveOutfit();
  const markWorn = useMarkWorn();
  const [bavulSheetId, setBavulSheetId] = useState<string | null>(null);
  const [wearSheetId, setWearSheetId] = useState<string | null>(null);
  const { data: inventory } = useItems();
  const rateOutfit = useRateOutfit();
  const { data: profile } = useProfile(userId);
  const { data: partnership } = usePartnership();

  const ownGenderIcon = toGenderIcon(profile?.gender);
  const ownIsPremium = isPremiumActive(profile);
  const partnerGenderIcon =
    partnership?.status === 'accepted' ? toGenderIcon(partnership.partnerGender) : null;
  const partnerIsPremium = partnership?.status === 'accepted' && partnership.partnerIsPremium;

  /** Kombinin item'ları kimin envanterindense (kendi/partner) o kişinin cinsiyet rozetini döndürür. */
  function genderIconFor(outfit: OutfitWithItems): 'kadın' | 'erkek' | null {
    const ownerId = outfit.items[0]?.user_id;
    if (!ownerId) return null;
    if (ownerId === userId) return ownGenderIcon;
    if (partnership?.status === 'accepted' && ownerId === partnership.partnerId) return partnerGenderIcon;
    return null;
  }

  /** Kombinin sahibi (kendi/partner) Premium mı — rozet göstermek için. */
  function isPremiumFor(outfit: OutfitWithItems): boolean {
    const ownerId = outfit.items[0]?.user_id;
    if (!ownerId) return false;
    if (ownerId === userId) return ownIsPremium;
    if (partnership?.status === 'accepted' && ownerId === partnership.partnerId) return partnerIsPremium;
    return false;
  }

  // Geçmiş eylem menüsündeki "Kombini Arşivle" için: seçili giydim kaydının kombin id'si.
  const wearSheetOutfitId =
    (worn.data ?? []).find((wear: WearEventData) => wear.id === wearSheetId)?.outfitId ?? null;

  const isLoading = tab === 'gecmis' ? worn.isLoading : liked.isLoading || packingLists.isLoading;
  const isError = tab === 'gecmis' ? worn.isError : liked.isError || packingLists.isError;
  const isRefetching = tab === 'gecmis' ? worn.isRefetching : liked.isRefetching || packingLists.isRefetching;
  const isEmpty =
    tab === 'gecmis'
      ? (worn.data ?? []).length === 0
      : (liked.data ?? []).length === 0 && (packingLists.data ?? []).length === 0;

  function handleRefresh() {
    if (tab === 'gecmis') {
      worn.refetch();
    } else {
      liked.refetch();
      packingLists.refetch();
    }
  }

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

  // Beğenilenler = kombinler + kaydedilmiş bavullar, tarihe göre karışık sıralı tek liste.
  type BegenilenEntry = { kind: 'outfit'; outfit: OutfitWithItems } | { kind: 'bavul'; plan: DbPackingList };
  const begenilenEntries: BegenilenEntry[] = [
    ...likedRows.map((outfit: OutfitWithItems) => ({ kind: 'outfit' as const, outfit })),
    ...(packingLists.data ?? []).map((plan: DbPackingList) => ({ kind: 'bavul' as const, plan })),
  ].sort((a, b) => {
    const aDate = a.kind === 'outfit' ? a.outfit.created_at : a.plan.created_at;
    const bDate = b.kind === 'outfit' ? b.outfit.created_at : b.plan.created_at;
    return aDate < bDate ? 1 : -1;
  });

  const inventoryById = new Map((inventory ?? []).map((item: DbItem) => [item.id, item]));

  /** Bavul kartı: OutfitCard'la aynı ölçü/çerçeve, bavul ikonu + parça küpürleriyle. */
  function renderBavulCard(plan: DbPackingList) {
    const suitcaseItems = plan.suitcase_item_ids
      .map((id) => inventoryById.get(id))
      .filter((item): item is DbItem => Boolean(item));
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/bavul-hazirla', params: { packingListId: plan.id } })}
        onLongPress={() => setBavulSheetId(plan.id)}
        className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <View className="mb-3 flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="briefcase-outline" size={16} color="#3461FD" />
          </View>
          <View className="flex-1">
            <Text className="font-body-semibold text-sm text-gray-900 dark:text-white">
              Bavul · {plan.days} Gün
            </Text>
            <Text className="font-body text-xs text-gray-500 dark:text-gray-400">
              {[plan.context.mevsim, plan.context.konsept].filter(Boolean).join(' · ')} ·{' '}
              {plan.suitcase_item_ids.length} parça
            </Text>
          </View>
          {plan.rating != null && <StarRating value={Math.round(plan.rating)} size={13} />}
          <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
        </View>
        <View className="flex-row">
          {suitcaseItems.slice(0, 6).map((item: DbItem) => (
            <View
              key={item.id}
              className="-mr-2 h-14 w-14 overflow-hidden rounded-xl border border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700">
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons name="shirt-outline" size={18} color="#9BA1A6" />
                </View>
              )}
            </View>
          ))}
          {suitcaseItems.length > 6 && (
            <View className="ml-4 h-14 items-center justify-center">
              <Text className="font-body text-xs text-gray-500 dark:text-gray-400">
                +{suitcaseItems.length - 6}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  /** Fotoğraf/not eklemeden hızlıca "bugün giydim" kaydı düşer — kullanıcı isteği (2026-07-20):
   *  giydiği bir kombini tekrar giyerken form ekranına gitmeden tek dokunuşla işaretleyebilsin. */
  function handleQuickWear(outfitId: string) {
    markWorn.mutate(
      { outfitId },
      {
        onSuccess: () => showAlert('Giydim!', 'Bugün giydiğin olarak kaydedildi.'),
        onError: (error) => showAlert('Olmadı', error instanceof Error ? error.message : String(error)),
      }
    );
  }

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
          ownerIsPremium={isPremiumFor(outfit)}
          previewEligible={outfit.generation_source === 'manual'}
        />
        <View className="mt-2 flex-row gap-2">
          <Pressable
            onPress={() => router.push({ pathname: '/mark-worn', params: { outfitId: outfit.id } })}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-3">
            <Ionicons name="checkmark-circle-outline" size={18} color="#3461FD" />
            <Text className="font-heading text-sm text-primary">Giydim olarak işaretle</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickWear(outfit.id)}
            className="w-12 items-center justify-center rounded-2xl border border-primary">
            <Ionicons name="flash-outline" size={18} color="#3461FD" />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/kombin-paylas', params: { outfitId: outfit.id } })}
            className="w-12 items-center justify-center rounded-2xl border border-primary">
            <Ionicons name="share-social-outline" size={18} color="#3461FD" />
          </Pressable>
          <Pressable
            onPress={() =>
              showConfirm(
                'Kombini Arşivle',
                "Bu kombin Beğenilenler'den kalkar; Profil > Arşivlerim'den her zaman geri getirebilirsin.",
                () =>
                  archiveOutfit.mutate(
                    { outfitId: outfit.id, archived: true },
                    {
                      onError: (error) =>
                        showAlert('Arşivlenemedi', error instanceof Error ? error.message : String(error)),
                    }
                  ),
                'Arşivle'
              )
            }
            className="w-12 items-center justify-center rounded-2xl border border-gray-300 dark:border-gray-600">
            <Ionicons name="archive-outline" size={18} color="#9BA1A6" />
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

      {!isLoading && isError && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}>
          <Ionicons name="cloud-offline-outline" size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            {tab === 'gecmis' ? 'Geçmiş yüklenirken bir sorun oluştu.' : 'Kombinler yüklenirken bir sorun oluştu.'}
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            Yenilemek için aşağı çek.
          </Text>
        </ScrollView>
      )}

      {!isLoading && !isError && isEmpty && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}>
          <Ionicons name="heart-outline" size={40} color="#9BA1A6" />
          <Text className="mt-3 text-center font-body-medium text-base text-gray-700 dark:text-gray-300">
            {tab === 'gecmis' ? 'Henüz giydiğin bir kombin yok' : 'Henüz beğendiğin bir kombin yok'}
          </Text>
          <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
            {tab === 'gecmis'
              ? 'Beğendiğin bir kombini "Giydim" olarak işaretlediğinde burada görünecek.'
              : "Ana Sayfa'dan bir kombin oluştur."}
          </Text>
        </ScrollView>
      )}

      {!isLoading && !isError && !isEmpty && tab === 'gecmis' && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}>
          {(worn.data ?? []).map((wear: WearEventData) => (
            <WearEventCard
              key={wear.id}
              wear={wear}
              onRate={wear.outfitId ? (value) => rateOutfit.mutate({ outfitId: wear.outfitId!, rating: value }) : undefined}
              onPress={() => setWearSheetId(wear.id)}
            />
          ))}
        </ScrollView>
      )}

      {!isLoading && !isError && !isEmpty && tab === 'begenilen' && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3461FD" />}>
          {begenilenEntries.map((entry) => {
            if (entry.kind === 'bavul') {
              return <View key={entry.plan.id}>{renderBavulCard(entry.plan)}</View>;
            }
            const outfit = entry.outfit;
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

      <ActionSheetModal
        visible={wearSheetId != null}
        title="Giydim Kaydı"
        message="Bu giyme kaydını silmek istersen kombin (beğenilmişse) Beğenilenler'e geri döner."
        onClose={() => setWearSheetId(null)}
        options={[
          ...(wearSheetOutfitId
            ? [
                {
                  label: 'Kombini Arşivle',
                  icon: 'archive-outline' as const,
                  onPress: () => {
                    archiveOutfit.mutate(
                      { outfitId: wearSheetOutfitId, archived: true },
                      {
                        onError: (error) =>
                          showAlert('Arşivlenemedi', error instanceof Error ? error.message : String(error)),
                      }
                    );
                  },
                },
              ]
            : []),
          {
            label: 'Giydim Kaydını Sil',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              if (!wearSheetId) return;
              deleteWearEvent.mutate(wearSheetId, {
                onError: (error) =>
                  showAlert('Silinemedi', error instanceof Error ? error.message : String(error)),
              });
            },
          },
        ]}
      />

      <ActionSheetModal
        visible={bavulSheetId != null}
        title="Bavul"
        message="Bu bavul planı için ne yapmak istersin?"
        onClose={() => setBavulSheetId(null)}
        options={[
          {
            label: 'Bavulu Sil',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              if (!bavulSheetId) return;
              deletePackingList.mutate(bavulSheetId, {
                onError: (error) =>
                  showAlert('Silinemedi', error instanceof Error ? error.message : String(error)),
              });
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
