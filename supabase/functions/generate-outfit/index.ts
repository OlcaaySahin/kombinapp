// Supabase Edge Function: envanterden bağlama uygun kombin önerisi üretir.
// Deploy: supabase functions deploy generate-outfit
// Gizli anahtar: supabase secrets set --env-file supabase/.env
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Maliyet-etkin varsayılan; kalite yetersiz kalırsa 'claude-sonnet-5' ile değiştir.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { context } = (await req.json()) as { context: OutfitContext };

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, slot, name, color, pattern, season, brand')
    .eq('user_id', user.id);

  if (itemsError) {
    return new Response(JSON.stringify({ error: itemsError.message }), { status: 500 });
  }

  if (!items || items.length === 0) {
    return new Response(JSON.stringify({ error: 'Envanterde ürün yok' }), { status: 422 });
  }

  const systemPrompt =
    'Sen bir moda stilistisin. Kullanıcının envanterinden, verilen bağlama (mevsim, mekan, saat, konsept) en uygun kombini seçiyorsun. Sadece envanterde var olan ürün id\'lerini kullan. Renk uyumuna ve konsepte dikkat et.';

  const userPrompt = `Bağlam: ${JSON.stringify(context)}\n\nEnvanter:\n${JSON.stringify(items, null, 2)}`;

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
    return new Response(JSON.stringify({ error: `Claude API hatası: ${errorText}` }), { status: 502 });
  }

  const result = await response.json();
  const toolUse = result.content?.find((block: { type: string }) => block.type === 'tool_use');

  if (!toolUse) {
    return new Response(JSON.stringify({ error: 'AI yanıtı ayrıştırılamadı' }), { status: 502 });
  }

  return new Response(JSON.stringify(toolUse.input), {
    headers: { 'content-type': 'application/json' },
  });
});
