"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import {
  ensurePayoutCategory,
  PAYOUT_RECIPIENTS,
  payoutTitle,
  type PayoutRecipient,
} from "@/lib/payoutUtils";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import type { Expense } from "@/types/database";
import {
  Banknote,
  Calendar,
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

function monthDateRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function LedgerPage() {
  const { currentHostel } = useHostel();
  const [payments, setPayments] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));

  const [payModalRecipient, setPayModalRecipient] = useState<PayoutRecipient | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const supabase = createClient();
  const billingMonthDate = `${billingMonth}-01`;

  const fetchPayments = useCallback(async () => {
    if (!currentHostel) return;
    setLoading(true);

    const { start, end } = monthDateRange(billingMonth);

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("hostel_id", currentHostel.id)
      .in("vendor", [...PAYOUT_RECIPIENTS])
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: false });

    if (data) setPayments(data as Expense[]);
    setLoading(false);
  }, [billingMonth, currentHostel, supabase]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const paymentsByRecipient = useMemo(() => {
    const map = new Map<PayoutRecipient, Expense[]>();
    for (const name of PAYOUT_RECIPIENTS) {
      map.set(name, []);
    }
    for (const payment of payments) {
      const vendor = payment.vendor as PayoutRecipient;
      if (PAYOUT_RECIPIENTS.includes(vendor)) {
        map.get(vendor)?.push(payment);
      }
    }
    return map;
  }, [payments]);

  const monthTotal = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const openPayModal = (recipient: PayoutRecipient) => {
    setPayModalRecipient(recipient);
    setAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setDescription("");
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !payModalRecipient) return;

    const paidAmount = Number(amount);
    if (!paidAmount || paidAmount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    setFormLoading(true);
    const categoryId = await ensurePayoutCategory(supabase, currentHostel.id, payModalRecipient);

    const { error } = await supabase.from("expenses").insert([
      {
        hostel_id: currentHostel.id,
        category_id: categoryId,
        title: payoutTitle(payModalRecipient),
        description: description.trim() || null,
        vendor: payModalRecipient,
        amount: paidAmount,
        expense_date: paymentDate,
        status: "paid",
      },
    ]);

    setFormLoading(false);

    if (!error) {
      setPayModalRecipient(null);
      fetchPayments();
    } else {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment from the ledger?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) fetchPayments();
    else alert(error.message);
  };

  return (
    <AdminLayout>
      <Header title="Ledger" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">People Ledger</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Pay Ameet Lalwani, Khairpur Home, or Sain Amjad — each payment is saved as an expense
            </p>
          </div>
          <MonthPicker
            id="ledger-month"
            value={billingMonth}
            onChange={setBillingMonth}
            className="shrink-0 sm:w-auto"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Total Paid — {formatMonth(billingMonthDate)}
          </span>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {formatCurrency(monthTotal, currentHostel?.currency)}
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {PAYOUT_RECIPIENTS.map((recipient) => {
              const recipientPayments = paymentsByRecipient.get(recipient) ?? [];
              const recipientTotal = recipientPayments.reduce(
                (sum, p) => sum + Number(p.amount || 0),
                0
              );

              return (
                <section
                  key={recipient}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{recipient}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {recipientPayments.length} payment
                          {recipientPayments.length === 1 ? "" : "s"} in {formatMonth(billingMonthDate)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openPayModal(recipient)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Pay
                      </button>
                    </div>
                    <p className="mt-3 text-xl font-bold text-gray-900">
                      {formatCurrency(recipientTotal, currentHostel?.currency)}
                    </p>
                  </div>

                  {recipientPayments.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center p-8 text-center">
                      <p className="text-sm text-gray-400">No payments this month</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Paid</th>
                            <th className="px-4 py-3 w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {recipientPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 text-gray-600">
                                <span className="whitespace-nowrap">{formatDate(payment.expense_date)}</span>
                                {payment.description && (
                                  <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">
                                    {payment.description}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-red-600 whitespace-nowrap">
                                {formatCurrency(payment.amount, currentHostel?.currency)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(payment.id)}
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
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {payModalRecipient && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setPayModalRecipient(null)} />
          <div className="modal-panel max-w-md">
            <button
              type="button"
              onClick={() => setPayModalRecipient(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-1">Pay {payModalRecipient}</h3>
            <p className="text-xs text-gray-400 mb-6">This amount will be recorded as an expense</p>

            <form onSubmit={handlePay} className="space-y-4">
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
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer"
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
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    Record Payment
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
