import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

export type ActionSheetOption = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  destructive?: boolean;
};

/**
 * OS'un varsayılan Alert'i yerine marka diline uygun (yuvarlak köşe, Poppins/Inter,
 * primary mavi) alttan açılan eylem menüsü. RN Modal her platformda (web dahil) çalışıyor.
 */
export function ActionSheetModal({
  visible,
  title,
  message,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        {/* İç karta basınca kapanmasın diye boş onPress */}
        <Pressable onPress={() => {}} className="rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-gray-900">
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-gray-300 dark:bg-gray-700" />
          <Text className="font-heading text-lg text-gray-900 dark:text-white">{title}</Text>
          {message ? (
            <Text className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{message}</Text>
          ) : null}

          <View className="mt-4 gap-2">
            {options.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
                className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 ${
                  option.destructive ? 'bg-red-50 dark:bg-red-950/40' : 'bg-primary/10'
                }`}>
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={option.destructive ? '#E5484D' : '#3461FD'}
                />
                <Text
                  className={`font-body-semibold text-base ${
                    option.destructive ? 'text-red-500' : 'text-primary'
                  }`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}

            <Pressable onPress={onClose} className="items-center rounded-2xl px-4 py-4">
              <Text className="font-body-semibold text-base text-gray-500 dark:text-gray-400">Vazgeç</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
