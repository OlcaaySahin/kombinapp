import { FunctionsHttpError } from '@supabase/supabase-js';

import type { PairingNote } from '@/lib/aiOutfit';
import type { DbItem } from '@/lib/hooks/useItems';
import type { OutfitContext } from '@/lib/hooks/useOutfits';
import { supabase } from '@/lib/supabase';

export type PartnerOutfitSuggestion = {
  items: DbItem[];
  reasoning?: string;
  pairingNotes?: PairingNote[];
};

/**
 * Kullanıcının az önce oluşturduğu kombinle uyumlu, partnerin envanterinden bir kombin ister.
 * generate-outfit'in aksine, partnerin ürünleri client'ta zaten yüklü olmadığı için Edge
 * Function tam ürün nesnelerini (sadece id değil) döndürüyor.
 */
export async function requestPartnerOutfit(
  referenceItems: { name: string | null; slot: string; color: string | null }[],
  context?: OutfitContext
): Promise<PartnerOutfitSuggestion> {
  const { data, error } = await supabase.functions.invoke('generate-partner-outfit', {
    body: { referenceItems, context },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  if (!data?.items || data.items.length === 0) {
    throw new Error('Partnerin envanterinden uygun bir kombin bulunamadı');
  }
  return { items: data.items as DbItem[], reasoning: data.reasoning, pairingNotes: data.pairingNotes };
}
