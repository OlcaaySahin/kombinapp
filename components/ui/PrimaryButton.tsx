import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, variant = 'primary', icon, disabled }: Props) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-2xl px-6 py-4 ${
        disabled ? 'bg-gray-200 dark:bg-gray-800' : isPrimary ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'
      }`}>
      {icon}
      <Text
        className={`font-heading text-base ${
          disabled
            ? 'text-gray-400 dark:text-gray-500'
            : isPrimary
              ? 'text-white'
              : 'text-gray-900 dark:text-gray-100'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}
