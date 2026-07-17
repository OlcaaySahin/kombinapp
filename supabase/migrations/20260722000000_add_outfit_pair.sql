-- Kombin çiftleri: partnere önerilip kaydedilen kombin, ana kombine bağlanır.
-- Yön: partner kombini -> ana kombin (pair_outfit_id ana kombinin id'si).
-- Ana kombin silinirse bağ null olur, partner kombini bağımsız kombin olarak yaşamaya devam eder.

alter table public.outfits
  add column if not exists pair_outfit_id uuid references public.outfits(id) on delete set null;
