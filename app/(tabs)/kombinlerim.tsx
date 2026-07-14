import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutfitCard } from '@/components/ui/OutfitCard';
import { pickRandomOutfit } from '@/lib/mockData';

const MOCK_HISTORY = [pickRandomOutfit(), pickRandomOutfit()];
const MOCK_LIKED = [pickRandomOutfit(), pickRandomOutfit(), pickRandomOutfit()];

type Tab = 'gecmis' | 'begenilen';

export default function KombinlerimScreen() {
  const [tab, setTab] = useState<Tab>('gecmis');
  const outfits = tab === 'gecmis' ? MOCK_HISTORY : MOCK_LIKED;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="px-5 pb-4 pt-2">
        <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Kombinlerim</Text>
      </View>

      <View className="mx-5 mb-4 flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
        <TabButton label="Geçmiş" active={tab === 'gecmis'} onPress={() => setTab('gecmis')} />
        <TabButton label="Beğenilenler" active={tab === 'begenilen'} onPress={() => setTab('begenilen')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}>
        {outfits.map((outfit) => (
          <OutfitCard key={outfit.id} outfit={outfit} />
        ))}
      </ScrollView>
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
