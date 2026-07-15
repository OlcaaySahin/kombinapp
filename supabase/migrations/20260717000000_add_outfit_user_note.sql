-- AI kombin oluşturma ekranında kullanıcının eklediği opsiyonel serbest metin not
-- ("arkadaşımın doğum günü partisi, rahat ama şık olsun" gibi). Hem AI prompt'una
-- bağlam olarak ekleniyor hem de kombinle birlikte kaydediliyor (ileride alışveriş/
-- ek ürün önerisi gibi özelliklerde kullanılabilir).
-- outfit_wears.note (giydim notu) ile karışmasın diye kolon adı user_note.

alter table public.outfits add column user_note text;
