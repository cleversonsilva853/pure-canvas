import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBusinessOwnerId } from '@/hooks/useBusinessOwnerId';

// ---- Business Accounts ----
export const useBusinessAccounts = () => {
  const { user } = useAuth();
  const ownerId = useBusinessOwnerId();

  return useQuery({
    queryKey: ['business_accounts', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_accounts')
        .select('*')
        .eq('user_id', ownerId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ownerId,
  });
};

// ---- Business Expenses ----
export const useBusinessExpenses = () => {
  const { user } = useAuth();
  const ownerId = useBusinessOwnerId();
  
  return useQuery({
    queryKey: ['business_expenses', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_expenses')
        .select('*')
        .eq('user_id', ownerId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ownerId,
  });
};

export const useCreateBusinessExpense = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ownerId = useBusinessOwnerId();

  return useMutation({
    mutationFn: async (values: { name: string; category: string; amount: number; date: string; observation?: string }) => {
      const { error } = await supabase.from('business_expenses').insert({ ...values, user_id: ownerId! });
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
  const ownerId = useBusinessOwnerId();

  return useQuery({
    queryKey: ['business_products', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('*')
        .eq('user_id', ownerId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ownerId,
  });
};

export const useCreateBusinessProduct = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ownerId = useBusinessOwnerId();

  return useMutation({
    mutationFn: async (values: { name: string; sale_price: number; cost_price: number; stock?: number }) => {
      const { error } = await supabase.from('business_products').insert({ ...values, user_id: ownerId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_products'] });
      toast({ title: 'Produto cadastrado!' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar produto', variant: 'destructive' }),
  });
};

export const useUpdateBusinessProduct = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { id: string; name: string; sale_price: number; cost_price: number; stock?: number }) => {
      const { id, ...updateValues } = values;
      const { error } = await supabase.from('business_products').update(updateValues).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_products'] });
      toast({ title: 'Produto atualizado!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar produto', variant: 'destructive' }),
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
  const ownerId = useBusinessOwnerId();

  return useQuery({
    queryKey: ['business_sales', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_sales')
        .select('*')
        .eq('user_id', ownerId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ownerId,
  });
};

export const useCreateBusinessSale = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ownerId = useBusinessOwnerId();

  return useMutation({
    mutationFn: async (values: { product_id?: string; product_name: string; quantity: number; unit_price: number; total_price: number; date: string }) => {
      const { error } = await supabase.from('business_sales').insert({ ...values, user_id: ownerId! });
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

// ---- Business Ingredients (Insumos) ----
export const useBusinessIngredients = () => {
  const { user } = useAuth();
  const ownerId = useBusinessOwnerId();

  return useQuery({
    queryKey: ['business_ingredients', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_ingredients')
        .select('*')
        .eq('user_id', ownerId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ownerId,
  });
};

export const useCreateBusinessIngredient = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ownerId = useBusinessOwnerId();

  return useMutation({
    mutationFn: async (values: { name: string; unit: string; purchase_price: number; purchase_quantity: number }) => {
      const { error } = await supabase.from('business_ingredients').insert({ ...values, user_id: ownerId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_ingredients'] });
      toast({ title: 'Insumo cadastrado!' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar insumo', variant: 'destructive' }),
  });
};

export const useUpdateBusinessIngredient = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { id: string; name: string; unit: string; purchase_price: number; purchase_quantity: number }) => {
      const { id, ...updateValues } = values;
      const { error } = await supabase.from('business_ingredients').update(updateValues).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_ingredients'] });
      toast({ title: 'Insumo atualizado!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar insumo', variant: 'destructive' }),
  });
};

export const useDeleteBusinessIngredient = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_ingredients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_ingredients'] });
      toast({ title: 'Insumo removido!' });
    },
  });
};

// ---- Business Product Composition (Ficha Técnica) ----
export const useBusinessProductCompositions = (productId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_product_compositions', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('business_product_compositions')
        .select('*, ingredient:business_ingredients(*)')
        .eq('product_id', productId);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!productId,
  });
};

export const useAllBusinessProductCompositions = () => {
  const { user } = useAuth();
  const ownerId = useBusinessOwnerId();

  return useQuery({
    queryKey: ['business_product_compositions_all', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_product_compositions')
        .select('*');

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ownerId,
  });
};

export const useUpdateProductComposition = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, compositions }: { productId: string; compositions: { ingredient_id: string; quantity: number }[] }) => {
      const { error: deleteError } = await supabase.from('business_product_compositions').delete().eq('product_id', productId);
      if (deleteError) throw deleteError;

      if (compositions.length > 0) {
        const { error: insertError } = await supabase.from('business_product_compositions').insert(
          compositions.map(c => ({ ...c, product_id: productId }))
        );
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['business_product_compositions', productId] });
      toast({ title: 'Ficha técnica atualizada!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar ficha técnica', variant: 'destructive' }),
  });
};

// ---- Business Expense Categories ----
export const useBusinessExpenseCategories = () => {
  const { user } = useAuth();
  const ownerId = useBusinessOwnerId();

  return useQuery({
    queryKey: ['business_expense_categories', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_expense_categories')
        .select('*')
        .eq('user_id', ownerId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!ownerId,
  });
};

export const useCreateBusinessExpenseCategory = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ownerId = useBusinessOwnerId();

  return useMutation({
    mutationFn: async (values: { name: string }) => {
      const { error } = await supabase.from('business_expense_categories').insert({ ...values, user_id: ownerId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_expense_categories'] });
      toast({ title: 'Categoria criada!' });
    },
    onError: () => toast({ title: 'Erro ao criar categoria', variant: 'destructive' }),
  });
};

export const useUpdateBusinessExpenseCategory = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (values: { id: string; name: string }) => {
      const { id, ...updateValues } = values;
      const { error } = await supabase.from('business_expense_categories').update(updateValues).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_expense_categories'] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' }),
  });
};

export const useDeleteBusinessExpenseCategory = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_expense_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_expense_categories'] });
      toast({ title: 'Categoria removida!' });
    },
    onError: () => toast({ title: 'Erro ao remover categoria', variant: 'destructive' }),
  });
};
