import { create } from 'zustand';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type DialogRequest = {
  title: string;
  message?: string;
  buttons: DialogButton[];
};

type DialogState = {
  /** Sıradaki dialoglar — ilk eleman ekranda, kapatılınca sıradaki gösterilir. */
  queue: DialogRequest[];
  show: (request: DialogRequest) => void;
  dismissCurrent: () => void;
};

/**
 * lib/alert.ts'teki showAlert/showConfirm buraya yazar, AppDialogHost buradan okur.
 * OS Alert'inin aksine kuyruk tutuyoruz: bir dialog açıkken gelen ikinci istek
 * kaybolmaz, ilki kapanınca gösterilir.
 */
export const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  show: (request) => set((state) => ({ queue: [...state.queue, request] })),
  dismissCurrent: () => set((state) => ({ queue: state.queue.slice(1) })),
}));
