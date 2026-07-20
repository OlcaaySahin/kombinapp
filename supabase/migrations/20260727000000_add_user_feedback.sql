-- Kullanıcı isteği (2026-07-20): uygulama içinden geri bildirim/hata bildirme kanalı yok,
-- her şey manuel teste bağlıydı. Append-only log — kullanıcı sadece kendi gönderdiklerini görebilir.
create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table user_feedback enable row level security;

create policy "user_feedback_select_own" on user_feedback
  for select using (auth.uid() = user_id);

create policy "user_feedback_insert_own" on user_feedback
  for insert with check (auth.uid() = user_id);
