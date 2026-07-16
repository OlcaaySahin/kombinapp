import { FunctionsHttpError } from '@supabase/supabase-js';

import type { PairingNote } from '@/lib/aiOutfit';
import type { DbItem } from '@/lib/hooks/useItems';
import type { OutfitContext } from '@/lib/hooks/useOutfits';
import { supabase } from '@/lib/supabase';

export type PartnerOutfitSuggestion = {
  items: DbItem[];
  reasoning?: string;
  pairingNotes?: PairingNote[];
  /** Modelin dürüst uyum tahmini (0-100) — esnek modda düşük olabilir, UI'da gösteriliyor. */
  compatibility?: number | null;
};

/** Partnerin envanterinde bağlama yeterince uyan kombin yok — UI "daha esnek öner" seçeneği sunar. */
export class PartnerNoMatchError extends Error {
  detail: string | null;
  constructor(message: string, detail: string | null = null) {
    super(message);
    this.name = 'PartnerNoMatchError';
    this.detail = detail;
  }
}

/**
 * Kullanıcının az önce oluşturduğu kombinle uyumlu, partnerin envanterinden bir kombin ister.
 * generate-outfit'in aksine, partnerin ürünleri client'ta zaten yüklü olmadığı için Edge
 * Function tam ürün nesnelerini (sadece id değil) döndürüyor.
 * relaxed=true: kullanıcı "daha az uyumlu da olsa öner" dedi — model asla boş dönmez,
 * uyum düşükse compatibility alanında dürüstçe belirtir.
 */
export async function requestPartnerOutfit(
  referenceItems: { name: string | null; slot: string; color: string | null }[],
  context?: OutfitContext,
  relaxed = false
): Promise<PartnerOutfitSuggestion> {
  const { data, error } = await supabase.functions.invoke('generate-partner-outfit', {
    body: { referenceItems, context, relaxed },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.code === 'no_match') {
        throw new PartnerNoMatchError(body.error, body.detail ?? null);
      }
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  if (!data?.items || data.items.length === 0) {
    throw new PartnerNoMatchError('Partnerin envanterinden uygun bir kombin bulunamadı');
  }
  return {
    items: data.items as DbItem[],
    reasoning: data.reasoning,
    pairingNotes: data.pairingNotes,
    compatibility: data.compatibility ?? null,
  };
}
