import type { Hostel, Student } from "@/types/database";
import { buildInvoiceLineItems, getInvoiceTotal } from "@/lib/studentInvoice";
import { formatCurrency, formatMonth } from "@/lib/utils";

/** Normalize Pakistani phone numbers for wa.me (digits only, 92 country code). */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("92")) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `92${digits}`;
  }

  return digits.length >= 10 ? digits : null;
}

export function buildInvoiceWhatsAppMessage(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone">;
  student: Student;
  billingMonthDate: string;
  invoiceCode?: string | null;
  status?: string;
}): string {
  const { hostel, student, billingMonthDate, invoiceCode, status } = options;
  const lineItems = buildInvoiceLineItems(student);
  const total = getInvoiceTotal(lineItems);
  const monthLabel = formatMonth(billingMonthDate);
  const studentName = student.full_name ?? student.student_code;
  const fatherName = student.father_name?.trim();

  const lines = [
    `*${hostel.name}*`,
    `Fee Invoice — ${monthLabel}`,
    "",
    fatherName ? `Dear ${fatherName},` : "Dear Parent,",
    "",
    `Student: ${studentName}`,
    `Student Code: ${student.student_code}`,
  ];

  if (invoiceCode) lines.push(`Invoice No: ${invoiceCode}`);

  lines.push("", "*Fee Details:*");
  for (const item of lineItems) {
    lines.push(`• ${item.description}: ${formatCurrency(item.amount, hostel.currency)}`);
  }

  lines.push("", `*Total: ${formatCurrency(total, hostel.currency)}*`);

  if (status) {
    lines.push(`Status: ${status.toUpperCase()}`);
  }

  lines.push(
    "",
    "Please arrange payment at your earliest convenience.",
    hostel.contact_phone ? `Contact: ${hostel.contact_phone}` : "",
    "",
    "Thank you."
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
  window.open(url, "_blank", "noopener,noreferrer");
}

export function sendStudentInvoiceViaWhatsApp(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone">;
  student: Student;
  billingMonthDate: string;
  invoiceCode?: string | null;
  status?: string;
}): void {
  const parentPhone = options.student.father_phone?.trim();
  if (!parentPhone) {
    alert("No parent phone number on file. Edit the student and add Parents Contact No.");
    return;
  }

  const message = buildInvoiceWhatsAppMessage(options);
  openWhatsAppChat(parentPhone, message);
}
