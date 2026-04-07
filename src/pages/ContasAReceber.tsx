import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, CheckCircle2, Clock, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContasAReceber, useCreateContaAReceber, useUpdateContaAReceber, useDeleteContaAReceber } from '@/hooks/useContasAReceber';
import { useAccounts } from '@/hooks/useFinanceData';
import { useBusinessAccounts } from '@/hooks/useBusinessData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const ContasAReceber = () => {
  const { data: contas = [], isLoading } = useContasAReceber();
  const { data: personalAccounts = [] } = useAccounts();
  const { data: businessAccounts = [] } = useBusinessAccounts();
  const queryClient = useQueryClient();

  const createMutation = useCreateContaAReceber();
  const updateMutation = useUpdateContaAReceber();
  const deleteMutation = useDeleteContaAReceber();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [observation, setObservation] = useState('');

  // Receive modal states
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedReceiveId, setSelectedReceiveId] = useState<string | null>(null);
  const [selectedReceiveAmount, setSelectedReceiveAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  const resetForm = () => {
    setName('');
    setAmount('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setDueDate('');
    setObservation('');
  };

  const handleSubmit = () => {
    if (!name || !amount || !dueDate) return;
    createMutation.mutate(
      { name, amount: parseFloat(amount), start_date: startDate, due_date: dueDate, observation: observation || undefined },
      { onSuccess: () => { resetForm(); setOpen(false); } }
    );
  };

  const handleReceiveConfirm = async () => {
    if (!selectedAccountId || !selectedReceiveId) {
      toast.error('Selecione uma conta de destino');
      return;
    }

    setIsReceiving(true);
    try {
      let currentBalance = 0;
      let tableName = '';
      
      const pAcc = personalAccounts.find(a => a.id === selectedAccountId);
      if (pAcc) {
        currentBalance = Number(pAcc.balance);
        tableName = 'accounts';
      } else {
        const bAcc = businessAccounts.find(a => a.id === selectedAccountId);
        if (bAcc) {
          currentBalance = Number(bAcc.balance);
          tableName = 'business_accounts';
        } else {
          throw new Error('Conta não encontrada');
        }
      }

      // Update the balance
      const newBalance = currentBalance + selectedReceiveAmount;
      const { error: balanceError } = await supabase
        .from(tableName)
        .update({ balance: newBalance })
        .eq('id', selectedAccountId);

      if (balanceError) throw balanceError;

      // Mark as received
      updateMutation.mutate({ id: selectedReceiveId, is_received: true });

      // Invalidate queries to refresh system balances
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['business_accounts'] });

      toast.success('Recebimento confirmado e saldo atualizado!');
      setReceiveOpen(false);
      setSelectedAccountId('');
      setSelectedReceiveId(null);
      setSelectedReceiveAmount(0);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar o recebimento');
    } finally {
      setIsReceiving(false);
    }
  };

  const pendentes = contas.filter(c => !c.is_received);
  const recebidas = contas.filter(c => c.is_received);
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.amount), 0);
  const totalRecebido = recebidas.reduce((s, c) => s + Number(c.amount), 0);

  const isOverdue = (due: string) => new Date(due + 'T23:59:59') < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas a Receber</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus recebíveis</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conta a Receber</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pagamento cliente X" />
              </div>
              <div>
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data de Início</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Data de Recebimento</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Observação</label>
                <Textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Opcional..." />
              </div>
              <Button onClick={handleSubmit} disabled={!name || !amount || !dueDate || createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Receive Modal */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione em qual conta este valor de <strong>R$ {selectedReceiveAmount.toFixed(2)}</strong> foi recebido:
            </p>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta de destino" />
              </SelectTrigger>
              <SelectContent>
                {businessAccounts.length > 0 && (
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Contas Empresariais
                  </div>
                )}
                {businessAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - R$ {Number(acc.balance).toFixed(2)}
                  </SelectItem>
                ))}
                
                {personalAccounts.length > 0 && (
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-2 border-t">
                    Contas Pessoais
                  </div>
                )}
                {personalAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - R$ {Number(acc.balance).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="w-full" 
              onClick={handleReceiveConfirm} 
              disabled={isReceiving || !selectedAccountId}
            >
              {isReceiving ? 'Processando...' : 'Confirmar e Atualizar Saldo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
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
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{recebidas.length} recebida(s)</p>
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
            Nenhuma conta a receber cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Pendentes</h2>
              <div className="space-y-2">
                {pendentes.map(c => (
                  <Card key={c.id} className={isOverdue(c.due_date) ? 'border-destructive/50' : ''}>
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{c.name}</p>
                          {isOverdue(c.due_date) && <Badge variant="destructive" className="text-xs">Atrasada</Badge>}
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
                          onClick={() => {
                            setSelectedReceiveId(c.id);
                            setSelectedReceiveAmount(Number(c.amount));
                            setReceiveOpen(true);
                          }}
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

          {/* Recebidas */}
          {recebidas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Recebidas</h2>
              <div className="space-y-2">
                {recebidas.map(c => (
                  <Card key={c.id} className="opacity-70">
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate line-through">{c.name}</p>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Recebida</Badge>
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
                          onClick={() => updateMutation.mutate({ id: c.id, is_received: false })}
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

export default ContasAReceber;
