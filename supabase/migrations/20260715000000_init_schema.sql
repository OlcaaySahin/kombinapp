-- Kombin App: ilk şema. CLAUDE.md'deki veritabanı tasarımının birebir karşılığı.

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  gender text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);

-- Kullanıcı kayıt olduğunda otomatik profil satırı oluştur
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ partnerships (v2, şema hazır) ============
create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, partner_id)
);

alter table public.partnerships enable row level security;

create policy "Partnerships visible to participants" on public.partnerships
  for select using (auth.uid() = requester_id or auth.uid() = partner_id);
create policy "Users can request partnerships" on public.partnerships
  for insert with check (auth.uid() = requester_id);
create policy "Participants can update partnership status" on public.partnerships
  for update using (auth.uid() = requester_id or auth.uid() = partner_id);

-- ============ categories (lookup, herkese açık okuma) ============
create type public.category_slot as enum (
  'ust_giyim', 'alt_giyim', 'tek_parca', 'dis_giyim', 'ayakkabi', 'canta', 'taki', 'tamamlayici'
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slot public.category_slot not null,
  icon text
);

alter table public.categories enable row level security;
create policy "Categories are viewable by everyone" on public.categories
  for select using (true);

insert into public.categories (name, slot, icon) values
  ('Üst Giyim', 'ust_giyim', 'shirt-outline'),
  ('Alt Giyim', 'alt_giyim', 'body-outline'),
  ('Elbise', 'tek_parca', 'woman-outline'),
  ('Dış Giyim', 'dis_giyim', 'umbrella-outline'),
  ('Ayakkabı', 'ayakkabi', 'footsteps-outline'),
  ('Çanta', 'canta', 'bag-handle-outline'),
  ('Takı', 'taki', 'diamond-outline'),
  ('Aksesuar', 'tamamlayici', 'glasses-outline');

-- ============ items (envanter) ============
create table public.items (
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
  source_type text not null default 'user_photo' check (source_type in ('user_photo', 'web_photo')),
  ai_tags jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;
create policy "Items are viewable by owner" on public.items
  for select using (auth.uid() = user_id);
create policy "Items are insertable by owner" on public.items
  for insert with check (auth.uid() = user_id);
create policy "Items are editable by owner" on public.items
  for update using (auth.uid() = user_id);
create policy "Items are deletable by owner" on public.items
  for delete using (auth.uid() = user_id);

-- ============ outfits (kombinler) ============
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  is_liked boolean not null default false,
  generation_source text not null default 'ai_generated' check (generation_source in ('ai_generated', 'dice', 'manual')),
  generation_context jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.outfits enable row level security;
create policy "Outfits are viewable by owner" on public.outfits
  for select using (auth.uid() = user_id);
create policy "Outfits are insertable by owner" on public.outfits
  for insert with check (auth.uid() = user_id);
create policy "Outfits are editable by owner" on public.outfits
  for update using (auth.uid() = user_id);
create policy "Outfits are deletable by owner" on public.outfits
  for delete using (auth.uid() = user_id);

-- ============ outfit_items (join) ============
create table public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  primary key (outfit_id, item_id)
);

alter table public.outfit_items enable row level security;
create policy "Outfit items are viewable by outfit owner" on public.outfit_items
  for select using (
    exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = auth.uid())
  );
create policy "Outfit items are insertable by outfit owner" on public.outfit_items
  for insert with check (
    exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = auth.uid())
  );
create policy "Outfit items are deletable by outfit owner" on public.outfit_items
  for delete using (
    exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = auth.uid())
  );

-- ============ outfit_wears (giyilme kayıtları / kombin albümü) ============
create table public.outfit_wears (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  worn_date date not null default current_date,
  photo_url text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.outfit_wears enable row level security;
create policy "Outfit wears are viewable by outfit owner" on public.outfit_wears
  for select using (
    exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = auth.uid())
  );
create policy "Outfit wears are insertable by outfit owner" on public.outfit_wears
  for insert with check (
    exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = auth.uid())
  );
create policy "Outfit wears are editable by outfit owner" on public.outfit_wears
  for update using (
    exists (select 1 from public.outfits where outfits.id = outfit_id and outfits.user_id = auth.uid())
  );

-- ============ generation_events (freemium günlük limit log) ============
create table public.generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('outfit', 'shopping_suggestion')),
  created_at timestamptz not null default now()
);

alter table public.generation_events enable row level security;
create policy "Generation events are viewable by owner" on public.generation_events
  for select using (auth.uid() = user_id);
create policy "Generation events are insertable by owner" on public.generation_events
  for insert with check (auth.uid() = user_id);
