import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessExpenses, useCreateBusinessExpense, useDeleteBusinessExpense } from '@/hooks/useBusinessData';
import { Plus, Trash2 } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CATEGORIES = ['Ingredientes', 'Aluguel', 'Funcionários', 'Energia', 'Água', 'Embalagens', 'Marketing', 'Manutenção', 'Outros'];

const BusinessExpenses = () => {
  const { data: expenses = [], isLoading } = useBusinessExpenses();
  const createExpense = useCreateBusinessExpense();
  const deleteExpense = useDeleteBusinessExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Outros', amount: '', date: new Date().toISOString().slice(0, 10), observation: '' });

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const dailyTotal = useMemo(() => expenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0), [expenses, today]);
  const monthlyTotal = useMemo(() => expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((s, e) => s + Number(e.amount), 0), [expenses, currentMonth, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense.mutateAsync({ ...form, amount: Number(form.amount) });
    setForm({ name: '', category: 'Outros', amount: '', date: new Date().toISOString().slice(0, 10), observation: '' });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Despesas Empresa</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Despesa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Despesa</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nome</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Valor (R$)</Label><Input required type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Data</Label><Input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Observação</Label><Textarea value={form.observation} onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={createExpense.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Hoje</p><p className="text-xl font-bold">{fmt(dailyTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Mensal</p><p className="text-xl font-bold">{fmt(monthlyTotal)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Despesas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : expenses.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma despesa cadastrada.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{fmt(Number(e.amount))}</TableCell>
                    <TableCell>{new Date(e.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessExpenses;
