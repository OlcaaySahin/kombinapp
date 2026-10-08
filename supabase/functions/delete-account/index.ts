// Supabase Edge Function: kullanicinin hesabini VE tum verisini kalici olarak siler.
// Google Play zorunlulugu (2023): hesap silme akisi uygulama ICINDEN erisilebilir olmali.
// Guvenlik: silinecek userId ASLA client'tan gelen bir parametre degil, cagiranin KENDI
// JWT'sinden cikariliyor - aksi halde biri baska bir kullanicinin hesabini silebilirdi.
// Deploy: supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Yol konvansiyonu (lib/storage.ts): {bucket}/{userId}/{dosya} — düz, alt klasör yok.
const STORAGE_BUCKETS = ['item-photos', 'outfit-wear-photos', 'avatars'];
const STORAGE_PAGE_SIZE = 1000;
const STORAGE_MAX_PAGES = 20;

/** Kullanıcının bir bucket'taki tüm dosyalarını siler. Hata varsa mesajı, yoksa null döner. */
async function deleteUserFiles(
  adminClient: ReturnType<typeof createClient>,
  bucket: string,
  userId: string
): Promise<string | null> {
  for (let page = 0; page < STORAGE_MAX_PAGES; page++) {
    const { data: files, error: listError } = await adminClient.storage
      .from(bucket)
      .list(userId, { limit: STORAGE_PAGE_SIZE });
    if (listError) return listError.message;
    if (!files || files.length === 0) return null;

    const paths = files.map((file) => `${userId}/${file.name}`);
    const { error: removeError } = await adminClient.storage.from(bucket).remove(paths);
    if (removeError) return removeError.message;
    if (files.length < STORAGE_PAGE_SIZE) return null;
  }
  return null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

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

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const userId = user.id;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Storage'daki fotoğraflar (ürün, giydim, profil resmi) DB satırlarıyla birlikte
  // silinmiyor — ayrı bir sistem. Hesap silme "geri dönüşü olmayan, tüm veri" vaadi verdiği
  // için (gizlilik politikası, Play/KVKK) dosyalar da silinmeli. Hesabı silmeden ÖNCE yapılır:
  // hesap gittikten sonra kullanıcının oturumu geçersiz olur, başarısız bir temizlik bir daha
  // denenemezdi; şimdi hata olursa 500 döner ve kullanıcı aynı işlemi tekrar deneyebilir.
  for (const bucket of STORAGE_BUCKETS) {
    const storageError = await deleteUserFiles(adminClient, bucket, userId);
    if (storageError) {
      return jsonResponse({ error: `${bucket} dosyaları silinemedi: ${storageError}` }, 500);
    }
  }

  // Sirasi onemli degil (outfits/items zaten outfit_items/outfit_wears'i cascade siliyor,
  // outfit_dislikes/packing_lists/profiles zaten auth.users'a FK CASCADE ile bagli) ama
  // her tabloyu ACIKCA silmek, olasi bir FK/RLS degisikliginde sessizce veri birakmaya
  // karsi daha saglam - tek bir noktaya (auth cascade) guvenmiyoruz.
  const tablesWithUserId = [
    'outfits',
    'items',
    'wishlist_items',
    'packing_lists',
    'generation_events',
    'outfit_dislikes',
    'user_feedback',
  ];
  for (const table of tablesWithUserId) {
    const { error } = await adminClient.from(table).delete().eq('user_id', userId);
    if (error) {
      return jsonResponse({ error: `${table} silinemedi: ${error.message}` }, 500);
    }
  }

  const { error: partnershipError } = await adminClient
    .from('partnerships')
    .delete()
    .or(`requester_id.eq.${userId},partner_id.eq.${userId}`);
  if (partnershipError) {
    return jsonResponse({ error: `partnerships silinemedi: ${partnershipError.message}` }, 500);
  }

  const { error: profileError } = await adminClient.from('profiles').delete().eq('id', userId);
  if (profileError) {
    return jsonResponse({ error: `profil silinemedi: ${profileError.message}` }, 500);
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return jsonResponse({ error: `Hesap silinemedi: ${deleteUserError.message}` }, 500);
  }

  return jsonResponse({ success: true });
});
