import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativeWindColorScheme } from 'nativewind';
import { Appearance, AppState } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREF_KEY = 'kombin_theme_pref';

// Son uygulanan tercih — guard listener'ları senkron okuyabilsin diye modül seviyesinde.
let activePref: ThemePreference = 'system';

/** Temayı anında uygular (kalıcılaştırmaz). 'system' = OS temasını takip et. */
export function applyThemePreference(pref: ThemePreference) {
  activePref = pref;
  nativeWindColorScheme.set(pref);
}

let guardInstalled = false;

/**
 * Tema şaşması guard'ı (bir kez kurulur): Android'de galeri/foto seçici/paylaşım menüsü
 * gibi ayrı Activity açan işlemler configuration change tetikleyip RN'in görünümünü sistem
 * temasından yeniden okutabiliyor — manuel (Açık/Koyu) tercih sessizce eziliyordu (kullanıcı
 * "Açık" seçiliyken koyu render ekran görüntüsüyle bildirdi, 2026-07-19). Çözüm: uygulama
 * öne dönünce ve Appearance değişim olayında kayıtlı tercihi yeniden basmak. 'system'
 * tercihinde listener'lar bilinçli no-op — OS'i takip etmek zaten istenen davranış.
 */
export function installThemeGuard(): void {
  if (guardInstalled) return;
  guardInstalled = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && activePref !== 'system') {
      nativeWindColorScheme.set(activePref);
    }
  });
  Appearance.addChangeListener(({ colorScheme: systemScheme }) => {
    // Sonsuz döngü koruması: sistem görünümü zaten istenen değerdeyse tekrar set etme.
    if (activePref !== 'system' && systemScheme !== activePref) {
      nativeWindColorScheme.set(activePref);
    }
  });
}

export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(THEME_PREF_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export async function setThemePreference(pref: ThemePreference): Promise<void> {
  applyThemePreference(pref);
  try {
    await AsyncStorage.setItem(THEME_PREF_KEY, pref);
  } catch {
    // tercih kaydedilemese de tema bu oturum için uygulanmış olur
  }
}

/** Uygulama açılışında çağrılır: kayıtlı tercih varsa uygular. Açılışı asla engellememeli. */
export async function applyStoredThemePreference(): Promise<void> {
  const pref = await getThemePreference();
  activePref = pref;
  if (pref !== 'system') applyThemePreference(pref);
}
