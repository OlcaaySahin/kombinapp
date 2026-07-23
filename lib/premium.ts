import { useProfile, type DbProfile } from '@/lib/hooks/useProfile';
import { useAuthStore } from '@/lib/stores/authStore';

/**
 * Bir profilin Premium ayrıcalıklarından yararlanıp yararlanamayacağını belirler.
 * `subscription_expires_at` null ise (ör. ileride elle/promosyon olarak verilen bir üyelik)
 * süresiz kabul edilir — sadece DOLU bir tarih varsa ve geçmişse pasif sayılır.
 */
export function isPremiumActive(
  profile: Pick<DbProfile, 'subscription_tier' | 'subscription_expires_at'> | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.subscription_tier !== 'premium') return false;
  if (!profile.subscription_expires_at) return true;
  return new Date(profile.subscription_expires_at).getTime() > Date.now();
}

/** Giriş yapmış kullanıcının kendi Premium durumu — ekranlarda kilit/rozet kararları için. */
export function useIsPremium(): boolean {
  const userId = useAuthStore((state) => state.userId);
  const { data: profile } = useProfile(userId);
  return isPremiumActive(profile);
}
