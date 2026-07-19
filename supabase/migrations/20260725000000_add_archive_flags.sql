-- Arşiv özelliği (kullanıcı isteği 2026-07-19): envanter ürünleri ve kombinler
-- (beğenilen + giyilen) arşivlenebilir. Arşivlenen ürün Envanter'de soluk + rozetli
-- görünmeye devam eder ama kombin üretim havuzuna ("Arşivdekileri de dahil et"
-- işaretlenmedikçe) girmez; arşivlenen kombin Beğenilenler/Geçmiş'ten düşer,
-- Arşivlerim ekranında yaşar.
alter table public.items add column is_archived boolean not null default false;
alter table public.outfits add column is_archived boolean not null default false;
