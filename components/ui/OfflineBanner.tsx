import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNetworkStore } from '@/lib/stores/networkStore';

/** İnternet bağlantısı koptuğunda (bkz. lib/queryClient.ts) ekranın en üstünde sabit bir uyarı. */
export function OfflineBanner() {
  const isOffline = useNetworkStore((state) => state.isOffline);
  if (!isOffline) return null;

  return (
    <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 z-50" pointerEvents="none">
      <View className="mx-4 mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-gray-900/95 px-4 py-2.5 dark:bg-black/95">
        <Ionicons name="cloud-offline-outline" size={15} color="#FFFFFF" />
        <Text className="font-body-medium text-xs text-white">İnternet bağlantısı yok gibi görünüyor</Text>
      </View>
    </SafeAreaView>
  );
}
