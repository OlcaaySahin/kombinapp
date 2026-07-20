-- Kullanıcı isteği (2026-07-20): AI/Zar sonucunu beğenmediğinde bir sinyal toplama.
-- Append-only log — update/delete policy'si yok, sadece kendi kayıtlarını ekleyip görebiliyor.
create table if not exists outfit_dislikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_ids uuid[] not null,
  context jsonb,
  created_at timestamptz not null default now()
);

alter table outfit_dislikes enable row level security;

create policy "outfit_dislikes_select_own" on outfit_dislikes
  for select using (auth.uid() = user_id);

create policy "outfit_dislikes_insert_own" on outfit_dislikes
  for insert with check (auth.uid() = user_id);
