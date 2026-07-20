import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert, showConfirm } from '@/lib/alert';
import { deleteAccount, signOut } from '@/lib/auth';
import { usePartnership } from '@/lib/hooks/usePartnership';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAuthStore } from '@/lib/stores/authStore';
import { getThemePreference, setThemePreference, type ThemePreference } from '@/lib/theme';

type MenuItem = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  route?:
    | '/profile-edit'
    | '/yardim'
    | '/bildirimler'
    | '/partner-eslesme'
    | '/arsivlerim'
    | '/ana-sayfa-tasarimi'
    | '/gizlilik-politikasi';
  comingSoonMessage?: string;
};

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'system', label: 'Sistem', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Açık', icon: 'sunny-outline' },
  { value: 'dark', label: 'Koyu', icon: 'moon-outline' },
];

const MENU_ITEMS: MenuItem[] = [
  { icon: 'person-outline', label: 'Hesap Bilgileri', route: '/profile-edit' },
  { icon: 'people-outline', label: 'Partner Eşleştirme', route: '/partner-eslesme' },
  {
    icon: 'star-outline',
    label: "Premium'a Yükselt",
    comingSoonMessage: 'Premium üyelik yakında burada olacak.',
  },
  { icon: 'grid-outline', label: 'Ana Sayfa Tasarımı', route: '/ana-sayfa-tasarimi' },
  { icon: 'archive-outline', label: 'Arşivlerim', route: '/arsivlerim' },
  { icon: 'notifications-outline', label: 'Bildirimler', route: '/bildirimler' },
  { icon: 'help-circle-outline', label: 'Yardım', route: '/yardim' },
  { icon: 'shield-checkmark-outline', label: 'Gizlilik Politikası', route: '/gizlilik-politikasi' },
];

export default function ProfilScreen() {
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const email = useAuthStore((state) => state.email);
  const userId = useAuthStore((state) => state.userId);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { data: partnership } = usePartnership();
  const { data: profile } = useProfile(userId);
  const hasPendingPartnerRequest = partnership?.status === 'pending_incoming';
  // İsim kaydedilmişse başlıkta isim, altta e-posta; isim yoksa eskisi gibi e-posta başlıkta.
  const displayName = profile?.display_name?.trim() || null;
  const [themePref, setThemePref] = useState<ThemePreference>('system');

  useEffect(() => {
    getThemePreference().then(setThemePref);
  }, []);

  function handleThemeSelect(value: ThemePreference) {
    setThemePref(value);
    setThemePreference(value);
  }

  function handleSignOutPress() {
    showConfirm(
      'Çıkış yap',
      'Hesabından çıkış yapılacak. Verilerin kaybolmaz, tekrar bu hesaba veya başka bir hesaba giriş yapabilirsin.',
      async () => {
        setSigningOut(true);
        try {
          await signOut();
        } catch (error) {
          console.error('Çıkış yapılamadı:', error);
          showAlert('Çıkış yapılamadı', error instanceof Error ? error.message : String(error));
        } finally {
          setSigningOut(false);
        }
      },
      'Çıkış Yap'
    );
  }

  /** Google Play zorunluluğu (2023): hesap silme uygulama içinden erişilebilir olmalı. */
  function handleDeleteAccountPress() {
    showConfirm(
      'Hesabını Sil',
      'Bu işlem GERİ ALINAMAZ: envanterin, kombinlerin, istek listen, bavulların ve partnerlik bağın kalıcı olarak silinir. Devam etmek istediğine emin misin?',
      () => {
        showConfirm(
          'Son Onay',
          'Hesabını ve tüm verini kalıcı olarak silmek üzeresin. Bu son bir kez daha soruyoruz çünkü geri dönüşü yok.',
          async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
              showAlert('Hesabın silindi', 'Tüm verilerin kalıcı olarak silindi.');
            } catch (error) {
              console.error('Hesap silinemedi:', error);
              showAlert('Hesap silinemedi', error instanceof Error ? error.message : String(error));
            } finally {
              setDeletingAccount(false);
            }
          },
          'Kalıcı Olarak Sil'
        );
      },
      'Devam Et'
    );
  }

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
          <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary">
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            )}
          </View>
          <View className="ml-4 flex-1">
            <Text className="font-body-semibold text-base text-gray-900 dark:text-white">
              {displayName ?? email}
            </Text>
            <Text className="font-body text-sm text-gray-500 dark:text-gray-400">
              {displayName ? email : 'Ücretsiz Plan'}
            </Text>
          </View>
        </View>
      )}

      <View className="mx-5 rounded-2xl bg-gray-50 dark:bg-gray-800">
        {MENU_ITEMS.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() =>
              item.route
                ? router.push(item.route)
                : showAlert('Yakında', item.comingSoonMessage ?? 'Bu özellik yakında eklenecek.')
            }
            className={`flex-row items-center px-4 py-4 ${
              index !== MENU_ITEMS.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
            }`}>
            <Ionicons name={item.icon} size={20} color="#687076" />
            <Text className="ml-3 flex-1 font-body text-gray-900 dark:text-gray-100">{item.label}</Text>
            {item.route === '/partner-eslesme' && hasPendingPartnerRequest && (
              <View className="mr-2 h-2.5 w-2.5 rounded-full bg-accent-coral" />
            )}
            <Ionicons name="chevron-forward" size={18} color="#9BA1A6" />
          </Pressable>
        ))}
      </View>

      <View className="mx-5 mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
        <Text className="mb-3 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Tema</Text>
        <View className="flex-row gap-2">
          {THEME_OPTIONS.map((option) => {
            const selected = themePref === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleThemeSelect(option.value)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border py-2.5 ${
                  selected
                    ? 'border-primary bg-primary'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                }`}>
                <Ionicons name={option.icon} size={15} color={selected ? '#FFFFFF' : '#687076'} />
                <Text
                  className={`font-body-medium text-sm ${
                    selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!isAnonymous && (
        <>
          <Pressable
            onPress={handleSignOutPress}
            disabled={signingOut}
            className="mx-5 mt-4 flex-row items-center justify-center gap-2 rounded-2xl py-4">
            <Ionicons name="log-out-outline" size={18} color="#E5484D" />
            <Text className="font-body-semibold text-sm text-red-500">
              {signingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap / Hesap Değiştir'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAccountPress}
            disabled={deletingAccount}
            className="mx-5 flex-row items-center justify-center gap-2 rounded-2xl py-2">
            <Ionicons name="trash-outline" size={15} color="#9BA1A6" />
            <Text className="font-body text-xs text-gray-400 dark:text-gray-500">
              {deletingAccount ? 'Hesap siliniyor...' : 'Hesabımı Sil'}
            </Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}
