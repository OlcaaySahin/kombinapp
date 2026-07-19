import { useDialogStore } from '@/lib/stores/dialogStore';

// Kullanıcı isteği (2026-07-19): "bütün messagebox'lar mutlaka temamıza uygun olmalı" —
// OS-varsayılan Alert.alert/window.alert yerine artık her platformda temalı dialog
// (components/ui/AppDialogHost) gösteriliyor. İmzalar bilinçli olarak aynı bırakıldı,
// çağıran ~50 nokta hiç değişmedi.

export function showAlert(title: string, message?: string) {
  useDialogStore.getState().show({
    title,
    message,
    buttons: [{ text: 'Tamam' }],
  });
}

export function showConfirm(title: string, message: string, onConfirm: () => void, confirmLabel = 'Sil') {
  useDialogStore.getState().show({
    title,
    message,
    buttons: [
      { text: 'Vazgeç', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ],
  });
}

// Çok seçenekli eylem menüsü için `components/ui/ActionSheetModal` kullanılıyor (marka
// diline uygun bottom sheet) — buradaki OS-varsayılan Alert tabanlı sürüm kaldırıldı.
