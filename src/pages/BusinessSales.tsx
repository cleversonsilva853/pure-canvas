import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessSales, useCreateBusinessSale, useDeleteBusinessSale, useBusinessProducts } from '@/hooks/useBusinessData';
import { Plus, Trash2 } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BusinessSales = () => {
  const { data: sales = [], isLoading } = useBusinessSales();
  const { data: products = [] } = useBusinessProducts();
  const createSale = useCreateBusinessSale();
  const deleteSale = useDeleteBusinessSale();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', product_name: '', quantity: '1', unit_price: '', date: new Date().toISOString().slice(0, 10) });

  const totalPrice = Number(form.quantity || 0) * Number(form.unit_price || 0);
  const totalRevenue = useMemo(() => sales.reduce((s, e) => s + Number(e.total_price), 0), [sales]);

  const handleProductSelect = (productId: string) => {
    if (productId === 'manual') {
      setForm(f => ({ ...f, product_id: '', product_name: '', unit_price: '' }));
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product) {
      setForm(f => ({ ...f, product_id: product.id, product_name: product.name, unit_price: String(product.sale_price) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSale.mutateAsync({
      product_id: form.product_id || undefined,
      product_name: form.product_name,
      quantity: Number(form.quantity),
      unit_price: Number(form.unit_price),
      total_price: totalPrice,
      date: form.date,
    });
    setForm({ product_id: '', product_name: '', quantity: '1', unit_price: '', date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Venda</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Venda</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Produto</Label>
                <Select value={form.product_id || 'manual'} onValueChange={handleProductSelect}>
                  <SelectTrigger><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Digitar manualmente</SelectItem>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {fmt(Number(p.sale_price))}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!form.product_id && <div><Label>Nome do Produto/Serviço</Label><Input required value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantidade</Label><Input required type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><Label>Valor Unitário (R$)</Label><Input required type="number" step="0.01" min="0" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
              </div>
              <div className="p-3 rounded-lg bg-secondary text-center"><span className="text-sm text-muted-foreground">Total: </span><span className="font-bold">{fmt(totalPrice)}</span></div>
              <div><Label>Data</Label><Input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={createSale.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Faturamento Total</p><p className="text-xl font-bold">{fmt(totalRevenue)}</p></CardContent></Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Vendas Realizadas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : sales.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma venda registrada.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd</TableHead><TableHead>Unit.</TableHead><TableHead>Total</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.product_name}</TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell>{fmt(Number(s.unit_price))}</TableCell>
                    <TableCell className="font-semibold">{fmt(Number(s.total_price))}</TableCell>
                    <TableCell>{new Date(s.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deleteSale.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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

export default BusinessSales;
