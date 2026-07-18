-- Bavul Hazırla: kaydedilen kapsül gardırop planları.
-- Ürünler uuid dizisi/jsonb olarak saklanır (FK yok — ürün silinirse client render'da atlar;
-- outfits/outfit_items'ın katı FK modeline girmemek v1 için bilinçli sadelik).

create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  days int not null,
  context jsonb not null default '{}'::jsonb,
  suitcase_item_ids uuid[] not null default '{}',
  day_outfits jsonb not null default '[]'::jsonb,
  reasoning text,
  rating numeric,
  created_at timestamptz not null default now()
);

alter table public.packing_lists enable row level security;

create policy "Users manage own packing lists"
on public.packing_lists for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
