"use client";

import { MessageCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendStudentInvoiceViaWhatsApp } from "@/lib/whatsappUtils";
import { getCombinedInvoiceStatus } from "@/lib/studentInvoice";
import { hasAnyMess } from "@/lib/messUtils";
import type { Hostel, Student } from "@/types/database";
import { currentYearMonth } from "@/lib/utils";

type Props = {
  student: Student;
  hostel: Pick<Hostel, "id" | "name" | "currency" | "contact_phone">;
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
      const { data: feeData } = await supabase
        .from("fee_records")
        .select("*")
        .eq("hostel_id", hostel.id)
        .eq("student_id", student.id)
        .eq("billing_month", billingMonthDate);

      const rent = feeData?.find((f) => f.fee_type === "rent") ?? null;
      const mess = feeData?.find((f) => f.fee_type === "mess") ?? null;
      const invoiceCode = rent?.invoice_code ?? mess?.invoice_code ?? null;
      const rentAmount = Number(student.monthly_rent || 0);
      const invoiceStatus = getCombinedInvoiceStatus(
        rentAmount <= 0 ? "none" : rent ? rent.status : "none",
        hasAnyMess(student) ? (mess ? mess.status : "none") : "na"
      );

      sendStudentInvoiceViaWhatsApp({
        hostel,
        student,
        billingMonthDate,
        invoiceCode,
        status: invoiceStatus === "not_generated" ? "pending" : invoiceStatus,
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
      title="Send invoice to parent on WhatsApp"
      className={
        className ??
        "rounded p-1.5 text-green-600 hover:bg-green-50 transition-all cursor-pointer disabled:opacity-60"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
    </button>
  );
}
