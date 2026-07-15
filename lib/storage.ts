import { supabase } from '@/lib/supabase';

export type StorageBucket = 'item-photos' | 'outfit-wear-photos';

function extensionFromMimeType(mimeType: string | undefined) {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

/**
 * Yerel bir foto URI'sini (expo-image-picker'dan gelen) Supabase Storage'a yükler.
 * `fetch(uri).arrayBuffer()` kullanılıyor çünkü bu, native'deki file:// URI'lerinde de
 * web'deki blob:/data: URI'lerinde de aynı şekilde çalışıyor — expo-file-system'in
 * base64 okuma yöntemi web'de blob: URI'lerini okuyamadığı için (2026-07-15, kullanıcı
 * tarafından "Envantere Ekle" butonunun web'de sessizce hiçbir şey yapmaması ile bulundu).
 * Yol konvansiyonu: {bucket}/{userId}/{dosya} — RLS politikaları bu ilk klasörü kontrol eder.
 */
export async function uploadPhoto(
  bucket: StorageBucket,
  userId: string,
  localUri: string,
  mimeType?: string
): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const extension = extensionFromMimeType(mimeType);
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: mimeType ?? 'image/jpeg',
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
