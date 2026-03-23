import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFoodPricing, useCreateFoodPricing, useDeleteFoodPricing } from '@/hooks/useBusinessData';
import { Plus, Trash2, Calculator } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const FoodPricing = () => {
  const { data: items = [], isLoading } = useFoodPricing();
  const createItem = useCreateFoodPricing();
  const deleteItem = useDeleteFoodPricing();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', total_quantity: '1000', unit: 'g', total_cost: '', portion_quantity: '100', profit_percentage: '30' });

  const costPerUnit = Number(form.total_cost || 0) / Number(form.total_quantity || 1);
  const portionCost = costPerUnit * Number(form.portion_quantity || 0);
  const salePrice = portionCost * (1 + Number(form.profit_percentage || 0) / 100);
  const profitPerUnit = salePrice - portionCost;

  const calcItem = (item: any) => {
    const cpu = Number(item.total_cost) / Number(item.total_quantity);
    const pc = cpu * Number(item.portion_quantity);
    const sp = pc * (1 + Number(item.profit_percentage) / 100);
    const ppu = sp - pc;
    return { costPerUnit: cpu, portionCost: pc, salePrice: sp, profitPerUnit: ppu };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createItem.mutateAsync({
      name: form.name,
      total_quantity: Number(form.total_quantity),
      unit: form.unit,
      total_cost: Number(form.total_cost),
      portion_quantity: Number(form.portion_quantity),
      profit_percentage: Number(form.profit_percentage),
    });
    setForm({ name: '', total_quantity: '1000', unit: 'g', total_cost: '', portion_quantity: '100', profit_percentage: '30' });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Precificação Food</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Item</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Precificação de Produto</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nome do Produto</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantidade Total</Label><Input required type="number" step="0.01" min="0" value={form.total_quantity} onChange={e => setForm(f => ({ ...f, total_quantity: e.target.value }))} /></div>
                <div><Label>Unidade</Label>
                  <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="kg">Quilos (kg)</SelectItem>
                      <SelectItem value="g">Gramas (g)</SelectItem>
                      <SelectItem value="L">Litros (L)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Custo Total (R$)</Label><Input required type="number" step="0.01" min="0" value={form.total_cost} onChange={e => setForm(f => ({ ...f, total_cost: e.target.value }))} /></div>
              <div><Label>Quantidade por Porção ({form.unit})</Label><Input required type="number" step="0.01" min="0" value={form.portion_quantity} onChange={e => setForm(f => ({ ...f, portion_quantity: e.target.value }))} /></div>
              <div><Label>Percentual de Lucro (%)</Label><Input required type="number" step="0.1" min="0" value={form.profit_percentage} onChange={e => setForm(f => ({ ...f, profit_percentage: e.target.value }))} /></div>

              {Number(form.total_cost) > 0 && (
                <div className="p-4 rounded-xl bg-secondary space-y-2">
                  <div className="flex items-center gap-2 mb-2"><Calculator className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">Cálculo Automático</span></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Custo por {form.unit}:</span><span className="font-medium">{fmt(costPerUnit)}</span>
                    <span className="text-muted-foreground">Custo da porção:</span><span className="font-medium">{fmt(portionCost)}</span>
                    <span className="text-muted-foreground">Preço de venda:</span><span className="font-bold text-primary">{fmt(salePrice)}</span>
                    <span className="text-muted-foreground">Lucro por unidade:</span><span className="font-medium text-emerald-600">{fmt(profitPerUnit)}</span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={createItem.isPending}>
                <Calculator className="h-4 w-4 mr-2" />Calcular e Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Itens Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : items.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum item cadastrado.</p> : (
            <div className="space-y-3">
              {items.map(item => {
                const c = calcItem(item);
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.total_quantity}{item.unit} • Custo: {fmt(Number(item.total_cost))} • Porção: {item.portion_quantity}{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center"><p className="text-muted-foreground text-xs">Preço Venda</p><p className="font-bold text-primary">{fmt(c.salePrice)}</p></div>
                      <div className="text-center"><p className="text-muted-foreground text-xs">Lucro/Un.</p><p className="font-semibold text-emerald-600">{fmt(c.profitPerUnit)}</p></div>
                      <div className="text-center"><p className="text-muted-foreground text-xs">Margem</p><p className="font-semibold">{Number(item.profit_percentage)}%</p></div>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FoodPricing;
