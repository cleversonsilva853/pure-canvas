import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCoupleTransactions, useCoupleMembers, useCoupleGoals, useCoupleBudgets } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Heart,
  Plus,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
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

const CoupleDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transactions = [], isLoading: loadingTransactions } = useCoupleTransactions();
  const { data: members = [] } = useCoupleMembers();
  const { data: goals = [], isLoading: loadingGoals } = useCoupleGoals();
  const { data: budgets = [], isLoading: loadingBudgets } = useCoupleBudgets();

  const isLoading = loadingTransactions || loadingGoals || loadingBudgets;

  const memberNames = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach(m => {
      map.set(m.user_id, m.name);
    });
    return map;
  }, [members]);

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount);
      else if (t.type === 'expense') expense += Number(t.amount);
    });
    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  // ... (rest of the logic remains same, just update the rendering part below)
  
  // Updating transactions map to use memberNames
  const lastTransactions = useMemo(() => {
    return transactions.slice(0, 10).map(t => {
      const name = memberNames.get(t.user_id) || 'Privado';
      return { ...t, authorName: name };
    });
  }, [transactions, memberNames]);

  const goalsWithProgress = useMemo(() => {
    return goals.map(g => {
      const progress = Math.min(Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100), 100);
      const name = memberNames.get(g.user_id) || 'Privado';
      const isOwner = g.user_id === user?.id;
      return { ...g, progress, authorName: name, isOwner };
    });
  }, [goals, memberNames, user?.id]);

  const budgetsWithProgress = useMemo(() => {
    // Agrupa gastos por categoria para comparar com orçamento
    const spentByCategory = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(t => {
        const catName = (t.category as { name?: string } | null)?.name;
        spentByCategory.set(catName, (spentByCategory.get(catName) || 0) + Number(t.amount));
      });

    return budgets.map(b => {
      const catName = (b.category as { name?: string } | null)?.name || 'Sem Categoria';
      const spent = spentByCategory.get(catName) || 0;
      const progress = Math.min(Math.round((spent / Number(b.amount)) * 100), 100);
      const name = memberNames.get(b.user_id) || 'Privado';
      const isOwner = b.user_id === user?.id;
      return { ...b, progress, spent, authorName: name, isOwner, catName };
    });
  }, [budgets, transactions, memberNames, user?.id]);

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
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
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

  const summaryCards = [
    {
      title: 'Renda Total do Casal',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'Despesa Total do Casal',
      value: formatCurrency(totalExpense),
      icon: TrendingDown,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      title: 'Balanço Geral',
      value: formatCurrency(totalIncome - totalExpense),
      icon: ArrowUpDown,
      color: totalIncome - totalExpense >= 0 ? 'text-accent' : 'text-destructive',
      bg: totalIncome - totalExpense >= 0 ? 'bg-accent/10' : 'bg-destructive/10',
    },
    {
      title: 'Economia Sugerida (20%)',
      value: formatCurrency(totalIncome * 0.2),
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Casal</h1>
          </div>
          <p className="text-muted-foreground">Visão financeira unificada das duas contas</p>
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
              <CardTitle className="text-base">Comparativo Semanal (Conjunto)</CardTitle>
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
              <CardTitle className="text-base">Gastos por Categoria (Casal)</CardTitle>
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

      {/* Couple Goals Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Nossas Metas e Sonhos</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma meta cadastrada ainda.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {goalsWithProgress.slice(0, 4).map((goal) => (
                  <div key={goal.id} className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{goal.name}</h4>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                          goal.isOwner ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600"
                        )}>
                          {goal.authorName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-1.5 mb-2" />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>{formatCurrency(Number(goal.current_amount))}</span>
                      <span>de {formatCurrency(Number(goal.target_amount))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Couple Budgets Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">Orçamentos Ativos (Foco Mensal)</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/budgets')}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum orçamento definido para este mês.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {budgetsWithProgress.slice(0, 4).map((budget) => (
                  <div key={budget.id} className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{budget.catName}</h4>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                          budget.isOwner ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600"
                        )}>
                          {budget.authorName}
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        budget.progress > 90 ? "text-destructive" : "text-primary"
                      )}>
                        {budget.progress}%
                      </span>
                    </div>
                    <Progress 
                      value={budget.progress} 
                      className="h-1.5 mb-2" 
                       
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Gasto: {formatCurrency(budget.spent)}</span>
                      <span>Limite: {formatCurrency(Number(budget.amount))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Transactions (Both Accounts) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas Movimentações unificadas</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
              Ver detalhes
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transação registrada este mês.</p>
            ) : (
              <div className="space-y-3">
                {lastTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/40">
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
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {formatDate(t.date)}
                          {(t.category as { name?: string } | null)?.name ? ` • ${(t.category as { name: string }).name}` : ''}
                          <span className={cn(
                            "ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                            t.user_id === transactions[0]?.user_id ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600"
                          )}>
                            {t.authorName}
                          </span>
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

export default CoupleDashboard;
