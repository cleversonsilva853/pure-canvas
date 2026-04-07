import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, CheckCircle2, Clock, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContasAPagar, useCreateContaAPagar, useUpdateContaAPagar, useDeleteContaAPagar } from '@/hooks/useContasAPagar';
import { useAccounts, useCategories, useBudgets, useCreditCards, useTransactions } from '@/hooks/useFinanceData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getTodayInputDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const ContasAPagar = () => {
  const { user } = useAuth();
  const { data: contas = [], isLoading } = useContasAPagar();
  const { data: personalAccounts = [] } = useAccounts();
  
  // Data for the payment forms
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: creditCards = [] } = useCreditCards();
  const { data: transactions = [] } = useTransactions();

  const queryClient = useQueryClient();

  // Basic Hooks
  const createMutation = useCreateContaAPagar();
  const updateMutation = useUpdateContaAPagar();
  const deleteMutation = useDeleteContaAPagar();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(getTodayInputDate());
  const [dueDate, setDueDate] = useState('');
  const [observation, setObservation] = useState('');

  // Pay modal states
  const [payOpen, setPayOpen] = useState(false);
  const [selectedPayId, setSelectedPayId] = useState<string | null>(null);
  
  // Pay modal Form states
  const [payAmount, setPayAmount] = useState('');
  const [payName, setPayName] = useState('');
  const [payDate, setPayDate] = useState(getTodayInputDate());
  const [payCategoryId, setPayCategoryId] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payCreditCardId, setPayCreditCardId] = useState('none');
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
    setPayCategoryId('');
    setPayAccountId('');
    setPayCreditCardId('none');
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
    if (!payCategoryId) {
      toast.error('Selecione uma categoria');
      return;
    }

    if (!payAccountId && payCreditCardId === 'none') {
      toast.error('Selecione uma conta ou um cartão de crédito');
      return;
    }

    setIsPaying(true);
    try {
      // PERSONAL EXPENSE FLOW
      if (payCategoryId) {
        const budget = budgets.find(b => b.category_id === payCategoryId);
        if (budget) {
          const spent = transactions
            .filter(t => t.type === 'expense' && t.category_id === payCategoryId)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          const totalWithNew = spent + parseFloat(payAmount);
          if (totalWithNew > Number(budget.amount)) {
            const confirm = window.confirm('Fora do seu Orçamento. Tem certeza disso?');
            if (!confirm) {
              setIsPaying(false);
              return;
            }
          }
        }
      }

      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'expense',
        amount: parseFloat(payAmount),
        description: payName,
        date: payDate,
        category_id: payCategoryId || null,
        account_id: payAccountId || null,
        credit_card_id: payCreditCardId !== 'none' ? payCreditCardId : null,
        is_paid: payCreditCardId === 'none',
      });
      if (txError) throw txError;

      if (payAccountId && payCreditCardId === 'none') {
        const acc = personalAccounts.find(a => a.id === payAccountId);
        if (acc) {
          const newBalance = Number(acc.balance) - parseFloat(payAmount);
          await supabase.from('accounts').update({ balance: newBalance }).eq('id', payAccountId);
        }
      }

      updateMutation.mutate({ id: selectedPayId, is_paid: true });

      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      toast.success('Despesa cadastrada e Conta Paga com sucesso!');
      setPayOpen(false);
      setSelectedPayId(null);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setIsPaying(false);
    }
  };

  const pendentes = contas.filter((c: any) => !c.is_paid);
  const pagas = contas.filter((c: any) => c.is_paid);
  const totalPendente = pendentes.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const totalPago = pagas.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const isOverdue = (due: string) => new Date(due + 'T23:59:59') < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus compromissos e agendamentos</p>
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
                <Label className="text-sm font-medium">Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pagamento fornecedor Y" />
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
                  <Label className="text-sm font-medium">Data de Pagamento</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Observação</Label>
                <Textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Opcional..." />
              </div>
              <Button onClick={handleSubmit} disabled={!name || !amount || !dueDate || createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pay Modal with Advanced Expense Form */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayConfirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta ação marcará a conta como paga e criará um registro oficial de despesa no sistema.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
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
              <Input
                placeholder="Ex: Supermercado"
                value={payName}
                onChange={(e) => setPayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={payCategoryId} onValueChange={setPayCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione a Categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.type === 'expense').map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta Origem (Opcional se Cartão)</Label>
              <Select value={payAccountId} onValueChange={setPayAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a Conta" /></SelectTrigger>
                <SelectContent>
                  {personalAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} - R$ {Number(a.balance).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cartão de Crédito (Opcional)</Label>
              <Select value={payCreditCardId} onValueChange={setPayCreditCardId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {creditCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
      ) : contas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma conta a pagar cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pendentes */}
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
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-green-600 hover:text-green-700" 
                          onClick={() => handleOpenPayModal(c)}
                        >
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

          {/* Pagas */}
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
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => updateMutation.mutate({ id: c.id, is_paid: false })}
                        >
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

export default ContasAPagar;
