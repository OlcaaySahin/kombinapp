// Bavul Hazırla (kapsül gardırop) — generate-packing-list Edge Function client'ı.
// generate-outfit'in aksine yerel fallback YOK: bavul planı rastgele seçimle anlamlı
// üretilemez, hata olursa kullanıcıya dürüstçe gösterilir (sessiz fallback dersi).

import type { DbItem } from '@/lib/hooks/useItems';
import { supabase } from '@/lib/supabase';

export type PackingInput = {
  days: number;
  mevsim: string;
  hava?: string;
  konsept: string;
  note?: string;
};

export type PackingDayOutfit = {
  day: number;
  items: DbItem[];
  note: string;
};

export type PackingPlan = {
  suitcaseItems: DbItem[];
  outfits: PackingDayOutfit[];
  reasoning: string;
};

export async function requestPackingList(input: PackingInput, inventory: DbItem[]): Promise<PackingPlan> {
  const { data, error } = await supabase.functions.invoke('generate-packing-list', { body: input });
  if (error) {
    // supabase-js'in jenerik "non-2xx" mesajı yerine fonksiyonun gerçek hata gövdesini göster.
    let detail = '';
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { error?: string };
        detail = body.error ?? '';
      }
    } catch {
      // gövde okunamazsa jenerik mesajla devam
    }
    throw new Error(detail || error.message || 'Bavul planı alınamadı');
  }

  const itemById = new Map(inventory.map((item: DbItem) => [item.id, item]));
  const toItems = (ids: string[]) =>
    ids.map((id) => itemById.get(id)).filter((item): item is DbItem => Boolean(item));

  const result = data as { suitcaseItemIds: string[]; outfits: { day: number; itemIds: string[]; note: string }[]; reasoning: string };
  return {
    suitcaseItems: toItems(result.suitcaseItemIds),
    outfits: result.outfits.map((outfit) => ({ day: outfit.day, items: toItems(outfit.itemIds), note: outfit.note })),
    reasoning: result.reasoning,
  };
}
