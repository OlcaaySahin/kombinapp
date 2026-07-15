import type { CategorySlot } from '@/constants/categories';

type SlottableItem = { id: string; slot: CategorySlot };

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
