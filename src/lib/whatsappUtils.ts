<<<<<<< HEAD
import type { FeeRecord, Hostel, Student } from "@/types/database";
import { buildInvoiceLineItemsForSelection, getInvoiceTotal } from "@/lib/studentInvoice";
import { hasAnyMess } from "@/lib/messUtils";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
=======
import type { Hostel, Student } from "@/types/database";
import { buildInvoiceLineItems, getInvoiceTotal } from "@/lib/studentInvoice";
import { formatCurrency, formatMonth } from "@/lib/utils";
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9

/** Normalize Pakistani phone numbers for wa.me (digits only, 92 country code). */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

<<<<<<< HEAD
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
=======
  if (digits.startsWith("92")) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `92${digits}`;
  }

  return digits.length >= 10 ? digits : null;
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
}

export function buildInvoiceWhatsAppMessage(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone">;
  student: Student;
  billingMonthDate: string;
  invoiceCode?: string | null;
  status?: string;
<<<<<<< HEAD
  lineItems?: { description: string; amount: number }[];
  paymentDate?: string | null;
}): string {
  const { hostel, student, billingMonthDate, invoiceCode, status, paymentDate } = options;
  const lineItems =
    options.lineItems ??
    buildInvoiceLineItemsForSelection(student, true, hasAnyMess(student));
=======
}): string {
  const { hostel, student, billingMonthDate, invoiceCode, status } = options;
  const lineItems = buildInvoiceLineItems(student);
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
  const total = getInvoiceTotal(lineItems);
  const monthLabel = formatMonth(billingMonthDate);
  const studentName = student.full_name ?? student.student_code;
  const fatherName = student.father_name?.trim();
<<<<<<< HEAD
  const isPaid = status === "paid";

  const lines = [
    `*${hostel.name}*`,
    isPaid ? `*Payment Receipt — ${monthLabel}*` : `*Fee Invoice — ${monthLabel}*`,
=======

  const lines = [
    `*${hostel.name}*`,
    `Fee Invoice — ${monthLabel}`,
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
    "",
    fatherName ? `Dear ${fatherName},` : "Dear Parent,",
    "",
    `Student: ${studentName}`,
    `Student Code: ${student.student_code}`,
  ];

  if (invoiceCode) lines.push(`Invoice No: ${invoiceCode}`);

<<<<<<< HEAD
  lines.push("", isPaid ? "*Payment Details:*" : "*Fee Details:*");
=======
  lines.push("", "*Fee Details:*");
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
  for (const item of lineItems) {
    lines.push(`• ${item.description}: ${formatCurrency(item.amount, hostel.currency)}`);
  }

  lines.push("", `*Total: ${formatCurrency(total, hostel.currency)}*`);
<<<<<<< HEAD
  lines.push(`Status: ${(status ?? "pending").toUpperCase()}`);

  if (isPaid && paymentDate) {
    lines.push(`Paid on: ${formatDate(paymentDate)}`);
=======

  if (status) {
    lines.push(`Status: ${status.toUpperCase()}`);
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
  }

  lines.push(
    "",
<<<<<<< HEAD
    isPaid
      ? "Thank you for your payment."
      : "Please arrange payment at your earliest convenience.",
    hostel.contact_phone ? `Contact: ${hostel.contact_phone}` : "",
    "",
    "Royal Girls Hostels, Sukkur"
=======
    "Please arrange payment at your earliest convenience.",
    hostel.contact_phone ? `Contact: ${hostel.contact_phone}` : "",
    "",
    "Thank you."
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
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
<<<<<<< HEAD

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
=======
  window.open(url, "_blank", "noopener,noreferrer");
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
}

export function sendStudentInvoiceViaWhatsApp(options: {
  hostel: Pick<Hostel, "name" | "currency" | "contact_phone">;
  student: Student;
  billingMonthDate: string;
  invoiceCode?: string | null;
  status?: string;
<<<<<<< HEAD
  lineItems?: { description: string; amount: number }[];
  paymentDate?: string | null;
}): void {
  const parentPhone = resolveParentPhone(options.student);
  if (!parentPhone) {
    alert(
      "No parent phone number found. Edit the student and add Parents Contact No (father_phone)."
    );
=======
}): void {
  const parentPhone = options.student.father_phone?.trim();
  if (!parentPhone) {
    alert("No parent phone number on file. Edit the student and add Parents Contact No.");
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
    return;
  }

  const message = buildInvoiceWhatsAppMessage(options);
  openWhatsAppChat(parentPhone, message);
}
