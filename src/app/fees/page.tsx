"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import { getMessTotal, hasAnyMess } from "@/lib/messUtils";
import type { FeeRecord, Student } from "@/types/database";
import {
  Search,
  Filter,
  Check,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";
import { downloadPDF } from "@/lib/pdfGenerator";

interface StudentFeeRow {
  student: Student;
  rentRecord: FeeRecord | null;
  messRecord: FeeRecord | null;
  rentStatus: "pending" | "paid" | "partial" | "na";
  messStatus: "pending" | "paid" | "partial" | "na";
}

export default function FeesPage() {
  const { currentHostel } = useHostel();
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));

  const supabase = createClient();
  const billingMonthDate = `${billingMonth}-01`;

  const fetchData = async () => {
    if (!currentHostel) return;
    setLoading(true);

    const { data: studentData } = await supabase
      .from("students")
      .select("*")
      .eq("hostel_id", currentHostel.id)
      .eq("status", "active")
      .order("full_name", { ascending: true });

    const { data: feeData } = await supabase
      .from("fee_records")
      .select("*")
      .eq("hostel_id", currentHostel.id)
      .eq("billing_month", billingMonthDate);

    if (studentData) setStudents(studentData);
    if (feeData) setFeeRecords(feeData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentHostel, billingMonth]);

  const studentRows = useMemo<StudentFeeRow[]>(() => {
    const rentByStudent = new Map(
      feeRecords.filter((fee) => fee.fee_type === "rent").map((fee) => [fee.student_id, fee])
    );
    const messByStudent = new Map(
      feeRecords.filter((fee) => fee.fee_type === "mess").map((fee) => [fee.student_id, fee])
    );

    return students.map((student) => {
      const rentRecord = rentByStudent.get(student.id) ?? null;
      const messRecord = messByStudent.get(student.id) ?? null;
      const studentHasMess = hasAnyMess(student);

      return {
        student,
        rentRecord,
        messRecord,
        rentStatus: rentRecord?.status ?? "pending",
        messStatus: studentHasMess ? (messRecord?.status ?? "pending") : "na",
      };
    });
  }, [students, feeRecords]);

  const handlePayFee = async (
    student: Student,
    feeType: "rent" | "mess",
    existingRecord: FeeRecord | null,
    amount: number
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const prefix = feeType === "rent" ? "INV" : "MESS";
    const randomInv = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

    setFormLoading(true);

    let error;
    if (existingRecord) {
      const { error: err } = await supabase
        .from("fee_records")
        .update({ status: "paid", payment_date: today, amount })
        .eq("id", existingRecord.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("fee_records").insert([
        {
          hostel_id: currentHostel!.id,
          student_id: student.id,
          billing_month: billingMonthDate,
          amount,
          fee_type: feeType,
          status: "paid",
          payment_date: today,
          invoice_code: randomInv,
        },
      ]);
      error = err;
    }

    setFormLoading(false);

    if (!error) {
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentHostel) return;
    const headers = [
      "Student",
      "Code",
      "Joining Date",
      "Month",
      "Rent",
      "Rent Status",
      "Mess",
      "Mess Status",
    ];
    const rows = filteredRows.map((row) => [
      row.student.full_name ?? "—",
      row.student.student_code,
      row.student.joining_date ? formatDate(row.student.joining_date) : "—",
      formatMonth(billingMonthDate),
      `${currentHostel.currency} ${Number(row.student.monthly_rent || 0).toLocaleString()}`,
      row.rentStatus.toUpperCase(),
      row.messStatus === "na"
        ? "—"
        : `${currentHostel.currency} ${getMessTotal(row.student).toLocaleString()}`,
      row.messStatus === "na" ? "N/A" : row.messStatus.toUpperCase(),
    ]);

    await downloadPDF(
      "Fee Management Report",
      headers,
      rows,
      `fee_report_${currentHostel.slug}.pdf`,
      currentHostel.name
    );
  };

  const filteredRows = studentRows.filter((row) => {
    const displayName = row.student.full_name ?? "";
    const matchesSearch =
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      row.student.student_code.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "all") return matchesSearch;

    const rentMatches = row.rentStatus === statusFilter;
    const messMatches = row.messStatus !== "na" && row.messStatus === statusFilter;
    return matchesSearch && (rentMatches || messMatches);
  });

  const pendingRentCount = studentRows.filter((row) => row.rentStatus !== "paid").length;
  const pendingMessCount = studentRows.filter(
    (row) => row.messStatus !== "na" && row.messStatus !== "paid"
  ).length;

  return (
    <AdminLayout>
      <Header title="Fee Management" searchPlaceholder="Quick search..." />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Students</span>
            <p className="mt-1 text-2xl font-bold text-gray-900">{students.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Rent</span>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingRentCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Mess</span>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{pendingMessCount}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or code..."
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
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-500">No students found for this billing month</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Joining Date</th>
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Rent</th>
                    <th className="px-6 py-4">Rent Status</th>
                    <th className="px-6 py-4">Mess</th>
                    <th className="px-6 py-4">Mess Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRows.map((row) => (
                    <tr key={row.student.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={row.student.full_name ?? row.student.student_code}
                            src={row.student.student_image_url}
                            size="sm"
                          />
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {row.student.full_name || "—"}
                            </span>
                            <span className="text-xs text-gray-400">{row.student.student_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {row.student.joining_date ? formatDate(row.student.joining_date) : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatMonth(billingMonthDate)}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {formatCurrency(row.student.monthly_rent ?? 0, currentHostel?.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.rentStatus} />
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">
                        {row.messStatus === "na" ? (
                          <span className="text-gray-400 text-xs font-normal">No Mess</span>
                        ) : (
                          formatCurrency(getMessTotal(row.student), currentHostel?.currency)
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.messStatus === "na" ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <StatusBadge status={row.messStatus} />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {row.rentStatus !== "paid" && (
                            <button
                              onClick={() =>
                                handlePayFee(
                                  row.student,
                                  "rent",
                                  row.rentRecord,
                                  Number(row.student.monthly_rent || 0)
                                )
                              }
                              disabled={formLoading}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Pay Rent</span>
                            </button>
                          )}
                          {row.messStatus !== "na" && row.messStatus !== "paid" && (
                            <button
                              onClick={() =>
                                handlePayFee(
                                  row.student,
                                  "mess",
                                  row.messRecord,
                                  getMessTotal(row.student)
                                )
                              }
                              disabled={formLoading}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Pay Mess</span>
                            </button>
                          )}
                        </div>
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
