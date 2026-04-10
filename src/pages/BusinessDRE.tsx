import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  useAllBusinessProductCompositions,
  useBusinessExpenses,
  useBusinessIngredients,
  useBusinessProducts,
  useBusinessSales,
} from '@/hooks/useBusinessData';
import { buildBusinessProductUnitCostMap, calculateBusinessSalesCost } from '@/lib/business-costs';
import { getTodayInputDate } from '@/lib/utils';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt, Percent,
  AlertCircle, ArrowUpRight, ArrowDownRight, Download, FileText, FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BusinessDRE = () => {
  const { data: sales = [] } = useBusinessSales();
  const { data: expenses = [] } = useBusinessExpenses();
  const { data: products = [] } = useBusinessProducts();
  const { data: ingredients = [] } = useBusinessIngredients();
  const { data: allCompositions = [] } = useAllBusinessProductCompositions();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [taxRate, setTaxRate] = useState(10);

  const dreData = useMemo(() => {
    const productUnitCostMap = buildBusinessProductUnitCostMap({
      products,
      ingredients,
      compositions: allCompositions,
    });

    const currentSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const currentExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateMetrics = (periodSales: any[], periodExpenses: any[]) => {
      const revenue = periodSales.reduce((acc, s) => acc + Number(s.total_price), 0);
      const taxes = revenue > 0 ? revenue * (taxRate / 100) : 0;
      const netRevenue = revenue - taxes;
      const cmv = calculateBusinessSalesCost(periodSales, productUnitCostMap);
      const operatingExpenses = periodExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
      const grossProfit = netRevenue - cmv;
      const operatingProfit = grossProfit - operatingExpenses;
      const netProfit = operatingProfit;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      return { revenue, taxes, netRevenue, cmv, grossProfit, operatingExpenses, operatingProfit, netProfit, margin };
    };

    const current = calculateMetrics(currentSales, currentExpenses);
    const previous = calculateMetrics(prevSales, []);

    // Despesas por categoria
    const expenseByCategoryMap = new Map<string, number>();
    currentExpenses.forEach(e => {
      const cat = e.category || 'Sem categoria';
      expenseByCategoryMap.set(cat, (expenseByCategoryMap.get(cat) || 0) + Number(e.amount));
    });
    const expenseByCategory = Array.from(expenseByCategoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Faturamento e lucro por produto
    const productDataMap = new Map<string, { revenue: number; cost: number; qty: number }>();
    currentSales.forEach(s => {
      const pName = s.product_name || 'Produto avulso';
      const existing = productDataMap.get(pName) || { revenue: 0, cost: 0, qty: 0 };
      existing.revenue += Number(s.total_price);
      existing.qty += Number(s.quantity);
      if (s.product_id) {
        const unitCost = productUnitCostMap[s.product_id] ?? 0;
        existing.cost += Number(s.quantity) * unitCost;
      }
      productDataMap.set(pName, existing);
    });
    const productBreakdown = Array.from(productDataMap.entries())
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
        qty: data.qty,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { current, previous, expenseByCategory, productBreakdown };
  }, [sales, expenses, products, ingredients, allCompositions, month, year, taxRate]);

  const { current, previous, expenseByCategory, productBreakdown } = dreData;

  const chartData = [
    { name: 'R. Bruta', valor: current.revenue, color: '#10b981' },
    { name: 'Impostos', valor: current.taxes, color: '#f87171' },
    { name: 'R. Líquida', valor: current.netRevenue, color: '#059669' },
    { name: 'CMV', valor: current.cmv, color: '#f59e0b' },
    { name: 'Despesas', valor: current.operatingExpenses, color: '#ef4444' },
    { name: 'Lucro Líq.', valor: current.netProfit, color: '#3b82f6' },
  ];

  const profitDiff = previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const periodStr = `${String(month).padStart(2, '0')}/${year}`;
    
    doc.setFontSize(16);
    doc.text(`DRE Empresarial - ${periodStr}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Demonstrativo do Resultado do Exercício`, 14, 28);

    const tableData = [
      ['1. Receita Bruta (Vendas)', fmt(current.revenue)],
      [`(-) Deduções e Impostos (${taxRate}%)`, `(${fmt(current.taxes)})`],
      ['2. (=) Receita Líquida', fmt(current.netRevenue)],
      ['(-) Custo das Mercadorias Vendidas (CMV)', `(${fmt(current.cmv)})`],
      ['3. (=) Lucro Bruto', fmt(current.grossProfit)],
      ['(-) Despesas Operacionais', `(${fmt(current.operatingExpenses)})`],
      ['4. (=) Resultado Líquido do Período', fmt(current.netProfit)],
    ];

    autoTable(doc, {
      startY: 35,
      head: [['Descrição', 'Valor (R$)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
    });

    let lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;

    if (expenseByCategory.length > 0) {
      doc.setFontSize(13);
      doc.text('Despesas por Categoria', 14, lastY + 12);
      autoTable(doc, {
        startY: lastY + 16,
        head: [['Categoria', 'Valor (R$)']],
        body: expenseByCategory.map(c => [c.name, fmt(c.value)]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } }
      });
      lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? lastY + 30;
    }

    if (productBreakdown.length > 0) {
      doc.setFontSize(13);
      doc.text('Faturamento e Lucro por Produto', 14, lastY + 12);
      autoTable(doc, {
        startY: lastY + 16,
        head: [['Produto', 'Qtd', 'Faturamento', 'Custo', 'Lucro', 'Margem']],
        body: productBreakdown.map(p => [p.name, String(p.qty), fmt(p.revenue), fmt(p.cost), fmt(p.profit), `${p.margin.toFixed(1)}%`]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
      });
    }

    doc.save(`DRE_${periodStr.replace('/', '_')}.pdf`);
  };

  const handleExportExcel = () => {
    const periodStr = `${String(month).padStart(2, '0')}/${year}`;
    const wb = XLSX.utils.book_new();

    const dreRows = [
      ['Descrição', 'Valor (R$)'],
      ['1. Receita Bruta (Vendas)', current.revenue],
      [`(-) Deduções e Impostos (${taxRate}%)`, -current.taxes],
      ['2. (=) Receita Líquida', current.netRevenue],
      ['(-) CMV', -current.cmv],
      ['3. (=) Lucro Bruto', current.grossProfit],
      ['(-) Despesas Operacionais', -current.operatingExpenses],
      ['4. (=) Resultado Líquido do Período', current.netProfit],
    ];
    const wsDRE = XLSX.utils.aoa_to_sheet(dreRows);
    XLSX.utils.book_append_sheet(wb, wsDRE, 'DRE');

    if (expenseByCategory.length > 0) {
      const catRows = [['Categoria', 'Valor'], ...expenseByCategory.map(c => [c.name, c.value])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), 'Desp. por Categoria');
    }

    if (productBreakdown.length > 0) {
      const prodRows = [
        ['Produto', 'Qtd', 'Faturamento', 'Custo', 'Lucro', 'Margem %'],
        ...productBreakdown.map(p => [p.name, p.qty, p.revenue, p.cost, p.profit, p.margin])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodRows), 'Produtos');
    }

    XLSX.writeFile(wb, `DRE_${periodStr.replace('/', '_')}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DRE Empresarial</h1>
          <p className="text-muted-foreground text-sm">Demonstrativo do Resultado do Exercício</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-red-500" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }).map((_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(current.revenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {profitDiff >= 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
              <span className={profitDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}>{Math.abs(profitDiff).toFixed(1)}%</span> em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos (CMV)</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(current.cmv)}</div>
            <p className="text-xs text-muted-foreground mt-1">Representa {current.revenue > 0 ? ((current.cmv / current.revenue) * 100).toFixed(1) : 0}% da receita</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Operacionais</CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(current.operatingExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">Despesas fixas e variáveis</p>
          </CardContent>
        </Card>
        <Card className={current.netProfit >= 0 ? 'border-blue-500/20 bg-blue-500/5' : 'border-red-500/20 bg-red-500/5'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className={`h-4 w-4 ${current.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${current.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(current.netProfit)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Percent className="h-3 w-3" /> Margem de {current.margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Table + Chart */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Estrutura do DRE</CardTitle>
            <CardDescription>Detalhamento contábil do período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>1. Receita Bruta (Vendas)</TableCell>
                  <TableCell className="text-right text-emerald-600">{fmt(current.revenue)}</TableCell>
                </TableRow>
                <TableRow className="group">
                  <TableCell className="pl-6 flex items-center gap-2 border-b-0 h-[49px]">
                    (-) Deduções/Impostos s/ Venda
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Input type="number" className="h-6 w-12 text-xs p-1" value={taxRate || ""} onChange={e => setTaxRate(Number(e.target.value))} />
                      <span className="text-[10px]">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-red-500">({fmt(current.taxes)})</TableCell>
                </TableRow>
                <TableRow className="font-bold border-t-2">
                  <TableCell>2. (=) Receita Líquida</TableCell>
                  <TableCell className="text-right text-emerald-600">{fmt(current.netRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">(-) Custo das Mercadorias Vendidas (CMV)</TableCell>
                  <TableCell className="text-right text-red-500">({fmt(current.cmv)})</TableCell>
                </TableRow>
                <TableRow className="font-bold border-t-2">
                  <TableCell>3. (=) Lucro Bruto</TableCell>
                  <TableCell className="text-right">{fmt(current.grossProfit)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">(-) Despesas Operacionais</TableCell>
                  <TableCell className="text-right text-red-500">({fmt(current.operatingExpenses)})</TableCell>
                </TableRow>
                <TableRow className={`font-bold border-t-2 text-lg ${current.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                  <TableCell>4. (=) Resultado Líquido do Período</TableCell>
                  <TableCell className="text-right">{fmt(current.netProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {current.netProfit < 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-200 flex items-start gap-2 text-red-800 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p><strong>Alerta:</strong> O seu negócio operou com prejuízo neste período.</p>
              </div>
            )}
            {current.operatingExpenses > current.revenue * 0.5 && (
              <div className="mt-2 p-3 rounded-lg bg-orange-100 border border-orange-200 flex items-start gap-2 text-orange-800 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p><strong>Atenção:</strong> Despesas operacionais acima de 50% da receita.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Visão Gráfica</CardTitle>
            <CardDescription>Comparativo de movimentação</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Despesas por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-red-500" />
            Despesas por Categoria
          </CardTitle>
          <CardDescription>Detalhamento das despesas operacionais do período</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa registrada neste período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseByCategory.map((cat) => (
                  <TableRow key={cat.name}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(cat.value)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {current.operatingExpenses > 0 ? ((cat.value / current.operatingExpenses) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(current.operatingExpenses)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Faturamento e Lucro por Produto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-500" />
            Faturamento e Lucro por Produto
          </CardTitle>
          <CardDescription>Análise de receita e margem de cada produto vendido no período</CardDescription>
        </CardHeader>
        <CardContent>
          {productBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda registrada neste período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productBreakdown.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right text-emerald-600">{fmt(p.revenue)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(p.cost)}</TableCell>
                    <TableCell className={`text-right font-semibold ${p.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(p.profit)}</TableCell>
                    <TableCell className={`text-right ${p.margin >= 30 ? 'text-emerald-600' : p.margin >= 15 ? 'text-orange-500' : 'text-red-500'}`}>
                      {p.margin.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{productBreakdown.reduce((a, p) => a + p.qty, 0)}</TableCell>
                  <TableCell className="text-right text-emerald-600">{fmt(productBreakdown.reduce((a, p) => a + p.revenue, 0))}</TableCell>
                  <TableCell className="text-right text-red-500">{fmt(productBreakdown.reduce((a, p) => a + p.cost, 0))}</TableCell>
                  <TableCell className="text-right text-blue-600 font-bold">{fmt(productBreakdown.reduce((a, p) => a + p.profit, 0))}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessDRE;
