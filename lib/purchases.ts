import { Platform } from 'react-native';

import { captureException } from '@/lib/sentry';
import { useAuthStore } from '@/lib/stores/authStore';

export type PremiumPlan = 'monthly' | 'yearly';
export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable';
export type RestoreResult = 'restored' | 'nothing' | 'unavailable';

/**
 * RevenueCat panelindeki entitlement'ın identifier'ı — büyük/küçük harf DAHİL birebir aynı
 * olmalı (panelde "Premium" olarak oluşturuldu).
 */
export const PREMIUM_ENTITLEMENT = 'Premium';

// react-native-purchases NATIVE bir modül — eski build'lerde ve web'de yok. Expo Router tüm
// route dosyalarını açılışta import ettiği için statik import app'i AÇILIŞTA çökertirdi.
// Sentry/expo-notifications ile aynı desen: lazy require + try/catch, modül yoksa her
// fonksiyon sessizce 'unavailable' döner.
type PurchasesModule = typeof import('react-native-purchases');
type PurchasesApi = PurchasesModule['default'];

let cachedModule: PurchasesModule | null | undefined;

function loadModule(): PurchasesModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = require('react-native-purchases') as PurchasesModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

function loadApi(): PurchasesApi | null {
  const mod = loadModule();
  if (!mod) return null;
  return (mod.default ?? (mod as unknown as PurchasesApi)) as PurchasesApi;
}

function getApiKey(): string | null {
  if (Platform.OS !== 'android') return null;
  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || null;
}

let configured = false;
let lastTarget: string | null = null;
// Oturum değişimleri (açılış, giriş, çıkış) birbirini beklemeden tetiklenebilir; RevenueCat
// çağrılarının sırayla çalışması için tek bir promise zincirine bağlıyoruz.
let queue: Promise<void> = Promise.resolve();

/**
 * Supabase oturumuyla RevenueCat kullanıcısını eşler (app_user_id = Supabase `auth.uid()` —
 * webhook'un doğru profili bulması bu eşleşmeye dayanır). `lib/auth.ts`'teki `syncSession`
 * her oturum değişiminde çağırır. Anonim kullanıcı satın alamayacağı için RevenueCat'e HİÇ
 * tanıtılmaz; ilk gerçek hesapta yapılandırılır.
 */
export function syncPurchasesUser(userId: string | null, isAnonymous: boolean): Promise<void> {
  const target = isAnonymous ? null : userId;
  queue = queue.then(async () => {
    // Anahtar yoksa (web, iOS, key henüz tanımlı değil) native modülü hiç yüklemeye çalışma.
    const apiKey = getApiKey();
    if (!apiKey) return;
    const api = loadApi();
    if (!api) return;
    if (target === lastTarget) return;
    try {
      if (!configured) {
        if (!target) return;
        api.configure({ apiKey, appUserID: target });
        configured = true;
      } else if (target) {
        await api.logIn(target);
      } else if (!(await api.isAnonymous())) {
        await api.logOut();
      }
      lastTarget = target;
    } catch (error) {
      captureException(error);
    }
  });
  return queue;
}

async function ensureReady(): Promise<PurchasesApi | null> {
  const { userId, isAnonymous } = useAuthStore.getState();
  await syncPurchasesUser(userId, isAnonymous);
  return configured ? loadApi() : null;
}

/** Mağazadan gelen yerelleştirilmiş fiyatlar (ör. "₺49,99"); alınamazsa boş döner. */
export async function loadPlanPrices(): Promise<Partial<Record<PremiumPlan, string>>> {
  try {
    const api = await ensureReady();
    if (!api) return {};
    const offerings = await api.getOfferings();
    const current = offerings.current;
    if (!current) return {};
    return {
      monthly: current.monthly?.product.priceString,
      yearly: current.annual?.product.priceString,
    };
  } catch (error) {
    captureException(error);
    return {};
  }
}

function isUserCancelled(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { userCancelled?: boolean }).userCancelled === true;
}

/**
 * Seçilen planı Google Play üzerinden satın aldırır. Premium'un DB'ye yansıması RevenueCat
 * webhook'u (`revenuecat-webhook` Edge Function) üzerinden ASENKRON gelir — çağıran taraf
 * profili birkaç saniye yenileyerek beklemeli. Kullanıcı vazgeçerse 'cancelled' döner
 * (hata değil); gerçek hatalar fırlatılır.
 */
export async function purchasePremium(plan: PremiumPlan): Promise<PurchaseResult> {
  const api = await ensureReady();
  if (!api) return 'unavailable';
  try {
    const offerings = await api.getOfferings();
    const pkg = plan === 'monthly' ? offerings.current?.monthly : offerings.current?.annual;
    if (!pkg) return 'unavailable';
    const { customerInfo } = await api.purchasePackage(pkg);
    return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] ? 'purchased' : 'unavailable';
  } catch (error) {
    if (isUserCancelled(error)) return 'cancelled';
    throw error;
  }
}

/** Başka cihazda/yeniden kurulumda yapılmış satın almayı bu hesaba geri yükler. */
export async function restorePurchases(): Promise<RestoreResult> {
  const api = await ensureReady();
  if (!api) return 'unavailable';
  const customerInfo = await api.restorePurchases();
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] ? 'restored' : 'nothing';
}
