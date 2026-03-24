import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAccounts = () => {
  const { user } = useAuth();
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useQuery({
    queryKey: ['accounts', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCategories = () => {
  const { user } = useAuth();
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useQuery({
    queryKey: ['categories', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', ownerId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useTransactions = (month?: number, year?: number) => {
  const { user } = useAuth();
  const ownerId = user?.user_metadata?.created_by || user?.id;
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['transactions', ownerId, m, y],
    queryFn: async () => {
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*), card:credit_cards(*)')
        .eq('user_id', ownerId)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreditCards = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUnpaidCreditCardTransactions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['transactions', 'unpaid', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, card:credit_cards(*)')
        .not('credit_card_id', 'is', null)
        .eq('is_paid', false);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useBudgets = (month?: number, year?: number) => {
  const { user } = useAuth();
  const ownerId = user?.user_metadata?.created_by || user?.id;
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['budgets', ownerId, m, y],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', ownerId)
        .eq('month', m)
        .eq('year', y);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCoupleMembers = () => {
  const { user } = useAuth();
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useQuery({
    queryKey: ['couple_members', ownerId],
    queryFn: async () => {
      // Find all members who are linked to the same "Main" account
      // For this to work, we search by a common couple_id or link
      const { data, error } = await supabase
        .from('couple_members')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
