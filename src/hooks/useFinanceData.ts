import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAccounts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCategories = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useTransactions = (month?: number, year?: number) => {
  const { user } = useAuth();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['transactions', user?.id, m, y],
    queryFn: async () => {
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*), card:credit_cards(*)')
        .eq('user_id', user?.id)
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
        .eq('user_id', user?.id)
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
        .eq('user_id', user?.id)
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
        .eq('user_id', user?.id)
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
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['budgets', user?.id, m, y],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user?.id)
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
  return useQuery({
    queryKey: ['couple_members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couple_members')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCoupleTransactions = (month?: number, year?: number) => {
  const { user } = useAuth();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['couple_transactions', user?.id, m, y],
    queryFn: async () => {
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;

      // 1. Get current user's transactions
      // 2. Try to get partner's transactions (searching by created_by link)
      const mainId = user?.user_metadata?.created_by || user?.id;
      
      // Fetch transactions where user_id is the main ID OR where the user_id's created_by is the main ID
      // Since RLS might be tricky, we'll try to fetch all that the user has permission to see
      // In a real scenario, the RLS policy "Users can see shared transactions" from the walkthrough 
      // is what enables this.
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*), card:credit_cards(*)')
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Filter here if RLS returns more than needed, but ideally RLS handles it.
      // For the Dashboard, we want the SUM, so we return all visible trans.
      return data;
    },
    enabled: !!user,
  });
};
