import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CategorySlot } from '@/constants/categories';
import { supabase } from '@/lib/supabase';

export type DbWishlistItem = {
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
  product_url: string | null;
  price: number | null;
  source_type: 'user_photo' | 'web_photo';
  ai_tags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function useWishlistItems() {
  return useQuery<DbWishlistItem[]>({
    queryKey: ['wishlist_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbWishlistItem[];
    },
  });
}

export type NewWishlistItemInput = {
  userId: string;
  slot: CategorySlot;
  name: string;
  color: string;
  productUrl?: string;
  price?: number;
  imageUrl?: string;
};

export function useAddWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewWishlistItemInput) => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: input.userId,
          slot: input.slot,
          name: input.name,
          color: input.color,
          product_url: input.productUrl,
          price: input.price,
          image_url: input.imageUrl,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DbWishlistItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist_items'] });
    },
  });
}

export type UpdateWishlistItemInput = {
  id: string;
  slot: CategorySlot;
  name: string;
  color: string;
  productUrl?: string;
  price?: number;
  imageUrl?: string;
};

export function useUpdateWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateWishlistItemInput) => {
      const updates: {
        slot: CategorySlot;
        name: string;
        color: string;
        product_url?: string;
        price?: number;
        updated_at: string;
        image_url?: string;
      } = {
        slot: input.slot,
        name: input.name,
        color: input.color,
        product_url: input.productUrl,
        price: input.price,
        updated_at: new Date().toISOString(),
      };
      if (input.imageUrl) updates.image_url = input.imageUrl;

      const { data, error } = await supabase
        .from('wishlist_items')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as DbWishlistItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist_items'] });
    },
  });
}

export function useDeleteWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist_items'] });
    },
  });
}
