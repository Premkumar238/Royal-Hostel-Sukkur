import { getMessTotal, hasAnyMess } from "@/lib/messUtils";
import {
  buildInvoiceLineItems,
  getCombinedInvoiceStatus,
  getInvoiceTotal,
} from "@/lib/studentInvoice";
import type { FeeRecord, Student } from "@/types/database";

/**
 * Hostel fee income for a billing month (fee month), not payment date.
 * Matches Fees & Invoices: paid invoice totals + partial paid legs.
 * Outside mess is excluded (Mess section only).
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

/** Same rules as Fees & Invoices, from merged report student_billing rows (both hostels). */
export function computeFeesIncomeFromStudentBilling(
  rows: {
    rent_amount: number;
    mess_amount: number;
    rent_status: string | null;
    mess_status: string | null;
  }[]
): number {
  let total = 0;

  for (const row of rows) {
    const rentDue = Number(row.rent_amount) > 0;
    const messDue = Number(row.mess_amount) > 0;
    const rentStatus = rentDue ? row.rent_status ?? "pending" : "none";
    const messStatus = messDue ? row.mess_status ?? "pending" : "na";

    const invoiceStatus = getCombinedInvoiceStatus(
      rentStatus as "none" | "pending" | "paid" | "partial",
      messStatus as "none" | "na" | "pending" | "paid" | "partial"
    );

    const rent = Number(row.rent_amount || 0);
    const mess = Number(row.mess_amount || 0);

    if (invoiceStatus === "paid") {
      total += rent + mess;
      continue;
    }

    if (invoiceStatus === "partial") {
      if (rentStatus === "paid") total += rent;
      if (messStatus === "paid") total += mess;
    }
  }

  return total;
}
