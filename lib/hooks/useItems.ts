import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CategorySlot } from '@/constants/categories';
import { supabase } from '@/lib/supabase';

export type DbItem = {
  id: string;
  user_id: string;
  category_id: string | null;
  slot: CategorySlot;
  name: string | null;
  color: string | null;
  pattern: string | null;
  season: string[];
  brand: string | null;
  image_url: string | null;
  source_type: 'user_photo' | 'web_photo';
  ai_tags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function useItems() {
  return useQuery<DbItem[]>({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbItem[];
    },
  });
}

export type NewItemInput = {
  userId: string;
  slot: CategorySlot;
  name: string;
  color: string;
  season?: string[];
  imageUrl?: string;
  sourceType?: 'user_photo' | 'web_photo';
};

export function useAddItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewItemInput) => {
      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: input.userId,
          slot: input.slot,
          name: input.name,
          color: input.color,
          season: input.season ?? [],
          image_url: input.imageUrl,
          source_type: input.sourceType ?? 'user_photo',
        })
        .select()
        .single();
      if (error) throw error;
      return data as DbItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export type UpdateItemInput = {
  id: string;
  slot: CategorySlot;
  name: string;
  color: string;
  imageUrl?: string;
};

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateItemInput) => {
      const updates: {
        slot: CategorySlot;
        name: string;
        color: string;
        updated_at: string;
        image_url?: string;
      } = {
        slot: input.slot,
        name: input.name,
        color: input.color,
        updated_at: new Date().toISOString(),
      };
      if (input.imageUrl) updates.image_url = input.imageUrl;

      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as DbItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
