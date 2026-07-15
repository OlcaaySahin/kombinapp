// Supabase Edge Function: bir e-ticaret ürün linkinden (og:tags / JSON-LD Product şeması)
// isim/görsel/fiyat çeker, görseli Claude vision ile etiketler ve giyim ürünü olup
// olmadığını (alakasız ürünleri reddetmek için) belirler.
// Deploy: supabase functions deploy fetch-product-link
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// Maliyet-etkin varsayılan; kalite yetersiz kalırsa 'claude-sonnet-5' ile değiştir.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Sayfa isteği için normal bir tarayıcı User-Agent'ı kullanılıyor — bot korumasını
// aşmaya çalışmıyoruz, sadece sitelerin zaten herkese açık yayınladığı og:/JSON-LD
// meta verisini (link önizlemeleri için var olan aynı veri) okuyoruz.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

function extractJsonLdProduct(html: string): Record<string, unknown> | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        if (candidate?.['@type'] === 'Product') return candidate;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const propMatch = tag.match(/property=["']([^"']+)["']/i) ?? tag.match(/name=["']([^"']+)["']/i);
    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (propMatch && contentMatch) {
      result[propMatch[1]] = contentMatch[1];
    }
  }
  return result;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const TAG_PRODUCT_TOOL = {
  name: 'tag_product',
  description: 'Bir ürün görselini analiz edip giyim/aksesuar envanteri için etiketler üret.',
  input_schema: {
    type: 'object',
    properties: {
      isClothingItem: {
        type: 'boolean',
        description:
          'Bu görsel giyim, ayakkabı, çanta, takı veya aksesuar kategorisinde bir ürün mü? Bilgisayar, elektronik, mobilya, gıda vb. alakasız bir ürünse false.',
      },
      slot: {
        type: 'string',
        enum: ['ust_giyim', 'alt_giyim', 'tek_parca', 'dis_giyim', 'ayakkabi', 'canta', 'taki', 'tamamlayici'],
        description: 'isClothingItem false ise boş bırakılabilir.',
      },
      name: { type: 'string', description: 'Kısa, Türkçe ürün adı, örn. "Siyah Deri Ceket". isClothingItem false ise boş bırakılabilir.' },
      color: { type: 'string', description: 'Baskın rengin hex kodu, örn. #1C1C1E. isClothingItem false ise boş bırakılabilir.' },
      colorName: { type: 'string', description: 'Rengin Türkçe adı, örn. Siyah. isClothingItem false ise boş bırakılabilir.' },
    },
    required: ['isClothingItem'],
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const { url } = (await req.json()) as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    return jsonResponse({ error: 'Geçerli bir ürün linki gerekli' }, 400);
  }

  // Bazı siteler ürün sayfasını bazen tam sunucu-taraflı render edilmiş (JSON-LD dolu)
  // bazen sadece istemci tarafında hidrate edilecek boş bir "shell" olarak döndürüyor.
  // Bilinçli olarak SADECE 1 nazik tekrar deneniyor, agresif retry/cache-busting YAPILMIYOR —
  // önceki (4 deneme + sahte cache-buster query param) sürüm otomasyon gibi göründüğü için
  // muhtemelen bazı sitelerde durumu kötüleştirdi (2026-07-15, kullanıcı cihazda gözlemledi).
  // Bir site açıkça engellerse (403 vb.) hiç tekrar denenmiyor — bu net bir "hayır" sinyali,
  // etrafından dolaşmaya çalışmıyoruz.
  const MAX_ATTEMPTS = 2;
  let scrapedImage: string | null = null;
  let product: Record<string, unknown> | null = null;
  let meta: Record<string, string> = {};

  for (let attempt = 0; attempt < MAX_ATTEMPTS && !scrapedImage; attempt++) {
    let html: string;
    try {
      const pageRes = await fetch(url, { headers: BROWSER_HEADERS, cache: 'no-store' });
      if (!pageRes.ok) return jsonResponse({ error: `Sayfa alınamadı (HTTP ${pageRes.status})` }, 502);
      html = await pageRes.text();
    } catch {
      return jsonResponse({ error: 'Sayfaya erişilemedi' }, 502);
    }

    product = extractJsonLdProduct(html);
    meta = extractMetaTags(html);

    const productImage = product?.image as { contentUrl?: string | string[] } | string | undefined;
    scrapedImage =
      (typeof productImage === 'string'
        ? productImage
        : Array.isArray(productImage?.contentUrl)
          ? productImage?.contentUrl?.[0]
          : productImage?.contentUrl) ??
      meta['og:image'] ??
      null;

    if (!scrapedImage && attempt < MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  const scrapedName = (product?.name as string | undefined) ?? meta['og:title'] ?? null;
  const scrapedColor = (product?.color as string | undefined) ?? null;
  const offers = product?.offers as { price?: string; priceCurrency?: string } | undefined;
  const scrapedPrice = offers?.price ? Number(offers.price) : null;
  const scrapedCurrency = offers?.priceCurrency ?? null;

  if (!scrapedImage) {
    return jsonResponse({ error: 'Sayfada ürün görseli bulunamadı. Bu site şu an desteklenmiyor olabilir, elle doldurabilirsin.' }, 422);
  }

  let imageBase64: string;
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
  try {
    const imgRes = await fetch(scrapedImage);
    if (!imgRes.ok) throw new Error('image fetch failed');
    const contentType = imgRes.headers.get('content-type') ?? '';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('webp')) mediaType = 'image/webp';
    const buffer = await imgRes.arrayBuffer();
    imageBase64 = toBase64(new Uint8Array(buffer));
  } catch {
    return jsonResponse({ error: 'Ürün görseli indirilemedi' }, 502);
  }

  const hintText = `Bu görsel bir e-ticaret ürün sayfasından alındı. Sayfadaki ürün adı: "${scrapedName ?? 'bilinmiyor'}". Sayfadaki renk bilgisi: "${scrapedColor ?? 'bilinmiyor'}". Bu bilgileri ipucu olarak kullanabilirsin ama asıl kararı görseli analiz ederek ver.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: hintText },
          ],
        },
      ],
      tools: [TAG_PRODUCT_TOOL],
      tool_choice: { type: 'tool', name: 'tag_product' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return jsonResponse({ error: `Claude API hatası: ${errorText}` }, 502);
  }

  const result = await response.json();
  const toolUse = result.content?.find((block: { type: string }) => block.type === 'tool_use');

  if (!toolUse) {
    return jsonResponse({ error: 'AI yanıtı ayrıştırılamadı' }, 502);
  }

  return jsonResponse({
    ...toolUse.input,
    price: scrapedPrice,
    currency: scrapedCurrency,
    imageUrl: scrapedImage,
    productUrl: url,
  });
});
