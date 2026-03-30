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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const createNotification = useMutation({
    mutationFn: async (newNotif: { titulo: string, descricao: string, data_hora: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke('create-notification', {
        body: newNotif
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Notificação agendada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao agendar notificação: " + err.message);
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
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
    deleteNotification
  };
};
