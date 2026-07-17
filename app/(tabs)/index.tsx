import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionChipRow } from '@/components/ui/OptionChipRow';
import { OutfitCard, type OutfitCardData } from '@/components/ui/OutfitCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RecentOutfitsStrip } from '@/components/ui/RecentOutfitsStrip';
import { StarRating } from '@/components/ui/StarRating';
import { WardrobeStats } from '@/components/ui/WardrobeStats';
import { requestAiOutfit, type PairingNote } from '@/lib/aiOutfit';
import { showAlert, showConfirm } from '@/lib/alert';
import type { CategorySlot } from '@/constants/categories';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import { usePartnership } from '@/lib/hooks/usePartnership';
import {
  useCreateOutfit,
  useDailyOutfitCount,
  useLikedOutfits,
  useLogGenerationEvent,
  useRateOutfit,
  type OutfitContext,
} from '@/lib/hooks/useOutfits';
import { generateRandomOutfit, inferTakiType } from '@/lib/outfitGenerator';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { PartnerNoMatchError, requestPartnerOutfit } from '@/lib/partnerOutfit';
import { useWishlistItems, type DbWishlistItem } from '@/lib/hooks/useWishlist';
import { useAuthStore } from '@/lib/stores/authStore';

const MEVSIM = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
const MEKAN = ['Şehir içi', 'Ofis', 'Deniz/Tatil', 'Ev'];
const SAAT = ['Sabah', 'Öğlen', 'Akşam', 'Gece'];
const KONSEPT = ['Günlük', 'Şık', 'Spor', 'Özel Gün'];

const DAILY_LIMIT = 3;
// Demo/test aşamasında bilinçli olarak pasif — mekanizma (sayaç, sorgu, UI) tamamen duruyor,
// tekrar aktif etmek için sadece bunu true yapmak yeterli. 2026-07-15.
const DAILY_LIMIT_ENABLED = false;
const DICE_CONTEXT: OutfitContext = {
  mevsim: 'İlkbahar',
  mekan: 'Şehir içi',
  saat: 'Gündüz',
  konsept: 'Günlük',
};

const NOT_ENOUGH_ITEMS_MESSAGE =
  'Kombin oluşturmak için envanterine en az bir üst, bir alt giyim ve bir ayakkabı eklemelisin.';

type Screen = 'idle' | 'questions' | 'result';
type Source = 'ai_generated' | 'dice';

export default function AnaSayfaScreen() {
  const userId = useAuthStore((state) => state.userId);
  const { data: items } = useItems();
  const { data: wishlistItems } = useWishlistItems();
  const wishlistIdSet = useMemo(
    () => new Set((wishlistItems ?? []).map((item: DbWishlistItem) => item.id)),
    [wishlistItems]
  );
  const dailyCount = useDailyOutfitCount(userId);
  const logEvent = useLogGenerationEvent();
  const createOutfit = useCreateOutfit();
  const rateOutfit = useRateOutfit();
  const likedOutfits = useLikedOutfits();
  const { data: partnership } = usePartnership();
  const hasPartner = partnership?.status === 'accepted';

  useEffect(() => {
    hasSeenOnboarding().then((seen) => {
      if (!seen) router.push('/onboarding');
    });
  }, []);

  const [screen, setScreen] = useState<Screen>('idle');
  const [mevsim, setMevsim] = useState<string | null>(null);
  const [mekan, setMekan] = useState<string | null>(null);
  const [saat, setSaat] = useState<string | null>(null);
  const [konsept, setKonsept] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [includeWishlist, setIncludeWishlist] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<DbItem[] | null>(null);
  const [generatedContext, setGeneratedContext] = useState<OutfitContext>(DICE_CONTEXT);
  const [generatedSource, setGeneratedSource] = useState<Source>('dice');
  const [generatedReasoning, setGeneratedReasoning] = useState<string | null>(null);
  const [generatedPairingNotes, setGeneratedPairingNotes] = useState<PairingNote[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [partnerGenerating, setPartnerGenerating] = useState(false);
  const [partnerItems, setPartnerItems] = useState<DbItem[] | null>(null);
  const [partnerReasoning, setPartnerReasoning] = useState<string | null>(null);
  const [partnerPairingNotes, setPartnerPairingNotes] = useState<PairingNote[] | null>(null);
  const [partnerSaved, setPartnerSaved] = useState(false);
  const [partnerSavedOutfitId, setPartnerSavedOutfitId] = useState<string | null>(null);
  const [partnerRating, setPartnerRating] = useState<number | null>(null);

  const allAnswered = Boolean(mevsim && mekan && saat && konsept);
  const count = dailyCount.data ?? 0;
  const limitReached = DAILY_LIMIT_ENABLED && count >= DAILY_LIMIT;

  // "Karıştır" ile tek parça değiştirirken ayni parçanın slotunda daha önce denenmiş
  // ürünleri hariç tutmak için — her yeni kombin üretiminde sıfırlanır.
  const triedIdsBySlotRef = useRef<Map<CategorySlot, Set<string>>>(new Map());

  // Ana kombinin "versiyonu": her üretim/parça değişimi/sıfırlamada artar. Partner kombini
  // üretimi uzun sürüyor (Claude çağrısı) — istek uçuştayken kullanıcı ana kombinde parça
  // değiştirirse, ESKİ kombine göre üretilmiş yanıt döndüğünde çöpe atılmalı; yoksa yeni
  // ana kombinin yanında eski kombine göre yazılmış bir partner önerisi belirir (canlıda görüldü).
  const outfitVersionRef = useRef(0);

  function showResult(
    picked: DbItem[],
    context: OutfitContext,
    source: Source,
    reasoning?: string | null,
    pairingNotes?: PairingNote[] | null
  ) {
    const triedMap = new Map<CategorySlot, Set<string>>();
    for (const item of picked) {
      if (!triedMap.has(item.slot)) triedMap.set(item.slot, new Set());
      triedMap.get(item.slot)!.add(item.id);
    }
    triedIdsBySlotRef.current = triedMap;
    outfitVersionRef.current += 1;

    setGeneratedItems(picked);
    setGeneratedContext(context);
    setGeneratedSource(source);
    setGeneratedReasoning(reasoning ?? null);
    setGeneratedPairingNotes(pairingNotes ?? null);
    setSaved(false);
    setSavedOutfitId(null);
    setRating(null);
    setPartnerItems(null);
    setPartnerReasoning(null);
    setPartnerPairingNotes(null);
    setPartnerSaved(false);
    setPartnerSavedOutfitId(null);
    setPartnerRating(null);
    setScreen('result');
    if (userId) logEvent.mutate({ userId, type: 'outfit' });
  }

  function replaceItem(itemId: string) {
    if (!generatedItems) return;
    const target = generatedItems.find((item) => item.id === itemId);
    if (!target) return;

    const pool: DbItem[] = includeWishlist ? [...(items ?? []), ...(wishlistItems ?? [])] : (items ?? []);
    const tried = triedIdsBySlotRef.current.get(target.slot) ?? new Set<string>();
    const currentIds = new Set(generatedItems.map((item) => item.id));

    // "taki" (kolye/küpe/yüzük/vb.) için: değiştirilen parçanın dışındaki taki'lerin türlerini
    // dışarıda bırak — aksi halde ör. kombinde küpe varken kolyeyi değiştirince ikinci bir
    // küpe önerilebiliyordu (aynı slot, farklı id, ama aynı tür).
    const targetType = target.slot === 'taki' ? inferTakiType(target.name) : null;
    const otherTakiTypesInOutfit =
      target.slot === 'taki'
        ? new Set(
            generatedItems
              .filter((item) => item.id !== itemId && item.slot === 'taki')
              .map((item) => inferTakiType(item.name))
              .filter((type): type is string => Boolean(type))
          )
        : new Set<string>();

    const candidates = pool.filter((item: DbItem) => {
      if (item.slot !== target.slot || tried.has(item.id) || currentIds.has(item.id)) return false;
      if (target.slot === 'taki') {
        const itemType = inferTakiType(item.name);
        if (itemType && otherTakiTypesInOutfit.has(itemType)) return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      showAlert('Başka seçenek yok', 'Bu kategoride envanterinde/istek listende başka bir ürün bulunmuyor.');
      return;
    }

    // Mümkünse aynı türden (ör. kolye yerine kolye) bir alternatif tercih et — "değiştir"
    // isteğine en sadık davranış bu, tür belirlenemiyorsa (veya eşleşen yoksa) tüm adaylardan seç.
    const sameTypeCandidates = targetType ? candidates.filter((item) => inferTakiType(item.name) === targetType) : [];
    const finalCandidates = sameTypeCandidates.length > 0 ? sameTypeCandidates : candidates;

    const replacement = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
    tried.add(replacement.id);
    triedIdsBySlotRef.current.set(target.slot, tried);

    outfitVersionRef.current += 1;
    setGeneratedItems((current) => current!.map((item) => (item.id === itemId ? replacement : item)));
    setGeneratedReasoning(null);
    setGeneratedPairingNotes(null);
    setPartnerItems(null);
    setPartnerReasoning(null);
    setPartnerPairingNotes(null);
    setPartnerSaved(false);
    setPartnerSavedOutfitId(null);
    setPartnerRating(null);
  }

  function rollDice(excludeIds?: Set<string>) {
    if (limitReached) return;
    const pool: DbItem[] = items ?? [];
    const picked = generateRandomOutfit<DbItem>(pool, excludeIds);
    if (!picked) {
      showAlert('Envanterin yeterli değil', NOT_ENOUGH_ITEMS_MESSAGE);
      return;
    }
    showResult(picked, DICE_CONTEXT, 'dice');
  }

  async function generateViaAi(context: OutfitContext, excludeItemIds?: string[]) {
    if (limitReached) return;
    setGenerating(true);
    try {
      const pool: DbItem[] = includeWishlist ? [...(items ?? []), ...(wishlistItems ?? [])] : (items ?? []);
      const suggestion = await requestAiOutfit(
        pool,
        context,
        excludeItemIds,
        note.trim() || undefined,
        includeWishlist
      );
      if (!suggestion) {
        showAlert('Envanterin yeterli değil', NOT_ENOUGH_ITEMS_MESSAGE);
        return;
      }
      // requestAiOutfit AI çağrısı başarısız olursa sessizce rastgele seçime düşüyor
      // (bilinçli tasarım — üretmeyi hiç reddetmemek için). Ama bu durumda reasoning
      // hiç olmuyordu ve kullanıcı "neden açıklama yok?" diye şaşırıyordu — artık en
      // azından ne olduğunu açıkça söylüyoruz.
      const reasoning =
        suggestion.source === 'dice'
          ? 'Şu an AI önerisi alınamadı, envanterinden bağlama uygun rastgele bir kombin seçtik.'
          : suggestion.reasoning;
      showResult(suggestion.items, context, suggestion.source, reasoning, suggestion.pairingNotes);
    } finally {
      setGenerating(false);
    }
  }

  function generateFromQuestions() {
    if (!allAnswered) return;
    generateViaAi({ mevsim: mevsim!, mekan: mekan!, saat: saat!, konsept: konsept! });
  }

  function retry() {
    const previousIds = generatedItems?.map((item) => item.id) ?? [];
    if (generatedSource === 'ai_generated') {
      generateViaAi(generatedContext, previousIds);
    } else {
      rollDice(new Set(previousIds));
    }
  }

  async function handleLike() {
    if (!userId || !generatedItems) return;
    if (generatedItems.some((item) => wishlistIdSet.has(item.id))) return;
    try {
      const outfitId = await createOutfit.mutateAsync({
        userId,
        itemIds: generatedItems.map((item) => item.id),
        context: generatedContext,
        source: generatedSource,
        isLiked: true,
        userNote: note.trim() || undefined,
      });
      setSavedOutfitId(outfitId);
      setSaved(true);
    } catch (error) {
      console.error('Kombin kaydedilemedi:', error);
      showAlert('Kaydedilemedi', error instanceof Error ? error.message : String(error));
    }
  }

  function handleRate(value: number) {
    if (!savedOutfitId) return;
    setRating(value);
    rateOutfit.mutate({ outfitId: savedOutfitId, rating: value });
  }

  async function generatePartnerOutfit(relaxed = false) {
    if (!generatedItems) return;
    const requestVersion = outfitVersionRef.current;
    setPartnerGenerating(true);
    setPartnerSaved(false);
    try {
      const referenceItems = generatedItems.map((item) => ({ name: item.name, slot: item.slot, color: item.color }));
      const suggestion = await requestPartnerOutfit(referenceItems, generatedContext, relaxed);
      // Yanıt beklerken kullanıcı ana kombinde parça değiştirdiyse bu öneri artık ESKİ
      // kombine ait — sessizce çöpe at, kullanıcı isterse butondan tekrar üretir.
      if (requestVersion !== outfitVersionRef.current) return;
      // Esnek modda (veya model uyumu düşük bulduğunda) uyum yüzdesini kullanıcıya dürüstçe göster.
      const reasoning =
        typeof suggestion.compatibility === 'number' && suggestion.compatibility < 75
          ? `${suggestion.reasoning ?? ''}${suggestion.reasoning ? ' ' : ''}(Tahmini uyum: %${suggestion.compatibility})`
          : (suggestion.reasoning ?? null);
      setPartnerItems(suggestion.items);
      setPartnerReasoning(reasoning);
      setPartnerPairingNotes(suggestion.pairingNotes ?? null);
    } catch (error) {
      if (requestVersion !== outfitVersionRef.current) return;
      if (error instanceof PartnerNoMatchError) {
        showConfirm(
          'Tam uyumlu kombin bulunamadı',
          `${error.message}${error.detail ? `\n\n${error.detail}` : ''}\n\nDaha az uyumlu da olsa (örneğin ~%50 uyum) bir öneri isteyelim mi?`,
          () => generatePartnerOutfit(true),
          'Daha Esnek Öner'
        );
        return;
      }
      console.error('Partner kombini oluşturulamadı:', error);
      showAlert('Oluşturulamadı', error instanceof Error ? error.message : String(error));
    } finally {
      setPartnerGenerating(false);
    }
  }

  async function handleSavePartnerOutfit() {
    if (!userId || !partnerItems) return;
    try {
      const outfitId = await createOutfit.mutateAsync({
        userId,
        itemIds: partnerItems.map((item) => item.id),
        context: generatedContext,
        source: 'ai_generated',
        isLiked: true,
      });
      setPartnerSavedOutfitId(outfitId);
      setPartnerSaved(true);
    } catch (error) {
      console.error('Partner kombini kaydedilemedi:', error);
      showAlert('Kaydedilemedi', error instanceof Error ? error.message : String(error));
    }
  }

  function handleRatePartner(value: number) {
    if (!partnerSavedOutfitId) return;
    setPartnerRating(value);
    rateOutfit.mutate({ outfitId: partnerSavedOutfitId, rating: value });
  }

  function reset() {
    outfitVersionRef.current += 1;
    setScreen('idle');
    setMevsim(null);
    setMekan(null);
    setSaat(null);
    setKonsept(null);
    setNote('');
    setIncludeWishlist(false);
    setGeneratedItems(null);
    setGeneratedReasoning(null);
    setGeneratedPairingNotes(null);
    setSaved(false);
    setSavedOutfitId(null);
    setRating(null);
    setPartnerItems(null);
    setPartnerReasoning(null);
    setPartnerPairingNotes(null);
    setPartnerSaved(false);
    setPartnerSavedOutfitId(null);
    setPartnerRating(null);
  }

  const hasWishlistItem = generatedItems?.some((item) => wishlistIdSet.has(item.id)) ?? false;

  const outfitCardData: OutfitCardData | null = generatedItems
    ? {
        id: 'preview',
        context: generatedContext,
        items: generatedItems.map((item) => ({ ...item, fromWishlist: wishlistIdSet.has(item.id) })),
        reasoning: generatedReasoning,
        pairingNotes: generatedPairingNotes,
        userNote: generatedSource === 'ai_generated' ? note.trim() || null : null,
      }
    : null;

  const partnerOutfitCardData: OutfitCardData | null = partnerItems
    ? {
        id: 'partner-preview',
        context: generatedContext,
        items: partnerItems,
        reasoning: partnerReasoning,
        pairingNotes: partnerPairingNotes,
      }
    : null;

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-white dark:bg-[#151718]" edges={['top']}>
      <View
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 dark:bg-primary/20"
        pointerEvents="none"
      />
      <View
        className="absolute -right-6 top-24 h-28 w-28 rounded-full bg-accent-purple/10 dark:bg-accent-purple/15"
        pointerEvents="none"
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <View className="pb-6 pt-2">
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Bugün ne giysem?</Text>
          <Text className="mt-1 font-body text-gray-500 dark:text-gray-400">
            Günlük {count}/{DAILY_LIMIT} kombin hakkı kullanıldı
          </Text>
        </View>

        {screen === 'idle' && (
          <View>
            <View className="gap-3">
              <PrimaryButton
                label={limitReached ? 'Günlük hakkın doldu' : 'Kombin Oluştur'}
                disabled={limitReached}
                onPress={() => setScreen('questions')}
              />
              <Pressable
                onPress={() => rollDice()}
                disabled={limitReached}
                className={`flex-row items-center justify-center gap-2 rounded-2xl border py-4 ${
                  limitReached ? 'border-gray-200 dark:border-gray-800' : 'border-primary'
                }`}>
                <Ionicons name="shuffle-outline" size={20} color={limitReached ? '#9BA1A6' : '#3461FD'} />
                <Text className={`font-heading text-base ${limitReached ? 'text-gray-400' : 'text-primary'}`}>
                  Zar At
                </Text>
              </Pressable>
            </View>

            {(wishlistItems?.length ?? 0) > 0 && (
              <Pressable
                onPress={() => {
                  setIncludeWishlist(true);
                  setScreen('questions');
                }}
                className="mt-4 flex-row items-center gap-3 rounded-2xl bg-primary/10 p-4">
                <Ionicons name="heart-outline" size={20} color="#3461FD" />
                <Text className="flex-1 font-body text-sm text-primary">
                  İstek listende {wishlistItems?.length} ürün var — bugünkü kombine dahil etmek ister misin?
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#3461FD" />
              </Pressable>
            )}

            <View className="mt-6">
              <WardrobeStats items={items ?? []} />
              <RecentOutfitsStrip outfits={likedOutfits.data ?? []} />
            </View>
          </View>
        )}

        {screen === 'questions' && (
          <View>
            <OptionChipRow label="Mevsim" options={MEVSIM} value={mevsim} onChange={setMevsim} />
            <OptionChipRow label="Mekan" options={MEKAN} value={mekan} onChange={setMekan} />
            <OptionChipRow label="Saat" options={SAAT} value={saat} onChange={setSaat} />
            <OptionChipRow label="Konsept" options={KONSEPT} value={konsept} onChange={setKonsept} />

            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
              Ek not (opsiyonel)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Örn. Arkadaşımın doğum günü partisi, rahat ama şık olsun"
              placeholderTextColor="#9BA1A6"
              multiline
              maxLength={200}
              className="mb-6 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />

            {(wishlistItems?.length ?? 0) > 0 && (
              <Pressable
                onPress={() => setIncludeWishlist((value) => !value)}
                className="mb-6 flex-row items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                <Ionicons
                  name={includeWishlist ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={includeWishlist ? '#3461FD' : '#9BA1A6'}
                />
                <Text className="flex-1 font-body text-sm text-gray-700 dark:text-gray-300">
                  İstek listemi de dahil et ({wishlistItems?.length} ürün)
                </Text>
              </Pressable>
            )}

            <PrimaryButton
              label={generating ? 'Oluşturuluyor...' : 'Kombini Oluştur'}
              disabled={!allAnswered || generating}
              onPress={generateFromQuestions}
            />
          </View>
        )}

        {screen === 'result' && outfitCardData && (
          <View className="gap-4">
            <OutfitCard outfit={outfitCardData} onReplaceItem={saved ? undefined : replaceItem} />
            {!saved && (
              <Text className="-mt-2 text-center font-body text-xs text-gray-400 dark:text-gray-500">
                Beğenmediğin bir parçaya basılı tut, değiştirmek için Karıştır'a bas
              </Text>
            )}
            {saved ? (
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
            ) : (
              <View className="gap-2">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <PrimaryButton
                      label={createOutfit.isPending ? 'Kaydediliyor...' : 'Beğen'}
                      disabled={createOutfit.isPending || hasWishlistItem}
                      onPress={handleLike}
                    />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton
                      label={generating ? 'Oluşturuluyor...' : 'Tekrar Dene'}
                      variant="secondary"
                      disabled={limitReached || generating}
                      onPress={retry}
                    />
                  </View>
                </View>
                {hasWishlistItem && (
                  <Text className="text-center font-body text-xs text-gray-500 dark:text-gray-400">
                    Bu kombin istek listesi ürünü içeriyor — satın alıp envanterine ekleyince kaydedebilirsin.
                  </Text>
                )}
              </View>
            )}

            {hasPartner && !partnerOutfitCardData && (
              <Pressable
                onPress={() => generatePartnerOutfit()}
                disabled={partnerGenerating}
                className="flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-4">
                <Ionicons name="heart-outline" size={18} color="#3461FD" />
                <Text className="font-heading text-base text-primary">
                  {partnerGenerating ? 'Oluşturuluyor...' : 'Partnerime Uyumlu Kombin Öner'}
                </Text>
              </Pressable>
            )}

            {partnerOutfitCardData && (
              <View className="gap-3">
                <Text className="font-heading text-base text-gray-900 dark:text-white">
                  {partnership?.partnerName ?? 'Partnerin'} İçin Önerilen Kombin
                </Text>
                <OutfitCard outfit={partnerOutfitCardData} />
                {partnerSaved ? (
                  <View className="items-center gap-3 rounded-2xl bg-primary/10 py-4">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="checkmark-circle" size={20} color="#3461FD" />
                      <Text className="font-heading text-base text-primary">Kombinlerim&apos;e kaydedildi</Text>
                    </View>
                    <View className="items-center gap-1">
                      <Text className="font-body text-xs text-gray-500 dark:text-gray-400">
                        Bu kombini nasıl buldun?
                      </Text>
                      <StarRating value={partnerRating} onChange={handleRatePartner} />
                    </View>
                  </View>
                ) : (
                  <PrimaryButton
                    label={createOutfit.isPending ? 'Kaydediliyor...' : 'Bu Kombini de Kaydet'}
                    variant="secondary"
                    disabled={createOutfit.isPending}
                    onPress={handleSavePartnerOutfit}
                  />
                )}
              </View>
            )}

            <Pressable onPress={reset}>
              <Text className="text-center font-body-medium text-sm text-gray-500 dark:text-gray-400">
                Baştan başla
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
