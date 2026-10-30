import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialChartPoint } from "@/types/database";
import { getCombinedInvoiceStatus } from "@/lib/studentInvoice";

export type MergedHostelSummary = {
  hostel_id: string;
  hostel_name: string;
  rent_collected: number;
  mess_collected: number;
  staff_expenses: number;
  mess_operating_expenses: number;
  other_expenses: number;
  total_advance: number;
};

export type StudentBillingRow = {
  hostel_name: string;
  student_name: string;
  student_code: string;
  advance_amount: number;
  rent_amount: number;
  mess_amount: number;
  rent_status: string | null;
  mess_status: string | null;
  payment_date: string | null;
  invoice_code: string | null;
};

export type MergedProfitMonthlyReport = {
  billing_month: string;
  currency: string;
  hostel_summaries: MergedHostelSummary[];
  student_billing: StudentBillingRow[];
  staff_payments: {
    hostel_name: string;
    employee_name: string;
    role: string;
    amount: number;
    payment_date: string;
    title: string;
  }[];
  expenses: {
    hostel_name: string;
    title: string;
    category: string;
    vendor: string | null;
    amount: number;
    expense_date: string;
    status: string;
  }[];
  mess_expenses: {
    hostel_name: string;
    description: string | null;
    amount: number;
    expense_date: string;
    expense_type: string | null;
  }[];
  shared_ledger: {
    hostel_name: string;
    vendor: string;
    amount: number;
    expense_date: string;
    description: string | null;
  }[];
  van: {
    payments: {
      passenger_name: string;
      payment_date: string;
      amount: number;
      notes: string | null;
    }[];
    expenses: {
      expense_date: string;
      amount: number;
      description: string | null;
    }[];
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
  };
  admission_income_total?: number;
  outside_mess_income_total?: number;
};

export type CombinedProfitTotals = {
  combinedIncome: number;
  combinedExpense: number;
  combinedNetProfit: number;
  feesIncome: number;
  vanRevenue: number;
  admissionIncome: number;
  outsideMessIncome: number;
  sharedMessTotal: number;
  staffTotal: number;
  otherTotal: number;
  ledgerTotal: number;
  vanExpenses: number;
  /** @deprecated use combinedIncome */
  grandIncome: number;
  /** @deprecated use combinedExpense */
  grandExpenses: number;
  /** @deprecated use combinedNetProfit */
  grandNetProfit: number;
  hostelOperatingExpenses: number;
  hostelNetProfit: number;
};

export function computeStudentBillingStatus(row: StudentBillingRow): string {
  const rentDue = Number(row.rent_amount) > 0;
  const messDue = Number(row.mess_amount) > 0;

  const rentStatus = rentDue ? row.rent_status ?? "pending" : "none";
  const messStatus = messDue ? row.mess_status ?? "pending" : "na";

  return getCombinedInvoiceStatus(
    rentStatus as "none" | "pending" | "paid" | "partial",
    messStatus as "none" | "na" | "pending" | "paid" | "partial"
  );
}

export function groupStudentBillingByHostel(rows: StudentBillingRow[]) {
  const map = new Map<string, StudentBillingRow[]>();
  for (const row of rows) {
    const list = map.get(row.hostel_name) ?? [];
    list.push(row);
    map.set(row.hostel_name, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function groupExpensesByHostel(rows: MergedProfitMonthlyReport["expenses"]) {
  const map = new Map<string, MergedProfitMonthlyReport["expenses"]>();
  for (const row of rows) {
    const list = map.get(row.hostel_name) ?? [];
    list.push(row);
    map.set(row.hostel_name, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Mess operating is shared — same total on each hostel row; split for per-hostel net profit. */
export function getSharedMessOperatingTotal(report: MergedProfitMonthlyReport): number {
  const summaries = report.hostel_summaries ?? [];
  if (summaries.length > 0) {
    return Number(summaries[0].mess_operating_expenses || 0);
  }
  return (report.mess_expenses ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export function summarizeHostelRow(row: MergedHostelSummary, hostelCount = 2) {
  const totalIncome = Number(row.rent_collected) + Number(row.mess_collected);
  const sharedMess = Number(row.mess_operating_expenses || 0);
  const messShare = sharedMess / Math.max(hostelCount, 1);
  const totalExpenses =
    Number(row.staff_expenses) + messShare + Number(row.other_expenses);
  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    messShare,
  };
}

export function buildMergedMonthlyCategoryData(
  report: MergedProfitMonthlyReport
): { name: string; value: number }[] {
  const map = new Map<string, number>();

  for (const expense of report.expenses ?? []) {
    const name = expense.category?.trim() || "General";
    map.set(name, (map.get(name) ?? 0) + Number(expense.amount || 0));
  }

  for (const payment of report.staff_payments ?? []) {
    map.set("Staff Salaries", (map.get("Staff Salaries") ?? 0) + Number(payment.amount || 0));
  }

  const messTotal = getSharedMessOperatingTotal(report);
  if (messTotal > 0) {
    map.set("Mess Operating (Shared)", messTotal);
  }

  for (const ledger of report.shared_ledger ?? []) {
    const name = `Ledger — ${ledger.vendor}`;
    map.set(name, (map.get(name) ?? 0) + Number(ledger.amount || 0));
  }

  const vanExpenseTotal = Number(report.van?.total_expenses ?? 0);
  if (vanExpenseTotal > 0) {
    map.set("Van Operating", (map.get("Van Operating") ?? 0) + vanExpenseTotal);
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Combined profit for a billing month (fee month), both hostels — dashboard & PDF. */
export function summarizeMergedReport(report: MergedProfitMonthlyReport): CombinedProfitTotals {
  const hostelSummaries = report.hostel_summaries ?? [];
  const hostelCount = Math.max(hostelSummaries.length, 1);

  let hostelNetProfit = 0;
  let hostelOperatingExpenses = 0;
  for (const row of hostelSummaries) {
    const s = summarizeHostelRow(row, hostelCount);
    hostelOperatingExpenses += s.totalExpenses;
    hostelNetProfit += s.netProfit;
  }

  const feesIncome = hostelSummaries.reduce(
    (sum, row) => sum + Number(row.rent_collected || 0) + Number(row.mess_collected || 0),
    0
  );
  const vanRevenue = Number(report.van?.total_revenue ?? 0);
  const admissionIncome = Number(report.admission_income_total ?? 0);
  const outsideMessIncome = Number(report.outside_mess_income_total ?? 0);

  const combinedIncome = feesIncome + vanRevenue + admissionIncome + outsideMessIncome;

  const sharedMessTotal = getSharedMessOperatingTotal(report);
  const staffTotal = hostelSummaries.reduce(
    (sum, row) => sum + Number(row.staff_expenses || 0),
    0
  );
  const otherTotal = hostelSummaries.reduce(
    (sum, row) => sum + Number(row.other_expenses || 0),
    0
  );
  const ledgerTotal = (report.shared_ledger ?? []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );
  const vanExpenses = Number(report.van?.total_expenses ?? 0);

  const combinedExpense =
    sharedMessTotal + staffTotal + otherTotal + ledgerTotal + vanExpenses;
  const combinedNetProfit = combinedIncome - combinedExpense;

  return {
    combinedIncome,
    combinedExpense,
    combinedNetProfit,
    feesIncome,
    vanRevenue,
    admissionIncome,
    outsideMessIncome,
    sharedMessTotal,
    staffTotal,
    otherTotal,
    ledgerTotal,
    vanExpenses,
    grandIncome: combinedIncome,
    grandExpenses: combinedExpense,
    grandNetProfit: combinedNetProfit,
    hostelOperatingExpenses,
    hostelNetProfit,
  };
}

export async function fetchMergedFinancialChart(
  supabase: SupabaseClient,
  months = 12
): Promise<{ data: FinancialChartPoint[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_merged_financial_chart", {
    p_months: months,
  });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as FinancialChartPoint[], error: null };
}

export async function fetchMergedProfitMonthlyReport(
  supabase: SupabaseClient,
  billingMonthDate: string
): Promise<{ data: MergedProfitMonthlyReport | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_merged_profit_monthly_report", {
    p_billing_month: billingMonthDate,
  });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? null) as MergedProfitMonthlyReport | null, error: null };
}

export async function fetchMergedProfitCurrentMonthDashboard(
  supabase: SupabaseClient,
  billingMonthDate: string
) {
  const { data, error } = await fetchMergedProfitMonthlyReport(supabase, billingMonthDate);
  if (error || !data) {
    return {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      margin: 0,
      categoryData: [] as { name: string; value: number }[],
      vanNetProfit: 0,
      error: error || "Could not load monthly profit data.",
    };
  }

  const totals = summarizeMergedReport(data);
  const totalIncome = totals.combinedIncome;
  const totalExpense = totals.combinedExpense;
  const netProfit = totals.combinedNetProfit;
  const margin =
    totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  return {
    totalIncome,
    totalExpense,
    netProfit,
    margin,
    categoryData: buildMergedMonthlyCategoryData(data),
    vanNetProfit: Number(data.van?.net_profit ?? 0),
    totals,
    error: null as string | null,
  };
}

export async function fetchMergedProfitOverview(supabase: SupabaseClient) {
  const [overviewRes, chartRes] = await Promise.all([
    supabase.rpc("get_merged_profit_overview"),
    supabase.rpc("get_merged_financial_chart", { p_months: 12 }),
  ]);

  if (overviewRes.error) {
    return {
      totalIncome: 0,
      totalExpense: 0,
      categoryData: [] as { name: string; value: number }[],
      chartData: [] as FinancialChartPoint[],
      error: overviewRes.error.message,
    };
  }

  const overview = overviewRes.data as {
    total_income: number;
    total_expense: number;
    categories: { name: string; value: number }[];
  };

  return {
    totalIncome: Number(overview.total_income || 0),
    totalExpense: Number(overview.total_expense || 0),
    categoryData: overview.categories ?? [],
    chartData: (chartRes.data ?? []) as FinancialChartPoint[],
    error: chartRes.error?.message ?? null,
  };
}
