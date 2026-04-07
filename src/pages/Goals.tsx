import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGoals, useAccounts } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Target, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const Goals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: goals = [], isLoading } = useGoals();
  const { data: accounts = [] } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  // Deposit dialog state
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositGoalCurrent, setDepositGoalCurrent] = useState(0);
  const [depositValue, setDepositValue] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  const activeAccounts = accounts.filter((a: any) => a.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        deadline: deadline || null,
      });
      if (error) throw error;
      toast.success('Meta criada!');
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setDialogOpen(false);
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ocorrido');
    } finally {
      setLoading(false);
    }
  };

  const openDepositDialog = (goalId: string, current: number) => {
    setDepositGoalId(goalId);
    setDepositGoalCurrent(current);
    setDepositValue('');
    setDepositAccountId('');
    setDepositDialogOpen(true);
  };

  const handleDeposit = async () => {
    if (!depositGoalId) return;
    const num = parseFloat(depositValue);
    if (isNaN(num) || num <= 0) return toast.error('Valor inválido');

    if (!depositAccountId) return toast.error('Selecione uma conta');

    const selectedAccount = activeAccounts.find((a: any) => a.id === depositAccountId);
    if (!selectedAccount) return toast.error('Conta não encontrada');

    if (Number(selectedAccount.balance) < num) {
      return toast.error(`Saldo insuficiente. Disponível: ${formatCurrency(Number(selectedAccount.balance))}`);
    }

    setDepositLoading(true);
    try {
      // Update goal
      const { error: goalError } = await supabase
        .from('goals')
        .update({ current_amount: depositGoalCurrent + num })
        .eq('id', depositGoalId);
      if (goalError) throw goalError;

      // Deduct from account
      const { error: accountError } = await supabase
        .from('accounts')
        .update({ balance: Number(selectedAccount.balance) - num })
        .eq('id', depositAccountId);
      if (accountError) throw accountError;

      toast.success(`${formatCurrency(num)} adicionado à meta!`);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDepositDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao depositar');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Meta excluída');
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  };

  // Total balance across all active accounts
  const totalBalance = activeAccounts.reduce((sum: number, a: any) => sum + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Metas Financeiras</h1>
          <p className="text-muted-foreground">Acompanhe seus objetivos de economia</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova meta</span></Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da meta</Label>
                <Input placeholder="Ex: Viagem para Europa" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Valor objetivo</Label>
                <Input type="number" step="0.01" placeholder="10000,00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Valor atual (opcional)</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prazo (opcional)</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Criar meta'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balanço Geral */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Balanço geral das contas</p>
            <p className="text-lg font-bold">{formatCurrency(totalBalance)}</p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma meta criada. Defina seus objetivos financeiros!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal, i) => {
            const target = Number(goal.target_amount);
            const current = Number(goal.current_amount);
            const percent = target > 0 ? (current / target) * 100 : 0;
            const isCompleted = percent >= 100;

            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className={`hover:shadow-md transition-shadow ${isCompleted ? 'border-accent/50' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Target className={`h-5 w-5 ${isCompleted ? 'text-accent' : 'text-primary'}`} />
                        <p className="font-medium">{goal.name}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{Math.round(percent)}%</span>
                        <span>{formatCurrency(current)} / {formatCurrency(target)}</span>
                      </div>
                      <Progress value={Math.min(percent, 100)} className={`h-2 ${isCompleted ? '[&>div]:bg-accent' : ''}`} />
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {!isCompleted && (
                        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => openDepositDialog(goal.id, current)}>
                          <TrendingUp className="h-3.5 w-3.5" />
                          Depositar
                        </Button>
                      )}
                      {isCompleted && (
                        <p className="text-sm text-accent font-medium text-center">🎉 Meta alcançada!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Deposit Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Depositar na Meta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor do depósito</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Retirar da conta</Label>
              <Select value={depositAccountId} onValueChange={setDepositAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{account.name}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {formatCurrency(Number(account.balance))}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {depositAccountId && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo atual:</span>
                  <span>{formatCurrency(Number(activeAccounts.find((a: any) => a.id === depositAccountId)?.balance || 0))}</span>
                </div>
                {depositValue && !isNaN(parseFloat(depositValue)) && parseFloat(depositValue) > 0 && (
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Saldo após depósito:</span>
                    <span className={Number(activeAccounts.find((a: any) => a.id === depositAccountId)?.balance || 0) - parseFloat(depositValue) < 0 ? 'text-destructive' : ''}>
                      {formatCurrency(Number(activeAccounts.find((a: any) => a.id === depositAccountId)?.balance || 0) - parseFloat(depositValue))}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button className="w-full" onClick={handleDeposit} disabled={depositLoading}>
              {depositLoading ? 'Depositando...' : 'Confirmar depósito'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Goals;
