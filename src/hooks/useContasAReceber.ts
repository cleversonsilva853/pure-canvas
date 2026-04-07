import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useContasAReceber = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['contas_a_receber', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_a_receber')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateContaAReceber = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (values: { name: string; amount: number; start_date: string; due_date: string; observation?: string }) => {
      const { error } = await supabase.from('contas_a_receber').insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_a_receber'] });
      toast({ title: 'Conta a receber cadastrada!' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar conta a receber', variant: 'destructive' }),
  });
};

export const useUpdateContaAReceber = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (values: { id: string; name?: string; amount?: number; start_date?: string; due_date?: string; observation?: string; is_received?: boolean }) => {
      const { id, ...updateValues } = values;
      const { error } = await supabase.from('contas_a_receber').update(updateValues).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_a_receber'] });
      toast({ title: 'Conta a receber atualizada!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  });
};

export const useDeleteContaAReceber = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_a_receber').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_a_receber'] });
      toast({ title: 'Conta a receber removida!' });
    },
  });
};
