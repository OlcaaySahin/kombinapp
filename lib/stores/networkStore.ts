import { create } from 'zustand';

type NetworkState = {
  isOffline: boolean;
  setOffline: (value: boolean) => void;
};

/**
 * Proaktif bir bağlantı kontrolü (NetInfo vb.) yeni bir native modül gerektirir — bu da
 * (expo-notifications'ta olduğu gibi) yeni bir EAS build şart koşardı. Bunun yerine REAKTİF:
 * TanStack Query'nin global onError/onSuccess'i (bkz. lib/queryClient.ts) bir istek gerçek bir
 * ağ hatasıyla (fetch/TypeError) başarısız olduğunda burayı güncelliyor.
 */
export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  setOffline: (value) => set({ isOffline: value }),
}));
