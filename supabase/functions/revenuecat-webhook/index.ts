// Supabase Edge Function: RevenueCat webhook'u. Satın alma / yenileme / iptal / bitiş
// olaylarını alıp profiles.subscription_tier ve subscription_expires_at'i günceller.
// Bu kolonlara client yetkisi KAPALI (bkz. 20260729000000 migration) — tek yazma yolu bu
// fonksiyon (service-role) ve elle SQL.
//
// KİMLİK DOĞRULAMA: RevenueCat Supabase JWT göndermez. Bu yüzden fonksiyon
// `--no-verify-jwt` ile deploy edilir ve yetki, RevenueCat panelinde "Authorization header"
// alanına girilen gizli değerle (REVENUECAT_WEBHOOK_AUTH secret'ı) sabit-zamanlı karşılaştırılır.
// RevenueCat app_user_id = Supabase auth.uid() (bkz. lib/purchases.ts → syncPurchasesUser).
//
// Deploy: supabase functions deploy revenuecat-webhook --no-verify-jwt --project-ref <ref>
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
// TRANSFER olaylarında güncel durumu RevenueCat'ten sormak için (v2 REST API, SADECE sunucuda).
const RC_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? '';
const RC_PROJECT_ID = Deno.env.get('REVENUECAT_PROJECT_ID') ?? 'proj51677e04';

// RevenueCat panelindeki entitlement identifier'ı (lib/purchases.ts → PREMIUM_ENTITLEMENT,
// panelde "Premium"). Webhook tarafında büyük/küçük harf duyarsız karşılaştırılır.
const PREMIUM_ENTITLEMENT = 'premium';

// Erişim durumunu değiştirebilen olay türleri. Karar `expiration_at_ms`'e göre verilir:
// gelecekteyse premium, geçmişteyse free. CANCELLATION (otomatik yenilemeyi kapatma)
// normalde erişimi bitirmez — expiration hâlâ gelecekte olduğundan premium kalır; iade
// kaynaklı iptalde expiration geçmişte olur, free'ye döner.
const ACCESS_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

type RevenueCatEvent = {
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  transferred_from?: string[] | null;
  transferred_to?: string[] | null;
};

type PremiumState = { active: boolean; expiresMs: number | null };

/**
 * RevenueCat'ten (v2 API) bir kullanıcının GÜNCEL Premium durumunu sorar. Şu an projede tek
 * entitlement ("Premium") olduğu için aktif herhangi bir entitlement Premium sayılır.
 * Müşteri RevenueCat'te yoksa (404) Premium yok demektir. Başka bir hata → fırlatır
 * (webhook 5xx döner, RevenueCat olayı yeniden dener).
 */
async function fetchPremiumState(userId: string): Promise<PremiumState> {
  const response = await fetch(
    `https://api.revenuecat.com/v2/projects/${RC_PROJECT_ID}/customers/${encodeURIComponent(userId)}/active_entitlements`,
    { headers: { Authorization: `Bearer ${RC_SECRET_API_KEY}` } }
  );
  if (response.status === 404) return { active: false, expiresMs: null };
  if (!response.ok) throw new Error(`RevenueCat API ${response.status}`);
  const body = (await response.json()) as { items?: { expires_at?: number | null }[] };
  const items = body.items ?? [];
  if (items.length === 0) return { active: false, expiresMs: null };
  // expires_at null → süresiz (lifetime/promosyon) entitlement.
  if (items.some((item) => item.expires_at == null)) return { active: true, expiresMs: null };
  return { active: true, expiresMs: Math.max(...items.map((item) => item.expires_at as number)) };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Secret tanımlı değilse HER isteği reddet — yanlışlıkla herkese açık bir webhook kalmasın.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!WEBHOOK_AUTH || !safeEqual(authHeader, WEBHOOK_AUTH)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let event: RevenueCatEvent | undefined;
  try {
    const body = await req.json();
    event = body?.event;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  if (!event?.type) {
    return jsonResponse({ error: 'Missing event' }, 400);
  }

  // TRANSFER: bir abonelik (geri yükleme ile) bir hesaptan diğerine taşındı. Olayda bitiş tarihi
  // yok; iki tarafın GÜNCEL durumunu RevenueCat'ten sorup yazıyoruz — böylece tek abonelik iki
  // hesabı birden Premium yapmaz (eski hesap free'ye, yeni hesap premium'a döner).
  // Not: RevenueCat aboneliği olmayan, elle verilmiş Premium'lar (SQL) böyle bir transfere
  // karışırsa free'ye döner — elle verilen hesaplar RevenueCat'e hiç tanıtılmadığı için nadir.
  if (event.type === 'TRANSFER') {
    const ids = [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].filter((id) =>
      UUID_PATTERN.test(id)
    );
    if (ids.length === 0) {
      return jsonResponse({ ok: true, ignored: 'transfer without uuid users' });
    }
    if (!RC_SECRET_API_KEY) {
      console.error('REVENUECAT_SECRET_API_KEY tanımlı değil — TRANSFER işlenemedi');
      return jsonResponse({ error: 'Server misconfigured' }, 500);
    }
    const transferAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    try {
      for (const id of new Set(ids)) {
        const state = await fetchPremiumState(id);
        const { error } = await transferAdminClient
          .from('profiles')
          .update({
            subscription_tier: state.active ? 'premium' : 'free',
            subscription_expires_at: state.expiresMs ? new Date(state.expiresMs).toISOString() : null,
          })
          .eq('id', id);
        if (error) throw error;
      }
    } catch (error) {
      console.error('TRANSFER sync failed', error);
      return jsonResponse({ error: 'Transfer sync failed' }, 500);
    }
    return jsonResponse({ ok: true, type: 'TRANSFER', synced: ids.length });
  }

  // RevenueCat'in "Send test event" butonu ve ilgilenmediğimiz türler: 200 dön (retry olmasın).
  if (!ACCESS_EVENT_TYPES.has(event.type)) {
    return jsonResponse({ ok: true, ignored: `event type ${event.type}` });
  }

  // Başka bir entitlement'a (ileride eklenirse) ait olaylar premium'u etkilememeli.
  if (
    Array.isArray(event.entitlement_ids) &&
    !event.entitlement_ids.some((id) => id.toLowerCase() === PREMIUM_ENTITLEMENT)
  ) {
    return jsonResponse({ ok: true, ignored: 'different entitlement' });
  }

  // SADECE app_user_id: original_app_user_id hesap geçişi/alias sonrası ESKİ bir hesabı
  // gösterebilir ve Premium'u yanlış kişiye yazdırırdı.
  const userId =
    typeof event.app_user_id === 'string' && UUID_PATTERN.test(event.app_user_id) ? event.app_user_id : null;
  if (!userId) {
    // Anonim RevenueCat kimliği (`$RCAnonymousID:...`) — bizde anonim kullanıcı satın alamaz.
    return jsonResponse({ ok: true, ignored: 'non-uuid app_user_id' });
  }

  const expiresMs = event.expiration_at_ms;
  if (typeof expiresMs !== 'number') {
    return jsonResponse({ ok: true, ignored: 'no expiration_at_ms' });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Eski (gecikmeli teslim edilen) bir EXPIRATION olayı, daha yeni bir yenilemeyi ezmesin:
  // depolanan bitiş bu olayın bitişinden SONRAYSA ve hâlâ gelecekteyse yoksay.
  // (Sadece EXPIRATION için — iade, CANCELLATION olarak gelir ve geçmiş bitişle gerçekten
  // erişimi kapatmalıdır.)
  if (event.type === 'EXPIRATION') {
    const { data: existing } = await adminClient
      .from('profiles')
      .select('subscription_expires_at')
      .eq('id', userId)
      .maybeSingle();
    const storedMs = existing?.subscription_expires_at ? new Date(existing.subscription_expires_at).getTime() : 0;
    if (storedMs > expiresMs && storedMs > Date.now()) {
      return jsonResponse({ ok: true, ignored: 'stale expiration' });
    }
  }

  const active = expiresMs > Date.now();
  const { data, error } = await adminClient
    .from('profiles')
    .update({
      subscription_tier: active ? 'premium' : 'free',
      subscription_expires_at: new Date(expiresMs).toISOString(),
    })
    .eq('id', userId)
    .select('id');

  if (error) {
    // 5xx → RevenueCat olayı otomatik yeniden dener.
    console.error('profiles update failed', error);
    return jsonResponse({ error: 'Database error' }, 500);
  }

  // Silinmiş kullanıcı: yeniden denemenin anlamı yok, 200 dön.
  if (!data || data.length === 0) {
    return jsonResponse({ ok: true, ignored: 'profile not found' });
  }

  return jsonResponse({ ok: true, type: event.type, tier: active ? 'premium' : 'free' });
});
