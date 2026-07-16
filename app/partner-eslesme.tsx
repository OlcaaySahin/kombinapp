import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert, showConfirm } from '@/lib/alert';
import {
  usePartnership,
  useRespondPartnerRequest,
  useSendPartnerRequest,
  useUnmatchPartner,
} from '@/lib/hooks/usePartnership';

export default function PartnerEslesmeScreen() {
  const { data: partnership, isLoading } = usePartnership();
  const sendRequest = useSendPartnerRequest();
  const respondRequest = useRespondPartnerRequest();
  const unmatch = useUnmatchPartner();
  const [email, setEmail] = useState('');

  async function handleSend() {
    if (!email.trim()) return;
    try {
      const result = await sendRequest.mutateAsync(email.trim());
      showAlert('İstek gönderildi', result.message ?? 'Partnerine bir eşleşme isteği gönderildi.');
      setEmail('');
    } catch (error) {
      showAlert('İstek gönderilemedi', error instanceof Error ? error.message : String(error));
    }
  }

  function handleUnmatch(id: string, isPending: boolean) {
    showConfirm(
      isPending ? 'İsteği iptal et' : 'Eşleşmeyi sonlandır',
      isPending
        ? 'Gönderdiğin eşleşme isteğini iptal etmek istediğine emin misin?'
        : 'Partnerinle eşleşmeni sonlandırmak istediğine emin misin? Birbirinizin envanterini artık göremeyeceksiniz.',
      () => unmatch.mutate(id),
      isPending ? 'İptal Et' : 'Sonlandır'
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#3461FD" />
        </Pressable>
        <Text className="font-heading-bold text-2xl text-gray-900 dark:text-white">Partner Eşleştirme</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        {isLoading ? (
          <ActivityIndicator color="#3461FD" />
        ) : partnership?.status === 'accepted' ? (
          <View className="items-center gap-4 rounded-3xl bg-primary/5 p-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="heart" size={28} color="#3461FD" />
            </View>
            <View className="items-center">
              <Text className="font-heading text-lg text-gray-900 dark:text-white">
                {partnership.partnerName ?? 'Partnerin'} ile eşleştin
              </Text>
              <Text className="mt-1 text-center font-body text-sm text-gray-500 dark:text-gray-400">
                Artık birbirinizin envanterini görebilir, birbirinize uyumlu kombinler önerebilirsiniz.
              </Text>
            </View>
            <Pressable onPress={() => handleUnmatch(partnership.id, false)}>
              <Text className="font-body-medium text-sm text-red-500">Eşleşmeyi Sonlandır</Text>
            </Pressable>
          </View>
        ) : partnership?.status === 'pending_incoming' ? (
          <View className="items-center gap-4 rounded-3xl bg-primary/5 p-6">
            <Ionicons name="person-add" size={28} color="#3461FD" />
            <Text className="text-center font-heading text-lg text-gray-900 dark:text-white">
              {partnership.partnerName ?? 'Bir kullanıcı'} seninle partner olmak istiyor
            </Text>
            <View className="w-full flex-row gap-3">
              <View className="flex-1">
                <PrimaryButton
                  label="Onayla"
                  disabled={respondRequest.isPending}
                  onPress={() => respondRequest.mutate({ id: partnership.id, accept: true })}
                />
              </View>
              <View className="flex-1">
                <PrimaryButton
                  label="Reddet"
                  variant="secondary"
                  disabled={respondRequest.isPending}
                  onPress={() => respondRequest.mutate({ id: partnership.id, accept: false })}
                />
              </View>
            </View>
          </View>
        ) : partnership?.status === 'pending_outgoing' ? (
          <View className="items-center gap-4 rounded-3xl bg-primary/5 p-6">
            <ActivityIndicator color="#3461FD" />
            <Text className="text-center font-heading text-lg text-gray-900 dark:text-white">
              {partnership.partnerName ?? 'Partnerine'} istek gönderildi
            </Text>
            <Text className="text-center font-body text-sm text-gray-500 dark:text-gray-400">
              Onayladığında burada eşleştiğinizi göreceksin.
            </Text>
            <Pressable onPress={() => handleUnmatch(partnership.id, true)}>
              <Text className="font-body-medium text-sm text-red-500">İsteği İptal Et</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="mb-2 font-body text-sm text-gray-500 dark:text-gray-400">
              Partnerinin uygulamaya kayıtlı e-posta adresini gir. Onayladığında birbirinizin envanterini görebilir,
              birbirinize uyumlu kombinler önerebilirsiniz.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="partner@mail.com"
              placeholderTextColor="#9BA1A6"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="mb-6 mt-4 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
            <PrimaryButton
              label={sendRequest.isPending ? 'Gönderiliyor...' : 'İstek Gönder'}
              disabled={sendRequest.isPending || !email.trim()}
              onPress={handleSend}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
