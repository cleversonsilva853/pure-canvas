import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getTodayInputDate } from '@/lib/utils';

export const useContasAPagar = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['contas_a_pagar', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateContaAPagar = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (values: { name: string; amount: number; start_date: string; due_date: string; observation?: string }) => {
      const { error } = await supabase.from('contas_a_pagar').insert({ ...values, user_id: user!.id });
      if (error) throw error;

      // Auto-schedule notification for future expenses
      const todayStr = getTodayInputDate();
      if (values.due_date >= todayStr && user?.id) {
        const [y, m, d] = values.due_date.split('-').map(Number);
        const scheduledDateObj = new Date(y, m - 1, d, 7, 0, 0); // 07:00 AM
        
        await supabase.from('notifications').insert([{
           title: `Lembrete de Conta a Pagar`,
           description: `A conta "${values.name}" (R$ ${values.amount.toFixed(2)}) vence hoje!${values.observation ? ` Obs: ${values.observation}` : ''}`,
           scheduled_for: scheduledDateObj.toISOString(),
           status: 'pending',
           recurrence: 'none',
           context: 'personal',
           user_id: user.id
        }]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_a_pagar'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Conta a pagar cadastrada!' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar conta a pagar', variant: 'destructive' }),
  });
};

export const useUpdateContaAPagar = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (values: { id: string; name?: string; amount?: number; start_date?: string; due_date?: string; observation?: string; is_paid?: boolean }) => {
      const { id, ...updateValues } = values;
      const { error } = await supabase.from('contas_a_pagar').update(updateValues).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_a_pagar'] });
      toast({ title: 'Conta a pagar atualizada!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  });
};

export const useDeleteContaAPagar = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_a_pagar').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_a_pagar'] });
      toast({ title: 'Conta a pagar removida!' });
    },
  });
};
