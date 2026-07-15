-- Kullanıcıyı daha iyi tanımak (ve ileride AI kombin önerisini kişiselleştirmek) için
-- profile'a yaş/boy/kilo/günlük stil alanları eklendi. gender kolonu zaten vardı (init_schema).

alter table public.profiles
  add column age smallint check (age between 1 and 120),
  add column height_cm smallint check (height_cm between 50 and 250),
  add column weight_kg smallint check (weight_kg between 20 and 300),
  add column daily_style text;
