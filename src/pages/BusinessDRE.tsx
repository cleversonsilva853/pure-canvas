import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useBusinessSales, useBusinessExpenses, useBusinessProducts } from '@/hooks/useBusinessData';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  Percent,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BusinessDRE = () => {
  const { data: sales = [] } = useBusinessSales();
  const { data: expenses = [] } = useBusinessExpenses();
  const { data: products = [] } = useBusinessProducts();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [taxRate, setTaxRate] = useState(10);

  // Filter and Calculate Data
  const dreData = useMemo(() => {
    // Current Period
    const currentSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const currentExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    // Previous Period for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
    });

    // Calculations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateMetrics = (periodSales: any[], periodExpenses: any[]) => {
      const revenue = periodSales.reduce((acc, s) => acc + Number(s.total_price), 0);
      
      const cmv = periodSales.reduce((acc, s) => {
        if (!s.product_id) return acc;
        const product = products.find(p => p.id === s.product_id);
        return acc + (Number(s.quantity) * Number(product?.cost_price || 0));
      }, 0);

      const operatingExpenses = periodExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
      const grossProfit = revenue - cmv;
      const operatingProfit = grossProfit - operatingExpenses;
      const taxes = operatingProfit > 0 ? operatingProfit * (taxRate / 100) : 0;
      const netProfit = operatingProfit - taxes;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return { revenue, cmv, grossProfit, operatingExpenses, operatingProfit, taxes, netProfit, margin };
    };

    const current = calculateMetrics(currentSales, currentExpenses);
    const previous = calculateMetrics(prevSales, []); // Simplificado: comparação de receita/lucro

    return { current, previous };
  }, [sales, expenses, products, month, year, taxRate]);

  const { current, previous } = dreData;

  const chartData = [
    { name: 'Receita', valor: current.revenue, color: '#10b981' },
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
      ['(-) Custo das Mercadorias Vendidas (CMV)', `(${fmt(current.cmv)})`],
      ['3. (=) Lucro Bruto', fmt(current.grossProfit)],
      ['(-) Despesas Operacionais', `(${fmt(current.operatingExpenses)})`],
      ['5. (=) Lucro Operacional (EBITDA)', fmt(current.operatingProfit)],
      [`(-) Impostos e Taxas (${taxRate}%)`, `(${fmt(current.taxes)})`],
      ['7. (=) Resultado Líquido do Período', fmt(current.netProfit)],
    ];

    autoTable(doc, {
      startY: 35,
      head: [['Descrição', 'Valor (R$)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: 'right' }
      }
    });

    doc.save(`DRE_${periodStr.replace('/', '_')}.pdf`);
  };

  const handleExportExcel = () => {
    const periodStr = `${String(month).padStart(2, '0')}/${year}`;
    const tableData = [
      ['Descrição', 'Valor (R$)'],
      ['1. Receita Bruta (Vendas)', current.revenue],
      ['(-) Custo das Mercadorias Vendidas (CMV)', -current.cmv],
      ['3. (=) Lucro Bruto', current.grossProfit],
      ['(-) Despesas Operacionais', -current.operatingExpenses],
      ['5. (=) Lucro Operacional (EBITDA)', current.operatingProfit],
      [`(-) Impostos e Taxas (${taxRate}%)`, -current.taxes],
      ['7. (=) Resultado Líquido do Período', current.netProfit],
    ];

    const ws = XLSX.utils.aoa_to_sheet(tableData);
    
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:B8');
    for (let R = 1; R <= range.e.r; ++R) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: 1 })];
      if (cell && cell.t === 'n') {
        cell.z = '"R$" #,##0.00;"R$" -#,##0.00';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DRE');
    
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(current.revenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {profitDiff >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={profitDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                {Math.abs(profitDiff).toFixed(1)}%
              </span> em relação ao mês anterior
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
            <p className="text-xs text-muted-foreground mt-1">
              Representa {current.revenue > 0 ? ((current.cmv / current.revenue) * 100).toFixed(1) : 0}% da receita
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Operacionais</CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(current.operatingExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas fixas e variáveis
            </p>
          </CardContent>
        </Card>

        <Card className={current.netProfit >= 0 ? 'border-blue-500/20 bg-blue-500/5' : 'border-red-500/20 bg-red-500/5'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className={`h-4 w-4 ${current.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${current.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {fmt(current.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Percent className="h-3 w-3" />
              Margem de {current.margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

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
                <TableRow className="font-bold border-t-2">
                  <TableCell>5. (=) Lucro Operacional (EBITDA)</TableCell>
                  <TableCell className="text-right">{fmt(current.operatingProfit)}</TableCell>
                </TableRow>
                <TableRow className="flex items-center gap-2 group">
                  <TableCell className="pl-6 flex items-center gap-2">
                    (-) Impostos e Taxas
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Input 
                        type="number" 
                        className="h-6 w-12 text-xs p-1" 
                        value={taxRate} 
                        onChange={e => setTaxRate(Number(e.target.value))}
                      />
                      <span className="text-[10px]">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-red-500 flex-1">({fmt(current.taxes)})</TableCell>
                </TableRow>
                <TableRow className={`font-bold border-t-2 text-lg ${current.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                  <TableCell>7. (=) Resultado Líquido do Período</TableCell>
                  <TableCell className="text-right">{fmt(current.netProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {current.netProfit < 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-200 flex items-start gap-2 text-red-800 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p><strong>Alerta:</strong> O seu negócio operou com prejuízo neste período. Analise reduzir as despesas operacionais ou revisar a margem de custo dos produtos.</p>
              </div>
            )}
            
            {current.operatingExpenses > current.revenue * 0.5 && (
              <div className="mt-2 p-3 rounded-lg bg-orange-100 border border-orange-200 flex items-start gap-2 text-orange-800 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p><strong>Atenção:</strong> Suas despesas operacionais estão muito altas (mais de 50% da receita). Isso pode comprometer sua sustentabilidade.</p>
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
                <Tooltip 
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
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
    </div>
  );
};

export default BusinessDRE;
