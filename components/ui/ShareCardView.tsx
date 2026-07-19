import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

import type { OutfitContext, OutfitItemSummary } from '@/lib/hooks/useOutfits';
import type { ShareTemplateConfig } from '@/lib/shareTemplates';

const CARD_WIDTH = 300;
const CARD_HEIGHT = 533;

// Sabit (pseudo-random ama deterministik) yıldız konumları — "Mor Gece" şablonu için.
const STAR_DOTS = [
  { top: 24, left: 20, size: 3 }, { top: 60, left: 250, size: 2 }, { top: 100, left: 40, size: 2 },
  { top: 140, left: 270, size: 3 }, { top: 180, left: 15, size: 2 }, { top: 210, left: 230, size: 2 },
  { top: 40, left: 160, size: 2 }, { top: 300, left: 260, size: 3 }, { top: 340, left: 25, size: 2 },
  { top: 380, left: 190, size: 2 }, { top: 420, left: 60, size: 3 }, { top: 460, left: 240, size: 2 },
  { top: 480, left: 100, size: 2 }, { top: 90, left: 200, size: 2 },
];

function Decoration({ config }: { config: ShareTemplateConfig }) {
  if (config.decoration === 'blobs') {
    return (
      <>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -50, right: -50, width: 170, height: 170, borderRadius: 100, backgroundColor: config.decorationColors[0], opacity: 0.45 }}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: -60, left: -40, width: 190, height: 190, borderRadius: 100, backgroundColor: config.decorationColors[1], opacity: 0.35 }}
        />
      </>
    );
  }
  if (config.decoration === 'stars') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {STAR_DOTS.map((dot, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size,
              backgroundColor: index % 3 === 0 ? config.decorationColors[1] : config.decorationColors[0],
              opacity: 0.8,
            }}
          />
        ))}
      </View>
    );
  }
  if (config.decoration === 'corners') {
    const size = 26;
    const thickness = 2;
    const color = config.decorationColors[0];
    const corner = (style: object) => (
      <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: thickness, backgroundColor: color }} />
        <View style={{ position: 'absolute', top: 0, left: 0, width: thickness, height: size, backgroundColor: color }} />
      </View>
    );
    return (
      <>
        {corner({ top: 14, left: 14 })}
        {corner({ top: 14, right: 14, transform: [{ rotate: '90deg' }] })}
        {corner({ bottom: 14, left: 14, transform: [{ rotate: '-90deg' }] })}
        {corner({ bottom: 14, right: 14, transform: [{ rotate: '180deg' }] })}
      </>
    );
  }
  if (config.decoration === 'sprockets') {
    const holes = Array.from({ length: 10 });
    return (
      <>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 6, width: 8, justifyContent: 'space-evenly' }}>
          {holes.map((_, i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: config.decorationColors[0], opacity: 0.5 }} />
          ))}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, right: 6, width: 8, justifyContent: 'space-evenly' }}>
          {holes.map((_, i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: config.decorationColors[0], opacity: 0.5 }} />
          ))}
        </View>
      </>
    );
  }
  if (config.decoration === 'hollow-shapes') {
    // "Pazartesi Sabahı" / "Güneşli Brunch": hollow (sadece kenarlıklı) daire + kare.
    return (
      <>
        <View pointerEvents="none" style={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: config.decorationColors[0], opacity: 0.15, transform: [{ rotate: '12deg' }] }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 40, left: -35, width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: config.decorationColors[0], opacity: 0.12, transform: [{ rotate: '-8deg' }] }} />
      </>
    );
  }
  if (config.decoration === 'thin-lines') {
    // "Şehirli Safari": rastgele ama sabit yerleşimli ince çizgi parçacıkları.
    const lines = [
      { top: 40, left: 30, w: 44, rot: '8deg', c: 0 }, { top: 70, left: 250, w: 30, rot: '-15deg', c: 1 },
      { top: 130, left: 20, w: 36, rot: '20deg', c: 0 }, { top: 300, left: 240, w: 40, rot: '10deg', c: 0 },
      { top: 380, left: 30, w: 32, rot: '-10deg', c: 1 }, { top: 460, left: 220, w: 38, rot: '15deg', c: 0 },
    ];
    return (
      <>
        {lines.map((line, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute', top: line.top, left: line.left, width: line.w, height: 1.5,
              backgroundColor: config.decorationColors[line.c], opacity: 0.35,
              transform: [{ rotate: line.rot }],
            }}
          />
        ))}
      </>
    );
  }
  if (config.decoration === 'diamond-mix') {
    // "Dijital Sanatçı": farklı boyutlarda döndürülmüş (45°) kenarlıklı kareler (baklava dilimi hissi).
    const diamonds = [
      { top: -20, right: -20, size: 90, c: 0 }, { bottom: 60, left: -30, size: 70, c: 1 },
      { top: 220, right: -25, size: 55, c: 0 },
    ];
    return (
      <>
        {diamonds.map((d, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute', top: d.top, bottom: d.bottom, left: d.left, right: d.right,
              width: d.size, height: d.size, borderWidth: 2, borderColor: config.decorationColors[d.c],
              opacity: 0.18, transform: [{ rotate: '45deg' }],
            }}
          />
        ))}
      </>
    );
  }
  if (config.decoration === 'retro-mix') {
    // "Retro Geometri": marka renklerinde üçgen + yarım daire + nokta karışımı.
    return (
      <>
        <View pointerEvents="none" style={{ position: 'absolute', top: 24, right: 30, width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 20, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: config.decorationColors[0], opacity: 0.7 }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 90, left: -10, width: 60, height: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: config.decorationColors[1], opacity: 0.25 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 120, left: 24, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4757', opacity: 0.5 }} />
      </>
    );
  }
  if (config.decoration === 'torn-paper') {
    // "Dergi Kolajı": düzensiz köşeli (kısmen kağıt yırtığı hissi veren) blok + bant şeridi.
    return (
      <>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 60, right: -40, width: 180, height: 140,
            borderTopLeftRadius: 60, borderTopRightRadius: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 80,
            backgroundColor: config.decorationColors[0], opacity: 0.12, transform: [{ rotate: '-6deg' }],
          }}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 250, left: 40, width: 90, height: 14, backgroundColor: config.decorationColors[1], opacity: 0.2, transform: [{ rotate: '-3deg' }] }}
        />
      </>
    );
  }
  if (config.decoration === 'blueprint-grid') {
    // "Uzay Yolculuğu" / "Terzi Defteri": teknik çizim ızgarası + köşe L işaretleri.
    const hLines = [110, 220, 330, 440];
    const vLines = [80, 160, 240];
    const size = 20;
    const thickness = 1.5;
    const cornerColor = config.decorationColors[1];
    const corner = (style: object) => (
      <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, opacity: 0.5 }, style]}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: thickness, backgroundColor: cornerColor }} />
        <View style={{ position: 'absolute', top: 0, left: 0, width: thickness, height: size, backgroundColor: cornerColor }} />
      </View>
    );
    return (
      <>
        {hLines.map((top, i) => (
          <View key={`h${i}`} pointerEvents="none" style={{ position: 'absolute', top, left: 0, right: 0, height: 1, backgroundColor: config.decorationColors[0], opacity: 0.25 }} />
        ))}
        {vLines.map((left, i) => (
          <View key={`v${i}`} pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left, width: 1, backgroundColor: config.decorationColors[0], opacity: 0.25 }} />
        ))}
        {corner({ top: 90, left: 18 })}
        {corner({ top: 90, right: 18, transform: [{ rotate: '90deg' }] }) }
        {corner({ bottom: 100, left: 18, transform: [{ rotate: '-90deg' }] })}
        {corner({ bottom: 100, right: 18, transform: [{ rotate: '180deg' }] })}
      </>
    );
  }
  if (config.decoration === 'spotlight') {
    // "Vitrin": vitrin camına vuran yumuşak sıcak ışık (katmanlı, azalan opaklıkla glow hissi).
    return (
      <>
        <View pointerEvents="none" style={{ position: 'absolute', top: 40, alignSelf: 'center', width: 260, height: 260, borderRadius: 130, backgroundColor: config.decorationColors[0], opacity: 0.1 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 80, alignSelf: 'center', width: 180, height: 180, borderRadius: 90, backgroundColor: config.decorationColors[0], opacity: 0.1 }} />
      </>
    );
  }
  if (config.decoration === 'glow-ring') {
    // "Gece Kulübü Neon": Instagram story ringiyle aynı mekanik, iki neon renk.
    return (
      <>
        <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 2.5, borderColor: config.decorationColors[0], borderRadius: 22, opacity: 0.8 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 11, left: 11, right: 11, bottom: 11, borderWidth: 1.5, borderColor: config.decorationColors[1], borderRadius: 18, opacity: 0.6 }} />
      </>
    );
  }
  if (config.decoration === 'dashed-frame') {
    // "Kumaş Numunesi": dikiş hissi veren kesik çizgili çerçeve.
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 12, left: 12, right: 12, bottom: 12,
          borderWidth: 1.5, borderStyle: 'dashed', borderColor: config.decorationColors[0], borderRadius: 20, opacity: 0.45,
        }}
      />
    );
  }
  if (config.decoration === 'unboxing') {
    // "Kutu Açılışı": makasla kesme çizgisi + köşede küçük "etiket" (ürün kartı hissi).
    return (
      <>
        <View pointerEvents="none" style={{ position: 'absolute', top: 96, left: 20, right: 20, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: config.decorationColors[0], opacity: 0.3 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 20, borderRadius: 4, backgroundColor: config.decorationColors[0], opacity: 0.85 }}>
          <View style={{ position: 'absolute', top: '50%', left: -3, width: 6, height: 6, borderRadius: 3, marginTop: -3, backgroundColor: '#FFFFFF' }} />
        </View>
      </>
    );
  }
  return null;
}

function ItemTile({
  item,
  config,
  width,
  quirky,
}: {
  item: OutfitItemSummary;
  config: ShareTemplateConfig;
  width: `${number}%`;
  /** İlk ürün karesine abartılı sol-üst köşe yuvarlaklığı (Retro Geometri). */
  quirky?: boolean;
}) {
  return (
    <View style={{ width }}>
      <View
        className="aspect-square overflow-hidden rounded-2xl"
        style={{
          backgroundColor: config.itemBg,
          borderColor: config.itemBorderColor,
          borderWidth: config.itemBorderWidth ?? 1,
          ...(quirky ? { borderTopLeftRadius: 30 } : null),
        }}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="shirt-outline" size={28} color={config.mutedTextColor} />
          </View>
        )}
      </View>
      <View className="mt-1 self-center rounded-full px-2 py-0.5" style={{ backgroundColor: config.chipBg }}>
        <Text numberOfLines={1} className="text-center font-body text-[9px]" style={{ color: config.mutedTextColor }}>
          {item.name ?? ''}
        </Text>
      </View>
    </View>
  );
}

function Chips({ chips, config }: { chips: string[]; config: ShareTemplateConfig }) {
  if (config.layout === 'instagram') {
    // Instagram şablonunda chip'ler hashtag gibi gösterilir (gerçek IG hashtag mavisi tonunda).
    return (
      <Text className="font-body-medium text-[11px]" style={{ color: config.chipTextColor }}>
        {chips.map((chip) => `#${chip.replace(/\s+/g, '')}`).join('  ')}
      </Text>
    );
  }
  const style = config.chipStyle ?? 'pill';
  if (style === 'outline' || style === 'dotted') {
    return (
      <View className="flex-row flex-wrap gap-1.5">
        {chips.map((chip) => (
          <View
            key={chip}
            className="rounded-full px-2.5 py-1"
            style={{ borderWidth: 1, borderStyle: style === 'dotted' ? 'dotted' : 'solid', borderColor: config.chipTextColor }}>
            <Text className="font-body-medium text-[10px]" style={{ color: config.chipTextColor }}>
              {chip}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {chips.map((chip) => (
        <View key={chip} className="rounded-full px-2.5 py-1" style={{ backgroundColor: config.chipBg }}>
          <Text className="font-body-medium text-[10px]" style={{ color: config.chipTextColor }}>
            {chip}
          </Text>
        </View>
      ))}
    </View>
  );
}

export type ShareCardOutfit = {
  items: OutfitItemSummary[];
  context: OutfitContext;
  reasoning?: string | null;
  userNote?: string | null;
};

export type ShareCardProfile = {
  displayName: string | null;
  avatarUrl: string | null;
};

/** Item id'lerinden sabit (deterministik) bir "beğeni sayısı" — Instagram şablonu için,
 * her render'da aynı kombin için aynı sayı gösterilsin diye basit bir hash kullanılıyor. */
function pseudoLikeCount(itemIds: string[]): number {
  const joined = itemIds.join('|');
  let hash = 0;
  for (let i = 0; i < joined.length; i++) hash = (hash * 31 + joined.charCodeAt(i)) >>> 0;
  return 40 + (hash % 260);
}

export const ShareCardView = forwardRef<
  View,
  { outfit: ShareCardOutfit; config: ShareTemplateConfig; profile?: ShareCardProfile }
>(function ShareCardView({ outfit, config, profile }, ref) {
    const contextChips = Object.values(outfit.context).filter((value): value is string => Boolean(value));
    const caption = outfit.reasoning ?? outfit.userNote ?? null;
    const displayName = profile?.displayName?.trim() || null;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: config.background }}
        className="overflow-hidden rounded-3xl">
        <Decoration config={config} />
        {config.frame && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: config.frame.inset,
              left: config.frame.inset,
              right: config.frame.inset,
              bottom: config.frame.inset,
              borderWidth: config.frame.width,
              borderColor: config.frame.color,
              borderRadius: 16,
              opacity: 0.6,
            }}
          />
        )}

        {config.layout === 'instagram' && (
          // "Story atılmış gibi" mor-mercan ring — kullanıcı isteği (2026-07-19). Gradient lib
          // yok, iki katmanlı renkli çerçeveyle IG story ringi hissi taklit ediliyor.
          <>
            <View pointerEvents="none" style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderWidth: 3, borderColor: '#8B3FE8', borderRadius: 22, opacity: 0.9 }} />
            <View pointerEvents="none" style={{ position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderWidth: 2, borderColor: '#FF4757', borderRadius: 19, opacity: 0.7 }} />
          </>
        )}

        {config.layout === 'instagram' ? (
          <View className="flex-1 p-4" style={{ marginTop: 6 }}>
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary">
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                )}
              </View>
              <Text className="font-heading text-xs" style={{ color: config.textColor }}>
                {displayName ?? 'kombin.app'}
              </Text>
              <Text className="font-body text-[10px]" style={{ color: config.mutedTextColor }}>
                · Bugün
              </Text>
            </View>

            <View className="mt-3 flex-1 flex-row flex-wrap content-start gap-1">
              {outfit.items.slice(0, 9).map((item) => (
                <View key={item.id} style={{ width: '32%' }} className="aspect-square overflow-hidden" >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="h-full w-full items-center justify-center" style={{ backgroundColor: config.itemBg }}>
                      <Ionicons name="shirt-outline" size={20} color={config.mutedTextColor} />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View className="mt-3 flex-row items-center gap-3">
              <Ionicons name="heart" size={20} color="#FF4757" />
              <Ionicons name="chatbubble-outline" size={19} color={config.textColor} />
              <Ionicons name="paper-plane-outline" size={19} color={config.textColor} />
            </View>
            <Text className="mt-1 font-heading text-xs" style={{ color: config.textColor }}>
              {pseudoLikeCount(outfit.items.map((item) => item.id))} beğenme
            </Text>
            {caption && (
              <Text numberOfLines={2} className="mt-1.5 font-body text-[11px]" style={{ color: config.textColor }}>
                <Text className="font-heading text-[11px]">{displayName ?? 'kombin.app'} </Text>
                {caption}
              </Text>
            )}
            <View className="mt-1.5">
              <Chips chips={contextChips} config={config} />
            </View>
          </View>
        ) : config.layout === 'hero' ? (
          <View className="flex-1 p-5">
            <Text className="font-heading-bold text-3xl" style={{ color: config.textColor }}>
              KOMBİN
            </Text>
            <View className="mt-1">
              <Chips chips={contextChips} config={config} />
            </View>
            <View
              className="mt-4 flex-1 overflow-hidden rounded-2xl border"
              style={{ backgroundColor: config.itemBg, borderColor: config.itemBorderColor }}>
              {outfit.items[0]?.image_url ? (
                <Image source={{ uri: outfit.items[0].image_url }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons name="shirt-outline" size={40} color={config.mutedTextColor} />
                </View>
              )}
            </View>
            <View className="mt-3 flex-row gap-2">
              {outfit.items.slice(1, 5).map((item) => (
                <View key={item.id} className="h-14 w-14 overflow-hidden rounded-xl border" style={{ backgroundColor: config.itemBg, borderColor: config.itemBorderColor }}>
                  {item.image_url && <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />}
                </View>
              ))}
            </View>
            <Text className="mt-3 font-body text-[10px]" style={{ color: config.mutedTextColor }}>
              Kombin App
            </Text>
          </View>
        ) : config.layout === 'polaroid' ? (
          <View className="flex-1 p-4">
            <View
              className="aspect-square w-full flex-row flex-wrap overflow-hidden rounded-lg border"
              style={{ borderColor: config.itemBorderColor }}>
              {outfit.items.slice(0, 4).map((item) => (
                <View key={item.id} style={{ width: '50%', height: '50%' }} className="overflow-hidden">
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="h-full w-full items-center justify-center" style={{ backgroundColor: config.itemBg }}>
                      <Ionicons name="shirt-outline" size={22} color={config.mutedTextColor} />
                    </View>
                  )}
                </View>
              ))}
            </View>
            <View className="flex-1 items-center justify-center px-2">
              <Text className="text-center font-body-medium text-sm" style={{ color: config.textColor }}>
                {contextChips.join(' · ')}
              </Text>
              {caption && (
                <Text numberOfLines={2} className="mt-1.5 text-center font-body text-xs" style={{ color: config.mutedTextColor }}>
                  {caption}
                </Text>
              )}
              <Text className="mt-3 font-body text-[10px]" style={{ color: config.mutedTextColor }}>
                Kombin App
              </Text>
            </View>
          </View>
        ) : config.layout === 'strip' ? (
          <View className="flex-1 px-6 py-5">
            <Text className="font-heading text-sm" style={{ color: config.textColor }}>
              Kombin App
            </Text>
            <View className="mt-1 mb-3">
              <Chips chips={contextChips} config={config} />
            </View>
            <View className="flex-1 justify-center gap-2.5">
              {outfit.items.slice(0, 4).map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center gap-3 rounded-xl border p-2"
                  style={{ backgroundColor: config.itemBg, borderColor: config.itemBorderColor }}>
                  <View className="h-14 w-14 overflow-hidden rounded-lg">
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center" style={{ backgroundColor: config.itemBg }}>
                        <Ionicons name="shirt-outline" size={18} color={config.mutedTextColor} />
                      </View>
                    )}
                  </View>
                  <Text numberOfLines={1} className="flex-1 font-body-medium text-xs" style={{ color: config.textColor }}>
                    {item.name ?? 'İsimsiz parça'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          // 'grid' — varsayılan yerleşim, en çok şablon bunu kullanıyor (lacivert-blob, mor-gece dahil)
          <View className="flex-1 p-5">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="sparkles" size={16} color={config.decorationColors[0]} />
              <Text className="font-heading-bold text-base" style={{ color: config.textColor }}>
                Kombin App
              </Text>
            </View>
            <Text className="mt-0.5 font-body text-[11px]" style={{ color: config.mutedTextColor }}>
              Bugünün kombini
            </Text>

            <View className="mt-4">
              <Chips chips={contextChips} config={config} />
            </View>

            <View className="mt-3 flex-1 justify-center">
              {(() => {
                const shown = outfit.items.slice(0, 6);
                const columns = shown.length <= 1 ? 1 : 2;
                const rows: OutfitItemSummary[][] = [];
                for (let i = 0; i < shown.length; i += columns) rows.push(shown.slice(i, i + columns));
                const width = columns === 1 ? '62%' : rows.length >= 3 ? '36%' : '45%';
                const rowMargin = rows.length >= 3 ? 'mb-2' : 'mb-3';
                let renderedIndex = 0;
                return rows.map((row, rowIndex) => (
                  <View key={rowIndex} className={`${rowMargin} flex-row justify-center gap-3`}>
                    {row.map((item) => {
                      const isFirst = renderedIndex === 0;
                      renderedIndex += 1;
                      return (
                        <ItemTile
                          key={item.id}
                          item={item}
                          config={config}
                          width={width}
                          quirky={config.quirkyFirstCorner && isFirst}
                        />
                      );
                    })}
                  </View>
                ));
              })()}
              {outfit.items.length > 6 && (
                <Text className="text-center font-body text-[10px]" style={{ color: config.mutedTextColor }}>
                  + {outfit.items.length - 6} parça daha
                </Text>
              )}
            </View>

            {config.showPaletteDots && (
              <View className="mb-2 flex-row items-center justify-center gap-1.5">
                {outfit.items.slice(0, 6).map((item) => (
                  <View
                    key={item.id}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: item.color ?? '#8E8E93',
                      borderWidth: 1,
                      borderColor: config.itemBorderColor,
                    }}
                  />
                ))}
              </View>
            )}

            <View className="items-center pb-1">
              <Text className="font-body text-[10px]" style={{ color: config.mutedTextColor }}>
                Dolabından akıllı kombinler · Kombin App
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
);
