import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { RecentOutfitsStrip } from '@/components/ui/RecentOutfitsStrip';
import { TopWornOutfitRows } from '@/components/ui/TopWornOutfitRows';
import { UnwornItemThumbs } from '@/components/ui/UnwornItemThumbs';
import { WardrobeStats } from '@/components/ui/WardrobeStats';
import type { DbItem } from '@/lib/hooks/useItems';
import type { OutfitWithItems } from '@/lib/hooks/useOutfits';
import type { WornOutfitStat } from '@/lib/wardrobeInsights';
import type { HomeLayoutVariant } from '@/lib/homeLayout';

export type HomeIdleContentProps = {
  variant: HomeLayoutVariant;
  limitReached: boolean;
  onCreatePress: () => void;
  onDicePress: () => void;
  wishlistCount: number;
  onWishlistPress: () => void;
  onBavulPress: () => void;
  activeItems: DbItem[];
  likedOutfits: OutfitWithItems[];
  topWorn: WornOutfitStat[];
  neverWorn: DbItem[];
  onAnalysisPress: () => void;
};

/**
 * Ana sayfa idle ekranının TÜM içeriği — 5 yerleşim varyantı (kullanıcı isteği 2026-07-19).
 * Alt bloklar (WardrobeStats, RecentOutfitsStrip, TopWornOutfitRows, UnwornItemThumbs) HER
 * varyantta aynı bileşenler; sadece çevrelerindeki kapsayıcı/sıralama/stil değişir — yeni bir
 * ana sayfa bloğu eklendiğinde otomatik olarak her varyantta belirir.
 */
export function HomeIdleContent(props: HomeIdleContentProps) {
  switch (props.variant) {
    case 'kart-odakli':
      return <KartOdakliLayout {...props} />;
    case 'hero-butonlu':
      return <HeroButonluLayout {...props} />;
    case 'yogun-panel':
      return <YogunPanelLayout {...props} />;
    case 'minimal':
      return <MinimalLayout {...props} />;
    default:
      return <SadeLayout {...props} />;
  }
}

function InsightBlocks({ activeItems, likedOutfits, topWorn, neverWorn, bare }: {
  activeItems: DbItem[];
  likedOutfits: OutfitWithItems[];
  topWorn: WornOutfitStat[];
  neverWorn: DbItem[];
  /** true ise section başlıkları arka planı/dolgusu olmayan yalın metin (Minimal). */
  bare?: boolean;
}) {
  return (
    <>
      <WardrobeStats items={activeItems} />
      <RecentOutfitsStrip outfits={likedOutfits} />
      {topWorn.length > 0 && (
        <View className="mb-6">
          <Text className={`mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300 ${bare ? 'opacity-70' : ''}`}>
            En Çok Giydiklerin
          </Text>
          <TopWornOutfitRows entries={topWorn} />
        </View>
      )}
      {neverWorn.length > 0 && (
        <View className="mb-6">
          <Text className={`mb-2 font-body-semibold text-sm text-gray-700 dark:text-gray-300 ${bare ? 'opacity-70' : ''}`}>
            Hiç Giymediklerin
          </Text>
          <UnwornItemThumbs items={neverWorn} layout="strip" maxCount={10} />
        </View>
      )}
    </>
  );
}

// ---------- 1) Sade (varsayılan — mevcut tasarım) ----------
function SadeLayout({
  limitReached,
  onCreatePress,
  onDicePress,
  wishlistCount,
  onWishlistPress,
  onBavulPress,
  activeItems,
  likedOutfits,
  topWorn,
  neverWorn,
  onAnalysisPress,
}: HomeIdleContentProps) {
  return (
    <View>
      <View className="gap-3">
        <Pressable
          onPress={onCreatePress}
          disabled={limitReached}
          className={`items-center justify-center rounded-2xl py-4 ${limitReached ? 'bg-gray-200 dark:bg-gray-800' : 'bg-primary'}`}>
          <Text className={`font-heading text-base ${limitReached ? 'text-gray-400' : 'text-white'}`}>
            {limitReached ? 'Günlük hakkın doldu' : 'Kombin Oluştur'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDicePress}
          disabled={limitReached}
          className={`flex-row items-center justify-center gap-2 rounded-2xl border py-4 ${
            limitReached ? 'border-gray-200 dark:border-gray-800' : 'border-primary'
          }`}>
          <Ionicons name="shuffle-outline" size={20} color={limitReached ? '#9BA1A6' : '#3461FD'} />
          <Text className={`font-heading text-base ${limitReached ? 'text-gray-400' : 'text-primary'}`}>Zar At</Text>
        </Pressable>
      </View>

      {wishlistCount > 0 && (
        <Pressable onPress={onWishlistPress} className="mt-4 flex-row items-center gap-3 rounded-2xl bg-primary/10 p-4">
          <Ionicons name="heart-outline" size={20} color="#3461FD" />
          <Text className="flex-1 font-body text-sm text-primary">
            İstek listende {wishlistCount} ürün var — bugünkü kombine dahil etmek ister misin?
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#3461FD" />
        </Pressable>
      )}

      <Pressable onPress={onBavulPress} className="mt-4 flex-row items-center gap-3 rounded-2xl bg-accent-purple/10 p-4">
        <Ionicons name="briefcase-outline" size={20} color="#8B3FE8" />
        <Text className="flex-1 font-body text-sm text-accent-purple">
          Seyahate mi çıkıyorsun? Minimum parçayla bavulunu hazırlayalım.
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#8B3FE8" />
      </Pressable>

      <View className="mt-6">
        <InsightBlocks activeItems={activeItems} likedOutfits={likedOutfits} topWorn={topWorn} neverWorn={neverWorn} />
        <Pressable onPress={onAnalysisPress} className="flex-row items-center justify-center gap-1 py-2">
          <Text className="font-body-medium text-xs text-primary">Detaylı gardırop analizi</Text>
          <Ionicons name="chevron-forward" size={12} color="#3461FD" />
        </Pressable>
      </View>
    </View>
  );
}

// ---------- 2) Kart Odaklı ----------
function SectionCard({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="#3461FD" />
        <Text className="font-heading text-sm text-gray-900 dark:text-white">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function KartOdakliLayout({
  limitReached,
  onCreatePress,
  onDicePress,
  wishlistCount,
  onWishlistPress,
  onBavulPress,
  activeItems,
  likedOutfits,
  topWorn,
  neverWorn,
  onAnalysisPress,
}: HomeIdleContentProps) {
  return (
    <View>
      <SectionCard icon="sparkles-outline" title="Bugün ne giysem?">
        <View className="gap-3">
          <Pressable
            onPress={onCreatePress}
            disabled={limitReached}
            className={`items-center justify-center rounded-2xl py-4 ${limitReached ? 'bg-gray-200 dark:bg-gray-800' : 'bg-primary'}`}>
            <Text className={`font-heading text-base ${limitReached ? 'text-gray-400' : 'text-white'}`}>
              {limitReached ? 'Günlük hakkın doldu' : 'Kombin Oluştur'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDicePress}
            disabled={limitReached}
            className={`flex-row items-center justify-center gap-2 rounded-2xl border py-4 ${
              limitReached ? 'border-gray-200 dark:border-gray-800' : 'border-primary'
            }`}>
            <Ionicons name="shuffle-outline" size={20} color={limitReached ? '#9BA1A6' : '#3461FD'} />
            <Text className={`font-heading text-base ${limitReached ? 'text-gray-400' : 'text-primary'}`}>Zar At</Text>
          </Pressable>
        </View>
      </SectionCard>

      {wishlistCount > 0 && (
        <SectionCard icon="heart-outline" title="İstek Listesi">
          <Pressable onPress={onWishlistPress} className="flex-row items-center gap-3">
            <Text className="flex-1 font-body text-sm text-gray-700 dark:text-gray-300">
              {wishlistCount} ürün var — bugünkü kombine dahil etmek ister misin?
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#3461FD" />
          </Pressable>
        </SectionCard>
      )}

      <SectionCard icon="briefcase-outline" title="Seyahat">
        <Pressable onPress={onBavulPress} className="flex-row items-center gap-3">
          <Text className="flex-1 font-body text-sm text-gray-700 dark:text-gray-300">
            Minimum parçayla bavulunu hazırlayalım.
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#8B3FE8" />
        </Pressable>
      </SectionCard>

      <SectionCard icon="stats-chart-outline" title="Gardırobun">
        <WardrobeStats items={activeItems} />
      </SectionCard>

      {likedOutfits.length > 0 && (
        <SectionCard icon="heart-circle-outline" title="Son Kombinlerin">
          <RecentOutfitsStrip outfits={likedOutfits} />
        </SectionCard>
      )}

      {topWorn.length > 0 && (
        <SectionCard icon="repeat-outline" title="En Çok Giydiklerin">
          <TopWornOutfitRows entries={topWorn} />
        </SectionCard>
      )}

      {neverWorn.length > 0 && (
        <SectionCard icon="eye-off-outline" title="Hiç Giymediklerin">
          <UnwornItemThumbs items={neverWorn} layout="strip" maxCount={10} />
        </SectionCard>
      )}

      <Pressable onPress={onAnalysisPress} className="flex-row items-center justify-center gap-1 rounded-2xl border border-gray-100 py-3 dark:border-gray-800">
        <Text className="font-body-medium text-xs text-primary">Detaylı gardırop analizi</Text>
        <Ionicons name="chevron-forward" size={12} color="#3461FD" />
      </Pressable>
    </View>
  );
}

// ---------- 3) Hero Butonlu ----------
function HeroButonluLayout({
  limitReached,
  onCreatePress,
  onDicePress,
  wishlistCount,
  onWishlistPress,
  onBavulPress,
  activeItems,
  likedOutfits,
  topWorn,
  neverWorn,
  onAnalysisPress,
}: HomeIdleContentProps) {
  return (
    <View>
      <View className="flex-row gap-3">
        <Pressable
          onPress={onCreatePress}
          disabled={limitReached}
          className={`flex-1 items-center justify-center gap-2 rounded-3xl py-7 ${limitReached ? 'bg-gray-200 dark:bg-gray-800' : 'bg-primary'}`}>
          <Ionicons name="sparkles" size={28} color={limitReached ? '#9BA1A6' : '#FFFFFF'} />
          <Text className={`text-center font-heading-bold text-base ${limitReached ? 'text-gray-400' : 'text-white'}`}>
            {limitReached ? 'Hakkın Doldu' : 'Kombin Oluştur'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDicePress}
          disabled={limitReached}
          className={`flex-1 items-center justify-center gap-2 rounded-3xl border-2 py-7 ${
            limitReached ? 'border-gray-200 dark:border-gray-800' : 'border-primary bg-primary/5'
          }`}>
          <Ionicons name="shuffle" size={28} color={limitReached ? '#9BA1A6' : '#3461FD'} />
          <Text className={`text-center font-heading-bold text-base ${limitReached ? 'text-gray-400' : 'text-primary'}`}>
            Zar At
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 gap-2">
        {wishlistCount > 0 && (
          <Pressable onPress={onWishlistPress} className="flex-row items-center gap-2 py-1.5">
            <Ionicons name="heart-outline" size={15} color="#3461FD" />
            <Text className="flex-1 font-body text-xs text-gray-600 dark:text-gray-400">
              İstek listende {wishlistCount} ürün var, dahil etmek ister misin?
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#9BA1A6" />
          </Pressable>
        )}
        <Pressable onPress={onBavulPress} className="flex-row items-center gap-2 py-1.5">
          <Ionicons name="briefcase-outline" size={15} color="#8B3FE8" />
          <Text className="flex-1 font-body text-xs text-gray-600 dark:text-gray-400">
            Seyahat için kapsül bavul hazırla
          </Text>
          <Ionicons name="chevron-forward" size={13} color="#9BA1A6" />
        </Pressable>
      </View>

      <View className="mt-6">
        <InsightBlocks activeItems={activeItems} likedOutfits={likedOutfits} topWorn={topWorn} neverWorn={neverWorn} />
        <Pressable onPress={onAnalysisPress} className="flex-row items-center justify-center gap-1 py-2">
          <Text className="font-body-medium text-xs text-primary">Detaylı gardırop analizi</Text>
          <Ionicons name="chevron-forward" size={12} color="#3461FD" />
        </Pressable>
      </View>
    </View>
  );
}

// ---------- 4) Yoğun Panel ----------
function YogunPanelLayout({
  limitReached,
  onCreatePress,
  onDicePress,
  wishlistCount,
  onWishlistPress,
  onBavulPress,
  activeItems,
  likedOutfits,
  topWorn,
  neverWorn,
  onAnalysisPress,
}: HomeIdleContentProps) {
  return (
    <View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={onCreatePress}
          disabled={limitReached}
          className={`flex-1 items-center justify-center rounded-xl py-3 ${limitReached ? 'bg-gray-200 dark:bg-gray-800' : 'bg-primary'}`}>
          <Text className={`font-heading text-sm ${limitReached ? 'text-gray-400' : 'text-white'}`}>
            {limitReached ? 'Hakkın Doldu' : 'Kombin Oluştur'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDicePress}
          disabled={limitReached}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border py-3 ${
            limitReached ? 'border-gray-200 dark:border-gray-800' : 'border-primary'
          }`}>
          <Ionicons name="shuffle-outline" size={16} color={limitReached ? '#9BA1A6' : '#3461FD'} />
          <Text className={`font-heading text-sm ${limitReached ? 'text-gray-400' : 'text-primary'}`}>Zar At</Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {wishlistCount > 0 && (
          <Pressable onPress={onWishlistPress} className="flex-1 rounded-xl bg-primary/10 p-3" style={{ minWidth: '47%' }}>
            <Ionicons name="heart-outline" size={16} color="#3461FD" />
            <Text className="mt-1 font-body text-xs text-primary">İstek Listesi ({wishlistCount})</Text>
          </Pressable>
        )}
        <Pressable onPress={onBavulPress} className="flex-1 rounded-xl bg-accent-purple/10 p-3" style={{ minWidth: '47%' }}>
          <Ionicons name="briefcase-outline" size={16} color="#8B3FE8" />
          <Text className="mt-1 font-body text-xs text-accent-purple">Bavul Hazırla</Text>
        </Pressable>
      </View>

      <View className="mt-4">
        <WardrobeStats items={activeItems} />
        <RecentOutfitsStrip outfits={likedOutfits} />
      </View>

      {(topWorn.length > 0 || neverWorn.length > 0) && (
        <View className="mb-4 flex-row gap-3">
          {topWorn.length > 0 && (
            <View className="flex-1">
              <Text className="mb-2 font-body-semibold text-xs text-gray-700 dark:text-gray-300">En Çok Giydiklerin</Text>
              <TopWornOutfitRows entries={topWorn.slice(0, 2)} />
            </View>
          )}
          {neverWorn.length > 0 && (
            <View className="flex-1">
              <Text className="mb-2 font-body-semibold text-xs text-gray-700 dark:text-gray-300">Hiç Giymediklerin</Text>
              <UnwornItemThumbs items={neverWorn} layout="strip" maxCount={4} />
            </View>
          )}
        </View>
      )}

      <Pressable onPress={onAnalysisPress} className="flex-row items-center justify-center gap-1 py-1">
        <Text className="font-body-medium text-xs text-primary">Detaylı gardırop analizi</Text>
        <Ionicons name="chevron-forward" size={12} color="#3461FD" />
      </Pressable>
    </View>
  );
}

// ---------- 5) Minimal ----------
function MinimalLayout({
  limitReached,
  onCreatePress,
  onDicePress,
  wishlistCount,
  onWishlistPress,
  onBavulPress,
  activeItems,
  likedOutfits,
  topWorn,
  neverWorn,
  onAnalysisPress,
}: HomeIdleContentProps) {
  return (
    <View>
      <Pressable onPress={onCreatePress} disabled={limitReached} className="py-3">
        <Text className={`font-heading text-lg ${limitReached ? 'text-gray-400' : 'text-primary'}`}>
          {limitReached ? 'Günlük hakkın doldu' : 'Kombin Oluştur →'}
        </Text>
      </Pressable>
      <Pressable onPress={onDicePress} disabled={limitReached} className="border-t border-gray-100 py-3 dark:border-gray-800">
        <Text className={`font-body-medium text-base ${limitReached ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
          Zar At →
        </Text>
      </Pressable>

      {wishlistCount > 0 && (
        <Pressable onPress={onWishlistPress} className="border-t border-gray-100 py-3 dark:border-gray-800">
          <Text className="font-body text-sm text-gray-500 dark:text-gray-400">
            İstek listende {wishlistCount} ürün var →
          </Text>
        </Pressable>
      )}
      <Pressable onPress={onBavulPress} className="border-t border-gray-100 py-3 dark:border-gray-800">
        <Text className="font-body text-sm text-gray-500 dark:text-gray-400">Bavul hazırla →</Text>
      </Pressable>

      <View className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <InsightBlocks activeItems={activeItems} likedOutfits={likedOutfits} topWorn={topWorn} neverWorn={neverWorn} bare />
        <Pressable onPress={onAnalysisPress} className="py-2">
          <Text className="font-body text-xs text-gray-400 dark:text-gray-500">Detaylı gardırop analizi →</Text>
        </Pressable>
      </View>
    </View>
  );
}
