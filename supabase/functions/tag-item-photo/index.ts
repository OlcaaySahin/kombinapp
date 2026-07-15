// Supabase Edge Function: bir kıyafet/aksesuar fotoğrafını Claude vision ile otomatik etiketler.
// Deploy: supabase functions deploy tag-item-photo
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

const TAG_ITEM_TOOL = {
  name: 'tag_item',
  description: 'Bir kıyafet/aksesuar fotoğrafını analiz edip envanter etiketleri üret.',
  input_schema: {
    type: 'object',
    properties: {
      slot: {
        type: 'string',
        enum: [
          'ust_giyim',
          'alt_giyim',
          'tek_parca',
          'dis_giyim',
          'ayakkabi',
          'canta',
          'taki',
          'tamamlayici',
        ],
      },
      name: { type: 'string', description: 'Kısa, Türkçe ürün adı, örn. "Mavi Kot Ceket"' },
      color: { type: 'string', description: 'Baskın rengin hex kodu, örn. #3461FD' },
      colorName: { type: 'string', description: 'Rengin Türkçe adı, örn. Mavi' },
      pattern: { type: 'string', description: 'Desen, örn. Düz, Çizgili, Çiçekli' },
      season: {
        type: 'array',
        items: { type: 'string', enum: ['ilkbahar', 'yaz', 'sonbahar', 'kis', 'tum_mevsimler'] },
      },
    },
    required: ['slot', 'name', 'color', 'colorName', 'season'],
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

  // Basit saatlik rate-limit: ucretli Claude vision cagrilarinin kotuye kullanimini onlemek icin.
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

  const { imageBase64, mediaType } = (await req.json()) as {
    imageBase64: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  };

  if (!imageBase64) {
    return jsonResponse({ error: 'imageBase64 gerekli' }, 400);
  }

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
            { type: 'text', text: 'Bu kıyafet/aksesuar fotoğrafını etiketle.' },
          ],
        },
      ],
      tools: [TAG_ITEM_TOOL],
      tool_choice: { type: 'tool', name: 'tag_item' },
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
