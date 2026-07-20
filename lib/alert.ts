import { useDialogStore } from '@/lib/stores/dialogStore';

// Kullanıcı isteği (2026-07-19): "bütün messagebox'lar mutlaka temamıza uygun olmalı" —
// OS-varsayılan Alert.alert/window.alert yerine artık her platformda temalı dialog
// (components/ui/AppDialogHost) gösteriliyor. İmzalar bilinçli olarak aynı bırakıldı,
// çağıran ~50 nokta hiç değişmedi.

/**
 * Ham "TypeError: Failed to fetch" / "Network request failed" gibi teknik hata metinlerini
 * (çağıran ~50 nokta hep `error.message`'ı doğrudan geçiyor) tek bir yerden kullanıcı dostu
 * bir Türkçe mesaja çeviriyor — her çağrı noktasını tek tek düzeltmek yerine.
 */
function friendlyMessage(message: string | undefined): string | undefined {
  if (!message) return message;
  const lower = message.toLowerCase();
  if (lower.includes('network request failed') || lower.includes('failed to fetch') || lower.includes('network error')) {
    return 'İnternet bağlantını kontrol edip tekrar dener misin?';
  }
  return message;
}

export function showAlert(title: string, message?: string) {
  useDialogStore.getState().show({
    title,
    message: friendlyMessage(message),
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
