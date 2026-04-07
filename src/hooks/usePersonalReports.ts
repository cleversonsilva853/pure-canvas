import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, subDays, getDay, parseISO, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const usePersonalReportsData = (startDate: Date, endDate: Date) => {
  const { user } = useAuth();
  
  // Calculate relative delta for previous period analysis
  const daysDiff = Math.max(1, differenceInDays(endDate, startDate));
  // Shift back exactly delta days
  const prevStartDate = subDays(startDate, daysDiff);

  return useQuery({
    queryKey: ['personal_reports', user?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*), card:credit_cards(*)')
        .eq('user_id', user!.id)
        .gte('date', format(prevStartDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true }); // Important for progression graphs

      if (error) throw error;

      const currentPeriod: any[] = [];
      const previousPeriod: any[] = [];
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      data.forEach(t => {
        if (t.date >= startStr && t.date <= endStr) {
          currentPeriod.push(t);
        } else if (t.date < startStr) {
          previousPeriod.push(t);
        }
      });

      return processAnalytics(currentPeriod, previousPeriod, startDate, endDate);
    },
    enabled: !!user,
  });
};

function processAnalytics(current: any[], previous: any[], startDate: Date, endDate: Date) {
  // --- RAW TOTALS ---
  const sumIncome = (txs: any[]) => txs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const sumExpense = (txs: any[]) => txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

  const currInc = sumIncome(current);
  const currExp = sumExpense(current);
  const currBalance = currInc - currExp;
  
  const prevInc = sumIncome(previous);
  const prevExp = sumExpense(previous);
  const prevBalance = prevInc - prevExp;

  const calcDiff = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  const incomeGrowth = calcDiff(currInc, prevInc);
  const expenseGrowth = calcDiff(currExp, prevExp);
  const diffBalance = currBalance - prevBalance;

  // --- TICKET MEDIO ---
  const expensesOnly = current.filter(t => t.type === 'expense');
  const ticketMedio = expensesOnly.length > 0 ? currExp / expensesOnly.length : 0;

  // --- CATEGORIES (EXPENSES) ---
  const catMap = new Map<string, { name: string; value: number; fill?: string }>();
  // Soft color palette for specific charts
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
  let colorIdx = 0;
  
  expensesOnly.forEach(t => {
    const name = t.category?.name || 'Sem Categoria';
    if (!catMap.has(name)) {
      catMap.set(name, { name, value: 0, fill: colors[colorIdx % colors.length] });
      colorIdx++;
    }
    catMap.get(name)!.value += Number(t.amount);
  });
  const expensesByCategory = Array.from(catMap.values()).sort((a, b) => b.value - a.value); // desc

  // --- CATEGORIES (INCOME) ---
  const incMap = new Map<string, { name: string; value: number; fill?: string }>();
  let cIdxInc = 0;
  current.filter(t => t.type === 'income').forEach(t => {
    const name = t.category?.name || 'Sem Categoria';
    if (!incMap.has(name)) {
      incMap.set(name, { name, value: 0, fill: '#10b981' }); 
      cIdxInc++;
    }
    incMap.get(name)!.value += Number(t.amount);
  });
  const incomeBySource = Array.from(incMap.values()).sort((a, b) => b.value - a.value);

  // --- DAILY CASH FLOW & BALANCE EVOLUTION ---
  const dailyFlowMap = new Map<string, { dateLabel: string; rawDate: string; Receitas: number; Despesas: number; SaldoDia: number }>();
  
  // Fill all days between start and end with zeroes to display continuous lines even with empty days
  let traverseDate = new Date(startDate);
  while (traverseDate <= endDate) {
    const dStr = format(traverseDate, 'yyyy-MM-dd');
    dailyFlowMap.set(dStr, {
      dateLabel: format(traverseDate, 'dd/MM'),
      rawDate: dStr,
      Receitas: 0,
      Despesas: 0,
      SaldoDia: 0
    });
    traverseDate.setDate(traverseDate.getDate() + 1);
  }

  current.forEach(t => {
    if (dailyFlowMap.has(t.date)) {
      const obj = dailyFlowMap.get(t.date)!;
      if (t.type === 'income') obj.Receitas += Number(t.amount);
      else obj.Despesas += Number(t.amount);
      obj.SaldoDia = obj.Receitas - obj.Despesas;
    }
  });

  const dailyFlowArray = Array.from(dailyFlowMap.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  
  let progressiveBalance = 0;
  const balanceEvolution = dailyFlowArray.map(day => {
    progressiveBalance += day.SaldoDia; // Acumula o saldo
    return {
      dateLabel: day.dateLabel,
      Acumulado: progressiveBalance
    };
  });

  // --- COMPORTAMENTO (Dia da semana) ---
  const weeklyMap = [
    { name: 'Dom', value: 0 }, { name: 'Seg', value: 0 }, { name: 'Ter', value: 0 },
    { name: 'Qua', value: 0 }, { name: 'Qui', value: 0 }, { name: 'Sex', value: 0 }, { name: 'Sáb', value: 0 },
  ];
  expensesOnly.forEach(t => {
    const dateObj = parse(t.date, 'yyyy-MM-dd', new Date());
    const dow = getDay(dateObj); // 0 = Sunday
    weeklyMap[dow].value += Number(t.amount);
  });

  // --- FORMA DE PAGAMENTO ---
  const paymentMap = new Map<string, { name: string; value: number }>();
  expensesOnly.forEach(t => {
    let mode = 'Saldo/Dinheiro'; // is_paid = true sem credit_card
    if (t.credit_card_id && !t.is_paid) {
      mode = t.card?.name || 'Cartão de Crédito';
    }
    const exist = paymentMap.get(mode);
    if (exist) exist.value += Number(t.amount);
    else paymentMap.set(mode, { name: mode, value: Number(t.amount) });
  });
  const paymentModes = Array.from(paymentMap.values());

  // --- SMART INSIGHTS ---
  let insights = [];
  if (expensesByCategory.length > 0) {
    const top = expensesByCategory[0];
    if (top.value > currExp * 0.4) {
      insights.push({ 
        type: 'alert', 
        message: `Atenção: A categoria "${top.name}" representa mais de 40% dos seus gastos! (R$ ${top.value.toFixed(2)})` 
      });
    }
  }

  if (expenseGrowth > 20) {
    insights.push({
      type: 'warning',
      message: `Seus gastos aumentaram ${expenseGrowth.toFixed(1)}% em relação ao período anterior.`
    });
  } else if (expenseGrowth < -10) {
    insights.push({
      type: 'success',
      message: `Excelente! Você economizou ${Math.abs(expenseGrowth).toFixed(1)}% nas despesas versus o período anterior.`
    });
  }

  if (currInc === 0 && currExp > 0) {
    insights.push({ type: 'warning', message: 'Você teve gastos no período, mas nenhuma receita registrada.' });
  }

  return {
    rawCurrent: current,
    kpis: {
      totalIncome: currInc,
      totalExpense: currExp,
      balance: currBalance,
      ticketMedio,
      incomeGrowth,
      expenseGrowth,
      diffBalance
    },
    charts: {
      expensesByCategory,
      incomeBySource,
      dailyFlow: dailyFlowArray,
      balanceEvolution,
      expensesByDayOfWeek: weeklyMap,
      paymentModes
    },
    insights
  };
}
