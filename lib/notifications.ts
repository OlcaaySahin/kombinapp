import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// bildirimler.tsx ile paylaşılan tercih anahtarları — tek kaynak burası.
export const REMINDER_ENABLED_KEY = 'kombin_reminder_enabled';
export const REMINDER_TIME_KEY = 'kombin_reminder_time';
export const DEFAULT_REMINDER_TIME = '20:00';

const REMINDER_NOTIFICATION_ID = 'gunluk-kombin-hatirlatici';
// v2: ilk kanal DEFAULT önemle oluşturulmuştu — Android bir kanalın önem derecesini
// SONRADAN yükseltmeye izin vermez (kullanıcı ayarı sayılır, cache'lenir). Heads-up
// banner için HIGH şart; tek yol YENİ bir kanal id'si açmak. Eski kanal açılışta silinir.
const ANDROID_CHANNEL_ID = 'daily-reminder-v2';
const LEGACY_ANDROID_CHANNEL_IDS = ['daily-reminder'];

// expo-notifications NATIVE modül içeriyor: statik import edilseydi, modülü içermeyen
// eski dev-client build'lerinde uygulama daha açılışta çökerdi. Lazy require + try/catch
// sayesinde modül yoksa (eski build / web) buradaki tüm fonksiyonlar sessizce no-op olur.
// (await import() değil senkron require: tsconfig'in module ayarı dinamik import'a izin
// vermiyor — TS1323; Metro require'ı zaten destekliyor, tip için typeof import yeterli.)
type NotificationsModule = typeof import('expo-notifications');

let cachedModule: NotificationsModule | null | undefined;

function loadNotifications(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === 'web') {
    cachedModule = null;
    return null;
  }
  try {
    const Notifications = require('expo-notifications') as NotificationsModule;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cachedModule = Notifications;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/**
 * Android bildirim kanalını HIGH önemle kurar (heads-up banner için şart) ve
 * eski DEFAULT-önemli kanalları siler. Kanal zaten varsa çağrı idempotenttir.
 */
async function ensureAndroidChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Günlük kombin hatırlatıcısı',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
  for (const legacyId of LEGACY_ANDROID_CHANNEL_IDS) {
    try {
      await Notifications.deleteNotificationChannelAsync(legacyId);
    } catch {
      // eski kanal yoksa sorun değil
    }
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** Var olan hatırlatıcıyı iptal edip verilen "HH:MM" saatine günlük tekrarlı kurar. */
export async function scheduleDailyReminder(time: string): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  const [hourPart, minutePart] = time.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? '0');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false;
  try {
    await ensureAndroidChannel(Notifications);
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_NOTIFICATION_ID,
      content: {
        title: 'Bugün ne giysem? 👕',
        body: 'Envanterin hazır — bir dokunuşla bugüne uygun bir kombin önerelim.',
      },
      trigger: { channelId: ANDROID_CHANNEL_ID, hour, minute, repeats: true },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
  } catch {
    // zamanlanmış bildirim hiç yoksa da sorun değil
  }
}

// ---------- Özel (kullanıcı tanımlı) hatırlatıcılar ----------
// Kullanıcı isteği (2026-07-23): sabit "Bugün ne giysem?" hatırlatıcısının yanına, kendi
// saatini ve metnini girebileceği birden fazla hatırlatıcı ekleyebilsin. Her biri günlük
// tekrarlı (repeats: true) — aynı mekanizma, sadece içerik ve saat kullanıcıdan geliyor.

export type CustomReminder = { id: string; time: string; text: string };

const CUSTOM_REMINDERS_KEY = 'kombin_custom_reminders';

function customReminderNotificationId(id: string): string {
  return `ozel-hatirlatici-${id}`;
}

export async function getCustomReminders(): Promise<CustomReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_REMINDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomReminder[];
  } catch {
    return [];
  }
}

async function saveCustomReminders(reminders: CustomReminder[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_REMINDERS_KEY, JSON.stringify(reminders));
}

/** "HH:MM" formatını doğrular — 24 saatlik, 0-23 saat / 0-59 dakika. */
function parseTime(time: string): { hour: number; minute: number } | null {
  const [hourPart, minutePart] = time.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? '0');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Yeni bir özel hatırlatıcı kurar ve kalıcı listeye ekler. Geçersiz saatte ya da native
 * modül yoksa null döner. */
export async function addCustomReminder(time: string, text: string): Promise<CustomReminder | null> {
  const parsed = parseTime(time);
  if (!parsed || !text.trim()) return null;
  const Notifications = loadNotifications();
  if (!Notifications) return null;
  const reminder: CustomReminder = { id: `${Date.now()}`, time, text: text.trim() };
  try {
    await ensureAndroidChannel(Notifications);
    await Notifications.scheduleNotificationAsync({
      identifier: customReminderNotificationId(reminder.id),
      content: { title: 'Look', body: reminder.text },
      trigger: { channelId: ANDROID_CHANNEL_ID, hour: parsed.hour, minute: parsed.minute, repeats: true },
    });
  } catch {
    return null;
  }
  const current = await getCustomReminders();
  const next = [...current, reminder];
  await saveCustomReminders(next);
  return reminder;
}

export async function removeCustomReminder(id: string): Promise<void> {
  const Notifications = loadNotifications();
  if (Notifications) {
    try {
      await Notifications.cancelScheduledNotificationAsync(customReminderNotificationId(id));
    } catch {
      // zamanlanmış bildirim hiç yoksa da sorun değil
    }
  }
  const current = await getCustomReminders();
  await saveCustomReminders(current.filter((reminder) => reminder.id !== id));
}

/** Yeniden kurulum/yeni build sonrası OS tarafındaki zamanlama kaybolur ama liste AsyncStorage'da
 * yaşar — syncReminderFromPreferences ile aynı ilkeyle (izin İSTEMEDEN) hepsini yeniden kurar. */
async function syncCustomRemindersFromPreferences(): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  const reminders = await getCustomReminders();
  await ensureAndroidChannel(Notifications);
  for (const reminder of reminders) {
    const parsed = parseTime(reminder.time);
    if (!parsed) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: customReminderNotificationId(reminder.id),
        content: { title: 'Look', body: reminder.text },
        trigger: { channelId: ANDROID_CHANNEL_ID, hour: parsed.hour, minute: parsed.minute, repeats: true },
      });
    } catch {
      // tek bir hatırlatıcının kurulamaması diğerlerini engellemesin
    }
  }
}

/**
 * Uygulama açılışında çağrılır: AsyncStorage'daki tercihi OS'in zamanlanmış bildirimiyle
 * senkronlar. Gerekli çünkü yeniden kurulum/yeni build sonrası OS tarafındaki zamanlama
 * kaybolur ama tercih AsyncStorage'da yaşamaya devam eder. Burada izin İSTENMEZ (açılışta
 * izin diyaloğu fırlatmak kötü UX) — izin, kullanıcı hatırlatıcıyı Bildirimler ekranından
 * açarken istenir; burada sadece zaten verilmişse zamanlama yeniden kurulur.
 */
export async function syncReminderFromPreferences(): Promise<void> {
  try {
    const [enabled, time] = await Promise.all([
      AsyncStorage.getItem(REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(REMINDER_TIME_KEY),
    ]);
    if (enabled === 'true') {
      const Notifications = loadNotifications();
      if (Notifications) {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.granted) await scheduleDailyReminder(time ?? DEFAULT_REMINDER_TIME);
      }
    }
    await syncCustomRemindersFromPreferences();
  } catch {
    // bildirim senkronu hiçbir zaman uygulama açılışını engellememeli
  }
}
