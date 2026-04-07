import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, CheckCircle2, Clock, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useBusinessContasAPagar,
  useCreateBusinessContaAPagar,
  useUpdateBusinessContaAPagar,
  useDeleteBusinessContaAPagar,
} from '@/hooks/useBusinessContasAPagar';
import { useBusinessAccounts } from '@/hooks/useBusinessData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getTodayInputDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const BusinessContasAPagar = () => {
  const { user } = useAuth();
  const { data: contas = [], isLoading } = useBusinessContasAPagar();
  const { data: businessAccounts = [] } = useBusinessAccounts();
  const queryClient = useQueryClient();

  const createMutation = useCreateBusinessContaAPagar();
  const updateMutation = useUpdateBusinessContaAPagar();
  const deleteMutation = useDeleteBusinessContaAPagar();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(getTodayInputDate());
  const [dueDate, setDueDate] = useState('');
  const [observation, setObservation] = useState('');

  // Pay modal states
  const [payOpen, setPayOpen] = useState(false);
  const [selectedPayId, setSelectedPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payName, setPayName] = useState('');
  const [payDate, setPayDate] = useState(getTodayInputDate());
  const [payAccountId, setPayAccountId] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const resetForm = () => {
    setName('');
    setAmount('');
    setStartDate(getTodayInputDate());
    setDueDate('');
    setObservation('');
  };

  const handleOpenPayModal = (c: any) => {
    setSelectedPayId(c.id);
    setPayAmount(String(c.amount));
    setPayName(c.name);
    setPayDate(getTodayInputDate());
    setPayAccountId('');
    setPayOpen(true);
  };

  const handleSubmit = () => {
    if (!name || !amount || !dueDate) return;
    createMutation.mutate(
      { name, amount: parseFloat(amount), start_date: startDate, due_date: dueDate, observation: observation || undefined },
      { onSuccess: () => { resetForm(); setOpen(false); } }
    );
  };

  const handlePayConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPayId) return;

    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!payAccountId) {
      toast.error('Selecione uma conta empresarial para debitar');
      return;
    }

    setIsPaying(true);
    try {
      const acc = businessAccounts.find((a: any) => a.id === payAccountId);
      if (!acc) throw new Error('Conta não encontrada');

      const newBalance = Number(acc.balance) - parseFloat(payAmount);
      const { error: balanceError } = await (supabase as any)
        .from('business_accounts')
        .update({ balance: newBalance })
        .eq('id', payAccountId);
      if (balanceError) throw balanceError;

      updateMutation.mutate({ id: selectedPayId, is_paid: true });

      await queryClient.invalidateQueries({ queryKey: ['business_accounts'] });

      toast.success('Conta paga e saldo empresarial atualizado!');
      setPayOpen(false);
      setSelectedPayId(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setIsPaying(false);
    }
  };

  const pendentes = (contas as any[]).filter((c) => !c.is_paid);
  const pagas = (contas as any[]).filter((c) => c.is_paid);
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.amount), 0);
  const totalPago = pagas.reduce((s, c) => s + Number(c.amount), 0);
  const isOverdue = (due: string) => new Date(due + 'T23:59:59') < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar — Empresa</h1>
          <p className="text-muted-foreground text-sm">Gerencie os compromissos financeiros do negócio</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conta a Pagar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Nome / Fornecedor</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Aluguel do escritório" />
              </div>
              <div>
                <Label className="text-sm font-medium">Valor (R$)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Data de Início</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Data de Vencimento</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Observação</Label>
                <Textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Opcional..." />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!name || !amount || !dueDate || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pay Modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayConfirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione a conta empresarial que será debitada para registrar o pagamento.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Pago</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={payName} onChange={(e) => setPayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Conta Empresarial para Débito</Label>
              <Select value={payAccountId} onValueChange={setPayAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {businessAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — R$ {Number(a.balance).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isPaying}>
              {isPaying ? 'Processando...' : 'Confirmar e Descontar Saldo'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">A Pagar</p>
                <p className="text-2xl font-bold">R$ {totalPendente.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{pendentes.length} pendente(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pago</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalPago.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{pagas.length} paga(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (contas as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma conta a pagar cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendentes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Pendentes</h2>
              <div className="space-y-2">
                {pendentes.map((c: any) => (
                  <Card key={c.id} className={isOverdue(c.due_date) ? 'border-destructive/50' : ''}>
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{c.name}</p>
                          {isOverdue(c.due_date) && <Badge variant="destructive" className="text-xs">Vencida</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground flex gap-3 flex-wrap mt-1">
                          <span>Início: {format(new Date(c.start_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                          <span>Vencimento: {format(new Date(c.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                        </div>
                        {c.observation && <p className="text-xs text-muted-foreground mt-1 truncate">{c.observation}</p>}
                      </div>
                      <p className="text-lg font-bold whitespace-nowrap">R$ {Number(c.amount).toFixed(2)}</p>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => handleOpenPayModal(c)}>
                          <CheckCircle2 className="h-5 w-5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pagas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Pagas</h2>
              <div className="space-y-2">
                {pagas.map((c: any) => (
                  <Card key={c.id} className="opacity-70">
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate line-through">{c.name}</p>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Paga</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex gap-3 flex-wrap mt-1">
                          <span>Início: {format(new Date(c.start_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                          <span>Vencimento: {format(new Date(c.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                      <p className="text-lg font-bold whitespace-nowrap line-through">R$ {Number(c.amount).toFixed(2)}</p>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: c.id, is_paid: false })}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessContasAPagar;
