import { showAlert } from '@/lib/alert';

export type PremiumPlan = 'monthly' | 'yearly';

/**
 * Gerçek satın alma akışı — RevenueCat entegrasyonu bu UI/UX turundan SONRAKİ faz olarak
 * planlandı (kullanıcı kararı 2026-07-21). Şimdilik bilinçli bir stub: ekranın geri kalanı
 * (fiyat/özellik karşılaştırması, plan seçimi) tam işlevsel, sadece bu fonksiyonun içi
 * RevenueCat SDK entegre edilince doldurulacak. Çağıran taraf (app/premium.tsx) bu
 * fonksiyonu DEĞİŞTİRMEDEN aynı şekilde çağırmaya devam edebilecek.
 */
export async function purchasePremium(plan: PremiumPlan): Promise<void> {
  showAlert(
    'Ödeme altyapısı hazırlanıyor',
    'Bu ekran ve plan seçimi hazır — gerçek satın alma birkaç gün içinde buradan aktif olacak.'
  );
}
