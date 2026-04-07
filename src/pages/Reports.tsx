import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import { FileDown, FileSpreadsheet, TrendingUp, TrendingDown, Wallet, Target, AlertTriangle, Lightbulb, PiggyBank, Receipt, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { usePersonalReportsData } from '@/hooks/usePersonalReports';
import { useGoals } from '@/hooks/useFinanceData';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subDays 
} from 'date-fns';
import { Progress } from '@/components/ui/progress';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const Reports = () => {
  const [period, setPeriod] = useState('this-month');
  
  const dateRange = useMemo(() => {
    const now = new Date();
    switch(period) {
       case 'this-week': return { start: startOfWeek(now), end: endOfWeek(now) };
       case 'last-7': return { start: subDays(now, 7), end: now };
       case 'last-30': return { start: subDays(now, 30), end: now };
       case 'this-year': return { start: startOfYear(now), end: endOfYear(now) };
       case 'this-month':
       default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);

  const { data, isLoading } = usePersonalReportsData(dateRange.start, dateRange.end);
  const { data: goals = [] } = useGoals();
  
  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || p.payload.fill }} />
              <span className="text-muted-foreground">{p.name}:</span>
              <span className="font-semibold">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const exportPDF = useCallback(() => {
    if (!data) return;
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(18);
    doc.text('Relatório Financeiro Inteligente', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now} | Período: ${period}`, 14, 28);

    doc.setFontSize(13);
    doc.text('Resumo Global', 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Receitas', formatCurrency(data.kpis.totalIncome)],
        ['Total Despesas', formatCurrency(data.kpis.totalExpense)],
        ['Saldo Líquido / Economia', formatCurrency(data.kpis.balance)],
        ['Ticket Médio de Gasto', formatCurrency(data.kpis.ticketMedio)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    if (data.charts.expensesByCategory.length > 0) {
      const lastY = (doc as any).lastAutoTable?.finalY ?? 80;
      doc.setFontSize(13);
      doc.text('Despesas por Categoria', 14, lastY + 12);
      autoTable(doc, {
        startY: lastY + 16,
        head: [['Categoria', 'Valor']],
        body: data.charts.expensesByCategory.map((c: any) => [c.name, formatCurrency(c.value)]),
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

    if (data.rawCurrent.length > 0) {
      const lastY = (doc as any).lastAutoTable?.finalY ?? 120;
      doc.setFontSize(13);
      doc.text('Extrato de Movimentações', 14, lastY + 12);
      autoTable(doc, {
        startY: lastY + 16,
        head: [['Data', 'Descrição', 'Tipo', 'Valor']],
        body: data.rawCurrent.map((t: any) => [
          formatDate(t.date),
          t.description || '-',
          t.type === 'income' ? 'Receita' : 'Despesa',
          formatCurrency(Number(t.amount)),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
    }

    doc.save('relatorio-personal-financeiro.pdf');
  }, [data, period]);

  const exportExcel = useCallback(() => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const resumoData = [
      ['Relatório Financeiro Inteligente', '', `Período: ${period}`],
      [],
      ['Métrica', 'Valor'],
      ['Total Receitas', data.kpis.totalIncome],
      ['Total Despesas', data.kpis.totalExpense],
      ['Saldo Líquido', data.kpis.balance],
      ['Ticket Médio', data.kpis.ticketMedio],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'KPIs Gerais');

    if (data.charts.expensesByCategory.length > 0) {
      const catRows = [['Categoria', 'Gastos'], ...data.charts.expensesByCategory.map((c: any) => [c.name, c.value])];
      const wsCat = XLSX.utils.aoa_to_sheet(catRows);
      wsCat['!cols'] = [{ wch: 25 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsCat, 'Despesas Detalhadas');
    }

    if (data.rawCurrent.length > 0) {
      const txRows = [
        ['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor'],
        ...data.rawCurrent.map((t: any) => [
          formatDate(t.date),
          t.description || '-',
          t.category?.name || '-',
          t.account?.name || '-',
          t.type === 'income' ? 'Receita' : 'Despesa',
          Number(t.amount),
        ]),
      ];
      const wsTx = XLSX.utils.aoa_to_sheet(txRows);
      wsTx['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsTx, 'Transações do Período');
    }

    XLSX.writeFile(wb, 'relatorio-personal-financeiro.xlsx');
  }, [data, period]);

  if (isLoading || !data) {
    return <div className="text-center py-20 text-muted-foreground animate-pulse">Processando Inteligência Financeira...</div>;
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Inteligência Financeira</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise consolidada do seu comportamento financeiro</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">Este Mês</SelectItem>
              <SelectItem value="this-week">Esta Semana</SelectItem>
              <SelectItem value="last-7">Últimos 7 Dias</SelectItem>
              <SelectItem value="last-30">Últimos 30 Dias</SelectItem>
              <SelectItem value="this-year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportPDF} size="sm" className="gap-2">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportExcel} size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Smart Insights Row */}
      {data.insights.length > 0 && (
        <div className="grid gap-3">
          {data.insights.map((insight: any, idx: number) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
              key={idx} 
              className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium border-l-4
                ${insight.type === 'alert' ? 'bg-red-500/10 text-red-600 border-red-500' : ''}
                ${insight.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500' : ''}
                ${insight.type === 'success' ? 'bg-green-500/10 text-green-600 border-green-500' : ''}
              `}
            >
              {insight.type === 'alert' && <AlertTriangle className="h-5 w-5" />}
              {insight.type === 'warning' && <Lightbulb className="h-5 w-5" />}
              {insight.type === 'success' && <Target className="h-5 w-5" />}
              {insight.message}
            </motion.div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Saldo Bruto / Economia', val: data.kpis.balance, icon: Wallet, color: 'text-blue-500', growth: data.kpis.diffBalance > 0 ? '+ Positivo' : '- Negativo', 
            trend: data.kpis.diffBalance > 0 ? 'text-green-500' : 'text-red-500', trendIcon: data.kpis.diffBalance > 0 ? TrendingUp : TrendingDown },
          { title: 'Receitas Totais', val: data.kpis.totalIncome, icon: TrendingUp, color: 'text-green-500', growth: `${data.kpis.incomeGrowth.toFixed(1)}% vs anterior`,
            trend: data.kpis.incomeGrowth >= 0 ? 'text-green-500' : 'text-red-500', trendIcon: data.kpis.incomeGrowth >= 0 ? TrendingUp : TrendingDown },
          { title: 'Despesas Totais', val: data.kpis.totalExpense, icon: TrendingDown, color: 'text-red-500', growth: `${data.kpis.expenseGrowth.toFixed(1)}% vs anterior`,
            trend: data.kpis.expenseGrowth <= 0 ? 'text-green-500' : 'text-red-500', trendIcon: data.kpis.expenseGrowth <= 0 ? TrendingDown : TrendingUp }, // For expenses, down is good (green)
          { title: 'Ticket Médio (Gastos)', val: data.kpis.ticketMedio, icon: Receipt, color: 'text-orange-500', growth: 'Gasto por transação', trend: 'text-muted-foreground', trendIcon: null },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold mt-2">{formatCurrency(kpi.val)}</h3>
                  <div className="flex items-center mt-1 space-x-1">
                    {kpi.trendIcon && <kpi.trendIcon className={`h-3 w-3 ${kpi.trend}`} />}
                    <span className={`text-xs font-semibold ${kpi.trend}`}>{kpi.growth}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de Caixa */}
        <Card className="col-span-1 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 max-w-full">
              <TrendingUp className="h-5 w-5 text-indigo-500 flex-shrink-0" />
              Fluxo de Caixa
            </CardTitle>
            <CardDescription>Entradas e Saídas ao longo do período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {data.charts.dailyFlow.length === 0 ? <p className="text-muted-foreground text-sm flex h-full items-center justify-center">Sem dados de fluxo.</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.dailyFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="dateLabel" fontSize={11} tickMargin={10} minTickGap={15} />
                    <YAxis fontSize={11} tickFormatter={(val) => `R$${val}`} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evolução de Saldo */}
        <Card className="col-span-1 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 max-w-full">
              <PiggyBank className="h-5 w-5 text-fuchsia-500 flex-shrink-0" />
              Evolução do Saldo
            </CardTitle>
            <CardDescription>Acúmulo contínuo de saldo no eixo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {data.charts.balanceEvolution.length === 0 ? <p className="text-muted-foreground text-sm flex h-full items-center justify-center">Sem dados evolutivos.</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.balanceEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="dateLabel" fontSize={11} tickMargin={10} minTickGap={15} />
                    <YAxis fontSize={11} tickFormatter={(val) => `R$${val}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Acumulado" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcumulado)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categoria Despesas Pie Chart */}
        <Card className="col-span-1 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 max-w-full">
              <CreditCard className="h-5 w-5 text-rose-500 flex-shrink-0" />
              Despesas por Categoria
            </CardTitle>
            <CardDescription>Distribuição dos seus gastos</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="h-[220px] w-full mt-4">
              {data.charts.expensesByCategory.length === 0 ? <p className="text-muted-foreground text-sm flex h-full items-center justify-center">Sem despesas registradas.</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Pie data={data.charts.expensesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                      {data.charts.expensesByCategory.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Custom Legend */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-[80px] overflow-y-auto pr-2 custom-scrollbar">
              {data.charts.expensesByCategory.slice(0, 10).map((c: any, i: number) => (
               <div key={i} className="flex items-center gap-1.5 text-xs">
                 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.fill }}></span>
                 <span className="truncate max-w-[90px]">{c.name}</span>
               </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metas Tracking */}
        <Card className="col-span-1 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 max-w-full">
              <Target className="h-5 w-5 text-amber-500 flex-shrink-0" />
              Progresso de Metas
            </CardTitle>
            <CardDescription>Resumo dos seus objetivos financeiros ativos</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-5 mt-2 overflow-y-auto max-h-[260px] pr-2 custom-scrollbar">
                {goals.length === 0 ? (
                  <p className="text-muted-foreground text-sm h-full flex items-center justify-center pt-10">Nenhuma meta cadastrada.</p>
                ) : (
                  goals.map(goal => {
                    const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);
                    return (
                      <div key={goal.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold">{goal.name}</span>
                          <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                          <span>{formatCurrency(Number(goal.current_amount))}</span>
                          <span>{formatCurrency(Number(goal.target_amount))}</span>
                        </div>
                      </div>
                    )
                  })
                )}
             </div>
          </CardContent>
        </Card>

        {/* Comportamento: Dia da Semana & Formas de Pagamento */}
        <Card className="col-span-1 lg:col-span-2 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 max-w-full">
              <Lightbulb className="h-5 w-5 text-cyan-500 flex-shrink-0" />
              Comportamento do Consumidor
            </CardTitle>
            <CardDescription>Descubra os dias de maior gasto e seus meios de pagamento favoritos</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[250px]">
              <div className="h-full">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 text-center">Gasto por Dia da Semana</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data.charts.expensesByDayOfWeek}>
                    <PolarGrid strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--foreground)', opacity: 0.7 }} />
                    <Radar name="Gastos" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
                    <RechartsTooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="h-full">
                 <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 text-center">Formas de Pagamento (Top)</h4>
                 {data.charts.paymentModes.length === 0 ? <p className="text-muted-foreground text-sm flex h-full items-center justify-center">Sem dados.</p> : (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.charts.paymentModes} layout="vertical" margin={{ left: -10, top: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" fontSize={11} width={100} axisLine={false} tickLine={false} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={25} />
                     </BarChart>
                   </ResponsiveContainer>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
