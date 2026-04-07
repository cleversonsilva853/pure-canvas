import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Plus, Trash2, Edit, AlertCircle, RefreshCw, Repeat, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { NotificationForm } from "@/components/notifications/NotificationForm";
import { useWebPush } from "@/hooks/useWebPush";
import { useAuth } from "@/contexts/AuthContext";

type Notification = {
  id: string;
  title: string;
  description: string;
  scheduled_for: string;
  status: string;
  recurrence?: string;
  weekdays_config?: string;
};

const recurrenceBaseLabels: Record<string, string> = {
  none: '',
  daily: 'Diariamente',
  weekdays: 'Dias da Semana',
  monthly: 'Mensalmente',
};

const WEEK_DAY_NAMES: Record<string, string> = {
  '0': 'Dom',
  '1': 'Seg',
  '2': 'Ter',
  '3': 'Qua',
  '4': 'Qui',
  '5': 'Sex',
  '6': 'Sáb',
};

function getRecurrenceLabel(n: Notification): string {
  if (!n.recurrence || n.recurrence === 'none') return '';
  if (n.recurrence === 'weekdays' && n.weekdays_config) {
    try {
      const days: string[] = JSON.parse(n.weekdays_config);
      const names = days.sort().map(d => WEEK_DAY_NAMES[d]).filter(Boolean);
      if (names.length > 0) return names.join(', ');
    } catch {
      // fallback
    }
  }
  return recurrenceBaseLabels[n.recurrence] || n.recurrence;
}

export default function Notifications() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | undefined>();
  const queryClient = useQueryClient();
  const { isSupported, isSubscribed, permission, subscribe } = useWebPush();
  const { user } = useAuth();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as any as Notification[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Notificação excluída com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir notificação.");
    }
  });

  const handleEdit = (n: Notification) => {
    setEditingNotification(n);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingNotification(undefined);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir este lembrete?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string, scheduledDate: Date) => {
    if (status === 'cancelled') return <Badge variant="destructive">Cancelado</Badge>;
    if (status === 'failed') return <Badge variant="destructive">Falha</Badge>;
    if (status === 'sent') return <Badge variant="secondary">Enviado</Badge>;
    if (new Date() > scheduledDate) return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Processando</Badge>;
    return <Badge className="bg-blue-500 hover:bg-blue-600">Pendente</Badge>;
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl flex items-center gap-2 font-bold tracking-tight">
            <Bell className="h-8 w-8 text-primary" />
            Lembretes
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie suas notificações e lembretes agendados.</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Lembrete
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Notificações Push neste dispositivo</h3>
          </div>

          {!isSupported ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Não suportado</p>
                <p className="text-xs text-muted-foreground">Este navegador não suporta notificações push.</p>
              </div>
            </div>
          ) : permission === "denied" ? (
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Bloqueado</p>
                <p className="text-xs text-muted-foreground">As notificações foram bloqueadas no navegador. Acesse as configurações do navegador para desbloquear.</p>
              </div>
            </div>
          ) : isSubscribed ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Ativado</p>
                <p className="text-xs text-muted-foreground">Este dispositivo receberá notificações push dos seus lembretes.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Desativado</p>
                  <p className="text-xs text-muted-foreground">Ative para receber lembretes diretamente neste dispositivo.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => user && subscribe(user.id)} className="gap-2">
                <Bell className="h-4 w-4" />
                Ativar Notificações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>Erro ao carregar notificações. Tente novamente mais tarde.</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl bg-muted/20">
          <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum lembrete</h3>
          <p className="text-muted-foreground mt-1 mb-4">Você ainda não possui notificações agendadas.</p>
          <Button variant="outline" onClick={handleCreate}>Criar primeiro lembrete</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notifications.map((n) => {
            const scheduledDate = new Date(n.scheduled_for);
            const recurrenceLabel = getRecurrenceLabel(n);

            return (
              <Card key={n.id} className="overflow-hidden transition-all hover:shadow-md border border-border/50">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1 flex-1 pr-2">{n.title}</h3>
                    {getStatusBadge(n.status, scheduledDate)}
                  </div>
                  <p className="text-muted-foreground text-sm flex-1 mb-4 line-clamp-2">
                    {n.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Agendado para</span>
                      <span className="text-sm font-medium">
                        {format(scheduledDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {recurrenceLabel && (
                        <span className="text-xs text-primary flex items-center gap-1 mt-0.5">
                          <Repeat className="h-3 w-3" />
                          {recurrenceLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(n)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(n.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NotificationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
        editingNotification={editingNotification}
      />
    </div>
  );
}
