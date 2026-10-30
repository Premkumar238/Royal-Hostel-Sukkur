import { getMessTotal, hasAnyMess } from "@/lib/messUtils";
import {
  buildInvoiceLineItems,
  getCombinedInvoiceStatus,
  getInvoiceTotal,
} from "@/lib/studentInvoice";
import type { FeeRecord, Student } from "@/types/database";

/**
 * Matches Fees & Invoices: sum of fully paid invoice totals plus amounts
 * collected on partial invoices (paid rent/mess legs only).
 */
export function computeFeesAndInvoicesCollectedIncome(
  students: Student[],
  feeRecords: FeeRecord[]
): number {
  const rentByStudent = new Map(
    feeRecords.filter((fee) => fee.fee_type === "rent").map((fee) => [fee.student_id, fee])
  );
  const messByStudent = new Map(
    feeRecords.filter((fee) => fee.fee_type === "mess").map((fee) => [fee.student_id, fee])
  );

  let total = 0;

  for (const student of students) {
    const rentRecord = rentByStudent.get(student.id) ?? null;
    const messRecord = messByStudent.get(student.id) ?? null;
    const studentHasMess = hasAnyMess(student);
    const rentAmount = Number(student.monthly_rent || 0);

    const invoiceStatus = getCombinedInvoiceStatus(
      rentAmount <= 0 ? "none" : rentRecord ? rentRecord.status : "none",
      studentHasMess ? (messRecord ? messRecord.status : "none") : "na"
    );

    if (invoiceStatus === "paid") {
      total += getInvoiceTotal(buildInvoiceLineItems(student));
      continue;
    }

    if (invoiceStatus === "partial") {
      if (rentRecord?.status === "paid") total += Number(rentRecord.amount);
      if (messRecord?.status === "paid") total += Number(messRecord.amount);
    }
  }

  return total;
}
