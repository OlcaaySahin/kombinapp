-- Edge Function'larda (generate-outfit, tag-item-photo, fetch-product-link) basit bir
-- saatlik rate-limit icin generation_events tablosunu 'ai_call' turuyle genisletiyoruz.
-- Bu ucretli Claude API cagrilarini yapan tum fonksiyonlar icin ortak bir sayac.

alter table public.generation_events drop constraint generation_events_type_check;
alter table public.generation_events add constraint generation_events_type_check
  check (type in ('outfit', 'shopping_suggestion', 'ai_call'));
