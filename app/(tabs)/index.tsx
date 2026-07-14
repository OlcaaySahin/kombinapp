import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionChipRow } from '@/components/ui/OptionChipRow';
import { OutfitCard } from '@/components/ui/OutfitCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { pickRandomOutfit, type GeneratedOutfit } from '@/lib/mockData';

const MEVSIM = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
const MEKAN = ['Şehir içi', 'Ofis', 'Deniz/Tatil', 'Ev'];
const SAAT = ['Sabah', 'Öğlen', 'Akşam', 'Gece'];
const KONSEPT = ['Günlük', 'Şık', 'Spor', 'Özel Gün'];

const DAILY_LIMIT = 3;

type Screen = 'idle' | 'questions' | 'result';

export default function AnaSayfaScreen() {
  const [screen, setScreen] = useState<Screen>('idle');
  const [mevsim, setMevsim] = useState<string | null>(null);
  const [mekan, setMekan] = useState<string | null>(null);
  const [saat, setSaat] = useState<string | null>(null);
  const [konsept, setKonsept] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<GeneratedOutfit | null>(null);
  const [dailyCount, setDailyCount] = useState(0);

  const allAnswered = Boolean(mevsim && mekan && saat && konsept);
  const limitReached = dailyCount >= DAILY_LIMIT;

  function generateFromQuestions() {
    if (!allAnswered || limitReached) return;
    const result = pickRandomOutfit({ mevsim: mevsim!, mekan: mekan!, saat: saat!, konsept: konsept! });
    setOutfit(result);
    setDailyCount((count) => count + 1);
    setScreen('result');
  }

  function rollDice() {
    if (limitReached) return;
    setOutfit(pickRandomOutfit());
    setDailyCount((count) => count + 1);
    setScreen('result');
  }

  function reset() {
    setScreen('idle');
    setMevsim(null);
    setMekan(null);
    setSaat(null);
    setKonsept(null);
    setOutfit(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <View className="pb-6 pt-2">
          <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Bugün ne giysem?</Text>
          <Text className="mt-1 font-body text-gray-500 dark:text-gray-400">
            Günlük {dailyCount}/{DAILY_LIMIT} kombin hakkı kullanıldı
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
              onPress={rollDice}
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
            <PrimaryButton label="Kombini Oluştur" disabled={!allAnswered} onPress={generateFromQuestions} />
          </View>
        )}

        {screen === 'result' && outfit && (
          <View className="gap-4">
            <OutfitCard outfit={outfit} />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <PrimaryButton label="Beğen" onPress={reset} />
              </View>
              <View className="flex-1">
                <PrimaryButton label="Tekrar Dene" variant="secondary" disabled={limitReached} onPress={rollDice} />
              </View>
            </View>
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
