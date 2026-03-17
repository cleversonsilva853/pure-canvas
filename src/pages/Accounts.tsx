import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAccounts } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, Landmark, Wallet, Smartphone, Banknote, Trash2,
  ArrowRightLeft, TrendingUp, Eye, EyeOff, Edit2, Check, X,
} from 'lucide-react';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const accountIcons: Record<string, any> = {
  checking: Landmark,
  savings: Banknote,
  cash: Wallet,
  pix: Smartphone,
  investment: TrendingUp,
};

const accountLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  pix: 'PIX',
  investment: 'Investimento',
};

const accountTypeColors: Record<string, string> = {
  checking: 'bg-primary/10 text-primary',
  savings: 'bg-accent/10 text-accent',
  cash: 'bg-warning/10 text-warning',
  pix: 'bg-[hsl(280,67%,60%)]/10 text-[hsl(280,67%,60%)]',
  investment: 'bg-[hsl(190,80%,50%)]/10 text-[hsl(190,80%,50%)]',
};

const Accounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading } = useAccounts();

  // New account dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');

  // Hide balances
  const [showBalances, setShowBalances] = useState(true);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + Number(a.balance), 0),
    [accounts]
  );

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, typeof accounts> = {};
    accounts.forEach(acc => {
      if (!groups[acc.type]) groups[acc.type] = [];
      groups[acc.type].push(acc);
    });
    return groups;
  }, [accounts]);

  const groupTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(groupedAccounts).forEach(([type, accs]) => {
      totals[type] = accs.reduce((sum, a) => sum + Number(a.balance), 0);
    });
    return totals;
  }, [groupedAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name,
        type,
        balance: parseFloat(balance) || 0,
      });
      if (error) throw error;
      toast.success('Conta criada!');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      setName('');
      setType('checking');
      setBalance('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fromAccountId || !toAccountId) return;
    if (fromAccountId === toAccountId) {
      toast.error('Selecione contas diferentes');
      return;
    }
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);
    if (!fromAccount || !toAccount) return;

    setTransferLoading(true);
    try {
      // Update balances
      const { error: err1 } = await supabase
        .from('accounts')
        .update({ balance: Number(fromAccount.balance) - amount })
        .eq('id', fromAccountId);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from('accounts')
        .update({ balance: Number(toAccount.balance) + amount })
        .eq('id', toAccountId);
      if (err2) throw err2;

      // Create transfer transactions
      await supabase.from('transactions').insert([
        {
          user_id: user.id,
          account_id: fromAccountId,
          type: 'transfer' as any,
          amount,
          description: `Transferência para ${toAccount.name}`,
          date: new Date().toISOString().split('T')[0],
        },
        {
          user_id: user.id,
          account_id: toAccountId,
          type: 'transfer' as any,
          amount,
          description: `Transferência de ${fromAccount.name}`,
          date: new Date().toISOString().split('T')[0],
        },
      ]);

      toast.success(`${formatCurrency(amount)} transferido de ${fromAccount.name} para ${toAccount.name}`);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setTransferOpen(false);
      setFromAccountId('');
      setToAccountId('');
      setTransferAmount('');
    } catch (err: any) {
      toast.error(err.message || 'Erro na transferência');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleEdit = (account: typeof accounts[0]) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditBalance(String(account.balance));
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from('accounts')
      .update({ name: editName, balance: parseFloat(editBalance) || 0 })
      .eq('id', id);
    if (error) toast.error('Erro ao salvar');
    else {
      toast.success('Conta atualizada');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Conta excluída');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  };

  const displayValue = (value: number) => showBalances ? formatCurrency(value) : '•••••';

  // Order of type groups
  const typeOrder = ['checking', 'savings', 'pix', 'cash', 'investment'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground">Gerencie suas contas e faça transferências</p>
        </div>
        <div className="flex gap-2">
          {accounts.length >= 2 && (
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Transferir</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Transferência entre Contas</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div className="space-y-2">
                    <Label>De (origem)</Label>
                    <Select value={fromAccountId} onValueChange={setFromAccountId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a conta de origem" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} — {formatCurrency(Number(a.balance))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Para (destino)</Label>
                    <Select value={toAccountId} onValueChange={setToAccountId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a conta de destino" /></SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.id !== fromAccountId).map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} — {formatCurrency(Number(a.balance))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={transferLoading}>
                    <ArrowRightLeft className="h-4 w-4" />
                    {transferLoading ? 'Transferindo...' : 'Confirmar Transferência'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova conta</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Ex: Nubank" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(accountLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saldo inicial</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={balance} onChange={(e) => setBalance(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Criar conta'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-primary text-primary-foreground overflow-hidden relative">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Patrimônio Total</p>
              <p className="text-3xl font-bold mt-1">{displayValue(totalBalance)}</p>
              <p className="text-sm opacity-70 mt-1">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} ativa{accounts.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="p-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              {showBalances ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma conta cadastrada.</p>
            <p className="text-sm text-muted-foreground">
              Adicione suas contas bancárias, carteiras e investimentos para ter uma visão completa do seu patrimônio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {typeOrder
            .filter(t => groupedAccounts[t]?.length > 0)
            .map(accountType => {
              const accs = groupedAccounts[accountType];
              const Icon = accountIcons[accountType] || Wallet;
              const colorClass = accountTypeColors[accountType] || 'bg-muted text-muted-foreground';

              return (
                <motion.div
                  key={accountType}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">{accountLabels[accountType]}</h2>
                        <p className="text-sm text-muted-foreground">
                          {accs.length} conta{accs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-lg">{displayValue(groupTotals[accountType] || 0)}</p>
                  </div>

                  {/* Account Cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {accs.map((account, i) => {
                      const isEditing = editingId === account.id;

                      return (
                        <motion.div
                          key={account.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Card className="hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: account.color || '#3B82F6' }}>
                            <CardContent className="p-4">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-9"
                                    autoFocus
                                  />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editBalance}
                                    onChange={(e) => setEditBalance(e.target.value)}
                                    className="h-9"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleSaveEdit(account.id)}>
                                      <Check className="h-3.5 w-3.5" /> Salvar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="font-medium">{account.name}</p>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(account)}>
                                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(account.id)}>
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className={`text-xl font-bold ${Number(account.balance) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                    {displayValue(Number(account.balance))}
                                  </p>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default Accounts;
