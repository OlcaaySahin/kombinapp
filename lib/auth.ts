import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';

import { queryClient } from './queryClient';
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
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });

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

/**
 * Google ile giriş yapar. Kullanıcı o anda anonimse, mevcut verisini (envanter/kombin/
 * istek listesi) `migrate-anonymous-data` Edge Function'ı üzerinden yeni hesaba taşır —
 * çünkü `signInWithIdToken()` e-posta yükseltme akışının aksine anonim kullanıcıyı
 * otomatik olarak KORUMUYOR (Supabase'in bilinen bir sınırlaması, `linkIdentity()`'nin
 * tersine yeni bir `auth.uid()` oluşturuyor).
 */
export async function signInWithGoogle() {
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  const oldUserId = currentSession?.user.is_anonymous ? currentSession.user.id : null;

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return; // kullanıcı vazgeçti
    }

    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google idToken alınamadı');

    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw error;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return;
    }
    throw error;
  }

  if (oldUserId) {
    const { error: migrateError } = await supabase.functions.invoke('migrate-anonymous-data', {
      body: { oldUserId },
    });
    if (migrateError) {
      console.error('Anonim veri taşınamadı:', migrateError);
      throw new Error(
        'Google ile giriş yapıldı ama önceki verilerin taşınmasında bir sorun oluştu. Lütfen tekrar dene veya destekle iletişime geç.'
      );
    }
    await queryClient.invalidateQueries();
  }
}
