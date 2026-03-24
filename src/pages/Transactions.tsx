import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransactions, useAccounts, useCategories, useBudgets, useCreditCards, useCouplePartner } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, TrendingUp, TrendingDown, Search, Filter, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const Transactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'personal' | 'couple'>('personal');

  const { data: transactions = [], isLoading } = useTransactions(undefined, undefined, activeTab);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: creditCards = [] } = useCreditCards();
  const { data: partner } = useCouplePartner();

  // Form state
  const [type, setType] = useState<string>('expense');
  const [contextType, setContextType] = useState<'personal' | 'couple'>('personal');
  const [paidBy, setPaidBy] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [loading, setLoading] = useState(false);

  // Default contextType based on activeTab
  useEffect(() => {
    if (dialogOpen) {
      setContextType(activeTab);
      if (activeTab === 'couple' && user) {
        setPaidBy(user.id);
      }
    }
  }, [dialogOpen, activeTab, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check budget if it's an expense
    if (type === 'expense' && categoryId) {
      const budget = budgets.find(b => b.category_id === categoryId);
      if (budget) {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category_id === categoryId)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalWithNew = spent + parseFloat(amount);
        if (totalWithNew > Number(budget.amount)) {
          const confirm = window.confirm('Fora do seu Orçamento tem certeza disso?');
          if (!confirm) return;
        }
      }
    }

    setLoading(true);

    try {
      const isCard = creditCardId && creditCardId !== 'none';
      const isPaid = !isCard;

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type,
        amount: parseFloat(amount),
        description,
        date,
        category_id: categoryId || null,
        account_id: accountId || null,
        credit_card_id: isCard ? creditCardId : null,
        is_paid: isPaid,
        context_type: contextType,
        paid_by: contextType === 'couple' ? (paidBy || user.id) : null,
      });
      if (error) throw error;

      // Update account balance only if NOT using credit card and IT'S PERSONAL OR I PAID IT
      if (accountId && !isCard) {
        // Only deduct if context is personal or (couple AND I paid it)
        const isMyExpense = contextType === 'personal' || (contextType === 'couple' && paidBy === user.id);
        const isMyIncome = type === 'income';

        if (isMyExpense || isMyIncome) {
          const account = accounts.find(a => a.id === accountId);
          if (account) {
            const newBalance = type === 'income'
              ? Number(account.balance) + parseFloat(amount)
              : Number(account.balance) - parseFloat(amount);
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId);
          }
        }
      }

      toast.success('Transação adicionada!');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Transação excluída');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  };

  const resetForm = () => {
    setType('expense');
    setContextType(activeTab);
    setPaidBy(user?.id || '');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
    setAccountId('');
    setCreditCardId('');
  };

  const filtered = transactions.filter((t) => {
    const matchSearch = !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || t.type === filterType;
    return matchSearch && matchType;
  });

  const coupleStats = useMemo(() => {
    if (activeTab !== 'couple' || !user || !transactions) return null;
    let myTotal = 0;
    let partnerTotal = 0;
    
    transactions.forEach(t => {
      if (t.type === 'expense') {
        if (t.paid_by === user.id) myTotal += Number(t.amount);
        else if (t.paid_by) partnerTotal += Number(t.amount);
      }
    });

    const half = (myTotal + partnerTotal) / 2;
    const balance = myTotal - half;

    return { myTotal, partnerTotal, balance };
  }, [transactions, activeTab, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova transação</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === 'expense' ? 'default' : 'outline'}
                  onClick={() => setType('expense')}
                  className={type === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  Despesa
                </Button>
                <Button
                  type="button"
                  variant={type === 'income' ? 'default' : 'outline'}
                  onClick={() => setType('income')}
                  className={type === 'income' ? 'bg-accent hover:bg-accent/90' : ''}
                >
                  Receita
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Contexto</Label>
                <Select value={contextType} onValueChange={(v: any) => setContextType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Meu Financeiro</SelectItem>
                    <SelectItem value="couple">Despesa de Casal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contextType === 'couple' && (
                <div className="space-y-2">
                  <Label>Quem pagou?</Label>
                  <Select value={paidBy} onValueChange={setPaidBy} required={contextType === 'couple'}>
                    <SelectTrigger><SelectValue placeholder="Selecione quem pagou" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user?.id || ''}>Eu</SelectItem>
                      {partner && <SelectItem value={partner.user_id}>{partner.profiles?.full_name || 'Cônjuge'}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Supermercado"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === type).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {(!contextType || contextType === 'personal' || (contextType === 'couple' && paidBy === user?.id)) && (
                <div className="space-y-2">
                  <Label>Conta {type === 'expense' && '(Opcional se usar cartão)'}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {type === 'expense' && (!contextType || contextType === 'personal' || (contextType === 'couple' && paidBy === user?.id)) && (
                <div className="space-y-2">
                  <Label>Cartão de Crédito (Opcional)</Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {creditCards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ao usar cartão, o saldo da conta não será descontado agora.
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'personal' | 'couple')} className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-2">
          <TabsTrigger value="personal">Meu Financeiro</TabsTrigger>
          <TabsTrigger value="couple">Casal</TabsTrigger>
        </TabsList>

        {activeTab === 'couple' && coupleStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total pago por mim</div>
                <div className="text-2xl font-bold text-accent">{formatCurrency(coupleStats.myTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total pago por {partner?.profiles?.full_name || 'Cônjuge'}</div>
                <div className="text-2xl font-bold">{formatCurrency(coupleStats.partnerTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 border-l-4 border-l-primary">
                <div className="text-sm text-muted-foreground mb-1">Acerto de Contas</div>
                {coupleStats.balance > 0 ? (
                  <div className="text-xl font-bold text-accent">Receber: {formatCurrency(coupleStats.balance)}</div>
                ) : coupleStats.balance < 0 ? (
                  <div className="text-xl font-bold text-destructive">Você deve: {formatCurrency(Math.abs(coupleStats.balance))}</div>
                ) : (
                  <div className="text-xl font-bold text-muted-foreground">Tudo quite</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <TabsContent value={activeTab} className="mt-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma transação encontrada. Comece adicionando sua primeira transação!
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                          {t.type === 'income' ? (
                            <TrendingUp className="h-4 w-4 text-accent" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            {t.description || 'Sem descrição'}
                            {t.context_type === 'couple' && activeTab === 'couple' && (
                              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-[10px] font-normal">
                                {t.paid_by === user?.id ? 'Pago por mim' : `Pago por ${partner?.profiles?.full_name || 'Cônjuge'}`}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.date).toLocaleDateString('pt-BR')}
                            {(t.category as any)?.name ? ` • ${(t.category as any).name}` : ''}
                            {(t.account as any)?.name ? ` • ${(t.account as any).name}` : ''}
                            {(t as any).card?.name ? ` • 💳 ${(t as any).card.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-accent' : 'text-destructive'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Transactions;
