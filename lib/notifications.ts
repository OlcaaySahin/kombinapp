import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// bildirimler.tsx ile paylaşılan tercih anahtarları — tek kaynak burası.
export const REMINDER_ENABLED_KEY = 'kombin_reminder_enabled';
export const REMINDER_TIME_KEY = 'kombin_reminder_time';
export const DEFAULT_REMINDER_TIME = '20:00';

const REMINDER_NOTIFICATION_ID = 'gunluk-kombin-hatirlatici';
const ANDROID_CHANNEL_ID = 'daily-reminder';

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
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Günlük kombin hatırlatıcısı',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
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

/**
 * Teşhis amaçlı: 10 saniye sonrasına tek seferlik bir bildirim kurar. Kullanıcı butona
 * basıp uygulamayı arka plana alarak sistem tepsisine bildirim düşüp düşmediğini test eder
 * — günlük hatırlatıcının saatini beklemeden zamanlama boru hattını doğrulamanın tek yolu.
 */
export async function sendTestNotification(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Günlük kombin hatırlatıcısı',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test bildirimi 🔔',
        body: 'Bunu görüyorsan bildirimler çalışıyor demektir.',
      },
      trigger: { channelId: ANDROID_CHANNEL_ID, seconds: 10 },
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
    if (enabled !== 'true') return;
    const Notifications = loadNotifications();
    if (!Notifications) return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await scheduleDailyReminder(time ?? DEFAULT_REMINDER_TIME);
  } catch {
    // bildirim senkronu hiçbir zaman uygulama açılışını engellememeli
  }
}
