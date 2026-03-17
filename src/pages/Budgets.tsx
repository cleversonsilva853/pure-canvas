import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBudgets, useCategories, useTransactions } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, PieChart, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const Budgets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const { data: budgets = [], isLoading } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        category_id: categoryId,
        amount: parseFloat(amount),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      if (error) throw error;
      toast.success('Orçamento definido!');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDialogOpen(false);
      setCategoryId('');
      setAmount('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Orçamento excluído');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Defina limites de gastos por categoria</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo orçamento</span></Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Limite mensal</Label>
                <Input type="number" step="0.01" placeholder="500,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Definir orçamento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : budgets.length === 0 ? (
        <div className="text-center py-8">
          <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum orçamento definido. Crie categorias de despesa e defina limites!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget, i) => {
            const spent = transactions
              .filter(t => t.type === 'expense' && t.category_id === budget.category_id)
              .reduce((sum, t) => sum + Number(t.amount), 0);
            const limit = Number(budget.amount);
            const percent = limit > 0 ? (spent / limit) * 100 : 0;
            const isExceeded = percent > 100;

            return (
              <motion.div key={budget.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className={`hover:shadow-md transition-shadow ${isExceeded ? 'border-destructive/50' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-medium">{(budget as any).category?.name || 'Categoria'}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(budget.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gasto</span>
                        <span className={isExceeded ? 'text-destructive font-semibold' : ''}>
                          {formatCurrency(spent)} / {formatCurrency(limit)}
                        </span>
                      </div>
                      <Progress value={Math.min(percent, 100)} className={`h-2 ${isExceeded ? '[&>div]:bg-destructive' : ''}`} />
                      <p className={`text-xs ${isExceeded ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {isExceeded ? `Excedido em ${formatCurrency(spent - limit)}` : `${formatCurrency(limit - spent)} restante`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Budgets;
