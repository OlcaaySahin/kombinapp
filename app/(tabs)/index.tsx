import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionChipRow } from '@/components/ui/OptionChipRow';
import { OutfitCard, type OutfitCardData } from '@/components/ui/OutfitCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StarRating } from '@/components/ui/StarRating';
import { requestAiOutfit } from '@/lib/aiOutfit';
import { showAlert } from '@/lib/alert';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import {
  useCreateOutfit,
  useDailyOutfitCount,
  useLogGenerationEvent,
  useRateOutfit,
  type OutfitContext,
} from '@/lib/hooks/useOutfits';
import { generateRandomOutfit } from '@/lib/outfitGenerator';
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
  const dailyCount = useDailyOutfitCount(userId);
  const logEvent = useLogGenerationEvent();
  const createOutfit = useCreateOutfit();
  const rateOutfit = useRateOutfit();

  const [screen, setScreen] = useState<Screen>('idle');
  const [mevsim, setMevsim] = useState<string | null>(null);
  const [mekan, setMekan] = useState<string | null>(null);
  const [saat, setSaat] = useState<string | null>(null);
  const [konsept, setKonsept] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<DbItem[] | null>(null);
  const [generatedContext, setGeneratedContext] = useState<OutfitContext>(DICE_CONTEXT);
  const [generatedSource, setGeneratedSource] = useState<Source>('dice');
  const [generatedReasoning, setGeneratedReasoning] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  const allAnswered = Boolean(mevsim && mekan && saat && konsept);
  const count = dailyCount.data ?? 0;
  const limitReached = DAILY_LIMIT_ENABLED && count >= DAILY_LIMIT;

  function showResult(picked: DbItem[], context: OutfitContext, source: Source, reasoning?: string | null) {
    setGeneratedItems(picked);
    setGeneratedContext(context);
    setGeneratedSource(source);
    setGeneratedReasoning(reasoning ?? null);
    setSaved(false);
    setSavedOutfitId(null);
    setRating(null);
    setScreen('result');
    if (userId) logEvent.mutate({ userId, type: 'outfit' });
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
      const suggestion = await requestAiOutfit(items ?? [], context, excludeItemIds, note.trim() || undefined);
      if (!suggestion) {
        showAlert('Envanterin yeterli değil', NOT_ENOUGH_ITEMS_MESSAGE);
        return;
      }
      showResult(suggestion.items, context, suggestion.source, suggestion.reasoning);
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

  function reset() {
    setScreen('idle');
    setMevsim(null);
    setMekan(null);
    setSaat(null);
    setKonsept(null);
    setNote('');
    setGeneratedItems(null);
    setGeneratedReasoning(null);
    setSaved(false);
    setSavedOutfitId(null);
    setRating(null);
  }

  const outfitCardData: OutfitCardData | null = generatedItems
    ? {
        id: 'preview',
        context: generatedContext,
        items: generatedItems,
        reasoning: generatedReasoning,
        userNote: generatedSource === 'ai_generated' ? note.trim() || null : null,
      }
    : null;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <View className="pb-6 pt-2">
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Bugün ne giysem?</Text>
          <Text className="mt-1 font-body text-gray-500 dark:text-gray-400">
            Günlük {count}/{DAILY_LIMIT} kombin hakkı kullanıldı
          </Text>
        </View>

        {screen === 'idle' && (
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

            <PrimaryButton
              label={generating ? 'Oluşturuluyor...' : 'Kombini Oluştur'}
              disabled={!allAnswered || generating}
              onPress={generateFromQuestions}
            />
          </View>
        )}

        {screen === 'result' && outfitCardData && (
          <View className="gap-4">
            <OutfitCard outfit={outfitCardData} />
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
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <PrimaryButton
                    label={createOutfit.isPending ? 'Kaydediliyor...' : 'Beğen'}
                    disabled={createOutfit.isPending}
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
