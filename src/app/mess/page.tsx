"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatMonth, currentBillingMonthDate } from "@/lib/utils";
import {
  getMessCategoryBadges,
  getMessCategorySummary,
  getMessTotal,
  hasAnyMess,
} from "@/lib/messUtils";
import type { FeeRecord, Student } from "@/types/database";
import {
  Search,
  Filter,
  Loader2,
  Receipt,
  Utensils,
} from "lucide-react";

interface MessStudent extends Student {
  currentFee?: FeeRecord | null;
}

export default function MessPage() {
  const { currentHostel } = useHostel();
  const [students, setStudents] = useState<MessStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const supabase = createClient();
  const currentMonth = currentBillingMonthDate();

  const fetchData = useCallback(async () => {
    if (!currentHostel) return;
    setLoading(true);

    const [{ data: studentData }, { data: feeData }] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .eq("status", "active")
        .order("full_name", { ascending: true }),
      supabase
        .from("fee_records")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .eq("fee_type", "mess")
        .eq("billing_month", currentMonth),
    ]);

    const feeByStudent = new Map(feeData?.map((fee) => [fee.student_id, fee]) ?? []);

    if (studentData) {
      setStudents(
        studentData
          .filter((student) => hasAnyMess(student as Student))
          .map((student) => ({
            ...student,
            currentFee: feeByStudent.get(student.id) ?? null,
          }))
      );
    }

    setLoading(false);
  }, [currentHostel, currentMonth, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayMessFee = async (student: MessStudent) => {
    const today = new Date().toISOString().split("T")[0];
    const messAmount = getMessTotal(student);
    const randomInv = `MESS-${Math.floor(100000 + Math.random() * 900000)}`;

    setFormLoading(true);

    let error;
    if (student.currentFee) {
      const { error: err } = await supabase
        .from("fee_records")
        .update({ status: "paid", payment_date: today, amount: messAmount })
        .eq("id", student.currentFee.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("fee_records").insert([
        {
          hostel_id: currentHostel!.id,
          student_id: student.id,
          billing_month: currentMonth,
          amount: messAmount,
          fee_type: "mess",
          status: "paid",
          payment_date: today,
          invoice_code: randomInv,
        },
      ]);
      error = err;
    }

    setFormLoading(false);

    if (!error) {
      alert(`Mess fee of ${formatCurrency(messAmount)} recorded successfully!`);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const filteredStudents = students.filter((student) => {
    const displayName = student.full_name ?? "";
    const matchesSearch =
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      student.student_code.toLowerCase().includes(search.toLowerCase());
    const feeStatus = student.currentFee?.status ?? "pending";
    const matchesStatus = statusFilter === "all" || feeStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMessRevenue = students.reduce((sum, student) => sum + getMessTotal(student), 0);
  const paidCount = students.filter((student) => student.currentFee?.status === "paid").length;

  return (
    <AdminLayout>
      <Header title="Mess Management" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mess Students</span>
            <p className="mt-1 text-2xl font-bold text-gray-900">{students.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Paid This Month</span>
            <p className="mt-1 text-2xl font-bold text-green-700">{paidCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monthly Mess Roll</span>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(totalMessRevenue)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search mess students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-600 focus:border-blue-400 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
              <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Utensils className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No mess-included students found</p>
            <p className="text-xs text-gray-400 mt-1">
              Select breakfast, lunch, or dinner categories when adding a student.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Categories</th>
                    <th className="px-6 py-4">Mess Fee</th>
                    <th className="px-6 py-4">Billing Month</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student) => {
                    const feeStatus = student.currentFee?.status ?? "pending";
                    const badges = getMessCategoryBadges(student);

                    return (
                      <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={student.full_name ?? student.student_code}
                              src={student.student_image_url}
                              size="sm"
                            />
                            <div>
                              <span className="font-semibold text-gray-900 block">
                                {student.full_name || "—"}
                              </span>
                              <span className="text-xs text-gray-400">{student.student_code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {badges.map((badge) => (
                              <span
                                key={badge}
                                className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{getMessCategorySummary(student)}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-emerald-700">
                          {formatCurrency(getMessTotal(student))}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatMonth(currentMonth)}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={feeStatus} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {feeStatus !== "paid" ? (
                            <button
                              onClick={() => handlePayMessFee(student)}
                              disabled={formLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-60"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>Pay Mess Fee</span>
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-green-700">Paid</span>
                          )}
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
    </AdminLayout>
  );
}
