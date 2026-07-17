import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionChipRow } from '@/components/ui/OptionChipRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { useProfile, useUpdateProfile } from '@/lib/hooks/useProfile';
import { uploadPhoto } from '@/lib/storage';
import { useAuthStore } from '@/lib/stores/authStore';

const GENDER_OPTIONS = ['Kadın', 'Erkek', 'Belirtmek istemiyorum'];
const DAILY_STYLE_OPTIONS = ['Rahat', 'Şık', 'Spor', 'Karışık'];

export default function ProfileEditScreen() {
  const userId = useAuthStore((state) => state.userId);
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile();

  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [dailyStyle, setDailyStyle] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarMimeType, setAvatarMimeType] = useState<string | undefined>(undefined);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hasPrefilled || !profile) return;
    setDisplayName(profile.display_name ?? '');
    setGender(profile.gender);
    setDailyStyle(profile.daily_style);
    setAge(profile.age ? String(profile.age) : '');
    setHeightCm(profile.height_cm ? String(profile.height_cm) : '');
    setWeightKg(profile.weight_kg ? String(profile.weight_kg) : '');
    setAvatarUri(profile.avatar_url);
    setHasPrefilled(true);
  }, [hasPrefilled, profile]);

  async function pickAvatar() {
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
    setAvatarUri(result.assets[0].uri);
    setAvatarMimeType(result.assets[0].mimeType);
    setAvatarChanged(true);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      // Foto sadece yeni seçildiyse yüklenir; avatarUrl undefined kalırsa alan hiç dokunulmaz.
      let avatarUrl: string | undefined;
      if (avatarChanged && avatarUri) {
        avatarUrl = await uploadPhoto('avatars', userId, avatarUri, avatarMimeType);
      }

      await updateProfile.mutateAsync({
        userId,
        displayName: displayName.trim() || null,
        gender,
        dailyStyle,
        age: age.trim() ? Number(age) : null,
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
        avatarUrl,
      });
      router.back();
    } catch (error) {
      console.error('Profil kaydedilemedi:', error);
      showAlert('Bir şeyler ters gitti', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-1 font-heading-bold text-2xl text-gray-900 dark:text-white">Bilgilerini Tamamla</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Bu bilgiler kombin önerilerini sana göre uyarlamamıza yardımcı olur. Hepsi opsiyonel.
        </Text>

        <View className="mb-6 items-center">
          <Pressable
            onPress={pickAvatar}
            className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Ionicons name="camera-outline" size={28} color="#9BA1A6" />
            )}
          </Pressable>
          <Text className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
            {avatarUri ? 'Profil resmini değiştirmek için dokun' : 'Profil resmi ekle (opsiyonel)'}
          </Text>
        </View>

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Adın</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Örn. Buse"
          placeholderTextColor="#9BA1A6"
          autoCapitalize="words"
          className="mb-6 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />

        <OptionChipRow label="Cinsiyet" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        <OptionChipRow
          label="Günlük giyim tarzın"
          options={DAILY_STYLE_OPTIONS}
          value={dailyStyle}
          onChange={setDailyStyle}
        />

        <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Yaş</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          placeholder="Örn. 28"
          placeholderTextColor="#9BA1A6"
          keyboardType="number-pad"
          className="mb-6 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />

        <View className="mb-6 flex-row gap-4">
          <View className="flex-1">
            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Boy (cm)</Text>
            <TextInput
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="Örn. 170"
              placeholderTextColor="#9BA1A6"
              keyboardType="number-pad"
              className="rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Kilo (kg)</Text>
            <TextInput
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="Örn. 65"
              placeholderTextColor="#9BA1A6"
              keyboardType="number-pad"
              className="rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          </View>
        </View>

        <PrimaryButton label={saving ? 'Kaydediliyor...' : 'Kaydet'} disabled={saving || !userId} onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}
