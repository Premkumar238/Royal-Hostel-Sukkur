"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { downloadStudentInvoicePDF } from "@/lib/pdfGenerator";
import {
  buildInvoiceLineItems,
  generateInvoiceCode,
  getCombinedInvoiceStatus,
  getInvoiceTotal,
} from "@/lib/studentInvoice";
import { getMessTotal, hasAnyMess } from "@/lib/messUtils";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import type { FeeRecord, Student } from "@/types/database";
import {
  Calendar,
  FileText,
  Loader2,
  Plus,
  Search,
  Download,
  Check,
  Filter,
  X,
} from "lucide-react";

interface StudentInvoiceRow {
  student: Student;
  rentRecord: FeeRecord | null;
  messRecord: FeeRecord | null;
  invoiceCode: string | null;
  lineItems: { description: string; amount: number }[];
  total: number;
  status: "pending" | "paid" | "partial" | "not_generated";
}

export default function InvoicesPage() {
  const { currentHostel } = useHostel();
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

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

  const invoiceRows = useMemo<StudentInvoiceRow[]>(() => {
    const rentByStudent = new Map(
      feeRecords.filter((f) => f.fee_type === "rent").map((f) => [f.student_id, f])
    );
    const messByStudent = new Map(
      feeRecords.filter((f) => f.fee_type === "mess").map((f) => [f.student_id, f])
    );

    return students.map((student) => {
      const rentRecord = rentByStudent.get(student.id) ?? null;
      const messRecord = messByStudent.get(student.id) ?? null;
      const lineItems = buildInvoiceLineItems(student);
      const total = getInvoiceTotal(lineItems);

      const invoiceCode =
        rentRecord?.invoice_code ?? messRecord?.invoice_code ?? null;

      const status = getCombinedInvoiceStatus(
        rentRecord ? rentRecord.status : "none",
        hasAnyMess(student) ? (messRecord ? messRecord.status : "none") : "na"
      );

      return {
        student,
        rentRecord,
        messRecord,
        invoiceCode,
        lineItems,
        total,
        status,
      };
    });
  }, [students, feeRecords]);

  const filteredRows = invoiceRows.filter((row) => {
    const name = row.student.full_name ?? "";
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      row.student.student_code.toLowerCase().includes(search.toLowerCase()) ||
      (row.invoiceCode?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !selectedStudentId) return;

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    setFormLoading(true);
    const invoiceCode = generateInvoiceCode(student.student_code, billingMonth);
    const rentAmount = Number(student.monthly_rent || 0);
    const messAmount = hasAnyMess(student) ? getMessTotal(student) : 0;

    if (rentAmount <= 0 && messAmount <= 0) {
      alert("This student has no rent or mess fee to invoice.");
      setFormLoading(false);
      return;
    }

    const existingRent = feeRecords.find(
      (f) => f.student_id === student.id && f.fee_type === "rent"
    );
    const existingMess = feeRecords.find(
      (f) => f.student_id === student.id && f.fee_type === "mess"
    );

    try {
      if (rentAmount > 0) {
        if (existingRent) {
          await supabase
            .from("fee_records")
            .update({ invoice_code: invoiceCode, amount: rentAmount })
            .eq("id", existingRent.id);
        } else {
          await supabase.from("fee_records").insert([
            {
              hostel_id: currentHostel.id,
              student_id: student.id,
              billing_month: billingMonthDate,
              amount: rentAmount,
              fee_type: "rent",
              status: "pending",
              invoice_code: invoiceCode,
            },
          ]);
        }
      }

      if (messAmount > 0) {
        if (existingMess) {
          await supabase
            .from("fee_records")
            .update({ invoice_code: invoiceCode, amount: messAmount })
            .eq("id", existingMess.id);
        } else {
          await supabase.from("fee_records").insert([
            {
              hostel_id: currentHostel.id,
              student_id: student.id,
              billing_month: billingMonthDate,
              amount: messAmount,
              fee_type: "mess",
              status: "pending",
              invoice_code: invoiceCode,
            },
          ]);
        }
      }

      setShowGenerateModal(false);
      setSelectedStudentId("");
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate invoice.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDownloadInvoice = async (row: StudentInvoiceRow) => {
    if (!currentHostel || row.lineItems.length === 0) {
      alert("Nothing to invoice for this student.");
      return;
    }

    const invoiceCode = row.invoiceCode ?? generateInvoiceCode(row.student.student_code, billingMonth);
    const paymentDate =
      row.status === "paid"
        ? formatDate(row.rentRecord?.payment_date ?? row.messRecord?.payment_date ?? null)
        : null;

    await downloadStudentInvoicePDF({
      invoiceCode,
      issueDate: formatDate(new Date().toISOString()),
      billingMonthLabel: formatMonth(billingMonthDate),
      hostelName: currentHostel.name,
      hostelAddress: currentHostel.address,
      hostelPhone: currentHostel.contact_phone,
      currency: currentHostel.currency,
      studentName: row.student.full_name ?? row.student.student_code,
      studentCode: row.student.student_code,
      studentPhone: row.student.phone,
      studentCnic: row.student.cnic,
      lineItems: row.lineItems,
      total: row.total,
      status: row.status === "not_generated" ? "pending" : row.status,
      paymentDate: paymentDate === "—" ? null : paymentDate,
    });
  };

  const handleMarkPaid = async (row: StudentInvoiceRow) => {
    if (!currentHostel) return;
    if (!confirm(`Mark invoice as paid for ${row.student.full_name || row.student.student_code}?`)) return;

    setFormLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const invoiceCode =
      row.invoiceCode ?? generateInvoiceCode(row.student.student_code, billingMonth);

    const rentAmount = Number(row.student.monthly_rent || 0);
    const messAmount = hasAnyMess(row.student) ? getMessTotal(row.student) : 0;

    if (rentAmount > 0) {
      if (row.rentRecord) {
        await supabase
          .from("fee_records")
          .update({ status: "paid", payment_date: today, invoice_code: invoiceCode })
          .eq("id", row.rentRecord.id);
      } else {
        await supabase.from("fee_records").insert([
          {
            hostel_id: currentHostel.id,
            student_id: row.student.id,
            billing_month: billingMonthDate,
            amount: rentAmount,
            fee_type: "rent",
            status: "paid",
            payment_date: today,
            invoice_code: invoiceCode,
          },
        ]);
      }
    }

    if (messAmount > 0) {
      if (row.messRecord) {
        await supabase
          .from("fee_records")
          .update({ status: "paid", payment_date: today, invoice_code: invoiceCode })
          .eq("id", row.messRecord.id);
      } else {
        await supabase.from("fee_records").insert([
          {
            hostel_id: currentHostel.id,
            student_id: row.student.id,
            billing_month: billingMonthDate,
            amount: messAmount,
            fee_type: "mess",
            status: "paid",
            payment_date: today,
            invoice_code: invoiceCode,
          },
        ]);
      }
    }

    setFormLoading(false);
    fetchData();
  };

  return (
    <AdminLayout>
      <Header title="Student Invoices" searchPlaceholder="Quick search..." />

      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search student or invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="not_generated">Not Generated</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
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
                className="rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedStudentId("");
              setShowGenerateModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Generate Invoice
          </button>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Invoice No</th>
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Rent</th>
                    <th className="px-6 py-4">Mess</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRows.map((row) => (
                    <tr key={row.student.id} className="hover:bg-gray-50/50">
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
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {row.invoiceCode ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatMonth(billingMonthDate)}</td>
                      <td className="px-6 py-4">
                        {formatCurrency(Number(row.student.monthly_rent || 0), currentHostel?.currency)}
                      </td>
                      <td className="px-6 py-4">
                        {hasAnyMess(row.student) ? (
                          formatCurrency(getMessTotal(row.student), currentHostel?.currency)
                        ) : (
                          <span className="text-gray-400 text-xs">No Mess</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {formatCurrency(row.total, currentHostel?.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={row.status === "not_generated" ? "pending" : row.status}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadInvoice(row)}
                            disabled={row.total <= 0}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                          {row.status !== "paid" && row.total > 0 && (
                            <button
                              onClick={() => handleMarkPaid(row)}
                              disabled={formLoading}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Mark Paid
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

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowGenerateModal(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-2">Generate Student Invoice</h3>
            <p className="text-xs text-gray-400 mb-6">{formatMonth(billingMonthDate)}</p>

            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Select Student
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm cursor-pointer"
                >
                  <option value="">Choose student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.student_code} ({s.student_code})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={formLoading || !selectedStudentId}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Generate Invoice"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
