import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getTodayInputDate } from '@/lib/utils';

export const useBusinessContasAReceber = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business_contas_a_receber', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('business_contas_a_receber')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateBusinessContaAReceber = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (values: { name: string; amount: number; start_date: string; due_date: string; observation?: string }) => {
      const { error } = await (supabase as any)
        .from('business_contas_a_receber')
        .insert({ ...values, user_id: user!.id });
      if (error) throw error;

      // Gera notificação automática para o dia do vencimento às 07:00
      const todayStr = getTodayInputDate();
      if (values.due_date >= todayStr && user?.id) {
        const [y, m, d] = values.due_date.split('-').map(Number);
        const scheduledDateObj = new Date(y, m - 1, d, 7, 0, 0);

        await (supabase as any).from('notifications').insert([{
          title: `[Empresa] Conta a Receber`,
          description: `A conta empresarial a receber "${values.name}" (R$ ${values.amount.toFixed(2)}) vence hoje!${values.observation ? ` Obs: ${values.observation}` : ''}`,
          scheduled_for: scheduledDateObj.toISOString(),
          status: 'pending',
          recurrence: 'none',
          user_id: user.id,
        }]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_contas_a_receber'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Conta a receber registrada!' });
    },
    onError: () => toast({ title: 'Erro ao registrar conta a receber', variant: 'destructive' }),
  });
};

export const useUpdateBusinessContaAReceber = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (values: { id: string; name?: string; amount?: number; start_date?: string; due_date?: string; observation?: string; is_received?: boolean }) => {
      const { id, ...updateValues } = values;
      const { error } = await (supabase as any)
        .from('business_contas_a_receber')
        .update(updateValues)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_contas_a_receber'] });
      toast({ title: 'Conta a receber atualizada!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  });
};

export const useDeleteBusinessContaAReceber = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('business_contas_a_receber')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_contas_a_receber'] });
      toast({ title: 'Conta a receber removida!' });
    },
  });
};
