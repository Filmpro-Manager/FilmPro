import { parseISO, isWithinInterval, startOfDay, endOfDay, format, differenceInCalendarDays } from "date-fns";
import type { Appointment, Transaction, Quote, Client, Product, Employee, Goal } from "@/types";

export interface ReportFilter {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  employeeId?: string;
  clientId?: string;
}

export function inRange(dateStr: string, filter: ReportFilter): boolean {
  try {
    const d = parseISO(dateStr);
    return isWithinInterval(d, {
      start: startOfDay(parseISO(filter.from)),
      end:   endOfDay(parseISO(filter.to)),
    });
  } catch { return false; }
}

// ─── Financeiro ──────────────────────────────────────────────────────────────

export function computeFinanceiro(transactions: Transaction[], filter: ReportFilter) {
  const inFilter = transactions.filter((t) => inRange(t.date, filter));
  const emp = filter.employeeId;
  const cli = filter.clientId;

  const filtered = inFilter.filter((t) => {
    if (emp && t.clientId !== emp) {/* employee filter not on transactions */}
    if (cli && t.clientId && t.clientId !== cli) return false;
    return true;
  });

  const income  = filtered.filter((t) => t.type === "income");
  const expense = filtered.filter((t) => t.type === "expense");

  const totalIncome  = income.reduce((a, t) => a + t.amount, 0);
  const totalExpense = expense.reduce((a, t) => a + t.amount, 0);
  const grossProfit  = totalIncome - totalExpense;
  const margin       = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  // by category
  const byCategoryIncome: Record<string, number>  = {};
  const byCategoryExpense: Record<string, number> = {};
  income.forEach((t)  => { byCategoryIncome[t.category]  = (byCategoryIncome[t.category]  || 0) + t.amount; });
  expense.forEach((t) => { byCategoryExpense[t.category] = (byCategoryExpense[t.category] || 0) + t.amount; });

  // by month (for charts)
  const byMonth: Record<string, { month: string; Receita: number; Despesa: number; Lucro: number }> = {};
  filtered.forEach((t) => {
    const key = t.date.substring(0, 7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = { month: key, Receita: 0, Despesa: 0, Lucro: 0 };
    if (t.type === "income")  byMonth[key].Receita += t.amount;
    else                      byMonth[key].Despesa += t.amount;
  });
  const monthlyData = Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({ ...row, Lucro: row.Receita - row.Despesa }));

  // contas a pagar / receber
  const toReceive = transactions.filter((t) => t.type === "income"  && !t.isPaid && t.dueDate && inRange(t.dueDate, filter));
  const toPay     = transactions.filter((t) => t.type === "expense" && !t.isPaid && t.dueDate && inRange(t.dueDate, filter));

  // inadimplência: receitas vencidas e não pagas
  const today = new Date();
  const overdue = transactions.filter((t) => {
    if (t.type !== "income" || t.isPaid) return false;
    if (!t.dueDate) return false;
    return parseISO(t.dueDate) < today;
  });

  // categorias de despesa para DRE
  const getCat = (names: string[]) =>
    expense.filter((t) => names.some(n => t.category.toLowerCase().includes(n.toLowerCase())))
           .reduce((a, t) => a + t.amount, 0);

  const dreSalaries  = getCat(["salário", "salario", "comissão", "comissao", "funcionário", "funcionario"]);
  const dreMaterial  = getCat(["material", "produto", "estoque"]);
  const dreRent      = getCat(["aluguel", "utility", "utilidade", "energia"]);
  const dreMarketing = getCat(["marketing", "publicidade", "propaganda"]);
  const dreOther     = totalExpense - dreSalaries - dreMaterial - dreRent - dreMarketing;

  return {
    totalIncome, totalExpense, grossProfit, margin,
    byCategoryIncome, byCategoryExpense,
    monthlyData,
    toReceive, toPay, overdue,
    dreSalaries, dreMaterial, dreRent, dreMarketing, dreOther: Math.max(0, dreOther),
  };
}

// ─── Comercial ───────────────────────────────────────────────────────────────

export function computeComercial(
  services: Appointment[],
  quotes: Quote[],
  goals: Goal[],
  employees: Employee[],
  filter: ReportFilter
) {
  const svc = services.filter((s) => {
    if (!inRange(s.date, filter)) return false;
    if (filter.employeeId && s.employeeId !== filter.employeeId) return false;
    if (filter.clientId   && s.clientId   !== filter.clientId)   return false;
    return true;
  });

  const q = quotes.filter((q) => {
    if (!inRange(q.issueDate, filter)) return false;
    if (filter.clientId && q.clientId !== filter.clientId) return false;
    return true;
  });

  const completed   = svc.filter((s) => s.status === "completed");
  const cancelled   = svc.filter((s) => s.status === "cancelled");
  const totalRev    = completed.reduce((a, s) => a + s.value, 0);
  const ticket      = completed.length > 0 ? totalRev / completed.length : 0;
  const converted   = q.filter((q) => q.convertedToAppointmentId);
  const convRate    = q.length > 0 ? (converted.length / q.length) * 100 : 0;

  // by month
  const byMonth: Record<string, { month: string; Servicos: number; Receita: number }> = {};
  completed.forEach((s) => {
    const key = s.date.substring(0, 7);
    if (!byMonth[key]) byMonth[key] = { month: key, Servicos: 0, Receita: 0 };
    byMonth[key].Servicos++;
    byMonth[key].Receita += s.value;
  });
  const monthlyData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

  // ranking employees
  const empRevMap: Record<string, { name: string; count: number; revenue: number }> = {};
  completed.forEach((s) => {
    if (!empRevMap[s.employeeId]) empRevMap[s.employeeId] = { name: s.employeeName, count: 0, revenue: 0 };
    empRevMap[s.employeeId].count++;
    empRevMap[s.employeeId].revenue += s.value;
  });
  const empRanking = Object.values(empRevMap).sort((a, b) => b.revenue - a.revenue);

  // meta vs realizado (current period month)
  const currentPeriod = filter.from.substring(0, 7);
  const relevantGoals = goals.filter((g) => g.period === currentPeriod && !g.employeeId);

  // services by client
  const byClient: Record<string, { name: string; count: number; revenue: number }> = {};
  completed.forEach((s) => {
    if (!byClient[s.clientId]) byClient[s.clientId] = { name: s.clientName, count: 0, revenue: 0 };
    byClient[s.clientId].count++;
    byClient[s.clientId].revenue += s.value;
  });
  const topClients = Object.values(byClient).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return {
    total: svc.length, completed: completed.length, cancelled: cancelled.length,
    totalRev, ticket, convRate,
    quotesTotal: q.length, quotesConverted: converted.length,
    monthlyData, empRanking, relevantGoals, topClients,
  };
}

// ─── Operacional ─────────────────────────────────────────────────────────────

export function computeOperacional(services: Appointment[], filter: ReportFilter) {
  const svc = services.filter((s) => {
    if (!inRange(s.date, filter)) return false;
    if (filter.employeeId && s.employeeId !== filter.employeeId) return false;
    if (filter.clientId   && s.clientId   !== filter.clientId)   return false;
    return true;
  });

  const completed = svc.filter((s) => s.status === "completed");
  const reworks   = svc.filter((s) => s.isRework);

  const totalMinutes = completed.reduce((a, s) => a + (s.actualMinutes || s.estimatedMinutes || 0), 0);
  const avgMinutes   = completed.length > 0 ? totalMinutes / completed.length : 0;
  const reworkRate   = svc.length > 0 ? (reworks.length / svc.length) * 100 : 0;

  // by service type
  const byType: Record<string, { name: string; count: number; revenue: number; minutes: number }> = {};
  completed.forEach((s) => {
    const key = s.serviceType || "Não especificado";
    if (!byType[key]) byType[key] = { name: key, count: 0, revenue: 0, minutes: 0 };
    byType[key].count++;
    byType[key].revenue += s.value;
    byType[key].minutes += s.actualMinutes || s.estimatedMinutes || 0;
  });
  const byServiceType = Object.values(byType).sort((a, b) => b.count - a.count);

  // by employee
  const byEmp: Record<string, { name: string; count: number; revenue: number; avgMinutes: number; reworks: number }> = {};
  svc.forEach((s) => {
    if (!byEmp[s.employeeId]) byEmp[s.employeeId] = { name: s.employeeName, count: 0, revenue: 0, avgMinutes: 0, reworks: 0 };
    if (s.status === "completed") { byEmp[s.employeeId].count++; byEmp[s.employeeId].revenue += s.value; }
    if (s.isRework) byEmp[s.employeeId].reworks++;
  });
  // calc avg minutes per employee
  const empMinutes: Record<string, number[]> = {};
  completed.forEach((s) => {
    if (!empMinutes[s.employeeId]) empMinutes[s.employeeId] = [];
    empMinutes[s.employeeId].push(s.actualMinutes || s.estimatedMinutes || 0);
  });
  Object.keys(empMinutes).forEach((id) => {
    if (byEmp[id]) {
      const arr = empMinutes[id];
      byEmp[id].avgMinutes = arr.length > 0 ? arr.reduce((a, v) => a + v, 0) / arr.length : 0;
    }
  });
  const empProductivity = Object.values(byEmp).sort((a, b) => b.revenue - a.revenue);

  // time between quote creation and appointment
  const leadTimes: number[] = svc
    .filter((s) => s.quoteId && s.date)
    .map((s) => {
      // estimate: use createdAt if available
      return 0; // placeholder since we don't have direct link
    });
  const avgLeadDays = leadTimes.length > 0 ? leadTimes.reduce((a, v) => a + v, 0) / leadTimes.length : 0;

  // by month
  const byMonth: Record<string, { month: string; Realizados: number; Cancelados: number; Retrabalhos: number }> = {};
  svc.forEach((s) => {
    const key = s.date.substring(0, 7);
    if (!byMonth[key]) byMonth[key] = { month: key, Realizados: 0, Cancelados: 0, Retrabalhos: 0 };
    if (s.status === "completed") byMonth[key].Realizados++;
    if (s.status === "cancelled") byMonth[key].Cancelados++;
    if (s.isRework) byMonth[key].Retrabalhos++;
  });
  const monthlyData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

  return {
    total: svc.length, completed: completed.length, reworks: reworks.length,
    avgMinutes, reworkRate, avgLeadDays,
    byServiceType, empProductivity, monthlyData,
  };
}

// ─── Estoque ─────────────────────────────────────────────────────────────────

export function computeEstoque(products: Product[], services: Appointment[], filter: ReportFilter) {
  const svcInRange = services.filter((s) => inRange(s.date, filter) && s.status === "completed");

  const belowMin = products.filter((p) => p.availableMeters < p.minimumStock);

  // consumo por produto
  const consumoMap: Record<string, { name: string; consumed: number; cost: number }> = {};
  svcInRange.forEach((s) => {
    (s.materialsUsed || []).forEach((m) => {
      if (!consumoMap[m.productId]) consumoMap[m.productId] = { name: m.productName, consumed: 0, cost: 0 };
      consumoMap[m.productId].consumed += m.meters;
      consumoMap[m.productId].cost     += m.meters * (m.costPrice || 0);
    });
  });
  const consumo = Object.values(consumoMap).sort((a, b) => b.consumed - a.consumed);

  const totalConsumo = consumo.reduce((a, c) => a + c.cost, 0);
  const totalStock   = products.reduce((a, p) => a + p.availableMeters * p.costPrice, 0);

  // giro de estoque: consumo / estoque médio (simplificado)
  const avgStock     = products.reduce((a, p) => a + (p.availableMeters * p.costPrice), 0);
  const giro         = avgStock > 0 ? totalConsumo / avgStock : 0;

  // custo médio de material por serviço
  const svcWithMaterials = svcInRange.filter((s) => (s.materialsUsed?.length || 0) > 0);
  const avgMaterialCost  = svcWithMaterials.length > 0 ? totalConsumo / svcWithMaterials.length : 0;

  // impacto do custo na margem: (materialCost / totalRevenue) * 100
  const totalRev   = svcInRange.reduce((a, s) => a + s.value, 0);
  const marginImpact = totalRev > 0 ? (totalConsumo / totalRev) * 100 : 0;

  // por tipo de serviço
  const byType: Record<string, { name: string; cost: number; count: number }> = {};
  svcInRange.forEach((s) => {
    const matCost = (s.materialsUsed || []).reduce((a, m) => a + m.meters * (m.costPrice || 0), 0);
    if (matCost === 0) return;
    const key = s.serviceType || "Outros";
    if (!byType[key]) byType[key] = { name: key, cost: 0, count: 0 };
    byType[key].cost  += matCost;
    byType[key].count += 1;
  });
  const consumoByType = Object.values(byType).sort((a, b) => b.cost - a.cost);

  return {
    totalProducts: products.length, belowMin: belowMin.length,
    belowMinList: belowMin, giro, avgMaterialCost, marginImpact,
    totalStock, totalConsumo, consumo, consumoByType, products,
  };
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export function computeClientes(clients: Client[], services: Appointment[], filter: ReportFilter) {
  const svcInRange = services.filter((s) => inRange(s.date, filter) && s.status === "completed");

  const active   = clients.filter((c) => c.lifecycle === "active" || c.lifecycle === "new");
  const atRisk   = clients.filter((c) => c.lifecycle === "at_risk");
  const inactive = clients.filter((c) => c.lifecycle === "inactive");
  const newC     = clients.filter((c) => c.lifecycle === "new");

  // clientes que mais geram receita
  const revenueMap: Record<string, { name: string; revenue: number; count: number }> = {};
  svcInRange.forEach((s) => {
    if (!revenueMap[s.clientId]) revenueMap[s.clientId] = { name: s.clientName, revenue: 0, count: 0 };
    revenueMap[s.clientId].revenue += s.value;
    revenueMap[s.clientId].count++;
  });
  const topClients = Object.values(revenueMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // LTV médio
  const avgLTV = clients.length > 0 ? clients.reduce((a, c) => a + (c.ltv || c.totalSpent || 0), 0) / clients.length : 0;

  // frequência média de contratação (serviços por cliente)
  const clientCounts = Object.values(revenueMap).map((c) => c.count);
  const avgFreq = clientCounts.length > 0 ? clientCounts.reduce((a, v) => a + v, 0) / clientCounts.length : 0;

  // NPS (se houver ratings)
  // ratings aren't passed here, handled in component

  return {
    total: clients.length,
    active: active.length,
    atRisk: atRisk.length,
    inactive: inactive.length,
    newClients: newC.length,
    avgLTV, avgFreq, topClients,
  };
}

// ─── Estratégico ─────────────────────────────────────────────────────────────

export function computeEstrategico(transactions: Transaction[], services: Appointment[]) {
  // últimos 12 meses
  const now   = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(format(d, "yyyy-MM"));
  }

  const monthlyRevenue: Record<string, number> = {};
  const monthlyExpense: Record<string, number> = {};
  months.forEach((m) => { monthlyRevenue[m] = 0; monthlyExpense[m] = 0; });

  transactions.forEach((t) => {
    const key = t.date.substring(0, 7);
    if (monthlyRevenue[key] !== undefined) {
      if (t.type === "income")  monthlyRevenue[key] += t.amount;
      else                      monthlyExpense[key]  += t.amount;
    }
  });

  const growthData = months.map((m, i) => ({
    month: m,
    Receita: monthlyRevenue[m],
    Despesa: monthlyExpense[m],
    Lucro: monthlyRevenue[m] - monthlyExpense[m],
    growth: i > 0 && monthlyRevenue[months[i - 1]] > 0
      ? ((monthlyRevenue[m] - monthlyRevenue[months[i - 1]]) / monthlyRevenue[months[i - 1]]) * 100
      : 0,
  }));

  // MoM atual
  const curRev  = monthlyRevenue[months[months.length - 1]] || 0;
  const prevRev = monthlyRevenue[months[months.length - 2]] || 0;
  const mom     = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;

  // vs same month last year
  const sameLastYear = months[months.length - 13] ? (monthlyRevenue[months[months.length - 13]] || 0) : 0;
  const yoy = sameLastYear > 0 ? ((curRev - sameLastYear) / sameLastYear) * 100 : 0;

  // projeção: média últimos 3 meses
  const last3 = months.slice(-3).map((m) => monthlyRevenue[m]);
  const projection = last3.length > 0 ? last3.reduce((a, v) => a + v, 0) / last3.length : 0;

  // sazonalidade por dia da semana
  const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const dayCount: number[] = Array(7).fill(0);
  const dayRev:   number[] = Array(7).fill(0);
  services.filter((s) => s.status === "completed").forEach((s) => {
    try {
      const d = parseISO(s.date).getDay();
      dayCount[d]++;
      dayRev[d] += s.value;
    } catch { /* ignore */ }
  });
  const seasonality = DAYS.map((name, i) => ({ name, count: dayCount[i], revenue: dayRev[i] }));

  return { growthData, mom, yoy, projection, curRev, prevRev, seasonality };
}
