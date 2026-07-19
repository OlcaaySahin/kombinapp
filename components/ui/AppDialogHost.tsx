import { Modal, Pressable, Text, View } from 'react-native';

import { DialogButton, useDialogStore } from '@/lib/stores/dialogStore';

/**
 * OS-varsayılan Alert.alert yerine marka diline uygun (yuvarlak köşe, Poppins/Inter,
 * primary mavi, dark mode uyumlu) ortalanmış dialog. app/_layout.tsx'te BİR KEZ mount
 * edilir; showAlert/showConfirm (lib/alert.ts) dialogStore üzerinden buraya düşer.
 * RN Modal her platformda (web dahil) çalışır — ActionSheetModal ile aynı desen.
 */
export function AppDialogHost() {
  const current = useDialogStore((state) => state.queue[0]);
  const dismissCurrent = useDialogStore((state) => state.dismissCurrent);

  if (!current) return null;

  const handlePress = (button: DialogButton) => {
    // Önce kapat, sonra callback — callback yeni bir dialog açarsa kuyruğa düzgün girsin.
    dismissCurrent();
    button.onPress?.();
  };

  const buttonClasses = (button: DialogButton) => {
    if (button.style === 'destructive') return 'bg-red-50 dark:bg-red-950/40';
    if (button.style === 'cancel') return 'bg-gray-100 dark:bg-gray-800';
    return 'bg-primary';
  };

  const buttonTextClasses = (button: DialogButton) => {
    if (button.style === 'destructive') return 'text-red-500';
    if (button.style === 'cancel') return 'text-gray-500 dark:text-gray-400';
    return 'text-white';
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissCurrent}>
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-gray-900">
          <Text className="font-heading text-lg text-gray-900 dark:text-white">{current.title}</Text>
          {current.message ? (
            <Text className="mt-2 font-body text-sm leading-5 text-gray-500 dark:text-gray-400">
              {current.message}
            </Text>
          ) : null}

          <View className={`mt-5 gap-2 ${current.buttons.length === 2 ? 'flex-row' : ''}`}>
            {current.buttons.map((button) => (
              <Pressable
                key={button.text}
                onPress={() => handlePress(button)}
                className={`items-center justify-center rounded-2xl px-4 py-3.5 ${
                  current.buttons.length === 2 ? 'flex-1' : ''
                } ${buttonClasses(button)}`}>
                <Text className={`font-body-semibold text-base ${buttonTextClasses(button)}`}>
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
