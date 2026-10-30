"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import {
  isExpenseInYearMonth,
  isOperationalExpenseRecord,
} from "@/lib/expenseRecordUtils";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  currentYearMonth,
  yearMonthDateRange,
} from "@/lib/utils";
import type { Expense } from "@/types/database";
import { Search, Plus, X, Calendar, DollarSign, Receipt, Trash2, Loader2 } from "lucide-react";

export default function ExpensesPage() {
  const { currentHostel } = useHostel();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showLogModal, setShowLogModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const supabase = createClient();
  const expenseRecordsMonth = currentYearMonth();
  const expenseRecordsRange = yearMonthDateRange(expenseRecordsMonth);

  const fetchData = useCallback(async () => {
    if (!currentHostel) return;
    setLoading(true);

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("hostel_id", currentHostel.id)
      .gte("expense_date", expenseRecordsRange.start)
      .lte("expense_date", expenseRecordsRange.end)
      .order("expense_date", { ascending: false });

    if (data) setExpenses(data as Expense[]);
    setLoading(false);
  }, [currentHostel, expenseRecordsRange.end, expenseRecordsRange.start, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refreshAfterMonthClose = () => fetchData();
    window.addEventListener("hostel:month-closed", refreshAfterMonthClose);
    return () => window.removeEventListener("hostel:month-closed", refreshAfterMonthClose);
  }, [fetchData]);

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setFormLoading(true);

    const { error } = await supabase.from("expenses").insert([
      {
        hostel_id: currentHostel.id,
        category_id: null,
        title: title.trim(),
        description: description.trim() || null,
        vendor: null,
        amount: Number(amount) || 0,
        expense_date: expenseDate,
        status: "paid",
      },
    ]);

    if (!error) {
      setShowLogModal(false);
      setTitle("");
      setAmount("");
      setDescription("");
      fetchData();
    } else {
      alert(error.message);
    }
    setFormLoading(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) fetchData();
    else alert(error.message);
  };

  const operationalExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          isOperationalExpenseRecord(expense) &&
          isExpenseInYearMonth(expense.expense_date, expenseRecordsMonth)
      ),
    [expenseRecordsMonth, expenses]
  );

  const filteredExpenses = operationalExpenses.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setTitle("");
    setAmount("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setShowLogModal(true);
  };

  return (
    <AdminLayout>
      <Header title="Expenses" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900">Expense Records</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Current month only ({formatMonth(`${expenseRecordsMonth}-01`)}) — mess and other modules
              are tracked separately.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer shadow-sm sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="toolbar-controls w-full min-w-0 lg:flex-1">
            <div className="toolbar-search">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by expense name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-500">No expenses recorded</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-3 sm:px-6 sm:py-4">Expense Name</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">Amount</th>
                    <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">Notes</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span className="font-semibold text-gray-900 block">{exp.title}</span>
                        {exp.description && (
                          <span className="text-xs text-gray-400 line-clamp-2 sm:hidden">
                            {exp.description}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(exp.expense_date)}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-red-600 whitespace-nowrap">
                        -{formatCurrency(Number(exp.amount), currentHostel?.currency)}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4 text-gray-500 max-w-xs truncate">
                        {exp.description ?? "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
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

      {showLogModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowLogModal(false)} />
          <div className="modal-panel max-w-md">
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">Add Expense</h3>

            <form onSubmit={handleLogExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Expense Name
                </label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
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
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer mt-2"
              >
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save Expense"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
