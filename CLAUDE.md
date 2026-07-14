@AGENTS.md

# Proje Bağlamı: Kombin App

## Ürün Tanımı
Kullanıcının kendi kıyafet/ayakkabı/takı/kombin tamamlayıcı (güneş gözlüğü, şapka vb.) envanterini tuttuğu ve bu envanterden AI destekli kombin önerileri ürettiği bir mobil uygulama. Kombin oluştururken mevsim/mekan/saat/konsept gibi bağlamsal sorular sorulur. Envanterde olmayan tamamlayıcı ürün önerisi ve marka iş birlikleri (marketplace) ileri fazda planlanıyor.

## Teknoloji Yığını (kararlaştırıldı)
- **Mobil**: React Native + Expo (TypeScript), Expo Router — SDK 51
- **State/Data**: TanStack Query (server state) + Zustand (client state)
- **Styling**: NativeWind (Tailwind for RN) — araç kararı verildi, marka/görsel tema henüz kilitlenmedi (bkz. Figma notu)
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions) — yönetilen servis, solo/düşük bütçe için tercih edildi
- **Auth**: Supabase Auth (Google, email, telefon OTP)
- **AI**: Claude API — vision (ürün foto otomatik etiketleme: tür/renk/desen/mevsim) + text (kombin önerisi, yapılandırılmış JSON çıktı, metin+kart listesi formatında gösterilecek)
- **Push**: Expo Notifications
- **Ertelenen**: RevenueCat (premium/IAP), görsel kolaj/sanal deneme (try-on), marka marketplace entegrasyonu, partner eşleştirme, sosyal challenge

Seçim gerekçesi: kullanıcı mobil geliştirmede sıfırdan başlıyor, solo/düşük bütçe, AI-destekli kodlama ile çalışılacak (bu yığın en geniş dokümantasyon/AI-model desteğine sahip).

## MVP (v1) Kapsamı
**İçinde:**
- Kayıt/giriş (Google + email)
- Envanter: foto yükle (kamera/galeri/web) + AI otomatik etiketleme + manuel düzeltme
- AI kombin önerisi: bağlamsal sorular → metin+kart listesi çıktı
- Zar butonu: envanterden rastgele-uyumlu kombin
- Günlük 3 kombin limiti (ücretsiz tier, tamamlayıcı önerisi sınırsız)
- Kombinlerim: Geçmiş (giyilen) / Beğenilenler (oluşturulmuş+beğenilmiş ama giyilmemiş) sekmeleri
- Giydim işaretleme + dış mekan fotoğrafı ekleme (kombin albümü)

**Sonraya bırakıldı:** Partner eşleştirme, marka marketplace/alışveriş önerisi, sosyal challenge/paylaşım, görsel kolaj veya sanal deneme (try-on), Premium/RevenueCat entegrasyonu, günlük 5 alışveriş önerisi limiti (marketplace ile birlikte gelecek).

## Veritabanı Şeması (Postgres / Supabase, RLS açık)

- **profiles** — id (→auth.users), display_name, avatar_url, gender?, subscription_tier, subscription_expires_at
- **partnerships** (v2) — requester_id, partner_id, status (pending/accepted/declined)
- **categories** (lookup) — name, slot (ust_giyim/alt_giyim/tek_parca/dis_giyim/ayakkabi/canta/taki/tamamlayici), icon
- **items** (envanter) — user_id, category_id, slot, name, color, pattern, season[], brand, image_url, source_type (user_photo/web_photo), ai_tags (jsonb)
- **outfits** (kombinler) — user_id, name?, is_liked, generation_source (ai_generated/dice/manual), generation_context (jsonb: mevsim/mekan/saat/konsept)
- **outfit_items** (join) — outfit_id, item_id
- **outfit_wears** — outfit_id, worn_date, photo_url, note? (bir kombin birden fazla kez giyilebilir, her seferinde ayrı foto)
- **generation_events** (freemium limit log) — user_id, type (outfit/shopping_suggestion), created_at → günlük limit `WHERE created_at >= CURRENT_DATE` ile sayılır

Güvenlik: her tabloda RLS, `user_id = auth.uid()` kısıtı. Partner özelliği geldiğinde `partnerships`'teki kabul edilmiş ilişkiye göre partnerin `items`'ına salt-okunur erişim politikası eklenecek.

## Ekran Akışı

Bottom tab: **Ana Sayfa** (kombin oluştur) · **Envanter** · **Kombinlerim** (Geçmiş/Beğenilenler) · **Profil**

- Onboarding: Splash → Giriş → boş envanter yönlendirmesi → ilk ürün ekleme
- Ürün ekleme: Envanter → "+" → foto kaynağı → AI etiketleme → kullanıcı düzeltir → kaydet
- AI kombin oluşturma: Ana Sayfa → bağlamsal sorular → sonuç kartı → Beğen/Tekrar Dene/Giydim
- Zar: Ana Sayfa → zar ikonu → anında rastgele-uyumlu kombin (aynı sonuç bileşeni)
- Giydim işaretleme: Kombin detay → "Giydim" → dış mekan foto + not → `outfit_wears`'a kayıt
- Limit doldu: 3. kombin denemesinde Premium modalı (şimdilik pasif placeholder)

## Marka Paleti (Figma moodboard referansından çıkarıldı)
- Ana renk: `#3461FD` (primary, `tailwind.config.js` + `constants/Colors.ts` → tint)
- Vurgu renkleri: mor `#8B3FE8`, hardal `#E8B923`, mercan `#FF4757` (`constants/Colors.ts` → `Accent`)
- Tipografi: başlıklar Poppins (SemiBold/Bold), gövde metni Inter (Regular/Medium/SemiBold) — `@expo-google-fonts/*`, `tailwind.config.js` → `fontFamily.heading` / `fontFamily.body`
- Kaynak: kullanıcının paylaştığı "Shoppe" tarzı genel e-ticaret UI kiti — birebir şablon değil, mood/stil referansı olarak kullanıldı (bkz. pin/etiket kartı, görsel tarama akışı, filtre paneli fikirleri).

## Önemli: NativeWind sürüm kısıtı
`nativewind` **4.1.23**'e sabitlendi (`^4` değil). Neden: `nativewind@4.2.x`, `react-native-css-interop@0.2.x`'i getiriyor ve bu paket babel preset'inde koşulsuz olarak `react-native-worklets/plugin`'i talep ediyor — bu paket sadece **Reanimated 4** ile birlikte gelir. Biz Expo SDK 51'in pinlediği **Reanimated 3.10.1**'i kullanıyoruz, bu yüzden `expo export -p web` babel hatasıyla patlıyordu. Reanimated 4'e geçmeden (büyük, riskli bir yükseltme) `nativewind`'i `^4.2`'ye yükseltme — önce bu notu güncelle.

## Prototip Durumu (mock veriyle)
Çekirdek 4 ekran, gerçek backend olmadan, `lib/mockData.ts` içindeki sahte verilerle kodlandı ve çalışır durumda (`npx tsc --noEmit`, `npx expo export -p web`, `npm test` hepsi temiz geçiyor):
- **Ana Sayfa** (`app/(tabs)/index.tsx`) — bağlamsal soru akışı (mevsim/mekan/saat/konsept çipleri) + Zar At butonu + sonuç kartı, günlük 3 limit sayacı (state'te, kalıcı değil)
- **Envanter** (`app/(tabs)/envanter.tsx`) — kategori filtre çipleri + 2 kolonlu ürün grid'i
- **Kombinlerim** (`app/(tabs)/kombinlerim.tsx`) — Geçmiş/Beğenilenler segmented tab
- **Profil** (`app/(tabs)/profil.tsx`) — hesap özeti + menü listesi
- Ortak bileşenler `components/ui/` altında: `CategoryChip`, `ItemCard`, `OutfitCard`, `PrimaryButton`, `OptionChipRow`

**Henüz gerçek değil**: auth, veri kalıcılığı, AI kombin üretimi — hepsi `lib/mockData.ts`'ten geliyor.

## Ortam Değişkenleri / Secrets (gitignore'da, repo'da yok)
İki ayrı dosya, iki ayrı güven seviyesi — birbirine karıştırılmamalı:

- **`.env`** (repo kökü) — Expo/client tarafı, `EXPO_PUBLIC_*` prefix'li, **uygulama paketine gömülür, gizli değildir**. İçinde: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Şablon: `.env.example`. Proje: `OlcaaySahin's Project`, ref `tvjjwpotqeybtkkvvwox`, bölge Tokyo (ap-northeast-1).
- **`supabase/.env`** — sunucu-taraf secret, **asla client'a girmemeli**. İçinde: `ANTHROPIC_API_KEY` (console.anthropic.com, Claude Code aboneliğinden ayrı, kullanım bazlı ücretli). Henüz kullanılmıyor — AI kombin üretimi Edge Function'ı yazıldığında `supabase secrets set` ile Supabase'e taşınacak.

Her iki dosya da yeni bir geliştirme ortamında **elle yeniden oluşturulmalı** (gitignore'da olduğu için repo'yu klonlayan biri bunları göremez).

**Supabase şema durumu**: `supabase/migrations/20260715000000_init_schema.sql` yazıldı ve commit'lendi, ama gerçek Supabase projesinde **çalıştırılıp çalıştırılmadığı teyit edilmedi** — kullanıcıya SQL Editor'da manuel çalıştırması söylendi. Yeni oturum başlarsa önce bunu doğrula (örn. `categories` tablosu dolu mu diye bak).

## Notlar
- **Figma MCP** `.mcp.json` içinde proje seviyesinde tanımlı (`figma`, http transport). Aktif olması için VS Code workspace kökünün bu klasör olması ve yeni bir Claude Code oturumu gerekiyor.
- Geliştirme ortamı Windows; Git kurulumu proje başında ayrıca yapıldı (winget). PowerShell oturumları PATH'i cache'lediği için her komutta `$env:Path` yenilemesi gerekiyor (bkz. git geçmişi).
- Test/doğrulama: `npx tsc --noEmit`, `npm test`, `npx expo export -p web` (gerçek bundling hatalarını yakalar, sadece tip kontrolü yetmez).
