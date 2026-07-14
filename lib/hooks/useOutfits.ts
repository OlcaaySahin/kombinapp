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
  outfit_items ( items ( id, name, slot, color ) )
`;

export function useLikedOutfits() {
  return useQuery<OutfitWithItems[]>({
    queryKey: ['outfits', 'liked'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfits')
        .select(OUTFIT_SELECT)
        .eq('is_liked', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as RawOutfitRow[]).map(mapOutfit);
    },
  });
}

export function useWornOutfits() {
  return useQuery<OutfitWithItems[]>({
    queryKey: ['outfits', 'worn'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfits')
        .select(`${OUTFIT_SELECT}, outfit_wears!inner(worn_date)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data as unknown as RawOutfitRow[];
      const seen = new Set<string>();
      const unique = rows.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
      return unique.map(mapOutfit);
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
