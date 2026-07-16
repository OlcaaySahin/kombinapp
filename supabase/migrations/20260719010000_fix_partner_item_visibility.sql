-- Duzeltme: "Accepted partner can view items" policy'si, `items` sorgusunu user_id ile
-- filtrelemeyen HER YERDE (useItems() -> Envanter sekmesi, Ana Sayfa'daki kombin havuzu,
-- WardrobeStats, vb.) partnerin urunlerini kendi envanterine KARISTIRIYORDU - cunku bu
-- sorgular sadece RLS'e guveniyor, RLS genisleyince "kendi envanterim" anlami da genisledi.
-- generate-partner-outfit zaten kendi ici guvenlik kontrolu yapabilir (partnerlik + service
-- role), bu yuzden genel items policy'sini genisletmeye hic gerek yoktu.
drop policy if exists "Accepted partner can view items" on public.items;
