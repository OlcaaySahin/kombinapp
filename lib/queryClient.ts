import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

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
