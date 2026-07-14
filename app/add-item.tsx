import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/ui/CategoryChip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { suggestTagsForPhoto } from '@/lib/aiTagging';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import { COLOR_SWATCHES } from '@/constants/colorSwatches';
import { useAddItem } from '@/lib/hooks/useItems';
import { uploadPhoto } from '@/lib/storage';
import { useAuthStore } from '@/lib/stores/authStore';

export default function AddItemScreen() {
  const userId = useAuthStore((state) => state.userId);
  const addItem = useAddItem();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [tagging, setTagging] = useState(false);
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<CategorySlot | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = Boolean(name.trim() && slot && color && userId && !saving);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf seçebilmek için galeri izni vermelisin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setPhotoUri(uri);

    // AI otomatik etiketleme — Edge Function deploy edilmediyse sessizce atlanır, form manuel kalır.
    setTagging(true);
    try {
      const suggestion = await suggestTagsForPhoto(uri);
      if (suggestion) {
        setName(suggestion.name);
        setColor(suggestion.color);
        const matchedSlot = CATEGORIES.find((category) => category.slot === suggestion.slot);
        if (matchedSlot) setSlot(matchedSlot.slot);
      }
    } finally {
      setTagging(false);
    }
  }

  async function handleSave() {
    if (!canSave || !userId || !slot || !color) return;
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (photoUri) {
        imageUrl = await uploadPhoto('item-photos', userId, photoUri);
      }
      await addItem.mutateAsync({ userId, slot, name: name.trim(), color, imageUrl });
      router.back();
    } catch (error) {
      Alert.alert('Bir şeyler ters gitti', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-6 font-heading-bold text-2xl text-gray-900 dark:text-white">Ürün Ekle</Text>

        <Pressable
          onPress={pickPhoto}
          className="mb-6 aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          {photoUri ? (
            <Image source={{ uri: photoUri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Ionicons name="camera-outline" size={32} color="#9BA1A6" />
              <Text className="mt-2 font-body text-sm text-gray-500 dark:text-gray-400">
                Fotoğraf ekle (opsiyonel)
              </Text>
            </View>
          )}
          {tagging && (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <ActivityIndicator color="#FFFFFF" />
              <Text className="mt-2 font-body-medium text-sm text-white">AI etiketliyor...</Text>
            </View>
          )}
        </Pressable>

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
          label={saving ? 'Kaydediliyor...' : 'Envantere Ekle'}
          disabled={!canSave}
          onPress={handleSave}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
