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
 * Oturumu kapatır ve yerine hemen yeni bir anonim oturum açar — uygulama her zaman
 * bir `auth.uid()` bekliyor, boş bir oturum durumuna düşmemesi için. Test amaçlı hesap
 * değiştirmek isteyen kullanıcı için önbellek temizlemeye gerek bırakmıyor: çıkış yapıp
 * `sign-in` ekranından istediği hesaba tekrar girebilir.
 */
export async function signOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google ile giriş yapılmamış olabilir, önemli değil.
  }

  await supabase.auth.signOut();
  queryClient.clear();

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  syncSession(data.session);
}

export type EmailAuthMode = 'upgrade' | 'sign_in';

/**
 * Anonim kullanıcıyı e-posta ile kalıcı bir hesaba "yükseltir" — auth.uid() değişmediği için
 * mevcut envanter/kombin/fotoğraf verisi kaybolmaz. E-postaya 6 haneli bir doğrulama kodu gönderir.
 *
 * E-posta zaten başka bir hesaba kayıtlıysa (`email_exists` — ör. kullanıcı önbelleği temizleyip
 * yeniden yüklediğinde), bunun yerine o hesaba GİRİŞ için bir kod gönderir. Bu durumda
 * `verifyAccountUpgradeCode` auth.uid()'yi değiştirir, bu yüzden mevcut (yeni/boş) anonim oturumun
 * verisi varsa `migrate-anonymous-data` ile taşınır — signInWithGoogle()'daki mantığın aynısı.
 */
export async function sendAccountUpgradeCode(email: string): Promise<EmailAuthMode> {
  const { error } = await supabase.auth.updateUser({ email });
  if (!error) return 'upgrade';

  if (error.code === 'email_exists') {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpError) throw otpError;
    return 'sign_in';
  }

  throw error;
}

export async function verifyAccountUpgradeCode(email: string, token: string, mode: EmailAuthMode) {
  if (mode === 'upgrade') {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email_change' });
    if (error) throw error;
    return;
  }

  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  const oldUserId = currentSession?.user.is_anonymous ? currentSession.user.id : null;

  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;

  if (oldUserId) {
    const { error: migrateError } = await supabase.functions.invoke('migrate-anonymous-data', {
      body: { oldUserId },
    });
    if (migrateError) {
      console.error('Anonim veri taşınamadı:', migrateError);
      throw new Error(
        'Hesabına giriş yapıldı ama bu cihazdaki verilerin taşınmasında bir sorun oluştu. Lütfen tekrar dene veya destekle iletişime geç.'
      );
    }
    await queryClient.invalidateQueries();
  }
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
