-- Onceki fix (20260719010000) "Accepted partner can view items" policy'sini tamamen
-- kaldirmisti - bu, "envanterlerin birlesmesi" bug'ini cozdu AMA yeni bir sorun yaratti:
-- "Partnerime Uyumlu Kombin Oner" -> "Kaydet" ile kaydedilen bir kombin, partnerin urun
-- id'lerine referans veriyor (bilerek - bkz. generate-partner-outfit yorumlari). Kombin
-- sahibi bu kombini Kombinlerim'de acinca, outfit_items -> items JOIN'i partnerin
-- item'larini okuyamadigi icin `items: null` donuyor, OutfitCard.tsx `item.slot`'a
-- erismeye calisip cokuyordu ("Cannot read property 'slot' of null").
--
-- Cozum: cok DAR bir policy - bir item, SADECE kendi outfit_items'i araciligiyla,
-- cagiranin KENDI outfit'ine dahil edilmisse gorunur olsun. Bu, "Partnerime Uyumlu Kombin
-- Oner" ile kaydedilen kombinlerin dogru render edilmesini sagliyor ama partnerin GENEL
-- envanterini (useItems() gibi outfit_items'tan gecmeyen sorgularda) hic acmiyor - o
-- yuzden Envanter sekmesi/kombin havuzu etkilenmiyor.
create policy "Items visible via own saved outfit" on public.items
  for select using (
    exists (
      select 1
      from public.outfit_items oi
      join public.outfits o on o.id = oi.outfit_id
      where oi.item_id = items.id and o.user_id = auth.uid()
    )
  );
