import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

// react-native'in useColorScheme'i yerine NativeWind'inki: sistem temasına EK olarak
// lib/theme.ts üzerinden yapılan manuel tema seçimini de (Profil > Tema) yansıtır.
// RN'inki manuel geçişi web'de hiç, native'de ise ancak Appearance API'siyle görürdü.
export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useNativeWindColorScheme();
  return colorScheme ?? 'light';
}
