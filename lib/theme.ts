import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativeWindColorScheme } from 'nativewind';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREF_KEY = 'kombin_theme_pref';

/** Temayı anında uygular (kalıcılaştırmaz). 'system' = OS temasını takip et. */
export function applyThemePreference(pref: ThemePreference) {
  nativeWindColorScheme.set(pref);
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
  if (pref !== 'system') applyThemePreference(pref);
}
