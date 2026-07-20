import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CategorySlot } from '@/constants/categories';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/authStore';

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
  /** Arşivlenen ürün Envanter'de soluk+rozetli görünür, kombin havuzuna girmez. */
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * user_id'yi RLS'e bırakmayıp EXPLICIT olarak filtreliyoruz — partner eşleştirmesi
 * items tablosuna dar bir çapraz-görünürlük policy'si ekledi (kaydedilmiş "partner kombini"
 * render edilebilsin diye, bkz. migration 20260719020000). Bu policy sadece belirli
 * item'ları etkiliyor ama yine de bu sorgunun "sadece benim envanterim" niyetini RLS'in
 * o anki kapsamına bağımlı bırakmamak için ekstra bir güvenlik katmanı.
 */
export function useItems() {
  const userId = useAuthStore((state) => state.userId);
  return useQuery<DbItem[]>({
    queryKey: ['items', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
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

/** Ürünü arşivler / arşivden çıkarır (arşivli ürün kombin havuzuna girmez). */
export function useArchiveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('items')
        .update({ is_archived: archived, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
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

/** Envanterde çoklu seçim modu için toplu arşivleme — tek istekte `.in('id', ids)`. */
export function useArchiveItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, archived }: { ids: string[]; archived: boolean }) => {
      const { error } = await supabase
        .from('items')
        .update({ is_archived: archived, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

/** Envanterde çoklu seçim modu için toplu silme — tek istekte `.in('id', ids)`. */
export function useDeleteItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('items').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
