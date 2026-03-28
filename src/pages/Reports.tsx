import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactions } from '@/hooks/useFinanceData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(280, 67%, 60%)', 'hsl(0, 84%, 60%)', 'hsl(190, 80%, 50%)'];

const Reports = () => {
  const { data: transactions = [] } = useTransactions();

  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
    const cat = (t.category as { id: string; name: string } | null);
      const existing = map.get(cat.id);
      if (existing) existing.value += Number(t.amount);
      else map.set(cat.id, { name: cat.name, value: Number(t.amount) });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; rawDate: string; receitas: number; despesas: number }>();
    transactions.forEach(t => {
      const existing = map.get(t.date);
      if (existing) {
        if (t.type === 'income') existing.receitas += Number(t.amount);
        else existing.despesas += Number(t.amount);
      } else {
        map.set(t.date, {
          date: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          rawDate: t.date,
          receitas: t.type === 'income' ? Number(t.amount) : 0,
          despesas: t.type === 'expense' ? Number(t.amount) : 0,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [transactions]);

  const totalReceitas = useMemo(() => transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), [transactions]);
  const totalDespesas = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), [transactions]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(18);
    doc.text('Relatório Financeiro', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 14, 28);

    // Resumo
    doc.setFontSize(13);
    doc.text('Resumo', 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [['', 'Valor']],
      body: [
        ['Total Receitas', formatCurrency(totalReceitas)],
        ['Total Despesas', formatCurrency(totalDespesas)],
        ['Saldo', formatCurrency(totalReceitas - totalDespesas)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Despesas por Categoria
    if (categoryData.length > 0) {
      const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
      doc.setFontSize(13);
      doc.text('Despesas por Categoria', 14, lastY + 12);
      autoTable(doc, {
        startY: lastY + 16,
        head: [['Categoria', 'Valor']],
        body: categoryData.map(c => [c.name, formatCurrency(c.value)]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    // Transações
    if (transactions.length > 0) {
      const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
      doc.setFontSize(13);
      doc.text('Transações', 14, lastY + 12);
      autoTable(doc, {
        startY: lastY + 16,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
        body: transactions.map(t => [
          new Date(t.date).toLocaleDateString('pt-BR'),
          t.description || '-',
          (t.category as { name?: string } | null)?.name || '-',
          t.type === 'income' ? 'Receita' : 'Despesa',
          formatCurrency(Number(t.amount)),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
    }

    doc.save('relatorio-financeiro.pdf');
  }, [transactions, categoryData, totalReceitas, totalDespesas]);

  const exportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Resumo
    const resumoData = [
      ['Resumo Financeiro'],
      [],
      ['', 'Valor'],
      ['Total Receitas', totalReceitas],
      ['Total Despesas', totalDespesas],
      ['Saldo', totalReceitas - totalDespesas],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Categorias
    if (categoryData.length > 0) {
      const catRows = [['Categoria', 'Valor'], ...categoryData.map(c => [c.name, c.value])];
      const wsCat = XLSX.utils.aoa_to_sheet(catRows);
      wsCat['!cols'] = [{ wch: 25 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsCat, 'Categorias');
    }

    // Transações
    if (transactions.length > 0) {
      const txRows = [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'],
        ...transactions.map(t => [
          new Date(t.date).toLocaleDateString('pt-BR'),
          t.description || '-',
          (t.category as { name?: string } | null)?.name || '-',
          t.type === 'income' ? 'Receita' : 'Despesa',
          Number(t.amount),
        ]),
      ];
      const wsTx = XLSX.utils.aoa_to_sheet(txRows);
      wsTx['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsTx, 'Transações');
    }

    XLSX.writeFile(wb, 'relatorio-financeiro.xlsx');
  }, [transactions, categoryData, totalReceitas, totalDespesas]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução Diária</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {dailyData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="receitas" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="despesas" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {categoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;
