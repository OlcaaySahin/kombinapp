import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type DbProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  daily_style: string | null;
  subscription_tier: 'free' | 'premium';
  subscription_expires_at: string | null;
  created_at: string;
};

export function useProfile(userId: string | null) {
  return useQuery<DbProfile | null>({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      return data as DbProfile | null;
    },
  });
}

export type UpdateProfileInput = {
  userId: string;
  gender?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dailyStyle?: string | null;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          gender: input.gender,
          age: input.age,
          height_cm: input.heightCm,
          weight_kg: input.weightKg,
          daily_style: input.dailyStyle,
        })
        .eq('id', input.userId)
        .select()
        .single();
      if (error) throw error;
      return data as DbProfile;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] });
    },
  });
}
