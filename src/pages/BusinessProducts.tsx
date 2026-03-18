import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBusinessProducts, useCreateBusinessProduct, useDeleteBusinessProduct } from '@/hooks/useBusinessData';
import { Plus, Trash2 } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BusinessProducts = () => {
  const { data: products = [], isLoading } = useBusinessProducts();
  const createProduct = useCreateBusinessProduct();
  const deleteProduct = useDeleteBusinessProduct();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', sale_price: '', cost_price: '', stock: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct.mutateAsync({
      name: form.name,
      sale_price: Number(form.sale_price),
      cost_price: Number(form.cost_price),
      stock: form.stock ? Number(form.stock) : undefined,
    });
    setForm({ name: '', sale_price: '', cost_price: '', stock: '' });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Produto</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nome</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Valor de Venda (R$)</Label><Input required type="number" step="0.01" min="0" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} /></div>
              <div><Label>Custo (R$)</Label><Input required type="number" step="0.01" min="0" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} /></div>
              <div><Label>Estoque (opcional)</Label><Input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Produtos Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : products.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum produto cadastrado.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Venda</TableHead><TableHead>Custo</TableHead><TableHead>Lucro</TableHead><TableHead>Estoque</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{fmt(Number(p.sale_price))}</TableCell>
                    <TableCell>{fmt(Number(p.cost_price))}</TableCell>
                    <TableCell className={Number(p.sale_price) - Number(p.cost_price) >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(Number(p.sale_price) - Number(p.cost_price))}</TableCell>
                    <TableCell>{p.stock ?? '-'}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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

export default BusinessProducts;
