import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ---- Business Expenses ----
export const useBusinessExpenses = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_expenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateBusinessExpense = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { name: string; category: string; amount: number; date: string; observation?: string }) => {
      const { error } = await supabase.from('business_expenses').insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_expenses'] });
      toast({ title: 'Despesa cadastrada!' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar despesa', variant: 'destructive' }),
  });
};

export const useDeleteBusinessExpense = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_expenses'] });
      toast({ title: 'Despesa removida!' });
    },
  });
};

// ---- Business Products ----
export const useBusinessProducts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateBusinessProduct = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { name: string; sale_price: number; cost_price: number; stock?: number }) => {
      const { error } = await supabase.from('business_products').insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_products'] });
      toast({ title: 'Produto cadastrado!' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar produto', variant: 'destructive' }),
  });
};

export const useDeleteBusinessProduct = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_products'] });
      toast({ title: 'Produto removido!' });
    },
  });
};

// ---- Business Sales ----
export const useBusinessSales = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_sales', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_sales')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateBusinessSale = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { product_id?: string; product_name: string; quantity: number; unit_price: number; total_price: number; date: string }) => {
      const { error } = await supabase.from('business_sales').insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_sales'] });
      toast({ title: 'Venda registrada!' });
    },
    onError: () => toast({ title: 'Erro ao registrar venda', variant: 'destructive' }),
  });
};

export const useDeleteBusinessSale = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_sales'] });
      toast({ title: 'Venda removida!' });
    },
  });
};

// ---- Food Pricing ----
export const useFoodPricing = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_food_pricing', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_food_pricing')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateFoodPricing = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { name: string; total_quantity: number; unit: string; total_cost: number; portion_quantity: number; profit_percentage: number }) => {
      const { error } = await supabase.from('business_food_pricing').insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_food_pricing'] });
      toast({ title: 'Item cadastrado!' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar item', variant: 'destructive' }),
  });
};

export const useDeleteFoodPricing = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_food_pricing').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_food_pricing'] });
      toast({ title: 'Item removido!' });
    },
  });
};
