import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAllBusinessProductCompositions,
  useBusinessAccounts,
  useBusinessExpenses,
  useBusinessIngredients,
  useBusinessProducts,
  useBusinessSales,
} from '@/hooks/useBusinessData';
import { DollarSign, TrendingDown, TrendingUp, Percent, Wallet, Calendar, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTodayInputDate } from '@/lib/utils';
import { calculateBusinessSalesCost, buildBusinessProductUnitCostMap } from '@/lib/business-costs';
import { subDays, isAfter, parseISO, startOfToday } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BusinessDashboard = () => {
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month'>('month');
  const { data: expenses = [] } = useBusinessExpenses();
  const { data: sales = [] } = useBusinessSales();
  const { data: accounts = [] } = useBusinessAccounts();
  const { data: products = [] } = useBusinessProducts();
  const { data: ingredients = [] } = useBusinessIngredients();
  const { data: allCompositions = [] } = useAllBusinessProductCompositions();

  const today = getTodayInputDate();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const productCostMap = useMemo(() => {
    return buildBusinessProductUnitCostMap({
      products,
      ingredients,
      compositions: allCompositions,
    });
  }, [products, ingredients, allCompositions]);

  const calcCMV = (salesList: typeof sales) => calculateBusinessSalesCost(salesList, productCostMap);

  const stats = useMemo(() => {
    const todayDate = startOfToday();
    const sevenDaysAgo = subDays(todayDate, 7);

    const filterFn = (dateStr: string) => {
      const itemDate = parseISO(dateStr);
      if (activePeriod === 'day') return dateStr === today;
      if (activePeriod === 'week') return isAfter(itemDate, sevenDaysAgo);
      if (activePeriod === 'month') {
        const [y, m] = dateStr.split('-').map(Number);
        return (m - 1) === currentMonth && y === currentYear;
      }
      return true;
    };

    const filteredExpenses = expenses.filter(e => filterFn(e.date) && e.date <= today);
    const filteredSales = sales.filter(s => filterFn(s.date));

    const periodExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const periodSales = filteredSales.reduce((s, e) => s + Number(e.total_price), 0);
    const periodCMV = calcCMV(filteredSales);
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
    
    // Daily
    const dailySalesList = sales.filter(e => e.date === today);
    const dailyExpenses = expenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0);
    const dailySales = dailySalesList.reduce((s, e) => s + Number(e.total_price), 0);
    const dailyCMV = calcCMV(dailySalesList);
    
    // Monthly
    const monthlySalesList = sales.filter(e => { 
      const [y, m] = e.date.split('-').map(Number);
      return (m - 1) === currentMonth && y === currentYear; 
    });
    const monthlyExpenses = expenses.filter(e => { 
      const [y, m] = e.date.split('-').map(Number);
      return (m - 1) === currentMonth && y === currentYear && e.date <= today; 
    }).reduce((s, e) => s + Number(e.amount), 0);
    const monthlySales = monthlySalesList.reduce((s, e) => s + Number(e.total_price), 0);
    const monthlyCMV = calcCMV(monthlySalesList);

    // Profit = Sales - Expenses - CMV
    const periodProfit = periodSales - periodExpenses - periodCMV;
    const dailyProfit = dailySales - dailyExpenses - dailyCMV;
    const monthlyProfit = monthlySales - monthlyExpenses - monthlyCMV;
    
    const allSales = sales.reduce((s, e) => s + Number(e.total_price), 0);
    const allExpenses = expenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0);
    const allCMV = calcCMV(sales);
    const totalProfit = allSales - allExpenses - allCMV;
    
    const totalCosts = periodExpenses + periodCMV;
    const margin = periodSales > 0 ? (periodProfit / periodSales) * 100 : 0;

    return { 
      periodExpenses, 
      periodSales, 
      periodCMV,
      totalBalance, 
      dailyExpenses, 
      dailySales, 
      dailyCMV,
      monthlyExpenses, 
      monthlySales, 
      monthlyCMV,
      periodProfit, 
      dailyProfit, 
      monthlyProfit, 
      totalProfit,
      totalCosts,
      margin 
    };
  }, [expenses, sales, accounts, today, currentMonth, currentYear, activePeriod, productCostMap]);

  const chartData = useMemo(() => {
    const months: Record<string, { name: string; vendas: number; despesas: number; cmv: number }> = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = { name: monthNames[d.getMonth()], vendas: 0, despesas: 0, cmv: 0 };
    }
    sales.forEach(s => { 
      const [y, m] = s.date.split('-').map(Number);
      const k = `${y}-${m - 1}`; 
      if (months[k]) {
        months[k].vendas += Number(s.total_price);
        const costPrice = s.product_id ? (productCostMap[s.product_id] || 0) : 0;
        months[k].cmv += costPrice * Number(s.quantity);
      }
    });
    expenses.forEach(e => { 
      const [y, m] = e.date.split('-').map(Number);
      const k = `${y}-${m - 1}`; 
      if (months[k] && e.date <= today) months[k].despesas += Number(e.amount); 
    });
    return Object.values(months);
  }, [expenses, sales, currentMonth, currentYear, productCostMap, today]);

  const periodLabel = activePeriod === 'day' ? 'Hoje' : activePeriod === 'week' ? 'Semana' : 'Mês';

  const cards = [
    { title: 'Saldo em Contas', value: fmt(stats.totalBalance), icon: Wallet, color: 'text-primary' },
    { title: `Faturamento ${periodLabel}`, value: fmt(stats.periodSales), icon: DollarSign, color: 'text-emerald-500' },
    { title: `Despesas ${periodLabel}`, value: fmt(stats.periodExpenses), icon: TrendingDown, color: 'text-red-500' },
    { title: `Custo Produtos ${periodLabel}`, value: fmt(stats.periodCMV), icon: Package, color: 'text-orange-500' },
    { title: `Lucro ${periodLabel}`, value: fmt(stats.periodProfit), icon: TrendingUp, color: stats.periodProfit >= 0 ? 'text-emerald-500' : 'text-red-500' },
    { title: 'Margem de Lucro', value: `${stats.margin.toFixed(1)}%`, icon: Percent, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Financeiro Empresa</h1>
          <div className="p-2 rounded-xl bg-secondary/50 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {activePeriod === 'day' ? 'Hoje' : activePeriod === 'week' ? 'Últimos 7 dias' : 'Este Mês'}
          </div>
        </div>

        <Tabs 
          defaultValue="month" 
          value={activePeriod} 
          onValueChange={(v) => setActivePeriod(v as any)} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 h-12 rounded-xl">
            <TabsTrigger value="day" className="rounded-lg">Dia</TabsTrigger>
            <TabsTrigger value="week" className="rounded-lg">Semana</TabsTrigger>
            <TabsTrigger value="month" className="rounded-lg">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-secondary ${c.color}`}><c.icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.title}</p>
                  <p className="text-lg font-bold">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Profit breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Lucro Hoje', value: fmt(stats.dailyProfit), sub: `CMV: ${fmt(stats.dailyCMV)} | Desp: ${fmt(stats.dailyExpenses)}` },
          { label: 'Lucro Mensal', value: fmt(stats.monthlyProfit), sub: `CMV: ${fmt(stats.monthlyCMV)} | Desp: ${fmt(stats.monthlyExpenses)}` },
          { label: 'Lucro Total', value: fmt(stats.totalProfit) },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold mt-1">{item.value}</p>
              {item.sub && <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Vendas vs Despesas vs CMV (6 meses)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Vendas" />
                <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4,4,0,0]} name="Despesas" />
                <Bar dataKey="cmv" fill="#F97316" radius={[4,4,0,0]} name="Custo Produtos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessDashboard;
