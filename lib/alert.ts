import { Alert, Platform } from 'react-native';

/** Alert.alert web'de güvenilir çalışmadığı için platforma göre dallanır. */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function showConfirm(title: string, message: string, onConfirm: () => void, confirmLabel = 'Sil') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

type ActionSheetOption = { label: string; onPress: () => void; destructive?: boolean };

/** İkiden fazla seçenekli bir eylem menüsü — web'de sırayla confirm'e düşer (native action sheet yok). */
export function showActionSheet(title: string, message: string, options: ActionSheetOption[]) {
  if (Platform.OS === 'web') {
    for (const option of options) {
      if (window.confirm(`${title}\n\n${message}\n\n"${option.label}" seçilsin mi?`)) {
        option.onPress();
        return;
      }
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    ...options.map((option) => ({
      text: option.label,
      style: option.destructive ? ('destructive' as const) : undefined,
      onPress: option.onPress,
    })),
  ]);
}
