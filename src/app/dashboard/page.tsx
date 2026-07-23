"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  calcProfitMargin,
  calcOccupancyRate,
  formatDate,
  formatMonth,
  currentBillingMonthDate,
} from "@/lib/utils";
import type { MonthCloseResult } from "@/lib/monthCloseUtils";
import { calculateBusinessBudget } from "@/lib/cashUtils";
import type { CashBudget, DashboardStats, FinancialChartPoint, FeeRecord, Expense } from "@/types/database";
import {
  Users,
  DoorOpen,
  Coins,
  TrendingUp,
  Plus,
  X,
  UserPlus,
  Receipt,
  ShieldCheck,
  PiggyBank,
} from "lucide-react";
import {
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
} from "recharts";

const OCCUPANCY_COLORS = ["#2563eb", "#22c55e", "#ef4444"];

export default function DashboardPage() {
  const { currentHostel, loading: hostelLoading } = useHostel();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<FinancialChartPoint[]>([]);
  const [recentFees, setRecentFees] = useState<FeeRecord[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [initialBudget, setInitialBudget] = useState<number | null>(null);
  const [budgetNetProfit, setBudgetNetProfit] = useState(0);
  const [remainingAfterStart, setRemainingAfterStart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [monthCloseNotice, setMonthCloseNotice] = useState<MonthCloseResult | null>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!currentHostel) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const [statsRes, chartRes, feesRes, expensesRes, cashRes, allExpensesRes, allFeesRes] =
        await Promise.all([
        supabase.rpc("get_dashboard_stats", { p_hostel_id: currentHostel.id }),
        supabase.rpc("get_financial_chart", {
          p_hostel_id: currentHostel.id,
          p_months: 6,
        }),
        supabase
          .from("fee_records")
          .select("*, students(*)")
          .eq("hostel_id", currentHostel.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("expenses")
          .select("*, expense_categories(name)")
          .eq("hostel_id", currentHostel.id)
          .order("expense_date", { ascending: false })
          .limit(5),
        supabase.from("cash_budgets").select("*").eq("hostel_id", currentHostel.id),
        supabase.from("expenses").select("amount, expense_date").eq("hostel_id", currentHostel.id),
        supabase
          .from("fee_records")
          .select("amount, payment_date, billing_month")
          .eq("hostel_id", currentHostel.id)
          .in("status", ["paid", "partial"]),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as DashboardStats);
      if (chartRes.data) setChartData(chartRes.data as unknown as FinancialChartPoint[]);
      if (feesRes.data) setRecentFees(feesRes.data as FeeRecord[]);
      if (expensesRes.data) setRecentExpenses(expensesRes.data as Expense[]);

      const budget = calculateBusinessBudget(
        (cashRes.data ?? []) as CashBudget[],
        (allExpensesRes.data ?? []) as { amount: number; expense_date: string }[],
        (allFeesRes.data ?? []) as {
          amount: number;
          payment_date: string | null;
          billing_month: string;
        }[]
      );

      setTotalBudget(budget.budget);
      setInitialBudget(budget.initialInvestment);
      setRemainingAfterStart(budget.remainingAfterStartingMonth);
      setBudgetNetProfit(budget.profitContribution);

      setLoading(false);
    };

    fetchData();
  }, [currentHostel, supabase, dataRefreshKey]);

  useEffect(() => {
    const onMonthClosed = (event: Event) => {
      const detail = (event as CustomEvent<MonthCloseResult>).detail;
      setMonthCloseNotice(detail);
      setDataRefreshKey((key) => key + 1);
    };

    window.addEventListener("hostel:month-closed", onMonthClosed);
    return () => window.removeEventListener("hostel:month-closed", onMonthClosed);
  }, []);

  const netProfit = stats ? stats.monthly_income - stats.monthly_expenses : 0;
  const profitMargin = stats ? calcProfitMargin(stats.monthly_income, stats.monthly_expenses) : 0;
  const occupancyRate = stats ? calcOccupancyRate(stats.occupied_rooms, stats.total_rooms) : 0;

  const occupancyData = stats
    ? [
        { name: "Occupied", value: stats.occupied_rooms },
        { name: "Vacant", value: stats.vacant_rooms },
        { name: "Maintenance", value: stats.maintenance_rooms },
      ]
    : [];

  if (hostelLoading || loading) {
    return (
      <AdminLayout>
        <Header title="Dashboard" searchPlaceholder="Search student or room..." />
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  if (!currentHostel) {
    return (
      <AdminLayout>
        <Header title="Dashboard" />
        <div className="flex h-96 flex-col items-center justify-center gap-3">
          <p className="text-lg font-medium text-gray-600">No hostel assigned</p>
          <p className="text-sm text-gray-400">
            Contact your administrator to get access to a hostel.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Header title="Dashboard" searchPlaceholder="Search student or room..." />

      <div className="page-shell page-shell--fab">
        {monthCloseNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">New month started — system reset for {formatMonth(monthCloseNotice.current_month)}</p>
            <p className="mt-1 text-xs text-emerald-800">
              Previous month closed. Students, rooms, budget, ledger, and police verification are unchanged.
              Fee invoices and staff salaries are ready for the new month.
              {monthCloseNotice.fees_created > 0
                ? ` ${monthCloseNotice.fees_created} pending fee record(s) created.`
                : ""}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-500">
          Operating month: <strong className="text-gray-800">{formatMonth(currentBillingMonthDate())}</strong>
          · Income, expenses, and pending fees show this month only · Budget and ledger are cumulative
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Total Students"
            value={String(stats?.active_students ?? 0)}
            icon={Users}
            subtitle={`${stats?.total_students ?? 0} total enrolled`}
          />
          <StatCard
            title="Total Rooms"
            value={String(stats?.total_rooms ?? 0)}
            icon={DoorOpen}
            subtitle={`${stats?.occupied_rooms ?? 0} Occupied (${occupancyRate}%) · ${stats?.vacant_rooms ?? 0} Vacant`}
          >
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </StatCard>
          <Link href="/cash" className="block transition-opacity hover:opacity-95">
            <StatCard
              title="Budget"
              value={formatCurrency(totalBudget, currentHostel.currency)}
              icon={PiggyBank}
              subtitle={
                initialBudget !== null
                  ? `After start month ${formatCurrency(remainingAfterStart, currentHostel.currency)} + profit ${formatCurrency(budgetNetProfit, currentHostel.currency)}`
                  : "Add initial investment in Cash"
              }
            />
          </Link>
          <StatCard
            title="Monthly Income"
            value={formatCurrency(stats?.monthly_income ?? 0, currentHostel.currency)}
            icon={Coins}
            subtitle="Current Month"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(netProfit, currentHostel.currency)}
            icon={TrendingUp}
            subtitle={`Profit Margin ${profitMargin}%`}
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/police-verification"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 shadow-sm transition-colors hover:bg-indigo-100"
          >
            <ShieldCheck className="h-4 w-4" />
            Police Verification
          </Link>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900">
              Income vs Expenses
            </h3>
            <p className="text-xs text-gray-400">Last 6 months</p>
            <div className="mt-4 h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <Tooltip />
                    <Line type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={2} dot={false} name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  No financial data yet
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Room Occupancy</h3>
            <p className="text-xs text-gray-400">{occupancyRate}% Occupied</p>
            <div className="mt-4 flex items-center justify-center">
              <div className="h-48 w-48">
                {occupancyData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {occupancyData.map((_, i) => (
                          <Cell key={i} fill={OCCUPANCY_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No rooms yet
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
              {occupancyData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OCCUPANCY_COLORS[i] }} />
                  <span className="text-gray-600">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent Fee Payments */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Fee Payments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                        No fee records yet
                      </td>
                    </tr>
                  ) : (
                    recentFees.map((fee) => (
                      <tr key={fee.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={fee.students?.full_name ?? "?"} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900">{fee.students?.full_name}</p>
                              <p className="text-xs text-gray-400">{fee.invoice_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {formatCurrency(fee.amount, currentHostel.currency)}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {formatDate(fee.payment_date)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={fee.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Expenses</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Vendor</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                        No expenses yet
                      </td>
                    </tr>
                  ) : (
                    recentExpenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">{exp.title}</p>
                          <p className="text-xs text-gray-400">{exp.expense_categories?.name}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{exp.vendor ?? "—"}</td>
                        <td className="px-5 py-3 font-medium text-red-600">
                          -{formatCurrency(exp.amount, currentHostel.currency)}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {formatDate(exp.expense_date)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Overlay & Menu */}
      {showQuickActions && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] transition-opacity"
            onClick={() => setShowQuickActions(false)}
          />
          <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto max-w-xs rounded-xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-4 duration-150 sm:bottom-24 sm:left-auto sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:mx-0 sm:w-56">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Quick Actions
            </p>
            <div className="h-px bg-gray-100 my-1" />
            <div className="space-y-0.5">
              <a
                href="/students"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <UserPlus className="h-4 w-4" />
                </div>
                <span>Add Student</span>
              </a>
              <a
                href="/rooms"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-50 text-green-600">
                  <DoorOpen className="h-4 w-4" />
                </div>
                <span>Add Room</span>
              </a>
              <a
                href="/fees"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-yellow-50 hover:text-yellow-700"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-yellow-50 text-yellow-600">
                  <Coins className="h-4 w-4" />
                </div>
                <span>Record Fee</span>
              </a>
              <a
                href="/expenses"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <span>Log Expense</span>
              </a>
              <a
                href="/police-verification"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Police Verification</span>
              </a>
            </div>
          </div>
        </>
      )}

      {/* FAB */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-95 cursor-pointer ${
          showQuickActions
            ? "bg-gray-800 hover:bg-gray-900 rotate-90"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
        }`}
      >
        {showQuickActions ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </AdminLayout>
  );
}
