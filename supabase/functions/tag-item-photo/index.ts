// Supabase Edge Function: bir kıyafet/aksesuar fotoğrafını Claude vision ile otomatik etiketler.
// Deploy: supabase functions deploy tag-item-photo
// Gizli anahtar: supabase secrets set --env-file supabase/.env
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// Maliyet-etkin varsayılan; kalite yetersiz kalırsa 'claude-sonnet-5' ile değiştir.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { imageBase64, mediaType } = (await req.json()) as {
    imageBase64: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  };

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 gerekli' }), { status: 400 });
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
