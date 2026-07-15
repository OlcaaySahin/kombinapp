import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const REMINDER_ENABLED_KEY = 'kombin_reminder_enabled';
const REMINDER_TIME_KEY = 'kombin_reminder_time';
const TIME_OPTIONS = ['09:00', '12:00', '18:00', '20:00'];

export default function BildirimlerScreen() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('20:00');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(REMINDER_ENABLED_KEY), AsyncStorage.getItem(REMINDER_TIME_KEY)]).then(
      ([enabledValue, timeValue]) => {
        setEnabled(enabledValue === 'true');
        if (timeValue) setTime(timeValue);
        setLoaded(true);
      }
    );
  }, []);

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(next));
  }

  async function selectTime(value: string) {
    setTime(value);
    await AsyncStorage.setItem(REMINDER_TIME_KEY, value);
  }

  if (!loaded) return null;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <View className="p-5">
        <Text className="mb-2 font-heading-bold text-2xl text-gray-900 dark:text-white">Bildirimler</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Bildirim gönderimi yakında aktif olacak — tercihini şimdiden ayarlayabilirsin, uygulama güncellenince
          otomatik devreye girer.
        </Text>

        <Pressable
          onPress={toggleEnabled}
          className="mb-6 flex-row items-center gap-3 rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-700">
          <Ionicons name={enabled ? 'checkbox' : 'square-outline'} size={22} color={enabled ? '#3461FD' : '#9BA1A6'} />
          <View className="flex-1">
            <Text className="font-body-semibold text-sm text-gray-900 dark:text-gray-100">
              Günlük kombin hatırlatıcısı
            </Text>
            <Text className="mt-0.5 font-body text-xs text-gray-500 dark:text-gray-400">
              "Bugün ne giysem?" diye seni her gün hatırlatalım
            </Text>
          </View>
        </Pressable>

        {enabled && (
          <View>
            <Text className="mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300">Saat</Text>
            <View className="flex-row flex-wrap gap-2">
              {TIME_OPTIONS.map((option) => {
                const selected = time === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => selectTime(option)}
                    className={`rounded-full border px-4 py-2 ${
                      selected ? 'border-primary bg-primary' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                    }`}>
                    <Text className={`font-body-medium text-sm ${selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
