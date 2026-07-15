import type { DbItem } from '@/lib/hooks/useItems';
import type { OutfitContext } from '@/lib/hooks/useOutfits';
import { generateRandomOutfit } from '@/lib/outfitGenerator';
import { supabase } from '@/lib/supabase';

export type OutfitSuggestion = {
  items: DbItem[];
  reasoning?: string;
  source: 'ai_generated' | 'dice';
};

/**
 * "Kombin Oluştur" (soru bazlı) akışı için: generate-outfit Edge Function'ını dener.
 * Function henüz deploy edilmediyse veya hata verirse, yerel kural tabanlı seçime düşer.
 * excludeItemIds verilirse ("Tekrar Dene"), hem AI hem fallback öncekiyle aynı kombini
 * tekrar önermemeye çalışır.
 * Not: Zar butonu bunu KULLANMAZ, her zaman generateRandomOutfit ile lokal çalışır.
 */
export async function requestAiOutfit(
  items: DbItem[],
  context: OutfitContext,
  excludeItemIds?: string[],
  note?: string
): Promise<OutfitSuggestion | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-outfit', {
      body: { context, excludeItemIds, note },
    });
    if (error) throw error;

    const itemIds: string[] = data?.itemIds ?? [];
    const matched = itemIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is DbItem => Boolean(item));

    if (matched.length === 0) throw new Error('AI önerisi envanterle eşleşmedi');

    return { items: matched, reasoning: data?.reasoning, source: 'ai_generated' };
  } catch {
    const excludeSet = excludeItemIds ? new Set(excludeItemIds) : undefined;
    const fallback = generateRandomOutfit<DbItem>(items, excludeSet);
    if (!fallback) return null;
    return { items: fallback, source: 'dice' };
  }
}
