import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert, showConfirm } from '@/lib/alert';
import { usePartnership } from '@/lib/hooks/usePartnership';
import {
  REMINDER_ENABLED_KEY,
  REMINDER_TIME_KEY,
  addCustomReminder,
  cancelDailyReminder,
  ensureNotificationPermission,
  getCustomReminders,
  removeCustomReminder,
  scheduleDailyReminder,
  type CustomReminder,
} from '@/lib/notifications';

const TIME_OPTIONS = ['09:00', '12:00', '18:00', '20:00'];

export default function BildirimlerScreen() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('20:00');
  const [loaded, setLoaded] = useState(false);
  const { data: partnership } = usePartnership();
  const hasPendingPartnerRequest = partnership?.status === 'pending_incoming';

  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [addingReminder, setAddingReminder] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newText, setNewText] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(REMINDER_TIME_KEY),
      getCustomReminders(),
    ]).then(([enabledValue, timeValue, reminders]) => {
      setEnabled(enabledValue === 'true');
      if (timeValue) setTime(timeValue);
      setCustomReminders(reminders);
      setLoaded(true);
    });
  }, []);

  async function handleAddReminder() {
    setSavingReminder(true);
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        showAlert('Bildirim izni alınamadı', 'Telefon ayarlarından bildirim izni verdiğinden emin ol.');
        return;
      }
      const reminder = await addCustomReminder(newTime.trim(), newText);
      if (!reminder) {
        showAlert('Olmadı', 'Saati "SS:DD" formatında (ör. 14:30) ve bir metin girdiğinden emin ol.');
        return;
      }
      setCustomReminders((current) => [...current, reminder]);
      setNewTime('');
      setNewText('');
      setAddingReminder(false);
    } finally {
      setSavingReminder(false);
    }
  }

  function handleRemoveReminder(reminder: CustomReminder) {
    showConfirm(
      'Hatırlatıcıyı Sil',
      `"${reminder.text}" hatırlatıcısı silinsin mi?`,
      async () => {
        await removeCustomReminder(reminder.id);
        setCustomReminders((current) => current.filter((item) => item.id !== reminder.id));
      },
      'Sil'
    );
  }

  async function toggleEnabled() {
    const next = !enabled;
    if (next) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        showAlert(
          'Bildirim izni alınamadı',
          'Hatırlatıcı için bildirim izni gerekiyor. Uygulamanın güncel sürümünü kullandığından ve telefon ayarlarından bildirim izni verdiğinden emin ol.'
        );
        return;
      }
      const scheduled = await scheduleDailyReminder(time);
      if (!scheduled) {
        showAlert('Kurulamadı', 'Hatırlatıcı bu cihazda kurulamadı, lütfen tekrar dene.');
        return;
      }
    } else {
      await cancelDailyReminder();
    }
    setEnabled(next);
    await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(next));
  }

  async function selectTime(value: string) {
    setTime(value);
    await AsyncStorage.setItem(REMINDER_TIME_KEY, value);
    // Hatırlatıcı açıksa yeni saate göre hemen yeniden kur (kapalıysa sadece tercih saklanır).
    if (enabled) await scheduleDailyReminder(value);
  }

  if (!loaded) return null;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#151718]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-2 font-heading-bold text-2xl text-gray-900 dark:text-white">Bildirimler</Text>
        <Text className="mb-6 font-body text-sm text-gray-500 dark:text-gray-400">
          Hatırlatıcıyı açtığında, seçtiğin saatte her gün telefonuna bildirim gelir.
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
          <View className="mb-6">
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

        <View className="mb-6">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-body-semibold text-sm text-gray-700 dark:text-gray-300">Kendi Hatırlatıcılarım</Text>
            <Pressable onPress={() => setAddingReminder((current) => !current)} className="flex-row items-center gap-1">
              <Ionicons name={addingReminder ? 'close' : 'add'} size={16} color="#3461FD" />
              <Text className="font-body-medium text-sm text-primary">{addingReminder ? 'Vazgeç' : 'Ekle'}</Text>
            </Pressable>
          </View>
          <Text className="mb-3 font-body text-xs text-gray-500 dark:text-gray-400">
            İstediğin saatte, kendi metninle, her gün tekrar eden ek hatırlatıcılar kurabilirsin.
          </Text>

          {customReminders.map((reminder) => (
            <View
              key={reminder.id}
              className="mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
              <Text className="font-heading text-sm text-primary">{reminder.time}</Text>
              <Text numberOfLines={2} className="flex-1 font-body text-sm text-gray-700 dark:text-gray-300">
                {reminder.text}
              </Text>
              <Pressable onPress={() => handleRemoveReminder(reminder)} hitSlop={8}>
                <Ionicons name="trash-outline" size={17} color="#EF4444" />
              </Pressable>
            </View>
          ))}

          {addingReminder && (
            <View className="gap-2 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
              <Text className="font-body-medium text-xs text-gray-500 dark:text-gray-400">Saat (24 saat, ör. 14:30)</Text>
              <TextInput
                value={newTime}
                onChangeText={setNewTime}
                placeholder="20:00"
                placeholderTextColor="#9BA1A6"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                className="rounded-xl border border-gray-200 px-3 py-2 font-body text-sm text-gray-900 dark:border-gray-700 dark:text-gray-100"
              />
              <Text className="mt-1 font-body-medium text-xs text-gray-500 dark:text-gray-400">Mesaj</Text>
              <TextInput
                value={newText}
                onChangeText={setNewText}
                placeholder="ör. İlaç saatin geldi"
                placeholderTextColor="#9BA1A6"
                maxLength={100}
                className="rounded-xl border border-gray-200 px-3 py-2 font-body text-sm text-gray-900 dark:border-gray-700 dark:text-gray-100"
              />
              <Pressable
                onPress={handleAddReminder}
                disabled={savingReminder}
                className="mt-2 items-center rounded-xl bg-primary py-2.5">
                <Text className="font-heading text-sm text-white">
                  {savingReminder ? 'Kuruluyor...' : 'Hatırlatıcıyı Kur'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {hasPendingPartnerRequest && (
          <Pressable
            onPress={() => router.push('/partner-eslesme')}
            className="flex-row items-center gap-3 rounded-2xl bg-accent-coral/10 p-4">
            <Ionicons name="people-outline" size={20} color="#FF4757" />
            <Text className="flex-1 font-body text-sm text-gray-900 dark:text-gray-100">
              Bekleyen bir partner isteğin var — görüntülemek için dokun.
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FF4757" />
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
