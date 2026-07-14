import type { CategorySlot } from '@/constants/categories';

type SlottableItem = { slot: CategorySlot };

function pickOne<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Kural tabanlı rastgele seçim. Gerçek AI (Claude) tabanlı akıl yürütme
 * Edge Function deploy edildiğinde bu fonksiyonun yerini alacak/tamamlayacak.
 */
export function generateRandomOutfit<T extends SlottableItem>(items: T[]): T[] | null {
  const bySlot = (slot: CategorySlot) => items.filter((item) => item.slot === slot);

  const top = pickOne(bySlot('ust_giyim'));
  const bottom = pickOne(bySlot('alt_giyim'));
  const shoes = pickOne(bySlot('ayakkabi'));

  if (!top || !bottom || !shoes) return null;

  const extra = pickOne([...bySlot('taki'), ...bySlot('tamamlayici')]);

  return extra ? [top, bottom, shoes, extra] : [top, bottom, shoes];
}
