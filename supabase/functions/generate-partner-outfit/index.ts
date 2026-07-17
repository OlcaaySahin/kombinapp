// Supabase Edge Function: kullanıcının az önce oluşturduğu kombinle UYUMLU, ama
// PARTNERİNİN envanterinden bir kombin önerir (ör. çift olarak birlikte giyilecek).
// ÖNEMLİ: partnerin item'ları genel `items` RLS'i ÜZERİNDEN OKUNMUYOR — ilk denemede
// items tablosuna "kabul edilmiş partner görebilir" policy'si eklenmişti ama bu, user_id
// filtresi olmayan HER sorguyu (useItems() -> Envanter sekmesi, kombin havuzu, vb.)
// etkileyip iki kişinin envanterini birbirine karıştırdı. Bunun yerine: partnerlik önce
// çağıranın kendi JWT'siyle doğrulanıyor (bu satırı SADECE gerçek katılımcılar görebilir),
// sonra partnerin item'ları service-role ile, sadece BU fonksiyon içinde çekiliyor.
// Deploy: supabase functions deploy generate-partner-outfit
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
      internalAnalysis: {
        type: 'string',
        description:
          'İÇ ANALİZ (kullanıcıya GÖSTERİLMEZ): kullanıcının kombini hangi renk paletinde/stilde, partnerin envanterinde buna uyumlu (aynı renk ailesinden veya bilinçli tamamlayıcı kontrast) hangi parçalar var. KISA TUT (en fazla ~80 kelime), ürünlere İSMİYLE değin — ürün id\'lerini bu alana ASLA yazma (id\'ler sadece itemIds alanına).',
      },
      reasoning: {
        type: 'string',
        description:
          'internalAnalysis\'a dayanan, SADECE kullanıcıya gösterilecek 1-2 cümlelik Türkçe gerekçe. Ürün ID\'si veya teknik jargon YAZMA — sadece ürün isimlerini kullan, doğal ve sohbet diliyle yaz.',
      },
      itemIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Partnerin envanterinden seçilen ürün id listesi. En az bir üst_giyim + alt_giyim (ya da tek_parca) + ayakkabi içermeli. Makul bir kombin bulunamıyorsa (sadece izin verildiyse) boş bırakılabilir.',
      },
      compatibility: {
        type: 'integer',
        description:
          'Önerinin hem diğer kişinin kombiniyle hem de bağlamla (mevsim/mekan/saat/konsept) genel uyumunun DÜRÜST tahmini, 0-100 arası. Zorlama bir eşleşmeyse düşük ver (ör. 50), mükemmel uyumsa yüksek (ör. 90+). Asla nezaketen şişirme.',
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
    required: ['internalAnalysis', 'reasoning', 'itemIds', 'compatibility'],
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

  const { referenceItems, context, relaxed } = (await req.json()) as {
    referenceItems?: ReferenceItem[];
    context?: OutfitContext;
    relaxed?: boolean;
  };
  if (!referenceItems || referenceItems.length === 0) {
    return jsonResponse({ error: 'referenceItems gerekli' }, 400);
  }

  // Partnerlik yukarıda ÇAĞIRANIN KENDİ JWT'siyle doğrulandı (yani bu satırı gerçekten
  // sadece iki katılımcıdan biri görebilir) - o yüzden burada service-role ile partnerin
  // item'larını çekmek güvenli. Genel `items` RLS'ini genişletmiyoruz, sadece bu tek,
  // güvenlik kontrolünden geçmiş sorgu için service-role kullanıyoruz.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: partnerItems, error: itemsError } = await adminClient
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

  // İsimleri server-side çekiyoruz (client'a güvenmek yerine) - prompt'ta ve reasoning'de
  // "kullanıcının kombini" gibi jenerik etiketler yerine gerçek isimler kullanılabilsin diye.
  // Sadece İLK isim kullanılıyor ("Olcay Şahin" değil "Olcay") — sohbet dilinde ad+soyad
  // resmi/yapay duruyor. İsteği yapanın adı kayıtlı değilse (e-posta hesaplarında Google'daki
  // gibi otomatik isim gelmiyor) yapay bir "Kullanıcı" etiketi yerine ikinci tekil şahıs
  // ("sen") kullanılıyor — gerekçeyi zaten isteği yapan kişi okuyor.
  const firstNameOf = (fullName: string | null | undefined) => fullName?.trim().split(/\s+/)[0] || null;
  const { data: profileRows } = await adminClient
    .from('profiles')
    .select('id, display_name')
    .in('id', [user.id, partnerId]);
  const requesterFirstName = firstNameOf(profileRows?.find((p) => p.id === user.id)?.display_name);
  const partnerName = firstNameOf(profileRows?.find((p) => p.id === partnerId)?.display_name) || 'Partnerin';
  const requesterName = requesterFirstName ?? 'kombin sahibi';
  const addressingNote = requesterFirstName
    ? `reasoning'de ${requesterFirstName} ve ${partnerName} isimlerini doğal bir şekilde kullanabilirsin (ör. "${requesterFirstName}'in bej-beyaz kombinine, ${partnerName}'in gardırobundan şu parçalar...")`
    : `reasoning'i OKUYAN KİŞİ kombin sahibinin kendisi — ondan bahsederken İKİNCİ TEKİL ŞAHIS kullan ("senin kombinin", "kombinine uyumlu" gibi), asla "kullanıcı" veya "kombin sahibi" deme; ${partnerName}'den isminle bahsedebilirsin`;

  const matchPolicy = relaxed
    ? `6. ESNEK MOD — EN ÖNEMLİ KURAL, 3. kuralı (bağlam uygunluğu) GEÇERSİZ KILAR: ${requesterName} tam uyumlu kombin bulunamayınca "daha az uyumlu da olsa öner" dedi ve düşük uyumu BİLEREK kabul etti. itemIds'i boş bırakmak YASAK — envanter bağlama hiç uymuyor olsa bile eldeki EN YAKIN parçalardan bir kombin kur (en az üst+alt+ayakkabı ya da tek_parca+ayakkabı), compatibility alanında dürüstçe düşük bir değer ver (ör. 40-55) ve reasoning'de hangi açıdan tam oturmadığını kısaca, doğal bir dille belirt (ör. "Kış gecesi için ideal parçalar yok ama eldekilerin en uyumlusu bu"). Reddetmek, kullanıcının açık isteğini yok saymak olur.`
    : `6. Eğer ${partnerName}'in envanterinde hem bağlama hem ${requesterName}'in kombinine MAKUL düzeyde (kabaca %60+) uyan bir kombin oluşturulamıyorsa (ör. kış bağlamında sadece yazlık parçalar varsa), itemIds'i BOŞ bırak ve reasoning'e neden bulamadığını tek cümleyle yaz. Zorlama, kötü bir öneri sunma — kullanıcıya "daha esnek öner" seçeneği ayrıca sunulacak.`;

  const systemPrompt = `Sen deneyimli bir moda stilistisin. Bir çiftin BİRLİKTE giyeceği kombinlerde uyum sağlıyorsun. ${requesterName} zaten bir kombin seçti; senin görevin ${partnerName}'in envanterinden, bu kombinle birlikte giyildiğinde şık ve uyumlu duracak bir kombin seçmek. Kurallara sıkı sıkıya uy:

1. Sadece ${partnerName}'in envanterinde var olan ürün id'lerini kullan, uydurma.
2. "Uyumlu" demek AYNI KIYAFETİ giymek değil — renk paletinin aynı aileden olması (ör. ikisi de nötr+lacivert tonlarında) veya bilinçli, zevkli bir kontrast (ör. biri krem biri lacivert, ikisi de "şık" konseptinde) yeterli. Birbiriyle çatışan parlak renklerden kaçın.
3. BAĞLAM UYGUNLUĞU EN AZ RENK UYUMU KADAR ÖNEMLİ: ${partnerName}'in kombini de verilen bağlama (mevsim/mekan/saat/konsept) uygun olmalı. Mevsim Kış/Sonbahar ise şort, tank top, sandalet gibi yazlık parçalardan kaçın ve uygun bir dış giyim varsa ekle; Yaz ise kalın mont/kaban/bot önerme. Konsept Şık/Özel Gün ise eşofman/spor parçalar yerine şık seçenekleri tercih et. Ürünlerin season alanına da bak.
4. internalAnalysis alanında iç analiz yap (${requesterName}'in kombini ne renkte/stilde, bağlam ne gerektiriyor, ${partnerName}'in envanterinde bunlara en uyumlu hangi parçalar var), sonra reasoning alanına SADECE kullanıcının okuyacağı kısa, doğal bir özet yaz. ${addressingNote}; ürün id'si veya "sahiplik/istek_listesi" gibi teknik alan isimleri ASLA yazma.
5. Eğer ${requesterName}'in kombininin rengi/stili zaten ${partnerName}'in envanteriyle net bir şekilde uyumluysa, reasoning'i uzatma — basit ve doğal bir cümleyle yeterli (ör. "İkiniz de bej-beyaz tonlarında olduğu için doğal bir uyum var.").
${matchPolicy}`;

  const contextNote = context ? `\n\n${requesterName}'in bağlamı (mevsim/mekan/saat/konsept): ${JSON.stringify(context)}` : '';
  const userPrompt = `${requesterName}'in kombini:\n${JSON.stringify(referenceWithColorNames, null, 2)}${contextNote}\n\n${partnerName}'in envanteri:\n${JSON.stringify(partnerItemsWithColorNames, null, 2)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      // generate-outfit'teki max_tokens kesilme bug'ının aynısına karşı önlem (bkz. o dosya).
      max_tokens: 2500,
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
  if (result.stop_reason === 'max_tokens') {
    return jsonResponse({ error: `AI yanıtı eksik döndü (stop_reason: max_tokens)` }, 502);
  }

  const selectedIds: string[] = toolUse.input.itemIds ?? [];
  const selectedItems = partnerItems.filter((item) => selectedIds.includes(item.id));

  // ESNEK modda model yine de boş dönerse (canlı testte görüldü — güçlü talimata rağmen
  // "stilist içgüdüsü" reddedebiliyor), deterministik bir yedek devreye girer: temel
  // slotlardan (üst+alt+ayakkabı ya da tek_parça+ayakkabı) eldeki ilk parçalarla asgari
  // bir kombin kur, uyumu dürüstçe düşük işaretle. Esnek mod kullanıcının açık tercihi,
  // asla boş dönmemeli.
  if (selectedItems.length === 0 && relaxed) {
    const firstOf = (slot: string) => partnerItems.find((item) => item.slot === slot) ?? null;
    const onePiece = firstOf('tek_parca');
    const top = firstOf('ust_giyim');
    const bottom = firstOf('alt_giyim');
    const shoes = firstOf('ayakkabi');
    const fallbackItems = onePiece && shoes ? [onePiece, shoes] : top && bottom && shoes ? [top, bottom, shoes] : null;
    if (fallbackItems) {
      return jsonResponse({
        items: fallbackItems,
        reasoning: `${partnerName}'in envanterinde bu bağlama tam uyan parçalar yok — eldeki parçalarla temel bir kombin oluşturduk, uyum sınırlı olabilir.`,
        pairingNotes: null,
        compatibility: 40,
      });
    }
  }

  // Model ya bilinçli olarak boş bıraktı (strict modda "makul uyum yok" dedi) ya da
  // uydurma id'ler döndürdü (filtre eledi) — iki durumda da client'a yapılandırılmış bir
  // no_match dönüyoruz ki ham hata yerine "daha esnek öner" seçeneği sunulabilsin.
  // (Esnek modda buraya sadece partnerin temel slotları — üst/alt/ayakkabı — hiç yoksa düşülür.)
  if (selectedItems.length === 0) {
    return jsonResponse(
      {
        error: `${partnerName}'in envanterinde bu bağlama yeterince uyumlu bir kombin bulunamadı.`,
        code: 'no_match',
        detail: toolUse.input.reasoning ?? null,
      },
      422
    );
  }

  return jsonResponse({
    items: selectedItems,
    reasoning: toolUse.input.reasoning,
    pairingNotes: toolUse.input.pairingNotes,
    compatibility: typeof toolUse.input.compatibility === 'number' ? toolUse.input.compatibility : null,
  });
});
