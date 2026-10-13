export function formatCurrency(amount: number, currency?: string | null): string {
  const label = !currency || currency === "PKR" ? "Rs." : currency;
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

export function formatDateTime(date: string | null, timeZone?: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
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

/** Current calendar month as `YYYY-MM` */
export function currentYearMonth(reference = new Date()): string {
  const y = reference.getFullYear();
  const m = String(reference.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** First day of current month as `YYYY-MM-01` for fee_records.billing_month */
export function currentBillingMonthDate(reference = new Date()): string {
  return `${currentYearMonth(reference)}-01`;
}

/** Inclusive calendar month range for expense_date filters (`YYYY-MM-DD`). */
export function yearMonthDateRange(yearMonth: string): { start: string; end: string } {
  const normalized = yearMonth.slice(0, 7);
  const [y, m] = normalized.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${normalized}-01`,
    end: `${normalized}-${String(lastDay).padStart(2, "0")}`,
  };
}
