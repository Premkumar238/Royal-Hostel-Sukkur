import type { FeeRecord, Hostel, Student } from "@/types/database";
import { hasAnyMess } from "@/lib/messUtils";
import {
  generateStudentInvoicePDFBlob,
  type StudentInvoicePdfData,
} from "@/lib/pdfGenerator";
import { getInvoiceTotal } from "@/lib/studentInvoice";
import { formatDate, formatMonth } from "@/lib/utils";

/** Normalize Pakistani phone numbers for wa.me (digits only, 92 country code). */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("92") && digits.length >= 12) {
    // e.g. 923001234567
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.startsWith("3") && digits.length === 10) {
    digits = `92${digits}`;
  } else if (digits.length === 11 && digits.startsWith("03")) {
    digits = `92${digits.slice(1)}`;
  }

  return digits.length >= 11 ? digits : null;
}

/** Prefer parent contact, then emergency / landline numbers. */
export function resolveParentPhone(student: Student): string | null {
  const candidates = [
    student.father_phone,
    student.emergency_contact_1,
    student.emergency_contact_2,
    student.landline,
  ];

  for (const raw of candidates) {
    if (normalizeWhatsAppPhone(raw)) return raw!.trim();
  }
  return null;
}

export function openWhatsAppChat(phone: string): void {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    alert("Invalid parent phone number. Add Parents Contact No on the student profile.");
    return;
  }

  const url = `https://wa.me/${normalized}`;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function buildPaidLineItemsFromRecords(
  student: Student,
  rentRecord: FeeRecord | null,
  messRecord: FeeRecord | null
): { description: string; amount: number }[] {
  const items: { description: string; amount: number }[] = [];
  if (rentRecord) {
    items.push({ description: "Monthly Room Rent", amount: Number(rentRecord.amount) });
  }

  if (messRecord && hasAnyMess(student)) {
    items.push({ description: "Mess Fee", amount: Number(messRecord.amount) });
  }

  return items;
}

export function buildPaidInvoicePdfData(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone" | "address">;
  student: Student;
  billingMonthDate: string;
  invoiceCode: string;
  lineItems: { description: string; amount: number }[];
  paymentDate?: string | null;
  paymentMethod?: FeeRecord["payment_method"] | null;
  invoiceNotes?: string | null;
}): StudentInvoicePdfData {
  const { hostel, student, billingMonthDate, invoiceCode, lineItems } = options;

  return {
    invoiceCode,
    issueDate: formatDate(new Date().toISOString()),
    billingMonthLabel: formatMonth(billingMonthDate),
    hostelName: hostel.name,
    hostelAddress: hostel.address,
    hostelPhone: hostel.contact_phone,
    currency: hostel.currency,
    studentName: student.full_name ?? student.student_code,
    studentCode: student.student_code,
    studentPhone: student.father_phone ?? student.phone,
    studentCnic: student.cnic,
    fatherName: student.father_name,
    lineItems,
    total: getInvoiceTotal(lineItems),
    status: "paid",
    paymentDate: options.paymentDate ? formatDate(options.paymentDate) : null,
    paymentMethod: options.paymentMethod ?? null,
    invoiceNotes: options.invoiceNotes ?? null,
  };
}

export async function sendStudentInvoicePdfViaWhatsApp(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone" | "address">;
  student: Student;
  billingMonthDate: string;
  invoiceCode: string;
  lineItems: { description: string; amount: number }[];
  paymentDate?: string | null;
  paymentMethod?: FeeRecord["payment_method"] | null;
  invoiceNotes?: string | null;
}): Promise<void> {
  const parentPhone = resolveParentPhone(options.student);
  if (!parentPhone) {
    alert(
      "No parent phone number found. Edit the student and add Parents Contact No (father_phone)."
    );
    return;
  }

  const pdfData = buildPaidInvoicePdfData(options);
  const { blob, filename } = await generateStudentInvoicePDFBlob(pdfData);
  const file = new File([blob], filename, { type: "application/pdf" });

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: `Payment receipt — ${pdfData.studentName}`,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  openWhatsAppChat(parentPhone);

  alert(
    `Invoice PDF downloaded (${filename}). WhatsApp is opening for the parent number — attach the PDF and send.`
  );
}
