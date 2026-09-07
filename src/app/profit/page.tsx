"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, calcProfitMargin, currentYearMonth, formatMonth } from "@/lib/utils";
import type { FinancialChartPoint } from "@/types/database";
import {
  TrendingUp,
  Coins,
  TrendingDown,
  Percent,
  Download,
  Loader2,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMergedFinancialChart,
  fetchMergedProfitMonthlyReport,
  fetchMergedProfitOverview,
} from "@/lib/mergedProfitUtils";
import { downloadMergedProfitReportPDF } from "@/lib/mergedProfitPdf";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

interface CategoryExpense {
  name: string;
  value: number;
}

export default function ProfitPage() {
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingMonth, setBillingMonth] = useState(currentYearMonth());
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [chartData, setChartData] = useState<FinancialChartPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryExpense[]>([]);

  const supabase = createClient();
  const billingMonthDate = `${billingMonth}-01`;
  const currency = "PKR";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const [overview, chart] = await Promise.all([
        fetchMergedProfitOverview(supabase),
        fetchMergedFinancialChart(supabase, 12),
      ]);

      if (overview.error || chart.error) {
        setError(
          overview.error ||
            chart.error ||
            "Could not load merged profit data. Run the merged profit SQL migration in Supabase."
        );
      }

      setTotalIncome(overview.totalIncome);
      setTotalExpense(overview.totalExpense);
      setCategoryData(overview.categoryData);
      setChartData(chart.data);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const netProfit = totalIncome - totalExpense;
  const margin = calcProfitMargin(totalIncome, totalExpense);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const { data, error: reportError } = await fetchMergedProfitMonthlyReport(
        supabase,
        billingMonthDate
      );
      if (reportError || !data) {
        setError(reportError || "Could not build monthly report.");
        return;
      }
      await downloadMergedProfitReportPDF(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Header title="Profit & Loss Analytics" searchPlaceholder="Quick lookup..." />

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="page-shell space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Combined profit — Royal Girls Hostel 1 + Hostel 2</p>
                <p className="text-xs text-indigo-800 mt-0.5">
                  Main dashboard stays separate per hostel. This page merges income, expenses, ledger,
                  staff, and student payments for both properties.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Monthly merged report</h2>
              <p className="text-xs text-gray-400">
                PDF includes ledgers, expenses, staff, student rent + mess, and final profit for{" "}
                {formatMonth(billingMonthDate)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MonthPicker
                id="profit-report-month"
                value={billingMonth}
                onChange={setBillingMonth}
                className="shrink-0 sm:w-auto"
              />
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Combined Income"
              value={formatCurrency(totalIncome, currency)}
              icon={Coins}
              subtitle="Both hostels — all time collected fees"
            />
            <StatCard
              title="Combined Expenses"
              value={formatCurrency(totalExpense, currency)}
              icon={TrendingDown}
              subtitle="Both hostels — all logged expenses"
            />
            <StatCard
              title="Combined Net Profit"
              value={formatCurrency(netProfit, currency)}
              icon={TrendingUp}
              subtitle={netProfit >= 0 ? "Positive combined ledger" : "Combined loss warning"}
            />
            <StatCard
              title="Net Profit Margin"
              value={`${margin}%`}
              icon={Percent}
              subtitle="Combined margin across both hostels"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Monthly Financial Trend (Merged)
              </h3>
              <p className="text-xs text-gray-400 mb-4">Hostel 1 + Hostel 2 income vs expenses</p>
              <div className="h-56 sm:h-64 lg:h-80 min-h-[14rem]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        name="Gross Income"
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        name="Gross Expenses"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No timeline data yet
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Expense Breakdown (Merged)</h3>
              <p className="text-xs text-gray-400 mb-4">Both hostels — by category</p>
              <div className="h-64 flex-1 relative flex items-center justify-center">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-gray-400">No categories recorded</div>
                )}
              </div>
              <div className="mt-4 space-y-1.5 overflow-y-auto max-h-36">
                {categoryData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(d.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Net Monthly Profit (Merged)
              </h3>
              <p className="text-xs text-gray-400 mb-4">Combined profit bar chart</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.map((d) => ({
                      ...d,
                      profit: Number(d.income) - Number(d.expenses),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="profit"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      name="Net Profit"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
