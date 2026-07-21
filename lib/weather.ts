import { Platform } from 'react-native';

// expo-location NATIVE bir modül — expo-notifications/react-native-svg/sentry ile aynı lazy
// require + try/catch deseni: modül yoksa (eski build/web) tüm fonksiyonlar sessizce no-op
// olur, kullanıcı elle chip seçmeye devam edebilir (hiçbir zaman zorunlu bir yol değil).
type LocationModule = typeof import('expo-location');

let cachedLocation: LocationModule | null | undefined;

function loadLocation(): LocationModule | null {
  if (cachedLocation !== undefined) return cachedLocation;
  if (Platform.OS === 'web') {
    cachedLocation = null;
    return null;
  }
  try {
    cachedLocation = require('expo-location') as LocationModule;
  } catch {
    cachedLocation = null;
  }
  return cachedLocation;
}

/** Ana Sayfa'daki "Hava" chip seçenekleriyle birebir aynı — bkz. app/(tabs)/index.tsx HAVA sabiti. */
export type WeatherOption = 'Güneşli' | 'Yağmurlu' | 'Rüzgarlı' | 'Karlı';

/**
 * Open-Meteo'nun WMO hava kodunu + rüzgar hızını bizim 4 kategorimizden birine indirger.
 * Rüzgar önce kontrol ediliyor (40 km/s üstü, kod ne olursa olsun "Rüzgarlı" baskın sinyal).
 * Kod aralıkları: https://open-meteo.com/en/docs (WMO Weather interpretation codes).
 */
function mapToWeatherOption(code: number, windSpeedKmh: number): WeatherOption {
  if (windSpeedKmh >= 40) return 'Rüzgarlı';
  const isSnow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  if (isSnow) return 'Karlı';
  const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
  if (isRain) return 'Yağmurlu';
  return 'Güneşli';
}

/**
 * Konum izni isteyip (verilmemişse sessizce null döner, hiç hata fırlatmaz) cihazın
 * bulunduğu yerin GÜNCEL hava durumunu Open-Meteo'dan (ücretsiz, API key gerektirmeyen
 * servis — Pollinations.ai'deki tercihle aynı gerekçe) çekip 4 kategoriden birine eşler.
 * Başarısız olan HER adımda (izin reddi, modül yok, ağ hatası) null döner — çağıran taraf
 * bunu "otomatik tespit edilemedi, elle seç" olarak yorumlamalı, asla hata fırlatmamalı.
 */
export async function detectWeatherFromLocation(): Promise<WeatherOption | null> {
  const Location = loadLocation();
  if (!Location) return null;
  try {
    const current = await Location.getForegroundPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      const requested = await Location.requestForegroundPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = position.coords;

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,wind_speed_10m`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const code = data?.current?.weather_code;
    const wind = data?.current?.wind_speed_10m;
    if (typeof code !== 'number') return null;
    return mapToWeatherOption(code, typeof wind === 'number' ? wind : 0);
  } catch {
    return null;
  }
}
