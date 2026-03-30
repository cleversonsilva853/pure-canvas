import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Trash2, Calendar, Clock, AlertCircle, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Notifications = () => {
  const { notifications, isLoading, createNotification, updateNotification, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<Notification | null>(null);
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'enviado'>('todos');
  
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    data: '',
    hora: ''
  });

  const handleEdit = (notif: Notification) => {
    setEditingNotif(notif);
    const [d, h] = notif.data_hora.split('T');
    setForm({
      titulo: notif.titulo,
      descricao: notif.descricao || '',
      data: d,
      hora: h.substring(0, 5)
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data_hora = `${form.data}T${form.hora}:00`;
    
    if (editingNotif) {
      await updateNotification.mutateAsync({
        id: editingNotif.id,
        titulo: form.titulo,
        descricao: form.descricao,
        data_hora
      });
    } else {
      await createNotification.mutateAsync({
        titulo: form.titulo,
        descricao: form.descricao,
        data_hora
      });
    }

    setForm({ titulo: '', descricao: '', data: '', hora: '' });
    setEditingNotif(null);
    setOpen(false);
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'todos' ? true : n.status === filter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'enviado': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelado': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">Gerencie seus lembretes e avisos push</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Novo Lembrete</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingNotif ? 'Editar Lembrete' : 'Criar Lembrete'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Pagar conta de luz"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (Opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Mais detalhes sobre o lembrete..."
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={form.hora}
                    onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createNotification.isPending}>
                {createNotification.isPending ? 'Salvando...' : 'Agendar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full max-w-sm">
           <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="enviado">Enviados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-secondary mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Nenhuma notificação encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">
                {filter === 'todos' 
                  ? 'Crie seu primeiro lembrete para receber avisos push no seu dispositivo.' 
                  : `Não há notificações com o status "${filter}".`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 rounded-xl bg-primary/10">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold leading-none">{notif.titulo}</p>
                        <Badge variant="outline" className={getStatusColor(notif.status)}>
                          {notif.status.charAt(0).toUpperCase() + notif.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notif.descricao || 'Sem descrição'}
                      </p>
                      <div className="flex items-center gap-4 pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(notif.data_hora.split('T')[0])}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {notif.data_hora.split('T')[1].substring(0, 5)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(notif)}
                      disabled={notif.status !== 'pendente'}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteNotification.mutate(notif.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex gap-4 items-start">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-primary">Sobre as Notificações</p>
            <p className="text-primary/80">
              Para receber as notificações, certifique-se de que permitiu as notificações no seu navegador e que o sistema está instalado como PWA no seu dispositivo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
