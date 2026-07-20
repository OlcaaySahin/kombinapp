import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/ui/CategoryChip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { suggestTagsForPhoto } from '@/lib/aiTagging';
import { showAlert } from '@/lib/alert';
import { CATEGORIES, type CategorySlot } from '@/constants/categories';
import { COLOR_SWATCHES } from '@/constants/colorSwatches';
import {
  useAddWishlistItem,
  useUpdateWishlistItem,
  useWishlistItems,
  type DbWishlistItem,
} from '@/lib/hooks/useWishlist';
import { fetchProductFromLink } from '@/lib/productLink';
import { captureException } from '@/lib/sentry';
import { uploadPhoto } from '@/lib/storage';
import { useAuthStore } from '@/lib/stores/authStore';

export default function AddWishlistItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const isEditing = Boolean(itemId);

  const userId = useAuthStore((state) => state.userId);
  const { data: items } = useWishlistItems();
  const addItem = useAddWishlistItem();
  const updateItem = useUpdateWishlistItem();

  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | undefined>(undefined);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<CategorySlot | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchingLink, setFetchingLink] = useState(false);

  useEffect(() => {
    if (!isEditing || hasPrefilled || !items) return;
    const list: DbWishlistItem[] = items;
    const existing = list.find((item: DbWishlistItem) => item.id === itemId);
    if (existing) {
      setName(existing.name ?? '');
      setSlot(existing.slot);
      setColor(existing.color);
      setProductUrl(existing.product_url ?? '');
      setPrice(existing.price ? String(existing.price) : '');
      if (existing.image_url) setPhotoUri(existing.image_url);
      setHasPrefilled(true);
    }
  }, [isEditing, hasPrefilled, items, itemId]);

  const canSave = Boolean(name.trim() && slot && color && userId && !saving);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('İzin gerekli', 'Fotoğraf seçebilmek için galeri izni vermelisin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoMimeType(asset.mimeType);
    setPhotoChanged(true);

    setTagging(true);
    try {
      const suggestion = await suggestTagsForPhoto(asset.uri);
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

  async function handleFetchLink() {
    if (!productUrl.trim() || fetchingLink) return;
    setFetchingLink(true);
    try {
      const result = await fetchProductFromLink(productUrl.trim());
      if (!result.ok) {
        if (result.reason === 'not_clothing') {
          showAlert('Bu bir giyim ürünü değil', 'Bu link bir giyim/aksesuar ürünü gibi görünmüyor, elle doldurabilirsin.');
        } else {
          showAlert('Linkten veri çekilemedi', result.reason === 'error' ? result.message : 'Bilinmeyen hata');
        }
        return;
      }

      const { data } = result;
      if (data.name) setName(data.name);
      if (data.color) setColor(data.color);
      if (data.slot) {
        const matchedSlot = CATEGORIES.find((category) => category.slot === data.slot);
        if (matchedSlot) setSlot(matchedSlot.slot);
      }
      if (data.price != null) setPrice(String(data.price));
      setPhotoUri(data.imageUrl);
      setPhotoChanged(true);
    } finally {
      setFetchingLink(false);
    }
  }

  async function handleSave() {
    if (!canSave || !userId || !slot || !color) return;
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (photoUri && (photoChanged || !isEditing)) {
        imageUrl = await uploadPhoto('item-photos', userId, photoUri, photoMimeType);
      }

      const priceValue = price.trim() ? Number(price) : undefined;
      const productUrlValue = productUrl.trim() || undefined;

      if (isEditing && itemId) {
        await updateItem.mutateAsync({
          id: itemId,
          slot,
          name: name.trim(),
          color,
          productUrl: productUrlValue,
          price: priceValue,
          imageUrl,
        });
      } else {
        await addItem.mutateAsync({
          userId,
          slot,
          name: name.trim(),
          color,
          productUrl: productUrlValue,
          price: priceValue,
          imageUrl,
        });
      }
      router.back();
    } catch (error) {
      console.error('İstek listesi ürünü kaydedilemedi:', error);
      captureException(error);
      showAlert('Bir şeyler ters gitti', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  const missingFields = [!name.trim() && 'ürün adı', !slot && 'kategori', !color && 'renk'].filter(
    (field): field is string => Boolean(field)
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-6 font-heading-bold text-2xl text-gray-900 dark:text-white">
          {isEditing ? 'İstek Ürününü Düzenle' : 'İstek Listesine Ekle'}
        </Text>

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
          placeholder="Örn. Bej Trençkot"
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
        <View className="mb-6 flex-row flex-wrap gap-3">
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

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
          Ürün linki (opsiyonel)
        </Text>
        <TextInput
          value={productUrl}
          onChangeText={setProductUrl}
          placeholder="https://..."
          placeholderTextColor="#9BA1A6"
          autoCapitalize="none"
          keyboardType="url"
          className="mb-3 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />
        <Pressable
          onPress={handleFetchLink}
          disabled={!productUrl.trim() || fetchingLink}
          className={`mb-6 flex-row items-center justify-center gap-2 rounded-2xl border py-3 ${
            !productUrl.trim() || fetchingLink ? 'border-gray-200 dark:border-gray-800' : 'border-primary'
          }`}>
          {fetchingLink ? (
            <ActivityIndicator color="#3461FD" />
          ) : (
            <Ionicons name="download-outline" size={18} color={!productUrl.trim() ? '#9BA1A6' : '#3461FD'} />
          )}
          <Text
            className={`font-heading text-sm ${
              !productUrl.trim() || fetchingLink ? 'text-gray-400' : 'text-primary'
            }`}>
            {fetchingLink ? 'Linkten çekiliyor...' : 'Linkten Doldur'}
          </Text>
        </Pressable>

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
          Fiyat (opsiyonel)
        </Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="Örn. 899"
          placeholderTextColor="#9BA1A6"
          keyboardType="decimal-pad"
          className="mb-8 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />

        <PrimaryButton
          label={saving ? (isEditing ? 'Güncelleniyor...' : 'Kaydediliyor...') : isEditing ? 'Güncelle' : 'Listeye Ekle'}
          disabled={!canSave}
          onPress={handleSave}
        />
        {!canSave && !saving && missingFields.length > 0 && (
          <Text className="mt-2 text-center font-body text-xs text-gray-500 dark:text-gray-400">
            Eksik: {missingFields.join(', ')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
