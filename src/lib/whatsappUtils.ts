import type { FeeRecord, Hostel, Student } from "@/types/database";
import { hasAnyMess } from "@/lib/messUtils";
import { getInvoiceTotal } from "@/lib/studentInvoice";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";

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

export function buildPaymentReceiptWhatsAppMessage(options: {
  hostel: Pick<Hostel, "currency">;
  student: Student;
  billingMonthDate: string;
  lineItems: { description: string; amount: number }[];
  paymentDate?: string | null;
}): string {
  const { hostel, student, billingMonthDate, lineItems, paymentDate } = options;
  const total = getInvoiceTotal(lineItems);
  const monthLabel = formatMonth(billingMonthDate);
  const studentName = student.full_name ?? student.student_code;
  const fatherName = student.father_name?.trim();

  const lines = [
    `*Payment Receipt — ${monthLabel}*`,
    "",
    fatherName ? `Dear ${fatherName},` : "Dear Parent,",
    "",
    `Student: ${studentName}`,
    "",
    "*Payment Details:*",
    `*Total: ${formatCurrency(total, hostel.currency)}*`,
    "Status: PAID",
  ];

  if (paymentDate) {
    lines.push(`Paid on: ${formatDate(paymentDate)}`);
  }

  lines.push("", "Thank you for your payment.", "", "Royal Girls Hostels, Sukkur");

  return lines.join("\n");
}

export function openWhatsAppChat(phone: string, message: string): void {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    alert("Invalid parent phone number. Add Parents Contact No on the student profile.");
    return;
  }

  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function sendStudentInvoiceViaWhatsApp(options: {
  hostel: Pick<Hostel, "currency">;
  student: Student;
  billingMonthDate: string;
  lineItems: { description: string; amount: number }[];
  paymentDate?: string | null;
}): void {
  const parentPhone = resolveParentPhone(options.student);
  if (!parentPhone) {
    alert(
      "No parent phone number found. Edit the student and add Parents Contact No (father_phone)."
    );
    return;
  }

  const message = buildPaymentReceiptWhatsAppMessage(options);
  openWhatsAppChat(parentPhone, message);
}
