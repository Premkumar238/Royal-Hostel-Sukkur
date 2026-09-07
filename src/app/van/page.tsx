"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import {
  addSharedVanExpense,
  addSharedVanPayment,
  deleteSharedVanExpense,
  deleteSharedVanPayment,
  fetchSharedVanMonth,
} from "@/lib/sharedVanUtils";
import { formatCurrency, formatDate, formatMonth, currentYearMonth } from "@/lib/utils";
import type { VanExpense, VanPayment } from "@/types/database";
import { Bus, Loader2, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";

export default function VanPage() {
  const { currentHostel } = useHostel();
  const [billingMonth, setBillingMonth] = useState(currentYearMonth());
  const [payments, setPayments] = useState<VanPayment[]>([]);
  const [expenses, setExpenses] = useState<VanExpense[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [passengerName, setPassengerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");

  const [expenseAmount, setExpenseAmount] = useState<number | "">("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseDescription, setExpenseDescription] = useState("");

  const supabase = createClient();
  const billingMonthDate = `${billingMonth}-01`;
  const currency = currentHostel?.currency ?? "PKR";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await fetchSharedVanMonth(supabase, billingMonthDate);
    if (result.error) {
      alert(result.error);
    }
    setPayments(result.data.payments);
    setExpenses(result.data.expenses);
    setTotalRevenue(result.data.total_revenue);
    setTotalExpenses(result.data.total_expenses);
    setNetProfit(result.data.net_profit);
    setLoading(false);
  }, [billingMonthDate, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetPaymentForm = () => {
    setPassengerName("");
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
  };

  const resetExpenseForm = () => {
    setExpenseAmount("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setExpenseDescription("");
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim()) {
      alert("Passenger name is required.");
      return;
    }
    setFormLoading(true);
    const { error } = await addSharedVanPayment(supabase, {
      billingMonthDate,
      passengerName,
      paymentDate,
      amount: Number(paymentAmount) || 0,
      notes: paymentNotes,
    });
    setFormLoading(false);
    if (error) {
      alert(error);
      return;
    }
    setShowPaymentModal(false);
    resetPaymentForm();
    fetchData();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const { error } = await addSharedVanExpense(supabase, {
      billingMonthDate,
      expenseDate,
      amount: Number(expenseAmount) || 0,
      description: expenseDescription,
    });
    setFormLoading(false);
    if (error) {
      alert(error);
      return;
    }
    setShowExpenseModal(false);
    resetExpenseForm();
    fetchData();
  };

  const handleDeletePayment = async (payment: VanPayment) => {
    if (!confirm(`Remove payment from ${payment.passenger_name}?`)) return;
    const { error } = await deleteSharedVanPayment(supabase, payment.id);
    if (error) alert(error);
    else fetchData();
  };

  const handleDeleteExpense = async (expense: VanExpense) => {
    if (!confirm("Delete this van expense?")) return;
    const { error } = await deleteSharedVanExpense(supabase, expense.id);
    if (error) alert(error);
    else fetchData();
  };

  return (
    <AdminLayout>
      <Header title="Van Service" searchPlaceholder="Quick search..." />

      <div className="page-shell space-y-6">
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <div className="flex items-start gap-2">
            <Bus className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Shared Van — Royal Girls Hostel 1 + Hostel 2</p>
              <p className="text-xs text-violet-800 mt-0.5">
                Van revenue and expenses are completely separate from hostel profit. Passenger names
                can be anyone — they do not need to be hostel students.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <MonthPicker
            id="van-billing-month"
            value={billingMonth}
            onChange={setBillingMonth}
            className="sm:w-auto"
          />
          <p className="text-xs text-gray-500">
            Operating month: <strong className="text-gray-800">{formatMonth(billingMonthDate)}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Van Revenue
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {formatCurrency(totalRevenue, currency)}
            </p>
            <p className="text-xs text-emerald-700/80 mt-1">{payments.length} passenger payment(s)</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
              Van Expenses
            </span>
            <p className="mt-1 text-2xl font-bold text-red-800">
              {formatCurrency(totalExpenses, currency)}
            </p>
            <p className="text-xs text-red-700/80 mt-1">{expenses.length} expense entry(ies)</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
              Van Net Profit
            </span>
            <p className={`mt-1 text-2xl font-bold ${netProfit >= 0 ? "text-violet-800" : "text-red-700"}`}>
              {formatCurrency(netProfit, currency)}
            </p>
            <p className="text-xs text-violet-700/80 mt-1 flex items-center gap-1">
              {netProfit >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              Revenue − Expenses (separate from hostel)
            </p>
          </div>
        </div>

        {/* Van Revenue */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Van Passenger Payments</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Add any student name and the amount they paid for van this month
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetPaymentForm();
                setShowPaymentModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Payment
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-gray-500">No van payments for this month</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-4">Passenger Name</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Notes</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{payment.passenger_name}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(payment.payment_date)}</td>
                        <td className="px-6 py-4 text-gray-500">{payment.notes || "—"}</td>
                        <td className="px-6 py-4 font-semibold text-emerald-700">
                          +{formatCurrency(payment.amount, currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(payment)}
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
        </section>

        {/* Van Expenses */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Van Expenses</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Fuel, maintenance, driver, and other van costs — not mixed with hostel expenses
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetExpenseForm();
                setShowExpenseModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-gray-500">No van expenses for this month</p>
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
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-600">{formatDate(expense.expense_date)}</td>
                        <td className="px-6 py-4 text-gray-700">{expense.description || "Van expense"}</td>
                        <td className="px-6 py-4 font-semibold text-red-600">
                          -{formatCurrency(expense.amount, currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(expense)}
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
        </section>
      </div>

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)} />
          <div className="modal-panel max-w-md">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-4">Add Van Payment</h3>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Passenger Name
                </label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Any name — hostel student or not"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount (Rs.)
                </label>
                <input
                  type="number"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {formLoading ? "Saving..." : "Save Payment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)} />
          <div className="modal-panel max-w-md">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-4">Add Van Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount (Rs.)
                </label>
                <input
                  type="number"
                  min={0}
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Fuel, maintenance, driver, etc."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {formLoading ? "Saving..." : "Save Expense"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
