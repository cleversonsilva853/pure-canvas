import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ---- Business Accounts ----
export const useBusinessAccounts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_accounts'],
    queryFn: () => api.get('/business/accounts'),
    enabled: !!user,
  });
};

// ---- Business Expenses ----
export const useBusinessExpenses = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_expenses'],
    queryFn: () => api.get('/business/expenses'),
    enabled: !!user,
  });
};

export const useCreateBusinessExpense = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/expenses', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_expenses'] });
      qc.invalidateQueries({ queryKey: ['business_accounts'] });
      toast({ title: 'Despesa cadastrada!' });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Erro ao cadastrar despesa';
      toast({ title: msg, variant: 'destructive' });
    },
  });
};

export const useDeleteBusinessExpense = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/business/expenses/${id}`),
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
    queryKey: ['business_products'],
    queryFn: () => api.get('/business/products'),
    enabled: !!user,
  });
};

export const useCreateBusinessProduct = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/products', values),
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
    mutationFn: (values: { id: string; [key: string]: any }) => {
      const { id, ...data } = values;
      return api.put(`/business/products/${id}`, data);
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
    mutationFn: (id: string) => api.delete(`/business/products/${id}`),
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
    queryKey: ['business_sales'],
    queryFn: () => api.get('/business/sales'),
    enabled: !!user,
  });
};

export const useCreateBusinessSale = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/sales', values),
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
    mutationFn: (id: string) => api.delete(`/business/sales/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_sales'] });
      toast({ title: 'Venda removida!' });
    },
  });
};

// ---- Business Ingredients (Insumos) ----
export const useBusinessIngredients = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_ingredients'],
    queryFn: () => api.get('/business/ingredients'),
    enabled: !!user,
  });
};

export const useCreateBusinessIngredient = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/ingredients', values),
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
    mutationFn: (values: { id: string; [key: string]: any }) => {
      const { id, ...data } = values;
      return api.put(`/business/ingredients/${id}`, data);
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
    mutationFn: (id: string) => api.delete(`/business/ingredients/${id}`),
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
    queryFn: () => api.get(`/business/compositions?product_id=${productId}`),
    enabled: !!user && !!productId,
  });
};

export const useAllBusinessProductCompositions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_product_compositions_all'],
    queryFn: () => api.get('/business/compositions'),
    enabled: !!user,
  });
};

export const useUpdateProductComposition = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: { productId: string; compositions: any[] }) => {
      return api.post('/business/compositions', { 
        product_id: values.productId, 
        compositions: values.compositions 
      });
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
  return useQuery({
    queryKey: ['business_expense_categories'],
    queryFn: () => api.get('/business/expense_categories'),
    enabled: !!user,
  });
};

export const useCreateBusinessExpenseCategory = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/expense_categories', values),
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
    mutationFn: (values: { id: string; name: string }) => api.put(`/business/expense_categories/${values.id}`, { name: values.name }),
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
    mutationFn: (id: string) => api.delete(`/business/expense_categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_expense_categories'] });
      toast({ title: 'Categoria removida!' });
    },
  });
};

// ---- Business Product Additions (Custos Dinâmicos) ----
export const useBusinessProductAdditions = (productId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_product_additions', productId],
    queryFn: () => api.get(`/business/product-additions?product_id=${productId}`),
    enabled: !!user && !!productId,
  });
};

export const useCreateBusinessProductAddition = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/product-additions', values),
    onSuccess: (_, { product_id }) => {
      qc.invalidateQueries({ queryKey: ['business_product_additions', product_id] });
      toast({ title: 'Custo adicional adicionado!' });
    },
    onError: () => toast({ title: 'Erro ao adicionar custo', variant: 'destructive' }),
  });
};

export const useDeleteBusinessProductAddition = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: { id: string; productId: string }) => api.delete(`/business/product-additions/${values.id}`),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['business_product_additions', productId] });
      toast({ title: 'Custo removido!' });
    },
  });
};

// ---- Business Product Sale Units (Unidades de Venda) ----
export const useBusinessProductSaleUnits = (productId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_product_sale_units', productId],
    queryFn: () => api.get(`/business/product-sale-units?product_id=${productId}`),
    enabled: !!user && !!productId,
  });
};

export const useCreateBusinessProductSaleUnit = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/product-sale-units', values),
    onSuccess: (_, { product_id }) => {
      qc.invalidateQueries({ queryKey: ['business_product_sale_units', product_id] });
      toast({ title: 'Unidade de venda adicionada!' });
    },
    onError: () => toast({ title: 'Erro ao adicionar unidade', variant: 'destructive' }),
  });
};

export const useDeleteBusinessProductSaleUnit = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: { id: string; productId: string }) => api.delete(`/business/product-sale-units/${values.id}`),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['business_product_sale_units', productId] });
      toast({ title: 'Unidade removida!' });
    },
  });
};

// ---- Business Product Purchases (Histórico de Compras) ----
export const useBusinessProductPurchases = (productId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_product_purchases', productId],
    queryFn: () => api.get(`/business/product-purchases?product_id=${productId}`),
    enabled: !!user && !!productId,
  });
};

export const useCreateBusinessProductPurchase = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: any) => api.post('/business/product-purchases', values),
    onSuccess: (_, { product_id }) => {
      qc.invalidateQueries({ queryKey: ['business_product_purchases', product_id] });
      qc.invalidateQueries({ queryKey: ['business_products'] });
      toast({ title: 'Compra registrada!' });
    },
    onError: () => toast({ title: 'Erro ao registrar compra', variant: 'destructive' }),
  });
};

export const useDeleteBusinessProductPurchase = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (values: { id: string; productId: string }) => api.delete(`/business/product-purchases/${values.id}`),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['business_product_purchases', productId] });
      toast({ title: 'Registro removido!' });
    },
  });
};

