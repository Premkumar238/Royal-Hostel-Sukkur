"use client";

import { MessageCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildPaidLineItemsFromRecords,
  sendStudentInvoicePdfViaWhatsApp,
} from "@/lib/whatsappUtils";
import type { Hostel, Student } from "@/types/database";
import { currentYearMonth } from "@/lib/utils";

type Props = {
  student: Student;
  hostel: Pick<Hostel, "id" | "name" | "currency" | "contact_phone" | "address">;
  billingMonth?: string;
  className?: string;
};

export function StudentWhatsAppButton({ student, hostel, billingMonth, className }: Props) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const month = billingMonth ?? currentYearMonth();
  const billingMonthDate = `${month}-01`;

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data: feeData, error } = await supabase
        .from("fee_records")
        .select("*")
        .eq("hostel_id", hostel.id)
        .eq("student_id", student.id)
        .eq("billing_month", billingMonthDate);

      if (error) {
        alert(`Could not load invoice: ${error.message}`);
        return;
      }

      const rent = feeData?.find((f) => f.fee_type === "rent") ?? null;
      const mess = feeData?.find((f) => f.fee_type === "mess") ?? null;
      const invoiceCode = rent?.invoice_code ?? mess?.invoice_code ?? null;
      const lineItems = buildPaidLineItemsFromRecords(student, rent, mess);
      const paymentDate = rent?.payment_date ?? mess?.payment_date ?? null;
      const paymentMethod = rent?.payment_method ?? mess?.payment_method ?? null;
      const invoiceNotes = rent?.invoice_notes ?? mess?.invoice_notes ?? null;

      if (!invoiceCode || lineItems.length === 0) {
        alert("No paid invoice found for this student.");
        return;
      }

      await sendStudentInvoicePdfViaWhatsApp({
        hostel,
        student,
        billingMonthDate,
        invoiceCode,
        lineItems,
        paymentDate,
        paymentMethod,
        invoiceNotes,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Send invoice PDF to parent on WhatsApp"
      className={
        className ??
        "inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-all cursor-pointer disabled:opacity-60"
      }
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <MessageCircle className="h-3.5 w-3.5" />
      )}
      WhatsApp
    </button>
  );
}
