import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { useAuthStore } from './stores/authStore';

let listenerRegistered = false;

function syncSession(session: Session | null) {
  useAuthStore.getState().setSession({
    userId: session?.user.id ?? null,
    isAnonymous: session?.user.is_anonymous ?? true,
    email: session?.user.email ?? null,
  });
}

export async function bootstrapSession() {
  if (!listenerRegistered) {
    supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });
    listenerRegistered = true;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    syncSession(session);
    return;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  syncSession(data.session);
}

/**
 * Anonim kullanıcıyı e-posta ile kalıcı bir hesaba "yükseltir" — auth.uid() değişmediği için
 * mevcut envanter/kombin/fotoğraf verisi kaybolmaz. E-postaya 6 haneli bir doğrulama kodu gönderir.
 */
export async function sendAccountUpgradeCode(email: string) {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export async function verifyAccountUpgradeCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email_change' });
  if (error) throw error;
}
