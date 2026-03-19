import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCouple = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['couple', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couples' as any)
        .select('*')
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });
};

export const useCoupleInvites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['couple_invites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couple_invites' as any)
        .select('*')
        .eq('inviter_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[] || [];
    },
    enabled: !!user,
  });
};

export const usePendingInvitesForUser = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['couple_invites_pending', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couple_invites' as any)
        .select('*')
        .eq('invitee_email', user!.email)
        .eq('status', 'pending');
      if (error) throw error;
      return data as any[] || [];
    },
    enabled: !!user?.email,
  });
};

export const useCoupleWallets = (coupleId?: string) => {
  return useQuery({
    queryKey: ['couple_wallets', coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couple_wallets' as any)
        .select('*')
        .eq('couple_id', coupleId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[] || [];
    },
    enabled: !!coupleId,
  });
};

export const useCoupleTransactions = (coupleId?: string) => {
  return useQuery({
    queryKey: ['couple_transactions', coupleId],
    queryFn: async () => {
      const now = new Date();
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endMonth = now.getMonth() + 2;
      const endDate = endMonth > 12
        ? `${now.getFullYear() + 1}-01-01`
        : `${now.getFullYear()}-${String(endMonth).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('couple_transactions' as any)
        .select('*')
        .eq('couple_id', coupleId!)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as any[] || [];
    },
    enabled: !!coupleId,
  });
};

export const usePartnerProfile = (partnerId?: string) => {
  return useQuery({
    queryKey: ['partner_profile', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', partnerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });
};
