import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCouple, useCoupleTransactions, useCoupleWallets, usePartnerProfile } from '@/hooks/useCoupleData';
import { Heart, TrendingUp, TrendingDown, ArrowRightLeft, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CoupleDashboard = () => {
  const { user } = useAuth();
  const { data: couple, isLoading: loadingCouple } = useCouple();
  const coupleId = couple?.id;
  const { data: transactions = [] } = useCoupleTransactions(coupleId);
  const { data: wallets = [] } = useCoupleWallets(coupleId);

  const partnerId = couple ? (couple.user1_id === user?.id ? couple.user2_id : couple.user1_id) : undefined;
  const { data: partnerProfile } = usePartnerProfile(partnerId);

  if (loadingCouple) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!couple) return <Navigate to="/couple/invite" replace />;

  const myName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Eu';
  const partnerName = partnerProfile?.full_name || 'Parceiro(a)';

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpenses;

  // Calculate who owes whom for shared expenses
  const sharedExpenses = transactions.filter((t: any) => t.type === 'expense' && t.expense_type === 'shared');
  let myPaidShared = 0;
  let partnerPaidShared = 0;
  let myOwed = 0;
  let partnerOwed = 0;

  sharedExpenses.forEach((t: any) => {
    const amount = Number(t.amount);
    const splitPct = Number(t.split_percentage) / 100;
    if (t.paid_by === user?.id) {
      myPaidShared += amount;
      // Partner owes their share
      partnerOwed += amount * (1 - splitPct);
    } else {
      partnerPaidShared += amount;
      // I owe my share
      myOwed += amount * splitPct;
    }
  });

  const netBalance = partnerOwed - myOwed; // positive = partner owes me

  const myExpenses = transactions.filter((t: any) => t.type === 'expense' && t.paid_by === user?.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const partnerExpenses = transactions.filter((t: any) => t.type === 'expense' && t.paid_by !== user?.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExp = myExpenses + partnerExpenses;
  const myPct = totalExp > 0 ? (myExpenses / totalExp) * 100 : 50;

  const cards = [
    { title: 'Receitas', value: totalIncome, icon: TrendingUp, color: 'text-accent' },
    { title: 'Despesas', value: totalExpenses, icon: TrendingDown, color: 'text-destructive' },
    { title: 'Saldo', value: balance, icon: Wallet, color: balance >= 0 ? 'text-accent' : 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-6 w-6 text-pink-500" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Casal</h1>
          <p className="text-muted-foreground">{myName} & {partnerName}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.title}</p>
                    <p className={`text-xl font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
                  </div>
                  <c.icon className={`h-8 w-8 ${c.color} opacity-30`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Balance between partners */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-pink-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-pink-500" />
              Acertar Contas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Math.abs(netBalance) < 0.01 ? (
              <p className="text-center text-muted-foreground py-2">✅ Tudo acertado! Ninguém deve nada.</p>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {netBalance > 0
                    ? `${partnerName} deve para ${myName}:`
                    : `${myName} deve para ${partnerName}:`}
                </p>
                <p className="text-2xl font-bold text-pink-500">{formatCurrency(Math.abs(netBalance))}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Contribution comparison */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Comparação de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{myName}: {formatCurrency(myExpenses)}</span>
              <span>{partnerName}: {formatCurrency(partnerExpenses)}</span>
            </div>
            <div className="flex gap-1 h-4 rounded-full overflow-hidden">
              <div className="bg-primary transition-all" style={{ width: `${myPct}%` }} />
              <div className="bg-pink-500 transition-all" style={{ width: `${100 - myPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{myPct.toFixed(0)}%</span>
              <span>{(100 - myPct).toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Wallets */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Carteiras</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {wallets.map((w: any) => (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                  <div>
                    <p className="text-sm font-medium">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.type === 'shared' ? 'Compartilhada' : 'Individual'}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold mt-2">{formatCurrency(Number(w.balance))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Nenhuma transação ainda</p>
          ) : (
            <div className="divide-y divide-border">
              {transactions.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                      {t.type === 'income' ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString('pt-BR')} • {t.paid_by === user?.id ? myName : partnerName}
                        {t.expense_type === 'shared' ? ' • Compartilhado' : ' • Pessoal'}
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
    </div>
  );
};

export default CoupleDashboard;
