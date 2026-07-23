-- Guvenlik: "Profiles are editable by owner" politikasi (auth.uid() = id) satir
-- seviyesinde dogru ama SUTUN seviyesinde hicbir kisit yoktu - yani herhangi bir
-- kullanici kendi subscription_tier'ini dogrudan 'premium' yapip odeme yapmadan
-- sinirsiz Premium ayricaligi kazanabilirdi (RevenueCat/gercek odeme kontrolu
-- olmadan). Bu, Premium gating (bkz. app/premium.tsx, lib/premium.ts) gercek
-- anlam kazandiginda kesfedildi - kolon daha once hic kullanilmiyordu, simdi
-- kullanildigi icin butunlugu onemli hale geldi.
--
-- Cozum: subscription_tier/subscription_expires_at kolonlarina authenticated
-- rolunden UPDATE yetkisini kaldiriyoruz. Bu kolonlar artik SADECE service-role
-- (gelecekteki RevenueCat webhook Edge Function'i) tarafindan yazilabilir.
-- Diger profil alanlari (display_name, gender, avatar_url vb.) etkilenmiyor.

revoke update (subscription_tier, subscription_expires_at) on public.profiles from authenticated;
