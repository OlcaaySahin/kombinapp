// Supabase Edge Function: kullanıcının az önce oluşturduğu kombinle UYUMLU, ama
// PARTNERİNİN envanterinden bir kombin önerir (ör. çift olarak birlikte giyilecek).
// Partnerin envanterini okuyabilmek RLS'teki "Accepted partner can view items" policy'sine
// dayanıyor - çağıranın kendi JWT'siyle (service role YOK) partnerin item'larını çekiyoruz,
// bu sayede yetkilendirme tamamen veritabanı seviyesinde garanti ediliyor.
// Deploy: supabase functions deploy generate-partner-outfit
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

type ReferenceItem = { name: string | null; slot: string; color: string | null };
type OutfitContext = { mevsim: string; mekan: string; saat: string; konsept: string };

const SUGGEST_PARTNER_OUTFIT_TOOL = {
  name: 'suggest_partner_outfit',
  description: "Partnerin envanterinden, kullanıcının kombiniyle UYUMLU (çift olarak birlikte şık duracak) bir kombin öner.",
  input_schema: {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
        description:
          'Önce iç analiz: kullanıcının kombini hangi renk paletinde/stilde, partnerin envanterinde buna uyumlu (aynı renk ailesinden veya bilinçli tamamlayıcı kontrast) hangi parçalar var. Sonra 1-2 cümlelik Türkçe gerekçe.',
      },
      itemIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Partnerin envanterinden seçilen ürün id listesi. En az bir üst_giyim + alt_giyim (ya da tek_parca) + ayakkabi içermeli.',
      },
      pairingNotes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            itemIds: { type: 'array', items: { type: 'string' } },
            note: { type: 'string' },
          },
          required: ['itemIds', 'note'],
        },
        description: 'Opsiyonel, en fazla 2 tane: partnerin kombini ile kullanıcının kombini arasındaki somut uyum notu.',
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

  const { data: partnership } = await supabase
    .from('partnerships')
    .select('requester_id, partner_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .maybeSingle();

  if (!partnership) {
    return jsonResponse({ error: 'Henüz bir partnerin yok.' }, 422);
  }
  const partnerId = partnership.requester_id === user.id ? partnership.partner_id : partnership.requester_id;

  const { referenceItems, context } = (await req.json()) as {
    referenceItems?: ReferenceItem[];
    context?: OutfitContext;
  };
  if (!referenceItems || referenceItems.length === 0) {
    return jsonResponse({ error: 'referenceItems gerekli' }, 400);
  }

  // RLS'teki "Accepted partner can view items" policy'si sayesinde, artık kabul edilmiş
  // bir partnerimiz olduğu için bu sorgu partnerin ürünlerini döndürebiliyor.
  const { data: partnerItems, error: itemsError } = await supabase
    .from('items')
    .select('id, slot, name, color, pattern, season, brand, image_url')
    .eq('user_id', partnerId);

  if (itemsError) {
    return jsonResponse({ error: itemsError.message }, 500);
  }
  if (!partnerItems || partnerItems.length === 0) {
    return jsonResponse({ error: 'Partnerinin envanterinde henüz ürün yok.' }, 422);
  }

  const partnerItemsWithColorNames = partnerItems.map((item) => ({ ...item, colorName: closestColorName(item.color) }));
  const referenceWithColorNames = referenceItems.map((item) => ({ ...item, colorName: closestColorName(item.color) }));

  const systemPrompt = `Sen deneyimli bir moda stilistisin. Bir çiftin BİRLİKTE giyeceği kombinlerde uyum sağlıyorsun. Kullanıcının zaten seçtiği bir kombin var; senin görevin PARTNERİNİN envanterinden, bu kombinle birlikte giyildiğinde şık ve uyumlu duracak bir kombin seçmek. Kurallara sıkı sıkıya uy:

1. Sadece partnerin envanterinde var olan ürün id'lerini kullan, uydurma.
2. "Uyumlu" demek AYNI KIYAFETİ giymek değil — renk paletinin aynı aileden olması (ör. ikisi de nötr+lacivert tonlarında) veya bilinçli, zevkli bir kontrast (ör. biri krem biri lacivert, ikisi de "şık" konseptinde) yeterli. Birbiriyle çatışan parlak renklerden kaçın.
3. Partnerin envanterinde birebir ideal seçenek olmayabilir — en yakın makul alternatifi seç, asla reddetme.
4. reasoning alanında önce iç analiz yap (kullanıcının kombini ne renkte/stilde, partnerin envanterinde buna en uyumlu hangi parçalar var), sonra kısa Türkçe gerekçe yaz.`;

  const contextNote = context ? `\n\nBağlam: ${JSON.stringify(context)}` : '';
  const userPrompt = `Kullanıcının kombini:\n${JSON.stringify(referenceWithColorNames, null, 2)}${contextNote}\n\nPartnerin envanteri:\n${JSON.stringify(partnerItemsWithColorNames, null, 2)}`;

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
      tools: [SUGGEST_PARTNER_OUTFIT_TOOL],
      tool_choice: { type: 'tool', name: 'suggest_partner_outfit' },
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

  const selectedIds: string[] = toolUse.input.itemIds ?? [];
  const selectedItems = partnerItems.filter((item) => selectedIds.includes(item.id));

  return jsonResponse({
    items: selectedItems,
    reasoning: toolUse.input.reasoning,
    pairingNotes: toolUse.input.pairingNotes,
  });
});
