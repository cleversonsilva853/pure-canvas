import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useAccounts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: () => api.get('/accounts'),
    enabled: !!user,
  });
};

export const useCategories = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: () => api.get('/categories'),
    enabled: !!user,
  });
};

export const useCreditCards = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: () => api.get('/credit-cards'),
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
    queryFn: () => api.get(`/transactions?month=${m}&year=${y}`),
    enabled: !!user,
  });
};

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/transactions', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Transação registrada!' });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Erro ao registrar transação';
      toast({ title: msg, variant: 'destructive' });
    }
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Transação removida!' });
    }
  });
};

export const useBudgets = (month?: number, year?: number) => {
  const { user } = useAuth();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['budgets', user?.id, m, y],
    queryFn: () => api.get(`/budgets?month=${m}&year=${y}`),
    enabled: !!user,
  });
};

export const useGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: () => api.get('/goals'),
    enabled: !!user,
  });
};

export const useUnpaidCreditCardTransactions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['transactions', 'unpaid', user?.id],
    queryFn: async () => {
      const data = await api.get('/transactions');
      return data.filter((t: any) => t.credit_card_id && !t.is_paid);
    },
    enabled: !!user,
  });
};

export const useCoupleMembers = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['couple_members', user?.id],
    queryFn: () => api.get('/couple-members'),
    enabled: !!user,
  });
};

export const useCoupleGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['couple-goals', user?.id],
    queryFn: () => api.get('/goals'),
    enabled: !!user,
  });
};

export const useCoupleBudgets = (month?: number, year?: number) => {
  const { user } = useAuth();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['couple-budgets', user?.id, m, y],
    queryFn: () => api.get(`/budgets?month=${m}&year=${y}`),
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
    queryFn: () => api.get(`/transactions?month=${m}&year=${y}`),
    enabled: !!user,
  });
};

