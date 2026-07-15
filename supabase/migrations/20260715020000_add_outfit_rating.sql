-- Kullanıcının kombine verdiği 1-5 yıldız puanı. Zamanla AI kombin önerisinin
-- (generate-outfit Edge Function) kullanıcı zevkini öğrenmesi için kullanılacak.
alter table public.outfits
  add column rating smallint check (rating between 1 and 5);
