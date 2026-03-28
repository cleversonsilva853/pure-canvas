import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts, useTransactions, useGoals, useBudgets, useCategories } from '@/hooks/useFinanceData';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Target,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(280, 67%, 60%)', 'hsl(0, 84%, 60%)', 'hsl(190, 80%, 50%)'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

const Index = () => {
  const navigate = useNavigate();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: goals = [] } = useGoals();
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + Number(acc.balance), 0),
    [accounts]
  );

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount);
      else if (t.type === 'expense') expense += Number(t.amount);
    });
    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  const categoryExpenses = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    transactions
      .filter((t) => t.type === 'expense' && t.category)
      .forEach((t) => {
        const cat = t.category!;
        const existing = map.get(cat.id);
        if (existing) {
          existing.value += Number(t.amount);
        } else {
          map.set(cat.id, { name: cat.name, value: Number(t.amount), color: cat.color || COLORS[map.size % COLORS.length] });
        }
      });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const last7Days = useMemo(() => {
    const days: { name: string; receitas: number; despesas: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      let receitas = 0;
      let despesas = 0;
      transactions.forEach((t) => {
        if (t.date === dateStr) {
          if (t.type === 'income') receitas += Number(t.amount);
          else if (t.type === 'expense') despesas += Number(t.amount);
        }
      });
      days.push({ name: dayName, receitas, despesas });
    }
    return days;
  }, [transactions]);

  const exceededBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category_id === b.category_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return spent > Number(b.amount);
    });
  }, [budgets, transactions]);

  const summaryCards = [
    {
      title: 'Saldo Total',
      value: formatCurrency(totalBalance),
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Receitas do Mês',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'Despesas do Mês',
      value: formatCurrency(totalExpense),
      icon: TrendingDown,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      title: 'Balanço do Mês',
      value: formatCurrency(totalIncome - totalExpense),
      icon: ArrowUpDown,
      color: totalIncome - totalExpense >= 0 ? 'text-accent' : 'text-destructive',
      bg: totalIncome - totalExpense >= 0 ? 'bg-accent/10' : 'bg-destructive/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <Button onClick={() => navigate('/transactions')} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova transação</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-xl ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">{card.title}</p>
                <p className={`text-lg md:text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas vs Despesas (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="receitas" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryExpenses.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma despesa registrada este mês
                </div>
              ) : (
                <div className="h-64 flex items-center">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryExpenses}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryExpenses.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-64">
                    {categoryExpenses.slice(0, 5).map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate flex-1">{cat.name}</span>
                        <span className="font-medium text-muted-foreground">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alerts & Goals */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exceededBudgets.length === 0 && accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Comece adicionando suas contas e transações para receber alertas inteligentes.
                </p>
              ) : exceededBudgets.length === 0 ? (
                <p className="text-sm text-accent">✓ Todos os orçamentos estão dentro do limite!</p>
              ) : (
                <div className="space-y-3">
                  {exceededBudgets.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <span className="text-sm">
                        Orçamento de <strong>{((b as unknown) as { category?: { name: string } }).category?.name || 'Categoria'}</strong> excedido
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Goals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Metas Financeiras
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>
                Ver todas
              </Button>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma meta definida. Comece criando suas metas financeiras!
                </p>
              ) : (
                <div className="space-y-4">
                  {goals.slice(0, 3).map((goal) => {
                    const progress = Number(goal.target_amount) > 0
                      ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
                      : 0;
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{goal.name}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(Number(goal.current_amount))} / {formatCurrency(Number(goal.target_amount))}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transações Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transação registrada este mês.</p>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-accent/10' : 'bg-destructive/10'}`}
                      >
                        {t.type === 'income' ? (
                          <TrendingUp className="h-4 w-4 text-accent" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.description || (t.category as { name?: string } | null)?.name || 'Sem descrição'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.date).toLocaleDateString('pt-BR')}
                          {(t.category as { name?: string } | null)?.name ? ` • ${(t.category as { name: string }).name}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-accent' : 'text-destructive'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Index;
