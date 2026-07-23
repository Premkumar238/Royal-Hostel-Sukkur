"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import {
  calculateBusinessBudget,
  type BusinessBudgetSummary,
  sumCashIn,
  sumCashOut,
} from "@/lib/cashUtils";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import type { CashBudget, CashEntryType } from "@/types/database";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Loader2,
  Minus,
  PiggyBank,
  Plus,
  Trash2,
  X,
} from "lucide-react";

export default function CashPage() {
  const { currentHostel } = useHostel();
  const [entries, setEntries] = useState<CashBudget[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BusinessBudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [modalType, setModalType] = useState<CashEntryType | null>(null);

  const [amount, setAmount] = useState<number | "">("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!currentHostel) return;
    setLoading(true);

    const [cashRes, expensesRes, feesRes] = await Promise.all([
      supabase
        .from("cash_budgets")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("hostel_id", currentHostel.id),
      supabase
        .from("fee_records")
        .select("amount, payment_date, billing_month")
        .eq("hostel_id", currentHostel.id)
        .in("status", ["paid", "partial"]),
    ]);

    const cashEntries = (cashRes.data ?? []) as CashBudget[];
    setEntries(cashEntries);
    setBudgetSummary(
      calculateBusinessBudget(
        cashEntries,
        (expensesRes.data ?? []) as { amount: number; expense_date: string }[],
        (feesRes.data ?? []) as { amount: number; payment_date: string | null; billing_month: string }[]
      )
    );
    setLoading(false);
  }, [currentHostel, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentBudget = budgetSummary?.budget ?? 0;
  const cashInTotal = useMemo(() => sumCashIn(entries), [entries]);
  const cashOutTotal = useMemo(() => sumCashOut(entries), [entries]);

  const openModal = (type: CashEntryType) => {
    setModalType(type);
    setAmount("");
    setEntryDate(new Date().toISOString().split("T")[0]);
    if (type === "in") {
      setDescription(entries.filter((e) => (e.entry_type ?? "in") === "in").length === 0 ? "Initial business investment" : "");
    } else {
      setDescription("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !modalType) return;

    const value = Number(amount);
    if (!value || value <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    if (modalType === "out" && value > currentBudget) {
      alert(`Cannot cash out more than current budget (${formatCurrency(currentBudget, currentHostel.currency)}).`);
      return;
    }

    setFormLoading(true);

    const { error } = await supabase.from("cash_budgets").insert([
      {
        hostel_id: currentHostel.id,
        amount: value,
        entry_date: entryDate,
        entry_type: modalType,
        description: description.trim() || null,
      },
    ]);

    setFormLoading(false);

    if (!error) {
      setModalType(null);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this cash entry?")) return;
    const { error } = await supabase.from("cash_budgets").delete().eq("id", id);
    if (!error) fetchData();
    else alert(error.message);
  };

  return (
    <AdminLayout>
      <Header title="Cash" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Business Budget</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Budget = remaining after starting month expenses + net profit
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => openModal("in")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Cash In
            </button>
            <button
              type="button"
              onClick={() => openModal("out")}
              disabled={currentBudget <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="h-4 w-4" />
              Cash Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
              Current Budget
            </span>
            <p className="mt-1 text-2xl font-bold text-violet-900">
              {formatCurrency(currentBudget, currentHostel?.currency)}
            </p>
            <p className="text-xs text-violet-700/80 mt-1">Shown on dashboard · updates with profit</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              After Start Month Expenses
            </span>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {formatCurrency(budgetSummary?.remainingAfterStartingMonth ?? 0, currentHostel?.currency)}
            </p>
            <p className="text-xs text-blue-700/80 mt-1">
              {budgetSummary?.startingMonth
                ? `Starting month: ${formatMonth(`${budgetSummary.startingMonth}-01`)}`
                : "Add initial cash in first"}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Net Profit
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {formatCurrency(budgetSummary?.profitContribution ?? 0, currentHostel?.currency)}
            </p>
            <p className="text-xs text-emerald-700/80 mt-1">Paid fees minus expenses after starting month</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Initial Investment
            </span>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {budgetSummary?.initialInvestment != null
                ? formatCurrency(budgetSummary.initialInvestment, currentHostel?.currency)
                : "Not set"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Cash in {formatCurrency(cashInTotal, currentHostel?.currency)} · Out{" "}
              {formatCurrency(cashOutTotal, currentHostel?.currency)}
            </p>
          </div>
        </div>

        {budgetSummary?.startingMonth && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            <strong className="text-gray-800">Formula:</strong> Budget = remaining after{" "}
            {formatMonth(`${budgetSummary.startingMonth}-01`)} expenses (
            {formatCurrency(budgetSummary.remainingAfterStartingMonth, currentHostel?.currency)}) + net profit
            after that month (
            {formatCurrency(budgetSummary.profitContribution, currentHostel?.currency)}
            )
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <PiggyBank className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No cash entries yet</p>
            <p className="text-xs text-gray-400 mt-1">Use Cash In to add your initial business investment.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const isIn = (entry.entry_type ?? "in") === "in";
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          {formatDate(entry.entry_date)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              isIn ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {isIn ? "Cash In" : "Cash Out"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {entry.description || (isIn ? "Business investment" : "Budget withdrawal")}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                            isIn ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {isIn ? "+" : "-"}
                          {formatCurrency(entry.amount, currentHostel?.currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalType && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setModalType(null)} />
          <div className="modal-panel max-w-md">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {modalType === "in" ? "Cash In" : "Cash Out"}
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              {modalType === "in"
                ? "Add investment to business budget"
                : `Remove from budget · Available: ${formatCurrency(currentBudget, currentHostel?.currency)}`}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    required
                    min={1}
                    max={modalType === "out" ? Math.max(currentBudget, 0) : undefined}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none"
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
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    modalType === "in" ? "e.g. Initial business investment" : "e.g. Personal withdrawal"
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer ${
                  modalType === "in" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : modalType === "in" ? (
                  <>
                    <Plus className="h-4 w-4" />
                    Add to Budget
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4" />
                    Remove from Budget
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
