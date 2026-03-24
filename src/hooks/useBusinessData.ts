import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ---- Business Expenses ----
export const useBusinessExpenses = () => {
  const { user } = useAuth();
  const ownerId = user?.user_metadata?.created_by || user?.id;
  
  return useQuery({
    queryKey: ['business_expenses', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_expenses')
        .select('*')
        .eq('user_id', ownerId)
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
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useMutation({
    mutationFn: async (values: { name: string; category: string; amount: number; date: string; observation?: string }) => {
      const { error } = await supabase.from('business_expenses').insert({ ...values, user_id: ownerId });
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
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useQuery({
    queryKey: ['business_products', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('*')
        .eq('user_id', ownerId)
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
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useMutation({
    mutationFn: async (values: { name: string; sale_price: number; cost_price: number; stock?: number }) => {
      const { error } = await supabase.from('business_products').insert({ ...values, user_id: ownerId });
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
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useQuery({
    queryKey: ['business_sales', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_sales')
        .select('*')
        .eq('user_id', ownerId)
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
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useMutation({
    mutationFn: async (values: { product_id?: string; product_name: string; quantity: number; unit_price: number; total_price: number; date: string }) => {
      const { error } = await supabase.from('business_sales').insert({ ...values, user_id: ownerId });
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
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useQuery({
    queryKey: ['business_ingredients', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_ingredients')
        .select('*')
        .eq('user_id', ownerId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateBusinessIngredient = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const ownerId = user?.user_metadata?.created_by || user?.id;

  return useMutation({
    mutationFn: async (values: { name: string; unit: string; purchase_price: number; purchase_quantity: number }) => {
      const { error } = await supabase.from('business_ingredients').insert({ ...values, user_id: ownerId });
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

export const useUpdateProductComposition = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, compositions }: { productId: string; compositions: { ingredient_id: string; quantity: number }[] }) => {
      // Deletar composições antigas
      const { error: deleteError } = await supabase.from('business_product_compositions').delete().eq('product_id', productId);
      if (deleteError) throw deleteError;

      // Inserir novas
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
