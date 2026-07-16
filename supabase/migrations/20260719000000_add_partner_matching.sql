-- Partner Eşleştirme: partnerships tablosu ilk şemadan beri vardı ama hiç kullanılmıyordu.
-- Bu migration, eşleşme kabul edildiğinde partnerlerin birbirinin envanterini/profilini
-- görebilmesi için RLS ekliyor, eşleşmeyi sonlandırabilmek için DELETE policy'si ekliyor,
-- ve e-postadan kullanıcı bulmak için (auth.users client'tan hiç erişilemez) service-role'e
-- özel bir arama fonksiyonu tanımlıyor.

-- ============ partnerships: DELETE policy (istek reddetmek/eşleşmeyi sonlandırmak için) ============
create policy "Participants can delete partnership" on public.partnerships
  for delete using (auth.uid() = requester_id or auth.uid() = partner_id);

-- ============ items: kabul edilmiş partnerin envanterini görebilme ============
create policy "Accepted partner can view items" on public.items
  for select using (
    exists (
      select 1 from public.partnerships p
      where p.status = 'accepted'
        and (
          (p.requester_id = auth.uid() and p.partner_id = items.user_id)
          or (p.partner_id = auth.uid() and p.requester_id = items.user_id)
        )
    )
  );

-- ============ profiles: kabul edilmiş partnerin adını görebilme ============
create policy "Accepted partner can view profile" on public.profiles
  for select using (
    exists (
      select 1 from public.partnerships p
      where p.status = 'accepted'
        and (
          (p.requester_id = auth.uid() and p.partner_id = profiles.id)
          or (p.partner_id = auth.uid() and p.requester_id = profiles.id)
        )
    )
  );

-- ============ e-postadan kullanıcı bulma (sadece service_role çağırabilir) ============
-- auth.users normalde hiçbir client'tan (anon/authenticated) erişilemez. Aynı e-posta hem
-- Google hem e-posta girişiyle ayrı ayrı kayıtlıysa BİRDEN FAZLA satır dönebilir - çağıran
-- (send-partner-request Edge Function) bu durumda her ikisine de istek gönderir, kullanıcı
-- hangisiyle giriş yaparsa yapsın isteği görür.
create function public.find_user_ids_by_email(lookup_email text)
returns table(id uuid)
language sql
stable
security definer
set search_path = public, auth
as $$
  select au.id
  from auth.users au
  where lower(au.email) = lower(lookup_email)
    and au.is_anonymous is not true;
$$;

revoke execute on function public.find_user_ids_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_ids_by_email(text) to service_role;
