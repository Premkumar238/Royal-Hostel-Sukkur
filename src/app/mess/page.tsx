"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import {
  addSharedDailyMessExpense,
  deleteSharedMessExpense,
  fetchSharedMessExpenses,
  fetchSharedMessMonthSummary,
} from "@/lib/sharedMessUtils";
import { formatCurrency, formatDate, formatMonth, currentYearMonth } from "@/lib/utils";
import type { MessExpense } from "@/types/database";
import {
  Calendar,
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  X,
} from "lucide-react";

export default function MessPage() {
  const { currentHostel } = useHostel();
  const [billingMonth, setBillingMonth] = useState(currentYearMonth());
  const [messExpenses, setMessExpenses] = useState<MessExpense[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [messProfit, setMessProfit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showDailyMessModal, setShowDailyMessModal] = useState(false);

  const [dailyMessAmount, setDailyMessAmount] = useState<number | "">("");
  const [dailyMessDate, setDailyMessDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyMessDescription, setDailyMessDescription] = useState("");

  const supabase = createClient();
  const billingMonthDate = `${billingMonth}-01`;
  const currency = currentHostel?.currency ?? "PKR";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [messResult, summaryResult] = await Promise.all([
      fetchSharedMessExpenses(supabase, billingMonthDate),
      fetchSharedMessMonthSummary(supabase, billingMonthDate),
    ]);

    if (messResult.error) alert(messResult.error);
    if (summaryResult.error) alert(summaryResult.error);

    setMessExpenses(messResult.data);
    if (summaryResult.data) {
      setTotalIncome(Number(summaryResult.data.total_income));
      setTotalExpenses(Number(summaryResult.data.total_expenses));
      setMessProfit(Number(summaryResult.data.mess_profit));
    } else {
      setTotalIncome(0);
      setTotalExpenses(0);
      setMessProfit(0);
    }
    setLoading(false);
  }, [billingMonthDate, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDailyMessModal = () => {
    setDailyMessAmount("");
    setDailyMessDate(new Date().toISOString().split("T")[0]);
    setDailyMessDescription("");
    setShowDailyMessModal(true);
  };

  const handleAddDailyMess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setFormLoading(true);

    const amount = Number(dailyMessAmount) || 0;
    const expenseMonth = `${dailyMessDate.slice(0, 7)}-01`;

    if (expenseMonth !== billingMonthDate) {
      setFormLoading(false);
      alert("Daily expense date must fall within the selected billing month.");
      return;
    }

    const { error } = await addSharedDailyMessExpense(supabase, {
      billingMonthDate,
      expenseDate: dailyMessDate,
      amount,
      description: dailyMessDescription.trim() || null,
    });

    setFormLoading(false);
    if (!error) {
      setShowDailyMessModal(false);
      fetchData();
    } else {
      alert(error);
    }
  };

  const handleDeleteMessExpense = async (item: MessExpense) => {
    if (!confirm("Delete this mess expense record?")) return;
    const { error } = await deleteSharedMessExpense(supabase, item.id);
    if (!error) fetchData();
    else alert(error);
  };

  return (
    <AdminLayout>
      <Header title="Mess" searchPlaceholder="Quick search..." />

      <div className="page-shell space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Mess Operations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Shared mess income and expenses for Royal Girls Hostel 1 + 2
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <MonthPicker id="mess-billing-month" value={billingMonth} onChange={setBillingMonth} />
            <button
              onClick={openDailyMessModal}
              className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Daily Expense</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Mess Income</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {formatCurrency(totalIncome, currency)}
            </p>
            <p className="text-xs text-emerald-700/80 mt-1">
              Paid mess fees · {formatMonth(billingMonthDate)}
            </p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-orange-700">
              <TrendingDown className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Mess Expenses</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-orange-900">
              {formatCurrency(totalExpenses, currency)}
            </p>
            <p className="text-xs text-orange-700/80 mt-1">
              {messExpenses.length} daily entries
            </p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-700">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Mess Profit</span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${messProfit >= 0 ? "text-indigo-900" : "text-red-700"}`}>
              {formatCurrency(messProfit, currency)}
            </p>
            <p className="text-xs text-indigo-700/80 mt-1">Income minus mess expenses</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : messExpenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <UtensilsCrossed className="mx-auto h-7 w-7 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">No mess expenses for this month</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {messExpenses.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-600">{formatDate(item.expense_date)}</td>
                      <td className="px-6 py-4 text-gray-700">{item.description || "Daily Mess Expense"}</td>
                      <td className="px-6 py-4 font-semibold text-red-600">
                        -{formatCurrency(item.amount, currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteMessExpense(item)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showDailyMessModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowDailyMessModal(false)} />
          <div className="modal-panel max-w-md">
            <button
              onClick={() => setShowDailyMessModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-2">Add Daily Mess Expense</h3>
            <p className="text-xs text-gray-400 mb-6">For {formatMonth(billingMonthDate)}</p>

            <form onSubmit={handleAddDailyMess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={dailyMessDate}
                    onChange={(e) => setDailyMessDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={dailyMessAmount}
                    onChange={(e) => setDailyMessAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={dailyMessDescription}
                  onChange={(e) => setDailyMessDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 cursor-pointer"
              >
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save Daily Expense"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
