import type { FeeRecord, Student } from "@/types/database";
import { getMessCategorySummary, getMessTotal, hasAnyMess } from "@/lib/messUtils";

export function generateInvoiceCode(studentCode: string, billingMonth: string): string {
  const monthPart = billingMonth.slice(0, 7).replace("-", "");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${monthPart}-${studentCode}-${suffix}`;
}

export function getCombinedInvoiceStatus(
  rentStatus: FeeRecord["status"] | "none",
  messStatus: FeeRecord["status"] | "none" | "na"
): "pending" | "paid" | "partial" | "not_generated" {
  if (rentStatus === "none" && (messStatus === "none" || messStatus === "na")) {
    return "not_generated";
  }

  const statuses = [rentStatus === "none" ? null : rentStatus, messStatus === "na" || messStatus === "none" ? null : messStatus].filter(
    Boolean
  ) as FeeRecord["status"][];

  if (statuses.length === 0) return "not_generated";
  if (statuses.every((s) => s === "paid")) return "paid";
  if (statuses.every((s) => s === "pending")) return "pending";
  return "partial";
}

export function buildInvoiceLineItems(student: Student): { description: string; amount: number }[] {
  return buildInvoiceLineItemsForSelection(student, true, true);
}

export function buildInvoiceLineItemsForSelection(
  student: Student,
  includeRent: boolean,
  includeMess: boolean
): { description: string; amount: number }[] {
  const items: { description: string; amount: number }[] = [];

  const rent = Number(student.monthly_rent || 0);
  if (includeRent && rent > 0) {
    items.push({ description: "Monthly Room Rent", amount: rent });
  }

  if (includeMess && hasAnyMess(student)) {
    const messTotal = getMessTotal(student);
    if (messTotal > 0) {
      const detail = getMessCategorySummary(student);
      items.push({
        description: detail !== "—" ? `Mess Fee (${detail})` : "Mess Fee",
        amount: messTotal,
      });
    }
  }

  return items;
}

export function getInvoiceTotal(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
