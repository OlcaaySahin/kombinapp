import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { isPremiumActive } from '@/lib/premium';
import { useAuthStore } from '@/lib/stores/authStore';

export type PartnershipState =
  | { status: 'none' }
  | { status: 'pending_outgoing'; id: string; partnerName: string | null }
  | { status: 'pending_incoming'; id: string; partnerName: string | null }
  | {
      status: 'accepted';
      id: string;
      partnerId: string;
      partnerName: string | null;
      partnerGender: string | null;
      partnerIsPremium: boolean;
    };

type RawPartnershipRow = {
  id: string;
  requester_id: string;
  partner_id: string;
  status: 'pending' | 'accepted' | 'declined';
};

/** Kullanıcının güncel eşleşme durumu — bekleyen gelen/giden istek ya da kabul edilmiş eşleşme. */
export function usePartnership() {
  const userId = useAuthStore((state) => state.userId);

  return useQuery<PartnershipState>({
    queryKey: ['partnership', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partnerships')
        .select('id, requester_id, partner_id, status')
        .or(`requester_id.eq.${userId},partner_id.eq.${userId}`)
        .neq('status', 'declined')
        .maybeSingle();
      if (error) throw error;
      if (!data) return { status: 'none' };

      const row = data as RawPartnershipRow;
      const otherId = row.requester_id === userId ? row.partner_id : row.requester_id;
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('display_name, gender, subscription_tier, subscription_expires_at')
        .eq('id', otherId)
        .maybeSingle();
      const partnerName = otherProfile?.display_name ?? null;

      if (row.status === 'accepted') {
        return {
          status: 'accepted',
          id: row.id,
          partnerId: otherId,
          partnerName,
          partnerGender: otherProfile?.gender ?? null,
          partnerIsPremium: isPremiumActive(otherProfile),
        };
      }
      if (row.requester_id === userId) {
        return { status: 'pending_outgoing', id: row.id, partnerName };
      }
      return { status: 'pending_incoming', id: row.id, partnerName };
    },
  });
}

export type SendPartnerRequestResult = {
  sent?: number;
  alreadyInvitedByThem?: boolean;
  message?: string;
  error?: string;
};

export function useSendPartnerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('send-partner-request', { body: { email } });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const body = await error.context.json().catch(() => null);
          throw new Error(body?.error ?? error.message);
        }
        throw error;
      }
      const result = data as SendPartnerRequestResult;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership'] });
    },
  });
}

export function useRespondPartnerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from('partnerships')
        .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership'] });
    },
  });
}

export function useUnmatchPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partnerships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership'] });
    },
  });
}
