-- Kombin gerekçesi artık kalıcı: reasoning (genel AI gerekçesi) ve pairing_notes
-- (parça-bazlı çift notları, [{"itemIds": [...], "note": "..."}] şeklinde jsonb)
-- şimdiye kadar sadece üretim anındaki ekranda yaşıyordu, kombin kaydedilince
-- kayboluyordu — artık outfits satırıyla birlikte saklanıyor.
alter table public.outfits
  add column if not exists reasoning text,
  add column if not exists pairing_notes jsonb;
