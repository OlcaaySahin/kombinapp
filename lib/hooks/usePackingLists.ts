import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type PackingDayOutfitRecord = {
  day: number;
  itemIds: string[];
  note: string;
  rating?: number | null;
};

export type DbPackingList = {
  id: string;
  user_id: string;
  days: number;
  context: { mevsim: string; hava?: string; konsept: string; note?: string };
  suitcase_item_ids: string[];
  day_outfits: PackingDayOutfitRecord[];
  reasoning: string | null;
  rating: number | null;
  created_at: string;
};

export function usePackingLists() {
  return useQuery<DbPackingList[]>({
    queryKey: ['packing_lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packing_lists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbPackingList[];
    },
  });
}

export function usePackingList(packingListId: string | null) {
  return useQuery<DbPackingList | null>({
    queryKey: ['packing_lists', packingListId],
    enabled: Boolean(packingListId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packing_lists')
        .select('*')
        .eq('id', packingListId)
        .maybeSingle();
      if (error) throw error;
      return (data as DbPackingList | null) ?? null;
    },
  });
}

export type SavePackingListInput = {
  userId: string;
  days: number;
  context: DbPackingList['context'];
  suitcaseItemIds: string[];
  dayOutfits: PackingDayOutfitRecord[];
  reasoning: string | null;
  rating: number | null;
};

export function useCreatePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SavePackingListInput) => {
      const { data, error } = await supabase
        .from('packing_lists')
        .insert({
          user_id: input.userId,
          days: input.days,
          context: input.context,
          suitcase_item_ids: input.suitcaseItemIds,
          day_outfits: input.dayOutfits,
          reasoning: input.reasoning,
          rating: input.rating,
        })
        .select()
        .single();
      if (error) throw error;
      return (data as DbPackingList).id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing_lists'] });
    },
  });
}

export function useUpdatePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: SavePackingListInput & { id: string }) => {
      const { error } = await supabase
        .from('packing_lists')
        .update({
          days: input.days,
          context: input.context,
          suitcase_item_ids: input.suitcaseItemIds,
          day_outfits: input.dayOutfits,
          reasoning: input.reasoning,
          rating: input.rating,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing_lists'] });
    },
  });
}
