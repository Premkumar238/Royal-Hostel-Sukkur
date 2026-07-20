import type { Student } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

export function hasAnyMess(student: Pick<
  Student,
  "has_mess" | "has_breakfast" | "has_lunch" | "has_dinner"
>): boolean {
  return !!(
    student.has_breakfast ||
    student.has_lunch ||
    student.has_dinner ||
    student.has_mess
  );
}

export function getMessTotal(
  student: Pick<
    Student,
    | "has_mess"
    | "mess_fee"
    | "has_breakfast"
    | "has_lunch"
    | "has_dinner"
    | "breakfast_fee"
    | "lunch_fee"
    | "dinner_fee"
  >
): number {
  const categoryTotal =
    (student.has_breakfast ? Number(student.breakfast_fee || 0) : 0) +
    (student.has_lunch ? Number(student.lunch_fee || 0) : 0) +
    (student.has_dinner ? Number(student.dinner_fee || 0) : 0);

  if (categoryTotal > 0) return categoryTotal;
  return student.has_mess ? Number(student.mess_fee || 0) : 0;
}

export function getMessCategorySummary(student: Student): string {
  const parts: string[] = [];

  if (student.has_breakfast) {
    parts.push(`Breakfast ${formatCurrency(student.breakfast_fee ?? 0)}`);
  }
  if (student.has_lunch) {
    parts.push(`Lunch ${formatCurrency(student.lunch_fee ?? 0)}`);
  }
  if (student.has_dinner) {
    parts.push(`Dinner ${formatCurrency(student.dinner_fee ?? 0)}`);
  }

  if (parts.length > 0) return parts.join(" · ");

  if (student.has_mess && student.mess_fee) {
    return formatCurrency(student.mess_fee);
  }

  return "—";
}

export function getMessCategoryBadges(student: Student): string[] {
  const badges: string[] = [];
  if (student.has_breakfast) badges.push("Breakfast");
  if (student.has_lunch) badges.push("Lunch");
  if (student.has_dinner) badges.push("Dinner");
  return badges;
}
