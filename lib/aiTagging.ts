import * as FileSystem from 'expo-file-system';

import { supabase } from '@/lib/supabase';

export type PhotoTagSuggestion = {
  slot: string;
  name: string;
  color: string;
  colorName: string;
  pattern?: string;
  season: string[];
};

function guessMediaType(uri: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * tag-item-photo Edge Function'ını dener. Function deploy edilmediyse veya hata verirse
 * null döner — form manuel doldurulmaya devam eder, hiçbir şey kırılmaz.
 */
export async function suggestTagsForPhoto(localUri: string): Promise<PhotoTagSuggestion | null> {
  try {
    const imageBase64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const { data, error } = await supabase.functions.invoke('tag-item-photo', {
      body: { imageBase64, mediaType: guessMediaType(localUri) },
    });
    if (error) throw error;
    return data as PhotoTagSuggestion;
  } catch {
    return null;
  }
}
