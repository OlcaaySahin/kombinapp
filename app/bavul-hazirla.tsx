import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionChipRow } from '@/components/ui/OptionChipRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { useItems, type DbItem } from '@/lib/hooks/useItems';
import { requestPackingList, type PackingPlan } from '@/lib/packing';

const GUN_SAYISI = ['2', '3', '4', '5', '7'];
const MEVSIM = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
const HAVA = ['Güneşli', 'Yağmurlu', 'Rüzgarlı', 'Karlı'];
const KONSEPT = ['Günlük', 'Şık', 'Spor', 'Karışık'];

export default function BavulHazirlaScreen() {
  const { data: items } = useItems();

  const [gun, setGun] = useState<string | null>(null);
  const [mevsim, setMevsim] = useState<string | null>(null);
  const [hava, setHava] = useState<string | null>(null);
  const [konsept, setKonsept] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<PackingPlan | null>(null);

  // Hava bilerek OPSİYONEL: seyahat ileri tarihli olabilir, kullanıcı havayı bilmeyebilir.
  const canGenerate = Boolean(gun && mevsim && konsept && !generating);

  async function handleGenerate() {
    if (!gun || !mevsim || !konsept) return;
    if ((items?.length ?? 0) < 3) {
      showAlert('Envanter yetersiz', 'Bavul hazırlamak için envanterinde en az birkaç ürün olmalı.');
      return;
    }
    setGenerating(true);
    setPlan(null);
    try {
      const result = await requestPackingList(
        { days: Number(gun), mevsim, hava: hava ?? undefined, konsept, note: note.trim() || undefined },
        items ?? []
      );
      setPlan(result);
    } catch (error) {
      console.error('Bavul planı alınamadı:', error);
      showAlert('Bavul hazırlanamadı', error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-1 font-heading-bold text-2xl text-gray-900 dark:text-white">Bavul Hazırla</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Seyahatin için minimum parçayla maksimum kombin: yapay zeka envanterinden kapsül bir bavul kurar,
          gün gün ne giyeceğini planlar.
        </Text>

        <OptionChipRow label="Kaç gün?" options={GUN_SAYISI} value={gun} onChange={setGun} />
        <OptionChipRow label="Mevsim" options={MEVSIM} value={mevsim} onChange={setMevsim} />
        <OptionChipRow label="Beklenen hava (opsiyonel)" options={HAVA} value={hava} onChange={setHava} />
        <OptionChipRow label="Konsept" options={KONSEPT} value={konsept} onChange={setKonsept} />

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
          Ek not (opsiyonel)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder='Örn. "iş gezisi, akşam yemeği de var"'
          placeholderTextColor="#9BA1A6"
          multiline
          maxLength={200}
          className="mb-6 min-h-[64px] rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />

        <PrimaryButton
          label={generating ? 'Bavul hazırlanıyor...' : 'Bavulu Hazırla'}
          disabled={!canGenerate}
          onPress={handleGenerate}
        />

        {generating && (
          <View className="mt-6 items-center">
            <ActivityIndicator color="#3461FD" />
            <Text className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
              Kapsül gardırobun kuruluyor — birkaç saniye sürebilir.
            </Text>
          </View>
        )}

        {plan && !generating && (
          <View className="mt-8">
            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name="briefcase-outline" size={16} color="#3461FD" />
              <Text className="font-heading text-base text-gray-900 dark:text-white">
                Bavulun ({plan.suitcaseItems.length} parça)
              </Text>
            </View>
            <View className="mb-2 flex-row flex-wrap gap-3">
              {plan.suitcaseItems.map((item: DbItem) => (
                <View key={item.id} className="w-[22%]">
                  <View className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Ionicons name="shirt-outline" size={20} color="#9BA1A6" />
                      </View>
                    )}
                  </View>
                  <Text
                    numberOfLines={2}
                    className="mt-1 text-center font-body text-[10px] text-gray-600 dark:text-gray-400">
                    {item.name ?? 'Ürün'}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mb-6 flex-row items-start gap-2 rounded-2xl bg-primary/5 p-3">
              <Ionicons name="bulb-outline" size={16} color="#3461FD" style={{ marginTop: 1 }} />
              <Text className="flex-1 font-body text-xs leading-5 text-gray-700 dark:text-gray-300">
                {plan.reasoning}
              </Text>
            </View>

            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color="#3461FD" />
              <Text className="font-heading text-base text-gray-900 dark:text-white">Gün Gün Plan</Text>
            </View>
            <View className="gap-3">
              {plan.outfits.map((outfit) => (
                <View key={outfit.day} className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
                  <Text className="mb-2 font-body-semibold text-sm text-primary">{outfit.day}. Gün</Text>
                  <View className="mb-2 flex-row">
                    {outfit.items.slice(0, 5).map((item: DbItem) => (
                      <View
                        key={item.id}
                        className="-mr-2 h-12 w-12 overflow-hidden rounded-lg border border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700">
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Ionicons name="shirt-outline" size={16} color="#9BA1A6" />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                  <Text className="font-body text-xs text-gray-700 dark:text-gray-300">
                    {outfit.items.map((item: DbItem) => item.name).filter(Boolean).join(' · ')}
                  </Text>
                  {outfit.note ? (
                    <Text className="mt-1 font-body text-[11px] italic text-gray-500 dark:text-gray-400">
                      {outfit.note}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleGenerate}
              className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-primary py-3">
              <Ionicons name="refresh-outline" size={16} color="#3461FD" />
              <Text className="font-heading text-sm text-primary">Yeniden Hazırla</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
