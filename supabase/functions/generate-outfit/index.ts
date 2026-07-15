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

type OutfitContext = { mevsim: string; mekan: string; saat: string; konsept: string };

const SUGGEST_OUTFIT_TOOL = {
  name: 'suggest_outfit',
  description: 'Verilen envanterden bağlama en uygun kombini öner.',
  input_schema: {
    type: 'object',
    properties: {
      itemIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Seçilen ürünlerin id listesi. En az bir üst_giyim + alt_giyim (ya da tek_parca) + ayakkabi içermeli, istersen bir takı/tamamlayıcı ekle.',
      },
      reasoning: {
        type: 'string',
        description: 'Bu kombinin bağlama neden uygun olduğuna dair kısa (1-2 cümle) Türkçe açıklama.',
      },
    },
    required: ['itemIds', 'reasoning'],
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

  const { context, excludeItemIds } = (await req.json()) as {
    context: OutfitContext;
    excludeItemIds?: string[];
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, daily_style')
    .eq('id', user.id)
    .maybeSingle();

  const systemPrompt =
    'Sen bir moda stilistisin. Kullanıcının envanterinden, verilen bağlama (mevsim, mekan, saat, konsept) en uygun kombini seçiyorsun. Sadece envanterde var olan ürün id\'lerini kullan. Renk uyumuna ve konsepte dikkat et.';

  const excludeNote =
    excludeItemIds && excludeItemIds.length > 0
      ? `\n\nÖnceki öneri şu ürün id'lerini içeriyordu: ${JSON.stringify(excludeItemIds)}. Kullanıcı "Tekrar Dene" dedi, mümkünse FARKLI bir ürün kombinasyonu öner (aynısını tekrar önerme). Envanterde gerçekten başka uygun seçenek yoksa aynısını tekrarlayabilirsin.`
      : '';

  const profileNote =
    profile && (profile.gender || profile.daily_style)
      ? `\n\nKullanıcı profili: ${JSON.stringify({ cinsiyet: profile.gender, gunluk_stil: profile.daily_style })}. Seçimini bu tercihlere göre hafifçe yönlendir (ör. "Rahat" diyorsa daha spor/gündelik parçaları öne çıkar).`
      : '';

  const userPrompt = `Bağlam: ${JSON.stringify(context)}\n\nEnvanter:\n${JSON.stringify(items, null, 2)}${excludeNote}${profileNote}`;

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
