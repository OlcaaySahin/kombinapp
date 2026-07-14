-- Envanter ve kombin albümü fotoğrafları için Storage bucket'ları + RLS.
-- Dosya yolu konvansiyonu: {bucket}/{user_id}/{dosya_adı} — RLS bu ilk klasörü auth.uid() ile karşılaştırır.

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

create policy "Item photos are viewable by everyone"
on storage.objects for select
using (bucket_id = 'item-photos');

create policy "Users can upload their own item photos"
on storage.objects for insert
with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own item photos"
on storage.objects for update
using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own item photos"
on storage.objects for delete
using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public)
values ('outfit-wear-photos', 'outfit-wear-photos', true)
on conflict (id) do nothing;

create policy "Outfit wear photos are viewable by everyone"
on storage.objects for select
using (bucket_id = 'outfit-wear-photos');

create policy "Users can upload their own outfit wear photos"
on storage.objects for insert
with check (bucket_id = 'outfit-wear-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own outfit wear photos"
on storage.objects for delete
using (bucket_id = 'outfit-wear-photos' and (storage.foldername(name))[1] = auth.uid()::text);
