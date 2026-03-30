import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarClock, Repeat } from "lucide-react";

type NotificationFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingNotification?: any;
};

const recurrenceOptions = [
  { value: 'none', label: 'Não repetir' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekdays', label: 'Dias da semana' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
  { value: 'yearly', label: 'Anualmente' },
];

export const NotificationForm = ({ open, onOpenChange, onSuccess, editingNotification }: NotificationFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    if (editingNotification) {
      setTitle(editingNotification.title);
      setDescription(editingNotification.description);
      const scheduledDate = new Date(editingNotification.scheduled_for);
      
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
      
      const hours = String(scheduledDate.getHours()).padStart(2, '0');
      const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
      setRecurrence(editingNotification.recurrence || "none");
    } else {
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setRecurrence("none");
    }
  }, [editingNotification, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !date || !time) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    const scheduledDateObj = new Date(`${date}T${time}`);
    if (scheduledDateObj <= new Date()) {
      toast.error("A data e hora agendada deve ser no futuro.");
      return;
    }

    setLoading(true);

    try {
      const scheduled_for = scheduledDateObj.toISOString();
      const bodyArgs = editingNotification 
        ? { title, description, scheduled_for, status: 'pending', recurrence }
        : { title, description, scheduled_for, status: 'pending', recurrence, user_id: session?.user?.id };

      let submitError = null;

      if (editingNotification) {
        const { error } = await supabase
          .from('notifications' as any)
          .update(bodyArgs)
          .eq('id', editingNotification.id);
        submitError = error;
      } else {
        const { error } = await supabase
          .from('notifications' as any)
          .insert([bodyArgs]);
        submitError = error;
      }

      if (submitError) throw submitError;

      toast.success(editingNotification ? "Notificação atualizada!" : "Notificação criada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar notificação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingNotification ? "Editar Lembrete" : "Novo Lembrete"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pagar fatura"
              maxLength={50}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagar a fatura do cartão de crédito Itaú antes do vencimento."
              rows={3}
              maxLength={200}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> Data
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurrence" className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" /> Repetir
            </Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger id="recurrence">
                <SelectValue placeholder="Selecione a recorrência" />
              </SelectTrigger>
              <SelectContent>
                {recurrenceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
