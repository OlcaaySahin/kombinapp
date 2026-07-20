// @sentry/react-native NATIVE bir modül — mevcut development build'de yok (2026-07-20'de
// eklendi). Expo Router tüm route dosyalarını açılışta import ettiği için statik import
// app'i AÇILIŞTA çökertirdi. Çözüm: lazy require + try/catch (expo-notifications/
// react-native-svg ile aynı desen) — modül yoksa tüm fonksiyonlar sessizce no-op olur,
// uygulama eski build'de de sorunsuz çalışmaya devam eder. Yeni bir EAS build alınınca
// (native modül seti değiştiği için zaten build şart) gerçek crash/hata raporlama başlar.
type SentryModule = typeof import('@sentry/react-native');

let cachedSentry: SentryModule | null | undefined;

function loadSentry(): SentryModule | null {
  if (cachedSentry !== undefined) return cachedSentry;
  try {
    cachedSentry = require('@sentry/react-native') as SentryModule;
  } catch {
    cachedSentry = null;
  }
  return cachedSentry;
}

/** app/_layout.tsx'te, uygulama açılışında bir kez çağrılır. */
export function initSentry() {
  const Sentry = loadSentry();
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!Sentry || !dsn) return;
  Sentry.init({
    dsn,
    // Geliştirme sırasındaki kendi testlerimiz dashboard'u kirletmesin diye sadece
    // production/preview build'lerde aktif — `__DEV__` Metro dev sunucusuna bağlıyken true.
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
  });
}

/** Yakalanan (try/catch içindeki) hataları elle Sentry'ye göndermek için. */
export function captureException(error: unknown) {
  const Sentry = loadSentry();
  if (!Sentry) return;
  Sentry.captureException(error);
}
