import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type Props = {
  value: number | null;
  onChange?: (rating: number) => void;
  size?: number;
};

export function StarRating({ value, onChange, size = 24 }: Props) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = Boolean(value && star <= value);
        return (
          <Pressable key={star} onPress={() => onChange?.(star)} disabled={!onChange} hitSlop={6}>
            <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? '#E8B923' : '#9BA1A6'} />
          </Pressable>
        );
      })}
    </View>
  );
}
