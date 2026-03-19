import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCouple, useCoupleTransactions, useCoupleWallets, usePartnerProfile } from '@/hooks/useCoupleData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, TrendingUp, TrendingDown, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CoupleTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: couple, isLoading } = useCouple();
  const coupleId = couple?.id;
  const { data: transactions = [] } = useCoupleTransactions(coupleId);
  const { data: wallets = [] } = useCoupleWallets(coupleId);

  const partnerId = couple ? (couple.user1_id === user?.id ? couple.user2_id : couple.user1_id) : undefined;
  const { data: partnerProfile } = usePartnerProfile(partnerId);
  const partnerName = partnerProfile?.full_name || 'Parceiro(a)';
  const myName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Eu';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [type, setType] = useState('expense');
  const [expenseType, setExpenseType] = useState('shared');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Geral');
  const [walletId, setWalletId] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [splitPct, setSplitPct] = useState(50);
  const [paidBy, setPaidBy] = useState(user?.id || '');
  const [saving, setSaving] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!couple) return <Navigate to="/couple/invite" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !coupleId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('couple_transactions' as any).insert({
        couple_id: coupleId,
        paid_by: paidBy || user.id,
        type,
        expense_type: expenseType,
        amount: parseFloat(amount),
        description,
        category,
        date,
        wallet_id: walletId || null,
        split_type: splitType,
        split_percentage: splitType === 'equal' ? 50 : splitPct,
      } as any);
      if (error) throw error;
      toast.success('Transação adicionada!');
      queryClient.invalidateQueries({ queryKey: ['couple_transactions'] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('couple_transactions' as any).delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Transação excluída');
      queryClient.invalidateQueries({ queryKey: ['couple_transactions'] });
    }
  };

  const resetForm = () => {
    setType('expense');
    setExpenseType('shared');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Geral');
    setWalletId('');
    setSplitType('equal');
    setSplitPct(50);
    setPaidBy(user?.id || '');
  };

  const filtered = transactions.filter((t: any) =>
    !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['Geral', 'Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Compras', 'Outros'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transações do Casal</h1>
          <p className="text-muted-foreground">Receitas e despesas compartilhadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-pink-500 hover:bg-pink-600">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova transação</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Transação (Casal)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={type === 'expense' ? 'default' : 'outline'} onClick={() => setType('expense')}
                  className={type === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}>Despesa</Button>
                <Button type="button" variant={type === 'income' ? 'default' : 'outline'} onClick={() => setType('income')}
                  className={type === 'income' ? 'bg-accent hover:bg-accent/90' : ''}>Receita</Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={expenseType === 'shared' ? 'default' : 'outline'} onClick={() => setExpenseType('shared')}
                  className={expenseType === 'shared' ? 'bg-pink-500 hover:bg-pink-600' : ''} size="sm">Compartilhado</Button>
                <Button type="button" variant={expenseType === 'personal' ? 'default' : 'outline'} onClick={() => setExpenseType('personal')} size="sm">Pessoal</Button>
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input placeholder="Ex: Supermercado" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Quem pagou</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={user?.id || ''}>{myName}</SelectItem>
                    {partnerId && <SelectItem value={partnerId}>{partnerName}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              {wallets.length > 0 && (
                <div className="space-y-2">
                  <Label>Carteira</Label>
                  <Select value={walletId} onValueChange={setWalletId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {wallets.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {expenseType === 'shared' && (
                <div className="space-y-3 p-3 rounded-xl bg-secondary/50">
                  <Label className="text-xs">Divisão</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={splitType === 'equal' ? 'default' : 'outline'} size="sm" onClick={() => { setSplitType('equal'); setSplitPct(50); }}>50/50</Button>
                    <Button type="button" variant={splitType === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setSplitType('custom')}>Personalizada</Button>
                  </div>
                  {splitType === 'custom' && (
                    <div className="space-y-2">
                      <Slider value={[splitPct]} onValueChange={([v]) => setSplitPct(v)} min={0} max={100} step={5} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{myName}: {splitPct}%</span>
                        <span>{partnerName}: {100 - splitPct}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar transações..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma transação encontrada.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((t: any, i: number) => (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                      {t.type === 'income' ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString('pt-BR')} • {t.paid_by === user?.id ? myName : partnerName}
                        {t.expense_type === 'shared' ? ` • ${t.split_percentage}/${100 - t.split_percentage}` : ' • Pessoal'}
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
    </div>
  );
};

export default CoupleTransactions;
