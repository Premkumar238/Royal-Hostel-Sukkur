import type { FeeRecord, Hostel, Student } from "@/types/database";
import { buildInvoiceLineItemsForSelection, getInvoiceTotal } from "@/lib/studentInvoice";
import { hasAnyMess } from "@/lib/messUtils";
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

export function buildInvoiceWhatsAppMessage(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone">;
  student: Student;
  billingMonthDate: string;
  invoiceCode?: string | null;
  status?: string;
  lineItems?: { description: string; amount: number }[];
  paymentDate?: string | null;
}): string {
  const { hostel, student, billingMonthDate, invoiceCode, status, paymentDate } = options;
  const lineItems =
    options.lineItems ??
    buildInvoiceLineItemsForSelection(student, true, hasAnyMess(student));
  const total = getInvoiceTotal(lineItems);
  const monthLabel = formatMonth(billingMonthDate);
  const studentName = student.full_name ?? student.student_code;
  const fatherName = student.father_name?.trim();
  const isPaid = status === "paid";

  const lines = [
    `*${hostel.name}*`,
    isPaid ? `*Payment Receipt — ${monthLabel}*` : `*Fee Invoice — ${monthLabel}*`,
    "",
    fatherName ? `Dear ${fatherName},` : "Dear Parent,",
    "",
    `Student: ${studentName}`,
    `Student Code: ${student.student_code}`,
  ];

  if (invoiceCode) lines.push(`Invoice No: ${invoiceCode}`);

  lines.push("", isPaid ? "*Payment Details:*" : "*Fee Details:*");
  for (const item of lineItems) {
    lines.push(`• ${item.description}: ${formatCurrency(item.amount, hostel.currency)}`);
  }

  lines.push("", `*Total: ${formatCurrency(total, hostel.currency)}*`);
  lines.push(`Status: ${(status ?? "pending").toUpperCase()}`);

  if (isPaid && paymentDate) {
    lines.push(`Paid on: ${formatDate(paymentDate)}`);
  }

  lines.push(
    "",
    isPaid
      ? "Thank you for your payment."
      : "Please arrange payment at your earliest convenience.",
    hostel.contact_phone ? `Contact: ${hostel.contact_phone}` : "",
    "",
    "Royal Girls Hostels, Sukkur"
  );

  return lines.filter(Boolean).join("\n");
}

export function openWhatsAppChat(phone: string, message: string): void {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    alert("Invalid parent phone number. Add Parents Contact No on the student profile.");
    return;
  }

  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;

  // Anchor click works more reliably than window.open (popup blockers).
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

export function sendStudentInvoiceViaWhatsApp(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone">;
  student: Student;
  billingMonthDate: string;
  invoiceCode?: string | null;
  status?: string;
  lineItems?: { description: string; amount: number }[];
  paymentDate?: string | null;
}): void {
  const parentPhone = resolveParentPhone(options.student);
  if (!parentPhone) {
    alert(
      "No parent phone number found. Edit the student and add Parents Contact No (father_phone)."
    );
    return;
  }

  const message = buildInvoiceWhatsAppMessage(options);
  openWhatsAppChat(parentPhone, message);
}
