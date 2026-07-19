import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ShareCardView } from '@/components/ui/ShareCardView';
import { showAlert } from '@/lib/alert';
import { useOutfit } from '@/lib/hooks/useOutfits';
import {
  DEFAULT_SHARE_TEMPLATE_ID,
  getShareTemplate,
  SHARE_TEMPLATE_PREF_KEY,
  SHARE_TEMPLATES,
} from '@/lib/shareTemplates';

// react-native-view-shot ve expo-sharing NATIVE modüller — eski build'de yoklar.
// Statik import Expo Router yüzünden app'i açılışta çökertirdi; lazy require + no-op
// (gardirop-analiz'deki react-native-svg ile aynı desen). Web'de paylaşım desteklenmiyor.
type ViewShotModule = typeof import('react-native-view-shot');
type SharingModule = typeof import('expo-sharing');

let cachedViewShot: ViewShotModule | null | undefined;
let cachedSharing: SharingModule | null | undefined;

function loadViewShot(): ViewShotModule | null {
  if (cachedViewShot !== undefined) return cachedViewShot;
  try {
    cachedViewShot = require('react-native-view-shot') as ViewShotModule;
  } catch {
    cachedViewShot = null;
  }
  return cachedViewShot;
}

function loadSharing(): SharingModule | null {
  if (cachedSharing !== undefined) return cachedSharing;
  try {
    cachedSharing = require('expo-sharing') as SharingModule;
  } catch {
    cachedSharing = null;
  }
  return cachedSharing;
}

export default function KombinPaylasScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId?: string }>();
  const { data: outfit, isLoading } = useOutfit(outfitId ?? null);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [templateId, setTemplateId] = useState(DEFAULT_SHARE_TEMPLATE_ID);

  useEffect(() => {
    AsyncStorage.getItem(SHARE_TEMPLATE_PREF_KEY).then((stored) => {
      if (stored) setTemplateId(stored);
    });
  }, []);

  function handleSelectTemplate(id: string) {
    setTemplateId(id);
    AsyncStorage.setItem(SHARE_TEMPLATE_PREF_KEY, id).catch(() => {
      // tercih kaydedilemese de bu oturum için seçim geçerli kalır
    });
  }

  async function handleShare() {
    const viewShot = loadViewShot();
    const sharingModule = loadSharing();
    if (Platform.OS === 'web' || !viewShot || !sharingModule) {
      showAlert(
        'Bu cihazda paylaşılamıyor',
        Platform.OS === 'web'
          ? 'Paylaşım kartı telefondan paylaşılabilir.'
          : 'Paylaşım için uygulamanın güncel sürümü gerekiyor.'
      );
      return;
    }
    setSharing(true);
    try {
      // Çıktı 1080x1919 px'e ölçeklenir — Instagram Story çözünürlüğü.
      const uri = await viewShot.captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1919 });
      if (!(await sharingModule.isAvailableAsync())) {
        showAlert('Paylaşım kullanılamıyor', 'Bu cihazda sistem paylaşım menüsü açılamadı.');
        return;
      }
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      await sharingModule.shareAsync(fileUri, { mimeType: 'image/png', dialogTitle: 'Kombinini paylaş' });
    } catch (error) {
      console.error('Kombin kartı paylaşılamadı:', error);
      showAlert('Paylaşılamadı', error instanceof Error ? error.message : String(error));
    } finally {
      setSharing(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#151718]">
        <ActivityIndicator color="#3461FD" />
      </SafeAreaView>
    );
  }

  if (!outfit) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-10 dark:bg-[#151718]">
        <Text className="text-center font-body text-gray-500 dark:text-gray-400">Kombin bulunamadı.</Text>
      </SafeAreaView>
    );
  }

  const config = getShareTemplate(templateId);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-1 font-heading-bold text-2xl text-gray-900 dark:text-white">Kombinini Paylaş</Text>
        <Text className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
          Aşağıdaki kart görsel olarak paylaşılır — Instagram Story için 9:16 formatında.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          style={{ flexGrow: 0, flexShrink: 0 }}
          className="mb-5">
          {SHARE_TEMPLATES.map((template) => {
            const selected = template.id === templateId;
            return (
              <Pressable
                key={template.id}
                onPress={() => handleSelectTemplate(template.id)}
                className="items-center">
                <View
                  className={`h-20 w-12 items-center justify-center overflow-hidden rounded-xl border-2 ${
                    selected ? 'border-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: template.background }}>
                  <View
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: template.swatch[1],
                      opacity: 0.7,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -10,
                      left: -10,
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: template.swatch[2],
                      opacity: 0.5,
                    }}
                  />
                  {selected && (
                    <View className="rounded-full bg-primary p-1">
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  className={`mt-1.5 w-14 text-center font-body text-[10px] ${
                    selected ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  {template.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="items-center">
          <ShareCardView
            ref={cardRef}
            config={config}
            outfit={{
              items: outfit.items,
              context: outfit.generation_context,
              reasoning: outfit.reasoning,
              userNote: outfit.user_note,
            }}
          />
        </View>

        <View className="mt-6">
          <PrimaryButton label={sharing ? 'Hazırlanıyor...' : 'Paylaş'} disabled={sharing} onPress={handleShare} />
          <Text className="mt-2 text-center font-body text-xs text-gray-400 dark:text-gray-500">
            Sistem paylaşım menüsü açılır — Instagram, WhatsApp veya istediğin uygulamayı seç.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
