export function formatCurrency(amount: number): string;
export function formatCurrency(amount: number, currency: string): string;
export function formatCurrency(amount: number, currency = "Rs."): string {
  const label = currency === "PKR" ? "Rs." : currency;
  return `${label} ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function calcProfitMargin(income: number, expenses: number): number {
  if (income === 0) return 0;
  return Math.round(((income - expenses) / income) * 100);
}

export function calcOccupancyRate(occupied: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
}

/** First day of current month as `YYYY-MM-01` for fee_records.billing_month */
export function currentBillingMonthDate(reference = new Date()): string {
  const y = reference.getFullYear();
  const m = String(reference.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
