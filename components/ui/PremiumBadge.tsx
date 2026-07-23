import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

const GOLD = '#B8860B';

type Props = {
  /** 'pill': ikon + "Premium" yazılı (Profil ekranı). 'icon': sadece daire ikon (kart rozetleri). */
  variant?: 'pill' | 'icon';
};

export function PremiumBadge({ variant = 'pill' }: Props) {
  if (variant === 'icon') {
    return (
      <View
        className="h-9 w-9 items-center justify-center rounded-full bg-amber-400/15"
        accessibilityLabel="Premium">
        <Ionicons name="star" size={16} color={GOLD} />
      </View>
    );
  }
  return (
    <View
      className="flex-row items-center gap-1 self-start rounded-full bg-amber-400/15 px-2.5 py-1"
      accessibilityLabel="Premium">
      <Ionicons name="star" size={12} color={GOLD} />
      <Text className="font-body-semibold text-[11px]" style={{ color: GOLD }}>
        Premium
      </Text>
    </View>
  );
}
