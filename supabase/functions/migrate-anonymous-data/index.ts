// Supabase Edge Function: bir anonim kullanicinin verisini (items, wishlist_items,
// outfits, profil alanlari), Google ile giris sonrasi olusan YENI kalici hesaba tasir.
// signInWithIdToken() anonim kullaniciyi KORUMUYOR (Supabase'in bilinen bir sinirlamasi -
// linkIdentity() gibi ayni auth.uid'yi korumuyor, yeni bir kullanici olusturuyor), bu
// yuzden veri kaybini onlemek icin bu manuel tasima adimi gerekiyor.
// Deploy: supabase functions deploy migrate-anonymous-data
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
// Supabase her Edge Function'a otomatik olarak service_role key'i saglar - ayrica
// secrets set yapmaya gerek yok.
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

const PROFILE_FIELDS_TO_COPY = ['gender', 'age', 'height_cm', 'weight_kg', 'daily_style', 'display_name', 'avatar_url'];

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

  // Cagirani (yeni, Google ile giris yapilmis) kullaniciyi kendi JWT'sinden dogrula.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: newUser },
    error: newUserError,
  } = await userClient.auth.getUser();

  if (newUserError || !newUser) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { oldUserId } = (await req.json()) as { oldUserId?: string };
  if (!oldUserId || typeof oldUserId !== 'string') {
    return jsonResponse({ error: 'oldUserId gerekli' }, 400);
  }
  if (oldUserId === newUser.id) {
    return jsonResponse({ error: 'oldUserId yeni kullanıcıyla aynı olamaz' }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // GÜVENLİK: sadece gerçekten anonim ve henüz hiçbir kimlik bağlanmamış bir kullanıcının
  // verisi taşınabilir — aksi halde biri başka bir gerçek kullanıcının ID'sini vererek
  // onun verisini kendi hesabına çalabilirdi.
  const { data: oldUserData, error: oldUserError } = await adminClient.auth.admin.getUserById(oldUserId);
  if (oldUserError || !oldUserData?.user) {
    return jsonResponse({ error: 'Eski kullanıcı bulunamadı' }, 404);
  }
  if (!oldUserData.user.is_anonymous) {
    return jsonResponse({ error: 'Sadece anonim kullanıcıların verisi taşınabilir' }, 403);
  }

  // Eski profildeki doldurulmuş alanları yeni profile kopyala (yeni profil satırı zaten
  // handle_new_user trigger'ıyla boş olarak oluşmuştu).
  const { data: oldProfile } = await adminClient.from('profiles').select('*').eq('id', oldUserId).maybeSingle();
  if (oldProfile) {
    const updates: Record<string, unknown> = {};
    for (const field of PROFILE_FIELDS_TO_COPY) {
      if (oldProfile[field] != null) updates[field] = oldProfile[field];
    }
    if (Object.keys(updates).length > 0) {
      await adminClient.from('profiles').update(updates).eq('id', newUser.id);
    }
  }

  // Kullanıcıya görünen veriyi yeni hesaba taşı.
  const migrated: Record<string, number> = {};
  for (const table of ['items', 'wishlist_items', 'outfits']) {
    const { data, error } = await adminClient
      .from(table)
      .update({ user_id: newUser.id })
      .eq('user_id', oldUserId)
      .select('id');
    if (error) {
      return jsonResponse({ error: `${table} taşınamadı: ${error.message}`, migrated }, 500);
    }
    migrated[table] = data?.length ?? 0;
  }

  // Temizlik: eski anonim kullanıcıyı sil (best-effort, başarısız olursa veri taşıması
  // zaten tamamlandığı için sorun değil, sadece kullanılmayan bir anonim kayıt kalır).
  try {
    await adminClient.auth.admin.deleteUser(oldUserId);
  } catch {
    // önemli değil
  }

  return jsonResponse({ migrated });
});
