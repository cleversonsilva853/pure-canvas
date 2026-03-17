import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions, useCategories } from '@/hooks/useFinanceData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(280, 67%, 60%)', 'hsl(0, 84%, 60%)', 'hsl(190, 80%, 50%)'];

const Reports = () => {
  const { data: transactions = [] } = useTransactions();

  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
      const cat = (t.category as any);
      const existing = map.get(cat.id);
      if (existing) existing.value += Number(t.amount);
      else map.set(cat.id, { name: cat.name, value: Number(t.amount) });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; receitas: number; despesas: number }>();
    transactions.forEach(t => {
      const existing = map.get(t.date);
      if (existing) {
        if (t.type === 'income') existing.receitas += Number(t.amount);
        else existing.despesas += Number(t.amount);
      } else {
        map.set(t.date, {
          date: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          receitas: t.type === 'income' ? Number(t.amount) : 0,
          despesas: t.type === 'expense' ? Number(t.amount) : 0,
        });
      }
    });
    return Array.from(map.values());
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
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
