import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import type { IoniconName } from '@/constants/categories';

type Props = {
  icon: IoniconName;
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function CategoryChip({ icon, label, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="mr-4 items-center" style={{ width: 64 }}>
      <View
        className={`h-14 w-14 items-center justify-center rounded-full border-2 ${
          selected
            ? 'border-primary bg-primary/10'
            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
        }`}>
        <Ionicons name={icon} size={24} color={selected ? '#3461FD' : '#687076'} />
      </View>
      <Text
        numberOfLines={1}
        className={`mt-1.5 text-center font-body text-xs ${
          selected ? 'font-body-semibold text-primary' : 'text-gray-500 dark:text-gray-400'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}
