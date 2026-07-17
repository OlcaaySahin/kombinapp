// Supabase Edge Function: envanterden bağlama uygun kombin önerisi üretir.
// Deploy: supabase functions deploy generate-outfit
// Gizli anahtar: supabase secrets set --env-file supabase/.env
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Maliyet-etkin varsayılan; kalite yetersiz kalırsa 'claude-sonnet-5' ile değiştir.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

// Web (npm run web) dahil her client'tan çağrılabilmesi için CORS gerekli.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

// Ürünün hex renk kodunu Claude'un daha güvenilir akıl yürütebildiği bir Türkçe
// renk adına çevirir — ham hex kodu ("#2C3E63") renk uyumu muhakemesi için zayıf bir sinyal.
const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'beyaz', hex: '#F5F5F5' },
  { name: 'siyah', hex: '#1C1C1E' },
  { name: 'gri', hex: '#8E8E93' },
  { name: 'bej', hex: '#D8C3A5' },
  { name: 'kahverengi', hex: '#6B4226' },
  { name: 'lacivert', hex: '#2C3E63' },
  { name: 'mavi', hex: '#3461FD' },
  { name: 'yeşil', hex: '#3FA34D' },
  { name: 'sarı', hex: '#E8B923' },
  { name: 'turuncu', hex: '#F2762E' },
  { name: 'kırmızı', hex: '#E4463A' },
  { name: 'pembe', hex: '#E88BA0' },
  { name: 'mor', hex: '#8B3FE8' },
  { name: 'bordo', hex: '#722F37' },
  { name: 'haki', hex: '#7A7256' },
  { name: 'altın', hex: '#D4AF37' },
  { name: 'gümüş', hex: '#C0C0C0' },
  { name: 'krem', hex: '#E8E0D0' },
];

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16),
  };
}

function closestColorName(hex: string | null): string | null {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return null;
  const target = hexToRgb(hex);
  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const candidate of NAMED_COLORS) {
    const rgb = hexToRgb(candidate.hex);
    const dist = (rgb.r - target.r) ** 2 + (rgb.g - target.g) ** 2 + (rgb.b - target.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best.name;
}

type OutfitContext = { mevsim: string; hava?: string; mekan: string; saat: string; konsept: string };

const SUGGEST_OUTFIT_TOOL = {
  name: 'suggest_outfit',
  description: 'Verilen envanterden bağlama en uygun, stil olarak tutarlı kombini öner.',
  input_schema: {
    type: 'object',
    properties: {
      internalAnalysis: {
        type: 'string',
        description:
          'İÇ ANALİZ (kullanıcıya GÖSTERİLMEZ, sadece senin düşünme alanın): bu bağlam için hangi renk paleti ve parça tipleri uygun, envanterde bunlara en yakın hangi parçalar var, seçimlerin birbirini nasıl tamamlıyor. KISA TUT (en fazla ~80 kelime), ürünlere İSMİYLE değin — ürün id\'lerini bu alana ASLA yazma (id\'ler sadece itemIds alanına, burada yer kaplamasın).',
      },
      reasoning: {
        type: 'string',
        description:
          'internalAnalysis\'a dayanan, SADECE kullanıcıya gösterilecek 1-2 cümlelik Türkçe gerekçe. Ürün ID\'si veya teknik jargon YAZMA — sadece ürün isimlerini (ör. "bordo triko") ve günlük dili kullan, sanki kullanıcıyla sohbet ediyormuşsun gibi doğal yaz.',
      },
      itemIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'internalAnalysis\'taki analize göre seçilen ürünlerin id listesi. En az bir üst_giyim + alt_giyim (ya da tek_parca) + ayakkabi içermeli. Mevsim soğuksa ve envanterde uygun bir dis_giyim varsa ekle. İstersen bir taki/tamamlayici/canta ile tamamla.',
      },
      pairingNotes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            itemIds: {
              type: 'array',
              items: { type: 'string' },
              description: "Bu notun bahsettiği 2 (bazen daha fazla) ürünün id'leri, itemIds listesinden.",
            },
            note: {
              type: 'string',
              description:
                'Kısa (en fazla 12-15 kelime), somut bir Türkçe stil notu, ör. "Beyaz crop ile lacivert pantolonun renk kontrastı şık bir görünüm sağlıyor."',
            },
          },
          required: ['itemIds', 'note'],
        },
        description:
          'Opsiyonel, en fazla 3 tane: seçtiğin parçalar arasındaki somut ilişkiler (renk uyumu, doku/desen eşleşmesi, aksesuarın tamamlayıcılığı vb.). Genel geçer laf etme, spesifik ol.',
      },
    },
    required: ['internalAnalysis', 'reasoning', 'itemIds'],
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // Basit saatlik rate-limit: ucretli Claude cagrilarinin kotuye kullanimini onlemek icin
  // (butun user'lar icin cok cömert bir tavan, gercek kullanimda hic tetiklenmemesi beklenir).
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCallCount } = await supabase
    .from('generation_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'ai_call')
    .gte('created_at', oneHourAgo);
  if ((recentCallCount ?? 0) >= 30) {
    return jsonResponse({ error: 'Çok fazla istek gönderildi, lütfen birazdan tekrar dene.' }, 429);
  }
  await supabase.from('generation_events').insert({ user_id: user.id, type: 'ai_call' });

  const { context, excludeItemIds, note, includeWishlist } = (await req.json()) as {
    context: OutfitContext;
    excludeItemIds?: string[];
    note?: string;
    includeWishlist?: boolean;
  };

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, slot, name, color, pattern, season, brand')
    .eq('user_id', user.id);

  if (itemsError) {
    return jsonResponse({ error: itemsError.message }, 500);
  }

  if (!items || items.length === 0) {
    return jsonResponse({ error: 'Envanterde ürün yok' }, 422);
  }

  let wishlistItems: typeof items = [];
  if (includeWishlist) {
    const { data: wishlistData, error: wishlistError } = await supabase
      .from('wishlist_items')
      .select('id, slot, name, color, pattern, season, brand')
      .eq('user_id', user.id);
    if (wishlistError) {
      return jsonResponse({ error: wishlistError.message }, 500);
    }
    wishlistItems = wishlistData ?? [];
  }

  const itemsWithColorNames = [
    ...items.map((item) => ({ ...item, colorName: closestColorName(item.color), sahiplik: 'sahip' })),
    ...wishlistItems.map((item) => ({ ...item, colorName: closestColorName(item.color), sahiplik: 'istek_listesi' })),
  ];

  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, daily_style')
    .eq('id', user.id)
    .maybeSingle();

  // Rating -> kisisellestirme: kullanicinin yuksek puan verdigi (4-5 yildiz) gecmis
  // kombinlerdeki renk/marka tercihlerini cikarip hafif bir sinyal olarak prompt'a ekle.
  // En az 3 puanli kombin olmadan (yetersiz veri) hic devreye girmez.
  const { data: ratedOutfitRows } = await supabase
    .from('outfits')
    .select('rating, outfit_items(items(color, brand))')
    .eq('user_id', user.id)
    .gte('rating', 4)
    .order('rating', { ascending: false })
    .limit(15);

  type RatedOutfitRow = { rating: number; outfit_items: { items: { color: string | null; brand: string | null } | null }[] };
  const ratedRows = (ratedOutfitRows ?? []) as unknown as RatedOutfitRow[];

  const colorCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();
  for (const row of ratedRows) {
    for (const entry of row.outfit_items) {
      const item = entry.items;
      if (!item) continue;
      const colorName = closestColorName(item.color);
      if (colorName) colorCounts.set(colorName, (colorCounts.get(colorName) ?? 0) + 1);
      if (item.brand) brandCounts.set(item.brand, (brandCounts.get(item.brand) ?? 0) + 1);
    }
  }

  const topColors = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
  const topBrands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name);

  const systemPrompt = `Sen deneyimli bir moda stilistisin. Kullanıcının envanterinden, verilen bağlama (mevsim, hava durumu, mekan, saat, konsept) EN UYGUN ve stil olarak TUTARLI bir kombin seçiyorsun. Kurallara sıkı sıkıya uy:

1. Sadece envanterde var olan ürün id'lerini kullan, envanterde olmayan bir şey uydurma.
2. Renk uyumu: nötr bir taban (siyah/beyaz/gri/bej/lacivert/kahverengi) + en fazla 1-2 vurgu rengi hedefle. Birbiriyle çatışan parlak renkleri (ör. kırmızı+turuncu+mor aynı anda) bir arada kullanma. İki farklı belirgin deseni (ör. çizgili+ekose) aynı kombinde eşleştirme. colorName alanını renk uyumu muhakemesi için kullan.
3. Mevsim uygunluğu: mevsim Kış/Sonbahar ise şort, tank top, sandalet gibi yazlık parçalardan kaçın; mevsim Yaz ise kalın mont/kaban/bot gibi kışlık parçalardan kaçın. Ürünün season alanına da bak. Bağlamda "hava" alanı varsa ona da uy: Yağmurlu veya Karlı ise süet gibi hassas malzemeli parçalardan ve açık ayakkabılardan (sandalet/terlik) kaçın, dayanıklı/kapalı ayakkabı tercih et; Karlı ise sıcak tutan parçalara öncelik ver; Rüzgarlı ise çok ince/uçuşan parçalar yerine daha oturaklı parçaları seç; Güneşli ise mevsime uygun hafif ve açık renkli seçenekler öne çıkabilir.
4. Mekan/konsept uygunluğu: mekan Ofis veya konsept Şık/Özel Gün ise mümkünse eşofman/spor ayakkabı gibi aşırı gündelik parçalar yerine daha şık seçenekleri tercih et. mekan Deniz/Tatil veya konsept Spor ise rahat/hafif parçaları tercih et.
5. Mevsim soğuksa (Kış/Sonbahar) ve envanterde uygun bir dış giyim (mont/kaban/ceket) varsa mutlaka ekle. Hava Yağmurlu/Karlı ise mevsimden bağımsız olarak da uygun bir dış giyim varsa ekle.
6. Envanterde birebir ideal seçenek olmayabilir — böyle durumda envanterdeki EN YAKIN makul alternatifi seç, asla kombin üretmeyi reddetme.
7. Bazı ürünlerin "sahiplik" alanı "istek_listesi" olabilir — bunlar kullanıcının satın almayı düşündüğü ama henüz sahip OLMADIĞI ürünlerdir. Bu ürünleri de kombine dahil edebilirsin (bu, kullanıcıyı satın almaya teşvik etmek için isteniyor), ama mümkünse kombinde en az bir "sahip" olunan parça kalsın. Eğer istek_listesi'nden bir parça seçtiysen reasoning'de bunu doğal bir cümleyle belirt (ör. "X'i alırsan Y ile çok iyi gider") — "sahiplik", "sahip", "istek_listesi" gibi teknik/veri alanı isimlerini KELİMESİ KELİMESİNE ASLA yazma, bunlar sadece senin iç analizin için, kullanıcıya yönelik cümlede yeri yok.
8. pairingNotes alanında (opsiyonel, en fazla 3 tane) seçtiğin parçalar arasındaki somut ilişkileri kısaca açıkla — renk uyumu, doku/desen eşleşmesi, aksesuarın tamamlayıcılığı gibi. Genel geçer laf etme ("bu ikisi güzel gider" gibi), spesifik ol ("X'in Y tonu Z'nin rengiyle aynı ailede" gibi).

Önce internalAnalysis alanında iç analizini yap, sonra itemIds'i o analize göre seç, sonra reasoning alanına SADECE kullanıcının okuyacağı kısa/doğal bir özet yaz. reasoning alanında ASLA: ürün id'si, "sahiplik/sahip/istek_listesi" gibi veri alanı isimleri, ya da kullanıcının notunu tırnak içinde tekrar etme (uygulama notu zaten ayrı gösteriyor, sen sadece notun isteğine nasıl karşılık verdiğini doğal bir cümleyle anlat). En son pairingNotes ile detaylandır.`;

  const excludeNote =
    excludeItemIds && excludeItemIds.length > 0
      ? `\n\nÖnceki öneri şu ürün id'lerini içeriyordu: ${JSON.stringify(excludeItemIds)}. Kullanıcı "Tekrar Dene" dedi, mümkünse FARKLI bir ürün kombinasyonu öner (aynısını tekrar önerme). Envanterde gerçekten başka uygun seçenek yoksa aynısını tekrarlayabilirsin.`
      : '';

  const profileNote =
    profile && (profile.gender || profile.daily_style)
      ? `\n\nKullanıcı profili: ${JSON.stringify({ cinsiyet: profile.gender, gunluk_stil: profile.daily_style })}. Seçimini bu tercihlere göre hafifçe yönlendir (ör. "Rahat" diyorsa daha spor/gündelik parçaları öne çıkar).`
      : '';

  const userNoteBlock =
    note && note.trim()
      ? `\n\nKullanıcının bu kombin için özel notu: "${note.trim().slice(0, 300)}". Bu notu diğer bağlam bilgilerinden (mevsim/mekan/saat/konsept) DAHA ÖNCELİKLİ bir sinyal olarak dikkate al, seçimini buna göre şekillendir. reasoning'de notu tırnak içinde TEKRAR ETME veya "özel notun" gibi etiketleme — sadece isteğine nasıl karşılık verdiğini doğal bir cümleyle anlat (ör. "Rahat bir görünüm istediğin için..." gibi, "notunda X dedin" demeden).`
      : '';

  const ratingNote =
    ratedRows.length >= 3 && (topColors.length > 0 || topBrands.length > 0)
      ? `\n\nKullanıcının geçmişte yüksek puan verdiği (4-5 yıldız) kombinlerde öne çıkan tercihler: ${
          topColors.length ? `renkler: ${topColors.join(', ')}` : ''
        }${topColors.length && topBrands.length ? '; ' : ''}${
          topBrands.length ? `markalar: ${topBrands.join(', ')}` : ''
        }. Mümkünse bu tercihlere hafifçe öncelik ver — ama bağlama uygunluk (mevsim/mekan/konsept) her zaman daha önemli, sırf geçmiş tercih diye uygunsuz bir parça seçme.`
      : '';

  const userPrompt = `Bağlam: ${JSON.stringify(context)}\n\nEnvanter:\n${JSON.stringify(itemsWithColorNames, null, 2)}${excludeNote}${profileNote}${userNoteBlock}${ratingNote}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      // 1024 yetersizdi: internalAnalysis + UUID listeleri büyük envanterde çıktıyı
      // yarıda kestiriyordu (reasoning/itemIds eksik dönüyordu) — canlı yeniden üretildi.
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [SUGGEST_OUTFIT_TOOL],
      tool_choice: { type: 'tool', name: 'suggest_outfit' },
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

  // Çıktı token limitine takılırsa alanlar sessizce eksik dönebiliyor — bunu maskelenmiş
  // bir "envanter eşleşmedi" hatası yerine açık, teşhis edilebilir bir hata yap.
  if (result.stop_reason === 'max_tokens' || !Array.isArray(toolUse.input.itemIds) || !toolUse.input.reasoning) {
    return jsonResponse(
      { error: `AI yanıtı eksik döndü (stop_reason: ${result.stop_reason ?? 'bilinmiyor'})` },
      502
    );
  }

  return jsonResponse({
    itemIds: toolUse.input.itemIds,
    reasoning: toolUse.input.reasoning,
    pairingNotes: toolUse.input.pairingNotes,
  });
});
