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

type OutfitContext = { mevsim: string; mekan: string; saat: string; konsept: string };

const SUGGEST_OUTFIT_TOOL = {
  name: 'suggest_outfit',
  description: 'Verilen envanterden bağlama en uygun, stil olarak tutarlı kombini öner.',
  input_schema: {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
        description:
          'Önce kısaca iç analizini yap: bu bağlam (mevsim/mekan/saat/konsept) için hangi renk paleti ve parça tipleri uygun, envanterde bunlara en yakın hangi parçalar var, seçtiğin parçaların renkleri/desenleri birbirini nasıl tamamlıyor. Sonra bu analize dayanan, kullanıcıya yönelik 1-2 cümlelik Türkçe bir gerekçe yaz.',
      },
      itemIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'reasoning alanındaki analize göre seçilen ürünlerin id listesi. En az bir üst_giyim + alt_giyim (ya da tek_parca) + ayakkabi içermeli. Mevsim soğuksa ve envanterde uygun bir dis_giyim varsa ekle. İstersen bir taki/tamamlayici/canta ile tamamla.',
      },
    },
    required: ['reasoning', 'itemIds'],
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

  const systemPrompt = `Sen deneyimli bir moda stilistisin. Kullanıcının envanterinden, verilen bağlama (mevsim, mekan, saat, konsept) EN UYGUN ve stil olarak TUTARLI bir kombin seçiyorsun. Kurallara sıkı sıkıya uy:

1. Sadece envanterde var olan ürün id'lerini kullan, envanterde olmayan bir şey uydurma.
2. Renk uyumu: nötr bir taban (siyah/beyaz/gri/bej/lacivert/kahverengi) + en fazla 1-2 vurgu rengi hedefle. Birbiriyle çatışan parlak renkleri (ör. kırmızı+turuncu+mor aynı anda) bir arada kullanma. İki farklı belirgin deseni (ör. çizgili+ekose) aynı kombinde eşleştirme. colorName alanını renk uyumu muhakemesi için kullan.
3. Mevsim uygunluğu: mevsim Kış/Sonbahar ise şort, tank top, sandalet gibi yazlık parçalardan kaçın; mevsim Yaz ise kalın mont/kaban/bot gibi kışlık parçalardan kaçın. Ürünün season alanına da bak.
4. Mekan/konsept uygunluğu: mekan Ofis veya konsept Şık/Özel Gün ise mümkünse eşofman/spor ayakkabı gibi aşırı gündelik parçalar yerine daha şık seçenekleri tercih et. mekan Deniz/Tatil veya konsept Spor ise rahat/hafif parçaları tercih et.
5. Mevsim soğuksa (Kış/Sonbahar) ve envanterde uygun bir dış giyim (mont/kaban/ceket) varsa mutlaka ekle.
6. Envanterde birebir ideal seçenek olmayabilir — böyle durumda envanterdeki EN YAKIN makul alternatifi seç, asla kombin üretmeyi reddetme.
7. Bazı ürünlerin "sahiplik" alanı "istek_listesi" olabilir — bunlar kullanıcının satın almayı düşündüğü ama henüz sahip OLMADIĞI ürünlerdir. Bu ürünleri de kombine dahil edebilirsin (bu, kullanıcıyı satın almaya teşvik etmek için isteniyor), ama mümkünse kombinde en az bir "sahip" olunan parça kalsın. reasoning'de istek_listesi'nden seçtiğin parça(lar) varsa bunu açıkça belirt (ör. "X'i satın alırsan Y ile çok iyi gider").

Önce reasoning alanında kısaca iç analizini yap, sonra itemIds'i o analize göre seç.`;

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
      ? `\n\nKullanıcının bu kombin için özel notu: "${note.trim().slice(0, 300)}". Bu notu diğer bağlam bilgilerinden (mevsim/mekan/saat/konsept) DAHA ÖNCELİKLİ bir sinyal olarak dikkate al, seçimini buna göre şekillendir ve reasoning'de bu nota nasıl karşılık verdiğini belirt.`
      : '';

  const userPrompt = `Bağlam: ${JSON.stringify(context)}\n\nEnvanter:\n${JSON.stringify(itemsWithColorNames, null, 2)}${excludeNote}${profileNote}${userNoteBlock}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
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

  return jsonResponse(toolUse.input);
});
