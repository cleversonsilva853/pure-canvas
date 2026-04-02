import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBusinessExpenses, useCreateBusinessExpense, useDeleteBusinessExpense, useBusinessExpenseCategories, useCreateBusinessExpenseCategory, useUpdateBusinessExpenseCategory, useDeleteBusinessExpenseCategory } from '@/hooks/useBusinessData';
import { Plus, Trash2, Search, Filter, Download, FileText, FileSpreadsheet, Pencil, Tag } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDate, getTodayInputDate } from '@/lib/utils';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const DEFAULT_CATEGORIES = ['Ingredientes', 'Aluguel', 'Funcionários', 'Energia', 'Água', 'Embalagens', 'Marketing', 'Manutenção', 'Outros'];

const BusinessExpenses = () => {
  const { data: expenses = [], isLoading } = useBusinessExpenses();
  const createExpense = useCreateBusinessExpense();
  const deleteExpense = useDeleteBusinessExpense();
  const { data: customCategories = [] } = useBusinessExpenseCategories();
  const createCategory = useCreateBusinessExpenseCategory();
  const updateCategory = useUpdateBusinessExpenseCategory();
  const deleteCategory = useDeleteBusinessExpenseCategory();

  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Outros', amount: '', date: getTodayInputDate(), observation: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);

  const today = getTodayInputDate();

  const allCategories = useMemo(() => {
    const custom = customCategories.map(c => c.name);
    const merged = [...DEFAULT_CATEGORIES, ...custom.filter(n => !DEFAULT_CATEGORIES.includes(n))];
    return merged;
  }, [customCategories]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const elYear = e.date.substring(0, 4);
      const elMonth = String(parseInt(e.date.substring(5, 7), 10) - 1);
      const matchMonth = filterMonth === 'all' || elMonth === filterMonth;
      const matchYear = filterYear === 'all' || elYear === filterYear;
      const matchSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchYear && matchSearch;
    });
  }, [expenses, filterMonth, filterYear, searchTerm]);

  const dailyTotal = useMemo(() => expenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0), [expenses, today]);
  const filteredTotal = useMemo(() => filteredExpenses.reduce((s, e) => s + Number(e.amount), 0), [filteredExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense.mutateAsync({ ...form, amount: Number(form.amount) });
    setForm({ name: '', category: 'Outros', amount: '', date: getTodayInputDate(), observation: '' });
    setOpen(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await createCategory.mutateAsync({ name: newCatName.trim() });
    setNewCatName('');
  };

  const handleUpdateCategory = async () => {
    if (!editingCat || !editingCat.name.trim()) return;
    await updateCategory.mutateAsync({ id: editingCat.id, name: editingCat.name.trim() });
    setEditingCat(null);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Despesas', 14, 15);
    const tableData = filteredExpenses.map(e => [
      e.name, e.category, fmt(Number(e.amount)), formatDate(e.date), e.observation || ''
    ]);
    autoTable(doc, {
      head: [['Nome', 'Categoria', 'Valor', 'Data', 'Observação']],
      body: tableData,
      startY: 20,
    });
    doc.save('despesas.pdf');
  };

  const handleExportExcel = () => {
    const dataToExport = filteredExpenses.map(e => ({
      'Nome': e.name, 'Categoria': e.category, 'Valor': Number(e.amount),
      'Data': formatDate(e.date), 'Observação': e.observation || ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, "despesas.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Despesas Empresa</h1>
        <div className="flex items-center gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Gerenciar Categorias</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da categoria..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button onClick={handleAddCategory} disabled={createCategory.isPending || !newCatName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {customCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria personalizada criada.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {customCategories.map(cat => (
                      <div key={cat.id} className="flex items-center gap-2">
                        {editingCat?.id === cat.id ? (
                          <>
                            <Input
                              value={editingCat.name}
                              onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleUpdateCategory()}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={handleUpdateCategory} disabled={updateCategory.isPending}>Salvar</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}>Cancelar</Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{cat.name}</span>
                            <Button size="icon" variant="ghost" onClick={() => setEditingCat({ id: cat.id, name: cat.name })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteCategory.mutate(cat.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Categorias padrão:</p>
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_CATEGORIES.map(c => (
                      <span key={c} className="text-xs bg-muted px-2 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Despesa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Despesa</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><Label>Nome</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Hoje (Geral)</p><p className="text-xl font-bold">{fmt(dailyTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Filtrado</p><p className="text-xl font-bold">{fmt(filteredTotal)}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar despesas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
        <CardHeader><CardTitle className="text-base">Despesas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : filteredExpenses.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma despesa encontrada.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredExpenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{fmt(Number(e.amount))}</TableCell>
                    <TableCell>{formatDate(e.date)}</TableCell>
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
