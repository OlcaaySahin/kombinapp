// Supabase Edge Function: e-posta ile partner eşleştirme isteği gönderir.
// auth.users client'tan hiç sorgulanamadığı için, e-posta -> kullanıcı id çözümlemesi
// service-role ile (find_user_ids_by_email RPC) burada yapılıyor.
// Aynı e-posta birden fazla hesaba (Google + e-posta girişi ayrı ayrı) kayıtlıysa,
// HER İKİSİNE de istek gönderiliyor - kullanıcı hangisiyle giriş yaparsa yapsın görsün diye.
// Deploy: supabase functions deploy send-partner-request
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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

  const { email } = (await req.json()) as { email?: string };
  if (!email || !email.trim()) {
    return jsonResponse({ error: 'E-posta gerekli' }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Çağıranın zaten kabul edilmiş bir partneri var mı?
  const { data: existingAccepted } = await adminClient
    .from('partnerships')
    .select('id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .maybeSingle();
  if (existingAccepted) {
    return jsonResponse({ error: 'Zaten bir partnerin var. Yeni istek göndermeden önce mevcut eşleşmeyi sonlandırmalısın.' }, 409);
  }

  const { data: matches, error: lookupError } = await adminClient.rpc('find_user_ids_by_email', {
    lookup_email: email.trim(),
  });
  if (lookupError) {
    return jsonResponse({ error: lookupError.message }, 500);
  }

  const targetIds = ((matches ?? []) as { id: string }[]).map((row) => row.id).filter((id) => id !== user.id);
  if (targetIds.length === 0) {
    return jsonResponse({ error: 'Bu e-postayla kayıtlı bir kullanıcı bulunamadı.' }, 404);
  }

  let sent = 0;
  let alreadyInvitedByThem = false;
  let alreadyPending = false;
  let targetHasPartner = false;

  for (const targetId of targetIds) {
    // Hedefin zaten kabul edilmiş bir partneri var mı?
    const { data: targetAccepted } = await adminClient
      .from('partnerships')
      .select('id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${targetId},partner_id.eq.${targetId}`)
      .maybeSingle();
    if (targetAccepted) {
      targetHasPartner = true;
      continue;
    }

    // İki yönde de mevcut bir kayıt var mı?
    const { data: existingRow } = await adminClient
      .from('partnerships')
      .select('id, requester_id, partner_id, status')
      .or(
        `and(requester_id.eq.${user.id},partner_id.eq.${targetId}),and(requester_id.eq.${targetId},partner_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existingRow) {
      if (existingRow.status === 'pending' && existingRow.requester_id === targetId) {
        // Bu kullanıcı zaten bize istek göndermiş - yeni istek göndermeye gerek yok.
        alreadyInvitedByThem = true;
        continue;
      }
      if (existingRow.status === 'pending') {
        alreadyPending = true;
        continue;
      }
      if (existingRow.status === 'declined') {
        // Daha önce reddedilmiş - tekrar istek gönder.
        await adminClient
          .from('partnerships')
          .update({ status: 'pending', requester_id: user.id, partner_id: targetId, responded_at: null })
          .eq('id', existingRow.id);
        sent++;
        continue;
      }
      continue;
    }

    const { error: insertError } = await adminClient
      .from('partnerships')
      .insert({ requester_id: user.id, partner_id: targetId, status: 'pending' });
    if (!insertError) sent++;
  }

  if (sent > 0) {
    return jsonResponse({ sent, message: 'İstek gönderildi.' });
  }
  if (alreadyInvitedByThem) {
    return jsonResponse({ sent: 0, alreadyInvitedByThem: true, message: 'Bu kullanıcı zaten sana istek göndermiş, onaylayabilirsin.' });
  }
  if (alreadyPending) {
    return jsonResponse({ sent: 0, message: 'Bu kullanıcıya zaten bir istek gönderilmiş, yanıt bekleniyor.' });
  }
  if (targetHasPartner) {
    return jsonResponse({ error: 'Bu kullanıcının zaten bir partneri var.' }, 409);
  }
  return jsonResponse({ error: 'İstek gönderilemedi.' }, 500);
});
