"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { StatCard } from "@/components/ui/StatCard";
import {
  formatCurrency,
  currentYearMonth,
  formatMonth,
  currentBillingMonthDate,
} from "@/lib/utils";
import {
  TrendingUp,
  Coins,
  TrendingDown,
  Percent,
  Download,
  Loader2,
  Building2,
  Bus,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMergedProfitCurrentMonthDashboard,
  fetchMergedProfitMonthlyReport,
} from "@/lib/mergedProfitUtils";
import { downloadMergedProfitReportPDF } from "@/lib/mergedProfitPdf";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const PIE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

interface CategoryExpense {
  name: string;
  value: number;
}

export default function ProfitPage() {
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadMonth, setDownloadMonth] = useState(currentYearMonth());
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [margin, setMargin] = useState(0);
  const [vanNetProfit, setVanNetProfit] = useState(0);
  const [categoryData, setCategoryData] = useState<CategoryExpense[]>([]);

  const supabase = createClient();
  const currentMonthDate = currentBillingMonthDate();
  const downloadMonthDate = `${downloadMonth}-01`;
  const currency = "PKR";
  const monthLabel = formatMonth(currentMonthDate);

  const loadCurrentMonth = useCallback(async () => {
    setLoading(true);
    setError(null);

    const dashboard = await fetchMergedProfitCurrentMonthDashboard(supabase, currentMonthDate);

    if (dashboard.error) {
      setError(
        dashboard.error +
          " Run the merged profit SQL migrations in Supabase if you have not already."
      );
    }

    setTotalIncome(dashboard.totalIncome);
    setTotalExpense(dashboard.totalExpense);
    setNetProfit(dashboard.netProfit);
    setMargin(dashboard.margin);
    setVanNetProfit(dashboard.vanNetProfit);
    setCategoryData(dashboard.categoryData);
    setLoading(false);
  }, [currentMonthDate, supabase]);

  useEffect(() => {
    loadCurrentMonth();
  }, [loadCurrentMonth]);

  useEffect(() => {
    const onMonthClosed = () => {
      loadCurrentMonth();
    };
    window.addEventListener("hostel:month-closed", onMonthClosed);
    return () => window.removeEventListener("hostel:month-closed", onMonthClosed);
  }, [loadCurrentMonth]);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const { data, error: reportError } = await fetchMergedProfitMonthlyReport(
        supabase,
        downloadMonthDate
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
                  Dashboard numbers are for the current month only. Pick any past month below to
                  download its full PDF report (students, staff, expenses, ledger, van).
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              Operating month on this page:{" "}
              <strong className="text-gray-900">{monthLabel}</strong>
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Combined Income"
              value={formatCurrency(totalIncome, currency)}
              icon={Coins}
              subtitle={`${monthLabel} — rent + mess collected`}
            />
            <StatCard
              title="Combined Expenses"
              value={formatCurrency(totalExpense, currency)}
              icon={TrendingDown}
              subtitle={`${monthLabel} — staff, mess, ledger, other`}
            />
            <StatCard
              title="Hostel Net Profit"
              value={formatCurrency(netProfit, currency)}
              icon={TrendingUp}
              subtitle={
                netProfit >= 0
                  ? `${monthLabel} — excludes van`
                  : `${monthLabel} — combined loss`
              }
            />
            <StatCard
              title="Net Profit Margin"
              value={`${margin}%`}
              icon={Percent}
              subtitle={`${monthLabel} — both hostels`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Expense Breakdown — {monthLabel}
              </h3>
              <p className="text-xs text-gray-400 mb-4">Both hostels, current month only</p>
              {categoryData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                  No expenses recorded for this month yet
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryData.map((d, i) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-gray-700">{d.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(d.value, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 text-violet-900">
                <Bus className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Van profit — {monthLabel}</h3>
              </div>
              <p className="text-xs text-violet-800 mt-1 mb-4">Separate from hostel profit</p>
              <p
                className={`text-2xl font-bold ${
                  vanNetProfit >= 0 ? "text-violet-900" : "text-red-700"
                }`}
              >
                {formatCurrency(vanNetProfit, currency)}
              </p>
              <p className="text-xs text-violet-700/80 mt-2">
                Full van details appear in the monthly PDF download.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Download monthly report (PDF)</h2>
                <p className="text-xs text-gray-600 mt-1 max-w-xl">
                  Select <strong>any month</strong> (including past months) and download the
                  complete merged report for that month: student billing, staff salaries, expense
                  records, mess, shared ledger, hostel profit, and van section.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <MonthPicker
                  id="profit-report-month"
                  value={downloadMonth}
                  onChange={setDownloadMonth}
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
                  Download {formatMonth(downloadMonthDate)} PDF
                </button>
              </div>
            </div>
          </div>

          {categoryData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Expense chart — {monthLabel}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
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
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
