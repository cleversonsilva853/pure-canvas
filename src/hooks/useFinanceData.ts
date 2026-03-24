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
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useTransactions = (month?: number, year?: number, filterContext: 'personal' | 'couple' = 'personal') => {
  const { user } = useAuth();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['transactions', user?.id, m, y, filterContext],
    queryFn: async () => {
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;

      let query = supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*), card:credit_cards(*)')
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false });

      if (filterContext === 'personal') {
        // Personal: context_type = personal OR (context_type = couple AND paid_by = user.id)
        query = query.or(`context_type.eq.personal,and(context_type.eq.couple,paid_by.eq.${user?.id})`);
      } else if (filterContext === 'couple') {
        // Couple: context_type = couple
        query = query.eq('context_type', 'couple');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCouplePartner = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['couple_partner', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Find the couple_id for the current user
      const { data: memberData, error: memberError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();
        
      if (memberError || !memberData) return null;
      
      // Find the other member in the same couple
      const { data: partnerData, error: partnerError } = await supabase
        .from('couple_members')
        .select('user_id, profiles(full_name)')
        .eq('couple_id', memberData.couple_id)
        .neq('user_id', user.id)
        .single();
        
      if (partnerError || !partnerData) return null;
      
      return partnerData;
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
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['budgets', user?.id, m, y],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('month', m)
        .eq('year', y);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
