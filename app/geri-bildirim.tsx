import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { useSendFeedback } from '@/lib/hooks/useFeedback';
import { useAuthStore } from '@/lib/stores/authStore';

export default function GeriBildirimScreen() {
  const userId = useAuthStore((state) => state.userId);
  const sendFeedback = useSendFeedback();
  const [message, setMessage] = useState('');

  async function handleSend() {
    if (!userId || !message.trim()) return;
    try {
      await sendFeedback.mutateAsync({ userId, message: message.trim() });
      showAlert('Teşekkürler!', 'Geri bildirimin bize ulaştı.');
      router.back();
    } catch (error) {
      showAlert('Gönderilemedi', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Ionicons name="chatbox-ellipses-outline" size={26} color="#3461FD" />
        </View>
        <Text className="mb-2 font-heading-bold text-2xl text-gray-900 dark:text-white">Geri Bildirim Gönder</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Bir hata mı buldun, eksik bir şey mi gördün, ya da bir öneriniz mi var? Bize doğrudan yazabilirsin.
        </Text>

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ne düşünüyorsun?"
          placeholderTextColor="#9BA1A6"
          multiline
          maxLength={1000}
          className="mb-2 min-h-[160px] rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
          textAlignVertical="top"
        />
        <Text className="mb-6 text-right font-body text-xs text-gray-400 dark:text-gray-500">
          {message.length}/1000
        </Text>

        <PrimaryButton
          label={sendFeedback.isPending ? 'Gönderiliyor...' : 'Gönder'}
          disabled={!message.trim() || sendFeedback.isPending}
          onPress={handleSend}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
