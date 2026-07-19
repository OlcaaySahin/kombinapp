// Supabase Edge Function: Bavul Hazırla — seyahat için kapsül gardırop (minimum parça,
// maksimum kombin) + gün gün kombin planı üretir.
// Deploy: supabase functions deploy generate-packing-list --project-ref tvjjwpotqeybtkkvvwox
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

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

const SUGGEST_PACKING_TOOL = {
  name: 'suggest_packing_list',
  description:
    'Verilen envanterden seyahat için kapsül gardırop (bavul) ve gün gün kombin planı öner.',
  input_schema: {
    type: 'object',
    properties: {
      internalAnalysis: {
        type: 'string',
        description:
          "İÇ ANALİZ (kullanıcıya GÖSTERİLMEZ): seyahat bağlamına uygun renk paleti + hangi parçalar birden fazla kombinde kullanılabilir. KISA TUT (en fazla ~80 kelime), ürünlere İSMİYLE değin — ürün id'lerini bu alana ASLA yazma.",
      },
      reasoning: {
        type: 'string',
        description:
          'SADECE kullanıcıya gösterilecek 1-2 cümlelik Türkçe özet: bavulun genel mantığı (renk paleti, parçaların ortaklığı). Ürün ID\'si veya teknik jargon YAZMA, doğal konuşma dili kullan.',
      },
      suitcaseItemIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Bavula girecek TÜM ürünlerin id listesi (tekrarsız). Amaç minimum parça ile tüm günleri giydirmek — outfits içinde kullandığın her id burada da olmalı, burada olup hiçbir kombinde kullanılmayan id OLMAMALI.',
      },
      outfits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'number', description: 'Kaçıncı gün (1 tabanlı).' },
            itemIds: {
              type: 'array',
              items: { type: 'string' },
              description:
                "O günün kombinindeki ürün id'leri — hepsi suitcaseItemIds içinden. En az üst+alt (ya da tek_parca) + ayakkabı.",
            },
            note: {
              type: 'string',
              description:
                'Kısa Türkçe not (en fazla 10 kelime): SADECE günün aktivitesini/ambiyansını anlat. YASAK: herhangi bir parça adı, renk+parça ifadesi veya parça listesi (uygulama parçaları zaten ayrıca gösteriyor). KÖTÜ örnek: "siyah tişört, bej chino ile rahat stil". İYİ örnekler: "Gün boyu şehir gezmesine konforlu", "Akşam yemeği için zarif bir seçim", "Plaj günü — hafif ve serin".',
            },
          },
          required: ['day', 'itemIds', 'note'],
        },
        description: 'Her gün için bir kombin — gün sayısı kadar eleman.',
      },
    },
    required: ['internalAnalysis', 'reasoning', 'suitcaseItemIds', 'outfits'],
  },
};

type PackingRequest = {
  days: number;
  mevsim: string;
  hava?: string;
  konsept: string;
  note?: string;
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

  // Diğer AI fonksiyonlarıyla aynı saatlik rate-limit havuzu (ai_call, 30/saat).
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

  const body = (await req.json()) as PackingRequest;
  const days = Math.min(Math.max(Math.round(body.days ?? 0), 1), 10);
  if (!days || !body.mevsim || !body.konsept) {
    return jsonResponse({ error: 'Eksik parametre: days/mevsim/konsept zorunlu.' }, 400);
  }

  // Arşivlenmiş ürünler bavula hiç girmez (bavulda "dahil et" seçeneği bilinçli yok).
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, slot, name, color, pattern, season, brand')
    .eq('user_id', user.id)
    .eq('is_archived', false);

  if (itemsError) {
    return jsonResponse({ error: itemsError.message }, 500);
  }

  if (!items || items.length < 3) {
    return jsonResponse({ error: 'Bavul hazırlamak için envanterde en az birkaç ürün olmalı.' }, 422);
  }

  const itemsWithColorNames = items.map((item) => ({ ...item, colorName: closestColorName(item.color) }));

  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, daily_style')
    .eq('id', user.id)
    .maybeSingle();

  const systemPrompt = `Sen deneyimli bir moda stilisti ve KAPSÜL GARDIROP uzmanısın. Kullanıcı seyahate çıkıyor; envanterinden MİNİMUM parça ile ${days} günü giydirecek bir bavul ve gün gün kombin planı hazırlıyorsun. Kurallara sıkı uy:

1. Sadece envanterde var olan ürün id'lerini kullan, asla uydurma.
2. KAPSÜL prensibi — bavulu KÜÇÜK tut: aynı üst/alt/ayakkabıyı birden fazla günde FARKLI kombinasyonlarla tekrar kullan. Hedef: bavuldaki toplam parça sayısı gün sayısının ~2 katını geçmesin (ör. 4 gün için en fazla ~8-9 parça). Her parça mümkünse en az 2 kombinde yer alsın; ayakkabı sayısını 1-2 ile sınırla.
3. Renk uyumu: birbiriyle karışıp eşleşebilen dar bir palet seç (nötr taban + 1-2 vurgu) — kapsül gardırobun özü budur. colorName alanını kullan.
4. Mevsim/hava uygunluğu: mevsim ve (verildiyse) hava alanına uy — Kış/Sonbahar'da yazlık parçalardan kaçın, Yaz'da kışlıklardan kaçın; Yağmurlu/Karlı ise dayanıklı kapalı ayakkabı ve dış giyim ekle, süetten kaçın. Soğuk mevsimde uygun dış giyim varsa bavula ekle (tek dış giyim yeterli, her gün aynısı giyilebilir).
5. Konsept uygunluğu: konsept Şık ise en az bir şık kombin olsun; Spor ise rahat parçalara ağırlık ver; Karışık ise günleri çeşitlendir.
6. Her günün kombini en az üst+alt (ya da tek_parca) + ayakkabı içersin. Takı/çanta/aksesuar eklemek serbest ama bavulu şişirme. Gün notlarında HİÇBİR parça adı veya renk+parça ifadesi GEÇMEYECEK ("siyah tişört" gibi) — not yalnızca günün aktivitesini/ambiyansını anlatır, parça listesi uygulamada zaten ayrı görünüyor.
7. Envanter idealden uzaksa en yakın makul alternatifleri seç, asla reddetme.

Önce internalAnalysis'ta kısa iç analizini yap, sonra suitcaseItemIds + outfits'i o analize göre kur, en son reasoning'e kullanıcıya yönelik doğal 1-2 cümle yaz (ürün id'si ve teknik alan adı YAZMA).`;

  const profileNote =
    profile && (profile.gender || profile.daily_style)
      ? `\n\nKullanıcı profili: ${JSON.stringify({ cinsiyet: profile.gender, gunluk_stil: profile.daily_style })}. Seçimini bu tercihlere göre hafifçe yönlendir.`
      : '';

  const userNoteBlock =
    body.note && body.note.trim()
      ? `\n\nKullanıcının seyahat notu: "${body.note.trim().slice(0, 300)}". Bunu öncelikli sinyal olarak dikkate al (ör. "iş gezisi" diyorsa şık ağırlıklı seç) ama notu tırnak içinde tekrar etme.`
      : '';

  const userPrompt = `Seyahat bağlamı: ${JSON.stringify({
    gun_sayisi: days,
    mevsim: body.mevsim,
    hava: body.hava ?? 'belirtilmedi',
    konsept: body.konsept,
  })}\n\nEnvanter:\n${JSON.stringify(itemsWithColorNames, null, 2)}${profileNote}${userNoteBlock}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      // Gün başına bir kombin + bavul listesi üretiliyor — generate-outfit'ten daha uzun çıktı.
      // (max_tokens dersi: şemaya alan eklerken bütçeyi birlikte düşün.)
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [SUGGEST_PACKING_TOOL],
      tool_choice: { type: 'tool', name: 'suggest_packing_list' },
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

  if (
    result.stop_reason === 'max_tokens' ||
    !Array.isArray(toolUse.input.suitcaseItemIds) ||
    !Array.isArray(toolUse.input.outfits) ||
    !toolUse.input.reasoning
  ) {
    return jsonResponse(
      { error: `AI yanıtı eksik döndü (stop_reason: ${result.stop_reason ?? 'bilinmiyor'})` },
      502
    );
  }

  // Sunucu tarafı tutarlılık: sadece gerçekten envanterde olan id'ler geçsin; kombinlerde
  // kullanılan her id bavulda da olsun (model kuralı ihlal ederse burada düzeltilir).
  const validIds = new Set(items.map((item) => item.id));
  const outfits = (toolUse.input.outfits as { day: number; itemIds: string[]; note?: string }[])
    .map((outfit) => ({
      day: outfit.day,
      itemIds: (outfit.itemIds ?? []).filter((id) => validIds.has(id)),
      note: outfit.note ?? '',
    }))
    .filter((outfit) => outfit.itemIds.length > 0)
    .sort((a, b) => a.day - b.day);
  const suitcaseSet = new Set<string>(
    (toolUse.input.suitcaseItemIds as string[]).filter((id) => validIds.has(id))
  );
  for (const outfit of outfits) {
    for (const id of outfit.itemIds) suitcaseSet.add(id);
  }

  if (outfits.length === 0 || suitcaseSet.size === 0) {
    return jsonResponse({ error: 'AI geçerli bir bavul planı üretemedi, lütfen tekrar dene.' }, 502);
  }

  return jsonResponse({
    suitcaseItemIds: [...suitcaseSet],
    outfits,
    reasoning: toolUse.input.reasoning,
  });
});
