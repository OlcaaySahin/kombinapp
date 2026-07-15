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
    if (error) {
      // supabase-js'in error.message'ı non-2xx yanıtlarda hep ayni jenerik metni verir
      // ("Edge Function returned a non-2xx status code") — asil hata mesaji response
      // govdesinde (error.context), onu okuyup gostermeye calisiyoruz.
      let message = error instanceof Error ? error.message : String(error);
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const body = await context.clone().json();
          if (body?.error) message = body.error;
        } catch {
          // govde JSON degilse jenerik mesaj kalsin
        }
      }
      throw new Error(message);
    }

    const suggestion = data as ProductLinkSuggestion;
    if (!suggestion.isClothingItem) {
      return { ok: false, reason: 'not_clothing' };
    }
    return { ok: true, data: suggestion };
  } catch (error) {
    return { ok: false, reason: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}
