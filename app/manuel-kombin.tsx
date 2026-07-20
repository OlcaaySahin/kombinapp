import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionChipRow } from '@/components/ui/OptionChipRow';
import { OutfitCard, type OutfitCardData } from '@/components/ui/OutfitCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StarRating } from '@/components/ui/StarRating';
import { showAlert } from '@/lib/alert';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import { useCreateOutfit, useRateOutfit } from '@/lib/hooks/useOutfits';
import { useWishlistItems, type DbWishlistItem } from '@/lib/hooks/useWishlist';
import { useAuthStore } from '@/lib/stores/authStore';

const MEVSIM = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
const MEKAN = ['Şehir içi', 'Ofis', 'Deniz/Tatil', 'Ev'];
const SAAT = ['Sabah', 'Öğlen', 'Akşam', 'Gece'];
const KONSEPT = ['Günlük', 'Şık', 'Spor', 'Özel Gün'];
const HAVA = ['Güneşli', 'Yağmurlu', 'Rüzgarlı', 'Karlı'];

type PickableItem = (DbItem | DbWishlistItem) & { fromWishlist: boolean };

/**
 * Kullanıcı isteği (2026-07-19): "kişi belki kafasındaki kombini kaybetmek istemiyordur
 * veya nasıl duracağını görmek istiyordur" — AI/zar'a gitmeden, kullanıcının envanterinden
 * (istek listesi dahil) parçaları KENDİSİ seçip kaydettiği bir akış. AI önizleme burada
 * her zaman erişilebilir (previewEligible) — tam da bu senaryonun asıl değer kattığı yer.
 */
export default function ManuelKombinScreen() {
  const userId = useAuthStore((state) => state.userId);
  const { data: items, isLoading: itemsLoading } = useItems();
  const { data: wishlistItems } = useWishlistItems();
  const createOutfit = useCreateOutfit();
  const rateOutfit = useRateOutfit();

  const [selectedSlot, setSelectedSlot] = useState<CategorySlot | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mevsim, setMevsim] = useState<string | null>(null);
  const [mekan, setMekan] = useState<string | null>(null);
  const [saat, setSaat] = useState<string | null>(null);
  const [konsept, setKonsept] = useState<string | null>(null);
  const [hava, setHava] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  const activeItems = useMemo(() => (items ?? []).filter((item: DbItem) => !item.is_archived), [items]);

  const pool: PickableItem[] = useMemo(() => {
    const own = activeItems.map((item: DbItem) => ({ ...item, fromWishlist: false }));
    const wish = (wishlistItems ?? []).map((item: DbWishlistItem) => ({ ...item, fromWishlist: true }));
    return [...own, ...wish];
  }, [activeItems, wishlistItems]);

  const filteredPool = selectedSlot ? pool.filter((item) => item.slot === selectedSlot) : pool;
  const selectedItems = pool.filter((item) => selectedIds.has(item.id));
  const hasWishlistSelected = selectedItems.some((item) => item.fromWishlist);
  const allAnswered = Boolean(mevsim && mekan && saat && konsept && hava);

  /**
   * Kullanıcı geri bildirimi (2026-07-20): 15 ürünlük karışık/çakışan seçim (2 küpe, 2 kemer vb.)
   * mümkündü. Aynı kategoriden (slot) ikinci bir ürün seçilince öncekini otomatik bırakıyoruz —
   * bir gerçek kombinde zaten kategori başına 1 parça olur, yeni bir kural icat etmiyoruz.
   */
  function toggleItem(item: PickableItem) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
        return next;
      }
      for (const other of pool) {
        if (other.slot === item.slot && next.has(other.id)) next.delete(other.id);
      }
      next.add(item.id);
      return next;
    });
  }

  async function handleSave() {
    if (!userId || selectedItems.length === 0 || !allAnswered || hasWishlistSelected) return;
    try {
      const outfitId = await createOutfit.mutateAsync({
        userId,
        itemIds: selectedItems.map((item) => item.id),
        context: { mevsim: mevsim!, hava: hava!, mekan: mekan!, saat: saat!, konsept: konsept! },
        source: 'manual',
        isLiked: true,
      });
      setSavedOutfitId(outfitId);
      setSaved(true);
    } catch (error) {
      showAlert('Kaydedilemedi', error instanceof Error ? error.message : String(error));
    }
  }

  function handleRate(value: number) {
    if (!savedOutfitId) return;
    setRating(value);
    rateOutfit.mutate({ outfitId: savedOutfitId, rating: value });
  }

  const previewOutfit: OutfitCardData | null =
    selectedItems.length > 0
      ? {
          id: 'manual-preview',
          context: {
            mevsim: mevsim ?? '',
            mekan: mekan ?? '',
            saat: saat ?? '',
            konsept: konsept ?? '',
          },
          items: selectedItems,
        }
      : null;

  if (itemsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#151718]">
        <ActivityIndicator color="#3461FD" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-1 font-heading-bold text-2xl text-gray-900 dark:text-white">
          Kendi Kombinini Oluştur
        </Text>
        <Text className="mb-5 font-body text-sm text-gray-500 dark:text-gray-400">
          Envanterinden (istersen istek listenden de) parçaları seç, kombinini kendin kur.
        </Text>

        {saved && previewOutfit ? (
          <View className="gap-4">
            <OutfitCard outfit={previewOutfit} previewEligible />
            <View className="items-center gap-3 rounded-2xl bg-primary/10 py-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={20} color="#3461FD" />
                <Text className="font-heading text-base text-primary">Kombinlerim&apos;e kaydedildi</Text>
              </View>
              <View className="items-center gap-1">
                <Text className="font-body text-xs text-gray-500 dark:text-gray-400">
                  Bu kombini nasıl buldun?
                </Text>
                <StarRating value={rating} onChange={handleRate} />
              </View>
            </View>
            <Pressable onPress={() => router.back()}>
              <Text className="text-center font-body-medium text-sm text-gray-500 dark:text-gray-400">Kapat</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <OptionChipRow label="Mevsim" options={MEVSIM} value={mevsim} onChange={setMevsim} />
            <OptionChipRow label="Hava" options={HAVA} value={hava} onChange={setHava} />
            <OptionChipRow label="Mekan" options={MEKAN} value={mekan} onChange={setMekan} />
            <OptionChipRow label="Saat" options={SAAT} value={saat} onChange={setSaat} />
            <OptionChipRow label="Konsept" options={KONSEPT} value={konsept} onChange={setKonsept} />

            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
              Parça Seç ({selectedItems.length} seçili)
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, flexShrink: 0 }}
              contentContainerStyle={{ gap: 8 }}
              className="mb-4">
              <CategoryPill label="Tümü" selected={selectedSlot === null} onPress={() => setSelectedSlot(null)} />
              {CATEGORIES.map((category) => (
                <CategoryPill
                  key={category.slot}
                  label={category.label}
                  selected={selectedSlot === category.slot}
                  onPress={() => setSelectedSlot(category.slot)}
                />
              ))}
            </ScrollView>

            <View className="flex-row flex-wrap justify-between">
              {filteredPool.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                  <Pressable key={item.id} onPress={() => toggleItem(item)} className="mb-4 w-[31%]">
                    <View
                      className={`aspect-square w-full overflow-hidden rounded-2xl border-2 ${
                        selected ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: item.color ?? '#8E8E93' }}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <Ionicons name="shirt-outline" size={22} color="#FFFFFF" />
                        </View>
                      )}
                      {item.fromWishlist && (
                        <View className="absolute left-1 top-1 rounded-full bg-black/60 p-1">
                          <Ionicons name="heart" size={9} color="#FFFFFF" />
                        </View>
                      )}
                      {selected && (
                        <View className="absolute bottom-1 right-1 rounded-full bg-primary p-0.5">
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text numberOfLines={1} className="mt-1 font-body text-xs text-gray-700 dark:text-gray-300">
                      {item.name ?? 'İsimsiz'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {previewOutfit && (
              <View className="mb-5">
                <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Önizleme</Text>
                <OutfitCard outfit={previewOutfit} previewEligible />
              </View>
            )}

            {hasWishlistSelected && (
              <Text className="mb-3 text-center font-body text-xs text-gray-500 dark:text-gray-400">
                İstek listesi ürünü seçtin — önizleyebilirsin ama satın alıp envanterine ekleyince kaydedebilirsin.
              </Text>
            )}

            <PrimaryButton
              label={createOutfit.isPending ? 'Kaydediliyor...' : 'Kombini Kaydet'}
              disabled={selectedItems.length === 0 || !allAnswered || hasWishlistSelected || createOutfit.isPending}
              onPress={handleSave}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        selected ? 'border-primary bg-primary' : 'border-gray-200 dark:border-gray-700'
      }`}>
      <Text className={`font-body-medium text-xs ${selected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
