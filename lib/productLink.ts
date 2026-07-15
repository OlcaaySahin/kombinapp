import { supabase } from '@/lib/supabase';

export type ProductLinkSuggestion = {
  isClothingItem: boolean;
  slot?: string;
  name?: string;
  color?: string;
  colorName?: string;
  price: number | null;
  currency: string | null;
  imageUrl: string;
  productUrl: string;
};

export type ProductLinkResult =
  | { ok: true; data: ProductLinkSuggestion }
  | { ok: false; reason: 'not_clothing' }
  | { ok: false; reason: 'error'; message: string };

/**
 * fetch-product-link Edge Function'ını çağırır: ürün sayfasının og:/JSON-LD meta verisinden
 * isim/görsel/fiyat çeker, görseli Claude vision ile etiketler. Giyim ürünü değilse
 * (ör. bilgisayar) isClothingItem=false döner, form doldurulmamalı.
 */
export async function fetchProductFromLink(url: string): Promise<ProductLinkResult> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-product-link', { body: { url } });
    if (error) throw error;

    const suggestion = data as ProductLinkSuggestion;
    if (!suggestion.isClothingItem) {
      return { ok: false, reason: 'not_clothing' };
    }
    return { ok: true, data: suggestion };
  } catch (error) {
    return { ok: false, reason: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}
