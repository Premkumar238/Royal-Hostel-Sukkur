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
};

export type StudentBillingRow = {
  hostel_name: string;
  student_name: string;
  student_code: string;
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

export function summarizeHostelRow(row: MergedHostelSummary) {
  const totalIncome = Number(row.rent_collected) + Number(row.mess_collected);
  const totalExpenses =
    Number(row.staff_expenses) +
    Number(row.mess_operating_expenses) +
    Number(row.other_expenses);
  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
  };
}

export function summarizeMergedReport(report: MergedProfitMonthlyReport) {
  let grandIncome = 0;
  let grandExpenses = 0;

  for (const row of report.hostel_summaries ?? []) {
    const s = summarizeHostelRow(row);
    grandIncome += s.totalIncome;
    grandExpenses += s.totalExpenses;
  }

  const ledgerTotal = (report.shared_ledger ?? []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );
  grandExpenses += ledgerTotal;

  return {
    grandIncome,
    grandExpenses,
    grandNetProfit: grandIncome - grandExpenses,
    ledgerTotal,
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
