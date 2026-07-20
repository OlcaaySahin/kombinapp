import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Kullanıcı içi geri bildirim/hata bildirme kanalı — kullanıcı isteği (2026-07-20). */
export function useSendFeedback() {
  return useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const { error } = await supabase.from('user_feedback').insert({ user_id: userId, message });
      if (error) throw error;
    },
  });
}
