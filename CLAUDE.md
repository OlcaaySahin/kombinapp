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
- **Marka API / "Bu üründen bende var" entegrasyonu**: resmi API/ortaklık gerektiren kısmı hâlâ gerçekçi değil. Ama "ürün linkinden meta veriyle otomatik doldurma" ara çözümü **artık yapıldı** — bkz. "İstek Listesi: Ürün Linkinden Otomatik Doldurma". İleride: (a) OS paylaşım sayfasından (Trendyol app'inde "Paylaş" → bizim app) linki doğrudan almak (native share extension gerektirir, büyük iş). ~~(b) linkten-doldurma akışını normal envanter eklemeye taşımak~~ — **YAPILDI (2026-07-17)**: `app/add-item.tsx`'te fotoğraf kutusunun altında "Ya da ürün linkinden doldur" bölümü, `add-wishlist-item.tsx` ile aynı `fetchProductFromLink` akışı; fark: `items`'ta `product_url`/`price` kolonu olmadığı için link sadece doldurma aracı, kaydedilmiyor (fiyat alanı da yok).
- ~~**Rating → AI kişiselleştirme geri beslemesi**~~ — **TAMAMLANDI (2026-07-16)**, bkz. "Rating Kişiselleştirme + Parça-Bazlı Gerekçe".
- ~~**Parça bazlı (çift bazlı) kombin gerekçesi**~~ — **TAMAMLANDI (2026-07-16)**, bkz. "Rating Kişiselleştirme + Parça-Bazlı Gerekçe".
- **Aynı e-posta, farklı giriş yöntemi = ayrı hesaplar**: Kullanıcı canlı test etti (2026-07-16) — e-posta ile oluşturulan hesap ile aynı e-postaya sahip Google hesabı, Supabase'de **birbirinden bağımsız iki `auth.users` kaydı** oluyor (otomatik birleşmiyor, bunun için "identity linking" özelliği ayrıca eklenmeli, şu an yok). Şimdilik test için avantajlı (iki akış birbirine karışmıyor) ama gerçek kullanıcılar için risk: biri e-posta ile kayıt olup sonra Google ile (aynı e-postayla) tekrar girerse, eski envanterini GÖRMEZ — sıfırdan ikinci boş bir hesaba düşer. **Kullanıcı kararı (2026-07-17)**: bu davranış bilinçli olarak böyle kalacak — kullanıcının kendi sözleriyle "eposta aynı dahi olsa ikisi ayrı account, bu daha iyi benim için". Yani bu bir yayın engelleyici DEĞİL; en fazla ileride "bu e-postayla kayıtlı bir hesap zaten var" uyarısı eklenebilir (küçük iş, 🟡), Supabase identity linking ile hesap birleştirme ise uzak backlog.

## Günlük Kombin Limiti — Uygulanmıyor, Sayaç Yazısı da Gizli (güncelleme 2026-07-17)
`app/(tabs)/index.tsx`'teki `DAILY_LIMIT_ENABLED = false`. **Kullanıcı kararı (2026-07-17): limiti uygulamayı düşünmüyor** ("kararım değişebilir" dediği için kod bilinçli olarak SİLİNMEDİ). Header'daki "Günlük X/3 kombin hakkı kullanıldı" yazısı da JSX yorumuna alınarak kullanıcıdan gizlendi. Mekanizma (`generation_events`, `useDailyOutfitCount`) aynen duruyor ve çalışıyor; geri getirmek için flag'i `true` yap + header'daki yorumlu sayaç Text'ini geri aç.

## Veritabanı Şeması (Postgres / Supabase, RLS açık)

- **profiles** — id (→auth.users), display_name, avatar_url, gender?, subscription_tier, subscription_expires_at
- **partnerships** (v2) — requester_id, partner_id, status (pending/accepted/declined)
- **categories** (lookup) — name, slot (ust_giyim/alt_giyim/tek_parca/dis_giyim/ayakkabi/canta/taki/tamamlayici), icon
- **items** (envanter) — user_id, category_id, slot, name, color, pattern, season[], brand, image_url, source_type (user_photo/web_photo), ai_tags (jsonb)
- **outfits** (kombinler) — user_id, name?, is_liked, rating (1-5, nullable), generation_source (ai_generated/dice/manual), generation_context (jsonb: mevsim/mekan/saat/konsept), user_note, reasoning, pairing_notes (jsonb)
- **outfit_items** (join) — outfit_id, item_id
- **outfit_wears** — outfit_id, worn_date, photo_url, note? (bir kombin birden fazla kez giyilebilir, her seferinde ayrı foto)
- **generation_events** (freemium limit log) — user_id, type (outfit/shopping_suggestion), created_at → günlük limit `WHERE created_at >= CURRENT_DATE` ile sayılır

Güvenlik: her tabloda RLS, `user_id = auth.uid()` kısıtı. Partner özelliği geldiğinde `partnerships`'teki kabul edilmiş ilişkiye göre partnerin `items`'ına salt-okunur erişim politikası eklenecek.

## Ekran Akışı

Bottom tab (2026-07-19'dan itibaren 5 sekme): **Ana Sayfa** (kombin oluştur) · **Envanter** · **Galeri** (sadece fotoğraflı Giydim anıları) · **Kombinlerim** (Geçmiş/Beğenilenler) · **Profil**

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

**~~Hâlâ eksik~~ — Google OAuth GİRİŞİ TAMAMLANDI (2026-07-16)**: bkz. "Google ile Giriş" bölümü aşağıda.

## Google ile Giriş (Native SDK) — Cihazda Canlı Doğrulandı (2026-07-16)
`@react-native-google-signin/google-signin` **13.3.1**'e sabitlendi (`^16.x` **değil** — 14.0.0'dan itibaren `expo >=52.0.40` peer dependency istiyor, biz SDK 51'deyiz; 13.x son `expo >=50.0.0` destekleyen seri). `app.json`'a Expo config plugin eklendi (Firebase'siz, `iosUrlScheme` gerekmiyor çünkü şu an sadece Android test ediliyor).

**Kritik tasarım kararı — anonim veri kaybı riski**: `supabase.auth.signInWithIdToken()` (native SDK'nın kullandığı yöntem), e-posta yükseltme akışının kullandığı `updateUser({email})`'ın aksine, mevcut anonim `auth.uid()`'yi **korumuyor** — Supabase'in henüz çözülmemiş, bilinen bir sınırlaması (`linkIdentity()` OAuth-redirect akışında çalışıyor ama native idToken akışında bir eşdeğeri yok). Yani biri anonim olarak envanter oluşturup sonra Google ile giriş yapsa, naif bir entegrasyon o envanteri sessizce kaybettirirdi.

**Çözüm**: yeni `migrate-anonymous-data` Edge Function'ı, `lib/auth.ts`'teki `signInWithGoogle()`:
1. Google girişinden ÖNCE, oturum anonimse eski `auth.uid()`'yi (`oldUserId`) hafızaya alıyor.
2. `GoogleSignin.signIn()` → `idToken` → `supabase.auth.signInWithIdToken()` (yeni bir `auth.uid()` oluşturuyor).
3. `oldUserId` varsa, `migrate-anonymous-data`'yı çağırıyor — bu fonksiyon **service role** ile `items`/`wishlist_items`/`outfits`'i eski kullanıcıdan yeniye taşıyor, profildeki doldurulmuş alanları (yaş/boy/kilo/cinsiyet/günlük stil) kopyalıyor, sonra eski anonim kullanıcıyı siliyor.
4. **Güvenlik kontrolü**: fonksiyon önce `oldUserId`'nin GERÇEKTEN anonim (`is_anonymous: true`) olduğunu doğruluyor — aksi halde biri rastgele bir `oldUserId` vererek başka bir gerçek kullanıcının verisini kendi hesabına "çalabilirdi". **Canlı test edildi**: hem var olmayan hem GERÇEK (anonim olmayan, `busecivelek08@gmail.com`) bir `oldUserId` ile deneme doğru şekilde reddedildi; gerçek bir anonim→migrasyon senaryosu (1 ürün + profil alanları) başarıyla taşındı.
5. Migrasyon sonrası `queryClient.invalidateQueries()` — taşınan veri uygulamada hemen görünsün diye.

**Google Cloud Console tarafı** (proje `kombin-app-502606`):
- **Web application** OAuth client (`webClientId` olarak kullanılıyor, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — `.env` + `eas.json` development/preview profillerinde) — redirect URI: `https://tvjjwpotqeybtkkvvwox.supabase.co/auth/v1/callback`.
- **Android** OAuth client — paket adı `com.olcaaysahin.kombinapp` + SHA-1 sertifika parmak izi (kullanıcının EAS build credential'ından alındı) — **bu olmadan native girişte `DEVELOPER_ERROR` alınır**, çok yaygın bir gotcha, önceden kuruldu.
- Supabase Auth Google provider'ı (`external_google_enabled`, `external_google_client_id`, `external_google_secret`) Management API'nin `/config/auth` endpoint'i üzerinden ayarlandı.

**Yeni native modül + build durumu**: native modül eski dev-client build'inde çalışmadığı için yeni bir EAS development build alındı ve telefona kuruldu — **Google girişi kullanıcı tarafından cihazda gerçekten yapıldı** (2026-07-16; `auth.identities`'te `provider: google` kimliği 07:49 UTC'de oluşmuş, aynı gün 10:05'te tekrar giriş var — 2026-07-17'de Management API sorgusuyla doğrulandı, bu not önce yazılıp build sonrası güncellenmeyi unutulmuştu). `app/sign-in.tsx`'e e-posta akışının üstüne "Google ile Devam Et" butonu eklendi. Not: ileride başka bir native modül (ör. `expo-notifications`) eklenirse yine yeni bir EAS build gerekir — mevcut build sadece bugünkü native modül setini içeriyor.

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

## Figma Referans İncelemesi + Görsel Cila (2026-07-16)
Kullanıcı Figma Dev Mode linkini paylaştı ("Shoppe" e-ticaret UI kiti, 2599 görsel) — dosyayı tek tek ekran görüntüsüyle incelemek yerine, kullanıcının verdiği **Figma Personal Access Token** ile REST API'yi (`api.figma.com/v1/files/:key`, `/v1/images/:key`) doğrudan kullandım: dosyanın tüm frame/sayfa isimlerini listeleyip ilgili ekranları (`15 Shop`, `16 Flash Sale + Live`) kendim PNG olarak render edip inceledim. Bu yöntem herhangi bir MCP/entegrasyon kurulumuna gerek kalmadan çalıştı — ileride benzer bir Figma dosyası incelenmek istenirse aynı yaklaşım (PAT + REST API) tekrar kullanılabilir.

**Değerlendirme**: e-ticaret enerjisinden (sayaç/indirim/agresif satış — bilinçli olarak alınmadı) ayrı olarak, saf görsel/düzen fikirleri işe yaradı:
- Header arkasında yumuşak, yuvarlak renkli blob şekilleri (dekoratif, içerik gürültüsü eklemiyor) → `app/(tabs)/index.tsx`'e eklendi (`primary`/`accent-purple`, düşük opaklık, `pointerEvents="none"`, `SafeAreaView`'a `overflow-hidden`).
- Kart cilası: `OutfitCard`/`ItemCard`'a hafif `shadow-sm` (dark modda `shadow-none` — RN'de gölge siyaha dayalı olduğu için koyu arka planda görünmüyor, faydasız). **Gotcha**: `ItemCard`'da gölge, `overflow-hidden` olan görsel kutusuna değil dışarıdaki `Pressable`'a eklenmek zorunda kaldı — RN'de `overflow:hidden` aynı view üzerindeki gölgeyi de kırpıyor.
- Dairesel avatar sırası ("Top Products") deseni not edildi, ileride daha yoğun bir ana sayfa istenirse ("Sık Kullandıkların" gibi) kullanılabilir — şimdilik uygulanmadı.

## Edge Function'larda Rate-Limit (2026-07-16)
Daha önce hiçbir korunma yoktu — `generate-outfit`, `tag-item-photo`, `fetch-product-link` üçü de sınırsız çağrılabiliyordu (anon key zaten public, sadece bir oturum yeterliydi), bu gerçek bir Claude API maliyet riskiydi. `tag-item-photo` ve `fetch-product-link`'in ayrıca **hiç auth kontrolü bile yoktu** (Authorization header hiç okunmuyordu) — ikisine de eklendi.

Üçü de artık: kullanıcının son 1 saatteki `generation_events(type='ai_call')` satır sayısı 30'u geçerse `429` dönüyor, geçmezse yeni bir `ai_call` satırı ekleyip devam ediyor. `generation_events.type` CHECK kısıtı `ai_call` değerini kapsayacak şekilde genişletildi (`20260716010000_extend_generation_events_type.sql`, Management API ile çalıştırıldı). 30/saat, gerçek bir kullanıcının normal kullanımında asla tetiklenmeyecek kadar cömert, ama script/kötüye kullanımı sınırlıyor.

**Canlı test edildi**: her üç fonksiyon da rate-limit kodu eklendikten sonra normal çağrılarda sorunsuz çalışmaya devam ediyor (regresyon yok — özellikle `tag-item-photo`/`fetch-product-link`'e yeni eklenen auth zorunluluğu client tarafını bozmadı, çünkü `supabase.functions.invoke()` zaten otomatik olarak Authorization header'ı gönderiyor). 30 çağrı doldurulup 31.'si denendiğinde doğru şekilde "Çok fazla istek gönderildi" hatası döndü.

## Onboarding Turu + Profil Menü Ölü Öğeleri (2026-07-16)
Kullanıcının "boş durmama" fikri + "işlevsiz menüleri işlevli kıl" isteği üzerine gece yapıldı:

- **`app/onboarding.tsx`** — dokunarak (kartın herhangi bir yerine veya "İleri" butonuna basınca) ilerlenen bir tanıtım turu. Video değil, sadece ikon+başlık+açıklama kartları. **Güncelleme (2026-07-17)**: 6 karttan 8'e çıkarıldı ve güncel özelliklere uyarlandı — hoş geldin → envanter → bağlamsal soru (artık hava durumu da anılıyor) → zar → karıştır → istek listesi (Linkten Doldur anılıyor) → kaydet/puanla/giydim (yeni) → partner eşleştirme (yeni). `lib/onboarding.ts`'teki `hasSeenOnboarding()`/`markOnboardingSeen()` AsyncStorage kullanıyor (yeni bir tabloya gerek yok, cihaz bazlı bir tercih zaten). Ana Sayfa mount olduğunda kontrol edilip görülmediyse otomatik açılıyor (`app/(tabs)/index.tsx`'teki `useEffect`).
- **`app/yardim.tsx`** — artık gerçek bir SSS ekranı + "Tanıtımı Tekrar İzle" butonu (onboarding'i istenildiği zaman tekrar açar). Daha önce sadece "Yakında" alerti veriyordu. **Güncelleme (2026-07-17)**: SSS 5→8 soruya çıktı (puanlama-kişiselleştirme, partner eşleştirme, günlük hatırlatıcı eklendi; ilk soruya hava durumu işlendi).
- **`app/bildirimler.tsx`** — günlük kombin hatırlatıcısı tercihini (açık/kapalı + saat, chip seçimi) AsyncStorage'a kaydediyor. **Bilinçli olarak `expo-notifications` eklenmedi** — yeni bir native modül mevcut dev-client build'ini yeniden derletmeyi (`eas build`) gerektirir ve bu gece (kullanıcı uyurken) test edilemezdi; sadece tercih kaydediliyor, gerçek bildirim gönderimi ileride bu tercihi kullanarak eklenebilir. Bu, "her şeyi işlevli yap" isteğiyle "test edemeyeceğim native değişiklik yapma" ilkesi arasında bilinçli bir denge. **Güncelleme (2026-07-17): bildirim artık gerçek** — bkz. "Gerçek Bildirimler: Günlük Hatırlatıcı" bölümü.
- ~~**Partner Eşleştirme**~~ — **TAMAMLANDI (2026-07-16)**, bkz. "Partner Eşleştirme — Uçtan Uca Canlı Doğrulandı". **Premium'a Yükselt** hâlâ "Yakında" alerti veriyor — ödeme altyapısı (RevenueCat) gerektiren, ayrı bir özellik.

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

## Bug: Önbellek Temizleyip Var Olan Hesaba Geri Girilemiyordu — Düzeltildi (2026-07-16)
Kullanıcı APK önbelleğini temizledi (yeni bir anonim oturum oluştu), sonra `busecivelek08@gmail.com` ile (daha önce e-posta ile kayıt olduğu gerçek hesabı) tekrar giriş yapmaya çalışınca "zaten böyle bir kullanıcı var" hatası aldı, hiç kod sorulmadı.

**Kök sebep**: `app/sign-in.tsx`'teki e-posta akışı sadece `supabase.auth.updateUser({email})` kullanıyordu — bu SADECE "bu anonim oturumu bir e-postaya yükselt" işlemi, "var olan bir hesaba giriş yap" diye bir yolu yok. E-posta başka bir hesaba zaten kayıtlıysa `{code: 'email_exists', status: 422}` ile hata veriyor, ve kod bunu genel bir hata olarak gösterip duruyordu.

**Düzeltme** (`lib/auth.ts`): `sendAccountUpgradeCode` artık `email_exists` hatasını yakalayınca `supabase.auth.signInWithOtp({email, options:{shouldCreateUser:false}})` ile mevcut hesaba giriş kodu gönderiyor, `'upgrade'` veya `'sign_in'` modunu döndürüyor. `verifyAccountUpgradeCode` moda göre dallanıyor: `'upgrade'` için eskisi gibi `verifyOtp(type:'email_change')`, `'sign_in'` için `verifyOtp(type:'email')` (Supabase SDK'nın kendi `EmailOtpType` tanımından doğrulandı — ikisi farklı, biri karıştırılırsa doğrulama sessizce başarısız olur). `signInWithIdToken` gibi bu da auth.uid()'yi değiştirdiği için, `oldUserId` (anonim oturumun uid'si) verifyOtp'den ÖNCE yakalanıp, başarılı girişten sonra `migrate-anonymous-data` ile (Google girişindeki aynı mekanizma) taşınıyor — cihazda önbellek temizlendikten sonra eklenmiş olabilecek herhangi bir veri kaybolmuyor. `app/sign-in.tsx` da moda göre doğru mesajı gösteriyor ("Bu e-posta zaten kayıtlı — hesabına giriş yapman için kod gönderdik").

**Yan keşif — Magic Link şablonu hiç düzenlenmemişti**: Bu akış Supabase'in "Magic Link" şablonunu kullanıyor, ama sadece "Change Email" şablonuna `{{ .Token }}` eklenmişti (bkz. yukarıdaki gotcha listesi). Magic Link hâlâ varsayılan, link-only şablondu — kullanıcı canlı testte gerçekten sadece link aldı, kod yok. Management API ile düzeltildi: Kombin App temasına uygun (primary mavi `#3461FD`, yuvarlak köşeli kod kutusu), Türkçe, `{{ .Token }}` içeren yeni bir şablon (`mailer_subjects_magic_link`, `mailer_templates_magic_link_content`) set edildi.

**Uçtan uca canlı doğrulandı**: gerçek `busecivelek08@gmail.com` hesabına karşı tam akış test edildi — yeni anonim oturum → test ürünü eklendi → `email_exists` doğru yakalandı → yeni şablonla gerçek kod alındı → `verifyOtp` ile gerçek hesaba geçiş yapıldı (auth.uid() değişti, doğrulandı) → `migrate-anonymous-data` test ürününü doğru şekilde yeni hesaba taşıdı → DB'den doğrulandı → test verisi temizlendi.

## Çıkış Yap / Hesap Değiştir (2026-07-16)
Yukarıdaki bug'ı test ederken her seferinde önbellek temizlemek gerekiyordu — bunu çözmek için `lib/auth.ts`'e `signOut()` eklendi: Google oturumunu (varsa) kapatır, Supabase oturumunu sonlandırır, `queryClient.clear()` ile önceki kullanıcının cache'ini temizler, hemen yeni bir anonim oturum açar. Profil ekranında (sadece giriş yapılmışken görünen) kırmızı bir "Çıkış Yap / Hesap Değiştir" butonu bunu tetikliyor, `showConfirm` ile onay alıyor. Supabase tarafı canlı test edildi (signOut + signInAnonymously farklı bir `auth.uid()` üretiyor, doğrulandı).

## Test Verisi: 70 Ürünlük Erkek Gardırobu Doldurma (2026-07-16)
Kullanıcı, Google hesabına (`o.l.c.a.y.s.a.h.i.n5858@gmail.com`, tek hesap — bu e-postaya bağlı başka provider yok) "28 yaşında, old money, spor, şık, erkek" temalı, her kategoriye (Elbise hariç 7 kategori) 10'ar adet, ürün-odaklı görselli 70 ürün eklenmesini istedi.

**Mimari — `admin-seed-item` Edge Function**: kullanıcının Google hesabına client tarafından (kendi oturumumuz yokken) yazamayacağımız için, service-role ile çalışan yeni bir admin fonksiyonu yazıldı (`migrate-anonymous-data` ile aynı desen). `x-admin-secret` header'ında `ADMIN_SEED_SECRET` (Supabase secret, sadece bu oturumda kullanıldı) doğrulaması olmadan hiçbir isteği kabul etmiyor. **Arka planda çalışan otomatik güvenlik incelemesi bir SSRF riski buldu** (fonksiyon verilen HERHANGİ bir `imageUrl`'i sorgusuz indiriyordu) — düzeltildi: sadece `https://images.pexels.com/...` kabul ediliyor, redirect'ler reddediliyor, content-type/boyut doğrulanıyor.

**Görsel kalitesi — kullanıcının asıl şikayeti buydu**: Pexels arama sonuçlarının çoğu "tam giyimli insan" fotoğrafıydı (ör. "beyaz gömlek" araması "Man in white shirt gazing over the harbor" döndürüyordu), tam olarak kullanıcının şikayet ettiği belirsizlik. Basit anahtar kelime skorlaması yetersiz kaldı çünkü Pexels'in `alt` metni genelde alakasız objelerle dolu genel "flat lay" koleksiyonlarını da "flat lay" kelimesiyle yüksek puanlıyordu. Çözüm: (1) her ürün için alt-text'te GERÇEKTEN geçmesi gereken anahtar kelime listesi (zorunlu filtre), (2) kişi-odaklı kelimelere (`man/woman/person/posing/...`) ağır ceza, ürün-fotoğrafçılığı kelimelerine (`flat lay/isolated/folded/studio/...`) bonus puan. 70 üründen 61'i otomatik olarak temiz çıktı, kalan 9'u tekrar arandı; 5 tanesinde (Pexels'te gerçekten uygun bir "ürün odaklı" foto yoktu) görsel elle incelenip (Read tool ile) katalog verisi (isim/renk/desen) gerçekte gördüğüm görsele uydurma tercih edildi — yanlış renk/ürün göstermektense.

**Sonuç**: 70/70 başarıyla eklendi (kategori başına 10, DB'den doğrulandı), Storage'a yüklenen birkaç görsel indirilip gerçekten doğru ürünü gösterdiği teyit edildi. `admin-seed-item` fonksiyonu (ve `ADMIN_SEED_SECRET`) gelecekte benzer toplu-veri işleri için kullanılabilir, dursun diye deploy'da bırakıldı.

## Partner Eşleştirme — Uçtan Uca Canlı Doğrulandı (2026-07-16)
`partnerships` tablosu ilk şemadan beri vardı (`requester_id`/`partner_id`/`status`) ama hiçbir yerde kullanılmıyordu — Profil'de "Yakında" diyordu. Şimdi tam işlevsel:

**Akış**: `app/partner-eslesme.tsx`'te partnerin e-postasını gir → `send-partner-request` Edge Function e-postayı kullanıcıya çözüp (service-role, `find_user_ids_by_email` SQL fonksiyonu ile — `auth.users` client'tan hiç sorgulanamıyor) bekleyen bir istek oluşturuyor → partner Profil'de kırmızı bir rozet görüyor (gerçek push bildirimi DEĞİL, `expo-notifications` native modül gerektirir ve henüz eklenmedi — uygulama açıldığında kontrol edilen uygulama-içi bir durum) → partner-eslesme ekranından Onayla/Reddet → kabul edilince `partnerships.status='accepted'`.

**Aynı e-posta iki hesaba kayıtlıysa (Google + e-posta ayrı ayrı)**: `find_user_ids_by_email` ikisini de döndürür, `send-partner-request` HER İKİSİNE de bekleyen istek gönderir — partner hangi hesapla giriş yaparsa yapsın isteği görür. Kullanıcının kendisi hangisini kastettiğini bilmiyordu ("google veya e posta... bilmiyorum"), bu yüzden ikisine birden göndermek, kullanıcıya sormak yerine tercih edildi.

**Envanterler ASLA birleşmiyor**: profiller birbirinin adını görebiliyor (`profiles` üzerinde dar, tek satırlık bir RLS policy — hep `id`'ye göre filtrelenen sorgularda kullanılıyor, sızıntı riski yok), ama `items` için böyle bir "partner görebilir" policy'si YOK. İlk denemede vardı, **bug'a yol açtı** (aşağıya bak) — geri alındı.

**"Partnerime Uyumlu Kombin Öner"**: Ana Sayfa'da bir kombin oluşturduktan sonra (partnerin varsa) bu buton çıkıyor. `generate-partner-outfit` Edge Function'ı: partnerliği önce ÇAĞIRANIN KENDİ JWT'siyle doğruluyor (bu satırı gerçekten sadece iki katılımcı görebilir), sonra partnerin ürünlerini **service-role** ile (genel `items` RLS'ini hiç genişletmeden, sadece bu tek güvenlik-kontrollü sorgu için) çekiyor, Claude'a "kullanıcının kombiniyle birlikte giyildiğinde uyumlu olacak" bir kombin seçtiriyor. Sonuç, kombin sahibinin (isteği yapan kişinin) hesabına kaydediliyor ama partnerin ürün id'lerine referans veriyor — `outfit_items` INSERT policy'si sadece outfit'in çağırana ait olmasını istiyor, item'ların kime ait olduğunu kontrol etmiyor, bu yüzden şema değişikliği gerekmedi. **Bilinen sınırlama**: eşleşme sonlandırılırsa, önceden kaydedilmiş bu tür "karma" kombinlerdeki partner ürünleri artık görünmez olur (`outfit_items` join'i o item satırına erişemez) — kabul edilebilir bir sınır, MVP için üstüne gidilmedi.

**Güvenlik**: `find_user_ids_by_email` fonksiyonu `security definer` ama `execute` yetkisi sadece `service_role`'e verildi (`revoke ... from public, anon, authenticated`) — canlı test edildi, `authenticated` rolden çağrıldığında gerçekten reddediliyor.

**Uçtan uca canlı doğrulandı**: iki gerçek (anonim → SQL ile geçici doğrulanmış e-postaya yükseltilmiş, sonra temizlenmiş) test kullanıcısıyla tam akış: istek gönder → RLS ile karşı taraf görebiliyor mu → kabul et → `generate-partner-outfit` partnerin (tek ürünlük, kasıtlı eksik) envanterinden gerçek bir Claude çağrısıyla kombin üretebiliyor mu, hepsi doğrulandı.

## Bug: Partner Eşleştirme Envanterleri Birbirine Karıştırdı — Düzeltildi (2026-07-16)
İlk sürümde partner eşleştirme, `items` tablosuna "kabul edilmiş partner de görebilir" diye bir RLS SELECT policy'si ekliyordu (var olan "sahibi görebilir" policy'sine EK olarak — Postgres'te SELECT policy'leri OR'lanır). Kullanıcı canlı test etti: **"envanterlerin birleşmesini istemiyoruz, kişilerin envanteri sadece kendilerinde gösterilecek."**

**Kök sebep**: `useItems()` (Envanter sekmesi, Ana Sayfa'daki kombin havuzu, `WardrobeStats` — projedeki HER yer) sorguyu `user_id` ile hiç filtrelemiyor, tamamen RLS'e güveniyor ("hangi satırları görebiliyorsam onlar benimdir" varsayımı). RLS'i partnerin ürünlerini de kapsayacak şekilde genişletince, bu varsayım kırıldı — iki kişinin envanteri her yerde (ekranlarda, kombin üretiminde kullanılan üruün havuzunda) sessizce birleşti. Canlı SQL simülasyonuyla doğrulandı: partner eşleşmesi sonrası `items` sorgusu (kendi JWT'siyle, filtre olmadan) gerçekten iki kullanıcının ürünlerini birlikte döndürüyordu.

**Düzeltme**: `items` üzerindeki "partner görebilir" policy'si tamamen kaldırıldı (`20260719010000_fix_partner_item_visibility.sql`). Partnerin envanterine ihtiyaç duyan TEK yer (`generate-partner-outfit`) zaten kendi içinde güvenlik kontrolü yapabiliyor (partnerlik durumu ÖNCE çağıranın kendi JWT'siyle doğrulanıyor, SONRA service-role ile sadece partnerin ürünleri çekiliyor) — genel RLS'i genişletmeye hiç gerek yoktu. **Ders**: bir tabloya "filtre olmadan da doğru sonuç döner" diye güvenilen (`useItems()` gibi) RLS-bağımlı sorgular varsa, o tabloya yeni bir çapraz-görünürlük policy'si eklemek önce "bu tabloyu filtresiz sorgulayan başka yer var mı" diye kontrol etmeyi gerektiriyor — aksi halde "sahiplik" RLS ile client sorgusu arasındaki gizli bağımlılık sessizce bozulabiliyor.

Canlı test edildi: düzeltme sonrası aynı senaryo (partner eşleşmesi + filtresiz `items` sorgusu) artık sadece kendi ürünlerini döndürüyor, `generate-partner-outfit` (service-role ile) hâlâ doğru çalışıyor.

## Bug: "Partnerime Uyumlu Kombin Öner" Kaydedilince Kombinlerim Çöküyordu — Düzeltildi (2026-07-16)
Yukarıdaki fix'in DOĞRUDAN sonucu: kullanıcı ana kombini beğendi, partnerine uyumlu kombin önerdi (partnerin ürünlerinden), "Bu Kombini de Kaydet" dedi — bu, kendi hesabına ait bir `outfits` satırı oluşturuyor ama `outfit_items` partnerin ürün id'lerine referans veriyor (bilerek, bkz. yukarısı). Kombinlerim'e gidince **"Cannot read property 'slot' of null"** render hatasıyla çöktü.

**Kök sebep**: Az önce `items` üzerindeki geniş "partner görebilir" policy'sini TAMAMEN kaldırmıştım (merge bug'ı için) — ama bu, kaydedilmiş "partner kombini"nin render edilebilmesi için gereken TEK okuma yolunu da kapattı. `useLikedOutfits()`'teki `outfit_items(items(...))` join'i, artık okunamayan item satırları için `null` döndürüyordu, `OutfitCard.tsx`'teki `outfit.items.map((item) => ...item.slot...)` da `null.slot`'a erişmeye çalışıp çöküyordu. Canlı SQL ile doğrulandı: sorunlu outfit'in (`bd2f30b0...`) 5 item'ı da gerçekten partnerin envanterindendi.

**Düzeltme — iki katmanlı**:
1. **Dar bir RLS policy** (`20260719020000_narrow_partner_item_visibility.sql`): bir item, SADECE kendi `outfit_items` kaydı çağıranın KENDİ outfit'ine bağlıysa görünür oluyor (`exists (... outfit_items oi join outfits o ... where oi.item_id = items.id and o.user_id = auth.uid())`). Bu, kaydedilmiş partner kombinlerinin render edilmesini sağlıyor ama partnerin GENEL envanterini açmıyor (Envanter sekmesi gibi `outfit_items`'tan hiç geçmeyen sorguları etkilemiyor).
2. **Savunma katmanı**: `useItems()` artık RLS'e güvenmek yerine `user_id`'yi EXPLICIT filtreliyor (`lib/hooks/useItems.ts`, `useAuthStore`'dan okuyor). Neden gerekli: dar policy sayesinde bir kullanıcı, kaydettiği partner-kombini içindeki O BELİRLİ item'ları RLS üzerinden görebiliyor artık — filtresiz bir sorgu (`useItems()` gibi) bu birkaç item'ı da Envanter listesine sızdırırdı. Explicit filtre bunu garanti altına alıyor, RLS'in o anki kapsamından bağımsız.

**Ders (bir öncekinin devamı)**: partnerlik gibi "iki hesap arasında kontrollü çapraz erişim" gerektiren özelliklerde RLS'i genişletmek yerine, ihtiyacı olan TEK noktada (burada: kaydedilmiş kombin render'ı) mümkün olduğunca DAR bir policy + client tarafında explicit filtre kombinasyonu daha güvenli — RLS'in "varsayılan olarak neyi kapsadığını" tahmin etmeye çalışmak yerine.

Canlı doğrulandı: sorunlu outfit artık tüm item'larını (null olmadan) döndürüyor, Envanter sorgusu (explicit filtreyle) partnerin sızan item'larını içermiyor.

## AI Kombin Gerekçesi: ID/Jargon Sızıntısı ve Doğal Dil Düzeltmeleri (2026-07-16)
Kullanıcı ekran görüntüsüyle bildirdi: kombin gerekçesinde ham UUID'ler ("Bordo Triko Kazak (be553a94-...)") ve "sahiplik" gibi veri alanı isimleri görünüyordu — çünkü `SUGGEST_OUTFIT_TOOL` şemasındaki tek `reasoning` alanı hem Claude'un iç muhakemesi hem kullanıcıya gösterilecek metin olarak kullanılıyordu, ikisi ayrılmamıştı.

**Düzeltme**: Hem `generate-outfit` hem `generate-partner-outfit`'e yeni, kullanıcıya hiç gösterilmeyen bir `internalAnalysis` alanı eklendi (ID'lerle serbestçe referans verilebilen iç muhakeme için) — `reasoning` artık SADECE kısa, doğal, ID'siz/jargonsuz bir özet için. `internalAnalysis` response'tan da çıkarıldı (`jsonResponse`'a artık `toolUse.input` bütün olarak değil, seçilmiş alanlar veriliyor). Ayrıca: rule 7 "sahiplik/sahip/istek_listesi" kelimelerinin kelimesi kelimesine yazılmasını açıkça yasaklıyor; kullanıcı notu artık tırnak içinde tekrar edilmiyor (uygulama zaten ayrı gösteriyor), sadece isteğine doğal bir cümleyle karşılık veriliyor.

**Partner kombini + isimler**: `generate-partner-outfit` artık her iki tarafın `display_name`'ini SERVICE-ROLE ile server-side çekiyor (client'a güvenmiyor), prompt'ta "Kullanıcının kombini:" gibi jenerik etiketler yerine gerçek isimler kullanılıyor (ör. "Buse'nin kombini:"), reasoning'de de doğal şekilde isim geçebiliyor. Bağlam zaten uyumluysa (renk paleti örtüşüyorsa) kısa/basit bir cümle yeterli olacak şekilde yönlendirildi.

**Partner kombinine puanlama** eklendi: `handleSavePartnerOutfit` artık kaydedilen outfit id'sini saklıyor (`partnerSavedOutfitId`), kaydedildikten sonra ana kombinle birebir aynı yıldız puanlama UI'ı çıkıyor (`handleRatePartner` → `useRateOutfit`).

Canlı test edildi (geçici iki test kullanıcısı + gerçek isimlerle): reasoning'de ID yok, "sahiplik" kelimesi yok, not tırnak içinde tekrarlanmıyor, partner kombininde gerçek isimler ("TestBuse"/"TestOlcay") doğal cümlelerde kullanılıyor.

## Bug: "Karıştır" Aynı Taki Türünü İkinci Kez Önerebiliyordu — Düzeltildi (2026-07-16)
Kombinde hem kolye hem küpe varken kolyeyi "Karıştır" ile değiştirince, bazen yerine BAŞKA bir küpe geliyordu (kombinde 2 küpe, 0 kolye) — çünkü `taki` tek bir kategori/slot ama kolye/küpe/yüzük/bileklik/saat gibi birden fazla alt türü kapsıyor, şemada ayrı bir alt-tür alanı yok, ve `replaceItem`'daki aday filtresi sadece "aynı slot + daha önce denenmemiş + kombinde hâlihazırda olmayan id" bakıyordu — aynı slotta farklı bir id'ye sahip başka bir küpe bu filtreyi rahatça geçiyordu.

**Düzeltme**: `lib/outfitGenerator.ts`'e isimden anahtar kelimeyle tür çıkaran `inferTakiType()` eklendi (kolye/küpe/yüzük/bileklik/saat/kol_düğmesi). `replaceItem` artık taki için: (1) kombindeki DİĞER taki'lerin türleriyle çakışan adayları eliyor (aynı tür ikinci kez gelmiyor), (2) mümkünse değiştirilen parçayla AYNI türden bir alternatif tercih ediyor (kolye yerine kolye, en sadık "değiştirme" davranışı). Dice (Zar At) etkilenmiyor — o zaten taki+tamamlayıcıdan tek bir parça seçiyor, ikinci bir taki eklemiyor. Jest'e `inferTakiType` için birim testleri eklendi.

## Mini Özellik: İstek Listesinde "Satın Aldım" Seçeneği (2026-07-16)
İstek listesi ürününe basılı tutmak artık direkt silme yerine bir eylem menüsü açıyor: "Ürünü Satın Aldım" (envantere kopyalar, istek listesinden kaldırır — `useMarkWishlistItemPurchased`) veya "Ürünü Sil" (eskisi gibi). `lib/alert.ts`'e genel amaçlı bir `showActionSheet` helper'ı eklendi (native'de `Alert.alert` çoklu buton, web'de sırayla `confirm`'e düşüyor — native action sheet karşılığı yok). Canlı test edildi: satın alınan ürün envanterde doğru şekilde beliriyor, istek listesinden kayboluyor.

## AI Kombin Sessiz Fallback'i Artık Görünür (2026-07-16)
Kullanıcı bildirdi: bağlam soruları cevaplanıp kombin oluşturulduğunda bazen gerekçe (reasoning) metni hiç görünmüyordu, ama bağlam etiketleri (Kış/Ev/Gece/Özel Gün) duruyordu. Sebep bulundu: `requestAiOutfit` (`lib/aiOutfit.ts`), Claude çağrısı HERHANGİ bir sebeple başarısız olursa (o anki logdan rate-limit değildi, muhtemelen geçici bir Claude API hatasıydı) sessizce yerel rastgele seçime (`generateRandomOutfit`) düşüyor — bilinçli bir tasarım (asla üretmeyi reddetme), ama rastgele seçimin `reasoning`'i olmuyor, oysa `context` kullanıcının cevapladığı gerçek bağlam olarak kalıyordu (dice'ın sabit `DICE_CONTEXT`'i değil). Sonuç: kullanıcı "AI bağlamı unuttu" izlenimine kapılıyordu, oysa aslında AI hiç çağrılamamıştı.

**Düzeltme**: `app/(tabs)/index.tsx`'te `generateViaAi`, `suggestion.source === 'dice'` olduğunda (yani AI'a düşüş gerçekleştiğinde) `reasoning` alanına açık bir mesaj koyuyor: "Şu an AI önerisi alınamadı, envanterinden bağlama uygun rastgele bir kombin seçtik." Kök sebep (o anki tekil Claude API hatası) tekrarlanabilir değildi ve loglardan kesin teşhis edilemedi — bu yüzden asıl düzeltme "sessizce" değil "dürüstçe" düşmek oldu.

## Bug: internalAnalysis Eklemek Ana Kombin Üretimini Bozdu (max_tokens) — Düzeltildi (2026-07-16)
Kullanıcı bildirdi: "çalışan bir şey nasıl bozulur" — ana kombin üretimi bağlamı kuramıyor, gerekçe metni oluşturamıyordu (partner kombini çalışırken). **Kök sebep Claude API'sinde DEĞİL, bendim**: `internalAnalysis` alanını eklerken `max_tokens: 1024`'ü güncellememiştim. Şemada `internalAnalysis` İLK alan olduğu için model önce onu üretiyor; büyük (gerçekçi, 20+ ürünlük) envanterde uzun analiz + UUID referansları (her UUID ~15 token) bütçeyi dolduruyor, çıktı yarıda kesiliyor (`stop_reason: max_tokens`), `reasoning`/`itemIds` alanları eksik dönüyordu → client sessizce zar fallback'ine düşüyordu. Küçük test envanterlerimde (5 ürün) çıktı kısa kaldığı için testlerim yakalayamamıştı; canlı olarak 24 ürünlük envanterle yeniden üretildi (3 denemede 1 başarısız).

**Düzeltme (her iki üretim fonksiyonunda)**: `max_tokens` 1024→2500; `internalAnalysis` açıklamasına "KISA TUT (~80 kelime), ürün id'si YAZMA (isimle değin)" kısıtı; ve teşhis katmanı — `stop_reason === 'max_tokens'` ya da `itemIds`/`reasoning` eksikse artık sessizce bozuk veri dönmek yerine açık bir 502 hatası ("AI yanıtı eksik döndü (stop_reason: ...)") dönüyor. Düzeltme sonrası 5/5 deneme başarılı.

**Ders**: tool şemasına yeni (özellikle ilk sırada, uzun metinli) bir alan eklerken `max_tokens` bütçesini birlikte düşün; ve testleri gerçekçi veri boyutuyla yap — 5 ürünlük envanterde geçen test, 25 ürünlükte patlayabiliyor.

## Bug: Parça Değişince Partner Önerisi Eski Kombine Göre Gelebiliyordu (Race) — Düzeltildi (2026-07-16)
Kullanıcı bildirdi: ana kombinde "Karıştır" ile parça değiştirdikten sonra partner önerisi, kombinin SON haline değil İLK üretilmiş haline göre geliyordu (partner gerekçesi, çoktan değiştirilmiş "beyaz bluz"a atıfta bulunuyordu). Kod okuması state'in doğru okunduğunu gösterdi — asıl sebep **yarış durumu**: partner üretimi (Claude çağrısı) ~5-10 sn sürüyor; istek uçuştayken kullanıcı ana kombinde parça değiştirirse `replaceItem` partner kartını temizliyor AMA eski kombine göre üretilmiş yanıt dönünce `setPartnerItems` onu yine de ekrana yazıyordu.

**Düzeltme**: `outfitVersionRef` sayacı — her `showResult`/`replaceItem`/`reset`'te artıyor; `generatePartnerOutfit` isteğe başlarken versiyonu kaydediyor, yanıt (veya hata/no_match diyaloğu) döndüğünde versiyon değişmişse sonucu sessizce çöpe atıyor. **Ders**: sonucu state'e yazılan her uzun süren async akışta, "bu yanıt hâlâ geçerli mi" kontrolü (versiyon/istek kimliği) olmalı — özellikle kullanıcının beklerken durumu değiştirebildiği ekranlarda.

## İstek Listesi Eylem Menüsü: Marka Diline Uygun Bottom Sheet (2026-07-16)
OS-varsayılan `Alert.alert` menüsü kullanıcıya sırıtıyordu — `components/ui/ActionSheetModal.tsx` eklendi: alttan kayarak açılan (RN `Modal`, `animationType="slide"`, web dahil her platformda çalışıyor), yuvarlak köşeli, ikonlu, primary/kırmızı renkli seçenek satırları + "Vazgeç". `envanter.tsx`'teki istek listesi uzun-bası artık bunu kullanıyor; `lib/alert.ts`'teki Alert-tabanlı `showActionSheet` helper'ı kaldırıldı (tek kullanıcısı buydu). Genel amaçlı — ileride başka çok-seçenekli menüler de bunu kullanabilir.

## Envanter Uzun-Bas Menüsü + İki Layout Bug'ı (2026-07-16/17)
- Envanter sekmesi uzun-bası da (istek listesindeki gibi) `ActionSheetModal`'a taşındı: "Gizle / Önerme" (henüz işlevsiz — "Yakında" alerti; kullanıcının ileride kombin önerilerinden ürün gizleme planı için yer tutucu) + "Ürünü Sil". `showConfirm` tabanlı eski silme onayı kaldırıldı.
- **Layout bug 1**: Envanter başlığındaki `+` butonu bazen ekran dışına kayıyordu — başlık/alt-yazı kapsayıcısında `flex-1` yoktu, uzun alt yazı butonu itiyordu. `flex-1 pr-3` eklendi.
- **Layout bug 2**: kategori şeridindeki ikon-altı yazılar kalabalık envanterde kayboluyordu (istek listesinde görünüyordu) — yatay `ScrollView`'da `flexShrink: 0` yoktu, 85 ürünlük FlatList alan için sıkıştırınca şerit daralıp yazıları kırpıyordu. RN'de `flexGrow: 0` verilen ama `flexShrink` verilmeyen elemanlar sıkışma altında ezilebiliyor — sabit kalması gereken şeritlere ikisi birlikte verilmeli.

## Kullanıcı Geri Bildirimi Turu (2026-07-18, yeni build sonrası cihaz testi)
Kullanıcı yeni EAS build'i kendisi alıp cihazda test etti, geri bildirimlerine göre yapılanlar:

- **Renk pasta grafiği KALDIRILDI** — kullanıcı bar'ı tercih etti ("bir önceki grafik daha iyiydi"). `gardirop-analiz.tsx` artık her zaman düz View'lerle oranlı yatay bar çiziyor; svg lazy-require/ErrorBoundary kodu silindi. `react-native-svg` paketi build'de duruyor (ileride başka grafik için kullanılabilir) — kaldırılırsa yeni build gerekmez ama dursun.
- **Paylaşım kartı dinamik yerleşim**: parça sayısına göre 1 sütun (tek parça, %62) / 2 sütun (2-4 parça, %45) / 3 sütun (5-6, %30), dikeyde ortalı, isimler pill içinde; 6'dan fazlası "+N parça daha".
- **Bildirim teşhisi — ÇÖZÜLDÜ (2026-07-18, kullanıcı canlı doğruladı)**: kullanıcı günlük hatırlatıcının sistem tepsisine düşmediğini bildirmişti. `bildirimler.tsx`'e eklenen "Test Bildirimi Gönder (10 sn)" butonu (`sendTestNotification()`) hem teşhisi hem çözümü sağladı: kullanıcı butona basınca **Android bildirim izni diyaloğu ANCAK O ZAMAN geldi** → izin verildi → 10 sn sonra bildirim tepsiye düştü. **Kök neden**: hatırlatıcı tercihi ESKİ build'de (no-op dönemde) kaydedilmişti, yeni build'de açılıştaki `syncReminderFromPreferences()` bilinçli olarak izin SORMADIĞI için (izin verilmemiş olduğundan) zamanlama hiç kurulmuyordu. İzin artık verili — bir sonraki açılışta senkron hatırlatıcıyı kendiliğinden kurar (garanti için toggle kapat/aç da yeterli). Boru hattı uçtan uca doğrulandı. Ayrıca bekleyen partner isteği artık Bildirimler sayfasında da bir satır olarak görünüyor. **Partner isteği için GERÇEK push hâlâ FCM gerektiriyor** (Firebase projesi + google-services.json + yeni build) — kullanıcı isterse ayrıca kurulacak.
- **Tema geçişi yavaşlığı**: kod sorunu değil — dev build'de JS minify'sız + dev mode overhead'i. Production/preview build'de hızlanır.

## Üçüncü Geri Bildirim Turu: Gün Notu Ayrıştırma + Giydim Kartı Düzeltmeleri (2026-07-18)
- **Bavul gün notu ayrıştırıldı**: popup'taki input artık AI'ın aktivite notunu DEĞİL, yeni `userNote` alanını düzenliyor — input BOŞ başlar, kullanıcı isterse doldurur (kullanıcının örneği: "Bu kombini otele varınca... giyeceğim"). `day_outfits[].userNote` (jsonb, migration gerekmedi); gün kartında AI notu italik, kullanıcı notu mavi konuşma balonu ikonuyla ayrı satırda.
- **Fotoğrafsız Giydim kartı**: `WearEventCard` foto yokken artık boş gri placeholder GÖSTERMİYOR — kart parçalar/yıldız/tarih/notla render ediliyor.
- **Giydim kaydı silme**: Geçmiş'te karta DOKUNUNCA `ActionSheetModal` → "Giydim Kaydını Sil" (`useDeleteWearEvent`, `outfit_wears` satırını siler). Kombin beğenilmişse ve başka giyilmesi yoksa otomatik olarak Beğenilenler'e geri döner (`useLikedOutfits`'in worn-filtresi sayesinde, ekstra kod gerekmedi). Foto Storage'dan silinmiyor (bilinçli — mevcut hiçbir silme akışı Storage temizliği yapmıyor, ileride toplu temizlik işi olabilir).
- **Standalone APK**: kullanıcı Metro'suz çalışan build istedi (demo için) — `eas.json`'daki mevcut **preview** profili tam bunun için (release APK, dev-client değil, env'ler gömülü). `npx eas-cli build --profile preview --platform android`.

## Bavul İkinci Tur + Paylaşım Kartı 2+2+2 + Kişiselleştirme Genişletme (2026-07-18)
Kullanıcının ekran görüntülü ikinci geri bildirim turu + backlog 13/14/15 maddeleri:

- **Paylaşım kartı artık hep 2 sütun**: 5-6 parçada 3 sütun küçük kalıyordu (kullanıcı isteği: 2+2+2). 3 satırda görseller hafif küçülüp (%36) satır arası daralıyor ki 9:16 karta sığsın — sabit 300x533 kart taşarsa alttan KIRPILIR, satır başına yükseklik bütçesini düşünmeden boyut büyütme.
- **Bavul gün popup'ı tam boya yakın** (`mt-14 flex-1`): küçük popup'ta (-) rozeti ve (+) kutusu kayıyordu (cihazda görüldü). Kök neden: `w-[22%]` 4'lü grid + gap dar ekranda %100'ü aşıyordu ve (-) rozeti kutunun DIŞINA negatif konumlanmıştı. Çözüm: 3 sütun `w-[30%]`, (-) rozeti görselin İÇİNDE sağ üst, (+) kutusu parça kutularıyla birebir aynı iskelette (sarmalayıcı + iç kare + alt etiket). Ayrıca **güne özel not inputu** eklendi (`setDayNote`, `day_outfits[].note` kullanıcı tarafından düzenlenebilir, kayıtla kalıcı).
- **Bavul silme (backlog 13)**: Beğenilenler'deki bavul kartına uzun bas → `ActionSheetModal` → "Bavulu Sil" (`useDeletePackingList`).
- **Bavul günü → Giydim köprüsü (backlog 14)**: gün popup'ında "Bu Kombini Giydim Olarak İşaretle" — günün parçalarından `outfits` kaydı oluşturur (`source: 'manual'`, **`is_liked: false`** — Beğenilenler'e düşmez, Giydim kaydı girilince Geçmiş'te görünür; kullanıcı mark-worn'u iptal ederse görünmez bir yetim outfit kalır, zararsız) → `/mark-worn`'a yönlendirir. Bağlam: `{mevsim, hava?, mekan:'Seyahat', saat:'Tüm Gün', konsept}`.
- **Bavul puanları AI kişiselleştirmesinde (backlog 15)**: `generate-outfit` artık son 10 bavulun 4-5 yıldızlı günlerindeki parçaların renk/marka sıklığını, puanlı kombinlerle AYNI havuzda sayıyor; "en az 3" eşiği de `kombin + bavul günü` toplamına bakıyor. Canlı regresyon testi geçti.
- **Gün notu bayatlığı/tekrarı düzeltildi**: AI notları parça ismi sayıyordu (kullanıcı ekran görüntüsüyle bildirdi: parça değişince not eski parçayı anlatıyordu — notlar parça betimlemesi olduğu için). Çözüm iki katman: (1) prompt'ta nota parça adı/renk+parça ifadesi YASAK, sadece aktivite/ambiyans (ilk nazik talimat YETMEDİ — haiku yine isim saydı; KÖTÜ/İYİ örnekli sert yasakla düzeldi, canlı testte "Rahat gün boyu gezmesine uygun" gibi temiz notlar). (2) not artık kullanıcı tarafından da düzenlenebilir. **Ders**: küçük modele "X yapma" demek yetmeyebilir — kötü ve iyi örnek birlikte verilince tutuyor.

## Bavul: Düzenleme + Yıldız + Kalıcı Kayıt (2026-07-18)
Kullanıcının bavul geri bildirimleri uygulandı — bavul artık düzenlenebilir ve kalıcı:

- **`packing_lists` tablosu** (`20260723000000_add_packing_lists.sql`, Management API ile çalıştırıldı): `days`, `context` (jsonb), `suitcase_item_ids` (uuid[]), `day_outfits` (jsonb: `{day, itemIds, note, rating?}[]`), `reasoning`, `rating` (ortalama). Ürünlere FK YOK (bilinçli sadelik — silinen ürün render'da atlanır). RLS: `auth.uid() = user_id` (canlı test: ikinci kullanıcı 0 satır görüyor).
- **Yıldızlama (kullanıcı seçimi bana bırakmıştı)**: her günün kombinine ayrı yıldız verilir, bavulun puanı gün puanlarının ORTALAMASI (başlık altında gösteriliyor, DB'de `rating` kolonu).
- **Gün düzenleme popup'ı**: gün kartına BASILI TUT → alttan açılan Modal: günün parçaları (-) rozetiyle günden silinir, (+) kutusu envanter listesini açar (o günde olmayanlar), dokununca güne eklenir. **Bavul listesi ayrı tutulmuyor — her zaman günlerin BİRLEŞİMİNDEN türetiliyor** (`suitcaseFromDays`): böylece kullanıcının iki kuralı bedavaya geliyor (bir parça hiçbir günde kalmadıysa bavuldan da düşer; eklenen parça bavula da girer).
- **Kaydet**: plan üretilince "Bavulu Kaydet" butonu; kayıttan sonra "Değişiklikleri Kaydet" (update). `lib/hooks/usePackingLists.ts`: `usePackingLists/usePackingList/useCreatePackingList/useUpdatePackingList`.
- **Beğenilenler'de bavul kartı** (`kombinlerim.tsx`): kombinler + bavullar tarihe göre tek listede; bavul kartı OutfitCard'la aynı çerçeve ölçüsünde, bavul ikonu + "Bavul · N Gün" + bağlam/parça sayısı + üst üste binen parça küpürleri + (varsa) yıldız. Dokununca `/bavul-hazirla?packingListId=...` açılıyor — aynı ekran kayıtlı planı düzenleme modunda yüklüyor (soru formu gizli, düzenleme + puanlama + güncelleme aktif).
- Canlı test: insert/select/update + RLS izolasyonu doğrulandı (geçici 2 anon kullanıcı, sonra silindi). Cihaz testi: mevcut build'de çalışır (native modül yok — RN Modal).

## Bavul Hazırla: Seyahat Kapsül Gardırop Modu (2026-07-18)
Kullanıcının 10 maddelik listesindeki son büyük özellik. Ana Sayfa'daki mor "Seyahate mi çıkıyorsun?" kartından açılan **`app/bavul-hazirla.tsx`** (modal): gün sayısı (2/3/4/5/7) + mevsim + konsept zorunlu, beklenen hava **bilerek opsiyonel** (seyahat ileri tarihli olabilir, kullanıcı havayı bilmeyebilir) + opsiyonel not.

- **Yeni `generate-packing-list` Edge Function** (deploy edildi): `generate-outfit`'le aynı iskelet (JWT auth + saatlik 30 `ai_call` rate-limit havuzu — ortak havuz, ayrı sayaç değil). Claude'a KAPSÜL prensibi kuralları: bavul parça sayısı ≤ gün×2, her parça mümkünse 2+ kombinde, 1-2 ayakkabı, dar renk paleti; mevsim/hava/konsept kuralları generate-outfit'ten uyarlandı. `max_tokens: 4000` (gün başına kombin ürettiği için 2500'den fazla — max_tokens dersi uygulandı). Sunucu tarafı tutarlılık düzeltmesi: envanterde olmayan id'ler elenir, kombinlerde geçen her id bavul setine eklenir.
- **`lib/packing.ts`** — `requestPackingList()`. **Yerel fallback bilerek YOK** (zar mantığıyla anlamlı bavul kurulamaz); hata olursa Edge Function'ın gerçek hata gövdesi kullanıcıya gösteriliyor ("sessiz fallback" dersinin tersi yönde bilinçli karar).
- Sonuç UI: bavul grid'i (parça sayısıyla) + ampul ikonlu gerekçe + gün gün plan kartları + "Yeniden Hazırla". DB'ye kaydedilmiyor (v1 bilinçli sınır — istenirse `outfits`'a `generation_source: 'manual'` ile kaydetme eklenebilir).
- **Canlı test edildi** (geçici anon kullanıcı + 8 ürünlük kasıtlı karışık envanter, sonra silindi): 3 günlük Yaz/Güneşli/Karışık + "deniz kenarında tatil" notu → 7 parçalık kapsül bavul, kışlık mont doğru elendi, parçalar günler arasında yeniden kullanıldı (şort 2 gün, sneaker 2 gün), gün notları ve gerekçe doğal Türkçe.

## Kombin Paylaşım Kartları (2026-07-17)
Yeni **`app/kombin-paylas.tsx`** (modal; giriş: Beğenilenler'de her kartın yanındaki paylaş ikonu). Kombini 9:16 (Instagram Story) formatında markalı bir karta çevirip **sistem paylaşım menüsüyle** paylaşıyor:
- Kart: sabit lacivert zemin + marka blob'ları + bağlam chip'leri + ürün görselleri grid'i + "Kombin App" imzası — temadan bağımsız sabit tasarım. `useOutfit(outfitId)` hook'u eklendi (`useOutfits.ts`, tek kombini id ile çeker).
- `react-native-view-shot` (`captureRef`, 1080x1919 px çıktı) + `expo-sharing` (`shareAsync`) — ikisi de NATIVE, ikisi de lazy require + no-op korumalı (svg ile aynı desen); eski build/web'de buton açıklayıcı alert veriyor, app çökmüyor. **Instagram'a DOĞRUDAN story paylaşımı bilinçli yapılmadı** — Facebook SDK entegrasyonu gerektirir; sistem paylaşım menüsü v1 için yeterli (kullanıcı menüden Instagram'ı seçiyor).
- **Android gotcha**: yakalanan View'a `collapsable={false}` verilmeli — Android view düzleştirmesi yüzünden ref'siz kalan View `captureRef`'i patlatır.
- Cihaz testi YENİ BUILD sonrasına bekliyor (native modüller eski build'de yok).

## Akıllı Gardırop Analizi Ekranı (2026-07-17)
Yeni **`app/gardirop-analiz.tsx`** (modal; giriş: Ana Sayfa'daki `WardrobeStats` kartının altındaki "Detaylı gardırop analizi" linki). Üç bölüm, hepsi mevcut hook'lardan client-side hesap (yeni sorgu/tablo yok):
1. **Renk Dağılımı** — `closestColorName` ile gruplanıp **react-native-svg pasta grafiği** olarak çiziliyor (`lib/colorNames.ts`'e `namedColorHex()` eklendi). **Önemli desen**: react-native-svg native modülü ESKİ build'de yok — Expo Router tüm route dosyalarını açılışta import ettiği için statik import app'i AÇILIŞTA çökertirdi. Çözüm: lazy `require` + try/catch (notifications ile aynı desen) + render hatalarına karşı küçük bir ErrorBoundary; svg kullanılamıyorsa aynı veri **düz View'lerle oranlı yatay bar** olarak çiziliyor (eski build + web bugün bile çalışır). Tek renk (%100) pasta diliminde arc çizilemez — tam daireye (`Circle`) düşülüyor.
2. **En Çok Giydiğin Kombinler** — `useWornOutfits()` olayları `outfitId`'ye göre sayılıp top 3 (küçük ürün küpürleri + "N kez" rozeti).
3. **Hiç Giymediklerin** — hiçbir `outfit_wears` kaydının kombinine girmemiş envanter ürünleri (ilk 12 küpür + kalan sayısı).

**Gotcha — typed routes bayatlaması**: yeni route eklendiğinde `.expo/types/router.d.ts` sadece Metro çalışırken yenileniyor (`expo export` YENİLEMİYOR) — tsc "not assignable to Href" hatası verirse ya Metro'yu bir kez başlatmak ya da (bu oturumda yapıldığı gibi) üretilen dosyadaki `StaticRoutes` union'ına yeni route'u elle eklemek gerekiyor; Metro sonraki açılışta aynı içeriği kendisi üretiyor.

**Güncelleme (2026-07-18, kullanıcı isteği)**: "En Çok Giydiklerin" ve "Hiç Giymediklerin" bölümleri **Ana Sayfa'ya da taşındı** (idle ekranda `RecentOutfitsStrip`'in altında; amaç ana sayfayı boş göstermemek), "Detaylı gardırop analizi" linki ana sayfanın **en altına** alındı (WardrobeStats içindeki linki kaldırıldı). Ortak hesaplar `lib/wardrobeInsights.ts`'e (`topWornOutfits`/`unwornItems`), ortak görünümler `components/ui/TopWornOutfitRows.tsx` + `components/ui/UnwornItemThumbs.tsx`'e (analizde grid, ana sayfada yatay şerit) çıkarıldı. Analiz ekranına ayrıca **Kategori Dağılımı** bölümü eklendi (renk bölümündeki gibi sayılarla: "Elbise (5)" chip'leri). Kullanıcının analiz ekranında gördüğü hata eski build'den (react-native-svg yok) — LogBox dev overlay'i; ErrorBoundary sayesinde app çökmüyor, bar fallback çiziliyor, yeni build'de svg gelince kendiliğinden çözülür.

## Kombin Çiftleri: Ana + Partner Kombini Bağlı Gösterim (2026-07-17)
Partnere önerilip kaydedilen kombin artık ana kombinle DB'de bağlı ve Beğenilenler'de birlikte gösteriliyor:
- **`outfits.pair_outfit_id`** (`20260722000000_add_outfit_pair.sql`, Management API ile çalıştırıldı) — yön: partner kombini → ana kombin; `on delete set null` (ana silinirse partner kombini bağımsız kombin olarak yaşar).
- `useCreateOutfit` → `pairOutfitId`; `handleSavePartnerOutfit` ana kombin kaydedildiyse bağı yazıyor. **Ters sıra da kapsandı**: partner ÖNCE kaydedilip ana SONRA beğenilirse, `handleLike` yeni `useSetOutfitPair` mutation'ıyla bağı sonradan kuruyor.
- **Beğenilenler gruplaması** (`kombinlerim.tsx`): her iki kombin de listedeyse mor çerçeveli tek bir "Kombin Çifti" bloğunda üst üste gösteriliyor (her birinin kendi puanlama + Giydim butonu korunuyor); ana kombin listede değilse (ör. giyilip Geçmiş'e düştüyse) partner kombini normal tekil kart olarak kalıyor.
- **Canlı test edildi** (geçici anon kullanıcı + 2 test ürünü, sonra tamamen silindi): bağ `useLikedOutfits`'in birebir sorgusuyla doğru döndü, ana kombin silinince bağın null'a düştüğü doğrulandı.

## Profil Resmi Yükleme (2026-07-17)
`profiles.avatar_url` kolonu ilk şemadan beri vardı, hiç kullanılmıyordu — artık gerçek:
- **`avatars` Storage bucket'ı** (`20260721000000_avatars_bucket.sql`, Management API ile çalıştırıldı) — diğer bucket'larla aynı desen: public, yol `avatars/{user_id}/{dosya}`, RLS ilk klasörü `auth.uid()` ile karşılaştırıyor. **Canlı test edildi** (geçici anon kullanıcı, sonra silindi): kendi klasörüne yükleme OK, BAŞKASININ klasörüne yükleme doğru reddedildi, public URL 200, silme OK.
- `lib/storage.ts` → `StorageBucket`'a `'avatars'` eklendi; `useUpdateProfile` → `avatarUrl` alanı (undefined ise alana hiç dokunulmaz — diğer alanlar gibi).
- `app/profile-edit.tsx` — formun tepesinde yuvarlak avatar seçici (galeri, 1:1 kırpma, kaydete basınca yüklenir). `app/(tabs)/profil.tsx` hesap kartında avatar varsa onay ikonu yerine foto gösteriliyor.

## Tema Seçimi: Sistem / Açık / Koyu (2026-07-17)
Kullanıcının yeni listesindeki "tema butonu" maddesi. Profil'de menünün altında "Tema" kartı: Sistem/Açık/Koyu üçlü seçim.

- **`lib/theme.ts`** — `ThemePreference` (`'system'|'light'|'dark'`), AsyncStorage'da `kombin_theme_pref`; `setThemePreference()` NativeWind'in `colorScheme.set()`'iyle anında uygular + kalıcılaştırır; `applyStoredThemePreference()` açılışta `app/_layout.tsx`'ten çağrılıyor (fire-and-forget).
- **`hooks/useColorScheme.ts` artık NativeWind'in hook'unu sarıyor** (react-native'inki yerine) — böylece React Navigation teması ve tab bar da manuel tema geçişini anında takip ediyor. `hooks/useColorScheme.web.ts` SİLİNDİ: web'de sabit 'light' döndürüyordu (Expo şablonunun SSR önlemi), biz SPA olduğumuz için gereksizdi ve tema geçişini web'de kırardı. `hooks/useThemeColor.ts` de artık paylaşılan hook'u kullanıyor.
- Bu manuel geçiş `darkMode: 'class'` sayesinde çalışıyor (bkz. tailwind.config.js notu — 'media' olsaydı "Cannot manually set color scheme" hatası). **Dikkat**: export runtime hatalarını yakalamaz (bilinen ders) — tema geçişi cihazda/tarayıcıda bir kez elle denenmeli.

## Switcher Hizalaması + Profilde İsim Gösterimi (2026-07-17)
Kullanıcının yeni geliştirme listesinden iki küçük UI maddesi:
- **Switcher hizalaması**: Envanter (Envanterim/İstek Listem) ve Kombinlerim (Geçmiş/Beğenilenler) ikili switcher'ları farklı hizadaydı — Envanter başlığının altındaki uzun alt yazı switcher'ı aşağı itiyordu. Kullanıcının önerdiği çözüm uygulandı: alt yazı ("X ürün · düzenlemek için dokun...") kategori şeridinin ALTINA taşındı (`text-xs`), iki ekranın başlık satırı da aynı içerik yüksekliğine (h-11) sabitlendi — switcher artık iki ekranda aynı konumda.
- **Profilde isim**: `app/(tabs)/profil.tsx` artık `useProfile`'dan `display_name` okuyor — isim kayıtlıysa kartta büyük yazı isim, altta e-posta; isim yoksa eskisi gibi e-posta başlıkta. Ayrıca karttaki bayat "Günde 3 kombin hakkı" metni kaldırıldı (limit zaten uygulanmıyor, sadece "Ücretsiz Plan" kaldı). Ayrı bir soyad kolonu bilinçli olarak eklenmedi — tek `display_name` alanına "Ad Soyad" yazılıyor (profil düzenlemedeki "Adın" alanı), partner akışları zaten ilk ismi ayıklıyor.

## Partner Gerekçesinde İsim Kullanımı: İlk İsim + "Sen" Hitabı (2026-07-16)
Kullanıcı bildirdi: gerekçede ana hesaptan "Kullanıcı'in" diye bahsediliyordu (e-posta hesaplarında `display_name` otomatik gelmediği için null → yapay fallback), partnerden ise ad+soyad ("Olcay Şahin") ile.

**Düzeltme**: `generate-partner-outfit` artık (1) sadece İLK ismi kullanıyor (`split(/\s+/)[0]`), (2) isteği yapanın adı kayıtlı değilse "Kullanıcı" gibi yapay bir etiket yerine İKİNCİ TEKİL ŞAHIS ("senin kombinin") hitabı talimatı veriyor — gerekçeyi zaten isteği yapan okuyor. Ana Sayfa'daki partner kartı başlığı da ilk isme indirildi (eşleşme onay ekranında ad+soyad bilerek korundu — doğru kişiyi teyit etmek için). Ayrıca `app/profile-edit.tsx`'e "Adın" alanı eklendi (`useUpdateProfile` artık `display_name` de yazıyor, partnership sorgusu invalidate ediliyor) — e-posta hesapları da isim kaydedebilsin diye. Gerçek Buse hesabına (`display_name` null'du) 'Buse' yazıldı. Canlı test: isimli senaryoda sadece ilk isimler ("Buse", "Olcay") geçiyor, isimsiz senaryoda doğal "ikiniz" hitabı kullanılıyor, "Kullanıcı" hiçbir yerde geçmiyor.

## Partner Kombini: Bağlam Kuralları + "Daha Esnek Öner" Akışı (2026-07-16)
Kullanıcı iki sorun bildirdi: (1) `generate-partner-outfit` ham "Partnerin envanterinden uygun bir kombin bulunamadı" hatası fırlatıyordu (console error olarak), (2) partner kombini bağlama (mevsim/mekan/saat/konsept) uymayabiliyordu — çünkü partner fonksiyonunun prompt'unda SADECE renk uyumu kuralları vardı, bağlam kuralları (generate-outfit'teki 3-5. kurallar gibi) hiç yoktu; `context` prompt'a JSON olarak ekleniyordu ama modele onunla ne yapacağı söylenmiyordu.

**Düzeltme — üç katman**:
1. **Bağlam kuralları eklendi** (kural 3): partner kombini de mevsim/mekan/konsepte uymak zorunda, "bağlam uygunluğu en az renk uyumu kadar önemli".
2. **Strict/relaxed iki mod**: normal (strict) modda envanterde makul (%60+) uyum yoksa model `itemIds`'i bilinçli boş bırakıyor → fonksiyon yapılandırılmış `{code:'no_match', detail:<neden>}` 422 dönüyor → client (`PartnerNoMatchError`) ham hata yerine `showConfirm` ile "Daha Esnek Öner" seçeneği sunuyor → kabul edilirse `relaxed:true` ile tekrar çağrılıyor. Yeni zorunlu `compatibility` (0-100, dürüst uyum tahmini) alanı; <75 ise client reasoning'e "(Tahmini uyum: %X)" ekliyor.
3. **Deterministik yedek**: canlı testte görüldü ki relaxed modda bile model (güçlü talimata rağmen) reddedebiliyor — bu durumda fonksiyon kendisi temel slotlardan (üst+alt+ayakkabı ya da tek_parça+ayakkabı) asgari bir kombin kurup `compatibility: 40` ile dönüyor. Esnek mod kullanıcının açık tercihi, asla boş dönmemeli.

**Gotcha**: `onPress={generatePartnerOutfit}` → fonksiyona `relaxed` parametresi eklenince press event'i ilk argüman olarak geçip her çağrıyı relaxed yapardı — `onPress={() => generatePartnerOutfit()}` olarak düzeltildi.

**Canlı test edildi** (kasıtlı senaryolarla): kış/özel-gün bağlamı + sadece-yazlık partner envanteri → strict doğru şekilde no_match döndü (doğal dilli açıklamayla), relaxed %28 uyumla dürüst bir öneri verdi, uyumlu envanterli normal senaryo %95 uyumla eskisi gibi çalışıyor.

## Kombinlerim'de Cinsiyet Rozeti: Kimin Gardırobundan? (2026-07-16)
Partner özelliği sayesinde bir kullanıcının "Beğenilenler" listesinde hem kendi kombinleri hem partnerine önerilip kaydedilen kombinler birlikte görünüyor — hangisinin kime ait olduğunu ayırt etmek zorlaştı. Kullanıcı isteği: kendi kombininde kendi cinsiyet rozeti (kadın→pembe `female` ikonu, erkek→mavi `male` ikonu — projede başka yerde kullanılmasa da standart Ionicons glyph'leri), partnerin kombininde partnerin rozeti, önizleme (silüet) ikonunun HEMEN SOLUNDA.

**Uygulama**: `OutfitItemSummary`'ye (`lib/hooks/useOutfits.ts`) `user_id` eklendi (item'ın gerçek sahibini taşımak için — RLS zaten bu satırı görünür kılıyor, sadece SELECT'e dahil edilmemişti). `OutfitCard`'a opsiyonel `genderIcon?: 'kadın'|'erkek'|null` prop'u eklendi. `Kombinlerim.tsx`'te her kombin için `outfit.items[0].user_id`'ye bakılıyor: kendi id'siyse `useProfile()`'dan kendi cinsiyeti, partnerin id'siyse (`usePartnership()` artık `partnerGender`'ı da döndürüyor) partnerin cinsiyeti gösteriliyor, ikisi de değilse (ör. eşleşme sonlandırılmışsa) rozet hiç çıkmıyor. Gerçek hesap verisiyle doğrulandı (Buse: Kadın, Olcay: Erkek — doğru eşleşiyor).

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

Bu, kullanıcının önerdiği "parça bazlı" (ör. "beyaz crop + buz mavisi şort renk uyumu" gibi çift bazlı notlar) fikrinin ilk adımı — henüz sadece genel/tek gerekçe var, parça-parça notlar için Claude'a verilen tool şemasının genişletilmesi gerekiyor (bkz. "Fikir havuzu"). ~~Şu an DB'ye kaydedilmiyor~~ — **2026-07-17'de kalıcı hale getirildi**, bkz. bir sonraki bölüm.

## Kombin Gerekçesi Artık Kalıcı: reasoning + pairing_notes DB'de (2026-07-17)
`outfits`'a `reasoning` (text) ve `pairing_notes` (jsonb) kolonları eklendi (`20260720000000_add_outfit_reasoning.sql`, Management API ile çalıştırıldı ve kolonlar doğrulandı). `useCreateOutfit` ikisini de yazıyor; `OUTFIT_SELECT`/`useLikedOutfits` geri okuyor; `kombinlerim.tsx` Beğenilenler kartlarına geçiriyor (`OutfitCard` zaten render edebiliyordu, sadece veri geçilmiyordu).

- **Neler kaydediliyor**: ana kombinde SADECE gerçek AI gerekçesi (`generatedSource === 'ai_generated'` şartı) — zar kombinlerinin gerekçesi yok; AI-fallback'in "Şu an AI önerisi alınamadı..." mesajı da o ana ait geçici bilgi olduğu için bilinçli kaydedilmiyor. Partner kombininde `partnerReasoning` (düşük uyumda eklenen "(Tahmini uyum: %X)" ekiyle birlikte) + `pairingNotes` kaydediliyor.
- **Geçmiş (outfit_wears) kartlarına bilinçli taşınmadı** — `WearEventCard` foto-albüm odaklı; veri artık DB'de olduğu için istenirse tek satırla eklenebilir.
- **Canlı test edildi** (geçici anon kullanıcı + 2 test ürünü, iş bitince veriler + anon kullanıcılar silindi): kaydet → `useLikedOutfits`'in birebir sorgusuyla geri oku, ikisi de doğru döndü. **Gotcha**: Postgres `jsonb` obje anahtarlarını kanonik sıraya dizer (`note`, `itemIds`'ten önce döner) — test/karşılaştırmada ham `JSON.stringify` eşitliği yanlış negatif verir; uygulama property adıyla eriştiği için davranışsal etkisi yok.

## Hava Durumu Bağlam Sorusu (2026-07-17)
Kullanıcının orijinal fikrindeki (notlar.txt) hava durumu sorusu nihayet eklendi. Ana Sayfa soru akışına "Hava" chip satırı (Güneşli/Yağmurlu/Rüzgarlı/Karlı) — diğer sorular gibi ZORUNLU (`allAnswered`'a dahil). `OutfitContext.hava` bilinçli olarak **opsiyonel** tipte: eski kayıtlı kombinlerin `generation_context`'inde ve zar bağlamında (`DICE_CONTEXT`) bulunmuyor, `OutfitCard` chip'leri `Object.values` ile render ettiği için eski kayıtlar 4, yeniler 5 chip gösterir — kırılma yok. Her iki Edge Function'ın prompt'una hava kuralları eklendi (Yağmurlu/Karlı: süet ve açık ayakkabıdan kaçın + mevsimden bağımsız dış giyim ekle; Rüzgarlı: ince/uçuşan parçalardan kaçın), ikisi de yeniden deploy edildi. **Canlı test edildi** (geçici anon kullanıcı, yağmura uygun/uygunsuz karışık envanter, sonra temizlendi): Yağmurlu bağlamda model süet sandalet/süet ceketi eleyip deri bot + trençkot seçti, gerekçesi yağmura açıkça atıf yaptı.

## Gerçek Bildirimler: Günlük Hatırlatıcı (expo-notifications) (2026-07-17)
`expo-notifications@~0.28.19` (SDK 51 uyumlu) eklendi, `app.json` plugins'e girdi. **YENİ EAS BUILD GEREKİYOR** — native modül, mevcut build'de yok (kullanıcı build almayı planlıyor).

- `lib/notifications.ts` — tamamı **lazy `require` + try/catch** deseniyle: modülün native tarafı yoksa (eski build / web) tüm fonksiyonlar sessizce no-op olur, uygulama ÇÖKMEZ. Bu sayede eski build'de app açılmaya devam eder, sadece hatırlatıcı kurulamaz. **Gotcha**: `await import()` kullanılamadı — bu projenin tsconfig module ayarı dinamik import'u desteklemiyor (TS1323); senkron `require` + tip için `typeof import('expo-notifications')` kombinasyonu çözüm.
- Günlük hatırlatıcı tamamen **lokal zamanlanmış bildirim** (`scheduleNotificationAsync` + `{hour, minute, repeats: true}` trigger, sabit identifier ile üst üste binme yok) — sunucu/push altyapısı GEREKMİYOR, FCM gerekmiyor.
- `app/bildirimler.tsx` artık gerçek: açarken izin istiyor (`requestPermissionsAsync`), reddedilirse açıklayıcı alert; saat değişince açıksa yeniden kuruyor. "Yakında" metni kaldırıldı.
- `app/_layout.tsx` açılışta `syncReminderFromPreferences()` çağırıyor: yeni build/yeniden kurulumda OS zamanlaması kaybolur ama AsyncStorage tercihi yaşar — idempotent yeniden kurulum (izin İSTEMEDEN, sadece zaten verilmişse).
- **Partner isteği push bildirimi BİLİNÇLİ kapsam dışı**: Android'de remote push FCM (Firebase projesi + google-services.json + EAS credential) gerektirir — kullanıcı console işi + build'e girmesi gereken dosya. Karar verilmedi; verilirse build ÖNCESİ yapılmalı (yoksa bir build daha gerekir). Uygulama içi rozet çalışmaya devam ediyor.
- ~~Cihaz testi build sonrasına bekliyor~~ — **CİHAZDA DOĞRULANDI (2026-07-18)**: yeni build'de test bildirimi (izin diyaloğu → izin → 10 sn sonra tepsiye düştü) kullanıcı tarafından onaylandı. İlk "bildirim gelmiyor" şikayetinin kök nedeni izin eksikliğiydi — detay için "Kullanıcı Geri Bildirimi Turu (2026-07-18)" bölümündeki bildirim maddesine bak.

## Build Öncesi Native Paket Hazırlığı (2026-07-17)
Yaklaşan EAS build'e (expo-notifications için zaten gerekli) girecek şekilde, planlanan özelliklerin native bağımlılıkları ÖNCEDEN eklendi — özelliklerin kendisi henüz YAZILMADI, sadece paketler build'e girsin diye kuruldu (yoksa her özellik ayrı build gerektirirdi):
- `react-native-svg@15.2.0` — Akıllı Gardırop İstatistikleri'ndeki renk pasta grafiği için
- `react-native-view-shot@3.8.0` + `expo-sharing@~12.0.1` — Kombin Paylaşım Kartları (kartı görsele çevir + paylaşım menüsü) için

Üçü de `npx expo install` ile SDK 51 uyumlu sürümlerde; hiçbiri `app.json` config plugin gerektirmiyor. FCM (partner push) kararı bilinçli olarak yine ertelendi — kullanıcı istemedi, bu build'e girmiyor. **Not**: bu paketleri import eden kod yazılana kadar mevcut eski build'de hiçbir etkisi yok; import edilmeye başlandığında (istatistik/paylaşım özellikleri yazılınca) yeni build şart olacak.

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

## Geri Bildirim Turu (2026-07-19): 3 Bug Düzeltmesi + Arşiv + Galeri + Paylaşım Şablonları + Ana Sayfa Varyantları

Kullanıcının 19.07.2026 geri bildirim turunda bildirdiği 3 bug + brainstorming'de onaylanan 5 yeni özellik tek oturumda yapıldı. Sırasıyla:

### Bug 1: Geçmiş'te Giydim Kaydı Silinemiyordu — Kök Neden: Eksik RLS Policy
Kullanıcı: "silme ekranı geliyor yani popup açılıyor, sil butonuna basıyoruz ama işlevini yerine getirmiyor." Management API ile `pg_policies` sorgulandı: `outfit_wears` tablosunda SADECE `SELECT`/`INSERT`/`UPDATE` policy'leri vardı, **DELETE policy'si hiç yoktu**. Supabase'in RLS'i, izin verilmeyen bir DELETE'i hataya düşürmüyor — sessizce 0 satır siliyor, client'a hatasız dönüyor. `app/(tabs)/kombinlerim.tsx`'teki silme UI'ı (popup + `useDeleteWearEvent`) baştan beri doğruydu, sorun tamamen veritabanı tarafındaydı.

**Düzeltme**: `supabase/migrations/20260724000000_add_outfit_wears_delete_policy.sql` — mevcut UPDATE/SELECT policy'leriyle birebir aynı sahiplik ifadesiyle (`exists (select 1 from outfits where outfits.id = outfit_wears.outfit_id and outfits.user_id = auth.uid())`) bir DELETE policy eklendi, Management API ile prod'da çalıştırıldı. **Canlı test edildi**: geçici anon kullanıcı + outfit + wear kaydı oluşturuldu, `useDeleteWearEvent` ile birebir aynı çağrı (`delete().eq('id', wearId)`) ile silindi, 0 satır kaldığı doğrulandı; ikinci bir anon kullanıcının BAŞKASININ wear kaydını silmeye çalışması da doğru şekilde engellendi (RLS regresyonu yok).

### Bug 2: Bildirim Sistem Tepsisine Düşüyor Ama Banner Olarak Görünmüyordu
Kullanıcı: "bizim bildirimden kastımız bu değil mi?" — bildirim geliyordu (bir önceki oturumda izin sorunu çözülmüştü) ama sadece bildirim merkezinde duruyordu, ekrana kayan/ses çıkaran bir "heads-up" banner olarak çıkmıyordu. Kök neden: Android bildirim kanalı `AndroidImportance.DEFAULT` ile kurulmuştu — heads-up banner için `HIGH` şart. Android bir kanalın önem derecesini **kod tarafından sonradan yükseltmeye izin vermiyor** (ilk oluşturulduğunda kullanıcı ayarı olarak cache'leniyor).

**Düzeltme** (`lib/notifications.ts`): kanal id'si `daily-reminder` → `daily-reminder-v2`'ye değiştirildi (yeni kanal = yeni önem derecesi mümkün), yeni `ensureAndroidChannel()` helper'ı `AndroidImportance.HIGH` + ses + titreşim deseniyle kanalı kuruyor ve eski `daily-reminder` kanalını `deleteNotificationChannelAsync` ile temizliyor (kullanıcının cihazında birikmiş, artık kullanılmayan bir kanal kalmasın diye). Hem `scheduleDailyReminder` hem `sendTestNotification` bu helper'ı kullanıyor. Cihaz testi (kullanıcı tarafından) build sonrasına kalıyor — bu bir JS-only değişiklik değil, davranışı native bildirim kanalı seviyesinde, mevcut development build'de zaten çalışır (yeni native modül gerekmiyor, sadece `expo-notifications`'ın zaten var olan API'sinin farklı parametreyle çağrılması).

### Bug 3: Tema Şaşması — "Açık" Seçiliyken Bazen Koyu Render Ediyordu
Kullanıcı ekran görüntüsüyle bildirdi: Profil'de "Açık" tema seçiliyken uygulama koyu render ediyordu. Kök neden: Android'de galeri/foto seçici/paylaşım menüsü gibi **ayrı bir Activity açan** işlemler bir configuration change tetikliyor, RN bunun üzerine görünümü sistem temasından yeniden okuyor — bu, `nativewind`'in `colorScheme.set()` ile yapılan MANUEL tema tercihini sessizce eziyor.

**Düzeltme** (`lib/theme.ts`): yeni `installThemeGuard()` — bir kez kurulan iki listener: (1) `AppState` 'active' olayında, (2) `Appearance` değişim olayında, eğer aktif tercih 'system' DEĞİLSE kayıtlı tercihi tekrar basıyor. 'system' tercihinde listener'lar bilinçli no-op (OS'i takip etmek zaten istenen davranış). `app/_layout.tsx`'te açılışta bir kez çağrılıyor. Sonsuz döngü koruması: `Appearance` listener'ı sistem teması zaten istenen değerdeyse tekrar set etmiyor.

### Temalı Dialog Sistemi: Tüm Messagebox'lar Artık Marka Diline Uygun
Kullanıcı: "bavulu kaydet butonuna bastığımızda çıkan messagebox... bütün messageboxlar defaulttan mutlaka temamıza uygun hale gelmeli." Projedeki ~50 `showAlert`/`showConfirm` çağrısı OS-varsayılan `Alert.alert`/`window.alert` kullanıyordu (native, tema/marka rengi uygulanamaz).

**Uygulama**: yeni `lib/stores/dialogStore.ts` (Zustand, kuyruk tutan — bir dialog açıkken ikinci istek gelirse kaybolmuyor, ilki kapanınca sırayla gösteriliyor) + `components/ui/AppDialogHost.tsx` (ortalanmış, yuvarlak köşeli, Poppins/Inter, primary mavi, dark-mode uyumlu modal; `ActionSheetModal`'la aynı görsel dil). `lib/alert.ts`'teki `showAlert`/`showConfirm` **imzaları hiç değişmedi** — içeri `Alert.alert` yerine `dialogStore.show()` çağırıyor, bu yüzden çağıran ~50 nokta HİÇ dokunulmadan otomatik olarak yeni sisteme geçti. `AppDialogHost`, `app/_layout.tsx`'te `Stack`'in yanında bir kez mount ediliyor.

### Arşiv Özelliği: Ürün ve Kombinler Önerilerden Çıkarılabilir (Silinmeden)
Kullanıcı isteği: kullanılmayan ürün/kombinleri silmek yerine "önerme ama sakla" seçeneği + envanterde soluk+rozetli görünmeye devam etmesi (kullanıcının bilinçli tercihi: "Envanterde soluk olarak durması ve rozetli olması daha uygun" — gizlemek değil).

- **Migration** (`20260725000000_add_archive_flags.sql`): `items.is_archived` ve `outfits.is_archived` (ikisi de `boolean not null default false`). Management API ile prod'da çalıştırıldı.
- **Envanter**: `ItemCard`'a `archived` prop'u — `opacity-40` + sol üstte küçük "Arşiv" rozeti (siyah yarı-saydam pill). Uzun-bas menüsündeki eski işlevsiz "Gizle / Önerme" ("Yakında" alerti veren yer tutucu) artık gerçek "Arşivle / Önerme" ↔ "Arşivden Çıkar" (`useArchiveItem`).
- **Kombinler**: Beğenilenler'deki her kart artık "Giydim"/"Paylaş" ikonlarının yanında bir arşiv butonu (`showConfirm` ile onay alıyor); Geçmiş'teki giydim-kaydı eylem menüsüne de "Kombini Arşivle" seçeneği eklendi. Arşivlenen kombin hem `useLikedOutfits` (artık `.eq('is_archived', false)` filtreli) hem `useWornOutfits`'ten (join'de `is_archived` okunup client'ta filtreleniyor) düşüyor.
- **Ana Sayfa üretim havuzu**: `activeItems` (arşivsiz) artık zar/AI'ın VARSAYILAN havuzu; soru ekranına istek-listesi checkbox'ının yanına ikinci bir checkbox eklendi: "Arşivdekileri de dahil et (N ürün)" — sadece arşivli ürün varsa gösteriliyor. **Zar bu seçenekten bağımsız, her zaman arşivsiz havuzdan seçiyor** (istek listesinde olduğu gibi aynı bilinçli kısıt). `requestAiOutfit`/`generate-outfit` Edge Function'ına `includeArchived` parametresi eklendi — server tarafında `items` sorgusuna `.eq('is_archived', false)` filtresi sadece `includeArchived` false ise ekleniyor. `generate-packing-list` ve `generate-partner-outfit` içinse arşivli ürünler HER ZAMAN hariç (bavulda "dahil et" seçeneği bilinçli yok; partnerin arşivlediği ürünler de partner önerisine hiç girmiyor).
- **Yeni `app/arsivlerim.tsx`** (Profil menüsünden, "Arşivlerim"): arşivlenmiş kombinler (`useArchivedOutfits`, her birinde "Arşivden Çıkar" butonu) + arşivlenmiş ürünler (grid, dokununca arşivden çıkarıyor) tek ekranda.
- **Canlı test edildi** (geçici anon kullanıcı + gerçek Claude çağrısı): varsayılan çağrıda arşivli ürün havuza hiç girmedi, `includeArchived:true` ile (envanterdeki TEK üst giyim arşivliyken) kombine dahil oldu; kombin arşivleme `is_liked` sorgusundan düşürdü, `is_archived` sorgusunda doğru şekilde belirdi; arşivden çıkarma mutation'ı da ayrıca doğrulandı.

### Galeri: Yeni 5. Sekme (Fotoğraflı Giydim Anılarının Albümü)
Kullanıcı onayı: "Önerini onaylıyorum" — 4 sekme 5'e çıkarıldı (Ana Sayfa · Envanter · **Galeri** · Kombinlerim · Profil). Yeni `app/(tabs)/galeri.tsx`: `useWornOutfits()`'ten SADECE `photoUrl` dolu olanlar 3 sütunlu bir kare foto grid'i olarak listeleniyor (Kombinlerim > Geçmiş'ten kasıtlı ayrım — Geçmiş fotoğrafsız kayıtları da gösterir, Galeri sadece "gerçek albüm" hissi versin diye fotoğraflı olanları). Karta dokununca alttan açılan bir detay modalı: büyük fotoğraf + tarih + puan + not + o günün parça küpürleri. Yeni sorgu/tablo gerekmedi, tamamen mevcut `outfit_wears` verisinin farklı bir görünümü.

### Paylaşım Kartı: Tek Tasarım Yerine 10 Şablon + Seçici
Kullanıcı onayı: "Onaylıyorum tabii ki". Eski `app/kombin-paylas.tsx` tek (lacivert+blob) bir kart tasarımına sabitti. Şimdi:

- **`lib/shareTemplates.ts`** — 10 config (`SHARE_TEMPLATES`): Lacivert (eski varsayılan), Minimal (beyaz+ince çerçeve), Siyah & Altın (lüks, köşe süslemeli çerçeve), Gün Batımı (sıcak blob renkleri), Mor Gece (yıldız noktacıkları), Pastel Krem, Dergi Kapağı (büyük başlık + hero görsel + alt şerit), Polaroid (2x2 kolaj + kalın beyaz çerçeve), Retro Şerit (film şeridi sprocket deseni + yatay kareler), Instagram (IG post taklidi: hashtag'li chip'ler, kalp/yorum/paylaş ikonları). Her config: zemin/metin/chip/item renkleri + dekorasyon tipi (`blobs`/`stars`/`corners`/`sprockets`/`none`) + yerleşim tipi (`grid`/`hero`/`polaroid`/`strip`/`instagram`).
- **`components/ui/ShareCardView.tsx`** — TEK parametrik bileşen, `config`'e göre dekorasyon + yerleşimi seçip render ediyor (10 ayrı JSX ağacı yerine paylaşılan capture/paylaşım mantığı). **Yeni native bağımlılık YOK** — gradient efektleri, mevcut "blob" desenindeki gibi katmanlı yarı-saydam şekillerle simüle edildi (`expo-linear-gradient` kurulu değil, kurmak yeni bir build gerektirirdi).
- `app/kombin-paylas.tsx` artık şablon seçiciyle küçültüldü: küçük yuvarlak önizleme swatch'leri (renk + 2 dekorasyon noktası) yatay bir şeritte, seçili olan primary çerçeve + tikle işaretli. Son seçim `AsyncStorage`'da (`kombin_share_template`) kalıcı, bir sonraki paylaşımda hatırlanıyor.
- `captureRef`/`expo-sharing` mantığı hiç değişmedi — sadece yakalanan View'ın içeriği artık seçili şablona göre değişiyor.

### Ana Sayfa: 5 Yerleşim Varyantı + İlk Açılış Seçici + Profil Ayarı
Kullanıcı onayı, önerdiğim yapıyla birebir: "4-5 varyant ve senin önerdiğin yapıyla devam edelim" (Sade/Kart Odaklı/Hero Butonlu/Yoğun Panel/Minimal, bloklar paylaşılan bileşenler).

- **`lib/homeLayout.ts`** — `HomeLayoutVariant` tipi + `AsyncStorage` tabanlı tercih okuma/yazma (`kombin_home_layout`) + `hasChosenHomeLayout()` (ilk-açılış kontrolü için: tercih hiç kaydedilmemiş mi).
- **`components/home/HomeIdleContent.tsx`** — Ana Sayfa'nın idle ekranındaki TÜM içerik buraya taşındı, `variant` prop'una göre 5 farklı düzen render ediyor. Alt bloklar (`WardrobeStats`, `RecentOutfitsStrip`, `TopWornOutfitRows`, `UnwornItemThumbs`) HER varyantta AYNI bileşenler — sadece çevrelerindeki kapsayıcı/sıra/stil değişiyor. Bu bilinçli bir mimari karar: ileride yeni bir ana sayfa bloğu eklenirse (yeni bir `<InsightBlocks>` girdisi gibi) otomatik olarak 5 varyantın hepsinde belirir, her varyant için ayrı ayrı eklenmesi gerekmez.
  - **Sade**: mevcut tasarım birebir (güvenli varsayılan).
  - **Kart Odaklı**: her blok kendi ikonlu başlıklı, çerçeveli/gölgeli kartında.
  - **Hero Butonlu**: "Kombin Oluştur"/"Zar At" büyük, ikonlu, yan yana iki karo; wishlist/bavul hatırlatıcıları ince tek satırlık linklere küçültülüyor.
  - **Yoğun Panel**: CTA'lar yan yana kompakt, wishlist/bavul 2 sütunlu küçük karo, En Çok Giydiklerin/Hiç Giymediklerin yan yana iki sütun (daha az kaydırma).
  - **Minimal**: kutu/gölge/arka plan tonu yok, ince üst-çizgili düz metin satırları, ok işaretleriyle ("→") gezinme ipucu.
- **`app/ana-sayfa-tasarimi.tsx`** — yeni modal ekran, hem ilk açılışta (`firstRun=1` param'ıyla, "Devam Et" butonlu) hem Profil > "Ana Sayfa Tasarımı" menüsünden (parametresiz, seçince direkt geri dönüyor) kullanılıyor. Her varyant için küçük bir wireframe önizleme (gerçek ekran görüntüsü değil, orantılı kutu/çizgi taklidi — hızlı ve tema-uyumlu).
- **İlk açılış zinciri**: `app/(tabs)/index.tsx`'teki mount effect'i sırayla kontrol ediyor: önce onboarding görüldü mü (görülmediyse `/onboarding`'e git), sonra (onboarding zaten görülmüşse) ana sayfa tasarımı hiç seçilmemiş mi (seçilmediyse `/ana-sayfa-tasarimi?firstRun=1`'e git). **Gotcha**: `app/onboarding.tsx`'teki bitiş fonksiyonu `router.back()` yerine `router.replace('/')`'e çevrildi — `back()` index'i remount ETMİYOR (aynı instance görünür kalıyor), bu yüzden onboarding sonrası tasarım-seçici kontrolü hiç tetiklenmezdi. `replace('/')` Ana Sayfa'yı yeniden mount ettirip zinciri doğru sıraya sokuyor.
- **Ayar değişikliği yansıması**: Ana Sayfa sekmesi Tabs içinde arka planda mount kalmaya devam ettiği için (React Navigation varsayılanı), Profil'den tasarım değiştirilip Ana Sayfa'ya dönüldüğünde tek seferlik `useEffect` bunu YAKALAYAMAZ. Çözüm: `useFocusEffect` (`@react-navigation/native`) ile sekme her odaklandığında tercih AsyncStorage'dan yeniden okunuyor — ucuz bir okuma, hem ilk-açılış hem Profil-ayarı senaryosunu aynı anda çözüyor.

### Tutorial + SSS Güncellemesi
`app/onboarding.tsx`: "Kaydet, Puanla, Giy" ile "Partnerinle Eşleş" arasına 4 yeni kart eklendi — Bavul Hazırla, Galeri, Kombinini Paylaş, Arşiv (8 karttan 12'ye çıktı; bu dördü önceki oturumlarda yapılmış ama onboarding'e hiç eklenmemiş büyük özelliklerdi — Bavul Hazırla ve paylaşım kartı özellikle). Ana sayfa tasarımı seçici onboarding'e kart olarak eklenmedi, bilinçli — kendi ekranı zaten kendini anlatıyor, onboarding sonrası otomatik açılıyor. `app/yardim.tsx`: SSS'e Arşiv, Galeri, paylaşım şablonları, ana sayfa tasarımı değiştirme hakkında 4 yeni soru eklendi (8'den 12'ye).

### Doğrulama
Her adımdan sonra `npx tsc --noEmit` → `npx jest --watchAll=false` (9/9 yeşil) → `npx expo export -p web` (başarılı, `dist/` her seferinde silindi) sırasıyla çalıştırıldı, hepsi bu oturumun sonunda son bir kez daha temiz geçti. Migration'lar ve Edge Function değişiklikleri (arşiv filtresi eklenen `generate-outfit`/`generate-packing-list`/`generate-partner-outfit`) Management API / `supabase functions deploy` ile prod'a uygulanıp geçici anon kullanıcılarla canlı test edildi, test verileri/kullanıcılar iş bitince temizlendi. **Cihazda henüz denenmedi** (bu oturum tamamen kod+DB tarafı) — bildirim HIGH kanalın gerçekten heads-up banner verdiği, tema guard'ın Activity-geçişlerinde gerçekten tutunduğu, ve 5 ana sayfa varyantı ile 10 paylaşım şablonunun cihazda görsel olarak beklendiği gibi durduğu bir sonraki cihaz testinde doğrulanmalı — hiçbiri yeni native modül gerektirmiyor, mevcut development build + Metro yeterli.

## Cihaz Testi Geri Bildirimi + Manuel Kombin + Paylaşım Şablonları 15'e Çıktı (2026-07-19 devamı)

Yukarıdaki turun cihaz testi sonrası kullanıcı geri bildirimi: 3 bug + arşiv + galeri onaylandı ("harika", "çok güzel olmuş"). Paylaşım şablonlarından SADECE 3'ü (Lacivert, Mor Gece, Instagram) beğenildi, 7'si beğenilmedi. Ayrıca üç yeni brainstorming kararı netleşti ve uygulandı.

### AI Önizleme Kapsamı Daraltıldı: Sadece İstek Listesi / Manuel Kombin
Kullanıcının kendi analizi doğruydu: sahip olunan bir AI/zar kombininde önizlemeye gerek yok (kullanıcı zaten gerçeğini giyip görebiliyor), ama henüz SAHİP OLUNMAYAN (istek listesi) ürünlerde ve kullanıcının kendi kurduğu manuel kombinlerde (aşağı bak) gerçek değer katıyor. `OutfitCard`'a yeni `previewEligible?: boolean` prop'u eklendi (varsayılan `false` — önizleme butonu artık koşulsuz görünmüyor):
- Ana Sayfa'daki AI/zar sonuç önizlemesi: `previewEligible={hasWishlistItem}` (zaten var olan istek-listesi-tespiti bayrağı yeniden kullanıldı).
- Partner kombini önizlemesi: hiç `previewEligible` verilmiyor (varsayılan `false`) — partner önerisi hep partnerin SAHİP OLDUĞU ürünlerden, hiç istek listesi/manuel değil.
- Kombinlerim/Arşivlerim'deki KAYDEDİLMİŞ kombinler: `previewEligible={outfit.generation_source === 'manual'}` — kaydedilmiş bir outfit ASLA istek listesi ürünü içeremez (mevcut FK kısıtı, bkz. "İstek Listesi" bölümü), o yüzden kayıtlı kombinlerde tek kriter kaynağın 'manual' olması.
- Yeni manuel kombin ekranında: her zaman `previewEligible` (true).

### Manuel Kombin Oluşturma: Yeni `app/manuel-kombin.tsx`
Kullanıcının fikri: "kişi belki kafasındaki kombini kaybetmek istemiyordur veya nasıl duracağını görmek istiyordur" — AI/zar'a hiç gitmeden, kullanıcının envanterinden (+istek listesinden) parçaları KENDİSİ seçtiği bir akış. Şema hiçbir değişiklik gerektirmedi — `outfits.generation_source` zaten `'manual'` değerini destekliyordu (bavul-giydim köprüsünden beri).

- Ekran: bağlamsal 5 chip (mevsim/hava/mekan/saat/konsept, AI akışıyla aynı zorunlu desen — tutarlılık için), kategori filtreli bir ürün grid'i (envanter + istek listesi karışık, istek listesi ürünleri kalp rozetiyle işaretli), dokununca çoklu-seçim (mavi çerçeve + tik rozeti). Seçili parçalar `OutfitCard` ile CANLI önizleniyor (AI preview butonu dahil, `previewEligible` her zaman açık).
- **Kaydetme kısıtı istek listesiyle birebir aynı**: seçimde istek listesi ürünü varsa "Kombini Kaydet" devre dışı + açıklayıcı metin ("satın alıp envanterine ekleyince kaydedebilirsin") — yeni bir kural İCAT EDİLMEDİ, var olan `outfit_items` FK kısıtının doğal sonucu tekrar kullanıldı.
- Kaydedilince (`useCreateOutfit`, `source: 'manual'`, `isLiked: true`) AI/zar akışındaki gibi yıldız puanlama ekranı çıkıyor.
- **Giriş noktası**: Ana Sayfa'nın 5 yerleşim varyantının HEPSİNE eklendi (`HomeIdleContentProps.onManualPress`) — Sade/Hero/Yoğun Panel'de küçük bir metin linki, Kart Odaklı'da kendi `SectionCard`'ı, Minimal'de diğerleriyle aynı `border-t` satırı deseninde.
- **Canlı test edildi** (geçici anon kullanıcı + 2 test ürünü): `useCreateOutfit`'in yaptığı birebir aynı insert zinciriyle kaydedildi, `useLikedOutfits`'in birebir sorgusuyla geri okundu — `generation_source: 'manual'` doğru döndü (yani `previewEligible` doğru tetiklenecek), parça sayısı doğru, test verisi temizlendi.

### Paylaşım Şablonları 3 → 15
Kullanıcı verdiğim prompt'u Gemini'de (banana pro) denedi, ürettiği GÖRSELLERİ beğenmedi ama fikir/renk/dekorasyon TARİFLERİNİ istedi ve metin olarak geri getirdi. Karar: 7 beğenilmeyen şablon (Minimal, Siyah&Altın, Gün Batımı, Pastel Krem, Dergi Kapağı, Polaroid, Retro Şerit) TAMAMEN kaldırıldı; yerine Gemini'nin 7 fikri + Claude'un tasarladığı 5 yeni fikir eklendi. Beğenilen 3'ü (Lacivert, Mor Gece, Instagram) hiç değişmedi.

- **`lib/shareTemplates.ts`** genişletildi: `ShareDecoration` tipine 10 yeni değer (`hollow-shapes`/`thin-lines`/`diamond-mix`/`retro-mix`/`torn-paper`/`blueprint-grid`/`spotlight`/`glow-ring`/`dashed-frame`/`unboxing`), yeni `chipStyle?: 'pill'|'outline'|'dotted'` (varsayılan `'pill'`, eskisi gibi doldurulmuş), `itemBorderWidth?`, `quirkyFirstCorner?` (ilk ürün karesine abartılı köşe — Retro Geometri), `showPaletteDots?` (kombindeki ürünlerin GERÇEK renklerinden küçük bir palet şeridi — Kumaş Numunesi).
- **Gemini'nin 7 fikri** (kod kısıtına uygun tarif istendiği için hepsi doğrudan uygulanabildi): Pazartesi Sabahı (minimalist, hollow şekiller), Şehirli Safari (toprak tonu, ince çizgiler), Dijital Sanatçı (mor zemin, baklava-dilimi dekorasyon, kalın mercan çerçeve), Retro Geometri (üçgen+yarım daire+nokta karışımı, ilk karede abartılı köşe), Dergi Kolajı (düzensiz köşeli "yırtık kağıt" bloğu + bant şeridi), Uzay Yolculuğu (teknik çizim ızgarası + köşe L işaretleri, koyu mod), Güneşli Brunch (sıcak krem zemin, dolu mercan chip'ler).
- **Claude'un 5 yeni fikri** (Gemini'ninkilerden ve 3 mevcuttan bilinçli farklı, ürüne özgü): Vitrin (bavul/vitrin hissi, sıcak spotlight glow + ince altın çerçeve — `config.frame` alanı ilk kez farklı bir renkte tekrar kullanıldı), Kumaş Numunesi (kesik-çizgili "dikiş" çerçevesi + kombindeki ürünlerin gerçek renklerinden palet noktaları — tek şablona özgü, veriye dayalı bir flourish), Gece Kulübü Neon ("Gece/Özel Gün" enerjisi için, Instagram story-ring mekaniğinin genelleştirilmiş hali iki neon renkle), Kutu Açılışı (e-ticaret ürün kartı/unboxing hissi, `hero` yerleşimini kullanan tek yeni şablon — kesik "kesim çizgisi" + köşe etiketi), Terzi Defteri (ölçü defteri/kroki hissi, `strip` yerleşimini kullanıyor, Uzay Yolculuğu'yla aynı `blueprint-grid` mekaniği açık renk paletiyle tekrar kullanıldı).
- **Mimari not**: 15 şablonun 13'ü `layout:'grid'` kullanıyor (sadece renk/dekorasyon/chip-stili değişiyor), 2'si (Kutu Açılışı→`hero`, Terzi Defteri→`strip`) var olan alternatif yerleşimleri yeniden kullanıyor — hiçbir yeni layout türü İCAT EDİLMEDİ, sadece dekorasyon çeşitliliği artırıldı. Bu bilinçli bir kapsam kararı: kullanıcının ilk 10 şablonda asıl sorunun "hepsi aynı grid'in renk değişimi" olduğu netleşmemişti (Dergi/Polaroid/Retro Şerit farklı yerleşim kullanıp da tutmamıştı) — bu yüzden yerleşim çeşitliliğine değil, HER şablonun kendi içinde tutarlı ve belirgin bir "kimlik" (palet+dekorasyon+chip stili üçlüsü) taşımasına odaklanıldı.
- **Bilinen sadeleştirmeler** (zaman kısıtı, şeffafça kabul edilen ödünler): Gemini'nin tarif ettiği bazı mikro-detaylar (ör. Şehirli Safari'deki ürün karesi köşelerinde kare aksan, Retro Geometri'deki gerçek zikzak çizgi, Dergi Kolajı'ndaki tam "yırtık kenar" hissi) birebir değil YAKLAŞIK olarak uygulandı (RN'de SVG olmadan path/zigzag çizmek pratik değil) — palet+genel dekorasyon fikri sadık kalındı, piksel-piksel eşleşme hedeflenmedi.
- Cihazda henüz denenmedi (bu oturum tamamen kod tarafı) — 15 şablonun tümü bir sonraki cihaz testinde `kombin-paylas.tsx`'teki seçiciden tek tek gözden geçirilmeli.

### Doğrulama
`npx tsc --noEmit` → `npx jest --watchAll=false` (9/9) → `npx expo export -p web` sırasıyla temiz geçti, `dist/` silindi. Manuel kombin kaydı canlı test edildi (yukarıda detaylandırıldı). Paylaşım şablonları saf JS/View render mantığı olduğu için (Supabase'e dokunmuyor) ayrıca canlı DB testi gerekmedi, sadece `tsc`/`export` ile bundling doğrulaması yeterli görüldü.

## Cihaz Testi Turu: Manuel Kombin + Instagram Şablonu, 3 Küçük Düzeltme (2026-07-20)
Kullanıcı yukarıdaki turun tamamını cihazda madde madde test edip geri bildirdi — büyük kısmı ("hepsi doğru çalışıyor") teyit, üç noktada gerçek düzeltme gerekti:

1. **Manuel kombinde kategori çakışması — önce kategori kısıtı denendi, sonra kullanıcı basit üst sınırı tercih etti**: Kullanıcı kasıtlı olarak 15 karışık ürün ekleyip aynı kategoriden birden fazla parça (2 küpe, 2 kemer gibi) seçilebildiğini gördü. İlk çözüm olarak aynı `slot`tan yeni bir ürün seçilince öncekini otomatik bırakan bir kısıt eklendi, ama kullanıcı bunu istemedi ("bir önceki şeklimize dönelim") — asıl kastı kategori bazlı bir kural değil, basit bir toplam üst sınırdı. Geri alındı; `app/manuel-kombin.tsx`'e `MAX_SELECTED_ITEMS = 9` eklendi, `toggleItem` 9'dan fazla seçime izin vermiyor (sessizce engelliyor, hata mesajı yok), "Parça Seç" başlığı `N/9` gösteriyor, limit dolunca seçilmemiş kutular `opacity-40` ile görsel olarak pasif gösteriliyor.
2. **Önizleme kartı seçim ızgarasını itiyordu**: Parça seçildikçe büyüyen `OutfitCard` önizlemesi (eskiden seçim ızgarasının ÜSTÜNDE) altındaki ürün kutularını aşağı kaydırıp yanlış tıklamalara yol açıyordu. Çözüm: önizleme, seçim ızgarasının ALTINA taşındı — artık büyürken üstünde konumu sabit kalması gereken hiçbir şeyi itmiyor. Yeni bir "sabit yükseklik" ya da iç scroll mekanizması icat edilmedi, sadece sıralama değiştirildi (en basit ve en sağlam çözüm).
3. **Instagram şablonunda story çerçevesi yanlış yerdeydi**: Kullanıcı "çerçeve kartın etrafında değil, tam Instagram'da olduğu gibi profil resminin etrafını sarmalı" dedi — ilk sürüm mor/mercan iki katmanlı çerçeveyi TÜM KARTIN kenarına uyguluyordu, gerçek IG story ringinin göründüğü yer değildi. `components/ui/ShareCardView.tsx`'te çerçeve kart kenarından kaldırılıp doğrudan avatarı (34px dış mor halka + 28px iç mercan halka, aralarında kart arka plan renginde boşluk — segment/gradient hissi versin diye) saran iç içe iki daireye taşındı. Aynı teknik zaten `glow-ring` dekorasyonunda (Gece Kulübü Neon şablonu) kart kenarı için kullanılıyordu — burada aynı iki-katmanlı-border fikri kart yerine avatara uygulandı.

Üçü de `npx tsc --noEmit` → `npx jest --watchAll=false` (9/9) → `npx expo export -p web` ile doğrulandı, `dist/` silindi. Kullanıcının ayrıca teyit ettiği, değişiklik gerektirmeyen noktalar: AI önizleme artık doğru yerlerde (AI/zar'da yok, istek listesi/manuel'de var, partner kombininde yok — kod incelemesiyle de doğrulandı, `handleSavePartnerOutfit` zaten `source: 'ai_generated'` kaydediyor ve partner `OutfitCard`'ına hiç `previewEligible` geçilmiyor); 15 paylaşım şablonunun hepsi okunaklı ama hangilerinin kalıcı kalacağına henüz karar verilmedi (ileride dönülecek); bazı şablonlarda hafif taşma var (ileride bakılacak, acil değil); Ana Sayfa 5 tasarım arası geçiş sorunsuz.

## Brainstorming Turu: UX Önerileri + Eksik Görülen İyileştirmeler, Onaylanıp Sıraya Kondu (2026-07-20)
Kullanıcı "kullanıcı deneyimini iyileştirmek adına öneriler + eksik gördüğün gerekli iyileştirmeler nedir" diye sordu, iki liste sunuldu (UX önerileri + proje kapsamında eksik görülen özellikler), kullanıcı "hepsini sırayla uygulayalım" dedi — sadece **Apple ile Giriş** ertelendi (bkz. aşağıdaki not), geri kalanı bu ve takip eden bölümlerde sırayla uygulanıyor.

**Apple ile Giriş — bilinçli olarak ertelendi**: Google'daki gibi client id/secret değil, Team ID + Services ID + private key (.p8) gerekiyor, üçü de kullanıcının **Apple Developer Program üyeliğinden** (yıllık 99$, henüz yok) geliyor. Ayrıca sadece iOS'a çıkılacaksa zorunlu (App Store kuralı: Google girişi sunuyorsan Apple'ı da eşdeğer seçenek olarak sunman gerekiyor) — bu projenin tüm build/test geçmişi Android odaklı, hiç iOS build alınmadı. Kullanıcı iOS'a çıkmayı planlarsa ve üyeliği alırsa devam edilecek, aksi halde tamamen gereksiz.

### Uygulanan UX iyileştirmeleri
1. **Manuel kombin: ürün arama kutusu** — `app/manuel-kombin.tsx`'e kategori filtresinin yanına isim arama kutusu eklendi (Türkçe locale-aware `toLocaleLowerCase('tr')` ile karşılaştırma — büyük/küçük İ-ı farkını doğru ele alması için).
2. **Manuel kombin: "son bağlamı kullan" kısayolu** — başarılı kayıttan sonra kullanılan bağlam (mevsim/hava/mekan/saat/konsept) `AsyncStorage`'a (`kombin_manual_last_context`) yazılıyor; ekran açılışında varsa "Son kullandığım bağlamı doldur" linki çıkıyor, dokununca 5 alanı tek seferde dolduruyor.
3. **Paylaşım şablon seçicide son kullanılanı başa alma** — `app/kombin-paylas.tsx`'te, `AsyncStorage`'dan okunan son seçim varsa listenin başına alınıyor. Sıralama SADECE ekran açılışında bir kez hesaplanıyor (oturum içinde başka bir şablona dokununca liste kaymasın diye — seçili olan zaten tikle görünüyor, yeniden sıralamak kafa karıştırırdı).
4. **Onboarding "Geç" butonu** — kontrol edildi, zaten vardı (`app/onboarding.tsx` üst sağ köşe), ek işlem gerekmedi. Bunun yanında iki yerde bayatlamış "10 farklı şablon" referansı bulundu (onboarding kartı + `app/yardim.tsx` SSS'i, 15'e çıkalı unutulmuş) — ikisi de 15'e ve güncel isimlere (lacivert/Instagram/mor gece) güncellendi.
5. **Envanterde çoklu seçim + toplu arşivleme/silme** — `useItems.ts`'e `useArchiveItems`/`useDeleteItems` eklendi (`.in('id', ids)` ile TEK istekte toplu işlem, N ayrı mutation yerine). `envanter.tsx`'e "Seç" modu: başlıkta toggle, `ItemCard`'da (yeni `selectionMode`/`selected` prop'ları) sağ üstte tik dairesi, alt sabit çubukta "N seçili" + Arşivle/Sil butonları. Sadece Envanterim sekmesinde (istek listesinde arşiv kavramı yok).
6. **Kombinlerim: "Bugün Giydim" hızlı aksiyonu** — Beğenilenler kartındaki "Giydim olarak işaretle" butonunun yanına bir yıldırım ikonlu hızlı buton eklendi; foto/not formuna hiç gitmeden `useMarkWorn` ile anında bugünün tarihiyle giydim kaydı düşüyor, kısa bir onay diyaloğu gösteriyor.
7. **Envanter listesi performansı** — kontrol edildi, `envanter.tsx` zaten `FlatList` kullanıyor (hem Envanterim hem İstek Listem sekmesi), virtualization zaten var; ek değişiklik gerekmedi.

### Uygulanan eksik-özellik iyileştirmesi: Beğenmeme (👎) Sinyali
Rating'in tersi bir sinyal eksikti — kaydedilmeyen (rating hiç verilmeyen) AI/Zar kombinleri için kişiselleştirmeye hiç veri gitmiyordu. Yeni **`outfit_dislikes`** tablosu (`20260726000000_add_outfit_dislikes.sql`, Management API ile uygulandı ve doğrulandı) — append-only log (`user_id`, `item_ids uuid[]`, `context jsonb`), sadece SELECT/INSERT policy'si var (update/delete yok, kasıtlı). `lib/hooks/useOutfits.ts` → `useRecordDislike()`. Ana Sayfa'da "Tekrar Dene"nin yanına küçük bir 👎 ikon butonu eklendi (`dislikeAndRetry()`): mevcut kombinin ürün id'lerini + bağlamı kaydedip ardından zaten var olan `retry()`'yi çağırıyor — yani sinyal toplama ile "bana başka bir tane öner" isteği tek dokunuşta birleşiyor.

`generate-outfit` Edge Function'ına rating-personalizasyonuyla BİREBİR AYNI desende (aynı en-az-3-kayıt eşiği, aynı "bağlamı asla ezme" talimatı) bir `dislikeNote` eklendi — son 15 beğenmeme kaydındaki renk/marka sıklığı çıkarılıp modele "bunlardan mümkünse kaçın" sinyali olarak veriliyor. Redeploy edildi.

**Canlı test edildi** (geçici anon kullanıcı + 2 test ürünü — siyah tişört + kırmızı/TestBrand tişört): kırmızı ürüne 3 dislike kaydı eklendi → RLS izolasyonu doğrulandı (ikinci bir anon kullanıcı 0 kayıt görüyor) → `generate-outfit` 200 döndü ve dislike verisi mevcutken hatasız çalıştı, modelin siyah tişörtü seçmesi (kırmızı/disliked olanı değil) beklenen "kaçınma" sinyaliyle tutarlıydı. Test verisi silindi.
