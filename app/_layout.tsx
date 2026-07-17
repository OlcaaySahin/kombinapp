import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { bootstrapSession } from '@/lib/auth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { syncReminderFromPreferences } from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { applyStoredThemePreference } from '@/lib/theme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    bootstrapSession().finally(() => setSessionReady(true));
    // Hatırlatıcı tercihini OS zamanlamasıyla senkronla (yeni build/yeniden kurulum sonrası
    // OS tarafı sıfırlanır) — fire-and-forget, açılışı asla bloklamaz.
    syncReminderFromPreferences();
    // Kayıtlı tema tercihi (Profil > Tema) varsa uygula — fire-and-forget.
    applyStoredThemePreference();
  }, []);

  useEffect(() => {
    if (loaded && sessionReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, sessionReady]);

  if (!loaded || !sessionReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-item" options={{ presentation: 'modal', title: 'Ürün Ekle' }} />
          <Stack.Screen name="add-wishlist-item" options={{ presentation: 'modal', title: 'İstek Listesine Ekle' }} />
          <Stack.Screen name="mark-worn" options={{ presentation: 'modal', title: 'Giydim' }} />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: 'Hesabını Oluştur' }} />
          <Stack.Screen name="profile-edit" options={{ presentation: 'modal', title: 'Bilgilerini Tamamla' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="yardim" options={{ presentation: 'modal', title: 'Yardım' }} />
          <Stack.Screen name="gardirop-analiz" options={{ presentation: 'modal', title: 'Gardırop Analizi' }} />
          <Stack.Screen name="kombin-paylas" options={{ presentation: 'modal', title: 'Kombinini Paylaş' }} />
          <Stack.Screen name="bildirimler" options={{ presentation: 'modal', title: 'Bildirimler' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
