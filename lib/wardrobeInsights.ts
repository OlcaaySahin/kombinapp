// Ana Sayfa ve Gardırop Analizi'nin paylaştığı giyim istatistiği hesapları.

import type { DbItem } from '@/lib/hooks/useItems';
import type { OutfitItemSummary, WearEventData } from '@/lib/hooks/useOutfits';

export type WornOutfitStat = { count: number; items: OutfitItemSummary[] };

/** outfit_wears olaylarını kombine göre sayıp en çok giyilenden aza sıralar. */
export function topWornOutfits(wornEvents: WearEventData[], limit = 3): WornOutfitStat[] {
  const wearsByOutfit = new Map<string, WornOutfitStat>();
  for (const wear of wornEvents) {
    if (!wear.outfitId) continue;
    const existing = wearsByOutfit.get(wear.outfitId);
    if (existing) {
      existing.count += 1;
    } else {
      wearsByOutfit.set(wear.outfitId, { count: 1, items: wear.items });
    }
  }
  return [...wearsByOutfit.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Hiçbir "giydim" kaydının kombinine girmemiş envanter ürünleri. */
export function unwornItems(items: DbItem[], wornEvents: WearEventData[]): DbItem[] {
  const wornItemIds = new Set<string>();
  for (const wear of wornEvents) {
    for (const item of wear.items) wornItemIds.add(item.id);
  }
  return items.filter((item: DbItem) => !wornItemIds.has(item.id));
}
