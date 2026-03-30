import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  data_hora: string;
  status: 'pendente' | 'enviado' | 'cancelado';
  onesignal_id: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id' as any, user.id)
        .order('data_hora', { ascending: false }) as any);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const createNotification = useMutation({
    mutationFn: async (newNotif: { titulo: string, descricao: string, data_hora: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      try {
        const { data, error } = await supabase.functions.invoke('create-notification', {
          body: newNotif
        });

        if (error) throw error;
        return { ...data, type: 'push' };
      } catch (err) {
        console.warn("Edge Function failed, falling back to direct DB insert", err);
        // Fallback: insert directly to DB (no OneSignal scheduling)
        const { data, error } = await (supabase
          .from('notifications' as any)
          .insert([{
            ...newNotif,
            user_id: user.id,
            status: 'pendente'
          }])
          .select()
          .single() as any);

        if (error) throw error;
        return { ...data, type: 'local' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (result.type === 'push') {
        toast.success("Notificação agendada no OneSignal!");
      } else {
        toast.warning("Lembrete salvo, mas o agendamento Push falhou. Verifique as chaves do OneSignal.");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao agendar: " + err.message);
    }
  });

  const updateNotification = useMutation({
    mutationFn: async (notif: { id: string, titulo: string, descricao: string, data_hora: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      try {
        const { data, error } = await supabase.functions.invoke('create-notification', {
          body: { ...notif, isUpdate: true }
        });

        if (error) throw error;
        return { ...data, type: 'push' };
      } catch (err) {
        console.warn("Edge Function update failed, falling back to direct DB update", err);
        const { data, error } = await (supabase
          .from('notifications' as any)
          .update({
            titulo: notif.titulo,
            descricao: notif.descricao,
            data_hora: notif.data_hora,
            status: 'pendente'
          } as any)
          .eq('id' as any, notif.id)
          .select()
          .single() as any);

        if (error) throw error;
        return { ...data, type: 'local' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (result.type === 'push') {
        toast.success("Notificação atualizada no OneSignal!");
      } else {
        toast.warning("Alteração salva localmente, mas Push falhou.");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar: " + err.message);
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('notifications' as any)
        .delete()
        .eq('id' as any, id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Notificação excluída.");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir: " + err.message);
    }
  });

  return {
    notifications,
    isLoading,
    createNotification,
    updateNotification,
    deleteNotification
  };
};
