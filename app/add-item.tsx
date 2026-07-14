import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/ui/CategoryChip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { COLOR_SWATCHES } from '@/constants/colorSwatches';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import { useAddItem } from '@/lib/hooks/useItems';
import { useAuthStore } from '@/lib/stores/authStore';

export default function AddItemScreen() {
  const userId = useAuthStore((state) => state.userId);
  const addItem = useAddItem();

  const [name, setName] = useState('');
  const [slot, setSlot] = useState<CategorySlot | null>(null);
  const [color, setColor] = useState<string | null>(null);

  const canSave = Boolean(name.trim() && slot && color && userId);

  async function handleSave() {
    if (!canSave || !userId || !slot || !color) return;
    try {
      await addItem.mutateAsync({ userId, slot, name: name.trim(), color });
      router.back();
    } catch (error) {
      Alert.alert('Bir şeyler ters gitti', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-6 font-heading-bold text-2xl text-gray-900 dark:text-white">Ürün Ekle</Text>

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Ürün Adı</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Örn. Mavi Kot Ceket"
          placeholderTextColor="#9BA1A6"
          className="mb-6 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Kategori</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          className="mb-6 -mx-1">
          {CATEGORIES.map((category) => (
            <CategoryChip
              key={category.slot}
              icon={category.icon}
              label={category.label}
              selected={slot === category.slot}
              onPress={() => setSlot(category.slot)}
            />
          ))}
        </ScrollView>

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Renk</Text>
        <View className="mb-8 flex-row flex-wrap gap-3">
          {COLOR_SWATCHES.map((swatch) => (
            <Pressable
              key={swatch.hex}
              onPress={() => setColor(swatch.hex)}
              className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
                color === swatch.hex ? 'border-primary' : 'border-transparent'
              }`}>
              <View
                className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: swatch.hex }}
              />
            </Pressable>
          ))}
        </View>

        <PrimaryButton
          label={addItem.isPending ? 'Kaydediliyor...' : 'Envantere Ekle'}
          disabled={!canSave || addItem.isPending}
          onPress={handleSave}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
