"use client";

import { MessageCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
<<<<<<< HEAD
import {
  buildPaidLineItemsFromRecords,
  sendStudentInvoiceViaWhatsApp,
} from "@/lib/whatsappUtils";
=======
import { sendStudentInvoiceViaWhatsApp } from "@/lib/whatsappUtils";
import { getCombinedInvoiceStatus } from "@/lib/studentInvoice";
import { hasAnyMess } from "@/lib/messUtils";
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
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
<<<<<<< HEAD
      const { data: feeData, error } = await supabase
=======
      const { data: feeData } = await supabase
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
        .from("fee_records")
        .select("*")
        .eq("hostel_id", hostel.id)
        .eq("student_id", student.id)
        .eq("billing_month", billingMonthDate);

<<<<<<< HEAD
      if (error) {
        alert(`Could not load invoice: ${error.message}`);
        return;
      }

      const rent = feeData?.find((f) => f.fee_type === "rent") ?? null;
      const mess = feeData?.find((f) => f.fee_type === "mess") ?? null;
      const invoiceCode = rent?.invoice_code ?? mess?.invoice_code ?? null;
      const lineItems = buildPaidLineItemsFromRecords(student, rent, mess);
      const paymentDate = rent?.payment_date ?? mess?.payment_date ?? null;

      if (lineItems.length === 0) {
        alert("No paid invoice lines found for this student.");
        return;
      }
=======
      const rent = feeData?.find((f) => f.fee_type === "rent") ?? null;
      const mess = feeData?.find((f) => f.fee_type === "mess") ?? null;
      const invoiceCode = rent?.invoice_code ?? mess?.invoice_code ?? null;
      const rentAmount = Number(student.monthly_rent || 0);
      const invoiceStatus = getCombinedInvoiceStatus(
        rentAmount <= 0 ? "none" : rent ? rent.status : "none",
        hasAnyMess(student) ? (mess ? mess.status : "none") : "na"
      );
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9

      sendStudentInvoiceViaWhatsApp({
        hostel,
        student,
        billingMonthDate,
        invoiceCode,
<<<<<<< HEAD
        status: "paid",
        lineItems,
        paymentDate,
=======
        status: invoiceStatus === "not_generated" ? "pending" : invoiceStatus,
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
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
<<<<<<< HEAD
      title="Send paid invoice to parent on WhatsApp"
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
=======
      title="Send invoice to parent on WhatsApp"
      className={
        className ??
        "rounded p-1.5 text-green-600 hover:bg-green-50 transition-all cursor-pointer disabled:opacity-60"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
    </button>
  );
}
