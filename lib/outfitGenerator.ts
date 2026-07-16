import type { CategorySlot } from '@/constants/categories';

type SlottableItem = { id: string; slot: CategorySlot };

/**
 * "taki" slotu tek bir kategori ama kolye/küpe/yüzük/bileklik/saat gibi birden fazla alt
 * türü kapsıyor — şemada ayrı bir alt-tür alanı yok, bu yüzden isimden anahtar kelimeyle
 * çıkarıyoruz. "Karıştır" ile tek parça değiştirirken aynı türden ikinci bir parça
 * eklenmesini (ör. kombinde küpe varken değiştirilen kolyenin yerine başka bir küpe gelmesi)
 * önlemek için kullanılıyor.
 */
const TAKI_TYPE_KEYWORDS: Record<string, string[]> = {
  kolye: ['kolye', 'gerdanlık', 'necklace', 'pendant'],
  kupe: ['küpe', 'earring'],
  yuzuk: ['yüzük', 'ring'],
  bileklik: ['bileklik', 'halhal', 'bracelet'],
  saat: ['saat', 'watch'],
  kol_dugmesi: ['kol düğmesi', 'kol düğmeleri', 'cufflink'],
};

export function inferTakiType(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [type, keywords] of Object.entries(TAKI_TYPE_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) return type;
  }
  return null;
}

/** excludeIds'te olmayanlar arasından seçmeyi tercih eder; alternatif yoksa (tek seçenek varsa) tekrara izin verir. */
function pickOne<T extends { id: string }>(items: T[], excludeIds?: Set<string>): T | null {
  if (items.length === 0) return null;
  const preferred = excludeIds ? items.filter((item) => !excludeIds.has(item.id)) : items;
  const pool = preferred.length > 0 ? preferred : items;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Kural tabanlı rastgele seçim. Gerçek AI (Claude) tabanlı akıl yürütme
 * Edge Function deploy edildiğinde bu fonksiyonun yerini alacak/tamamlayacak.
 * excludeIds verilirse (örn. "Tekrar Dene"), mümkün olduğunca aynı ürünleri tekrar seçmemeye çalışır.
 */
export function generateRandomOutfit<T extends SlottableItem>(items: T[], excludeIds?: Set<string>): T[] | null {
  const bySlot = (slot: CategorySlot) => items.filter((item) => item.slot === slot);

  const top = pickOne(bySlot('ust_giyim'), excludeIds);
  const bottom = pickOne(bySlot('alt_giyim'), excludeIds);
  const shoes = pickOne(bySlot('ayakkabi'), excludeIds);

  if (!top || !bottom || !shoes) return null;

  const extra = pickOne([...bySlot('taki'), ...bySlot('tamamlayici')], excludeIds);

  return extra ? [top, bottom, shoes, extra] : [top, bottom, shoes];
}
