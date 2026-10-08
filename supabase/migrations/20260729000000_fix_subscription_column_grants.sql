-- 20260728000000_restrict_subscription_columns.sql ETKISIZDI: Postgres'te tabloya
-- tablo duzeyinde UPDATE verilmisse, "REVOKE UPDATE (kolon)" hicbir sey yapmaz
-- (kolon duzeyindeki revoke sadece kolon duzeyinde verilmis yetkiyi geri alir).
-- 2026-10-08'de canli DB'de dogrulandi: authenticated/anon hala subscription_tier
-- ve subscription_expires_at kolonlarini guncelleyebiliyordu.
--
-- Dogru cozum: tablo duzeyindeki UPDATE'i kaldir, sadece guvenli kolonlara
-- kolon duzeyinde UPDATE ver. subscription_* kolonlari SADECE service-role
-- (RevenueCat webhook'u / SQL Editor) tarafindan yazilabilir.
--
-- DIKKAT: profiles'a yeni bir kullanici-duzenlenebilir kolon eklenirse ona da
-- asagidaki gibi ayrica "grant update (yeni_kolon)" verilmeli, yoksa client'tan
-- yazilamaz.

revoke update on public.profiles from anon, authenticated;

grant update (display_name, avatar_url, gender, age, height_cm, weight_kg, daily_style)
  on public.profiles to authenticated;
