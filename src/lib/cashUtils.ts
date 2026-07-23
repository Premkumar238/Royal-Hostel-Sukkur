import type { CashBudget } from "@/types/database";

export function sumCashIn(entries: Pick<CashBudget, "amount" | "entry_type">[]): number {
  return entries
    .filter((e) => (e.entry_type ?? "in") === "in")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

export function sumCashOut(entries: Pick<CashBudget, "amount" | "entry_type">[]): number {
  return entries
    .filter((e) => e.entry_type === "out")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

export function netCashBudget(entries: Pick<CashBudget, "amount" | "entry_type">[]): number {
  return sumCashIn(entries) - sumCashOut(entries);
}

export function getInitialInvestment(
  entries: Pick<CashBudget, "amount" | "entry_type" | "entry_date" | "created_at">[]
): number | null {
  const inEntries = entries.filter((e) => (e.entry_type ?? "in") === "in");
  if (inEntries.length === 0) return null;

  const oldest = [...inEntries].sort((a, b) => {
    const byDate = new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];

  return Number(oldest.amount || 0);
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function isInMonth(date: string, month: string): boolean {
  return monthKey(date) === month;
}

function isAfterMonth(date: string, month: string): boolean {
  return monthKey(date) > month;
}

function feeMonth(fee: { payment_date: string | null; billing_month: string }): string {
  const date = fee.payment_date ?? fee.billing_month;
  return monthKey(date);
}

export interface BusinessBudgetSummary {
  budget: number;
  startingMonth: string | null;
  remainingAfterStartingMonth: number;
  netProfit: number;
  cashAdjustmentsAfterStart: number;
  startMonthFees: number;
  profitContribution: number;
  totalPaidFees: number;
  totalExpenses: number;
  initialInvestment: number | null;
}

export function calculateBusinessBudget(
  cashEntries: CashBudget[],
  expenses: { amount: number; expense_date: string }[],
  paidFees: { amount: number; payment_date: string | null; billing_month: string }[]
): BusinessBudgetSummary {
  const totalCashIn = sumCashIn(cashEntries);
  const totalCashOut = sumCashOut(cashEntries);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalPaidFees = paidFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const inEntries = cashEntries.filter((e) => (e.entry_type ?? "in") === "in");
  if (inEntries.length === 0) {
    const netProfit = totalPaidFees - totalExpenses;
    return {
      budget: netProfit,
      startingMonth: null,
      remainingAfterStartingMonth: 0,
      netProfit,
      cashAdjustmentsAfterStart: 0,
      startMonthFees: 0,
      profitContribution: netProfit,
      totalPaidFees,
      totalExpenses,
      initialInvestment: null,
    };
  }

  const firstIn = [...inEntries].sort((a, b) => {
    const byDate = new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];

  const startingMonth = monthKey(firstIn.entry_date);
  const initialInvestment = Number(firstIn.amount || 0);

  const startMonthCashIn = cashEntries
    .filter((e) => (e.entry_type ?? "in") === "in" && isInMonth(e.entry_date, startingMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const startMonthCashOut = cashEntries
    .filter((e) => e.entry_type === "out" && isInMonth(e.entry_date, startingMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const startMonthExpenses = expenses
    .filter((e) => isInMonth(e.expense_date, startingMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const remainingAfterStartingMonth =
    startMonthCashIn - startMonthCashOut - startMonthExpenses;

  const feesAfterStart = paidFees
    .filter((f) => isAfterMonth(feeMonth(f), startingMonth))
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const startMonthFees = paidFees
    .filter((f) => isInMonth(feeMonth(f), startingMonth))
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const expensesAfterStart = expenses
    .filter((e) => isAfterMonth(e.expense_date, startingMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const cashInAfterStart = cashEntries
    .filter((e) => (e.entry_type ?? "in") === "in" && isAfterMonth(e.entry_date, startingMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const cashOutAfterStart = cashEntries
    .filter((e) => e.entry_type === "out" && isAfterMonth(e.entry_date, startingMonth))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const netProfit = feesAfterStart - expensesAfterStart;
  const cashAdjustmentsAfterStart = cashInAfterStart - cashOutAfterStart;
  const profitContribution = netProfit + cashAdjustmentsAfterStart + startMonthFees;
  const budget = remainingAfterStartingMonth + profitContribution;

  return {
    budget,
    startingMonth,
    remainingAfterStartingMonth,
    netProfit,
    cashAdjustmentsAfterStart,
    startMonthFees,
    profitContribution,
    totalPaidFees,
    totalExpenses,
    initialInvestment,
  };
}
