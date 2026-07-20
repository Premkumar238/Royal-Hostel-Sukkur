"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import { getMessTotal, hasAnyMess } from "@/lib/messUtils";
import {
  buildInvoiceLineItemsForSelection,
  generateInvoiceCode,
  getInvoiceTotal,
} from "@/lib/studentInvoice";
import { formatSupabaseError, saveFeeRecord } from "@/lib/feeRecordUtils";
import { downloadStudentInvoicePDF } from "@/lib/pdfGenerator";
import type { FeeRecord, PaymentMethod, Student } from "@/types/database";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

type IncludeMode = "rent" | "mess" | "both";

function PayInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") ?? "";
  const monthParam = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const includeParam = searchParams.get("include");

  const { currentHostel } = useHostel();
  const supabase = createClient();

  const [student, setStudent] = useState<Student | null>(null);
  const [rentRecord, setRentRecord] = useState<FeeRecord | null>(null);
  const [messRecord, setMessRecord] = useState<FeeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [billingMonth, setBillingMonth] = useState(monthParam);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [includeMode, setIncludeMode] = useState<IncludeMode>("both");
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const billingMonthDate = `${billingMonth}-01`;

  useEffect(() => {
    setBillingMonth(monthParam);
  }, [monthParam]);

  useEffect(() => {
    const load = async () => {
      if (!currentHostel || !studentId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .eq("hostel_id", currentHostel.id)
        .maybeSingle();

      const { data: feeData } = await supabase
        .from("fee_records")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .eq("student_id", studentId)
        .eq("billing_month", billingMonthDate);

      if (studentData) setStudent(studentData);
      const rent = feeData?.find((f) => f.fee_type === "rent") ?? null;
      const mess = feeData?.find((f) => f.fee_type === "mess") ?? null;
      setRentRecord(rent);
      setMessRecord(mess);

      const prior = rent ?? mess;
      if (prior?.payment_method) setPaymentMethod(prior.payment_method);
      if (prior?.invoice_notes) setInvoiceNotes(prior.invoice_notes);

      const rentAmt = Number(studentData?.monthly_rent || 0);
      const messAmt = studentData && hasAnyMess(studentData) ? getMessTotal(studentData) : 0;

      if (rentAmt > 0 && messAmt > 0) {
        if (includeParam === "rent" && rent?.status !== "paid") setIncludeMode("rent");
        else if (includeParam === "mess" && mess?.status !== "paid") setIncludeMode("mess");
        else if (includeParam === "both") setIncludeMode("both");
        else if (rent?.status === "paid" && mess?.status !== "paid") setIncludeMode("mess");
        else if (mess?.status === "paid" && rent?.status !== "paid") setIncludeMode("rent");
        else setIncludeMode("both");
      } else if (rentAmt > 0) setIncludeMode("rent");
      else if (messAmt > 0) setIncludeMode("mess");

      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHostel, studentId, billingMonth, includeParam]);

  const rentAmount = Number(student?.monthly_rent || 0);
  const messAmount = student && hasAnyMess(student) ? getMessTotal(student) : 0;
  const canIncludeRent = rentAmount > 0;
  const canIncludeMess = messAmount > 0;

  const includeRent = includeMode === "rent" || includeMode === "both";
  const includeMess = includeMode === "mess" || includeMode === "both";

  const lineItems = useMemo(() => {
    if (!student) return [];
    return buildInvoiceLineItemsForSelection(student, includeRent, includeMess);
  }, [student, includeRent, includeMess]);

  const total = getInvoiceTotal(lineItems);

  const existingInvoiceCode = rentRecord?.invoice_code ?? messRecord?.invoice_code ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !student || total <= 0) return;

    if (includeRent && rentRecord?.status === "paid") {
      alert("Rent is already paid for this month.");
      return;
    }
    if (includeMess && messRecord?.status === "paid") {
      alert("Mess is already paid for this month.");
      return;
    }

    setSaving(true);
    const invoiceCode = existingInvoiceCode ?? generateInvoiceCode(student.student_code, billingMonth);
    const status = markAsPaid ? "paid" : "pending";
    const paidOn = markAsPaid ? paymentDate : null;
    const notesTrimmed = invoiceNotes.trim() || null;

    try {
      let paymentMetaStored = true;

      if (includeRent && canIncludeRent) {
        const result = await saveFeeRecord(supabase, {
          hostelId: currentHostel.id,
          studentId: student.id,
          billingMonthDate,
          feeType: "rent",
          amount: rentAmount,
          existing: rentRecord,
          invoiceCode,
          status,
          paymentDate: paidOn,
          paymentMethod,
          invoiceNotes: notesTrimmed,
        });
        if (!result.ok) {
          alert(result.message);
          return;
        }
        if (!result.paymentMetaStored) paymentMetaStored = false;
      }

      if (includeMess && canIncludeMess) {
        const result = await saveFeeRecord(supabase, {
          hostelId: currentHostel.id,
          studentId: student.id,
          billingMonthDate,
          feeType: "mess",
          amount: messAmount,
          existing: messRecord,
          invoiceCode,
          status,
          paymentDate: paidOn,
          paymentMethod,
          invoiceNotes: notesTrimmed,
        });
        if (!result.ok) {
          alert(result.message);
          return;
        }
        if (!result.paymentMetaStored) paymentMetaStored = false;
      }

      if (!paymentMetaStored) {
        alert(
          "Invoice saved, but payment method and notes were not stored. Run the Supabase SQL for payment_method and invoice_notes (see migration file), then save again."
        );
      }

      try {
        await downloadStudentInvoicePDF({
          invoiceCode,
          issueDate: formatDate(invoiceDate),
          billingMonthLabel: formatMonth(billingMonthDate),
          hostelName: currentHostel.name,
          hostelAddress: currentHostel.address,
          hostelPhone: currentHostel.contact_phone,
          currency: currentHostel.currency,
          studentName: student.full_name ?? student.student_code,
          studentCode: student.student_code,
          studentPhone: student.phone,
          studentCnic: student.cnic,
          lineItems,
          total,
          status: markAsPaid ? "paid" : "pending",
          paymentDate: markAsPaid ? formatDate(paymentDate) : null,
          paymentMethod,
          invoiceNotes: notesTrimmed,
        });
      } catch (pdfErr) {
        alert(`Invoice saved, but PDF failed: ${formatSupabaseError(pdfErr)}`);
      }

      router.push(`/fees?month=${billingMonth}`);
      router.refresh();
    } catch (err) {
      alert(formatSupabaseError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!studentId) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Missing student. Go back to Fees & Invoices.</p>
        <Link href="/fees" className="mt-4 inline-block text-sm font-semibold text-blue-600">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <Link
        href={`/fees?month=${billingMonth}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Fees & Invoices
      </Link>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : !student ? (
        <p className="text-sm text-gray-500">Student not found.</p>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={student.full_name ?? student.student_code}
                src={student.student_image_url}
                size="md"
              />
              <div>
                <h2 className="text-lg font-bold text-gray-900">{student.full_name || student.student_code}</h2>
                <p className="text-xs text-gray-400">{student.student_code}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Billing Month
                </label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 px-3 text-sm cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 px-3 text-sm"
                  required
                />
              </div>
            </div>

            {existingInvoiceCode && (
              <p className="text-sm text-gray-600">
                Existing invoice no: <span className="font-semibold">{existingInvoiceCode}</span>
              </p>
            )}

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Include in this invoice
              </span>
              <div className="space-y-2">
                {canIncludeRent && (
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="includeMode"
                      checked={includeMode === "rent"}
                      onChange={() => setIncludeMode("rent")}
                      disabled={rentRecord?.status === "paid"}
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      Rent only — {formatCurrency(rentAmount, currentHostel?.currency)}
                    </span>
                    {rentRecord?.status === "paid" && (
                      <span className="text-xs text-green-600 font-semibold">Paid</span>
                    )}
                  </label>
                )}
                {canIncludeMess && (
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="includeMode"
                      checked={includeMode === "mess"}
                      onChange={() => setIncludeMode("mess")}
                      disabled={messRecord?.status === "paid"}
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      Mess only — {formatCurrency(messAmount, currentHostel?.currency)}
                    </span>
                    {messRecord?.status === "paid" && (
                      <span className="text-xs text-green-600 font-semibold">Paid</span>
                    )}
                  </label>
                )}
                {canIncludeRent && canIncludeMess && (
                  <label className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 cursor-pointer">
                    <input
                      type="radio"
                      name="includeMode"
                      checked={includeMode === "both"}
                      onChange={() => setIncludeMode("both")}
                      disabled={
                        rentRecord?.status === "paid" ||
                        messRecord?.status === "paid"
                      }
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      Rent + Mess —{" "}
                      {formatCurrency(rentAmount + messAmount, currentHostel?.currency)}
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Invoice summary</p>
              {lineItems.length === 0 ? (
                <p className="text-sm text-gray-500">Select at least one fee to include.</p>
              ) : (
                lineItems.map((item) => (
                  <div key={item.description} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description}</span>
                    <span className="font-semibold">{formatCurrency(item.amount, currentHostel?.currency)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(total, currentHostel?.currency)}</span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={markAsPaid}
                onChange={(e) => setMarkAsPaid(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Mark as paid now</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 px-3 text-sm cursor-pointer"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              {markAsPaid && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2.5 px-3 text-sm"
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Description / Note
              </label>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Optional note for this invoice (shown on PDF)"
                className="w-full rounded-lg border border-gray-200 py-2.5 px-3 text-sm resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">{invoiceNotes.length}/500</p>
            </div>

            <button
              type="submit"
              disabled={saving || total <= 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Save invoice & download PDF
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function PayInvoicePage() {
  return (
    <AdminLayout>
      <Header title="Pay / Invoice" searchPlaceholder="Quick search..." />
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <PayInvoiceForm />
      </Suspense>
    </AdminLayout>
  );
}
