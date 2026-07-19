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
  return null;
}

function ItemTile({
  item,
  config,
  width,
}: {
  item: OutfitItemSummary;
  config: ShareTemplateConfig;
  width: `${number}%`;
}) {
  return (
    <View style={{ width }}>
      <View
        className="aspect-square overflow-hidden rounded-2xl border"
        style={{ backgroundColor: config.itemBg, borderColor: config.itemBorderColor }}>
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
  if (config.chipBg === 'transparent') {
    return (
      <Text className="font-body-medium text-[10px]" style={{ color: config.mutedTextColor }}>
        {chips.join('  ·  ')}
      </Text>
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

export const ShareCardView = forwardRef<View, { outfit: ShareCardOutfit; config: ShareTemplateConfig }>(
  function ShareCardView({ outfit, config }, ref) {
    const contextChips = Object.values(outfit.context).filter((value): value is string => Boolean(value));
    const caption = outfit.reasoning ?? outfit.userNote ?? null;

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

        {config.layout === 'instagram' ? (
          <View className="flex-1 p-4">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
                <Ionicons name="sparkles" size={13} color="#FFFFFF" />
              </View>
              <Text className="font-heading text-xs" style={{ color: config.textColor }}>
                kombin.app
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
              <Ionicons name="heart-outline" size={20} color={config.textColor} />
              <Ionicons name="chatbubble-outline" size={19} color={config.textColor} />
              <Ionicons name="paper-plane-outline" size={19} color={config.textColor} />
            </View>
            {caption && (
              <Text numberOfLines={2} className="mt-1.5 font-body text-[11px]" style={{ color: config.textColor }}>
                <Text className="font-heading text-[11px]">kombin.app </Text>
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
          // 'grid' — varsayılan yerleşim (lacivert-blob, minimal, siyah-lüks, gün batımı, mor gece, pastel krem)
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
                return rows.map((row, rowIndex) => (
                  <View key={rowIndex} className={`${rowMargin} flex-row justify-center gap-3`}>
                    {row.map((item) => (
                      <ItemTile key={item.id} item={item} config={config} width={width} />
                    ))}
                  </View>
                ));
              })()}
              {outfit.items.length > 6 && (
                <Text className="text-center font-body text-[10px]" style={{ color: config.mutedTextColor }}>
                  + {outfit.items.length - 6} parça daha
                </Text>
              )}
            </View>

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
