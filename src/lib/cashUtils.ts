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
