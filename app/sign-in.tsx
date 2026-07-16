import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { sendAccountUpgradeCode, signInWithGoogle, verifyAccountUpgradeCode } from '@/lib/auth';

type Step = 'email' | 'code';

export default function SignInScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showAlert('Hesabın oluşturuldu!', 'Envanterin ve kombinlerin artık bu Google hesabına bağlı, güvende.');
      router.back();
    } catch (error) {
      console.error('Google ile giriş yapılamadı:', error);
      showAlert('Giriş yapılamadı', error instanceof Error ? error.message : String(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSendCode() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendAccountUpgradeCode(email.trim());
      setStep('code');
    } catch (error) {
      console.error('Kod gönderilemedi:', error);
      showAlert('Kod gönderilemedi', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await verifyAccountUpgradeCode(email.trim(), code.trim());
      showAlert('Hesabın oluşturuldu!', 'Envanterin ve kombinlerin artık bu e-postaya bağlı, güvende.');
      router.back();
    } catch (error) {
      console.error('Kod doğrulanamadı:', error);
      showAlert('Kod doğrulanamadı', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-2 font-heading-bold text-2xl text-gray-900 dark:text-white">Hesabını Oluştur</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Envanterin, kombinlerin ve fotoğrafların bu e-postaya bağlanacak — hiçbir şey kaybolmaz, telefon
          değiştirsen veya uygulamayı silsen bile bu e-postayla geri erişebilirsin.
        </Text>

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
          className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-200 py-4 dark:border-gray-700">
          <Ionicons name="logo-google" size={18} color="#3461FD" />
          <Text className="font-heading text-base text-gray-900 dark:text-white">
            {googleLoading ? 'Giriş yapılıyor...' : 'Google ile Devam Et'}
          </Text>
        </Pressable>

        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <Text className="font-body text-xs text-gray-400 dark:text-gray-500">veya e-posta ile</Text>
          <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </View>

        {step === 'email' ? (
          <View>
            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">E-posta</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              placeholderTextColor="#9BA1A6"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="mb-6 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
            <PrimaryButton
              label={loading ? 'Gönderiliyor...' : 'Kod Gönder'}
              disabled={loading || !email.trim()}
              onPress={handleSendCode}
            />
          </View>
        ) : (
          <View>
            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">
              {email} adresine gönderilen kod
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="12345678"
              placeholderTextColor="#9BA1A6"
              keyboardType="number-pad"
              maxLength={8}
              className="mb-6 rounded-2xl border border-gray-200 px-4 py-3 font-body text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
            <PrimaryButton
              label={loading ? 'Doğrulanıyor...' : 'Doğrula'}
              disabled={loading || !code.trim()}
              onPress={handleVerifyCode}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
