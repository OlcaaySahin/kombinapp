import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/lib/stores/authStore';

type MenuItem = { icon: ComponentProps<typeof Ionicons>['name']; label: string };

const MENU_ITEMS: MenuItem[] = [
  { icon: 'person-outline', label: 'Hesap Bilgileri' },
  { icon: 'people-outline', label: 'Partner Eşleştirme' },
  { icon: 'star-outline', label: "Premium'a Yükselt" },
  { icon: 'notifications-outline', label: 'Bildirimler' },
  { icon: 'help-circle-outline', label: 'Yardım' },
];

export default function ProfilScreen() {
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const email = useAuthStore((state) => state.email);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="px-5 pb-6 pt-2">
        <Text className="font-heading-bold text-3xl text-gray-900 dark:text-white">Profil</Text>
      </View>

      {isAnonymous ? (
        <Pressable
          onPress={() => router.push('/sign-in')}
          className="mx-5 mb-6 flex-row items-center rounded-2xl bg-primary/10 p-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Ionicons name="person-add-outline" size={22} color="#FFFFFF" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="font-body-semibold text-base text-primary">Hesabını Oluştur</Text>
            <Text className="mt-0.5 font-body text-sm text-gray-600 dark:text-gray-300">
              Verilerini kaybetmemek için e-postanı bağla
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#3461FD" />
        </Pressable>
      ) : (
        <View className="mx-5 mb-6 flex-row items-center rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="font-body-semibold text-base text-gray-900 dark:text-white">{email}</Text>
            <Text className="font-body text-sm text-gray-500 dark:text-gray-400">
              Ücretsiz Plan · Günde 3 kombin hakkı
            </Text>
          </View>
        </View>
      )}

      <View className="mx-5 rounded-2xl bg-gray-50 dark:bg-gray-800">
        {MENU_ITEMS.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={item.label === 'Hesap Bilgileri' ? () => router.push('/profile-edit') : undefined}
            className={`flex-row items-center px-4 py-4 ${
              index !== MENU_ITEMS.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
            }`}>
            <Ionicons name={item.icon} size={20} color="#687076" />
            <Text className="ml-3 flex-1 font-body text-gray-900 dark:text-gray-100">{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9BA1A6" />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
