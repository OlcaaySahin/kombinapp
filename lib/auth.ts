import { supabase } from './supabase';
import { useAuthStore } from './stores/authStore';

let listenerRegistered = false;

export async function bootstrapSession() {
  if (!listenerRegistered) {
    supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setSession(session?.user.id ?? null);
    });
    listenerRegistered = true;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    useAuthStore.getState().setSession(session.user.id);
    return;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  useAuthStore.getState().setSession(data.session?.user.id ?? null);
}
