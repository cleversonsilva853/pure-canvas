import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBusinessSales, useCreateBusinessSale, useDeleteBusinessSale, useBusinessProducts } from '@/hooks/useBusinessData';
import { Plus, Trash2, Search, Filter, Download, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
};


const BusinessSales = () => {
  const { data: sales = [], isLoading } = useBusinessSales();
  const { data: products = [] } = useBusinessProducts();
  const createSale = useCreateBusinessSale();
  const deleteSale = useDeleteBusinessSale();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', product_name: '', quantity: '1', unit_price: '', date: new Date().toISOString().slice(0, 10) });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

  const totalPrice = Number(form.quantity || 0) * Number(form.unit_price || 0);
  
  const filteredSales = useMemo(() => {
    return sales.filter(e => {
      const elYear = e.date.substring(0, 4);
      const elMonth = String(parseInt(e.date.substring(5, 7), 10) - 1);
      const matchMonth = filterMonth === 'all' || elMonth === filterMonth;
      const matchYear = filterYear === 'all' || elYear === filterYear;
      const matchSearch = !searchTerm || e.product_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchYear && matchSearch;
    });
  }, [sales, filterMonth, filterYear, searchTerm]);

  const totalRevenue = useMemo(() => sales.reduce((s, e) => s + Number(e.total_price), 0), [sales]);
  const filteredRevenue = useMemo(() => filteredSales.reduce((s, e) => s + Number(e.total_price), 0), [filteredSales]);

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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Vendas', 14, 15);
    
    const tableData = filteredSales.map(s => [
      s.product_name,
      s.quantity.toString(),
      fmt(Number(s.unit_price)),
      fmt(Number(s.total_price)),
      formatDate(s.date)
    ]);

    autoTable(doc, {
      head: [['Produto', 'Quantidade', 'Valor Unit.', 'Valor Total', 'Data']],
      body: tableData,
      startY: 20,
    });

    doc.save('vendas.pdf');
  };

  const handleExportExcel = () => {
    const dataToExport = filteredSales.map(s => ({
      'Produto': s.product_name,
      'Quantidade': s.quantity,
      'Valor Unitário': Number(s.unit_price),
      'Valor Total': Number(s.total_price),
      'Data': formatDate(s.date)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "vendas.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                <FileText className="h-4 w-4" /> Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Faturamento Total (Geral)</p><p className="text-xl font-bold">{fmt(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Faturamento Filtrado</p><p className="text-xl font-bold">{fmt(filteredRevenue)}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar vendas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {Array.from({ length: 12 }).map((_, i) => (
              <SelectItem key={i} value={String(i)}>
                {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {Array.from({ length: 5 }).map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <SelectItem key={year} value={String(year)}>{year}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Vendas Realizadas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : filteredSales.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma venda encontrada.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd</TableHead><TableHead>Unit.</TableHead><TableHead>Total</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredSales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.product_name}</TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell>{fmt(Number(s.unit_price))}</TableCell>
                    <TableCell className="font-semibold">{fmt(Number(s.total_price))}</TableCell>
                    <TableCell>{formatDate(s.date)}</TableCell>
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
