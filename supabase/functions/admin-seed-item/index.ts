// Supabase Edge Function: belirli bir kullaniciya, verilen bir gorsel URL'inden indirip
// Storage'a yukleyerek envanter urunu ekler. Sadece manuel/admin test-veri doldurma icin -
// paylasilmayan bir sirri (ADMIN_SEED_SECRET) x-admin-secret header'inda dogru gonderen
// cagirilar kabul edilir.
// Deploy: supabase functions deploy admin-seed-item
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_SEED_SECRET = Deno.env.get('ADMIN_SEED_SECRET')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

type SeedPayload = {
  userId?: string;
  categorySlot?: string;
  categoryId?: string | null;
  name?: string;
  color?: string | null;
  pattern?: string | null;
  season?: string[];
  brand?: string | null;
  imageUrl?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (req.headers.get('x-admin-secret') !== ADMIN_SEED_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const payload = (await req.json()) as SeedPayload;
  const { userId, categorySlot, categoryId, name, color, pattern, season, brand, imageUrl } = payload;

  if (!userId || !categorySlot || !name || !imageUrl) {
    return jsonResponse({ error: 'userId, categorySlot, name, imageUrl gerekli' }, 400);
  }

  // SSRF önleme: bu fonksiyon sadece bilinen bir görsel-CDN'inden indirme yapmalı,
  // rastgele bir URL (iç ağ adresleri dahil) asla fetch edilmemeli.
  const ALLOWED_IMAGE_HOSTS = ['images.pexels.com'];
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return jsonResponse({ error: 'Geçersiz imageUrl' }, 400);
  }
  if (parsedUrl.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.includes(parsedUrl.hostname)) {
    return jsonResponse({ error: 'imageUrl izin verilen bir CDN host\'undan olmalı (https, ' + ALLOWED_IMAGE_HOSTS.join(', ') + ')' }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'Kullanıcı bulunamadı' }, 404);
  }

  const imageRes = await fetch(parsedUrl, { redirect: 'manual' });
  if (imageRes.status >= 300 && imageRes.status < 400) {
    return jsonResponse({ error: 'Görsel CDN yönlendirme döndürdü, reddedildi' }, 502);
  }
  if (!imageRes.ok) {
    return jsonResponse({ error: `Görsel indirilemedi: ${imageRes.status}` }, 502);
  }
  const contentType = imageRes.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    return jsonResponse({ error: `Beklenmeyen içerik tipi: ${contentType}` }, 502);
  }
  const arrayBuffer = await imageRes.arrayBuffer();
  const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    return jsonResponse({ error: 'Görsel çok büyük' }, 502);
  }
  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await adminClient.storage
    .from('item-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
  if (uploadError) {
    return jsonResponse({ error: `Yükleme hatası: ${uploadError.message}` }, 500);
  }

  const { data: urlData } = adminClient.storage.from('item-photos').getPublicUrl(path);

  const { data: itemData, error: insertError } = await adminClient
    .from('items')
    .insert({
      user_id: userId,
      category_id: categoryId ?? null,
      slot: categorySlot,
      name,
      color: color ?? null,
      pattern: pattern ?? null,
      season: season ?? [],
      brand: brand ?? null,
      image_url: urlData.publicUrl,
      source_type: 'web_photo',
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse({ error: `Kayıt hatası: ${insertError.message}` }, 500);
  }

  return jsonResponse({ item: itemData });
});
