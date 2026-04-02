import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessExpenses, useBusinessSales, useBusinessAccounts } from '@/hooks/useBusinessData';
import { DollarSign, TrendingDown, TrendingUp, Percent, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTodayInputDate } from '@/lib/utils';

const businessSections = [
  { label: 'Painel Empresa', value: '/business' },
  { label: 'Despesas', value: '/business/expenses' },
  { label: 'Vendas', value: '/business/sales' },
  { label: 'Produtos', value: '/business/products' },
  { label: 'Precificação', value: '/business/pricing' },
  { label: 'DRE', value: '/business/dre' },
  { label: 'Contas', value: '/business/accounts' },
];

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { data: expenses = [] } = useBusinessExpenses();
  const { data: sales = [] } = useBusinessSales();
  const { data: accounts = [] } = useBusinessAccounts();

  const today = getTodayInputDate();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalSales = sales.reduce((s, e) => s + Number(e.total_price), 0);
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
    const dailyExpenses = expenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0);
    const dailySales = sales.filter(e => e.date === today).reduce((s, e) => s + Number(e.total_price), 0);
    const monthlyExpenses = expenses.filter(e => { 
      const [y, m] = e.date.split('-').map(Number);
      return (m - 1) === currentMonth && y === currentYear; 
    }).reduce((s, e) => s + Number(e.amount), 0);
    const monthlySales = sales.filter(e => { 
      const [y, m] = e.date.split('-').map(Number);
      return (m - 1) === currentMonth && y === currentYear; 
    }).reduce((s, e) => s + Number(e.total_price), 0);

    const totalProfit = totalSales - totalExpenses;
    const dailyProfit = dailySales - dailyExpenses;
    const monthlyProfit = monthlySales - monthlyExpenses;
    const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    return { totalExpenses, totalSales, totalBalance, dailyExpenses, dailySales, monthlyExpenses, monthlySales, totalProfit, dailyProfit, monthlyProfit, margin };
  }, [expenses, sales, accounts, today, currentMonth, currentYear]);

  const chartData = useMemo(() => {
    const months: Record<string, { name: string; vendas: number; despesas: number }> = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = { name: monthNames[d.getMonth()], vendas: 0, despesas: 0 };
    }
    sales.forEach(s => { 
      const [y, m] = s.date.split('-').map(Number);
      const k = `${y}-${m - 1}`; 
      if (months[k]) months[k].vendas += Number(s.total_price); 
    });
    expenses.forEach(e => { 
      const [y, m] = e.date.split('-').map(Number);
      const k = `${y}-${m - 1}`; 
      if (months[k]) months[k].despesas += Number(e.amount); 
    });
    return Object.values(months);
  }, [expenses, sales, currentMonth, currentYear]);

  const cards = [
    { title: 'Saldo em Contas', value: fmt(stats.totalBalance), icon: Wallet, color: 'text-primary' },
    { title: 'Faturamento Total', value: fmt(stats.totalSales), icon: DollarSign, color: 'text-emerald-500' },
    { title: 'Despesas Totais', value: fmt(stats.totalExpenses), icon: TrendingDown, color: 'text-red-500' },
    { title: 'Lucro Total', value: fmt(stats.totalProfit), icon: TrendingUp, color: stats.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500' },
    { title: 'Margem de Lucro', value: `${stats.margin.toFixed(1)}%`, icon: Percent, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Financeiro Empresa</h1>
        <div className="w-full sm:w-56">
          <Select defaultValue="/business" onValueChange={(val) => navigate(val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Ir para..." />
            </SelectTrigger>
            <SelectContent>
              {businessSections.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
          { label: 'Lucro Hoje', value: fmt(stats.dailyProfit) },
          { label: 'Lucro Mensal', value: fmt(stats.monthlyProfit) },
          { label: 'Lucro Total', value: fmt(stats.totalProfit) },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Vendas vs Despesas (6 meses)</CardTitle></CardHeader>
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
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessDashboard;
