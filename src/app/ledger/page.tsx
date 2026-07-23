"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense, FeeRecord } from "@/types/database";
import { Search, Filter, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";

type LedgerType = "income" | "expense";

interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerType;
  description: string;
  detail: string;
  amount: number;
}

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
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | LedgerType>("all");
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));

  const supabase = createClient();

  const fetchLedger = useCallback(async () => {
    if (!currentHostel) return;
    setLoading(true);

    const { start, end } = monthDateRange(billingMonth);

    const [feesRes, expensesRes] = await Promise.all([
      supabase
        .from("fee_records")
        .select("*, students(full_name, student_code)")
        .eq("hostel_id", currentHostel.id)
        .in("status", ["paid", "partial"])
        .gte("payment_date", start)
        .lte("payment_date", end)
        .order("payment_date", { ascending: false }),
      supabase
        .from("expenses")
        .select("*, expense_categories(name)")
        .eq("hostel_id", currentHostel.id)
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date", { ascending: false }),
    ]);

    const feeEntries: LedgerEntry[] = (feesRes.data ?? []).map((fee) => {
      const record = fee as FeeRecord;
      const studentName = record.students?.full_name ?? record.students?.student_code ?? "Student";
      const feeLabel = record.fee_type === "mess" ? "Mess Fee" : "Room Rent";
      return {
        id: `fee-${record.id}`,
        date: record.payment_date ?? record.billing_month,
        type: "income",
        description: `${feeLabel} — ${studentName}`,
        detail: record.invoice_code ?? record.students?.student_code ?? "—",
        amount: Number(record.amount || 0),
      };
    });

    const expenseEntries: LedgerEntry[] = (expensesRes.data ?? []).map((exp) => {
      const record = exp as Expense;
      return {
        id: `exp-${record.id}`,
        date: record.expense_date,
        type: "expense",
        description: record.title,
        detail: record.expense_categories?.name ?? record.vendor ?? "—",
        amount: Number(record.amount || 0),
      };
    });

    const combined = [...feeEntries, ...expenseEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setEntries(combined);
    setLoading(false);
  }, [billingMonth, currentHostel, supabase]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesType = typeFilter === "all" || entry.type === typeFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        entry.description.toLowerCase().includes(q) ||
        entry.detail.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [entries, search, typeFilter]);

  const totalIncome = useMemo(
    () => entries.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );
  const totalExpense = useMemo(
    () => entries.filter((e) => e.type === "expense").reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );
  const netBalance = totalIncome - totalExpense;

  return (
    <AdminLayout>
      <Header title="Ledger" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Total Income
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {formatCurrency(totalIncome, currentHostel?.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
              Total Expenses
            </span>
            <p className="mt-1 text-2xl font-bold text-red-800">
              {formatCurrency(totalExpense, currentHostel?.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Net Balance
            </span>
            <p
              className={`mt-1 text-2xl font-bold ${netBalance >= 0 ? "text-blue-700" : "text-red-700"}`}
            >
              {formatCurrency(netBalance, currentHostel?.currency)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="toolbar-controls">
            <div className="toolbar-search">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ledger entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | LedgerType)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-600 focus:border-blue-400 focus:outline-none cursor-pointer"
              >
                <option value="all">All Entries</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
              <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <MonthPicker
              id="ledger-month"
              value={billingMonth}
              onChange={setBillingMonth}
              className="shrink-0 sm:w-auto"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-500">No ledger entries for this month</p>
            <p className="text-xs text-gray-400 mt-1">
              Fee payments and logged expenses will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Particulars</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Credit</th>
                    <th className="px-6 py-4 text-right">Debit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900 block">{entry.description}</span>
                        <span className="text-xs text-gray-400">{entry.detail}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            entry.type === "income"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {entry.type === "income" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {entry.type === "income" ? "Income" : "Expense"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-700">
                        {entry.type === "income" ? formatCurrency(entry.amount, currentHostel?.currency) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">
                        {entry.type === "expense" ? formatCurrency(entry.amount, currentHostel?.currency) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
