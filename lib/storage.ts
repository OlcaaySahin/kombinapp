import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { supabase } from '@/lib/supabase';

export type StorageBucket = 'item-photos' | 'outfit-wear-photos';

/**
 * Yerel bir foto URI'sini (expo-image-picker'dan gelen) Supabase Storage'a yükler.
 * Yol konvansiyonu: {bucket}/{userId}/{dosya}.jpg — RLS politikaları bu ilk klasörü kontrol eder.
 * Not: Bu fonksiyon fiziksel bir cihazda henüz interaktif olarak test edilmedi (bkz. CLAUDE.md).
 */
export async function uploadPhoto(bucket: StorageBucket, userId: string, localUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);
  const extension = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
