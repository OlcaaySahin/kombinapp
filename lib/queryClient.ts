import { MutationCache, QueryCache, QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { useNetworkStore } from '@/lib/stores/networkStore';

/** fetch/TypeError tabanlı gerçek bir ağ kopukluğunu, sunucu tarafı hatalardan (400/500 vb.
 * — bunlar Supabase'den JSON hata gövdesiyle döner, TypeError fırlatmaz) ayırt eder. */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error')
  );
}

function handleQueryResult(error: unknown) {
  useNetworkStore.getState().setOffline(isNetworkError(error));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => handleQueryResult(error),
    onSuccess: () => useNetworkStore.getState().setOffline(false),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleQueryResult(error),
    onSuccess: () => useNetworkStore.getState().setOffline(false),
  }),
});

/**
 * React Query'nin "pencere odağa gelince yenile" özelliği tarayıcı 'visibilitychange' olayına
 * dayanır ve React Native'de kendiliğinden hiç tetiklenmez — bu yüzden uygulama arka plandan
 * öne gelse bile stale sorgular sessizce eskimiş kalıyordu (pull-to-refresh eklenene kadar
 * kullanıcının tek çaresi ekranı terk edip geri dönmekti, o da her zaman yeterli olmuyordu).
 * AppState'i focusManager'a bağlamak bunu düzeltiyor — yeni bağımlılık gerekmiyor, react-query
 * ve react-native'in kendi resmi entegrasyon deseni.
 */
export function installQueryFocusManager() {
  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  });
  return () => subscription.remove();
}
