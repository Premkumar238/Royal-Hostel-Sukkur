"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, calcProfitMargin } from "@/lib/utils";
import type { FinancialChartPoint } from "@/types/database";
import {
  TrendingUp,
  Coins,
  TrendingDown,
  Percent,
  Loader2,
} from "lucide-react";
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
  const { currentHostel } = useHostel();
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [chartData, setChartData] = useState<FinancialChartPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryExpense[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!currentHostel) return;

    const fetchFinancialData = async () => {
      setLoading(true);

      // 1. Fetch 12-month trend
      const { data: trendData } = await supabase.rpc("get_financial_chart", {
        p_hostel_id: currentHostel.id,
        p_months: 12,
      });

      // 2. Fetch all expenses with category names
      const { data: expenseData } = await supabase
        .from("expenses")
        .select("amount, category_id, expense_categories(name)")
        .eq("hostel_id", currentHostel.id);

      // 3. Fetch paid/partial fee records for total income
      const { data: incomeData } = await supabase
        .from("fee_records")
        .select("amount")
        .eq("hostel_id", currentHostel.id)
        .in("status", ["paid", "partial"]);

      if (incomeData) {
        const sumIncome = incomeData.reduce((sum, item) => sum + Number(item.amount), 0);
        setTotalIncome(sumIncome);
      }

      if (expenseData) {
        const sumExpense = expenseData.reduce((sum, item) => sum + Number(item.amount), 0);
        setTotalExpense(sumExpense);

        // Aggregate by category
        const catMap: Record<string, number> = {};
        expenseData.forEach((exp) => {
          const name = exp.expense_categories?.name || "General";
          catMap[name] = (catMap[name] || 0) + Number(exp.amount);
        });

        const formattedCategories = Object.keys(catMap).map((key) => ({
          name: key,
          value: catMap[key],
        }));
        setCategoryData(formattedCategories);
      }

      if (trendData) {
        setChartData(trendData);
      }

      setLoading(false);
    };

    fetchFinancialData();
  }, [currentHostel, supabase]);

  const netProfit = totalIncome - totalExpense;
  const margin = calcProfitMargin(totalIncome, totalExpense);

  return (
    <AdminLayout>
      <Header title="Profit & Loss Analytics" searchPlaceholder="Quick lookup..." />

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="page-shell">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Aggregate Income"
              value={formatCurrency(totalIncome, currentHostel?.currency)}
              icon={Coins}
              subtitle="All time rent collected"
            />
            <StatCard
              title="Aggregate Expense"
              value={formatCurrency(totalExpense, currentHostel?.currency)}
              icon={TrendingDown}
              subtitle="All time logged expenses"
            />
            <StatCard
              title="Cumulative Net Profit"
              value={formatCurrency(netProfit, currentHostel?.currency)}
              icon={TrendingUp}
              subtitle={netProfit >= 0 ? "Profit ledger positive" : "Loss ledger warning"}
            />
            <StatCard
              title="Net Profit Margin"
              value={`${margin}%`}
              icon={Percent}
              subtitle="Profit margin of operations"
            />
          </div>

          {/* Recharts Trend Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Monthly Financial Trend</h3>
              <p className="text-xs text-gray-400 mb-4">Comparison of monthly income and operating expenses</p>
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
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Expense Breakdown</h3>
              <p className="text-xs text-gray-400 mb-4">Distribution across categories</p>
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
                      {formatCurrency(d.value, currentHostel?.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart breakdown */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Net Monthly Profit Margin Bar</h3>
              <p className="text-xs text-gray-400 mb-4">Historical visual profit ledger</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.map(d => ({ ...d, profit: d.income - d.expenses }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Profit Margin" />
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
