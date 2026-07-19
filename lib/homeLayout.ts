import AsyncStorage from '@react-native-async-storage/async-storage';

// Ana sayfa (idle ekranı) yerleşim varyantları — kullanıcı isteği (2026-07-19):
// "4-5 varyant ve senin önerdiğin yapıyla devam edelim" (Sade/Kart Odaklı/Hero
// Butonlu/Yoğun Panel/Minimal). Bloklar (WardrobeStats, RecentOutfitsStrip, vb.)
// TÜM varyantlarda aynı bileşenler — sadece düzen/stil değişir, böylece yeni bir
// ana sayfa bloğu eklendiğinde otomatik olarak her varyantta görünür.
export type HomeLayoutVariant = 'sade' | 'kart-odakli' | 'hero-butonlu' | 'yogun-panel' | 'minimal';

export const HOME_LAYOUT_VARIANTS: { id: HomeLayoutVariant; label: string; description: string }[] = [
  { id: 'sade', label: 'Sade', description: 'Bugünkü tasarım — sakin, dikey, gereksiz süs yok.' },
  { id: 'kart-odakli', label: 'Kart Odaklı', description: 'Her blok kendi çerçeveli kartında, net ayrımlarla.' },
  { id: 'hero-butonlu', label: 'Hero Butonlu', description: '"Kombin Oluştur" ve "Zar At" büyük, öne çıkan karolar.' },
  { id: 'yogun-panel', label: 'Yoğun Panel', description: 'Daha az kaydırma — bilgiler yan yana, sıkı yerleşim.' },
  { id: 'minimal', label: 'Minimal', description: 'Kutu/gölge yok — düz metin ve ince çizgilerle en sade hâli.' },
];

const HOME_LAYOUT_PREF_KEY = 'kombin_home_layout';
const DEFAULT_VARIANT: HomeLayoutVariant = 'sade';

export async function getHomeLayoutPreference(): Promise<HomeLayoutVariant> {
  try {
    const stored = await AsyncStorage.getItem(HOME_LAYOUT_PREF_KEY);
    return (HOME_LAYOUT_VARIANTS.find((v) => v.id === stored)?.id ?? DEFAULT_VARIANT);
  } catch {
    return DEFAULT_VARIANT;
  }
}

/** İlk açılış seçici gösterildi mi? (tercih hiç kaydedilmemişse ilk kez gösterilir). */
export async function hasChosenHomeLayout(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HOME_LAYOUT_PREF_KEY)) !== null;
  } catch {
    return true; // storage okunamıyorsa ilk-açılış akışını tekrar tekrar göstermemek için
  }
}

export async function setHomeLayoutPreference(variant: HomeLayoutVariant): Promise<void> {
  try {
    await AsyncStorage.setItem(HOME_LAYOUT_PREF_KEY, variant);
  } catch {
    // kaydedilemese de bu oturum için seçim state'te geçerli kalır
  }
}
