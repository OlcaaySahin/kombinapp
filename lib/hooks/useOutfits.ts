import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CategorySlot } from '@/constants/categories';
import type { PairingNote } from '@/lib/aiOutfit';
import { supabase } from '@/lib/supabase';

export type OutfitContext = {
  mevsim: string;
  /** Hava durumu (Güneşli/Yağmurlu/Rüzgarlı/Karlı) — 2026-07-17'de eklendi; eski kayıtlarda ve zar bağlamında bulunmaz. */
  hava?: string;
  mekan: string;
  saat: string;
  konsept: string;
};

export type OutfitItemSummary = {
  id: string;
  name: string | null;
  slot: CategorySlot;
  color: string | null;
  image_url: string | null;
  user_id: string;
};

export type OutfitWithItems = {
  id: string;
  name: string | null;
  is_liked: boolean;
  rating: number | null;
  generation_source: 'ai_generated' | 'dice' | 'manual';
  generation_context: OutfitContext;
  user_note: string | null;
  reasoning: string | null;
  pairing_notes: PairingNote[] | null;
  /** Partner kombiniyse: birlikte üretildiği ana kombinin id'si (kombin çifti bağı). */
  pair_outfit_id: string | null;
  created_at: string;
  items: OutfitItemSummary[];
};

type RawOutfitRow = {
  id: string;
  name: string | null;
  is_liked: boolean;
  rating: number | null;
  generation_source: 'ai_generated' | 'dice' | 'manual';
  generation_context: OutfitContext;
  user_note: string | null;
  reasoning: string | null;
  pairing_notes: PairingNote[] | null;
  pair_outfit_id: string | null;
  created_at: string;
  outfit_items: { items: OutfitItemSummary }[];
};

function mapOutfit(row: RawOutfitRow): OutfitWithItems {
  return {
    id: row.id,
    name: row.name,
    is_liked: row.is_liked,
    rating: row.rating,
    generation_source: row.generation_source,
    generation_context: row.generation_context,
    user_note: row.user_note,
    reasoning: row.reasoning,
    pairing_notes: row.pairing_notes,
    pair_outfit_id: row.pair_outfit_id,
    created_at: row.created_at,
    items: row.outfit_items.map((entry) => entry.items),
  };
}

const OUTFIT_SELECT = `
  id, name, is_liked, rating, generation_source, generation_context, user_note, reasoning, pairing_notes, pair_outfit_id, created_at,
  outfit_items ( items ( id, name, slot, color, image_url, user_id ) )
`;

/** Tek bir kombini id ile çeker (paylaşım kartı ekranı için). */
export function useOutfit(outfitId: string | null) {
  return useQuery<OutfitWithItems | null>({
    queryKey: ['outfits', 'single', outfitId],
    enabled: Boolean(outfitId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfits')
        .select(OUTFIT_SELECT)
        .eq('id', outfitId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapOutfit(data as unknown as RawOutfitRow) : null;
    },
  });
}

/** Beğenilmiş AMA henüz giyilmemiş kombinler — giyilenler bu listeden otomatik düşer. */
export function useLikedOutfits() {
  return useQuery<OutfitWithItems[]>({
    queryKey: ['outfits', 'liked'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfits')
        .select(`${OUTFIT_SELECT}, outfit_wears ( id )`)
        .eq('is_liked', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data as unknown as (RawOutfitRow & { outfit_wears: { id: string }[] })[];
      return rows.filter((row) => row.outfit_wears.length === 0).map(mapOutfit);
    },
  });
}

export type WearEventData = {
  id: string;
  outfitId: string | null;
  wornDate: string;
  photoUrl: string | null;
  note: string | null;
  rating: number | null;
  items: OutfitItemSummary[];
};

type RawWearRow = {
  id: string;
  worn_date: string;
  photo_url: string | null;
  note: string | null;
  outfits: { id: string; rating: number | null; outfit_items: { items: OutfitItemSummary }[] } | null;
};

/** Giyme anlarının kronolojik günlüğü (kombin albümü) — bir kombin birden fazla kez giyilmişse her seferi ayrı kart. */
export function useWornOutfits() {
  return useQuery<WearEventData[]>({
    queryKey: ['outfits', 'worn'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfit_wears')
        .select(
          `id, worn_date, photo_url, note, outfits ( id, rating, outfit_items ( items ( id, name, slot, color, image_url, user_id ) ) )`
        )
        .order('worn_date', { ascending: false });
      if (error) throw error;
      const rows = data as unknown as RawWearRow[];
      return rows.map((row) => ({
        id: row.id,
        outfitId: row.outfits?.id ?? null,
        wornDate: row.worn_date,
        photoUrl: row.photo_url,
        note: row.note,
        rating: row.outfits?.rating ?? null,
        items: row.outfits?.outfit_items.map((entry) => entry.items) ?? [],
      }));
    },
  });
}

export type CreateOutfitInput = {
  userId: string;
  itemIds: string[];
  context: OutfitContext;
  source: 'ai_generated' | 'dice' | 'manual';
  isLiked?: boolean;
  userNote?: string;
  reasoning?: string | null;
  pairingNotes?: PairingNote[] | null;
  pairOutfitId?: string | null;
};

export function useCreateOutfit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOutfitInput) => {
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          user_id: input.userId,
          generation_source: input.source,
          generation_context: input.context,
          is_liked: input.isLiked ?? true,
          user_note: input.userNote ?? null,
          reasoning: input.reasoning ?? null,
          pairing_notes: input.pairingNotes ?? null,
          pair_outfit_id: input.pairOutfitId ?? null,
        })
        .select()
        .single();
      if (outfitError) throw outfitError;

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(input.itemIds.map((itemId) => ({ outfit_id: outfit.id, item_id: itemId })));
      if (itemsError) throw itemsError;

      return outfit.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });
}

/** Kaydedilmiş bir kombine sonradan çift bağı kurar (partner kombini ana kombinden önce kaydedilmişse). */
export function useSetOutfitPair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ outfitId, pairOutfitId }: { outfitId: string; pairOutfitId: string }) => {
      const { error } = await supabase.from('outfits').update({ pair_outfit_id: pairOutfitId }).eq('id', outfitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ outfitId, liked }: { outfitId: string; liked: boolean }) => {
      const { error } = await supabase.from('outfits').update({ is_liked: liked }).eq('id', outfitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });
}

export function useRateOutfit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ outfitId, rating }: { outfitId: string; rating: number }) => {
      const { error } = await supabase.from('outfits').update({ rating }).eq('id', outfitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });
}

export function useMarkWorn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      outfitId,
      photoUrl,
      note,
    }: {
      outfitId: string;
      photoUrl?: string;
      note?: string;
    }) => {
      const { error } = await supabase
        .from('outfit_wears')
        .insert({ outfit_id: outfitId, photo_url: photoUrl, note });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });
}

/** Bir "Giydim" kaydını siler — kombin beğenilmişse Beğenilenler'e geri döner (başka giyilmesi yoksa). */
export function useDeleteWearEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wearId: string) => {
      const { error } = await supabase.from('outfit_wears').delete().eq('id', wearId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });
}

export function useLogGenerationEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, type }: { userId: string; type: 'outfit' | 'shopping_suggestion' }) => {
      const { error } = await supabase.from('generation_events').insert({ user_id: userId, type });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation_events'] });
    },
  });
}

export function useDailyOutfitCount(userId: string | null) {
  return useQuery<number>({
    queryKey: ['generation_events', 'today', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('generation_events')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'outfit')
        .gte('created_at', startOfDay.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
}
