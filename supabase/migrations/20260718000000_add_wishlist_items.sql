-- Istek listesi: kullanicinin satin almak istedigi ama henuz sahip olmadigi urunler.
-- items ile ayni sekli birebir yansitiyor (kombin motoru ikisini ortak havuzda kullanabilsin
-- diye) + satin alma tesvigi icin product_url/price eklendi. Ayri tablo tercih edildi
-- (items'a bir is_wishlist flag'i eklemek yerine) cunku items'i tuketen tum sorgular
-- (envanter listesi, kombin havuzu vb.) "sahip olunan" varsayimiyla yazildi - bir flag
-- eklemek o sorgularin hepsini filtre eklemeye zorlar ve unutulursa wishlist urunleri
-- yanlislikla normal envantere sizabilir.

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  slot public.category_slot not null,
  name text,
  color text,
  pattern text,
  season text[] not null default '{}',
  brand text,
  image_url text,
  product_url text,
  price numeric,
  source_type text not null default 'user_photo' check (source_type in ('user_photo', 'web_photo')),
  ai_tags jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wishlist_items enable row level security;
create policy "Wishlist items are viewable by owner" on public.wishlist_items
  for select using (auth.uid() = user_id);
create policy "Wishlist items are insertable by owner" on public.wishlist_items
  for insert with check (auth.uid() = user_id);
create policy "Wishlist items are editable by owner" on public.wishlist_items
  for update using (auth.uid() = user_id);
create policy "Wishlist items are deletable by owner" on public.wishlist_items
  for delete using (auth.uid() = user_id);
