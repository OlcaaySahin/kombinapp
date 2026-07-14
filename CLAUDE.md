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

## Notlar
- **Figma MCP** `.mcp.json` içinde proje seviyesinde tanımlı (`figma`, http transport). Kullanıcı Figma'dan tasarım paylaşacak, tasarım verisine doğrudan erişim için kullanılacak. Görsel/marka teması MVP akışları çalışana kadar bilerek ertelendi.
- Geliştirme ortamı Windows; Git kurulumu proje başında ayrıca yapıldı (winget).
