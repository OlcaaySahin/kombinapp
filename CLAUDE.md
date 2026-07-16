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
- Giriş: **Supabase anonymous sign-in** ile başlandı (bkz. "Auth Stratejisi" notu) — Google/email ekranı bilerek ertelendi
- Envanter: foto seç (galeri) → AI otomatik etiketleme dener (Edge Function deploy edilmediyse sessizce atlanır) → manuel düzelt → Storage'a yükle → kaydet. **Cihazda test edildi, sorunsuz çalışıyor** (2026-07-15, kullanıcı onayladı — bkz. Notlar).
- AI kombin önerisi: bağlamsal sorular → Edge Function (Claude) dener, deploy edilmediyse/başarısız olursa yerel kural tabanlı seçime sessizce düşer
- Zar butonu: envanterden her zaman yerel rastgele-uyumlu seçim (AI'ya hiç gitmez, bilinçli tasarım kararı)
- Günlük 3 kombin limiti — artık gerçek: `generation_events` tablosundan sayılıyor, state'te değil
- Kombinlerim: Geçmiş (`outfit_wears` ile inner join) / Beğenilenler (`is_liked=true`) — gerçek Supabase sorguları
- Envanterden ürün silme (uzun bas + onayla)
- Giydim işaretleme: Beğenilenler'de her kart altında "Giydim olarak işaretle" → `app/mark-worn.tsx` (foto opsiyonel + not) → `outfit_wears`'a kayıt, kombin otomatik olarak Geçmiş'e geçer

**MVP kapsamı artık tamamlandı ve AI ucu gerçekten canlı** (2026-07-15 gece oturumu) — Edge Function'lar deploy edildi ve uçtan uca test edildi (gerçek Claude yanıtı alındı). Kalan tek iş: Storage migration'ın çalıştırılması ve foto akışlarının cihazda ilk kez denenmesi (sabah listesi).

**Sonraya bırakıldı:** Partner eşleştirme, marka marketplace/alışveriş önerisi, sosyal challenge/paylaşım, görsel kolaj veya sanal deneme (try-on), Premium/RevenueCat entegrasyonu, günlük 5 alışveriş önerisi limiti (marketplace ile birlikte gelecek).

**Fikir havuzu (2026-07-15, kullanıcı eklendi, henüz kapsama alınmadı):**
- **Marka API / "Bu üründen bende var" entegrasyonu**: resmi API/ortaklık gerektiren kısmı hâlâ gerçekçi değil. Ama "ürün linkinden meta veriyle otomatik doldurma" ara çözümü **artık yapıldı** — bkz. "İstek Listesi: Ürün Linkinden Otomatik Doldurma". İleride: (a) OS paylaşım sayfasından (Trendyol app'inde "Paylaş" → bizim app) linki doğrudan almak (native share extension gerektirir, büyük iş), (b) aynı linkten-doldurma akışını normal envanter ekleme akışına da taşımak (şu an sadece istek listesinde var).
- ~~**Rating → AI kişiselleştirme geri beslemesi**~~ — **TAMAMLANDI (2026-07-16)**, bkz. "Rating Kişiselleştirme + Parça-Bazlı Gerekçe".
- ~~**Parça bazlı (çift bazlı) kombin gerekçesi**~~ — **TAMAMLANDI (2026-07-16)**, bkz. "Rating Kişiselleştirme + Parça-Bazlı Gerekçe".

## Günlük Kombin Limiti — Bilinçli Olarak Pasif (2026-07-15)
`app/(tabs)/index.tsx`'teki `DAILY_LIMIT_ENABLED = false` — demo/test aşamasında kullanıcı isteğiyle kapatıldı. Sayaç mekanizması (`generation_events` tablosu, `useDailyOutfitCount`, UI'daki "X/3 kullanıldı" göstergesi) **tamamen sağlam ve çalışıyor**, sadece engelleme devre dışı. Gerçek kullanıcılarla yayına geçerken `DAILY_LIMIT_ENABLED = true` yapmak yeterli — başka bir değişiklik gerekmez.

## Veritabanı Şeması (Postgres / Supabase, RLS açık)

- **profiles** — id (→auth.users), display_name, avatar_url, gender?, subscription_tier, subscription_expires_at
- **partnerships** (v2) — requester_id, partner_id, status (pending/accepted/declined)
- **categories** (lookup) — name, slot (ust_giyim/alt_giyim/tek_parca/dis_giyim/ayakkabi/canta/taki/tamamlayici), icon
- **items** (envanter) — user_id, category_id, slot, name, color, pattern, season[], brand, image_url, source_type (user_photo/web_photo), ai_tags (jsonb)
- **outfits** (kombinler) — user_id, name?, is_liked, rating (1-5, nullable), generation_source (ai_generated/dice/manual), generation_context (jsonb: mevsim/mekan/saat/konsept)
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

## Auth Stratejisi: Anonymous Sign-In
Gerçek giriş/kayıt EKRANI bilerek ertelendi ama auth'un kendisi ertelenmedi — `lib/auth.ts`'teki `bootstrapSession()`, uygulama açılışında (`app/_layout.tsx`) otomatik olarak Supabase'in **anonymous sign-in**'ini çağırıyor. Kullanıcı hiçbir ekran görmüyor ama gerçek bir `auth.uid()` alıyor, bu yüzden RLS politikaları (`auth.uid() = user_id`) baştan itibaren gerçek ve test edilmiş durumda. `lib/stores/authStore.ts` (Zustand) `userId`'yi tüm ekranlara açıyor.

Neden bu yaklaşım: sahte/hardcoded bir `user_id` ile ilerleseydik, gerçek girişi eklerken RLS uyuşmazlığı yüzünden ciddi rework gerekirdi. İleride gerçek login eklendiğinde, Supabase'in native "anonymous → gerçek hesaba yükseltme" (`linkIdentity` vb.) akışıyla veri kaybı olmadan geçiş yapılabilir.

**Önemli**: Supabase Dashboard'da Authentication → Sign In/Providers → "Allow anonymous sign-ins" **açık olmalı** (2026-07-15'te kullanıcı tarafından açıldı ve doğrulandı). Kapatılırsa uygulama açılışta patlar.

## Gerçek Giriş: E-posta ile Hesap Yükseltme — CANLI VE UÇTAN UCA TEST EDİLDİ (2026-07-15)
Anonim kullanıcı, verisini kaybetmeden kalıcı bir hesaba "yükseltiliyor" (aynı `auth.uid()` korunuyor, sadece `is_anonymous` `false` oluyor):
- `lib/auth.ts` → `sendAccountUpgradeCode(email)` (`supabase.auth.updateUser({ email })`) ve `verifyAccountUpgradeCode(email, token)` (`supabase.auth.verifyOtp({ email, token, type: 'email_change' })`)
- `app/sign-in.tsx` — e-posta gir → kod gönder → kodu gir → doğrula, iki adımlı modal ekran
- `app/(tabs)/profil.tsx` — anonim kullanıcıya "Hesabını Oluştur" kartı gösterip `/sign-in`'e yönlendiriyor; gerçek kullanıcıya e-postasını gösteriyor
- `lib/stores/authStore.ts` artık `isAnonymous` ve `email` de tutuyor, `lib/auth.ts`'teki `syncSession()` her auth state değişikliğinde günceliyor
- **Gerçek testle doğrulandı**: anonim oturum → kod gönderildi → kullanıcı gerçek e-postasından kodu aldı → doğrulama sonrası `is_anonymous: false` teyit edildi

**Kritik gotcha'lar (sırasıyla keşfedildi):**
1. Supabase'in varsayılan (yerleşik) e-posta servisi şablonları **düzenlemeye izin vermiyor** — sadece link içeren sabit varsayılan şablonu gönderiyor. Şablon içeriğini (`{{ .Token }}` eklemek gibi) değiştirmek için **önce özel SMTP kurmak zorunlu** (Supabase Dashboard bunu açıkça UI'da belirtiyor: "Set up custom SMTP to edit templates").
2. Kullanıcı Gmail'i SMTP olarak kurdu (`smtp.gmail.com:587`, Gmail App Password ile, gönderen: `kombinapp67@gmail.com`) — günde 500 mail limiti bizim ölçeğimiz için fazlasıyla yeterli. "Change email address" şablonuna `{{ .Token }}` eklendi.
3. **Supabase'in OTP kodu 6 haneli değil, 8 haneli** — `app/sign-in.tsx`'teki input `maxLength` buna göre ayarlandı (6→8). Varsayımla ilerlenirse (çoğu üçüncü parti auth örneği 6 haneli varsayır) kod input'u kırpar, doğrulama sessizce başarısız olur.
4. Link-tabanlı varsayılan şablon (SMTP kurulmadan önce) aslında **arka planda çalışıyordu** — kullanıcı "link çalışmıyor" dese de sunucu tarafında onay gerçekleşmişti (ikinci bir `updateUser` denemesi "already registered" hatası verince anlaşıldı). Yani mobilde link'in görsel olarak "başarılı" görünmemesi, onayın gerçekleşmediği anlamına gelmiyor — şüphede kalınırsa `getUser()` ile kontrol edin.
5. Gmail nokta-duyarsızdır (`o.l.c.a.y.s.a.h.i.n5858@gmail.com` ile `olcaysahin5858@gmail.com` aynı kutuya düşer) ama **Supabase bunları farklı e-posta olarak görür** — test sırasında "already registered" hatasına takılırsanız nokta varyasyonunu değiştirmek pratik bir geçici çözüm.

**Hâlâ eksik**: Google OAuth girişi — Google Cloud Console'da ayrı kurulum (OAuth Client ID/Secret) gerektirir, kullanıcı henüz bunu sağlamadı, MVP'yi bloklamıyor (email akışı zaten çalışıyor).

## Gerçek Veri Durumu (mock kaldırıldı, `lib/mockData.ts` silindi)
Tüm ekranlar gerçek Supabase sorgularıyla çalışıyor (`npx tsc --noEmit`, `npx expo export -p web`, `npm test` hepsi temiz):
- **Ana Sayfa** (`app/(tabs)/index.tsx`) — bağlamsal soru akışı → `lib/aiOutfit.ts`'teki `requestAiOutfit()` (Edge Function dener, fallback'li) · Zar At → `lib/outfitGenerator.ts`'teki `generateRandomOutfit()` (her zaman lokal) · günlük limit `useDailyOutfitCount` ile DB'den · "Beğen" → `useCreateOutfit` ile `outfits`+`outfit_items`'a yazar
- **Envanter** (`app/(tabs)/envanter.tsx`) — `useItems()` ile gerçek liste, "+" → `app/add-item.tsx` (modal: foto seç → AI etiketleme dener → manuel form: isim/kategori/renk → Storage'a yükle → kaydet), uzun bas → silme
- **Kombinlerim** (`app/(tabs)/kombinlerim.tsx`) — `useLikedOutfits()` / `useWornOutfits()` (gerçek join sorguları)
- **Profil** (`app/(tabs)/profil.tsx`) — hâlâ statik placeholder (anonim kullanıcının gösterecek bir adı/emaili yok, gerçek login gelince doldurulacak)
- Veri hook'ları: `lib/hooks/useItems.ts`, `lib/hooks/useOutfits.ts` — TanStack Query, RLS sayesinde client tarafında `user_id` filtresi gerekmez (sadece INSERT'te gönderilir)

## Edge Functions — DEPLOY EDİLDİ VE CANLI DOĞRULANDI (2026-07-15)
- `supabase/functions/generate-outfit` — kullanıcının JWT'siyle kimlik doğrular, envanterini çeker, Claude'a (varsayılan model: `claude-haiku-4-5-20251001`, maliyet-etkin) tool-use ile zorunlu JSON çıktı aldırır, seçilen `itemIds` + `reasoning` döner. **Uçtan uca test edildi**: gerçek anonim kullanıcı + test ürünleriyle çağrıldı, Claude gerçek ve tutarlı bir kombin + Türkçe gerekçe döndürdü.
- `supabase/functions/tag-item-photo` — base64 foto alır, Claude vision ile `slot/name/color/colorName/pattern/season` etiketleri döner. `lib/aiTagging.ts`'teki `suggestTagsForPhoto()` üzerinden `app/add-item.tsx`'te çağrılıyor. **Deploy sonrası test edildi** (1x1 piksel test görseliyle — pipeline çalışıyor, gerçek bir kıyafet fotoğrafıyla henüz denenmedi).
- Deploy yöntemi: `supabase functions deploy <ad> --project-ref tvjjwpotqeybtkkvvwox` (Personal Access Token `SUPABASE_ACCESS_TOKEN` env var olarak set edilerek, `supabase link` **kullanılmadı** — bu, olası DB şifresi promptunu atlamak için bilinçli bir tercih, `--project-ref` flag'i link olmadan da çalışıyor). Docker kurulu değildi, CLI otomatik olarak Docker'sız API-tabanlı bundling'e düştü — sorun çıkarmadı.
- `ANTHROPIC_API_KEY`, `supabase secrets set --project-ref tvjjwpotqeybtkkvvwox --env-file supabase/.env` ile Supabase'e taşındı (doğrulandı, gerçek Claude çağrıları çalışıyor).
- Client tarafı (`lib/aiOutfit.ts`, `lib/aiTagging.ts`) hiçbir değişiklik gerektirmedi — fallback mekanizması zaten deploy-sonrası durumu otomatik olarak yakalıyor.
- Kontrol paneli: `https://supabase.com/dashboard/project/tvjjwpotqeybtkkvvwox/functions`

## Ortam Değişkenleri / Secrets (gitignore'da, repo'da yok)
İki ayrı dosya, iki ayrı güven seviyesi — birbirine karıştırılmamalı:

- **`.env`** (repo kökü) — Expo/client tarafı, `EXPO_PUBLIC_*` prefix'li, **uygulama paketine gömülür, gizli değildir**. İçinde: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Şablon: `.env.example`. Proje: `OlcaaySahin's Project`, ref `tvjjwpotqeybtkkvvwox`, bölge Tokyo (ap-northeast-1).
- **`supabase/.env`** — sunucu-taraf secret, **asla client'a girmemeli**. İçinde: `ANTHROPIC_API_KEY` (console.anthropic.com, Claude Code aboneliğinden ayrı, kullanım bazlı ücretli). `supabase secrets set` ile Supabase'e taşındı ve doğrulandı — hem yerel dosya hem Supabase secret olarak iki yerde duruyor (senkron kalması için ileride key rotasyonu yaparsan ikisini de güncelle).

Her iki dosya da yeni bir geliştirme ortamında **elle yeniden oluşturulmalı** (gitignore'da olduğu için repo'yu klonlayan biri bunları göremez).

**Supabase şema durumu**:
- `supabase/migrations/20260715000000_init_schema.sql` — kullanıcı tarafından SQL Editor'da çalıştırıldı ve doğrulandı (anon key ile `categories` tablosuna canlı sorgu atılıp 8 satır döndüğü teyit edildi). Tüm tablolar ve RLS politikaları prod projede (`tvjjwpotqeybtkkvvwox`, Tokyo) aktif.
- `supabase/migrations/20260715010000_storage_setup.sql` — `item-photos` ve `outfit-wear-photos` bucket'larını + RLS politikalarını oluşturuyor. **Kullanıcı tarafından SQL Editor'da çalıştırıldı ve doğrulandı**: her iki bucket'a da anon key + RLS ile gerçek dosya yükleme, herkese açık URL erişimi (HTTP 200) ve silme test edildi, hepsi sorunsuz.

## İstek Listesi: Ürün Linkinden Otomatik Doldurma (2026-07-15)
"Fikir havuzu"ndaki "kullanıcı ürün linki paylaşır, biz og:image/og:title/fiyattan formu otomatik doldururuz" fikri hayata geçirildi. Yeni **`fetch-product-link` Edge Function**:
1. Verilen linki normal bir tarayıcı User-Agent'ıyla çeker — **bot korumasını aşmaya çalışmıyor**, sadece sitelerin link önizlemeleri (WhatsApp/Instagram paylaşımı vb.) için zaten herkese açık yayınladığı meta veriyi (og: tag'leri, JSON-LD `Product` şeması) okuyor. Kullanıcı bilinçli olarak proxy/bot-atlatma önerdi, bu reddedildi — gerek de yoktu, gerçek bir Trendyol linkiyle canlı test edildiğinde hiçbir engelle karşılaşılmadı (düz `fetch`, HTTP 200, tam JSON-LD `Product` verisi: isim/görsel/fiyat/renk).
2. JSON-LD `Product` varsa isim/görsel/fiyat/renk oradan, yoksa `og:title`/`og:image`'e düşülüyor.
3. Çekilen ürün görseli indirilip Claude vision'a gönderiliyor — hem **temiz bir Türkçe isim + kategori + hex renk** üretiliyor hem de `isClothingItem` boolean'ı ile **alakasız ürünler (bilgisayar vb.) reddediliyor**.
4. `lib/productLink.ts` → `fetchProductFromLink()`, `app/add-wishlist-item.tsx`'te ürün linki alanının altında "Linkten Doldur" butonu — çekilen veriler forma yazılıyor, kaydetmeden önce hepsi düzenlenebilir kalıyor (foto seçme akışındaki AI etiketleme ile aynı UX deseni).

**Canlı test edildi**: gerçek bir Trendyol ürün linkiyle (deri ceket) çağrıldı, `isClothingItem: true`, temiz isim "Siyah Deri Ceket", doğru kategori (`dis_giyim`), doğru hex renk, fiyat (sayfanın döndürdüğü para birimiyle, ör. bazı URL varyantlarında EUR bazı varyantlarında TRY dönebiliyor — sayfanın kendi içeriğine bağlı, kod tarafında bir sorun değil). "Alakasız ürün reddi" (`isClothingItem: false`) yolu ayrıca canlı test edilmedi (uygun bir test linki yoktu) ama şema/mantık aynı, düşük risk.

**Bilinen güvenilirlik sınırı — DÜZELTİLDİ SONRA GERİ ALINDI (2026-07-15)**: İlk gözlemde Trendyol aynı linke bazen tam JSON-LD dolu, bazen boş bir SPA "shell" döndürüyordu. İlk çözüm olarak 4 deneme + her denemede sahte bir cache-buster query param eklendi — canlı testte başarı oranını ~%25'ten ~%60'a çıkardı GİBİ görünmüştü. Ama kullanıcı cihazda gerçek kullanımda test edince tam tersi oldu: Trendyol 5/5 başarısız, Zara açıkça 403, LCW bazen çalışıp bazen 403 verdi. Bu, ilk teşhisin (salt "backend load balancer tutarsızlığı") eksik olduğunu gösterdi — muhtemelen **soft bot tespiti**: bazı siteler açık 403 yerine sessizce boş/anlamsız içerik döndürüyor, ve 4x hızlı + şüpheli query param'lı istek deseni tam da botları ele veren bir imza, muhtemelen Trendyol'un IP'yi daha da şüpheli işaretlemesine yol açtı.

**Karar**: agresif retry geri alındı. Artık sadece **1 nazik tekrar deneme** (1.5s aralıkla), cache-buster query param **yok**, URL olduğu gibi kullanılıyor. Bir site açıkça engellerse (403 vb.) **hiç tekrar denenmiyor** — bu net bir "hayır" sinyali, etrafından dolanmaya çalışmıyoruz (kullanıcıya da açıkça söylendi: proxy/bot-atlatma yapılmayacak, [[İstek Listesi: Ürün Linkinden Otomatik Doldurma]]'daki ilk karışıklıktaki gibi). Sonuç: bazı siteler (aktif bot koruması olanlar — Zara gibi) hiç çalışmayabilir, bazıları (Trendyol gibi) çoğunlukla çalışır ama garanti değil, manuel doldurma her zaman yedek. `lib/productLink.ts` supabase-js'in jenerik "non-2xx" hata mesajı yerine Edge Function'ın response gövdesindeki asıl hata metnini gösteriyor.

**Ders**: "daha fazla deneme = daha güvenilir" varsayımı bot-tespiti olan sistemlerde tam tersine çalışabilir — ölçüm yaparken az sayıda örnekle ("başarı arttı görünüyor") aceleci sonuca varmamalı, ve retry/cache-busting gibi "dayanıklılık" iyileştirmeleri bile niyet dışında bir kaçınma/evasion deseni oluşturabileceğinden dikkatli tasarlanmalı.

## Ana Sayfa İçerik Doldurma (2026-07-16)
Kullanıcı idle ekranın boş göründüğünü fark etti, Figma'daki e-ticaret enerjisiyle bizim "sakin kişisel asistan" pozisyonumuz arasında birlikte karar verdik: **marka/reklam alanı veya agresif alışveriş önerisi YOK** — sadece kullanıcının kendi verisiyle konuşan bloklar:

- **İstek listesi hatırlatıcısı** (istek listesi doluysa) — dokununca soru ekranına geçip `includeWishlist`'i otomatik açıyor.
- **`WardrobeStats`** — ürün sayısı, en çok kullanılan renk, en kalabalık kategori. `lib/colorNames.ts` (yeni, paylaşılan Türkçe renk-adı modülü — `outfitPreview.ts`'teki İngilizce kopyadan ayrı, o görsel üretim prompt'una hizmet ediyor).
- **`RecentOutfitsStrip`** — beğenilen kombinlerin yatay 2x2 mozaik şeridi, dokununca Kombinlerim'e gidiyor.

Partner Eşleştirme/story/sosyal akış fikri **ertelendi** — kullanıcı kız arkadaşına danışacak. Değerlendirmem: geniş bir kamuya açık sosyal akış yerine zaten planlı olan Partner Eşleştirme'yi (sadece partnerle paylaşım) önceliklendirmek daha az riskli ve zaten yol haritasında.

## Edge Function'larda Rate-Limit (2026-07-16)
Daha önce hiçbir korunma yoktu — `generate-outfit`, `tag-item-photo`, `fetch-product-link` üçü de sınırsız çağrılabiliyordu (anon key zaten public, sadece bir oturum yeterliydi), bu gerçek bir Claude API maliyet riskiydi. `tag-item-photo` ve `fetch-product-link`'in ayrıca **hiç auth kontrolü bile yoktu** (Authorization header hiç okunmuyordu) — ikisine de eklendi.

Üçü de artık: kullanıcının son 1 saatteki `generation_events(type='ai_call')` satır sayısı 30'u geçerse `429` dönüyor, geçmezse yeni bir `ai_call` satırı ekleyip devam ediyor. `generation_events.type` CHECK kısıtı `ai_call` değerini kapsayacak şekilde genişletildi (`20260716010000_extend_generation_events_type.sql`, Management API ile çalıştırıldı). 30/saat, gerçek bir kullanıcının normal kullanımında asla tetiklenmeyecek kadar cömert, ama script/kötüye kullanımı sınırlıyor.

**Canlı test edildi**: her üç fonksiyon da rate-limit kodu eklendikten sonra normal çağrılarda sorunsuz çalışmaya devam ediyor (regresyon yok — özellikle `tag-item-photo`/`fetch-product-link`'e yeni eklenen auth zorunluluğu client tarafını bozmadı, çünkü `supabase.functions.invoke()` zaten otomatik olarak Authorization header'ı gönderiyor). 30 çağrı doldurulup 31.'si denendiğinde doğru şekilde "Çok fazla istek gönderildi" hatası döndü.

## Onboarding Turu + Profil Menü Ölü Öğeleri (2026-07-16)
Kullanıcının "boş durmama" fikri + "işlevsiz menüleri işlevli kıl" isteği üzerine gece yapıldı:

- **`app/onboarding.tsx`** — 6 kartlık, dokunarak (kartın herhangi bir yerine veya "İleri" butonuna basınca) ilerlenen bir tanıtım turu. Video değil, sadece ikon+başlık+açıklama kartları: hoş geldin → envanter oluştur → bağlamsal soru ile kombin → zar → karıştır → istek listesi. `lib/onboarding.ts`'teki `hasSeenOnboarding()`/`markOnboardingSeen()` AsyncStorage kullanıyor (yeni bir tabloya gerek yok, cihaz bazlı bir tercih zaten). Ana Sayfa mount olduğunda kontrol edilip görülmediyse otomatik açılıyor (`app/(tabs)/index.tsx`'teki `useEffect`).
- **`app/yardim.tsx`** — artık gerçek bir SSS ekranı (5 soru-cevap) + "Tanıtımı Tekrar İzle" butonu (onboarding'i istenildiği zaman tekrar açar). Daha önce sadece "Yakında" alerti veriyordu.
- **`app/bildirimler.tsx`** — günlük kombin hatırlatıcısı tercihini (açık/kapalı + saat, chip seçimi) AsyncStorage'a kaydediyor. **Bilinçli olarak `expo-notifications` eklenmedi** — yeni bir native modül mevcut dev-client build'ini yeniden derletmeyi (`eas build`) gerektirir ve bu gece (kullanıcı uyurken) test edilemezdi; sadece tercih kaydediliyor, gerçek bildirim gönderimi ileride bu tercihi kullanarak eklenebilir. Bu, "her şeyi işlevli yap" isteğiyle "test edemeyeceğim native değişiklik yapma" ilkesi arasında bilinçli bir denge.
- **Partner Eşleştirme / Premium'a Yükselt** hâlâ "Yakında" alerti veriyor — bunlar gerçekten büyük, ayrı backend (partner eşleştirme mantığı) veya ödeme altyapısı (RevenueCat) gerektiren özellikler, sahte bir ekranla doldurmak yanlış olurdu, dürüstçe "yakında" demek tercih edildi.

**Kullanıcı tarafından cihazda doğrulandı (2026-07-16)**: onboarding turu görsel olarak kontrol edildi, kartlar düzgün görünüyor. `fetch-product-link`'in "alakasız ürün reddi" (`isClothingItem: false`) yolu da canlı test edildi, doğru çalışıyor — daha önce sadece şema/mantık seviyesinde doğrulanmıştı, artık gerçek bir "bilgisayar vb." linkiyle teyit edildi.

## Rating Kişiselleştirme + Parça-Bazlı Gerekçe (2026-07-16)
Kullanıcı uyurken Fikir havuzu'ndaki iki backlog maddesi tamamlandı, `generate-outfit`'e eklendi:

1. **Rating → kişiselleştirme**: kullanıcının 4-5 yıldız verdiği geçmiş kombinlerdeki (en fazla son 15) renk/marka sıklığı çıkarılıp (en az 3 puanlı kombin şartıyla — yetersiz veride devreye girmez) prompt'a hafif bir sinyal olarak ekleniyor: "geçmişte şu renkleri/markaları tercih etmiş, mümkünse öncelik ver ama bağlama uygunluk her zaman daha önemli." **Canlı test edildi**: kasıtlı olarak siyah/Zara ağırlıklı 4 tane 5-yıldızlı kombin oluşturulup nötr bir yaz/günlük bağlamda yeni kombin istendi — model geçmiş tercihi fark etti ama bağlama (yaz, hafif renkler) uygun olmadığı için bilinçli olarak es geçip beyaz/bej seçti, gerekçesinde bunu açıkça belirtti. Yani kişiselleştirme bağlamı ASLA ezmiyor, sadece eşit şartlarda hafif bir öncelik veriyor — istenen davranış tam bu.
2. **Parça-bazlı (çift-bazlı) gerekçe**: `SUGGEST_OUTFIT_TOOL` şemasına opsiyonel `pairingNotes: [{itemIds, note}]` eklendi (en fazla 3 tane, somut olması için prompt'ta özellikle istendi). `lib/aiOutfit.ts` → `OutfitSuggestion.pairingNotes`, `app/(tabs)/index.tsx`'te `generatedPairingNotes` state'i, `OutfitCard`'da genel `reasoning`'in hemen altında, ilgili ürün isimleriyle birlikte gösteriliyor (mor pırıltı ikonu, ampul ikonundan ayırt edilsin diye). "Karıştır" ile parça değiştirilince (artık geçersiz olabileceği için) temizleniyor. **Canlı test edildi**, çıktı gerçekten spesifik ("Bej pantolonun nötr rengi, beyaz spor ayakkabıyla açık ve ferah bir yaz havası yaratıyor" gibi), genel geçer laf değil.

## Headless Browser Fallback (Render + Playwright) — Kuruldu, Trendyol İçin Çözüm Olmadı (2026-07-16)
Kullanıcı ısrarla "bunu düzgün çözelim" dedi. Kurulan altyapı:
- `render-headless-service/` — küçük bir Express servisi, `POST /render` ile bir URL'i gerçek Chromium'da (Playwright) açıp JS çalıştıktan sonraki HTML'i dönüyor. Playwright'in resmi Docker imajı kullanıldı (Render'ın düz Node build ortamında `playwright install --with-deps` için gereken root/apt erişimi yok). `x-api-key` ile korunuyor. Render'ın ücretsiz planında barındırılıyor (512MB RAM, düşük CPU, 15dk hareketsizlikten sonra uyuyor).
- **Kurulum gotcha'sı**: npm `playwright` paketi (`^1.47.0`) en güncel 1.61.1'i kurdu ama Docker imajı `v1.47.0-jammy` idi — tarayıcı binary'si eksik hatası. İkisi de `1.61.1` / `v1.61.1-jammy`'e sabitlenerek düzeltildi. Ayrıca **Render'ın push'ta otomatik deploy tetiklemediği** görüldü — kullanıcı elle "Manual Deploy → Deploy latest commit" yapmak zorunda kaldı.
- Proje ilk kez GitHub'a push edildi (`github.com/OlcaaySahin/kombinapp`, `main` branch) — Render'ın buradan build alabilmesi için gerekliydi, yan fayda olarak projenin de ilk kez uzak bir yedeği oldu.
- `fetch-product-link` içine entegre edildi: direkt fetch 200 dönüp içinde ürün verisi olmayan boş bir shell dönerse (yalnızca bu durumda — açık bir engelleme/403'te ASLA), `RENDER_SERVICE_URL`/`RENDER_SERVICE_API_KEY` (Supabase secret) ayarlıysa headless servise düşüyor.

**Sonuç — Trendyol için işe yaramadı**: Servis teknik olarak sorunsuz çalışıyor (200 dönüyor, gerçek HTML render ediyor) ama **canlı test edildiğinde 2/2 denemede Trendyol'un JENERİK ANA SAYFASINI** (ürün sayfası değil, `og:title: "Online Alışveriş Sitesi, Türkiye'nin Trend Yolu"`, JSON-LD hiç yok) döndürdü — düz `fetch`'in ~%50-60 başarı oranından DAHA KÖTÜ. Bu, orijinal teşhisi (JS hidrasyonu gerekiyor) çürüttü: sorun muhtemelen origin seviyesinde, JS çalışıp çalışmamasından bağımsız — Trendyol'un kendisi bazen boş bir yanıt veriyor ve gerçek bir tarayıcı bunu "düzeltemiyor" çünkü veri hiç gönderilmemiş. Daha endişe verici ihtimal: Trendyol'un bot tespiti headless Chromium'u (bilinen, yaygın bir tespit yeteneği) özellikle hedefleyip kasıtlı olarak jenerik sayfaya yönlendiriyor olabilir.

**Karar**: Bunu daha fazla zorlamıyoruz. Stealth/fingerprint-gizleme eklentileriyle bu tespiti aşmaya çalışmak, baştan beri kaçındığımız "bot tespitini atlatma" kategorisine tam olarak girer. Headless fallback kodda kalıyor (zararsız — Trendyol'da devreye girip başarısız oluyor, sonra normal "bulunamadı" hatasına düşüyor) ve JS'e ihtiyaç duyan ama bot tespiti sofistike olmayan başka siteler için hâlâ faydalı olabilir, ama Trendyol'un asıl sorununu çözmüyor. Manuel doldurma her zaman güvenilir yedek olarak kalıyor — bazı siteler (Trendyol dahil, tutarsız biçimde; Zara gibi aktif korumalılar hiç) bu otomatik doldurmayı desteklemeyebilir, bu kabul edilen bir sınır.

## İstek Listesi: Satın Almak İstediklerinle Kombin Dene (2026-07-15)
Kullanıcı önerisi: envanterdeki gibi ama "sahip olunmayan" ürünleri listeleyip, bunlarla kombin denemesi yaparak satın almaya teşvik etme. Marketplace/marka API entegrasyonu beklemeden (o ayrı ve çok daha zor bir problem — bkz. "Fikir havuzu") manuel giriş ile bugün tam değer veriyor.

- **`wishlist_items` tablosu** (`20260718000000_add_wishlist_items.sql`, Management API ile çalıştırıldı) — `items` ile birebir aynı şekil + `product_url`/`price`. Bilinçli olarak **ayrı tablo**, `items`'a bir `is_wishlist` flag'i eklemek yerine: `items`'ı tüketen her sorgu (kombin havuzu, envanter listesi, sayaçlar) "sahip olunan" varsayımıyla yazıldı, flag eklemek o sorguların hepsine filtre eklemeyi gerektirir ve unutulursa wishlist ürünleri normal envantere sızabilir.
- `lib/hooks/useWishlist.ts`, `app/add-wishlist-item.tsx` (fotoğraf+AI etiketleme dahil, `app/add-item.tsx` ile birebir aynı desen).
- **Envanter ekranı** artık "Envanterim" / "İstek Listem" sekmeli (Kombinlerim'deki Geçmiş/Beğenilenler switcher'ıyla aynı desen).
- **Ana Sayfa'daki bağlamsal sorular ekranında** (sadece AI yolunda, zar etkilenmedi) istek listesi doluysa opsiyonel bir checkbox ("İstek listemi de dahil et") çıkıyor. Açıksa `generate-outfit`'e `includeWishlist: true` gönderiliyor, Edge Function kendi tarafında `wishlist_items`'ı da çekip her ürüne bir `sahiplik: 'sahip' | 'istek_listesi'` etiketi ekleyip Claude'a veriyor — sistem prompt'una "istek_listesi ürünlerini kombine dahil edebilirsin (satın almaya teşvik için), ama en az bir sahip olunan parça kalsın, reasoning'de hangi parçanın satın alınması gerektiğini belirt" kuralı eklendi.
- `OutfitCard`'da istek listesinden gelen parçanın üzerinde küçük bir "İstek Listesi" rozeti (kalp ikonlu, siyah yarı saydam pill) gösteriliyor.
- **Kaydetme kısıtı**: `outfit_items.item_id` FK'si sadece `items`'a bakıyor — wishlist ürünü içeren bir kombin "Beğen" ile kaydedilemez (buton devre dışı + açıklayıcı metin: "satın alıp envanterine ekleyince kaydedebilirsin"). Bu, polymorphic FK gibi bir şema karmaşıklığına girmeden v1 için bilinçli bir sınır — aynı zamanda "önce satın al" akışını doğal olarak pekiştiriyor.
- **Canlı test edildi**: 2 sahip + 2 istek listesi ürünüyle (Sonbahar/Ofis/Şık bağlamı) çağrıldı, ikisini karıştırarak tutarlı bir kombin seçti, gerekçesinde istek listesinden alınan parçaların (lacivert blazer, kahverengi bot) neden tamamlayıcı olduğunu açıkça belirtti.

## AI Kombin Ekranında Opsiyonel Serbest Metin Not (2026-07-15)
Kullanıcı önerisi: bağlamsal sorular (mevsim/mekan/saat/konsept) yeterli nüansı yakalayamıyor — "iş görüşmesi", "arkadaşımın doğum günü partisi" gibi somut senaryolar için kullanıcının kendi cümleleriyle ek bilgi verebileceği bir alan istedi. Ayrıca ileride alışveriş/ek ürün önerisi gibi özelliklerde bu notun işe yarayacağını belirtti.

- Ana Sayfa'daki soru ekranına opsiyonel bir çok satırlı `TextInput` eklendi (maxLength 200).
- `generate-outfit` prompt'una **diğer bağlam bilgilerinden daha öncelikli** bir sinyal olarak ekleniyor (`userNoteBlock`, sunucu tarafında da 300 karaktere kırpılıyor — savunma amaçlı, client zaten 200'de sınırlıyor).
- `outfits.user_note` kolonu eklendi (migration `20260717000000_add_outfit_user_note.sql`, kullanıcıya sormadan Management API ile çalıştırıldı) — kaydedilen kombinle birlikte kalıcı olarak saklanıyor, `OutfitCard`'da küçük bir konuşma balonu ikonuyla gösteriliyor (hem üretim anında hem Kombinlerim'de). `outfit_wears.note` (giydim notu, farklı tablo) ile karışmasın diye kolon adı bilinçli olarak `user_note`.
- Sadece AI yolunda var — zar butonu etkilenmedi.
- **Canlı test edildi**: nötr/"Günlük" konseptli bir bağlama rağmen "iş görüşmesine gidiyorum, ciddi görünmek istiyorum" notu verildiğinde, model konsept sinyalini bilinçli olarak geçersiz kılıp lacivert gömlek + siyah pantolon + siyah ayakkabı gibi profesyonel bir kombin seçti ve gerekçesinde bu önceliklendirmeyi açıkça belirtti.

## generate-outfit: Gerçek Stilist Mantığı (2026-07-15)
Kullanıcı cihazda test ederken kombinlerin renk/parça uyumunu yakalayamadığını, mevsim/mekan/saat/konsept bağlamına göre mantıklı seçim yapmadığını bildirdi. Kök neden: sistem prompt'u çok genel ("renk uyumuna ve konsepte dikkat et") — somut bir kural seti yoktu, ve item'ların rengi Claude'a ham hex kod (`#2C3E63`) olarak gidiyordu, renk uyumu muhakemesi için zayıf bir sinyal.

**Yapılan değişiklikler** (`supabase/functions/generate-outfit/index.ts`):
1. Sistem prompt'u somut kurallara genişletildi: nötr taban + 1-2 vurgu rengi, çatışan renk/desen kombinasyonlarından kaçınma, mevsime göre parça filtreleme (Kış'ta yazlık/Yaz'da kışlık parça yok), mekan/konsept uygunluğu (Ofis/Şık'ta aşırı gündelik parçalardan kaçınma), soğukta uygun dış giyim varsa ekleme, envanterde ideal seçenek yoksa en yakın alternatifi seçip asla reddetmeme.
2. Item'ların hex rengi artık en yakın Türkçe renk adına (`colorName`) çevrilip prompt'a ekleniyor (`closestColorName()` — aynı nearest-color mantığı `lib/outfitPreview.ts`'teki ile paralel, ayrı dosyada çünkü Edge Function'lar arası paylaşılan modül yok).
3. Tool şemasında `reasoning` alanı `itemIds`'ten ÖNCE geliyor — Claude önce iç analizini yazıp sonra seçim yapıyor (chain-of-thought etkisi, tool-use şemalarında bilinen bir teknik).

**Canlı test edildi** (anonim test kullanıcısı + kasıtlı olarak yazlık/kışlık/renk-çatışmalı karışık 10 ürünlük envanter, script sonrasında silindi): Kış/Ofis/Sabah/Şık bağlamında çağrıldı, yazlık ve aşırı gündelik parçaları (turuncu crop, bej şort, kırmızı terlik, mor pantolon) doğru şekilde elemiş, lacivert kazak + siyah pantolon + siyah ayakkabı + lacivert kaban + gri bere ile tutarlı nötr bir palet seçmiş, gerekçesi de bunu doğru şekilde açıklıyor.

## Tek Parçayı "Karıştır" ile Değiştirme (2026-07-15)
Kullanıcı önerisi: kombinin tamamını değil, tek bir beğenmediği parçayı değiştirebilme. `OutfitCard`'da bir parçaya basılı tutunca üzerinde dinamik bir "Karıştır" butonu beliriyor (`onReplaceItem` callback'i verildiyse) — basınca `app/(tabs)/index.tsx`'teki `replaceItem()` o parçayı aynı `slot`tan, kombinin diğer parçalarıyla ve bu slotta bu oturumda daha önce denenmiş ürünlerle çakışmayan rastgele bir alternatifle değiştiriyor (`triedIdsBySlotRef`, her yeni kombin üretiminde sıfırlanıyor). İstek listesi dahil edilmişse (bkz. "İstek Listesi") o havuzdan da seçebiliyor. Kombin kaydedildikten sonra (`saved=true`) bu etkileşim kapatılıyor. Değiştirme sonrası eski AI `reasoning`'i temizleniyor (artık değişmiş bir ürüne atıf yapıyor olabileceği için).

## AI Kombin Gerekçesi (reasoning) Gösterimi (2026-07-15)
`generate-outfit` Edge Function'ı baştan beri Claude'dan bir `reasoning` (1-2 cümlelik Türkçe gerekçe) döndürüyordu ama hiç kullanılmıyordu. Artık `app/(tabs)/index.tsx` bunu `generatedReasoning` state'inde tutup `OutfitCard`'a `reasoning` alanı olarak geçiyor; kart doluysa küçük bir ampul ikonlu notla gösteriliyor. **Sadece AI (bağlamsal sorular) yolunda var** — zar butonu tamamen yerel/rastgele seçim yaptığı için gerçek bir gerekçesi yok, bilinçli olarak boş bırakıldı (sahte açıklama üretmek yerine).

Bu, kullanıcının önerdiği "parça bazlı" (ör. "beyaz crop + buz mavisi şort renk uyumu" gibi çift bazlı notlar) fikrinin ilk adımı — henüz sadece genel/tek gerekçe var, parça-parça notlar için Claude'a verilen tool şemasının genişletilmesi gerekiyor (bkz. "Fikir havuzu"). Şu an DB'ye kaydedilmiyor (`outfits` tablosunda `reasoning` kolonu yok) — sadece üretim anındaki sonuç ekranında gösteriliyor, Kombinlerim'e kaydedilince kaybolur.

## Kombin Önizleme (Silüet) — Ücretsiz Çözüm (2026-07-15)
`OutfitCard`'ın sağ üstünde küçük bir "body-outline" ikon butonu var ("Önizlemeyi Göster") — basınca kombindeki ürünlerin isimlerinden metin bir prompt kurup jenerik bir insan silüeti/manken üzerinde giyilmiş halini gösteren bir görsel üretiyor. `lib/outfitPreview.ts` → `buildOutfitPreviewUrl()`.

**Neden Pollinations.ai**: Kullanıcı demo aşamasında ücretli bir servise (Gemini/OpenAI görsel üretim API'leri, ~$0.02-0.05/görsel, ikisi de billing/kredi kartı istiyor) para ödemek istemedi. Pollinations.ai key/hesap/kredi kartı istemeyen, tamamen ücretsiz bir text-to-image servisi (`https://image.pollinations.ai/prompt/<prompt>`), GET isteğiyle direkt görsel dönüyor. Bu yüzden **hiçbir Edge Function veya API key gerekmiyor** — `buildOutfitPreviewUrl()` client'ta URL kurup direkt `<Image source={{uri}}>`'a veriyor. Aynı kombin için aynı görsel gelsin diye ürün id'lerinden basit bir hash `seed` parametresi olarak veriliyor.

**Bilinen sınırlamalar / ileride dikkat**: Pollinations resmi/kurumsal bir servis değil — uptime/kalite garantisi yok, prod için uygun değil ama demo için yeterli. Kullanıcının kendi yüz/boy fotoğrafıyla gerçek "virtual try-on" (kişiselleştirilmiş önizleme) fikri bilinçli olarak ertelendi — bu, özel bir try-on modeli/API'si (fal.ai, Replicate vb.), gerçek bir bütçe ve yüz fotoğrafı gibi hassas veri için bir saklama/silme politikası gerektiriyor. Bkz. "Fikir havuzu".

## Profil Bilgileri: Cinsiyet, Yaş, Boy, Kilo, Günlük Stil (2026-07-15)
`profiles` tablosuna `age`, `height_cm`, `weight_kg`, `daily_style` eklendi (`gender` zaten vardı). Amaç: kullanıcıyı tanıyıp AI kombin önerisini kişiselleştirmek. `app/profile-edit.tsx` (modal, Profil sekmesi → "Hesap Bilgileri") tüm alanları opsiyonel bırakıyor — hiçbiri zorunlu değil, kullanıcı istediği kadarını doldurur. `lib/hooks/useProfile.ts` → `useProfile()`/`useUpdateProfile()`.

`generate-outfit` Edge Function artık kullanıcının `gender`/`daily_style`'ını (doluysa) prompt'a hafif bir yönlendirme notu olarak ekliyor. `age`/`height_cm`/`weight_kg` şu an AI prompt'una **dahil değil** — envanterdeki mevcut ürünlerin kombinasyonunu seçiyoruz, beden/uyum önerisi yapmıyoruz, bu yüzden doğrudan faydası yok; ileride "bu ürün sana uyar mı" gibi bir özellik gelirse kullanılabilir. Migration (`20260716000000_add_profile_details.sql`) kullanıcıya sorulmadan doğrudan Management API (`SUPABASE_ACCESS_TOKEN` + `/database/query` endpoint) üzerinden benim tarafımdan çalıştırıldı — rating migration'ının unutulup sessizce özelliği kırdığı olaydan sonra bilinçli tercih.

## Cihaz Testinde Bulunan İki Bug — Düzeltildi (2026-07-15)
Kullanıcı ilk kez gerçek APK ile (development client) telefonda test etti, iki gerçek bug bildirdi, ikisi de düzeltildi:

1. **"Tekrar Dene" aynı kombini tekrar öneriyordu.** Kök neden: AI yolunda aynı prompt Claude'a tekrar gidince deterministik olarak aynı cevap geliyordu; zar yolunda küçük envanterde (~5 ürün) rastgele tekrar istatistiksel olarak olasıydı. Çözüm: `excludeIds`/`excludeItemIds` parametresi tüm zincire eklendi — `generateRandomOutfit` (`lib/outfitGenerator.ts`) → `requestAiOutfit` (`lib/aiOutfit.ts`) → `generate-outfit` Edge Function prompt'u → `app/(tabs)/index.tsx`'teki `retry()`. `retry()` artık ekrandaki mevcut kombinin ürün id'lerini exclude olarak geçiyor; envanter yeterince zenginse farklı bir kombin gelir, tek seçenek varsa (ör. tek pantolon) tekrara izin verilir (sonsuz döngü/boş sonuç olmasın diye). Edge Function yeniden deploy edildi.
2. **Beğenip puanladıktan sonra kombin "Beğendiğim Kombinler"de görünmüyordu.** Kök neden: `outfits.rating` migration'ı (`20260715020000_add_outfit_rating.sql`) daha önce verilmişti ama kullanıcı tarafından hiç çalıştırılmamıştı — `column outfits.rating does not exist` hatası hem `useRateOutfit` hem `useLikedOutfits` sorgularını sessizce kırıyordu (UI hatasız "boş" gösteriyordu, gerçek neden bir Node.js test scriptiyle DB'ye canlı sorgu atılarak bulundu). Kullanıcı migration'ı SQL Editor'da çalıştırdıktan sonra sorun kendiliğinden düzeldi, kod tarafında değişiklik gerekmedi.

**Ders**: Yeni bir migration dosyası yazmak yetmiyor — kullanıcıya "çalıştır" denip unutulursa, hata sessizce yutulup UI'da "boş veri" gibi görünebiliyor (try/catch'lerin `console.error` dışında kullanıcıya bir şey göstermemesi nedeniyle). İleride yeni migration eklenince kullanıcıdan çalıştırdığını teyit almak veya uygulama açılışında bir "şema versiyon kontrolü" eklemek düşünülebilir.

## Notlar
- **Figma MCP** `.mcp.json` içinde proje seviyesinde tanımlı (`figma`, http transport). Aktif olması için VS Code workspace kökünün bu klasör olması ve yeni bir Claude Code oturumu gerekiyor.
- Geliştirme ortamı Windows; Git kurulumu proje başında ayrıca yapıldı (winget). PowerShell oturumları PATH'i cache'lediği için her komutta `$env:Path` yenilemesi gerekiyor (bkz. git geçmişi).
- Test/doğrulama: `npx tsc --noEmit`, `npm test`, `npx expo export -p web` (gerçek bundling hatalarını yakalar, sadece tip kontrolü yetmez).
- `app.json` → `web.output` bilinçli olarak `"single"` (SPA), `"static"` **değil**. Neden: Expo Router'ın "static rendering" özelliği route'ları Node.js'te önceden render etmeye çalışıyor, bu da Supabase client'ının (AsyncStorage → `window.localStorage`) tarayıcı-only API'lere Node ortamında erişmeye çalışıp `window is not defined` ile patlamasına yol açıyor. Biz SEO'ya önem veren statik bir site değiliz, SPA modu doğru ve kalıcı çözüm.
- `@opentelemetry/api` gerçek bir bağımlılık olarak eklendi (kullanılmıyor, hiç import edilmiyor) — `@supabase/supabase-js`'nin dahili, opsiyonel bir tracing importu Metro tarafından statik çözülemediği için build patlıyordu. Bu paketi silme.
- **TypeScript garipliği**: Bu projede zaman zaman `useQuery<T>({...})` gibi açık generic verilmesine rağmen, o hook'un sonucunu tüketen `.filter()/.map()` callback'lerinde parametre "implicit any" oluyor (TS7006). Kesin kök nedeni netleştirilemedi (muhtemelen tsconfig/expo base config + TS 5.3.3 kombinasyonuna özgü bir çıkarım sınırlaması). **Çözüm**: hook sonucunu tüketen yerde değişkeni/parametreyi açıkça tipleyin (`const list: DbItem[] = ...`, `(item: DbItem) => ...`) — hook tanımının kendisini değiştirmeye gerek yok. Örnekler: `app/(tabs)/envanter.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/kombinlerim.tsx`.
- `npx tsc --noEmit` "Unterminated template literal" gibi tuhaf hatalar verirse (`.expo/types/router.d.ts` içinde), `.expo` klasörünü silin — bozuk/eski bir route-tipi cache'iydi, otomatik yeniden üretiliyor.
- Doğrulama disiplini: her önemli değişiklikten sonra sırasıyla `npx tsc --noEmit` → `npx jest --watchAll=false` → `npx expo export -p web` (gerçek Metro/Babel bundling hatalarını yakalar) çalıştırıldı, hepsi geçmeden commit atılmadı. `dist/` klasörü her export sonrası silinir (gitignore'da zaten var, ekstra önlem).
- **Foto akışları cihazda test edildi (2026-07-15)**: `app/add-item.tsx` ve `app/mark-worn.tsx`'teki foto seçme/yükleme akışları (`expo-image-picker` + `lib/storage.ts` + `lib/aiTagging.ts`) kullanıcı tarafından gerçek telefonda denendi, sorunsuz çalışıyor. Artık auth/veri katmanı gibi uçtan uca doğrulanmış kabul edilebilir.
- **Önemli — `npx expo export -p web`, tarayıcı runtime hatalarını YAKALAMAZ**: export sadece statik bundling yapar, sayfayı gerçek bir JS motorunda/DOM'da çalıştırmaz. Bu yüzden `tailwind.config.js`'te `darkMode: 'class'` eksikliği (varsayılan `'media'` NativeWind'in native↔web renk şeması senkronizasyonuyla çakışıp "Cannot manually set color scheme" hatasıyla çöküyordu) export'ta hiç görünmedi, ancak `npx expo start --web` ile tarayıcıda gerçekten açılınca ortaya çıktı (kullanıcı tarafından bulundu, 2026-07-15). **Ders**: NativeWind kurulumundan sonra mutlaka `npx expo start --web` ile gerçek bir tarayıcıda en az bir kez açıp konsolu kontrol edin — sadece `tsc`/`jest`/`export` yeterli değil.

## Gece Boyunca Yapılanlar — Sabah Özeti (2026-07-15 gece → 2026-07-16 sabah)
Kullanıcı uyurken (yeni API key/hesap gerektirmeyen) backlog üzerinde çalışıldı, hepsi doğrulanıp deploy edildi:

1. **Rating → AI kişiselleştirme** — yüksek puanlı geçmiş kombinlerin renk/marka tercihleri yeni önerilere hafif bir sinyal olarak yansıyor (bağlamı hiç ezmiyor, canlı test edildi).
2. **Parça-bazlı kombin gerekçesi** — kullanıcının önerdiği "beyaz crop + buz mavisi şort" tarzı somut çift-bazlı notlar artık `OutfitCard`'da gösteriliyor.
3. **Profil menüsündeki ölü öğeler düzeltildi** — Yardım artık gerçek bir SSS ekranı, Bildirimler gerçek bir tercih ekranı (hatırlatıcı açık/kapalı + saat, AsyncStorage'a kaydediliyor — gerçek bildirim gönderimi `expo-notifications` native modülü gerektirdiği için ve bu gece test edilemeyeceği için bilinçli olarak eklenmedi). Partner Eşleştirme/Premium hâlâ "Yakında" — bunlar gerçekten büyük, ayrı alt yapı gerektiren özellikler.
4. **Kart-bazlı onboarding turu** — ilk açılışta otomatik, sonra Yardım'dan tekrar açılabilir, dokunarak ilerleniyor (video değil).
5. **Edge Function'larda rate-limit** — daha önce hiç yoktu, gerçek bir maliyet riskiydi; artık üçü de saatte 30 çağrı ile sınırlı, `tag-item-photo`/`fetch-product-link`'e eksik olan auth kontrolü de eklendi.

Hepsi commit'lendi ve GitHub'a push edildi. Detaylar için yukarıdaki ilgili başlıklara bak.

## Sabah İçin Gerekenler (kullanıcıdan beklenen aksiyonlar)

**~~1. Supabase Personal Access Token~~ — TAMAMLANDI (2026-07-15).** Token verildi, Edge Function'lar deploy edildi, secret set edildi, ikisi de gerçek Claude çağrılarıyla test edildi. Token bu oturumda sadece geçici env var olarak kullanıldı, hiçbir dosyaya yazılmadı.

**~~2. Storage migration~~ — TAMAMLANDI (2026-07-15).** Kullanıcı SQL Editor'da çalıştırdı, her iki bucket da (`item-photos`, `outfit-wear-photos`) gerçek upload/erişim/silme testinden geçti.

**Backend + foto akışları artık %100 canlı ve cihazda doğrulanmış** (auth, DB, RLS, iki Edge Function, iki Storage bucket, galeri foto seçme/yükleme — 2026-07-15 kullanıcı tarafından onaylandı). MVP'nin çekirdeği artık uçtan uca test edilmiş kabul ediliyor.

**Yakın gelecek (acil değil, ama bilgin olsun):**
1. **Google OAuth Client ID/Secret** — gerçek Google ile giriş ekranı yapılacağı zaman lazım (Google Cloud Console). Şu an anonymous auth ile çalıştığımız için MVP'yi bloklamıyor.
2. **RevenueCat hesabı** — Premium/IAP fazı için, MVP kapsamı dışında.
3. **Apple Developer / Google Play Console hesapları** — gerçek mağaza yayını için, çok daha ileri bir aşama.
4. **Uygulama adı/marka kararı** — şu an her yerde placeholder `kombin-app` kullanılıyor (klasör adı, `app.json` slug/name). Değiştirmek istersen söyle, tek seferde her yerde günceller.
