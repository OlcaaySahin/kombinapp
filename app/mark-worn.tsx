import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { useMarkWorn } from '@/lib/hooks/useOutfits';
import { captureException } from '@/lib/sentry';
import { uploadPhoto } from '@/lib/storage';
import { useAuthStore } from '@/lib/stores/authStore';

export default function MarkWornScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
  const userId = useAuthStore((state) => state.userId);
  const markWorn = useMarkWorn();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('İzin gerekli', 'Fotoğraf seçebilmek için galeri izni vermelisin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUri(result.assets[0].uri);
    setPhotoMimeType(result.assets[0].mimeType);
  }

  async function handleSave() {
    if (!outfitId || !userId) return;
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        photoUrl = await uploadPhoto('outfit-wear-photos', userId, photoUri, photoMimeType);
      }
      await markWorn.mutateAsync({ outfitId, photoUrl, note: note.trim() || undefined });
      router.back();
    } catch (error) {
      console.error('Giydim işaretlenemedi:', error);
      captureException(error);
      showAlert('Bir şeyler ters gitti', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-2 font-heading-bold text-2xl text-gray-900 dark:text-white">Giydim!</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          İstersen bu kombini giyerken çektiğin bir fotoğrafı ekle, kombin albümünde saklansın.
        </Text>

        <Pressable
          onPress={pickPhoto}
          className="mb-6 aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          {photoUri ? (
            <Image source={{ uri: photoUri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Ionicons name="image-outline" size={32} color="#9BA1A6" />
              <Text className="mt-2 font-body text-sm text-gray-500 dark:text-gray-400">
                Fotoğraf ekle (opsiyonel)
              </Text>
            </View>
          )}
        </Pressable>

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Not (opsiyonel)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Örn. Arkadaşlarla kahve buluşmasında giydim"
          placeholderTextColor="#9BA1A6"
          multiline
          className="mb-8 min-h-[80px] rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />

        <PrimaryButton label={saving ? 'Kaydediliyor...' : 'Kaydet'} disabled={saving} onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}
