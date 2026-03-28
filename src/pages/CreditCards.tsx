import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreditCards, useTransactions, useUnpaidCreditCardTransactions, useAccounts } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, CreditCard as CreditCardIcon, Trash2, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: cards = [], isLoading: loadingCards } = useCreditCards();
  const { data: unpaidTransactions = [], isLoading: loadingTrans } = useUnpaidCreditCardTransactions();
  const { data: accounts = [] } = useAccounts();
  const isLoading = loadingCards || loadingTrans;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [targetAccountId, setTargetAccountId] = useState('');
  
  const [name, setName] = useState('');
  const [limitTotal, setLimitTotal] = useState('');
  const [closingDay, setClosingDay] = useState('1');
  const [dueDay, setDueDay] = useState('10');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('credit_cards').insert({
        user_id: user.id,
        name,
        limit_total: parseFloat(limitTotal),
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
      });
      if (error) throw error;
      toast.success('Cartão cadastrado!');
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      setDialogOpen(false);
      setName('');
      setLimitTotal('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar cartão');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Cartão excluído');
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
    }
  };

  const handlePayBill = async () => {
    if (!selectedCardId || !targetAccountId) return;
    const card = cards.find(c => c.id === selectedCardId);
    const amountToPay = unpaidTransactions
      .filter(t => t.credit_card_id === selectedCardId)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (amountToPay <= 0) {
      toast.error('Não há faturas pendentes neste cartão');
      return;
    }

    setLoading(true);
    try {
      // 1. Create payment transaction
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user?.id,
        type: 'expense',
        amount: amountToPay,
        description: `Pagamento Fatura: ${card?.name}`,
        account_id: targetAccountId,
        date: new Date().toISOString().split('T')[0],
        is_paid: true
      });
      if (txError) throw txError;

      // 2. Update account balance
      const account = accounts.find(a => a.id === targetAccountId);
      if (account) {
        await supabase.from('accounts').update({
          balance: Number(account.balance) - amountToPay
        }).eq('id', targetAccountId);
      }

      // 3. Mark card transactions as paid
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_paid: true })
        .eq('credit_card_id', selectedCardId)
        .eq('is_paid', false);
      if (updateError) throw updateError;

      toast.success('Fatura paga com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setPayDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pagar fatura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Controle seus cartões e faturas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo cartão</span></Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Cartão</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do cartão</Label>
                <Input placeholder="Ex: Nubank" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Limite total</Label>
                <Input type="number" step="0.01" placeholder="5000,00" value={limitTotal} onChange={(e) => setLimitTotal(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dia de fechamento</Label>
                  <Input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Dia de vencimento</Label>
                  <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Cadastrar cartão'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : cards.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum cartão cadastrado.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => {
            const usedAmount = unpaidTransactions
              .filter(t => t.credit_card_id === card.id)
              .reduce((sum, t) => sum + Number(t.amount), 0);
            
            const limitTotalNum = Number(card.limit_total);
            const usedPercent = limitTotalNum > 0 ? (usedAmount / limitTotalNum) * 100 : 0;
            const available = limitTotalNum - usedAmount;

            return (
              <motion.div key={card.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="hover:shadow-md transition-shadow overflow-hidden border-l-4" style={{ borderLeftColor: card.color || '#3b82f6' }}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                          <CreditCardIcon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-semibold">{card.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-accent"
                          onClick={() => {
                            setSelectedCardId(card.id);
                            setPayDialogOpen(true);
                          }}
                          disabled={usedAmount <= 0}
                          title="Pagar Fatura"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(card.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-muted-foreground">Fatura Atual</p>
                          <p className="text-lg font-bold">{formatCurrency(usedAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Disponível</p>
                          <p className="text-sm font-medium text-emerald-500">{formatCurrency(available)}</p>
                        </div>
                      </div>
                      <Progress value={Math.min(usedPercent, 100)} className={`h-2 ${usedPercent > 90 ? '[&>div]:bg-destructive' : ''}`} />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Fecha dia {card.closing_day}</span>
                        <span>Vence dia {card.due_day}</span>
                        <span className="font-medium text-primary">{formatCurrency(limitTotalNum)} total</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pay Bill Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pagar Fatura</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <p className="text-sm text-muted-foreground">Valor a pagar</p>
              <p className="text-2xl font-bold text-primary">
                {selectedCardId && formatCurrency(
                  unpaidTransactions
                    .filter(t => t.credit_card_id === selectedCardId)
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Selecione a conta para pagamento</Label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(Number(acc.balance))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-4" onClick={handlePayBill} disabled={loading || !targetAccountId}>
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditCards;
