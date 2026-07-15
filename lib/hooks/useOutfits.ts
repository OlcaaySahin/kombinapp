import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CategorySlot } from '@/constants/categories';
import { supabase } from '@/lib/supabase';

export type OutfitContext = {
  mevsim: string;
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
};

export type OutfitWithItems = {
  id: string;
  name: string | null;
  is_liked: boolean;
  generation_source: 'ai_generated' | 'dice' | 'manual';
  generation_context: OutfitContext;
  created_at: string;
  items: OutfitItemSummary[];
};

type RawOutfitRow = {
  id: string;
  name: string | null;
  is_liked: boolean;
  generation_source: 'ai_generated' | 'dice' | 'manual';
  generation_context: OutfitContext;
  created_at: string;
  outfit_items: { items: OutfitItemSummary }[];
};

function mapOutfit(row: RawOutfitRow): OutfitWithItems {
  return {
    id: row.id,
    name: row.name,
    is_liked: row.is_liked,
    generation_source: row.generation_source,
    generation_context: row.generation_context,
    created_at: row.created_at,
    items: row.outfit_items.map((entry) => entry.items),
  };
}

const OUTFIT_SELECT = `
  id, name, is_liked, generation_source, generation_context, created_at,
  outfit_items ( items ( id, name, slot, color, image_url ) )
`;

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
  wornDate: string;
  photoUrl: string | null;
  note: string | null;
  items: OutfitItemSummary[];
};

type RawWearRow = {
  id: string;
  worn_date: string;
  photo_url: string | null;
  note: string | null;
  outfits: { outfit_items: { items: OutfitItemSummary }[] } | null;
};

/** Giyme anlarının kronolojik günlüğü (kombin albümü) — bir kombin birden fazla kez giyilmişse her seferi ayrı kart. */
export function useWornOutfits() {
  return useQuery<WearEventData[]>({
    queryKey: ['outfits', 'worn'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfit_wears')
        .select(
          `id, worn_date, photo_url, note, outfits ( outfit_items ( items ( id, name, slot, color, image_url ) ) )`
        )
        .order('worn_date', { ascending: false });
      if (error) throw error;
      const rows = data as unknown as RawWearRow[];
      return rows.map((row) => ({
        id: row.id,
        wornDate: row.worn_date,
        photoUrl: row.photo_url,
        note: row.note,
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
