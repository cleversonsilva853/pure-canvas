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
  context?: 'personal' | 'business';
};

const recurrenceOptions = [
  { value: 'none', label: 'Não repetir' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekdays', label: 'Dias da Semana' },
  { value: 'monthly', label: 'Mensalmente' },
];

const WEEK_DAYS = [
  { value: '0', label: 'Dom' },
  { value: '1', label: 'Seg' },
  { value: '2', label: 'Ter' },
  { value: '3', label: 'Qua' },
  { value: '4', label: 'Qui' },
  { value: '5', label: 'Sex' },
  { value: '6', label: 'Sáb' },
];

export const NotificationForm = ({ open, onOpenChange, onSuccess, editingNotification, context = 'personal' }: NotificationFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
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

      const rec = editingNotification.recurrence || "none";
      setRecurrence(['weekly', 'yearly'].includes(rec) ? 'none' : rec);

      if (editingNotification.weekdays_config) {
        try {
          setSelectedWeekdays(JSON.parse(editingNotification.weekdays_config));
        } catch {
          setSelectedWeekdays([]);
        }
      } else {
        setSelectedWeekdays([]);
      }
    } else {
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setRecurrence("none");
      setSelectedWeekdays([]);
    }
  }, [editingNotification, open]);

  const toggleWeekday = (val: string) => {
    setSelectedWeekdays(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !date || !time) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    if (recurrence === 'weekdays' && selectedWeekdays.length === 0) {
      toast.error("Selecione pelo menos um dia da semana.");
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDateObj = new Date(year, month - 1, day, hours, minutes, 0);
    if (isNaN(scheduledDateObj.getTime()) || scheduledDateObj <= new Date()) {
      toast.error("A data e hora agendada deve ser no futuro.");
      return;
    }

    setLoading(true);

    try {
      const scheduled_for = scheduledDateObj.toISOString();
      const weekdays_config = recurrence === 'weekdays'
        ? JSON.stringify(selectedWeekdays.sort())
        : null;

      const bodyArgs = editingNotification
        ? { title, description, scheduled_for, status: 'pending', recurrence, weekdays_config, context }
        : { title, description, scheduled_for, status: 'pending', recurrence, weekdays_config, context, user_id: session?.user?.id };

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
            <Select
              value={recurrence}
              onValueChange={(val) => {
                setRecurrence(val);
                if (val !== 'weekdays') setSelectedWeekdays([]);
              }}
            >
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

          {recurrence === 'weekdays' && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Selecione os dias da semana</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {WEEK_DAYS.map((d) => {
                  const isSelected = selectedWeekdays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWeekday(d.value)}
                      className={[
                        'w-10 h-10 rounded-full text-sm font-medium border transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary hover:text-primary',
                      ].join(' ')}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {recurrence === 'monthly' && (
            <p className="text-xs text-muted-foreground">
              A notificação será repetida todo mês no mesmo dia da data selecionada.
            </p>
          )}

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
