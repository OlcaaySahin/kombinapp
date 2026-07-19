-- Giydim kaydı silme: outfit_wears'ta DELETE policy'si hiç yoktu.
-- Sonuç: supabase.from('outfit_wears').delete() hatasız dönüyor ama 0 satır
-- siliyordu (RLS sessiz başarısızlık deseni). Mevcut UPDATE/SELECT policy'leriyle
-- birebir aynı sahiplik ifadesi kullanılıyor.
create policy "Outfit wears are deletable by outfit owner"
  on public.outfit_wears
  for delete
  using (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_wears.outfit_id
        and outfits.user_id = auth.uid()
    )
  );
